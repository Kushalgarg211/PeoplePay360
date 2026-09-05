import { Router } from 'express';
import { listUsers, createUser, updateUser } from '../controllers/userController';
import { authenticateToken } from '../middlewares/authMiddleware';
import { isAdmin } from '../middlewares/rbacGuard';

const router = Router();

router.use(authenticateToken, isAdmin);
router.get('/',     listUsers);
router.post('/',    createUser);
router.put('/:id',  updateUser);

export default router;
