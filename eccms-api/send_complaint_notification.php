<?php
// send_complaint_notification.php
// Sends email notification to user when complaint status is updated

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require 'vendor/autoload.php';

require_once('db.php');

$body = json_decode(file_get_contents('php://input'), true);
$complaint_code = trim($body['complaint_code'] ?? '');
$actionInput = strtolower(trim($body['action'] ?? ''));
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
$reason = trim((string)($body['reason'] ?? ''));
$skipNotificationInsert = filter_var($body['skip_notification_insert'] ?? false, FILTER_VALIDATE_BOOLEAN);

if (!$complaint_code || !$action) {
    echo json_encode(['status' => 'error', 'message' => 'Missing complaint code or action']);
    exit;
}

$complaint_code_sql = $conn->real_escape_string($complaint_code);

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

// Get complaint details and user email
$sql = "SELECT c.complaint_code, c.category, c.location, c.status, c.user_id, u.email_or_phone
        FROM complaints c
        JOIN users u ON c.user_id = u.id
        WHERE c.complaint_code = '$complaint_code_sql' LIMIT 1";

$result = $conn->query($sql);

if (!$result || $result->num_rows === 0) {
    echo json_encode(['status' => 'error', 'message' => 'Complaint or user not found']);
    $conn->close();
    exit;
}

$complaint = $result->fetch_assoc();
$user_email = trim((string)($complaint['email_or_phone'] ?? ''));
$user_id = (int)($complaint['user_id'] ?? 0);

// Validate email
if (strpos($user_email, '@') === false) {
    echo json_encode(['status' => 'error', 'message' => 'No valid email found for user']);
    $conn->close();
    exit;
}

// Map action to status message
$statusMessages = [
    'complete' => 'Completed',
    'in_work' => 'Already in Work',
    'report' => 'Reported',
    'delete' => 'Deleted'
];

$statusLabel = $statusMessages[$action] ?? ucfirst($action);

if (($action === 'report' || $action === 'delete') && $reason === '') {
        $actionEscapedForLookup = $conn->real_escape_string($action);
        $reasonLookupSql = "SELECT action_reason
                                                FROM complaint_actions
                                                WHERE complaint_code = '$complaint_code_sql'
                                                    AND action_type = '$actionEscapedForLookup'
                                                    AND TRIM(COALESCE(action_reason, '')) <> ''
                                                ORDER BY action_date DESC, id DESC
                                                LIMIT 1";
        $reasonLookupResult = $conn->query($reasonLookupSql);
        if ($reasonLookupResult && $reasonLookupResult->num_rows > 0) {
                $reasonRow = $reasonLookupResult->fetch_assoc();
                $reason = trim((string)($reasonRow['action_reason'] ?? ''));
        }
}

// Create email content
$subject = "Complaint Update: " . $complaint['complaint_code'];

$body_text = "Hello,\n\n";
$body_text .= "Your complaint has been updated.\n\n";
$body_text .= "Complaint Code: " . $complaint['complaint_code'] . "\n";
$body_text .= "Category: " . $complaint['category'] . "\n";
$body_text .= "Location: " . $complaint['location'] . "\n";
$body_text .= "Status: " . $statusLabel . "\n";
if (($action === 'report' || $action === 'delete') && $reason !== '') {
    $body_text .= "Reason: " . $reason . "\n";
}
$body_text .= "Update Date: " . date('Y-m-d H:i:s') . "\n\n";
$body_text .= "Thank you for using the Electronic City Complaint Management System (ECCMS).\n\n";
$body_text .= "Best regards,\nECCMS Team";

if (!$skipNotificationInsert) {
    // Store notification in database
    $notificationMessage = "Your complaint (" . $complaint_code_sql . ") status has been updated to: " . $statusLabel;
    if (($action === 'report' || $action === 'delete') && $reason !== '') {
        $notificationMessage .= ". Reason: " . $reason;
    }

    $notificationEscaped = $conn->real_escape_string($notificationMessage);
    $actionEscaped = $conn->real_escape_string($action);
    $reasonEscaped = $conn->real_escape_string(($action === 'report' || $action === 'delete') ? $reason : '');

    $insertNotif = "INSERT INTO notifications (user_id, complaint_code, action_type, message, created_at)
                    VALUES ($user_id, '$complaint_code_sql', '$actionEscaped', '$notificationEscaped', NOW())";

    if ($action === 'report' || $action === 'delete') {
        $insertNotif = "INSERT INTO notifications (user_id, complaint_code, action_type, report_reason, message, created_at)
                        VALUES ($user_id, '$complaint_code_sql', '$actionEscaped', '$reasonEscaped', '$notificationEscaped', NOW())";
    }
    $conn->query($insertNotif);
}

// Send email using PHPMailer
$mail = new PHPMailer\PHPMailer\PHPMailer(true);

try {
    $mail->isSMTP();
    $mail->Host = 'smtp.gmail.com';
    $mail->SMTPAuth = true;
    $mail->Username = 'eccms26@gmail.com';
    $mail->Password = 'aahjeoqsdcvcosqj';
    $mail->SMTPSecure = 'tls';
    $mail->Port = 587;
    $mail->setFrom('eccms26@gmail.com', 'ECCMS');
    $mail->addAddress($user_email);
    $mail->Subject = $subject;
    $mail->Body = $body_text;
    $mail->isHTML(false);

    if ($mail->send()) {
        echo json_encode([
            'status' => 'success',
            'message' => 'Notification email sent successfully',
            'sent_to' => $user_email
        ]);
    } else {
        echo json_encode([
            'status' => 'error',
            'message' => 'Failed to send email: ' . $mail->ErrorInfo
        ]);
    }
} catch (Exception $e) {
    echo json_encode([
        'status' => 'error',
        'message' => 'Failed to send email: ' . $e->getMessage()
    ]);
}

$conn->close();
?>
