import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Loader2, Users, TrendingUp, Shield, Clock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
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



  return (
    <div className="min-h-screen flex">
      {/* ── Left: Image panel ─────────────────────────────────────────── */}
      <div 
        className="hidden lg:flex lg:w-[52%] relative overflow-hidden flex-col bg-cover bg-center"
        style={{ backgroundImage: `url(${heroImg})` }}
      >
        {/* Dark Overlay — deep purple gradient matching brand palette */}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(160deg, rgba(26,10,53,0.92) 0%, rgba(45,20,87,0.88) 40%, rgba(107,58,125,0.75) 100%)' }} />

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
            <p style={{ color: '#C49BD4' }} className="text-sm leading-relaxed mb-8">
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
                  <Icon size={14} style={{ color: '#D5B3E7' }} className="shrink-0" />
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
            {/* Forgot password link */}
            <div className="flex justify-end">
              <Link
                to="/forgot-password"
                className="text-xs text-[#6B3A7D] hover:underline font-medium"
              >
                Forgot password?
              </Link>
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


        </div>
      </div>
    </div>
  );
}
