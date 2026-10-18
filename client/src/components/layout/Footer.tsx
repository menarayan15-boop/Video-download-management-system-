import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Heart } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-white/5 bg-[#0B0F19]/90 mt-16 text-xs text-gray-400">
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand Col */}
          <div className="space-y-3 md:col-span-1">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-[#7C3AED] to-[#8B5CF6] flex items-center justify-center">
                <svg className="w-4 h-4 text-white fill-current ml-0.5" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
              <span className="text-lg font-bold text-white tracking-tight">Vyntra</span>
            </div>
            <p className="text-gray-400 text-xs">
              Watch. Connect. Discover. The premium video-sharing and creator community platform with controlled, secure video downloads.
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h4 className="font-semibold text-gray-200 uppercase tracking-wider text-[11px] mb-3">Platform</h4>
            <ul className="space-y-2">
              <li><Link to="/explore" className="hover:text-purple-400 transition-colors">Explore Videos</Link></li>
              <li><Link to="/categories" className="hover:text-purple-400 transition-colors">Browse Categories</Link></li>
              <li><Link to="/pricing" className="hover:text-purple-400 transition-colors">Subscription Plans</Link></li>
              <li><Link to="/downloads" className="hover:text-purple-400 transition-colors">Download Hub</Link></li>
            </ul>
          </div>

          {/* Community */}
          <div>
            <h4 className="font-semibold text-gray-200 uppercase tracking-wider text-[11px] mb-3">Community</h4>
            <ul className="space-y-2">
              <li><Link to="/register" className="hover:text-purple-400 transition-colors">Creator Program</Link></li>
              <li><Link to="/following" className="hover:text-purple-400 transition-colors">Following Feed</Link></li>
              <li><Link to="/settings" className="hover:text-purple-400 transition-colors">Account Preferences</Link></li>
              <li><Link to="/devices" className="hover:text-purple-400 transition-colors">Registered Devices</Link></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-semibold text-gray-200 uppercase tracking-wider text-[11px] mb-3">Legal & Safety</h4>
            <ul className="space-y-2">
              <li><Link to="/privacy" className="hover:text-purple-400 transition-colors">Privacy Policy</Link></li>
              <li><Link to="/terms" className="hover:text-purple-400 transition-colors">Terms of Service</Link></li>
              <li className="flex items-center gap-1.5 text-gray-500 pt-1">
                <ShieldCheck className="w-3.5 h-3.5 text-green-400" />
                <span>SSL Encrypted & Concurrency-Safe</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-gray-500">
          <p>© {new Date().getFullYear()} Vyntra Platform. All rights reserved.</p>
          <p className="flex items-center gap-1">
            Engineered with precision for video creators and explorers worldwide
          </p>
        </div>
      </div>
    </footer>
  );
};
