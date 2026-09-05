import { Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../config/database';
import { AuthRequest } from '../types';
import { createError } from '../middlewares/errorHandler';

// GET /api/v1/schedules
export const listSchedules = async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const schedules = await prisma.workingSchedule.findMany({
      include: { days: { orderBy: { dayOfWeek: 'asc' } } },
    });
    res.json({ success: true, data: schedules });
  } catch (err) { next(err); }
};

// POST /api/v1/schedules
export const createSchedule = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { days, ...rest } = req.body as any;
    const schedule = await prisma.workingSchedule.create({
      data: {
        id: uuidv4(), ...rest,
        days: days?.length
          ? { create: days.map((d: any) => ({ id: uuidv4(), ...d })) }
          : undefined,
      },
      include: { days: true },
    });
    res.status(201).json({ success: true, data: schedule });
  } catch (err) { next(err); }
};
