import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Users, Film, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import { User, Video } from '../types';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { VideoCard } from '../components/video/VideoCard';

export const CreatorProfilePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [creator, setCreator] = useState<User | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (id) {
      setIsLoading(true);
      api.getCreatorProfile(id)
        .then((res) => {
          setCreator(res.creator);
          setVideos(res.videos || []);
          setIsFollowing(res.isFollowing);
          setFollowerCount(res.creator?._count?.followers || 0);
        })
        .catch(() => setCreator(null))
        .finally(() => setIsLoading(false));
    }
  }, [id]);

  const handleToggleFollow = async () => {
    if (!user || !creator) return;
    try {
      const res = await api.toggleFollow(creator.id);
      setIsFollowing(res.following);
      setFollowerCount((prev) => (res.following ? prev + 1 : Math.max(0, prev - 1)));
    } catch (err) {}
  };

  if (isLoading) {
    return <div className="p-8 text-center text-xs text-gray-400">Loading creator profile...</div>;
  }

  if (!creator) {
    return (
      <div className="glass-card rounded-2xl p-12 text-center max-w-md mx-auto space-y-3 mt-12">
        <AlertCircle className="w-10 h-10 text-purple-400 mx-auto" />
        <h2 className="text-lg font-bold text-white">Creator not found</h2>
        <Link to="/explore" className="inline-block px-4 py-2 rounded-xl text-xs font-semibold btn-primary mt-2">
          Discover Creators
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      <Link to="/explore" className="text-xs text-gray-400 hover:text-white flex items-center gap-1">
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back</span>
      </Link>

      {/* Creator Header Card */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl relative overflow-hidden border border-white/10">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          <img
            src={creator.avatarUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${creator.username}`}
            alt={creator.username}
            className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover border-2 border-purple-500/40 shadow-xl"
          />

          <div className="flex-1 text-center sm:text-left space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold text-white flex items-center justify-center sm:justify-start gap-2">
                  {creator.username}
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-900/50 text-purple-300 border border-purple-500/30">
                    {creator.role}
                  </span>
                </h1>
                <p className="text-xs text-gray-400 mt-0.5">Joined Vyntra in {new Date(creator.createdAt).getFullYear()}</p>
              </div>

              {user?.id !== creator.id && (
                <button
                  onClick={handleToggleFollow}
                  className={`px-5 py-2 rounded-xl text-xs font-semibold transition-all ${
                    isFollowing
                      ? 'bg-white/10 text-gray-300 hover:bg-white/20'
                      : 'btn-primary'
                  }`}
                >
                  {isFollowing ? 'Following' : 'Follow Creator'}
                </button>
              )}
            </div>

            <p className="text-xs text-gray-300 max-w-2xl leading-relaxed">
              {creator.biography || 'Creator on Vyntra sharing original cinematic and technical videos.'}
            </p>

            {/* Stats Pills */}
            <div className="flex items-center justify-center sm:justify-start gap-6 text-xs text-gray-400 pt-1">
              <span className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-purple-400" />
                <strong className="text-white">{followerCount}</strong> followers
              </span>
              <span className="flex items-center gap-1.5">
                <Film className="w-4 h-4 text-purple-400" />
                <strong className="text-white">{videos.length}</strong> videos
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Creator Videos */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-white">Videos by {creator.username}</h2>
        {videos.length === 0 ? (
          <div className="p-8 rounded-2xl glass-card text-center text-xs text-gray-400">
            This creator has not published any public videos yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {videos.map((video) => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
