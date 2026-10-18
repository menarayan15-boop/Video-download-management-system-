import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles,
  Download,
  Play,
  History,
  TrendingUp,
  Compass,
  ArrowRight,
  ChevronRight,
  ChevronLeft,
  Radio,
  Clock,
  RefreshCw,
  Cpu,
  Telescope,
  Leaf,
  Layers,
  Calendar,
  User as UserIcon,
  AlertCircle,
  ExternalLink,
  SlidersHorizontal,
  Trash2,
} from 'lucide-react';
import { Video, Category } from '../types';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { VideoCard, VideoCardSkeleton } from '../components/video/VideoCard';
import { CategoryIcon } from '../components/layout/CategoryIcon';
import { CategoryPreferenceModal } from '../components/video/CategoryPreferenceModal';

interface SectionFeed {
  id: string;
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  viewAllLink: string;
  videos: Video[];
  emptyMessage?: string;
}

export const HomePage: React.FC = () => {
  const { user, quota } = useAuth();

  // State: Featured Video Engine
  const [featuredCandidates, setFeaturedCandidates] = useState<Video[]>([]);
  const [currentFeaturedIndex, setCurrentFeaturedIndex] = useState<number>(0);
  const [isRotating, setIsRotating] = useState<boolean>(true);
  const [isHeroLoading, setIsHeroLoading] = useState<boolean>(true);
  const [heroBgFailed, setHeroBgFailed] = useState<boolean>(false);
  const rotationTimerRef = useRef<any>(null);

  // State: Categories & Sections
  const [categories, setCategories] = useState<Category[]>([]);
  const [trendingVideos, setTrendingVideos] = useState<Video[]>([]);
  const [recentVideos, setRecentVideos] = useState<Video[]>([]);
  const [scienceSpaceVideos, setScienceSpaceVideos] = useState<Video[]>([]);
  const [techAiVideos, setTechAiVideos] = useState<Video[]>([]);
  const [natureLifeVideos, setNatureLifeVideos] = useState<Video[]>([]);
  const [recommendedVideos, setRecommendedVideos] = useState<Video[]>([]);
  const [continueWatching, setContinueWatching] = useState<any[]>([]);
  const [becauseYouWatched, setBecauseYouWatched] = useState<{ sourceVideo: any; videos: Video[] } | null>(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState<boolean>(false);

  // State: Page Loading & Errors
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Active featured video derived atomically
  const activeFeaturedVideo: Video | null =
    featuredCandidates.length > 0 && currentFeaturedIndex < featuredCandidates.length
      ? featuredCandidates[currentFeaturedIndex]
      : null;

  // 1. Fetch Dynamic Featured Candidates & Single Fallback
  const loadFeaturedContent = useCallback(async () => {
    try {
      setIsHeroLoading(true);
      // Fetch diverse candidate set for carousel rotation
      const candidatesRes = await api.getFeaturedVideos(6).catch(() => []);
      const candidates: Video[] = Array.isArray(candidatesRes) ? candidatesRes : [];

      if (candidates.length > 0) {
        setFeaturedCandidates(candidates);
        // Randomly initialize index to avoid showing the exact same first candidate on every visit
        const randomStartIndex = Math.floor(Math.random() * candidates.length);
        setCurrentFeaturedIndex(randomStartIndex);
      } else {
        // Fallback to single featured video endpoint
        const singleRes = await api.getFeaturedVideo().catch(() => null);
        if (singleRes) {
          setFeaturedCandidates([singleRes]);
          setCurrentFeaturedIndex(0);
        }
      }
    } catch (err) {
      console.warn('Featured video load issue:', err);
    } finally {
      setIsHeroLoading(false);
    }
  }, []);

  // 2. Load Homepage Sections Below Hero
  const loadCatalogSections = useCallback(async () => {
    try {
      setIsLoading(true);
      setLoadError(null);

      // Fetch base catalogue and categories
      const [catsRes, trendingRes, recentRes, cwRes, recsRes, bywRes] = await Promise.all([
        api.getCategories().catch(() => []),
        api.getVideos({ sort: 'most_viewed', limit: 8 }).catch(() => ({ videos: [] })),
        api.getVideos({ sort: 'newest', limit: 8 }).catch(() => ({ videos: [] })),
        user ? api.getContinueWatching().catch(() => []) : Promise.resolve([]),
        api.getPersonalizedRecommendations(8).catch(() => []),
        user ? api.getBecauseYouWatched(4).catch(() => null) : Promise.resolve(null),
      ]);

      const validCats: Category[] = Array.isArray(catsRes) ? catsRes : [];
      setCategories(validCats);
      setTrendingVideos(trendingRes?.videos || []);
      setRecentVideos(recentRes?.videos || []);
      setContinueWatching(Array.isArray(cwRes) ? cwRes : []);
      setRecommendedVideos(Array.isArray(recsRes) ? recsRes : []);
      setBecauseYouWatched(bywRes && bywRes.sourceVideo ? bywRes : null);

      // Filter or query category-specific sections
      const [scienceRes, techRes, natureRes] = await Promise.all([
        api.getCategoryVideos('space-astronomy', { limit: 4 }).catch(() => ({ videos: [] })),
        api.getCategoryVideos('technology-ai', { limit: 4 }).catch(() => ({ videos: [] })),
        api.getCategoryVideos('nature-wildlife', { limit: 4 }).catch(() => ({ videos: [] })),
      ]);

      setScienceSpaceVideos(scienceRes?.videos || []);
      setTechAiVideos(techRes?.videos || []);
      setNatureLifeVideos(natureRes?.videos || []);
    } catch (err: any) {
      console.error('Failed to load discovery catalogue:', err);
      setLoadError('Unable to load some catalogue sections. Please check your network connection.');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Handlers for Continue Watching
  const handleRemoveContinueWatching = async (videoId: string) => {
    try {
      await api.removeContinueWatching(videoId);
      setContinueWatching((prev) => prev.filter((item) => item.id !== videoId));
    } catch (err) {
      console.error('Failed to remove continue watching video:', err);
    }
  };

  const handleClearAllContinueWatching = async () => {
    if (!window.confirm('Clear all in-progress videos from Continue Watching?')) return;
    try {
      await api.clearContinueWatching();
      setContinueWatching([]);
    } catch (err) {
      console.error('Failed to clear continue watching:', err);
    }
  };

  // Feedback handler (Not interested, Show fewer, etc.)
  const handleRecommendationFeedback = (videoId: string) => {
    setRecommendedVideos((prev) => prev.filter((v) => v.id !== videoId));
    if (becauseYouWatched) {
      setBecauseYouWatched((prev) =>
        prev ? { ...prev, videos: prev.videos.filter((v) => v.id !== videoId) } : null
      );
    }
  };

  const handleSaveCategoryPreferences = async () => {
    try {
      const freshRecs = await api.getPersonalizedRecommendations(8);
      setRecommendedVideos(Array.isArray(freshRecs) ? freshRecs : []);
    } catch (err) {
      console.error('Failed to refresh recommendations after preference update:', err);
    }
  };

  // Initial Load on mount or refresh
  useEffect(() => {
    loadFeaturedContent();
    loadCatalogSections();
  }, [loadFeaturedContent, loadCatalogSections]);

  // 3. Featured Carousel Auto-Rotation (8 seconds, pauses on hover/interaction)
  useEffect(() => {
    if (!isRotating || featuredCandidates.length <= 1) {
      if (rotationTimerRef.current) clearInterval(rotationTimerRef.current);
      return;
    }

    rotationTimerRef.current = setInterval(() => {
      setCurrentFeaturedIndex((prev) => (prev + 1) % featuredCandidates.length);
    }, 8500);

    return () => {
      if (rotationTimerRef.current) clearInterval(rotationTimerRef.current);
    };
  }, [isRotating, featuredCandidates.length]);

  // Manual Next Featured
  const handleNextFeatured = () => {
    if (featuredCandidates.length <= 1) {
      // Trigger a direct backend rotation fetch with current id exclusion
      api.getFeaturedVideo(activeFeaturedVideo?.id).then((fresh) => {
        if (fresh && fresh.id !== activeFeaturedVideo?.id) {
          setFeaturedCandidates([fresh]);
          setCurrentFeaturedIndex(0);
        }
      });
      return;
    }
    setCurrentFeaturedIndex((prev) => (prev + 1) % featuredCandidates.length);
  };

  // Manual Prev Featured
  const handlePrevFeatured = () => {
    if (featuredCandidates.length <= 1) return;
    setCurrentFeaturedIndex((prev) => (prev - 1 + featuredCandidates.length) % featuredCandidates.length);
  };

  // Format date helper
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return null;
    try {
      return new Date(dateStr).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return null;
    }
  };

  return (
    <div className="space-y-8 sm:space-y-12 pb-20">
      {/* =========================================================================
          1. HERO SECTION: DYNAMIC FEATURED VIDEO ENGINE WITH ROTATION CONTROLS
         ========================================================================= */}
      <section
        className="relative rounded-2xl sm:rounded-3xl overflow-hidden glass-panel border border-white/10 shadow-2xl transition-all duration-700 min-h-[380px] sm:min-h-[460px] flex flex-col justify-between"
        onMouseEnter={() => setIsRotating(false)}
        onMouseLeave={() => setIsRotating(true)}
        aria-label="Featured Highlight Video"
      >
        {/* Background Thumbnail with dark gradient overlay & subtle vignette */}
        {activeFeaturedVideo ? (
          <>
            <img
              key={activeFeaturedVideo.id}
              src={
                heroBgFailed
                  ? 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1600&q=80'
                  : activeFeaturedVideo.thumbnailUrl || 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1600&q=80'
              }
              alt={activeFeaturedVideo.title}
              onError={() => setHeroBgFailed(true)}
              className="absolute inset-0 w-full h-full object-cover object-center opacity-35 filter blur-[1.5px] scale-105 transition-opacity duration-700 pointer-events-none"
            />
            {/* Cinematic Multilayer Gradients for complete contrast and readability */}
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/90 to-slate-950/40 z-10" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-slate-950/30 z-10" />
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-purple-950/50 via-slate-950 to-slate-900 z-10" />
        )}

        {/* Hero Content (Synchronized atomically) */}
        <div className="relative z-20 p-4 sm:p-10 lg:p-14 max-w-4xl space-y-3.5 sm:space-y-5">
          {isHeroLoading && !activeFeaturedVideo ? (
            <div className="space-y-4 animate-pulse">
              <div className="h-6 w-32 sm:w-40 bg-white/10 rounded-full" />
              <div className="h-10 sm:h-12 w-3/4 bg-white/10 rounded-xl" />
              <div className="h-12 sm:h-16 w-full max-w-2xl bg-white/5 rounded-xl" />
              <div className="h-10 sm:h-12 w-36 sm:w-48 bg-purple-600/30 rounded-2xl" />
            </div>
          ) : activeFeaturedVideo ? (
            <>
              {/* Badges: Featured Label + Category + Provider */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 sm:px-3 py-1 rounded-full bg-purple-600/90 text-white text-[10px] sm:text-[11px] font-bold uppercase tracking-wider backdrop-blur-md flex items-center gap-1.5 border border-purple-400/40 shadow-sm">
                  <Radio className="w-3 h-3 sm:w-3.5 sm:h-3.5 animate-pulse text-purple-200" />
                  Featured Spotlight
                </span>

                {activeFeaturedVideo.category && (
                  <Link
                    to={`/category/${activeFeaturedVideo.category.slug}`}
                    className="px-2.5 sm:px-3 py-1 rounded-full bg-white/10 text-gray-200 hover:text-white hover:bg-white/20 text-[10px] sm:text-[11px] font-semibold backdrop-blur-md border border-white/15 transition-colors"
                  >
                    {activeFeaturedVideo.category.name}
                  </Link>
                )}

                {activeFeaturedVideo.subcategory && (
                  <span className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full bg-slate-900/80 text-purple-300 text-[10px] sm:text-[11px] font-medium border border-purple-500/20 backdrop-blur-md">
                    {activeFeaturedVideo.subcategory.name}
                  </span>
                )}

                {activeFeaturedVideo.provider && activeFeaturedVideo.provider !== 'YOUTUBE' && (
                  <span className="px-2 py-0.5 rounded-full bg-slate-900/90 text-cyan-300 text-[10px] font-bold uppercase tracking-wider border border-cyan-500/30 backdrop-blur-md">
                    via {activeFeaturedVideo.provider}
                  </span>
                )}
              </div>

              {/* Dynamic Responsive Title */}
              <h1 className="text-xl sm:text-3xl lg:text-5xl font-extrabold text-white leading-snug sm:leading-tight drop-shadow-lg tracking-tight line-clamp-2 sm:line-clamp-none">
                {activeFeaturedVideo.title}
              </h1>

              {/* Meta row: Creator & Published Date */}
              <div className="flex flex-wrap items-center gap-2.5 sm:gap-4 text-[11px] sm:text-xs text-gray-300">
                {(activeFeaturedVideo.creator?.username || activeFeaturedVideo.creatorName) && (
                  <div className="flex items-center gap-1 font-medium">
                    <UserIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-purple-400" />
                    <span>{activeFeaturedVideo.creator?.username || activeFeaturedVideo.creatorName}</span>
                  </div>
                )}
                {activeFeaturedVideo.publishedAt && (
                  <div className="flex items-center gap-1 text-gray-400">
                    <Calendar className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-purple-400" />
                    <span>Published {formatDate(activeFeaturedVideo.publishedAt)}</span>
                  </div>
                )}
                {activeFeaturedVideo.viewsCount !== undefined && (
                  <span className="text-gray-400">
                    • {Number(activeFeaturedVideo.viewsCount).toLocaleString()} views
                  </span>
                )}
              </div>

              {/* Concise Description clamped to 2-3 lines */}
              <p className="text-xs sm:text-sm text-gray-300 line-clamp-2 sm:line-clamp-3 leading-relaxed drop-shadow max-w-2xl">
                {activeFeaturedVideo.description ||
                  'Discover exceptional verified educational, scientific, and documentary content aggregated from trusted global media repositories.'}
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-3.5 pt-2 sm:pt-3">
                <Link
                  to={`/watch/${activeFeaturedVideo.id}`}
                  className="flex items-center gap-2 px-4 py-2.5 sm:px-6 sm:py-3.5 rounded-xl sm:rounded-2xl btn-primary text-xs sm:text-sm font-bold shadow-lg shadow-purple-600/30 hover:scale-[1.02] active:scale-[0.98] transition-all min-h-[44px]"
                  id="hero-watch-now-btn"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Watch Now</span>
                </Link>

                <Link
                  to="/explore"
                  className="flex items-center gap-2 px-3.5 py-2.5 sm:px-5 sm:py-3.5 rounded-xl sm:rounded-2xl btn-secondary text-xs sm:text-sm font-medium hover:text-white backdrop-blur-md min-h-[44px]"
                >
                  <Layers className="w-4 h-4" />
                  <span>Explore Categories</span>
                </Link>

                {/* Rotation trigger button */}
                <button
                  onClick={handleNextFeatured}
                  className="flex items-center gap-1.5 px-3 py-2.5 sm:px-4 sm:py-3.5 rounded-xl sm:rounded-2xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 text-xs font-semibold backdrop-blur-md transition-all active:scale-95 min-h-[44px]"
                  title="Switch to another featured video"
                  aria-label="Next featured video"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-purple-400" />
                  <span className="hidden sm:inline">Next Featured</span>
                </button>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <h1 className="text-3xl font-extrabold text-white">Watch. Connect. Discover.</h1>
              <p className="text-sm text-gray-400 max-w-lg">
                Explore thousands of verified videos across 26 knowledge domains.
              </p>
              <Link to="/explore" className="btn-primary inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold">
                Browse Catalogue
              </Link>
            </div>
          )}
        </div>

        {/* Hero Bottom Bar: Carousel Indicators & Previous/Next Controls */}
        {featuredCandidates.length > 1 && (
          <div className="relative z-20 px-6 sm:px-10 py-4 bg-slate-950/60 backdrop-blur-md border-t border-white/10 flex flex-wrap items-center justify-between gap-4">
            {/* Carousel Dot Indicators */}
            <div className="flex items-center gap-2" role="tablist" aria-label="Featured Videos">
              {featuredCandidates.map((candidate, idx) => (
                <button
                  key={candidate.id}
                  onClick={() => setCurrentFeaturedIndex(idx)}
                  className={`transition-all duration-300 rounded-full ${
                    idx === currentFeaturedIndex
                      ? 'w-8 h-2.5 bg-purple-500 shadow-sm shadow-purple-500/50'
                      : 'w-2.5 h-2.5 bg-white/20 hover:bg-white/40'
                  }`}
                  aria-label={`Go to slide ${idx + 1}: ${candidate.title}`}
                  role="tab"
                  aria-selected={idx === currentFeaturedIndex}
                />
              ))}
              <span className="text-[11px] text-gray-400 font-mono ml-2">
                {currentFeaturedIndex + 1} / {featuredCandidates.length}
              </span>
            </div>

            {/* Quick Carousel Prev/Next Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevFeatured}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white transition-colors"
                aria-label="Previous Featured Video"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={handleNextFeatured}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white transition-colors"
                aria-label="Next Featured Video"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </section>

      {/* =========================================================================
          2. USER / GUEST ENGAGEMENT WIDGET
         ========================================================================= */}
      {!user ? (
        <section className="glass-panel p-6 sm:p-8 rounded-3xl border border-purple-500/20 bg-gradient-to-r from-purple-950/30 via-slate-950/60 to-slate-900/40 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-600/20 text-purple-300 text-xs font-semibold border border-purple-400/30">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Multi-Source Video Discovery Engine</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-white">Watch. Connect. Discover.</h2>
            <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">
              Explore 20+ specialized knowledge domains with verified videos curated from YouTube, NASA Open Media, and the Internet Archive. Browse freely without an account, or sign up to save videos, join discussions, and unlock daily download quotas.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <Link
              to="/register"
              className="px-5 py-2.5 rounded-xl text-xs font-bold btn-primary shadow-lg shadow-purple-600/30 flex items-center gap-2"
            >
              <span>Get Started Free</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <Link to="/login" className="px-5 py-2.5 rounded-xl text-xs font-semibold btn-secondary hover:text-white">
              Sign In
            </Link>
          </div>
        </section>
      ) : (
        <section className="glass-panel p-5 sm:p-6 rounded-2xl border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full bg-purple-900/40 text-purple-300 text-[10px] font-bold uppercase tracking-wider border border-purple-500/20">
                {user.role} Tier
              </span>
              <span className="text-xs text-gray-400 font-mono">
                {new Date().toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}
              </span>
            </div>
            <h2 className="text-lg font-bold text-white">Welcome back, {user.username}!</h2>
            <p className="text-xs text-gray-400">Discover new videos across 26 specialized topics today.</p>
          </div>

          {quota && (
            <div className="flex items-center gap-4 p-3 rounded-xl bg-white/[0.03] border border-white/5 w-full sm:w-auto">
              <div className="w-10 h-10 rounded-lg bg-purple-600/20 flex items-center justify-center text-purple-400 flex-shrink-0">
                <Download className="w-5 h-5" />
              </div>
              <div className="text-xs space-y-0.5">
                <div className="font-bold text-white uppercase text-[11px]">{quota.planName} PLAN</div>
                <div className="text-gray-300 text-[11px]">
                  Daily Quota: <strong className="text-purple-300">{quota.remaining}</strong> / {quota.downloadLimit} remaining
                </div>
                <Link to="/downloads" className="text-[10px] text-purple-400 hover:underline block font-medium">
                  Manage Quota & Downloads →
                </Link>
              </div>
            </div>
          )}
        </section>
      )}

      {/* Error Retry Alert if any */}
      {loadError && (
        <div className="p-4 rounded-2xl bg-red-950/40 border border-red-500/30 flex items-center justify-between text-xs text-red-200">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400" />
            <span>{loadError}</span>
          </div>
          <button
            onClick={() => {
              loadFeaturedContent();
              loadCatalogSections();
            }}
            className="px-3 py-1 bg-red-900/50 hover:bg-red-800/50 rounded-lg font-semibold text-white transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* =========================================================================
          SECTION G: CONTINUE WATCHING (Feature 2)
         ========================================================================= */}
      {user && continueWatching.length > 0 && (
        <section className="space-y-4" aria-label="Continue Watching">
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <History className="w-4 h-4 text-purple-400" />
                <span>Continue Watching</span>
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-purple-900/40 text-purple-300 text-[11px] font-medium border border-purple-500/20">
                {continueWatching.length} in progress
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleClearAllContinueWatching}
                className="text-xs text-gray-400 hover:text-red-400 flex items-center gap-1 font-medium transition-colors"
                title="Clear all unfinished items"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear All</span>
              </button>
              <Link to="/history" className="text-xs text-purple-400 hover:text-purple-300 font-semibold">
                Full History →
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {continueWatching.slice(0, 8).map((item) => (
              <VideoCard
                key={item.id}
                video={item}
                onRemoveContinueWatching={handleRemoveContinueWatching}
              />
            ))}
          </div>
        </section>
      )}

      {/* =========================================================================
          SECTION A: TRENDING NOW
         ========================================================================= */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-white/5 pb-2">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-purple-400" />
            <span>Trending Now</span>
          </h2>
          <Link to="/explore?sort=views" className="text-xs text-purple-400 hover:text-purple-300 font-semibold">
            View All Trending →
          </Link>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[1, 2, 3, 4].map((i) => (
              <VideoCardSkeleton key={i} />
            ))}
          </div>
        ) : trendingVideos.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {trendingVideos.slice(0, 4).map((video) => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-500 py-6 text-center">No trending videos currently available.</p>
        )}
      </section>

      {/* =========================================================================
          SECTION B: EXPLORE CATEGORIES (Dynamic Cards from Neon DB)
         ========================================================================= */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-white/5 pb-2">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Compass className="w-4 h-4 text-purple-400" />
              <span>Explore Categories</span>
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Specialized knowledge domains discovered from verified academic and global providers.
            </p>
          </div>
          <Link to="/explore" className="text-xs text-purple-400 hover:text-purple-300 font-semibold">
            All Categories →
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {categories.slice(0, 12).map((cat) => (
            <Link
              key={cat.id}
              to={`/category/${cat.slug}`}
              className="glass-card p-3.5 rounded-2xl border border-white/5 hover:border-purple-500/40 hover:bg-white/[0.04] transition-all group flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="w-8 h-8 rounded-xl bg-purple-600/15 group-hover:bg-purple-600/30 text-purple-300 flex items-center justify-center transition-colors border border-purple-500/20">
                  <CategoryIcon name={cat.icon} className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white group-hover:text-purple-300 transition-colors line-clamp-1">
                    {cat.name}
                  </h3>
                  <p className="text-[10px] text-gray-400 line-clamp-1 mt-0.5">
                    {cat.description || 'Verified research & media'}
                  </p>
                </div>
              </div>
              <div className="text-[10px] text-purple-400 pt-2 font-medium flex items-center justify-between">
                <span>Browse</span>
                <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* =========================================================================
          SECTION C: DISCOVER SOMETHING NEW (Recently Imported & Published)
         ========================================================================= */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-white/5 pb-2">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-purple-400" />
              <span>Discover Something New</span>
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Fresh additions imported and published across all active knowledge streams.
            </p>
          </div>
          <Link to="/explore?sort=newest" className="text-xs text-purple-400 hover:text-purple-300 font-semibold">
            View All Recent →
          </Link>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[1, 2, 3, 4].map((i) => (
              <VideoCardSkeleton key={i} />
            ))}
          </div>
        ) : recentVideos.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {recentVideos.slice(0, 4).map((video) => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-500 py-6 text-center">No newly added videos found.</p>
        )}
      </section>

      {/* =========================================================================
          SECTION D: SCIENCE & SPACE
         ========================================================================= */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-white/5 pb-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-600/20 text-cyan-300 flex items-center justify-center border border-cyan-500/30">
              <Telescope className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Science & Space</h2>
              <p className="text-xs text-gray-400">Astrophysics, NASA mission highlights, and cosmology breakthroughs.</p>
            </div>
          </div>
          <Link to="/category/space-astronomy" className="text-xs text-purple-400 hover:text-purple-300 font-semibold">
            View All Space & Science →
          </Link>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[1, 2, 3, 4].map((i) => (
              <VideoCardSkeleton key={i} />
            ))}
          </div>
        ) : scienceSpaceVideos.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {scienceSpaceVideos.map((video) => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-500 py-6 text-center">No space videos currently available.</p>
        )}
      </section>

      {/* =========================================================================
          SECTION E: TECHNOLOGY & FUTURE
         ========================================================================= */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-white/5 pb-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-purple-600/20 text-purple-300 flex items-center justify-center border border-purple-500/30">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Technology & Future</h2>
              <p className="text-xs text-gray-400">Artificial intelligence, robotics, cybersecurity, and engineering.</p>
            </div>
          </div>
          <Link to="/category/technology-ai" className="text-xs text-purple-400 hover:text-purple-300 font-semibold">
            View All Tech & AI →
          </Link>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[1, 2, 3, 4].map((i) => (
              <VideoCardSkeleton key={i} />
            ))}
          </div>
        ) : techAiVideos.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {techAiVideos.map((video) => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-500 py-6 text-center">No technology videos currently available.</p>
        )}
      </section>

      {/* =========================================================================
          SECTION F: NATURE & HUMAN LIFE
         ========================================================================= */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-white/5 pb-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-600/20 text-emerald-300 flex items-center justify-center border border-emerald-500/30">
              <Leaf className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Nature & Human Life</h2>
              <p className="text-xs text-gray-400">Ecosystems, wildlife biodiversity, anatomy, and health sciences.</p>
            </div>
          </div>
          <Link to="/category/nature-wildlife" className="text-xs text-purple-400 hover:text-purple-300 font-semibold">
            View All Nature & Life →
          </Link>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[1, 2, 3, 4].map((i) => (
              <VideoCardSkeleton key={i} />
            ))}
          </div>
        ) : natureLifeVideos.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {natureLifeVideos.map((video) => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-500 py-6 text-center">No wildlife videos currently available.</p>
        )}
      </section>

      {/* =========================================================================
          SECTION H: RECOMMENDED FOR YOU (Feature 1)
         ========================================================================= */}
      {recommendedVideos.length > 0 && (
        <section className="space-y-4" aria-label="Personalized Recommendations">
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span>Recommended for You</span>
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Curated discovery selections tailored to your viewing history and preferred categories.
              </p>
            </div>
            <div className="flex items-center gap-2.5">
              {user && (
                <button
                  onClick={() => setIsCategoryModalOpen(true)}
                  className="px-3 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 text-xs font-semibold border border-purple-500/30 flex items-center gap-1.5 transition-colors"
                  title="Tune preferred categories"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>Tune Interests</span>
                </button>
              )}
              <Link to="/explore" className="text-xs text-purple-400 hover:text-purple-300 font-semibold">
                Browse More →
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {recommendedVideos.map((video) => (
              <VideoCard
                key={video.id}
                video={video}
                onFeedback={handleRecommendationFeedback}
              />
            ))}
          </div>
        </section>
      )}

      {/* =========================================================================
          SECTION I: BECAUSE YOU WATCHED (Feature 1)
         ========================================================================= */}
      {user && becauseYouWatched?.sourceVideo && becauseYouWatched.videos.length > 0 && (
        <section className="space-y-4" aria-label="Because You Watched Recommendations">
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-purple-400" />
                <span>Because You Watched</span>
                <Link
                  to={`/watch/${becauseYouWatched.sourceVideo.id}`}
                  className="text-purple-300 hover:text-purple-200 underline font-semibold max-w-sm truncate inline-block align-bottom"
                >
                  "{becauseYouWatched.sourceVideo.title}"
                </Link>
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Similar verified videos in {becauseYouWatched.sourceVideo.category?.name || 'this knowledge domain'}.
              </p>
            </div>
            <Link
              to={`/watch/${becauseYouWatched.sourceVideo.id}`}
              className="text-xs text-purple-400 hover:text-purple-300 font-semibold"
            >
              Play Original →
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {becauseYouWatched.videos.map((video) => (
              <VideoCard
                key={video.id}
                video={video}
                onFeedback={handleRecommendationFeedback}
              />
            ))}
          </div>
        </section>
      )}

      {/* =========================================================================
          COMPLETE KNOWLEDGE DOMAINS FOOTER NAVIGATION
         ========================================================================= */}
      <section className="space-y-4 pt-6 border-t border-white/10">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Compass className="w-5 h-5 text-purple-400" />
              <span>Full Knowledge Catalog</span>
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Access all 26 verified categories spanning science, history, engineering, and culture.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              to={`/category/${cat.slug}`}
              className="glass-card p-4 rounded-2xl border border-white/5 hover:border-purple-500/40 hover:bg-white/[0.04] transition-all group flex flex-col justify-between"
            >
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-600/10 group-hover:bg-purple-600/25 text-purple-400 flex items-center justify-center flex-shrink-0 transition-colors border border-purple-500/20">
                  <CategoryIcon name={cat.icon} className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-semibold text-white group-hover:text-purple-300 transition-colors line-clamp-1">
                    {cat.name}
                  </h4>
                  <p className="text-[11px] text-gray-400 line-clamp-2 mt-1 leading-snug">
                    {cat.description || 'Explore verified lectures, documentaries, and research breakthroughs.'}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-gray-500 pt-3 border-t border-white/5 mt-3">
                <span>{cat.subcategories?.length || 0} subtopics</span>
                <span className="text-purple-400 group-hover:translate-x-0.5 transition-transform">Explore →</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Category Preference Onboarding / Tuning Modal */}
      <CategoryPreferenceModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        onSaved={handleSaveCategoryPreferences}
      />
    </div>
  );
};
