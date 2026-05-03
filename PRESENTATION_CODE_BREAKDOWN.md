# ECCMS - Feature Code Breakdown (Taglish)

---

## Feature 1: Register & Login

### Frontend (Angular) - Login Component
```typescript
// login.component.ts

// Form validation setup
this.loginForm = this.fb.group({
  email: ['', [Validators.required]],
  password: ['', [Validators.required]],
  agreeTerms: [false, [Validators.requiredTrue]]
});
```
**Explanation:**  
Nag-create ng form na may three required fields. Hindi mapapasa submit hanggang complete lahat.

---

### Frontend - Submit Login
```typescript
onSubmit(): void {
  // Check kung may hardcoded admin account
  if (email === this.adminEmail && password === this.adminPassword) {
    this.loginSuccess = true;
    localStorage.setItem('token', 'adminLoggedIn');
    localStorage.setItem('role', 'admin');
    localStorage.setItem('user', JSON.stringify({ id: 1, email: this.adminEmail }));
    this.router.navigate(['/admin-dashboard']);
    return;
  }

  // Para sa regular user, send to backend API
  this.auth.login({ email, password }).subscribe({
    next: (response: any) => {
      if (response.status === 'success') {
        localStorage.setItem('token', 'loggedIn');
        localStorage.setItem('role', 'user');
        localStorage.setItem('user', JSON.stringify({ id: response.user_id, email: email }));
        this.router.navigate(['/user-dashboard']);
      }
    }
  });
}
```
**Explanation:**  
1. Check first kung admin (hardcoded test account)  
2. Kung admin, save credentials sa local storage (browser memory)  
3. Kung regular user, send request to API  
4. API returns success with user ID  
5. Save user info sa local storage para next time madali check kung logged in

---

### Backend (PHP) - Login API
```php
<?php
// login.php

// Get email and password from request
$identifier = $conn->real_escape_string($body['email']);
$password = $conn->real_escape_string($body['password']);

// Query database para hanapin yung user
$sql = "SELECT id, password FROM users WHERE email_or_phone='$identifier' LIMIT 1";
$result = $conn->query($sql);

if ($result && $result->num_rows > 0) {
  $row = $result->fetch_assoc();
  $stored = $row['password'];
  
  // Check kung match yung password with hash
  if (password_verify($password, $stored)) {
    echo json_encode([
      'status' => 'success',
      'message' => 'Login successful',
      'user_id' => (int)$row['id']
    ]);
  } else {
    echo json_encode(['status' => 'error', 'message' => 'Invalid credentials']);
  }
}
$conn->close();
?>
```
**Explanation:**  
1. Receive email/password from frontend  
2. Query users table para hanapin yung account  
3. Use password_verify() para i-check kung tama yung password (secure hashing)  
4. Return success with user ID or error message

---

### Frontend - Route Guard (Security)
```typescript
// auth.guard.ts

canActivate(route: ActivatedRouteSnapshot): boolean {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');
  const user = localStorage.getItem('user');

  // Kung walang token, redirect to login
  if (!token || !user || !role) {
    this.router.navigate(['/login']);
    return false;
  }

  // Check kung match yung user role sa page requirement
  const requiredRole = route.data['role'];
  if (requiredRole && role !== requiredRole) {
    this.router.navigate(['/login']);
    return false;
  }

  // OK, allowed yung access
  return true;
}
```
**Explanation:**  
1. Check kung may session token sa browser (localStorage)  
2. Kung wala, send back sa login   
3. Check din kung role niya matches sa page requirements (admin vs user)  
4. Only allow papunta sa dashboard kung lahat valid

---

## Feature 2: Register (New Account)

### Frontend - Register Form
```typescript
// register.component.ts

onSubmit(form: NgForm) {
  const { email, password, confirmPassword } = form.value;

  // Validation checks
  if (!email || !password || !confirmPassword) {
    this.showError("Please fill all fields.");
    return;
  }

  if (password.length < 6) {
    this.showError("Password must be at least 6 characters.");
    return;
  }

  if (password !== confirmPassword) {
    this.showError("Passwords do not match.");
    return;
  }

  // Send to API
  this.auth.register({ email, password })
    .subscribe({
      next: (response: any) => {
        if (response.status === 'success') {
          this.successMessage = response.message;
          this.router.navigate(['/login']);
        }
      }
    });
}
```
**Explanation:**  
1. Get email at password from form  
2. Validate na hindi empty, password min 6 chars, passwords match  
3. Send request to backend API  
4. If success, redirect to login para mag-enter ng credentials

