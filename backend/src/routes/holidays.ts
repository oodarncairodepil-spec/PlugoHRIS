import express from 'express';
import {
  getHolidays,
  getActiveHolidays,
  getHolidayById,
  createHoliday,
  updateHoliday,
  toggleHolidayStatus,
  deleteHoliday,
} from '../controllers/holidayController';
import { authenticateToken, requireHR } from '../middleware/auth';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Public to authenticated users: list holidays
router.get('/', getHolidays);
router.get('/active', getActiveHolidays);
router.get('/:id', getHolidayById);

// Admin-only mutations
router.post('/', requireHR, createHoliday);
router.put('/:id', requireHR, updateHoliday);
router.patch('/:id/toggle', requireHR, toggleHolidayStatus);
router.delete('/:id', requireHR, deleteHoliday);

export default router;