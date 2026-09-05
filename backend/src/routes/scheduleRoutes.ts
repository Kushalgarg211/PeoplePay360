import { Router } from 'express';
import { listSchedules, createSchedule, updateSchedule } from '../controllers/scheduleController';
import { authenticateToken } from '../middlewares/authMiddleware';
import { isAuthenticated, isHROrAbove } from '../middlewares/rbacGuard';

const router = Router();
router.use(authenticateToken);

router.get('/',     isAuthenticated, listSchedules);
router.post('/',    isHROrAbove,     createSchedule);
router.put('/:id',  isHROrAbove,     updateSchedule);

export default router;
