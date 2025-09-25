import { Router } from 'express';
import { getMyAllRequests } from '../controllers/requestsController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Get all requests (leave and grab) for the authenticated user
router.get('/my-requests', getMyAllRequests);

export default router;