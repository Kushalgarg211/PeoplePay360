import { Router } from 'express';
import { listEmployees, getEmployee, createEmployee, updateEmployee, listDepartments, createDepartment, updateDepartment } from '../controllers/employeeController';
import { authenticateToken } from '../middlewares/authMiddleware';
import { isHROrAbove, requireRole } from '../middlewares/rbacGuard';

const router = Router();
router.use(authenticateToken);

router.get('/departments',      requireRole(['ADMIN','HR_MANAGER','HR_PAYROLL_USER','HR_PAYROLL_MANAGER','EMPLOYEE']), listDepartments);
router.post('/departments',     isHROrAbove, createDepartment);
router.put('/departments/:id',  isHROrAbove, updateDepartment);

// All authenticated roles can GET employees (with Employee scoping in controller)
router.get('/',     requireRole(['ADMIN','HR_MANAGER','HR_PAYROLL_USER','HR_PAYROLL_MANAGER','EMPLOYEE']), listEmployees);
router.get('/:id',  requireRole(['ADMIN','HR_MANAGER','HR_PAYROLL_USER','HR_PAYROLL_MANAGER','EMPLOYEE']), getEmployee);
router.post('/',    isHROrAbove, createEmployee);
router.put('/:id',  isHROrAbove, updateEmployee);

export default router;