---

### Backend - Register API
```php
<?php
// register.php

$identifier = $conn->real_escape_string($body['email']);
$password = $conn->real_escape_string($body['password']);

// Check kung existing na yung email
$check_sql = "SELECT id FROM users WHERE email_or_phone='$identifier' LIMIT 1";
$check_result = $conn->query($check_sql);
if ($check_result->num_rows > 0) {
  echo json_encode(['status' => 'error', 'message' => 'Email already registered']);
  exit;
}

// Hash yung password before saving
$hashed = password_hash($password, PASSWORD_DEFAULT);

// Insert new user
$sql = "INSERT INTO users (email_or_phone, password) VALUES ('$identifier', '$hashed')";
if ($conn->query($sql) === TRUE) {
  echo json_encode(['status' => 'success', 'message' => 'Registration successful']);
} else {
  echo json_encode(['status' => 'error', 'message' => 'Failed to register']);
}
$conn->close();
?>
```
**Explanation:**  
1. Check first kung hindi na existing ang email sa database  
2. Hash yung password using PASSWORD_DEFAULT (secure one-way encryption)  
3. Insert new row sa users table  
4. Return success or error message

---

## Feature 3: File a Complaint

### Frontend - Complaint Form
```typescript
// user-dashboard.component.ts

ngOnInit(): void {
  this.complaintForm = this.fb.group({
    category: ['', Validators.required],
    customCategory: [''],
    location: ['', Validators.required],
    description: ['', Validators.required]
  });

  // If user selects "Others", require custom category
  this.complaintForm.get('category')?.valueChanges.subscribe((categoryValue: string) => {
    const customCategoryControl = this.complaintForm.get('customCategory');
    const isOthers = categoryValue?.toLowerCase() === 'others';

    if (isOthers) {
      customCategoryControl?.setValidators([Validators.required]);
    } else {
      customCategoryControl?.clearValidators();
      customCategoryControl?.setValue('');
    }
    customCategoryControl?.updateValueAndValidity({ emitEvent: false });
  });
}

// Submit complaint
submitComplaint() {
  const payload = {
    user_id: user.id,
    category: this.complaintForm.get('category').value,
    location: this.complaintForm.get('location').value,
    description: this.complaintForm.get('description').value,
    complaint_image: this.complaintImagePreview // optional base64 image
  };

  this.complaintService.fileComplaint(payload).subscribe({
    next: (response: any) => {
      if (response.status === 'success') {
        this.complaintCode = response.complaint_code; // Display code to user
        this.submitSuccess = true;
      }
    }
  });
}
```
**Explanation:**  
1. Create form with required fields: category, location, description  
2. Listen sa category changes - kung Others ang selected, make custom category required  
3. On submit, collect all values into payload object  
4. Send to API and wait for response  
5. If success, show complaint code to user para ma-track nila

---

### Backend - File Complaint API
```php
<?php
// file_complaint.php

$user_id = (int)$body['user_id'];
$category = $conn->real_escape_string(trim($body['category']));
$location = $conn->real_escape_string(trim($body['location']));
$description = $conn->real_escape_string(trim($body['description']));
$complaint_image = isset($body['complaint_image']) ? trim($body['complaint_image']) : '';

// Validate required fields
if (!$user_id || !$category || !$location || !$description) {
  echo json_encode(['status' => 'error', 'message' => 'Missing required fields']);
  exit;
}

// Validate image (optional but if provided, check format and size)
if ($complaint_image !== '') {
  if (strpos($complaint_image, 'data:image/') !== 0) {
    echo json_encode(['status' => 'error', 'message' => 'Invalid image format']);
    exit;
  }
  if (strlen($complaint_image) > 7 * 1024 * 1024) { // 7MB max
    echo json_encode(['status' => 'error', 'message' => 'Image is too large']);
    exit;
  }
}

// Generate unique complaint code
$complaint_code = 'CMP-' . strtoupper(substr(md5(uniqid()), 0, 8));

// Insert into database
$escaped_image = $conn->real_escape_string($complaint_image);
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
```
**Explanation:**  
1. Receive complaint details from frontend  
2. Validate lahat ng required fields are present  
3. Check image format (must be data:image/) and size (max 7MB)  
4. Generate unique code using MD5 hash of random ID with CMP- prefix  
5. Insert into complaints table with status "Pending" at current timestamp  
6. Return the code back to user

