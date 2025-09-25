"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const leaveController_1 = require("../controllers/leaveController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_1.requireAuth);
// Employee routes
router.post('/', leaveController_1.validateLeaveRequest, leaveController_1.createLeaveRequest);
router.get('/my-requests', leaveController_1.getMyLeaveRequests);
router.get('/types', leaveController_1.getLeaveTypes);
// Manager and Admin routes
router.get('/for-approval', auth_1.requireManagerOrHR, leaveController_1.getLeaveRequestsForApproval);
router.put('/:id/approve', auth_1.requireManagerOrHR, leaveController_1.approveLeaveRequest);
router.put('/:id/reject', auth_1.requireManagerOrHR, leaveController_1.rejectLeaveRequest);
exports.default = router;
//# sourceMappingURL=leaves.js.map