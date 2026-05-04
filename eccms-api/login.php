<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS, PUT, DELETE");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json");

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

include("db.php");

$data = json_decode(file_get_contents("php://input"), true);

if (!$data || !isset($data['email']) || !isset($data['password'])) {
    echo json_encode([
        "status" => "error",
        "message" => "Invalid input"
    ]);
    exit;
}

$email = trim($data['email']);
$password = $data['password'];

// ✅ ONLY SELECT COLUMNS THAT EXIST
$stmt = $conn->prepare("
    SELECT id, email_or_phone, password 
    FROM users 
    WHERE email_or_phone = ?
");

$stmt->bind_param("s", $email);

if (!$stmt->execute()) {
    echo json_encode([
        "status" => "error",
        "message" => "Database query failed: " . $stmt->error
    ]);
    exit;
}

$result = $stmt->get_result();

if (!$result || $result->num_rows === 0) {
    echo json_encode([
        "status" => "error",
        "message" => "User not found"
    ]);
    exit;
}

$user = $result->fetch_assoc();

// ✅ VERIFY HASHED PASSWORD
if (password_verify($password, $user['password'])) {

    echo json_encode([
        "status" => "success",
        "message" => "Login successful",
        "user_id" => $user['id']
    ]);

} else {

    echo json_encode([
        "status" => "error",
        "message" => "Invalid password"
    ]);
}

$stmt->close();
$conn->close();
?>