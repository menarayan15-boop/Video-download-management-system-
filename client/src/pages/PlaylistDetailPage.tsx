import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, Link, useNavigate } from 'react-router-dom';
import {
  Layers,
  Play,
  Lock,
  Globe,
  Share2,
  Trash2,
  ArrowUp,
  ArrowDown,
  Clock,
  User as UserIcon,
  AlertCircle,
  Edit3,
  Check,
} from 'lucide-react';
import { Playlist, PlaylistItem } from '../types';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export const PlaylistDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || undefined;

  const { user } = useAuth();
  const navigate = useNavigate();

  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shareToast, setShareToast] = useState<string | null>(null);

  // Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editIsPrivate, setEditIsPrivate] = useState(true);

  useEffect(() => {
    if (id) {
      loadPlaylist();
    }
  }, [id, token]);

  const loadPlaylist = async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.getPlaylistById(id, token);
      setPlaylist(data);
      setEditTitle(data.title);
      setEditDescription(data.description || '');
      setEditIsPrivate(data.isPrivate);
    } catch (err: any) {
      console.error('Failed to load playlist:', err);
      setError(err.message || 'Playlist not found or you do not have permission to view it.');
    } finally {
      setIsLoading(false);
    }
  };

  const isOwner = user && playlist && user.id === playlist.userId;

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleShare = () => {
    if (!playlist) return;
    const shareUrl = `${window.location.origin}/playlist/${playlist.id}${playlist.shareToken ? `?token=${playlist.shareToken}` : ''}`;
    navigator.clipboard.writeText(shareUrl);
    setShareToast('Shareable link copied to clipboard!');
    setTimeout(() => setShareToast(null), 2500);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!playlist || !editTitle.trim()) return;

    try {
      const updated = await api.updatePlaylist(playlist.id, {
        title: editTitle.trim(),
        description: editDescription.trim() || undefined,
        isPrivate: editIsPrivate,
      });
      setPlaylist((prev) => (prev ? { ...prev, ...updated } : null));
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to update playlist:', err);
    }
  };

  const handleDelete = async () => {
    if (!playlist || !window.confirm(`Delete "${playlist.title}"?`)) return;
    try {
      await api.deletePlaylist(playlist.id);
      navigate('/playlists');
    } catch (err) {
      console.error('Failed to delete playlist:', err);
    }
  };

  const handleRemoveItem = async (videoId: string) => {
    if (!playlist) return;
    try {
      await api.removePlaylistItem(playlist.id, videoId);
      setPlaylist((prev) =>
        prev
          ? {
              ...prev,
              items: (prev.items || []).filter((item) => item.videoId !== videoId),
            }
          : null
      );
    } catch (err) {
      console.error('Failed to remove item:', err);
    }
  };

  const handleMove = async (currentIndex: number, direction: 'up' | 'down') => {
    if (!playlist || !playlist.items) return;
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= playlist.items.length) return;

    const newItems = [...playlist.items];
    const temp = newItems[currentIndex];
    newItems[currentIndex] = newItems[targetIndex];
    newItems[targetIndex] = temp;

    setPlaylist({ ...playlist, items: newItems });

    try {
      const videoIds = newItems.map((item) => item.videoId);
      await api.reorderPlaylist(playlist.id, videoIds);
    } catch (err) {
      console.error('Failed to reorder playlist:', err);
      loadPlaylist();
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="h-48 rounded-3xl bg-white/5 animate-pulse" />
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 rounded-2xl bg-white/5 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !playlist) {
    return (
      <div className="glass-card rounded-2xl p-12 text-center max-w-md mx-auto space-y-4 mt-8">
        <AlertCircle className="w-12 h-12 text-purple-400 mx-auto" />
        <h2 className="text-lg font-bold text-white">Playlist Unavailable</h2>
        <p className="text-xs text-gray-400 leading-relaxed">
          {error || 'This collection may be private or deleted by its author.'}
        </p>
        <Link to="/playlists" className="btn-primary px-5 py-2.5 rounded-xl text-xs font-bold inline-block">
          View My Playlists
        </Link>
      </div>
    );
  }

  const items = playlist.items || [];
  const firstVideo = items[0]?.video;
  const totalDurationSeconds = items.reduce((sum, item) => sum + (item.video?.durationSeconds || 0), 0);

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-16" aria-label="Playlist Details">
      {/* Toast */}
      {shareToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-purple-900/90 text-white text-xs px-4 py-2 rounded-full shadow-2xl border border-purple-500/40">
          {shareToast}
        </div>
      )}

      {/* Playlist Hero Header */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="space-y-3 max-w-2xl">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-purple-600/30 text-purple-300 text-[10px] font-bold uppercase tracking-wider border border-purple-500/30 flex items-center gap-1">
              <Layers className="w-3 h-3" /> Playlist Collection
            </span>

            {playlist.isPrivate ? (
              <span className="px-2.5 py-0.5 rounded-full bg-slate-900/80 text-gray-300 text-[10px] font-semibold border border-white/15 flex items-center gap-1">
                <Lock className="w-3 h-3 text-amber-400" /> Private
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 text-[10px] font-semibold border border-emerald-500/30 flex items-center gap-1">
                <Globe className="w-3 h-3" /> Public Shareable
              </span>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight">
            {playlist.title}
          </h1>

          {playlist.description && (
            <p className="text-xs sm:text-sm text-gray-300 leading-relaxed whitespace-pre-line">
              {playlist.description}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-4 text-xs text-gray-400 font-medium pt-1">
            <span>{items.length} videos</span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-purple-400" />
              {Math.floor(totalDurationSeconds / 60)} minutes total
            </span>
            {playlist.user && (
              <>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <UserIcon className="w-3.5 h-3.5 text-purple-400" />
                  Curated by {playlist.user.username}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto self-start md:self-auto">
          {firstVideo && (
            <Link
              to={`/watch/${firstVideo.id}?playlistId=${playlist.id}`}
              className="btn-primary px-6 py-3 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-purple-600/30"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Play All</span>
            </Link>
          )}

          <button
            onClick={handleShare}
            className="btn-secondary px-4 py-3 rounded-2xl text-xs font-semibold flex items-center gap-2 text-gray-300 hover:text-white"
            title="Copy shareable link"
          >
            <Share2 className="w-4 h-4" />
            <span>Share</span>
          </button>

          {isOwner && (
            <>
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="btn-secondary p-3 rounded-2xl text-xs font-semibold text-gray-300 hover:text-white"
                title="Edit Playlist Details"
              >
                <Edit3 className="w-4 h-4" />
              </button>
              <button
                onClick={handleDelete}
                className="btn-secondary p-3 rounded-2xl text-xs font-semibold text-gray-400 hover:text-red-400"
                title="Delete Playlist"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Inline Edit Form for Playlist Owner */}
      {isEditing && isOwner && (
        <form onSubmit={handleSaveEdit} className="glass-card p-6 rounded-2xl border border-purple-500/30 space-y-4 text-xs">
          <h3 className="text-sm font-bold text-white">Edit Playlist Details</h3>
          <div>
            <label className="block text-gray-300 font-semibold mb-1">Title</label>
            <input
              type="text"
              required
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="w-full p-2.5 rounded-xl glass-input text-xs"
            />
          </div>
          <div>
            <label className="block text-gray-300 font-semibold mb-1">Description</label>
            <textarea
              rows={2}
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              className="w-full p-2.5 rounded-xl glass-input text-xs resize-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="editIsPrivate"
              checked={!editIsPrivate}
              onChange={(e) => setEditIsPrivate(!e.target.checked)}
              className="rounded accent-purple-500 w-4 h-4"
            />
            <label htmlFor="editIsPrivate" className="text-gray-300 cursor-pointer">
              Publicly visible and shareable via URL
            </label>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="btn-secondary px-3 py-1.5 rounded-lg text-xs"
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary px-4 py-1.5 rounded-lg text-xs font-bold">
              Save Changes
            </button>
          </div>
        </form>
      )}

      {/* Playlist Items List */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center justify-between">
          <span>Videos in this Collection ({items.length})</span>
          {isOwner && items.length > 1 && (
            <span className="text-xs font-normal text-gray-400">Use arrows to reorder playback sequence</span>
          )}
        </h2>

        {items.length === 0 ? (
          <div className="glass-card p-10 text-center rounded-2xl space-y-3">
            <p className="text-xs text-gray-400">No videos in this playlist yet.</p>
            <Link to="/explore" className="btn-primary px-4 py-2 rounded-xl text-xs font-semibold inline-block">
              Browse Videos to Add
            </Link>
          </div>
        ) : (
          <div className="space-y-2.5">
            {items.map((item, index) => {
              const video = item.video;
              if (!video) return null;

              return (
                <div
                  key={item.id}
                  className="glass-card p-3 rounded-2xl border border-white/5 hover:border-purple-500/30 flex items-center justify-between gap-4 transition-all group"
                >
                  <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                    {/* Position Number */}
                    <span className="font-mono text-xs font-bold text-gray-500 w-5 text-center flex-shrink-0">
                      {index + 1}
                    </span>

                    {/* Thumbnail */}
                    <Link
                      to={`/watch/${video.id}?playlistId=${playlist.id}`}
                      className="relative w-24 sm:w-32 aspect-video rounded-xl overflow-hidden bg-slate-900 flex-shrink-0 block group-hover:ring-1 group-hover:ring-purple-500"
                    >
                      <img
                        src={video.thumbnailUrl || '/placeholder-thumb.jpg'}
                        alt={video.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&q=80';
                        }}
                      />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Play className="w-5 h-5 text-white fill-current" />
                      </div>
                      <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/80 text-[10px] font-mono text-white">
                        {formatDuration(video.durationSeconds)}
                      </div>
                    </Link>

                    {/* Info */}
                    <div className="min-w-0 flex-1 space-y-1">
                      <Link
                        to={`/watch/${video.id}?playlistId=${playlist.id}`}
                        className="font-bold text-white text-xs sm:text-sm hover:text-purple-300 transition-colors line-clamp-1 block"
                      >
                        {video.title}
                      </Link>
                      <div className="flex items-center gap-2 text-[11px] text-gray-400">
                        <span>{video.creator?.username || video.creatorName || 'Vyntra Discovery'}</span>
                        {video.category && (
                          <>
                            <span>•</span>
                            <span className="text-purple-300">{video.category.name}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Controls (Reorder & Remove for Owner) */}
                  {isOwner && (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        disabled={index === 0}
                        onClick={() => handleMove(index, 'up')}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                        title="Move Up"
                      >
                        <ArrowUp className="w-4 h-4" />
                      </button>
                      <button
                        disabled={index === items.length - 1}
                        onClick={() => handleMove(index, 'down')}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                        title="Move Down"
                      >
                        <ArrowDown className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleRemoveItem(video.id)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-white/10 transition-colors"
                        title="Remove from playlist"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
