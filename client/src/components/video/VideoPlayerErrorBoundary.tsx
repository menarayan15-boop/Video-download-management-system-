import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, ExternalLink, RefreshCw, Youtube } from 'lucide-react';
import { Video } from '../../types';

interface Props {
  video: Video;
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string | null;
}

export class VideoPlayerErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    errorMessage: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error.message };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[Vyntra VideoPlayerErrorBoundary caught error]:', error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, errorMessage: null });
  };

  public render() {
    if (this.state.hasError) {
      const { video } = this.props;
      const youtubeId =
        video.providerVideoId ||
        (video.embedUrl && video.embedUrl.match(/(?:embed\/|v\/|vi\/|watch\?v=)([a-zA-Z0-9_-]{11})/)?.[1]) ||
        (video.videoUrl && video.videoUrl.match(/(?:embed\/|v\/|vi\/|watch\?v=)([a-zA-Z0-9_-]{11})/)?.[1]);

      const youtubeWatchUrl = youtubeId ? `https://www.youtube.com/watch?v=${youtubeId}` : null;

      return (
        <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-slate-950/90 border border-white/10 shadow-2xl flex flex-col items-center justify-center p-6 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <AlertTriangle className="w-6 h-6" />
          </div>

          <div className="space-y-1">
            <h3 className="text-sm font-bold text-white">Video Player Encountered an Issue</h3>
            <p className="text-xs text-gray-400 max-w-sm">
              The player was unable to initialize the playback stream. The rest of the page remains available.
            </p>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={this.handleRetry}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-gray-200 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Player</span>
            </button>

            {youtubeWatchUrl && (
              <a
                href={youtubeWatchUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold btn-primary"
              >
                <Youtube className="w-4 h-4 text-red-500" />
                <span>Watch on YouTube</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
