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
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxNativeZoom: 20, // ★追加：CyclOSMが実際にタイルを提供している上限ズーム
    maxZoom: 20         // ★追加：地図自体の最大ズームもここに合わせておく
});

const satelliteMap = L.tileLayer('https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/{z}/{x}/{y}.jpg', {
    attribution: '© <a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank">国土地理院</a>',
    maxNativeZoom: 18, // ★追加：国土地理院「写真」タイルが実際に提供している上限ズーム
                        //   （これを超える分は、18の画像を自動で拡大して表示される）
    maxZoom: 20         // ★追加：地図自体の最大ズームと合わせる（拡大表示はぼやけるが「読み込まれない」状態は防げる）
});

// ======================================================
// ★追加：航空写真には地名・道路名などの文字情報が一切含まれていないため、
//   現在地がわかりにくいという問題への対処。
//   CARTO提供の「ラベルのみ」タイル（APIキー不要・無料）を、
//   航空写真の上に重ねて表示する。
// ======================================================

// ★追加：写真タイル(zIndex 200)より上、ピンなどのマーカー(zIndex 400〜600)より下に
//   専用のペインを作っておく（ラベルがピンや情報を隠してしまわないようにするため）
map.createPane('satelliteLabelsPane');
map.getPane('satelliteLabelsPane').style.zIndex = 350;
map.getPane('satelliteLabelsPane').style.pointerEvents = 'none'; // クリック等はそのまま地図に通す

const satelliteLabels = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png', {
    attribution: '© <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 20,
    detectRetina: true,        // ★追加：文字が潰れないよう、高精細ディスプレイでは高解像度タイルを使う
    pane: 'satelliteLabelsPane'
});

normalMap.addTo(map);

const mapillaryUrl = 'https://tiles.mapillary.com/maps/vtp/mly1_public/2/{z}/{x}/{y}?access_token=' + CONFIG.MAPILLARY_TOKEN;
const mapillaryLines = L.vectorGrid.protobuf(mapillaryUrl, {
    maxNativeZoom: 14, 
    vectorTileLayerStyles: {
        sequence: {
            color: '#3ca3df', 
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
// ★追加：ベースの地図が切り替わったら、ラベルオーバーレイの表示も連動させる
//   ・航空写真に切り替えた時 → ラベルを自動で重ねる（地名が消えて困る問題への対処）
//   ・通常の地図に戻した時 → 元々地名入りの地図なので、二重にならないよう外す
// ======================================================
map.on('baselayerchange', function (e) {
    if (e.layer === satelliteMap) {
        satelliteLabels.addTo(map);
    } else {
        map.removeLayer(satelliteLabels);
    }
});

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