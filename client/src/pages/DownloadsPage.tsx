import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Download,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Play,
  Sparkles,
  ArrowRight,
  Filter,
  FileVideo,
  XCircle,
} from 'lucide-react';
import { DownloadOperation, QuotaSummary } from '../types';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export const DownloadsPage: React.FC = () => {
  const { quota, refreshQuota } = useAuth();
  const [downloads, setDownloads] = useState<DownloadOperation[]>([]);
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [isLoading, setIsLoading] = useState(true);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  useEffect(() => {
    fetchDownloads();
    refreshQuota();
  }, [filterStatus, sortBy]);

  const fetchDownloads = async () => {
    setIsLoading(true);
    try {
      const data = await api.getDownloads({ status: filterStatus, sort: sortBy });
      setDownloads(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = async (opId: string) => {
    setRetryingId(opId);
    try {
      const res = await api.retryDownload(opId);
      // Trigger browser transfer
      window.open(res.streamUrl, '_blank');
      await fetchDownloads();
      await refreshQuota();
    } catch (err: any) {
      alert(err.message || 'Failed to retry download');
    } finally {
      setRetryingId(null);
    }
  };

  const handleCancel = async (opId: string) => {
    if (!confirm('Cancel this download operation and release reserved quota?')) return;
    try {
      await api.cancelDownload(opId);
      await fetchDownloads();
      await refreshQuota();
    } catch (err: any) {
      alert(err.message || 'Failed to cancel download');
    }
  };

  const formatFileSize = (bytes?: string | null) => {
    if (!bytes) return 'N/A';
    const b = parseInt(bytes, 10);
    if (isNaN(b) || b === 0) return 'Standard MP4';
    const mb = b / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-green-950/60 text-green-400 border border-green-500/30">
            <CheckCircle2 className="w-3 h-3" /> Completed
          </span>
        );
      case 'RESERVED':
      case 'TRANSFERRING':
      case 'AUTHORIZED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-950/60 text-purple-300 border border-purple-500/30 animate-pulse">
            <Clock className="w-3 h-3" /> In Progress
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-950/60 text-red-400 border border-red-500/30">
            <AlertTriangle className="w-3 h-3" /> Failed
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-gray-800 text-gray-400 border border-white/10">
            <XCircle className="w-3 h-3" /> Cancelled
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-gray-800 text-gray-400">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header & Title */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-2">
          <Download className="w-7 h-7 text-purple-400" />
          Download Management Hub
        </h1>
        <p className="text-xs text-gray-400 mt-1">
          Monitor your active daily download quota, retry past operations, and manage offline media files
        </p>
      </div>

      {/* Quota Banner */}
      {quota && (
        <div className="glass-panel p-6 rounded-3xl border border-purple-500/30 bg-gradient-to-r from-purple-950/30 via-[#161D2B] to-[#111827]">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-center">
            {/* Plan Info */}
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                Current Subscription
              </span>
              <h2 className="text-xl font-extrabold text-white uppercase">{quota.planName} TIER</h2>
              <p className="text-xs text-gray-400">
                Timezone boundary: <span className="text-gray-300 font-mono">{quota.timezone}</span>
              </p>
            </div>

            {/* Quota Numbers */}
            <div className="md:col-span-2 grid grid-cols-3 gap-2 text-center p-3 rounded-2xl bg-black/40 border border-white/5">
              <div>
                <p className="text-[10px] uppercase text-gray-500 font-semibold">Daily Limit</p>
                <p className="text-lg font-extrabold text-white">{quota.downloadLimit}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase text-gray-500 font-semibold">Consumed</p>
                <p className="text-lg font-extrabold text-purple-300">
                  {quota.consumed + quota.reserved}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase text-gray-500 font-semibold">Remaining</p>
                <p
                  className={`text-lg font-extrabold ${
                    quota.remaining > 0 ? 'text-green-400' : 'text-red-400'
                  }`}
                >
                  {quota.remaining}
                </p>
              </div>
            </div>

            {/* Reset Time & Upgrade CTA */}
            <div className="flex flex-col gap-2">
              <div className="text-[11px] text-gray-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
                <span>
                  Resets at {new Date(quota.resetTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <Link
                to="/pricing"
                className="py-2 px-3 rounded-xl text-xs font-semibold btn-primary text-center flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Increase Allowance</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Filters and Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Status Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {['all', 'completed', 'in_progress', 'failed', 'cancelled'].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap capitalize transition-all ${
                filterStatus === st
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'glass-card text-gray-400 hover:text-white'
              }`}
            >
              {st.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* Sort */}
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <span>Sort:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-[#111827] border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-gray-300 focus:outline-none"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
          </select>
        </div>
      </div>

      {/* Downloads List */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 rounded-2xl bg-white/5 animate-pulse" />
          ))}
        </div>
      ) : downloads.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center max-w-md mx-auto space-y-3">
          <FileVideo className="w-10 h-10 text-purple-400 mx-auto opacity-70" />
          <h3 className="text-base font-bold text-white">No downloads found</h3>
          <p className="text-xs text-gray-400">
            You haven't requested any video downloads matching this filter.
          </p>
          <Link to="/explore" className="inline-block px-4 py-2 rounded-xl text-xs font-semibold btn-primary mt-2">
            Explore Downloadable Videos
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {downloads.map((op) => (
            <div
              key={op.id}
              className="glass-card p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:border-purple-500/40 transition-all"
            >
              {/* Left: Thumbnail & Title & Meta */}
              <div className="flex items-center gap-3.5 w-full sm:w-auto">
                <img
                  src={op.video?.thumbnailUrl}
                  alt={op.video?.title}
                  className="w-24 aspect-video rounded-xl object-cover bg-gray-900 flex-shrink-0"
                />
                <div className="min-w-0">
                  <Link
                    to={`/watch/${op.videoId}`}
                    className="text-sm font-semibold text-white hover:text-purple-300 transition-colors line-clamp-1"
                  >
                    {op.video?.title}
                  </Link>
                  <p className="text-xs text-gray-400 mt-0.5">{op.video?.creator?.username}</p>
                  <div className="flex items-center gap-3 text-[11px] text-gray-500 mt-1 flex-wrap">
                    <span>Requested: {new Date(op.requestedAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    <span>•</span>
                    <span>{formatFileSize(op.fileSizeBytes)}</span>
                    <span>•</span>
                    <span>Plan: {op.subscription?.plan?.name || 'FREE'}</span>
                  </div>
                </div>
              </div>

              {/* Right: Status Badge & Actions */}
              <div className="flex items-center gap-3 self-end sm:self-center">
                {getStatusBadge(op.status)}

                {/* Stream / Retry Action */}
                {op.status === 'COMPLETED' && (
                  <a
                    href={`/api/v1/downloads/stream/${op.downloadToken}`}
                    download
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold btn-secondary text-purple-300 hover:text-white"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Save File</span>
                  </a>
                )}

                {['RESERVED', 'TRANSFERRING', 'AUTHORIZED'].includes(op.status) && (
                  <>
                    <a
                      href={`/api/v1/downloads/stream/${op.downloadToken}`}
                      download
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold btn-primary"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download File</span>
                    </a>
                    <button
                      onClick={() => handleCancel(op.id)}
                      className="px-2.5 py-1.5 rounded-lg text-xs text-gray-400 hover:text-red-400 hover:bg-white/5"
                    >
                      Cancel
                    </button>
                  </>
                )}

                {['FAILED', 'CANCELLED', 'EXPIRED'].includes(op.status) && (
                  <button
                    onClick={() => handleRetry(op.id)}
                    disabled={retryingId === op.id}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold btn-secondary text-purple-300 hover:text-white"
                  >
                    <RotateCcw className={`w-3.5 h-3.5 ${retryingId === op.id ? 'animate-spin' : ''}`} />
                    <span>Retry</span>
                  </button>
                )}

                <Link
                  to={`/watch/${op.videoId}`}
                  className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5"
                  title="Watch Video"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
