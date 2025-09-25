import { Router } from 'express';
import {
  createDepartment,
  getAllDepartments,
  getDepartmentById,
  updateDepartment,
  deleteDepartment,
  assignEmployeeToDepartment,
  removeEmployeeFromDepartment,
  getUnassignedEmployees,
  getDepartmentEmployees,
  validateDepartmentCreation
} from '../controllers/departmentController';
import { requireAuth, requireHR } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(requireAuth);

// Admin only routes for department management
router.post('/', requireHR, validateDepartmentCreation, createDepartment);
router.put('/:id', requireHR, validateDepartmentCreation, updateDepartment);
router.delete('/:id', requireHR, deleteDepartment);

// Admin only routes for employee-department assignments
router.post('/:departmentId/employees/:employeeId', requireHR, assignEmployeeToDepartment);
router.delete('/:departmentId/employees/:employeeId', requireHR, removeEmployeeFromDepartment);
router.get('/unassigned-employees', requireHR, getUnassignedEmployees);

// All authenticated users can view departments
router.get('/', getAllDepartments);
router.get('/:id', getDepartmentById);
router.get('/:id/employees', getDepartmentEmployees);

export default router;