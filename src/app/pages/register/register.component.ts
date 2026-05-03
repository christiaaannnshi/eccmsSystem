import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { NgForm } from '@angular/forms';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent {

  constructor(private router: Router, private auth: AuthService) {}

  registerError = false;
  registerSuccess = false;

  errorMessage = '';
  successMessage = '';

 onSubmit(form: NgForm) {

  // Mark all fields as touched
  Object.values(form.controls).forEach(control => {
    control.markAsTouched();
  });

  const { email, password, confirmPassword } = form.value;

  this.registerError = false;
  this.registerSuccess = false;
  this.errorMessage = '';
  this.successMessage = '';

  if (!email || !password || !confirmPassword) {
    this.showError("Please fill all fields.");
    return;
  }

  if (password.length < 6) {
    this.showError("Password must be at least 6 characters.");
    return;
  }

  if (password !== confirmPassword) {
    this.showError("Passwords do not match.");
    return;
  }

  // If everything valid → send request
  const userData = { email, password };

  this.auth.register(userData)
    .subscribe({
      next: (response: any) => {
        if (response.status === 'success') {
          this.registerSuccess = true;
          this.successMessage = response.message;
          form.resetForm();
          setTimeout(() => {
            this.router.navigate(['/login']);
          }, 2000);
        } else {
          this.showError(response.message || 'Registration failed.');
        }
      },
      error: (err: any) => {
        this.showError('Server error: ' + (err.error?.message || err.message || 'Unknown'));
      }
    });
}

  private showError(message: string) {
    this.registerError = true;
    this.errorMessage = message;

    setTimeout(() => {
      this.registerError = false;
    }, 3000);
  }
}
