import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { ComplaintService } from '../../services/complaint.service';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-admin-complaint-management',
  templateUrl: './admin-complaint-management.component.html',
  styleUrls: ['./admin-complaint-management.component.css']
})
export class AdminComplaintManagementComponent implements OnInit {

  actions: any[] = [];
  currentActionsPage = 1;
  readonly actionsPerPage = 12;
  selectedReasonAction: any = null;
  profileImagePreview = '';
  adminEmail = 'Admin';

  get totalActionsPages(): number {
    return Math.max(1, Math.ceil(this.actions.length / this.actionsPerPage));
  }

  get paginatedActions(): any[] {
    const startIndex = (this.currentActionsPage - 1) * this.actionsPerPage;
    return this.actions.slice(startIndex, startIndex + this.actionsPerPage);
  }

  get isOnFirstActionsPage(): boolean {
    return this.currentActionsPage <= 1;
  }

  get isOnLastActionsPage(): boolean {
    return this.currentActionsPage >= this.totalActionsPages;
  }

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

  constructor(private complaintService: ComplaintService, private authService: AuthService) {}

  ngOnInit(): void {
    this.loadAdminIdentity();
    this.loadProfile();
    this.loadActions();
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

  loadActions() {
    forkJoin({
      actionLogs: this.complaintService.getComplaintActions(),
      complaints: this.complaintService.getComplaints()
    }).subscribe({
      next: ({ actionLogs, complaints }) => {
        const normalizeActionType = (value: any): 'report' | 'delete' | '' => {
          const type = String(value || '').trim().toLowerCase();
          if (type === 'delete' || type === 'deleted') return 'delete';
          if (type === 'report' || type === 'reported') return 'report';
          return '';
        };

        const complaintList: any[] = Array.isArray(complaints)
          ? complaints
          : (Array.isArray(complaints?.data) ? complaints.data : []);
        const locationByCode = new Map<string, string>();
        complaintList.forEach((item: any) => {
          const code = String(item?.complaint_code || '').trim();
          if (!code) {
            return;
          }
          locationByCode.set(code, String(item?.location || '').trim());
        });

        const logs: any[] = (Array.isArray(actionLogs)
          ? actionLogs
          : (Array.isArray(actionLogs?.data) ? actionLogs.data : [])
        ).map((item: any) => {
          const normalizedType = normalizeActionType(item?.action_type);
          const normalizedReason = String(item?.action_reason || '').trim();
          const complaintCode = String(item?.complaint_code || '').trim();

          return {
            complaint_code: complaintCode,
            complaint_name: item?.complaint_name || 'Complaint',
            location: locationByCode.get(complaintCode) || '',
            action_type: normalizedType || (normalizedReason ? 'report' : ''),
            action_reason: normalizedReason,
            action_date: item?.action_date || ''
          };
        });

        const statusBased = complaintList
          .filter((item: any) => {
            const status = String(item?.status || '').toLowerCase();
            return status === 'reported' || status === 'deleted';
          })
          .map((item: any) => ({
            complaint_code: item?.complaint_code || '',
            complaint_name: item?.category || 'Complaint',
            location: item?.location || '',
            action_type: String(item?.status || '').toLowerCase() === 'deleted' ? 'delete' : 'report',
            action_reason: item?.action_reason || '',
            action_date: item?.updated_at || item?.created_at || ''
          }));

        const merged = [...logs];

        for (const complaint of statusBased) {
          const hasLog = merged.some((entry: any) =>
            String(entry?.complaint_code || '') === String(complaint?.complaint_code || '') &&
            String(entry?.action_type || '') === String(complaint?.action_type || '')
          );

          if (!hasLog) {
            merged.push(complaint);
          }
        }

        this.actions = merged.sort((a: any, b: any) => {
          const first = new Date(a?.action_date || 0).getTime();
          const second = new Date(b?.action_date || 0).getTime();
          return second - first;
        });
        this.currentActionsPage = 1;
      },
      error: () => {
        this.actions = [];
        this.currentActionsPage = 1;
      }
    });
  }

  goToPreviousActionsPage(): void {
    if (this.isOnFirstActionsPage) {
      return;
    }

    this.currentActionsPage--;
  }

  goToNextActionsPage(): void {
    if (this.isOnLastActionsPage) {
      return;
    }

    this.currentActionsPage++;
  }

  canViewReportReason(action: any): boolean {
    return String(action?.action_type || '').toLowerCase() === 'report';
  }

  openReportReason(action: any): void {
    if (!this.canViewReportReason(action)) {
      return;
    }

    this.selectedReasonAction = action;
  }

  closeReportReason(): void {
    this.selectedReasonAction = null;
  }

  logout() {
    this.authService.logout();
  }
}
