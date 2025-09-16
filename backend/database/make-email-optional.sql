-- Make email column optional in employees table
ALTER TABLE employees ALTER COLUMN email DROP NOT NULL;