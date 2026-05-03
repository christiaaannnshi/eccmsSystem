import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { LoginComponent } from './pages/login/login.component';
import { RegisterComponent } from './pages/register/register.component';
import { ForgotPasswordComponent } from './pages/forgot-password/forgot-password.component';
import { VerifyCodeComponent } from './pages/verify-code/verify-code.component';
import { UserDashboardComponent } from './pages/user-dashboard/user-dashboard.component';
import { ChangePasswordComponent } from './pages/change-password/change-password.component';
import { AdminDashboardComponent } from './pages/admin-dashboard/admin-dashboard.component';
import { AdminComplaintsComponent } from './pages/admin-complaints/admin-complaints.component';
import { AdminComplaintManagementComponent } from './pages/admin-complaint-management/admin-complaint-management.component';

import { AuthGuard } from './auth.guard'; // ✅ IMPORT THIS

const routes: Routes = [

  { path: '', redirectTo: 'login', pathMatch: 'full' },

  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'forgot-password', component: ForgotPasswordComponent },
  { path: 'verify-code', component: VerifyCodeComponent },
  { path: 'reset-password', component: ChangePasswordComponent },
  { path: 'admin-dashboard', component: AdminDashboardComponent, canActivate: [AuthGuard], data: { role: 'admin' } },
  { path: 'admin-complaints', component: AdminComplaintsComponent, canActivate: [AuthGuard], data : { role: 'admin' } },
  { path: 'admin-complaint-management', component: AdminComplaintManagementComponent, canActivate: [AuthGuard], data : { role: 'admin' } },

  // 🔐 PROTECTED ROUTE
  {
    path: 'user-dashboard',
    component: UserDashboardComponent,
    canActivate: [AuthGuard], data : { role: 'user' }
  },

  // ✅ optional wildcard (for wrong URLs)
  { path: '**', redirectTo: 'login' }

];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}