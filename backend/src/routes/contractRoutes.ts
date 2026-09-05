import { Router } from 'express';
import { listContracts, createContract, updateContract } from '../controllers/contractController';
import { authenticateToken } from '../middlewares/authMiddleware';
import { isHROrAbove } from '../middlewares/rbacGuard';

const router = Router();
router.use(authenticateToken, isHROrAbove);

router.get('/',     listContracts);
router.post('/',    createContract);
router.put('/:id',  updateContract);

export default router;
