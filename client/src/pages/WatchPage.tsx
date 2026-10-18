import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Heart,
  Bookmark,
  Share2,
  Download,
  Eye,
  Calendar,
  Flag,
  UserPlus,
  Check,
  AlertCircle,
  ListPlus,
} from 'lucide-react';
import { Video } from '../types';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { VideoPlayer } from '../components/video/VideoPlayer';
import { CommentSection } from '../components/social/CommentSection';
import { DownloadModal } from '../components/downloads/DownloadModal';
import { VideoCard } from '../components/video/VideoCard';
import { AddToPlaylistModal } from '../components/video/AddToPlaylistModal';
import { ReportVideoModal } from '../components/video/ReportVideoModal';
import { LearningToolsPanel } from '../components/video/LearningToolsPanel';

export const WatchPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [video, setVideo] = useState<Video | null>(null);
  const [userState, setUserState] = useState<{
    isLiked: boolean;
    isSaved: boolean;
    isFollowingCreator: boolean;
    watchProgress: any;
  }>({
    isLiked: false,
    isSaved: false,
    isFollowingCreator: false,
    watchProgress: null,
  });
  const [relatedVideos, setRelatedVideos] = useState<Video[]>([]);
  const [downloadModalOpen, setDownloadModalOpen] = useState(false);
  const [showShareToast, setShowShareToast] = useState(false);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [currentTimeSeconds, setCurrentTimeSeconds] = useState(0);
  const [seekTarget, setSeekTarget] = useState<number | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (id) {
      setIsLoading(true);
      api.getVideoById(id)
        .then((res) => {
          setVideo(res.video);
          setUserState(res.userState);
          setRelatedVideos(res.relatedVideos || []);
        })
        .catch(() => setVideo(null))
        .finally(() => setIsLoading(false));
    }
  }, [id]);

  const handleToggleLike = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (!video) return;
    try {
      const res = await api.toggleLike(video.id);
      setUserState((prev) => ({ ...prev, isLiked: res.liked }));
    } catch (err) {}
  };

  const handleToggleSave = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (!video) return;
    try {
      const res = await api.toggleSave(video.id);
      setUserState((prev) => ({ ...prev, isSaved: res.saved }));
    } catch (err) {}
  };

  const handleToggleFollow = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (!video?.creator) return;
    try {
      const res = await api.toggleFollow(video.creator.id);
      setUserState((prev) => ({ ...prev, isFollowingCreator: res.following }));
    } catch (err) {}
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setShowShareToast(true);
    setTimeout(() => setShowShareToast(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto space-y-4">
        <div className="aspect-video w-full rounded-2xl bg-white/5 animate-pulse" />
        <div className="h-6 w-1/3 bg-white/5 rounded animate-pulse" />
      </div>
    );
  }

  if (!video) {
    return (
      <div className="glass-card rounded-2xl p-12 text-center max-w-md mx-auto space-y-3 mt-12">
        <AlertCircle className="w-10 h-10 text-purple-400 mx-auto" />
        <h2 className="text-lg font-bold text-white">Video not found</h2>
        <p className="text-xs text-gray-400">The video you are looking for does not exist or has been removed.</p>
        <Link to="/explore" className="inline-block px-4 py-2 rounded-xl text-xs font-semibold btn-primary mt-2">
          Explore Other Videos
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Toast Notification */}
      {showShareToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-purple-900/90 text-white text-xs px-4 py-2 rounded-full shadow-2xl border border-purple-500/40">
          Link copied to clipboard!
        </div>
      )}

      {/* Main Layout: Left = Player + Details + Comments, Right = Related */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Player */}
          <VideoPlayer
            video={video}
            initialProgressSeconds={userState.watchProgress?.progressSeconds || 0}
            seekToSeconds={seekTarget}
            onCurrentTimeChange={(t) => setCurrentTimeSeconds(t)}
            onOpenDownload={() => setDownloadModalOpen(true)}
          />

          {/* Video Metadata & Actions */}
          <div className="space-y-4">
            <h1 className="text-xl sm:text-2xl font-bold text-white leading-snug">
              {video.title}
            </h1>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10 text-xs">
              {/* Creator info or External Channel */}
              {video.creator ? (
                <div className="flex items-center justify-between sm:justify-start gap-3 w-full sm:w-auto">
                  <div className="flex items-center gap-3 min-w-0">
                    <Link to={`/creator/${video.creator.id}`} className="flex-shrink-0">
                      <img
                        src={video.creator.avatarUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${video.creator.username}`}
                        alt={video.creator.username}
                        className="w-11 h-11 rounded-full object-cover border border-purple-500/30 hover:border-purple-500 transition-colors"
                      />
                    </Link>
                    <div className="min-w-0">
                      <Link
                        to={`/creator/${video.creator.id}`}
                        className="font-bold text-white hover:text-purple-300 transition-colors block text-sm truncate"
                      >
                        {video.creator.username}
                      </Link>
                      <span className="text-[11px] text-gray-400">
                        {video.creator._count?.followers || 0} followers
                      </span>
                    </div>
                  </div>

                  {user?.id !== video.creator.id && (
                    <button
                      onClick={handleToggleFollow}
                      className={`ml-2 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all min-h-[38px] flex items-center justify-center ${
                        userState.isFollowingCreator
                          ? 'bg-white/10 text-gray-300 hover:bg-white/20'
                          : 'btn-primary'
                      }`}
                    >
                      {userState.isFollowingCreator ? 'Following' : 'Follow'}
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-white/10 border border-white/20 flex items-center justify-center font-bold text-sm text-purple-300 flex-shrink-0">
                    {video.creatorName ? video.creatorName.slice(0, 2).toUpperCase() : 'V'}
                  </div>
                  <div className="min-w-0">
                    <span className="font-bold text-white block text-sm truncate">
                      {video.creatorName || 'Vyntra Discovery'}
                    </span>
                    <span className="text-[11px] text-gray-400">
                      {video.category?.name || 'Curated Content'}
                    </span>
                  </div>
                </div>
              )}

              {/* Action Buttons (Touch friendly & horizontal scroll without page overflow) */}
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar w-full sm:w-auto py-1">
                <button
                  onClick={handleToggleLike}
                  className={`flex items-center gap-1.5 px-3.5 py-2 min-h-[40px] rounded-xl text-xs font-medium transition-all whitespace-nowrap flex-shrink-0 ${
                    userState.isLiked
                      ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                      : 'btn-secondary text-gray-300 hover:text-white'
                  }`}
                >
                  <Heart className={`w-4 h-4 ${userState.isLiked ? 'fill-current' : ''}`} />
                  <span>{userState.isLiked ? 'Liked' : 'Like'}</span>
                </button>

                <button
                  onClick={handleToggleSave}
                  className={`flex items-center gap-1.5 px-3.5 py-2 min-h-[40px] rounded-xl text-xs font-medium transition-all whitespace-nowrap flex-shrink-0 ${
                    userState.isSaved
                      ? 'bg-purple-600/30 text-purple-300 border border-purple-500/40'
                      : 'btn-secondary text-gray-300 hover:text-white'
                  }`}
                  title="Save to Watch Later"
                >
                  <Bookmark className={`w-4 h-4 ${userState.isSaved ? 'fill-current' : ''}`} />
                  <span>{userState.isSaved ? 'Saved' : 'Watch Later'}</span>
                </button>

                <button
                  onClick={() => {
                    if (!user) {
                      navigate('/login');
                      return;
                    }
                    setShowPlaylistModal(true);
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2 min-h-[40px] rounded-xl text-xs font-medium btn-secondary text-gray-300 hover:text-white whitespace-nowrap flex-shrink-0"
                  title="Add to Playlist"
                >
                  <ListPlus className="w-4 h-4" />
                  <span>Playlist</span>
                </button>

                {video.downloadAllowed && (
                  <button
                    onClick={() => setDownloadModalOpen(true)}
                    className="flex items-center gap-1.5 px-3.5 py-2 min-h-[40px] rounded-xl text-xs font-semibold btn-primary whitespace-nowrap flex-shrink-0"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download</span>
                  </button>
                )}

                <button
                  onClick={handleShare}
                  className="p-2 min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl btn-secondary text-gray-300 hover:text-white flex-shrink-0"
                  title="Share Video"
                  aria-label="Share video"
                >
                  <Share2 className="w-4 h-4" />
                </button>

                <button
                  onClick={() => {
                    if (!user) {
                      navigate('/login');
                      return;
                    }
                    setShowReportModal(true);
                  }}
                  className="p-2 min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl btn-secondary text-gray-500 hover:text-red-400 flex-shrink-0"
                  title="Report Video"
                  aria-label="Report video"
                >
                  <Flag className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Description Box */}
            <div className="glass-card p-4 rounded-2xl space-y-2 text-xs">
              <div className="flex items-center gap-4 text-gray-400 font-medium">
                <span className="flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5 text-purple-400" />
                  {video.viewsCount.toLocaleString()} views
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-purple-400" />
                  {new Date(video.publishedAt).toLocaleDateString([], {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
                {video.category && (
                  <span className="px-2 py-0.5 rounded-full bg-purple-950/50 text-purple-300 font-semibold border border-purple-500/20">
                    {video.category.name}
                  </span>
                )}
                {video.subcategory && (
                  <span className="px-2 py-0.5 rounded-full bg-blue-950/40 text-cyan-300 font-medium border border-cyan-500/20">
                    {video.subcategory.name}
                  </span>
                )}
              </div>

              <p className="text-gray-300 whitespace-pre-line leading-relaxed pt-1">
                {video.description || 'No description provided by creator.'}
              </p>

              {/* Source Attribution & License Info */}
              {video.attributionText && (
                <div className="mt-3 p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1 text-[11px] text-gray-400">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-gray-300">Licensing & Rights:</span>
                    <span className="text-purple-300">{video.licenseName || video.rightsStatus || 'Authorized Embedding'}</span>
                  </div>
                  <p className="text-gray-400">{video.attributionText}</p>
                </div>
              )}
            </div>

            {/* Feature 5: Smart Learning Tools Panel */}
            <LearningToolsPanel
              video={video}
              currentTimeSeconds={currentTimeSeconds}
              onSeek={(targetSecs) => setSeekTarget(targetSecs)}
            />
          </div>

          {/* Comments Section */}
          <div className="glass-panel p-6 rounded-2xl border border-white/10">
            <CommentSection videoId={video.id} creatorId={video.creatorId} />
          </div>
        </div>

        {/* Right: Related Videos Column */}
        <div className="space-y-4">
          <h3 className="text-base font-bold text-white">Related Videos</h3>
          <div className="space-y-4">
            {relatedVideos.map((rel) => (
              <VideoCard key={rel.id} video={rel} />
            ))}
          </div>
        </div>
      </div>

      {/* Download Modal */}
      {downloadModalOpen && (
        <DownloadModal video={video} onClose={() => setDownloadModalOpen(false)} />
      )}

      {/* Feature 4: Add To Playlist Modal */}
      <AddToPlaylistModal
        isOpen={showPlaylistModal}
        onClose={() => setShowPlaylistModal(false)}
        videoId={video.id}
      />

      {/* Feature 12: Content Reporting Modal */}
      <ReportVideoModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        videoId={video.id}
        videoTitle={video.title}
      />
    </div>
  );
};
