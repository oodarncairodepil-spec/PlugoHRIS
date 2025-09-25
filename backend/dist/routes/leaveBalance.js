"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const leaveBalanceController_1 = require("../controllers/leaveBalanceController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_1.requireAuth);
// Temporarily allow all authenticated users to access leave balance data
router.get('/', leaveBalanceController_1.getLeaveBalanceData);
router.post('/calculate', auth_1.requireHR, leaveBalanceController_1.calculateLeaveBalances);
router.get('/rules', leaveBalanceController_1.getLeaveBalanceRules);
exports.default = router;
//# sourceMappingURL=leaveBalance.js.map