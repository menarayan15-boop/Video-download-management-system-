import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Film, Trash2, CheckCircle2, XCircle, ArrowLeft, Eye } from 'lucide-react';
import { api } from '../services/api';

export const AdminVideosPage: React.FC = () => {
  const [videos, setVideos] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadVideos();
  }, []);

  const loadVideos = async () => {
    setIsLoading(true);
    try {
      const res = await api.getAdminVideos({ limit: 50 });
      setVideos(res.videos || []);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleDownload = async (id: string, current: boolean) => {
    try {
      await api.updateVideo(id, { downloadAllowed: !current });
      setVideos((prev) =>
        prev.map((v) => (v.id === id ? { ...v, downloadAllowed: !current } : v))
      );
    } catch (e) {
      alert('Failed to update download permissions');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Permanently delete this video from Vyntra?')) return;
    try {
      await api.deleteVideo(id);
      setVideos((prev) => prev.filter((v) => v.id !== id));
    } catch (e) {
      alert('Failed to delete video');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <Link to="/admin" className="text-xs text-gray-400 hover:text-white flex items-center gap-1">
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Admin Dashboard</span>
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Film className="w-6 h-6 text-purple-400" />
          Video Management
        </h1>
        <p className="text-xs text-gray-400 mt-0.5">Control video visibility, download rules, and content removals</p>
      </div>

      <div className="glass-panel p-6 rounded-3xl border border-white/10 overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-white/10 text-gray-400 text-[11px] uppercase tracking-wider">
              <th className="pb-3 font-semibold">Video</th>
              <th className="pb-3 font-semibold">Creator</th>
              <th className="pb-3 font-semibold">Category</th>
              <th className="pb-3 font-semibold">Views</th>
              <th className="pb-3 font-semibold">Downloads Allowed</th>
              <th className="pb-3 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-gray-300">
            {videos.map((v) => (
              <tr key={v.id} className="hover:bg-white/[0.02]">
                <td className="py-3 font-semibold text-white max-w-xs truncate flex items-center gap-2.5">
                  <img src={v.thumbnailUrl} alt={v.title} className="w-12 aspect-video rounded object-cover flex-shrink-0" />
                  <span className="truncate">{v.title}</span>
                </td>
                <td className="py-3 text-purple-300 font-medium">{v.creator?.username}</td>
                <td className="py-3 text-gray-400">{v.category?.name}</td>
                <td className="py-3 text-gray-400">{v.viewsCount}</td>
                <td className="py-3">
                  <button
                    onClick={() => handleToggleDownload(v.id, v.downloadAllowed)}
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      v.downloadAllowed
                        ? 'bg-green-950/60 text-green-400 border border-green-500/30'
                        : 'bg-red-950/60 text-red-400 border border-red-500/30'
                    }`}
                  >
                    {v.downloadAllowed ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                    <span>{v.downloadAllowed ? 'Allowed' : 'Disabled'}</span>
                  </button>
                </td>
                <td className="py-3 text-right space-x-2">
                  <Link
                    to={`/watch/${v.id}`}
                    className="p-1.5 text-gray-400 hover:text-white rounded hover:bg-white/5 inline-block"
                    title="View"
                  >
                    <Eye className="w-4 h-4" />
                  </Link>
                  <button
                    onClick={() => handleDelete(v.id)}
                    className="p-1.5 text-gray-500 hover:text-red-400 rounded hover:bg-white/5"
                    title="Delete Video"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
