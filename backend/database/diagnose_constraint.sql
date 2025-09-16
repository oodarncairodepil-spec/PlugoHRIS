-- Diagnostic script to identify constraint issues
-- Run this in Supabase SQL Editor to see what's causing the problem

-- Check current constraint definition
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conname LIKE '%role%' AND conrelid = 'employees'::regclass;

-- Check all current roles in the database
SELECT 
    role,
    COUNT(*) as count
FROM employees 
GROUP BY role
ORDER BY role;

-- Check for any problematic rows
SELECT 
    id,
    full_name,
    email,
    role,
    CASE 
        WHEN role NOT IN ('Employee', 'Manager', 'Admin') THEN 'INVALID ROLE'
        ELSE 'VALID'
    END as role_status
FROM employees
WHERE role NOT IN ('Employee', 'Manager', 'Admin')
OR role IS NULL;

-- Show table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'employees' 
AND column_name = 'role';