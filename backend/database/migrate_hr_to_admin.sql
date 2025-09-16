-- Migration script to fix HR to Admin role conversion and schema issues
-- Run this in Supabase SQL Editor

-- Step 1: Add missing columns if they don't exist
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS phone VARCHAR(20),
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS position VARCHAR(100),
ADD COLUMN IF NOT EXISTS salary DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS password_changed BOOLEAN DEFAULT FALSE;

-- Step 2: Set default values for any NULL fields in new columns
UPDATE employees SET 
    phone = COALESCE(phone, ''),
    address = COALESCE(address, ''),
    position = COALESCE(position, division),
    salary = COALESCE(salary, 0.00),
    password_changed = COALESCE(password_changed, FALSE)
WHERE phone IS NULL OR address IS NULL OR position IS NULL OR salary IS NULL OR password_changed IS NULL;

-- Step 3: Drop the existing role constraint
ALTER TABLE employees DROP CONSTRAINT IF EXISTS employees_role_check;

-- Step 4: Update all 'HR' roles to 'Admin'
UPDATE employees SET role = 'Admin' WHERE role = 'HR';

-- Step 5: Add the new role constraint
ALTER TABLE employees ADD CONSTRAINT employees_role_check CHECK (role IN ('Employee', 'Manager', 'Admin'));

-- Step 6: Create indexes for new columns if they don't exist
CREATE INDEX IF NOT EXISTS idx_employees_phone ON employees(phone);
CREATE INDEX IF NOT EXISTS idx_employees_position ON employees(position);

-- Verification: Check all roles are valid
SELECT 'Migration completed successfully!' as message
UNION ALL
SELECT 'Current roles in database:' as message
UNION ALL
SELECT CONCAT('Roles: ', STRING_AGG(DISTINCT role, ', ')) as message FROM employees;