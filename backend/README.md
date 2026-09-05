# PeoplePay360 Backend

> Enterprise-grade HR & Payroll REST API — Node.js + TypeScript + Express + Prisma + MySQL 8

---

## Quick Start

### Prerequisites
- Node.js 18+
- MySQL 8.0+
- MySQL Workbench

---

## Step 1 — Database Setup (MySQL Workbench)

1. Open **MySQL Workbench** and connect to your server.
2. Go to **File → Open SQL Script** and select `database_setup.sql`.
3. Click ⚡ **Execute All** to create the schema and seed data.
4. After the script completes, run the password hash generator:
   ```bash
   cd backend
   npm install   # (run this first if you haven't)
   node scripts/generate-hash.js
   ```
5. Copy the printed `UPDATE` statements, paste them into MySQL Workbench, and run them.
   This sets `Password@123` as the password for all seed users.

---

## Step 2 — Environment Configuration

```bash
cp .env.example .env
```

Edit `.env`:
```env
DATABASE_URL="mysql://root:yourpassword@localhost:3306/peoplepay360"
JWT_SECRET="your_very_long_random_secret_here"
JWT_EXPIRES_IN="8h"
PORT=5000
```

---

## Step 3 — Install & Run

```bash
npm install
npx prisma generate
npm run dev
```

The API will be available at **http://localhost:5000**

Health check: `GET http://localhost:5000/health`

---

## Seed Credentials

| Email | Password | Role |
|---|---|---|
| admin@oxp.com | Password@123 | ADMIN |
| hr@oxp.com | Password@123 | HR_MANAGER |
| payroll_user@oxp.com | Password@123 | HR_PAYROLL_USER |
| payroll_admin@oxp.com | Password@123 | HR_PAYROLL_MANAGER |
| john@oxp.com | Password@123 | EMPLOYEE |

---

## API Reference (`/api/v1`)

### Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/login` | Login → returns JWT token |
| GET | `/auth/me` | Authenticated user profile |

### Users (Admin only)
| Method | Endpoint | Description |
|---|---|---|
| GET | `/users` | List all users |
| POST | `/users` | Create user account |
| PUT | `/users/:id` | Update role / status |

### Employees
| Method | Endpoint | Description |
|---|---|---|
| GET | `/employees` | List (query: search, departmentId) |
| GET | `/employees/:id` | Profile + smart button metrics |
| POST | `/employees` | Create employee |
| PUT | `/employees/:id` | Update employee |

### Contracts
| Method | Endpoint | Description |
|---|---|---|
| GET | `/contracts` | List contracts |
| POST | `/contracts` | Create (Running Contract Validator) |
| PUT | `/contracts/:id` | Update |

### Working Schedules
| Method | Endpoint | Description |
|---|---|---|
| GET | `/schedules` | List all schedules |
| POST | `/schedules` | Create schedule with days |

### Attendance
| Method | Endpoint | Description |
|---|---|---|
| POST | `/attendance/check-in` | Clock in (auto Late detection) |
| POST | `/attendance/check-out` | Clock out (auto hours calc) |
| GET | `/attendance/today-status` | Active attendance state |
| GET | `/attendance` | List (date, employee, dept filters) |
| PUT | `/attendance/:id` | Manual correction (requires notes) |

### Time Off
| Method | Endpoint | Description |
|---|---|---|
| GET/POST | `/time-off/types` | Leave type management |
| GET/POST | `/time-off/allocations` | Allocation management + balance |
| POST | `/time-off/allocations/:id/approve` | Approve allocation |
| POST | `/time-off/allocations/:id/refuse` | Refuse allocation |
| GET/POST | `/time-off/requests` | Submit / list leave requests |
| POST | `/time-off/requests/:id/approve` | Approve leave request |
| POST | `/time-off/requests/:id/refuse` | Refuse leave request |

### Payroll
| Method | Endpoint | Description |
|---|---|---|
| GET/POST | `/payroll/structures` | Salary structure + rules |
| GET | `/payroll/eligible-employees` | Wizard Step 2 (active contracts) |
| POST | `/payroll/payruns` | Initialize payrun batch |
| POST | `/payroll/payruns/:id/compute` | Run salary calculation engine |
| POST | `/payroll/payruns/:id/validate` | Mark as Validated |
| POST | `/payroll/payruns/:id/mark-paid` | Mark as Paid |
| POST | `/payroll/payruns/:id/send-payslips` | Simulate bulk email dispatch |
| GET | `/payroll/payslips/:id` | Full payslip with line items |
| GET | `/payroll/payslips/:id/pdf` | Download PDF payslip |

### Dashboard
| Method | Endpoint | Description |
|---|---|---|
| GET | `/dashboard/metrics?period=2026-09` | All executive metrics |

---

## Business Logic Engines

| Engine | Description |
|---|---|
| **Engine 1** — Contract Validator | Prevents overlapping Running contracts |
| **Engine 2** — Attendance Engine | Auto Late detection + worked/overtime hours |
| **Engine 3** — Leave Ledger | Dynamic balance = Allocated − Taken |
| **Engine 4** — Salary Calculator | Sequential rule processing (FIXED/PERCENTAGE/FORMULA) |
| **Engine 5** — PDF Generator | Branded payslip PDFs via PDFKit |

---

## RBAC Matrix

| Role | Access |
|---|---|
| EMPLOYEE | Own profile, attendance, leave requests only |
| HR_MANAGER | Full CRUD on employees, attendance, contracts, schedules, time off. **Blocked from payroll** |
| HR_PAYROLL_USER | All HR + Create/Read payroll payruns & payslips |
| HR_PAYROLL_MANAGER | Full payroll CRUD + salary structure management |
| ADMIN | Unrestricted + exclusive user management |

---

## Project Structure

```
backend/
├── database_setup.sql          ← Run in MySQL Workbench
├── scripts/
│   └── generate-hash.js        ← Password hash generator
├── prisma/
│   └── schema.prisma           ← Prisma ORM schema
├── src/
│   ├── config/                 ← env.ts, database.ts (Prisma client)
│   ├── types/                  ← Shared TypeScript interfaces
│   ├── middlewares/            ← authMiddleware, rbacGuard, errorHandler
│   ├── services/               ← attendanceService, contractService, payrollEngine, pdfService, timeOffService
│   ├── controllers/            ← auth, user, employee, contract, attendance, timeOff, payroll, schedule, dashboard
│   ├── routes/                 ← All Express routers
│   └── server.ts               ← Express app (port 5000)
├── package.json
├── tsconfig.json
└── .env.example
```
