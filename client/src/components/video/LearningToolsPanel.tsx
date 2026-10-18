import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Bookmark,
  FileText,
  HelpCircle,
  Clock,
  Plus,
  Trash2,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { VideoBookmark, VideoNote, StudyHelper, Video } from '../../types';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

interface LearningToolsPanelProps {
  video: Video;
  currentTimeSeconds: number;
  onSeek: (seconds: number) => void;
}

export const LearningToolsPanel: React.FC<LearningToolsPanelProps> = ({
  video,
  currentTimeSeconds,
  onSeek,
}) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'study' | 'bookmarks' | 'notes' | 'transcript'>('study');

  // Study Helper State
  const [studyGuide, setStudyGuide] = useState<StudyHelper | null>(null);
  const [isStudyLoading, setIsStudyLoading] = useState(false);
  const [studyError, setStudyError] = useState<string | null>(null);

  // Bookmarks State
  const [bookmarks, setBookmarks] = useState<VideoBookmark[]>([]);
  const [isBookmarksLoading, setIsBookmarksLoading] = useState(false);
  const [newBookmarkTitle, setNewBookmarkTitle] = useState('');
  const [isAddingBookmark, setIsAddingBookmark] = useState(false);

  // Notes State
  const [notes, setNotes] = useState<VideoNote[]>([]);
  const [isNotesLoading, setIsNotesLoading] = useState(false);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [linkNoteTimestamp, setLinkNoteTimestamp] = useState(true);
  const [isAddingNote, setIsAddingNote] = useState(false);

  // Format seconds to MM:SS
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = Math.floor(secs % 60);
    return `${mins}:${remainingSecs < 10 ? '0' : ''}${remainingSecs}`;
  };

  // Fetch Study Helper
  useEffect(() => {
    if (activeTab === 'study' && !studyGuide) {
      setIsStudyLoading(true);
      setStudyError(null);
      api
        .getStudyHelper(video.id)
        .then((data) => setStudyGuide(data))
        .catch((err) => {
          setStudyError('Study guide unavailable for this video or provider.');
        })
        .finally(() => setIsStudyLoading(false));
    }
  }, [video.id, activeTab, studyGuide]);

  // Fetch Bookmarks
  useEffect(() => {
    if (user && activeTab === 'bookmarks') {
      setIsBookmarksLoading(true);
      api
        .getVideoBookmarks(video.id)
        .then((data) => setBookmarks(data || []))
        .catch(() => setBookmarks([]))
        .finally(() => setIsBookmarksLoading(false));
    }
  }, [video.id, user, activeTab]);

  // Fetch Notes
  useEffect(() => {
    if (user && activeTab === 'notes') {
      setIsNotesLoading(true);
      api
        .getVideoNotes(video.id)
        .then((data) => setNotes(data || []))
        .catch(() => setNotes([]))
        .finally(() => setIsNotesLoading(false));
    }
  }, [video.id, user, activeTab]);

  // Handle Create Bookmark
  const handleCreateBookmark = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newBookmarkTitle.trim()) return;

    try {
      setIsAddingBookmark(true);
      const created = await api.createVideoBookmark(video.id, {
        timestampSeconds: Math.floor(currentTimeSeconds),
        title: newBookmarkTitle.trim(),
      });
      setBookmarks((prev) => [...prev, created].sort((a, b) => a.timestampSeconds - b.timestampSeconds));
      setNewBookmarkTitle('');
    } catch (err) {
      console.error('Failed to create bookmark:', err);
    } finally {
      setIsAddingBookmark(false);
    }
  };

  // Handle Delete Bookmark
  const handleDeleteBookmark = async (bookmarkId: string) => {
    try {
      await api.deleteVideoBookmark(video.id, bookmarkId);
      setBookmarks((prev) => prev.filter((b) => b.id !== bookmarkId));
    } catch (err) {
      console.error('Failed to delete bookmark:', err);
    }
  };

  // Handle Create Note
  const handleCreateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newNoteContent.trim()) return;

    try {
      setIsAddingNote(true);
      const payload: { content: string; timestampSeconds?: number } = {
        content: newNoteContent.trim(),
      };
      if (linkNoteTimestamp) {
        payload.timestampSeconds = Math.floor(currentTimeSeconds);
      }
      const created = await api.createVideoNote(video.id, payload);
      setNotes((prev) => [created, ...prev]);
      setNewNoteContent('');
    } catch (err) {
      console.error('Failed to create note:', err);
    } finally {
      setIsAddingNote(false);
    }
  };

  // Handle Delete Note
  const handleDeleteNote = async (noteId: string) => {
    try {
      await api.deleteVideoNote(video.id, noteId);
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
    } catch (err) {
      console.error('Failed to delete note:', err);
    }
  };

  return (
    <div className="glass-panel rounded-2xl border border-white/10 overflow-hidden shadow-xl" aria-label="Smart Learning Tools">
      {/* Header Tabs */}
      <div className="flex items-center border-b border-white/10 bg-slate-950/40 px-3 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveTab('study')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'study'
              ? 'border-purple-500 text-purple-300 bg-purple-500/10'
              : 'border-transparent text-gray-400 hover:text-white'
          }`}
          role="tab"
          aria-selected={activeTab === 'study'}
        >
          <Sparkles className="w-4 h-4 text-purple-400" />
          <span>Study Guide</span>
        </button>

        <button
          onClick={() => setActiveTab('bookmarks')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'bookmarks'
              ? 'border-purple-500 text-purple-300 bg-purple-500/10'
              : 'border-transparent text-gray-400 hover:text-white'
          }`}
          role="tab"
          aria-selected={activeTab === 'bookmarks'}
        >
          <Bookmark className="w-4 h-4 text-purple-400" />
          <span>Bookmarks ({bookmarks.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('notes')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'notes'
              ? 'border-purple-500 text-purple-300 bg-purple-500/10'
              : 'border-transparent text-gray-400 hover:text-white'
          }`}
          role="tab"
          aria-selected={activeTab === 'notes'}
        >
          <FileText className="w-4 h-4 text-purple-400" />
          <span>Personal Notes ({notes.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('transcript')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'transcript'
              ? 'border-purple-500 text-purple-300 bg-purple-500/10'
              : 'border-transparent text-gray-400 hover:text-white'
          }`}
          role="tab"
          aria-selected={activeTab === 'transcript'}
        >
          <BookOpen className="w-4 h-4 text-purple-400" />
          <span>Transcript</span>
        </button>
      </div>

      {/* Tab Panels */}
      <div className="p-4 sm:p-5">
        {/* ==================== 1. STUDY GUIDE ==================== */}
        {activeTab === 'study' && (
          <div className="space-y-4">
            {isStudyLoading ? (
              <div className="space-y-3 animate-pulse">
                <div className="h-4 w-40 bg-white/10 rounded" />
                <div className="h-16 w-full bg-white/5 rounded-xl" />
                <div className="h-24 w-full bg-white/5 rounded-xl" />
              </div>
            ) : studyGuide ? (
              <div className="space-y-5 text-xs">
                {/* Executive Summary */}
                {studyGuide.summary && (
                  <div className="p-3.5 rounded-xl bg-purple-950/20 border border-purple-500/20 space-y-1.5">
                    <h4 className="font-bold text-purple-300 flex items-center gap-1.5 uppercase text-[10px] tracking-wider">
                      <Sparkles className="w-3.5 h-3.5" />
                      Executive Summary
                    </h4>
                    <p className="text-gray-200 leading-relaxed">{studyGuide.summary}</p>
                  </div>
                )}

                {/* Beginner Explanation */}
                {studyGuide.explanation && (
                  <div className="p-3.5 rounded-xl bg-blue-950/20 border border-blue-500/20 space-y-1.5">
                    <h4 className="font-bold text-cyan-300 flex items-center gap-1.5 uppercase text-[10px] tracking-wider">
                      <HelpCircle className="w-3.5 h-3.5" />
                      Beginner-Friendly Breakdown
                    </h4>
                    <p className="text-gray-200 leading-relaxed">{studyGuide.explanation}</p>
                  </div>
                )}

                {/* Key Takeaways */}
                {studyGuide.takeaways && studyGuide.takeaways.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-bold text-white uppercase text-[11px] tracking-wider flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      Key Takeaways
                    </h4>
                    <ul className="space-y-1.5 pl-1">
                      {studyGuide.takeaways.map((point, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-gray-300 leading-snug">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 flex-shrink-0" />
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Important Terminology */}
                {studyGuide.terminology && studyGuide.terminology.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-bold text-white uppercase text-[11px] tracking-wider flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
                      Essential Terminology
                    </h4>
                      {studyGuide.terminology.map((t, idx) => {
                        const term = typeof t === 'string' ? t : t.term;
                        const def = typeof t === 'string' ? '' : t.definition;
                        return (
                          <div key={idx} className="p-2.5 rounded-lg bg-white/[0.03] border border-white/5 space-y-0.5">
                            <span className="font-bold text-purple-300">{term}</span>
                            {def ? <p className="text-gray-400 text-[11px] leading-snug">{def}</p> : null}
                          </div>
                        );
                      })}
                  </div>
                )}

                {/* Revision Questions */}
                {studyGuide.revisionQuestions && studyGuide.revisionQuestions.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-bold text-white uppercase text-[11px] tracking-wider flex items-center gap-1.5">
                      <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
                      Self-Study Revision Questions
                    </h4>
                    <ol className="space-y-1.5 list-decimal list-inside text-gray-300">
                      {studyGuide.revisionQuestions.map((q, idx) => (
                        <li key={idx} className="leading-snug">{q}</li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-6 text-center space-y-2">
                <AlertCircle className="w-8 h-8 text-purple-400 mx-auto opacity-70" />
                <h4 className="font-semibold text-white text-sm">Study Guide Not Available</h4>
                <p className="text-xs text-gray-400 max-w-md mx-auto">
                  {studyError || 'AI study guide requires published video captions and verified educational metadata. Normal playback continues without interruption.'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* ==================== 2. TIMESTAMP BOOKMARKS ==================== */}
        {activeTab === 'bookmarks' && (
          <div className="space-y-4">
            {!user ? (
              <p className="text-xs text-gray-400 text-center py-4">
                Please sign in to save personal timestamp bookmarks.
              </p>
            ) : (
              <>
                {/* Add Bookmark Input */}
                <form onSubmit={handleCreateBookmark} className="flex gap-2">
                  <div className="flex items-center px-3 py-2 rounded-xl bg-purple-950/40 border border-purple-500/30 text-purple-300 text-xs font-mono font-bold flex-shrink-0">
                    <Clock className="w-3.5 h-3.5 mr-1" />
                    <span>{formatTime(currentTimeSeconds)}</span>
                  </div>
                  <input
                    type="text"
                    value={newBookmarkTitle}
                    onChange={(e) => setNewBookmarkTitle(e.target.value)}
                    placeholder="Bookmark label (e.g., Key Formula, Proof Step)..."
                    className="flex-1 px-3 py-2 rounded-xl glass-input text-xs"
                    disabled={isAddingBookmark}
                  />
                  <button
                    type="submit"
                    disabled={isAddingBookmark || !newBookmarkTitle.trim()}
                    className="btn-primary px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1 disabled:opacity-50"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add</span>
                  </button>
                </form>

                {/* Bookmark List */}
                {isBookmarksLoading ? (
                  <div className="py-6 text-center text-xs text-gray-400 animate-pulse">Loading bookmarks...</div>
                ) : bookmarks.length > 0 ? (
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {bookmarks.map((bm) => (
                      <div
                        key={bm.id}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 transition-colors group"
                      >
                        <button
                          onClick={() => onSeek(bm.timestampSeconds)}
                          className="flex items-center gap-2.5 text-left min-w-0"
                          title="Seek player to timestamp"
                        >
                          <span className="px-2 py-0.5 rounded-md bg-purple-600/30 text-purple-300 font-mono text-xs font-semibold border border-purple-500/30 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                            {formatTime(bm.timestampSeconds)}
                          </span>
                          <span className="text-xs font-medium text-white truncate">{bm.title}</span>
                        </button>
                        <button
                          onClick={() => handleDeleteBookmark(bm.id)}
                          className="text-gray-500 hover:text-red-400 p-1 rounded-lg transition-colors"
                          title="Delete bookmark"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center text-xs text-gray-500">
                    No bookmarks saved yet. Pause or play to any moment and click "Add" to pin a timestamp.
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ==================== 3. PERSONAL NOTES ==================== */}
        {activeTab === 'notes' && (
          <div className="space-y-4">
            {!user ? (
              <p className="text-xs text-gray-400 text-center py-4">
                Please sign in to keep private notes linked to this video.
              </p>
            ) : (
              <>
                <form onSubmit={handleCreateNote} className="space-y-2">
                  <textarea
                    rows={2}
                    value={newNoteContent}
                    onChange={(e) => setNewNoteContent(e.target.value)}
                    placeholder="Write a private study note or reference..."
                    className="w-full p-2.5 rounded-xl glass-input text-xs resize-none"
                    disabled={isAddingNote}
                  />
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-1.5 text-xs text-gray-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={linkNoteTimestamp}
                        onChange={(e) => setLinkNoteTimestamp(e.target.checked)}
                        className="rounded accent-purple-500"
                      />
                      <span>Link to current time ({formatTime(currentTimeSeconds)})</span>
                    </label>
                    <button
                      type="submit"
                      disabled={isAddingNote || !newNoteContent.trim()}
                      className="btn-primary px-4 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 disabled:opacity-50"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Save Note</span>
                    </button>
                  </div>
                </form>

                {/* Notes List */}
                {isNotesLoading ? (
                  <div className="py-6 text-center text-xs text-gray-400 animate-pulse">Loading notes...</div>
                ) : notes.length > 0 ? (
                  <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                    {notes.map((note) => (
                      <div
                        key={note.id}
                        className="p-3 rounded-xl bg-white/[0.03] border border-white/5 space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          {note.timestampSeconds !== undefined && note.timestampSeconds !== null ? (
                            <button
                              onClick={() => onSeek(note.timestampSeconds!)}
                              className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold text-purple-300 hover:text-purple-200 bg-purple-600/20 px-2 py-0.5 rounded border border-purple-500/30"
                              title="Seek player to timestamp"
                            >
                              <Clock className="w-3 h-3" />
                              <span>{formatTime(note.timestampSeconds)}</span>
                            </button>
                          ) : (
                            <span className="text-[10px] text-gray-500">General Note</span>
                          )}
                          <button
                            onClick={() => handleDeleteNote(note.id)}
                            className="text-gray-500 hover:text-red-400 p-1 rounded-lg transition-colors"
                            title="Delete note"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                        <p className="text-xs text-gray-200 whitespace-pre-wrap leading-relaxed">{note.content}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center text-xs text-gray-500">
                    Your notes are 100% private. Write takeaways, questions, or ideas while you watch.
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ==================== 4. TRANSCRIPT ==================== */}
        {activeTab === 'transcript' && (
          <div className="space-y-3 text-xs">
            {video.description ? (
              <div className="space-y-2">
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                  <span className="font-semibold text-purple-300">Video Script & Overview:</span>
                  <p className="text-gray-300 leading-relaxed whitespace-pre-line">{video.description}</p>
                </div>
                <p className="text-[11px] text-gray-500 italic">
                  Note: Full word-for-word synchronized transcripts are rendered when certified closed captions (CC) are supplied directly by the upstream provider.
                </p>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-6">
                No published transcript or closed captioning track is provided for this media stream.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
