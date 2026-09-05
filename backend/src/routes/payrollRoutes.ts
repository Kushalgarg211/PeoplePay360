import { Router } from 'express';
import {
  listStructures, createStructure,
  listRules, createRule, updateRule,
  eligibleEmployees,
  listPayruns, getPayrun,
  createPayrun, compute, validatePayrun, markPaid, sendPayslips,
  listMyPayslips, listAllPayslips, getPayslip, getPayslipPdf, sendSinglePayslip,
} from '../controllers/payrollController';
import { authenticateToken } from '../middlewares/authMiddleware';
import { isPayrollOrAbove, isPayrollManager, isAuthenticated } from '../middlewares/rbacGuard';

const router = Router();
router.use(authenticateToken);

// Salary Structures — HR_PAYROLL_USER can READ, Manager can CRUD
router.get('/structures',              isPayrollOrAbove, listStructures);
router.post('/structures',             isPayrollManager, createStructure);

// Salary Rules
router.get('/rules',                   isPayrollOrAbove, listRules);
router.post('/rules',                  isPayrollManager, createRule);
router.put('/rules/:id',               isPayrollManager, updateRule);

// Payruns
router.get('/payruns',                 isPayrollOrAbove, listPayruns);
router.get('/payruns/:id',             isPayrollOrAbove, getPayrun);
router.get('/eligible-employees',      isPayrollOrAbove, eligibleEmployees);
router.post('/payruns',                isPayrollOrAbove, createPayrun);
router.post('/payruns/:id/compute',    isPayrollOrAbove, compute);
router.post('/payruns/:id/validate',   isPayrollManager, validatePayrun);
router.post('/payruns/:id/mark-paid',  isPayrollManager, markPaid);
router.post('/payruns/:id/send-payslips', isPayrollOrAbove, sendPayslips);

// Payslips
router.get('/my-payslips',             isAuthenticated,  listMyPayslips);
router.get('/payslips',                isPayrollOrAbove, listAllPayslips);
router.get('/payslips/:id',            isPayrollOrAbove, getPayslip);
router.get('/payslips/:id/pdf',        isAuthenticated,  getPayslipPdf);
router.post('/payslips/:id/send',       isPayrollOrAbove, sendSinglePayslip);

export default router;
