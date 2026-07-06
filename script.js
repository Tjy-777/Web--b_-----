// ======================================================
// 1. マップの初期設定
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
            color: '#3ca3df', 
            weight: 1.5,      
            opacity: 0.5      
        },
        image: []
    },
    interactive: true, 
    attribution: '© <a href="https://www.mapillary.com/terms" target="_blank">Mapillary</a>'
});

mapillaryLines.on('click', function(e) {
    const lat = e.latlng.lat;
    const lon = e.latlng.lng;
    
    const titleElement = document.getElementById('park-title');
    if (titleElement) titleElement.textContent = "ストリートビュー（指定地点）";
    
    const featuresList = document.getElementById('park-features-list');
    if (featuresList) {
        featuresList.innerHTML = '<li style="margin-bottom: 6px;">📍 地図上の撮影ルートが選択されました</li>';
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
L.control.layers(baseMaps, overlayMaps, { position: 'topleft' }).addTo(map);

const startMarker = L.marker([startLat, startLon]).addTo(map);
startMarker.bindPopup('<b>スタート地点</b>').openPopup();

// ======================================================
// 2. 情報シートの開閉 ＆ 上下ドラッグ機能（高さ引き伸ばし版！）
// ======================================================
const infoSheet = document.getElementById('info-sheet');
const toggleBtn = document.getElementById('toggle-btn');
const header = document.querySelector('header');

let startY = 0;
let initialHeight = 0;
let isDragging = false;
let isMoved = false;

// ① 開閉機能（ボタンをただクリックした時だけ動く）
toggleBtn.addEventListener('click', (e) => {
    if (isMoved) return;

    infoSheet.style.transition = 'height 0.3s ease-in-out';
    const currentHeight = infoSheet.offsetHeight;
    
    const closedHeight = 40;  // 閉じた状態の高さ
    const openHeight = 400;   // ★修正：CSSと合わせて 520 から 650 に変更する

    // 半分以上開いていたら閉じる、閉じていたら開く
    if (currentHeight > closedHeight + 10) {
        infoSheet.style.height = `${closedHeight}px`;
        infoSheet.classList.remove('open');
        toggleBtn.textContent = '▲';
    } else {
        infoSheet.style.height = `${openHeight}px`;
        infoSheet.classList.add('open');
        toggleBtn.textContent = '▼';
    }
});

// ② 矢印ボタン限定・ドラッグ機能（高さを引っ張り上げる）
toggleBtn.addEventListener('mousedown', startDrag); /* ★修正：infoSheet から toggleBtn に変更 */
toggleBtn.addEventListener('touchstart', startDrag, { passive: false }); /* ★修正：infoSheet から toggleBtn に変更 */

function startDrag(e) {
    if (e.type === 'mousedown') e.preventDefault(); 

    isDragging = true;
    isMoved = false;
    infoSheet.style.transition = 'none'; // ドラッグ中はアニメーションを消す

    // ★重要：現在の「高さ」を基準にする
    initialHeight = infoSheet.offsetHeight;

    if (e.type === 'touchstart') {
        startY = e.touches[0].clientY;
    } else {
        startY = e.clientY;
    }

    const viewer = document.getElementById('mapillary-viewer');
    if (viewer) viewer.style.pointerEvents = 'none';

    window.addEventListener('mousemove', dragMove);
    window.addEventListener('touchmove', dragMove, { passive: false });
    window.addEventListener('mouseup', stopDrag);
    window.addEventListener('touchend', stopDrag);
}

function dragMove(e) {
    if (!isDragging) return;
    if (e.type === 'touchmove') e.preventDefault(); 

    const clientY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;
    
    // ★ポイント：上に引っ張るとY座標は減るので、(startY - clientY) が「上に引き上げた量」になる
    const dy = startY - clientY; 
    
    if (Math.abs(dy) > 2) isMoved = true;

    // 現在の高さに、引っ張り上げた分を足す
    let newHeight = initialHeight + dy;

    // 制限1：【上限】ヘッダーの下端までしか伸びないようにする
    const headerBottom = header ? header.getBoundingClientRect().bottom : 0;
    const maxHeight = window.innerHeight - headerBottom;
    if (newHeight > maxHeight) newHeight = maxHeight;

    // 制限2：【下限】矢印ボタンの高さ（40px）より小さくならないようにする
    const minHeight = 40;
    if (newHeight < minHeight) newHeight = minHeight;

    // Y座標をずらすのではなく、シートの「高さ」を直接変える！
    infoSheet.style.height = `${newHeight}px`;
}

function stopDrag(e) {
    if (!isDragging) return;
    isDragging = false;
    
    infoSheet.style.transition = 'height 0.2s ease-out';
    
    const currentHeight = infoSheet.offsetHeight;
    const minHeight = 40;

    // 完全に閉じる位置の近くで離した時だけは、ピタッと閉じる
    if (currentHeight < minHeight + 20) {
        infoSheet.style.height = `${minHeight}px`;
        infoSheet.classList.remove('open');
        toggleBtn.textContent = '▲';
    } else {
        // それ以外は自由に止まり、開いていると判定する
        infoSheet.classList.add('open');
        toggleBtn.textContent = '▼';
    }

    const viewer = document.getElementById('mapillary-viewer');
    if (viewer) viewer.style.pointerEvents = '';

    window.removeEventListener('mousemove', dragMove);
    window.removeEventListener('touchmove', dragMove);
    window.removeEventListener('mouseup', stopDrag);
    window.removeEventListener('touchend', stopDrag);
}

// ======================================================
// 3. 現在地周辺の公園データを自動取得してピンを追加する
// ======================================================
const markerGroup = L.layerGroup().addTo(map);

let selectedMarker = null;

let parks = [];

fetchNearbyParks(startLat, startLon);

// ======================================================
// ★追加：地図を動かしたら、その場所周辺の公園を再検索する
// ======================================================
let lastFetchedLat = startLat;
let lastFetchedLon = startLon;
const REFETCH_DISTANCE = 500; // これ以上動いたら再検索（メートル）

map.on('moveend', function () {
    const center = map.getCenter();
    const distance = map.distance(
        [lastFetchedLat, lastFetchedLon],
        [center.lat, center.lng]
    );

    if (distance > REFETCH_DISTANCE) {
        lastFetchedLat = center.lat;
        lastFetchedLon = center.lng;
        fetchNearbyParks(center.lat, center.lng);
    }
});

function fetchNearbyParks(lat, lon) {

    markerGroup.clearLayers();

    parks = [];

    const radius = 2000;
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
                const tags = element.tags || {};
                
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

                    parks.push({
                        name: pName,
                        tags: tags,
                        lat: pLat,
                        lon: pLon
                    });

                    marker.bindPopup(`
                        <div style="text-align:center;">
                            <b>${pName}</b><br>
                            <button class="select-park-btn" style="margin-top:8px; padding:4px 8px; background:#2e7d32; color:white; border:none; border-radius:4px; cursor:pointer;">
                                この場所の詳細を見る
                            </button>
                        </div>
                    `);

                    marker.on('popupopen', (e) => {
                        const popupElement = e.popup.getElement();
                        const btn = popupElement.querySelector('.select-park-btn');
                        if (btn) {
                            btn.addEventListener('click', () => {
                                selectPark(pName, tags, pLat, pLon); 
                            });
                        }
                    });
                    markerGroup.addLayer(marker);
                }
            });
        }
    })
    .catch(error => console.error("公園データの取得に失敗しました:", error));
}

