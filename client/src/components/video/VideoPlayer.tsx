import React, { useState, useRef, useEffect } from 'react';
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
} from 'lucide-react';
import { Video } from '../../types';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

interface VideoPlayerProps {
  video: Video;
  initialProgressSeconds?: number;
  seekToSeconds?: number;
  onCurrentTimeChange?: (seconds: number) => void;
  onOpenDownload?: () => void;
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

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(video.durationSeconds || 0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const isYouTube = video.provider === 'YOUTUBE' || video.playbackType === 'EMBED_YOUTUBE';
  const isArchiveEmbed = video.provider === 'ARCHIVE' && video.playbackType === 'EMBED_GENERIC';

  // Set initial time or handle external seek (e.g. from bookmark click)
  useEffect(() => {
    if (videoRef.current && initialProgressSeconds > 0) {
      videoRef.current.currentTime = initialProgressSeconds;
    }
  }, [initialProgressSeconds]);

  useEffect(() => {
    if (videoRef.current && typeof seekToSeconds === 'number') {
      videoRef.current.currentTime = seekToSeconds;
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  }, [seekToSeconds]);

  // Periodic watch progress recording
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      if (videoRef.current && isPlaying) {
        const curr = Math.floor(videoRef.current.currentTime);
        const completed = duration > 0 && curr >= duration * 0.9;
        api.recordWatchProgress(video.id, curr, completed).catch(() => {});
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [user, video.id, isPlaying, duration]);

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

  // 1. YouTube Official Embed Player (Clean, provider-neutral iframe)
  if (isYouTube && video.providerVideoId) {
    return (
      <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black shadow-2xl border border-white/10">
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${video.providerVideoId}?autoplay=1&rel=0&playsinline=1&iv_load_policy=3`}
          title={video.title}
          className="w-full h-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
    );
  }

  // 2. Internet Archive Embed Player (Clean, provider-neutral iframe)
  if (isArchiveEmbed && video.providerVideoId) {
    return (
      <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black shadow-2xl border border-white/10">
        <iframe
          src={video.embedUrl || `https://archive.org/embed/${video.providerVideoId}`}
          title={video.title}
          className="w-full h-full border-0"
          allowFullScreen
        />
      </div>
    );
  }

  // 3. Direct Playback (NASA Missions or Native Vyntra Uploads)
  const streamSrc = video.videoUrl || video.originalUrl || '';

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
          poster={video.thumbnailUrl}
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
            className="absolute inset-0 m-auto w-16 h-16 rounded-full bg-purple-600/80 hover:bg-purple-600 text-white flex items-center justify-center shadow-2xl backdrop-blur-md transition-transform hover:scale-110 active:scale-95"
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
