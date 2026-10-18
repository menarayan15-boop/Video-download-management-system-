import React from 'react';
import { Shield, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export const TermsOfServicePage: React.FC = () => {
  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12 text-xs text-gray-300 leading-relaxed">
      <Link to="/" className="text-gray-400 hover:text-white flex items-center gap-1 mb-2">
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Home</span>
      </Link>

      <div className="space-y-2">
        <span className="px-3 py-1 rounded-full bg-purple-950/50 text-purple-300 font-bold uppercase tracking-wider text-[10px] border border-purple-500/30">
          User Agreement
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Vyntra Terms of Service</h1>
        <p className="text-gray-400">Effective Date: October 2026</p>
      </div>

      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 space-y-6">
        <section className="space-y-2">
          <h2 className="text-sm font-bold text-white">1. Acceptance of Terms</h2>
          <p>
            By accessing or using Vyntra, you agree to comply with these Terms of Service. If you do not agree, you must discontinue using our services.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-bold text-white">2. Permitted Video Downloads & Quota Limits</h2>
          <p>
            Video downloads are provided strictly for offline viewing by authorized account holders. Bypassing, reverse-engineering, or tampering with download quota enforcement, signed download tokens, or API rate limits is strictly prohibited.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-bold text-white">3. Creator Rights & Content Ownership</h2>
          <p>
            Creators retain full intellectual property rights to their uploaded materials. Uploading copyrighted, infringing, or harmful media without authorization will result in immediate content removal and account termination.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-bold text-white">4. Subscriptions & Billing</h2>
          <p>
            Paid subscription tiers grant higher download limits. Subscriptions can be cancelled at any time, returning your account to the default Free Starter tier upon expiration.
          </p>
        </section>
      </div>
    </div>
  );
};
