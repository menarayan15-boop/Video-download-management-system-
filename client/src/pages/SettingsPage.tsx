import React, { useState } from 'react';
import { Settings, Shield, Bell, Eye, Lock, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [downloadNotifications, setDownloadNotifications] = useState(true);
  const [commentAlerts, setCommentAlerts] = useState(true);
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-12">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-2">
          <Settings className="w-7 h-7 text-purple-400" />
          Account & Privacy Settings
        </h1>
        <p className="text-xs text-gray-400 mt-1">
          Customize your playback, notification alerts, and data privacy options
        </p>
      </div>

      {saved && (
        <div className="p-3.5 rounded-xl bg-green-950/30 border border-green-500/30 text-green-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-green-400" />
          <span>Preferences saved successfully.</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Notifications Section */}
        <div className="glass-card p-6 rounded-2xl border border-white/10 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Bell className="w-4 h-4 text-purple-400" />
            Notification Preferences
          </h3>

          <div className="space-y-3 text-xs divide-y divide-white/5">
            <label className="flex items-center justify-between pt-2 cursor-pointer">
              <div>
                <p className="font-semibold text-gray-200">Download Ready Notifications</p>
                <p className="text-[11px] text-gray-400">Receive alerts when video transfers finish or quota resets</p>
              </div>
              <input
                type="checkbox"
                checked={downloadNotifications}
                onChange={(e) => setDownloadNotifications(e.target.checked)}
                className="rounded accent-purple-600 w-4 h-4"
              />
            </label>

            <label className="flex items-center justify-between pt-3 cursor-pointer">
              <div>
                <p className="font-semibold text-gray-200">Comment & Reply Alerts</p>
                <p className="text-[11px] text-gray-400">Notify me when someone replies to my comments or videos</p>
              </div>
              <input
                type="checkbox"
                checked={commentAlerts}
                onChange={(e) => setCommentAlerts(e.target.checked)}
                className="rounded accent-purple-600 w-4 h-4"
              />
            </label>

            <label className="flex items-center justify-between pt-3 cursor-pointer">
              <div>
                <p className="font-semibold text-gray-200">Platform Digest Emails</p>
                <p className="text-[11px] text-gray-400">Receive weekly trending videos and community announcements</p>
              </div>
              <input
                type="checkbox"
                checked={emailNotifications}
                onChange={(e) => setEmailNotifications(e.target.checked)}
                className="rounded accent-purple-600 w-4 h-4"
              />
            </label>
          </div>
        </div>

        {/* Security & Timezone */}
        <div className="glass-card p-6 rounded-2xl border border-white/10 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Shield className="w-4 h-4 text-purple-400" />
            Security & Regional Policy
          </h3>

          <div className="space-y-3 text-xs text-gray-300">
            <div className="flex justify-between items-center py-1">
              <span>Quota Reset Policy Timezone:</span>
              <strong className="font-mono text-purple-300">Asia/Kolkata (IST)</strong>
            </div>
            <div className="flex justify-between items-center py-1">
              <span>Encrypted Session Status:</span>
              <span className="text-green-400 font-semibold">Active & TLS Verified</span>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button type="submit" className="px-6 py-2.5 rounded-xl btn-primary text-xs font-semibold">
            Save Preferences
          </button>
        </div>
      </form>
    </div>
  );
};
