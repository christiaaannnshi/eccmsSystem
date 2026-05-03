<?php
// get_notification_logs.php
// Fetches all notification logs for a specific user

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

$conn = new mysqli('localhost', 'root', '', 'eccms_db');
if ($conn->connect_error) {
    echo json_encode(['status' => 'error', 'message' => 'Database connection failed']);
    exit;
}

// Create notifications table if it doesn't exist
$createTableSql = "CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    complaint_code VARCHAR(50),
    action_type VARCHAR(50) NOT NULL,
    report_reason TEXT NULL,
    message TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
)";

$conn->query($createTableSql);

$reasonColumnCheck = $conn->query("SHOW COLUMNS FROM notifications LIKE 'report_reason'");
if ($reasonColumnCheck && $reasonColumnCheck->num_rows === 0) {
    $conn->query("ALTER TABLE notifications ADD COLUMN report_reason TEXT NULL AFTER action_type");
}

$conn->query("CREATE TABLE IF NOT EXISTS complaint_actions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    complaint_code VARCHAR(50) NOT NULL,
    complaint_name VARCHAR(255) NOT NULL,
    action_type VARCHAR(50) NOT NULL,
    action_reason TEXT NULL,
    action_date DATETIME DEFAULT CURRENT_TIMESTAMP
)");

$actionReasonColumnCheck = $conn->query("SHOW COLUMNS FROM complaint_actions LIKE 'action_reason'");
if ($actionReasonColumnCheck && $actionReasonColumnCheck->num_rows === 0) {
    $conn->query("ALTER TABLE complaint_actions ADD COLUMN action_reason TEXT NULL AFTER action_type");
}

// Get user_id from query parameter
$user_id = isset($_GET['user_id']) ? (int)$_GET['user_id'] : 0;

if ($user_id <= 0) {
    echo json_encode(['status' => 'error', 'message' => 'Invalid user ID']);
    exit;
}

// Fetch all notifications for this user, ordered by newest first.
// If report_reason is empty for older notification rows, fallback to the latest matching complaint action reason.
$sql = "SELECT
                        n.id,
                        n.complaint_code,
                        n.action_type,
                        COALESCE(
                                NULLIF(TRIM(n.report_reason), ''),
                                (
                                        SELECT ca2.action_reason
                                        FROM complaint_actions ca2
                                        WHERE ca2.complaint_code = n.complaint_code
                                            AND TRIM(COALESCE(ca2.action_reason, '')) <> ''
                                            AND (
                            LOWER(TRIM(ca2.action_type)) = LOWER(TRIM(n.action_type))
                                                    OR (
                                LOWER(TRIM(n.action_type)) IN ('report', 'reported')
                                AND LOWER(TRIM(ca2.action_type)) IN ('report', 'reported')
                            )
                            OR (
                                LOWER(TRIM(n.action_type)) IN ('delete', 'deleted')
                                AND LOWER(TRIM(ca2.action_type)) IN ('delete', 'deleted')
                                                    )
                                            )
                                        ORDER BY
                        CASE WHEN LOWER(TRIM(ca2.action_type)) = LOWER(TRIM(n.action_type)) THEN 0 ELSE 1 END,
                                            ca2.action_date DESC,
                                            ca2.id DESC
                                        LIMIT 1
                                ),
                                ''
                        ) AS report_reason,
                        n.message,
                        n.created_at
                FROM notifications n
                WHERE n.user_id = $user_id
                ORDER BY n.created_at DESC";

$result = $conn->query($sql);

$notifications = [];
if ($result) {
    while ($row = $result->fetch_assoc()) {
        $notifications[] = $row;
    }
}

echo json_encode([
    'status' => 'success',
    'data' => $notifications,
    'count' => count($notifications)
]);

$conn->close();
?>
