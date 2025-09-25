-- Execute this SQL in Supabase SQL Editor
-- This will create the departments table and related structures

-- Create departments table
CREATE TABLE IF NOT EXISTS departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    details TEXT,
    head_id UUID REFERENCES employees(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create department_employees junction table for many-to-many relationship
CREATE TABLE IF NOT EXISTS department_employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    position VARCHAR(100), -- Head, Manager, Staff, etc.
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(department_id, employee_id)
);

-- Add department_id column to employees table for primary department
ALTER TABLE employees ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES departments(id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_departments_name ON departments(name);
CREATE INDEX IF NOT EXISTS idx_departments_head_id ON departments(head_id);
CREATE INDEX IF NOT EXISTS idx_department_employees_dept_id ON department_employees(department_id);
CREATE INDEX IF NOT EXISTS idx_department_employees_emp_id ON department_employees(employee_id);
CREATE INDEX IF NOT EXISTS idx_employees_department_id ON employees(department_id);

-- Create function to update updated_at timestamp (if not exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at for departments
DROP TRIGGER IF EXISTS update_departments_updated_at ON departments;
CREATE TRIGGER update_departments_updated_at BEFORE UPDATE ON departments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS) for departments
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE department_employees ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "All authenticated users can view departments" ON departments;
DROP POLICY IF EXISTS "Only admins can manage departments" ON departments;
DROP POLICY IF EXISTS "All authenticated users can view department employees" ON department_employees;
DROP POLICY IF EXISTS "Only admins can manage department employees" ON department_employees;

-- RLS Policies for departments table
CREATE POLICY "All authenticated users can view departments" ON departments
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Only admins can manage departments" ON departments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM employees e 
            WHERE e.id::text = auth.uid()::text 
            AND e.role = 'Admin'
        )
    );

-- RLS Policies for department_employees table
CREATE POLICY "All authenticated users can view department employees" ON department_employees
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Only admins can manage department employees" ON department_employees
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM employees e 
            WHERE e.id::text = auth.uid()::text 
            AND e.role = 'Admin'
        )
    );

-- Insert some sample departments
INSERT INTO departments (name, details) VALUES
('Human Resources', 'Manages employee relations, recruitment, and HR policies'),
('Information Technology', 'Handles all technology infrastructure and software development'),
('Finance', 'Manages company finances, accounting, and budgeting'),
('Marketing', 'Responsible for marketing campaigns and brand management'),
('Operations', 'Oversees daily operations and process optimization')
ON CONFLICT (name) DO NOTHING;

-- Show success message
SELECT 'Departments table and related structures created successfully!' as message;