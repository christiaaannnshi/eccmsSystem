import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ComplaintService } from '../../services/complaint.service';
import { AuthService } from '../../services/auth.service';
import { interval, Subscription } from 'rxjs';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ChartData, ChartOptions } from 'chart.js';

@Component({
  selector: 'app-admin-dashboard',
   styleUrls: ['./admin-dashboard.component.css'],
  templateUrl: './admin-dashboard.component.html'
})
export class AdminDashboardComponent implements OnInit, OnDestroy {

  total = 0;
  solved = 0;
  pending = 0;
  reopened = 0;
  reported = 0;
  deleted = 0;
  recentComplaints: any[] = [];
  reopenedComplaints: any[] = [];
  dashboardSection: 'overview' | 'reopened' = 'overview';
  reopenedCurrentPage = 1;
  readonly reopenedPageSize = 8;
  selectedReopened: any = null;
  reopenedActionMessage = '';
  reopenedActionError = '';
  reopenedActionReasonModalOpen = false;
  reopenedActionReason = '';
  reopenedActionReasonError = '';
  reopenedActionReasonType: 'report' | 'delete' | '' = '';
  reopenedSuccessModalOpen = false;
  reopenedSuccessMessage = '';

  doughnutData: ChartData<'doughnut'> = {
    labels: ['Pending', 'Solved', 'Reported', 'Deleted'],
    datasets: [{ data: [0, 0, 0, 0], backgroundColor: ['#f4a62a', '#1fb978', '#f97316', '#dc2626'] }]
  };
  doughnutOptions: ChartOptions<'doughnut'> = {
    responsive: true,
    plugins: {
      legend: { position: 'bottom', labels: { font: { family: 'Poppins', size: 13 } } }
    }
  };

  barData: ChartData<'bar'> = {
    labels: [],
    datasets: [{ data: [], backgroundColor: '#1c82c6', borderRadius: 6, label: 'Complaints' } as any]
  };
  barOptions: ChartOptions<'bar'> = {
    responsive: true,
    plugins: { legend: { display: false } },
    scales: {
      y: { beginAtZero: true, ticks: { stepSize: 1, font: { family: 'Poppins' } } },
      x: { ticks: { font: { family: 'Poppins', size: 11 } } }
    }
  };
  profileForm!: FormGroup;
  currentView: 'dashboard' | 'profile' = 'dashboard';
  profileSaved = false;
  profileSaveMessage = '';
  profileImagePreview = '';
  adminEmail = 'Admin';

  get displayName(): string {
    const firstName = String(this.profileForm?.get('firstName')?.value || '').trim();
    const middleInitial = String(this.profileForm?.get('middleInitial')?.value || '').trim();
    const lastName = String(this.profileForm?.get('lastName')?.value || '').trim();

    if (!firstName || !lastName) {
      return this.adminEmail;
    }

    return middleInitial
      ? `${firstName} ${middleInitial}. ${lastName}`
      : `${firstName} ${lastName}`;
  }

  private refreshSubscription: Subscription | null = null;
  private reopenedSuccessModalTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private fb: FormBuilder,
    private complaintService: ComplaintService,
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
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

    this.route.queryParamMap.subscribe(params => {
      const requestedView = (params.get('view') || '').toLowerCase();
      this.currentView = requestedView === 'profile' ? 'profile' : 'dashboard';

      if (this.currentView === 'profile') {
        this.profileSaved = false;
        this.profileSaveMessage = '';
      }
    });

    this.loadAdminIdentity();
    this.loadProfile();
    this.loadStats();
    this.loadComplaintsOnce();
    
    // Subscribe to complaint count changes for real-time updates
    this.complaintService.getComplaintCount().subscribe(count => {
      if (count > 0) {
        this.total = count;
      }
    });

