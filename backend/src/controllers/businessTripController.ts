import { Response } from 'express';
import { supabaseAdmin } from '../utils/supabase';
import { AuthRequest } from '../middleware/auth';

// Create a new business trip request
export const createBusinessTripRequest = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { destination, start_date, end_date, events, participants } = req.body;

    // Validate required fields
    if (!destination || !start_date || !end_date) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Validate date range
    if (new Date(start_date) > new Date(end_date)) {
      return res.status(400).json({ error: 'End date must be after start date' });
    }

    // Validate events
    if (!events || !Array.isArray(events) || events.length === 0) {
      return res.status(400).json({ error: 'At least one event is required' });
    }

    // Create the main business trip request (purpose is stored in events, not main table)
    const { data: tripRequest, error: tripError } = await supabaseAdmin
      .from('business_trip_requests')
      .insert({
        employee_id: userId,
        destination,
        start_date,
        end_date,
        status: 'Pending'
      })
      .select('id')
      .single();

    if (tripError) {
      console.error('Error creating business trip request:', tripError);
      return res.status(500).json({ error: 'Failed to create business trip request' });
    }

    const tripRequestId = tripRequest.id;

    // Create events
    const eventPromises = events.map(async (event: any) => {
      const { data, error } = await supabaseAdmin
        .from('business_trip_events')
        .insert({
          business_trip_request_id: tripRequestId,
          event_name: event.event_name,
          agenda: event.agenda || '',
          event_date: `${event.start_date} to ${event.end_date}`,
          event_time: `${event.start_time || ''} - ${event.end_time || ''}`,
          meeting_location: event.location
        });
      
      if (error) {
        console.error('Error creating event:', error);
        throw error;
      }
      return data;
    });

    await Promise.all(eventPromises);

    // Create participants if any
    if (participants && Array.isArray(participants) && participants.length > 0) {
      const participantPromises = participants.map(async (participant: any) => {
        // Handle both string IDs and objects with employee_id property
        let employeeId: string;
        if (typeof participant === 'string') {
          employeeId = participant;
        } else if (participant && typeof participant === 'object' && participant.employee_id) {
          employeeId = participant.employee_id;
        } else {
          console.error('Invalid participant format:', participant);
          throw new Error('Invalid participant format');
        }
        
        // Ensure employeeId is a valid UUID string
        if (!employeeId || typeof employeeId !== 'string') {
          console.error('Invalid employee_id:', employeeId);
          throw new Error('Invalid employee_id format');
        }
        
        const { data, error } = await supabaseAdmin
          .from('business_trip_participants')
          .insert({
            business_trip_request_id: tripRequestId,
            employee_id: employeeId
          });
        
        if (error) {
          console.error('Error creating participant:', error);
          throw error;
        }
        return data;
      });

      await Promise.all(participantPromises);
    }

    // Fetch the complete request with related data
    const { data: completeRequest, error: fetchError } = await supabaseAdmin
      .from('business_trip_requests')
      .select(`
        id, destination, start_date, end_date, status, created_at,
        employee:employee_id(id, full_name, email),
        events:business_trip_events(*),
        participants:business_trip_participants(
          employee:employee_id(id, full_name, email)
        )
      `)
      .eq('id', tripRequestId)
      .single();

    if (fetchError) {
      console.error('Error fetching complete request:', fetchError);
      return res.status(500).json({ error: 'Request created but failed to fetch details' });
    }

    res.status(201).json({
      message: 'Business trip request created successfully',
      request: completeRequest
    });
  } catch (error) {
    console.error('Create business trip request error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get business trip requests for the authenticated user
export const getMyBusinessTripRequests = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { page = 1, limit = 10, status } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let query = supabaseAdmin
      .from('business_trip_requests')
      .select(`
        id, destination, start_date, end_date, status, created_at, approved_at, rejection_reason,
        employee:employee_id(id, full_name, email),
        approved_by_user:approved_by(id, full_name),
        events:business_trip_events(*),
        participants:business_trip_participants(
          employee:employee_id(id, full_name, email)
        )
      `, { count: 'exact' })
      .or(`employee_id.eq.${userId},business_trip_participants.employee_id.eq.${userId}`);

    if (status) {
      query = query.eq('status', status);
    }

    const { data: requests, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + Number(limit) - 1);

    if (error) {
      console.error('Error fetching business trip requests:', error);
      return res.status(500).json({ error: 'Failed to fetch business trip requests' });
    }

    res.json({
      business_trip_requests: requests,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: count || 0,
        pages: Math.ceil((count || 0) / Number(limit))
      }
    });
  } catch (error) {
    console.error('Get my business trip requests error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get business trip requests for approval (Manager/Admin)
export const getBusinessTripRequestsForApproval = async (req: AuthRequest, res: Response) => {
  try {
    const userRole = req.user?.role;
    const userId = req.user?.id;

    if (!userId || !userRole) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!['Admin', 'HR', 'Manager'].includes(userRole)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { page = 1, limit = 10, status = 'Pending' } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let query = supabaseAdmin
      .from('business_trip_requests')
      .select(`
        id, destination, start_date, end_date, status, created_at, approved_at, rejection_reason,
        employee:employee_id(id, full_name, email, department_id, department:department_id(id, name)),
        approved_by_user:approved_by(id, full_name),
        events:business_trip_events(*),
        participants:business_trip_participants(
          employee:employee_id(id, full_name, email)
        )
      `, { count: 'exact' });

    // If user is Manager (not Admin/HR), only show their subordinates' requests
    if (userRole === 'Manager') {
      const { data: subordinates } = await supabaseAdmin
        .from('employees')
        .select('id')
        .eq('manager_id', userId);

      if (!subordinates || subordinates.length === 0) {
        return res.json({
          business_trip_requests: [],
          pagination: { page: 1, limit: Number(limit), total: 0, pages: 0 }
        });
      }

      const subordinateIds = subordinates.map(s => s.id);
      query = query.in('employee_id', subordinateIds);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data: requests, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + Number(limit) - 1);

    if (error) {
      console.error('Error fetching business trip requests for approval:', error);
      return res.status(500).json({ error: 'Failed to fetch business trip requests' });
    }

    res.json({
      business_trip_requests: requests,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: count || 0,
        pages: Math.ceil((count || 0) / Number(limit))
      }
    });
  } catch (error) {
    console.error('Get business trip requests for approval error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Approve a business trip request
export const approveBusinessTripRequest = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const userRole = req.user?.role;

    if (!userId || !userRole) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!['Admin', 'HR', 'Manager'].includes(userRole)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { data: request, error: fetchError } = await supabaseAdmin
      .from('business_trip_requests')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !request) {
      return res.status(404).json({ error: 'Business trip request not found' });
    }

    if (request.status !== 'Pending') {
      return res.status(400).json({ error: 'Only pending requests can be approved' });
    }

    const { data: updatedRequest, error: updateError } = await supabaseAdmin
      .from('business_trip_requests')
      .update({
        status: 'Approved',
        approved_by: userId,
        approved_at: new Date().toISOString()
      })
      .eq('id', id)
      .select(`
        id, destination, start_date, end_date, status, created_at, approved_at,
        employee:employee_id(id, full_name, email),
        approved_by_user:approved_by(id, full_name)
      `)
      .single();

    if (updateError) {
      console.error('Error approving business trip request:', updateError);
      return res.status(500).json({ error: 'Failed to approve business trip request' });
    }

    res.json({
      message: 'Business trip request approved successfully',
      request: updatedRequest
    });
  } catch (error) {
    console.error('Approve business trip request error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Reject a business trip request
export const rejectBusinessTripRequest = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { rejection_reason } = req.body;
    const userId = req.user?.id;
    const userRole = req.user?.role;

    if (!userId || !userRole) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!['Admin', 'HR', 'Manager'].includes(userRole)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!rejection_reason) {
      return res.status(400).json({ error: 'Rejection reason is required' });
    }

    const { data: request, error: fetchError } = await supabaseAdmin
      .from('business_trip_requests')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !request) {
      return res.status(404).json({ error: 'Business trip request not found' });
    }

    if (request.status !== 'Pending') {
      return res.status(400).json({ error: 'Only pending requests can be rejected' });
    }

    const { data: updatedRequest, error: updateError } = await supabaseAdmin
      .from('business_trip_requests')
      .update({
        status: 'Rejected',
        approved_by: userId,
        approved_at: new Date().toISOString(),
        rejection_reason
      })
      .eq('id', id)
      .select(`
        id, destination, start_date, end_date, status, created_at, approved_at, rejection_reason,
        employee:employee_id(id, full_name, email),
        approved_by_user:approved_by(id, full_name)
      `)
      .single();

    if (updateError) {
      console.error('Error rejecting business trip request:', updateError);
      return res.status(500).json({ error: 'Failed to reject business trip request' });
    }

    res.json({
      message: 'Business trip request rejected successfully',
      request: updatedRequest
    });
  } catch (error) {
    console.error('Reject business trip request error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Cancel a business trip request (Employee only)
export const cancelBusinessTripRequest = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { data: request, error: fetchError } = await supabaseAdmin
      .from('business_trip_requests')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !request) {
      return res.status(404).json({ error: 'Business trip request not found' });
    }

    // Only the employee who created the request can cancel it
    if (request.employee_id !== userId) {
      return res.status(403).json({ error: 'You can only cancel your own requests' });
    }

    if (request.status !== 'Pending') {
      return res.status(400).json({ error: 'Only pending requests can be cancelled' });
    }

    const { data: updatedRequest, error: updateError } = await supabaseAdmin
      .from('business_trip_requests')
      .update({
        status: 'Cancelled'
      })
      .eq('id', id)
      .select(`
        id, destination, start_date, end_date, status, created_at,
        employee:employee_id(id, full_name, email)
      `)
      .single();

    if (updateError) {
      console.error('Error cancelling business trip request:', updateError);
      return res.status(500).json({ error: 'Failed to cancel business trip request' });
    }

    res.json({
      message: 'Business trip request cancelled successfully',
      request: updatedRequest
    });
  } catch (error) {
    console.error('Cancel business trip request error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get all business trip requests for dashboard (Admin/HR only)
export const getAllBusinessTripRequestsForDashboard = async (req: AuthRequest, res: Response) => {
  try {
    const userRole = req.user?.role;
    const userId = req.user?.id;

    if (!userId || !userRole) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!['Admin', 'HR'].includes(userRole)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { page = 1, limit = 100 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const { data: requests, error, count } = await supabaseAdmin
      .from('business_trip_requests')
      .select(`
        id, destination, start_date, end_date, status, created_at, approved_at, rejection_reason,
        employee:employee_id(id, full_name, email, department_id, department:department_id(id, name)),
        approved_by_user:approved_by(id, full_name),
        events:business_trip_events(*),
        participants:business_trip_participants(
          employee:employee_id(id, full_name, email)
        )
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + Number(limit) - 1);

    if (error) {
      console.error('Error fetching business trip requests for dashboard:', error);
      return res.status(500).json({ error: 'Failed to fetch business trip requests' });
    }

    res.json({
      business_trip_requests: requests || [],
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: count || 0,
        pages: Math.ceil((count || 0) / Number(limit))
      }
    });
  } catch (error) {
    console.error('Get all business trip requests for dashboard error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};