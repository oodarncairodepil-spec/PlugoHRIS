"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const employeeController_1 = require("../controllers/employeeController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_1.requireAuth);
// Admin only routes
router.post('/', auth_1.requireHR, employeeController_1.validateEmployeeCreation, employeeController_1.createEmployee);
router.put('/:id', auth_1.requireHR, employeeController_1.updateEmployee);
router.post('/:id/generate-password', auth_1.requireHR, employeeController_1.generateNewPassword);
router.get('/managers/list', auth_1.requireHR, employeeController_1.getAllManagers);
// Manager and Admin routes
router.get('/', auth_1.requireManagerOrHR, employeeController_1.getAllEmployees);
router.get('/:id', auth_1.requireManagerOrHR, employeeController_1.getEmployeeById);
exports.default = router;
//# sourceMappingURL=employees.js.map