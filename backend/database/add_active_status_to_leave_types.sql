-- Add active status column to leave_types table
-- This migration adds support for activating/deactivating leave types

-- Add the active column
ALTER TABLE leave_types 
ADD COLUMN is_active BOOLEAN DEFAULT true;

-- Add comment to document the purpose of this column
COMMENT ON COLUMN leave_types.is_active IS 'Indicates whether this leave type is active and available for use (true) or inactive (false)';

-- Set all existing leave types to active by default
UPDATE leave_types SET is_active = true WHERE is_active IS NULL;

-- Add index for better performance when filtering by active status
CREATE INDEX idx_leave_types_is_active ON leave_types(is_active);

-- Verify the changes
SELECT name, is_active, created_at FROM leave_types ORDER BY name;