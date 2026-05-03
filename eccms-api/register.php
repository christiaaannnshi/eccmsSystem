<?php
// register.php
// Registers a new user

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once('db.php');

$input = file_get_contents('php://input');
$body = json_decode($input, true);
if (!is_array($body)) {
    $body = $_POST;
}

$identifier = isset($body['email']) ? $conn->real_escape_string($body['email']) : '';
$password   = isset($body['password']) ? $conn->real_escape_string($body['password']) : '';

if (!$identifier || !$password) {
    echo json_encode(['status' => 'error', 'message' => 'Missing email/phone or password']);
    exit;
}

if (strlen($password) < 6) {
    echo json_encode(['status' => 'error', 'message' => 'Password must be at least 6 characters']);
    exit;
}

// Check if email_or_phone exists
$check_sql = "SELECT id FROM users WHERE email_or_phone='$identifier' LIMIT 1";
$check_result = $conn->query($check_sql);
if ($check_result && $check_result->num_rows > 0) {
    echo json_encode(['status' => 'error', 'message' => 'Email already registered']);
    exit;
}

// hash the password before storing
$hashed = password_hash($password, PASSWORD_DEFAULT);

// Insert user
$sql = "INSERT INTO users (email_or_phone, password) VALUES ('$identifier', '$hashed')";
if ($conn->query($sql) === TRUE) {
    echo json_encode([
        'status' => 'success',
        'message' => 'Registration successful'
    ]);
} else {
    echo json_encode(['status' => 'error', 'message' => 'Failed to register']);
}

$conn->close();
?>