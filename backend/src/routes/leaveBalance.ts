import { Router } from 'express';
import {
  getLeaveBalanceData,
  calculateLeaveBalances,
  getLeaveBalanceRules
} from '../controllers/leaveBalanceController';
import { requireAuth, requireHR } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(requireAuth);

// Temporarily allow all authenticated users to access leave balance data
router.get('/', getLeaveBalanceData);
router.post('/calculate', requireHR, calculateLeaveBalances);
router.get('/rules', getLeaveBalanceRules);

export default router;