-- Add missing columns to employees table
ALTER TABLE employees 
ADD COLUMN phone VARCHAR(20),
ADD COLUMN address TEXT,
ADD COLUMN position VARCHAR(100),
ADD COLUMN salary DECIMAL(15,2),
ADD COLUMN password_changed BOOLEAN DEFAULT FALSE;

-- Add index for phone number
CREATE INDEX idx_employees_phone ON employees(phone);

-- Update existing records to have default values for new fields
UPDATE employees SET 
    phone = '',
    address = '',
    position = division,
    salary = 0.00,
    password_changed = FALSE
WHERE phone IS NULL;