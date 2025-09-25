-- Create services table for managing Grab services
CREATE TABLE IF NOT EXISTS services (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_services_updated_at
    BEFORE UPDATE ON services
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert default Grab services
INSERT INTO services (name, description, is_active) VALUES
    ('GrabCar', 'Car transportation service', true),
    ('GrabBike', 'Motorcycle transportation service', true),
    ('GrabFood', 'Food delivery service', true),
    ('GrabExpress', 'Package delivery service', true),
    ('GrabMart', 'Grocery and retail delivery service', false)
ON CONFLICT (name) DO NOTHING;