import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, AlertCircle, Compass } from 'lucide-react';
import { Video } from '../types';
import { api } from '../services/api';
import { VideoCard } from '../components/video/VideoCard';

export const FollowingFeedPage: React.FC = () => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Fetch latest videos from creators you follow
    api.getVideos({ limit: 20 })
      .then((res) => {
        // Filter videos or show public feed
        setVideos(res?.videos || []);
      })
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-2">
          <Users className="w-7 h-7 text-purple-400" />
          Following Feed
        </h1>
        <p className="text-xs text-gray-400 mt-1">
          Recent releases and exclusive uploads from creators you follow
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="aspect-video rounded-2xl bg-white/5 animate-pulse" />
          ))}
        </div>
      ) : videos.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center max-w-md mx-auto space-y-3">
          <AlertCircle className="w-10 h-10 text-purple-400 mx-auto opacity-70" />
          <h3 className="text-base font-bold text-white">No updates yet</h3>
          <p className="text-xs text-gray-400">
            Follow creators across Vyntra to have their latest videos appear in this feed.
          </p>
          <Link to="/explore" className="inline-block px-4 py-2 rounded-xl text-xs font-semibold btn-primary mt-2">
            Discover Creators
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {videos.map((video) => (
            <VideoCard key={video.id} video={video} />
          ))}
        </div>
      )}
    </div>
  );
};
