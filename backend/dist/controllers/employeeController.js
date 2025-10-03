"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteEmployee = exports.getAllManagers = exports.generateNewPassword = exports.updateEmployee = exports.getEmployeeById = exports.getAllEmployees = exports.createEmployee = exports.validateEmployeeCreation = void 0;
const supabase_1 = require("../utils/supabase");
const authController_1 = require("./authController");
const express_validator_1 = require("express-validator");
// Validation rules for employee creation
exports.validateEmployeeCreation = [
    (0, express_validator_1.body)('full_name').trim().isLength({ min: 2 }).withMessage('Full name must be at least 2 characters'),
    (0, express_validator_1.body)('email').optional().isEmail().normalizeEmail().withMessage('Valid email is required'),
    (0, express_validator_1.body)('nik').trim().isLength({ min: 3 }).withMessage('NIK must be at least 3 characters'),
    (0, express_validator_1.body)('department_id').isUUID().withMessage('Department ID must be a valid UUID'),
    (0, express_validator_1.body)('employment_type').isIn(['Permanent', 'Contract']).withMessage('Employment type must be Permanent or Contract'),
    (0, express_validator_1.body)('leave_balance').isInt({ min: 0 }).withMessage('Leave balance must be a positive number'),
    (0, express_validator_1.body)('start_date').isISO8601().withMessage('Valid start date is required'),
    (0, express_validator_1.body)('role').optional().isIn(['Employee', 'Manager', 'Admin']).withMessage('Role must be Employee, Manager, or Admin'),
    (0, express_validator_1.body)('manager_id').optional().isUUID().withMessage('Manager ID must be a valid UUID'),
    (0, express_validator_1.body)('phone').optional().trim().isLength({ max: 20 }).withMessage('Phone number must be less than 20 characters'),
    (0, express_validator_1.body)('address').optional().trim().isLength({ max: 500 }).withMessage('Address must be less than 500 characters'),
    (0, express_validator_1.body)('position').optional().trim().isLength({ max: 100 }).withMessage('Position must be less than 100 characters'),
];
// Create new employee (Admin only)
const createEmployee = async (req, res) => {
    try {
        // Check validation errors
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const { full_name, email, nik, department_id, employment_type, leave_balance, start_date, role = 'Employee', manager_id, phone, address, position, } = req.body;
        // Generate random password
        const plainPassword = (0, authController_1.generateRandomPassword)();
        const password_hash = await (0, authController_1.hashPassword)(plainPassword);
        // Check if NIK already exists
        const { data: existingNik } = await supabase_1.supabaseAdmin
            .from('employees')
            .select('nik')
            .eq('nik', nik);
        if (existingNik && existingNik.length > 0) {
            return res.status(400).json({ error: 'NIK already exists' });
        }
        // Check if email already exists (only if email is provided)
        if (email) {
            const { data: existingEmail } = await supabase_1.supabaseAdmin
                .from('employees')
                .select('email')
                .eq('email', email.toLowerCase());
            if (existingEmail && existingEmail.length > 0) {
                return res.status(400).json({ error: 'Email already exists' });
            }
        }
        // Validate manager exists if manager_id is provided
        if (manager_id) {
            const { data: manager } = await supabase_1.supabaseAdmin
                .from('employees')
                .select('id, role')
                .eq('id', manager_id)
                .eq('status', 'Active')
                .single();
            if (!manager) {
                return res.status(400).json({ error: 'Invalid manager ID' });
            }
            if (manager.role !== 'Manager' && manager.role !== 'Admin') {
                return res.status(400).json({ error: 'Assigned manager must have Manager or Admin role' });
            }
        }
        // Validate department exists if department_id is provided
        if (department_id) {
            const { data: department, error: deptError } = await supabase_1.supabaseAdmin
                .from('departments')
                .select('id')
                .eq('id', department_id)
                .single();
            if (deptError || !department) {
                return res.status(400).json({ error: 'Invalid department ID' });
            }
        }
        // Create employee
        const { data: newEmployee, error } = await supabase_1.supabaseAdmin
            .from('employees')
            .insert({
            full_name,
            email: email.toLowerCase(),
            nik,
            department_id,
            employment_type,
            leave_balance,
            start_date,
            role,
            manager_id: manager_id || null,
            password_hash,
            phone: phone || '',
            address: address || '',
            position: position || '',
            password_changed: false,
            status: 'Active'
        })
            .select(`
        id, full_name, email, nik, department_id, employment_type,
        leave_balance, start_date, role, status, created_at,
        phone, address, position, password_changed,
        manager:manager_id(id, full_name, email),
        department:department_id(id, name)
      `)
            .single();
        if (error) {
            console.error('Create employee error:', error);
            return res.status(500).json({ error: 'Failed to create employee' });
        }
        // Department assignment is handled by employees.department_id - no additional sync needed
        res.status(201).json({
            message: 'Employee created successfully',
            employee: newEmployee,
            temporary_password: plainPassword
        });
    }
    catch (error) {
        console.error('Create employee error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.createEmployee = createEmployee;
// Get all employees (Admin and Manager)
const getAllEmployees = async (req, res) => {
    try {
        const { page = 1, limit = 10, search, department, manager, hireDateFrom, hireDateTo, employmentType, status, role } = req.query;
        const offset = (Number(page) - 1) * Number(limit);
        let query = supabase_1.supabaseAdmin
            .from('employees')
            .select(`
        id, full_name, email, nik, department_id, employment_type,
        leave_balance, start_date, role, status, created_at,
        phone, address, position, password_changed, manager_id,
        manager:manager_id(id, full_name, email),
        department:department_id(id, name)
      `, { count: 'exact' });
        // Apply filters
        if (search) {
            query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,nik.ilike.%${search}%`);
        }
        if (department) {
            query = query.eq('department_id', department);
        }
        if (manager) {
            // Filter by manager name - need to join with manager table
            query = query.not('manager_id', 'is', null);
            // Note: This is a simplified approach. For exact manager name matching,
            // we would need a more complex query or handle it differently
        }
        if (hireDateFrom) {
            query = query.gte('start_date', hireDateFrom);
        }
        if (hireDateTo) {
            query = query.lte('start_date', hireDateTo);
        }
        if (employmentType) {
            query = query.eq('employment_type', employmentType);
        }
        if (status) {
            query = query.eq('status', status);
        }
        if (role) {
            query = query.eq('role', role);
        }
        // If user is Manager (not Admin), only show their subordinates
        if (req.user.role === 'Manager') {
            query = query.eq('manager_id', req.user.id);
        }
        // Log the query parameters for debugging
        console.log('Query parameters:', { page, limit, offset, role, department, search, manager, hireDateFrom, hireDateTo, employmentType, status });
        console.log('User role:', req.user?.role);
        const { data: employees, error, count } = await query
            .order('created_at', { ascending: false })
            .range(offset, offset + Number(limit) - 1);
        if (error) {
            console.error('Database query error:', error);
            console.error('Query details:', { page, limit, offset, role, filters: { department, manager, hireDateFrom, hireDateTo, employmentType, status } });
            // If it's a range error (offset beyond data), return empty results
            if (error.message && error.message.includes('range')) {
                console.log('Range error - offset beyond available data:', { offset, error: error.message });
                return res.json({
                    employees: [],
                    total: 0,
                    page: Number(page),
                    totalPages: 0
                });
            }
            return res.status(500).json({ error: 'Failed to fetch employees' });
        }
        // If manager filter is specified, filter by manager name in the results
        let filteredEmployees = employees;
        if (manager && employees && typeof manager === 'string') {
            filteredEmployees = employees.filter(emp => emp.manager && typeof emp.manager === 'object' &&
                'full_name' in emp.manager &&
                typeof emp.manager.full_name === 'string' &&
                emp.manager.full_name.toLowerCase().includes(manager.toLowerCase()));
        }
        res.json({
            employees: filteredEmployees,
            total: count || 0,
            page: Number(page),
            totalPages: Math.ceil((count || 0) / Number(limit))
        });
    }
    catch (error) {
        console.error('Get employees error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getAllEmployees = getAllEmployees;
// Get employee by ID
const getEmployeeById = async (req, res) => {
    try {
        const { id } = req.params;
        let query = supabase_1.supabaseAdmin
            .from('employees')
            .select(`
        id, full_name, email, nik, department_id, employment_type,
        leave_balance, start_date, role, status, created_at, updated_at,
        phone, address, position, salary, password_changed,
        manager:manager_id(id, full_name, email),
        department:department_id(id, name)
      `)
            .eq('id', id);
        // If user is Manager (not Admin), only allow viewing their subordinates
        if (req.user.role === 'Manager') {
            query = query.eq('manager_id', req.user.id);
        }
        const { data: employee, error } = await query.single();
        if (error || !employee) {
            return res.status(404).json({ error: 'Employee not found' });
        }
        res.json({ employee });
    }
    catch (error) {
        console.error('Get employee error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getEmployeeById = getEmployeeById;
// Update employee (Admin only)
const updateEmployee = async (req, res) => {
    try {
        const { id } = req.params;
        const { full_name, department_id, employment_type, leave_balance, role, manager_id, status, phone, address, position, } = req.body;
        // Get current employee data to check for department changes
        const { data: currentEmployee, error: getCurrentError } = await supabase_1.supabaseAdmin
            .from('employees')
            .select('id, department_id')
            .eq('id', id)
            .single();
        if (getCurrentError || !currentEmployee) {
            return res.status(404).json({ error: 'Employee not found' });
        }
        // Validate manager exists if manager_id is provided
        if (manager_id) {
            const { data: manager } = await supabase_1.supabaseAdmin
                .from('employees')
                .select('id, role')
                .eq('id', manager_id)
                .eq('status', 'Active')
                .single();
            if (!manager) {
                return res.status(400).json({ error: 'Invalid manager ID' });
            }
            if (manager.role !== 'Manager' && manager.role !== 'Admin') {
                return res.status(400).json({ error: 'Assigned manager must have Manager or Admin role' });
            }
        }
        // Validate department exists if department_id is provided
        if (department_id) {
            const { data: department, error: deptError } = await supabase_1.supabaseAdmin
                .from('departments')
                .select('id')
                .eq('id', department_id)
                .single();
            if (deptError || !department) {
                return res.status(400).json({ error: 'Invalid department ID' });
            }
        }
        const { data: updatedEmployee, error } = await supabase_1.supabaseAdmin
            .from('employees')
            .update({
            full_name,
            department_id,
            employment_type,
            leave_balance,
            role,
            manager_id: manager_id || null,
            status,
            phone: phone || '',
            address: address || '',
            position: position || '',
        })
            .eq('id', id)
            .select(`
        id, full_name, email, nik, department_id, employment_type,
        leave_balance, start_date, role, status, updated_at,
        phone, address, position, salary, password_changed,
        manager:manager_id(id, full_name, email),
        department:department_id(id, name)
      `)
            .single();
        if (error) {
            console.error('Error updating employee:', error);
            return res.status(500).json({ error: 'Failed to update employee' });
        }
        // No additional synchronization needed - employees.department_id is the single source of truth
        res.json({
            message: 'Employee updated successfully',
            employee: updatedEmployee
        });
    }
    catch (error) {
        console.error('Update employee error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.updateEmployee = updateEmployee;
// Generate new password for employee (Admin only)
const generateNewPassword = async (req, res) => {
    try {
        const { id } = req.params;
        // Generate new random password
        const newPassword = (0, authController_1.generateRandomPassword)();
        const password_hash = await (0, authController_1.hashPassword)(newPassword);
        const { error } = await supabase_1.supabaseAdmin
            .from('employees')
            .update({
            password_hash,
            password_changed: false
        })
            .eq('id', id);
        if (error) {
            return res.status(500).json({ error: 'Failed to generate new password' });
        }
        res.json({
            message: 'New password generated successfully',
            temporary_password: newPassword
        });
    }
    catch (error) {
        console.error('Generate password error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.generateNewPassword = generateNewPassword;
// Get all managers for dropdown (Admin only)
const getAllManagers = async (req, res) => {
    try {
        const { data: managers, error } = await supabase_1.supabaseAdmin
            .from('employees')
            .select('id, full_name, email, department_id, department:department_id(id, name)')
            .in('role', ['Manager', 'Admin'])
            .eq('status', 'Active')
            .order('full_name');
        if (error) {
            return res.status(500).json({ error: 'Failed to fetch managers' });
        }
        res.json({ managers });
    }
    catch (error) {
        console.error('Get managers error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getAllManagers = getAllManagers;
// Delete employee (Admin only)
const deleteEmployee = async (req, res) => {
    try {
        const { id } = req.params;
        // Check if employee exists
        const { data: existingEmployee, error: checkError } = await supabase_1.supabaseAdmin
            .from('employees')
            .select('id, full_name')
            .eq('id', id)
            .single();
        if (checkError || !existingEmployee) {
            return res.status(404).json({ error: 'Employee not found' });
        }
        // Check if employee has any leave requests
        const { data: leaveRequests, error: leaveError } = await supabase_1.supabaseAdmin
            .from('leave_requests')
            .select('id')
            .eq('employee_id', id)
            .limit(1);
        if (leaveError) {
            console.error('Error checking leave requests:', leaveError);
            return res.status(500).json({ error: 'Database error' });
        }
        // If employee has leave requests, we should not delete them
        if (leaveRequests && leaveRequests.length > 0) {
            return res.status(400).json({
                error: 'Cannot delete employee with existing leave requests. Please handle leave requests first.'
            });
        }
        // Check if employee is assigned as a manager to other employees
        const { data: managedEmployees, error: managerError } = await supabase_1.supabaseAdmin
            .from('employees')
            .select('id')
            .eq('manager_id', id)
            .limit(1);
        if (managerError) {
            console.error('Error checking managed employees:', managerError);
            return res.status(500).json({ error: 'Database error' });
        }
        if (managedEmployees && managedEmployees.length > 0) {
            return res.status(400).json({
                error: 'Cannot delete employee who is assigned as a manager to other employees. Please reassign managed employees first.'
            });
        }
        // Delete employee
        const { error } = await supabase_1.supabaseAdmin
            .from('employees')
            .delete()
            .eq('id', id);
        if (error) {
            console.error('Error deleting employee:', error);
            return res.status(500).json({ error: 'Failed to delete employee' });
        }
        res.json({ message: 'Employee deleted successfully' });
    }
    catch (error) {
        console.error('Error in deleteEmployee:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.deleteEmployee = deleteEmployee;
//# sourceMappingURL=employeeController.js.map