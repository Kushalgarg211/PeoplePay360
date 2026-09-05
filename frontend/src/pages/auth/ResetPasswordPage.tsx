import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react';
import api from '../../lib/api';

export function ResetPasswordPage() {
  const [searchParams]          = useSearchParams();
  const navigate                = useNavigate();
  const [newPassword, setNew]   = useState('');
  const [confirm, setConfirm]   = useState('');
  const [show, setShow]         = useState(false);
  const [loading, setLoading]   = useState(false);
  const [success, setSuccess]   = useState(false);
  const [error, setError]       = useState('');

  const token = searchParams.get('token') ?? '';
  const uid   = searchParams.get('uid')   ?? '';

  useEffect(() => {
    if (!token || !uid) setError('Invalid or missing reset link. Please request a new one.');
  }, [token, uid]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, uid, newPassword });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to reset password. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1a0a2e] via-[#2D1457] to-[#4a2060] p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-[#2D1457] to-[#6B3A7D] px-8 py-8 text-center">
            <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <Lock size={24} className="text-white" />
            </div>
            <h1 className="text-xl font-bold text-white">Set New Password</h1>
            <p className="text-[#C49BD4] text-sm mt-1">Choose a strong new password</p>
          </div>

          <div className="px-8 py-8">
            {success ? (
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle size={32} className="text-green-500" />
                </div>
                <h2 className="text-lg font-semibold text-slate-800">Password Updated!</h2>
                <p className="text-sm text-slate-500">
                  Your password has been changed successfully. Redirecting you to login...
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                  <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
                    <AlertCircle size={15} className="shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                {/* New password */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={show ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNew(e.target.value)}
                      className="w-full px-4 py-3 pr-10 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6B3A7D] focus:border-transparent"
                      placeholder="Minimum 6 characters"
                      required
                      disabled={!token || !uid}
                    />
                    <button
                      type="button"
                      onClick={() => setShow((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {show ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Confirm password */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Confirm Password
                  </label>
                  <input
                    type={show ? 'text' : 'password'}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6B3A7D] focus:border-transparent"
                    placeholder="Repeat your new password"
                    required
                    disabled={!token || !uid}
                  />
                </div>

                {/* Password strength hint */}
                {newPassword && (
                  <div className="flex gap-1.5">
                    {[...Array(4)].map((_, i) => (
                      <div
                        key={i}
                        className={`h-1 flex-1 rounded-full transition-colors ${
                          newPassword.length >= [6, 8, 10, 12][i]
                            ? ['bg-red-400', 'bg-yellow-400', 'bg-blue-400', 'bg-green-500'][i]
                            : 'bg-slate-200'
                        }`}
                      />
                    ))}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !token || !uid}
                  className="w-full py-3 rounded-lg bg-gradient-to-r from-[#2D1457] to-[#6B3A7D] text-white font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-60"
                >
                  {loading ? 'Updating...' : 'Update Password'}
                </button>

                <div className="text-center">
                  <Link to="/login" className="text-[#6B3A7D] text-sm hover:underline">
                    Back to Login
                  </Link>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
