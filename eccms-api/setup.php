<?php
// setup.php
// Creates necessary tables if they don't exist

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

require_once('db.php');

// Create users table if not exists
$users_sql = "CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    password VARCHAR(255) NOT NULL,
    reset_password VARCHAR(10),
    reset_expires DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)";

if (!$conn->query($users_sql)) {
    echo json_encode(['status' => 'error', 'message' => 'Failed to create users table: ' . $conn->error]);
    exit;
}

// Create complaints table if not exists
$complaints_sql = "CREATE TABLE IF NOT EXISTS complaints (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    category VARCHAR(255) NOT NULL,
    location VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    complaint_image LONGTEXT NULL,
    status ENUM('Pending', 'Solved') DEFAULT 'Pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    complaint_code VARCHAR(20) UNIQUE NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
)";

if (!$conn->query($complaints_sql)) {
    echo json_encode(['status' => 'error', 'message' => 'Failed to create complaints table: ' . $conn->error]);
    exit;
}

// Backward compatibility: add complaint_image if table already exists without it.
$columnCheck = $conn->query("SHOW COLUMNS FROM complaints LIKE 'complaint_image'");
if ($columnCheck && $columnCheck->num_rows === 0) {
    if (!$conn->query("ALTER TABLE complaints ADD COLUMN complaint_image LONGTEXT NULL")) {
        echo json_encode(['status' => 'error', 'message' => 'Failed to alter complaints table: ' . $conn->error]);
        exit;
    }
}

echo json_encode(['status' => 'success', 'message' => 'Tables created or already exist']);

$conn->close();
?>