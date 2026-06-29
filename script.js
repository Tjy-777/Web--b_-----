// ======================================================
// 1. マップの初期設定（指定した場所をスタート地点にする）
// ======================================================

// ★ここに自分の好きな場所の「緯度」と「経度」を入れます
const startLat = 35.4637949;  // 緯度
const startLon = 139.5128958; // 経度

// ① 地図の初期化（指定した座標を中心に、ズームレベル「15」で表示）
const map = L.map('map-area').setView([startLat, startLon], 15);

// コピーライトを右上に移動
map.attributionControl.setPosition('topright');

// ② OpenStreetMapの地図データを読み込んで表示
L.tileLayer('https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

// ③ 指定したスタート地点にピン（マーカー）を立てる
const startMarker = L.marker([startLat, startLon]).addTo(map);

// ピンをクリックしたときに表示する文字（最初から開いた状態にします）
startMarker.bindPopup('<b>スタート地点</b>').openPopup();


// ======================================================
// 2. 情報シートの開閉機能（以前追加したものはそのまま残す）
// ======================================================
const infoSheet = document.getElementById('info-sheet');
const toggleBtn = document.getElementById('toggle-btn');

toggleBtn.addEventListener('click', () => {
    infoSheet.classList.toggle('open');
    if (infoSheet.classList.contains('open')) {
        toggleBtn.textContent = '▼';
    } else {
        toggleBtn.textContent = '▲';
    }
});

// ======================================================
// 3. 現在地周辺の公園データを自動取得してピンを追加する
// ======================================================

// 地図上に表示するピン（レイヤー）をまとめて管理するグループを作る
const markerGroup = L.layerGroup().addTo(map);

// アプリ起動時に、指定したスタート地点（新宿御苑など）の周りの公園を探す
fetchNearbyParks(startLat, startLon);

/**
 * 指定された座標の周辺（半径2km）にある公園を探してピンを立てる関数
 */
function fetchNearbyParks(lat, lon) {
    markerGroup.clearLayers();

    const radius = 2000; // 検索する範囲（メートル）
    // ★前回の429エラー対策として、より安定しているフランスのサーバーにURLを変更しています
    const overpassUrl = 'https://overpass-api.de/api/interpreter';
    
    const query = `
        [out:json][timeout:25];
        (
          nwr["leisure"="park"](around:${radius},${lat},${lon});
          nwr["landuse"="forest"](around:${radius},${lat},${lon});
          nwr["natural"="wood"](around:${radius},${lat},${lon});
        );
        out center;
    `;

    fetch(overpassUrl, {
        method: 'POST',
        body: query
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`サーバーエラー (ステータス: ${response.status})`);
        }
        return response.json();
    })
    .then(data => {
        if (data.elements && data.elements.length > 0) {
            data.elements.forEach(element => {
                const pLat = element.lat || (element.center && element.center.lat);
                const pLon = element.lon || (element.center && element.center.lon);
                const pName = (element.tags && element.tags.name) ? element.tags.name : "近くの自然・森（名称不明）";

                if (pLat && pLon) {
                    const marker = L.circleMarker([pLat, pLon], {
                        radius: 8,
                        fillColor: "#2e7d32",
                        color: "#ffffff",
                        weight: 2,
                        opacity: 1,
                        fillOpacity: 0.8
                    });

                    // ⭕️ 改良：onclickを使わず、ボタンに目印用のクラス（select-park-btn）だけをつける
                    marker.bindPopup(`
                        <div style="text-align:center;">
                            <b class="popup-park-name">${pName}</b><br>
                            <button class="select-park-btn" style="margin-top:8px; padding:4px 8px; background:#2e7d32; color:white; border:none; border-radius:4px; cursor:pointer;">
                                この公園の詳細を見る
                            </button>
                        </div>
                    `);

                    // ⭕️ 改良：ポップアップが開いた瞬間に、JavaScriptで直接クリックイベントを注入する（文字化け・エラーを100%回避）
                    marker.on('popupopen', (e) => {
                        const popupElement = e.popup.getElement();
                        const btn = popupElement.querySelector('.select-park-btn');
                        if (btn) {
                            btn.addEventListener('click', () => {
                                selectPark(pName);
                            });
                        }
                    });

                    markerGroup.addLayer(marker);
                }
            });
        } else {
            console.log("周辺に公園が見つかりませんでした。");
        }
    })
    .catch(error => {
        console.error("公園データの取得に失敗しました:", error);
    });
}

/**
 * ピンの中の「詳細を見る」が押された時に、ボトムシートに名前をセットして引き出す関数
 */
window.selectPark = function(name) {
    // ⭕️ 改良：HTML側が id="park-title" でも class="park-title" でも、どちらでも見つけ出せるように強化
    let titleElement = document.getElementById('park-title') || document.querySelector('.park-title');
    
    // もし上記で見つからなければ、シート内の最初の h2 か h3 を自動で書き換える（超保険処理）
    if (!titleElement && infoSheet) {
        titleElement = infoSheet.querySelector('h2') || infoSheet.querySelector('h3');
    }

    // 見つかった要素のテキストを書き換える
    if (titleElement) {
        titleElement.textContent = name;
    } else {
        console.error("名前を表示するためのHTML要素（#park-titleなど）が見つかりません。");
    }
    
    // ボトムシートを引き出す
    if (infoSheet) {
        infoSheet.classList.add('open');
    }
    if (toggleBtn) {
        toggleBtn.textContent = '▼';
    }
};
