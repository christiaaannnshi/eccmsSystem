<?php
// login.php
// Checks user credentials

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// reply to preflight and exit early
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

$conn = new mysqli('localhost', 'root', '', 'eccms_db');
if ($conn->connect_error) {
    echo json_encode(['status' => 'error', 'message' => 'Database connection failed']);
    exit;
}

// accept either JSON payload or traditional form data
$input = file_get_contents('php://input');
$body = json_decode($input, true);
if (!is_array($body)) {
    // fallback to $_POST when JSON parse failed / empty
    $body = $_POST;
}

$identifier = isset($body['email']) ? $conn->real_escape_string($body['email']) : '';
$password   = isset($body['password']) ? $conn->real_escape_string($body['password']) : '';

if (!$identifier || !$password) {
    echo json_encode(['status' => 'error', 'message' => 'Missing email/phone or password']);
    exit;
}

// lookup row by identifier, then verify password hash
$sql = "SELECT id, password FROM users WHERE email_or_phone='$identifier' LIMIT 1";
$result = $conn->query($sql);
if ($result && $result->num_rows > 0) {
    $row = $result->fetch_assoc();
    $stored = $row['password'];
    $ok = false;

    // check against hashed value first
    if (password_verify($password, $stored)) {
        $ok = true;
    } elseif ($password === $stored) {
        // legacy account: password stored in plain text
        $ok = true;
        // upgrade the hash for future logins
        $newhash = password_hash($password, PASSWORD_DEFAULT);
        $conn->query("UPDATE users SET password='$newhash' WHERE id=" . (int)$row['id']);
    }

    if ($ok) {
        echo json_encode([
            'status' => 'success',
            'message' => 'Login successful',
            'user_id' => (int)$row['id']
        ]);
    } else {
        // debugging information logged to server error log
        error_log("login_failed: identifier=$identifier, supplied='$password', stored='$stored'");
        echo json_encode(['status' => 'error', 'message' => 'Invalid credentials']);
    }
} else {
    error_log("login_no_user: identifier=$identifier");
    echo json_encode(['status' => 'error', 'message' => 'Invalid credentials']);
}

$conn->close();
?>