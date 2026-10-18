import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CreditCard,
  AlertCircle,
} from 'lucide-react';
import { SubscriptionPlan, UserSubscription } from '../types';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { FALLBACK_SUBSCRIPTION_PLANS } from '../data/seedData';

export const SubscriptionPlansPage: React.FC = () => {
  const { user, subscription, refreshAuth } = useAuth();
  const navigate = useNavigate();
  const [plans, setPlans] = useState<SubscriptionPlan[]>(FALLBACK_SUBSCRIPTION_PLANS);
  const [isLoading, setIsLoading] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    api.getPlans()
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          const normalized = data.map((p) => ({
            ...p,
            features: typeof p.features === 'string' ? JSON.parse(p.features) : p.features || [],
          }));
          setPlans(normalized);
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const handleCancelSub = async () => {
    if (!confirm('Are you sure you want to cancel your active subscription and downgrade to Free?')) return;
    setCancelling(true);
    try {
      await api.cancelSubscription();
      await refreshAuth();
      alert('Subscription cancelled. Your account has returned to the Free tier.');
    } catch (err: any) {
      alert(err.message || 'Failed to cancel subscription.');
    } finally {
      setCancelling(false);
    }
  };

  const currentPlanName = subscription?.plan?.name || (user ? 'FREE' : null);

  return (
    <div className="space-y-12 pb-16 max-w-6xl mx-auto">
      {/* Header */}
      <div className="text-center space-y-3 pt-4">
        <span className="px-3.5 py-1 rounded-full bg-purple-950/40 border border-purple-500/30 text-purple-300 text-xs font-bold uppercase tracking-wider">
          Transparent Pricing & Quotas
        </span>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white">
          Choose the Ideal Tier for Your Experience
        </h1>
        <p className="text-xs sm:text-sm text-gray-400 max-w-xl mx-auto leading-relaxed">
          Upgrade your daily download limits, stream in master 4K HDR bitrate, and enjoy unlimited creator community interactions.
        </p>
      </div>

      {/* Plans Comparison Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {plans.map((p) => {
          const isCurrent = currentPlanName === p.name;
          const isGold = p.name === 'GOLD';
          const isSilver = p.name === 'SILVER';

          return (
            <div
              key={p.id}
              className={`glass-card rounded-3xl p-6 flex flex-col justify-between relative transition-all duration-300 ${
                isCurrent
                  ? 'border-green-500/50 bg-green-950/10'
                  : isSilver
                  ? 'border-purple-500/50 shadow-glow bg-purple-950/20'
                  : 'border-white/10'
              }`}
            >
              {isCurrent && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-green-600 text-white text-[10px] font-bold uppercase tracking-wider shadow-md">
                  Current Active Plan
                </div>
              )}

              {isSilver && !isCurrent && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-purple-600 text-white text-[10px] font-bold uppercase tracking-wider shadow-md">
                  Most Popular
                </div>
              )}

              <div className="space-y-5">
                <div>
                  <h3 className="text-lg font-bold text-white">{p.displayName}</h3>
                  <div className="mt-3 flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold text-white">
                      {p.price === 0 ? 'Free' : `₹${p.price}`}
                    </span>
                    {p.price > 0 && <span className="text-xs text-gray-400">/month</span>}
                  </div>
                </div>

                {/* Quota Highlights */}
                <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 text-xs space-y-1">
                  <p className="text-gray-400 font-medium">Download Quota:</p>
                  <p className="text-sm font-extrabold text-purple-300">
                    {p.downloadLimit} downloads / {p.quotaPeriod.toLowerCase()}
                  </p>
                  <p className="text-[10px] text-gray-500">
                    Up to {p.deviceLimit} simultaneous registered device{p.deviceLimit > 1 ? 's' : ''}
                  </p>
                </div>

                {/* Features list */}
                <ul className="space-y-2.5 text-xs text-gray-300 pt-2">
                  {(Array.isArray(p.features) ? p.features : []).map((feat, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-400 flex-shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Action Button */}
              <div className="pt-8">
                {isCurrent ? (
                  p.price > 0 ? (
                    <button
                      onClick={handleCancelSub}
                      disabled={cancelling}
                      className="w-full py-2.5 rounded-xl text-xs font-semibold btn-secondary text-red-400 hover:text-red-300"
                    >
                      {cancelling ? 'Cancelling...' : 'Cancel Subscription'}
                    </button>
                  ) : (
                    <button
                      disabled
                      className="w-full py-2.5 rounded-xl text-xs font-semibold bg-white/5 text-gray-400 cursor-default"
                    >
                      Default Plan
                    </button>
                  )
                ) : (
                  <button
                    onClick={() => {
                      if (!user) navigate('/register');
                      else navigate(`/checkout/${p.id}`);
                    }}
                    className={`w-full py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 ${
                      isSilver || isGold ? 'btn-primary' : 'btn-secondary'
                    }`}
                  >
                    <span>{p.price === 0 ? 'Switch to Free' : 'Upgrade Plan'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Security & Guarantee Note */}
      <div className="glass-panel p-6 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-400 border border-white/5">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-6 h-6 text-green-400 flex-shrink-0" />
          <div>
            <p className="font-semibold text-white">Guaranteed Quota Accuracy</p>
            <p className="text-[11px] text-gray-400 mt-0.5">
              All allowances are enforced atomically on PostgreSQL. No surprises, no double charges.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-gray-300">
          <CreditCard className="w-4 h-4 text-purple-400" />
          <span>Simulated & Webhook-Verified Payment Gateways Supported</span>
        </div>
      </div>
    </div>
  );
};
