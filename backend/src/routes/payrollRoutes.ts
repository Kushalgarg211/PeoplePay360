import { Router } from 'express';
import {
  listStructures, createStructure,
  eligibleEmployees,
  createPayrun, compute, validatePayrun, markPaid, sendPayslips,
  getPayslip, getPayslipPdf,
} from '../controllers/payrollController';
import { authenticateToken } from '../middlewares/authMiddleware';
import { isPayrollOrAbove, isPayrollManager } from '../middlewares/rbacGuard';

const router = Router();
router.use(authenticateToken);

// Salary Structures — HR_PAYROLL_USER can READ, Manager can CRUD
router.get('/structures',              isPayrollOrAbove, listStructures);
router.post('/structures',             isPayrollManager, createStructure);

// Payruns
router.get('/eligible-employees',      isPayrollOrAbove, eligibleEmployees);
router.post('/payruns',                isPayrollOrAbove, createPayrun);
router.post('/payruns/:id/compute',    isPayrollOrAbove, compute);
router.post('/payruns/:id/validate',   isPayrollManager, validatePayrun);
router.post('/payruns/:id/mark-paid',  isPayrollManager, markPaid);
router.post('/payruns/:id/send-payslips', isPayrollOrAbove, sendPayslips);

// Payslips
router.get('/payslips/:id',            isPayrollOrAbove, getPayslip);
router.get('/payslips/:id/pdf',        isPayrollOrAbove, getPayslipPdf);

export default router;
