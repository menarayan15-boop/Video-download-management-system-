import React from 'react';
import { ShieldCheck, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export const PrivacyPolicyPage: React.FC = () => {
  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12 text-xs text-gray-300 leading-relaxed">
      <Link to="/" className="text-gray-400 hover:text-white flex items-center gap-1 mb-2">
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Home</span>
      </Link>

      <div className="space-y-2">
        <span className="px-3 py-1 rounded-full bg-purple-950/50 text-purple-300 font-bold uppercase tracking-wider text-[10px] border border-purple-500/30">
          Transparency & Security
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Vyntra Privacy Policy</h1>
        <p className="text-gray-400">Last updated: October 2026</p>
      </div>

      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 space-y-6">
        <section className="space-y-2">
          <h2 className="text-sm font-bold text-white">1. Information We Collect</h2>
          <p>
            Vyntra collects minimal account information (such as username, email, and password hash) necessary to deliver authenticated streaming, quota accounting, and creator interactions.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-bold text-white">2. Download Quotas & Security Accounting</h2>
          <p>
            To prevent quota abuse, ensure fair distribution of media transfers, and protect creator rights, we record download operations, IP metadata, and completion timestamps in an immutable audit trail.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-bold text-white">3. Device Management</h2>
          <p>
            Users can inspect and revoke authorized registered devices at any time through their account settings. We do not engage in invasive device tracking.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-bold text-white">4. Data Retention</h2>
          <p>
            Personal data is maintained only for as long as your account remains active. Users may request account deletion at any time.
          </p>
        </section>
      </div>
    </div>
  );
};
