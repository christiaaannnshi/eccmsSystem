import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import {
  ApiResponse,
  ForgotPasswordPayload,
  LoginPayload,
  RegisterPayload
} from '../models/api.model';

@Injectable({ providedIn: 'root' })
export class AuthService {

  private api = environment.apiBaseUrl;

  constructor(private http: HttpClient, private router: Router) {}

  login(data: LoginPayload): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.api}/login.php`, data);
  }

  register(data: RegisterPayload): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.api}/register.php`, data);
  }

  forgotPassword(data: ForgotPasswordPayload): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.api}/verify-code.php`, data);
  }

  logout() {
    // Clear all authentication data
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    
    // Navigate to login
    this.router.navigate(['/login']);
  }
}
