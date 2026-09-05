-- SECTION 1 : Database

CREATE DATABASE IF NOT EXISTS peoplepay360
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE peoplepay360;

-- SECTION 2 : Drop Existing Tables (safe re-run)
-- SECTION 3 : Table Definitions

-- 3.1 departments
CREATE TABLE departments (
  id   VARCHAR(36)  NOT NULL,
  name VARCHAR(100) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_dept_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3.2 employees
CREATE TABLE employees (
  id                  VARCHAR(36)  NOT NULL,
  first_name          VARCHAR(100) NOT NULL,
  last_name           VARCHAR(100) NOT NULL,
  work_email          VARCHAR(191) NOT NULL,
  phone               VARCHAR(50)  NULL,
  department_id       VARCHAR(36)  NULL,
  manager_id          VARCHAR(36)  NULL,
  job_position        VARCHAR(100) NOT NULL,
  work_location       VARCHAR(100) NOT NULL DEFAULT 'Mumbai',
  company_name        VARCHAR(100) NOT NULL DEFAULT 'OxP Pvt Ltd',
  status              ENUM('Active','Inactive') NOT NULL DEFAULT 'Active',
  bank_account_number VARCHAR(50)  NULL,
  bank_name           VARCHAR(100) NULL,
  bank_ifsc           VARCHAR(50)  NULL,
  created_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_employee_email (work_email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3.3 users
CREATE TABLE users (
  id            VARCHAR(36)  NOT NULL,
  email         VARCHAR(191) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role          ENUM('ADMIN','HR_MANAGER','HR_PAYROLL_USER','HR_PAYROLL_MANAGER','EMPLOYEE') NOT NULL DEFAULT 'EMPLOYEE',
  status        ENUM('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  employee_id   VARCHAR(36)  NULL,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_user_email    (email),
  UNIQUE KEY uq_user_employee (employee_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3.4 working_schedules
CREATE TABLE working_schedules (
  id             VARCHAR(36)   NOT NULL,
  name           VARCHAR(100)  NOT NULL,
  company        VARCHAR(100)  NOT NULL DEFAULT 'OxP Pvt Ltd',
  days_per_week  INT           NOT NULL DEFAULT 5,
  hours_per_week DECIMAL(5,2)  NOT NULL DEFAULT 40.00,
  timezone       VARCHAR(50)   NOT NULL DEFAULT 'Asia/Kolkata',
  status         ENUM('Active','Inactive') NOT NULL DEFAULT 'Active',
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3.5 working_schedule_days
CREATE TABLE working_schedule_days (
  id                  VARCHAR(36)  NOT NULL,
  working_schedule_id VARCHAR(36)  NOT NULL,
  day_of_week         ENUM('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday') NOT NULL,
  start_time          VARCHAR(10)  NOT NULL,
  end_time            VARCHAR(10)  NOT NULL,
  break_hours         DECIMAL(4,2) NOT NULL DEFAULT 1.00,
  total_hours         DECIMAL(4,2) NOT NULL DEFAULT 8.00,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3.6 salary_structures
CREATE TABLE salary_structures (
  id        VARCHAR(36)  NOT NULL,
  name      VARCHAR(100) NOT NULL,
  is_active BOOLEAN      NOT NULL DEFAULT TRUE,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3.7 salary_rules
CREATE TABLE salary_rules (
  id                  VARCHAR(36)   NOT NULL,
  salary_structure_id VARCHAR(36)   NOT NULL,
  name                VARCHAR(100)  NOT NULL,
  code                VARCHAR(50)   NOT NULL,
  category            ENUM('BASIC','ALLOWANCE','GROSS','DEDUCTION','NET') NOT NULL,
  sequence            INT           NOT NULL,
  computation_type    ENUM('FIXED','PERCENTAGE','FORMULA')               NOT NULL,
  fixed_amount        DECIMAL(12,2) NULL,
  percentage_value    DECIMAL(5,2)  NULL,
  percentage_base     VARCHAR(50)   NULL,
  formula             TEXT          NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3.8 contracts
CREATE TABLE contracts (
  id                  VARCHAR(36)   NOT NULL,
  contract_ref        VARCHAR(50)   NOT NULL,
  employee_id         VARCHAR(36)   NOT NULL,
  department_id       VARCHAR(36)   NOT NULL,
  job_position        VARCHAR(100)  NOT NULL,
  start_date          DATE          NOT NULL,
  end_date            DATE          NULL,
  wage_per_month      DECIMAL(12,2) NOT NULL,
  status              ENUM('Running','Expired','Draft') NOT NULL DEFAULT 'Draft',
  working_schedule_id VARCHAR(36)   NOT NULL,
  salary_structure_id VARCHAR(36)   NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_contract_ref (contract_ref)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3.9 attendances
CREATE TABLE attendances (
  id                   VARCHAR(36)  NOT NULL,
  employee_id          VARCHAR(36)  NOT NULL,
  date                 DATE         NOT NULL,
  check_in             DATETIME     NOT NULL,
  check_out            DATETIME     NULL,
  worked_hours         DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  overtime_hours       DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  status               ENUM('Present','Late','Absent') NOT NULL DEFAULT 'Present',
  is_manual_correction BOOLEAN      NOT NULL DEFAULT FALSE,
  notes                TEXT         NULL,
  PRIMARY KEY (id),
  UNIQUE KEY unique_emp_date (employee_id, date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3.10 time_off_types
CREATE TABLE time_off_types (
  id                  VARCHAR(36)  NOT NULL,
  name                VARCHAR(100) NOT NULL,
  unit                ENUM('Days','Hours')           NOT NULL DEFAULT 'Days',
  requires_allocation BOOLEAN      NOT NULL DEFAULT TRUE,
  approval_workflow   ENUM('Manager','Officer')      NOT NULL DEFAULT 'Manager',
  display_color       VARCHAR(30)  NOT NULL DEFAULT 'Blue',
  is_active           BOOLEAN      NOT NULL DEFAULT TRUE,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3.11 time_off_allocations
CREATE TABLE time_off_allocations (
  id               VARCHAR(36)  NOT NULL,
  employee_id      VARCHAR(36)  NOT NULL,
  time_off_type_id VARCHAR(36)  NOT NULL,
  allocated_days   DECIMAL(5,2) NOT NULL,
  validity_year    INT          NOT NULL DEFAULT 2026,
  status           ENUM('Approved','To Approve','Refused') NOT NULL DEFAULT 'To Approve',
  approver_name    VARCHAR(100) NULL,
  description      TEXT         NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3.12 time_off_requests
CREATE TABLE time_off_requests (
  id               VARCHAR(36)  NOT NULL,
  employee_id      VARCHAR(36)  NOT NULL,
  time_off_type_id VARCHAR(36)  NOT NULL,
  allocation_id    VARCHAR(36)  NULL,
  start_date       DATE         NOT NULL,
  end_date         DATE         NOT NULL,
  duration_days    DECIMAL(5,2) NOT NULL,
  status           ENUM('Approved','To Approve','Refused') NOT NULL DEFAULT 'To Approve',
  approver_name    VARCHAR(100) NULL,
  reason           TEXT         NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3.13 payruns
CREATE TABLE payruns (
  id                  VARCHAR(36)  NOT NULL,
  name                VARCHAR(100) NOT NULL,
  salary_structure_id VARCHAR(36)  NOT NULL,
  period_start        DATE         NOT NULL,
  period_end          DATE         NOT NULL,
  status              ENUM('Draft','Validated','Paid') NOT NULL DEFAULT 'Draft',
  created_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3.14 payslips
CREATE TABLE payslips (
  id           VARCHAR(36)   NOT NULL,
  payrun_id    VARCHAR(36)   NOT NULL,
  employee_id  VARCHAR(36)   NOT NULL,
  contract_id  VARCHAR(36)   NOT NULL,
  worked_days  INT           NOT NULL DEFAULT 30,
  basic_salary DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  gross_salary DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  net_salary   DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  status       ENUM('Draft','Done') NOT NULL DEFAULT 'Draft',
  warnings     JSON          NULL,
  PRIMARY KEY (id),
  UNIQUE KEY unique_payrun_emp (payrun_id, employee_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3.15 payslip_lines
CREATE TABLE payslip_lines (
  id         VARCHAR(36)   NOT NULL,
  payslip_id VARCHAR(36)   NOT NULL,
  rule_name  VARCHAR(100)  NOT NULL,
  code       VARCHAR(50)   NOT NULL,
  category   ENUM('BASIC','ALLOWANCE','GROSS','DEDUCTION','NET') NOT NULL,
  amount     DECIMAL(12,2) NOT NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- SECTION 4 : Foreign Key Constraints

ALTER TABLE employees
  ADD CONSTRAINT fk_emp_department FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL  ON UPDATE CASCADE,
  ADD CONSTRAINT fk_emp_manager    FOREIGN KEY (manager_id)    REFERENCES employees(id)   ON DELETE SET NULL  ON UPDATE CASCADE;

ALTER TABLE users
  ADD CONSTRAINT fk_user_employee FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE working_schedule_days
  ADD CONSTRAINT fk_wsd_schedule FOREIGN KEY (working_schedule_id) REFERENCES working_schedules(id) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE salary_rules
  ADD CONSTRAINT fk_rule_structure FOREIGN KEY (salary_structure_id) REFERENCES salary_structures(id) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE contracts
  ADD CONSTRAINT fk_contract_employee  FOREIGN KEY (employee_id)         REFERENCES employees(id)         ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT fk_contract_dept      FOREIGN KEY (department_id)       REFERENCES departments(id)       ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT fk_contract_schedule  FOREIGN KEY (working_schedule_id) REFERENCES working_schedules(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT fk_contract_structure FOREIGN KEY (salary_structure_id) REFERENCES salary_structures(id) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE attendances
  ADD CONSTRAINT fk_att_employee FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE time_off_allocations
  ADD CONSTRAINT fk_toa_employee FOREIGN KEY (employee_id)      REFERENCES employees(id)      ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT fk_toa_type     FOREIGN KEY (time_off_type_id) REFERENCES time_off_types(id) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE time_off_requests
  ADD CONSTRAINT fk_tor_employee   FOREIGN KEY (employee_id)      REFERENCES employees(id)            ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT fk_tor_type       FOREIGN KEY (time_off_type_id) REFERENCES time_off_types(id)       ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT fk_tor_allocation FOREIGN KEY (allocation_id)    REFERENCES time_off_allocations(id) ON DELETE SET NULL  ON UPDATE CASCADE;

ALTER TABLE payruns
  ADD CONSTRAINT fk_payrun_structure FOREIGN KEY (salary_structure_id) REFERENCES salary_structures(id) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE payslips
  ADD CONSTRAINT fk_payslip_payrun   FOREIGN KEY (payrun_id)   REFERENCES payruns(id)   ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT fk_payslip_employee FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT fk_payslip_contract FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE payslip_lines
  ADD CONSTRAINT fk_line_payslip FOREIGN KEY (payslip_id) REFERENCES payslips(id) ON DELETE CASCADE ON UPDATE CASCADE;

-- SECTION 5 : Performance Indexes

CREATE INDEX idx_emp_dept        ON employees          (department_id);
CREATE INDEX idx_emp_manager     ON employees          (manager_id);
CREATE INDEX idx_emp_status      ON employees          (status);
CREATE INDEX idx_att_employee    ON attendances        (employee_id);
CREATE INDEX idx_att_date        ON attendances        (date);
CREATE INDEX idx_contract_emp    ON contracts          (employee_id);
CREATE INDEX idx_contract_status ON contracts          (status);
CREATE INDEX idx_tor_employee    ON time_off_requests  (employee_id);
CREATE INDEX idx_tor_status      ON time_off_requests  (status);
CREATE INDEX idx_payslip_payrun  ON payslips           (payrun_id);
CREATE INDEX idx_payslip_emp     ON payslips           (employee_id);
CREATE INDEX idx_rules_seq       ON salary_rules       (salary_structure_id, sequence);

-- SECTION 6 : Seed Data

-- 6.1 Departments
INSERT INTO departments (id, name) VALUES
  ('d100000000000000000000000000000001', 'Finance'),
  ('d100000000000000000000000000000002', 'HR'),
  ('d100000000000000000000000000000003', 'Engineering'),
  ('d100000000000000000000000000000004', 'Sales');

-- 6.2 Working Schedule
INSERT INTO working_schedules (id, name, company, days_per_week, hours_per_week, timezone, status) VALUES
  ('ws00000000000000000000000000000001', '40 Hours / Week', 'OxP Pvt Ltd', 5, 40.00, 'Asia/Kolkata', 'Active');

INSERT INTO working_schedule_days (id, working_schedule_id, day_of_week, start_time, end_time, break_hours, total_hours) VALUES
  ('wsd0000000000000000000000000000001', 'ws00000000000000000000000000000001', 'Monday',    '09:00 AM', '06:00 PM', 1.00, 8.00),
  ('wsd0000000000000000000000000000002', 'ws00000000000000000000000000000001', 'Tuesday',   '09:00 AM', '06:00 PM', 1.00, 8.00),
  ('wsd0000000000000000000000000000003', 'ws00000000000000000000000000000001', 'Wednesday', '09:00 AM', '06:00 PM', 1.00, 8.00),
  ('wsd0000000000000000000000000000004', 'ws00000000000000000000000000000001', 'Thursday',  '09:00 AM', '06:00 PM', 1.00, 8.00),
  ('wsd0000000000000000000000000000005', 'ws00000000000000000000000000000001', 'Friday',    '09:00 AM', '06:00 PM', 1.00, 8.00);

-- 6.3 Salary Structures + Rules
INSERT INTO salary_structures (id, name, is_active) VALUES
  ('ss00000000000000000000000000000001', 'Regular Salary', TRUE);

INSERT INTO salary_rules (id, salary_structure_id, name, code, category, sequence, computation_type, percentage_value, percentage_base, fixed_amount, formula) VALUES
  ('sr00000000000000000000000000000001', 'ss00000000000000000000000000000001', 'Basic Salary',         'BASIC', 'BASIC',     1,  'PERCENTAGE', 50.00, 'WAGE',  NULL,    NULL),
  ('sr00000000000000000000000000000002', 'ss00000000000000000000000000000001', 'House Rent Allowance', 'HRA',   'ALLOWANCE', 10, 'PERCENTAGE', 20.00, 'BASIC', NULL,    NULL),
  ('sr00000000000000000000000000000003', 'ss00000000000000000000000000000001', 'Standard Allowance',   'STD',   'ALLOWANCE', 20, 'FIXED',      NULL,  NULL,    5000.00, NULL),
  ('sr00000000000000000000000000000004', 'ss00000000000000000000000000000001', 'Gross Salary',         'GROSS', 'GROSS',     30, 'FORMULA',    NULL,  NULL,    NULL,    'BASIC + HRA + STD'),
  ('sr00000000000000000000000000000005', 'ss00000000000000000000000000000001', 'Provident Fund',       'PF',    'DEDUCTION', 40, 'PERCENTAGE', 12.00, 'BASIC', NULL,    NULL),
  ('sr00000000000000000000000000000006', 'ss00000000000000000000000000000001', 'Net Salary',           'NET',   'NET',       50, 'FORMULA',    NULL,  NULL,    NULL,    'GROSS - PF');

-- 6.4 Employees
INSERT INTO employees (id, first_name, last_name, work_email, phone, department_id, manager_id, job_position, work_location, company_name, status) VALUES
  ('e100000000000000000000000000000001', 'Aarav', 'Mehta',  'aarav.mehta@oxp.com', '+91-9876543210', 'd100000000000000000000000000000001', NULL,                                   'Payroll Specialist', 'Mumbai', 'OxP Pvt Ltd', 'Active'),
  ('e100000000000000000000000000000002', 'Sara',  'Khan',   'sara.khan@oxp.com',   '+91-9876543211', 'd100000000000000000000000000000002', NULL,                                   'HR Officer',         'Mumbai', 'OxP Pvt Ltd', 'Active'),
  ('e100000000000000000000000000000003', 'John',  'Dsouza', 'john.dsouza@oxp.com', '+91-9876543212', 'd100000000000000000000000000000003', NULL,                                   'Developer',          'Mumbai', 'OxP Pvt Ltd', 'Active'),
  ('e100000000000000000000000000000004', 'Neha',  'Patel',  'neha.patel@oxp.com',  '+91-9876543213', 'd100000000000000000000000000000002', 'e100000000000000000000000000000002', 'Recruiter',          'Mumbai', 'OxP Pvt Ltd', 'Active');

-- 6.5 Users
-- ⚠️  PASSWORD NOTE: All accounts use password = "Password@123"
--     The hashes below are PLACEHOLDERS.
--     Run:  node scripts/generate-hash.js
--     Then paste the printed UPDATE statements below and execute them.
INSERT INTO users (id, email, password_hash, role, status, employee_id) VALUES
  ('u100000000000000000000000000000001', 'admin@oxp.com',        'REPLACE_HASH', 'ADMIN',              'ACTIVE', NULL),
  ('u100000000000000000000000000000002', 'hr@oxp.com',           'REPLACE_HASH', 'HR_MANAGER',         'ACTIVE', 'e100000000000000000000000000000002'),
  ('u100000000000000000000000000000003', 'payroll_user@oxp.com', 'REPLACE_HASH', 'HR_PAYROLL_USER',    'ACTIVE', 'e100000000000000000000000000000001'),
  ('u100000000000000000000000000000004', 'payroll_admin@oxp.com','REPLACE_HASH', 'HR_PAYROLL_MANAGER', 'ACTIVE', NULL),
  ('u100000000000000000000000000000005', 'john@oxp.com',         'REPLACE_HASH', 'EMPLOYEE',           'ACTIVE', 'e100000000000000000000000000000003');

-- 6.6 Contracts (all Running)
INSERT INTO contracts (id, contract_ref, employee_id, department_id, job_position, start_date, end_date, wage_per_month, status, working_schedule_id, salary_structure_id) VALUES
  ('c100000000000000000000000000000001', 'CON/2026/0001', 'e100000000000000000000000000000001', 'd100000000000000000000000000000001', 'Payroll Specialist', '2026-01-01', NULL, 75000.00, 'Running', 'ws00000000000000000000000000000001', 'ss00000000000000000000000000000001'),
  ('c100000000000000000000000000000002', 'CON/2026/0002', 'e100000000000000000000000000000002', 'd100000000000000000000000000000002', 'HR Officer',         '2026-01-01', NULL, 65000.00, 'Running', 'ws00000000000000000000000000000001', 'ss00000000000000000000000000000001'),
  ('c100000000000000000000000000000003', 'CON/2026/0003', 'e100000000000000000000000000000003', 'd100000000000000000000000000000003', 'Developer',          '2026-01-01', NULL, 90000.00, 'Running', 'ws00000000000000000000000000000001', 'ss00000000000000000000000000000001'),
  ('c100000000000000000000000000000004', 'CON/2026/0004', 'e100000000000000000000000000000004', 'd100000000000000000000000000000002', 'Recruiter',          '2026-01-01', NULL, 55000.00, 'Running', 'ws00000000000000000000000000000001', 'ss00000000000000000000000000000001');

-- 6.7 Attendance (today)
INSERT INTO attendances (id, employee_id, date, check_in, check_out, worked_hours, overtime_hours, status, is_manual_correction, notes) VALUES
  ('a100000000000000000000000000000001', 'e100000000000000000000000000000001', CURDATE(), CONCAT(DATE_FORMAT(CURDATE(),'%Y-%m-%d'), ' 09:00:00'), NULL, 0.00, 0.00, 'Present', FALSE, NULL),
  ('a100000000000000000000000000000002', 'e100000000000000000000000000000002', CURDATE(), CONCAT(DATE_FORMAT(CURDATE(),'%Y-%m-%d'), ' 09:20:00'), NULL, 0.00, 0.00, 'Late',    FALSE, NULL),
  ('a100000000000000000000000000000003', 'e100000000000000000000000000000003', CURDATE(), CONCAT(DATE_FORMAT(CURDATE(),'%Y-%m-%d'), ' 09:05:00'), NULL, 0.00, 0.00, 'Present', FALSE, NULL),
  ('a100000000000000000000000000000004', 'e100000000000000000000000000000004', CURDATE(), CONCAT(DATE_FORMAT(CURDATE(),'%Y-%m-%d'), ' 10:15:00'), NULL, 0.00, 0.00, 'Late',    FALSE, NULL);

-- 6.8 Time Off Types
INSERT INTO time_off_types (id, name, unit, requires_allocation, approval_workflow, display_color, is_active) VALUES
  ('tot0000000000000000000000000000001', 'Paid Time Off', 'Days', TRUE,  'Manager', 'Green',  TRUE),
  ('tot0000000000000000000000000000002', 'Sick Leave',    'Days', FALSE, 'Manager', 'Orange', TRUE),
  ('tot0000000000000000000000000000003', 'Comp Off',      'Days', TRUE,  'Officer', 'Blue',   TRUE);

-- 6.9 Time Off Allocations (Approved)
INSERT INTO time_off_allocations (id, employee_id, time_off_type_id, allocated_days, validity_year, status, approver_name, description) VALUES
  ('toa0000000000000000000000000000001', 'e100000000000000000000000000000001', 'tot0000000000000000000000000000001', 20.00, 2026, 'Approved', 'Admin', 'Annual PTO 2026 - Aarav Mehta'),
  ('toa0000000000000000000000000000002', 'e100000000000000000000000000000002', 'tot0000000000000000000000000000001', 18.00, 2026, 'Approved', 'Admin', 'Annual PTO 2026 - Sara Khan');

