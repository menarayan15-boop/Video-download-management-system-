import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Bell,
  Check,
  CheckCheck,
  ExternalLink,
  AlertCircle,
  Trash2,
  Filter,
  X,
} from 'lucide-react';
import { NotificationItem } from '../types';
import { api } from '../services/api';

export const NotificationsPage: React.FC = () => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [filterType, setFilterType] = useState<'all' | 'unread'>('all');

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    setIsLoading(true);
    try {
      const data = await api.getNotifications();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (e) {
      console.error('Failed to load notifications:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkOne = async (id: string) => {
    try {
      await api.markAsRead(id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (e) {
      console.error('Failed to mark read:', e);
    }
  };

  const handleMarkAll = async () => {
    try {
      await api.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (e) {
      console.error('Failed to mark all read:', e);
    }
  };

  const handleDeleteOne = async (id: string) => {
    try {
      await api.deleteNotification(id);
      const target = notifications.find((n) => n.id === id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      if (target && !target.read) {
        setUnreadCount((c) => Math.max(0, c - 1));
      }
    } catch (e) {
      console.error('Failed to delete notification:', e);
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm('Dismiss and clear all notifications?')) return;
    try {
      await api.clearAllNotifications();
      setNotifications([]);
      setUnreadCount(0);
    } catch (e) {
      console.error('Failed to clear notifications:', e);
    }
  };

  const displayedNotifications = useMemo(() => {
    if (filterType === 'unread') {
      return notifications.filter((n) => !n.read);
    }
    return notifications;
  }, [notifications, filterType]);

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-16" aria-label="Notifications Center">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-2.5">
            <Bell className="w-7 h-7 text-purple-400" />
            <span>Notification Center</span>
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Real-time updates regarding downloads, comment replies, community interactions, and subscriptions.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAll}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold btn-secondary text-purple-300 hover:text-white"
            >
              <CheckCheck className="w-4 h-4 text-purple-400" />
              <span>Mark All Read</span>
            </button>
          )}

          {notifications.length > 0 && (
            <button
              onClick={handleClearAll}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/5 hover:bg-red-950/40 text-gray-400 hover:text-red-300 border border-white/10 hover:border-red-500/30 transition-colors"
              title="Clear all notifications"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear All</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Chips */}
      {notifications.length > 0 && (
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
              filterType === 'all'
                ? 'bg-purple-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            All Updates ({notifications.length})
          </button>
          <button
            onClick={() => setFilterType('unread')}
            className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
              filterType === 'unread'
                ? 'bg-purple-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            Unread ({unreadCount})
          </button>
        </div>
      )}

      {/* Notifications List */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 rounded-2xl bg-white/5 animate-pulse" />
          ))}
        </div>
      ) : displayedNotifications.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center max-w-md mx-auto space-y-3">
          <Bell className="w-10 h-10 text-purple-400 mx-auto opacity-70" />
          <h3 className="text-base font-bold text-white">
            {filterType === 'unread' ? 'No unread notifications' : 'No notifications yet'}
          </h3>
          <p className="text-xs text-gray-400 leading-relaxed">
            When users interact with your comments, downloads finish, or playlists receive updates, notices appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayedNotifications.map((n) => (
            <div
              key={n.id}
              className={`p-4 rounded-2xl transition-all flex items-start justify-between gap-4 border ${
                !n.read
                  ? 'glass-card border-purple-500/40 bg-purple-950/20 shadow-md shadow-purple-950/30'
                  : 'glass-card border-white/5 opacity-80 hover:opacity-100'
              }`}
            >
              <div className="space-y-1 text-xs flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-white truncate">{n.title}</h4>
                  {!n.read && (
                    <span className="w-2 h-2 rounded-full bg-purple-400 flex-shrink-0 animate-pulse" />
                  )}
                  <span className="text-[10px] text-gray-500 font-mono ml-auto">
                    {new Date(n.createdAt).toLocaleDateString([], {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <p className="text-gray-300 leading-relaxed">{n.message}</p>
                {n.link && (
                  <Link
                    to={n.link}
                    className="inline-flex items-center gap-1 text-[11px] text-purple-400 hover:text-purple-300 font-semibold pt-1"
                  >
                    <span>View Target</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                )}
              </div>

              <div className="flex items-center gap-1 flex-shrink-0">
                {!n.read && (
                  <button
                    onClick={() => handleMarkOne(n.id)}
                    className="p-1.5 text-gray-400 hover:text-purple-300 hover:bg-white/10 rounded-lg transition-colors"
                    title="Mark as Read"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => handleDeleteOne(n.id)}
                  className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-white/10 rounded-lg transition-colors"
                  title="Dismiss notification"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
