-- Update leave types with comprehensive list
-- First, clear existing leave types
DELETE FROM leave_types;

-- Insert the comprehensive leave types list
INSERT INTO leave_types (id, name, description, max_days_per_year, requires_approval) VALUES
(gen_random_uuid(), 'Annual Leave', 'Regular annual leave for employees', 21, true),
(gen_random_uuid(), 'Annual Leave - First Half Day', 'First half day annual leave', NULL, true),
(gen_random_uuid(), 'Annual Leave - Second Half Day', 'Second half day annual leave', NULL, true),
(gen_random_uuid(), 'Time Off in Lieu', 'Time off in lieu of overtime worked', NULL, true),
(gen_random_uuid(), 'Time Off in Lieu - First Half Day', 'First half day time off in lieu', NULL, true),
(gen_random_uuid(), 'Time Off in Lieu - Second Half Day', 'Second half day time off in lieu', NULL, true),
(gen_random_uuid(), 'Sick Leave', 'Medical leave for illness', 12, true),
(gen_random_uuid(), 'Marital Leave (3 days)', 'Leave for employee marriage', 3, true),
(gen_random_uuid(), 'Menstruation leave (2 days)', 'Monthly menstruation leave', 2, true),
(gen_random_uuid(), 'Maternity Leave (3 months)', 'Maternity leave for childbirth', 90, true),
(gen_random_uuid(), 'Miscarriage Leave (1.5 month)', 'Leave for miscarriage recovery', 45, true),
(gen_random_uuid(), 'Bereavement Leave for Death of wife/ husband/ child/ parents/ parents in-laws (2 Days)', 'Bereavement leave for immediate family', 2, true),
(gen_random_uuid(), 'Bereavement Leave for household member (1 Days)', 'Bereavement leave for household member', 1, true),
(gen_random_uuid(), 'Child''s circumcision/ baptism (2 Days)', 'Leave for child religious ceremonies', 2, true),
(gen_random_uuid(), 'The Marriage of Employee''s children (1 Day)', 'Leave for child marriage ceremony', 1, true),
(gen_random_uuid(), 'The Miscarriage or the Labor of Employee''s Child (2 Days)', 'Leave for child birth or miscarriage support', 2, true);

-- Verify the insert
SELECT name, max_days_per_year FROM leave_types ORDER BY name;