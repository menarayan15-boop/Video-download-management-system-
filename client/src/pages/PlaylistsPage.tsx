import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ListPlus,
  Play,
  Lock,
  Globe,
  Share2,
  Trash2,
  Plus,
  AlertCircle,
  MoreVertical,
  Layers,
} from 'lucide-react';
import { Playlist } from '../types';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export const PlaylistsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [shareToast, setShareToast] = useState<string | null>(null);

  useEffect(() => {
    fetchPlaylists();
  }, []);

  const fetchPlaylists = async () => {
    setIsLoading(true);
    try {
      const data = await api.getMyPlaylists();
      setPlaylists(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load playlists:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      setIsSubmitting(true);
      const created = await api.createPlaylist({
        title: newTitle.trim(),
        description: newDescription.trim() || undefined,
        isPrivate,
      });
      setPlaylists((prev) => [created, ...prev]);
      setShowCreateModal(false);
      setNewTitle('');
      setNewDescription('');
      setIsPrivate(true);
    } catch (err) {
      console.error('Failed to create playlist:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`Delete playlist "${title}"? This cannot be undone.`)) return;

    try {
      await api.deletePlaylist(id);
      setPlaylists((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      console.error('Failed to delete playlist:', err);
    }
  };

  const handleShare = (p: Playlist, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const shareUrl = `${window.location.origin}/playlist/${p.id}${p.shareToken ? `?token=${p.shareToken}` : ''}`;
    navigator.clipboard.writeText(shareUrl);
    setShareToast(`Link copied for "${p.title}"!`);
    setTimeout(() => setShareToast(null), 2500);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16" aria-label="Custom Playlists and Collections">
      {/* Toast */}
      {shareToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-purple-900/90 text-white text-xs px-4 py-2 rounded-full shadow-2xl border border-purple-500/40">
          {shareToast}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-2.5">
            <Layers className="w-7 h-7 text-purple-400" />
            <span>Custom Playlists & Collections</span>
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Organize lectures, tutorials, and research videos into personal sequences or shareable libraries.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-purple-600/30 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Playlist</span>
        </button>
      </div>

      {/* Playlists Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="aspect-video rounded-2xl bg-white/5 animate-pulse" />
          ))}
        </div>
      ) : playlists.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center max-w-md mx-auto space-y-4">
          <ListPlus className="w-12 h-12 text-purple-400 mx-auto opacity-70" />
          <h2 className="text-lg font-bold text-white">No Playlists Created Yet</h2>
          <p className="text-xs text-gray-400 leading-relaxed">
            Create your first collection to curate videos by topic, study sequence, or project.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary px-5 py-2.5 rounded-xl text-xs font-bold"
          >
            Create Playlist
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {playlists.map((playlist) => {
            const firstItem = playlist.items?.[0];
            const thumbUrl = firstItem?.video?.thumbnailUrl || '/placeholder-thumb.jpg';

            return (
              <div
                key={playlist.id}
                onClick={() => navigate(`/playlist/${playlist.id}`)}
                className="glass-card rounded-2xl overflow-hidden border border-white/10 hover:border-purple-500/40 hover:bg-white/[0.04] transition-all group cursor-pointer flex flex-col justify-between"
              >
                {/* Thumbnail Cover with overlay video count */}
                <div className="relative aspect-video bg-slate-900 overflow-hidden">
                  <img
                    src={thumbUrl}
                    alt={playlist.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&q=80';
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent" />

                  {/* Play icon badge */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-12 h-12 rounded-full bg-purple-600 text-white flex items-center justify-center shadow-xl">
                      <Play className="w-6 h-6 fill-current ml-0.5" />
                    </div>
                  </div>

                  {/* Badges */}
                  <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                    {playlist.isPrivate ? (
                      <span className="px-2 py-0.5 rounded-md bg-slate-950/80 text-gray-300 text-[10px] font-semibold border border-white/15 flex items-center gap-1 backdrop-blur-md">
                        <Lock className="w-3 h-3 text-amber-400" /> Private
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-md bg-emerald-950/80 text-emerald-300 text-[10px] font-semibold border border-emerald-500/30 flex items-center gap-1 backdrop-blur-md">
                        <Globe className="w-3 h-3" /> Public
                      </span>
                    )}
                  </div>

                  <div className="absolute bottom-2.5 right-2.5 px-2 py-1 rounded-md bg-black/80 text-white text-xs font-mono font-bold backdrop-blur-md">
                    {playlist.itemCount ?? playlist.items?.length ?? 0} videos
                  </div>
                </div>

                {/* Info & Actions */}
                <div className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-white text-sm group-hover:text-purple-300 transition-colors line-clamp-1">
                      {playlist.title}
                    </h3>
                  </div>

                  <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">
                    {playlist.description || 'No description provided.'}
                  </p>

                  <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs text-gray-500">
                    <span>
                      Updated {new Date(playlist.updatedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </span>
                    <div className="flex items-center gap-1">
                      {!playlist.isPrivate && (
                        <button
                          onClick={(e) => handleShare(playlist, e)}
                          className="p-1.5 text-gray-400 hover:text-purple-300 rounded-lg hover:bg-white/10 transition-colors"
                          title="Copy share link"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(playlist.id, playlist.title);
                        }}
                        className="p-1.5 text-gray-400 hover:text-red-400 rounded-lg hover:bg-white/10 transition-colors"
                        title="Delete playlist"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Playlist Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="glass-dropdown w-full max-w-md rounded-2xl p-6 border border-white/15 shadow-2xl space-y-4 text-xs">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <ListPlus className="w-5 h-5 text-purple-400" />
              <span>Create New Playlist</span>
            </h3>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-gray-300 font-semibold mb-1">Playlist Title *</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Astrophysics Masterclass, AI Engineering..."
                  className="w-full p-2.5 rounded-xl glass-input text-xs"
                />
              </div>

              <div>
                <label className="block text-gray-300 font-semibold mb-1">Description (Optional)</label>
                <textarea
                  rows={3}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Brief summary of what this collection covers..."
                  className="w-full p-2.5 rounded-xl glass-input text-xs resize-none"
                />
              </div>

              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-white block">Make Playlist Public</span>
                  <p className="text-[11px] text-gray-400">Public playlists can be shared via a web link.</p>
                </div>
                <input
                  type="checkbox"
                  checked={!isPrivate}
                  onChange={(e) => setIsPrivate(!e.target.checked)}
                  className="rounded accent-purple-500 w-4 h-4 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn-secondary px-4 py-2 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !newTitle.trim()}
                  className="btn-primary px-5 py-2 rounded-xl text-xs font-bold disabled:opacity-50"
                >
                  {isSubmitting ? 'Creating...' : 'Create Playlist'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
