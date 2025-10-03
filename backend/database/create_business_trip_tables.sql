-- Business Trip Request Tables
-- This script creates the necessary tables for business trip requests

-- Main business trip requests table
CREATE TABLE IF NOT EXISTS business_trip_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    destination TEXT NOT NULL, -- City or Country Destination
    start_date DATE NOT NULL, -- Trip period start
    end_date DATE NOT NULL, -- Trip period end
    status VARCHAR(20) DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected')),
    approved_by UUID REFERENCES employees(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Business trip events table (for dynamic rows of event details)
CREATE TABLE IF NOT EXISTS business_trip_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_trip_request_id UUID NOT NULL REFERENCES business_trip_requests(id) ON DELETE CASCADE,
    event_name TEXT NOT NULL,
    agenda TEXT NOT NULL,
    event_date TEXT NOT NULL, -- Free text as specified
    event_time TEXT NOT NULL, -- Free text as specified
    meeting_location TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Business trip participants table (many-to-many relationship)
CREATE TABLE IF NOT EXISTS business_trip_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_trip_request_id UUID NOT NULL REFERENCES business_trip_requests(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(business_trip_request_id, employee_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_business_trip_requests_employee_id ON business_trip_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_business_trip_requests_status ON business_trip_requests(status);
CREATE INDEX IF NOT EXISTS idx_business_trip_requests_dates ON business_trip_requests(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_business_trip_events_request_id ON business_trip_events(business_trip_request_id);
CREATE INDEX IF NOT EXISTS idx_business_trip_participants_request_id ON business_trip_participants(business_trip_request_id);
CREATE INDEX IF NOT EXISTS idx_business_trip_participants_employee_id ON business_trip_participants(employee_id);

-- Enable Row Level Security (RLS)
ALTER TABLE business_trip_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_trip_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_trip_participants ENABLE ROW LEVEL SECURITY;

-- RLS Policies for business_trip_requests
CREATE POLICY "Users can view their own business trip requests" ON business_trip_requests
    FOR SELECT USING (
        employee_id = auth.uid()::uuid OR 
        EXISTS (
            SELECT 1 FROM business_trip_participants btp 
            WHERE btp.business_trip_request_id = id 
            AND btp.employee_id = auth.uid()::uuid
        )
    );

CREATE POLICY "Users can create their own business trip requests" ON business_trip_requests
    FOR INSERT WITH CHECK (employee_id = auth.uid()::uuid);

CREATE POLICY "Users can update their own pending business trip requests" ON business_trip_requests
    FOR UPDATE USING (employee_id = auth.uid()::uuid AND status = 'Pending');

CREATE POLICY "Admins and HR can view all business trip requests" ON business_trip_requests
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM employees e 
            WHERE e.id = auth.uid()::uuid 
            AND e.role IN ('Admin', 'HR')
        )
    );

CREATE POLICY "Admins and HR can update business trip requests" ON business_trip_requests
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM employees e 
            WHERE e.id = auth.uid()::uuid 
            AND e.role IN ('Admin', 'HR')
        )
    );

-- RLS Policies for business_trip_events
CREATE POLICY "Users can view events for their business trip requests" ON business_trip_events
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM business_trip_requests btr 
            WHERE btr.id = business_trip_request_id 
            AND (
                btr.employee_id = auth.uid()::uuid OR 
                EXISTS (
                    SELECT 1 FROM business_trip_participants btp 
                    WHERE btp.business_trip_request_id = btr.id 
                    AND btp.employee_id = auth.uid()::uuid
                )
            )
        )
    );

CREATE POLICY "Users can manage events for their own business trip requests" ON business_trip_events
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM business_trip_requests btr 
            WHERE btr.id = business_trip_request_id 
            AND btr.employee_id = auth.uid()::uuid
        )
    );

CREATE POLICY "Admins and HR can manage all business trip events" ON business_trip_events
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM employees e 
            WHERE e.id = auth.uid()::uuid 
            AND e.role IN ('Admin', 'HR')
        )
    );

-- RLS Policies for business_trip_participants
CREATE POLICY "Users can view participants for their business trip requests" ON business_trip_participants
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM business_trip_requests btr 
            WHERE btr.id = business_trip_request_id 
            AND (
                btr.employee_id = auth.uid()::uuid OR 
                employee_id = auth.uid()::uuid
            )
        )
    );

CREATE POLICY "Users can manage participants for their own business trip requests" ON business_trip_participants
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM business_trip_requests btr 
            WHERE btr.id = business_trip_request_id 
            AND btr.employee_id = auth.uid()::uuid
        )
    );

CREATE POLICY "Admins and HR can manage all business trip participants" ON business_trip_participants
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM employees e 
            WHERE e.id = auth.uid()::uuid 
            AND e.role IN ('Admin', 'HR')
        )
    );

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_business_trip_requests_updated_at 
    BEFORE UPDATE ON business_trip_requests 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE business_trip_requests IS 'Main table for business trip requests';
COMMENT ON TABLE business_trip_events IS 'Events/meetings associated with business trip requests';
COMMENT ON TABLE business_trip_participants IS 'Participants in business trip requests (many-to-many)';
COMMENT ON COLUMN business_trip_requests.destination IS 'City or Country destination (free text)';
COMMENT ON COLUMN business_trip_events.event_date IS 'Event date (free text as specified)';
COMMENT ON COLUMN business_trip_events.event_time IS 'Event time (free text as specified)';