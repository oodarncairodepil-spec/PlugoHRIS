import { Router } from 'express';
import { login, getProfile, changePassword } from '../controllers/authController';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Public routes
router.post('/login', login);

// Protected routes
router.get('/profile', requireAuth, getProfile);
router.put('/change-password', requireAuth, changePassword);

export default router;