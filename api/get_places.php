<?php
header('Content-Type: application/json');
require_once __DIR__ . '/config.php';

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'ログインが必要です']);
    exit;
}
$userId = (int)$_SESSION['user_id'];

try {
    $stmt = $pdo->prepare(
        'SELECT id, name, lat, lon, type, created_at FROM saved_places WHERE user_id = :user_id ORDER BY created_at DESC'
    );
    $stmt->execute([':user_id' => $userId]);
    $places = $stmt->fetchAll();

    // lat/lon はフロント側で距離計算等に使うため数値型に変換しておく
    foreach ($places as &$place) {
        $place['lat'] = (float)$place['lat'];
        $place['lon'] = (float)$place['lon'];
    }

    echo json_encode($places);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => '取得に失敗しました']);
}