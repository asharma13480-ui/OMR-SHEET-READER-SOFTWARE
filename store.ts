import { create } from 'zustand';

export type PageType =
  | 'dashboard'
  | 'create-exam'
  | 'upload-answer-key'
  | 'upload-omr'
  | 'check-omr'
  | 'results'
  | 'analytics'
  | 'merit-list'
  | 'reports'
  | 'export-pdf'
  | 'export-excel'
  | 'backup'
  | 'settings'
  | 'license-management'
  | 'help'
  | 'omr-template';

export interface AppSettings {
  appName: string;
  appSubtitle: string;
  welcomeText: string;
  welcomeDescription: string;
  primaryColor: string;
  accentColor: string;
  sidebarColor: string;
  logoUrl: string;
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  appName: 'OMR Sheet Reader',
  appSubtitle: 'OMR Pro',
  welcomeText: 'Welcome to OMR Sheet Reader',
  welcomeDescription:
    'Professional OMR Sheet Evaluation & Analytics System. Create exams, upload OMR sheets, evaluate results, and generate comprehensive reports — all in one place.',
  primaryColor: '#008000',
  accentColor: '#b0d020',
  sidebarColor: '#002200',
  logoUrl: '/logo.png',
};

function applyThemeColors(settings: AppSettings) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;

  // Primary color
  root.style.setProperty('--primary', settings.primaryColor);
  root.style.setProperty('--ring', settings.primaryColor);
  root.style.setProperty('--chart-1', settings.primaryColor);
  root.style.setProperty('--sidebar-primary', settings.primaryColor);

  // Accent color
  root.style.setProperty('--accent', settings.accentColor);
  root.style.setProperty('--chart-2', settings.accentColor);
  root.style.setProperty('--sidebar-accent-foreground', settings.accentColor);

  // Sidebar color
  root.style.setProperty('--sidebar', settings.sidebarColor);
  root.style.setProperty('--sidebar-accent', settings.sidebarColor);

  // Defence-specific custom vars
  root.style.setProperty('--color-defence', settings.primaryColor);
  root.style.setProperty('--color-defence-accent', settings.accentColor);
  root.style.setProperty('--color-defence-sidebar', settings.sidebarColor);

  // Update scrollbar thumb color
  const primaryHex = settings.primaryColor;
  root.style.setProperty('--scrollbar-thumb', primaryHex + '80');
}

function parseAppSettings(raw: Record<string, string>): AppSettings {
  return {
    appName: raw.appName || DEFAULT_APP_SETTINGS.appName,
    appSubtitle: raw.appSubtitle || DEFAULT_APP_SETTINGS.appSubtitle,
    welcomeText: raw.welcomeText || DEFAULT_APP_SETTINGS.welcomeText,
    welcomeDescription: raw.welcomeDescription || DEFAULT_APP_SETTINGS.welcomeDescription,
    primaryColor: raw.primaryColor || DEFAULT_APP_SETTINGS.primaryColor,
    accentColor: raw.accentColor || DEFAULT_APP_SETTINGS.accentColor,
    sidebarColor: raw.sidebarColor || DEFAULT_APP_SETTINGS.sidebarColor,
    logoUrl: raw.logoUrl || DEFAULT_APP_SETTINGS.logoUrl,
  };
}

export interface LicenseInfo {
  type: string;
  expiresAt: string | null;
  daysRemaining: number;
}

interface AppState {
  currentPage: PageType;
  selectedExam: string | null;
  sidebarOpen: boolean;
  appSettings: AppSettings;
  appSettingsLoaded: boolean;
  licenseKey: string | null;
  licenseValid: boolean;
  licenseInfo: LicenseInfo | null;
 licenseChecked: boolean;
  setCurrentPage: (page: PageType) => void;
  setSelectedExam: (id: string | null) => void;
  setSidebarOpen: (open: boolean) => void;
  fetchAppSettings: () => Promise<void>;
  updateAppSettings: (partial: Partial<AppSettings>) => void;
  validateLicense: (key: string) => Promise<boolean>;
  activateLicense: (key: string) => Promise<boolean>;
  deactivateLicense: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  currentPage: 'dashboard',
  selectedExam: null,
  sidebarOpen: false,
  appSettings: DEFAULT_APP_SETTINGS,
  appSettingsLoaded: false,
  licenseKey: null,
  licenseValid: false,
  licenseInfo: null,
  licenseChecked: false,
  setCurrentPage: (page) => set({ currentPage: page }),
  setSelectedExam: (id) => set({ selectedExam: id }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  fetchAppSettings: async () => {
    try {
      const res = await fetch('/api/settings');
      if (!res.ok) return;
      const raw = await res.json();
      if (raw && Object.keys(raw).length > 0) {
        const parsed = parseAppSettings(raw);
        set({ appSettings: parsed, appSettingsLoaded: true });
        applyThemeColors(parsed);
      } else {
        set({ appSettingsLoaded: true });
      }
    } catch {
      set({ appSettingsLoaded: true });
    }
  },
  updateAppSettings: (partial) => {
    const updated = { ...get().appSettings, ...partial };
    set({ appSettings: updated });
    applyThemeColors(updated);
  },
  validateLicense: async (key: string) => {
    try {
      const res = await fetch('/api/license/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key }),
      });
      const data = await res.json();
      if (data.valid) {
        set({
          licenseKey: key,
          licenseValid: true,
          licenseInfo: {
            type: data.type,
            expiresAt: data.expiresAt,
            daysRemaining: data.daysRemaining,
          },
          licenseChecked: true,
        });
        return true;
      } else {
        set({ licenseValid: false, licenseChecked: true, licenseInfo: null });
        return false;
      }
    } catch {
      set({ licenseValid: false, licenseChecked: true, licenseInfo: null });
      return false;
    }
  },
  activateLicense: async (key: string) => {
    try {
      const deviceInfo = `${navigator.userAgent}|${screen.width}x${screen.height}`;
      const res = await fetch('/api/license/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, deviceInfo }),
      });
      const data = await res.json();
      if (data.success && data.license) {
        localStorage.setItem('licenseKey', key);
        set({
          licenseKey: key,
          licenseValid: true,
          licenseInfo: {
            type: data.license.type,
            expiresAt: data.license.expiresAt,
            daysRemaining: data.license.daysRemaining,
          },
          licenseChecked: true,
        });
        return true;
      } else {
        return false;
      }
    } catch {
      return false;
    }
  },
  deactivateLicense: () => {
    localStorage.removeItem('licenseKey');
    set({
      licenseKey: null,
      licenseValid: false,
      licenseInfo: null,
      licenseChecked: true,
    });
  },
}));