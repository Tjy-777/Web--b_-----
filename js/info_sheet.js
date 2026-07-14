// ======================================================
// info-sheet.js
// 画面下部からせり出す情報シートの開閉 ＆ 上下ドラッグ機能
// ★依存：state.js, map-init.js（ヘッダー要素を参照）
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