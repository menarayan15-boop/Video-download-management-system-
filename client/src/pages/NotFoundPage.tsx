import React from 'react';
import { Link } from 'react-router-dom';
import { Home, Compass, AlertCircle } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="glass-card rounded-3xl p-8 sm:p-12 text-center max-w-md mx-auto space-y-5 border border-white/10 shadow-2xl">
        <div className="w-16 h-16 rounded-2xl bg-purple-600/20 text-purple-400 flex items-center justify-center mx-auto">
          <AlertCircle className="w-8 h-8" />
        </div>
        <div className="space-y-1">
          <h1 className="text-4xl font-extrabold text-white">404</h1>
          <h2 className="text-base font-bold text-gray-200">Page Not Found</h2>
          <p className="text-xs text-gray-400">
            The page or video you are seeking does not exist or has been moved to another location.
          </p>
        </div>

        <div className="pt-2 flex justify-center gap-3">
          <Link to="/" className="px-4 py-2 rounded-xl text-xs font-semibold btn-primary flex items-center gap-1.5">
            <Home className="w-4 h-4" />
            <span>Home</span>
          </Link>
          <Link to="/explore" className="px-4 py-2 rounded-xl text-xs font-semibold btn-secondary flex items-center gap-1.5">
            <Compass className="w-4 h-4" />
            <span>Explore</span>
          </Link>
        </div>
      </div>
    </div>
  );
};
