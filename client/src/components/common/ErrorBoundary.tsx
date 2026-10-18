import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[Vyntra Diagnostic ErrorBoundary caught an error]:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[60vh] flex items-center justify-center p-6 w-full">
          <div className="max-w-md w-full glass-card rounded-2xl p-8 border border-white/10 text-center space-y-4 shadow-2xl bg-slate-900/90 backdrop-blur-md">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-lg font-bold text-white">
                {this.props.fallbackTitle || 'Unable to display this view'}
              </h2>
              <p className="text-xs text-gray-400 leading-relaxed">
                {this.props.fallbackMessage ||
                  'An unexpected rendering issue occurred. You can refresh the page or return to the home screen.'}
              </p>
            </div>

            {/* Diagnostic hint in development / console notice */}
            {this.state.error?.message && (
              <div className="p-3 rounded-xl bg-black/40 border border-white/5 text-[11px] text-gray-400 font-mono text-left overflow-x-auto max-h-24 no-scrollbar">
                {this.state.error.message}
              </div>
            )}

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={this.handleReload}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold btn-primary"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reload Page</span>
              </button>

              <button
                onClick={this.handleGoHome}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold btn-secondary text-gray-300 hover:text-white"
              >
                <Home className="w-3.5 h-3.5" />
                <span>Go to Home</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
