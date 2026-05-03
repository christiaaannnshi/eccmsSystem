import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {

  loginForm!: FormGroup;

  submitted = false;
  loading = false;

  loginError = false;
  loginSuccess = false;

  errorMessage = '';
  successMessage = '';

  showTermsModal = false;
  showAboutModal = false;
  showContactModal = false;

  // ✅ TEMPORARY ADMIN ACCOUNT
  adminEmail = 'admin@gmail.com';
  adminPassword = 'admin123';

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required]],
      password: ['', [Validators.required]],
      agreeTerms: [false, [Validators.requiredTrue]]
    });
  }

  openTerms(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.showTermsModal = true;
  }

  closeTerms(): void {
    this.showTermsModal = false;
  }

  openAbout(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.showAboutModal = true;
  }

  closeAbout(): void {
    this.showAboutModal = false;
  }

  openContact(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.showContactModal = true;
  }

  closeContact(): void {
    this.showContactModal = false;
  }

  onSubmit(): void {

    if (this.loading) return;

    this.submitted = true;
    this.loginError = false;
    this.loginSuccess = false;
    this.errorMessage = '';
    this.successMessage = '';

    // mark controls so validation messages appear if empty
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    // grab the latest values explicitly (ensures they're up to date)
    const email = this.loginForm.get('email')?.value || '';
    const password = this.loginForm.get('password')?.value || '';

    // ✅ CHECK IF ADMIN FIRST (NO API NEEDED)
    if (email === this.adminEmail && password === this.adminPassword) {

      this.loginSuccess = true;
      this.successMessage = 'Admin login successful!';
      localStorage.setItem('token', 'adminLoggedIn');
      localStorage.setItem('role', 'admin');
      localStorage.setItem('user', JSON.stringify({
        id: 1,
        email: this.adminEmail
      }));

      setTimeout(() => {
        this.router.navigate(['/admin-dashboard']);
      }, 1500);

      return;
    }

    // ✅ NORMAL USER LOGIN (API) via AuthService
    this.loading = true;

    this.auth.login({ email, password }).subscribe({

      next: (response: any) => {
        if (response.status === 'success') {
          this.loginSuccess = true;
          this.successMessage = response.message;

          localStorage.setItem('token', 'loggedIn');
          localStorage.setItem('role', 'user');
          localStorage.setItem('user', JSON.stringify({
            id: response.user_id,
            email: email
          }));

          this.loading = false;
          setTimeout(() => {
            this.router.navigate(['/user-dashboard']);
          }, 1500);
        } else {
          this.showError(response.message);
        }
      },
      error: (err: any) => {
        this.showError('Server error: ' + (err.error?.message || err.message || 'Unknown'));
      }
    });
  }

  showError(message: string) {
    this.loginError = true;
    this.errorMessage = message;
    this.loading = false;

    setTimeout(() => {
      this.loginError = false;
    }, 3000);
  }
}