---

## Feature 4: User View Complaint Status & Notifications

### Frontend - Load Complaints
```typescript
// user-dashboard.component.ts

loadUserComplaints() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const userId = user?.id;

  this.complaintService.getUserComplaints(userId).subscribe({
    next: (response: any) => {
      if (response.status === 'success') {
        this.userComplaints = response.data || [];
        this.currentComplaintsPage = 1;
      }
    },
    error: (error: any) => {
      this.userComplaints = [];
    }
  });
}

// Show paginated complaints
get paginatedComplaints(): any[] {
  const startIndex = (this.currentComplaintsPage - 1) * this.complaintsPerPage;
  return this.userComplaints.slice(startIndex, startIndex + this.complaintsPerPage);
}
```
**Explanation:**  
1. Get user ID from localStorage (session data)  
2. Call API to fetch complaints for that user  
3. Store complaints in array  
4. Paginate - slice array per page (e.g., 12 per page)  
5. Display only current page complaints sa template

---

### Frontend - Load Notifications
```typescript
// user-dashboard.component.ts

loadNotifications() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const userId = user?.id;

  this.complaintService.getNotifications(userId).subscribe({
    next: (response: any) => {
      if (response.status === 'success') {
        this.notifications = response.data || [];
        this.notificationCount = response.data.length;
      }
    }
  });
}
```
**Explanation:**  
1. Get user ID from session  
2. Make API call to fetch notifications  
3. Notifications contain admin actions like "reported", "deleted", "completed"  
4. Store array and count para display sa notification badge

---

### Backend - Get Notifications API
```php
<?php
// get_notification_logs.php

$user_id = (int)$_GET['user_id'];

if ($user_id <= 0) {
  echo json_encode(['status' => 'error', 'message' => 'Invalid user ID']);
  exit;
}

// Query notifications for this user
$sql = "SELECT
        n.id,
        n.complaint_code,
        n.action_type,
        n.report_reason,
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
```
**Explanation:**  
1. Receive user_id as GET parameter  
2. Query notifications table where user_id matches  
3. Order by created_at DESC para latest first  
4. Return array ng notifications with details

---

## Feature 5: Admin Complaint Actions (Report, Delete, Complete)

### Frontend - Open Action Modal
```typescript
// admin-complaints.component.ts

openActionModal(complaint: any) {
  this.selectedComplaint = complaint;
  this.actionReasonModalOpen = false;
  this.actionReason = '';
  this.actionReasonError = '';
  this.actionReasonType = ''; // 'report' | 'delete'
}

// Mark as reported
markAsReported() {
  this.openActionReasonModal('report');
}

// Mark as deleted
requestDeleteComplaint() {
  this.openActionReasonModal('delete');
}

// Submit action with reason
submitActionReason(): void {
  const actionType = this.actionReasonType; // 'report' or 'delete'
  const reason = this.actionReason.trim();

  if (!reason) {
    this.actionReasonError = 'Please provide a reason';
    return;
  }

  // Call API to update complaint
  this.complaintService.updateComplaintAction({
    action: actionType,
    complaint_code: this.selectedComplaint.complaint_code,
    reason: reason
  }).subscribe({
    next: (res: any) => {
      if (res?.status === 'success') {
        this.actionSuccessMessage = res?.message;
        this.loadComplaints(); // Refresh list
        this.closeActionModal();
      }
    }
  });
}
```
**Explanation:**  
1. Admin clicks complaint, modal opens with action buttons  
2. Admin selects "Report" or "Delete"  
3. Modal asks for reason why  
4. Frontend validates reason is not empty  
5. Send API request with action type, complaint code, and reason  
6. If success, reload complaints and close modal

---

