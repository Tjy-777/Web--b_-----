// ★このファイルから見て、PHPファイルを置いた場所への相対パス（script.jsと合わせる）
const API_BASE = 'api/';

// ★追加：innerHTMLに埋め込む前に、HTMLとして解釈されないようエスケープする
function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// ★追加：CSRF対策用トークン（me.phpから取得してPOST時にヘッダーへ付与する）
let csrfToken = null;

// ★追加：me.php を呼んでCSRFトークンを取得しておく
function fetchCsrfToken() {
    return fetch(`${API_BASE}me.php`, { credentials: 'same-origin' })
        .then(res => res.json())
        .then(data => {
            csrfToken = data.csrfToken || null;
        })
        .catch(error => {
            console.error("CSRFトークンの取得に失敗しました:", error);
        });
}

// ======================================================
// ★追加：左側に表示する参照用マップ
// ======================================================
const DEFAULT_LAT = 35.4637949;  // index.htmlのスタート地点と合わせる
const DEFAULT_LON = 139.5128958;

const favMap = L.map('favorites-map-area').setView([DEFAULT_LAT, DEFAULT_LON], 13);

L.tileLayer('https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(favMap);

// ★追加：flexレイアウトの高さ確定が地図の初期化より後になることがあるため、サイズを再計算しておく
setTimeout(() => favMap.invalidateSize(), 0);
window.addEventListener('resize', () => favMap.invalidateSize());

// 保存済み場所すべてを、控えめな緑の丸ピンで一覧表示しておく（全体像がひと目でわかるように）
const favOverviewGroup = L.layerGroup().addTo(favMap);

// クリックした場所だけを目立つピンで強調するためのマーカー（1つだけ表示）
let favSelectedMarker = null;

// 現在マップに反映している一覧の行（ハイライト用）
let favSelectedLi = null;

// ★追加：place.id → 対応する<li>要素、を引けるようにしておく（マップ側のピンをクリックした時に使う）
let favLiById = new Map();

function renderMapOverview(places) {
    favOverviewGroup.clearLayers();
    if (!places || places.length === 0) return;

    const bounds = [];
    places.forEach(place => {
        const marker = L.circleMarker([place.lat, place.lon], {
            radius: 6,
            fillColor: '#2e7d32',
            color: '#ffffff',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.8,
            bubblingMouseEvents: false // ★追加：このピンのクリックを地図本体のclickへ伝播させない
        });

        // ★追加：マップ上のピンをクリック → 一覧からクリックしたのと同じ処理をする
        marker.on('click', () => {
            focusOnMap(place, favLiById.get(place.id));
        });

        favOverviewGroup.addLayer(marker);
        bounds.push([place.lat, place.lon]);
    });

    // ★追加：保存済み全件が収まるように、初期表示範囲を自動調整する
    favMap.fitBounds(bounds, { padding: [30, 30], maxZoom: 15 });
}

// ★追加：クリックした場所にピンを立てて拡大表示する
function focusOnMap(place, li) {
    if (favSelectedMarker) {
        favMap.removeLayer(favSelectedMarker);
    }

    favSelectedMarker = L.circleMarker([place.lat, place.lon], {
        radius: 11,
        fillColor: '#ffb74d',
        color: '#ffffff',
        weight: 3,
        opacity: 1,
        fillOpacity: 1,
        bubblingMouseEvents: false // ★追加：このピンのクリックを地図本体のclickへ伝播させない
    }).addTo(favMap);

    favSelectedMarker.bindPopup(`<b>${escapeHtml(place.name)}</b>`).openPopup();

    // ★分かりやすいよう、その場所を中心に拡大する
    favMap.setView([place.lat, place.lon], 17, { animate: true });

    // 一覧側も、選択中の項目が分かるようにハイライトする
    if (favSelectedLi) favSelectedLi.classList.remove('is-active');
    if (li) {
        li.classList.add('is-active');
        li.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); // ★追加：一覧側も見える位置までスクロール
        favSelectedLi = li;
    }
}

// ★追加：ピン以外の「関係のない場所」を地図上でクリックしたら、選択状態を解除する
//   （circleMarker(ピン)は既定でクリックが地図側までは伝わらないため、
//   ここが発火するのはピン以外の場所をクリックした時だけになる）
favMap.on('click', () => {
    if (favSelectedMarker) {
        favMap.removeLayer(favSelectedMarker);
        favSelectedMarker = null;
    }
    if (favSelectedLi) {
        favSelectedLi.classList.remove('is-active');
        favSelectedLi = null;
    }
});

function fetchAllSavedPlaces() {
    // limitを指定しない = 全件取得
    return fetch(`${API_BASE}get_places.php`, { credentials: 'same-origin' }).then(res => res.json());
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

function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr.replace(' ', 'T'));
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('ja-JP', { year: 'numeric', month: 'short', day: 'numeric' });
}

function renderList(places) {
    const list = document.getElementById('favorites-full-list');
    list.innerHTML = '';

    // ★追加：一覧を作り直すたびに、id→<li>の対応表もリセットしておく
    favLiById = new Map();

    if (!places || places.length === 0) {
        list.innerHTML = '<li class="favorites-empty">保存した場所はまだありません</li>';
        return;
    }

    places.forEach(place => {
        const li = document.createElement('li');
        li.className = 'favorites-full-item';

        // ★修正：place.name / formatDate(place.created_at) をescapeHtmlでエスケープしてXSSを防ぐ
        li.innerHTML = `
            <div class="favorites-full-info">
                <div class="favorites-full-name">${escapeHtml(place.name)}</div>
                <div class="favorites-full-date">${escapeHtml(formatDate(place.created_at))}</div>
            </div>
            <button class="favorites-full-delete-btn" aria-label="削除">×</button>
        `;

        // ★追加：マップ側のピンをクリックした時に、この<li>を参照できるようにしておく
        favLiById.set(place.id, li);

        li.querySelector('.favorites-full-delete-btn').addEventListener('click', () => {
            // ★confirm()はダイアログ表示でHTML解釈されないためエスケープ不要
            if (!confirm(`「${place.name}」を削除しますか？`)) return;

            deletePlace(place.id).then(res => {
                if (res.success) {
                    loadList();
                } else {
                    alert(res.error || '削除に失敗しました');
                }
            });
        });

        // ★追加：名前部分をクリック → 左のマップにピンを立てて拡大表示する
        li.querySelector('.favorites-full-info').addEventListener('click', () => {
            focusOnMap(place, li);
        });

        list.appendChild(li);
    });
}

function loadList() {
    const list = document.getElementById('favorites-full-list');
    list.innerHTML = '<li class="favorites-empty">読み込み中...</li>';

    fetchAllSavedPlaces()
        .then(data => {
            // ログインしていない場合などはAPIが配列以外(エラーオブジェクト)を返す
            if (!Array.isArray(data)) {
                window.location.href = 'login.html';
                return;
            }
            renderList(data);
            renderMapOverview(data); // ★追加：地図側にも保存済み全件を反映する
        })
        .catch(error => {
            console.error("保存済み場所の取得に失敗しました:", error);
            list.innerHTML = '<li class="favorites-empty">読み込みに失敗しました</li>';
        });
}

document.getElementById('back-btn').addEventListener('click', () => {
    window.location.href = 'index.html';
});

// ★修正：先にCSRFトークンを取得してから一覧を読み込む
fetchCsrfToken().then(loadList);