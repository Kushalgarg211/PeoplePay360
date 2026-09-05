import { Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../config/database';
import { AuthRequest } from '../types';
import { createError } from '../middlewares/errorHandler';

const EMPLOYEE_SELECT = {
  id: true, firstName: true, lastName: true, workEmail: true, phone: true,
  jobPosition: true, workLocation: true, companyName: true, status: true,
  bankAccountNumber: true, bankName: true, bankIfsc: true, createdAt: true,
  department: { select: { id: true, name: true } },
  manager:    { select: { id: true, firstName: true, lastName: true } },
};

// GET /api/v1/employees/departments
export const listDepartments = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const depts = await prisma.department.findMany({
      orderBy: { name: 'asc' },
    });
    // Attach employee count to each department
    const withCounts = await Promise.all(
      depts.map(async (d) => ({
        ...d,
        employeeCount: await prisma.employee.count({ where: { departmentId: d.id } }),
      }))
    );
    res.json({ success: true, data: withCounts });
  } catch (err) { next(err); }
};

// POST /api/v1/employees/departments
export const createDepartment = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { name } = req.body as { name: string };
    if (!name?.trim()) throw createError('Department name is required', 400);

    const existing = await prisma.department.findFirst({ where: { name: { equals: name.trim() } } });
    if (existing) throw createError('A department with this name already exists', 409);

    const dept = await prisma.department.create({
      data: { id: uuidv4(), name: name.trim() },
    });
    res.status(201).json({ success: true, data: { ...dept, employeeCount: 0 } });
  } catch (err) { next(err); }
};

// PUT /api/v1/employees/departments/:id
export const updateDepartment = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { name } = req.body as { name: string };
    if (!name?.trim()) throw createError('Department name is required', 400);

    const dept = await prisma.department.update({
      where: { id },
      data:  { name: name.trim() },
    });
    const employeeCount = await prisma.employee.count({ where: { departmentId: id } });
    res.json({ success: true, data: { ...dept, employeeCount } });
  } catch (err) { next(err); }
};

// GET /api/v1/employees
export const listEmployees = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { search, departmentId } = req.query as Record<string, string>;
    const employees = await prisma.employee.findMany({
      where: {
        ...(search ? {
          OR: [
            { firstName: { contains: search } },
            { lastName:  { contains: search } },
            { workEmail: { contains: search } },
            { jobPosition: { contains: search } },
          ],
        } : {}),
        ...(departmentId ? { departmentId } : {}),
      },
      select:  EMPLOYEE_SELECT,
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: employees });
  } catch (err) { next(err); }
};

// GET /api/v1/employees/:id
export const getEmployee = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // Scope EMPLOYEE role to own record only
    if (req.user!.role === 'EMPLOYEE' && req.user!.employeeId !== id) {
      throw createError('Access denied', 403);
    }

    const employee = await prisma.employee.findUnique({ where: { id }, select: EMPLOYEE_SELECT });
    if (!employee) throw createError('Employee not found', 404);

    // Smart button metrics
    const [contractsCount, attendanceCount, timeOffCount, allocationsCount] = await Promise.all([
      prisma.contract.count({ where: { employeeId: id } }),
      prisma.attendance.count({ where: { employeeId: id } }),
      prisma.timeOffRequest.count({ where: { employeeId: id } }),
      prisma.timeOffAllocation.count({ where: { employeeId: id } }),
    ]);

    res.json({ success: true, data: { ...employee, contractsCount, attendanceCount, timeOffCount, allocationsCount } });
  } catch (err) { next(err); }
};

// POST /api/v1/employees
export const createEmployee = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const body = req.body as any;
    const employee = await prisma.employee.create({
      data: { id: uuidv4(), ...body },
      select: EMPLOYEE_SELECT,
    });
    res.status(201).json({ success: true, data: employee });
  } catch (err) { next(err); }
};

// PUT /api/v1/employees/:id
export const updateEmployee = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const employee = await prisma.employee.update({
      where:  { id },
      data:   req.body,
      select: EMPLOYEE_SELECT,
    });
    res.json({ success: true, data: employee });
  } catch (err) { next(err); }
};
