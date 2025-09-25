import { Router } from 'express';
import {
  createGrabCodeRequest,
  getGrabCodeRequests,
  getAllGrabCodeRequests,
  getAllGrabCodeRequestsForDashboard,
  updateGrabCodeRequestStatus,
  getGrabCodeRequestById
} from '../controllers/grabCodeController';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Employee routes
router.post('/', createGrabCodeRequest); // Create new grab code request
router.get('/my-requests', getGrabCodeRequests); // Get user's own requests
router.get('/:id', getGrabCodeRequestById); // Get specific request by ID

// HR/Admin routes
router.get('/', requireRole(['HR', 'Admin']), getAllGrabCodeRequests); // Get all requests
router.get('/dashboard/all', requireRole(['Admin']), getAllGrabCodeRequestsForDashboard); // Get all requests for admin dashboard
router.put('/:id/status', requireRole(['HR', 'Admin']), updateGrabCodeRequestStatus); // Update request status

export default router;