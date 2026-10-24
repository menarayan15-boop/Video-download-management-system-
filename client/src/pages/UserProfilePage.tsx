import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  User as UserIcon,
  Mail,
  Calendar,
  Shield,
  Edit3,
  CheckCircle2,
  Download,
  Bookmark,
  Film,
  History,
  Layers,
  Sparkles,
  SlidersHorizontal,
  Trash2,
  Play,
  RotateCcw,
  Bell,
  Globe,
  Settings,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { usePreferences } from '../context/PreferencesContext';
import { api } from '../services/api';
import { Video, Playlist } from '../types';
import { VideoCard } from '../components/video/VideoCard';
import { CategoryPreferenceModal } from '../components/video/CategoryPreferenceModal';

type DashboardTab = 'overview' | 'continue_watching' | 'playlists' | 'watch_later' | 'downloads' | 'settings';

export const UserProfilePage: React.FC = () => {
  const { user, subscription, quota, refreshAuth } = useAuth();
  const { preferences, updatePreference } = usePreferences();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');

  // Profile Edit
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    username: user?.username || '',
    biography: user?.biography || '',
    avatarUrl: user?.avatarUrl || '',
  });
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState(false);

  // Library Data State
  const [continueWatching, setContinueWatching] = useState<any[]>([]);
  const [savedVideos, setSavedVideos] = useState<Video[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [downloads, setDownloads] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Category Preference Modal
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadDashboardData();
    } else {
      setIsLoadingData(false);
    }
  }, [user]);

  const loadDashboardData = async () => {
    if (!user) return;
    setIsLoadingData(true);
    try {
      const [profileRes, cwRes, savedRes, plRes, dlRes] = await Promise.all([
        api.getMyProfile().catch(() => null),
        api.getContinueWatching().catch(() => []),
        api.getSavedVideos().catch(() => []),
        api.getMyPlaylists().catch(() => []),
        api.getDownloads().catch(() => []),
      ]);

      if (profileRes) {
        setStats(profileRes._count || null);
        setFormData({
          username: profileRes.username,
          biography: profileRes.biography || '',
          avatarUrl: profileRes.avatarUrl || '',
        });
      }

      setContinueWatching(Array.isArray(cwRes) ? cwRes : []);
      setSavedVideos(Array.isArray(savedRes) ? savedRes : []);
      setPlaylists(Array.isArray(plRes) ? plRes : []);
      setDownloads(Array.isArray(dlRes) ? dlRes : []);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    try {
      await api.updateMyProfile(formData);
      await refreshAuth();
      setProfileSuccessMsg(true);
      setIsEditing(false);
      setTimeout(() => setProfileSuccessMsg(false), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to update profile');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleRemoveContinueWatching = async (videoId: string) => {
    try {
      await api.removeContinueWatching(videoId);
      setContinueWatching((prev) => prev.filter((item) => item.id !== videoId));
    } catch (err) {
      console.error('Failed to remove continue watching video:', err);
    }
  };

  const handleClearContinueWatching = async () => {
    if (!window.confirm('Clear all in-progress watch history?')) return;
    try {
      await api.clearContinueWatching();
      setContinueWatching([]);
      showNotification('Continue watching cleared.');
    } catch (err) {
      console.error('Failed to clear continue watching:', err);
    }
  };

  const handleClearWatchLater = async () => {
    if (!window.confirm('Clear all videos from Watch Later?')) return;
    try {
      await api.clearSavedVideos();
      setSavedVideos([]);
      showNotification('Watch Later cleared.');
    } catch (err) {
      console.error('Failed to clear watch later:', err);
    }
  };

  const handleResetRecommendations = async () => {
    if (!window.confirm('Reset your personalized recommendation history and negative feedback?')) return;
    try {
      await api.resetRecommendations();
      showNotification('Recommendation history and negative signals have been reset.');
    } catch (err) {
      console.error('Failed to reset recommendations:', err);
    }
  };

  const handleClearWatchHistory = async () => {
    if (!window.confirm('Permanently clear all watch history records?')) return;
    try {
      await api.clearWatchHistory();
      setContinueWatching([]);
      showNotification('Watch history cleared.');
    } catch (err) {
      console.error('Failed to clear history:', err);
    }
  };

  const showNotification = (msg: string) => {
    setActionSuccessMessage(msg);
    setTimeout(() => setActionSuccessMessage(null), 3000);
  };

  // If user is unauthenticated, render guest profile overview
  if (!user) {
    return (
      <div className="max-w-4xl mx-auto space-y-8 pb-16" aria-label="Guest Profile Overview">
        <div className="glass-panel p-8 sm:p-12 rounded-3xl border border-white/10 text-center relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-purple-600/10 blur-3xl pointer-events-none" />
          <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-[#7C3AED] to-[#8B5CF6] flex items-center justify-center mx-auto shadow-xl shadow-purple-600/30 mb-4">
            <UserIcon className="w-10 h-10 text-white" />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-purple-900/50 text-purple-300 border border-purple-500/30 mb-2">
            <span>Guest Explorer</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Vyntra Profile</h1>
          <p className="text-xs sm:text-sm text-gray-400 max-w-lg mx-auto mt-2 leading-relaxed">
            Sign in to customize your profile, track viewing achievements, manage subscriptions, sync devices, and configure learning preferences.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
            <Link
              to="/login?redirect=/profile"
              className="px-6 py-3 rounded-xl text-xs sm:text-sm font-bold btn-primary flex items-center gap-2 shadow-lg shadow-purple-600/30"
            >
              <span>Sign In to Your Account</span>
            </Link>
            <Link
              to="/register"
              className="px-6 py-3 rounded-xl text-xs sm:text-sm font-semibold btn-secondary flex items-center gap-2"
            >
              <span>Create Free Account</span>
            </Link>
          </div>
        </div>

        {/* Feature benefits */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="glass-card p-5 rounded-2xl border border-white/5 space-y-2">
            <Shield className="w-6 h-6 text-purple-400" />
            <h3 className="text-xs font-bold text-white">Multi-Device Sync</h3>
            <p className="text-[11px] text-gray-400 leading-relaxed">
              Resume watching across your laptop, tablet, and mobile with active session controls.
            </p>
          </div>
          <div className="glass-card p-5 rounded-2xl border border-white/5 space-y-2">
            <Sparkles className="w-6 h-6 text-purple-400" />
            <h3 className="text-xs font-bold text-white">Personalized Feeds</h3>
            <p className="text-[11px] text-gray-400 leading-relaxed">
              Tailored science and educational discovery based on your topics and interest signals.
            </p>
          </div>
          <div className="glass-card p-5 rounded-2xl border border-white/5 space-y-2">
            <Download className="w-6 h-6 text-purple-400" />
            <h3 className="text-xs font-bold text-white">Tier Subscriptions</h3>
            <p className="text-[11px] text-gray-400 leading-relaxed">
              Flexible Creator and Pro memberships with high-resolution offline download quotas.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-16" aria-label="Personal Library Dashboard">
      {/* Toast Alert */}
      {actionSuccessMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-purple-900/90 text-white text-xs px-4 py-2 rounded-full shadow-2xl border border-purple-500/40">
          {actionSuccessMessage}
        </div>
      )}

      {/* Profile Banner */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl relative overflow-hidden border border-white/10">
        <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
            <img
              src={user?.avatarUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${user?.username}`}
              alt={user?.username}
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover border-2 border-purple-500/40 shadow-xl"
            />
            <div className="space-y-1.5">
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-white">{user?.username}</h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-900/50 text-purple-300 border border-purple-500/30">
                  {user?.role} Tier
                </span>
              </div>
              <p className="text-xs text-gray-400 flex items-center justify-center sm:justify-start gap-1">
                <Mail className="w-3.5 h-3.5" />
                {user?.email}
              </p>
              <p className="text-xs text-gray-300 max-w-lg mt-1">
                {user?.biography || 'Passionate explorer of verified science and global educational media.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-center sm:self-start">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="px-4 py-2 rounded-xl text-xs font-semibold btn-secondary flex items-center gap-1.5"
            >
              <Edit3 className="w-3.5 h-3.5 text-purple-400" />
              <span>{isEditing ? 'Cancel Edit' : 'Edit Profile'}</span>
            </button>
            <button
              onClick={() => setIsCategoryModalOpen(true)}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 flex items-center gap-1.5 transition-colors"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Interests</span>
            </button>
          </div>
        </div>

        {/* Profile Success Toast */}
        {profileSuccessMsg && (
          <div className="mt-4 p-3 rounded-xl bg-green-950/30 border border-green-500/30 text-green-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-400" />
            <span>Profile details saved successfully!</span>
          </div>
        )}
      </div>

      {/* Edit Form Drawer */}
      {isEditing && (
        <div className="glass-card p-6 rounded-2xl border border-purple-500/30">
          <h3 className="text-sm font-bold text-white mb-4">Edit Profile Details</h3>
          <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
            <div>
              <label className="block text-gray-300 font-semibold mb-1">Username</label>
              <input
                type="text"
                required
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="w-full p-2.5 rounded-xl glass-input"
              />
            </div>
            <div>
              <label className="block text-gray-300 font-semibold mb-1">Avatar Image URL</label>
              <input
                type="url"
                value={formData.avatarUrl}
                onChange={(e) => setFormData({ ...formData, avatarUrl: e.target.value })}
                className="w-full p-2.5 rounded-xl glass-input font-mono text-[11px]"
              />
            </div>
            <div>
              <label className="block text-gray-300 font-semibold mb-1">Biography</label>
              <textarea
                rows={3}
                value={formData.biography}
                onChange={(e) => setFormData({ ...formData, biography: e.target.value })}
                className="w-full p-2.5 rounded-xl glass-input resize-none"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 rounded-xl btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSavingProfile}
                className="px-5 py-2 rounded-xl btn-primary font-semibold"
              >
                {isSavingProfile ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Quick Stat Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div
          onClick={() => setActiveTab('continue_watching')}
          className="glass-card p-4 rounded-2xl text-center space-y-1 cursor-pointer hover:border-purple-500/40 transition-all"
        >
          <History className="w-5 h-5 text-purple-400 mx-auto" />
          <p className="text-lg font-bold text-white">{continueWatching.length}</p>
          <p className="text-[11px] text-gray-400 uppercase tracking-wider">In Progress</p>
        </div>

        <div
          onClick={() => setActiveTab('watch_later')}
          className="glass-card p-4 rounded-2xl text-center space-y-1 cursor-pointer hover:border-purple-500/40 transition-all"
        >
          <Bookmark className="w-5 h-5 text-purple-400 mx-auto" />
          <p className="text-lg font-bold text-white">{savedVideos.length}</p>
          <p className="text-[11px] text-gray-400 uppercase tracking-wider">Watch Later</p>
        </div>

        <div
          onClick={() => setActiveTab('playlists')}
          className="glass-card p-4 rounded-2xl text-center space-y-1 cursor-pointer hover:border-purple-500/40 transition-all"
        >
          <Layers className="w-5 h-5 text-purple-400 mx-auto" />
          <p className="text-lg font-bold text-white">{playlists.length}</p>
          <p className="text-[11px] text-gray-400 uppercase tracking-wider">Playlists</p>
        </div>

        <div
          onClick={() => setActiveTab('downloads')}
          className="glass-card p-4 rounded-2xl text-center space-y-1 cursor-pointer hover:border-purple-500/40 transition-all"
        >
          <Download className="w-5 h-5 text-purple-400 mx-auto" />
          <p className="text-lg font-bold text-white">{downloads.length}</p>
          <p className="text-[11px] text-gray-400 uppercase tracking-wider">Downloads</p>
        </div>
      </div>

      {/* Library Tabs */}
      <div className="space-y-6">
        <div className="flex items-center gap-2 border-b border-white/10 pb-1 overflow-x-auto scrollbar-none" role="tablist">
          {[
            { id: 'overview', label: 'Overview', icon: Film },
            { id: 'continue_watching', label: `Continue Watching (${continueWatching.length})`, icon: History },
            { id: 'playlists', label: `Playlists (${playlists.length})`, icon: Layers },
            { id: 'watch_later', label: `Watch Later (${savedVideos.length})`, icon: Bookmark },
            { id: 'downloads', label: `Downloads & Quota`, icon: Download },
            { id: 'settings', label: 'Preferences & Privacy', icon: Settings },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as DashboardTab)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
                role="tab"
                aria-selected={activeTab === tab.id}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Continue watching row if items exist */}
            {continueWatching.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <History className="w-4 h-4 text-purple-400" />
                    <span>Jump Back In</span>
                  </h3>
                  <button
                    onClick={() => setActiveTab('continue_watching')}
                    className="text-xs text-purple-400 hover:underline font-semibold"
                  >
                    View All ({continueWatching.length}) →
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {continueWatching.slice(0, 4).map((item) => (
                    <VideoCard
                      key={item.id}
                      video={item}
                      onRemoveContinueWatching={handleRemoveContinueWatching}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Watch Later row */}
            {savedVideos.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Bookmark className="w-4 h-4 text-purple-400" />
                    <span>Saved for Later</span>
                  </h3>
                  <Link to="/saved" className="text-xs text-purple-400 hover:underline font-semibold">
                    Full Saved List →
                  </Link>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {savedVideos.slice(0, 4).map((video) => (
                    <VideoCard key={video.id} video={video} />
                  ))}
                </div>
              </div>
            )}

            {/* Custom Playlists row */}
            {playlists.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Layers className="w-4 h-4 text-purple-400" />
                    <span>My Playlists</span>
                  </h3>
                  <Link to="/playlists" className="text-xs text-purple-400 hover:underline font-semibold">
                    Manage All →
                  </Link>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {playlists.slice(0, 3).map((pl) => (
                    <Link
                      key={pl.id}
                      to={`/playlist/${pl.id}`}
                      className="glass-card p-4 rounded-2xl hover:border-purple-500/40 transition-all block group"
                    >
                      <h4 className="font-bold text-white group-hover:text-purple-300 transition-colors line-clamp-1">
                        {pl.title}
                      </h4>
                      <p className="text-xs text-gray-400 line-clamp-1 mt-1">
                        {pl.itemCount ?? pl.items?.length ?? 0} videos • {pl.isPrivate ? 'Private' : 'Public'}
                      </p>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: CONTINUE WATCHING */}
        {activeTab === 'continue_watching' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">
                Videos saved with playback positions. Completed videos clear automatically.
              </span>
              {continueWatching.length > 0 && (
                <button
                  onClick={handleClearContinueWatching}
                  className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 font-semibold"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear All Unfinished</span>
                </button>
              )}
            </div>

            {continueWatching.length === 0 ? (
              <div className="glass-card p-12 text-center rounded-2xl space-y-3">
                <History className="w-10 h-10 text-purple-400 mx-auto opacity-70" />
                <h3 className="text-base font-bold text-white">No videos in progress</h3>
                <p className="text-xs text-gray-400">
                  When you pause or leave a video partway through, it will show up here so you can resume anytime.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {continueWatching.map((item) => (
                  <VideoCard
                    key={item.id}
                    video={item}
                    onRemoveContinueWatching={handleRemoveContinueWatching}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: PLAYLISTS */}
        {activeTab === 'playlists' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">Personal video sequences and learning collections.</span>
              <Link to="/playlists" className="btn-primary px-3.5 py-1.5 rounded-xl text-xs font-bold">
                + Create Playlist
              </Link>
            </div>

            {playlists.length === 0 ? (
              <div className="glass-card p-12 text-center rounded-2xl space-y-3">
                <Layers className="w-10 h-10 text-purple-400 mx-auto opacity-70" />
                <h3 className="text-base font-bold text-white">No playlists yet</h3>
                <p className="text-xs text-gray-400">
                  Group your favourite lectures and documentaries into sequential study playlists.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                {playlists.map((pl) => (
                  <Link
                    key={pl.id}
                    to={`/playlist/${pl.id}`}
                    className="glass-card p-4 rounded-2xl border border-white/5 hover:border-purple-500/40 transition-all block group"
                  >
                    <h4 className="font-bold text-white text-sm group-hover:text-purple-300 transition-colors line-clamp-1">
                      {pl.title}
                    </h4>
                    <p className="text-xs text-gray-400 line-clamp-2 mt-1 leading-relaxed">
                      {pl.description || 'Custom personal sequence.'}
                    </p>
                    <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between text-xs text-gray-500">
                      <span>{pl.itemCount ?? pl.items?.length ?? 0} videos</span>
                      <span className="text-purple-400">Open Collection →</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: WATCH LATER */}
        {activeTab === 'watch_later' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">All videos bookmarked for future watching.</span>
              {savedVideos.length > 0 && (
                <button
                  onClick={handleClearWatchLater}
                  className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 font-semibold"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear All</span>
                </button>
              )}
            </div>

            {savedVideos.length === 0 ? (
              <div className="glass-card p-12 text-center rounded-2xl space-y-3">
                <Bookmark className="w-10 h-10 text-purple-400 mx-auto opacity-70" />
                <h3 className="text-base font-bold text-white">No videos in Watch Later</h3>
                <p className="text-xs text-gray-400">
                  Click the bookmark button on any video card to save it here.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {savedVideos.map((video) => (
                  <VideoCard
                    key={video.id}
                    video={video}
                    onSaveToggle={(id, saved) => {
                      if (!saved) setSavedVideos((prev) => prev.filter((v) => v.id !== id));
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 5: DOWNLOADS & QUOTA */}
        {activeTab === 'downloads' && (
          <div className="space-y-6 text-xs">
            {quota && (
              <div className="glass-card p-5 rounded-2xl border border-purple-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <span className="px-2 py-0.5 rounded-full bg-purple-900/40 text-purple-300 font-bold text-[10px] uppercase tracking-wider border border-purple-500/20">
                    Active Plan: {quota.planName}
                  </span>
                  <h3 className="text-base font-bold text-white">Daily Quota Status</h3>
                  <p className="text-gray-400">
                    {quota.remaining} of {quota.downloadLimit} downloads remaining for today.
                  </p>
                </div>
                <Link to="/pricing" className="btn-primary px-4 py-2 rounded-xl font-bold">
                  Upgrade Quota Tier
                </Link>
              </div>
            )}

            <div className="space-y-3">
              <h3 className="font-bold text-white text-sm">Download History ({downloads.length})</h3>
              {downloads.length === 0 ? (
                <div className="glass-card p-8 text-center text-gray-400 rounded-xl">
                  No downloads registered on this account yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {downloads.map((dl: any) => (
                    <div
                      key={dl.id}
                      className="glass-card p-3 rounded-xl border border-white/5 flex items-center justify-between"
                    >
                      <div>
                        <span className="font-semibold text-white block">{dl.video?.title || 'Downloaded Media'}</span>
                        <span className="text-[11px] text-gray-500">
                          {new Date(dl.createdAt).toLocaleString()} • {dl.quality} • {dl.format}
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-300 text-[10px] font-bold">
                        {dl.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 6: PREFERENCES & PRIVACY */}
        {activeTab === 'settings' && (
          <div className="space-y-6 text-xs">
            {/* Viewing & Accessibility Preferences */}
            <div className="glass-card p-6 rounded-2xl border border-white/10 space-y-4">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Globe className="w-4 h-4 text-purple-400" />
                <span>Viewing & Accessibility Preferences</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Font Size */}
                <div>
                  <label className="block text-gray-300 font-semibold mb-1">Text Scaling</label>
                  <select
                    value={preferences.fontSize}
                    onChange={(e) => updatePreference('fontSize', e.target.value as any)}
                    className="w-full p-2.5 rounded-xl glass-input bg-[#111827]"
                  >
                    <option value="small">Compact (Default)</option>
                    <option value="medium">Comfortable</option>
                    <option value="large">Enlarged (High Readability)</option>
                  </select>
                </div>
              </div>

              {/* Accessibility Toggles */}
              <div className="space-y-2 pt-2 border-t border-white/5">
                <label className="flex items-center justify-between p-2 rounded-xl hover:bg-white/[0.02] cursor-pointer">
                  <div>
                    <span className="font-medium text-white block">Reduced Motion</span>
                    <span className="text-[11px] text-gray-400">Minimizes animated carousel rotations and micro-transitions.</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.reducedMotion}
                    onChange={(e) => updatePreference('reducedMotion', e.target.checked)}
                    className="rounded accent-purple-500 w-4 h-4"
                  />
                </label>

                <label className="flex items-center justify-between p-2 rounded-xl hover:bg-white/[0.02] cursor-pointer">
                  <div>
                    <span className="font-medium text-white block">Closed Captions Preference</span>
                    <span className="text-[11px] text-gray-400">Automatically display subtitles when available.</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.captionsEnabled}
                    onChange={(e) => updatePreference('captionsEnabled', e.target.checked)}
                    className="rounded accent-purple-500 w-4 h-4"
                  />
                </label>

                <label className="flex items-center justify-between p-2 rounded-xl hover:bg-white/[0.02] cursor-pointer">
                  <div>
                    <span className="font-medium text-white block">Autoplay Next Video</span>
                    <span className="text-[11px] text-gray-400">Play sequence items automatically when finished.</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.autoplay}
                    onChange={(e) => updatePreference('autoplay', e.target.checked)}
                    className="rounded accent-purple-500 w-4 h-4"
                  />
                </label>
              </div>
            </div>

            {/* Privacy & Recommendation Controls */}
            <div className="glass-card p-6 rounded-2xl border border-red-500/20 space-y-4">
              <h3 className="font-bold text-red-300 text-sm flex items-center gap-2">
                <Shield className="w-4 h-4 text-red-400" />
                <span>Account Privacy & Recommendation Controls</span>
              </h3>

              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5">
                  <div>
                    <span className="font-semibold text-white block">Reset Recommendation Preferences</span>
                    <p className="text-[11px] text-gray-400">
                      Clears your personalized interest weightings, 'Not Interested' feedback, and ranking score signals.
                    </p>
                  </div>
                  <button
                    onClick={handleResetRecommendations}
                    className="btn-secondary px-3.5 py-2 rounded-xl text-xs font-semibold text-purple-300 hover:text-white flex-shrink-0"
                  >
                    Reset Preferences
                  </button>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5">
                  <div>
                    <span className="font-semibold text-white block">Clear Entire Watch History</span>
                    <p className="text-[11px] text-gray-400">
                      Permanently wipes all recorded watch sessions, timestamps, and progress indicators.
                    </p>
                  </div>
                  <button
                    onClick={handleClearWatchHistory}
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-red-950/40 hover:bg-red-900/50 text-red-300 border border-red-500/30 flex-shrink-0 transition-colors"
                  >
                    Clear History
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Category Preference Tuning Modal */}
      <CategoryPreferenceModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        onSaved={() => showNotification('Preferred categories updated successfully!')}
      />
    </div>
  );
};
