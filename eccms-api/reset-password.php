<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Methods: POST, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

include 'db.php';
}

$rawInput = file_get_contents('php://input');
$body = json_decode($rawInput, true);
if (!is_array($body)) {
    $body = [];
}

$identifier = '';
if (!empty($body['identifier'])) {
    $identifier = $body['identifier'];
} elseif (!empty($body['email'])) {
    $identifier = $body['email'];
} elseif (!empty($body['phone'])) {
    $identifier = $body['phone'];
} elseif (!empty($_POST['identifier'])) {
    $identifier = $_POST['identifier'];
} elseif (!empty($_POST['email'])) {
    $identifier = $_POST['email'];
} elseif (!empty($_POST['phone'])) {
    $identifier = $_POST['phone'];
}

$password = '';
if (!empty($body['password'])) {
    $password = $body['password'];
} elseif (!empty($_POST['password'])) {
    $password = $_POST['password'];
}

$identifier = $conn->real_escape_string(trim((string)$identifier));
$password = trim((string)$password);

if ($identifier === '' || $password === '') {
    echo json_encode(['status' => 'error', 'message' => 'Missing identifier or password']);
    $conn->close();
    exit;
}

if (strlen($password) < 6) {
    echo json_encode(['status' => 'error', 'message' => 'Password must be at least 6 characters']);
    $conn->close();
    exit;
}

$hasEmailOrPhone = ($conn->query("SHOW COLUMNS FROM users LIKE 'email_or_phone'")?->num_rows ?? 0) > 0;
$hasEmail = ($conn->query("SHOW COLUMNS FROM users LIKE 'email'")?->num_rows ?? 0) > 0;
$hasPhone = ($conn->query("SHOW COLUMNS FROM users LIKE 'phone'")?->num_rows ?? 0) > 0;

$whereClause = '';
if ($hasEmailOrPhone) {
    $whereClause = "email_or_phone='$identifier'";
} elseif ($hasEmail && $hasPhone) {
    $whereClause = "(email='$identifier' OR phone='$identifier')";
} elseif ($hasEmail) {
    $whereClause = "email='$identifier'";
}

if ($whereClause === '') {
    echo json_encode(['status' => 'error', 'message' => 'Users table schema is not supported for password reset']);
    $conn->close();
    exit;
}

$checkSql = "SELECT id, reset_expires, reset_password FROM users WHERE $whereClause LIMIT 1";
$checkResult = $conn->query($checkSql);
if (!$checkResult || $checkResult->num_rows === 0) {
    echo json_encode(['status' => 'error', 'message' => 'Reset session expired. Please request a new code.']);
    $conn->close();
    exit;
}

$user = $checkResult->fetch_assoc();
$expiresAt = strtotime((string)($user['reset_expires'] ?? ''));
$hasResetCode = !empty($user['reset_password']);

if (!$hasResetCode || !$expiresAt || $expiresAt < time()) {
    echo json_encode(['status' => 'error', 'message' => 'Reset session expired. Please request a new code.']);
    $conn->close();
    exit;
}

$userId = (int)$user['id'];
$hashedPassword = password_hash($password, PASSWORD_DEFAULT);
$hashedPasswordEscaped = $conn->real_escape_string($hashedPassword);

$updateSql = "UPDATE users SET password='$hashedPasswordEscaped', reset_password=NULL, reset_expires=NULL WHERE id=$userId";
if ($conn->query($updateSql)) {
    echo json_encode(['status' => 'success', 'message' => 'Password changed successfully']);
} else {
    echo json_encode(['status' => 'error', 'message' => 'Failed to update password']);
}

$conn->close();
