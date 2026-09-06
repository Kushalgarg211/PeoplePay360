import { Router } from 'express';
import {
  checkIn,
  checkOut,
  todayStatus,
  getTodayAttendanceForAdmin,
  listAttendance,
  createAttendance,
  updateAttendance,
} from '../controllers/attendanceController';
import { authenticateToken } from '../middlewares/authMiddleware';
import { isAuthenticated, requireRole, isHROrAbove } from '../middlewares/rbacGuard';

const router = Router();
router.use(authenticateToken);

router.post('/check-in',      isAuthenticated, checkIn);
router.post('/check-out',     isAuthenticated, checkOut);
router.get('/today-status',   isAuthenticated, todayStatus);
router.get('/today-map',      isHROrAbove,     getTodayAttendanceForAdmin);
router.get('/',               isAuthenticated, listAttendance);
router.post('/',              isHROrAbove,     createAttendance);
router.put('/:id',            isHROrAbove,     updateAttendance);

export default router;
