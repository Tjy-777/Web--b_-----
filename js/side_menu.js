// ======================================================
// side-menu.js
// ヘッダーの三本線メニューの開閉と、お気に入り一覧の読み込み・描画
// ★依存：state.js, map-init.js, street-view.js, place-save.js
// ======================================================
const menuBtn = document.getElementById('menu-btn');
const sideMenu = document.getElementById('side-menu');
const sideOverlay = document.getElementById('side-overlay');
const sideCloseBtn = document.getElementById('side-close-btn');

function openSideMenu() {
    sideMenu.classList.add('open');
    sideOverlay.classList.add('open');
    loadFavorites(); // ★追加：メニューを開くたびに最新の保存済み場所を読み込む
}

function closeSideMenu() {
    sideMenu.classList.remove('open');
    sideOverlay.classList.remove('open');
}

if (menuBtn) menuBtn.addEventListener('click', openSideMenu);
if (sideCloseBtn) sideCloseBtn.addEventListener('click', closeSideMenu);
if (sideOverlay) sideOverlay.addEventListener('click', closeSideMenu); // 項目以外(暗転部分)をクリックしたら閉じる

// ★追加：「お気に入り」の見出し部分をタップ → 一覧・削除ができる別ページへ移動
const favoritesMenuItem = document.getElementById('favorites-menu-item');
if (favoritesMenuItem) {
    favoritesMenuItem.addEventListener('click', () => {
        window.location.href = 'favorites.html';
    });
}

// ======================================================
// ★追加：お気に入り（保存した場所）一覧の読み込みと描画
// ======================================================
function loadFavorites() {
    const list = document.getElementById('favorites-list');
    if (!list) return;

    // ★追加：未ログインならAPIを呼ばず、ログインを促すメッセージだけ表示
    if (!currentUser) {
        list.innerHTML = '<li class="favorite-empty">ログインすると保存した場所が表示されます</li>';
        return;
    }

    list.innerHTML = '<li class="favorite-empty">読み込み中...</li>';

    fetchSavedPlaces(10) // ★変更：メイン画面は新しい順10件だけ表示
        .then(places => renderFavorites(places))
        .catch(error => {
            console.error("保存済み場所の取得に失敗しました:", error);
            list.innerHTML = '<li class="favorite-empty">読み込みに失敗しました</li>';
        });
}

function renderFavorites(places) {
    const list = document.getElementById('favorites-list');
    if (!list) return;

    list.innerHTML = '';

    if (!places || places.length === 0) {
        list.innerHTML = '<li class="favorite-empty">保存した場所はまだありません</li>';
        return;
    }

    places.forEach(place => {
        const li = document.createElement('li');
        li.className = 'favorite-item';
        // ★変更：メイン画面では削除できないようにするため、削除ボタンは表示しない
        li.innerHTML = `
            <span class="favorite-name">${escapeHtml(place.name)}</span>
        `;

        // 名前部分をクリック → その場所へ地図を移動して詳細を表示
        li.querySelector('.favorite-name').addEventListener('click', () => {
            map.setView([place.lat, place.lon], 17);

            document.getElementById('park-title').textContent = place.name;
            document.getElementById('park-features-list').innerHTML =
                '<li style="margin-bottom: 6px;">⭐ 保存した場所</li>';

            // ★修正：保存ボタンの状態判定に使うため、先にセットしておく
            currentDisplayedPlace = { name: place.name, lat: place.lat, lon: place.lon, type: place.type };

            appendSaveButtonToFeaturesList();

            showStreetView(place.lat, place.lon);
            closeSideMenu();
        });

        list.appendChild(li);
    });
}