<?php
// Database Configuration for InfinityFree
// Update these with your actual InfinityFree database credentials

// InfinityFree Database Details
$host = "sql211.infinityfree.com"; // Your InfinityFree SQL host (check your control panel)
$username = "if0_41819503"; // Your InfinityFree database username (from MySQL Databases section)
$password = "hFmA8RI9gT14HQ"; // Your InfinityFree database password
$database = "if0_41819503_eccms_db"; // Your InfinityFree database name (from MySQL Databases section)

// Create connection
$conn = new mysqli($host, $username, $password, $database);

// Check connection
if ($conn->connect_error) {
    die(json_encode([
        "status" => "error",
        "message" => "Database connection failed: " . $conn->connect_error
    ]));
}

// Set charset to UTF-8
$conn->set_charset("utf8");

// Optional: Set timezone
date_default_timezone_set('Asia/Manila'); // Change to your timezone if needed
?>
