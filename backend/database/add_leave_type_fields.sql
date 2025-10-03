-- Add type and value fields to leave_types table
-- This migration adds support for addition/subtraction leave types with decimal values

-- Add the new columns
ALTER TABLE leave_types 
ADD COLUMN type VARCHAR(20) CHECK (type IN ('Addition', 'Subtraction')) DEFAULT 'Subtraction',
ADD COLUMN value DECIMAL(5,2) DEFAULT 0.0;

-- Add comments to document the purpose of these columns
COMMENT ON COLUMN leave_types.type IS 'Indicates whether this leave type adds to or subtracts from leave balance (Addition for TOIL, Subtraction for regular leave)';
COMMENT ON COLUMN leave_types.value IS 'The number of days (supports decimals like 0.5 for half days) for this leave type';

-- Update existing leave types to have appropriate default values
-- Most existing leave types should be 'Subtraction' type
UPDATE leave_types SET type = 'Subtraction' WHERE type IS NULL;

-- Set some example values for existing leave types (you may want to customize these)
UPDATE leave_types SET value = 1.0 WHERE name LIKE '%Annual Leave%' AND name LIKE '%Half Day%';
UPDATE leave_types SET value = 0.5 WHERE name LIKE '%Half Day%';
UPDATE leave_types SET value = 1.0 WHERE name = 'Annual Leave';
UPDATE leave_types SET value = 1.0 WHERE name = 'Sick Leave';
UPDATE leave_types SET value = 3.0 WHERE name LIKE '%Marital Leave%';
UPDATE leave_types SET value = 2.0 WHERE name LIKE '%Menstruation leave%';
UPDATE leave_types SET value = 90.0 WHERE name LIKE '%Maternity Leave%';
UPDATE leave_types SET value = 45.0 WHERE name LIKE '%Miscarriage Leave%';
UPDATE leave_types SET value = 2.0 WHERE name LIKE '%Bereavement Leave%' AND name LIKE '%parents%';
UPDATE leave_types SET value = 1.0 WHERE name LIKE '%Bereavement Leave%' AND name LIKE '%household%';
UPDATE leave_types SET value = 2.0 WHERE name LIKE '%circumcision%' OR name LIKE '%baptism%';
UPDATE leave_types SET value = 1.0 WHERE name LIKE '%Marriage of Employee%';
UPDATE leave_types SET value = 2.0 WHERE name LIKE '%Miscarriage or the Labor%';

-- Set Time Off in Lieu types as 'Addition'
UPDATE leave_types SET type = 'Addition' WHERE name LIKE '%Time Off in Lieu%' OR name LIKE '%TOIL%';

-- Verify the changes
SELECT name, type, value, max_days_per_year FROM leave_types ORDER BY type, name;