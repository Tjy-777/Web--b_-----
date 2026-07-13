<?php
header('Content-Type: application/json');
require_once __DIR__ . '/config.php';

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => '保存するにはログインが必要です']);
    exit;
}
$userId = (int)$_SESSION['user_id'];

$input = json_decode(file_get_contents('php://input'), true);

$name = isset($input['name']) ? trim($input['name']) : '';
$lat  = isset($input['lat']) ? (float)$input['lat'] : null;
$lon  = isset($input['lon']) ? (float)$input['lon'] : null;
$type = isset($input['type']) ? trim($input['type']) : null;

if ($name === '' || $lat === null || $lon === null) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => '必要な情報が不足しています']);
    exit;
}

try {
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