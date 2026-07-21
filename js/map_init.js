// ======================================================
// map-init.js
// 地図の初期設定・タイルレイヤー・レイヤー切り替えボタンの開閉
// ★依存：state.js（先に読み込むこと）
// ======================================================
const startLat = 35.4637949;  // 緯度
const startLon = 139.5128958; // 経度

const map = L.map('map-area', { zoomControl: false }).setView([startLat, startLon], 15);
map.attributionControl.setPosition('topright');

const normalMap = L.tileLayer('https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
});

const satelliteMap = L.tileLayer('https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/{z}/{x}/{y}.jpg', {
    attribution: '© <a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank">国土地理院</a>'
});

normalMap.addTo(map);

const mapillaryUrl = 'https://tiles.mapillary.com/maps/vtp/mly1_public/2/{z}/{x}/{y}?access_token=' + CONFIG.MAPILLARY_TOKEN;
const mapillaryLines = L.vectorGrid.protobuf(mapillaryUrl, {
    maxNativeZoom: 14, 
    vectorTileLayerStyles: {
        sequence: {
            color: '#2e7ab8', 
            weight: 1.5,      
            opacity: 0.5      
        },
        image: []
    },
    interactive: true, 
    attribution: '© <a href="https://www.mapillary.com/terms" target="_blank">Mapillary</a>'
});

// ★追加：ストリートビュールートやレイヤーボタンをクリックした直後の
//   地図クリック（仮ピン設置）を1回だけ無視するためのフラグ
let ignoreNextMapClick = false;

mapillaryLines.on('click', function(e) {
    // ★追加：この直後に発生する地図側のクリックで仮ピンが立たないようにする
    ignoreNextMapClick = true;

    const lat = e.latlng.lat;
    const lon = e.latlng.lng;
    
    const titleElement = document.getElementById('park-title');
    if (titleElement) titleElement.textContent = "ストリートビュー（指定地点）";

    // ★修正：保存ボタンの状態判定に使うため、先にセットしておく
    currentDisplayedPlace = { name: "ストリートビュー地点", lat: lat, lon: lon, type: null };

    const featuresList = document.getElementById('park-features-list');
    if (featuresList) {
        featuresList.innerHTML = '<li style="margin-bottom: 6px;">📍 地図上の撮影ルートが選択されました</li>';
        appendSaveButtonToFeaturesList();
    }

    showStreetView(lat, lon);
});

const baseMaps = {
    "通常の地図": normalMap,
    "航空写真": satelliteMap
};

const overlayMaps = {
    "ストリートビューを表示": mapillaryLines
};

L.control.zoom({ position: 'topleft' }).addTo(map);
const layersControl = L.control.layers(baseMaps, overlayMaps, { position: 'topleft' }).addTo(map);

// ======================================================
// ★修正：レイヤー切り替えボタンを「ホバーで開く」→「クリックで開く」に変更
// （Leaflet内部のmouseover/clickハンドラより先にイベントを止めることで競合を防ぐ）
// ======================================================
const layersContainer = layersControl.getContainer();
const layersToggle = layersContainer ? layersContainer.querySelector('.leaflet-control-layers-toggle') : null;

if (layersContainer && layersToggle) {
    // ★重要：documentの「キャプチャフェーズ」で先取りする。
    // これによりLeaflet内部がcontainer/toggleに直接バインドしているmouseover・clickハンドラより
    // 必ず先に実行され、stopPropagationで内部処理まで届かないようにできる。

    // ホバーによる自動展開を完全に無効化
    document.addEventListener('mouseover', function (e) {
        if (layersContainer.contains(e.target)) {
            e.stopPropagation();
        }
    }, true);

    document.addEventListener('mouseout', function (e) {
        if (layersContainer.contains(e.target)) {
            e.stopPropagation();
        }
    }, true);

    // クリックでのみ開閉する
    document.addEventListener('click', function (e) {
        if (layersToggle.contains(e.target)) {
            e.preventDefault();
            e.stopPropagation();

            layersContainer.classList.toggle('leaflet-control-layers-expanded');
        }
    }, true);

    // ★追加：メニューが開いている状態で、画面のどこをクリックしても閉じるようにする
    document.addEventListener('click', function (e) {
        // 開いていなければ何もしない
        if (!layersContainer.classList.contains('leaflet-control-layers-expanded')) return;

        // トグルボタン自体のクリックは、上の開閉処理に任せる（二重処理を避ける）
        if (layersToggle.contains(e.target)) return;

        // メニュー内部（ラジオボタンなど）のクリックはそのまま許可し、ここでは閉じない
        if (layersContainer.contains(e.target)) return;

        // ★追加：地図の内側をクリックして閉じた場合のみ、直後に発生する地図クリックで
        //   仮ピンが立たないようにする（地図の外側なら地図クリック自体が発生しないので不要）
        if (map.getContainer().contains(e.target)) {
            ignoreNextMapClick = true;
        }

        layersContainer.classList.remove('leaflet-control-layers-expanded');
    }, true);
}

const startMarker = L.marker([startLat, startLon]).addTo(map);
startMarker.bindPopup('<b>スタート地点</b>').openPopup();