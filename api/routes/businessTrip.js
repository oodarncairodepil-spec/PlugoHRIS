"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const businessTripController_1 = require("../controllers/businessTripController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_1.requireAuth);
// Employee routes
router.post('/', businessTripController_1.createBusinessTripRequest);
router.get('/my-requests', businessTripController_1.getMyBusinessTripRequests);
router.put('/:id/cancel', businessTripController_1.cancelBusinessTripRequest);
// Manager and Admin routes
router.get('/for-approval', auth_1.requireManagerOrHR, businessTripController_1.getBusinessTripRequestsForApproval);
router.put('/:id/approve', auth_1.requireManagerOrHR, businessTripController_1.approveBusinessTripRequest);
router.put('/:id/reject', auth_1.requireManagerOrHR, businessTripController_1.rejectBusinessTripRequest);
// Dashboard routes (Admin/HR only)
router.get('/dashboard/all', auth_1.requireManagerOrHR, businessTripController_1.getAllBusinessTripRequestsForDashboard);
exports.default = router;
//# sourceMappingURL=businessTrip.js.map