// ======================================================
// parks.js
// 現在地周辺の公園データ取得・ピン表示・詳細表示
// ★依存：state.js, map-init.js, street-view.js, place-save.js
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
    // const overpassUrl = "https://overpass.kumi.systems/api/interpreter";
    // const overpassUrl = "https://overpass.private.coffee/api/interpreter";
    // const overpassUrl = "https://lz4.overpass-api.de/api/interpreter";
    const overpassUrl = "https://overpass-api.de/api/interpreter";
    
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
                            <b>${escapeHtml(pName)}</b><br>
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

    // ★追加：保存ボタン用に、今表示している場所の情報を控えておく
    let placeType = null;
    if (tags.leisure === "park") placeType = "park";
    else if (tags.landuse === "forest") placeType = "forest";
    else if (tags.natural === "wood") placeType = "wood";

    currentDisplayedPlace = { name: name, lat: lat, lon: lon, type: placeType };

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
        if (tags.website && /^https?:\/\//i.test(tags.website)) {
            featuresList.innerHTML += `
                <li style="margin-bottom: 6px;"><b>リンク:</b> <a href="${escapeHtml(tags.website)}" target="_blank" rel="noopener noreferrer" style="color: #2e7d32;">公式ウェブサイト 🔗</a></li>
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

        appendSaveButtonToFeaturesList();
    }
};

// ======================================================
// ★追加：タップした地点だけを対象にした軽量・即時検索
// ======================================================
function fetchNearestParkAtPoint(lat, lon) {
    const radius = 300; // ピンポイントなので範囲は小さくてOK（速度優先）
    const overpassUrl = "https://lz4.overpass-api.de/api/interpreter";

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

                // ★修正：保存ボタンの状態判定に使うため、先にセットしておく
                currentDisplayedPlace = { name: "選択した場所", lat: lat, lon: lon, type: null };

                appendSaveButtonToFeaturesList();

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