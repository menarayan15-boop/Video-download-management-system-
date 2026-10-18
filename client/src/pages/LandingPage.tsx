import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Play,
  Sparkles,
  Download,
  Users,
  Compass,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { Video, SubscriptionPlan, Category } from '../types';
import { api } from '../services/api';
import { VideoCard } from '../components/video/VideoCard';

export const LandingPage: React.FC = () => {
  const [featuredVideos, setFeaturedVideos] = useState<Video[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    api.getVideos({ limit: 4, sort: 'most_viewed' }).then((res) => {
      setFeaturedVideos(res?.videos || []);
    });
    api.getPlans().then((p) => setPlans(p || []));
    api.getCategories().then((c) => setCategories(c || []));
  }, []);

  return (
    <div className="space-y-24 py-8">
      {/* Hero Section */}
      <section className="relative text-center max-w-4xl mx-auto space-y-6 pt-6">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-950/40 border border-purple-500/30 text-purple-300 text-xs font-semibold backdrop-blur-md animate-in fade-in slide-in-from-top-4 duration-500">
          <Sparkles className="w-3.5 h-3.5 text-purple-400" />
          <span>Introducing Vyntra • Watch. Connect. Discover.</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-tight">
          Your next favorite video <br />
          <span className="bg-gradient-to-r from-purple-400 via-purple-300 to-indigo-300 bg-clip-text text-transparent">
            starts here.
          </span>
        </h1>

        <p className="text-base sm:text-lg text-gray-300 max-w-2xl mx-auto leading-relaxed">
          Discover hand-crafted creator masterpieces, interact through real-time multilingual discussions, and experience seamless offline playback with verified, quota-controlled downloads.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
          <Link
            to="/register"
            className="px-6 py-3 rounded-xl text-sm font-semibold btn-primary flex items-center gap-2 shadow-glow"
          >
            <span>Get Started Free</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            to="/explore"
            className="px-6 py-3 rounded-xl text-sm font-medium btn-secondary flex items-center gap-2"
          >
            <Compass className="w-4 h-4 text-purple-400" />
            <span>Explore Videos</span>
          </Link>
        </div>

        {/* Feature Pill Highlights */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-10 text-xs text-gray-400">
          <div className="glass-panel p-3.5 rounded-xl flex items-center justify-center gap-2">
            <Download className="w-4 h-4 text-purple-400" />
            <span>Atomic Quota Downloads</span>
          </div>
          <div className="glass-panel p-3.5 rounded-xl flex items-center justify-center gap-2">
            <Users className="w-4 h-4 text-purple-400" />
            <span>Creator Communities</span>
          </div>
          <div className="glass-panel p-3.5 rounded-xl flex items-center justify-center gap-2">
            <ShieldCheck className="w-4 h-4 text-purple-400" />
            <span>Multilingual Chat</span>
          </div>
          <div className="glass-panel p-3.5 rounded-xl flex items-center justify-center gap-2">
            <TrendingUp className="w-4 h-4 text-purple-400" />
            <span>4K HDR Playback</span>
          </div>
        </div>
      </section>

      {/* Featured Videos */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white">Trending on Vyntra</h2>
            <p className="text-xs text-gray-400 mt-1">Top rated and most viewed videos this week</p>
          </div>
          <Link to="/explore" className="text-xs font-semibold text-purple-400 hover:text-purple-300 flex items-center gap-1">
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {featuredVideos.map((video) => (
            <VideoCard key={video.id} video={video} />
          ))}
        </div>
      </section>

      {/* Categories Grid */}
      <section className="space-y-6">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <h2 className="text-xl sm:text-2xl font-bold text-white">Explore Categories</h2>
          <p className="text-xs text-gray-400">Discover topics curated across high-impact domains</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              to={`/category/${cat.slug}`}
              className="glass-card p-4 rounded-xl text-center flex flex-col items-center justify-center gap-2 group hover:border-purple-500/50"
            >
              <div className="w-10 h-10 rounded-xl bg-purple-600/15 text-purple-300 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Compass className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold text-gray-200 group-hover:text-purple-300 transition-colors">
                {cat.name}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Subscription Plans Preview */}
      <section className="space-y-10">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <span className="px-3 py-1 rounded-full bg-purple-950/40 border border-purple-500/30 text-purple-300 text-xs font-bold uppercase tracking-wider">
            Plans & Quota Tiers
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-white">
            Choose the Perfect Allowance for Your Viewing Needs
          </h2>
          <p className="text-xs text-gray-400">
            Every plan includes secure video delivery. Free users enjoy 1 download daily; power users upgrade for higher limits.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((p) => {
            const isPopular = p.name === 'SILVER';
            return (
              <div
                key={p.id}
                className={`glass-card rounded-2xl p-6 flex flex-col justify-between relative ${
                  isPopular ? 'border-purple-500/50 shadow-glow bg-purple-950/20' : ''
                }`}
              >
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-purple-600 text-white text-[10px] font-bold uppercase tracking-wider shadow-md">
                    Most Popular
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <h3 className="text-base font-bold text-white">{p.displayName}</h3>
                    <div className="mt-2 flex items-baseline gap-1">
                      <span className="text-2xl font-extrabold text-white">
                        {p.price === 0 ? 'Free' : `₹${p.price}`}
                      </span>
                      {p.price > 0 && <span className="text-xs text-gray-400">/month</span>}
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 text-xs">
                    <p className="text-gray-400">Download Allowance:</p>
                    <p className="text-sm font-bold text-purple-300">
                      {p.downloadLimit} downloads / {p.quotaPeriod.toLowerCase()}
                    </p>
                  </div>

                  <ul className="space-y-2 text-xs text-gray-300">
                    {(Array.isArray(p.features) ? p.features : []).map((feat, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-400 flex-shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-6">
                  <Link
                    to="/register"
                    className={`w-full py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 ${
                      isPopular ? 'btn-primary' : 'btn-secondary'
                    }`}
                  >
                    <span>Get Started</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* CTA Banner */}
      <section className="glass-panel p-8 sm:p-12 rounded-3xl text-center space-y-6 relative overflow-hidden">
        <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="max-w-2xl mx-auto space-y-3 relative z-10">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
            Ready to Join the Vyntra Community?
          </h2>
          <p className="text-xs sm:text-sm text-gray-300">
            Create your account today. Watch compelling original content, support creators, and download videos with confidence.
          </p>
          <div className="pt-4 flex justify-center gap-4">
            <Link to="/register" className="px-6 py-3 rounded-xl text-xs font-bold btn-primary">
              Create Free Account
            </Link>
            <Link to="/explore" className="px-6 py-3 rounded-xl text-xs font-semibold btn-secondary">
              Browse Videos
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};
