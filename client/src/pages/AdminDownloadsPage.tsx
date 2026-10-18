import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, ArrowLeft, ShieldCheck, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';
import { api } from '../services/api';

export const AdminDownloadsPage: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    setIsLoading(true);
    try {
      const res = await api.getDownloadAuditLogs({ limit: 50 });
      setLogs(res.logs || []);
    } finally {
      setIsLoading(false);
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
          <Download className="w-6 h-6 text-purple-400" />
          Download Audit & Concurrency Trail
        </h1>
        <p className="text-xs text-gray-400 mt-0.5">
          Immutable historical audit log of all atomic quota reservations, transfer events, and state changes
        </p>
      </div>

      <div className="glass-panel p-6 rounded-3xl border border-white/10 overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-white/10 text-gray-400 text-[11px] uppercase tracking-wider">
              <th className="pb-3 font-semibold">Op ID</th>
              <th className="pb-3 font-semibold">User</th>
              <th className="pb-3 font-semibold">Video</th>
              <th className="pb-3 font-semibold">Plan</th>
              <th className="pb-3 font-semibold">Reserved / Consumed</th>
              <th className="pb-3 font-semibold">Status</th>
              <th className="pb-3 font-semibold">Requested At</th>
              <th className="pb-3 font-semibold">Failure Code</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-gray-300 font-mono text-[11px]">
            {logs.map((op) => (
              <tr key={op.id} className="hover:bg-white/[0.02]">
                <td className="py-3 text-purple-300 truncate max-w-[120px]" title={op.id}>
                  {op.id.substring(0, 8)}...
                </td>
                <td className="py-3 font-sans font-medium text-white">{op.user?.username}</td>
                <td className="py-3 font-sans truncate max-w-xs" title={op.video?.title}>
                  {op.video?.title}
                </td>
                <td className="py-3 text-purple-400 font-bold">{op.subscription?.plan?.name || 'FREE'}</td>
                <td className="py-3 text-center">
                  <span className="text-amber-300">{op.quotaReserved}</span> /{' '}
                  <span className="text-green-400 font-bold">{op.quotaConsumed}</span>
                </td>
                <td className="py-3">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      op.status === 'COMPLETED'
                        ? 'bg-green-950 text-green-400 border border-green-500/20'
                        : op.status === 'FAILED'
                        ? 'bg-red-950 text-red-400 border border-red-500/20'
                        : 'bg-purple-950 text-purple-300 border border-purple-500/20'
                    }`}
                  >
                    {op.status}
                  </span>
                </td>
                <td className="py-3 text-gray-500 font-sans">
                  {new Date(op.requestedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </td>
                <td className="py-3 text-red-400 text-[10px]">{op.failureCode || 'None'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
