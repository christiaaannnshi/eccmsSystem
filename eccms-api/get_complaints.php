<?php
// get_complaints.php
// Returns all complaints with user details for admin

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

require_once('db.php');

// Ensure complaint_image column exists for older databases.
$columnCheck = $conn->query("SHOW COLUMNS FROM complaints LIKE 'complaint_image'");
if ($columnCheck && $columnCheck->num_rows === 0) {
    $conn->query("ALTER TABLE complaints ADD COLUMN complaint_image LONGTEXT NULL");
}

$actionReasonColumnCheck = $conn->query("SHOW COLUMNS FROM complaints LIKE 'action_reason'");
if ($actionReasonColumnCheck && $actionReasonColumnCheck->num_rows === 0) {
    $conn->query("ALTER TABLE complaints ADD COLUMN action_reason TEXT NULL AFTER status");
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

$sql = "SELECT
            c.id,
            c.user_id,
            c.category,
            c.location,
            c.description,
            c.complaint_image,
            c.status,
            c.action_reason,
            c.created_at,
            c.complaint_code,
            (
                SELECT rr.reopen_reason
                FROM complaint_reopen_requests rr
                WHERE rr.complaint_code = c.complaint_code
                ORDER BY rr.created_at DESC, rr.id DESC
                LIMIT 1
            ) AS reopen_reason,
            (
                SELECT rr.created_at
                FROM complaint_reopen_requests rr
                WHERE rr.complaint_code = c.complaint_code
                ORDER BY rr.created_at DESC, rr.id DESC
                LIMIT 1
            ) AS reopen_requested_at
        FROM complaints c
        ORDER BY c.id DESC";

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