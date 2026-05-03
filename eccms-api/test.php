<?php
// test.php
// Describe tables

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

require_once('db.php');

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