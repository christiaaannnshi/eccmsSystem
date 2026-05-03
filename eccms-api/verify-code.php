<?php
// verify-code.php
// expects JSON body { identifier: "email or phone" }
// looks up user, generates 6-digit code, stores it in users.reset_password
// and sets reset_expires to 15 minutes ahead.  then sends mail.

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Methods: POST, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require 'vendor/autoload.php';

require_once('db.php');

$rawInput = file_get_contents('php://input');
$body = json_decode($rawInput, true);

if (!is_array($body)) {
    $body = [];
}

$identifier = '';
if (!empty($body['identifier'])) {
    $identifier = $body['identifier'];
} elseif (!empty($body['email'])) {
    $identifier = $body['email'];
} elseif (!empty($body['phone'])) {
    $identifier = $body['phone'];
} elseif (!empty($_POST['identifier'])) {
    $identifier = $_POST['identifier'];
} elseif (!empty($_POST['email'])) {
    $identifier = $_POST['email'];
} elseif (!empty($_POST['phone'])) {
    $identifier = $_POST['phone'];
}

$identifier = $conn->real_escape_string(trim((string)$identifier));

if (!$identifier) {
    echo json_encode(['status' => 'error', 'message' => 'No identifier supplied']);
    exit;
}

// Support both legacy and new user table schemas.
$hasEmailOrPhone = ($conn->query("SHOW COLUMNS FROM users LIKE 'email_or_phone'")?->num_rows ?? 0) > 0;
$hasEmail = ($conn->query("SHOW COLUMNS FROM users LIKE 'email'")?->num_rows ?? 0) > 0;
$hasPhone = ($conn->query("SHOW COLUMNS FROM users LIKE 'phone'")?->num_rows ?? 0) > 0;

// find the user by email or phone
$sql = '';
if ($hasEmailOrPhone) {
    $sql = "SELECT id, email_or_phone AS email FROM users WHERE email_or_phone='$identifier' LIMIT 1";
} elseif ($hasEmail && $hasPhone) {
    $sql = "SELECT id, email FROM users WHERE email='$identifier' OR phone='$identifier' LIMIT 1";
} elseif ($hasEmail) {
    $sql = "SELECT id, email FROM users WHERE email='$identifier' LIMIT 1";
}

if ($sql === '') {
    echo json_encode(['status' => 'error', 'message' => 'Users table schema is not supported for password reset']);
    $conn->close();
    exit;
}

$result = $conn->query($sql);
if ($result && $result->num_rows > 0) {
    $user = $result->fetch_assoc();
    $email = trim((string)($user['email'] ?? ''));

    if (strpos($email, '@') === false) {
        echo json_encode(['status' => 'error', 'message' => 'No valid email found for this account']);
        $conn->close();
        exit;
    }
    $code = str_pad(rand(0, 999999), 6, '0', STR_PAD_LEFT);
    $expires = date('Y-m-d H:i:s', time() + 15 * 60);

    // update database
    $uid = (int)$user['id'];
    $update = "UPDATE users SET reset_password='$code', reset_expires='$expires' WHERE id=$uid";
    $conn->query($update);

    // send email
    $mail = new PHPMailer\PHPMailer\PHPMailer(true);
    $mail->isSMTP();
    $mail->Host = 'smtp.gmail.com';
    $mail->SMTPAuth = true;
    $mail->Username = 'eccms26@gmail.com';
    $mail->Password = 'aahjeoqsdcvcosqj';
    $mail->SMTPSecure = 'tls';
    $mail->Port = 587;
    $mail->setFrom('eccms26@gmail.com', 'ECCMS');
    $mail->addAddress($email);
    $mail->Subject = 'Password reset code';
    $mail->Body = "Your verification code is $code. It will expire in 15 minutes.";
    try {
        if (!$mail->send()) {
            echo json_encode([
                'status' => 'error',
                'message' => 'Failed to send email: ' . $mail->ErrorInfo
            ]);
            $conn->close();
            exit;
        }
    } catch (Exception $e) {
        echo json_encode([
            'status' => 'error',
            'message' => 'Failed to send email: ' . $mail->ErrorInfo
        ]);
        $conn->close();
        exit;
    }

    $atPos = strpos($email, '@');
    $maskedEmail = $email;
    if ($atPos !== false) {
        $local = substr($email, 0, $atPos);
        $domain = substr($email, $atPos);
        if (strlen($local) > 2) {
            $maskedEmail = substr($local, 0, 2) . str_repeat('*', max(1, strlen($local) - 2)) . $domain;
        }
    }

    echo json_encode([
        'status' => 'success',
        'message' => 'Reset code sent',
        'sent_to' => $maskedEmail
    ]);
} else {
    echo json_encode(['status' => 'error', 'message' => 'User not found']);
}

$conn->close();
