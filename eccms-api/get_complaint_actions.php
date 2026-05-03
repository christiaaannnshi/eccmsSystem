<?php
// get_complaint_actions.php
// Returns complaint action history for reported and deleted complaints.

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$conn = new mysqli('localhost', 'root', '', 'eccms_db');
if ($conn->connect_error) {
    echo json_encode(['status' => 'error', 'message' => 'Database connection failed']);
    exit;
}

$conn->query("CREATE TABLE IF NOT EXISTS complaint_actions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    complaint_code VARCHAR(50) NOT NULL,
    complaint_name VARCHAR(255) NOT NULL,
    action_type VARCHAR(50) NOT NULL,
    action_reason TEXT NULL,
    action_date DATETIME DEFAULT CURRENT_TIMESTAMP
)");

$reasonColumnCheck = $conn->query("SHOW COLUMNS FROM complaint_actions LIKE 'action_reason'");
if ($reasonColumnCheck && $reasonColumnCheck->num_rows === 0) {
    $conn->query("ALTER TABLE complaint_actions ADD COLUMN action_reason TEXT NULL AFTER action_type");
}

$notificationReasonColumnCheck = $conn->query("SHOW COLUMNS FROM notifications LIKE 'report_reason'");
if ($notificationReasonColumnCheck && $notificationReasonColumnCheck->num_rows === 0) {
    $conn->query("ALTER TABLE notifications ADD COLUMN report_reason TEXT NULL AFTER action_type");
}

function normalize_action_type(string $value): string {
    $type = strtolower(trim($value));
    if ($type === 'delete' || $type === 'deleted') {
        return 'delete';
    }
    if ($type === 'report' || $type === 'reported') {
        return 'report';
    }
    return '';
}

function extract_reason_from_message(string $message): string {
    $trimmedMessage = trim($message);
    if ($trimmedMessage === '') {
        return '';
    }

    $reasonMarkerPosition = stripos($trimmedMessage, 'Reason:');
    if ($reasonMarkerPosition === false) {
        return '';
    }

    return trim(substr($trimmedMessage, $reasonMarkerPosition + 7));
}

$complaintNames = [];
$complaintsResult = $conn->query("SELECT complaint_code, category FROM complaints WHERE TRIM(COALESCE(complaint_code, '')) <> ''");
if ($complaintsResult) {
    while ($row = $complaintsResult->fetch_assoc()) {
        $code = trim((string)($row['complaint_code'] ?? ''));
        if ($code === '') {
            continue;
        }

        $complaintNames[$code] = trim((string)($row['category'] ?? '')) ?: 'Complaint';
    }
}

$history = [];

$notificationSql = "SELECT complaint_code, action_type, report_reason, message, created_at, id
                    FROM notifications
                    WHERE LOWER(TRIM(COALESCE(action_type, ''))) IN ('report', 'reported', 'delete', 'deleted')
                      AND TRIM(COALESCE(complaint_code, '')) <> ''
                    ORDER BY created_at DESC, id DESC";
$notificationResult = $conn->query($notificationSql);
if ($notificationResult) {
    while ($row = $notificationResult->fetch_assoc()) {
        $complaintCode = trim((string)($row['complaint_code'] ?? ''));
        $actionType = normalize_action_type((string)($row['action_type'] ?? ''));
        $actionReason = trim((string)($row['report_reason'] ?? ''));

        if ($actionReason === '') {
            $actionReason = extract_reason_from_message((string)($row['message'] ?? ''));
        }

        if ($complaintCode === '' || $actionType === '') {
            continue;
        }

        $key = strtolower($complaintCode . '|' . $actionType);
        if (!isset($history[$key])) {
            $history[$key] = [
                'complaint_code' => $complaintCode,
                'complaint_name' => $complaintNames[$complaintCode] ?? 'Complaint',
                'action_type' => $actionType,
                'action_reason' => $actionReason,
                'action_date' => $row['created_at'] ?? ''
            ];
        }
    }
}

$actionSql = "SELECT complaint_code, complaint_name, action_type, action_reason, action_date, id
              FROM complaint_actions
              WHERE TRIM(COALESCE(complaint_code, '')) <> ''
              ORDER BY action_date DESC, id DESC";
$actionResult = $conn->query($actionSql);
if ($actionResult) {
    while ($row = $actionResult->fetch_assoc()) {
        $complaintCode = trim((string)($row['complaint_code'] ?? ''));
        $actionReason = trim((string)($row['action_reason'] ?? ''));
        $actionType = normalize_action_type((string)($row['action_type'] ?? ''));

        if ($actionType === '' && $actionReason !== '') {
            $actionType = 'report';
        }

        if ($complaintCode === '' || $actionType === '') {
            continue;
        }

        $key = strtolower($complaintCode . '|' . $actionType);

        if (!isset($history[$key])) {
            $history[$key] = [
                'complaint_code' => $complaintCode,
                'complaint_name' => trim((string)($row['complaint_name'] ?? '')) ?: ($complaintNames[$complaintCode] ?? 'Complaint'),
                'action_type' => $actionType,
                'action_reason' => $actionReason,
                'action_date' => $row['action_date'] ?? ''
            ];
            continue;
        }

        if (trim((string)$history[$key]['action_reason']) === '' && $actionReason !== '') {
            $history[$key]['action_reason'] = $actionReason;
        }
    }
}

$actions = array_values($history);
usort($actions, static function (array $firstAction, array $secondAction): int {
    return strtotime((string)($secondAction['action_date'] ?? '')) <=> strtotime((string)($firstAction['action_date'] ?? ''));
});

echo json_encode([
    'status' => 'success',
    'data' => $actions
]);

$conn->close();
?>