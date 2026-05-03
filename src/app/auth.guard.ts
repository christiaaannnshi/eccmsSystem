import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {

  constructor(private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot): boolean {

    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    const user = localStorage.getItem('user');

    // ❌ not logged in - redirect to login
    if (!token || !user || !role) {
      this.router.navigate(['/login']);
      return false;
    }

    // ✅ Check if route requires specific role
    const requiredRole = route.data['role'];
    
    if (requiredRole && role !== requiredRole) {
      this.router.navigate(['/login']);
      return false;
    }

    // ✅ allow access if authenticated and role matches
    return true;
  }
}