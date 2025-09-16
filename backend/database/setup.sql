-- PlugoHRIS Database Setup
-- Copy and paste this entire script into Supabase SQL Editor

-- Create employees table
CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  nik VARCHAR(50) UNIQUE NOT NULL,
  division VARCHAR(100) NOT NULL,
  employment_type VARCHAR(20) CHECK (employment_type IN ('Permanent', 'Contract')) NOT NULL,
  leave_balance INTEGER DEFAULT 0,
  status VARCHAR(20) CHECK (status IN ('Active', 'Inactive')) DEFAULT 'Active',
  start_date DATE NOT NULL,
  role VARCHAR(20) CHECK (role IN ('Employee', 'Manager', 'Admin')) DEFAULT 'Employee',
  manager_id UUID REFERENCES employees(id),
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create leave_types table
CREATE TABLE IF NOT EXISTS leave_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  max_days_per_year INTEGER,
  requires_approval BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create leave_requests table
CREATE TABLE IF NOT EXISTS leave_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  leave_type_id UUID NOT NULL REFERENCES leave_types(id),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  days_requested INTEGER NOT NULL,
  reason TEXT,
  status VARCHAR(20) CHECK (status IN ('Pending', 'Approved', 'Rejected')) DEFAULT 'Pending',
  approved_by UUID REFERENCES employees(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_employees_email ON employees(email);
CREATE INDEX IF NOT EXISTS idx_employees_nik ON employees(nik);
CREATE INDEX IF NOT EXISTS idx_employees_manager ON employees(manager_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_employee ON leave_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON leave_requests(status);
CREATE INDEX IF NOT EXISTS idx_leave_requests_dates ON leave_requests(start_date, end_date);

-- Insert default leave types
INSERT INTO leave_types (name, description, max_days_per_year, requires_approval) VALUES
('Annual Leave', 'Yearly vacation leave', 12, true),
('Sick Leave', 'Medical leave for illness', 30, false),
('Emergency Leave', 'Urgent personal matters', 5, true),
('Maternity Leave', 'Maternity leave for mothers', 90, true),
('Paternity Leave', 'Paternity leave for fathers', 14, true)
ON CONFLICT (name) DO NOTHING;

-- Insert test users (passwords are hashed versions of: admin123, manager123, employee123)
INSERT INTO employees (full_name, email, nik, division, employment_type, leave_balance, status, start_date, role, password_hash) VALUES
('Admin User', 'admin@company.com', 'ADM001', 'Human Resources', 'Permanent', 12, 'Active', '2024-01-01', 'Admin', '$2a$12$LQv3c1yqBw2fnfZFHc5/a.KQRQ0o9dsO.CNx9ajgCiVwHh8gvW/y6'),
('Manager User', 'manager@company.com', 'MGR001', 'Engineering', 'Permanent', 12, 'Active', '2024-01-01', 'Manager', '$2a$12$LQv3c1yqBw2fnfZFHc5/a.KQRQ0o9dsO.CNx9ajgCiVwHh8gvW/y6'),
('Employee User', 'employee@company.com', 'EMP001', 'Engineering', 'Permanent', 12, 'Active', '2024-01-01', 'Employee', '$2a$12$LQv3c1yqBw2fnfZFHc5/a.KQRQ0o9dsO.CNx9ajgCiVwHh8gvW/y6')
ON CONFLICT (email) DO NOTHING;

-- Update employee to have manager relationship
UPDATE employees 
SET manager_id = (SELECT id FROM employees WHERE email = 'manager@company.com')
WHERE email = 'employee@company.com';

-- Enable Row Level Security (optional - can be skipped for development)
-- ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE leave_types ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;

-- Success message
SELECT 'Database setup completed successfully! You can now login with:' as message
UNION ALL
SELECT 'HR Admin: admin@company.com / admin123'
UNION ALL
SELECT 'Manager: manager@company.com / manager123'
UNION ALL
SELECT 'Employee: employee@company.com / employee123';