window.selectPark = function(name, tags, lat, lon) {
    const titleElement = document.getElementById('park-title');
    if (titleElement) titleElement.textContent = name;

    showStreetView(lat, lon);

    const featuresList = document.getElementById('park-features-list');
    if (featuresList) {
        featuresList.innerHTML = '';
        
        let typeText = "自然スポット";
        if (tags.leisure === "park") typeText = "🌳 公園（レジャー施設）";
        else if (tags.landuse === "forest") typeText = "🌲 管理された森（市民の森・里山など）";
        else if (tags.natural === "wood") {
            if (name.includes("市民の森") || name.includes("緑地")) typeText = "🌲 管理された森（市民の森・里山など）";
            else typeText = "🍃 自然の森（原生林など）";
        }
        
        let toiletsText = "❓ 情報なし";
        if (tags.toilets === "yes") toiletsText = "🧼 あり";
        if (tags.toilets === "no") toiletsText = "❌ なし";

        let playgroundText = "❓ 情報なし";
        if (tags.playground === "yes") playgroundText = "🛝 あり";
        if (tags.playground === "no") playgroundText = "❌ なし";

        let wheelchairText = "❓ 情報なし";
        if (tags.wheelchair === "yes") wheelchairText = "♿ 対応";
        if (tags.wheelchair === "no") wheelchairText = "❌ 非対応";
        if (tags.wheelchair === "limited") wheelchairText = "⚠️ 一部対応";

        let parkingText = "❓ 情報なし";
        if (tags.parking === "yes") parkingText = "🚗 あり";
        if (tags.parking === "no") parkingText = "❌ なし";

        featuresList.innerHTML = `
            <li style="margin-bottom: 6px;"><b>分類:</b> ${typeText}</li>
            <li style="margin-bottom: 6px;"><b>公衆トイレ:</b> ${toiletsText}</li>
        `;
        if (tags.website) {
            featuresList.innerHTML += `
                <li style="margin-bottom: 6px;"><b>リンク:</b> <a href="${tags.website}" target="_blank" style="color: #2e7d32;">公式ウェブサイト 🔗</a></li>
            `;
        }
        featuresList.innerHTML += `
           <li><b>遊具:</b> ${playgroundText}</li>
        `;

        featuresList.innerHTML += `
            <li><b>バリアフリー:</b> ${wheelchairText}</li>
        `;

        featuresList.innerHTML += `
            <li><b>駐車場:</b> ${parkingText}</li>
        `;

    }
};

