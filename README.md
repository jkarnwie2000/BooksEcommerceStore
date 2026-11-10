</> Markdown

## Books E-commerce Store App Screenshot

![Books E-commerce Store Project](./booksecommercestoreproject.png)

## 🛠️ Tech Stack
- React 19: component-based user interface
- React Router: client-side page navigation
- JavaScript (ES6+): interactive app functionality
- CSS3: responsive custom styling
- Font Awesome: interface and social icons
- Stripe Checkout: secure card payments, shipping addresses
- Vercel Serverless Functions: backend API endpoints
- Vercel Blob: private admin data storage
- Nodemailer + Gmail SMTP: order confirmation emails
- Node.js crypto: password hashing, secure tokens
- Vitest + React Testing Library: automated tests
- Vercel: hosting and continuous deployment
  
### 🚀 Key Features

- 📚 Book Catalog: Browse featured, discounted, and recommended books
- 🔃 Smart Sorting: Sort books by price or rating
- 🛒 Shopping Cart: Add books, adjust quantities, remove items
- 💾 Saved Cart: Cart stays put between visits
- 🧮 Live Totals: Subtotal, tax, and total update instantly
- 💳 Stripe Checkout: Secure card, Apple Pay, Google Pay
- 📦 Shipping Details: Customers enter address and phone
- 📧 Order Emails: Confirmations sent to customer and business
- 📊 Admin Dashboard: Revenue, orders, books sold, catalog sales
- 🗑️ Transaction Management: Delete transactions from the dashboard
- 🔐 Secure Admin Login: Email and password sign-in
- 🔑 Password Reset: One-time, expiring email reset links
- 🔗 Social Links: Footer links to social profiles
- 📱 Responsive Design: Works on phones, tablets, desktops
- ✅ Tested: 61 automated tests with Vitest

## Books E-commerce Store App

