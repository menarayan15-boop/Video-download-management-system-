import React, { useEffect, useState } from 'react';
import { Laptop, Smartphone, Trash2, Plus, ShieldCheck, AlertCircle } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export const RegisteredDevicesPage: React.FC = () => {
  const { subscription } = useAuth();
  const [devices, setDevices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [registering, setRegistering] = useState(false);

  useEffect(() => {
    loadDevices();
  }, []);

  const loadDevices = async () => {
    setIsLoading(true);
    try {
      const data = await api.getDevices();
      setDevices(data || []);
    } catch (e) {
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterCurrent = async () => {
    setRegistering(true);
    try {
      const userAgent = navigator.userAgent;
      const deviceName = userAgent.includes('Mobile') ? 'Mobile Browser' : 'Desktop Browser';
      const deviceIdentifier = `dev_${Math.random().toString(36).substring(2, 10)}`;

      await api.registerDevice({ deviceName, deviceIdentifier });
      await loadDevices();
    } catch (err: any) {
      alert(err.message || 'Failed to register device');
    } finally {
      setRegistering(false);
    }
  };

  const handleRevoke = async (id: string) => {
    if (!confirm('Revoke access for this device?')) return;
    try {
      await api.revokeDevice(id);
      await loadDevices();
    } catch (err) {
      alert('Failed to revoke device');
    }
  };

  const maxDevices = subscription?.plan?.deviceLimit || 1;

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-2">
            <ShieldCheck className="w-7 h-7 text-purple-400" />
            Registered Devices
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Manage devices authorized to download and stream videos on your account
          </p>
        </div>

        <button
          onClick={handleRegisterCurrent}
          disabled={registering || devices.length >= maxDevices}
          className="px-4 py-2 rounded-xl text-xs font-semibold btn-primary flex items-center gap-1.5 self-start disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          <span>{registering ? 'Registering...' : 'Register This Device'}</span>
        </button>
      </div>

      {/* Device Limit Status Banner */}
      <div className="p-4 rounded-2xl glass-card border border-purple-500/30 flex items-center justify-between text-xs">
        <div>
          <p className="font-semibold text-white">Device Limit Allowance</p>
          <p className="text-[11px] text-gray-400 mt-0.5">
            Your {subscription?.plan?.displayName || 'Free Starter'} plan supports up to {maxDevices} device{maxDevices > 1 ? 's' : ''}.
          </p>
        </div>
        <div className="text-right">
          <span className="text-sm font-extrabold text-purple-300">
            {devices.length} / {maxDevices}
          </span>
          <p className="text-[10px] text-gray-500">Registered</p>
        </div>
      </div>

      {/* Devices List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-gray-400">Loading registered devices...</div>
        ) : devices.length === 0 ? (
          <div className="glass-card rounded-2xl p-8 text-center space-y-2">
            <p className="text-xs text-gray-300">No registered devices found.</p>
            <p className="text-[11px] text-gray-500">Click "Register This Device" above to authorize your current browser session.</p>
          </div>
        ) : (
          devices.map((device) => (
            <div
              key={device.id}
              className="glass-card p-4 rounded-2xl flex items-center justify-between gap-4 border border-white/5"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-600/20 text-purple-400 flex items-center justify-center">
                  {device.deviceName.includes('Mobile') ? (
                    <Smartphone className="w-5 h-5" />
                  ) : (
                    <Laptop className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">{device.deviceName}</h4>
                  <p className="text-[11px] text-gray-400 font-mono">
                    ID: {device.deviceIdentifier} • Active {new Date(device.lastActiveAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <button
                onClick={() => handleRevoke(device.id)}
                className="p-2 text-gray-500 hover:text-red-400 hover:bg-white/5 rounded-lg transition-colors"
                title="Revoke Device"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
