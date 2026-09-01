// ======================================================
// map-click.js
// 地図をタップした場所に仮ピンを立て、周辺の公園情報を検索する
// ★依存：state.js, map-init.js, info-sheet.js, parks.js
// ======================================================

// ★追加：このクリックが発生した時点で、仮ピンのポップアップが「開いていたか」を覚えておく変数
//   （Leafletは「clickイベントの前」に自動でポップアップを閉じてしまうため、
//   click内でisPopupOpen()を見てももう手遅れ。preclickの時点で先に記録しておく）
let popupWasOpenBeforeThisClick = false;

map.on('preclick', function () {
    popupWasOpenBeforeThisClick = !!(selectedMarker && selectedMarker.isPopupOpen());
});

map.on("click", function (e) {

    // ★追加：直前にストリートビュールートやレイヤー切り替えメニューが操作されていた場合、
    //   今回のクリックは無視する
    if (ignoreNextMapClick) {
        ignoreNextMapClick = false;
        return;
    }

    // ★追加：仮ピンのポップアップが開いている状態でのクリックは、
    //   「ポップアップを閉じるだけ」の1回として扱い、新しい仮ピンは立てない。
    //   （ポップアップは既にLeaflet標準の動作で閉じられている＝テキストだけが消えた状態）
    //   仮ピン自体はそのまま残しておき、次のクリックから通常通り新しい仮ピンを立てられるようにする。
    if (popupWasOpenBeforeThisClick) {
        popupWasOpenBeforeThisClick = false;
        return;
    }

    const lat = e.latlng.lat;
    const lon = e.latlng.lng;

    // 赤いピンを更新
    if (selectedMarker) {
        map.removeLayer(selectedMarker);
    }

    selectedMarker = L.marker([lat, lon], {
    icon: new L.Icon({
        iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    })
}).addTo(map);

// ポップアップ表示
selectedMarker.bindPopup(`
    <div style="text-align:center;">
        <b>選択した場所</b><br>
        <button id="open-detail-btn"
            style="
                margin-top:8px;
                padding:6px 12px;
                background:#d32f2f;
                color:white;
                border:none;
                border-radius:5px;
                cursor:pointer;">
            この場所の情報を見る
        </button>
    </div>
`);

// ボタンが押されたら検索
selectedMarker.on("popupopen", (e) => {

    // ★追加：ポップアップ右上の「×」ボタンで閉じた場合だけ、仮ピンも一緒に消す
    //   （それ以外の閉じ方＝地図の別の場所をタップして自動で閉じた場合などは、
    //   テキスト（ポップアップ）だけを消して仮ピンはそのまま残す）
    const popupElement = e.popup.getElement();
    const closeBtn = popupElement ? popupElement.querySelector('.leaflet-popup-close-button') : null;
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            if (selectedMarker) {
                map.removeLayer(selectedMarker);
                selectedMarker = null;
            }
        });
    }

    const btn = document.getElementById("open-detail-btn");

    if (btn) {

            btn.onclick = () => {
        // ① 情報シートを先に開く
        infoSheet.classList.add("open");

        // または現在の開く処理を呼ぶ
        infoSheet.style.height = `400px`;

        // ② 「検索中」を表示
        document.getElementById("park-title").textContent = "検索中...";
        document.getElementById("park-features-list").innerHTML =
            "<li>📍 周辺の公園情報を検索しています...</li>";

        // ③ 検索開始
        searchNearestPark(lat, lon);
        };
    }
});

// ピンを立てたらポップアップを開く
selectedMarker.openPopup();

});