### Backend - Update Complaint Action
```php
<?php
// complaint_action.php

$action = strtolower(trim($body['action'])); // 'report' or 'delete'
$complaint_code = trim($body['complaint_code']);
$reason = trim($body['reason']);

// Validate
if (!$complaint_code || !in_array($action, ['report', 'delete', 'complete', 'in_work'])) {
  echo json_encode(['status' => 'error', 'message' => 'Invalid action']);
  exit;
}

if (($action === 'report' || $action === 'delete') && $reason === '') {
  echo json_encode(['status' => 'error', 'message' => 'Reason is required']);
  exit;
}

// Find complaint
$codeEscaped = $conn->real_escape_string($complaint_code);
$findComplaintSql = "SELECT complaint_code, user_id, category FROM complaints WHERE complaint_code = '$codeEscaped' LIMIT 1";
$findComplaintResult = $conn->query($findComplaintSql);

if (!$findComplaintResult || $findComplaintResult->num_rows === 0) {
  echo json_encode(['status' => 'error', 'message' => 'Complaint not found']);
  exit;
}

$complaint = $findComplaintResult->fetch_assoc();
$userId = (int)$complaint['user_id'];

// Map action to status
$statusMap = [
  'report' => 'Reported',
  'delete' => 'Deleted',
  'complete' => 'Completed',
  'in_work' => 'Already in Work'
];
$newStatus = $statusMap[$action];

// Update complaint status
$updateSql = "UPDATE complaints SET status = '$newStatus', action_reason = '$reason' WHERE complaint_code = '$codeEscaped'";
$conn->query($updateSql);

// Log the action
$insertActionSql = "INSERT INTO complaint_actions (complaint_code, complaint_name, action_type, action_reason, action_date)
                    VALUES ('$codeEscaped', '" . $complaint['category'] . "', '$action', '$reason', NOW())";
$conn->query($insertActionSql);

// Create notification for user
$notificationMessage = "Your complaint ($complaint_code) was " . ($action === 'report' ? 'reported' : 'deleted') . ". Reason: $reason";
$insertNotificationSql = "INSERT INTO notifications (user_id, complaint_code, action_type, report_reason, message, created_at)
                          VALUES ($userId, '$codeEscaped', '$action', '$reason', '$notificationMessage', NOW())";
$conn->query($insertNotificationSql);

echo json_encode(['status' => 'success', 'message' => 'Complaint action updated successfully']);
$conn->close();
?>
```
**Explanation:**  
1. Receive action type, complaint code, and reason  
2. Validate na valid ang action at may reason kung report/delete  
3. Find complaint sa database  
4. Map action to new status (report → Reported, delete → Deleted, etc.)  
5. Update complaint table with new status and reason  
6. Log the action sa complaint_actions table for history  
7. Create notification sa notifications table para mapakita sa user  
8. Return success message

---

## Feature 6: Reopen Complaint

### Frontend - Reopen Modal
```typescript
// user-dashboard.component.ts

canReopenComplaint(complaint: any): boolean {
  return String(complaint?.status || '').trim().toLowerCase() === 'completed';
}

openReopenModal(complaint: any): void {
  if (!this.canReopenComplaint(complaint)) {
    return; // Only if status is completed
  }
  this.selectedReopenComplaint = complaint;
  this.reopenReason = '';
  this.reopenModalOpen = true;
}

submitReopenComplaint(): void {
  const complaintCode = this.selectedReopenComplaint?.complaint_code;
  const userId = JSON.parse(localStorage.getItem('user') || '{}').id;
  const reason = this.reopenReason.trim();

  if (!reason) {
    this.reopenError = 'Please provide a reason for reopening';
    return;
  }

  this.complaintService.reopenComplaint({
    complaint_code: complaintCode,
    user_id: userId,
    reason: reason
  }).subscribe({
    next: (response: any) => {
      if (response?.status === 'success') {
        this.reopenSuccess = response?.message;
        this.loadUserComplaints(); // Refresh
        setTimeout(() => this.closeReopenModal(), 900);
      } else {
        this.reopenError = response?.message || 'Failed to reopen';
      }
    }
  });
}
```
**Explanation:**  
1. Check kung "completed" yung status - kailangan para ma-reopen  
2. Open modal at ask for reason why  
3. Validate na may reason  
4. Send API request with complaint code, user ID, at reason  
5. If success, reload complaints at close modal

---

