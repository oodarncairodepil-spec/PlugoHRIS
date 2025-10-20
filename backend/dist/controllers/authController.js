"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.changePassword = exports.getProfile = exports.login = exports.hashPassword = exports.generateRandomPassword = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const supabase_1 = require("../utils/supabase");
// Generate JWT token
const generateToken = (userId) => {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error('JWT_SECRET not configured');
    }
    return jsonwebtoken_1.default.sign({ userId }, secret, {
        expiresIn: '24h'
    });
};
// Generate random password
const generateRandomPassword = () => {
    const length = 12;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    // Ensure at least one character from each type
    password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)];
    password += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)];
    password += '0123456789'[Math.floor(Math.random() * 10)];
    password += '!@#$%^&*'[Math.floor(Math.random() * 8)];
    // Fill the rest randomly
    for (let i = 4; i < length; i++) {
        password += charset[Math.floor(Math.random() * charset.length)];
    }
    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
};
exports.generateRandomPassword = generateRandomPassword;
// Hash password
const hashPassword = async (password) => {
    const saltRounds = 12;
    return await bcryptjs_1.default.hash(password, saltRounds);
};
exports.hashPassword = hashPassword;
// Login controller
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }
        // Find user by email
        const { data: employee, error } = await supabase_1.supabase
            .from('employees')
            .select('id, email, password_hash, role, full_name, status')
            .eq('email', email.toLowerCase())
            .single();
        if (error || !employee) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        if (employee.status !== 'Active') {
            return res.status(401).json({ error: 'Account is inactive' });
        }
        // Guard: missing password_hash should not cause 500
        if (!employee.password_hash) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        // Verify password
        const isValidPassword = await bcryptjs_1.default.compare(password, employee.password_hash);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        // Generate token
        let token;
        try {
            token = generateToken(employee.id);
        }
        catch (e) {
            console.error('Login token generation error:', e);
            return res.status(500).json({ error: 'Server misconfiguration: JWT secret missing' });
        }
        res.json({
            message: 'Login successful',
            token,
            user: {
                id: employee.id,
                email: employee.email,
                role: employee.role,
                full_name: employee.full_name
            }
        });
    }
    catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.login = login;
// Get current user profile
const getProfile = async (req, res) => {
    try {
        const { data: employee, error } = await supabase_1.supabase
            .from('employees')
            .select(`
        id, full_name, email, nik, department_id, employment_type, 
        leave_balance, status, start_date, role, created_at,
        manager:manager_id(id, full_name, email),
        department:department_id(id, name)
      `)
            .eq('id', req.user.id)
            .single();
        if (error) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json({ user: employee });
    }
    catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getProfile = getProfile;
// Change password
const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Current password and new password are required' });
        }
        if (newPassword.length < 8) {
            return res.status(400).json({ error: 'New password must be at least 8 characters long' });
        }
        // Get current password hash
        const { data: employee, error } = await supabase_1.supabase
            .from('employees')
            .select('password_hash')
            .eq('id', req.user.id)
            .single();
        if (error || !employee) {
            return res.status(404).json({ error: 'User not found' });
        }
        // Verify current password
        const isValidPassword = await bcryptjs_1.default.compare(currentPassword, employee.password_hash);
        if (!isValidPassword) {
            return res.status(400).json({ error: 'Current password is incorrect' });
        }
        // Hash new password
        const newPasswordHash = await (0, exports.hashPassword)(newPassword);
        // Update password
        const { error: updateError } = await supabase_1.supabase
            .from('employees')
            .update({ password_hash: newPasswordHash })
            .eq('id', req.user.id);
        if (updateError) {
            return res.status(500).json({ error: 'Failed to update password' });
        }
        res.json({ message: 'Password updated successfully' });
    }
    catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.changePassword = changePassword;
//# sourceMappingURL=authController.js.map