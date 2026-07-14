<?php
header('Content-Type: application/json');
require_once __DIR__ . '/config.php';

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => '保存するにはログインが必要です']);
    exit;
}
verifyCsrfToken(); // ★追加
$userId = (int)$_SESSION['user_id'];

$input = json_decode(file_get_contents('php://input'), true);

$name = isset($input['name']) ? trim($input['name']) : '';
// ★追加：HTMLタグを含む名前は拒否する（保存型XSSの根本対策）
if ($name !== strip_tags($name)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => '場所の名前に使用できない文字が含まれています']);
    exit;
}

$lat  = isset($input['lat']) ? (float)$input['lat'] : null;
$lon  = isset($input['lon']) ? (float)$input['lon'] : null;
$type = isset($input['type']) ? trim($input['type']) : null;

if ($name === '' || $lat === null || $lon === null) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => '必要な情報が不足しています']);
    exit;
}

try {
    // ★追加：同じ名前・近い場所（半径50m以内）がすでに保存されていないか確認する
    //   緯度1度 ≒ 111,000m として、大まかな距離を計算する
    $checkStmt = $pdo->prepare(
        'SELECT id FROM saved_places
         WHERE user_id = :user_id
           AND name = :name
           AND (
                (lat - :lat) * (lat - :lat) * 111000 * 111000
              + (lon - :lon) * (lon - :lon) * 91000 * 91000
           ) <= 50 * 50
         LIMIT 1'
    );
    $checkStmt->execute([
        ':user_id' => $userId,
        ':name' => $name,
        ':lat' => $lat,
        ':lon' => $lon,
    ]);

    if ($checkStmt->fetch()) {
        http_response_code(409);
        echo json_encode(['success' => false, 'duplicate' => true, 'error' => 'この場所はすでに保存されています']);
        exit;
    }

    $stmt = $pdo->prepare(
        'INSERT INTO saved_places (user_id, name, lat, lon, type) VALUES (:user_id, :name, :lat, :lon, :type)'
    );
    $stmt->execute([
        ':user_id' => $userId,
        ':name' => $name,
        ':lat'  => $lat,
        ':lon'  => $lon,
        ':type' => $type,
    ]);

    echo json_encode(['success' => true, 'id' => $pdo->lastInsertId()]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => '保存に失敗しました']);
}