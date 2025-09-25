import { Response } from 'express';
import { supabaseAdmin } from '../utils/supabase';
import { AuthRequest } from '../middleware/auth';
import { GrabCodeRequest, CreateGrabCodeRequestData, UpdateGrabCodeRequestData } from '../models/GrabCodeRequest';

// Create a new grab code request
export const createGrabCodeRequest = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const requestData: CreateGrabCodeRequestData = req.body;

    // Validate required fields
    const requiredFields = ['service_needed', 'purpose', 'counterpart_name', 'usage_date', 'usage_time', 'meeting_location', 'code_needed'];
    for (const field of requiredFields) {
      if (!requestData[field as keyof CreateGrabCodeRequestData]) {
        return res.status(400).json({ error: `${field} is required` });
      }
    }

    // Validate service_needed
    const validServices = ['GrabCar', 'GrabBike', 'GrabExpress', 'GrabFood'];
    if (!validServices.includes(requestData.service_needed)) {
      return res.status(400).json({ error: 'Invalid service type' });
    }

    // Validate code_needed is a positive number
    if (requestData.code_needed <= 0) {
      return res.status(400).json({ error: 'Code needed must be a positive number' });
    }

    // Insert the grab code request
    const { data, error } = await supabaseAdmin
      .from('grab_code_requests')
      .insert({
        employee_id: userId,
        service_needed: requestData.service_needed,
        purpose: requestData.purpose,
        counterpart_name: requestData.counterpart_name,
        usage_date: requestData.usage_date,
        usage_time: requestData.usage_time,
        meeting_location: requestData.meeting_location,
        code_needed: requestData.code_needed,
        status: 'Pending'
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating grab code request:', error);
      return res.status(500).json({ error: 'Failed to create grab code request' });
    }

    res.status(201).json({
      message: 'Grab code request created successfully',
      data
    });
  } catch (error) {
    console.error('Error in createGrabCodeRequest:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get grab code requests for the authenticated user
export const getGrabCodeRequests = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { page = 1, limit = 10, status } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let query = supabaseAdmin
      .from('grab_code_requests')
      .select(`
        *,
        employee:employees!grab_code_requests_employee_id_fkey(
          id,
          full_name,
          email,
          nik,
          department_id,
          department:department_id(id, name)
        ),
        approved_by_user:employees!grab_code_requests_approved_by_fkey(
          id,
          full_name,
          email
        )
      `, { count: 'exact' })
      .eq('employee_id', userId);

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + Number(limit) - 1);

    if (error) {
      console.error('Error fetching grab code requests:', error);
      return res.status(500).json({ error: 'Failed to fetch grab code requests' });
    }

    res.json({
      grab_code_requests: data,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: count || 0,
        pages: Math.ceil((count || 0) / Number(limit))
      }
    });
  } catch (error) {
    console.error('Error in getGrabCodeRequests:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get all grab code requests (for managers/admins)
export const getAllGrabCodeRequests = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;

    if (!userId || !userRole) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Only HR and Admin can view all grab code requests for approval
    if (!['HR', 'Admin'].includes(userRole)) {
      return res.status(403).json({ error: 'Only HR and Admin can view all grab code requests' });
    }

    const { page = 1, limit = 10, status } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let query = supabaseAdmin
      .from('grab_code_requests')
      .select(`
        *,
        employee:employees!grab_code_requests_employee_id_fkey(
          id,
          full_name,
          email,
          nik,
          department_id,
          department:department_id(id, name)
        ),
        approved_by_user:employees!grab_code_requests_approved_by_fkey(
          id,
          full_name,
          email
        )
      `, { count: 'exact' });

    // HR and Admin can see all grab code requests (no filtering needed)

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + Number(limit) - 1);

    if (error) {
      console.error('Error fetching all grab code requests:', error);
      return res.status(500).json({ error: 'Failed to fetch grab code requests' });
    }

    res.json({
      grab_code_requests: data,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: count || 0,
        pages: Math.ceil((count || 0) / Number(limit))
      }
    });
  } catch (error) {
    console.error('Error in getAllGrabCodeRequests:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update grab code request status (approve/reject)
export const updateGrabCodeRequestStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const userRole = req.user?.role;
    const updateData: UpdateGrabCodeRequestData = req.body;

    console.log('Backend: Received grab code status update request:', {
      id,
      userId,
      userRole,
      updateData
    });

    if (!userId || !userRole) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Only HR and Admin can update grab code request status
    if (!['HR', 'Admin'].includes(userRole)) {
      return res.status(403).json({ error: 'Only HR and Admin can approve grab code requests' });
    }

    // Validate status
    if (updateData.status && !['Pending', 'Approved', 'Rejected'].includes(updateData.status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    // Get the original request to validate codes
    const { data: originalRequest, error: fetchError } = await supabaseAdmin
      .from('grab_code_requests')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !originalRequest) {
      return res.status(404).json({ error: 'Grab code request not found' });
    }

    // Prepare update object
    const updateObject: any = {};
    if (updateData.status) {
      updateObject.status = updateData.status;
      updateObject.approved_by = userId;
      updateObject.approved_at = new Date().toISOString();

      // If approving, validate and set approved codes
      if (updateData.status === 'Approved') {
        console.log('Validating approved codes:', {
          approved_codes: updateData.approved_codes,
          code_needed: originalRequest.code_needed
        });
        
        if (!updateData.approved_codes || !Array.isArray(updateData.approved_codes)) {
          console.log('Error: Approved codes missing or not array');
          return res.status(400).json({ error: 'Approved codes are required when approving request' });
        }

        // Validate that number of codes matches code_needed
        if (updateData.approved_codes.length !== originalRequest.code_needed) {
          console.log('Error: Code count mismatch:', {
            provided: updateData.approved_codes.length,
            required: originalRequest.code_needed
          });
          return res.status(400).json({ 
            error: `Number of codes (${updateData.approved_codes.length}) must match requested amount (${originalRequest.code_needed})` 
          });
        }

        // Validate that all codes are non-empty strings
        const invalidCodes = updateData.approved_codes.filter(code => !code || typeof code !== 'string' || code.trim() === '');
        if (invalidCodes.length > 0) {
          console.log('Error: Invalid codes found:', invalidCodes);
          return res.status(400).json({ error: 'All codes must be non-empty strings' });
        }

        updateObject.approved_codes = updateData.approved_codes;
        console.log('Codes validation passed, setting approved_codes:', updateData.approved_codes);
      }
    }
    if (updateData.rejection_reason) {
      updateObject.rejection_reason = updateData.rejection_reason;
    }

    const { data, error } = await supabaseAdmin
      .from('grab_code_requests')
      .update(updateObject)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating grab code request:', error);
      return res.status(500).json({ error: 'Failed to update grab code request' });
    }

    if (!data) {
      return res.status(404).json({ error: 'Grab code request not found' });
    }

    res.json({
      message: 'Grab code request updated successfully',
      data
    });
  } catch (error) {
    console.error('Error in updateGrabCodeRequestStatus:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get a specific grab code request by ID
// Get all grab code requests for admin dashboard (Admin only)
export const getAllGrabCodeRequestsForDashboard = async (req: AuthRequest, res: Response) => {
  try {
    // Only allow Admin users
    if (req.user!.role !== 'Admin') {
      return res.status(403).json({ error: 'Access denied. Admin role required.' });
    }

    const { page = 1, limit = 100 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const query = supabaseAdmin
      .from('grab_code_requests')
      .select(`
        *,
        employee:employees!grab_code_requests_employee_id_fkey(
          id,
          full_name,
          email,
          nik,
          department_id,
          department:department_id(id, name)
        ),
        approved_by_user:employees!grab_code_requests_approved_by_fkey(
          id,
          full_name,
          email
        )
      `, { count: 'exact' });

    // No status filtering - get ALL requests
    // No employee filtering - get requests from ALL employees

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + Number(limit) - 1);

    if (error) {
      console.error('Error fetching all grab code requests for dashboard:', error);
      return res.status(500).json({ error: 'Failed to fetch grab code requests' });
    }

    res.json({
      grab_code_requests: data,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: count || 0,
        pages: Math.ceil((count || 0) / Number(limit))
      }
    });
  } catch (error) {
    console.error('Error in getAllGrabCodeRequestsForDashboard:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getGrabCodeRequestById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const userRole = req.user?.role;

    if (!userId || !userRole) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { data, error } = await supabaseAdmin
      .from('grab_code_requests')
      .select(`
        *,
        employee:employees!grab_code_requests_employee_id_fkey(
          id,
          full_name,
          email,
          nik,
          department_id,
          department:department_id(id, name)
        ),
        approved_by_user:employees!grab_code_requests_approved_by_fkey(
          id,
          full_name,
          email
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching grab code request:', error);
      return res.status(500).json({ error: 'Failed to fetch grab code request' });
    }

    if (!data) {
      return res.status(404).json({ error: 'Grab code request not found' });
    }

    // Check if user has permission to view this request
    if (userRole === 'Employee' && data.employee_id !== userId) {
      return res.status(403).json({ error: 'You can only view your own requests' });
    }

    res.json(data);
  } catch (error) {
    console.error('Error in getGrabCodeRequestById:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};