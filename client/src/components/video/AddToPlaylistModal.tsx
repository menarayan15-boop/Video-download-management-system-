import React, { useEffect, useState } from 'react';
import { X, Plus, Check, ListPlus, Lock, Globe } from 'lucide-react';
import { api } from '../../services/api';
import { Playlist } from '../../types';

interface AddToPlaylistModalProps {
  videoId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const AddToPlaylistModal: React.FC<AddToPlaylistModalProps> = ({ videoId, isOpen, onClose }) => {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(false);
  const [addedPlaylists, setAddedPlaylists] = useState<Set<string>>(new Set());
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [isPrivate, setIsPrivate] = useState(true);
  const [creating, setCreating] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      api.getMyPlaylists()
        .then((res) => {
          setPlaylists(res || []);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleToggleItem = async (playlist: Playlist) => {
    const isAdded = addedPlaylists.has(playlist.id);
    try {
      if (isAdded) {
        await api.removePlaylistItem(playlist.id, videoId);
        setAddedPlaylists((prev) => {
          const next = new Set(prev);
          next.delete(playlist.id);
          return next;
        });
        showToast(`Removed from "${playlist.title}"`);
      } else {
        await api.addPlaylistItem(playlist.id, videoId);
        setAddedPlaylists((prev) => new Set(prev).add(playlist.id));
        showToast(`Added to "${playlist.title}"`);
      }
    } catch (err: any) {
      showToast(err.message || 'Operation failed');
    }
  };

  const handleCreatePlaylist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setCreating(true);
    try {
      const created = await api.createPlaylist({
        title: newTitle.trim(),
        description: newDesc.trim() || undefined,
        isPrivate,
      });

      // Immediately add the video to this new playlist
      await api.addPlaylistItem(created.id, videoId);

      setPlaylists((prev) => [created, ...prev]);
      setAddedPlaylists((prev) => new Set(prev).add(created.id));
      setShowCreateForm(false);
      setNewTitle('');
      setNewDesc('');
      showToast(`Created playlist "${created.title}" & added video!`);
    } catch (err: any) {
      showToast(err.message || 'Failed to create playlist');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="glass-panel w-full max-w-md rounded-2xl p-5 sm:p-6 border border-white/10 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <ListPlus className="w-5 h-5 text-purple-400" />
            <h2 className="text-base font-bold text-white">Save to Playlist</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toast */}
        {toastMessage && (
          <div className="mt-3 p-2.5 rounded-xl bg-purple-950/80 border border-purple-500/40 text-purple-200 text-xs text-center">
            {toastMessage}
          </div>
        )}

        {/* Existing Playlists List */}
        <div className="my-4 max-h-60 overflow-y-auto space-y-2 pr-1">
          {loading ? (
            <div className="py-8 text-center text-xs text-gray-400">Loading playlists...</div>
          ) : playlists.length === 0 ? (
            <div className="py-6 text-center text-xs text-gray-400">
              You haven't created any playlists yet.
            </div>
          ) : (
            playlists.map((pl) => {
              const checked = addedPlaylists.has(pl.id);
              return (
                <button
                  key={pl.id}
                  onClick={() => handleToggleItem(pl)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                    checked
                      ? 'bg-purple-900/30 border-purple-500/50 text-white'
                      : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {pl.isPrivate ? (
                      <Lock className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                    ) : (
                      <Globe className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                    )}
                    <span className="text-xs font-medium truncate">{pl.title}</span>
                  </div>
                  <div
                    className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${
                      checked
                        ? 'bg-purple-600 border-purple-500 text-white'
                        : 'border-white/20 bg-transparent'
                    }`}
                  >
                    {checked && <Check className="w-3.5 h-3.5" />}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Create Playlist Section */}
        {!showCreateForm ? (
          <button
            onClick={() => setShowCreateForm(true)}
            className="w-full py-2.5 rounded-xl border border-dashed border-white/20 text-xs font-semibold text-purple-300 hover:bg-white/5 flex items-center justify-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Playlist</span>
          </button>
        ) : (
          <form onSubmit={handleCreatePlaylist} className="mt-3 p-4 rounded-xl bg-black/40 border border-white/10 space-y-3">
            <h3 className="text-xs font-bold text-white">New Playlist Details</h3>
            <input
              type="text"
              placeholder="Playlist title..."
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="glass-input w-full px-3 py-2 rounded-lg text-xs"
              required
              maxLength={100}
              autoFocus
            />
            <textarea
              placeholder="Description (optional)..."
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              className="glass-input w-full px-3 py-2 rounded-lg text-xs resize-none"
              rows={2}
              maxLength={300}
            />
            <div className="flex items-center justify-between text-xs text-gray-400">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPrivate}
                  onChange={(e) => setIsPrivate(e.target.checked)}
                  className="rounded border-gray-700 text-purple-600 focus:ring-purple-500"
                />
                <span>Keep playlist private</span>
              </label>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="px-3 py-1.5 rounded-lg text-xs btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creating || !newTitle.trim()}
                className="px-4 py-1.5 rounded-lg text-xs btn-primary disabled:opacity-50"
              >
                {creating ? 'Creating...' : 'Create & Save'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
