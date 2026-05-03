<?php
// reopen_complaint.php
// Allows a user to reopen a completed complaint with a reason.

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

$conn = new mysqli('localhost', 'root', '', 'eccms_db');
if ($conn->connect_error) {
    echo json_encode(['status' => 'error', 'message' => 'Database connection failed']);
    exit;
}

$conn->query("CREATE TABLE IF NOT EXISTS complaint_reopen_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    complaint_code VARCHAR(50) NOT NULL,
    user_id INT NOT NULL,
    reopen_reason TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_reopen_code (complaint_code),
    INDEX idx_reopen_user (user_id)
)");

$body = json_decode(file_get_contents('php://input'), true);
if (!is_array($body)) {
    $body = $_POST;
}

$complaintCode = trim((string)($body['complaint_code'] ?? ''));
$userId = (int)($body['user_id'] ?? 0);
$reason = trim((string)($body['reason'] ?? ''));

if ($complaintCode === '' || $userId <= 0 || $reason === '') {
    echo json_encode(['status' => 'error', 'message' => 'Complaint code, user ID, and reason are required']);
    $conn->close();
    exit;
}

$complaintCodeEscaped = $conn->real_escape_string($complaintCode);
$findComplaintSql = "SELECT complaint_code, user_id, status
                     FROM complaints
                     WHERE complaint_code = '$complaintCodeEscaped'
                     LIMIT 1";
$findComplaintResult = $conn->query($findComplaintSql);

if (!$findComplaintResult || $findComplaintResult->num_rows === 0) {
    echo json_encode(['status' => 'error', 'message' => 'Complaint not found']);
    $conn->close();
    exit;
}

$complaint = $findComplaintResult->fetch_assoc();
$ownerUserId = (int)($complaint['user_id'] ?? 0);
$currentStatus = strtolower(trim((string)($complaint['status'] ?? '')));

if ($ownerUserId !== $userId) {
    echo json_encode(['status' => 'error', 'message' => 'You can only reopen your own complaint']);
    $conn->close();
    exit;
}

if ($currentStatus !== 'completed') {
    echo json_encode(['status' => 'error', 'message' => 'Only completed complaints can be reopened']);
    $conn->close();
    exit;
}

$updateStatusSql = "UPDATE complaints
                    SET status = 'Reopened'
                    WHERE complaint_code = '$complaintCodeEscaped'";

if (!$conn->query($updateStatusSql)) {
    echo json_encode(['status' => 'error', 'message' => 'Failed to reopen complaint']);
    $conn->close();
    exit;
}

$reasonEscaped = $conn->real_escape_string($reason);
$insertReopenSql = "INSERT INTO complaint_reopen_requests (complaint_code, user_id, reopen_reason, created_at)
                    VALUES ('$complaintCodeEscaped', $userId, '$reasonEscaped', NOW())";
$conn->query($insertReopenSql);

echo json_encode([
    'status' => 'success',
    'message' => 'Complaint reopened successfully. It has been sent back to admin for review.',
    'new_status' => 'Reopened'
]);

$conn->close();
?>