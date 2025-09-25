"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const departmentController_1 = require("../controllers/departmentController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_1.requireAuth);
// Admin only routes for department management
router.post('/', auth_1.requireHR, departmentController_1.validateDepartmentCreation, departmentController_1.createDepartment);
router.put('/:id', auth_1.requireHR, departmentController_1.validateDepartmentCreation, departmentController_1.updateDepartment);
router.delete('/:id', auth_1.requireHR, departmentController_1.deleteDepartment);
// Admin only routes for employee-department assignments
router.post('/:departmentId/employees/:employeeId', auth_1.requireHR, departmentController_1.assignEmployeeToDepartment);
router.delete('/:departmentId/employees/:employeeId', auth_1.requireHR, departmentController_1.removeEmployeeFromDepartment);
router.get('/unassigned-employees', auth_1.requireHR, departmentController_1.getUnassignedEmployees);
// All authenticated users can view departments
router.get('/', departmentController_1.getAllDepartments);
router.get('/:id', departmentController_1.getDepartmentById);
router.get('/:id/employees', departmentController_1.getDepartmentEmployees);
exports.default = router;
//# sourceMappingURL=departments.js.map