import { Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../config/database';
import { AuthRequest } from '../types';
import { createError } from '../middlewares/errorHandler';

// GET /api/v1/users
export const listUsers = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true, email: true, role: true, status: true, employeeId: true,
        createdAt: true, lastLoginAt: true,
        employee: { select: { firstName: true, lastName: true, jobPosition: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: users });
  } catch (err) { next(err); }
};

// POST /api/v1/users
export const createUser = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const {
      email, password, role, employeeId, status,
      // Employee profile fields (used when role=EMPLOYEE and no existing employeeId)
      firstName, lastName, departmentId, jobPosition, workLocation, companyName,
    } = req.body as {
      email: string; password: string; role: string; employeeId?: string; status?: string;
      firstName?: string; lastName?: string; departmentId?: string;
      jobPosition?: string; workLocation?: string; companyName?: string;
    };

    if (!email || !password || !role) throw createError('email, password and role are required', 400);

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) throw createError('Email already in use', 409);

    const hash = await bcrypt.hash(password, 10);

    // Resolve the employee to link
    let resolvedEmployeeId = employeeId ?? null;

    // If no existing employee is linked and employee details were provided, create the record
    if (!resolvedEmployeeId && firstName && lastName) {
      const emp = await prisma.employee.create({
        data: {
          id:          uuidv4(),
          firstName:   firstName.trim(),
          lastName:    lastName.trim(),
          workEmail:   email.trim(),
          departmentId: departmentId || null,
          jobPosition: jobPosition || 'Employee',
          workLocation: workLocation || 'Mumbai',
          companyName:  companyName  || 'OxP Pvt Ltd',
          status:      'Active',
        },
      });
      resolvedEmployeeId = emp.id;
    }

    const user = await prisma.user.create({
      data: {
        id: uuidv4(), email, passwordHash: hash,
        role:       role as any,
        status:     (status ?? 'ACTIVE') as any,
        employeeId: resolvedEmployeeId,
      },
      include: { employee: { select: { id: true, firstName: true, lastName: true } } },
    });

    res.status(201).json({
      success: true,
      data: {
        id:         user.id,
        email:      user.email,
        role:       user.role,
        employeeId: user.employeeId,
        name: user.employee
          ? `${user.employee.firstName} ${user.employee.lastName}`
          : email,
      },
    });
  } catch (err) { next(err); }
};

// PUT /api/v1/users/:id
export const updateUser = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { role, status } = req.body as { role?: string; status?: string };

    // Security: prevent self-modification
    if (id === req.user!.userId) throw createError('You cannot modify your own account', 403);

    const updated = await prisma.user.update({
      where: { id },
      data:  {
        ...(role   ? { role:   role   as any } : {}),
        ...(status ? { status: status as any } : {}),
      },
      select: { id: true, email: true, role: true, status: true },
    });
    res.json({ success: true, data: updated });
  } catch (err) { next(err); }
};
