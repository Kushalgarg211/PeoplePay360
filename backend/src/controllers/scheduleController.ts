import { Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../config/database';
import { AuthRequest } from '../types';
import { createError } from '../middlewares/errorHandler';

// GET /api/v1/schedules
export const listSchedules = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { activeOnly } = req.query as Record<string, string>;
    const schedules = await prisma.workingSchedule.findMany({
      where: activeOnly === 'true' ? { status: 'Active' } : undefined,
      include: { days: { orderBy: { dayOfWeek: 'asc' } } },
    });
    res.json({ success: true, data: schedules });
  } catch (err) { next(err); }
};

// POST /api/v1/schedules
export const createSchedule = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { name, company, daysPerWeek, hoursPerWeek, status, days } = req.body as any;

    if (!name?.trim()) throw createError('Schedule name is required', 400);

    const schedule = await prisma.workingSchedule.create({
      data: {
        id:           uuidv4(),
        name:         name.trim(),
        company:      company?.trim() || 'OxP Pvt Ltd',
        daysPerWeek:  Number(daysPerWeek)  || 5,
        hoursPerWeek: Number(hoursPerWeek) || 40,
        status:       status === 'Inactive' ? 'Inactive' : 'Active',
        days: Array.isArray(days) && days.length > 0
          ? {
              create: days.map((d: any) => ({
                id:         uuidv4(),
                dayOfWeek:  d.dayOfWeek,
                startTime:  d.startTime,
                endTime:    d.endTime,
                breakHours: Number(d.breakHours) || 0,
                totalHours: Number(d.totalHours) || 0,
              })),
            }
          : undefined,
      },
      include: { days: { orderBy: { dayOfWeek: 'asc' } } },
    });

    res.status(201).json({ success: true, data: schedule });
  } catch (err) { next(err); }
};

// PUT /api/v1/schedules/:id
export const updateSchedule = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { name, company, daysPerWeek, hoursPerWeek, status, days } = req.body as any;

    if (!name?.trim()) throw createError('Schedule name is required', 400);

    const existing = await prisma.workingSchedule.findUnique({ where: { id } });
    if (!existing) throw createError('Schedule not found', 404);

    // Replace all day rows atomically: delete old, insert new
    await prisma.workingScheduleDay.deleteMany({ where: { workingScheduleId: id } });

    const schedule = await prisma.workingSchedule.update({
      where: { id },
      data: {
        name:         name.trim(),
        company:      company?.trim() || 'OxP Pvt Ltd',
        daysPerWeek:  Number(daysPerWeek)  || 5,
        hoursPerWeek: Number(hoursPerWeek) || 40,
        status:       status === 'Inactive' ? 'Inactive' : 'Active',
        days: Array.isArray(days) && days.length > 0
          ? {
              create: days.map((d: any) => ({
                id:         uuidv4(),
                dayOfWeek:  d.dayOfWeek,
                startTime:  d.startTime,
                endTime:    d.endTime,
                breakHours: Number(d.breakHours) || 0,
                totalHours: Number(d.totalHours) || 0,
              })),
            }
          : undefined,
      },
      include: { days: { orderBy: { dayOfWeek: 'asc' } } },
    });

    res.json({ success: true, data: schedule });
  } catch (err) { next(err); }
};
