import { Router } from 'express';
import {
  createEmployee,
  getAllEmployees,
  getEmployeeById,
  updateEmployee,
  generateNewPassword,
  getAllManagers,
  validateEmployeeCreation
} from '../controllers/employeeController';
import { requireAuth, requireHR, requireManagerOrHR } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(requireAuth);

// Admin only routes
router.post('/', requireHR, validateEmployeeCreation, createEmployee);
router.put('/:id', requireHR, updateEmployee);
router.post('/:id/generate-password', requireHR, generateNewPassword);
router.get('/managers/list', requireHR, getAllManagers);

// Manager and Admin routes
router.get('/', requireManagerOrHR, getAllEmployees);
router.get('/:id', requireManagerOrHR, getEmployeeById);

export default router;