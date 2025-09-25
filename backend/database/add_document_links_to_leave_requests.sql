-- Add document_links column to leave_requests table
-- This column will store an array of document URLs/links for leave requests

ALTER TABLE leave_requests ADD COLUMN document_links TEXT[];

-- Add comment to describe the column
COMMENT ON COLUMN leave_requests.document_links IS 'Array of document URLs/links attached to the leave request';

-- Verify the column was added
\d leave_requests;