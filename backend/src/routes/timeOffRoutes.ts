import { Router } from 'express';
import {
  listTypes, createType,
  listAllocations, createAllocation, approveAllocation, refuseAllocation,
  listRequests, createRequest, approveRequest, refuseRequest,
} from '../controllers/timeOffController';
import { authenticateToken } from '../middlewares/authMiddleware';
import { isAuthenticated, isHROrAbove, isManagerOrHR } from '../middlewares/rbacGuard';

const router = Router();
router.use(authenticateToken);

// Types
router.get('/types',                    isAuthenticated, listTypes);
router.post('/types',                   isHROrAbove,     createType);

// Allocations
router.get('/allocations',              isAuthenticated,  listAllocations);
router.post('/allocations',             isHROrAbove,      createAllocation);
router.post('/allocations/:id/approve', isHROrAbove,      approveAllocation);
router.post('/allocations/:id/refuse',  isHROrAbove,      refuseAllocation);

// Requests
router.get('/requests',                 isAuthenticated,  listRequests);
router.post('/requests',                isAuthenticated,  createRequest);
router.post('/requests/:id/approve',    isManagerOrHR,    approveRequest);
router.post('/requests/:id/refuse',     isManagerOrHR,    refuseRequest);

export default router;
