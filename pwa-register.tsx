'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Download, X, CheckCircle2, Smartphone, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

const DISMISS_KEY = 'omr-reader-pwa-dismissed';
const INSTALLED_KEY = 'omr-reader-pwa-installed';

export function PWARegister() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [swUpdated, setSwUpdated] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [mounted, setMounted] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setMounted(true);
    setIsDismissed(localStorage.getItem(DISMISS_KEY) === 'true');
    setIsInstalled(localStorage.getItem(INSTALLED_KEY) === 'true');

    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js', { scope: '/' }).then((reg) => {
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'activated' && navigator.serviceWorker.controller) {
                setSwUpdated(true);
              }
            });
          }
        });
      }).catch(() => {/* SW registration failed, non-critical */});
    }

    // Install prompt
    const handleBeforeInstall = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      setInstallPrompt(e);
      if (!localStorage.getItem(DISMISS_KEY) && !localStorage.getItem(INSTALLED_KEY)) {
        setTimeout(() => setShowBanner(true), 3000);
      }
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowBanner(false);
      localStorage.setItem(INSTALLED_KEY, 'true');
      setInstallPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Handle install click
  const handleInstall = useCallback(async () => {
    if (!installPrompt) return;
    try {
      await installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
        localStorage.setItem(INSTALLED_KEY, 'true');
      }
      setInstallPrompt(null);
      setShowBanner(false);
    } catch {/* install prompt failed */}
  }, [installPrompt]);

  // Handle dismiss
  const handleDismiss = useCallback(() => {
    setShowBanner(false);
    setIsDismissed(true);
    localStorage.setItem(DISMISS_KEY, 'true');
  }, []);

  // Handle update
  const handleUpdate = useCallback(() => {
    setIsUpdating(true);
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
    }
    setTimeout(() => window.location.reload(), 2000);
  }, []);

  if (!mounted) return null;

  return (
    <>
      <AnimatePresence>
        {showBanner && installPrompt && !isInstalled && !isDismissed && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-[60] p-3 sm:p-4"
          >
            <div className="mx-auto max-w-lg rounded-xl border border-primary/20 bg-card p-4 shadow-lg">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-md">
                  <Smartphone className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold">Install OMR Sheet Reader</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Add to home screen for faster access &amp; offline support
                  </p>
                </div>
                <button onClick={handleDismiss} className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-muted" aria-label="Dismiss">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-3 flex gap-2">
                <Button onClick={handleInstall} size="sm" className="flex-1">
                  <Download className="mr-2 h-4 w-4" />
                  Install App
                </Button>
                <Button onClick={handleDismiss} variant="outline" size="sm">
                  Not now
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {swUpdated && (
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed top-0 left-0 right-0 z-[60] p-2"
          >
            <div className="mx-auto max-w-lg rounded-lg border border-border bg-card px-4 py-2.5 shadow-md">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <RefreshCw className={`h-4 w-4 text-primary ${isUpdating ? 'animate-spin' : ''}`} />
                  <span className="text-sm font-medium">Update available</span>
                </div>
                <Button onClick={handleUpdate} size="sm" variant="outline" className="h-7">
                  Update Now
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
