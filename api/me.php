<?php
header('Content-Type: application/json');
require_once __DIR__ . '/config.php';

if (isset($_SESSION['user_id'])) {
    echo json_encode([
        'loggedIn' => true,
        'user' => [
            'id' => (int)$_SESSION['user_id'],
            'username' => $_SESSION['username']
        ],
        'csrfToken' => $_SESSION['csrf_token'] // ★追加
    ]);
} else {
    echo json_encode([
        'loggedIn' => false,
        'csrfToken' => $_SESSION['csrf_token'] // ★追加：未ログインでもトークンは発行済みなので渡す
    ]);
}