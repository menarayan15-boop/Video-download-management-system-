import React from 'react';
import { Link } from 'react-router-dom';
import { RotateCcw, Home, AlertTriangle } from 'lucide-react';

export const ErrorPage: React.FC = () => {
  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="glass-card rounded-3xl p-8 sm:p-12 text-center max-w-md mx-auto space-y-5 border border-red-500/30 shadow-2xl">
        <div className="w-16 h-16 rounded-2xl bg-red-600/20 text-red-400 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <div className="space-y-1">
          <h1 className="text-2xl font-extrabold text-white">Something Went Wrong</h1>
          <p className="text-xs text-gray-400">
            An unexpected client error occurred. Our engineering team has been notified.
          </p>
        </div>

        <div className="pt-2 flex justify-center gap-3">
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-xl text-xs font-semibold btn-primary flex items-center gap-1.5"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reload Page</span>
          </button>
          <Link to="/" className="px-4 py-2 rounded-xl text-xs font-semibold btn-secondary flex items-center gap-1.5">
            <Home className="w-4 h-4" />
            <span>Back to Safety</span>
          </Link>
        </div>
      </div>
    </div>
  );
};
