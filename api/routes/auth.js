"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authController_1 = require("../controllers/authController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Public routes
router.post('/login', authController_1.login);
// Protected routes
router.get('/profile', auth_1.requireAuth, authController_1.getProfile);
router.put('/change-password', auth_1.requireAuth, authController_1.changePassword);
exports.default = router;
//# sourceMappingURL=auth.js.map