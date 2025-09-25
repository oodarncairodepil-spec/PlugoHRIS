-- Add requires_document column to leave_types table
ALTER TABLE leave_types 
ADD COLUMN requires_document BOOLEAN DEFAULT false;

-- Update existing leave types that might require documents
-- You can customize these based on your organization's needs
UPDATE leave_types 
SET requires_document = true 
WHERE name IN ('Sick Leave', 'Maternity Leave', 'Paternity Leave');

-- Add comment to document the purpose of this column
COMMENT ON COLUMN leave_types.requires_document IS 'Indicates whether this leave type requires supporting documents/images';