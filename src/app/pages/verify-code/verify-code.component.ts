import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/services/auth.service';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { ApiResponse } from 'src/app/models/api.model';

@Component({
  selector: 'app-verify-code',
  templateUrl: './verify-code.component.html',
  styleUrls: ['./verify-code.component.css']
})
export class VerifyCodeComponent {

  codeDigits: string[] = ['', '', '', '', '', ''];
  error = false;
  success = false;
  message = '';

  constructor(
    private authService: AuthService,
    private http: HttpClient,
    private router: Router
  ) {}

 moveNext(event: any, index: number) {
  const input = event.target;

  // Allow numbers only
  input.value = input.value.replace(/[^0-9]/g, '');

  if (input.value && index < 5) {
    const next = input.parentElement.children[index + 1];
    next.focus();
  }
}

moveBack(event: KeyboardEvent, index: number) {
  const input = event.target as HTMLInputElement;

  if (event.key === 'Backspace' && !input.value && index > 0) {
    const prev = input.parentElement!.children[index - 1] as HTMLElement;
    prev.focus();
  }
}

  verifyCode() {
    // clear existing state
    this.error = false;
    this.success = false;
    this.message = '';

    const fullCode = this.codeDigits.join('').trim();
    const identifier = (localStorage.getItem('reset_identifier') || '').trim();

    if (!identifier) {
      this.showError('Session expired. Please request a new reset code.');
      setTimeout(() => {
        this.router.navigate(['/forgot-password']);
      }, 1200);
      return;
    }

    if (fullCode.length !== 6) {
      this.showError('Please enter all 6 digits.');
      return;
    }

    this.http.post<ApiResponse>(
      `${environment.apiBaseUrl}/check-code.php`,
      {
        identifier: identifier,
        code: fullCode
      }
    ).subscribe({
      next: (res) => {
        if (res.status === 'success') {
          this.router.navigate(['/reset-password']);
        } else {
          this.showError(res.message || 'Invalid verification code.');
        }
      },
      error: err => {
        this.showError(err?.error?.message || 'Server error. Please try again.');
      }
    });
  }

  resendCode() {
    const identifier = (localStorage.getItem('reset_identifier') || '').trim();

    this.error = false;
    this.success = false;
    this.message = '';

    if (!identifier) {
      this.showError('Session expired. Please request a new reset code.');
      setTimeout(() => {
        this.router.navigate(['/forgot-password']);
      }, 1200);
      return;
    }

    this.authService.forgotPassword({ identifier }).subscribe({
      next: (res) => {
        if (res.status === 'success') {
          this.codeDigits = ['', '', '', '', '', ''];
          this.success = true;
          this.message = res.message || 'A new reset code has been sent.';
        } else {
          this.showError(res.message || 'Unable to resend reset code.');
        }
      },
      error: (err: any) => {
        this.showError(err?.error?.message || 'Server error. Please try again.');
      }
    });
  }

  closePopup() {
    this.success = false;
    this.error = false;
  }

  private showError(message: string) {
    this.error = true;
    this.success = false;
    this.message = message;
  }
}
