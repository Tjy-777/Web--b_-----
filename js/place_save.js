// ======================================================
// place-save.js
// 場所保存機能（PHP + MySQL）
// ★依存：state.js
// ======================================================
function refreshSavedPlacesCache() {
    if (!currentUser) {
        savedPlacesCache = [];
        return Promise.resolve();
    }

    return fetchSavedPlaces() // limit指定なし = 全件取得
        .then(data => {
            savedPlacesCache = Array.isArray(data) ? data : [];
        })
        .catch(error => {
            console.error("保存済みキャッシュの取得に失敗しました:", error);
            savedPlacesCache = [];
        });
}

// 同じ名前・半径50m以内の場所がキャッシュ内にあれば「保存済み」とみなす
// （save_place.php側の重複判定ロジックと合わせている）
function isPlaceSaved(name, lat, lon) {
    if (!name || lat == null || lon == null) return false;

    return savedPlacesCache.some(p =>
        p.name === name && map.distance([lat, lon], [p.lat, p.lon]) <= 50
    );
}

function savePlace(name, lat, lon, type) {
    return fetch(`${API_BASE}save_place.php`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': csrfToken // ★追加：CSRF対策
        },
        body: JSON.stringify({ name, lat, lon, type })
    }).then(res => res.json());
}

function fetchSavedPlaces(limit) {
    const url = limit ? `${API_BASE}get_places.php?limit=${limit}` : `${API_BASE}get_places.php`;
    return fetch(url, { credentials: 'same-origin' }).then(res => res.json());
}

function deletePlace(id) {
    return fetch(`${API_BASE}delete_place.php`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': csrfToken // ★追加：CSRF対策
        },
        body: JSON.stringify({ id })
    }).then(res => res.json());
}

// 情報シートの一番下に保存ボタンを追加する共通関数
// ★変更：currentDisplayedPlaceが既に保存済みなら、最初から「保存済み」表示にする
function appendSaveButtonToFeaturesList() {
    const featuresList = document.getElementById('park-features-list');
    if (!featuresList) return;

    const alreadySaved = currentUser && currentDisplayedPlace &&
        isPlaceSaved(currentDisplayedPlace.name, currentDisplayedPlace.lat, currentDisplayedPlace.lon);

    if (alreadySaved) {
        featuresList.innerHTML += `
            <li style="margin-top: 12px; text-align: center; list-style: none;">
                <button id="save-place-btn" disabled style="padding: 8px 18px; background: #bbb; color: white; border: none; border-radius: 20px; font-weight: bold; cursor: default;">
                    ⭐ 保存済みです
                </button>
            </li>
        `;
    } else {
        featuresList.innerHTML += `
            <li style="margin-top: 12px; text-align: center; list-style: none;">
                <button id="save-place-btn" style="padding: 8px 18px; background: #ffb74d; color: white; border: none; border-radius: 20px; font-weight: bold; cursor: pointer;">
                    ⭐ この場所を保存
                </button>
            </li>
        `;
    }
}

// 保存ボタンはinnerHTMLで都度作り直されるので、documentレベルでイベント委任する
document.addEventListener('click', function (e) {
    if (e.target && e.target.id === 'save-place-btn') {
        if (!currentDisplayedPlace) return;

        // ★追加：未ログインなら保存させず、ログイン画面へ誘導する
        if (!currentUser) {
            openUserScreen();
            return;
        }

        e.target.disabled = true;
        e.target.textContent = '保存中...';

        savePlace(
            currentDisplayedPlace.name,
            currentDisplayedPlace.lat,
            currentDisplayedPlace.lon,
            currentDisplayedPlace.type
        )
        .then(res => {
            if (res.success) {
                e.target.textContent = '✅ 保存しました';

                // ★追加：キャッシュにも即座に反映しておく（再度開いた時に「保存済み」と判定されるように）
                savedPlacesCache.push({
                    id: res.id,
                    name: currentDisplayedPlace.name,
                    lat: currentDisplayedPlace.lat,
                    lon: currentDisplayedPlace.lon,
                    type: currentDisplayedPlace.type
                });
            } else if (res.duplicate) {
                // ★追加：すでに保存済みの場所は、削除するまで再保存できないようにする
                e.target.textContent = '⭐ 保存済みです';
            } else {
                e.target.textContent = '保存に失敗しました';
                e.target.disabled = false;
            }
        })
        .catch(error => {
            console.error("保存エラー:", error);
            e.target.textContent = '保存に失敗しました';
            e.target.disabled = false;
        });
    }
});