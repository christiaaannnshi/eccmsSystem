<?php
// dashboard_stats.php
// Returns dashboard statistics: total complaints, solved, pending

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

require_once('db.php');

// Get total complaints
$total_sql = "SELECT COUNT(*) as total FROM complaints";
$total_result = $conn->query($total_sql);
$total = $total_result->fetch_assoc()['total'];

// Get solved complaints (assuming status column with 'Solved')
$solved_sql = "SELECT COUNT(*) as solved FROM complaints WHERE status = 'Solved'";
$solved_result = $conn->query($solved_sql);
$solved = $solved_result->fetch_assoc()['solved'];

// Get pending complaints (assuming status 'Pending')
$pending_sql = "SELECT COUNT(*) as pending FROM complaints WHERE status = 'Pending'";
$pending_result = $conn->query($pending_sql);
$pending = $pending_result->fetch_assoc()['pending'];

// Get reopened complaints
$reopened_sql = "SELECT COUNT(*) as reopened FROM complaints WHERE LOWER(status) = 'reopened'";
$reopened_result = $conn->query($reopened_sql);
$reopened = $reopened_result->fetch_assoc()['reopened'];

echo json_encode([
    'total' => (int)$total,
    'solved' => (int)$solved,
    'pending' => (int)$pending,
    'reopened' => (int)$reopened
]);

$conn->close();
?>