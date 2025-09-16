import { Router } from 'express';

const router = Router();

// Simple test routes
router.post('/login', (req, res) => {
  res.json({ message: 'Login endpoint' });
});

router.get('/profile', (req, res) => {
  res.json({ message: 'Profile endpoint' });
});

export default router;