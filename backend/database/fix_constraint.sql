-- Simple fix for role constraint violation
-- Run this in Supabase SQL Editor

-- Step 1: Drop the existing role constraint completely
ALTER TABLE employees DROP CONSTRAINT IF EXISTS employees_role_check;

-- Step 2: Update any 'HR' roles to 'Admin'
UPDATE employees SET role = 'Admin' WHERE role = 'HR';

-- Step 3: Check for any invalid roles and fix them
UPDATE employees SET role = 'Employee' WHERE role NOT IN ('Employee', 'Manager', 'Admin');

-- Step 4: Add the constraint back
ALTER TABLE employees ADD CONSTRAINT employees_role_check CHECK (role IN ('Employee', 'Manager', 'Admin'));

-- Verification
SELECT 'Constraint fix completed!' as message
UNION ALL
SELECT CONCAT('Total employees: ', COUNT(*)) as message FROM employees
UNION ALL
SELECT CONCAT('Roles: ', STRING_AGG(DISTINCT role, ', ')) as message FROM employees;