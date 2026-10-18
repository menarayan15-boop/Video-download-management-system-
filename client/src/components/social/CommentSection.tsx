import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Globe,
  CornerDownRight,
  MoreVertical,
  Edit2,
  Trash2,
  Send,
  Languages,
  Check,
} from 'lucide-react';
import { Comment } from '../../types';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

interface CommentSectionProps {
  videoId: string;
  creatorId?: string;
}

const LANGUAGE_OPTIONS = [
  { code: 'hi', name: 'Hindi (हिन्दी)' },
  { code: 'ta', name: 'Tamil (தமிழ்)' },
  { code: 'te', name: 'Telugu (తెలుగు)' },
  { code: 'kn', name: 'Kannada (ಕನ್ನಡ)' },
  { code: 'bn', name: 'Bengali (বাংলা)' },
  { code: 'gu', name: 'Gujarati (ગુજરાતી)' },
  { code: 'pa', name: 'Punjabi (ਪੰਜਾਬੀ)' },
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish (Español)' },
  { code: 'fr', name: 'French (Français)' },
];

export const CommentSection: React.FC<CommentSectionProps> = ({ videoId, creatorId }) => {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [translatedMap, setTranslatedMap] = useState<Record<string, { text: string; lang: string; showTranslated: boolean }>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTranslateDropdown, setActiveTranslateDropdown] = useState<string | null>(null);

  useEffect(() => {
    loadComments();
  }, [videoId]);

  const loadComments = async () => {
    try {
      const data = await api.getComments(videoId);
      setComments(data || []);

      // Preload already cached translations from backend
      const initialMap: Record<string, { text: string; lang: string; showTranslated: boolean }> = {};
      data?.forEach((c: Comment) => {
        if (c.translatedContent && c.translationLang) {
          initialMap[c.id] = { text: c.translatedContent, lang: c.translationLang, showTranslated: true };
        }
        c.replies?.forEach((r) => {
          if (r.translatedContent && r.translationLang) {
            initialMap[r.id] = { text: r.translatedContent, lang: r.translationLang, showTranslated: true };
          }
        });
      });
      setTranslatedMap(initialMap);
    } catch (err) {}
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !user || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const created = await api.addComment(videoId, { content: newComment.trim() });
      setComments([created, ...comments]);
      setNewComment('');
    } catch (err) {
      alert('Failed to post comment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddReply = async (parentId: string) => {
    if (!replyText.trim() || !user || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const reply = await api.addComment(videoId, { content: replyText.trim(), parentId });
      setComments(
        comments.map((c) => (c.id === parentId ? { ...c, replies: [...(c.replies || []), reply] } : c))
      );
      setReplyingToId(null);
      setReplyText('');
    } catch (err) {
      alert('Failed to post reply.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveEdit = async (commentId: string) => {
    if (!editText.trim()) return;
    try {
      const updated = await api.editComment(commentId, editText.trim());
      setComments(
        comments.map((c) => {
          if (c.id === commentId) return { ...c, content: updated.content, isEdited: true };
          if (c.replies) {
            return {
              ...c,
              replies: c.replies.map((r) =>
                r.id === commentId ? { ...r, content: updated.content, isEdited: true } : r
              ),
            };
          }
          return c;
        })
      );
      setEditingCommentId(null);
    } catch (err) {
      alert('Failed to edit comment.');
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Are you sure you want to delete this comment?')) return;
    try {
      await api.deleteComment(commentId);
      setComments(
        comments
          .filter((c) => c.id !== commentId)
          .map((c) => ({
            ...c,
            replies: c.replies?.filter((r) => r.id !== commentId),
          }))
      );
    } catch (err) {
      alert('Failed to delete comment.');
    }
  };

  const handleTranslate = async (commentId: string, targetLang: string) => {
    setActiveTranslateDropdown(null);
    try {
      const res = await api.translate({ commentId, targetLang });
      setTranslatedMap((prev) => ({
        ...prev,
        [commentId]: {
          text: res.translatedContent,
          lang: targetLang,
          showTranslated: true,
        },
      }));
    } catch (err) {
      alert('Translation service is currently busy. Please try again.');
    }
  };

  const toggleTranslationView = (commentId: string) => {
    setTranslatedMap((prev) => {
      const existing = prev[commentId];
      if (!existing) return prev;
      return {
        ...prev,
        [commentId]: { ...existing, showTranslated: !existing.showTranslated },
      };
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-3 border-b border-white/10">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-purple-400" />
          Community Discussion ({comments.length})
        </h3>
      </div>

      {/* Add Top-Level Comment */}
      {user ? (
        <form onSubmit={handleAddComment} className="flex gap-3 items-start">
          <img
            src={user.avatarUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${user.username}`}
            alt={user.username}
            className="w-9 h-9 rounded-full object-cover border border-purple-500/30 flex-shrink-0"
          />
          <div className="flex-1 space-y-2">
            <textarea
              placeholder="Add to the conversation... (English, हिन्दी, தமிழ், etc.)"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              rows={2}
              className="w-full p-3 text-xs rounded-xl glass-input placeholder-gray-400 resize-none focus:ring-1 focus:ring-purple-500"
            />
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={!newComment.trim() || isSubmitting}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold btn-primary disabled:opacity-40"
              >
                <Send className="w-3.5 h-3.5" />
                Comment
              </button>
            </div>
          </div>
        </form>
      ) : (
        <div className="p-4 rounded-xl glass-card text-center text-xs text-gray-400">
          <p>Sign in to join the conversation and interact with creators.</p>
        </div>
      )}

      {/* Comments List */}
      <div className="space-y-4 divide-y divide-white/5">
        {comments.map((comment) => {
          const trans = translatedMap[comment.id];
          const isOwner = user?.id === comment.userId;
          const isCreatorOwner = creatorId === comment.userId;

          return (
            <div key={comment.id} className="pt-4 first:pt-0 space-y-3">
              {/* Comment Header & Content */}
              <div className="flex items-start gap-3">
                <img
                  src={comment.user.avatarUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${comment.user.username}`}
                  alt={comment.user.username}
                  className="w-8 h-8 rounded-full object-cover border border-white/10 flex-shrink-0"
                />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-gray-200">{comment.user.username}</span>
                    {isCreatorOwner && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-900/60 text-purple-300 border border-purple-500/30">
                        CREATOR
                      </span>
                    )}
                    <span className="text-[10px] text-gray-500">
                      {new Date(comment.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </span>
                    {comment.isEdited && (
                      <span className="text-[10px] text-gray-500 italic">(edited)</span>
                    )}
                  </div>

                  {/* Comment Body / Edit Mode */}
                  {editingCommentId === comment.id ? (
                    <div className="mt-2 space-y-2">
                      <textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="w-full p-2 text-xs rounded-lg glass-input"
                        rows={2}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSaveEdit(comment.id)}
                          className="px-2.5 py-1 text-[11px] rounded btn-primary"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingCommentId(null)}
                          className="px-2.5 py-1 text-[11px] rounded btn-secondary"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-1 text-xs text-gray-300 leading-relaxed break-words">
                      {trans?.showTranslated ? (
                        <div className="p-2.5 rounded-lg bg-purple-950/20 border border-purple-500/20 text-purple-100">
                          <p>{trans.text}</p>
                          <p className="text-[10px] text-purple-400/80 mt-1 flex items-center gap-1 font-mono">
                            <Check className="w-3 h-3" /> Translated ({trans.lang.toUpperCase()})
                          </p>
                        </div>
                      ) : (
                        <p>{comment.content}</p>
                      )}
                    </div>
                  )}

                  {/* Actions Bar */}
                  <div className="flex items-center gap-4 mt-2 text-[11px] text-gray-400">
                    {/* Reply Toggle */}
                    {user && (
                      <button
                        onClick={() => {
                          setReplyingToId(replyingToId === comment.id ? null : comment.id);
                          setReplyText('');
                        }}
                        className="hover:text-purple-400 transition-colors flex items-center gap-1"
                      >
                        <CornerDownRight className="w-3 h-3" />
                        Reply
                      </button>
                    )}

                    {/* Translation Dropdown Trigger */}
                    <div className="relative">
                      <button
                        onClick={() =>
                          setActiveTranslateDropdown(activeTranslateDropdown === comment.id ? null : comment.id)
                        }
                        className="hover:text-purple-400 transition-colors flex items-center gap-1"
                      >
                        <Languages className="w-3 h-3 text-purple-400" />
                        Translate
                      </button>

                      {activeTranslateDropdown === comment.id && (
                        <div className="absolute left-0 top-6 glass-dropdown rounded-xl p-2 w-44 max-w-[calc(100vw-2rem)] shadow-2xl z-50 text-[11px]">
                          <p className="px-2 py-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                            Select Language
                          </p>
                          <div className="max-h-48 overflow-y-auto">
                            {LANGUAGE_OPTIONS.map((lang) => (
                              <button
                                key={lang.code}
                                onClick={() => handleTranslate(comment.id, lang.code)}
                                className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-white/10 text-gray-300 hover:text-white transition-colors"
                              >
                                {lang.name}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Original / Translation toggle if translated */}
                    {trans && (
                      <button
                        onClick={() => toggleTranslationView(comment.id)}
                        className="text-purple-400 hover:text-purple-300 font-medium"
                      >
                        {trans.showTranslated ? 'See Original' : 'See Translation'}
                      </button>
                    )}

                    {/* Edit & Delete for comment owner / admin */}
                    {isOwner && (
                      <>
                        <button
                          onClick={() => {
                            setEditingCommentId(comment.id);
                            setEditText(comment.content);
                          }}
                          className="hover:text-gray-200"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteComment(comment.id)}
                          className="hover:text-red-400 text-gray-500"
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </div>

                  {/* Inline Reply Input */}
                  {replyingToId === comment.id && (
                    <div className="mt-3 pl-4 border-l-2 border-purple-500/40 space-y-2">
                      <textarea
                        placeholder={`Replying to @${comment.user.username}...`}
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        rows={2}
                        className="w-full p-2.5 text-xs rounded-xl glass-input resize-none"
                      />
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => handleAddReply(comment.id)}
                          disabled={!replyText.trim() || isSubmitting}
                          className="px-3 py-1 text-xs rounded-lg btn-primary"
                        >
                          Reply
                        </button>
                        <button
                          onClick={() => setReplyingToId(null)}
                          className="px-3 py-1 text-xs rounded-lg btn-secondary"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Nested Replies List */}
                  {comment.replies && comment.replies.length > 0 && (
                    <div className="mt-3 pl-4 border-l-2 border-white/10 space-y-3">
                      {comment.replies.map((reply) => {
                        const replyTrans = translatedMap[reply.id];
                        const isReplyOwner = user?.id === reply.userId;

                        return (
                          <div key={reply.id} className="pt-2 text-xs space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-gray-200">{reply.user.username}</span>
                              {creatorId === reply.userId && (
                                <span className="px-1 py-0.2 rounded text-[8px] font-bold bg-purple-900/60 text-purple-300 border border-purple-500/30">
                                  CREATOR
                                </span>
                              )}
                              <span className="text-[10px] text-gray-500">
                                {new Date(reply.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                              </span>
                            </div>

                            <div className="text-gray-300">
                              {replyTrans?.showTranslated ? (
                                <div className="p-2 rounded bg-purple-950/20 text-purple-100 border border-purple-500/20 text-[11px]">
                                  {replyTrans.text}
                                </div>
                              ) : (
                                <p>{reply.content}</p>
                              )}
                            </div>

                            <div className="flex items-center gap-3 text-[10px] text-gray-500 pt-0.5">
                              <button
                                onClick={() => handleTranslate(reply.id, 'en')}
                                className="hover:text-purple-400"
                              >
                                Translate to EN
                              </button>
                              {replyTrans && (
                                <button
                                  onClick={() => toggleTranslationView(reply.id)}
                                  className="text-purple-400 hover:text-purple-300"
                                >
                                  {replyTrans.showTranslated ? 'Original' : 'Translated'}
                                </button>
                              )}
                              {isReplyOwner && (
                                <button
                                  onClick={() => handleDeleteComment(reply.id)}
                                  className="hover:text-red-400"
                                >
                                  Delete
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
