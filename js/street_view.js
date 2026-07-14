// ======================================================
// street-view.js
// 指定した場所の最寄りのMapillary写真を検索して表示する
// ★依存：state.js, info-sheet.js, config.js（CONFIG.MAPILLARY_TOKEN）
// ======================================================
function showStreetView(lat, lon) {
    const viewer = document.getElementById('mapillary-viewer');
    const placeholder = document.getElementById('streetview-placeholder');
    const googleBtnArea = document.getElementById('google-btn-area');
    const googleSvLink = document.getElementById('google-sv-link');

    // ★追加：ドラッグで手動変更された高さをクリアして、CSS（520px）が効くようにする！
    if (infoSheet) {
        infoSheet.style.height = ''; 
        infoSheet.style.transition = 'height 0.3s ease-in-out'; // アニメーションも復活させる
    }

    if (placeholder) {
        placeholder.textContent = "現地の写真を検索中...";
        placeholder.style.display = 'block';
    }
    if (viewer) viewer.style.display = 'none';

    const searchUrl = `https://graph.mapillary.com/images?fields=id&lat=${lat}&lng=${lon}&radius=50&access_token=${CONFIG.MAPILLARY_TOKEN}`;

    fetch(searchUrl)
        .then(response => response.json())
        .then(data => {
            if (data.data && data.data.length > 0) {
                const imageId = data.data[0].id;
                
                if (viewer) {
                    viewer.src = `https://www.mapillary.com/embed?image_key=${imageId}&style=photo`;
                    viewer.style.display = 'block';
                }
                if (placeholder) placeholder.style.display = 'none';
            } else {
                if (placeholder) placeholder.textContent = "この場所の近く（50m以内）に写真は見つかりませんでした。";
            }
        })
        .catch(error => {
            console.error("写真の検索エラー:", error);
            if (placeholder) placeholder.textContent = "写真の読み込みでエラーが発生しました。";
        });

    if (googleSvLink) {
        googleSvLink.href = `https://www.google.com/maps?layer=c&cbll=${lat},${lon}`;
        if (googleBtnArea) googleBtnArea.style.display = 'block';
    }

    if (infoSheet) infoSheet.classList.add('open');
    if (toggleBtn) toggleBtn.textContent = '▼';
}