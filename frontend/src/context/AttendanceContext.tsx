import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import api from '../lib/api';
import { useAuth } from './AuthContext';
import { useAttendanceActions } from '../hooks/useAttendanceActions';
import type { CompOffAccrual } from '../hooks/useAttendanceActions';

interface AttendanceContextValue {
  isCheckedIn: boolean;
  checkInTime: Date | null;
  elapsedSeconds: number;
  checkIn: () => Promise<void>;
  checkOut: () => Promise<void>;
  formattedElapsed: string;
  attendanceError: string | null;
  clearAttendanceError: () => void;
  /** Non-blocking note when the clock action succeeded but location was unavailable. */
  geoWarning: string | null;
  clearGeoWarning: () => void;
  /** True while the browser is resolving a GPS fix. */
  isLocating: boolean;
  /** Paid leave just earned from overtime, if any. Null the rest of the time. */
  compOff: CompOffAccrual | null;
  clearCompOff: () => void;
}

const AttendanceContext = createContext<AttendanceContextValue | null>(null);

export function AttendanceProvider({ children }: { children: React.ReactNode }) {
  const { token, user } = useAuth();
  const [isCheckedIn, setIsCheckedIn]       = useState(false);
  const [checkInTime, setCheckInTime]       = useState<Date | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [attendanceError, setAttendanceError] = useState<string | null>(null);
  const [geoWarning, setGeoWarning] = useState<string | null>(null);
  const [compOff, setCompOff] = useState<CompOffAccrual | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { checkInWithLocation, checkOutWithLocation, isLocating } = useAttendanceActions();

  const clearAttendanceError = useCallback(() => setAttendanceError(null), []);
  const clearGeoWarning = useCallback(() => setGeoWarning(null), []);
  const clearCompOff = useCallback(() => setCompOff(null), []);

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
      const { record, geoWarning: warn } = await checkInWithLocation();
      const t = new Date(record.checkIn);
      setIsCheckedIn(true);
      setCheckInTime(t);
      setElapsedSeconds(Math.floor((Date.now() - t.getTime()) / 1000));
      startTimer(t);
      setAttendanceError(null);
      setGeoWarning(warn);
      setCompOff(null); // yesterday's credit is not news at the start of a shift
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Check-in failed. Please try again.';
      console.error('Check-in failed', err);
      setAttendanceError(msg); // Show in UI, not alert()
    }
  }, [startTimer, checkInWithLocation]);

  const checkOut = useCallback(async () => {
    try {
      const { geoWarning: warn, compOff: earned } = await checkOutWithLocation();
      setIsCheckedIn(false);
      setCheckInTime(null);
      setElapsedSeconds(0);
      if (timerRef.current) clearInterval(timerRef.current);
      setAttendanceError(null);
      setGeoWarning(warn);
      // Only set when overtime actually earned leave, so this never clears a
      // credit the user has not acknowledged with anything but silence.
      setCompOff(earned);
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Check-out failed. Please try again.';
      console.error('Check-out failed', err);
      setAttendanceError(msg); // Show in UI, not alert()
    }
  }, [checkOutWithLocation]);

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
      geoWarning, clearGeoWarning, isLocating,
      compOff, clearCompOff,
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
