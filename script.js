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
            color: '#35AF6D', 
            weight: 1.5,      
            opacity: 0.5      
        },
        image: []
    },
    interactive: true, 
    attribution: '© <a href="https://www.mapillary.com/" target="_blank">Mapillary</a>'
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
    const openHeight = 420;   // 開いた状態の標準の高さ

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
toggleBtn.addEventListener('mousedown', startDrag);
toggleBtn.addEventListener('touchstart', startDrag, { passive: false });

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
fetchNearbyParks(startLat, startLon);

function fetchNearbyParks(lat, lon) {
    markerGroup.clearLayers();
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

        featuresList.innerHTML = `
            <li style="margin-bottom: 6px;"><b>分類:</b> ${typeText}</li>
            <li style="margin-bottom: 6px;"><b>公衆トイレ:</b> ${toiletsText}</li>
        `;
        if (tags.website) {
            featuresList.innerHTML += `
                <li style="margin-bottom: 6px;"><b>リンク:</b> <a href="${tags.website}" target="_blank" style="color: #2e7d32;">公式ウェブサイト 🔗</a></li>
            `;
        }
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
