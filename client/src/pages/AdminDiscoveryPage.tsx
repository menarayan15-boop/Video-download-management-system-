import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Compass,
  RefreshCw,
  Database,
  Radio,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Eye,
  EyeOff,
  Plus,
  Play,
  Activity,
  ArrowRight,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { api } from '../services/api';
import { Category, ProviderStatus, ContentSyncJob } from '../types';

export const AdminDiscoveryPage: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [providers, setProviders] = useState<ProviderStatus[]>([]);
  const [jobs, setJobs] = useState<ContentSyncJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');

  // Category Modal State
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatSlug, setNewCatSlug] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('Compass');

  // Manual sync target
  const [selectedCatId, setSelectedCatId] = useState('');

  // Featured Hero Governance State
  const [featuredDiag, setFeaturedDiag] = useState<any>(null);
  const [dynamicEnabled, setDynamicEnabled] = useState(true);
  const [pinnedVideoId, setPinnedVideoId] = useState('');
  const [pinExpiresAt, setPinExpiresAt] = useState('');
  const [categoryDiversity, setCategoryDiversity] = useState(true);
  const [isUpdatingFeatured, setIsUpdatingFeatured] = useState(false);
  const [featuredNotice, setFeaturedNotice] = useState('');

  useEffect(() => {
    loadDiscoveryAdminData();
  }, []);

  const loadDiscoveryAdminData = async () => {
    setIsLoading(true);
    try {
      const [statsRes, catsRes, jobsRes, provRes, featRes] = await Promise.all([
        api.getDiscoveryStats().catch(() => null),
        api.getCategories().catch(() => []),
        api.getDiscoveryJobs(10).catch(() => []),
        api.getProviders().catch(() => []),
        api.getFeaturedAdminConfig().catch(() => null),
      ]);

      setStats(statsRes);
      setCategories(catsRes || []);
      setJobs(jobsRes || []);
      setProviders(provRes || []);
      if (featRes) {
        setFeaturedDiag(featRes);
        setDynamicEnabled(featRes.config?.dynamicEnabled ?? true);
        setPinnedVideoId(featRes.config?.pinnedVideoId ?? '');
        setPinExpiresAt(featRes.config?.pinExpiresAt ? featRes.config.pinExpiresAt.substring(0, 16) : '');
        setCategoryDiversity(featRes.config?.categoryDiversity ?? true);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveFeaturedConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingFeatured(true);
    setFeaturedNotice('');
    try {
      const res = await api.updateFeaturedAdminConfig({
        dynamicEnabled,
        pinnedVideoId: pinnedVideoId.trim() || null,
        pinExpiresAt: pinExpiresAt ? new Date(pinExpiresAt).toISOString() : null,
        categoryDiversity,
      });
      setFeaturedNotice(res.message || 'Featured video governance updated!');
      const freshDiag = await api.getFeaturedAdminConfig().catch(() => null);
      if (freshDiag) setFeaturedDiag(freshDiag);
    } catch (err: any) {
      setFeaturedNotice(`Failed to update: ${err.message}`);
    } finally {
      setIsUpdatingFeatured(false);
      setTimeout(() => setFeaturedNotice(''), 4000);
    }
  };

  const handleTriggerSync = async () => {
    setIsSyncing(true);
    setSyncMessage('Launching controlled content discovery ingestion...');
    try {
      const res = await api.triggerDiscoverySync({
        categoryId: selectedCatId || undefined,
        limitPerCategory: 6,
      });
      setSyncMessage(res.message || 'Discovery sync completed successfully!');
      await loadDiscoveryAdminData();
    } catch (err: any) {
      setSyncMessage(`Sync failed: ${err.message}`);
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncMessage(''), 5000);
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName || !newCatSlug) return;
    try {
      await api.adminCreateCategory({
        name: newCatName,
        slug: newCatSlug,
        description: newCatDesc,
        icon: newCatIcon,
      });
      setShowCategoryModal(false);
      setNewCatName('');
      setNewCatSlug('');
      setNewCatDesc('');
      await loadDiscoveryAdminData();
    } catch (err: any) {
      alert(`Failed to create category: ${err.message}`);
    }
  };

  const handleToggleCategoryActive = async (cat: Category) => {
    try {
      await api.adminUpdateCategory(cat.id, { isActive: !cat.isActive });
      await loadDiscoveryAdminData();
    } catch (err: any) {
      alert(`Failed to toggle category: ${err.message}`);
    }
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="px-3 py-1 rounded-full bg-purple-950/80 text-purple-300 text-xs font-bold uppercase tracking-wider border border-purple-500/30">
            Discovery Architecture
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-1 flex items-center gap-2">
            <Compass className="w-8 h-8 text-purple-400" />
            <span>Content Aggregation & Discovery Engine</span>
          </h1>
          <p className="text-xs text-gray-400">
            Multi-provider integration monitoring, automated sync jobs, and dynamic category governance.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCategoryModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold btn-secondary text-gray-200"
          >
            <Plus className="w-4 h-4 text-purple-400" />
            <span>New Category</span>
          </button>
          <button
            onClick={handleTriggerSync}
            disabled={isSyncing}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold btn-primary disabled:opacity-50 shadow-lg shadow-purple-600/20"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Discovering...' : 'Trigger Discovery Sync'}</span>
          </button>
        </div>
      </div>

      {syncMessage && (
        <div className="p-3.5 rounded-xl bg-purple-950/80 border border-purple-500/40 text-xs text-purple-200 flex items-center gap-2">
          <Activity className="w-4 h-4 text-purple-400 animate-pulse" />
          <span>{syncMessage}</span>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="glass-card p-4 rounded-2xl space-y-1">
          <Database className="w-5 h-5 text-purple-400" />
          <p className="text-2xl font-black text-white">{stats?.totalVideos || 0}</p>
          <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Total Discovered</p>
        </div>

        <div className="glass-card p-4 rounded-2xl space-y-1">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <p className="text-2xl font-black text-white">{stats?.availableVideos || 0}</p>
          <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Available & Verified</p>
        </div>

        <div className="glass-card p-4 rounded-2xl space-y-1">
          <AlertTriangle className="w-5 h-5 text-amber-400" />
          <p className="text-2xl font-black text-white">{stats?.unavailableVideos || 0}</p>
          <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Restricted / Hidden</p>
        </div>

        <div className="glass-card p-4 rounded-2xl space-y-1">
          <Layers className="w-5 h-5 text-blue-400" />
          <p className="text-2xl font-black text-white">{categories.length}</p>
          <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Active Categories</p>
        </div>
      </div>

      {/* Provider Status Cards */}
      <section className="space-y-3">
        <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400">Integrated Content Providers</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {providers.map((p) => (
            <div key={p.providerType} className="glass-card p-5 rounded-2xl space-y-3 border border-white/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${p.isConfigured ? 'bg-emerald-400 animate-pulse' : 'bg-red-500'}`} />
                  <span className="font-bold text-white text-sm">{p.name}</span>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  p.isConfigured ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30' : 'bg-red-950 text-red-300'
                }`}>
                  {p.isConfigured ? 'Connected' : 'Missing Key'}
                </span>
              </div>

              <div className="text-xs space-y-1.5 text-gray-400">
                <div className="flex justify-between">
                  <span>Provider Key:</span>
                  <strong className="text-gray-200">{p.providerType}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Quota Budget:</span>
                  <span className="text-purple-300">{p.quotaLimit ? `${p.quotaLimit} units/day` : 'Standard'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Rate Safe Guard:</span>
                  <span className="text-emerald-400">Active (Auto-Throttle)</span>
                </div>
              </div>

              <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-gray-500">
                <span>Compliance: Safe Embed Only</span>
                <ShieldCheck className="w-4 h-4 text-purple-400" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Featured Hero Governance & Rotation Engine */}
      <section className="glass-panel p-5 rounded-2xl border border-white/10 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-white/5 pb-3">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span>Featured Hero Spotlight Engine & Rotation Governance</span>
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Control dynamic hero rotation, temporary manual pinning, category diversity, and inspect rotation history.
            </p>
          </div>
          {featuredNotice && (
            <span className="px-3 py-1 rounded-full bg-purple-900/60 text-purple-300 text-xs font-semibold border border-purple-500/30">
              {featuredNotice}
            </span>
          )}
        </div>

        {/* Diagnostics Metrics */}
        {featuredDiag && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
              <span className="text-[10px] text-gray-400 uppercase tracking-wider block">Eligible Videos</span>
              <strong className="text-lg font-bold text-white">{featuredDiag.eligibleCount}</strong>
              <span className="text-[10px] text-emerald-400 block">Available in catalog</span>
            </div>
            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
              <span className="text-[10px] text-gray-400 uppercase tracking-wider block">Rotation History</span>
              <strong className="text-lg font-bold text-purple-300">{featuredDiag.recentServedCount}</strong>
              <span className="text-[10px] text-gray-400 block">Recent served IDs tracked</span>
            </div>
            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
              <span className="text-[10px] text-gray-400 uppercase tracking-wider block">Pin Status</span>
              <strong className="text-xs font-bold text-white block mt-1">
                {featuredDiag.config?.pinnedVideoId ? 'Active Pin' : 'Dynamic Sampler'}
              </strong>
              <span className="text-[10px] text-purple-400 block truncate">
                {featuredDiag.config?.pinnedVideoId || 'None'}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
              <span className="text-[10px] text-gray-400 uppercase tracking-wider block">Diversity Sampler</span>
              <strong className="text-xs font-bold text-emerald-400 block mt-1">
                {featuredDiag.config?.categoryDiversity ? 'Enabled' : 'Off'}
              </strong>
              <span className="text-[10px] text-gray-400 block">Multi-category rotation</span>
            </div>
          </div>
        )}

        {/* Configuration Form */}
        <form onSubmit={handleSaveFeaturedConfig} className="space-y-4 pt-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-white/5">
              <div>
                <span className="text-xs font-semibold text-white block">Dynamic Random Selection</span>
                <span className="text-[11px] text-gray-400">Selects different eligible videos on page refresh</span>
              </div>
              <input
                type="checkbox"
                checked={dynamicEnabled}
                onChange={(e) => setDynamicEnabled(e.target.checked)}
                className="w-4 h-4 accent-purple-600 rounded cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-white/5">
              <div>
                <span className="text-xs font-semibold text-white block">Category Diversity Prioritization</span>
                <span className="text-[11px] text-gray-400">Rotates across Space, AI, Nature, Health, Science</span>
              </div>
              <input
                type="checkbox"
                checked={categoryDiversity}
                onChange={(e) => setCategoryDiversity(e.target.checked)}
                className="w-4 h-4 accent-purple-600 rounded cursor-pointer"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-300 flex items-center justify-between">
                <span>Pinned Video ID (Overrides dynamic rotation)</span>
                {pinnedVideoId && (
                  <button
                    type="button"
                    onClick={() => setPinnedVideoId('')}
                    className="text-[10px] text-purple-400 hover:underline"
                  >
                    Clear Pin
                  </button>
                )}
              </label>
              <input
                type="text"
                value={pinnedVideoId}
                onChange={(e) => setPinnedVideoId(e.target.value)}
                placeholder="Paste video UUID to pin temporarily"
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-purple-500 font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-300">
                Pin Expiration (Reverts to dynamic selection upon expiry)
              </label>
              <input
                type="datetime-local"
                value={pinExpiresAt}
                onChange={(e) => setPinExpiresAt(e.target.value)}
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-[11px] text-gray-400">
              Changes take effect immediately across all user sessions.
            </span>
            <button
              type="submit"
              disabled={isUpdatingFeatured}
              className="px-5 py-2 rounded-xl text-xs font-bold btn-primary disabled:opacity-50"
            >
              {isUpdatingFeatured ? 'Saving...' : 'Save Featured Settings'}
            </button>
          </div>
        </form>

        {/* Current Diversity Candidate Pool Preview */}
        {featuredDiag?.topDiversePreview && featuredDiag.topDiversePreview.length > 0 && (
          <div className="pt-3 border-t border-white/5 space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block">
              Active Candidate Carousel Pool ({featuredDiag.topDiversePreview.length} Diverse Items)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {featuredDiag.topDiversePreview.map((item: any) => (
                <div
                  key={item.id}
                  className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 flex flex-col justify-between"
                >
                  <span className="text-xs font-semibold text-white truncate">{item.title}</span>
                  <div className="flex items-center justify-between text-[10px] text-gray-400 mt-1">
                    <span className="text-purple-300">{item.category}</span>
                    <span>via {item.provider}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Manual Sync Control */}
      <section className="glass-panel p-5 rounded-2xl border border-white/10 space-y-3">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Radio className="w-4 h-4 text-purple-400" />
          <span>Manual Sync Execution</span>
        </h3>
        <p className="text-xs text-gray-400">
          Target a specific knowledge category to query configured YouTube, NASA, or Archive adapters immediately.
        </p>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
          <select
            value={selectedCatId}
            onChange={(e) => setSelectedCatId(e.target.value)}
            className="bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-purple-500 flex-1"
          >
            <option value="">All Categories (Batch Sync)</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.slug})
              </option>
            ))}
          </select>

          <button
            onClick={handleTriggerSync}
            disabled={isSyncing}
            className="px-5 py-2 rounded-xl text-xs font-semibold btn-primary whitespace-nowrap disabled:opacity-50"
          >
            {isSyncing ? 'Executing Job...' : 'Run Category Sync'}
          </button>
        </div>
      </section>

      {/* Recent Sync Jobs Table */}
      <section className="space-y-3">
        <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400">Recent Synchronization Jobs</h3>
        <div className="glass-card rounded-2xl overflow-hidden border border-white/10">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-300">
              <thead className="bg-white/5 text-[11px] uppercase tracking-wider text-gray-400 border-b border-white/10">
                <tr>
                  <th className="p-3.5">Provider</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Discovered</th>
                  <th className="p-3.5">Imported</th>
                  <th className="p-3.5">Skipped / Dedup</th>
                  <th className="p-3.5">Started At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {jobs.map((job) => (
                  <tr key={job.id} className="hover:bg-white/[0.02]">
                    <td className="p-3.5 font-bold text-white">{job.provider}</td>
                    <td className="p-3.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        job.status === 'COMPLETED'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                          : job.status === 'RUNNING'
                          ? 'bg-purple-950 text-purple-300 animate-pulse'
                          : 'bg-red-950 text-red-300'
                      }`}>
                        {job.status}
                      </span>
                    </td>
                    <td className="p-3.5 font-mono text-purple-300">{job.itemsDiscovered}</td>
                    <td className="p-3.5 font-mono text-emerald-300">{job.itemsImported}</td>
                    <td className="p-3.5 font-mono text-gray-400">{job.itemsSkipped}</td>
                    <td className="p-3.5 text-gray-400">{new Date(job.startedAt).toLocaleTimeString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Category Manager */}
      <section className="space-y-3">
        <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400">Category Catalog Management</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {categories.map((cat) => (
            <div key={cat.id} className="glass-card p-4 rounded-2xl border border-white/5 flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white line-clamp-1">{cat.name}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                    cat.isActive !== false ? 'bg-emerald-950 text-emerald-300' : 'bg-gray-800 text-gray-400'
                  }`}>
                    {cat.isActive !== false ? 'Active' : 'Disabled'}
                  </span>
                </div>
                <p className="text-[11px] text-gray-400 mt-1 line-clamp-1">{cat.slug}</p>
                <p className="text-[10px] text-purple-400 mt-1">{cat.subcategories?.length || 0} subtopics configured</p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-white/5">
                <button
                  onClick={() => handleToggleCategoryActive(cat)}
                  className="text-[11px] text-gray-400 hover:text-white"
                >
                  {cat.isActive !== false ? 'Disable' : 'Enable'}
                </button>
                <Link to={`/category/${cat.slug}`} className="text-[11px] text-purple-400 hover:underline">
                  View Feed →
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Create Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="glass-card rounded-3xl p-6 max-w-md w-full border border-purple-500/30 space-y-4">
            <h3 className="text-lg font-bold text-white">Add Dynamic Category</h3>

            <form onSubmit={handleCreateCategory} className="space-y-3 text-xs">
              <div>
                <label className="text-gray-300 block mb-1">Category Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Quantum Computing & Physics"
                  value={newCatName}
                  onChange={(e) => {
                    setNewCatName(e.target.value);
                    setNewCatSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
                  }}
                  className="w-full p-2.5 rounded-xl glass-input text-white"
                />
              </div>

              <div>
                <label className="text-gray-300 block mb-1">URL Slug</label>
                <input
                  type="text"
                  required
                  value={newCatSlug}
                  onChange={(e) => setNewCatSlug(e.target.value)}
                  className="w-full p-2.5 rounded-xl glass-input text-white font-mono"
                />
              </div>

              <div>
                <label className="text-gray-300 block mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Subject scope and discovery overview..."
                  value={newCatDesc}
                  onChange={(e) => setNewCatDesc(e.target.value)}
                  className="w-full p-2.5 rounded-xl glass-input text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCategoryModal(false)}
                  className="px-4 py-2 rounded-xl btn-secondary text-gray-300"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 rounded-xl btn-primary font-semibold">
                  Save Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
