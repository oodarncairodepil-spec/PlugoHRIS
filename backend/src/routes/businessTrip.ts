import { Router } from 'express';
import {
  createBusinessTripRequest,
  getMyBusinessTripRequests,
  getBusinessTripRequestsForApproval,
  approveBusinessTripRequest,
  rejectBusinessTripRequest,
  cancelBusinessTripRequest,
  getAllBusinessTripRequestsForDashboard
} from '../controllers/businessTripController';
import { requireAuth, requireManagerOrHR } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(requireAuth);

// Employee routes
router.post('/', createBusinessTripRequest);
router.get('/my-requests', getMyBusinessTripRequests);
router.put('/:id/cancel', cancelBusinessTripRequest);

// Manager and Admin routes
router.get('/for-approval', requireManagerOrHR, getBusinessTripRequestsForApproval);
router.put('/:id/approve', requireManagerOrHR, approveBusinessTripRequest);
router.put('/:id/reject', requireManagerOrHR, rejectBusinessTripRequest);

// Dashboard routes (Admin/HR only)
router.get('/dashboard/all', requireManagerOrHR, getAllBusinessTripRequestsForDashboard);

export default router;