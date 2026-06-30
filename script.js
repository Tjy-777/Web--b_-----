// ======================================================
// 1. マップの初期設定（指定した場所をスタート地点にする）
// ======================================================

const startLat = 35.4637949;  // 緯度
const startLon = 139.5128958; // 経度

// ① 地図の初期化（★横並び順をコントロールするため、zoomControl: false を追加して標準の＋－を一度消します）
const map = L.map('map-area', { zoomControl: false }).setView([startLat, startLon], 15);

// コピーライトを右上に移動
map.attributionControl.setPosition('topright');

// ②-A 通常の地図データ（CyclOSM）の準備
const normalMap = L.tileLayer('https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
});

// ②-B ★新しく追加：国土地理院の航空写真データの準備
const satelliteMap = L.tileLayer('https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/{z}/{x}/{y}.jpg', {
    attribution: '&copy; <a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank">国土地理院</a>'
});

// 最初は通常の地図を表示しておく
normalMap.addTo(map);


// 🔄 【ここがポイント】切り替えボタンと＋－ボタンを左上に順番に追加

const baseMaps = {
    "通常の地図": normalMap,
    "航空写真": satelliteMap
};

// 先に「写真切り替えボタン」を左上に追加（これが一番左になります）
L.control.zoom({ position: 'topleft' }).addTo(map);

// 後から「ズームボタン（＋－）」を左上に追加（これが写真切り替えの右隣になります）
L.control.layers(baseMaps, null, { position: 'topleft' }).addTo(map);


// ③ 指定したスタート地点にピン（マーカー）を立てる
const startMarker = L.marker([startLat, startLon]).addTo(map);
startMarker.bindPopup('<b>スタート地点</b>').openPopup();


// ======================================================
// 2. 情報シートの開閉機能
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
const markerGroup = L.layerGroup().addTo(map);
fetchNearbyParks(startLat, startLon);

function fetchNearbyParks(lat, lon) {
    markerGroup.clearLayers();

    const radius = 2000; // 検索範囲（メートル）
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
        if (!response.ok) throw new Error("サーバーエラー");
        return response.json();
    })
    .then(data => {
        if (data.elements && data.elements.length > 0) {
            data.elements.forEach(element => {
                const pLat = element.lat || (element.center && element.center.lat);
                const pLon = element.lon || (element.center && element.center.lon);
                
                // タグデータを取得（なければ空）
                const tags = element.tags || {};
                
                // 【改良】名前がない場合、タグの種類（公園か森か）を見て仮の名前をつける
                let fallbackName = "近くの自然スポット";
                if (tags.leisure === "park") fallbackName = "近くの公園（名称不明）";
                if (tags.landuse === "forest") fallbackName = "近くの管理された森（名称不明）";
                if (tags.natural === "wood") fallbackName = "近くの自然の森（名称不明）";

                const pName = tags.name ? tags.name : fallbackName;

                if (pLat && pLon) {
                    const marker = L.circleMarker([pLat, pLon], {
                        radius: 8,
                        fillColor: "#2e7d32",
                        color: "#ffffff",
                        weight: 2,
                        opacity: 1,
                        fillOpacity: 0.8
                    });

                    // 吹き出しの設定
                    marker.bindPopup(`
                        <div style="text-align:center;">
                            <b>${pName}</b><br>
                            <button class="select-park-btn" style="margin-top:8px; padding:4px 8px; background:#2e7d32; color:white; border:none; border-radius:4px; cursor:pointer;">
                                この場所の詳細を見る
                            </button>
                        </div>
                    `);

                    // ポップアップが開いたときにクリックイベントを仕込む（エラー回避）
                    marker.on('popupopen', (e) => {
                        const popupElement = e.popup.getElement();
                        const btn = popupElement.querySelector('.select-park-btn');
                        if (btn) {
                            btn.addEventListener('click', () => {
                                selectPark(pName, tags); // タグ情報も一緒に送る！
                            });
                        }
                    });

                    markerGroup.addLayer(marker);
                }
            });
        }
    })
    .catch(error => {
        console.error("公園データの取得に失敗しました:", error);
    });
}

/**
 * 詳細情報をボトムシートに反映して引き出す関数
 */
window.selectPark = function(name, tags) {
    // 1. 名前の書き換え
    const titleElement = document.getElementById('park-title');
    if (titleElement) titleElement.textContent = name;

    // 2. 詳細概要の書き換え
    const descriptionElement = document.getElementById('park-description');
    const featuresList = document.getElementById('park-features-list');
    
    if (featuresList) {
        featuresList.innerHTML = ''; // リストをリセット
        
        // タイプの判定
        // タイプの判定（名前に「市民の森」や「緑地」があれば管理された森として扱う）
        let typeText = "自然スポット";
        
        if (tags.leisure === "park") {
            typeText = "🌳 公園（レジャー施設）";
        } else if (tags.landuse === "forest") {
            typeText = "🌲 管理された森（市民の森・里山など）";
        } else if (tags.natural === "wood") {
            // ★ここを改良！自然の森タグでも、名前に「市民の森」か「緑地」が含まれていれば変更する
            if (name.includes("市民の森") || name.includes("緑地")) {
                typeText = "🌲 管理された森（市民の森・里山など）";
            } else {
                typeText = "🍃 自然の森（原生林など）";
            }
        }
        
        // トイレの有無
        let toiletsText = "❓ 情報なし";
        if (tags.toilets === "yes") toiletsText = "🧼 あり";
        if (tags.toilets === "no") toiletsText = "❌ なし";

        // HTMLを組み立てて挿入
        featuresList.innerHTML = `
            <li style="margin-bottom: 8px;"><b>分類:</b> ${typeText}</li>
            <li style="margin-bottom: 8px;"><b>公衆トイレ:</b> ${toiletsText}</li>
        `;

        if (tags.website) {
            featuresList.innerHTML += `
                <li style="margin-bottom: 8px;"><b>リンク:</b> <a href="${tags.website}" target="_blank" style="color: #2e7d32;">公式ウェブサイト 🔗</a></li>
            `;
        }
        
        if (descriptionElement) {
            descriptionElement.textContent = "現地のリアルタイム情報（OpenStreetMapデータ）";
        }
    }
    
    // 3. ボトムシートを引き出す
    if (infoSheet) infoSheet.classList.add('open');
    if (toggleBtn) toggleBtn.textContent = '▼';
};
