-- Migration: Update leave_balance column to support decimal values
-- This fixes the issue where leave balance calculations are rounded down to integers
-- instead of preserving decimal values like 21.25 days

-- Step 1: Add a new temporary column with DECIMAL type
ALTER TABLE employees ADD COLUMN leave_balance_decimal DECIMAL(5,2);

-- Step 2: Copy existing integer values to the new decimal column
UPDATE employees SET leave_balance_decimal = leave_balance::DECIMAL(5,2);

-- Step 3: Drop the old integer column
ALTER TABLE employees DROP COLUMN leave_balance;

-- Step 4: Rename the new column to the original name
ALTER TABLE employees RENAME COLUMN leave_balance_decimal TO leave_balance;

-- Step 5: Set NOT NULL constraint and default value
ALTER TABLE employees ALTER COLUMN leave_balance SET NOT NULL;
ALTER TABLE employees ALTER COLUMN leave_balance SET DEFAULT 0.00;

-- Verify the change
SELECT column_name, data_type, numeric_precision, numeric_scale 
FROM information_schema.columns 
WHERE table_name = 'employees' AND column_name = 'leave_balance';

-- Success message
SELECT 'Leave balance column successfully updated to DECIMAL(5,2)' as message;