-- Create grab_code_requests table
CREATE TABLE IF NOT EXISTS grab_code_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  service_needed VARCHAR(50) CHECK (service_needed IN ('GrabCar', 'GrabBike', 'GrabExpress', 'GrabFood')) NOT NULL,
  purpose TEXT NOT NULL,
  counterpart_name VARCHAR(255) NOT NULL,
  usage_date DATE NOT NULL,
  usage_time TIME NOT NULL,
  meeting_location TEXT NOT NULL,
  code_needed INTEGER NOT NULL CHECK (code_needed > 0),
  status VARCHAR(20) CHECK (status IN ('Pending', 'Approved', 'Rejected')) DEFAULT 'Pending',
  approved_by UUID REFERENCES employees(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_grab_code_requests_employee ON grab_code_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_grab_code_requests_status ON grab_code_requests(status);
CREATE INDEX IF NOT EXISTS idx_grab_code_requests_usage_date ON grab_code_requests(usage_date);
CREATE INDEX IF NOT EXISTS idx_grab_code_requests_service ON grab_code_requests(service_needed);

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_grab_code_requests_updated_at BEFORE UPDATE ON grab_code_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE grab_code_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for grab_code_requests table
CREATE POLICY "Employees can view their own grab code requests" ON grab_code_requests
    FOR SELECT USING (employee_id::text = auth.uid()::text);

CREATE POLICY "Employees can create their own grab code requests" ON grab_code_requests
    FOR INSERT WITH CHECK (employee_id::text = auth.uid()::text);

CREATE POLICY "Managers can view subordinate grab code requests" ON grab_code_requests
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM employees e 
            WHERE e.manager_id::text = auth.uid()::text 
            AND e.id = grab_code_requests.employee_id
        )
        OR
        EXISTS (
            SELECT 1 FROM employees e 
            WHERE e.id::text = auth.uid()::text 
            AND e.role IN ('Manager', 'Admin')
        )
    );

CREATE POLICY "Managers can update subordinate grab code requests" ON grab_code_requests
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM employees e 
            WHERE e.manager_id::text = auth.uid()::text 
            AND e.id = grab_code_requests.employee_id
        )
        OR
        EXISTS (
            SELECT 1 FROM employees e 
            WHERE e.id::text = auth.uid()::text 
            AND e.role IN ('Manager', 'Admin')
        )
    );

-- Success message
SELECT 'Grab code requests table created successfully!' as message;