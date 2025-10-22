-- Create holidays table for managing company holidays
CREATE TABLE IF NOT EXISTS holidays (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    date DATE NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Ensure update_updated_at_column function exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at timestamp on holidays
CREATE TRIGGER update_holidays_updated_at
    BEFORE UPDATE ON holidays
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert sample holidays (idempotent)
INSERT INTO holidays (name, date, is_active) VALUES
    ('New Year''s Day', DATE '2025-01-01', true),
    ('Labor Day', DATE '2025-05-01', true),
    ('Independence Day', DATE '2025-08-17', true),
    ('Christmas Day', DATE '2025-12-25', true)
ON CONFLICT (date) DO NOTHING;