### Backend - Reopen Complaint API
```php
<?php
// reopen_complaint.php

$complaintCode = trim($body['complaint_code']);
$userId = (int)$body['user_id'];
$reason = trim($body['reason']);

if (!$complaintCode || $userId <= 0 || !$reason) {
  echo json_encode(['status' => 'error', 'message' => 'Missing required fields']);
  exit;
}

// Find complaint
$codeEscaped = $conn->real_escape_string($complaintCode);
$findSql = "SELECT complaint_code, user_id, status FROM complaints WHERE complaint_code = '$codeEscaped' LIMIT 1";
$findResult = $conn->query($findSql);

if ($findResult->num_rows === 0) {
  echo json_encode(['status' => 'error', 'message' => 'Complaint not found']);
  exit;
}

$complaint = $findResult->fetch_assoc();
$ownerUserId = (int)$complaint['user_id'];
$currentStatus = strtolower(trim($complaint['status']));

// Security: Check kung owner yung nag-request
if ($ownerUserId !== $userId) {
  echo json_encode(['status' => 'error', 'message' => 'You can only reopen your own complaint']);
  exit;
}

// Check kung completed lang pwedeng i-reopen
if ($currentStatus !== 'completed') {
  echo json_encode(['status' => 'error', 'message' => 'Only completed complaints can be reopened']);
  exit;
}

// Update status to Reopened
$updateSql = "UPDATE complaints SET status = 'Reopened' WHERE complaint_code = '$codeEscaped'";
$conn->query($updateSql);

// Log reopen request
$reasonEscaped = $conn->real_escape_string($reason);
$insertSql = "INSERT INTO complaint_reopen_requests (complaint_code, user_id, reopen_reason, created_at)
              VALUES ('$codeEscaped', $userId, '$reasonEscaped', NOW())";
$conn->query($insertSql);

echo json_encode([
  'status' => 'success',
  'message' => 'Complaint reopened successfully',
  'new_status' => 'Reopened'
]);
$conn->close();
?>
```
**Explanation:**  
1. Receive complaint code, user ID, at reason  
2. Find complaint sa database  
3. Security check: Verify na owner talaga yung nag-request  
4. Check na "completed" yung current status  
5. Update status to "Reopened"  
6. Log yung reopen request sa separate table para audit trail  
7. Return success message

---

## Feature 7: Admin Dashboard Analytics

### Frontend - Load Dashboard Stats
```typescript
// admin-dashboard.component.ts

ngOnInit(): void {
  // Load stats and auto-refresh every 5 seconds
  this.refreshSubscription = interval(5000).subscribe(() => {
    this.loadStats();
    this.loadComplaintsOnce();
  });
}

loadStats() {
  this.complaintService.getComplaints().subscribe({
    next: (data: any) => {
      const complaints = Array.isArray(data) ? data : (data?.data || []);
      
      // Count by status
      this.total = complaints.length;
      this.solved = complaints.filter((c: any) => 
        ['solved', 'completed'].includes(String(c?.status || '').toLowerCase())
      ).length;
      this.pending = complaints.filter((c: any) =>
        String(c?.status || '').toLowerCase() === 'pending'
      ).length;
      this.reported = complaints.filter((c: any) =>
        String(c?.status || '').toLowerCase() === 'reported'
      ).length;
      this.deleted = complaints.filter((c: any) =>
        String(c?.status || '').toLowerCase() === 'deleted'
      ).length;
      
      this.updateChartData();
    }
  });
}

updateChartData(): void {
  // Update doughnut chart data
  this.doughnutData = {
    labels: ['Pending', 'Solved', 'Reported', 'Deleted'],
    datasets: [{
      data: [this.pending, this.solved, this.reported, this.deleted],
      backgroundColor: ['#f4a62a', '#1fb978', '#f97316', '#dc2626']
    }]
  };
}

buildBarChartData(complaints: any[]): void {
  // Group complaints by month
  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const now = new Date();
  const labels: string[] = [];
  const counts: number[] = [];

  // Last 6 months
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    labels.push(monthNames[d.getMonth()] + ' ' + d.getFullYear());
    
    // Count complaints filed in this month
    const count = complaints.filter((c: any) => {
      const cd = new Date(c.date_filed || c.created_at || c.date || '');
      return cd.getMonth() === d.getMonth() && cd.getFullYear() === d.getFullYear();
    }).length;
    
    counts.push(count);
  }

  this.barData = {
    labels,
    datasets: [{ data: counts, backgroundColor: '#1c82c6', label: 'Complaints' }]
  };
}
```
**Explanation:**  
1. On init, set up auto-refresh every 5 seconds  
2. loadStats() fetches all complaints from API  
3. Loop through complaints at count by status (pending, solved, reported, deleted)  
4. Update doughnut chart data with the counts  
5. buildBarChartData() groups complaints by month for trend visualization  
6. Bar chart shows last 6 months ng complaint filings

---

