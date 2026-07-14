<?php
header('Content-Type: application/json');
require_once __DIR__ . '/config.php';

verifyCsrfToken(); // ★追加

$_SESSION = [];
session_destroy();

echo json_encode(['success' => true]);