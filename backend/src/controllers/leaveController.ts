import { Response } from 'express';
import { supabase, supabaseAdmin } from '../utils/supabase';
import { AuthRequest } from '../middleware/auth';
import { body, validationResult } from 'express-validator';

// Validation rules for leave request creation
export const validateLeaveRequest = [
  body('leave_type_id').isUUID().withMessage('Valid leave type ID is required'),
  body('start_date').isISO8601().withMessage('Valid start date is required'),
  body('end_date').isISO8601().withMessage('Valid end date is required'),
  body('reason').optional().trim().isLength({ min: 1 }).withMessage('Reason must not be empty if provided'),
  body('document_links').optional().isArray().withMessage('Document links must be an array')
];

// Calculate business days between two dates
const calculateBusinessDays = (startDate: Date, endDate: Date): number => {
  let count = 0;
  const current = new Date(startDate);
  
  while (current <= endDate) {
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Sunday (0) or Saturday (6)
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  
  return count;
};

// Create leave request
export const createLeaveRequest = async (req: AuthRequest, res: Response) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { leave_type_id, start_date, end_date, reason, document_links } = req.body;
    const employee_id = req.user!.id;

    // Validate dates
    const startDateObj = new Date(start_date);
    const endDateObj = new Date(end_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (startDateObj < today) {
      return res.status(400).json({ error: 'Start date cannot be in the past' });
    }

    if (endDateObj < startDateObj) {
      return res.status(400).json({ error: 'End date cannot be before start date' });
    }

    // Calculate days requested
    const days_requested = calculateBusinessDays(startDateObj, endDateObj);

    if (days_requested === 0) {
      return res.status(400).json({ error: 'Leave request must include at least one business day' });
    }

    // Validate leave type exists
    const { data: leaveType, error: leaveTypeError } = await supabase
      .from('leave_types')
      .select('id, name, max_days_per_year')
      .eq('id', leave_type_id)
      .single();

    if (leaveTypeError || !leaveType) {
      return res.status(400).json({ error: 'Invalid leave type' });
    }

    // Check if employee has sufficient leave balance (for annual leave)
    if (leaveType.name === 'Annual Leave') {
      const { data: employee } = await supabase
        .from('employees')
        .select('leave_balance')
        .eq('id', employee_id)
        .single();

      if (employee && employee.leave_balance < days_requested) {
        return res.status(400).json({ 
          error: `Insufficient leave balance. Available: ${employee.leave_balance} days, Requested: ${days_requested} days` 
        });
      }
    }

    // Check for overlapping leave requests
    const { data: overlappingRequests } = await supabase
      .from('leave_requests')
      .select('id')
      .eq('employee_id', employee_id)
      .in('status', ['Pending', 'Approved'])
      .or(`start_date.lte.${end_date},end_date.gte.${start_date}`);

    if (overlappingRequests && overlappingRequests.length > 0) {
      return res.status(400).json({ error: 'You have overlapping leave requests for these dates' });
    }

    // Create leave request
    const { data: leaveRequest, error } = await supabase
      .from('leave_requests')
      .insert({
        employee_id,
        leave_type_id,
        start_date,
        end_date,
        days_requested,
        reason,
        document_links,
        status: 'Pending'
      })
      .select(`
        id, start_date, end_date, days_requested, reason, document_links, status, created_at,
        leave_type:leave_type_id(id, name),
        employee:employee_id(id, full_name, email)
      `)
      .single();

    if (error) {
      console.error('Create leave request error:', error);
      return res.status(500).json({ error: 'Failed to create leave request' });
    }

    res.status(201).json({
      message: 'Leave request submitted successfully',
      leave_request: leaveRequest
    });
  } catch (error) {
    console.error('Create leave request error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get leave requests for current user
export const getMyLeaveRequests = async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let query = supabase
      .from('leave_requests')
      .select(`
        id, start_date, end_date, days_requested, reason, document_links, status, 
        created_at, approved_at, rejection_reason,
        leave_type:leave_type_id(id, name),
        employee:employee_id(id, full_name),
        approved_by_user:approved_by(id, full_name)
      `, { count: 'exact' })
      .eq('employee_id', req.user!.id);

    if (status) {
      query = query.eq('status', status);
    }

    const { data: leaveRequests, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + Number(limit) - 1);

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch leave requests' });
    }

    res.json({
      leave_requests: leaveRequests,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: count || 0,
        pages: Math.ceil((count || 0) / Number(limit))
      }
    });
  } catch (error) {
    console.error('Get leave requests error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get leave requests for approval (Manager/Admin)
export const getLeaveRequestsForApproval = async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 10, status = 'Pending' } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let query = supabaseAdmin
      .from('leave_requests')
      .select(`
        id, start_date, end_date, days_requested, reason, document_links, status,
        created_at, approved_at, rejection_reason,
        leave_type:leave_type_id(id, name),
        employee:employee_id(id, full_name, email, department_id, department:department_id(id, name)),
        approved_by_user:approved_by(id, full_name)
      `, { count: 'exact' });

    // If user is Manager (not Admin), only show their subordinates' requests
    if (req.user!.role === 'Manager') {
      // Get subordinate IDs
      const { data: subordinates } = await supabaseAdmin
        .from('employees')
        .select('id')
        .eq('manager_id', req.user!.id);

      if (!subordinates || subordinates.length === 0) {
        return res.json({
          leave_requests: [],
          pagination: { page: 1, limit: Number(limit), total: 0, pages: 0 }
        });
      }

      const subordinateIds = subordinates.map(s => s.id);
      query = query.in('employee_id', subordinateIds);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data: leaveRequests, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + Number(limit) - 1);

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch leave requests' });
    }

    res.json({
      leave_requests: leaveRequests,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: count || 0,
        pages: Math.ceil((count || 0) / Number(limit))
      }
    });
  } catch (error) {
    console.error('Get leave requests for approval error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Approve leave request
export const approveLeaveRequest = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const approver_id = req.user!.id;

    // Get leave request details
    const { data: leaveRequest, error: fetchError } = await supabaseAdmin
      .from('leave_requests')
      .select(`
        id, employee_id, days_requested, status,
        leave_type:leave_type_id(name),
        employee:employee_id(manager_id, leave_balance)
      `)
      .eq('id', id)
      .single();

    if (fetchError || !leaveRequest) {
      return res.status(404).json({ error: 'Leave request not found' });
    }

    if (leaveRequest.status !== 'Pending') {
      return res.status(400).json({ error: 'Leave request is not pending' });
    }

    // Check if user has permission to approve this request
    if (req.user!.role === 'Manager') {
      if ((leaveRequest.employee as any).manager_id !== approver_id) {
        return res.status(403).json({ error: 'You can only approve requests from your subordinates' });
      }
    }

    // Update leave request status
    const { data: updatedRequest, error: updateError } = await supabaseAdmin
      .from('leave_requests')
      .update({
        status: 'Approved',
        approved_by: approver_id,
        approved_at: new Date().toISOString()
      })
      .eq('id', id)
      .select(`
        id, start_date, end_date, days_requested, reason, status,
        approved_at, leave_type:leave_type_id(name),
        employee:employee_id(id, full_name, email),
        approved_by_user:approved_by(id, full_name)
      `)
      .single();

    if (updateError) {
      return res.status(500).json({ error: 'Failed to approve leave request' });
    }

    // Deduct leave balance for annual leave
    if ((leaveRequest.leave_type as any).name === 'Annual Leave') {
      const newBalance = (leaveRequest.employee as any).leave_balance - leaveRequest.days_requested;
      await supabaseAdmin
        .from('employees')
        .update({ leave_balance: newBalance })
        .eq('id', leaveRequest.employee_id);
    }

    res.json({
      message: 'Leave request approved successfully',
      leave_request: updatedRequest
    });
  } catch (error) {
    console.error('Approve leave request error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Reject leave request
export const rejectLeaveRequest = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { rejection_reason } = req.body;
    const approver_id = req.user!.id;

    if (!rejection_reason || rejection_reason.trim().length < 10) {
      return res.status(400).json({ error: 'Rejection reason must be at least 10 characters' });
    }

    // Get leave request details
    const { data: leaveRequest, error: fetchError } = await supabaseAdmin
      .from('leave_requests')
      .select(`
        id, employee_id, status,
        employee:employee_id(manager_id)
      `)
      .eq('id', id)
      .single();

    if (fetchError || !leaveRequest) {
      return res.status(404).json({ error: 'Leave request not found' });
    }

    if (leaveRequest.status !== 'Pending') {
      return res.status(400).json({ error: 'Leave request is not pending' });
    }

    // Check if user has permission to reject this request
    if (req.user!.role === 'Manager') {
      if ((leaveRequest.employee as any).manager_id !== approver_id) {
        return res.status(403).json({ error: 'You can only reject requests from your subordinates' });
      }
    }

    // Update leave request status
    const { data: updatedRequest, error: updateError } = await supabaseAdmin
      .from('leave_requests')
      .update({
        status: 'Rejected',
        approved_by: approver_id,
        approved_at: new Date().toISOString(),
        rejection_reason: rejection_reason.trim()
      })
      .eq('id', id)
      .select(`
        id, start_date, end_date, days_requested, reason, status,
        approved_at, rejection_reason,
        leave_type:leave_type_id(name),
        employee:employee_id(id, full_name, email),
        approved_by_user:approved_by(id, full_name)
      `)
      .single();

    if (updateError) {
      return res.status(500).json({ error: 'Failed to reject leave request' });
    }

    res.json({
      message: 'Leave request rejected successfully',
      leave_request: updatedRequest
    });
  } catch (error) {
    console.error('Reject leave request error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get leave types
// Get all leave requests for admin dashboard (Admin only)
export const getAllLeaveRequestsForDashboard = async (req: AuthRequest, res: Response) => {
  try {
    // Only allow Admin users
    if (req.user!.role !== 'Admin') {
      return res.status(403).json({ error: 'Access denied. Admin role required.' });
    }

    const { page = 1, limit = 100 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const query = supabaseAdmin
      .from('leave_requests')
      .select(`
        id, start_date, end_date, days_requested, reason, document_links, status,
        created_at, approved_at, rejection_reason,
        leave_type:leave_type_id(id, name),
        employee:employee_id(id, full_name, email, department_id, department:department_id(id, name)),
        approved_by_user:approved_by(id, full_name)
      `, { count: 'exact' });

    // No status filtering - get ALL requests
    // No employee filtering - get requests from ALL employees

    const { data: leaveRequests, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + Number(limit) - 1);

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch leave requests' });
    }

    res.json({
      leave_requests: leaveRequests,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: count || 0,
        pages: Math.ceil((count || 0) / Number(limit))
      }
    });
  } catch (error) {
    console.error('Get all leave requests for dashboard error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getLeaveTypes = async (req: AuthRequest, res: Response) => {
  try {
    const { include_inactive } = req.query;
    
    let query = supabaseAdmin
      .from('leave_types')
      .select('id, name, description, max_days_per_year, requires_approval, requires_document, is_active, type, value, created_at');
    
    // Only filter by active status if include_inactive is not set to 'true'
    if (include_inactive !== 'true') {
      query = query.eq('is_active', true);
    }
    
    const { data: leaveTypes, error } = await query.order('name');

    if (error) {
      console.error('Database error in getLeaveTypes:', error);
      return res.status(500).json({ error: 'Failed to fetch leave types' });
    }

    res.json({ leave_types: leaveTypes });
  } catch (error) {
    console.error('Get leave types error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Create leave type (Admin only)
export const createLeaveType = async (req: AuthRequest, res: Response) => {
  try {
    if (req.user!.role !== 'Admin') {
      return res.status(403).json({ error: 'Access denied. Admin role required.' });
    }

    const { name, description, max_days_per_year, requires_approval, requires_document, is_active, type, value } = req.body;

    if (!name || !description) {
      return res.status(400).json({ error: 'Name and description are required' });
    }

    if (!type || !['Addition', 'Subtraction'].includes(type)) {
      return res.status(400).json({ error: 'Type must be either "Addition" or "Subtraction"' });
    }

    if (value === undefined || value === null || isNaN(parseFloat(value)) || parseFloat(value) < 0) {
      return res.status(400).json({ error: 'Value must be a positive number (supports decimals like 0.5)' });
    }

    const { data: leaveType, error } = await supabaseAdmin
      .from('leave_types')
      .insert({
        name: name.trim(),
        description: description.trim(),
        max_days_per_year: max_days_per_year || null,
        requires_approval: requires_approval !== false,
        requires_document: requires_document === true,
        is_active: is_active !== false,
        type: type,
        value: parseFloat(value)
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return res.status(400).json({ error: 'Leave type with this name already exists' });
      }
      return res.status(500).json({ error: 'Failed to create leave type' });
    }

    res.status(201).json({ leave_type: leaveType });
  } catch (error) {
    console.error('Create leave type error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update leave type (Admin only)
export const updateLeaveType = async (req: AuthRequest, res: Response) => {
  try {
    if (req.user!.role !== 'Admin') {
      return res.status(403).json({ error: 'Access denied. Admin role required.' });
    }

    const { id } = req.params;
    const { name, description, max_days_per_year, requires_approval, requires_document, is_active, type, value } = req.body;

    if (!name || !description) {
      return res.status(400).json({ error: 'Name and description are required' });
    }

    if (!type || !['Addition', 'Subtraction'].includes(type)) {
      return res.status(400).json({ error: 'Type must be either "Addition" or "Subtraction"' });
    }

    if (value === undefined || value === null || isNaN(parseFloat(value)) || parseFloat(value) < 0) {
      return res.status(400).json({ error: 'Value must be a positive number (supports decimals like 0.5)' });
    }

    const { data: leaveType, error } = await supabaseAdmin
      .from('leave_types')
      .update({
        name: name.trim(),
        description: description.trim(),
        max_days_per_year: max_days_per_year || null,
        requires_approval: requires_approval !== false,
        requires_document: requires_document === true,
        is_active: is_active !== false,
        type: type,
        value: parseFloat(value)
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return res.status(400).json({ error: 'Leave type with this name already exists' });
      }
      return res.status(404).json({ error: 'Leave type not found' });
    }

    res.json({ leave_type: leaveType });
  } catch (error) {
    console.error('Update leave type error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete leave type (Admin only)
export const deleteLeaveType = async (req: AuthRequest, res: Response) => {
  try {
    if (req.user!.role !== 'Admin') {
      return res.status(403).json({ error: 'Access denied. Admin role required.' });
    }

    const { id } = req.params;

    // Check if leave type is being used in any leave requests
    const { data: existingRequests, error: checkError } = await supabaseAdmin
      .from('leave_requests')
      .select('id')
      .eq('leave_type_id', id)
      .limit(1);

    if (checkError) {
      return res.status(500).json({ error: 'Failed to check leave type usage' });
    }

    if (existingRequests && existingRequests.length > 0) {
      return res.status(400).json({ error: 'Cannot delete leave type that is being used in leave requests' });
    }

    const { error } = await supabaseAdmin
      .from('leave_types')
      .delete()
      .eq('id', id);

    if (error) {
      return res.status(404).json({ error: 'Leave type not found' });
    }

    res.json({ message: 'Leave type deleted successfully' });
  } catch (error) {
    console.error('Delete leave type error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};