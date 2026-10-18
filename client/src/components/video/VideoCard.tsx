import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Heart,
  Bookmark,
  Eye,
  Share2,
  MoreVertical,
  ListPlus,
  ThumbsDown,
  Flag,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { Video } from '../../types';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { AddToPlaylistModal } from './AddToPlaylistModal';
import { ReportVideoModal } from './ReportVideoModal';

interface VideoCardProps {
  video: Video & {
    progressPercentage?: number;
    progressSeconds?: number;
    completed?: boolean;
  };
  onLikeToggle?: (id: string, liked: boolean) => void;
  onSaveToggle?: (id: string, saved: boolean) => void;
  onFeedback?: (videoId: string, type: string) => void;
  onRemoveContinueWatching?: (videoId: string) => void;
}

export const VideoCard: React.FC<VideoCardProps> = ({
  video,
  onLikeToggle,
  onSaveToggle,
  onFeedback,
  onRemoveContinueWatching,
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [showShareToast, setShowShareToast] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [showMenu, setShowMenu] = useState(false);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  const [imgSrc, setImgSrc] = useState(video.thumbnailUrl || '/placeholder-thumb.jpg');
  const [imgFailed, setImgFailed] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu]);

  // Format duration (seconds -> mm:ss)
  const formatDuration = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const remainder = sec % 60;
    return `${mins}:${remainder < 10 ? '0' : ''}${remainder}`;
  };

  // Format view count
  const formatViews = (views: number) => {
    if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`;
    if (views >= 1000) return `${(views / 1000).toFixed(1)}K`;
    return views.toString();
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleLike = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      navigate('/login');
      return;
    }
    try {
      const res = await api.toggleLike(video.id);
      setIsLiked(res.liked);
      onLikeToggle?.(video.id, res.liked);
    } catch (err) {}
  };

  const handleSave = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      navigate('/login');
      return;
    }
    try {
      const res = await api.toggleSave(video.id);
      setIsSaved(res.saved);
      onSaveToggle?.(video.id, res.saved);
      showToast(res.saved ? 'Saved to Watch Later' : 'Removed from Watch Later');
    } catch (err) {}
  };

  const handleShare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(`${window.location.origin}/watch/${video.id}`);
    setShowShareToast(true);
    setTimeout(() => setShowShareToast(false), 2000);
  };

  const handleFeedback = async (e: React.MouseEvent, type: string) => {
    e.preventDefault();
    e.stopPropagation();
    setShowMenu(false);

    if (!user) {
      navigate('/login');
      return;
    }

    try {
      await api.recordRecommendationFeedback({
        videoId: video.id,
        categoryId: video.categoryId,
        provider: video.provider,
        feedbackType: type,
      });

      showToast(type === 'NOT_INTERESTED' ? 'Marked as Not Interested' : 'Showing fewer like this');
      onFeedback?.(video.id, type);
    } catch (err) {
      console.error(err);
    }
  };

  const progressPercent = video.progressPercentage || (
    video.durationSeconds > 0 && video.progressSeconds
      ? Math.min(100, Math.round((video.progressSeconds / video.durationSeconds) * 100))
      : 0
  );

  return (
    <>
      <div className="group glass-card rounded-2xl overflow-hidden flex flex-col relative transition-all duration-300">
        {/* Share Toast */}
        {showShareToast && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 bg-purple-900/90 text-white text-[11px] px-3 py-1 rounded-full shadow-lg border border-purple-500/40">
            Link copied!
          </div>
        )}

        {/* Action Toast */}
        {toastMessage && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 bg-black/90 text-purple-200 text-[11px] px-3 py-1 rounded-full shadow-lg border border-purple-500/40 truncate max-w-[90%]">
            {toastMessage}
          </div>
        )}

        {/* Thumbnail Container */}
        <div className="relative aspect-video w-full overflow-hidden bg-slate-900 block">
          <Link to={`/watch/${video.id}`} className="absolute inset-0 z-0 block" aria-label={video.title}>
            <img
              src={imgFailed ? 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&q=80' : imgSrc}
              alt={video.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              loading="lazy"
              onError={() => {
                if (!imgFailed) {
                  setImgFailed(true);
                  setImgSrc('https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&q=80');
                }
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />

            {/* Duration Badge */}
            <div className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded-md bg-black/80 text-[11px] font-semibold text-white tracking-wide backdrop-blur-sm z-10">
              {formatDuration(video.durationSeconds)}
            </div>

            {/* Continue Watching Progress Bar */}
            {progressPercent > 0 && (
              <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-white/20 z-10">
                <div
                  className="h-full bg-purple-500 transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            )}
          </Link>

          {/* Category & Provider Badges */}
          <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 flex-wrap max-w-[65%] z-10 pointer-events-none">
            {video.provider === 'NASA' && (
              <span className="px-2 py-0.5 rounded-full bg-blue-950/80 text-[10px] font-bold text-cyan-200 border border-cyan-500/40 backdrop-blur-md">
                NASA
              </span>
            )}
            {video.provider === 'ARCHIVE' && (
              <span className="px-2 py-0.5 rounded-full bg-amber-950/80 text-[10px] font-bold text-amber-200 border border-amber-500/40 backdrop-blur-md">
                Archive
              </span>
            )}
            {video.provider === 'VYNTRA' && (
              <span className="px-2 py-0.5 rounded-full bg-purple-950/80 text-[10px] font-bold text-purple-200 border border-purple-500/40 backdrop-blur-md">
                Original
              </span>
            )}
            {video.category && (
              <div className="px-2.5 py-0.5 rounded-full bg-slate-900/80 text-[10px] font-medium text-gray-200 border border-white/10 backdrop-blur-md truncate max-w-[110px]">
                {video.category.name}
              </div>
            )}
          </div>

          {/* Quick Action Overlay (Touch Friendly 36-40px buttons) */}
          <div className="absolute top-2 right-2 flex items-center gap-1.5 z-20">
            {/* Quick Save (Watch Later) Button */}
            <button
              onClick={handleSave}
              className={`w-8 h-8 sm:w-7 sm:h-7 rounded-full backdrop-blur-md flex items-center justify-center transition-all shadow-md ${
                isSaved ? 'bg-purple-600 text-white' : 'bg-black/70 text-white hover:bg-black/90'
              }`}
              title="Watch Later (Quick Save)"
              aria-label="Save for Later"
            >
              <Bookmark className={`w-3.5 h-3.5 ${isSaved ? 'fill-current' : ''}`} />
            </button>

            {/* Like Button */}
            <button
              onClick={handleLike}
              className={`w-8 h-8 sm:w-7 sm:h-7 rounded-full backdrop-blur-md flex items-center justify-center transition-all shadow-md ${
                isLiked ? 'bg-red-500 text-white' : 'bg-black/70 text-white hover:bg-black/90 opacity-0 group-hover:opacity-100 sm:flex hidden'
              }`}
              title="Like"
              aria-label="Like video"
            >
              <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-current' : ''}`} />
            </button>

            {/* Three-Dot Menu Button */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowMenu((prev) => !prev);
                }}
                className="w-8 h-8 sm:w-7 sm:h-7 rounded-full bg-black/70 text-white hover:bg-black/90 backdrop-blur-md flex items-center justify-center transition-all shadow-md"
                title="More options"
                aria-label="More video options"
              >
                <MoreVertical className="w-3.5 h-3.5" />
              </button>

              {/* Dropdown Menu */}
              {showMenu && (
                <div className="glass-dropdown absolute right-0 mt-1.5 w-48 rounded-xl py-1 z-50 text-xs shadow-2xl border border-white/10">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setShowMenu(false);
                      if (!user) {
                        navigate('/login');
                        return;
                      }
                      setShowPlaylistModal(true);
                    }}
                    className="w-full px-3.5 py-2 text-left text-gray-200 hover:bg-purple-600/30 hover:text-white flex items-center gap-2 transition-colors"
                  >
                    <ListPlus className="w-3.5 h-3.5 text-purple-400" />
                    <span>Add to Playlist</span>
                  </button>

                  <button
                    onClick={(e) => {
                      handleShare(e);
                      setShowMenu(false);
                    }}
                    className="w-full px-3.5 py-2 text-left text-gray-200 hover:bg-purple-600/30 hover:text-white flex items-center gap-2 transition-colors sm:hidden"
                  >
                    <Share2 className="w-3.5 h-3.5 text-purple-400" />
                    <span>Share Video</span>
                  </button>

                  <button
                    onClick={(e) => {
                      handleLike(e);
                      setShowMenu(false);
                    }}
                    className="w-full px-3.5 py-2 text-left text-gray-200 hover:bg-purple-600/30 hover:text-white flex items-center gap-2 transition-colors sm:hidden"
                  >
                    <Heart className={`w-3.5 h-3.5 ${isLiked ? 'text-red-400 fill-current' : 'text-gray-400'}`} />
                    <span>{isLiked ? 'Unlike' : 'Like'}</span>
                  </button>

                  <button
                    onClick={(e) => handleFeedback(e, 'NOT_INTERESTED')}
                    className="w-full px-3.5 py-2 text-left text-gray-200 hover:bg-purple-600/30 hover:text-white flex items-center gap-2 transition-colors"
                  >
                    <ThumbsDown className="w-3.5 h-3.5 text-gray-400" />
                    <span>Not Interested</span>
                  </button>

                  <button
                    onClick={(e) => handleFeedback(e, 'SHOW_FEWER')}
                    className="w-full px-3.5 py-2 text-left text-gray-200 hover:bg-purple-600/30 hover:text-white flex items-center gap-2 transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-gray-400" />
                    <span>Show Fewer Like This</span>
                  </button>

                  {onRemoveContinueWatching && (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setShowMenu(false);
                        onRemoveContinueWatching(video.id);
                      }}
                      className="w-full px-3.5 py-2 text-left text-gray-200 hover:bg-purple-600/30 hover:text-white flex items-center gap-2 transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-red-400" />
                      <span>Remove from Watching</span>
                    </button>
                  )}

                  <div className="my-1 border-t border-white/10" />

                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setShowMenu(false);
                      setShowReportModal(true);
                    }}
                    className="w-full px-3.5 py-2 text-left text-red-400 hover:bg-red-950/40 flex items-center gap-2 transition-colors"
                  >
                    <Flag className="w-3.5 h-3.5" />
                    <span>Report Video</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Info Body */}
        <div className="p-3.5 flex gap-3 flex-1">
          {video.creator ? (
            <Link
              to={`/creator/${video.creator.id}`}
              className="flex-shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={video.creator.avatarUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${video.creator.username}`}
                alt={video.creator.username}
                className="w-9 h-9 rounded-full object-cover border border-white/10 hover:border-purple-500 transition-colors"
                loading="lazy"
              />
            </Link>
          ) : (
            <div className="w-9 h-9 rounded-full flex-shrink-0 bg-white/5 border border-white/10 flex items-center justify-center text-xs font-bold text-purple-300">
              {video.creatorName ? video.creatorName.slice(0, 2).toUpperCase() : 'V'}
            </div>
          )}

          <div className="flex-1 min-w-0">
            <Link to={`/watch/${video.id}`} className="block">
              <h3 className="text-sm font-semibold text-white group-hover:text-purple-300 transition-colors line-clamp-2 leading-snug">
                {video.title}
              </h3>
            </Link>

            {video.creator ? (
              <Link
                to={`/creator/${video.creator.id}`}
                className="text-xs text-gray-400 hover:text-gray-200 mt-1 inline-block truncate max-w-full font-medium"
              >
                {video.creator.username}
              </Link>
            ) : (
              <span className="text-xs text-gray-400 mt-1 inline-block truncate max-w-full font-medium">
                {video.creatorName || 'Vyntra Curator'}
              </span>
            )}

            <div className="flex items-center gap-2 text-[11px] text-gray-500 mt-1.5 flex-wrap">
              {video.subcategory && (
                <>
                  <span className="text-purple-400/90 truncate max-w-[110px]">{video.subcategory.name}</span>
                  <span>•</span>
                </>
              )}
              <span className="flex items-center gap-1">
                <Eye className="w-3 h-3" />
                {formatViews(video.viewsCount)}
              </span>
              <span>•</span>
              <span>{new Date(video.publishedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Playlist Modal */}
      {showPlaylistModal && (
        <AddToPlaylistModal
          videoId={video.id}
          isOpen={showPlaylistModal}
          onClose={() => setShowPlaylistModal(false)}
        />
      )}

      {/* Report Modal */}
      {showReportModal && (
        <ReportVideoModal
          videoId={video.id}
          videoTitle={video.title}
          isOpen={showReportModal}
          onClose={() => setShowReportModal(false)}
        />
      )}
    </>
  );
};

export const VideoCardSkeleton: React.FC = () => {
  return (
    <div className="glass-card rounded-2xl overflow-hidden flex flex-col animate-pulse border border-white/5">
      <div className="aspect-video w-full bg-white/5 relative">
        <div className="absolute top-2.5 left-2.5 w-16 h-4 rounded-full bg-white/10" />
        <div className="absolute bottom-2.5 right-2.5 w-10 h-4 rounded bg-white/10" />
      </div>
      <div className="p-3.5 flex gap-3 flex-1">
        <div className="w-9 h-9 rounded-full bg-white/10 flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-3.5 bg-white/10 rounded w-full" />
          <div className="h-3 bg-white/5 rounded w-3/4" />
          <div className="h-2.5 bg-white/5 rounded w-1/2 pt-1" />
        </div>
      </div>
    </div>
  );
};
