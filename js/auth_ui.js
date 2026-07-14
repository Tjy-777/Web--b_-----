// ======================================================
// auth-ui.js
// ★変更：ユーザー登録・ログインは login.html / register.html に分離
//   ここでは「ログイン状態の確認」と「プロフィール確認画面の開閉」だけを扱う
// ★依存：state.js, place-save.js（refreshSavedPlacesCache）, side-menu.js（closeSideMenu）
// ★このファイルは他のJSファイルの後、最後に読み込むこと（末尾でcheckLoginStatus()を呼ぶため）
// ======================================================
const sideUserArea = document.getElementById('side-user-area');
const userScreen = document.getElementById('user-screen');
const userScreenCloseBtn = document.getElementById('user-screen-close-btn');
const profileView = document.getElementById('profile-view');
const logoutBtn = document.getElementById('logout-btn');

// ハンバーガーメニュー下部の表示を、ログイン状態に応じて更新する
function updateSideUserArea() {
    const label = document.getElementById('side-user-label');
    if (!label) return;
    label.textContent = currentUser ? currentUser.username : 'ログイン / 新規登録';
}

// 起動時に一度、サーバーへログイン状態を問い合わせる
function checkLoginStatus() {
    return fetch(`${API_BASE}me.php`, { credentials: 'same-origin' })
        .then(res => res.json())
        .then(data => {
            currentUser = data.loggedIn ? data.user : null;
            csrfToken = data.csrfToken || null; // ★追加：CSRFトークンを保持
            updateSideUserArea();
            return refreshSavedPlacesCache(); // ★追加：保存済み一覧のキャッシュも合わせて更新
        })
        .catch(error => {
            console.error("ログイン状態の確認に失敗しました:", error);
            currentUser = null;
            updateSideUserArea();
        });
}

// ログイン中は本人確認画面を開く。未ログインならログインページへ移動する
function openUserScreen() {
    if (currentUser) {
        if (!userScreen) return;
        const nameEl = document.getElementById('profile-username');
        if (nameEl) nameEl.textContent = currentUser.username;
        userScreen.classList.add('open');
    } else {
        // ★変更：別ページ（login.html）へ遷移する
        window.location.href = 'login.html';
    }
}

function closeUserScreen() {
    if (userScreen) userScreen.classList.remove('open');
}

// ハンバーガーメニュー下部のユーザー欄をタップ → メニューを閉じてユーザー画面 or ログインページへ
if (sideUserArea) {
    sideUserArea.addEventListener('click', () => {
        closeSideMenu();
        openUserScreen();
    });
}

if (userScreenCloseBtn) userScreenCloseBtn.addEventListener('click', closeUserScreen);

// ログアウト
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        fetch(`${API_BASE}logout.php`, {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'X-CSRF-Token': csrfToken } // ★追加：CSRF対策
        })
            .then(res => res.json())
            .then(() => {
                currentUser = null;
                updateSideUserArea();
                closeUserScreen();
            });
    });
}

// ページ読み込み時に、ログイン状態を確認しておく
checkLoginStatus();