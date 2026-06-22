'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Shield, Key, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';

export function LicenseGate() {
  const [inputKey, setInputKey] = useState('');
  const [activating, setActivating] = useState(false);
  const [error, setError] = useState('');
  const [initAttempted, setInitAttempted] = useState(false);

  const activateLicense = useAppStore((s) => s.activateLicense);
  const validateLicense = useAppStore((s) => s.validateLicense);
  const licenseChecked = useAppStore((s) => s.licenseChecked);
  const licenseValid = useAppStore((s) => s.licenseValid);
  const appSettings = useAppStore((s) => s.appSettings);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const savedKey = localStorage.getItem('licenseKey');

    const tryAdminInit = async () => {
      try {
        const res = await fetch('/api/license/admin-init', { method: 'POST' });
        if (res.ok) {
          const data = await res.json();
          if (data.key) {
            const success = await activateLicense(data.key);
            if (success) return;
          }
        }
      } catch {
        // fall through to show form
      }
      useAppStore.setState({ licenseChecked: true });
    };

    if (savedKey) {
      validateLicense(savedKey).then((valid) => {
        if (!valid) {
          localStorage.removeItem('licenseKey');
          tryAdminInit();
        }
      });
    } else {
      tryAdminInit();
    }
  }, []);

  const formatInput = (value: string) => {
    const clean = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const parts: string[] = [];
    if (clean.length <= 2) return `DT-${clean}`;
    if (clean.startsWith('DT')) {
      const rest = clean.slice(2);
      for (let i = 0; i < rest.length && i < 12; i += 4) {
        parts.push(rest.slice(i, i + 4));
      }
    }
    if (parts.length === 0) return `DT-${clean.slice(0, 12)}`;
    return `DT-${parts.join('-')}`;
  };

  const isValidFormat = (key: string) => {
    return /^DT-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(key);
  };

  const handleActivate = async () => {
    const formatted = inputKey.trim().toUpperCase();
    if (!isValidFormat(formatted)) {
      setError('Invalid format. Use DT-XXXX-XXXX-XXXX');
      return;
    }

    setActivating(true);
    setError('');

    const success = await activateLicense(formatted);
    if (success) {
      toast.success('License activated successfully!');
    } else {
      setError('Failed to activate. Please check your key and try again.');
      toast.error('License activation failed');
    }
    setActivating(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !activating) {
      handleActivate();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatInput(e.target.value);
    setInputKey(formatted);
    if (error) setError('');
  };

  // Show loading while auto-initializing
  if (!licenseChecked) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gradient-to-br from-green-900 via-green-800 to-emerald-900">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 text-green-300 animate-spin" />
          <p className="text-green-200 text-sm font-medium">Initializing...</p>
        </div>
      </div>
    );
  }

  // If license is valid, don't render the gate
  if (licenseValid) {
    return null;
  }

  // Show the manual license entry form
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gradient-to-br from-green-900 via-green-800 to-emerald-900 p-4">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-green-700/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-emerald-600/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-green-600/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Logo & Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 shadow-2xl mb-4">
            <img
              src={appSettings.logoUrl}
              alt={appSettings.appName}
              className="w-14 h-14 object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            {appSettings.appName}
          </h1>
          <p className="text-green-200 text-sm font-semibold tracking-widest uppercase mt-1">
            {appSettings.appSubtitle}
          </p>
        </div>

        {/* License Card */}
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 shadow-2xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-green-500/20">
              <Shield className="h-5 w-5 text-green-300" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Activate Your License</h2>
              <p className="text-xs text-green-200/70">Enter your license key to continue</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-green-100 mb-1.5 block">
                License Key
              </label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-300/60" />
                <Input
                  value={inputKey}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder="DT-XXXX-XXXX-XXXX"
                  maxLength={19}
                  className="pl-10 h-12 bg-white/10 border-white/20 text-white placeholder:text-green-300/40 font-mono text-base tracking-wider focus:border-green-400 focus:ring-green-400/20"
                />
              </div>
              {error && (
                <div className="flex items-center gap-1.5 mt-2 text-red-300 text-xs">
                  <AlertCircle className="h-3.5 w-3.5" />
                  {error}
                </div>
              )}
            </div>

            <Button
              onClick={handleActivate}
              disabled={activating || !isValidFormat(inputKey)}
              className="w-full h-12 bg-green-600 hover:bg-green-500 text-white font-semibold text-base gap-2 transition-all"
            >
              {activating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Activating...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Activate License
                </>
              )}
            </Button>
          </div>

          <div className="mt-6 pt-4 border-t border-white/10">
            <p className="text-center text-xs text-green-200/50">
              Enter the license key provided by your administrator.
              <br />
              Format: <span className="font-mono text-green-200/70">DT-XXXX-XXXX-XXXX</span>
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-green-200/30 mt-6">
          &copy; {new Date().getFullYear()} {appSettings.appName} — All rights reserved
        </p>
      </div>
    </div>
  );
}
