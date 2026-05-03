import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/services/auth.service';

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.css']
})
export class ForgotPasswordComponent {

  identifier: string = '';
  error = false;
  success = false;
  message = '';

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  sendResetCode() {

    // clear previous error state
    this.error = false;
    this.success = false;
    this.message = '';

    if (!this.identifier) {
      this.showError('Please enter your email or phone number.');
      return;
    }

    this.authService.forgotPassword({ identifier: this.identifier }).subscribe({
      next: (res) => {
        if (res.status === 'success') {
          localStorage.setItem('reset_identifier', this.identifier);
          this.success = true;
          this.message = res.message || 'Reset code sent successfully.';

          setTimeout(() => {
            if (this.success) {
              this.closePopup();
            }
          }, 1500);

        } else {
          this.showError(res.message || 'Unable to send reset code.');
        }

      },
      error: (err) => {
        this.showError(err?.error?.message || 'Server error. Please try again later.');
      }
    });
  }

  closePopup() {
    const shouldNavigate = this.success;
    this.success = false;
    this.error = false;

    if (shouldNavigate) {
      this.router.navigate(['/verify-code']);
    }
  }

  private showError(message: string) {
    this.error = true;
    this.success = false;
    this.message = message;
  }

}
