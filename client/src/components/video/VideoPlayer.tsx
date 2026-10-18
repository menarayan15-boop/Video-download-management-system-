import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  RotateCcw,
  Download,
  ExternalLink,
  ShieldAlert,
  AlertTriangle,
  Loader2,
  Youtube,
  Settings,
  Sparkles,
  Check,
  RefreshCw,
} from 'lucide-react';
import { Video } from '../../types';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  extractYouTubeId,
  getYouTubeThumbnailCascade,
  getOptimizedThumbnail,
  FALLBACK_THUMBNAIL_DATA_URL,
} from '../../utils/imageOptimizer';

interface VideoPlayerProps {
  video: Video;
  initialProgressSeconds?: number;
  seekToSeconds?: number;
  onCurrentTimeChange?: (seconds: number) => void;
  onOpenDownload?: () => void;
}

// YouTube IFrame API Error Codes
const YT_ERROR_MESSAGES: Record<number, string> = {
  2: 'Invalid video ID parameter. The link format may be unrecognized.',
  5: 'HTML5 player error. The content cannot be rendered in this browser.',
  100: 'Video not found. The content may have been deleted or made private.',
  101: 'Embedding disabled by video owner.',
  150: 'Embedding disabled by video owner.',
  153: 'Embedding restricted by content owner or copyright policy.',
};

// Map YouTube internal quality keys to user-friendly labels
const QUALITY_LABELS: Record<string, string> = {
  highres: '4K / 8K Ultra HD',
  hd2160: '2160p (4K UHD)',
  hd1440: '1440p (2K QHD)',
  hd1080: '1080p (Full HD)',
  hd720: '720p (HD)',
  large: '480p (SD)',
  medium: '360p',
  small: '240p',
  tiny: '144p',
  auto: 'Auto (Adaptive ABR)',
  default: 'Auto (Adaptive ABR)',
};

// ── Singleton YouTube IFrame API Script Loader ───────────────────────────────
let ytApiPromise: Promise<void> | null = null;