### Backend - Dashboard Stats API
```php
<?php
// dashboard_stats.php

// Count total complaints
$total_sql = "SELECT COUNT(*) as total FROM complaints";
$total = $conn->query($total_sql)->fetch_assoc()['total'];

// Count solved (completed status)
$solved_sql = "SELECT COUNT(*) as solved FROM complaints WHERE status = 'Completed'";
$solved = $conn->query($solved_sql)->fetch_assoc()['solved'];

// Count pending
$pending_sql = "SELECT COUNT(*) as pending FROM complaints WHERE status = 'Pending'";
$pending = $conn->query($pending_sql)->fetch_assoc()['pending'];

// Count reopened
$reopened_sql = "SELECT COUNT(*) as reopened FROM complaints WHERE LOWER(status) = 'reopened'";
$reopened = $conn->query($reopened_sql)->fetch_assoc()['reopened'];

echo json_encode([
  'total' => (int)$total,
  'solved' => (int)$solved,
  'pending' => (int)$pending,
  'reopened' => (int)$reopened
]);
$conn->close();
?>
```
**Explanation:**  
1. Simple queries na nag-count ng complaints by status  
2. Return JSON object with all counts  
3. Frontend then uses these numbers para sa charts

---

## Feature 8: Complaint Management History

### Frontend - Load Action History
```typescript
// admin-complaint-management.component.ts

loadActions() {
  // Fetch both action logs and complaints
  forkJoin({
    actionLogs: this.complaintService.getComplaintActions(),
    complaints: this.complaintService.getComplaints()
  }).subscribe({
    next: ({ actionLogs, complaints }) => {
      // Build location map from complaints
      const complaintList = Array.isArray(complaints) ? complaints : (complaints?.data || []);
      const locationByCode = new Map<string, string>();
      
      complaintList.forEach((item: any) => {
        const code = String(item?.complaint_code || '').trim();
        if (code) {
          locationByCode.set(code, String(item?.location || '').trim());
        }
      });

      // Map action logs
      const logs = (Array.isArray(actionLogs) ? actionLogs : (actionLogs?.data || [])).map((item: any) => ({
        complaint_code: item?.complaint_code,
        location: locationByCode.get(item?.complaint_code) || '',
        action_type: item?.action_type, // 'report' or 'delete'
        action_reason: item?.action_reason,
        action_date: item?.action_date
      }));

      // Sort by date descending (newest first)
      this.actions = logs.sort((a: any, b: any) => {
        const first = new Date(a?.action_date || 0).getTime();
        const second = new Date(b?.action_date || 0).getTime();
        return second - first;
      });
    }
  });
}

// Paginate results
get paginatedActions(): any[] {
  const startIndex = (this.currentActionsPage - 1) * this.actionsPerPage;
  return this.actions.slice(startIndex, startIndex + this.actionsPerPage);
}
```
**Explanation:**  
1. Use forkJoin to fetch both action logs and complaints in parallel  
2. Build location map by looping through complaints  
3. Map action logs and enrich with location info  
4. Sort by action date descending (newest first)  
5. Paginate for display

---

### Backend - Get Complaint Actions History
```php
<?php
// get_complaint_actions.php

// Query complaint_actions table - stores all report/delete actions
$actionSql = "SELECT complaint_code, complaint_name, action_type, action_reason, action_date
              FROM complaint_actions
              WHERE TRIM(COALESCE(complaint_code, '')) <> ''
              ORDER BY action_date DESC, id DESC";

$actionResult = $conn->query($actionSql);
$actions = [];

if ($actionResult) {
  while ($row = $actionResult->fetch_assoc()) {
    $actions[] = [
      'complaint_code' => $row['complaint_code'],
      'complaint_name' => $row['complaint_name'],
      'action_type' => $row['action_type'], // 'report' or 'delete'
      'action_reason' => $row['action_reason'],
      'action_date' => $row['action_date']
    ];
  }
}

echo json_encode([
  'status' => 'success',
  'data' => $actions
]);
$conn->close();
?>
```
**Explanation:**  
1. Query complaint_actions table na nag-store ng lahat ng admin actions  
2. Filter out empty complaint codes  
3. Order by date descending para newest actions first  
4. Return array ng actions with complaint code, type (report/delete), reason, at date

---

## Feature 9: Forgot Password Flow

