-- Add approved_codes field to grab_code_requests table
-- This field will store the codes provided by HR/Admin when approving requests

ALTER TABLE grab_code_requests 
ADD COLUMN approved_codes TEXT[];

-- Add comment to explain the field
COMMENT ON COLUMN grab_code_requests.approved_codes IS 'Array of codes provided by HR/Admin when approving the request. Number of codes should match code_needed field.';

-- Update RLS policies to allow HR/Admin to approve requests instead of managers
DROP POLICY IF EXISTS "Managers can view subordinate grab code requests" ON grab_code_requests;
DROP POLICY IF EXISTS "Managers can update subordinate grab code requests" ON grab_code_requests;

-- New policy for HR/Admin to view all grab code requests
CREATE POLICY "HR and Admin can view all grab code requests" ON grab_code_requests
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM employees e 
            WHERE e.id::text = auth.uid()::text 
            AND e.role IN ('HR', 'Admin')
        )
    );

-- New policy for HR/Admin to update grab code requests
CREATE POLICY "HR and Admin can update grab code requests" ON grab_code_requests
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM employees e 
            WHERE e.id::text = auth.uid()::text 
            AND e.role IN ('HR', 'Admin')
        )
    );

-- Success message
SELECT 'Approved codes field added and RLS policies updated for HR/Admin approval!' as message;