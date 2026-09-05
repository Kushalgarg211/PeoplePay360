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
        id: true, email: true, role: true, status: true, employeeId: true, createdAt: true,
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
    const { email, password, role, employeeId, status } = req.body as {
      email: string; password: string; role: string; employeeId?: string; status?: string;
    };
    if (!email || !password || !role) throw createError('email, password and role are required', 400);

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) throw createError('Email already in use', 409);

    const hash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        id: uuidv4(), email, passwordHash: hash,
        role:       role as any,
        status:     (status ?? 'ACTIVE') as any,
        employeeId: employeeId ?? null,
      },
    });
    res.status(201).json({ success: true, data: { id: user.id, email: user.email, role: user.role } });
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
