import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CreditCard, ArrowLeft, Save, Sparkles, CheckCircle2 } from 'lucide-react';
import { SubscriptionPlan } from '../types';
import { api } from '../services/api';

export const AdminSubscriptionsPage: React.FC = () => {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    const data = await api.getPlans();
    setPlans(data || []);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlan) return;

    try {
      await api.updatePlanConfig(editingPlan.id, {
        price: parseFloat(editingPlan.price),
        downloadLimit: parseInt(editingPlan.downloadLimit, 10),
        deviceLimit: parseInt(editingPlan.deviceLimit, 10),
        isActive: editingPlan.isActive,
      });
      setSaved(true);
      await loadPlans();
      setTimeout(() => {
        setSaved(false);
        setEditingPlan(null);
      }, 1500);
    } catch (err: any) {
      alert(err.message || 'Failed to update plan configuration');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <Link to="/admin" className="text-xs text-gray-400 hover:text-white flex items-center gap-1">
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Admin Dashboard</span>
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <CreditCard className="w-6 h-6 text-purple-400" />
          Subscription & Download Quota Configuration
        </h1>
        <p className="text-xs text-gray-400 mt-0.5">
          Define dynamic download limits, pricing, and device permissions for all tiers
        </p>
      </div>

      {saved && (
        <div className="p-3.5 rounded-xl bg-green-950/30 border border-green-500/30 text-green-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-green-400" />
          <span>Plan configuration updated in database!</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {plans.map((p) => (
          <div key={p.id} className="glass-card p-5 rounded-2xl flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                {p.quotaPeriod} PLAN
              </span>
              <h3 className="text-base font-bold text-white">{p.displayName}</h3>
              <p className="text-xl font-extrabold text-purple-300">
                {p.price === 0 ? 'Free' : `₹${p.price}`}
              </p>
              <div className="pt-2 text-xs space-y-1 text-gray-300">
                <p>
                  Download Limit: <strong className="text-white">{p.downloadLimit} / day</strong>
                </p>
                <p>
                  Max Devices: <strong className="text-white">{p.deviceLimit}</strong>
                </p>
                <p>
                  Status:{' '}
                  <span className={p.isActive ? 'text-green-400 font-bold' : 'text-red-400'}>
                    {p.isActive ? 'Active' : 'Inactive'}
                  </span>
                </p>
              </div>
            </div>

            <button
              onClick={() => setEditingPlan({ ...p })}
              className="w-full py-2 rounded-xl text-xs font-semibold btn-secondary text-purple-300 hover:text-white"
            >
              Configure Limits
            </button>
          </div>
        ))}
      </div>

      {/* Edit Drawer Modal */}
      {editingPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="glass-dropdown w-full max-w-md rounded-2xl p-6 border border-white/15 shadow-2xl space-y-4 text-xs">
            <h3 className="text-base font-bold text-white">
              Configure {editingPlan.displayName}
            </h3>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-gray-300 font-semibold mb-1">Monthly Price (INR)</label>
                <input
                  type="number"
                  min={0}
                  value={editingPlan.price}
                  onChange={(e) => setEditingPlan({ ...editingPlan, price: e.target.value })}
                  className="w-full p-2.5 rounded-xl glass-input"
                />
              </div>

              <div>
                <label className="block text-gray-300 font-semibold mb-1">
                  Daily Download Limit (Atomic Unit)
                </label>
                <input
                  type="number"
                  min={1}
                  value={editingPlan.downloadLimit}
                  onChange={(e) =>
                    setEditingPlan({ ...editingPlan, downloadLimit: e.target.value })
                  }
                  className="w-full p-2.5 rounded-xl glass-input"
                />
              </div>

              <div>
                <label className="block text-gray-300 font-semibold mb-1">Max Devices</label>
                <input
                  type="number"
                  min={1}
                  value={editingPlan.deviceLimit}
                  onChange={(e) =>
                    setEditingPlan({ ...editingPlan, deviceLimit: e.target.value })
                  }
                  className="w-full p-2.5 rounded-xl glass-input"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingPlan(null)}
                  className="px-3.5 py-1.5 rounded-lg btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg btn-primary font-semibold"
                >
                  Save Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
