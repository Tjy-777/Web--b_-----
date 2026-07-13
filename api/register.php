<?php
header('Content-Type: application/json');
require_once __DIR__ . '/config.php';

$input = json_decode(file_get_contents('php://input'), true);
$username = isset($input['username']) ? trim($input['username']) : '';
$password = isset($input['password']) ? (string)$input['password'] : '';

if (mb_strlen($username) < 2 || mb_strlen($username) > 50) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'ユーザー名は2〜50文字で入力してください']);
    exit;
}
if (mb_strlen($password) < 6) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'パスワードは6文字以上で入力してください']);
    exit;
}

try {
    $check = $pdo->prepare('SELECT id FROM users WHERE username = :username');
    $check->execute([':username' => $username]);
    if ($check->fetch()) {
        http_response_code(409);
        echo json_encode(['success' => false, 'error' => 'このユーザー名はすでに使われています']);
        exit;
    }

    $hash = password_hash($password, PASSWORD_DEFAULT);

    $stmt = $pdo->prepare('INSERT INTO users (username, password_hash) VALUES (:username, :hash)');
    $stmt->execute([':username' => $username, ':hash' => $hash]);

    $userId = (int)$pdo->lastInsertId();

    // 登録と同時に自動的にログイン状態にする
    $_SESSION['user_id'] = $userId;
    $_SESSION['username'] = $username;

    echo json_encode(['success' => true, 'user' => ['id' => $userId, 'username' => $username]]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => '登録に失敗しました']);
}