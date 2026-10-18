import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { LogIn, AlertCircle } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [formData, setFormData] = useState({ emailOrUsername: '', password: '' });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const res = await api.login(formData);
      login(res.token, res.user, res.subscription);
      const redirectPath = searchParams.get('redirect') || '/home';
      navigate(redirectPath);
    } catch (err: any) {
      setError(err.message || 'Invalid credentials. Please verify your email and password.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = (email: string, pass: string) => {
    setFormData({ emailOrUsername: email, password: pass });
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md glass-card rounded-2xl p-6 sm:p-8 space-y-6 border border-white/10 shadow-2xl">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-[#7C3AED] to-[#8B5CF6] flex items-center justify-center mx-auto shadow-lg shadow-purple-600/30">
            <svg className="w-6 h-6 text-white fill-current ml-0.5" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
          <h1 className="text-2xl font-extrabold text-white">Welcome Back</h1>
          <p className="text-xs text-gray-400">Sign in to your Vyntra account</p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-gray-300 font-semibold mb-1">Email or Username</label>
            <input
              type="text"
              required
              placeholder="e.g. demouser or demo@vyntra.com"
              value={formData.emailOrUsername}
              onChange={(e) => setFormData({ ...formData, emailOrUsername: e.target.value })}
              className="w-full p-3 rounded-xl glass-input"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-gray-300 font-semibold">Password</label>
              <Link to="/forgot-password" className="text-purple-400 hover:underline text-[11px]">
                Forgot password?
              </Link>
            </div>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full p-3 rounded-xl glass-input"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 rounded-xl text-xs font-semibold btn-primary flex items-center justify-center gap-2 mt-2"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>Sign In</span>
              </>
            )}
          </button>
        </form>

        {/* Quick Demo Credentials */}
        <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-2 text-[11px]">
          <p className="font-semibold text-gray-400">Quick Demo Accounts:</p>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleDemoLogin('demo@vyntra.com', 'DemoUser2026!')}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 text-center"
            >
              Free User
            </button>
            <button
              type="button"
              onClick={() => handleDemoLogin('alex.dev@vyntra.com', 'CreatorPass2026!')}
              className="p-1.5 rounded-lg bg-purple-950/40 hover:bg-purple-900/40 text-purple-300 text-center"
            >
              Creator
            </button>
            <button
              type="button"
              onClick={() => handleDemoLogin('admin@vyntra.com', 'VyntraAdmin2026!')}
              className="p-1.5 rounded-lg bg-amber-950/40 hover:bg-amber-900/40 text-amber-300 text-center"
            >
              Admin
            </button>
          </div>
        </div>

        <div className="text-center text-xs text-gray-400">
          Don't have an account?{' '}
          <Link to="/register" className="text-purple-400 font-semibold hover:underline">
            Create account
          </Link>
        </div>
      </div>
    </div>
  );
};
