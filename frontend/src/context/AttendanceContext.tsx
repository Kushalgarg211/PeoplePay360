import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';

interface AttendanceContextValue {
  isCheckedIn: boolean;
  checkInTime: Date | null;
  elapsedSeconds: number;
  checkIn: () => void;
  checkOut: () => void;
  formattedElapsed: string;
}

const AttendanceContext = createContext<AttendanceContextValue | null>(null);

export function AttendanceProvider({ children }: { children: React.ReactNode }) {
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [checkInTime, setCheckInTime] = useState<Date | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startTimer = useCallback((from: Date) => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - from.getTime()) / 1000));
    }, 1000);
  }, []);

  // Restore from session
  useEffect(() => {
    const stored = localStorage.getItem('pp360_checkin');
    if (stored) {
      const t = new Date(stored);
      setIsCheckedIn(true);
      setCheckInTime(t);
      setElapsedSeconds(Math.floor((Date.now() - t.getTime()) / 1000));
      startTimer(t);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [startTimer]);

  const checkIn = useCallback(() => {
    const now = new Date();
    setIsCheckedIn(true);
    setCheckInTime(now);
    setElapsedSeconds(0);
    localStorage.setItem('pp360_checkin', now.toISOString());
    startTimer(now);
  }, [startTimer]);

  const checkOut = useCallback(() => {
    setIsCheckedIn(false);
    setCheckInTime(null);
    setElapsedSeconds(0);
    localStorage.removeItem('pp360_checkin');
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  const formattedElapsed = (() => {
    const h = Math.floor(elapsedSeconds / 3600);
    const m = Math.floor((elapsedSeconds % 3600) / 60);
    const s = elapsedSeconds % 60;
    if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`;
    return `${m}m ${String(s).padStart(2, '0')}s`;
  })();

  return (
    <AttendanceContext.Provider value={{ isCheckedIn, checkInTime, elapsedSeconds, checkIn, checkOut, formattedElapsed }}>
      {children}
    </AttendanceContext.Provider>
  );
}

export function useAttendance() {
  const ctx = useContext(AttendanceContext);
  if (!ctx) throw new Error('useAttendance must be used within AttendanceProvider');
  return ctx;
}
