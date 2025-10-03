-- Fix leave_types table by adding missing columns
-- This script combines all missing column migrations for leave_types

-- Add requires_document column
ALTER TABLE leave_types 
ADD COLUMN IF NOT EXISTS requires_document BOOLEAN DEFAULT false;

-- Add is_active column
ALTER TABLE leave_types 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Add type and value columns
ALTER TABLE leave_types 
ADD COLUMN IF NOT EXISTS type VARCHAR(20) CHECK (type IN ('Addition', 'Subtraction')) DEFAULT 'Subtraction',
ADD COLUMN IF NOT EXISTS value DECIMAL(5,2) DEFAULT 1.0;

-- Add comments to document the purpose of these columns
COMMENT ON COLUMN leave_types.requires_document IS 'Indicates whether this leave type requires supporting documents/images';
COMMENT ON COLUMN leave_types.is_active IS 'Indicates whether this leave type is active and available for use (true) or inactive (false)';
COMMENT ON COLUMN leave_types.type IS 'Indicates whether this leave type adds to or subtracts from leave balance (Addition for TOIL, Subtraction for regular leave)';
COMMENT ON COLUMN leave_types.value IS 'The number of days (supports decimals like 0.5 for half days) for this leave type';

-- Update existing leave types with appropriate default values
UPDATE leave_types SET requires_document = true WHERE name IN ('Sick Leave', 'Maternity Leave', 'Paternity Leave');
UPDATE leave_types SET is_active = true WHERE is_active IS NULL;
UPDATE leave_types SET type = 'Subtraction' WHERE type IS NULL;
UPDATE leave_types SET value = 1.0 WHERE value IS NULL;

-- Set specific values for existing leave types
UPDATE leave_types SET value = 0.5 WHERE name LIKE '%Half Day%';
UPDATE leave_types SET value = 3.0 WHERE name LIKE '%Marital Leave%' OR name LIKE '%3 days%';
UPDATE leave_types SET value = 2.0 WHERE name LIKE '%Menstruation leave%' OR name LIKE '%2 days%' OR name LIKE '%2 Days%';
UPDATE leave_types SET value = 90.0 WHERE name LIKE '%Maternity Leave%' OR name LIKE '%3 months%';
UPDATE leave_types SET value = 45.0 WHERE name LIKE '%1.5 month%';
UPDATE leave_types SET value = 14.0 WHERE name LIKE '%Paternity Leave%';
UPDATE leave_types SET value = 1.0 WHERE name LIKE '%1 Day%';

-- Set Time Off in Lieu types as 'Addition'
UPDATE leave_types SET type = 'Addition' WHERE name LIKE '%Time Off in Lieu%' OR name LIKE '%TOIL%';

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_leave_types_is_active ON leave_types(is_active);
CREATE INDEX IF NOT EXISTS idx_leave_types_type ON leave_types(type);

-- Verify the changes
SELECT name, requires_document, is_active, type, value, max_days_per_year 
FROM leave_types 
ORDER BY type, name;