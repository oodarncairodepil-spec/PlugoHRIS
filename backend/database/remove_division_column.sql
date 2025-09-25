-- Remove division column from employees table
-- This migration removes the division column since we're now using department_id with foreign key relationship

BEGIN;

-- First, let's check if the column exists before trying to drop it
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'employees' AND column_name = 'division') THEN
        -- Drop the division column
        ALTER TABLE employees DROP COLUMN division;
        RAISE NOTICE 'Division column dropped successfully from employees table';
    ELSE
        RAISE NOTICE 'Division column does not exist in employees table';
    END IF;
END $$;

COMMIT;