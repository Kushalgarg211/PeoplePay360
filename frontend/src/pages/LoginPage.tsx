import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2, Users, TrendingUp, Shield, Clock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { demoAccounts } from '../data/mockData';
import { getRoleLabel } from '../lib/rbac';
import heroImg from '../assets/images.jpg';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await login(email, password);
      navigate('/', { replace: true });
    } catch {
      setError('Invalid email or password.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = (acc: typeof demoAccounts[0]) => {
    setEmail(acc.email);
    setPassword(acc.password);
  };

  return (
    <div className="min-h-screen flex">
      {/* ── Left: Image panel ─────────────────────────────────────────── */}
      <div 
        className="hidden lg:flex lg:w-[52%] relative overflow-hidden flex-col bg-cover bg-center"
        style={{ backgroundImage: `url(${heroImg})` }}
      >
        {/* Dark Overlay */}
        <div className="absolute inset-0 bg-primary-900/80" />

        <div className="relative z-10 flex flex-col h-full p-12">
          {/* Brand */}
          <div className="flex items-center gap-3 mb-12">
            <span className="text-white font-bold text-xl tracking-tight">PeoplePay360</span>
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Tagline */}
          <div className="mt-auto">
            <h1 className="text-3xl font-bold text-white leading-tight mb-3">
              Integrated HR &<br />Payroll Operations
            </h1>
            <p className="text-primary-100 text-sm leading-relaxed mb-8">
              Manage your entire employee lifecycle — from onboarding and attendance to contracts and payroll — in one connected platform.
            </p>

            {/* Feature list */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: Users, text: 'Employee Management' },
                { icon: TrendingUp, text: 'Payroll Processing' },
                { icon: Clock, text: 'Attendance Tracking' },
                { icon: Shield, text: 'Role-Based Access' },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-2.5 bg-white/10 rounded-md px-3 py-2.5 backdrop-blur-sm">
                  <Icon size={14} className="text-primary-200 shrink-0" />
                  <span className="text-white text-xs font-medium">{text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Right: Auth panel ─────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center bg-white px-6 py-10 overflow-y-auto">
        <div className="w-full max-w-sm">
          {/* Mobile brand */}
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <span className="text-slate-900 font-bold text-lg">PeoplePay360</span>
          </div>

          <div className="mb-7">
            <h2 className="text-2xl font-bold text-slate-900">Sign in</h2>
            <p className="text-slate-500 text-sm mt-1">Access your HR & Payroll workspace</p>
          </div>

          {error && (
            <div className="mb-5 px-4 py-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email-input" className="label">Work Email</label>
              <input
                id="email-input"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="input-field"
                required
              />
            </div>
            <div>
              <label htmlFor="password-input" className="label">Password</label>
              <div className="relative">
                <input
                  id="password-input"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input-field pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
            <button
              id="login-submit-btn"
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full justify-center py-2.5"
            >
              {isLoading && <Loader2 size={15} className="animate-spin" />}
              {isLoading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-xs text-slate-400 font-medium">Demo Accounts</span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          {/* Demo accounts */}
          <div className="space-y-1.5">
            {demoAccounts.map((acc) => {
              const roleColors: Record<string, string> = {
                admin: 'bg-amber-50 border-amber-200 text-amber-700',
                hr_manager: 'bg-blue-50 border-blue-200 text-blue-700',
                hr_payroll_manager: 'bg-indigo-50 border-indigo-200 text-indigo-700',
                hr_payroll_user: 'bg-purple-50 border-purple-200 text-purple-700',
                employee: 'bg-slate-50 border-slate-200 text-slate-600',
              };
              return (
                <button
                  key={acc.email}
                  id={`demo-${acc.role}`}
                  onClick={() => handleDemoLogin(acc)}
                  className="w-full flex items-center justify-between px-3 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md text-left transition-colors group"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800 group-hover:text-slate-900 truncate">{acc.name}</p>
                    <p className="text-xs text-slate-400 truncate">{acc.email}</p>
                  </div>
                  <span className={`shrink-0 ml-2 text-xs px-2 py-0.5 rounded border font-medium ${roleColors[acc.role] ?? 'bg-slate-100 border-slate-200 text-slate-600'}`}>
                    {getRoleLabel(acc.role as never)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
