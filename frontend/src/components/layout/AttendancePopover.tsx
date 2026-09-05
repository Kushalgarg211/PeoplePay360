import React, { useState, useRef, useEffect } from 'react';
import { LogIn, LogOut, Timer, AlertCircle, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useAttendance } from '../../context/AttendanceContext';
import { cn } from '../../lib/utils';

export function AttendancePopover() {
  const { user } = useAuth();
  const {
    isCheckedIn, checkInTime, formattedElapsed, checkIn, checkOut,
    attendanceError, clearAttendanceError,
  } = useAttendance();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Auto-open popover when there's an error so user sees the message
  useEffect(() => {
    if (attendanceError) setOpen(true);
  }, [attendanceError]);

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
  const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  return (
    <div ref={ref} className="relative">
      <button
        id="attendance-popover-btn"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md hover:bg-slate-100 transition-colors"
        title={isCheckedIn ? 'Checked In' : 'Not Checked In'}
      >
        <span className="relative flex h-2 w-2">
          <span className={cn(
            'absolute inline-flex h-full w-full rounded-full opacity-75',
            isCheckedIn ? 'animate-ping bg-emerald-400' : 'bg-slate-300'
          )} />
          <span className={cn(
            'relative inline-flex rounded-full h-2 w-2',
            isCheckedIn ? 'bg-emerald-500' : 'bg-slate-400'
          )} />
        </span>
        {isCheckedIn && (
          <span className="text-xs text-emerald-700 font-medium hidden sm:block">{formattedElapsed}</span>
        )}
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-1 w-72 bg-white border border-slate-200 rounded-lg shadow-dropdown z-50 animate-fade-in">
          <div className="p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Attendance</p>
              <p className="text-xs text-slate-400">{dateStr}</p>
            </div>
            <p className="text-sm font-semibold text-slate-900 mb-4">
              Welcome back, {user?.name?.split(' ')[0]}
            </p>

            {/* Inline error banner — replaces alert() */}
            {attendanceError && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-md px-3 py-2.5 mb-3">
                <AlertCircle size={13} className="text-red-500 shrink-0 mt-0.5" />
                <p className="text-xs text-red-700 flex-1">{attendanceError}</p>
                <button onClick={clearAttendanceError} className="text-red-400 hover:text-red-600 shrink-0">
                  <X size={12} />
                </button>
              </div>
            )}

            {isCheckedIn && checkInTime ? (
              <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-md px-3 py-2.5 mb-4">
                <Timer size={14} className="text-emerald-600 shrink-0" />
                <div>
                  <p className="text-xs text-emerald-700">
                    Checked in at{' '}
                    <span className="font-semibold">
                      {checkInTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </p>
                  <p className="text-xs text-emerald-600 font-semibold">{formattedElapsed} elapsed</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-md px-3 py-2.5 mb-4">
                <div className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                <p className="text-xs text-slate-500">Not checked in · {timeStr}</p>
              </div>
            )}

            <button
              id={isCheckedIn ? 'check-out-btn' : 'check-in-btn'}
              onClick={() => { isCheckedIn ? checkOut() : checkIn(); setOpen(false); }}
              className={cn(
                'w-full flex items-center justify-center gap-2 py-2 rounded-md text-sm font-semibold transition-colors',
                isCheckedIn
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-[#6B3A7D] hover:bg-[#2D1457] text-white'
              )}
            >
              {isCheckedIn ? <LogOut size={14} /> : <LogIn size={14} />}
              {isCheckedIn ? 'Check Out' : 'Check In'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
