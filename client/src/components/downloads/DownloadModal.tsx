import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Download,
  X,
  ShieldCheck,
  AlertCircle,
  Sparkles,
  CheckCircle2,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { Video, QuotaSummary } from '../../types';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

interface DownloadModalProps {
  video: Video;
  onClose: () => void;
}

export const DownloadModal: React.FC<DownloadModalProps> = ({ video, onClose }) => {
  const { user, quota, refreshQuota } = useAuth();
  const [liveQuota, setLiveQuota] = useState<QuotaSummary | null>(quota);
  const [isLoading, setIsLoading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);

  useEffect(() => {
    api.getQuota().then(setLiveQuota).catch(() => {});
  }, []);

  const handleStartDownload = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    // Generate client-side idempotency key bound to timestamp and video
    const idempotencyKey = `dl_${video.id}_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    try {
      const res = await api.requestDownload(video.id, idempotencyKey);
      setStreamUrl(res.streamUrl);
      setDownloadSuccess(true);
      await refreshQuota();

      // Trigger actual browser download via hidden anchor
      const link = document.createElement('a');
      link.href = res.streamUrl;
      link.setAttribute('download', `${video.title}.mp4`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      setErrorMessage(err.message || 'Download could not be initiated.');
    } finally {
      setIsLoading(false);
    }
  };

  const hasQuota = liveQuota && liveQuota.remaining > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="glass-dropdown w-full max-w-lg rounded-2xl p-4 sm:p-6 border border-white/15 shadow-2xl relative space-y-5 sm:space-y-6 max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
          aria-label="Close Modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <Download className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Download Video</h2>
            <p className="text-xs text-gray-400">Secure offline video access with quota protection</p>
          </div>
        </div>

        {/* Video Preview Card */}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5">
          <img
            src={video.thumbnailUrl}
            alt={video.title}
            className="w-20 h-12 object-cover rounded-lg flex-shrink-0"
          />
          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-semibold text-white truncate">{video.title}</h4>
            <p className="text-[11px] text-gray-400 mt-0.5">
              MP4 • High Quality • {Math.floor(video.durationSeconds / 60)} mins
            </p>
          </div>
        </div>

        {/* Quota Account Snapshot */}
        {liveQuota && (
          <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-500/20 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-300">Your Plan:</span>
              <span className="font-bold text-purple-300 uppercase tracking-wider">
                {liveQuota.planName}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 py-2 text-center border-y border-white/5">
              <div>
                <p className="text-[10px] text-gray-500 uppercase">Limit</p>
                <p className="text-sm font-bold text-white">{liveQuota.downloadLimit}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-500 uppercase">Used</p>
                <p className="text-sm font-bold text-gray-300">
                  {liveQuota.consumed + liveQuota.reserved}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-gray-500 uppercase">Remaining</p>
                <p
                  className={`text-sm font-bold ${
                    liveQuota.remaining > 0 ? 'text-green-400' : 'text-red-400'
                  }`}
                >
                  {liveQuota.remaining}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-gray-400">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-purple-400" />
                Resets today at {new Date(liveQuota.resetTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({liveQuota.timezone})
              </span>
            </div>
          </div>
        )}

        {/* Success State */}
        {downloadSuccess && (
          <div className="p-3.5 rounded-xl bg-green-950/30 border border-green-500/30 text-green-300 text-xs flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />
            <div>
              <p className="font-semibold">Download Authorized & Commenced!</p>
              <p className="text-[11px] text-green-400/80 mt-0.5">
                Your browser transfer has initiated. The download is recorded in your Downloads hub.
              </p>
            </div>
          </div>
        )}

        {/* Error State */}
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-red-950/30 border border-red-500/30 text-red-300 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <div>
              <p className="font-semibold">Unable to Process Download</p>
              <p className="text-[11px] text-red-400/80 mt-0.5">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Action Button or Upgrade Upsell */}
        <div className="space-y-3 pt-2">
          {hasQuota ? (
            <button
              onClick={handleStartDownload}
              disabled={isLoading || downloadSuccess}
              className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold btn-primary flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  <span>Reserving Quota & Generating Token...</span>
                </>
              ) : downloadSuccess ? (
                <span>Download Started (Check Browser)</span>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Authorize & Download (Uses 1 Quota)</span>
                </>
              )}
            </button>
          ) : (
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/20 text-xs text-amber-200">
                <p className="font-semibold flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-amber-400" />
                  Daily Download Quota Reached
                </p>
                <p className="text-[11px] text-amber-300/80 mt-1">
                  Free Starter plans are allocated 1 download per day. Upgrade to Bronze, Silver, or Gold for up to 100 downloads daily.
                </p>
              </div>

              <Link
                to="/pricing"
                onClick={onClose}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold btn-primary flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                <span>Upgrade Subscription Plan</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}

          <div className="flex items-center justify-center gap-1.5 text-[10px] text-gray-500">
            <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
            <span>Encrypted Token Delivery • Idempotency Protected</span>
          </div>
        </div>
      </div>
    </div>
  );
};
