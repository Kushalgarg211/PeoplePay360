import { Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../config/database';
import { ENV } from '../config/env';
import { AuthRequest, JwtPayload } from '../types';
import { createError } from '../middlewares/errorHandler';

// POST /api/v1/auth/login
export const login = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body as { email: string; password: string };
    if (!email || !password) throw createError('Email and password are required', 400);

    const user = await prisma.user.findUnique({
      where:   { email },
      include: { employee: { select: { id: true, firstName: true, lastName: true } } },
    });

    if (!user) throw createError('Invalid credentials', 401);
    if (user.status === 'INACTIVE') throw createError('Account is inactive', 403);

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw createError('Invalid credentials', 401);

    const payload: JwtPayload = {
      userId:     user.id,
      email:      user.email,
      role:       user.role,
      employeeId: user.employeeId ?? null,
    };

    const token = jwt.sign(payload, ENV.JWT_SECRET as string, { expiresIn: ENV.JWT_EXPIRES_IN as any });

    res.json({
      success: true,
      data: {
        token,
        user: {
          id:         user.id,
          email:      user.email,
          role:       user.role,
          employeeId: user.employeeId,
          name: user.employee ? `${user.employee.firstName} ${user.employee.lastName}` : user.email,
        },
      },
    });
  } catch (err) { next(err); }
};

// GET /api/v1/auth/me
export const getMe = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where:   { id: req.user!.userId },
      select:  { id: true, email: true, role: true, status: true, employeeId: true, createdAt: true,
                 employee: { select: { id: true, firstName: true, lastName: true, jobPosition: true } } },
    });
    if (!user) throw createError('User not found', 404);
    res.json({ success: true, data: user });
  } catch (err) { next(err); }
};
