<?php
// check-code.php
// expects JSON body { identifier: "email or phone", code: "123456" }
// verifies the submitted code against users.reset_password and expiry.

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Methods: POST, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$conn = new mysqli('localhost', 'root', '', 'eccms_db');
if ($conn->connect_error) {
    echo json_encode(['status' => 'error', 'message' => 'Database connection failed']);
    exit;
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

$code = '';
if (!empty($body['code'])) {
    $code = $body['code'];
} elseif (!empty($_POST['code'])) {
    $code = $_POST['code'];
}

$identifier = $conn->real_escape_string(trim((string)$identifier));
$code = $conn->real_escape_string(trim((string)$code));

if (!$identifier || !$code) {
    echo json_encode(['status' => 'error', 'message' => 'Missing identifier or code']);
    exit;
}

$hasEmailOrPhone = ($conn->query("SHOW COLUMNS FROM users LIKE 'email_or_phone'")?->num_rows ?? 0) > 0;
$hasEmail = ($conn->query("SHOW COLUMNS FROM users LIKE 'email'")?->num_rows ?? 0) > 0;
$hasPhone = ($conn->query("SHOW COLUMNS FROM users LIKE 'phone'")?->num_rows ?? 0) > 0;

$sql = '';
if ($hasEmailOrPhone) {
    $sql = "SELECT id, reset_password, reset_expires FROM users WHERE email_or_phone='$identifier' AND reset_password='$code' LIMIT 1";
} elseif ($hasEmail && $hasPhone) {
    $sql = "SELECT id, reset_password, reset_expires FROM users WHERE (email='$identifier' OR phone='$identifier') AND reset_password='$code' LIMIT 1";
} elseif ($hasEmail) {
    $sql = "SELECT id, reset_password, reset_expires FROM users WHERE email='$identifier' AND reset_password='$code' LIMIT 1";
}

if ($sql === '') {
        echo json_encode(['status' => 'error', 'message' => 'Users table schema is not supported for code verification']);
        $conn->close();
        exit;
}

$result = $conn->query($sql);
if ($result && $result->num_rows > 0) {
    $row = $result->fetch_assoc();
    if (strtotime($row['reset_expires']) >= time()) {
        echo json_encode(['status' => 'success']);
        // optionally clear the code so it can't be reused
        // $conn->query("UPDATE users SET reset_password=NULL, reset_expires=NULL WHERE id=".(int)$row['id']);
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Code expired']);
    }
} else {
    echo json_encode(['status' => 'error', 'message' => 'Invalid code or identifier']);
}

$conn->close();
