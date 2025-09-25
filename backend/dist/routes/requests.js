"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const requestsController_1 = require("../controllers/requestsController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_1.authenticateToken);
// Get all requests (leave and grab) for the authenticated user
router.get('/my-requests', requestsController_1.getMyAllRequests);
exports.default = router;
//# sourceMappingURL=requests.js.map