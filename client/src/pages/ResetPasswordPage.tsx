import React, { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { KeyRound, CheckCircle2, AlertCircle } from 'lucide-react';
import { api } from '../services/api';

export const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await api.resetPassword({ token, newPassword });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to reset password. Link may have expired.');
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
          <h1 className="text-2xl font-extrabold text-white">Choose New Password</h1>
          <p className="text-xs text-gray-400">Please enter your new secure password below</p>
        </div>

        {success ? (
          <div className="p-4 rounded-xl bg-green-950/30 border border-green-500/30 text-green-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />
            <span>Password updated! Redirecting to login...</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {error && (
              <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-gray-300 font-semibold mb-1">New Password</label>
              <input
                type="password"
                required
                placeholder="At least 6 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full p-3 rounded-xl glass-input"
              />
            </div>

            <div>
              <label className="block text-gray-300 font-semibold mb-1">Confirm New Password</label>
              <input
                type="password"
                required
                placeholder="Repeat new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full p-3 rounded-xl glass-input"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || !token}
              className="w-full py-3 rounded-xl text-xs font-semibold btn-primary flex items-center justify-center gap-2"
            >
              {isLoading ? 'Updating...' : 'Set New Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
