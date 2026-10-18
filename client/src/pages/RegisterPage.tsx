import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus, AlertCircle } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export const RegisterPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    role: 'USER',
    biography: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const res = await api.register(formData);
      login(res.token, res.user);
      navigate('/home');
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please check your details.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md glass-card rounded-2xl p-6 sm:p-8 space-y-6 border border-white/10 shadow-2xl">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-[#7C3AED] to-[#8B5CF6] flex items-center justify-center mx-auto shadow-lg shadow-purple-600/30">
            <svg className="w-6 h-6 text-white fill-current ml-0.5" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
          <h1 className="text-2xl font-extrabold text-white">Join Vyntra</h1>
          <p className="text-xs text-gray-400">Watch, connect, and discover with a free account</p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-gray-300 font-semibold mb-1">Username</label>
            <input
              type="text"
              required
              placeholder="e.g. video_explorer"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              className="w-full p-3 rounded-xl glass-input"
            />
          </div>

          <div>
            <label className="block text-gray-300 font-semibold mb-1">Email Address</label>
            <input
              type="email"
              required
              placeholder="you@domain.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full p-3 rounded-xl glass-input"
            />
          </div>

          <div>
            <label className="block text-gray-300 font-semibold mb-1">Password</label>
            <input
              type="password"
              required
              placeholder="At least 6 characters"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full p-3 rounded-xl glass-input"
            />
          </div>

          <div>
            <label className="block text-gray-300 font-semibold mb-1">Account Role</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, role: 'USER' })}
                className={`p-2.5 rounded-xl border text-center transition-all ${
                  formData.role === 'USER'
                    ? 'border-purple-500 bg-purple-950/30 text-white font-semibold'
                    : 'border-white/10 bg-white/[0.02] text-gray-400 hover:text-white'
                }`}
              >
                Viewer / Explorer
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, role: 'CREATOR' })}
                className={`p-2.5 rounded-xl border text-center transition-all ${
                  formData.role === 'CREATOR'
                    ? 'border-purple-500 bg-purple-950/30 text-white font-semibold'
                    : 'border-white/10 bg-white/[0.02] text-gray-400 hover:text-white'
                }`}
              >
                Content Creator
              </button>
            </div>
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
                <UserPlus className="w-4 h-4" />
                <span>Create Free Account</span>
              </>
            )}
          </button>
        </form>

        <div className="text-center text-xs text-gray-400">
          Already have an account?{' '}
          <Link to="/login" className="text-purple-400 font-semibold hover:underline">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
};
