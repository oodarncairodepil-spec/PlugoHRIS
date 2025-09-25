"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const grabCodeController_1 = require("../controllers/grabCodeController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_1.authenticateToken);
// Employee routes
router.post('/', grabCodeController_1.createGrabCodeRequest); // Create new grab code request
router.get('/my-requests', grabCodeController_1.getGrabCodeRequests); // Get user's own requests
router.get('/:id', grabCodeController_1.getGrabCodeRequestById); // Get specific request by ID
// HR/Admin routes
router.get('/', (0, auth_1.requireRole)(['HR', 'Admin']), grabCodeController_1.getAllGrabCodeRequests); // Get all requests
router.put('/:id/status', (0, auth_1.requireRole)(['HR', 'Admin']), grabCodeController_1.updateGrabCodeRequestStatus); // Update request status
exports.default = router;
//# sourceMappingURL=grabCodeRoutes.js.map