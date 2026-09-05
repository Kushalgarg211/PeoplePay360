import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import api from '../../lib/api';

export function ForgotPasswordPage() {
  const [email, setEmail]     = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent]       = useState(false);
  const [sentMsg, setSentMsg] = useState('');
  const [error, setError]     = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/auth/forgot-password', { email });
      setSentMsg(res.data?.message || '');
      setSent(true);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1a0a2e] via-[#2D1457] to-[#4a2060] p-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-[#2D1457] to-[#6B3A7D] px-8 py-8 text-center">
            <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <Mail size={24} className="text-white" />
            </div>
            <h1 className="text-xl font-bold text-white">Forgot Password?</h1>
            <p className="text-[#C49BD4] text-sm mt-1">
              Enter your email and we'll send you a reset link
            </p>
          </div>

          <div className="px-8 py-8">
            {sent ? (
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle size={32} className="text-green-500" />
                </div>
                <h2 className="text-lg font-semibold text-slate-800">Check your inbox</h2>
                <p className="text-sm text-slate-500">
                  {sentMsg || `If ${email} is registered, you'll receive a password reset link shortly.`}
                  {' '}Check your spam folder if you don't see it.
                </p>
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 text-[#6B3A7D] text-sm font-medium hover:underline mt-4"
                >
                  <ArrowLeft size={14} />
                  Back to Login
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
                    {error}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6B3A7D] focus:border-transparent"
                    placeholder="you@example.com"
                    required
                    autoFocus
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-lg bg-gradient-to-r from-[#2D1457] to-[#6B3A7D] text-white font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-60"
                >
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </button>

                <div className="text-center">
                  <Link
                    to="/login"
                    className="inline-flex items-center gap-1.5 text-[#6B3A7D] text-sm hover:underline"
                  >
                    <ArrowLeft size={13} />
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
