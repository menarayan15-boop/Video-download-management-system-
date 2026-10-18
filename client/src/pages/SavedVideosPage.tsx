import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Bookmark, AlertCircle, Trash2, Filter, SlidersHorizontal } from 'lucide-react';
import { Video } from '../types';
import { api } from '../services/api';
import { VideoCard, VideoCardSkeleton } from '../components/video/VideoCard';

export const SavedVideosPage: React.FC = () => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'duration_desc' | 'duration_asc' | 'title'>('recent');

  useEffect(() => {
    fetchSavedVideos();
  }, []);

  const fetchSavedVideos = () => {
    setIsLoading(true);
    api
      .getSavedVideos()
      .then((data) => setVideos(Array.isArray(data) ? data : []))
      .catch((err) => console.error('Failed to load saved videos:', err))
      .finally(() => setIsLoading(false));
  };

  const handleSaveToggle = (id: string, saved: boolean) => {
    if (!saved) {
      setVideos((prev) => prev.filter((v) => v.id !== id));
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm('Are you sure you want to clear all videos from Watch Later?')) return;
    try {
      await api.clearSavedVideos();
      setVideos([]);
    } catch (err) {
      console.error('Failed to clear saved videos:', err);
    }
  };

  // Distinct categories available in saved items
  const availableCategories = useMemo(() => {
    const cats = new Map<string, string>();
    videos.forEach((v) => {
      if (v.category) {
        cats.set(v.category.slug, v.category.name);
      }
    });
    return Array.from(cats.entries());
  }, [videos]);

  // Filter and Sort
  const filteredVideos = useMemo(() => {
    let result = [...videos];
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
  }, [videos, selectedCategory, sortBy]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16" aria-label="Watch Later and Saved Videos">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-2.5">
            <Bookmark className="w-7 h-7 text-purple-400" />
            <span>Watch Later & Quick Saves</span>
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Access and manage all videos pinned to your personal watch queue.
          </p>
        </div>

        {videos.length > 0 && (
          <button
            onClick={handleClearAll}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-950/40 hover:bg-red-900/50 text-red-300 border border-red-500/30 text-xs font-semibold self-start sm:self-auto transition-colors"
            title="Clear all saved videos"
          >
            <Trash2 className="w-4 h-4" />
            <span>Clear All ({videos.length})</span>
          </button>
        )}
      </div>

      {/* Filter & Sort Controls */}
      {videos.length > 0 && (
        <div className="glass-card p-3 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs border border-white/10">
          {/* Category Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 rounded-xl font-semibold transition-all whitespace-nowrap ${
                selectedCategory === 'all'
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              All Categories ({videos.length})
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

          {/* Sort Dropdown */}
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
        </div>
      )}

      {/* Video Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <VideoCardSkeleton key={i} />
          ))}
        </div>
      ) : videos.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center max-w-md mx-auto space-y-4">
          <Bookmark className="w-12 h-12 text-purple-400 mx-auto opacity-70" />
          <h3 className="text-base font-bold text-white">Your Watch Later is Empty</h3>
          <p className="text-xs text-gray-400 leading-relaxed">
            Tap the bookmark icon on any video card or detail page to queue it here for offline reference and later watching.
          </p>
          <Link to="/explore" className="inline-block px-5 py-2.5 rounded-xl text-xs font-bold btn-primary">
            Explore Discovery Feed
          </Link>
        </div>
      ) : filteredVideos.length === 0 ? (
        <div className="glass-card rounded-2xl p-8 text-center text-xs text-gray-400">
          No saved videos in this category.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {filteredVideos.map((video) => (
            <VideoCard key={video.id} video={video} onSaveToggle={handleSaveToggle} />
          ))}
        </div>
      )}
    </div>
  );
};
