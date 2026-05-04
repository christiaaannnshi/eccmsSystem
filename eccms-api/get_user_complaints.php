<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

include 'db.php';

$user_id = isset($_GET['user_id']) ? (int) $_GET['user_id'] : 0;
if ($user_id <= 0) {
    echo json_encode(['status' => 'error', 'message' => 'Invalid user_id']);
    $conn->close();
    exit;
}

$sql = "SELECT complaint_code, category, location, status, created_at
        FROM complaints
        WHERE user_id = $user_id
        ORDER BY created_at DESC, id DESC";

$result = $conn->query($sql);
$complaints = [];

if ($result) {
    while ($row = $result->fetch_assoc()) {
        $complaints[] = $row;
    }
}

echo json_encode([
    'status' => 'success',
    'data' => $complaints
]);

$conn->close();
?>