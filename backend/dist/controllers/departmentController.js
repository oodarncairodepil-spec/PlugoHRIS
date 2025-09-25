"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDepartmentEmployees = exports.getUnassignedEmployees = exports.removeEmployeeFromDepartment = exports.assignEmployeeToDepartment = exports.deleteDepartment = exports.updateDepartment = exports.getDepartmentById = exports.getAllDepartments = exports.createDepartment = exports.validateDepartmentCreation = void 0;
const supabase_1 = require("../utils/supabase");
const express_validator_1 = require("express-validator");
// Validation rules for department creation
exports.validateDepartmentCreation = [
    (0, express_validator_1.body)('name').trim().isLength({ min: 2 }).withMessage('Department name must be at least 2 characters'),
    (0, express_validator_1.body)('details').optional().trim().isLength({ max: 1000 }).withMessage('Details must be less than 1000 characters'),
    (0, express_validator_1.body)('head_id').optional({ nullable: true }).isUUID().withMessage('Head ID must be a valid UUID'),
    (0, express_validator_1.body)('employee_ids').optional().isArray().withMessage('Employee IDs must be an array'),
    (0, express_validator_1.body)('employee_ids.*').optional().isUUID().withMessage('Each employee ID must be a valid UUID'),
];
// Create new department (Admin only)
const createDepartment = async (req, res) => {
    try {
        // Check validation errors
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const { name, details, head_id } = req.body;
        // Check if department name already exists
        const { data: existingDept, error: checkError } = await supabase_1.supabaseAdmin
            .from('departments')
            .select('id')
            .eq('name', name)
            .single();
        if (checkError && checkError.code !== 'PGRST116') {
            console.error('Error checking existing department:', checkError);
            return res.status(500).json({ error: 'Database error' });
        }
        if (existingDept) {
            return res.status(400).json({ error: 'Department name already exists' });
        }
        // Validate head_id if provided
        if (head_id) {
            const { data: headEmployee, error: headError } = await supabase_1.supabaseAdmin
                .from('employees')
                .select('id, full_name')
                .eq('id', head_id)
                .single();
            if (headError || !headEmployee) {
                return res.status(400).json({ error: 'Invalid head employee ID' });
            }
        }
        // Create department
        const { data: department, error } = await supabase_1.supabaseAdmin
            .from('departments')
            .insert({
            name,
            details,
            head_id
        })
            .select(`
        *,
        head:employees!departments_head_id_fkey(id, full_name)
      `)
            .single();
        if (error) {
            console.error('Error creating department:', error);
            return res.status(500).json({ error: 'Failed to create department' });
        }
        res.status(201).json({
            message: 'Department created successfully',
            department
        });
    }
    catch (error) {
        console.error('Error in createDepartment:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.createDepartment = createDepartment;
// Get all departments
const getAllDepartments = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search || '';
        const offset = (page - 1) * limit;
        let query = supabase_1.supabaseAdmin
            .from('departments')
            .select(`
        *,
        head:employees!departments_head_id_fkey(id, full_name),
        department_employees(count)
      `, { count: 'exact' });
        // Apply search filter
        if (search) {
            query = query.or(`name.ilike.%${search}%,details.ilike.%${search}%`);
        }
        // Apply pagination
        query = query.range(offset, offset + limit - 1);
        const { data: departments, error, count } = await query;
        if (error) {
            console.error('Error fetching departments:', error);
            return res.status(500).json({ error: 'Failed to fetch departments' });
        }
        const totalPages = Math.ceil((count || 0) / limit);
        // Map the department_employees count to employee_count for frontend compatibility
        const formattedDepartments = (departments || []).map(dept => ({
            ...dept,
            employee_count: dept.department_employees?.[0]?.count || 0
        }));
        res.json({
            departments: formattedDepartments,
            pagination: {
                currentPage: page,
                totalPages,
                totalItems: count || 0,
                itemsPerPage: limit
            }
        });
    }
    catch (error) {
        console.error('Error in getAllDepartments:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getAllDepartments = getAllDepartments;
// Get department by ID
const getDepartmentById = async (req, res) => {
    try {
        const { id } = req.params;
        const { data: department, error } = await supabase_1.supabaseAdmin
            .from('departments')
            .select(`
        *,
        head:employees!departments_head_id_fkey(id, full_name),
        department_employees(
          id,
          position,
          assigned_at,
          employee:employees(id, full_name, role, email)
        )
      `)
            .eq('id', id)
            .single();
        if (error) {
            console.error('Error fetching department:', error);
            if (error.code === 'PGRST116') {
                return res.status(404).json({ error: 'Department not found' });
            }
            return res.status(500).json({ error: 'Failed to fetch department' });
        }
        res.json({ department });
    }
    catch (error) {
        console.error('Error in getDepartmentById:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getDepartmentById = getDepartmentById;
// Update department
const updateDepartment = async (req, res) => {
    try {
        // Check validation errors
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const { id } = req.params;
        const { name, details, head_id, employee_ids } = req.body;
        // Check if department exists
        const { data: existingDept, error: checkError } = await supabase_1.supabaseAdmin
            .from('departments')
            .select('id, name')
            .eq('id', id)
            .single();
        if (checkError || !existingDept) {
            return res.status(404).json({ error: 'Department not found' });
        }
        // Check if new name conflicts with existing department (excluding current)
        if (name && name !== existingDept.name) {
            const { data: nameConflict, error: nameError } = await supabase_1.supabaseAdmin
                .from('departments')
                .select('id')
                .eq('name', name)
                .neq('id', id)
                .single();
            if (nameError && nameError.code !== 'PGRST116') {
                console.error('Error checking name conflict:', nameError);
                return res.status(500).json({ error: 'Database error' });
            }
            if (nameConflict) {
                return res.status(400).json({ error: 'Department name already exists' });
            }
        }
        // Validate head_id if provided
        if (head_id) {
            const { data: headEmployee, error: headError } = await supabase_1.supabaseAdmin
                .from('employees')
                .select('id, full_name')
                .eq('id', head_id)
                .single();
            if (headError || !headEmployee) {
                return res.status(400).json({ error: 'Invalid head employee ID' });
            }
        }
        // Update department
        const { data: department, error } = await supabase_1.supabaseAdmin
            .from('departments')
            .update({
            name,
            details,
            head_id
        })
            .eq('id', id)
            .select(`
        *,
        head:employees!departments_head_id_fkey(id, full_name)
      `)
            .single();
        if (error) {
            console.error('Error updating department:', error);
            return res.status(500).json({ error: 'Failed to update department' });
        }
        // Handle employee assignments if provided
        if (employee_ids && Array.isArray(employee_ids)) {
            // First, remove all current employees from this department
            const { error: removeError } = await supabase_1.supabaseAdmin
                .from('department_employees')
                .delete()
                .eq('department_id', id);
            if (removeError) {
                console.error('Error removing employees from department:', removeError);
                return res.status(500).json({ error: 'Failed to update employee assignments' });
            }
            // Then, assign new employees to this department
            if (employee_ids.length > 0) {
                const employeeAssignments = employee_ids.map(employee_id => ({
                    department_id: id,
                    employee_id,
                    assigned_at: new Date().toISOString()
                }));
                const { error: assignError } = await supabase_1.supabaseAdmin
                    .from('department_employees')
                    .insert(employeeAssignments);
                if (assignError) {
                    console.error('Error assigning employees to department:', assignError);
                    return res.status(500).json({ error: 'Failed to update employee assignments' });
                }
            }
        }
        res.json({
            message: 'Department updated successfully',
            department
        });
    }
    catch (error) {
        console.error('Error in updateDepartment:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.updateDepartment = updateDepartment;
// Delete department
const deleteDepartment = async (req, res) => {
    try {
        const { id } = req.params;
        // Check if department exists
        const { data: existingDept, error: checkError } = await supabase_1.supabaseAdmin
            .from('departments')
            .select('id, name')
            .eq('id', id)
            .single();
        if (checkError || !existingDept) {
            return res.status(404).json({ error: 'Department not found' });
        }
        // Check if department has employees assigned
        const { data: assignedEmployees, error: employeeError } = await supabase_1.supabaseAdmin
            .from('department_employees')
            .select('id')
            .eq('department_id', id)
            .limit(1);
        if (employeeError) {
            console.error('Error checking assigned employees:', employeeError);
            return res.status(500).json({ error: 'Database error' });
        }
        if (assignedEmployees && assignedEmployees.length > 0) {
            return res.status(400).json({
                error: 'Cannot delete department with assigned employees. Please reassign employees first.'
            });
        }
        // Delete department
        const { error } = await supabase_1.supabaseAdmin
            .from('departments')
            .delete()
            .eq('id', id);
        if (error) {
            console.error('Error deleting department:', error);
            return res.status(500).json({ error: 'Failed to delete department' });
        }
        res.json({ message: 'Department deleted successfully' });
    }
    catch (error) {
        console.error('Error in deleteDepartment:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.deleteDepartment = deleteDepartment;
// Assign employee to department
const assignEmployeeToDepartment = async (req, res) => {
    try {
        const { departmentId, employeeId } = req.params;
        const { position } = req.body;
        // Validate department exists
        const { data: department, error: deptError } = await supabase_1.supabaseAdmin
            .from('departments')
            .select('id, name')
            .eq('id', departmentId)
            .single();
        if (deptError || !department) {
            return res.status(404).json({ error: 'Department not found' });
        }
        // Validate employee exists
        const { data: employee, error: empError } = await supabase_1.supabaseAdmin
            .from('employees')
            .select('id, full_name')
            .eq('id', employeeId)
            .single();
        if (empError || !employee) {
            return res.status(404).json({ error: 'Employee not found' });
        }
        // Check if assignment already exists
        const { data: existingAssignment, error: checkError } = await supabase_1.supabaseAdmin
            .from('department_employees')
            .select('id')
            .eq('department_id', departmentId)
            .eq('employee_id', employeeId)
            .single();
        if (checkError && checkError.code !== 'PGRST116') {
            console.error('Error checking existing assignment:', checkError);
            return res.status(500).json({ error: 'Database error' });
        }
        if (existingAssignment) {
            return res.status(400).json({ error: 'Employee is already assigned to this department' });
        }
        // Create assignment
        const { data: assignment, error } = await supabase_1.supabaseAdmin
            .from('department_employees')
            .insert({
            department_id: departmentId,
            employee_id: employeeId,
            position: position || 'Staff'
        })
            .select(`
        *,
        department:departments(id, name),
        employee:employees(id, full_name, role)
      `)
            .single();
        if (error) {
            console.error('Error creating assignment:', error);
            return res.status(500).json({ error: 'Failed to assign employee to department' });
        }
        res.status(201).json({
            message: 'Employee assigned to department successfully',
            assignment
        });
    }
    catch (error) {
        console.error('Error in assignEmployeeToDepartment:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.assignEmployeeToDepartment = assignEmployeeToDepartment;
// Remove employee from department
const removeEmployeeFromDepartment = async (req, res) => {
    try {
        const { departmentId, employeeId } = req.params;
        // Check if assignment exists
        const { data: assignment, error: checkError } = await supabase_1.supabaseAdmin
            .from('department_employees')
            .select('id')
            .eq('department_id', departmentId)
            .eq('employee_id', employeeId)
            .single();
        if (checkError || !assignment) {
            return res.status(404).json({ error: 'Employee assignment not found' });
        }
        // Remove assignment
        const { error } = await supabase_1.supabaseAdmin
            .from('department_employees')
            .delete()
            .eq('department_id', departmentId)
            .eq('employee_id', employeeId);
        if (error) {
            console.error('Error removing assignment:', error);
            return res.status(500).json({ error: 'Failed to remove employee from department' });
        }
        res.json({ message: 'Employee removed from department successfully' });
    }
    catch (error) {
        console.error('Error in removeEmployeeFromDepartment:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.removeEmployeeFromDepartment = removeEmployeeFromDepartment;
// Get employees not assigned to any department
const getUnassignedEmployees = async (req, res) => {
    try {
        const { data: employees, error } = await supabase_1.supabaseAdmin
            .from('employees')
            .select('id, full_name, email, position')
            .is('department_id', null)
            .order('full_name');
        if (error) {
            console.error('Error fetching unassigned employees:', error);
            return res.status(500).json({ error: 'Failed to fetch unassigned employees' });
        }
        res.json({ employees });
    }
    catch (error) {
        console.error('Error in getUnassignedEmployees:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getUnassignedEmployees = getUnassignedEmployees;
// Get employees for a specific department
const getDepartmentEmployees = async (req, res) => {
    try {
        const { id } = req.params;
        const { data: departmentEmployees, error } = await supabase_1.supabaseAdmin
            .from('department_employees')
            .select(`
        position,
        assigned_at,
        employee:employees(id, full_name, email, position)
      `)
            .eq('department_id', id)
            .order('employee(full_name)');
        if (error) {
            console.error('Error fetching department employees:', error);
            return res.status(500).json({ error: 'Failed to fetch department employees' });
        }
        // Transform the data to match the expected format
        const employees = departmentEmployees.map((de) => ({
            id: de.employee.id,
            full_name: de.employee.full_name,
            email: de.employee.email,
            position: de.employee.position,
            department_position: de.position,
            assigned_at: de.assigned_at
        }));
        res.json({ employees });
    }
    catch (error) {
        console.error('Error in getDepartmentEmployees:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getDepartmentEmployees = getDepartmentEmployees;
//# sourceMappingURL=departmentController.js.map