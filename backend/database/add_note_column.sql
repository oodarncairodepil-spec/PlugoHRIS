-- Add note column to employees table if it does not exist
ALTER TABLE employees
ADD COLUMN IF NOT EXISTS note TEXT;

-- Set default value for note to empty string
ALTER TABLE employees
ALTER COLUMN note SET DEFAULT '';

-- Initialize existing rows with empty string where note is NULL
UPDATE employees
SET note = ''
WHERE note IS NULL;