import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ApiResponse, ComplaintPayload, DashboardStatsResponse, ReopenComplaintPayload } from '../models/api.model';

@Injectable({ providedIn: 'root' })
export class ComplaintService {

  private apiUrl = environment.apiBaseUrl;

  private complaintCountSubject = new BehaviorSubject<number>(0);
  public complaintCount$ = this.complaintCountSubject.asObservable();

  constructor(private http: HttpClient) {}

  fileComplaint(payload: ComplaintPayload): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.apiUrl}/file_complaint.php`, payload);
  }

  // Get all complaints for admin
  getComplaints(): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(`${this.apiUrl}/get_complaints.php`);
  }

  // Get complaints for a specific user
  getUserComplaints(userId: number): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(`${this.apiUrl}/get_user_complaints.php?user_id=${userId}`);
  }

  // Get dashboard statistics
  getDashboardStats(): Observable<ApiResponse<DashboardStatsResponse>> {
    return this.http.get<ApiResponse<DashboardStatsResponse>>(`${this.apiUrl}/dashboard_stats.php`);
  }

  // Mark complaint as reported or deleted
  updateComplaintAction(payload: ComplaintPayload): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.apiUrl}/complaint_action.php`, payload);
  }

  // Reopen a completed complaint from user side
  reopenComplaint(payload: ReopenComplaintPayload): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.apiUrl}/reopen_complaint.php`, payload);
  }

  // Get reported/deleted complaint history
  getComplaintActions(): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(`${this.apiUrl}/get_complaint_actions.php`);
  }

  // Get notification logs for a user
  getNotifications(userId: number): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(`${this.apiUrl}/get_notification_logs.php?user_id=${userId}`);
  }

  // Update complaint count in the service
  updateComplaintCount(count: number): void {
    this.complaintCountSubject.next(count);
  }

  // Get current complaint count
  getComplaintCount(): Observable<number> {
    return this.complaintCount$;
  }

}
