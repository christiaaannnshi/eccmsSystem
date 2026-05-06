<?php
$host = "sqlXXX.epizy.com";  // Replace with your InfinityFree MySQL host
$user = "epiz_XXXXXXX";     // Replace with your InfinityFree database username
$pass = "your_password";     // Replace with your InfinityFree database password
$db   = "epiz_XXXXXXX_eccms_db";  // Replace with your InfinityFree database name

$conn = new mysqli($host, $user, $pass, $db);

if ($conn->connect_error) {
    die(json_encode([
        "status" => "error",
        "message" => "Database connection failed: " . $conn->connect_error
    ]));
}
?>
