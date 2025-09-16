-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create employees table
CREATE TABLE employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
CREATE TABLE leave_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    max_days_per_year INTEGER,
    requires_approval BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create leave_requests table
CREATE TABLE leave_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

-- Insert default leave types
INSERT INTO leave_types (name, description, max_days_per_year, requires_approval) VALUES
('Annual Leave', 'Yearly vacation leave', 12, true),
('Sick Leave', 'Medical leave for illness', 30, false),
('Emergency Leave', 'Urgent personal matters', 5, true),
('Maternity Leave', 'Maternity leave for mothers', 90, true),
('Paternity Leave', 'Paternity leave for fathers', 14, true);

-- Create indexes for better performance
CREATE INDEX idx_employees_email ON employees(email);
CREATE INDEX idx_employees_nik ON employees(nik);
CREATE INDEX idx_employees_manager_id ON employees(manager_id);
CREATE INDEX idx_leave_requests_employee_id ON leave_requests(employee_id);
CREATE INDEX idx_leave_requests_status ON leave_requests(status);
CREATE INDEX idx_leave_requests_dates ON leave_requests(start_date, end_date);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON employees
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leave_requests_updated_at BEFORE UPDATE ON leave_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_types ENABLE ROW LEVEL SECURITY;

-- RLS Policies for employees table
CREATE POLICY "Employees can view their own data" ON employees
    FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY "Managers can view their subordinates" ON employees
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM employees e 
            WHERE e.id::text = auth.uid()::text 
            AND e.role IN ('Manager', 'Admin')
        )
    );

CREATE POLICY "HR can manage all employees" ON employees
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM employees e 
            WHERE e.id::text = auth.uid()::text 
            AND e.role = 'Admin'
        )
    );

-- RLS Policies for leave_requests table
CREATE POLICY "Employees can view their own requests" ON leave_requests
    FOR SELECT USING (employee_id::text = auth.uid()::text);

CREATE POLICY "Employees can create their own requests" ON leave_requests
    FOR INSERT WITH CHECK (employee_id::text = auth.uid()::text);

CREATE POLICY "Managers can view subordinate requests" ON leave_requests
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM employees e 
            WHERE e.manager_id::text = auth.uid()::text 
            AND e.id = leave_requests.employee_id
        )
        OR
        EXISTS (
            SELECT 1 FROM employees e 
            WHERE e.id::text = auth.uid()::text 
            AND e.role IN ('Manager', 'Admin')
        )
    );

CREATE POLICY "Managers can update subordinate requests" ON leave_requests
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM employees e 
            WHERE e.manager_id::text = auth.uid()::text 
            AND e.id = leave_requests.employee_id
        )
        OR
        EXISTS (
            SELECT 1 FROM employees e 
            WHERE e.id::text = auth.uid()::text 
            AND e.role IN ('Manager', 'Admin')
        )
    );

-- RLS Policies for leave_types table (read-only for all authenticated users)
CREATE POLICY "All authenticated users can view leave types" ON leave_types
    FOR SELECT USING (auth.role() = 'authenticated');