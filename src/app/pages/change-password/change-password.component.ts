import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-change-password',
  templateUrl: './change-password.component.html',
  styleUrls: ['./change-password.component.css']
})
export class ChangePasswordComponent implements OnInit {
  resetForm!: FormGroup;
  loading = false;
  error = false;
  success = false;
  message = '';

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.resetForm = this.fb.group({
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    });
  }

  submitReset(): void {
    if (this.loading) {
      return;
    }

    this.error = false;
    this.success = false;
    this.message = '';

    if (this.resetForm.invalid) {
      this.resetForm.markAllAsTouched();
      this.error = true;
      this.message = 'Please complete all required fields.';
      return;
    }

    const password = this.resetForm.get('password')?.value || '';
    const confirmPassword = this.resetForm.get('confirmPassword')?.value || '';

    if (password !== confirmPassword) {
      this.error = true;
      this.message = 'Password and Confirm Password do not match.';
      return;
    }

    const identifier = (localStorage.getItem('reset_identifier') || '').trim();
    if (!identifier) {
      this.error = true;
      this.message = 'Session expired. Please request a new reset code.';
      setTimeout(() => this.router.navigate(['/forgot-password']), 1200);
      return;
    }

    this.loading = true;
    this.http.post<any>(`${environment.apiBaseUrl}/reset-password.php`, {
      identifier,
      password
    }).subscribe({
      next: (res) => {
        this.loading = false;
        if (res?.status === 'success') {
          this.success = true;
          this.message = res?.message || 'Password changed successfully.';
          localStorage.removeItem('reset_identifier');
          setTimeout(() => this.router.navigate(['/login']), 1200);
          return;
        }

        this.error = true;
        this.message = res?.message || 'Unable to reset password.';
      },
      error: (err) => {
        this.loading = false;
        this.error = true;
        this.message = err?.error?.message || 'Server error. Please try again later.';
      }
    });
  }
}
