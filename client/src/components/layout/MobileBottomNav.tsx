import React from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { Home, Compass, Search, Bookmark, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const MobileBottomNav: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const pathname = location.pathname;
  const isSearchFocus = searchParams.get('focus') === 'search';

  // Strictly mutually exclusive active tab detection
  let activeTab: 'home' | 'explore' | 'search' | 'library' | 'profile' | null = null;

  if (pathname === '/search' || (pathname === '/explore' && isSearchFocus)) {
    activeTab = 'search';
  } else if (
    pathname === '/explore' ||
    pathname === '/categories' ||
    pathname.startsWith('/category/')
  ) {
    activeTab = 'explore';
  } else if (
    pathname === '/library' ||
    pathname === '/saved' ||
    pathname.startsWith('/playlists') ||
    pathname.startsWith('/playlist/') ||
    pathname === '/history' ||
    pathname === '/downloads'
  ) {
    activeTab = 'library';
  } else if (
    pathname === '/profile' ||
    pathname === '/settings' ||
    pathname === '/devices' ||
    pathname === '/notifications' ||
    pathname === '/subscriptions'
  ) {
    activeTab = 'profile';
  } else if (pathname === '/' || pathname === '/home') {
    activeTab = 'home';
  }

  const navItems = [
    {
      id: 'home' as const,
      label: 'Home',
      to: user ? '/home' : '/',
      icon: Home,
      ariaLabel: 'Home feed',
    },
    {
      id: 'explore' as const,
      label: 'Explore',
      to: '/explore',
      icon: Compass,
      ariaLabel: 'Explore catalogue',
    },
    {
      id: 'search' as const,
      label: 'Search',
      to: '/search',
      icon: Search,
      ariaLabel: 'Search videos and creators',
    },
    {
      id: 'library' as const,
      label: 'Library',
      to: '/library',
      icon: Bookmark,
      ariaLabel: 'Saved library and watch later',
    },
    {
      id: 'profile' as const,
      label: 'Profile',
      to: '/profile',
      icon: User,
      ariaLabel: 'User profile and settings',
    },
  ];

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-2xl border-t border-white/10 px-2 pt-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] flex items-center justify-around shadow-2xl"
      aria-label="Mobile Navigation"
      role="navigation"
    >
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;

        return (
          <Link
            key={item.id}
            to={item.to}
            aria-label={item.ariaLabel}
            aria-current={isActive ? 'page' : undefined}
            className={`flex flex-col items-center justify-center min-w-[56px] min-h-[46px] py-1 px-2 rounded-xl transition-all ${
              isActive
                ? 'text-purple-400 font-bold scale-105 bg-purple-950/40 border border-purple-500/20'
                : 'text-gray-400 hover:text-gray-200 active:scale-95'
            }`}
          >
            <Icon className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] leading-tight font-medium tracking-tight">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
};