function loadYouTubeIframeAPI(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();

  if ((window as any).YT && (window as any).YT.Player) {
    return Promise.resolve();
  }

  if (ytApiPromise) {
    return ytApiPromise;
  }

  ytApiPromise = new Promise((resolve) => {
    // If the script tag is already in DOM
    const existingScript = document.getElementById('youtube-iframe-api');
    if (!existingScript) {
      const tag = document.createElement('script');
      tag.id = 'youtube-iframe-api';
      tag.src = 'https://www.youtube.com/iframe_api';
      tag.async = true;
      document.head.appendChild(tag);
    }

    const previousCallback = (window as any).onYouTubeIframeAPIReady;
    (window as any).onYouTubeIframeAPIReady = () => {
      if (typeof previousCallback === 'function') {
        try {
          previousCallback();
        } catch {}
      }
      resolve();
    };

    // Safety timeout in case callback isn't fired
    setTimeout(() => {
      if ((window as any).YT && (window as any).YT.Player) {
        resolve();
      }
    }, 4000);
  });

  return ytApiPromise;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  video,
  initialProgressSeconds = 0,
  seekToSeconds,
  onCurrentTimeChange,
  onOpenDownload,
}) => {
  const { user } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const ytPlayerRef = useRef<any>(null);
  const ytContainerId = useRef<string>(`yt-player-${Math.random().toString(36).substring(2, 9)}`);

  // Facade state: Has the user initiated playback?
  const [hasStartedPlayback, setHasStartedPlayback] = useState(false);

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(video.durationSeconds || 0);
  const [volume, setVolume] = useState(() => {
    const saved = localStorage.getItem('vyntra_player_vol');
    return saved ? parseFloat(saved) : 1;
  });
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  // YouTube Specific State
  const [ytError, setYtError] = useState<string | null>(null);
  const [availableQualities, setAvailableQualities] = useState<string[]>([]);
  const [activeQuality, setActiveQuality] = useState<string>('auto');
  const [preferredQuality, setPreferredQuality] = useState<string>('auto');
  const [showQualityMenu, setShowQualityMenu] = useState(false);

  // Poster Image Fallback Cascade State
  const [posterIndex, setPosterIndex] = useState(0);
  const [posterFailed, setPosterFailed] = useState(false);

  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // ── Stream / Provider Resolution ───────────────────────────────────────────
  const isYouTube =
    video.provider === 'YOUTUBE' ||
    video.playbackType === 'EMBED_YOUTUBE' ||
    Boolean(video.embedUrl?.includes('youtube')) ||
    Boolean(video.videoUrl?.includes('youtube') || video.videoUrl?.includes('youtu.be'));

  const resolveYouTubeVideoId = useCallback((): string | null => {
    if (typeof video.providerVideoId === 'string' && /^[a-zA-Z0-9_-]{11}$/.test(video.providerVideoId)) {
      return video.providerVideoId;
    }
    const candidates = [video.embedUrl, video.videoUrl, video.originalUrl];
    for (const url of candidates) {
      const id = extractYouTubeId(url);
      if (id) return id;
    }
    return null;
  }, [video.providerVideoId, video.embedUrl, video.videoUrl, video.originalUrl]);

  const ytVideoId = isYouTube ? resolveYouTubeVideoId() : null;

  // Build the thumbnail cascade list
  const posterCascade = React.useMemo(() => {
    if (isYouTube && ytVideoId) {
      return getYouTubeThumbnailCascade(ytVideoId);
    }
    if (video.thumbnailUrl) {
      return [getOptimizedThumbnail(video.thumbnailUrl, 1280), video.thumbnailUrl];
    }
    return [FALLBACK_THUMBNAIL_DATA_URL];
  }, [isYouTube, ytVideoId, video.thumbnailUrl]);

  const currentPosterSrc = posterFailed
    ? FALLBACK_THUMBNAIL_DATA_URL
    : posterCascade[posterIndex] || FALLBACK_THUMBNAIL_DATA_URL;

  const handlePosterError = () => {
    if (posterIndex < posterCascade.length - 1) {
      setPosterIndex((prev) => prev + 1);
    } else {
      setPosterFailed(true);
    }
  };

  // Build the "Watch on YouTube" fallback link
  const ytWatchUrl = ytVideoId ? `https://www.youtube.com/watch?v=${ytVideoId}` : null;

  const isArchiveEmbed =
    (video.provider === 'ARCHIVE' && video.playbackType === 'EMBED_GENERIC') ||
    Boolean(video.embedUrl?.includes('archive.org/embed/'));

  // Reset playback and facade state when video changes
  useEffect(() => {
    setHasStartedPlayback(false);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(video.durationSeconds || 0);
    setYtError(null);
    setHasError(false);
    setPosterIndex(0);
    setPosterFailed(false);
    if (ytPlayerRef.current) {
      try {
        ytPlayerRef.current.destroy();
      } catch {}
      ytPlayerRef.current = null;
    }
  }, [video.id]);

  // ── YouTube IFrame Player API Initialization ───────────────────────────────
  const initYouTubePlayer = useCallback(() => {
    if (!ytVideoId) return;

    setIsLoading(true);
    setYtError(null);

    loadYouTubeIframeAPI()
      .then(() => {
        if (!(window as any).YT || !(window as any).YT.Player) {
          throw new Error('YouTube IFrame Player library could not be loaded.');
        }

        const container = document.getElementById(ytContainerId.current);
        if (!container) return;

        // Clean up any existing instance
        if (ytPlayerRef.current) {
          try {
            ytPlayerRef.current.destroy();
          } catch {}
        }

        const player = new (window as any).YT.Player(ytContainerId.current, {
          videoId: ytVideoId,
          playerVars: {
            autoplay: 1,
            playsinline: 1,
            rel: 0,
            modestbranding: 1,
            enablejsapi: 1,
            origin: typeof window !== 'undefined' ? window.location.origin : '',
            iv_load_policy: 3,
            start: initialProgressSeconds > 0 ? Math.floor(initialProgressSeconds) : undefined,
          },
          events: {
            onReady: (event: any) => {
              setIsLoading(false);
              ytPlayerRef.current = event.target;
              try {
                const levels = event.target.getAvailableQualityLevels();
                if (Array.isArray(levels) && levels.length > 0) {
                  setAvailableQualities(levels);
                }
                const active = event.target.getPlaybackQuality();
                if (active) setActiveQuality(active);
                const d = event.target.getDuration();
                if (d > 0) setDuration(d);
              } catch {}
            },
            onStateChange: (event: any) => {
              // YT.PlayerState: 1 = PLAYING, 2 = PAUSED, 3 = BUFFERING, 0 = ENDED
              const state = event.data;
              if (state === 1) {
                setIsPlaying(true);
                setIsLoading(false);
                setYtError(null);
                // Inspect actual playback quality delivered by YouTube
                try {
                  const active = event.target.getPlaybackQuality();
                  if (active) setActiveQuality(active);
                  const levels = event.target.getAvailableQualityLevels();
                  if (Array.isArray(levels) && levels.length > 0) {
                    setAvailableQualities(levels);
                  }
                } catch {}
              } else if (state === 2) {
                setIsPlaying(false);
              } else if (state === 3) {
                setIsLoading(true);
              } else if (state === 0) {
                setIsPlaying(false);
              }
            },
            onError: (event: any) => {
              setIsLoading(false);
              const code = Number(event.data);
              const msg = YT_ERROR_MESSAGES[code] || `YouTube playback error (${code})`;
              setYtError(msg);
              console.warn(`[Vyntra] YouTube Player API error ${code}: ${msg}`);
            },
          },
        });

        ytPlayerRef.current = player;
      })
      .catch((err) => {
        setIsLoading(false);
        setYtError('Failed to initialize YouTube embed player. Please check your network or ad-blocker.');
        console.error('[Vyntra] Error loading YouTube Player API:', err);
      });
  }, [ytVideoId, initialProgressSeconds]);

  // Handle Play start from Facade Poster
  const handleStartPlayback = () => {
    setHasStartedPlayback(true);
    if (isYouTube) {
      // Delay slightly for container element to mount
      setTimeout(() => {
        initYouTubePlayer();
      }, 50);
    } else if (videoRef.current) {
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  // Periodic YouTube time & progress reporting
  useEffect(() => {
    if (!isYouTube || !hasStartedPlayback) return;

    progressIntervalRef.current = setInterval(() => {
      if (ytPlayerRef.current && typeof ytPlayerRef.current.getCurrentTime === 'function') {
        try {
          const cur = ytPlayerRef.current.getCurrentTime();
          if (typeof cur === 'number' && !isNaN(cur)) {
            setCurrentTime(cur);
            onCurrentTimeChange?.(cur);

            // Record watch progress to database
            if (user && isPlaying && Math.floor(cur) % 10 === 0 && cur > 0) {
              const dur = duration || video.durationSeconds || 1;
              const completed = cur >= dur * 0.9;
              api.recordWatchProgress(video.id, Math.floor(cur), completed).catch(() => {});
            }
          }
        } catch {}
      }
    }, 1000);

    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, [isYouTube, hasStartedPlayback, isPlaying, duration, user, video.id, onCurrentTimeChange]);

  // External seek handler (e.g. from learning tools)
  useEffect(() => {
    if (typeof seekToSeconds !== 'number') return;

    if (isYouTube && ytPlayerRef.current && typeof ytPlayerRef.current.seekTo === 'function') {
      ytPlayerRef.current.seekTo(seekToSeconds, true);
    } else if (videoRef.current) {
      videoRef.current.currentTime = seekToSeconds;
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  }, [seekToSeconds, isYouTube]);

  // Handle YouTube Quality Selection
  const handleSelectQuality = (qualityKey: string) => {
    setPreferredQuality(qualityKey);
    setShowQualityMenu(false);

    if (ytPlayerRef.current && typeof ytPlayerRef.current.setPlaybackQuality === 'function') {
      try {
        ytPlayerRef.current.setPlaybackQuality(qualityKey);
        // Also query active quality after brief adaptation
        setTimeout(() => {
          if (ytPlayerRef.current) {
            const actual = ytPlayerRef.current.getPlaybackQuality();
            if (actual) setActiveQuality(actual);
          }
        }, 1200);
      } catch (err) {
        console.warn('[Vyntra] Failed to set playback quality preference:', err);
      }
    }
  };

  // Direct HTML5 Video controls
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const cur = videoRef.current.currentTime;
      setCurrentTime(cur);
      onCurrentTimeChange?.(cur);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration || video.durationSeconds);
      setIsLoading(false);
      setHasError(false);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const targetTime = parseFloat(e.target.value);
    setCurrentTime(targetTime);
    if (videoRef.current) {
      videoRef.current.currentTime = targetTime;
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVol = parseFloat(e.target.value);
    setVolume(newVol);
    setIsMuted(newVol === 0);
    localStorage.setItem('vyntra_player_vol', String(newVol));
    if (videoRef.current) {
      videoRef.current.volume = newVol;
      videoRef.current.muted = newVol === 0;
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    if (isMuted) {
      videoRef.current.muted = false;
      videoRef.current.volume = volume || 0.5;
      setIsMuted(false);
    } else {
      videoRef.current.muted = true;
      setIsMuted(true);
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const handleSpeedSelect = (speed: number) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
    setShowSpeedMenu(false);
  };

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 2500);
  };

  const formatTime = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = Math.floor(sec % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // ───────────────────────────────────────────────────────────────────────────
  // 1. HIGH-PERFORMANCE FACADE POSTER (Zero-Delay Placeholder)
  // ───────────────────────────────────────────────────────────────────────────
  if (!hasStartedPlayback) {
    return (
      <div
        ref={containerRef}
        onClick={handleStartPlayback}
        onKeyDown={(e) => {
          if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            handleStartPlayback();
          }
        }}
        tabIndex={0}
        role="button"
        aria-label={`Play ${video.title}`}
        className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black shadow-2xl border border-white/10 group cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-500 select-none"
      >
        {/* High-Resolution Optimized Thumbnail with Fallback Cascade */}
        <img
          src={currentPosterSrc}
          alt={video.title}
          onError={handlePosterError}
          loading="eager"
          // @ts-ignore
          fetchpriority="high"
          decoding="async"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
        />

        {/* Ambient Dark Gradient Vignette */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-black/40 pointer-events-none" />

        {/* Top Badges (Source & Quality) */}
        <div className="absolute top-4 inset-x-4 flex items-center justify-between pointer-events-none">
          <div className="flex items-center gap-2">
            {isYouTube ? (
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-600/90 backdrop-blur-md text-white text-[11px] font-bold shadow-lg border border-red-500/30">
                <Youtube className="w-3.5 h-3.5 fill-current" />
                <span>YouTube HD</span>
              </span>
            ) : video.provider === 'NASA' ? (
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-600/90 backdrop-blur-md text-white text-[11px] font-bold shadow-lg border border-blue-500/30">
                <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
                <span>NASA Deep Space</span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-700/90 backdrop-blur-md text-white text-[11px] font-bold shadow-lg border border-purple-500/30">
                <Sparkles className="w-3.5 h-3.5 text-purple-200" />
                <span>Vyntra Direct Stream</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-gray-200 text-[11px] font-semibold border border-white/10">
              {isYouTube ? 'Adaptive HD' : '1080p FHD'}
            </span>
            {video.durationSeconds > 0 && (
              <span className="px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md text-white text-[11px] font-mono border border-white/10">
                {formatTime(video.durationSeconds)}
              </span>
            )}
          </div>
        </div>

        {/* Center Play Button with Purple Glow and Hover Scale */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-purple-600 hover:bg-purple-500 text-white flex items-center justify-center shadow-[0_0_35px_rgba(168,85,247,0.6)] backdrop-blur-md transition-all duration-300 group-hover:scale-110 group-active:scale-95 border border-purple-400/40">
            <Play className="w-8 h-8 sm:w-9 sm:h-9 fill-current ml-1" />
          </div>
          <span className="text-xs font-semibold text-gray-200 bg-black/60 px-3 py-1 rounded-full backdrop-blur-sm border border-white/10 group-hover:text-purple-300 transition-colors">
            Click to Play
          </span>
        </div>

        {/* Bottom Title Bar Preview */}
        <div className="absolute bottom-4 inset-x-4 pointer-events-none">
          <h2 className="text-white text-sm font-semibold truncate drop-shadow-md">
            {video.title}
          </h2>
        </div>
      </div>
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 2. YOUTUBE OFFICIAL IFRAME PLAYER API INTEGRATION
  // ───────────────────────────────────────────────────────────────────────────
  if (isYouTube) {
    if (!ytVideoId) {
      return (
        <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black shadow-2xl border border-white/10 flex flex-col items-center justify-center p-6 text-center space-y-3">
          <AlertTriangle className="w-10 h-10 text-amber-400" />
          <h3 className="text-sm font-bold text-white">Invalid Video Source</h3>
          <p className="text-xs text-gray-400 max-w-sm">
            Could not extract a valid YouTube video ID from this video's URL. The link may be malformed or restricted.
          </p>
          {(video.originalUrl || video.videoUrl) && (
            <a
              href={video.originalUrl || video.videoUrl || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold btn-primary mt-1"
            >
              <Youtube className="w-4 h-4" />
              <span>Open Original Link</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      );
    }

    return (
      <div
        ref={containerRef}
        className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black shadow-2xl border border-white/10 group"
      >
        {/* Loading Spinner */}
        {isLoading && !ytError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/75 backdrop-blur-sm z-20 pointer-events-none">
            <Loader2 className="w-10 h-10 text-purple-500 animate-spin" />
            <span className="text-xs text-gray-300 font-medium mt-2.5">
              Connecting to YouTube stream…
            </span>
          </div>
        )}

        {/* YouTube Error Overlay */}
        {ytError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/95 backdrop-blur-md p-6 text-center space-y-3 z-30">
            <ShieldAlert className="w-10 h-10 text-amber-400" />
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-white">Playback Restriction</h3>
              <p className="text-xs text-gray-400 max-w-sm">{ytError}</p>
            </div>
            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={() => {
                  setYtError(null);
                  initYouTubePlayer();
                }}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-gray-200 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry</span>
              </button>
              {ytWatchUrl && (
                <a
                  href={ytWatchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold btn-primary"
                >
                  <Youtube className="w-3.5 h-3.5" />
                  <span>Watch on YouTube</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>
        )}

        {/* Quality Preference Bar & Adaptive Controls Overlay */}
        <div className="absolute top-3 right-3 z-20 flex items-center gap-2">
          <div className="relative">
            <button
              onClick={() => setShowQualityMenu((prev) => !prev)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/75 hover:bg-black/90 backdrop-blur-md text-[11px] font-semibold text-gray-200 hover:text-white border border-white/10 shadow-lg transition-colors"
              title="YouTube Playback Quality (Adaptive ABR)"
              aria-label="Quality settings"
            >
              <Settings className="w-3.5 h-3.5 text-purple-400" />
              <span>
                {preferredQuality !== 'auto'
                  ? QUALITY_LABELS[preferredQuality] || preferredQuality
                  : QUALITY_LABELS[activeQuality] || 'Auto'}
              </span>
            </button>

            {/* Quality Dropdown Menu */}
            {showQualityMenu && (
              <div className="absolute top-8 right-0 glass-dropdown rounded-xl p-2 w-56 shadow-2xl z-50 text-xs border border-purple-500/30">
                <div className="px-2 py-1 border-b border-white/10 text-[10px] text-gray-400">
                  <div className="font-semibold text-purple-300">Adaptive Streaming (ABR)</div>
                  <div className="text-[9px] text-gray-400 pt-0.5 leading-tight">
                    Active: <span className="text-white font-medium">{QUALITY_LABELS[activeQuality] || activeQuality}</span>
                  </div>
                </div>

                <div className="py-1 space-y-0.5 max-h-48 overflow-y-auto no-scrollbar">
                  {/* Auto option */}
                  <button
                    onClick={() => handleSelectQuality('auto')}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors ${
                      preferredQuality === 'auto'
                        ? 'bg-purple-600/40 text-purple-200 font-semibold border border-purple-500/40'
                        : 'hover:bg-white/5 text-gray-300'
                    }`}
                  >
                    <span>Auto (Recommended)</span>
                    {preferredQuality === 'auto' && <Check className="w-3.5 h-3.5 text-purple-300" />}
                  </button>

                  {/* Available qualities from YouTube */}
                  {(availableQualities.length > 0
                    ? availableQualities
                    : ['hd1080', 'hd720', 'large', 'medium']
                  ).map((lvl) => {
                    if (lvl === 'auto' || lvl === 'default') return null;
                    const label = QUALITY_LABELS[lvl] || lvl;
                    const isSelected = preferredQuality === lvl;
                    return (
                      <button
                        key={lvl}
                        onClick={() => handleSelectQuality(lvl)}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors ${
                          isSelected
                            ? 'bg-purple-600/40 text-purple-200 font-semibold border border-purple-500/40'
                            : 'hover:bg-white/5 text-gray-300'
                        }`}
                      >
                        <span>{label}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-purple-300" />}
                      </button>
                    );
                  })}
                </div>

                <div className="px-2 pt-1.5 border-t border-white/10 text-[9px] text-gray-400 leading-tight">
                  YouTube automatically delivers the best bitrate supported by your screen & network.
                </div>
              </div>
            )}
          </div>
        </div>

        {/* YouTube API Target Container */}
        <div id={ytContainerId.current} className="w-full h-full" />
      </div>
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 3. INTERNET ARCHIVE EMBED PLAYER
  // ───────────────────────────────────────────────────────────────────────────
  if ((isArchiveEmbed || video.playbackType === 'EMBED_GENERIC') && (video.embedUrl || video.providerVideoId)) {
    const embedSrc = video.embedUrl || `https://archive.org/embed/${video.providerVideoId}`;
    return (
      <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black shadow-2xl border border-white/10">
        <iframe
          src={embedSrc}
          title={video.title}
          className="w-full h-full border-0"
          referrerPolicy="origin"
          allowFullScreen
        />
      </div>
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 4. DIRECT MEDIA STREAM PLAYER (NASA & VYNTRA NATIVE)
  // ───────────────────────────────────────────────────────────────────────────
  const streamSrc =
    video.videoUrl ||
    video.originalUrl ||
    'https://archive.org/download/ElephantsDream/ed_1024_512kb.mp4';

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
      className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black shadow-2xl border border-white/10 group select-none"
    >
      <video
        ref={videoRef}
        src={streamSrc}
        poster={currentPosterSrc}
        onClick={togglePlay}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onWaiting={() => setIsLoading(true)}
        onPlaying={() => {
          setIsLoading(false);
          setHasError(false);
        }}
        onError={() => {
          setIsLoading(false);
          setHasError(true);
        }}
        onEnded={() => setIsPlaying(false)}
        className="w-full h-full object-contain cursor-pointer"
        playsInline
      />

      {/* Loading Spinner */}
      {isLoading && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm pointer-events-none">
          <div className="w-12 h-12 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
        </div>
      )}

      {/* Playback Recovery / Fallback Overlay */}
      {hasError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 backdrop-blur-md p-6 text-center space-y-3 z-30">
          <ShieldAlert className="w-10 h-10 text-amber-400" />
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-white">Stream Notice</h3>
            <p className="text-xs text-gray-400 max-w-sm">
              Direct media streaming encountered a host restriction. You can view the original verified resource or retry below.
            </p>
          </div>
          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={() => {
                setHasError(false);
                setIsLoading(true);
                if (videoRef.current) {
                  videoRef.current.load();
                }
              }}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-gray-200 transition-colors"
            >
              Retry Stream
            </button>
            {video.originalUrl && (
              <a
                href={video.originalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold btn-primary"
              >
                <span>Open Official Source</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>
      )}

      {/* Big Center Play Button when Paused */}
      {!isPlaying && !isLoading && !hasError && (
        <button
          onClick={togglePlay}
          className="absolute inset-0 m-auto w-16 h-16 rounded-full bg-purple-600/80 hover:bg-purple-600 text-white flex items-center justify-center shadow-2xl backdrop-blur-md transition-transform hover:scale-110 active:scale-95 border border-purple-400/40"
          aria-label="Play Video"
        >
          <Play className="w-8 h-8 fill-current ml-1" />
        </button>
      )}

      {/* Controls Overlay */}
      <div
        className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent p-4 transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Progress / Seek bar */}
        <div className="relative mb-3 group/progress">
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-purple-500 hover:h-2 transition-all"
          />
        </div>

        <div className="flex items-center justify-between text-white text-xs">
          {/* Left Controls */}
          <div className="flex items-center gap-1 sm:gap-3">
            <button
              onClick={togglePlay}
              className="w-9 h-9 sm:w-8 sm:h-8 flex items-center justify-center hover:text-purple-400 transition-colors"
              aria-label="Play/Pause"
            >
              {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
            </button>

            <button
              onClick={() => {
                if (videoRef.current) videoRef.current.currentTime = Math.max(0, currentTime - 10);
              }}
              className="w-9 h-9 sm:w-8 sm:h-8 flex items-center justify-center hover:text-purple-400 transition-colors"
              title="Rewind 10s"
              aria-label="Rewind 10 seconds"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {/* Volume */}
            <div className="flex items-center gap-1 sm:gap-2 group/vol">
              <button
                onClick={toggleMute}
                className="w-9 h-9 sm:w-8 sm:h-8 flex items-center justify-center hover:text-purple-400 transition-colors"
                aria-label="Mute / Unmute"
              >
                {isMuted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-16 h-1 bg-white/30 rounded appearance-none cursor-pointer accent-purple-500 hidden sm:block"
              />
            </div>

            {/* Time */}
            <div className="text-[10px] sm:text-[11px] font-mono text-gray-300 pl-1 sm:pl-2">
              <span>{formatTime(currentTime)}</span>
              <span className="hidden sm:inline"> / {formatTime(duration)}</span>
            </div>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 relative">
            {video.downloadAllowed && onOpenDownload && (
              <button
                onClick={onOpenDownload}
                className="flex items-center gap-1 px-2.5 py-1.5 min-h-[36px] rounded-lg bg-white/10 hover:bg-purple-600/30 hover:border-purple-500/40 border border-white/10 text-xs font-medium text-white transition-all"
                title="Download Video via Quota"
              >
                <Download className="w-3.5 h-3.5 text-purple-400" />
                <span className="hidden sm:inline">Download</span>
              </button>
            )}

            {/* Speed */}
            <div className="relative">
              <button
                onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                className="h-9 sm:h-8 px-2 flex items-center justify-center rounded hover:bg-white/10 text-[11px] font-semibold text-gray-300 hover:text-white"
                aria-label="Playback speed"
              >
                {playbackSpeed}x
              </button>
              {showSpeedMenu && (
                <div className="absolute bottom-10 right-0 glass-dropdown rounded-xl p-1.5 w-24 shadow-2xl z-50 text-xs">
                  {[0.5, 0.75, 1, 1.25, 1.5, 2].map((spd) => (
                    <button
                      key={spd}
                      onClick={() => handleSpeedSelect(spd)}
                      className={`w-full text-left px-2 py-1.5 min-h-[32px] rounded-lg transition-colors ${
                        playbackSpeed === spd ? 'bg-purple-600 text-white font-semibold' : 'hover:bg-white/5 text-gray-300'
                      }`}
                    >
                      {spd}x
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Fullscreen */}
            <button
              onClick={toggleFullscreen}
              className="w-9 h-9 sm:w-8 sm:h-8 flex items-center justify-center hover:text-purple-400 transition-colors"
              aria-label="Toggle Fullscreen"
            >
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
