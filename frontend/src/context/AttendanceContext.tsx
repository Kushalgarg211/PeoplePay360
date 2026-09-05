import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import api from '../lib/api';
import { useAuth } from './AuthContext';

interface AttendanceContextValue {
  isCheckedIn: boolean;
  checkInTime: Date | null;
  elapsedSeconds: number;
  checkIn: () => void;
  checkOut: () => void;
  formattedElapsed: string;
  attendanceError: string | null;
  clearAttendanceError: () => void;
}

const AttendanceContext = createContext<AttendanceContextValue | null>(null);

export function AttendanceProvider({ children }: { children: React.ReactNode }) {
  const { token, user } = useAuth();
  const [isCheckedIn, setIsCheckedIn]       = useState(false);
  const [checkInTime, setCheckInTime]       = useState<Date | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [attendanceError, setAttendanceError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearAttendanceError = useCallback(() => setAttendanceError(null), []);

  const startTimer = useCallback((from: Date) => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - from.getTime()) / 1000));
    }, 1000);
  }, []);

  // Restore from backend only when logged in with a valid token
  useEffect(() => {
    if (!token || !user) {
      setIsCheckedIn(false);
      setCheckInTime(null);
      setElapsedSeconds(0);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    let isMounted = true;

    api.get('/attendance/today-status').then((res) => {
      if (!isMounted) return;
      const { record } = res.data?.data || {};
      if (record && !record.checkOut) {
        const t = new Date(record.checkIn);
        setIsCheckedIn(true);
        setCheckInTime(t);
        setElapsedSeconds(Math.floor((Date.now() - t.getTime()) / 1000));
        startTimer(t);
      }
    }).catch(() => {
      // Silently ignore — user may not have an employee record linked
    });

    return () => {
      isMounted = false;
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [token, user?.id, startTimer]);

  const checkIn = useCallback(async () => {
    try {
      const res = await api.post('/attendance/check-in');
      const data = res.data.data;
      const t = new Date(data.checkIn);
      setIsCheckedIn(true);
      setCheckInTime(t);
      setElapsedSeconds(Math.floor((Date.now() - t.getTime()) / 1000));
      startTimer(t);
      setAttendanceError(null);
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Check-in failed. Please try again.';
      console.error('Check-in failed', err);
      setAttendanceError(msg); // Show in UI, not alert()
    }
  }, [startTimer]);

  const checkOut = useCallback(async () => {
    try {
      await api.post('/attendance/check-out');
      setIsCheckedIn(false);
      setCheckInTime(null);
      setElapsedSeconds(0);
      if (timerRef.current) clearInterval(timerRef.current);
      setAttendanceError(null);
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Check-out failed. Please try again.';
      console.error('Check-out failed', err);
      setAttendanceError(msg); // Show in UI, not alert()
    }
  }, []);

  const formattedElapsed = (() => {
    const h = Math.floor(elapsedSeconds / 3600);
    const m = Math.floor((elapsedSeconds % 3600) / 60);
    const s = elapsedSeconds % 60;
    if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`;
    return `${m}m ${String(s).padStart(2, '0')}s`;
  })();

  return (
    <AttendanceContext.Provider value={{
      isCheckedIn, checkInTime, elapsedSeconds, checkIn, checkOut,
      formattedElapsed, attendanceError, clearAttendanceError,
    }}>
      {children}
    </AttendanceContext.Provider>
  );
}

export function useAttendance() {
  const ctx = useContext(AttendanceContext);
  if (!ctx) throw new Error('useAttendance must be used within AttendanceProvider');
  return ctx;
}
