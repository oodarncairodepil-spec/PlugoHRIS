-- Fix leave_types table by adding missing columns
-- This script adds the missing columns that are being queried by the leaveController

-- Add requires_document column if it doesn't exist
ALTER TABLE leave_types ADD COLUMN IF NOT EXISTS requires_document BOOLEAN DEFAULT false;

-- Add is_active column if it doesn't exist
ALTER TABLE leave_types ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Add type column if it doesn't exist (Addition/Subtraction)
ALTER TABLE leave_types ADD COLUMN IF NOT EXISTS type VARCHAR(20) DEFAULT 'Subtraction' CHECK (type IN ('Addition', 'Subtraction'));

-- Add value column if it doesn't exist (decimal days)
ALTER TABLE leave_types ADD COLUMN IF NOT EXISTS value DECIMAL(5,2) DEFAULT 0.00;

-- Add comments to describe the new columns
COMMENT ON COLUMN leave_types.requires_document IS 'Whether this leave type requires document attachment';
COMMENT ON COLUMN leave_types.is_active IS 'Whether this leave type is currently active/available';
COMMENT ON COLUMN leave_types.type IS 'Whether this leave type adds or subtracts from balance (Addition/Subtraction)';
COMMENT ON COLUMN leave_types.value IS 'Default value in days for this leave type';

-- Update existing leave types with appropriate values
UPDATE leave_types SET 
    requires_document = CASE 
        WHEN name IN ('Sick Leave', 'Maternity Leave', 'Paternity Leave') THEN true
        ELSE false
    END,
    is_active = true,
    type = 'Subtraction',
    value = CASE 
        WHEN name = 'Annual Leave' THEN 1.00
        WHEN name = 'Sick Leave' THEN 1.00
        WHEN name = 'Emergency Leave' THEN 1.00
        WHEN name = 'Maternity Leave' THEN 90.00
        WHEN name = 'Paternity Leave' THEN 14.00
        ELSE 1.00
    END
WHERE requires_document IS NULL OR is_active IS NULL OR type IS NULL OR value IS NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_leave_types_is_active ON leave_types(is_active);
CREATE INDEX IF NOT EXISTS idx_leave_types_type ON leave_types(type);

-- Verify the changes
SELECT name, requires_document, is_active, type, value FROM leave_types ORDER BY name;