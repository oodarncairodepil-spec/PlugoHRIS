"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = exports.requireManagerOrHR = exports.requireHR = exports.requireRole = exports.authenticateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const supabase_1 = require("../utils/supabase");
const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        // Fetch user details from Supabase
        const { data: employee, error } = await supabase_1.supabase
            .from('employees')
            .select('id, email, role, full_name, status')
            .eq('id', decoded.userId)
            .eq('status', 'Active')
            .single();
        if (error || !employee) {
            return res.status(401).json({ error: 'Invalid token or inactive user' });
        }
        req.user = {
            id: employee.id,
            email: employee.email,
            role: employee.role,
            full_name: employee.full_name
        };
        next();
    }
    catch (error) {
        return res.status(403).json({ error: 'Invalid or expired token' });
    }
};
exports.authenticateToken = authenticateToken;
const requireRole = (roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }
        next();
    };
};
exports.requireRole = requireRole;
// Middleware specifically for Admin operations
exports.requireHR = (0, exports.requireRole)(['Admin']);
// Middleware for Manager and Admin operations
exports.requireManagerOrHR = (0, exports.requireRole)(['Manager', 'Admin']);
// Middleware for all authenticated users
exports.requireAuth = exports.authenticateToken;
//# sourceMappingURL=auth.js.map