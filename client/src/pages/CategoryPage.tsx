import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Layers,
  ArrowLeft,
  AlertCircle,
  Filter,
  SlidersHorizontal,
  ChevronRight,
  Radio,
} from 'lucide-react';
import { Video, Category, Subcategory } from '../types';
import { api } from '../services/api';
import { VideoCard } from '../components/video/VideoCard';
import { CategoryIcon } from '../components/layout/CategoryIcon';

export const CategoryPage: React.FC = () => {
  const { slug } = useParams<{ slug?: string }>();
  const [categories, setCategories] = useState<Category[]>([]);
  const [currentCategory, setCurrentCategory] = useState<Category | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('');
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('newest');
  const [videos, setVideos] = useState<Video[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load category meta
  useEffect(() => {
    if (slug) {
      api.getCategoryBySlug(slug)
        .then((cat) => {
          setCurrentCategory(cat);
        })
        .catch(() => setCurrentCategory(null));
    }
    api.getCategories().then((cats) => setCategories(cats || []));
  }, [slug]);

  // Load videos when filters change
  useEffect(() => {
    if (!slug) return;
    setIsLoading(true);

    api.getCategoryVideos(slug, {
      subcategory: selectedSubcategory || undefined,
      provider: selectedProvider || undefined,
      sortBy,
      limit: 30,
    })
      .then((res) => {
        setVideos(res?.videos || []);
      })
      .catch(() => setVideos([]))
      .finally(() => setIsLoading(false));
  }, [slug, selectedSubcategory, selectedProvider, sortBy]);

  // All categories overview
  if (!slug) {
    return (
      <div className="space-y-8 pb-12">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-2">
            <Layers className="w-7 h-7 text-purple-400" />
            All 20 Knowledge Categories
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Browse videos categorized by specialized subject matter and verified external providers
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              to={`/category/${cat.slug}`}
              className="glass-card p-6 rounded-2xl flex flex-col justify-between group hover:border-purple-500/50 transition-all space-y-4"
            >
              <div className="space-y-2">
                <div className="w-12 h-12 rounded-xl bg-purple-600/20 text-purple-300 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <CategoryIcon name={cat.icon} className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-white group-hover:text-purple-300 transition-colors">
                  {cat.name}
                </h3>
                <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">
                  {cat.description || 'Discover videos and verified content in this category.'}
                </p>
              </div>

              <div className="pt-2 text-xs font-semibold text-purple-400 flex items-center justify-between border-t border-white/5">
                <span>{cat.subcategories?.length || 0} subcategories</span>
                <span>Browse →</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16">
      {/* Back button & Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-gray-400">
        <Link to="/explore" className="hover:text-white flex items-center gap-1 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Catalog</span>
        </Link>
        <span>/</span>
        <span className="text-purple-300 font-semibold">{currentCategory?.name || slug}</span>
      </div>

      {/* Category Hero Header */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl relative overflow-hidden border border-white/10">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400 flex-shrink-0 shadow-lg">
            <CategoryIcon name={currentCategory?.icon} className="w-8 h-8" />
          </div>

          <div className="space-y-1.5 flex-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-purple-950 text-[10px] font-bold text-purple-300 border border-purple-500/30 uppercase tracking-wider">
                Category Feed
              </span>
              <span className="text-xs text-gray-400">
                {videos.length} videos discovered
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
              {currentCategory?.name || slug}
            </h1>
            <p className="text-xs sm:text-sm text-gray-300 max-w-2xl leading-relaxed">
              {currentCategory?.description || `Explore continuous video discovery and research archives for ${slug}.`}
            </p>
          </div>
        </div>

        {/* Subcategories Pills */}
        {currentCategory?.subcategories && currentCategory.subcategories.length > 0 && (
          <div className="mt-6 pt-5 border-t border-white/10 space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Subtopics:</span>
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              <button
                onClick={() => setSelectedSubcategory('')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                  selectedSubcategory === ''
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                }`}
              >
                All Subtopics
              </button>
              {currentCategory.subcategories.map((sub: Subcategory) => (
                <button
                  key={sub.id}
                  onClick={() => setSelectedSubcategory(sub.slug)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all whitespace-nowrap ${
                    selectedSubcategory === sub.slug
                      ? 'bg-purple-600 text-white shadow-md'
                      : 'bg-white/5 text-gray-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {sub.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Filter and Sort Toolbar */}
      <div className="glass-card p-3 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Source Provider Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-purple-400" />
          <span className="text-gray-400 font-medium">Source:</span>
          <select
            value={selectedProvider}
            onChange={(e) => setSelectedProvider(e.target.value)}
            className="bg-slate-900 border border-white/10 rounded-lg px-2.5 py-1 text-white text-xs focus:outline-none focus:border-purple-500"
          >
            <option value="">All Providers</option>
            <option value="YOUTUBE">YouTube</option>
            <option value="NASA">NASA Space Media</option>
            <option value="ARCHIVE">Internet Archive</option>
            <option value="VYNTRA">Vyntra Original</option>
          </select>
        </div>

        {/* Sort Options */}
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-3.5 h-3.5 text-purple-400" />
          <span className="text-gray-400 font-medium">Sort by:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-slate-900 border border-white/10 rounded-lg px-2.5 py-1 text-white text-xs focus:outline-none focus:border-purple-500"
          >
            <option value="newest">Recently Published</option>
            <option value="views">Most Viewed</option>
            <option value="duration">Longest Duration</option>
          </select>
        </div>
      </div>

      {/* Video Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-video rounded-2xl bg-white/5 animate-pulse" />
          ))}
        </div>
      ) : videos.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center max-w-md mx-auto space-y-3">
          <AlertCircle className="w-10 h-10 text-purple-400 mx-auto" />
          <h2 className="text-lg font-bold text-white">No videos discovered yet</h2>
          <p className="text-xs text-gray-400">
            No videos currently match this filter. The Vyntra content engine discovers new media periodically.
          </p>
          <button
            onClick={() => {
              setSelectedSubcategory('');
              setSelectedProvider('');
            }}
            className="px-4 py-2 rounded-xl text-xs font-semibold btn-primary mt-2"
          >
            Reset Filters
          </button>
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
