import React, { useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Home,
  Compass,
  Layers,
  Users,
  Bookmark,
  History,
  Download,
  Bell,
  CreditCard,
  User,
  Settings,
  ShieldAlert,
  Sparkles,
  ListPlus,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user, quota, isAdmin } = useAuth();
  const location = useLocation();

  // Escape key to close mobile drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && onClose) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      // Lock background scroll when mobile drawer is open
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  const mainNav = [
    { name: 'Home', path: '/home', icon: Home },
    { name: 'Explore', path: '/explore', icon: Compass },
    { name: 'Categories', path: '/categories', icon: Layers },
    ...(user
      ? [
          { name: 'Following', path: '/following', icon: Users },
          { name: 'Library', path: '/library', icon: Bookmark },
          { name: 'Playlists', path: '/playlists', icon: ListPlus },
          { name: 'Watch History', path: '/history', icon: History },
          {
            name: 'Downloads',
            path: '/downloads',
            icon: Download,
            badge: quota ? `${quota.remaining}` : undefined,
          },
          { name: 'Notifications', path: '/notifications', icon: Bell },
          { name: 'Subscriptions', path: '/subscriptions', icon: CreditCard },
          { name: 'Profile', path: '/profile', icon: User },
          { name: 'Settings', path: '/settings', icon: Settings },
        ]
      : [
          { name: 'Library', path: '/library', icon: Bookmark },
          { name: 'Profile', path: '/profile', icon: User },
          { name: 'Subscriptions', path: '/pricing', icon: CreditCard },
        ]),
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden transition-opacity"
          aria-label="Close navigation menu backdrop"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed lg:sticky top-0 lg:top-16 left-0 z-50 lg:z-40 h-full lg:h-[calc(100vh-4rem)] w-72 lg:w-64 bg-[#0B0F19] lg:bg-transparent border-r border-white/10 flex flex-col justify-between p-4 shadow-2xl lg:shadow-none transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
        aria-label="Sidebar Navigation"
      >
        <div className="overflow-y-auto space-y-5">
          {/* Mobile Drawer Header with Close Button */}
          <div className="flex items-center justify-between pb-3 border-b border-white/10 lg:hidden pt-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#7C3AED] to-[#8B5CF6] flex items-center justify-center">
                <svg className="w-4 h-4 text-white fill-current ml-0.5" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
              <span className="font-extrabold text-base tracking-tight text-white">Vyntra</span>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors touch-target"
              aria-label="Close Navigation Drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Main Navigation */}
          <div className="space-y-1">
            <p className="px-3 text-[11px] font-semibold tracking-wider uppercase text-gray-500 mb-2">
              Menu
            </p>
            {mainNav.map((item) => {
              const isHomeActive = item.path === '/home' && (location.pathname === '/' || location.pathname === '/home');
              const isLibraryActive = item.path === '/library' && (location.pathname === '/library' || location.pathname === '/saved');
              return (
                <NavLink
                  key={item.name}
                  to={item.path}
                  end={item.path === '/home' || item.path === '/explore' || item.path === '/categories'}
                  onClick={onClose}
                  className={({ isActive }) => {
                    const active = isActive || isHomeActive || isLibraryActive;
                    return `flex items-center justify-between px-3.5 py-2.5 min-h-[44px] rounded-xl text-xs font-medium transition-all group ${
                      active
                        ? 'bg-purple-600/15 text-purple-300 border border-purple-500/20 font-semibold shadow-sm'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`;
                  }}
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="w-4 h-4 transition-transform group-hover:scale-110" />
                    <span>{item.name}</span>
                  </div>
                  {item.badge !== undefined && (
                    <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-purple-600 text-white">
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </div>

          {/* Admin Section (Conditional) */}
          {isAdmin && (
            <div className="pt-4 border-t border-white/5 space-y-1">
              <p className="px-3 text-[11px] font-semibold tracking-wider uppercase text-amber-500/80 mb-2 flex items-center gap-1.5">
                <Sparkles className="w-3 h-3" />
                Administration
              </p>
              <NavLink
                to="/admin"
                end
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-amber-500/15 text-amber-300 border border-amber-500/20'
                      : 'text-gray-400 hover:text-amber-200 hover:bg-white/5'
                  }`
                }
              >
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                <span>Admin Dashboard</span>
              </NavLink>
              <NavLink
                to="/admin/discovery"
                end
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30'
                      : 'text-gray-400 hover:text-purple-200 hover:bg-white/5'
                  }`
                }
              >
                <Compass className="w-4 h-4 text-purple-400" />
                <span>Discovery Engine</span>
              </NavLink>
            </div>
          )}
        </div>

        {/* Sidebar Footer Info */}
        <div className="pt-4 border-t border-white/5">
          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 text-[11px] text-gray-400">
            <p className="font-semibold text-gray-300">Vyntra v1.0</p>
            <p className="text-[10px] text-gray-500 mt-0.5">Watch. Connect. Discover.</p>
          </div>
        </div>
      </aside>
    </>
  );
};
