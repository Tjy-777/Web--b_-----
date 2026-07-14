// ======================================================
// state.js
// 全体で共有する状態（グローバル変数）と共通ユーティリティ関数
// ★このファイルは他のすべてのJSファイルより先に読み込むこと
// ======================================================

// ★このファイルから見て、PHPファイルを置いた場所への相対パス。
//   例：index.html と同じ階層に api フォルダを置いた場合 → 'api/'
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

// 現在ログイン中のユーザー情報（未ログインならnull）
let currentUser = null;

// ★追加：CSRF対策用トークン（me.phpから取得してPOST時にヘッダーへ付与する）
let csrfToken = null;

// 現在、情報シートに表示されている場所（保存ボタンで使う）
let currentDisplayedPlace = null;

// ★追加：ログイン中ユーザーが保存済みの場所（全件）をキャッシュしておく
//   これを使って「保存ボタンを押す前」から保存済みかどうかを判定する
let savedPlacesCache = [];