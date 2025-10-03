"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMyAllRequests = void 0;
const supabase_1 = require("../utils/supabase");
// Get all requests (leave and grab) for the authenticated user with role-based visibility
const getMyAllRequests = async (req, res) => {
    try {
        const userId = req.user?.id;
        const userRole = req.user?.role;
        if (!userId || !userRole) {
            return res.status(401).json({ error: 'User not authenticated' });
        }
        const { page = 1, limit = 10, status, type } = req.query;
        const offset = (Number(page) - 1) * Number(limit);
        let leaveRequests = [];
        let grabRequests = [];
        let businessTripRequests = [];
        let totalLeaveCount = 0;
        let totalGrabCount = 0;
        let totalBusinessTripCount = 0;
        // Fetch leave requests based on role
        if (!type || type === 'leave') {
            let leaveQuery = supabase_1.supabaseAdmin
                .from('leave_requests')
                .select(`
          id, start_date, end_date, days_requested, reason, status, 
          created_at, approved_at, rejection_reason,
          leave_type:leave_type_id(id, name),
          employee:employee_id(id, full_name, email, department_id, department:department_id(id, name)),
          approved_by_user:approved_by(id, full_name)
        `, { count: 'exact' });
            // For 'My Requests' page, all users (including Admin) should only see their own requests
            leaveQuery = leaveQuery.eq('employee_id', userId);
            if (status) {
                leaveQuery = leaveQuery.eq('status', status);
            }
            const { data: leaveData, error: leaveError, count: leaveCount } = await leaveQuery
                .order('created_at', { ascending: false });
            if (leaveError) {
                console.error('Error fetching leave requests:', leaveError);
                return res.status(500).json({ error: 'Failed to fetch leave requests' });
            }
            leaveRequests = (leaveData || []).map(req => ({ ...req, request_type: 'leave' }));
            totalLeaveCount = leaveCount || 0;
        }
        // Fetch grab requests based on role
        if (!type || type === 'grab') {
            let grabQuery = supabase_1.supabaseAdmin
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
            // For 'My Requests' page, all users (including Admin) should only see their own requests
            grabQuery = grabQuery.eq('employee_id', userId);
            if (status) {
                grabQuery = grabQuery.eq('status', status);
            }
            const { data: grabData, error: grabError, count: grabCount } = await grabQuery
                .order('created_at', { ascending: false });
            if (grabError) {
                console.error('Error fetching grab requests:', grabError);
                return res.status(500).json({ error: 'Failed to fetch grab requests' });
            }
            grabRequests = (grabData || []).map(req => ({ ...req, request_type: 'grab' }));
            totalGrabCount = grabCount || 0;
        }
        // Fetch business trip requests
        if (!type || type === 'biztrip') {
            let businessTripQuery = supabase_1.supabaseAdmin
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
            // For 'My Requests' page, show requests where user is the creator
            // TODO: Later we can enhance this to include requests where user is a participant
            businessTripQuery = businessTripQuery.eq('employee_id', userId);
            if (status) {
                businessTripQuery = businessTripQuery.eq('status', status);
            }
            const { data: businessTripData, error: businessTripError, count: businessTripCount } = await businessTripQuery
                .order('created_at', { ascending: false });
            if (businessTripError) {
                console.error('Error fetching business trip requests:', businessTripError);
                return res.status(500).json({ error: 'Failed to fetch business trip requests' });
            }
            businessTripRequests = (businessTripData || []).map(req => ({ ...req, request_type: 'biztrip' }));
            totalBusinessTripCount = businessTripCount || 0;
        }
        // Combine and sort all requests by created_at
        const allRequests = [...leaveRequests, ...grabRequests, ...businessTripRequests]
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        // Apply pagination to combined results
        const paginatedRequests = allRequests.slice(offset, offset + Number(limit));
        const totalCount = totalLeaveCount + totalGrabCount + totalBusinessTripCount;
        res.json({
            requests: paginatedRequests,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total: totalCount,
                pages: Math.ceil(totalCount / Number(limit))
            },
            summary: {
                total_leave_requests: totalLeaveCount,
                total_grab_requests: totalGrabCount,
                total_business_trip_requests: totalBusinessTripCount,
                total_requests: totalCount
            }
        });
    }
    catch (error) {
        console.error('Error in getMyAllRequests:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getMyAllRequests = getMyAllRequests;
//# sourceMappingURL=requestsController.js.map