### Frontend - Forgot Password
```typescript
// forgot-password.component.ts

sendResetCode() {
  if (!this.identifier) {
    this.showError('Please enter your email or phone number.');
    return;
  }

  // Send request to backend
  this.authService.forgotPassword({ identifier: this.identifier }).subscribe({
    next: (res: any) => {
      if (res.status === 'success') {
        // Save identifier para next step (verification)
        localStorage.setItem('reset_identifier', this.identifier);
        this.successMessage = res.message || 'Reset code sent successfully.';
        
        // Redirect to verify code page
        setTimeout(() => {
          this.router.navigate(['/verify-code']);
        }, 1500);
      } else {
        this.showError(res.message || 'Unable to send reset code.');
      }
    }
  });
}
```
**Explanation:**  
1. User enters email or phone  
2. Send to API  
3. Backend sends email with 6-digit code  
4. Save identifier sa localStorage para sa next steps  
5. Redirect to verification page

---

### Frontend - Verify Code
```typescript
// verify-code.component.ts

verifyCode() {
  const fullCode = this.codeDigits.join('').trim(); // Join 6 digits like "123456"
  const identifier = localStorage.getItem('reset_identifier');

  if (fullCode.length !== 6) {
    this.showError('Please enter all 6 digits.');
    return;
  }

  // Send verification request
  this.http.post<any>(
    `${environment.apiBaseUrl}/check-code.php`,
    { identifier: identifier, code: fullCode }
  ).subscribe({
    next: (res) => {
      if (res.status === 'success') {
        // Code is valid, go to password reset page
        this.router.navigate(['/reset-password']);
      } else {
        this.showError(res.message || 'Invalid verification code.');
      }
    }
  });
}
```
**Explanation:**  
1. User enters 6-digit code from email  
2. Join digits together  
3. Send verification request with email at code  
4. If backend confirms valid, redirect to reset password page

---

### Frontend - Reset Password
```typescript
// change-password.component.ts

submitReset(): void {
  const password = this.resetForm.get('password')?.value;
  const confirmPassword = this.resetForm.get('confirmPassword')?.value;
  const identifier = localStorage.getItem('reset_identifier');

  if (password !== confirmPassword) {
    this.error = true;
    this.message = 'Passwords do not match.';
    return;
  }

  // Send new password to backend
  this.http.post<any>(`${environment.apiBaseUrl}/reset-password.php`, {
    identifier,
    password
  }).subscribe({
    next: (res) => {
      if (res?.status === 'success') {
        this.successMessage = 'Password changed successfully.';
        localStorage.removeItem('reset_identifier'); // Clear session
        
        // Redirect to login
        setTimeout(() => this.router.navigate(['/login']), 1200);
      }
    }
  });
}
```
**Explanation:**  
1. User enters new password twice  
2. Validate na match  
3. Send new password sa backend  
4. Backend hashes at updates database  
5. Clear reset session at redirect to login

---

### Backend - Send Reset Code Email
```php
<?php
// verify-code.php (actually sends the code)

require 'vendor/autoload.php'; // PHPMailer

$identifier = $conn->real_escape_string(trim($body['identifier']));

// Find user
$sql = "SELECT id, email_or_phone AS email FROM users WHERE email_or_phone='$identifier' LIMIT 1";
$result = $conn->query($sql);

if ($result && $result->num_rows > 0) {
  $user = $result->fetch_assoc();
  $email = trim($user['email']);
  
  // Generate 6-digit code
  $code = str_pad(rand(0, 999999), 6, '0', STR_PAD_LEFT);
  $expires = date('Y-m-d H:i:s', time() + 15 * 60); // 15 minutes

  // Save code sa database
  $uid = (int)$user['id'];
  $update = "UPDATE users SET reset_password='$code', reset_expires='$expires' WHERE id=$uid";
  $conn->query($update);

  // Send email using PHPMailer
  $mail = new PHPMailer\PHPMailer\PHPMailer(true);
  $mail->isSMTP();
  $mail->Host = 'smtp.gmail.com';
  $mail->SMTPAuth = true;
  $mail->Username = 'eccms26@gmail.com';
  $mail->Password = 'aahjeoqsdcvcosqj'; // App password
  $mail->SMTPSecure = 'tls';
  $mail->Port = 587;
  $mail->setFrom('eccms26@gmail.com', 'ECCMS');
  $mail->addAddress($email);
  $mail->Subject = 'Password reset code';
  $mail->Body = "Your verification code is $code. It will expire in 15 minutes.";
  
  if ($mail->send()) {
    echo json_encode(['status' => 'success', 'message' => 'Reset code sent']);
  } else {
    echo json_encode(['status' => 'error', 'message' => 'Failed to send email']);
  }
}
$conn->close();
?>
```
**Explanation:**  
1. Receive email/phone  
2. Find user sa database  
3. Generate random 6-digit code  
4. Set expiration to 15 minutes from now  
5. Save code sa users table  
6. Use PHPMailer library to send email via Gmail SMTP  
7. Email contains code para user i-verify

