# PeoplePay360

PeoplePay360 is a full-stack HR and payroll management system. It helps organizations manage employee records, track daily attendance, handle leave requests, and automate monthly payroll calculations with payslip generation.

---

## Tech Stack

### Frontend
* React 18
* TypeScript
* Vite
* Tailwind CSS
* Lucide React (Icons)
* React Router DOM

### Backend
* Node.js and Express
* TypeScript
* Prisma ORM
* MySQL
* JSON Web Tokens (JWT) for authentication
* PDFKit (for generating payslip PDFs)
* Nodemailer (for email notifications)

---

## Core Features

1. **Employee Management**
   * Maintain employee directory, job positions, and departments.
   * Store bank details, manager relations, and personal profiles.

2. **Contracts and Schedules**
   * Define monthly wages, contract start/end dates, and contract statuses.
   * Configure weekly working schedules and shift hours.

3. **Attendance and Time Off**
   * Daily check-in and check-out tracking with live timer.
   * Automatic calculation of worked hours and overtime.
   * Leave request submission and approval workflow.

4. **Payroll and Payslips**
   * Monthly payrun creation (Draft -> Compute -> Validate -> Mark Paid -> Send).
   * Salary calculation using basic pay, allowances (HRA, travel), and deductions (PF, TDS).
   * Validation warnings for missing bank details and duplicate records.
   * Downloadable and printable payslips.

5. **Role-Based Access Control (RBAC)**
   * Four user roles: Admin, HR Manager, Payroll Officer, and Employee.
   * Protected routes and actions based on user permissions.

---

## Project Structure

```text
PeoplePay360/
├── backend/
│   ├── prisma/              # Prisma schema and migrations
│   ├── scripts/             # Database and seed helper scripts
│   ├── src/
│   │   ├── config/          # Environment configuration
│   │   ├── controllers/     # Request handlers for each module
│   │   ├── middlewares/     # Auth and RBAC guards
│   │   ├── routes/          # Express route definitions
│   │   ├── services/        # Business logic (payroll engine, PDF, email)
│   │   └── server.ts        # Server entry point
│   ├── database_setup.sql   # MySQL initial schema and seed data
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/      # UI, layout, and auth guard components
│   │   ├── context/         # Auth and Attendance React contexts
│   │   ├── lib/             # API client, RBAC rules, formatting helpers
│   │   ├── pages/           # Application views (Dashboard, Payroll, etc.)
│   │   ├── types/           # TypeScript interfaces
│   │   ├── App.tsx          # Main route configurations
│   │   └── main.tsx         # React app entry point
│   ├── tailwind.config.js
│   ├── vite.config.ts
│   └── package.json
│
└── README.md
```

---

## Getting Started

### Prerequisites
* Node.js (version 18 or higher)
* MySQL Server (version 8 or higher)
* Git

---

### 1. Clone the Repository
```bash
git clone https://github.com/Kushalgarg211/PeoplePay360.git
cd PeoplePay360
```

---

### 2. Backend Setup

1. Move to the backend folder:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   * Create a `.env` file in the `backend/` directory.
   * Add your database connection string and secrets:
     ```env
     DATABASE_URL="mysql://root:your_mysql_password@localhost:3306/peoplepay360"
     JWT_SECRET="your_secret_key"
     PORT=5000
     CORS_ORIGIN="http://localhost:5173"
     ```

4. Set up the database:
   * Run the SQL file in your MySQL client to create tables and default records:
     ```bash
     mysql -u root -p < database_setup.sql
     ```
   * Generate the Prisma client:
     ```bash
     npx prisma generate
     ```

5. Start the backend development server:
   ```bash
   npm run dev
   ```
   The backend API will run on `http://localhost:5000`.

---

### 3. Frontend Setup

1. Open a new terminal window and navigate to the frontend folder:
   ```bash
   cd PeoplePay360/frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the frontend development server:
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173` in your browser.

---

## Demo Accounts

For testing, you can log in with these pre-configured accounts:

| Role | Email | Password |
| :--- | :--- | :--- |
| Admin | admin@oxp.com | Password@123 |
| HR Manager | hr@oxp.com | Password@123 |
| Payroll Officer | payroll_user@oxp.com | Password@123 |
| Employee | john@oxp.com | Password@123 |

---

## License

This project is open-source and available under the MIT License.
