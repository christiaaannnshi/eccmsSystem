import { Component, OnInit, OnDestroy } from '@angular/core';
import { ComplaintService } from '../../services/complaint.service';
import { AuthService } from '../../services/auth.service';
import { ActivatedRoute } from '@angular/router';
import { interval, Subscription } from 'rxjs';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-admin-complaints',
  templateUrl: './admin-complaints.component.html',
  styleUrls: ['./admin-complaints.component.css']
})
export class AdminComplaintsComponent implements OnInit, OnDestroy {

  complaints: any[] = [];
  currentPage = 1;
  readonly pageSize = 8;
  selectedComplaint: any = null;
  actionReasonModalOpen = false;
  actionReason = '';
  actionReasonError = '';
  actionReasonType: 'report' | 'delete' | '' = '';
  actionMessage = '';
  actionError = '';
  actionSuccessModalOpen = false;
  actionSuccessMessage = '';
  statusFilter: 'all' | 'completed' = 'all';
  searchTerm = '';
  profileImagePreview = '';
  adminEmail = 'Admin';

  get displayName(): string {
    const raw = localStorage.getItem(this.getProfileStorageKey());
    if (!raw) {
      return this.adminEmail;
    }

    try {
      const data = JSON.parse(raw);
      const firstName = String(data?.firstName || '').trim();
      const middleInitial = String(data?.middleInitial || '').trim();
      const lastName = String(data?.lastName || '').trim();

      if (!firstName || !lastName) {
        return this.adminEmail;
      }

      return middleInitial
        ? `${firstName} ${middleInitial}. ${lastName}`
        : `${firstName} ${lastName}`;
    } catch {
      return this.adminEmail;
    }
  }

  private refreshSubscription: Subscription | null = null;
  private actionSuccessModalTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private complaintService: ComplaintService,
    private authService: AuthService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.loadAdminIdentity();
    this.loadProfile();

    this.route.queryParamMap.subscribe(params => {
      const requestedStatus = (params.get('status') || '').toLowerCase();
      this.statusFilter = requestedStatus === 'completed' ? 'completed' : 'all';
      this.currentPage = 1;
    });

    this.loadComplaints();
    