🔗 **Live Demo:** [View Live Website](https://books-ecommerce-gold.vercel.app/)

## Books E-commerce Store App Run Instructions

## 1. Project Overview

**Project Name:** Books E-commerce Website

**Development Environment:** Visual Studio Code

**Operating System:** Windows 10/11

**Node.js Version:** 20.9 or compatible Node.js 20 release

## 2. Prerequisites

Before running the project, ensure the following software is installed:

| Software | Purpose |
|---|---|
| Node.js 20.9 | JavaScript runtime |
| npm | Package and dependency management |
| Visual Studio Code | Code editor |
| Git | Version control |
| Google Chrome | Browser testing |

### Verify Installation

Open your VS Code terminal and execute:

```bash
node -v
npm -v
git --version
```

Ensure Node.js and npm are installed correctly before proceeding.

## 3. Clone or Open the Repository

If cloning from GitHub, open your terminal and execute:

```bash
git clone YOUR_GITHUB_REPOSITORY_URL
```

Navigate into the project directory:

```bash
cd YOUR_PROJECT_FOLDER
```

Alternatively, if you have already downloaded the project:

1. Open Visual Studio Code.
2. Select File → Open Folder.
3. Locate your project directory.
4. Select the project root folder.

Ensure you open the root directory containing `package.json` and `package-lock.json`.

## 4. Install Project Dependencies

The project includes both `package.json` and `package-lock.json`, indicating that npm is used for dependency management.

From the project root directory, execute:

```bash
npm ci
```

This command installs the exact dependency versions specified in the lockfile.

If `npm ci` fails because the package files are out of sync, execute:

```bash
npm install
```

After installation, npm creates the `node_modules` directory containing the project's dependencies.

## 5. Environment Variables Configuration

The application includes backend API functionality for:

- Stripe checkout sessions.
- Stripe webhook processing.
- Order management.
- Administrative authentication.
- Password reset functionality.
- Email notifications.
- Data storage.

Some of these features may require environment variables.

### Configure Environment Variables

First, check the project root for an existing `.env.example` file.

If one exists, use it as a reference.

Inspect the following backend files for environment variable references:

```text
api/_lib/auth.js
api/_lib/blob-json.js
api/_lib/email.js
api/create-checkout-session.js
api/stripe-webhook.js
```

Look for references to:

```javascript
process.env
```

Create a `.env.local` file in the project root if required.

For example, Stripe integrations commonly require:

```env
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
```

These are illustrative variable names. Use the exact names expected by your backend implementation.

**Important Security Notes:**

- Never commit `.env.local` to GitHub.
- Never expose Stripe secret keys in frontend React components.
- Never store sensitive backend credentials in frontend-accessible environment variables.
- Ensure `.env.local` is included in `.gitignore`.

Stripe developer credentials can be obtained from the Stripe Dashboard:

https://dashboard.stripe.com/

## 6. Running the Application Locally

The project contains a React frontend and an `api` directory containing backend endpoints.

The exact development command depends on the scripts configured in `package.json`.

### Step 1: Identify Available Scripts

Open `package.json` and inspect the `scripts` section.

Alternatively, execute:

```bash
npm run
```

This displays the available project commands.

### Step 2: Start the React Development Server

If the project uses Vite and has a `dev` script:

```bash
npm run dev
```

If the project uses Create React App and has a `start` script:

```bash
npm start
```

Once the development server starts, open the local URL displayed in your terminal.

Common development addresses include:

```text
http://localhost:5173
```

or:

```text
http://localhost:3000
```

### Step 3: Start Backend API Functions

The project includes an `api` directory containing serverless-style endpoints.

If the project uses Vercel serverless functions, install the Vercel CLI:

```bash
npm install -g vercel
```

Verify installation:

```bash
vercel --version
```

From the project root, execute:

```bash
vercel dev
```

This starts the local Vercel development environment, allowing the frontend and supported API endpoints to run together.

The first execution may require Vercel authentication or project configuration.

Vercel documentation:

https://vercel.com/docs/cli

**Note:** Use `vercel dev` if the application relies on Vercel serverless API routes. Running the React development server alone may not provide the backend functionality.

## 7. Building the Project for Production

To create an optimized production build, execute:

```bash
npm run build
```

The output directory depends on the build system:

- Vite typically generates a `dist` directory.
- Create React App typically generates a `build` directory.

These directories contain the optimized frontend files used for production deployment.

### Preview the Production Build

For Vite projects with a configured preview script:

```bash
npm run preview
```

This allows you to test the production frontend locally.

## 8. Running Automated Tests

The project includes Vitest configuration and numerous automated test files covering components, checkout functionality, administrative features, and API endpoints.

To execute the complete test suite:

```bash
npx vitest run
```

To run tests in watch mode:

```bash
npx vitest
```

To execute an individual test file:

```bash
npx vitest run src/Cart.test.jsx
```

The test suite helps verify application functionality and identify regressions during development.

## 9. VS Code Debugging Configuration

To debug the React frontend directly from Visual Studio Code, create a `.vscode` directory in the project root.

Inside that directory, create a file named:

```text
launch.json
```

For a Vite project running on port 5173, use:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug React Application",
      "type": "chrome",
      "request": "launch",
      "url": "http://localhost:5173",
      "webRoot": "${workspaceFolder}/src"
    }
  ]
}
```

For Create React App, change the URL to:

```text
http://localhost:3000
```

### Starting the Debugger

1. Open Visual Studio Code.
2. Select Run and Debug from the left sidebar.
3. Select Debug React Application.
4. Click the green Start button.
5. Chrome should launch with your local application.

### Setting Breakpoints

Open any React component, such as:

```text
src/components/ui/Book.jsx
```

Click beside a line number to create a breakpoint.

You can then inspect variables, step through JavaScript execution, and troubleshoot runtime errors.

Note: This configuration covers frontend browser debugging. Backend API debugging requires a separate Node.js debugger configuration.

## 10. Troubleshooting

| Issue | Recommended Solution |
|---|---|
| Node.js is not recognized | Install Node.js and restart VS Code. |
| npm is not recognized | Verify Node.js installation and PATH configuration. |
| npm ci fails | Check whether package.json and package-lock.json are synchronized. |
| Dependencies are missing | Run npm ci or npm install. |
| Development server fails | Check available scripts using npm run. |
| Application displays a blank page | Inspect the browser console and VS Code terminal. |
| API endpoints return 404 | Verify whether Vercel development mode is required. |
| Stripe checkout fails | Verify Stripe credentials and environment variables. |
| Admin authentication fails | Check backend authentication configuration. |
| Tests fail | Verify Vitest configuration and required environment variables. |
| Images do not display | Verify image paths inside public/assets. |

## 11. Quick Reference: Essential Commands

| Task | Command |
|---|---|
| Check Node.js version | `node -v` |
| Check npm version | `npm -v` |
| Install dependencies | `npm ci` |
| Alternative dependency installation | `npm install` |
| Display available scripts | `npm run` |
| Start Vite development server | `npm run dev` |
| Start Create React App | `npm start` |
| Start Vercel development server | `vercel dev` |
| Build production frontend | `npm run build` |
| Preview Vite production build | `npm run preview` |
| Run automated tests | `npx vitest run` |
| Run tests in watch mode | `npx vitest` |
| Install Vercel CLI | `npm install -g vercel` |

## 12. Recommended Development Workflow

### First-Time Installation

Execute the following commands from the project root:

```bash
# Install project dependencies
npm ci

# Start the local development environment
vercel dev
```

The second command assumes the project uses Vercel serverless functions and has been configured for local development.

### Subsequent Development Sessions

Start the application:

```bash
vercel dev
```

### Before Committing Changes

Run the automated tests:

```bash
npx vitest run
```

Build the production frontend:

```bash
npm run build
```

Resolve any failing tests or build errors before committing your changes.

---

## 13. Project Structure

```text
├── api
│   ├── _lib
│   │   ├── auth.js
│   │   ├── blob-json.js
│   │   ├── deleted-orders.js
│   │   ├── email.js
│   │   ├── orders.js
│   │   └── sent-emails.js
│   ├── admin
│   │   ├── forgot-password.js
│   │   ├── orders.js
│   │   └── reset-password.js
│   ├── create-checkout-session.js
│   └── stripe-webhook.js
│
├── public
│   ├── assets
│   ├── favicon.ico
│   ├── index.html
│   ├── logo192.png
│   ├── logo512.png
│   ├── manifest.json
│   └── robots.txt
│
├── src
│   ├── components
│   ├── pages
│   ├── App.js
│   ├── index.css
│   ├── index.js
│   └── [Automated Test Files]
│
├── booksecommercestoreproject.png
├── package-lock.json
├── package.json
├── README.md
└── vitest.config.js
```

## 14. Additional Notes

- The project uses npm for dependency management.
- React components and application pages are organized inside `src`.
- Static assets and book images are stored inside `public/assets`.
- Backend API endpoints are organized inside `api`.
- Vitest is configured for automated testing.
- Stripe integration provides payment-processing functionality.
- Environment variables must be configured before using backend services that require external credentials.

**Important:** Verify the actual scripts in `package.json` and required environment variables in the backend source files before running the application. The development, build, and debugging commands above depend on the project's actual configuration.
