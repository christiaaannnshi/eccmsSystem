import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ComplaintService } from '../../services/complaint.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-user-dashboard',
  templateUrl: './user-dashboard.component.html',
  styleUrls: ['./user-dashboard.component.css']
})
export class UserDashboardComponent implements OnInit {

  @ViewChild('cameraVideo') cameraVideo?: ElementRef<HTMLVideoElement>;

  complaintForm!: FormGroup;
  profileForm!: FormGroup;
  currentView: 'file' | 'status' | 'profile' | 'notifications' = 'file';
  userComplaints: any[] = [];
  currentComplaintsPage = 1;
  readonly complaintsPerPage = 12;
  
  notifications: any[] = [];
  notificationCount = 0;
  notificationsLoading = false;
  notificationsError = '';
  currentNotificationsPage = 1;
  readonly notificationsPerPage = 12;
  selectedActionNotification: any = null;
  selectedActionReason = '';
  selectedActionTitle = '';
  private actionReasonByKey = new Map<string, string>();
  reopenModalOpen = false;
  selectedReopenComplaint: any = null;
  reopenReason = '';
  reopenError = '';
  reopenSuccess = '';
  reopenLoading = false;

  submitSuccess = false;
  submitError = false;
  message = '';
  complaintCode = '';
  showAboutModal = false;
  showHelpModal = false;
  showContactModal = false;
  profileSaved = false;
  profileSaveMessage = '';
  profileImagePreview = '';
  savedProfileImage = '';
  savedDisplayName = '';
  complaintImagePreview = '';
  complaintImageError = '';
  cameraModalOpen = false;
  cameraError = '';
  private cameraStream: MediaStream | null = null;
  defaultProfileIcon = 'assets/icpep.png';

  get isOtherCategorySelected(): boolean {
    return String(this.complaintForm?.get('category')?.value || '').trim().toLowerCase() === 'others';
  }

  get totalComplaintsPages(): number {
    return Math.max(1, Math.ceil(this.userComplaints.length / this.complaintsPerPage));
  }

  get paginatedComplaints(): any[] {
    const startIndex = (this.currentComplaintsPage - 1) * this.complaintsPerPage;
    return this.userComplaints.slice(startIndex, startIndex + this.complaintsPerPage);
  }

  get isOnFirstComplaintsPage(): boolean {
    return this.currentComplaintsPage <= 1;
  }

  get isOnLastComplaintsPage(): boolean {
    return this.currentComplaintsPage >= this.totalComplaintsPages;
  }

  get totalNotificationsPages(): number {
    return Math.max(1, Math.ceil(this.notifications.length / this.notificationsPerPage));
  }

  get paginatedNotifications(): any[] {
    const startIndex = (this.currentNotificationsPage - 1) * this.notificationsPerPage;
    return this.notifications.slice(startIndex, startIndex + this.notificationsPerPage);
  }

  get isOnFirstNotificationsPage(): boolean {
    return this.currentNotificationsPage <= 1;
  }

  get isOnLastNotificationsPage(): boolean {
    return this.currentNotificationsPage >= this.totalNotificationsPages;
  }

  constructor(private fb: FormBuilder, private complaintService: ComplaintService, private authService: AuthService) {}

