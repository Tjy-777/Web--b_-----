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