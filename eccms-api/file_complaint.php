<?php
// file_complaint.php
// Inserts a new complaint and returns success with complaint_code

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once('db.php');

// Ensure complaint_image column exists for older databases.
$columnCheck = $conn->query("SHOW COLUMNS FROM complaints LIKE 'complaint_image'");
if ($columnCheck && $columnCheck->num_rows === 0) {
    $conn->query("ALTER TABLE complaints ADD COLUMN complaint_image LONGTEXT NULL");
}

$input = file_get_contents('php://input');
$body = json_decode($input, true);
if (!is_array($body)) {
    $body = $_POST;
}

$user_id = isset($body['user_id']) ? (int)$body['user_id'] : 0;
$category = isset($body['category']) ? $conn->real_escape_string(trim($body['category'])) : '';
$location = isset($body['location']) ? $conn->real_escape_string(trim($body['location'])) : '';
$description = isset($body['description']) ? $conn->real_escape_string(trim($body['description'])) : '';
$complaint_image = isset($body['complaint_image']) ? trim((string)$body['complaint_image']) : '';

if (!$user_id || !$category || !$location || !$description) {
    echo json_encode(['status' => 'error', 'message' => 'Missing required fields']);
    exit;
}

// Optional evidence image validation.
if ($complaint_image !== '') {
    if (strpos($complaint_image, 'data:image/') !== 0) {
        echo json_encode(['status' => 'error', 'message' => 'Invalid image format']);
        exit;
    }

    if (strlen($complaint_image) > 7 * 1024 * 1024) {
        echo json_encode(['status' => 'error', 'message' => 'Image is too large']);
        exit;
    }
}

$escaped_image = $conn->real_escape_string($complaint_image);

// Generate unique complaint code
$complaint_code = 'CMP-' . strtoupper(substr(md5(uniqid()), 0, 8));

$sql = "INSERT INTO complaints (user_id, category, location, description, complaint_image, status, created_at, complaint_code)
    VALUES ($user_id, '$category', '$location', '$description', '$escaped_image', 'Pending', NOW(), '$complaint_code')";

if ($conn->query($sql) === TRUE) {
    echo json_encode([
        'status' => 'success',
        'complaint_code' => $complaint_code
    ]);
} else {
    echo json_encode(['status' => 'error', 'message' => 'Failed to file complaint']);
}

$conn->close();
?>