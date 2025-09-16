import { Router } from 'express';
import {
  createLeaveRequest,
  getMyLeaveRequests,
  getLeaveRequestsForApproval,
  approveLeaveRequest,
  rejectLeaveRequest,
  getLeaveTypes,
  validateLeaveRequest
} from '../controllers/leaveController';
import { requireAuth, requireManagerOrHR } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(requireAuth);

// Employee routes
router.post('/', validateLeaveRequest, createLeaveRequest);
router.get('/my-requests', getMyLeaveRequests);
router.get('/types', getLeaveTypes);

// Manager and Admin routes
router.get('/for-approval', requireManagerOrHR, getLeaveRequestsForApproval);
router.put('/:id/approve', requireManagerOrHR, approveLeaveRequest);
router.put('/:id/reject', requireManagerOrHR, rejectLeaveRequest);

export default router;