    // Refresh complaints every 5 seconds
    this.refreshSubscription = interval(5000).subscribe(() => {
      this.loadComplaints();
    });
  }

  ngOnDestroy(): void {
    // Clean up the subscription when component is destroyed
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
    }

    if (this.actionSuccessModalTimer) {
      clearTimeout(this.actionSuccessModalTimer);
      this.actionSuccessModalTimer = null;
    }
  }

  private loadAdminIdentity(): void {
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

  private getProfileStorageKey(): string {
    return `admin_profile_${this.adminEmail || 'admin'}`;
  }

  private loadProfile(): void {
    const raw = localStorage.getItem(this.getProfileStorageKey());
    if (!raw) {
      return;
    }

    try {
      const data = JSON.parse(raw);
      this.profileImagePreview = data?.profilePicture || '';
    } catch {
      this.profileImagePreview = '';
    }
  }

  loadComplaints(afterLoad?: () => void) {
    this.complaintService.getComplaints()
      .subscribe((res: any) => {
        const incomingComplaints = Array.isArray(res) ? res : (res?.data || []);
        this.complaints = incomingComplaints.map((complaint: any) => ({
          ...complaint,
          complaint_image: this.normalizeComplaintImage(complaint?.complaint_image)
        }));
        this.currentPage = Math.min(this.currentPage, this.totalPages);
        afterLoad?.();
      });
  }

  private normalizeComplaintImage(imageValue: any): string {
    const normalizedValue = String(imageValue || '').trim();

    if (!normalizedValue) {
      return '';
    }

    if (normalizedValue.startsWith('data:image/')) {
      return normalizedValue;
    }

    if (normalizedValue.startsWith('http://') || normalizedValue.startsWith('https://') || normalizedValue.startsWith('/')) {
      return normalizedValue;
    }

    return `data:image/jpeg;base64,${normalizedValue}`;
  }

  private isCompletedStatus(status: any): boolean {
    const normalizedStatus = String(status || '').toLowerCase();
    return normalizedStatus === 'completed' || normalizedStatus === 'solved';
  }

  private isReopenedStatus(status: any): boolean {
    return String(status || '').trim().toLowerCase() === 'reopened';
  }

  isReopenedComplaint(complaint: any): boolean {
    return String(complaint?.status || '').trim().toLowerCase() === 'reopened';
  }

  getSelectedReopenReason(): string {
    return String(this.selectedComplaint?.reopen_reason || '').trim();
  }

  getSelectedReopenRequestedAt(): string {
    return String(this.selectedComplaint?.reopen_requested_at || '').trim();
  }

  get totalPages(): number {
    const pages = Math.ceil(this.filteredComplaints.length / this.pageSize);
    return pages > 0 ? pages : 1;
  }

  get filteredComplaints(): any[] {
    const normalizedSearchTerm = String(this.searchTerm || '').trim().toLowerCase();

    const complaintsByStatus = this.statusFilter === 'completed'
      ? this.complaints.filter((complaint: any) => this.isCompletedStatus(complaint?.status))
      : this.complaints.filter((complaint: any) =>
          !this.isCompletedStatus(complaint?.status) && !this.isReopenedStatus(complaint?.status)
        );

    const complaintsByCategory = normalizedSearchTerm
      ? complaintsByStatus.filter((complaint: any) =>
          String(complaint?.category || '').toLowerCase().includes(normalizedSearchTerm)
        )
      : complaintsByStatus;

    return [...complaintsByCategory].sort((firstComplaint: any, secondComplaint: any) => {
      const firstIsReopened = this.isReopenedStatus(firstComplaint?.status);
      const secondIsReopened = this.isReopenedStatus(secondComplaint?.status);

      if (firstIsReopened !== secondIsReopened) {
        return firstIsReopened ? -1 : 1;
      }

      const firstId = Number(firstComplaint?.id || 0);
      const secondId = Number(secondComplaint?.id || 0);
      return secondId - firstId;
    });
  }

  get pagedComplaints(): any[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredComplaints.slice(start, start + this.pageSize);
  }

  onSearchTermChange(): void {
    this.currentPage = 1;
  }

  saveCompletedToExcel() {
    const completedComplaints = this.complaints.filter((complaint: any) => {
      return this.isCompletedStatus(complaint?.status);
    });

    if (completedComplaints.length === 0) {
      this.actionError = 'No completed complaints available to export.';
      this.actionMessage = '';
      return;
    }

    const excelData = completedComplaints.map((c: any) => ({
      ComplaintCode: c.complaint_code,
      Category: c.category,
      Description: c.description,
      DateSubmitted: c.created_at,
      Status: c.status,
      Complainant: c.user_id
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Completed Complaints');
    XLSX.writeFile(workbook, 'completed-complaints.xlsx');

    this.actionMessage = 'Completed complaints exported to Excel successfully.';
    this.actionError = '';
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }

  previousPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  openActionModal(complaint: any) {
    this.selectedComplaint = complaint;
    this.actionReasonModalOpen = false;
    this.actionReason = '';
    this.actionReasonError = '';
    this.actionReasonType = '';
    this.actionMessage = '';
    this.actionError = '';
  }

  closeActionModal() {
    this.selectedComplaint = null;
    this.actionReasonModalOpen = false;
    this.actionReason = '';
    this.actionReasonError = '';
    this.actionReasonType = '';
  }

  closeActionSuccessModal(): void {
    this.actionSuccessModalOpen = false;
    this.actionSuccessMessage = '';

    if (this.actionSuccessModalTimer) {
      clearTimeout(this.actionSuccessModalTimer);
      this.actionSuccessModalTimer = null;
    }
  }

  private scheduleActionSuccessModalClose(delayMs: number = 2500): void {
    if (this.actionSuccessModalTimer) {
      clearTimeout(this.actionSuccessModalTimer);
    }

    this.actionSuccessModalTimer = setTimeout(() => {
      this.closeActionSuccessModal();
    }, delayMs);
  }

  markAsReported() {
    this.openActionReasonModal('report');
  }

  requestDeleteComplaint() {
    this.openActionReasonModal('delete');
  }

  private openActionReasonModal(actionType: 'report' | 'delete'): void {
    this.actionReasonType = actionType;
    this.actionReasonModalOpen = true;
    this.actionReason = '';
    this.actionReasonError = '';
    this.actionError = '';
    this.actionMessage = '';
  }

  closeActionReasonModal(): void {
    this.actionReasonModalOpen = false;
    this.actionReason = '';
    this.actionReasonError = '';
    this.actionReasonType = '';
  }

  submitActionReason(): void {
    const actionType = this.actionReasonType;
    const reason = String(this.actionReason || '').trim();

    if (!actionType) {
      return;
    }

    if (!reason) {
      this.actionReasonError = actionType === 'report'
        ? 'Please provide a reason before reporting this complaint.'
        : 'Please provide a reason before deleting this complaint.';
      return;
    }

    this.updateComplaintAction(
      actionType,
      actionType === 'report' ? 'Complaint reported successfully.' : 'Complaint deleted successfully.',
      actionType === 'report' ? 'Failed to report complaint.' : 'Failed to delete complaint.',
      { reason }
    );
  }

  deleteComplaint() {
    this.requestDeleteComplaint();
  }

  markCompleted() {
    this.updateComplaintAction('complete', 'Complaint marked as completed.', 'Failed to mark complaint as completed.');
  }

  markAlreadyInWork() {
    this.updateComplaintAction('in_work', 'Complaint marked as already in work.', 'Failed to mark complaint as in work.');
  }

  private updateComplaintAction(
    action: string,
    successMessage: string,
    errorMessage: string,
    extraPayload: any = {}
  ) {
    const targetComplaint = this.selectedComplaint;

    if (!targetComplaint?.complaint_code) {
      return;
    }

    this.complaintService.updateComplaintAction({
      action,
      complaint_code: targetComplaint.complaint_code,
      ...extraPayload
    }).subscribe({
      next: (res: any) => {
        if (res?.status === 'success') {
          this.actionMessage = successMessage;
          this.actionSuccessMessage = successMessage;
          this.actionSuccessModalOpen = true;
          this.scheduleActionSuccessModalClose();
          this.actionReasonModalOpen = false;
          this.actionReason = '';
          this.actionReasonError = '';
          this.actionReasonType = '';

          this.loadComplaints();

          if (this.selectedComplaint) {
            setTimeout(() => this.closeActionModal(), 700);
          }
          return;
        }
        this.actionError = res?.message || errorMessage;
      },
      error: () => {
        this.actionError = 'Server error while updating complaint.';
      }
    });
  }

  logout() {
    this.authService.logout();
  }

}