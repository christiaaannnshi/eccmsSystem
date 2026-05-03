import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { NgChartsModule } from 'ng2-charts';

import { AppComponent } from './app.component';
import { LoginComponent } from './pages/login/login.component';
import { RegisterComponent } from './pages/register/register.component';
import { ForgotPasswordComponent } from './pages/forgot-password/forgot-password.component';
import { VerifyCodeComponent } from './pages/verify-code/verify-code.component';
import { AppRoutingModule } from './app-routing.module';
import { ChangePasswordComponent } from './pages/change-password/change-password.component';
import { AdminComplaintsComponent } from './pages/admin-complaints/admin-complaints.component';
import { UserDashboardComponent } from './pages/user-dashboard/user-dashboard.component';
import { AdminDashboardComponent } from './pages/admin-dashboard/admin-dashboard.component';
import { AdminComplaintManagementComponent } from './pages/admin-complaint-management/admin-complaint-management.component';


@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    RegisterComponent,
    ForgotPasswordComponent,
    VerifyCodeComponent,
    ChangePasswordComponent,
    AdminComplaintsComponent,
    AdminComplaintManagementComponent,
    UserDashboardComponent,
    AdminDashboardComponent
    
  ],
  imports: [
    BrowserModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,
    AppRoutingModule,
    NgChartsModule,
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule {}
