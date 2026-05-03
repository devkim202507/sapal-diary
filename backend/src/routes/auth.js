import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { getMe, login, signup } from '../controllers/authController.js';

const router = Router();

router.post('/signup', signup);
router.post('/login', login);
router.get('/me', authMiddleware, getMe);

export default router;
