import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { KeyRound, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react';
import { api } from '../services/api';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [resetUrl, setResetUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const res = await api.forgotPassword(email);
      setSubmitted(true);
      if (res?.data?.resetUrl) {
        setResetUrl(res.data.resetUrl);
      }
    } catch (err: any) {
      setError(err.message || 'Error processing request.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md glass-card rounded-2xl p-6 sm:p-8 space-y-6 border border-white/10 shadow-2xl">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center mx-auto text-purple-400">
            <KeyRound className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-extrabold text-white">Reset Password</h1>
          <p className="text-xs text-gray-400">Enter your email to receive password reset instructions</p>
        </div>

        {submitted ? (
          <div className="p-4 rounded-xl bg-green-950/30 border border-green-500/30 text-green-300 text-xs space-y-3">
            <div className="flex items-center gap-2 font-semibold">
              <CheckCircle2 className="w-4 h-4 text-green-400" />
              <span>Password Reset Link Prepared</span>
            </div>
            <p className="text-gray-300">
              In production, a secure email is dispatched. For development convenience, click the direct reset link below:
            </p>
            {resetUrl && (
              <a
                href={resetUrl}
                className="block p-2 rounded bg-white/10 text-purple-300 hover:underline break-all font-mono text-[11px]"
              >
                {resetUrl}
              </a>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {error && (
              <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-gray-300 font-semibold mb-1">Email Address</label>
              <input
                type="email"
                required
                placeholder="you@domain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-3 rounded-xl glass-input"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl text-xs font-semibold btn-primary flex items-center justify-center gap-2"
            >
              {isLoading ? 'Generating Link...' : 'Send Reset Instructions'}
            </button>
          </form>
        )}

        <div className="text-center text-xs">
          <Link to="/login" className="text-gray-400 hover:text-white flex items-center justify-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Sign In</span>
          </Link>
        </div>
      </div>
    </div>
  );
};