  ngOnInit(): void {

    this.complaintForm = this.fb.group({
      category: ['', Validators.required],
      customCategory: [''],
      location: ['', Validators.required],
      description: ['', Validators.required]
    });

    this.complaintForm.get('category')?.valueChanges.subscribe((categoryValue: string) => {
      const customCategoryControl = this.complaintForm.get('customCategory');
      const isOthers = String(categoryValue || '').trim().toLowerCase() === 'others';

      if (isOthers) {
        customCategoryControl?.setValidators([Validators.required]);
      } else {
        customCategoryControl?.clearValidators();
        customCategoryControl?.setValue('');
      }

      customCategoryControl?.updateValueAndValidity({ emitEvent: false });
    });

    this.profileForm = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      middleInitial: [''],
      birthdate: ['', Validators.required],
      age: [{ value: '', disabled: true }, Validators.required],
      cellphoneNumber: ['', [Validators.required, Validators.pattern('^[0-9+ -]{7,15}$')]],
      profilePicture: ['']
    });

    this.profileForm.get('birthdate')?.valueChanges.subscribe((birthdate: string) => {
      this.updateAgeFromBirthdate(birthdate);
    });

    this.loadProfile();

    this.loadUserComplaints();
    this.loadNotificationCount();

  }

  ngOnDestroy(): void {
    this.stopCameraStream();
  }

  showFileComplaint() {
    this.currentView = 'file';
  }

  showStatus() {
    this.currentView = 'status';
    this.currentComplaintsPage = 1;
    this.closeReopenModal();
    this.loadUserComplaints();
  }

  goToPreviousComplaintsPage(): void {
    if (this.isOnFirstComplaintsPage) {
      return;
    }

    this.currentComplaintsPage--;
  }

  goToNextComplaintsPage(): void {
    if (this.isOnLastComplaintsPage) {
      return;
    }

    this.currentComplaintsPage++;
  }

  canReopenComplaint(complaint: any): boolean {
    return String(complaint?.status || '').trim().toLowerCase() === 'completed';
  }

  openReopenModal(complaint: any): void {
    if (!this.canReopenComplaint(complaint)) {
      return;
    }

    this.selectedReopenComplaint = complaint;
    this.reopenReason = '';
    this.reopenError = '';
    this.reopenSuccess = '';
    this.reopenModalOpen = true;
  }

  closeReopenModal(): void {
    this.reopenModalOpen = false;
    this.selectedReopenComplaint = null;
    this.reopenReason = '';
    this.reopenError = '';
    this.reopenSuccess = '';
    this.reopenLoading = false;
  }

  submitReopenComplaint(): void {
    const complaintCode = String(this.selectedReopenComplaint?.complaint_code || '').trim();
    const reason = String(this.reopenReason || '').trim();
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const userId = Number(user?.id || 0);

    if (!complaintCode) {
      this.reopenError = 'Complaint not found. Please try again.';
      return;
    }

    if (!userId) {
      this.reopenError = 'User session not found. Please log in again.';
      return;
    }

    if (!reason) {
      this.reopenError = 'Please provide a reason for reopening this complaint.';
      return;
    }

    this.reopenLoading = true;
    this.reopenError = '';
    this.reopenSuccess = '';

    this.complaintService.reopenComplaint({
      complaint_code: complaintCode,
      user_id: userId,
      reason
    }).subscribe({
      next: (response: any) => {
        this.reopenLoading = false;
        if (response?.status === 'success') {
          this.reopenSuccess = response?.message || 'Complaint reopened successfully.';
          this.loadUserComplaints();
          setTimeout(() => this.closeReopenModal(), 900);
          return;
        }

        this.reopenError = response?.message || 'Failed to reopen complaint.';
      },
      error: () => {
        this.reopenLoading = false;
        this.reopenError = 'Server error while reopening complaint.';
      }
    });
  }

  showProfileSetup() {
    this.currentView = 'profile';
    this.profileSaved = false;
    this.profileSaveMessage = '';
  }

  showNotifications() {
    this.currentView = 'notifications';
    this.currentNotificationsPage = 1;
    this.loadNotifications();
  }

  goToPreviousNotificationsPage(): void {
    if (this.isOnFirstNotificationsPage) {
      return;
    }

    this.currentNotificationsPage--;
  }

  goToNextNotificationsPage(): void {
    if (this.isOnLastNotificationsPage) {
      return;
    }

    this.currentNotificationsPage++;
  }

  private loadNotifications() {
    this.notificationsLoading = true;
    this.notificationsError = '';
    this.actionReasonByKey.clear();

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const userId = user?.id;

    if (!userId) {
      this.notificationsError = 'User ID not found. Please log in again.';
      this.notificationsLoading = false;
      return;
    }

    this.complaintService.getNotifications(userId).subscribe({
      next: (response: any) => {
        if (response.status === 'success') {
          this.notifications = response.data || [];
          this.currentNotificationsPage = 1;
          this.notificationCount = Array.isArray(response.data) ? response.data.length : 0;
          this.loadComplaintActionReasons();
        } else {
          this.notificationsError = response.message || 'Failed to load notifications.';
        }
        this.notificationsLoading = false;
      },
      error: (error: any) => {
        this.notificationsError = 'Error loading notifications. Please try again.';
        this.notifications = [];
        this.currentNotificationsPage = 1;
        this.notificationsLoading = false;
      }
    });
  }

  private loadComplaintActionReasons(): void {
    this.complaintService.getComplaintActions().subscribe({
      next: (response: any) => {
        const actions = Array.isArray(response?.data) ? response.data : [];

        for (const actionRow of actions) {
          const complaintCode = String(actionRow?.complaint_code || '').trim();
          const actionType = String(actionRow?.action_type || '').trim().toLowerCase();
          const actionReason = String(actionRow?.action_reason || '').trim();

          if (!complaintCode || !actionType || !actionReason) {
            continue;
          }

          this.actionReasonByKey.set(this.buildReasonKey(complaintCode, actionType), actionReason);
        }
      },
      error: () => {
        // Keep notifications usable even when history lookup fails.
      }
    });
  }

  private loadNotificationCount(): void {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const userId = user?.id;

    if (!userId) {
      this.notificationCount = 0;
      return;
    }

    this.complaintService.getNotifications(userId).subscribe({
      next: (response: any) => {
        if (response?.status === 'success') {
          this.notificationCount = Array.isArray(response.data) ? response.data.length : 0;
        }
      },
      error: () => {
        this.notificationCount = 0;
      }
    });
  }

  openAboutModal() {
    this.showAboutModal = true;
  }

  closeAboutModal() {
    this.showAboutModal = false;
  }

  openHelpModal() {
    this.showHelpModal = true;
  }

  closeHelpModal() {
    this.showHelpModal = false;
  }

  openContactModal() {
    this.showContactModal = true;
  }

  closeContactModal() {
    this.showContactModal = false;
  }

  isActionReasonNotification(notification: any): boolean {
    const actionType = String(notification?.action_type || '').toLowerCase();
    return actionType === 'report' || actionType === 'delete';
  }

  openNotificationActionDetails(notification: any): void {
    if (!this.isActionReasonNotification(notification)) {
      return;
    }

    const actionType = String(notification?.action_type || '').toLowerCase();
    this.selectedActionNotification = notification;
    this.selectedActionReason = this.extractActionReason(notification);
    this.selectedActionTitle = actionType === 'delete' ? 'Complaint Deleted' : 'Complaint Reported';
  }

  closeNotificationActionDetails(): void {
    this.selectedActionNotification = null;
    this.selectedActionReason = '';
    this.selectedActionTitle = '';
  }

  private extractActionReason(notification: any): string {
    const exactReason = String(notification?.report_reason || notification?.action_reason || '').trim();
    if (exactReason) {
      return exactReason;
    }

    const message = String(notification?.message || '').trim();
    const reasonMatch = message.match(/reason\s*:\s*(.+)$/i);

    if (reasonMatch && reasonMatch[1]) {
      const extractedReason = String(reasonMatch[1]).trim();
      if (extractedReason) {
        return extractedReason;
      }
    }

    const reasonFromHistory = this.getReasonFromHistory(notification);
    if (reasonFromHistory) {
      return reasonFromHistory;
    }

    if (this.isActionReasonNotification(notification)) {
      return 'No reason was provided by admin.';
    }

    return message || 'No reason was provided by admin.';
  }

  private buildReasonKey(complaintCode: string, actionType: string): string {
    return `${complaintCode.trim().toUpperCase()}::${actionType.trim().toLowerCase()}`;
  }

  private getReasonFromHistory(notification: any): string {
    const complaintCode = String(notification?.complaint_code || '').trim();
    const actionType = String(notification?.action_type || '').trim().toLowerCase();

    if (!complaintCode || !actionType) {
      return '';
    }

    const directReason = this.actionReasonByKey.get(this.buildReasonKey(complaintCode, actionType));
    if (directReason) {
      return directReason;
    }

    if (actionType === 'report' || actionType === 'reported') {
      return this.actionReasonByKey.get(this.buildReasonKey(complaintCode, 'report'))
        || this.actionReasonByKey.get(this.buildReasonKey(complaintCode, 'reported'))
        || '';
    }

    if (actionType === 'delete' || actionType === 'deleted') {
      return this.actionReasonByKey.get(this.buildReasonKey(complaintCode, 'delete'))
        || this.actionReasonByKey.get(this.buildReasonKey(complaintCode, 'deleted'))
        || '';
    }

    return '';
  }

  private getProfileStorageKey(): string {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return `user_profile_${user?.id || 'guest'}`;
  }

  private updateAgeFromBirthdate(birthdate: string) {
    if (!birthdate) {
      this.profileForm.get('age')?.setValue('');
      return;
    }

    const birth = new Date(birthdate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }

    this.profileForm.get('age')?.setValue(age >= 0 ? String(age) : '');
  }

  onProfileImageSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files && input.files[0];

    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = String(reader.result || '');
      this.profileImagePreview = base64;
      this.profileForm.patchValue({ profilePicture: base64 });
    };
    reader.readAsDataURL(file);
  }

  onComplaintImageSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files && input.files[0];

    this.complaintImageError = '';

    if (!file) {
      this.complaintImagePreview = '';
      return;
    }

    if (!file.type.startsWith('image/')) {
      this.complaintImagePreview = '';
      this.complaintImageError = 'Please select a valid image file.';
      input.value = '';
      return;
    }

    this.compressComplaintImage(file)
      .then((compressedImage: string) => {
        this.complaintImagePreview = compressedImage;
      })
      .catch(() => {
        this.complaintImagePreview = '';
        this.complaintImageError = 'Unable to process the selected image. Please try another photo.';
        input.value = '';
      });
  }

  async openCameraCapture(): Promise<void> {
    this.cameraError = '';
    this.complaintImageError = '';

    if (!navigator.mediaDevices?.getUserMedia) {
      this.complaintImageError = 'Camera is not supported on this device or browser.';
      return;
    }

    this.cameraModalOpen = true;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });

      this.cameraStream = stream;

      setTimeout(() => {
        const video = this.cameraVideo?.nativeElement;
        if (!video) {
          return;
        }

        video.srcObject = stream;
        void video.play().catch(() => {
          this.cameraError = 'Unable to start camera preview.';
        });
      }, 0);
    } catch {
      this.cameraModalOpen = false;
      this.cameraError = '';
      this.complaintImageError = 'Unable to access the camera. Please allow camera permission or use Files/Photos instead.';
    }
  }

  captureComplaintPhoto(): void {
    const video = this.cameraVideo?.nativeElement;
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
      this.cameraError = 'Camera is not ready yet. Please try again.';
      return;
    }

    const maxDimension = 1280;
    const scale = Math.min(1, maxDimension / Math.max(video.videoWidth, video.videoHeight));
    const width = Math.max(1, Math.round(video.videoWidth * scale));
    const height = Math.max(1, Math.round(video.videoHeight * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext('2d');
    if (!context) {
      this.cameraError = 'Unable to capture photo on this device.';
      return;
    }

    context.drawImage(video, 0, 0, width, height);

    const qualitySteps = [0.82, 0.72, 0.62, 0.52];
    for (const quality of qualitySteps) {
      const imageData = canvas.toDataURL('image/jpeg', quality);
      if (imageData.length <= 2.5 * 1024 * 1024) {
        this.complaintImagePreview = imageData;
        this.cameraError = '';
        this.closeCameraModal();
        return;
      }
    }

    this.cameraError = 'Captured photo is too large. Please move closer and try again.';
  }

  closeCameraModal(): void {
    this.cameraModalOpen = false;
    this.cameraError = '';
    this.stopCameraStream();
  }

  private stopCameraStream(): void {
    if (this.cameraStream) {
      this.cameraStream.getTracks().forEach((track: MediaStreamTrack) => track.stop());
      this.cameraStream = null;
    }

    const video = this.cameraVideo?.nativeElement;
    if (video) {
      video.srcObject = null;
    }
  }

  private async compressComplaintImage(file: File): Promise<string> {
    const originalDataUrl = await this.readFileAsDataUrl(file);
    const image = await this.loadImage(originalDataUrl);

    const maxDimension = 1280;
    const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
    const targetWidth = Math.max(1, Math.round(image.width * scale));
    const targetHeight = Math.max(1, Math.round(image.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Canvas is unavailable');
    }

    context.drawImage(image, 0, 0, targetWidth, targetHeight);

    const qualitySteps = [0.82, 0.72, 0.62, 0.52];
    for (const quality of qualitySteps) {
      const compressedImage = canvas.toDataURL('image/jpeg', quality);
      if (compressedImage.length <= 2.5 * 1024 * 1024) {
        return compressedImage;
      }
    }

    throw new Error('Compressed image is still too large');
  }

  private readFileAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

  private loadImage(source: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('Image load failed'));
      image.src = source;
    });
  }

  saveProfile() {
    this.profileSaved = false;
    this.profileSaveMessage = '';

    const ageValue = this.profileForm.get('age')?.value;
    if (!ageValue) {
      this.profileForm.markAllAsTouched();
      this.profileSaveMessage = 'Please provide a valid birthdate.';
      return;
    }

    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      this.profileSaveMessage = 'Please complete all required profile fields.';
      return;
    }

    const payload = {
      firstName: this.profileForm.get('firstName')?.value,
      lastName: this.profileForm.get('lastName')?.value,
      middleInitial: this.profileForm.get('middleInitial')?.value,
      birthdate: this.profileForm.get('birthdate')?.value,
      age: this.profileForm.get('age')?.value,
      cellphoneNumber: this.profileForm.get('cellphoneNumber')?.value,
      profilePicture: this.profileForm.get('profilePicture')?.value || this.profileImagePreview
    };

    localStorage.setItem(this.getProfileStorageKey(), JSON.stringify(payload));
    this.profileImagePreview = payload.profilePicture || '';
    this.updateSavedProfileDisplay(payload);
    this.profileSaved = true;
    this.profileSaveMessage = 'Profile setup saved successfully.';
  }

  closeProfileSuccessPopup(): void {
    this.profileSaved = false;
    this.profileSaveMessage = '';
  }

  private loadProfile() {
    const raw = localStorage.getItem(this.getProfileStorageKey());
    if (!raw) {
      return;
    }

    const data = JSON.parse(raw);
    this.profileForm.patchValue({
      firstName: data.firstName || '',
      lastName: data.lastName || '',
      middleInitial: data.middleInitial || '',
      birthdate: data.birthdate || '',
      age: data.age || '',
      cellphoneNumber: data.cellphoneNumber || '',
      profilePicture: data.profilePicture || ''
    });

    this.profileImagePreview = data.profilePicture || '';
    this.updateSavedProfileDisplay(data);
  }

  private updateSavedProfileDisplay(data: any): void {
    const firstName = String(data?.firstName || '').trim();
    const middleInitial = String(data?.middleInitial || '').trim();
    const lastName = String(data?.lastName || '').trim();

    if (!firstName || !lastName) {
      this.savedDisplayName = '';
    } else {
      this.savedDisplayName = middleInitial
        ? `${firstName} ${middleInitial}. ${lastName}`
        : `${firstName} ${lastName}`;
    }

    this.savedProfileImage = String(data?.profilePicture || '').trim();
  }

  loadUserComplaints() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (!user.id) {
      this.userComplaints = [];
      this.currentComplaintsPage = 1;
      return;
    }

    this.complaintService.getUserComplaints(Number(user.id)).subscribe({
      next: (res: any) => {
        this.userComplaints = Array.isArray(res) ? res : (res?.data || []);
        this.currentComplaintsPage = 1;
      },
      error: () => {
        this.userComplaints = [];
        this.currentComplaintsPage = 1;
      }
    });
  }

  submitComplaint() {

    if (this.complaintForm.invalid) {
      this.complaintForm.markAllAsTouched();
      this.submitError = true;
      this.submitSuccess = false;
      this.message = "Please fill in all required fields.";
      return;
    }

    // Get logged in user
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    if (!user.id) {
      this.submitError = true;
      this.submitSuccess = false;
      this.message = "User not logged in properly.";
      return;
    }

    const selectedCategory = String(this.complaintForm.value.category || '').trim();
    const customCategory = String(this.complaintForm.value.customCategory || '').trim();
    const category = selectedCategory.toLowerCase() === 'others' ? customCategory : selectedCategory;
    const location = this.complaintForm.value.location?.trim();
    const description = this.complaintForm.value.description?.trim();

    if (!category || !location || !description) {
      this.submitError = true;
      this.submitSuccess = false;
      this.message = "Please fill in all required fields.";
      return;
    }

    if (this.complaintImageError) {
      this.submitError = true;
      this.submitSuccess = false;
      this.message = this.complaintImageError;
      return;
    }

    const payload = {
      user_id: user.id,
      category,
      location,
      description,
      complaint_image: this.complaintImagePreview || ''
    };

    this.complaintService.fileComplaint(payload)
      .subscribe({

        next: (res: any) => {

          if (res.status === 'success') {

            this.submitSuccess = true;
            this.submitError = false;
            this.complaintCode = res.complaint_code;

            this.message =
              "Complaint submitted successfully! Your complaint code is " +
              this.complaintCode;

            this.complaintForm.reset();
            this.complaintImagePreview = '';
            this.complaintImageError = '';
            this.loadUserComplaints();

            // Reload dashboard stats to update admin dashboard
            this.complaintService.getDashboardStats().subscribe(stats => {
              const total = Number((stats as any)?.total || 0);
              this.complaintService.updateComplaintCount(total);
            });

          } else {

            this.submitError = true;
            this.submitSuccess = false;
            this.message = res.message;

          }
        },

        error: (err: any) => {

          this.submitError = true;
          this.submitSuccess = false;
          this.message = err?.error?.message || err?.message || 'Server error occurred.';

        }

      });

  }

  logout() {
    this.authService.logout();
  }

}