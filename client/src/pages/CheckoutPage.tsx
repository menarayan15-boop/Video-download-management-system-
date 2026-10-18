import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { CreditCard, CheckCircle2, ShieldCheck, ArrowLeft, AlertCircle, Sparkles } from 'lucide-react';
import { SubscriptionPlan } from '../types';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export const CheckoutPage: React.FC = () => {
  const { planId } = useParams<{ planId: string }>();
  const { user, refreshAuth } = useAuth();
  const navigate = useNavigate();

  const [plan, setPlan] = useState<SubscriptionPlan | null>(null);
  const [billingCycle, setBillingCycle] = useState<'MONTHLY' | 'DAILY'>('MONTHLY');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    api.getPlans().then((plans) => {
      const found = plans?.find((p) => p.id === planId);
      if (found) {
        setPlan(found);
      } else {
        navigate('/pricing');
      }
    });
  }, [planId, user, navigate]);

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!plan) return;
    setIsLoading(true);
    setError(null);

    try {
      await api.checkoutSubscription({
        planId: plan.id,
        billingCycle,
      });
      await refreshAuth();
      setSuccess(true);
      setTimeout(() => navigate('/downloads'), 2000);
    } catch (err: any) {
      setError(err.message || 'Payment processing failed');
    } finally {
      setIsLoading(false);
    }
  };

  if (!plan) {
    return <div className="p-8 text-center text-xs text-gray-400">Loading checkout...</div>;
  }

  return (
    <div className="max-w-xl mx-auto py-8 space-y-6">
      <Link to="/pricing" className="text-xs text-gray-400 hover:text-white flex items-center gap-1">
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to Plans</span>
      </Link>

      <div className="glass-card rounded-3xl p-6 sm:p-8 space-y-6 border border-white/10 shadow-2xl">
        <div className="space-y-2">
          <span className="px-3 py-1 rounded-full bg-purple-950/50 text-purple-300 text-xs font-bold uppercase tracking-wider border border-purple-500/20">
            Subscription Checkout
          </span>
          <h1 className="text-2xl font-extrabold text-white">Upgrade to {plan.displayName}</h1>
          <p className="text-xs text-gray-400">Review your order details and activate your enhanced download allowance</p>
        </div>

        {success ? (
          <div className="p-6 rounded-2xl bg-green-950/40 border border-green-500/30 text-green-300 text-center space-y-2">
            <CheckCircle2 className="w-10 h-10 text-green-400 mx-auto" />
            <h3 className="text-base font-bold">Subscription Successfully Activated!</h3>
            <p className="text-xs text-green-400/80">
              Your account has been upgraded with {plan.downloadLimit} downloads per day. Redirecting to your Downloads hub...
            </p>
          </div>
        ) : (
          <form onSubmit={handleCheckout} className="space-y-6 text-xs">
            {error && (
              <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Plan Breakdown */}
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-300 font-semibold">{plan.displayName}</span>
                <span className="text-base font-extrabold text-white">
                  {plan.price === 0 ? 'Free' : `₹${plan.price}`}
                  {plan.price > 0 && <span className="text-xs text-gray-400 font-normal"> / month</span>}
                </span>
              </div>

              <div className="pt-2 border-t border-white/5 flex justify-between items-center text-gray-400">
                <span>Daily Download Allowance:</span>
                <strong className="text-purple-300">{plan.downloadLimit} videos / day</strong>
              </div>

              <div className="flex justify-between items-center text-gray-400">
                <span>Concurrent Devices:</span>
                <strong className="text-white">{plan.deviceLimit}</strong>
              </div>
            </div>

            {/* Simulated Payment Notice */}
            <div className="p-3.5 rounded-xl bg-purple-950/30 border border-purple-500/20 text-purple-200 text-xs flex items-center gap-2.5">
              <Sparkles className="w-4 h-4 text-purple-400 flex-shrink-0" />
              <div>
                <p className="font-semibold">Development Gateway Active</p>
                <p className="text-[11px] text-purple-300/80 mt-0.5">
                  Transactions are safely recorded in PostgreSQL without charging real credit cards.
                </p>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 rounded-xl text-xs font-bold btn-primary flex items-center justify-center gap-2 shadow-glow"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  <span>Activating Subscription...</span>
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4" />
                  <span>Confirm & Activate {plan.displayName}</span>
                </>
              )}
            </button>
          </form>
        )}

        <div className="flex items-center justify-center gap-2 text-[10px] text-gray-500">
          <ShieldCheck className="w-3.5 h-3.5 text-green-400" />
          <span>Instant activation • Cancel anytime • 100% secure</span>
        </div>
      </div>
    </div>
  );
};