---

### Backend - Verify Code
```php
<?php
// check-code.php

$identifier = $conn->real_escape_string(trim($body['identifier']));
$code = $conn->real_escape_string(trim($body['code']));

// Find user with matching code
$sql = "SELECT id, reset_password, reset_expires FROM users WHERE email_or_phone='$identifier' AND reset_password='$code' LIMIT 1";
$result = $conn->query($sql);

if ($result && $result->num_rows > 0) {
  $row = $result->fetch_assoc();
  
  // Check kung expired na yung code
  if (strtotime($row['reset_expires']) >= time()) {
    echo json_encode(['status' => 'success']); // Code is valid
  } else {
    echo json_encode(['status' => 'error', 'message' => 'Code expired']);
  }
} else {
  echo json_encode(['status' => 'error', 'message' => 'Invalid code or identifier']);
}
$conn->close();
?>
```
**Explanation:**  
1. Receive email at code from user  
2. Query database para hahanap yung user with matching email at code  
3. Check kung hindi pa expired based sa reset_expires timestamp  
4. Return success or error

---

### Backend - Reset Password
```php
<?php
// reset-password.php

$identifier = $conn->real_escape_string(trim($body['identifier']));
$password = trim($body['password']);

if (strlen($password) < 6) {
  echo json_encode(['status' => 'error', 'message' => 'Password must be at least 6 characters']);
  exit;
}

// Find user
$checkSql = "SELECT id, reset_expires, reset_password FROM users WHERE email_or_phone='$identifier' LIMIT 1";
$checkResult = $conn->query($checkSql);

if ($checkResult->num_rows === 0) {
  echo json_encode(['status' => 'error', 'message' => 'User not found']);
  exit;
}

$user = $checkResult->fetch_assoc();
$expiresAt = strtotime($user['reset_expires']);

// Check kung hindi na expired yung reset session
if (!$user['reset_password'] || $expiresAt < time()) {
  echo json_encode(['status' => 'error', 'message' => 'Reset session expired']);
  exit;
}

// Hash yung new password
$userId = (int)$user['id'];
$hashedPassword = password_hash($password, PASSWORD_DEFAULT);
$hashedEscaped = $conn->real_escape_string($hashedPassword);

// Update password at clear reset fields
$updateSql = "UPDATE users SET password='$hashedEscaped', reset_password=NULL, reset_expires=NULL WHERE id=$userId";
if ($conn->query($updateSql)) {
  echo json_encode(['status' => 'success', 'message' => 'Password changed successfully']);
} else {
  echo json_encode(['status' => 'error', 'message' => 'Failed to update password']);
}
$conn->close();
?>
```
**Explanation:**  
1. Receive new password from user  
2. Validate na minimum 6 characters  
3. Find user by email  
4. Check kung hindi expired pa yung reset session  
5. Hash yung new password using PASSWORD_DEFAULT algorithm  
6. Update users table with new hashed password  
7. Clear reset_password at reset_expires fields para invalidate yung code

---

## Quick Summary Para sa Presentation

| Feature | Frontend Does | Backend Does |
|---------|---------------|-------------|
| **Login** | Form validation, sends credentials | Verifies password hash, returns user_id |
| **Register** | Validates password match, calls API | Checks duplicate email, hashes password, inserts user |
| **File Complaint** | Collects form data, uploads image | Validates, generates unique code, saves to DB |
| **View Status** | Fetches complaints from API, paginates | Returns complaints and notifications for user |
| **Admin Action** | Opens modal, asks for reason | Updates status, logs action, creates notification |
| **Reopen** | Opens modal, validates completed status | Checks ownership, updates to Reopened, logs request |
| **Dashboard** | Auto-refresh, computes counts, shows charts | Returns all complaints grouped by status |
| **History** | Merges data, paginates | Returns action logs with reasons |
| **Forgot Password** | Sends email, verifies code, resets | Generates code, emails it, validates, hashes new password |

---

Good luck sa presentation! 🎉
