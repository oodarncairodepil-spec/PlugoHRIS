"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const router = (0, express_1.Router)();
// Simple test routes
router.post('/login', (req, res) => {
    res.json({ message: 'Login endpoint' });
});
router.get('/profile', (req, res) => {
    res.json({ message: 'Profile endpoint' });
});
exports.default = router;
//# sourceMappingURL=simple-auth.js.map