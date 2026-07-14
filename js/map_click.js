// ======================================================
// map-click.js
// 地図をタップした場所に仮ピンを立て、周辺の公園情報を検索する
// ★依存：state.js, map-init.js, info-sheet.js, parks.js
// ======================================================
map.on("click", function (e) {

    // ★追加：直前にストリートビュールートやレイヤー切り替えメニューが操作されていた場合、
    //   今回のクリックは無視する
    if (ignoreNextMapClick) {
        ignoreNextMapClick = false;
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
selectedMarker.on("popupopen", () => {

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