import React, { useState, useEffect } from 'react';
import { X, Upload, Video as VideoIcon, CheckCircle2, AlertCircle } from 'lucide-react';
import { api } from '../../services/api';
import { Category } from '../../types';

interface UploadModalProps {
  onClose: () => void;
  onVideoCreated?: () => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({ onClose, onVideoCreated }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    categoryId: '',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyBlazes.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=1200&auto=format&fit=crop&q=80',
    storageKey: `videos/upload_${Date.now()}.mp4`,
    durationSeconds: 180,
    fileSizeBytes: 45000000,
    visibility: 'PUBLIC',
    downloadAllowed: true,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    api.getCategories().then((cats) => {
      setCategories(cats || []);
      if (cats && cats.length > 0) {
        setFormData((prev) => ({ ...prev, categoryId: cats[0].id }));
      }
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      await api.createVideo(formData);
      setSuccess(true);
      setTimeout(() => {
        onVideoCreated?.();
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to upload video');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="glass-dropdown w-full max-w-xl rounded-2xl p-4 sm:p-6 border border-white/15 shadow-2xl relative space-y-5 max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/10"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <Upload className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Upload New Video</h2>
            <p className="text-xs text-gray-400">Publish media to the Vyntra community</p>
          </div>
        </div>

        {success && (
          <div className="p-3 rounded-xl bg-green-950/30 border border-green-500/30 text-green-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-400" />
            <span>Video published successfully! Refreshing feed...</span>
          </div>
        )}

        {error && (
          <div className="p-3 rounded-xl bg-red-950/30 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-gray-300 font-semibold mb-1">Video Title</label>
            <input
              type="text"
              required
              placeholder="e.g. Masterclass in Scalable Cloud Infrastructure"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full p-2.5 rounded-xl glass-input"
            />
          </div>

          <div>
            <label className="block text-gray-300 font-semibold mb-1">Description</label>
            <textarea
              rows={3}
              placeholder="Describe what viewers will discover in this video..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full p-2.5 rounded-xl glass-input resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-300 font-semibold mb-1">Category</label>
              <select
                value={formData.categoryId}
                onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                className="w-full p-2.5 rounded-xl glass-input bg-[#111827]"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-gray-300 font-semibold mb-1">Duration (Seconds)</label>
              <input
                type="number"
                min={5}
                value={formData.durationSeconds}
                onChange={(e) => setFormData({ ...formData, durationSeconds: parseInt(e.target.value, 10) || 60 })}
                className="w-full p-2.5 rounded-xl glass-input"
              />
            </div>
          </div>

          <div>
            <label className="block text-gray-300 font-semibold mb-1">Thumbnail URL</label>
            <input
              type="url"
              required
              value={formData.thumbnailUrl}
              onChange={(e) => setFormData({ ...formData, thumbnailUrl: e.target.value })}
              className="w-full p-2.5 rounded-xl glass-input font-mono text-[11px]"
            />
          </div>

          <div>
            <label className="block text-gray-300 font-semibold mb-1">Video Media Stream URL</label>
            <input
              type="url"
              required
              value={formData.videoUrl}
              onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
              className="w-full p-2.5 rounded-xl glass-input font-mono text-[11px]"
            />
          </div>

          <div className="flex items-center gap-4 pt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.downloadAllowed}
                onChange={(e) => setFormData({ ...formData, downloadAllowed: e.target.checked })}
                className="rounded accent-purple-600"
              />
              <span className="text-gray-300">Allow users to download this video (subject to quota)</span>
            </label>
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl btn-secondary text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || success}
              className="px-5 py-2 rounded-xl btn-primary text-xs font-semibold flex items-center gap-2"
            >
              {isLoading ? 'Publishing...' : 'Publish Video'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
