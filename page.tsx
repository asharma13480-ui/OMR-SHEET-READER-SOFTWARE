'use client';

import { useEffect, useRef } from 'react';
import { useSyncExternalStore } from 'react';
import { useAppStore, PageType } from '@/lib/store';
import { Sidebar } from '@/components/layout/sidebar';
import { MobileHeader, MobileSidebar } from '@/components/layout/sidebar';
import { DashboardPage } from '@/components/pages/dashboard';
import { CreateExamPage } from '@/components/pages/create-exam';
import { UploadAnswerKeyPage } from '@/components/pages/upload-answer-key';
import { UploadOMRPage } from '@/components/pages/upload-omr';
import { CheckOMRPage } from '@/components/pages/check-omr';
import { ResultsPage } from '@/components/pages/results';
import { AnalyticsPage } from '@/components/pages/analytics';
import { MeritListPage } from '@/components/pages/merit-list';
import { ReportsPage } from '@/components/pages/reports';
import { ExportPDFPage } from '@/components/pages/export-pdf';
import { ExportExcelPage } from '@/components/pages/export-excel';
import { BackupPage } from '@/components/pages/backup';
import { SettingsPage } from '@/components/pages/settings';
import { LicenseManagementPage } from '@/components/pages/license-management';
import { OMRTemplatePage } from '@/components/pages/omr-template';
import { HelpPage } from '@/components/pages/help';
import { LicenseGate } from '@/components/license-gate';
import { PWARegister } from '@/components/pwa-register';
import { Skeleton } from '@/components/ui/skeleton';

const pageComponents: Record<PageType, React.ComponentType> = {
  'dashboard': DashboardPage,
  'create-exam': CreateExamPage,
  'upload-answer-key': UploadAnswerKeyPage,
  'upload-omr': UploadOMRPage,
  'check-omr': CheckOMRPage,
  'results': ResultsPage,
  'analytics': AnalyticsPage,
  'merit-list': MeritListPage,
  'reports': ReportsPage,
  'export-pdf': ExportPDFPage,
  'export-excel': ExportExcelPage,
  'backup': BackupPage,
  'settings': SettingsPage,
  'license-management': LicenseManagementPage,
  'omr-template': OMRTemplatePage,
  'help': HelpPage,
};

// React 18+ hydration-safe client detection (no useEffect setState)
const emptySubscribe = () => () => {};
function useIsMounted() {
  return useSyncExternalStore(emptySubscribe, () => true, () => false);
}

function AppShell() {
  const currentPage = useAppStore((s) => s.currentPage);
  const appSettings = useAppStore((s) => s.appSettings);
  const fetchAppSettings = useAppStore((s) => s.fetchAppSettings);
  const licenseValid = useAppStore((s) => s.licenseValid);
  const licenseChecked = useAppStore((s) => s.licenseChecked);
  const settingsFetched = useRef(false);
  const PageComponent = pageComponents[currentPage] || DashboardPage;

  useEffect(() => {
    if (!settingsFetched.current) {
      settingsFetched.current = true;
      fetchAppSettings();
    }
  }, [fetchAppSettings]);

  // Show gate only if license check is not complete OR license is invalid
  const showGate = !licenseChecked || (licenseChecked && !licenseValid);

  if (showGate) {
    return <LicenseGate />;
  }

  return (
    <div className="min-h-screen flex">
      <MobileSidebar />
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 bg-sidebar text-sidebar-foreground fixed inset-y-0 left-0 z-40">
        <Sidebar />
      </aside>

      {/* Main Content */}
      <div className="flex-1 lg:ml-64 min-h-screen flex flex-col pb-20 sm:pb-24">
        <MobileHeader />
        <main className="flex-1 p-4 md:p-6">
          <PageComponent />
        </main>
        <footer className="border-t border-border bg-card px-4 py-3 text-center text-xs text-muted-foreground mt-auto">
          <p>© 2025 {appSettings.appName} {appSettings.appSubtitle && `— ${appSettings.appSubtitle}`}</p>
        </footer>
      </div>
    </div>
  );
}

export default function Home() {
  const mounted = useIsMounted();

  if (!mounted) {
    return (
      <div className="min-h-screen flex">
        {/* Skeleton sidebar for SSR */}
        <aside className="hidden lg:flex lg:flex-col lg:w-64 bg-sidebar text-sidebar-foreground fixed inset-y-0 left-0 z-40">
          <div className="flex flex-col h-full">
            <div className="flex items-center gap-3 px-4 py-5 border-b border-sidebar-border">
              <Skeleton className="w-14 h-14 rounded-2xl" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-5 w-28" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
            <div className="flex-1 py-4 px-3 space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-9 w-full rounded-lg" />
              ))}
            </div>
          </div>
        </aside>

        {/* Skeleton main content */}
        <div className="flex-1 lg:ml-64 min-h-screen flex flex-col">
          <header className="lg:hidden sticky top-0 z-30 bg-sidebar h-14" />
          <main className="flex-1 p-4 md:p-6">
            <div className="space-y-4">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-24 rounded-xl" />
                ))}
              </div>
            </div>
          </main>
          <footer className="border-t border-border px-4 py-3 text-center text-xs text-muted-foreground mt-auto">
            <p>© 2025 OMR Sheet Reader</p>
          </footer>
        </div>
      </div>
    );
  }

  return (
    <>
      <AppShell />
      <PWARegister />
    </>
  );
}
