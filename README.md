# Eccms

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 16.2.16.

## Development server

Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The application will automatically reload if you change any of the source files.

## Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

## Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory.

## Running unit tests

Run `ng test` to execute the unit tests via [Karma](https://karma-runner.github.io).

## Running end-to-end tests

Run `ng e2e` to execute the end-to-end tests via a platform of your choice. To use this command, you need to first add a package that implements end-to-end testing capabilities.

## Further help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI Overview and Command Reference](https://angular.io/cli) page.

## Two-Laptop Setup (User on one, Admin on another)

The frontend now uses environment configuration for API URLs:

- Development: `src/environments/environment.ts` -> `http://localhost/eccms-api`
- Production: `src/environments/environment.prod.ts` -> `/eccms-api`

### Option A: Same local network (quick testing)

1. Keep XAMPP running on the host laptop.
2. Update `src/environments/environment.ts` to your host laptop IP:
	- Example: `http://192.168.1.10/eccms-api`
3. Start Angular with host binding:
	- `ng serve --host 0.0.0.0 --port 4200`
4. On the second laptop, open:
	- `http://<host-ip>:4200`
5. Login with admin credentials on one laptop and user credentials on the other.

### Option B: URL-only access (no VS Code/XAMPP on client laptops)

1. Build the Angular app:
	- `npm run build`
2. Upload `dist/eccms` to your web server (Apache/Nginx/shared hosting).
3. Upload `eccms-api` to the same server root so it is available at `/eccms-api`.
4. Set up your MySQL database on that server and update API DB credentials if needed.
5. Open your domain URL from any laptop and login.

In Option B, end users only need a browser and URL. No VS Code and no XAMPP are required on their laptops.
