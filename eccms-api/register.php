<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Content-Type: application/json");

include 'db.php';

// Only allow POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode([
        "status" => "error",
        "message" => "Invalid request method"
    ]);
    exit;
}

// Get JSON data
$data = json_decode(file_get_contents("php://input"), true);

if (!$data || !isset($data['email']) || !isset($data['password'])) {
    echo json_encode([
        "status" => "error",
        "message" => "Invalid input data"
    ]);
    exit;
}

$email = trim($data['email']);
$password = $data['password'];

// 🔎 CHECK IF USER ALREADY EXISTS
$check = $conn->prepare("SELECT id FROM users WHERE email_or_phone = ?");
$check->bind_param("s", $email);
$check->execute();
$check->store_result();

if ($check->num_rows > 0) {
    echo json_encode([
        "status" => "error",
        "message" => "Account already exists"
    ]);
    $check->close();
    $conn->close();
    exit;
}

$check->close();

// 🔐 HASH PASSWORD (IMPORTANT)
$hashedPassword = password_hash($password, PASSWORD_DEFAULT);

// 📝 INSERT NEW USER
$stmt = $conn->prepare("
    INSERT INTO users (email_or_phone, password, created_at)
    VALUES (?, ?, NOW())
");

$stmt->bind_param("ss", $email, $hashedPassword);

if ($stmt->execute()) {
    echo json_encode([
        "status" => "success",
        "message" => "Registration successful"
    ]);
} else {
    echo json_encode([
        "status" => "error",
        "message" => "Database insert failed: " . $stmt->error
    ]);
}

$stmt->close();
$conn->close();
?>