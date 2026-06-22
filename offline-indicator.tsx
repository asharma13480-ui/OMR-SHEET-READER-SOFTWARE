'use client';

import { useState, useEffect, useRef } from 'react';
import { WifiOff, Wifi, CloudOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function OfflineIndicator() {
  const [mounted, setMounted] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [showBackOnline, setShowBackOnline] = useState(false);
  const wasOfflineRef = useRef(false);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setMounted(true);
    // Set actual online status only on client
    setIsOnline(navigator.onLine);
    wasOfflineRef.current = !navigator.onLine;

    const handleOnline = () => {
      if (wasOfflineRef.current) {
        setShowBackOnline(true);
        setTimeout(() => {
          setShowBackOnline(false);
          wasOfflineRef.current = false;
        }, 3000);
      }
      setIsOnline(true);
    };

    const handleOffline = () => {
      wasOfflineRef.current = true;
      setShowBackOnline(false);
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Don't render anything during SSR to prevent hydration mismatch
  if (!mounted) return null;

  return (
    <AnimatePresence mode="wait">
      {!isOnline ? (
        <motion.div
          key="offline"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="overflow-hidden"
        >
          <div className="flex items-center justify-center gap-2 bg-amber-500 px-3 py-1.5 text-xs font-medium text-white shadow-sm">
            <CloudOff className="h-3.5 w-3.5 shrink-0" />
            <span>You are offline. Some features may be limited.</span>
            <WifiOff className="h-3.5 w-3.5 shrink-0" />
          </div>
        </motion.div>
      ) : showBackOnline ? (
        <motion.div
          key="online"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="overflow-hidden"
        >
          <div className="flex items-center justify-center gap-2 bg-green-500 px-3 py-1.5 text-xs font-medium text-white shadow-sm">
            <Wifi className="h-3.5 w-3.5 shrink-0" />
            <span>You&apos;re back online!</span>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