// ======================================================
// 4. 指定した場所の最寄りの写真を検索して表示する関数
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

// ==========================================
// 地図をタップした場所を検索
// ==========================================
map.on("click", function (e) {

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

// ======================================================
// ★追加：タップした地点だけを対象にした軽量・即時検索
// ======================================================
function fetchNearestParkAtPoint(lat, lon) {
    const radius = 300; // ピンポイントなので範囲は小さくてOK（速度優先）
    const overpassUrl = 'https://overpass-api.de/api/interpreter';

    const query = `
        [out:json][timeout:15];
        (
          nwr["leisure"="park"](around:${radius},${lat},${lon});
          nwr["landuse"="forest"](around:${radius},${lat},${lon});
          nwr["natural"="wood"](around:${radius},${lat},${lon});
        );
        out center;
    `;

    return fetch(overpassUrl, { method: 'POST', body: query })
        .then(response => {
            if (!response.ok) throw new Error("サーバーエラー");
            return response.json();
        })
        .then(data => {
            const results = [];
            if (data.elements && data.elements.length > 0) {
                data.elements.forEach(element => {
                    const pLat = element.lat || (element.center && element.center.lat);
                    const pLon = element.lon || (element.center && element.center.lon);
                    const tags = element.tags || {};

                    let fallbackName = "近くの自然スポット";
                    if (tags.leisure === "park") fallbackName = "近くの公園（名称不明）";
                    if (tags.landuse === "forest") fallbackName = "近くの管理された森（名称不明）";
                    if (tags.natural === "wood") fallbackName = "近くの自然の森（名称不明）";

                    const pName = tags.name ? tags.name : fallbackName;

                    if (pLat && pLon) {
                        results.push({ name: pName, tags: tags, lat: pLat, lon: pLon });
                    }
                });
            }
            return results;
        });
}

// 距離判定だけをまとめた共通関数
function findNearestParkInList(list, lat, lon) {
    if (!list || list.length === 0) return null;

    let nearest = null;
    let minDistance = Infinity;

    list.forEach(park => {
        const distance = map.distance([lat, lon], [park.lat, park.lon]);
        if (distance < minDistance) {
            minDistance = distance;
            nearest = park;
        }
    });

    return (nearest && minDistance <= 100) ? nearest : null;
}

function searchNearestPark(lat, lon) {

    // ① まずは既に読み込み済みの parks 配列から探す（一致すれば一瞬で表示できる）
    const localMatch = findNearestParkInList(parks, lat, lon);

    if (localMatch) {
        selectPark(localMatch.name, localMatch.tags, localMatch.lat, localMatch.lon);
        return;
    }

    // ② 既存データに無ければ、タップ地点だけを対象に即時検索する（検索範囲外エリア対策）
    fetchNearestParkAtPoint(lat, lon)
        .then(pinpointResults => {
            const match = findNearestParkInList(pinpointResults, lat, lon);

            if (match) {
                selectPark(match.name, match.tags, match.lat, match.lon);
            } else {
                document.getElementById("park-title").textContent = "選択した場所";
                document.getElementById("park-features-list").innerHTML =
                    `<li>この周辺100m以内に公園情報はありません。</li>`;
                showStreetView(lat, lon);
            }
        })
        .catch(error => {
            console.error("ピンポイント検索エラー:", error);
            document.getElementById("park-title").textContent = "選択した場所";
            document.getElementById("park-features-list").innerHTML =
                `<li>公園情報の検索中にエラーが発生しました。</li>`;
            showStreetView(lat, lon);
        });
}
