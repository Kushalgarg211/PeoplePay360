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

// POST /api/v1/auth/forgot-password
export const forgotPassword = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body as { email: string };
    if (!email) throw createError('Email is required', 400);

    // 1. Try to find user by login email first
    let user = await prisma.user.findUnique({
      where:   { email },
      include: { employee: { select: { firstName: true, lastName: true, workEmail: true } } },
    });

    // 2. If not found by login email, search by employee workEmail
    if (!user) {
      const employee = await prisma.employee.findFirst({
        where:   { workEmail: email },
        include: { user: { include: { employee: { select: { firstName: true, lastName: true, workEmail: true } } } } },
      });
      if (employee?.user) {
        user = employee.user as any;
      }
    }

    // Always respond 200 even if user not found (security best practice)
    if (!user) {
      console.log(`[ForgotPassword] No user found for: ${email}`);
      return res.json({ success: true, message: 'If that email is registered, a reset link has been sent.' });
    }

    // Sign a reset token using secret + current password hash (auto-invalidates after password change)
    const resetSecret = ENV.JWT_SECRET + user.passwordHash;
    const resetToken  = jwt.sign({ userId: user.id, email: user.email }, resetSecret, { expiresIn: '1h' });
    const resetLink   = `${ENV.APP_URL}/reset-password?token=${encodeURIComponent(resetToken)}&uid=${user.id}`;

    const { sendPasswordResetEmail } = await import('../services/emailService');
    const name = user.employee
      ? `${user.employee.firstName} ${user.employee.lastName}`
      : user.email;

    // Send to all known addresses: login email + work email (if different) + the address they typed
    const toAddresses = new Set<string>([user.email, email]);
    if (user.employee?.workEmail) toAddresses.add(user.employee.workEmail);

    for (const toAddr of toAddresses) {
      console.log(`[ForgotPassword] Sending reset email to: ${toAddr}`);
      await sendPasswordResetEmail({ to: toAddr, name, resetLink });
      console.log(`[ForgotPassword] ✅ Sent to: ${toAddr}`);
    }

    res.json({ success: true, message: `Password reset link sent to ${[...toAddresses].join(' and ')}.` });
  } catch (err: any) {
    console.error('[ForgotPassword] Error:', err?.message);
    next(err);
  }
};



// POST /api/v1/auth/reset-password
export const resetPassword = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { token, uid, newPassword } = req.body as { token: string; uid: string; newPassword: string };
    if (!token || !uid || !newPassword) throw createError('token, uid and newPassword are required', 400);
    if (newPassword.length < 6) throw createError('Password must be at least 6 characters', 400);

    const user = await prisma.user.findUnique({ where: { id: uid } });
    if (!user) throw createError('Invalid reset link', 400);

    // Verify token with secret + current password hash
    const resetSecret = ENV.JWT_SECRET + user.passwordHash;
    try {
      jwt.verify(token, resetSecret);
    } catch {
      throw createError('Reset link is invalid or has expired', 400);
    }

    const hash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id: uid }, data: { passwordHash: hash } });

    res.json({ success: true, message: 'Password updated successfully. Please log in with your new password.' });
  } catch (err) { next(err); }
};