    // Refresh stats and complaints every 5 seconds
    this.refreshSubscription = interval(5000).subscribe(() => {
      this.loadStats();
      this.loadComplaintsOnce();
    });
  }

  ngOnDestroy(): void {
    // Clean up the subscription when component is destroyed
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
    }

    if (this.reopenedSuccessModalTimer) {
      clearTimeout(this.reopenedSuccessModalTimer);
      this.reopenedSuccessModalTimer = null;
    }
  }

  loadStats() {
    this.complaintService.getComplaints().subscribe({
      next: (data: any) => {
        const complaints = Array.isArray(data) ? data : (data?.data || []);
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
        this.reopened = complaints.filter((c: any) =>
          String(c?.status || '').toLowerCase() === 'reopened'
        ).length;
        this.updateChartData();
      },
      error: () => {
        this.total = 0;
        this.solved = 0;
        this.pending = 0;
        this.reported = 0;
        this.deleted = 0;
        this.reopened = 0;
        this.updateChartData();
      }
    });
  }

  loadComplaintsOnce(): void {
    this.complaintService.getComplaints().subscribe({
      next: (data: any) => {
        const all = Array.isArray(data) ? data : (data?.data || []);
        this.recentComplaints = all.slice(0, 8);
        this.reopenedComplaints = all.filter((c: any) =>
          String(c?.status || '').trim().toLowerCase() === 'reopened'
        );
        this.reopened = this.reopenedComplaints.length;
        this.buildBarChartData(all);
      },
      error: () => {
        this.recentComplaints = [];
        this.buildBarChartData([]);
      }
    });
  }

  buildBarChartData(complaints: any[]): void {
    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const now = new Date();
    const labels: string[] = [];
    const counts: number[] = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      labels.push(monthNames[d.getMonth()] + ' ' + d.getFullYear());
      const count = complaints.filter((c: any) => {
        const dateStr = c.date_filed || c.created_at || c.date || '';
        if (!dateStr) return false;
        const cd = new Date(dateStr);
        return cd.getMonth() === d.getMonth() && cd.getFullYear() === d.getFullYear();
      }).length;
      counts.push(count);
    }

    this.barData = {
      labels,
      datasets: [{ data: counts, backgroundColor: '#1c82c6', borderRadius: 6, label: 'Complaints' } as any]
    };
  }

  updateChartData(): void {
    this.doughnutData = {
      labels: ['Pending', 'Solved', 'Reported', 'Deleted'],
      datasets: [{
        data: [this.pending, this.solved, this.reported, this.deleted],
        backgroundColor: ['#f4a62a', '#1fb978', '#f97316', '#dc2626']
      }]
    };
  }

  getStatusClass(status: string): string {
    const s = String(status || '').toLowerCase();
    if (s === 'solved' || s === 'completed') return 'status-solved';
    if (s === 'reported' || s === 'pending') return 'status-pending';
    return 'status-other';
  }

  loadAdminIdentity(): void {
    const userRaw = localStorage.getItem('user');
    if (!userRaw) return;

    try {
      const user = JSON.parse(userRaw);
      if (user?.email) {
        this.adminEmail = user.email;
      }
    } catch {
      this.adminEmail = 'Admin';
    }
  }

  showDashboard(): void {
    this.currentView = 'dashboard';
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { view: null },
      queryParamsHandling: 'merge'
    });
  }

  showProfileSetup(): void {
    this.currentView = 'profile';
    this.profileSaved = false;
    this.profileSaveMessage = '';
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { view: 'profile' },
      queryParamsHandling: 'merge'
    });
  }

  private getProfileStorageKey(): string {
    return `admin_profile_${this.adminEmail || 'admin'}`;
  }

  private updateAgeFromBirthdate(birthdate: string): void {
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

  onProfileImageSelected(event: Event): void {
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

  saveProfile(): void {
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
    this.profileSaved = true;
    this.profileSaveMessage = 'Profile setup saved successfully.';
  }

  closeProfileSuccessPopup(): void {
    this.profileSaved = false;
    this.profileSaveMessage = '';
  }

  private loadProfile(): void {
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
  }

  // Navigate to complaints page when total complaints box is clicked
  viewComplaints() {
    this.router.navigate(['/admin-complaints']);
  }

  viewCompletedComplaints() {
    this.router.navigate(['/admin-complaints'], {
      queryParams: { status: 'completed' }
    });
  }

  viewReportedAndDeletedComplaints(): void {
    this.router.navigate(['/admin-complaint-management']);
  }

  logout() {
    this.authService.logout();
  }

  viewReopenedComplaints(): void {
    this.dashboardSection = 'reopened';
    this.reopenedCurrentPage = 1;
    this.loadReopenedComplaints();
  }

  backToOverview(): void {
    this.dashboardSection = 'overview';
    this.selectedReopened = null;
  }

  loadReopenedComplaints(): void {
    this.complaintService.getComplaints().subscribe({
      next: (data: any) => {
        const all = Array.isArray(data) ? data : (data?.data || []);
        this.reopenedComplaints = all.filter((c: any) =>
          String(c?.status || '').trim().toLowerCase() === 'reopened'
        );
        this.reopenedCurrentPage = Math.min(this.reopenedCurrentPage, this.reopenedTotalPages);
      },
      error: () => {
        this.reopenedComplaints = [];
      }
    });
  }

  get reopenedTotalPages(): number {
    const pages = Math.ceil(this.reopenedComplaints.length / this.reopenedPageSize);
    return pages > 0 ? pages : 1;
  }

  get reopenedPagedComplaints(): any[] {
    const start = (this.reopenedCurrentPage - 1) * this.reopenedPageSize;
    return this.reopenedComplaints.slice(start, start + this.reopenedPageSize);
  }

  nextReopenedPage(): void {
    if (this.reopenedCurrentPage < this.reopenedTotalPages) {
      this.reopenedCurrentPage++;
    }
  }

  previousReopenedPage(): void {
    if (this.reopenedCurrentPage > 1) {
      this.reopenedCurrentPage--;
    }
  }

  openReopenedModal(complaint: any): void {
    this.selectedReopened = complaint;
    this.reopenedActionReasonModalOpen = false;
    this.reopenedActionReason = '';
    this.reopenedActionReasonError = '';
    this.reopenedActionReasonType = '';
    this.reopenedActionMessage = '';
    this.reopenedActionError = '';
  }

  closeReopenedModal(): void {
    this.selectedReopened = null;
    this.reopenedActionReasonModalOpen = false;
    this.reopenedActionReason = '';
    this.reopenedActionReasonError = '';
    this.reopenedActionReasonType = '';
  }

  closeReopenedSuccessModal(): void {
    this.reopenedSuccessModalOpen = false;
    this.reopenedSuccessMessage = '';

    if (this.reopenedSuccessModalTimer) {
      clearTimeout(this.reopenedSuccessModalTimer);
      this.reopenedSuccessModalTimer = null;
    }
  }

  private scheduleReopenedSuccessModalClose(delayMs: number = 2500): void {
    if (this.reopenedSuccessModalTimer) {
      clearTimeout(this.reopenedSuccessModalTimer);
    }

    this.reopenedSuccessModalTimer = setTimeout(() => {
      this.closeReopenedSuccessModal();
    }, delayMs);
  }

  getReopenedReason(): string {
    return String(this.selectedReopened?.reopen_reason || '').trim();
  }

  getReopenedRequestedAt(): string {
    return String(this.selectedReopened?.reopen_requested_at || '').trim();
  }

  markReopenedCompleted(): void {
    this.performReopenedAction('complete', 'Complaint marked as completed.', 'Failed to mark complaint as completed.');
  }

  markReopenedInWork(): void {
    this.performReopenedAction('in_work', 'Complaint marked as already in work.', 'Failed to mark complaint as in work.');
  }

  markReopenedAsReported(): void {
    this.reopenedActionReasonType = 'report';
    this.reopenedActionReasonModalOpen = true;
    this.reopenedActionReason = '';
    this.reopenedActionReasonError = '';
  }

  requestDeleteReopened(): void {
    this.reopenedActionReasonType = 'delete';
    this.reopenedActionReasonModalOpen = true;
    this.reopenedActionReason = '';
    this.reopenedActionReasonError = '';
  }

  submitReopenedActionReason(): void {
    const reason = String(this.reopenedActionReason || '').trim();
    if (!reason) {
      this.reopenedActionReasonError = this.reopenedActionReasonType === 'delete'
        ? 'Please provide a reason before deleting this complaint.'
        : 'Please provide a reason before reporting this complaint.';
      return;
    }
    const successMsg = this.reopenedActionReasonType === 'delete'
      ? 'Complaint deleted successfully.'
      : 'Complaint reported successfully.';
    const errorMsg = this.reopenedActionReasonType === 'delete'
      ? 'Failed to delete complaint.'
      : 'Failed to report complaint.';
    this.performReopenedAction(this.reopenedActionReasonType, successMsg, errorMsg, { reason });
  }

  closeReopenedActionReasonModal(): void {
    this.reopenedActionReasonModalOpen = false;
    this.reopenedActionReason = '';
    this.reopenedActionReasonError = '';
    this.reopenedActionReasonType = '';
  }

  private performReopenedAction(
    action: string,
    successMessage: string,
    errorMessage: string,
    extraPayload: any = {}
  ): void {
    const targetComplaint = this.selectedReopened;
    if (!targetComplaint?.complaint_code) return;
    this.complaintService.updateComplaintAction({
      action,
      complaint_code: targetComplaint.complaint_code,
      ...extraPayload
    }).subscribe({
      next: (res: any) => {
        if (res?.status === 'success') {
          this.reopenedActionMessage = successMessage;
          this.reopenedSuccessMessage = successMessage;
          this.reopenedSuccessModalOpen = true;
          this.scheduleReopenedSuccessModalClose();
          this.reopenedActionReasonModalOpen = false;
          this.reopenedActionReason = '';
          this.reopenedActionReasonError = '';
          this.reopenedActionReasonType = '';
          this.loadReopenedComplaints();
          setTimeout(() => this.closeReopenedModal(), 700);
          return;
        }
        this.reopenedActionError = res?.message || errorMessage;
      },
      error: () => {
        this.reopenedActionError = 'Server error while updating complaint.';
      }
    });
  }

}