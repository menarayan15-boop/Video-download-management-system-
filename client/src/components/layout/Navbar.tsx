import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search,
  Bell,
  Upload,
  User as UserIcon,
  Download,
  Shield,
  CreditCard,
  Settings,
  LogOut,
  ChevronDown,
  Sparkles,
  Menu,
  Compass,
  ListPlus,
  Clock,
  X,
  Languages,
  Eye,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { usePreferences } from '../../context/PreferencesContext';
import { api } from '../../services/api';
import { NotificationItem, SearchHistoryItem } from '../../types';

interface NavbarProps {
  onToggleSidebar?: () => void;
  onOpenUpload?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar, onOpenUpload }) => {
  const { user, quota, isCreator, isAdmin, logout } = useAuth();
  const { preferences, updatePreferences, currentLang, setLanguage } = usePreferences();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [recentSearches, setRecentSearches] = useState<SearchHistoryItem[]>([]);

  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const userMenuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const langRef = useRef<HTMLDivElement>(null);

  // Load notifications and unread count
  useEffect(() => {
    if (user) {
      api.getNotifications()
        .then((res) => {
          setNotifications(res.notifications || []);
          setUnreadCount(res.unreadCount || 0);
        })
        .catch(() => {});

      api.getRecentSearches()
        .then((res) => setRecentSearches(res || []))
        .catch(() => {});
    }
  }, [user]);

  // Debounced autocomplete suggestions
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(() => {
      api.getAutocompleteSuggestions(searchQuery.trim())
        .then((res) => setSuggestions(res || []))
        .catch(() => setSuggestions([]));
    }, 200);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Click outside to close menus
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearchDropdown(false);
      }
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setShowLangMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      const q = searchQuery.trim();
      if (user) {
        api.saveRecentSearch(q).then(() => {
          api.getRecentSearches().then((res) => setRecentSearches(res || []));
        }).catch(() => {});
      }
      setShowSearchDropdown(false);
      navigate(`/search?q=${encodeURIComponent(q)}`);
    }
  };

  const handleSelectSuggestion = (text: string) => {
    setSearchQuery(text);
    if (user) {
      api.saveRecentSearch(text).catch(() => {});
    }
    setShowSearchDropdown(false);
    navigate(`/search?q=${encodeURIComponent(text)}`);
  };

  const handleDeleteRecentSearch = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await api.deleteRecentSearch(id);
      setRecentSearches((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {}
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllAsRead();
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (e) {}
  };

  const LANGUAGES = [
    { code: 'en', label: 'English (US)' },
    { code: 'hi', label: 'हिन्दी (Hindi)' },
    { code: 'es', label: 'Español (Spanish)' },
    { code: 'fr', label: 'Français (French)' },
    { code: 'de', label: 'Deutsch (German)' },
    { code: 'ja', label: '日本語 (Japanese)' },
  ];

  return (
    <header className="sticky top-0 z-40 w-full h-16 border-b border-white/10 bg-[#0B0F19]/80 backdrop-blur-md px-4 lg:px-6 flex items-center justify-between gap-4">
      {/* Left: Mobile menu button + Brand Logo */}
      <div className="flex items-center gap-3">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 lg:hidden"
            aria-label="Toggle Navigation Menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <Link to={user ? '/home' : '/'} className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#7C3AED] to-[#8B5CF6] flex items-center justify-center shadow-lg shadow-purple-600/30 group-hover:scale-105 transition-transform duration-200">
            <svg className="w-5 h-5 text-white fill-current ml-0.5" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
          <div>
            <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-white via-gray-100 to-purple-300 bg-clip-text text-transparent">
              Vyntra
            </span>
          </div>
        </Link>
      </div>

      {/* Middle: Global Search with Autocomplete & Recent History */}
      <div className="flex-1 max-w-xl mx-2 hidden sm:block relative" ref={searchRef}>
        <form onSubmit={handleSearchSubmit} className="relative">
          <input
            type="text"
            placeholder="Search videos, creators, technologies..."
            value={searchQuery}
            onFocus={() => setShowSearchDropdown(true)}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-10 pr-9 text-sm rounded-full glass-input placeholder-gray-400 focus:outline-none transition-all"
            aria-label="Search Vyntra platform"
          />
          <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-gray-400" />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSuggestions([]);
              }}
              className="absolute right-3.5 top-2.5 text-gray-400 hover:text-white"
              aria-label="Clear search query"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </form>

        {/* Search Autocomplete & Recent History Dropdown */}
        {showSearchDropdown && (
          <div className="glass-dropdown absolute left-0 right-0 mt-2 rounded-2xl p-3 shadow-2xl z-50 text-xs border border-white/10 animate-in fade-in duration-150">
            {/* Live Autocomplete Suggestions */}
            {suggestions.length > 0 && (
              <div className="mb-3">
                <p className="text-[11px] font-semibold text-purple-400 uppercase tracking-wider px-2 mb-1 flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3" />
                  <span>Suggestions</span>
                </p>
                <div className="space-y-0.5">
                  {suggestions.map((s, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSelectSuggestion(s)}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg text-gray-200 hover:bg-white/10 hover:text-white flex items-center gap-2 transition-colors truncate"
                    >
                      <Search className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                      <span className="truncate">{s}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Searches */}
            {recentSearches.length > 0 && (
              <div>
                <div className="flex items-center justify-between px-2 mb-1">
                  <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-3 h-3" />
                    <span>Recent Searches</span>
                  </p>
                  <button
                    onClick={async () => {
                      await api.clearRecentSearches();
                      setRecentSearches([]);
                    }}
                    className="text-[10px] text-gray-500 hover:text-purple-300"
                  >
                    Clear all
                  </button>
                </div>
                <div className="space-y-0.5">
                  {recentSearches.slice(0, 5).map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleSelectSuggestion(item.query)}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg text-gray-300 hover:bg-white/10 hover:text-white flex items-center justify-between cursor-pointer group transition-colors"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Clock className="w-3 h-3 text-gray-500 flex-shrink-0" />
                        <span className="truncate">{item.query}</span>
                      </div>
                      <button
                        onClick={(e) => handleDeleteRecentSearch(e, item.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-gray-500 hover:text-red-400 transition-opacity"
                        aria-label={`Remove ${item.query} from history`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {suggestions.length === 0 && recentSearches.length === 0 && (
              <div className="py-4 text-center text-gray-400 text-xs">
                Type to see matching topics, creators, and videos.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-1.5 sm:gap-3">
        {/* Mobile Quick Search Button */}
        <button
          onClick={() => navigate('/explore?focus=search')}
          className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors sm:hidden touch-target"
          aria-label="Search Vyntra"
          title="Search"
        >
          <Search className="w-5 h-5" />
        </button>

        {/* Language Selector Popover */}
        <div className="relative" ref={langRef}>
          <button
            onClick={() => setShowLangMenu(!showLangMenu)}
            className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors flex items-center gap-1"
            title="Language Preferences"
            aria-label="Select Language"
          >
            <Languages className="w-4 h-4" />
            <span className="text-[11px] uppercase font-bold text-gray-300 hidden sm:inline">
              {currentLang}
            </span>
          </button>

          {showLangMenu && (
            <div className="glass-dropdown absolute right-0 mt-2 w-[calc(100vw-2rem)] max-w-[200px] rounded-2xl p-2 shadow-2xl z-50 text-xs border border-white/10">
              <p className="px-2 py-1 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                Interface Language
              </p>
              <div className="space-y-0.5 mt-1">
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => {
                      setLanguage(lang.code);
                      setShowLangMenu(false);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between transition-colors ${
                      currentLang === lang.code
                        ? 'bg-purple-600/30 text-purple-300 font-bold'
                        : 'text-gray-300 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <span>{lang.label}</span>
                    {currentLang === lang.code && <span>✓</span>}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {user ? (
          <>
            {/* Live Quota Pill */}
            {quota && (
              <Link
                to="/downloads"
                className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-950/40 border border-purple-500/30 hover:border-purple-500/60 text-xs font-medium text-purple-200 transition-all hover:bg-purple-900/30"
                title={`Daily quota resets at ${new Date(quota.resetTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
              >
                <Download className="w-3.5 h-3.5 text-purple-400" />
                <span>
                  Quota: <strong className="text-white">{quota.remaining}</strong>/{quota.downloadLimit}
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              </Link>
            )}

            {/* Creator Upload Action */}
            {isCreator && onOpenUpload && (
              <button
                onClick={onOpenUpload}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold btn-primary"
                aria-label="Upload Video"
              >
                <Upload className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Upload</span>
              </button>
            )}

            {/* Notifications Menu */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
                aria-label="Notifications Center"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-4 h-4 text-[10px] font-bold text-white bg-purple-600 rounded-full flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="glass-dropdown absolute right-0 mt-2 w-[calc(100vw-1.5rem)] max-w-sm sm:w-96 rounded-2xl p-4 shadow-2xl z-50 border border-white/10 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between pb-3 border-b border-white/10">
                    <h3 className="font-semibold text-sm text-white">Notifications</h3>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        className="text-xs text-purple-400 hover:text-purple-300 font-medium"
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto divide-y divide-white/5 mt-2">
                    {notifications.length === 0 ? (
                      <div className="py-8 text-center text-xs text-gray-400">
                        No notifications yet.
                      </div>
                    ) : (
                      notifications.slice(0, 8).map((n) => (
                        <div
                          key={n.id}
                          className={`py-2.5 px-2 rounded-lg text-xs transition-colors ${
                            !n.read ? 'bg-purple-950/20' : 'hover:bg-white/5'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-semibold text-gray-200">{n.title}</span>
                            <span className="text-[10px] text-gray-500">
                              {new Date(n.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-gray-400 line-clamp-2">{n.message}</p>
                          {n.link && (
                            <Link
                              to={n.link}
                              onClick={() => setShowNotifications(false)}
                              className="text-[11px] text-purple-400 hover:underline mt-1 inline-block"
                            >
                              View details →
                            </Link>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                  <div className="pt-2 border-t border-white/10 text-center">
                    <Link
                      to="/notifications"
                      onClick={() => setShowNotifications(false)}
                      className="text-xs text-purple-400 hover:text-purple-300 font-medium"
                    >
                      View all notifications
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* User Profile Avatar Dropdown */}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 p-1 pl-1.5 rounded-full hover:bg-white/5 transition-all"
                aria-label="User account menu"
              >
                <img
                  src={user.avatarUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${user.username}`}
                  alt={user.username}
                  className="w-8 h-8 rounded-full object-cover border border-purple-500/30"
                />
                <ChevronDown className="w-3.5 h-3.5 text-gray-400 hidden sm:block" />
              </button>

              {showUserMenu && (
                <div className="glass-dropdown absolute right-0 mt-2 w-[calc(100vw-2rem)] max-w-[240px] rounded-2xl p-2 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150 border border-white/10">
                  <div className="px-3 py-2.5 border-b border-white/10">
                    <p className="font-semibold text-sm text-white truncate">{user.username}</p>
                    <p className="text-xs text-gray-400 truncate">{user.email}</p>
                    <span className="inline-block mt-1 px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded-full bg-purple-900/50 text-purple-300 border border-purple-500/20">
                      {user.role}
                    </span>
                  </div>

                  <div className="py-1">
                    <Link
                      to="/profile"
                      onClick={() => setShowUserMenu(false)}
                      className="flex items-center gap-2.5 px-3 py-2 text-xs text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                    >
                      <UserIcon className="w-4 h-4 text-gray-400" />
                      Library & Profile
                    </Link>
                    <Link
                      to="/playlists"
                      onClick={() => setShowUserMenu(false)}
                      className="flex items-center gap-2.5 px-3 py-2 text-xs text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                    >
                      <ListPlus className="w-4 h-4 text-purple-400" />
                      Custom Playlists
                    </Link>
                    <Link
                      to="/saved"
                      onClick={() => setShowUserMenu(false)}
                      className="flex items-center gap-2.5 px-3 py-2 text-xs text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                    >
                      <UserIcon className="w-4 h-4 text-gray-400" />
                      Watch Later
                    </Link>
                    <Link
                      to="/downloads"
                      onClick={() => setShowUserMenu(false)}
                      className="flex items-center gap-2.5 px-3 py-2 text-xs text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                    >
                      <Download className="w-4 h-4 text-gray-400" />
                      Downloads & Quota
                    </Link>
                    <Link
                      to="/subscriptions"
                      onClick={() => setShowUserMenu(false)}
                      className="flex items-center gap-2.5 px-3 py-2 text-xs text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                    >
                      <CreditCard className="w-4 h-4 text-gray-400" />
                      Subscription Plans
                    </Link>
                    <Link
                      to="/settings"
                      onClick={() => setShowUserMenu(false)}
                      className="flex items-center gap-2.5 px-3 py-2 text-xs text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                    >
                      <Settings className="w-4 h-4 text-gray-400" />
                      Settings & Preferences
                    </Link>

                    {isAdmin && (
                      <>
                        <Link
                          to="/admin"
                          onClick={() => setShowUserMenu(false)}
                          className="flex items-center gap-2.5 px-3 py-2 text-xs text-amber-300 hover:bg-amber-950/20 rounded-lg transition-colors font-medium"
                        >
                          <Sparkles className="w-4 h-4 text-amber-400" />
                          Admin Dashboard
                        </Link>
                        <Link
                          to="/admin/discovery"
                          onClick={() => setShowUserMenu(false)}
                          className="flex items-center gap-2.5 px-3 py-2 text-xs text-purple-300 hover:bg-purple-950/20 rounded-lg transition-colors font-medium"
                        >
                          <Compass className="w-4 h-4 text-purple-400" />
                          Discovery Engine
                        </Link>
                      </>
                    )}
                  </div>

                  <div className="pt-1 border-t border-white/10">
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        logout();
                        navigate('/');
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-red-400 hover:bg-red-950/20 rounded-lg transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex items-center gap-2">
            <Link
              to="/explore"
              className="text-xs font-medium text-gray-300 hover:text-white px-3 py-2 hidden sm:inline"
            >
              Explore
            </Link>
            <Link
              to="/pricing"
              className="text-xs font-medium text-gray-300 hover:text-white px-3 py-2 hidden sm:inline"
            >
              Plans
            </Link>
            <Link
              to="/login"
              className="text-xs font-medium text-gray-200 hover:text-white px-3.5 py-1.5 rounded-lg btn-secondary"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className="text-xs font-semibold px-4 py-1.5 rounded-lg btn-primary"
            >
              Sign Up
            </Link>
          </div>
        )}
      </div>
    </header>
  );
};
