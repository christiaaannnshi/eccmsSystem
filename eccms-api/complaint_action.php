<?php
// complaint_action.php
// Updates complaint status, records action logs, and creates user notifications.

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

$conn->query("CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    complaint_code VARCHAR(50),
    action_type VARCHAR(50) NOT NULL,
    report_reason TEXT NULL,
    message TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
)");

$notifReasonColumnCheck = $conn->query("SHOW COLUMNS FROM notifications LIKE 'report_reason'");
if ($notifReasonColumnCheck && $notifReasonColumnCheck->num_rows === 0) {
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

$reasonColumnCheck = $conn->query("SHOW COLUMNS FROM complaint_actions LIKE 'action_reason'");
if ($reasonColumnCheck && $reasonColumnCheck->num_rows === 0) {
    $conn->query("ALTER TABLE complaint_actions ADD COLUMN action_reason TEXT NULL AFTER action_type");
}

$complaintReasonColumnCheck = $conn->query("SHOW COLUMNS FROM complaints LIKE 'action_reason'");
if ($complaintReasonColumnCheck && $complaintReasonColumnCheck->num_rows === 0) {
    $conn->query("ALTER TABLE complaints ADD COLUMN action_reason TEXT NULL AFTER status");
}

$body = json_decode(file_get_contents('php://input'), true);
if (!is_array($body)) {
    $body = $_POST;
}

$actionInput = strtolower(trim((string)($body['action'] ?? '')));
$actionAliases = [
    'reported' => 'report',
    'report' => 'report',
    'deleted' => 'delete',
    'delete' => 'delete',
    'completed' => 'complete',
    'complete' => 'complete',
    'in work' => 'in_work',
    'already in work' => 'in_work',
    'in-work' => 'in_work',
    'in_work' => 'in_work'
];
$action = $actionAliases[$actionInput] ?? $actionInput;
$complaint_code = trim((string)($body['complaint_code'] ?? ''));
$reason = trim((string)($body['reason'] ?? ''));

$allowedActions = ['report', 'delete', 'complete', 'in_work'];
if (!$complaint_code || !in_array($action, $allowedActions, true)) {
    echo json_encode(['status' => 'error', 'message' => 'Invalid action or complaint code']);
    $conn->close();
    exit;
}

if (($action === 'report' || $action === 'delete') && $reason === '') {
    echo json_encode(['status' => 'error', 'message' => 'A reason is required for report or delete actions']);
    $conn->close();
    exit;
}

$codeEscaped = $conn->real_escape_string($complaint_code);

$findComplaintSql = "SELECT complaint_code, user_id, category FROM complaints WHERE complaint_code = '$codeEscaped' LIMIT 1";
$findComplaintResult = $conn->query($findComplaintSql);
if (!$findComplaintResult || $findComplaintResult->num_rows === 0) {
    echo json_encode(['status' => 'error', 'message' => 'Complaint not found']);
    $conn->close();
    exit;
}

$complaint = $findComplaintResult->fetch_assoc();
$userId = (int)($complaint['user_id'] ?? 0);
$complaintName = trim((string)($complaint['category'] ?? 'Complaint'));

$statusMap = [
    'report' => 'Reported',
    'delete' => 'Deleted',
    'complete' => 'Completed',
    'in_work' => 'Already in Work'
];
$newStatus = $statusMap[$action];
$newStatusEscaped = $conn->real_escape_string($newStatus);

$complaintReasonValue = ($action === 'report' || $action === 'delete') ? $reason : '';
$complaintReasonEscaped = $conn->real_escape_string($complaintReasonValue);

$updateSql = "UPDATE complaints SET status = '$newStatusEscaped', action_reason = '$complaintReasonEscaped' WHERE complaint_code = '$codeEscaped'";
if (!$conn->query($updateSql)) {
    echo json_encode(['status' => 'error', 'message' => 'Failed to update complaint status']);
    $conn->close();
    exit;
}

$complaintNameEscaped = $conn->real_escape_string($complaintName);
$actionEscaped = $conn->real_escape_string($action);
$reasonEscaped = $conn->real_escape_string($reason);

$insertActionSql = "INSERT INTO complaint_actions (complaint_code, complaint_name, action_type, action_reason, action_date)
                    VALUES ('$codeEscaped', '$complaintNameEscaped', '$actionEscaped', '$reasonEscaped', NOW())";
$conn->query($insertActionSql);

if ($userId > 0) {
    if ($action === 'report') {
        $notificationMessage = "Your complaint ($complaint_code) was reported. Reason: $reason";
    } elseif ($action === 'delete') {
        $notificationMessage = "Your complaint ($complaint_code) was deleted by admin. Reason: $reason";
    } elseif ($action === 'complete') {
        $notificationMessage = "Your complaint ($complaint_code) has been marked as completed.";
    } else {
        $notificationMessage = "Your complaint ($complaint_code) is already in work.";
    }

    $notificationEscaped = $conn->real_escape_string($notificationMessage);
    $reportReasonEscaped = $conn->real_escape_string(($action === 'report' || $action === 'delete') ? $reason : '');
    $insertNotificationSql = "INSERT INTO notifications (user_id, complaint_code, action_type, message, created_at)
                              VALUES ($userId, '$codeEscaped', '$actionEscaped', '$notificationEscaped', NOW())";
    if ($action === 'report' || $action === 'delete') {
        $insertNotificationSql = "INSERT INTO notifications (user_id, complaint_code, action_type, report_reason, message, created_at)
                                  VALUES ($userId, '$codeEscaped', '$actionEscaped', '$reportReasonEscaped', '$notificationEscaped', NOW())";
    }
    $conn->query($insertNotificationSql);

    $mailPayload = [
        'complaint_code' => $complaint_code,
        'action' => $action,
        'reason' => $reason,
        'skip_notification_insert' => true
    ];

    $mailDispatch = [
        'attempted' => false,
        'status' => 'not_attempted',
        'response' => null,
        'error' => null
    ];

    $mailCh = curl_init('http://localhost/eccms-api/send_complaint_notification.php');
    if ($mailCh !== false) {
        $mailDispatch['attempted'] = true;
        curl_setopt($mailCh, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($mailCh, CURLOPT_POST, true);
        curl_setopt($mailCh, CURLOPT_POSTFIELDS, json_encode($mailPayload));
        curl_setopt($mailCh, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
        curl_setopt($mailCh, CURLOPT_TIMEOUT, 10);

        $mailResponse = curl_exec($mailCh);
        $mailError = curl_error($mailCh);
        $mailHttpCode = (int)curl_getinfo($mailCh, CURLINFO_HTTP_CODE);

        if ($mailResponse === false) {
            $mailDispatch['status'] = 'failed';
            $mailDispatch['error'] = $mailError ?: 'Unknown cURL error';
        } else {
            $mailDispatch['response'] = $mailResponse;
            $decodedResponse = json_decode($mailResponse, true);
            if (is_array($decodedResponse) && ($decodedResponse['status'] ?? '') === 'success') {
                $mailDispatch['status'] = 'sent';
            } else {
                $mailDispatch['status'] = ($mailHttpCode >= 200 && $mailHttpCode < 300) ? 'mail_service_error' : 'http_error';
                $mailDispatch['error'] = is_array($decodedResponse)
                    ? (string)($decodedResponse['message'] ?? 'Mail service returned an error')
                    : ('Mail service returned HTTP ' . $mailHttpCode);
            }
        }

        curl_close($mailCh);
    } else {
        $mailDispatch['status'] = 'failed';
        $mailDispatch['error'] = 'Failed to initialize cURL';
    }
}

$response = [
    'status' => 'success',
    'message' => 'Complaint action updated successfully',
    'new_status' => $newStatus
];

if (isset($mailDispatch)) {
    $response['mail_notification'] = $mailDispatch;
}

echo json_encode($response);

$conn->close();
?>