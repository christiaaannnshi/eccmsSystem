<?php
// test.php
// Describe tables

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$conn = new mysqli('localhost', 'root', '', 'eccms_db');
if ($conn->connect_error) {
    echo json_encode(['status' => 'error', 'message' => 'Database connection failed']);
    exit;
}

$complaints_desc = $conn->query("DESCRIBE complaints");
$users_desc = $conn->query("DESCRIBE users");

$complaints = [];
while ($row = $complaints_desc->fetch_assoc()) {
    $complaints[] = $row;
}

$users = [];
while ($row = $users_desc->fetch_assoc()) {
    $users[] = $row;
}

echo json_encode([
    'complaints' => $complaints,
    'users' => $users
]);

$conn->close();
?>