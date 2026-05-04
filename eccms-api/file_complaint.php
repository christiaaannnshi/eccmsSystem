<?php
header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

include 'db.php';
}

// Ensure complaint_image column exists for older databases.
$columnCheck = $conn->query("SHOW COLUMNS FROM complaints LIKE 'complaint_image'");
if ($columnCheck && $columnCheck->num_rows === 0) {
    $conn->query("ALTER TABLE complaints ADD COLUMN complaint_image LONGTEXT NULL");
}

$data = json_decode(file_get_contents("php://input"), true);

if (!$data) {
    echo json_encode(["status" => "error", "message" => "No data received"]);
    exit;
}

$user_id = $conn->real_escape_string($data['user_id']);
$category = $conn->real_escape_string($data['category']);
$location = $conn->real_escape_string($data['location']);
$description = $conn->real_escape_string($data['description']);
$complaint_image = isset($data['complaint_image']) ? trim((string) $data['complaint_image']) : '';

if ($complaint_image !== '') {
    if (strpos($complaint_image, 'data:image/') !== 0) {
        echo json_encode(["status" => "error", "message" => "Invalid image format"]);
        exit;
    }

    if (strlen($complaint_image) > 7 * 1024 * 1024) {
        echo json_encode(["status" => "error", "message" => "Image is too large"]);
        exit;
    }
}

$escaped_image = $conn->real_escape_string($complaint_image);

$complaint_code = 'CMP-' . str_pad(rand(0, 99999), 5, '0', STR_PAD_LEFT);

$sql = "INSERT INTO complaints 
        (complaint_code, user_id, category, location, description, complaint_image, status)
        VALUES 
        ('$complaint_code', '$user_id', '$category', '$location', '$description', '$escaped_image', 'Pending')";

if ($conn->query($sql)) {
    echo json_encode([
        "status" => "success",
        "complaint_code" => $complaint_code
    ]);
} else {
    echo json_encode([
        "status" => "error",
        "message" => $conn->error
    ]);
}

$conn->close();
?>