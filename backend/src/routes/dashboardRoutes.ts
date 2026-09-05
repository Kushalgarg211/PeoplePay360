import { Router } from 'express';
import { getDashboardMetrics } from '../controllers/dashboardController';
import { authenticateToken } from '../middlewares/authMiddleware';
import { isPayrollOrAbove } from '../middlewares/rbacGuard';

const router = Router();

router.get('/metrics', authenticateToken, isPayrollOrAbove, getDashboardMetrics);

export default router;
