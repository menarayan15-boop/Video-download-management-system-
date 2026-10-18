import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, Check, X, Clock, AlertCircle } from 'lucide-react';
import { api } from '../services/api';

export const AdminModerationPage: React.FC = () => {
  const [reports, setReports] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    setIsLoading(true);
    try {
      const data = await api.getAdminModeration();
      setReports(data || []);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      await api.updateReportStatus(id, status);
      setReports((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status, reviewedAt: new Date() } : r))
      );
    } catch (e) {
      alert('Failed to update report status');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <Link to="/admin" className="text-xs text-gray-400 hover:text-white flex items-center gap-1">
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Admin Dashboard</span>
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <ShieldAlert className="w-6 h-6 text-red-400" />
          Moderation Review Queue
        </h1>
        <p className="text-xs text-gray-400 mt-0.5">
          Review user flags submitted for spam, harassment, and policy violations
        </p>
      </div>

      <div className="space-y-3">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-gray-400">Loading moderation queue...</div>
        ) : reports.length === 0 ? (
          <div className="glass-card rounded-2xl p-12 text-center max-w-md mx-auto space-y-2">
            <Check className="w-10 h-10 text-green-400 mx-auto" />
            <h3 className="text-base font-bold text-white">All reports clear!</h3>
            <p className="text-xs text-gray-400">No active flags pending administrative review.</p>
          </div>
        ) : (
          reports.map((rep) => (
            <div
              key={rep.id}
              className="glass-card p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-white/5"
            >
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-950/60 text-red-300 border border-red-500/30 uppercase">
                    {rep.targetType}
                  </span>
                  <span className="font-bold text-white">{rep.reason}</span>
                  <span className="text-[10px] text-gray-500 font-mono">
                    Reported {new Date(rep.createdAt).toLocaleDateString()}
                  </span>
                </div>
                {rep.details && <p className="text-gray-300 italic">"{rep.details}"</p>}
                <p className="text-[11px] text-gray-400">
                  Target ID: <code className="text-purple-300">{rep.targetId}</code> • Reporter: {rep.reporter?.username}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    rep.status === 'RESOLVED'
                      ? 'bg-green-950 text-green-400 border border-green-500/20'
                      : rep.status === 'DISMISSED'
                      ? 'bg-gray-800 text-gray-400'
                      : 'bg-amber-950 text-amber-300 border border-amber-500/20'
                  }`}
                >
                  {rep.status}
                </span>

                {rep.status === 'PENDING' && (
                  <div className="flex gap-1.5 ml-2">
                    <button
                      onClick={() => handleUpdateStatus(rep.id, 'RESOLVED')}
                      className="px-2.5 py-1 rounded-lg text-xs bg-green-600/20 text-green-300 hover:bg-green-600/30 border border-green-500/30"
                    >
                      Resolve
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(rep.id, 'DISMISSED')}
                      className="px-2.5 py-1 rounded-lg text-xs bg-white/5 text-gray-400 hover:bg-white/10"
                    >
                      Dismiss
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
