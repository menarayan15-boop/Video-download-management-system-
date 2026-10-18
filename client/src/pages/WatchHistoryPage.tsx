import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { History, Play, AlertCircle, CheckCircle2, Trash2, X } from 'lucide-react';
import { api } from '../services/api';

export const WatchHistoryPage: React.FC = () => {
  const [historyItems, setHistoryItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterType, setFilterType] = useState<'all' | 'unfinished'>('all');

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = () => {
    setIsLoading(true);
    api
      .getWatchHistory()
      .then((data) => setHistoryItems(Array.isArray(data) ? data : []))
      .catch((err) => console.error('Failed to load history:', err))
      .finally(() => setIsLoading(false));
  };

  const handleDeleteItem = async (videoId: string) => {
    try {
      await api.deleteWatchHistoryItem(videoId);
      setHistoryItems((prev) => prev.filter((item) => item.id !== videoId));
    } catch (err) {
      console.error('Failed to delete history item:', err);
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm('Permanently clear all watch history records?')) return;
    try {
      await api.clearWatchHistory();
      setHistoryItems([]);
    } catch (err) {
      console.error('Failed to clear history:', err);
    }
  };

  const formatDuration = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const remainder = sec % 60;
    return `${mins}:${remainder < 10 ? '0' : ''}${remainder}`;
  };

  const displayedItems = useMemo(() => {
    if (filterType === 'unfinished') {
      return historyItems.filter((item) => !item.completed);
    }
    return historyItems;
  }, [historyItems, filterType]);

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16" aria-label="Watch History">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-2.5">
            <History className="w-7 h-7 text-purple-400" />
            <span>Watch History</span>
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Pick up right where you left off across all your watched sessions.
          </p>
        </div>

        {historyItems.length > 0 && (
          <button
            onClick={handleClearAll}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-950/40 hover:bg-red-900/50 text-red-300 border border-red-500/30 text-xs font-semibold self-start sm:self-auto transition-colors"
            title="Clear all watch history"
          >
            <Trash2 className="w-4 h-4" />
            <span>Clear History</span>
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      {historyItems.length > 0 && (
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              filterType === 'all'
                ? 'bg-purple-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            All Videos ({historyItems.length})
          </button>
          <button
            onClick={() => setFilterType('unfinished')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              filterType === 'unfinished'
                ? 'bg-purple-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            Unfinished ({historyItems.filter((i) => !i.completed).length})
          </button>
        </div>
      )}

      {/* History Items List */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 rounded-2xl bg-white/5 animate-pulse" />
          ))}
        </div>
      ) : displayedItems.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center max-w-md mx-auto space-y-3">
          <AlertCircle className="w-10 h-10 text-purple-400 mx-auto opacity-70" />
          <h3 className="text-base font-bold text-white">
            {filterType === 'unfinished' ? 'No unfinished videos' : 'No watch history found'}
          </h3>
          <p className="text-xs text-gray-400">
            Videos you watch on Vyntra will automatically appear here with exact timestamp tracking.
          </p>
          <Link to="/explore" className="inline-block px-4 py-2 rounded-xl text-xs font-semibold btn-primary mt-2">
            Start Watching
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {displayedItems.map((item) => {
            const pct = Math.min(100, Math.round(((item.progressSeconds || 0) / (item.durationSeconds || 1)) * 100));

            return (
              <div
                key={item.id}
                className="glass-card p-3 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group hover:border-purple-500/30 transition-all"
              >
                <div className="flex items-center gap-3 w-full sm:w-auto min-w-0 flex-1">
                  <div className="relative w-32 aspect-video rounded-xl overflow-hidden bg-gray-900 flex-shrink-0">
                    <img
                      src={item.thumbnailUrl || '/placeholder-thumb.jpg'}
                      alt={item.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&q=80';
                      }}
                    />
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
                      <div className="h-full bg-purple-500" style={{ width: `${pct}%` }} />
                    </div>
                  </div>

                  <div className="min-w-0 flex-1 space-y-1">
                    <Link
                      to={`/watch/${item.id}`}
                      className="text-xs sm:text-sm font-semibold text-white hover:text-purple-300 transition-colors line-clamp-1"
                    >
                      {item.title}
                    </Link>
                    <p className="text-[11px] text-gray-400">{item.creator?.username || item.creatorName}</p>
                    <div className="flex items-center gap-2 text-[10px] text-gray-500">
                      <span>{formatDuration(item.progressSeconds || 0)} / {formatDuration(item.durationSeconds)}</span>
                      <span>•</span>
                      {item.completed ? (
                        <span className="text-green-400 flex items-center gap-0.5">
                          <CheckCircle2 className="w-3 h-3" /> Completed
                        </span>
                      ) : (
                        <span className="text-purple-300">{pct}% watched</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0">
                  <Link
                    to={`/watch/${item.id}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold btn-primary"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Resume</span>
                  </Link>
                  <button
                    onClick={() => handleDeleteItem(item.id)}
                    className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-white/10 rounded-lg transition-colors"
                    title="Remove from history"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
