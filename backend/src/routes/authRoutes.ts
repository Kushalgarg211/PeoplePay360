import { Router } from 'express';
import { login, getMe, forgotPassword, resetPassword } from '../controllers/authController';
import { authenticateToken } from '../middlewares/authMiddleware';

const router = Router();

router.post('/login',           login);
router.get('/me',               authenticateToken, getMe);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password',  resetPassword);

export default router;

