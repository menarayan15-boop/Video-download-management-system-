import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import {
  Search,
  Filter,
  Compass,
  AlertCircle,
  SlidersHorizontal,
  Sparkles,
  Layers,
  X,
  Clock,
  History,
  Trash2,
  Calendar,
  Globe,
  RotateCcw,
} from 'lucide-react';
import { Video, Category, Subcategory } from '../types';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { VideoCard, VideoCardSkeleton } from '../components/video/VideoCard';
import { CategoryIcon } from '../components/layout/CategoryIcon';

const SUGGESTED_QUERIES = [
  'How does the human brain work?',
  'Latest discoveries about black holes',
  'Artificial intelligence for beginners',
  'Deep ocean animals',
  'How does muscle recovery work?',
  'Recent renewable energy innovations',
];

export const ExplorePage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const { user } = useAuth();
  const isSearchRoute = location.pathname === '/search';

  const query = searchParams.get('q') || '';
  const initialCategory = searchParams.get('category') || '';
  const initialProvider = searchParams.get('provider') || '';
  const initialSort = searchParams.get('sort') || 'newest';
  const initialDuration = searchParams.get('duration') || '';
  const initialDateRange = searchParams.get('dateRange') || '';
  const initialLanguage = searchParams.get('language') || '';

  const [videos, setVideos] = useState<Video[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [selectedSubcategory, setSelectedSubcategory] = useState('');
  const [selectedProvider, setSelectedProvider] = useState(initialProvider);
  const [sortBy, setSortBy] = useState(initialSort);
  const [duration, setDuration] = useState(initialDuration);
  const [dateRange, setDateRange] = useState(initialDateRange);
  const [language, setLanguage] = useState(initialLanguage);

  const [searchTerm, setSearchTerm] = useState(query);
  const [autocompleteSuggestions, setAutocompleteSuggestions] = useState<string[]>([]);
  const [isAutocompleteOpen, setIsAutocompleteOpen] = useState(false);
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
  const [recentSearches, setRecentSearches] = useState<{ id: string; query: string }[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });

  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<any>(null);

  // Auto focus if on /search or requested via navigation
  useEffect(() => {
    if ((isSearchRoute || searchParams.get('focus') === 'search') && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchRoute, searchParams]);

  // Load Categories & Recent Searches
  useEffect(() => {
    api.getCategories().then((cats) => setCategories(cats || []));
    if (user) {
      api.getRecentSearches().then((res) => {
        if (Array.isArray(res)) setRecentSearches(res);
      }).catch(() => {});
    }
  }, [user]);

  // Click outside autocomplete dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsAutocompleteOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced Autocomplete
  useEffect(() => {
    if (!searchTerm.trim() || searchTerm.length < 2) {
      setAutocompleteSuggestions([]);
      return;
    }

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(async () => {
      try {
        const suggestions = await api.getAutocompleteSuggestions(searchTerm.trim());
        setAutocompleteSuggestions(Array.isArray(suggestions) ? suggestions : []);
      } catch (err) {
        setAutocompleteSuggestions([]);
      }
    }, 250);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [searchTerm]);

  // Fetch search results when parameters change
  useEffect(() => {
    fetchVideos(1);
  }, [
    searchParams,
    selectedCategory,
    selectedSubcategory,
    selectedProvider,
    sortBy,
    duration,
    dateRange,
    language,
  ]);

  const fetchVideos = async (page = 1) => {
    setIsLoading(true);
    setSearchError(null);
    try {
      const activeCat = categories.find((c) => c.slug === selectedCategory);

      const res = await api.searchVideos({
        q: searchParams.get('q') || searchTerm || undefined,
        categoryId: activeCat?.id || undefined,
        subcategoryId: selectedSubcategory || undefined,
        provider: selectedProvider || undefined,
        sortBy,
        duration: duration || undefined,
        dateRange: dateRange || undefined,
        language: language || undefined,
        page,
        limit: 16,
      });

      setVideos(res?.videos || []);
      if (res?.pagination) {
        setPagination(res.pagination);
      }
    } catch (err: any) {
      console.error('Explore search error:', err);
      setSearchError('Search failed to load results. Please check network connection and retry.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsAutocompleteOpen(false);

    const term = searchTerm.trim();
    const newParams = new URLSearchParams(searchParams);
    if (term) {
      newParams.set('q', term);
      if (user) {
        api.saveRecentSearch(term).then((saved) => {
          setRecentSearches((prev) => [saved, ...prev.filter((s) => s.query !== term)].slice(0, 8));
        }).catch(() => {});
      }
    } else {
      newParams.delete('q');
    }
    setSearchParams(newParams);
  };

  const handleSelectSuggestion = (sug: string) => {
    setSearchTerm(sug);
    setIsAutocompleteOpen(false);
    const newParams = new URLSearchParams(searchParams);
    newParams.set('q', sug);
    setSearchParams(newParams);
    if (user) {
      api.saveRecentSearch(sug).then((saved) => {
        setRecentSearches((prev) => [saved, ...prev.filter((s) => s.query !== sug)].slice(0, 8));
      }).catch(() => {});
    }
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    setAutocompleteSuggestions([]);
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('q');
    setSearchParams(newParams);
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedCategory('');
    setSelectedSubcategory('');
    setSelectedProvider('');
    setSortBy('newest');
    setDuration('');
    setDateRange('');
    setLanguage('');
    setSearchParams({});
  };

  const handleDeleteRecentSearch = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await api.deleteRecentSearch(id);
      setRecentSearches((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      console.error('Failed to delete recent search:', err);
    }
  };

  const handleClearAllRecentSearches = async () => {
    try {
      await api.clearRecentSearches();
      setRecentSearches([]);
    } catch (err) {
      console.error('Failed to clear recent searches:', err);
    }
  };

  const currentCategoryObj = categories.find((c) => c.slug === selectedCategory);
  const hasActiveFilters = Boolean(
    searchTerm ||
    selectedCategory ||
    selectedSubcategory ||
    selectedProvider ||
    duration ||
    dateRange ||
    language ||
    sortBy !== 'newest'
  );

  return (
    <div className="space-y-8 pb-16" aria-label="Universal Video Discovery and Search">
      {/* Header & Advanced Search Bar */}
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-2">
            {isSearchRoute ? (
              <Search className="w-7 h-7 text-purple-400" />
            ) : (
              <Compass className="w-7 h-7 text-purple-400" />
            )}
            <span>
              {query
                ? `Search: "${query}"`
                : isSearchRoute
                ? 'Search Videos & Knowledge Topics'
                : 'Universal Video Discovery'}
            </span>
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            {isSearchRoute
              ? 'Find verified lectures, research archives, code tutorials, and documentaries.'
              : 'Discover verified lectures, documentaries, science missions, and research across 26 knowledge domains.'}
          </p>
        </div>

        {/* Search input with debounced autocomplete and clear button */}
        <div ref={searchContainerRef} className="relative max-w-2xl">
          <form onSubmit={handleSearchSubmit} className="relative">
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search by title, topic, creator, or keyword..."
              value={searchTerm}
              onFocus={() => setIsAutocompleteOpen(true)}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setIsAutocompleteOpen(true);
              }}
              className="w-full h-12 pl-12 pr-24 rounded-2xl glass-input text-xs sm:text-sm text-white focus:outline-none focus:border-purple-500 shadow-xl"
              aria-label="Search videos"
            />
            <Search className="w-4 h-4 text-purple-400 absolute left-4 top-1/2 -translate-y-1/2" />

            {searchTerm && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-20 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-white"
                title="Clear search"
                aria-label="Clear search input"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5 rounded-xl btn-primary text-xs font-semibold"
            >
              Search
            </button>
          </form>

          {/* Autocomplete Dropdown */}
          {isAutocompleteOpen && (autocompleteSuggestions.length > 0 || recentSearches.length > 0) && (
            <div className="absolute top-14 left-0 right-0 z-50 glass-dropdown rounded-2xl p-3 border border-white/15 shadow-2xl space-y-3">
              {/* Autocomplete Suggestions */}
              {autocompleteSuggestions.length > 0 && (
                <div className="space-y-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-purple-300 px-2 py-0.5">
                    Suggested Searches
                  </div>
                  {autocompleteSuggestions.map((sug, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSelectSuggestion(sug)}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs text-white hover:bg-purple-600/30 flex items-center gap-2 transition-colors"
                    >
                      <Search className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
                      <span className="truncate">{sug}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Recent Searches (for logged in users) */}
              {recentSearches.length > 0 && (
                <div className="space-y-1 pt-1 border-t border-white/10">
                  <div className="flex items-center justify-between px-2 py-0.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1">
                      <History className="w-3 h-3 text-purple-400" />
                      Recent Searches
                    </span>
                    <button
                      onClick={handleClearAllRecentSearches}
                      className="text-[10px] text-gray-500 hover:text-red-400 transition-colors"
                    >
                      Clear
                    </button>
                  </div>
                  {recentSearches.slice(0, 5).map((rs) => (
                    <div
                      key={rs.id}
                      onClick={() => handleSelectSuggestion(rs.query)}
                      className="flex items-center justify-between px-3 py-1.5 rounded-xl text-xs text-gray-300 hover:bg-white/5 hover:text-white cursor-pointer group transition-colors"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Clock className="w-3 h-3 text-gray-500" />
                        <span className="truncate">{rs.query}</span>
                      </div>
                      <button
                        onClick={(e) => handleDeleteRecentSearch(e, rs.id)}
                        className="text-gray-500 hover:text-red-400 p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Delete search"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Suggested Queries Chips */}
        <div className="flex items-center gap-2 flex-wrap pt-1">
          <span className="text-[11px] text-gray-400 font-semibold flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-purple-400" /> Suggestions:
          </span>
          {SUGGESTED_QUERIES.map((sq) => (
            <button
              key={sq}
              onClick={() => handleSelectSuggestion(sq)}
              className="text-[11px] px-2.5 py-1 rounded-full bg-white/[0.04] hover:bg-purple-900/40 text-gray-300 hover:text-purple-200 border border-white/5 hover:border-purple-500/30 transition-colors"
            >
              {sq}
            </button>
          ))}
        </div>

        {/* Removable Active Filter Chips */}
        {hasActiveFilters && (
          <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-white/5">
            <span className="text-[11px] text-gray-400 font-semibold">Active Filters:</span>
            {selectedCategory && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-900/40 text-purple-200 text-[11px] border border-purple-500/30">
                Category: {currentCategoryObj?.name || selectedCategory}
                <button
                  onClick={() => setSelectedCategory('')}
                  aria-label="Remove category filter"
                  className="hover:text-white p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {selectedProvider && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-900/40 text-purple-200 text-[11px] border border-purple-500/30">
                Source: {selectedProvider}
                <button
                  onClick={() => setSelectedProvider('')}
                  aria-label="Remove provider filter"
                  className="hover:text-white p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {duration && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-900/40 text-purple-200 text-[11px] border border-purple-500/30">
                Duration: {duration}
                <button
                  onClick={() => setDuration('')}
                  aria-label="Remove duration filter"
                  className="hover:text-white p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {dateRange && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-900/40 text-purple-200 text-[11px] border border-purple-500/30">
                Date: {dateRange.replace('_', ' ')}
                <button
                  onClick={() => setDateRange('')}
                  aria-label="Remove date range filter"
                  className="hover:text-white p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {language && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-900/40 text-purple-200 text-[11px] border border-purple-500/30">
                Lang: {language.toUpperCase()}
                <button
                  onClick={() => setLanguage('')}
                  aria-label="Remove language filter"
                  className="hover:text-white p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {sortBy !== 'newest' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-900/40 text-purple-200 text-[11px] border border-purple-500/30">
                Sort: {sortBy}
                <button
                  onClick={() => setSortBy('newest')}
                  aria-label="Reset sort order"
                  className="hover:text-white p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            <button
              onClick={handleResetFilters}
              className="text-[11px] text-purple-400 hover:text-purple-300 font-semibold underline ml-1"
            >
              Clear All
            </button>
          </div>
        )}
      </div>

      {/* Filter and Category Pills */}
      <div className="space-y-3">
        {/* Category Pills Bar + Mobile Filter Button */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none" role="tablist" aria-label="Category Filters">
          {/* Mobile Filter Sheet Opener */}
          <button
            onClick={() => setIsMobileFiltersOpen(true)}
            className="flex md:hidden items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-purple-600/20 text-purple-300 border border-purple-500/30 flex-shrink-0"
            aria-label="Open Filter Options Sheet"
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Filters</span>
            {hasActiveFilters && (
              <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
            )}
          </button>

          <button
            onClick={() => {
              setSelectedCategory('');
              setSelectedSubcategory('');
            }}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
              selectedCategory === ''
                ? 'bg-purple-600 text-white shadow-md'
                : 'glass-card text-gray-300 hover:text-white'
            }`}
          >
            All Categories
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                setSelectedCategory(cat.slug);
                setSelectedSubcategory('');
              }}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium transition-all whitespace-nowrap ${
                selectedCategory === cat.slug
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'glass-card text-gray-300 hover:text-white hover:border-purple-500/30'
              }`}
            >
              <CategoryIcon name={cat.icon} className="w-3.5 h-3.5 text-purple-400" />
              <span>{cat.name}</span>
            </button>
          ))}
        </div>

        {/* Subcategories (if a category is active) */}
        {currentCategoryObj?.subcategories && currentCategoryObj.subcategories.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-none">
            <button
              onClick={() => setSelectedSubcategory('')}
              className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition-all whitespace-nowrap ${
                selectedSubcategory === ''
                  ? 'bg-purple-900/60 text-purple-200 border border-purple-500/40'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              All Subtopics
            </button>
            {currentCategoryObj.subcategories.map((sub: Subcategory) => (
              <button
                key={sub.id}
                onClick={() => setSelectedSubcategory(sub.id)}
                className={`px-3 py-1 rounded-lg text-[11px] font-medium transition-all whitespace-nowrap ${
                  selectedSubcategory === sub.id
                    ? 'bg-purple-900/60 text-purple-200 border border-purple-500/40'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                }`}
              >
                {sub.name}
              </button>
            ))}
          </div>
        )}

        {/* Multi-faceted Filter Bar (Desktop only, mobile uses bottom sheet) */}
        <div className="hidden md:flex glass-card p-3.5 rounded-2xl flex-wrap items-center justify-between gap-3 text-xs border border-white/10">
          <div className="flex flex-wrap items-center gap-3">
            {/* Provider Filter */}
            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-purple-400" />
              <select
                value={selectedProvider}
                onChange={(e) => setSelectedProvider(e.target.value)}
                className="bg-slate-900 border border-white/10 rounded-lg px-2.5 py-1 text-white text-xs focus:outline-none focus:border-purple-500"
                aria-label="Provider filter"
              >
                <option value="">All Sources</option>
                <option value="YOUTUBE">YouTube</option>
                <option value="NASA">NASA Open Media</option>
                <option value="ARCHIVE">Internet Archive</option>
                <option value="VYNTRA">Vyntra Original</option>
              </select>
            </div>

            {/* Duration Filter */}
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-purple-400" />
              <select
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="bg-slate-900 border border-white/10 rounded-lg px-2.5 py-1 text-white text-xs focus:outline-none focus:border-purple-500"
                aria-label="Duration filter"
              >
                <option value="">Any Duration</option>
                <option value="short">Short (&lt; 5 mins)</option>
                <option value="medium">Medium (5 - 20 mins)</option>
                <option value="long">Long (&gt; 20 mins)</option>
              </select>
            </div>

            {/* Date Range Filter */}
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-purple-400" />
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="bg-slate-900 border border-white/10 rounded-lg px-2.5 py-1 text-white text-xs focus:outline-none focus:border-purple-500"
                aria-label="Publication date filter"
              >
                <option value="">Any Time</option>
                <option value="today">Past 24 Hours</option>
                <option value="this_week">Past Week</option>
                <option value="this_month">Past Month</option>
                <option value="this_year">Past Year</option>
              </select>
            </div>

            {/* Language Filter */}
            <div className="flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-purple-400" />
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="bg-slate-900 border border-white/10 rounded-lg px-2.5 py-1 text-white text-xs focus:outline-none focus:border-purple-500"
                aria-label="Language filter"
              >
                <option value="">All Languages</option>
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
                <option value="de">German</option>
                <option value="hi">Hindi</option>
                <option value="ja">Japanese</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Sorting */}
            <div className="flex items-center gap-1.5">
              <SlidersHorizontal className="w-3.5 h-3.5 text-purple-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-slate-900 border border-white/10 rounded-lg px-2.5 py-1 text-white text-xs focus:outline-none focus:border-purple-500"
                aria-label="Sort order"
              >
                <option value="relevance">Relevance</option>
                <option value="newest">Recently Published</option>
                <option value="views">Most Viewed</option>
                <option value="shortest">Shortest First</option>
                <option value="longest">Longest First</option>
              </select>
            </div>

            {/* Reset Filters Button */}
            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-colors"
                title="Reset all search filters"
              >
                <RotateCcw className="w-3 h-3 text-purple-400" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile Filters Bottom Sheet */}
        {isMobileFiltersOpen && (
          <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/80 backdrop-blur-sm md:hidden animate-in fade-in duration-200">
            <div
              className="fixed inset-0"
              onClick={() => setIsMobileFiltersOpen(false)}
            />
            <div className="relative z-10 glass-dropdown border-t border-white/15 rounded-t-3xl p-5 max-h-[85vh] overflow-y-auto space-y-4 shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-purple-400" />
                  <h3 className="font-bold text-sm text-white">Filter Videos</h3>
                </div>
                <button
                  onClick={() => setIsMobileFiltersOpen(false)}
                  className="p-1 rounded-lg text-gray-400 hover:text-white"
                  aria-label="Close filters sheet"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Source Filter */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-300">Media Source / Provider</label>
                <select
                  value={selectedProvider}
                  onChange={(e) => setSelectedProvider(e.target.value)}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-purple-500"
                >
                  <option value="">All Sources</option>
                  <option value="YOUTUBE">YouTube</option>
                  <option value="NASA">NASA Open Media</option>
                  <option value="ARCHIVE">Internet Archive</option>
                  <option value="VYNTRA">Vyntra Original</option>
                </select>
              </div>

              {/* Duration Filter */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-300">Video Duration</label>
                <select
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-purple-500"
                >
                  <option value="">Any Duration</option>
                  <option value="short">Short (&lt; 5 mins)</option>
                  <option value="medium">Medium (5 - 20 mins)</option>
                  <option value="long">Long (&gt; 20 mins)</option>
                </select>
              </div>

              {/* Date Filter */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-300">Published Time</label>
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-purple-500"
                >
                  <option value="">Any Time</option>
                  <option value="today">Past 24 Hours</option>
                  <option value="this_week">Past Week</option>
                  <option value="this_month">Past Month</option>
                  <option value="this_year">Past Year</option>
                </select>
              </div>

              {/* Language Filter */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-300">Audio / Subtitle Language</label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-purple-500"
                >
                  <option value="">All Languages</option>
                  <option value="en">English</option>
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                  <option value="de">German</option>
                  <option value="hi">Hindi</option>
                  <option value="ja">Japanese</option>
                </select>
              </div>

              {/* Sort Order */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-300">Sort By</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-purple-500"
                >
                  <option value="relevance">Relevance</option>
                  <option value="newest">Recently Published</option>
                  <option value="views">Most Viewed</option>
                  <option value="shortest">Shortest First</option>
                  <option value="longest">Longest First</option>
                </select>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-3 border-t border-white/10">
                <button
                  onClick={() => {
                    handleResetFilters();
                    setIsMobileFiltersOpen(false);
                  }}
                  className="flex-1 py-2.5 rounded-xl text-xs font-semibold btn-secondary text-gray-300"
                >
                  Reset All
                </button>
                <button
                  onClick={() => setIsMobileFiltersOpen(false)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-semibold btn-primary"
                >
                  Apply Filters
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Video Results Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {Array.from({ length: 8 }).map((_, i) => (
            <VideoCardSkeleton key={i} />
          ))}
        </div>
      ) : searchError ? (
        <div className="glass-card rounded-2xl p-10 text-center max-w-md mx-auto space-y-3">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto" />
          <h2 className="text-lg font-bold text-white">Search Error</h2>
          <p className="text-xs text-red-300">{searchError}</p>
          <button
            onClick={() => fetchVideos(1)}
            className="btn-primary px-4 py-2 rounded-xl text-xs font-semibold mt-2"
          >
            Retry Search
          </button>
        </div>
      ) : videos.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center max-w-md mx-auto space-y-3">
          <AlertCircle className="w-10 h-10 text-purple-400 mx-auto" />
          <h2 className="text-lg font-bold text-white">No results discovered</h2>
          <p className="text-xs text-gray-400">
            No videos matched your filter criteria. Try broadening your keywords or removing filters.
          </p>
          <button
            onClick={handleResetFilters}
            className="px-4 py-2 rounded-xl text-xs font-semibold btn-primary mt-2"
          >
            Clear All Filters
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>Discovered <strong>{pagination.total}</strong> verified videos</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {videos.map((video) => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-6">
              <button
                disabled={pagination.page <= 1}
                onClick={() => fetchVideos(pagination.page - 1)}
                className="px-3.5 py-1.5 rounded-xl glass-card text-xs font-semibold text-gray-300 disabled:opacity-40 hover:bg-white/10 transition-colors"
              >
                Previous
              </button>
              <span className="text-xs text-gray-400 font-medium px-2">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => fetchVideos(pagination.page + 1)}
                className="px-3.5 py-1.5 rounded-xl glass-card text-xs font-semibold text-gray-300 disabled:opacity-40 hover:bg-white/10 transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
