import React, { useEffect, useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Bookmark,
  ListPlus,
  History,
  Download,
  Trash2,
  SlidersHorizontal,
  Compass,
  LogIn,
  UserPlus,
  Sparkles,
  ShieldCheck,
  FolderHeart,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { Video, Playlist } from '../types';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { VideoCard, VideoCardSkeleton } from '../components/video/VideoCard';

type LibraryTab = 'saved' | 'playlists' | 'history' | 'downloads';

export const LibraryPage: React.FC = () => {
  const { user, quota } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const tabParam = searchParams.get('tab') as LibraryTab;
  const [activeTab, setActiveTab] = useState<LibraryTab>(tabParam || 'saved');

  // Watch Later / Saved Videos State
  const [savedVideos, setSavedVideos] = useState<Video[]>([]);
  const [isSavedLoading, setIsSavedLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'duration_desc' | 'duration_asc' | 'title'>('recent');

  // Playlists State
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [isPlaylistsLoading, setIsPlaylistsLoading] = useState(false);

  // Watch History State
  const [watchHistory, setWatchHistory] = useState<any[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

  // Downloads State
  const [downloads, setDownloads] = useState<any[]>([]);
  const [isDownloadsLoading, setIsDownloadsLoading] = useState(false);

  // Trending preview for guests
  const [guestPreviewVideos, setGuestPreviewVideos] = useState<Video[]>([]);

  useEffect(() => {
    if (tabParam && ['saved', 'playlists', 'history', 'downloads'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const handleTabChange = (tab: LibraryTab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  // Load data depending on user session
  useEffect(() => {
    if (user) {
      if (activeTab === 'saved') {
        fetchSavedVideos();
      } else if (activeTab === 'playlists') {
        fetchPlaylists();
      } else if (activeTab === 'history') {
        fetchHistory();
      } else if (activeTab === 'downloads') {
        fetchDownloads();
      }
    } else {
      // Load trending public videos for guests to preview
      api.getVideos({ limit: 4, sortBy: 'views' })
        .then((res) => setGuestPreviewVideos(res?.videos || []))
        .catch(() => {});
    }
  }, [user, activeTab]);

  const fetchSavedVideos = () => {
    setIsSavedLoading(true);
    api.getSavedVideos()
      .then((data) => setSavedVideos(Array.isArray(data) ? data : []))
      .catch((err) => console.error('Failed to load saved videos:', err))
      .finally(() => setIsSavedLoading(false));
  };

  const fetchPlaylists = () => {
    setIsPlaylistsLoading(true);
    api.getMyPlaylists()
      .then((data) => setPlaylists(Array.isArray(data) ? data : []))
      .catch((err) => console.error('Failed to load playlists:', err))
      .finally(() => setIsPlaylistsLoading(false));
  };

  const fetchHistory = () => {
    setIsHistoryLoading(true);
    api.getWatchHistory()
      .then((data) => setWatchHistory(Array.isArray(data) ? data : []))
      .catch((err) => console.error('Failed to load watch history:', err))
      .finally(() => setIsHistoryLoading(false));
  };

  const fetchDownloads = () => {
    setIsDownloadsLoading(true);
    api.getDownloads()
      .then((data) => setDownloads(Array.isArray(data) ? data : []))
      .catch((err) => console.error('Failed to load downloads:', err))
      .finally(() => setIsDownloadsLoading(false));
  };

  const handleSaveToggle = (id: string, saved: boolean) => {
    if (!saved) {
      setSavedVideos((prev) => prev.filter((v) => v.id !== id));
    }
  };

  const handleClearAllSaved = async () => {
    if (!window.confirm('Are you sure you want to clear all videos from Watch Later?')) return;
    try {
      await api.clearSavedVideos();
      setSavedVideos([]);
    } catch (err) {
      console.error('Failed to clear saved videos:', err);
    }
  };

  // Categories in saved items
  const availableCategories = useMemo(() => {
    const cats = new Map<string, string>();
    savedVideos.forEach((v) => {
      if (v.category) {
        cats.set(v.category.slug, v.category.name);
      }
    });
    return Array.from(cats.entries());
  }, [savedVideos]);

  // Filter & sort saved videos
  const filteredSavedVideos = useMemo(() => {
    let result = [...savedVideos];
    if (selectedCategory !== 'all') {
      result = result.filter((v) => v.category?.slug === selectedCategory);
    }
    if (sortBy === 'duration_desc') {
      result.sort((a, b) => (b.durationSeconds || 0) - (a.durationSeconds || 0));
    } else if (sortBy === 'duration_asc') {
      result.sort((a, b) => (a.durationSeconds || 0) - (b.durationSeconds || 0));
    } else if (sortBy === 'title') {
      result.sort((a, b) => a.title.localeCompare(b.title));
    }
    return result;
  }, [savedVideos, selectedCategory, sortBy]);

  // If user is unauthenticated, render guest-friendly Library preview
  if (!user) {
    return (
      <div className="max-w-5xl mx-auto space-y-8 pb-16" aria-label="Vyntra Guest Library">
        {/* Guest Banner */}
        <div className="glass-panel p-8 sm:p-12 rounded-3xl border border-white/10 text-center relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-purple-600/10 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 rounded-full bg-indigo-600/10 blur-3xl pointer-events-none" />

          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#7C3AED] to-[#8B5CF6] flex items-center justify-center mx-auto shadow-xl shadow-purple-600/30 mb-5">
            <Bookmark className="w-8 h-8 text-white" />
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            Your Personal Vyntra Library
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 max-w-xl mx-auto mt-2 leading-relaxed">
            Organize watchlists, bookmark scientific discoveries, resume videos across devices, and manage offline downloads in one place.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
            <Link
              to="/login?redirect=/library"
              className="px-6 py-3 rounded-xl text-xs sm:text-sm font-bold btn-primary flex items-center gap-2 shadow-lg shadow-purple-600/30"
            >
              <LogIn className="w-4 h-4" />
              <span>Sign In to Access Library</span>
            </Link>
            <Link
              to="/register"
              className="px-6 py-3 rounded-xl text-xs sm:text-sm font-semibold btn-secondary flex items-center gap-2"
            >
              <UserPlus className="w-4 h-4 text-purple-400" />
              <span>Create Free Account</span>
            </Link>
          </div>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="glass-card p-5 rounded-2xl border border-white/5 space-y-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-950/60 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Bookmark className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-white">Watch Later</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Pin lectures, documentaries, and research videos to your queue with a single tap.
            </p>
          </div>

          <div className="glass-card p-5 rounded-2xl border border-white/5 space-y-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-950/60 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <ListPlus className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-white">Custom Playlists</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Create thematic collections, order your favorite learning series, and share with colleagues.
            </p>
          </div>

          <div className="glass-card p-5 rounded-2xl border border-white/5 space-y-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-950/60 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Clock className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-white">Continue Watching</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Automatic second-by-second progress tracking keeps your place on mobile and desktop.
            </p>
          </div>

          <div className="glass-card p-5 rounded-2xl border border-white/5 space-y-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-950/60 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Download className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-white">Offline Downloads</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Save up to 4K videos directly to your device for smooth offline study with quota control.
            </p>
          </div>
        </div>

        {/* Public Trending Videos to Save */}
        {guestPreviewVideos.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <h2 className="text-base font-bold text-white">Trending Media You Can Save</h2>
              </div>
              <Link to="/explore" className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 font-semibold">
                <span>Browse All</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {guestPreviewVideos.map((video) => (
                <VideoCard key={video.id} video={video} />
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Authenticated View
  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16" aria-label="User Personal Library">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-2.5">
            <FolderHeart className="w-7 h-7 text-purple-400" />
            <span>My Library</span>
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Manage your personal watch later queue, playlists, history, and offline downloads.
          </p>
        </div>

        {/* Quick Nav to Profile */}
        <Link
          to="/profile"
          className="self-start sm:self-auto px-4 py-2 rounded-xl text-xs font-semibold btn-secondary flex items-center gap-1.5"
        >
          <span>View Profile</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Library Section Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1 border-b border-white/5">
        <button
          onClick={() => handleTabChange('saved')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'saved'
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Bookmark className="w-4 h-4" />
          <span>Watch Later ({savedVideos.length})</span>
        </button>

        <button
          onClick={() => handleTabChange('playlists')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'playlists'
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <ListPlus className="w-4 h-4" />
          <span>Playlists ({playlists.length})</span>
        </button>

        <button
          onClick={() => handleTabChange('history')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'history'
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Watch History</span>
        </button>

        <button
          onClick={() => handleTabChange('downloads')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'downloads'
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Download className="w-4 h-4" />
          <span>Downloads {quota ? `(${quota.remaining} left)` : ''}</span>
        </button>
      </div>

      {/* Tab Content: Watch Later */}
      {activeTab === 'saved' && (
        <div className="space-y-6">
          {savedVideos.length > 0 && (
            <div className="glass-card p-3 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs border border-white/10">
              <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`px-3 py-1.5 rounded-xl font-semibold transition-all whitespace-nowrap ${
                    selectedCategory === 'all'
                      ? 'bg-purple-600 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  All Categories ({savedVideos.length})
                </button>
                {availableCategories.map(([slug, name]) => (
                  <button
                    key={slug}
                    onClick={() => setSelectedCategory(slug)}
                    className={`px-3 py-1.5 rounded-xl font-medium transition-all whitespace-nowrap ${
                      selectedCategory === slug
                        ? 'bg-purple-600 text-white'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {name}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-purple-400" />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="bg-slate-900 border border-white/10 rounded-lg px-2.5 py-1 text-white text-xs focus:outline-none focus:border-purple-500"
                    aria-label="Sort saved videos"
                  >
                    <option value="recent">Recently Saved</option>
                    <option value="duration_desc">Longest Duration</option>
                    <option value="duration_asc">Shortest Duration</option>
                    <option value="title">Alphabetical (A-Z)</option>
                  </select>
                </div>

                <button
                  onClick={handleClearAllSaved}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-red-950/40 hover:bg-red-900/50 text-red-300 border border-red-500/30 text-xs font-semibold transition-colors"
                  title="Clear all saved videos"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear All</span>
                </button>
              </div>
            </div>
          )}

          {isSavedLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {Array.from({ length: 4 }).map((_, i) => (
                <VideoCardSkeleton key={i} />
              ))}
            </div>
          ) : savedVideos.length === 0 ? (
            <div className="glass-card rounded-2xl p-12 text-center max-w-md mx-auto space-y-4">
              <Bookmark className="w-12 h-12 text-purple-400 mx-auto opacity-70" />
              <h3 className="text-base font-bold text-white">Your Watch Later is Empty</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Tap the bookmark icon on any video card or watch page to save verified content here.
              </p>
              <Link to="/explore" className="inline-block px-5 py-2.5 rounded-xl text-xs font-bold btn-primary">
                Explore Videos
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {filteredSavedVideos.map((video) => (
                <VideoCard key={video.id} video={video} onSaveToggle={handleSaveToggle} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab Content: Playlists */}
      {activeTab === 'playlists' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white">Personal Playlists</h2>
            <Link
              to="/playlists"
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold btn-primary"
            >
              Open Playlist Manager
            </Link>
          </div>

          {isPlaylistsLoading ? (
            <div className="text-xs text-gray-400 p-8 text-center">Loading playlists...</div>
          ) : playlists.length === 0 ? (
            <div className="glass-card rounded-2xl p-12 text-center max-w-md mx-auto space-y-4">
              <ListPlus className="w-12 h-12 text-purple-400 mx-auto opacity-70" />
              <h3 className="text-base font-bold text-white">No Playlists Created Yet</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Create structured playlists for courses, research topics, or custom video series.
              </p>
              <Link to="/playlists" className="inline-block px-5 py-2.5 rounded-xl text-xs font-bold btn-primary">
                Create Your First Playlist
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {playlists.map((pl) => (
                <Link
                  key={pl.id}
                  to={`/playlist/${pl.id}`}
                  className="glass-card p-5 rounded-2xl hover:border-purple-500/40 transition-all space-y-3 block group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-purple-400 uppercase tracking-wider">
                      {pl.items?.length || 0} Videos
                    </span>
                    {pl.isPrivate ? (
                      <span className="text-[10px] text-gray-500 bg-white/5 px-2 py-0.5 rounded-full">Private</span>
                    ) : (
                      <span className="text-[10px] text-green-400 bg-green-950/40 px-2 py-0.5 rounded-full">Public</span>
                    )}
                  </div>
                  <h3 className="text-sm font-bold text-white group-hover:text-purple-300 transition-colors">
                    {pl.title}
                  </h3>
                  {pl.description && (
                    <p className="text-xs text-gray-400 line-clamp-2">{pl.description}</p>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab Content: History */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white">Recent Watch Activity</h2>
            <Link to="/history" className="text-xs text-purple-400 hover:text-purple-300 font-semibold">
              Manage Full History
            </Link>
          </div>

          {isHistoryLoading ? (
            <div className="text-xs text-gray-400 p-8 text-center">Loading watch history...</div>
          ) : watchHistory.length === 0 ? (
            <div className="glass-card rounded-2xl p-12 text-center max-w-md mx-auto space-y-4">
              <History className="w-12 h-12 text-purple-400 mx-auto opacity-70" />
              <h3 className="text-base font-bold text-white">No Watch History</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Videos you stream will appear here so you can easily resume watching.
              </p>
              <Link to="/explore" className="inline-block px-5 py-2.5 rounded-xl text-xs font-bold btn-primary">
                Explore Content
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {watchHistory.slice(0, 8).map((item) => (
                <VideoCard key={item.id || item.video?.id} video={item.video || item} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab Content: Downloads */}
      {activeTab === 'downloads' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white">Offline Downloads</h2>
            <Link to="/downloads" className="px-3.5 py-1.5 rounded-xl text-xs font-bold btn-primary">
              Download Center
            </Link>
          </div>

          {isDownloadsLoading ? (
            <div className="text-xs text-gray-400 p-8 text-center">Loading downloads...</div>
          ) : downloads.length === 0 ? (
            <div className="glass-card rounded-2xl p-12 text-center max-w-md mx-auto space-y-4">
              <Download className="w-12 h-12 text-purple-400 mx-auto opacity-70" />
              <h3 className="text-base font-bold text-white">No Videos Downloaded</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Download verified lectures and documentaries to watch anywhere without an internet connection.
              </p>
              <Link to="/downloads" className="inline-block px-5 py-2.5 rounded-xl text-xs font-bold btn-primary">
                View Download Quotas & Features
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {downloads.map((dl) => (
                <div key={dl.id} className="glass-card p-4 rounded-2xl space-y-2 border border-white/10">
                  <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider">{dl.status}</span>
                  <h4 className="text-xs font-bold text-white truncate">{dl.video?.title || 'Downloaded Video'}</h4>
                  <p className="text-[11px] text-gray-400">{dl.resolution} • {dl.fileSizeMb || 0} MB</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
