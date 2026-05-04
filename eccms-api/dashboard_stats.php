<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

include 'db.php';

$total = 0;
$solved = 0;
$pending = 0;

$totalResult = $conn->query("SELECT COUNT(*) AS total FROM complaints");
if ($totalResult) {
    $total = (int) ($totalResult->fetch_assoc()['total'] ?? 0);
}

$solvedResult = $conn->query("SELECT COUNT(*) AS solved FROM complaints WHERE LOWER(status) IN ('solved', 'completed')");
if ($solvedResult) {
    $solved = (int) ($solvedResult->fetch_assoc()['solved'] ?? 0);
}

$pendingResult = $conn->query("SELECT COUNT(*) AS pending FROM complaints WHERE LOWER(status) = 'reported'");
if ($pendingResult) {
    $pending = (int) ($pendingResult->fetch_assoc()['pending'] ?? 0);
}

echo json_encode([
    'status' => 'success',
    'total' => $total,
    'solved' => $solved,
    'pending' => $pending
]);

$conn->close();
?>