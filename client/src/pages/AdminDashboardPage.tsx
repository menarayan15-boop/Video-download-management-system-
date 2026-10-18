import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Film,
  Download,
  CreditCard,
  ShieldAlert,
  ArrowRight,
  TrendingUp,
  Clock,
  Sparkles,
} from 'lucide-react';
import { api } from '../services/api';

export const AdminDashboardPage: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.getAdminStats(), api.getAdminUsers({ limit: 5 })])
      .then(([statsRes, usersRes]) => {
        setStats(statsRes);
        setUsers(usersRes.users || []);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      await api.updateUserRole(userId, newRole);
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
      );
    } catch (e) {
      alert('Failed to update role');
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="px-3 py-1 rounded-full bg-amber-950/50 text-amber-300 text-xs font-bold uppercase tracking-wider border border-amber-500/30">
            Platform Administration
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
            Vyntra Control Center
          </h1>
          <p className="text-xs text-gray-400">
            System metrics, user role governance, download quota auditing, and content moderation
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/admin/discovery"
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-purple-600/30 text-purple-300 hover:bg-purple-600/50 border border-purple-500/40"
          >
            Discovery Engine
          </Link>
          <Link
            to="/admin/downloads"
            className="px-3.5 py-2 rounded-xl text-xs font-semibold btn-secondary text-gray-300 hover:text-white"
          >
            Download Audit Logs
          </Link>
          <Link
            to="/admin/moderation"
            className="px-3.5 py-2 rounded-xl text-xs font-semibold btn-primary"
          >
            Review Reports ({stats?.pendingReports || 0})
          </Link>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="glass-card p-4 rounded-2xl space-y-1">
          <Users className="w-5 h-5 text-purple-400" />
          <p className="text-2xl font-black text-white">{stats?.totalUsers || 0}</p>
          <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Total Users</p>
        </div>

        <div className="glass-card p-4 rounded-2xl space-y-1">
          <Sparkles className="w-5 h-5 text-amber-400" />
          <p className="text-2xl font-black text-white">{stats?.totalCreators || 0}</p>
          <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Creators</p>
        </div>

        <div className="glass-card p-4 rounded-2xl space-y-1">
          <Film className="w-5 h-5 text-blue-400" />
          <p className="text-2xl font-black text-white">{stats?.totalVideos || 0}</p>
          <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Videos Live</p>
        </div>

        <div className="glass-card p-4 rounded-2xl space-y-1">
          <Download className="w-5 h-5 text-green-400" />
          <p className="text-2xl font-black text-white">{stats?.totalDownloads || 0}</p>
          <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Completed Downloads</p>
        </div>

        <div className="glass-card p-4 rounded-2xl space-y-1">
          <CreditCard className="w-5 h-5 text-purple-400" />
          <p className="text-2xl font-black text-white">{stats?.activeSubscriptions || 0}</p>
          <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Active Plans</p>
        </div>

        <div className="glass-card p-4 rounded-2xl space-y-1">
          <ShieldAlert className="w-5 h-5 text-red-400" />
          <p className="text-2xl font-black text-white">{stats?.pendingReports || 0}</p>
          <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Pending Reports</p>
        </div>
      </div>

      {/* Admin Modules Quick Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          to="/admin/videos"
          className="glass-card p-5 rounded-2xl group hover:border-purple-500/50 transition-all space-y-2"
        >
          <div className="flex items-center justify-between text-gray-400 group-hover:text-purple-300">
            <Film className="w-5 h-5" />
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </div>
          <h3 className="font-bold text-sm text-white">Video Catalog Oversight</h3>
          <p className="text-xs text-gray-400">Review video download permissions and manage visibility</p>
        </Link>

        <Link
          to="/admin/moderation"
          className="glass-card p-5 rounded-2xl group hover:border-purple-500/50 transition-all space-y-2"
        >
          <div className="flex items-center justify-between text-gray-400 group-hover:text-purple-300">
            <ShieldAlert className="w-5 h-5" />
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </div>
          <h3 className="font-bold text-sm text-white">Moderation Queue</h3>
          <p className="text-xs text-gray-400">Inspect user reports against videos, comments, and members</p>
        </Link>

        <Link
          to="/admin/subscriptions"
          className="glass-card p-5 rounded-2xl group hover:border-purple-500/50 transition-all space-y-2"
        >
          <div className="flex items-center justify-between text-gray-400 group-hover:text-purple-300">
            <CreditCard className="w-5 h-5" />
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </div>
          <h3 className="font-bold text-sm text-white">Plan & Quota Rules</h3>
          <p className="text-xs text-gray-400">Configure Free, Bronze, Silver, Gold download allowances</p>
        </Link>

        <Link
          to="/admin/downloads"
          className="glass-card p-5 rounded-2xl group hover:border-purple-500/50 transition-all space-y-2"
        >
          <div className="flex items-center justify-between text-gray-400 group-hover:text-purple-300">
            <Download className="w-5 h-5" />
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </div>
          <h3 className="font-bold text-sm text-white">Audit & Quota Monitoring</h3>
          <p className="text-xs text-gray-400">Inspect concurrency-safe transactions and state transitions</p>
        </Link>
      </div>

      {/* User Governance Table */}
      <div className="glass-panel p-6 rounded-3xl border border-white/10 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Users className="w-4 h-4 text-purple-400" />
            User Governance & Roles
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/10 text-gray-400 text-[11px] uppercase tracking-wider">
                <th className="pb-3 font-semibold">User</th>
                <th className="pb-3 font-semibold">Email</th>
                <th className="pb-3 font-semibold">Role</th>
                <th className="pb-3 font-semibold">Plan</th>
                <th className="pb-3 font-semibold">Created</th>
                <th className="pb-3 font-semibold text-right">Assign Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-gray-300">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-white/[0.02]">
                  <td className="py-3 font-semibold text-white flex items-center gap-2">
                    <img
                      src={u.avatarUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${u.username}`}
                      alt={u.username}
                      className="w-7 h-7 rounded-full object-cover"
                    />
                    <span>{u.username}</span>
                  </td>
                  <td className="py-3 font-mono text-[11px] text-gray-400">{u.email}</td>
                  <td className="py-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        u.role === 'ADMIN'
                          ? 'bg-amber-950/60 text-amber-300 border border-amber-500/30'
                          : u.role === 'CREATOR'
                          ? 'bg-purple-950/60 text-purple-300 border border-purple-500/30'
                          : 'bg-gray-800 text-gray-400'
                      }`}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="py-3 text-purple-300 font-medium">{u.activePlan}</td>
                  <td className="py-3 text-gray-500 text-[11px]">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-3 text-right">
                    <select
                      value={u.role}
                      onChange={(e) => handleRoleChange(u.id, e.target.value)}
                      className="bg-[#111827] border border-white/10 text-xs rounded-lg px-2 py-1 text-gray-300 focus:outline-none"
                    >
                      <option value="USER">USER</option>
                      <option value="CREATOR">CREATOR</option>
                      <option value="ADMIN">ADMIN</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
