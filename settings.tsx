'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Settings, Building2, GraduationCap, Eye, RotateCcw,
  Save, CheckCircle2, Loader2, Paintbrush, Type, Layout,
  Upload, ImageIcon, RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAppStore, DEFAULT_APP_SETTINGS, type AppSettings } from '@/lib/store';

interface AppSettingsData {
  appName: string;
  appSubtitle: string;
  welcomeText: string;
  welcomeDescription: string;
  primaryColor: string;
  accentColor: string;
  sidebarColor: string;
  logoUrl: string;
  organizationName: string;
  defaultPassingPercent: number;
  defaultNegativeMarking: number;
  defaultOptionsPerQuestion: number;
  gradeA: string;
  gradeB: string;
  gradeC: string;
  gradeD: string;
  gradeF: string;
  showRank: boolean;
  showPercentage: boolean;
  decimalPlaces: number;
}

const DEFAULT_SETTINGS: AppSettingsData = {
  appName: 'OMR Sheet Reader',
  appSubtitle: 'OMR Pro',
  welcomeText: 'Welcome to OMR Sheet Reader',
  welcomeDescription:
    'Professional OMR Sheet Evaluation & Analytics System.',
  primaryColor: '#008000',
  accentColor: '#b0d020',
  sidebarColor: '#002200',
  logoUrl: '/logo.png',
  organizationName: 'Defence Examination Board',
  defaultPassingPercent: 33,
  defaultNegativeMarking: 0,
  defaultOptionsPerQuestion: 4,
  gradeA: '80-100',
  gradeB: '60-79',
  gradeC: '40-59',
  gradeD: '33-39',
  gradeF: '0-32',
  showRank: true,
  showPercentage: true,
  decimalPlaces: 2,
};

export function SettingsPage() {
  const [settings, setSettings] = useState<AppSettingsData>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const storeUpdateAppSettings = useAppStore((s) => s.updateAppSettings);
  const storeFetchAppSettings = useAppStore((s) => s.fetchAppSettings);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/settings');
      if (!res.ok) throw new Error('Failed to fetch settings');
      const data = await res.json();
      if (data && Object.keys(data).length > 0) {
        setSettings({ ...DEFAULT_SETTINGS, ...data });
      }
    } catch {
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (section: string, data: Record<string, unknown>) => {
    try {
      setSaving(section);
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to save settings');
      toast.success(`${section} settings saved successfully!`);

      // Update the global store for branding/theme changes
      const brandingKeys: (keyof AppSettings)[] = [
        'appName', 'appSubtitle', 'welcomeText', 'welcomeDescription',
        'primaryColor', 'accentColor', 'sidebarColor', 'logoUrl',
      ];
      const hasBrandingUpdate = brandingKeys.some((k) => k in data);
      if (hasBrandingUpdate) {
        const partial: Partial<AppSettings> = {};
        for (const k of brandingKeys) {
          if (k in data) {
            (partial as Record<string, unknown>)[k] = data[k];
          }
        }
        storeUpdateAppSettings(partial);
      }

      // Reload all settings from DB to ensure persistence across page reloads
      await storeFetchAppSettings();
    } catch {
      toast.error(`Failed to save ${section.toLowerCase()} settings`);
    } finally {
      setSaving(null);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error('File too large. Max 2MB.');
      return;
    }

    const allowedTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Invalid file type. Use PNG, JPG, WEBP, or SVG.');
      return;
    }

    try {
      setUploadingLogo(true);
      const formData = new FormData();
      formData.append('logo', file);
      const res = await fetch('/api/settings/logo', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();

      setSettings((prev) => ({ ...prev, logoUrl: data.logoUrl }));
      storeUpdateAppSettings({ logoUrl: data.logoUrl });
      // Reload all settings from DB to ensure persistence
      await storeFetchAppSettings();
      toast.success('Logo uploaded successfully!');
    } catch {
      toast.error('Failed to upload logo');
    } finally {
      setUploadingLogo(false);
      // Reset input so the same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleReset = async () => {
    setSettings(DEFAULT_SETTINGS);
    storeUpdateAppSettings({
      appName: DEFAULT_SETTINGS.appName,
      appSubtitle: DEFAULT_SETTINGS.appSubtitle,
      primaryColor: DEFAULT_SETTINGS.primaryColor,
      accentColor: DEFAULT_SETTINGS.accentColor,
      sidebarColor: DEFAULT_SETTINGS.sidebarColor,
      logoUrl: DEFAULT_SETTINGS.logoUrl,
    });
    // Persist defaults to DB immediately
    try {
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appName: DEFAULT_SETTINGS.appName,
          appSubtitle: DEFAULT_SETTINGS.appSubtitle,
          welcomeText: DEFAULT_SETTINGS.welcomeText,
          welcomeDescription: DEFAULT_SETTINGS.welcomeDescription,
          primaryColor: DEFAULT_SETTINGS.primaryColor,
          accentColor: DEFAULT_SETTINGS.accentColor,
          sidebarColor: DEFAULT_SETTINGS.sidebarColor,
          logoUrl: DEFAULT_SETTINGS.logoUrl,
        }),
      });
      toast.success('Settings reset to defaults and saved.');
    } catch {
      toast.info('Settings reset locally. Click Save to apply.');
    }
  };

  const handleResetColors = async () => {
    const defaults = DEFAULT_APP_SETTINGS;
    setSettings((prev) => ({
      ...prev,
      primaryColor: defaults.primaryColor,
      accentColor: defaults.accentColor,
      sidebarColor: defaults.sidebarColor,
    }));
    storeUpdateAppSettings({
      primaryColor: defaults.primaryColor,
      accentColor: defaults.accentColor,
      sidebarColor: defaults.sidebarColor,
    });
    // Persist color defaults to DB immediately
    try {
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          primaryColor: defaults.primaryColor,
          accentColor: defaults.accentColor,
          sidebarColor: defaults.sidebarColor,
        }),
      });
      toast.success('Colors reset to defaults and saved.');
    } catch {
      toast.info('Colors reset locally. Click Save Theme to persist.');
    }
  };

  const updateSetting = <K extends keyof AppSettingsData>(key: K, value: AppSettingsData[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="space-y-6">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure branding, theme, and application preferences
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleReset}>
          <RotateCcw className="h-4 w-4 mr-2" />
          Reset to Defaults
        </Button>
      </div>

      {/* ===== BRANDING SECTION ===== */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Paintbrush className="h-4 w-4 text-primary" />
                Branding
              </CardTitle>
              <CardDescription>Customize app name, subtitle, and logo</CardDescription>
            </div>
            <Button
              size="sm"
              onClick={() =>
                saveSettings('Branding', {
                  appName: settings.appName,
                  appSubtitle: settings.appSubtitle,
                  logoUrl: settings.logoUrl,
                })
              }
              disabled={saving === 'Branding'}
            >
              {saving === 'Branding' ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Logo Upload */}
          <div className="space-y-2">
            <Label>App Logo</Label>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl bg-muted border-2 border-dashed border-muted-foreground/25 flex items-center justify-center overflow-hidden flex-shrink-0">
                <img
                  src={settings.logoUrl}
                  alt="Logo preview"
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
              <div className="space-y-2 flex-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  className="hidden"
                  onChange={handleLogoUpload}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingLogo}
                >
                  {uploadingLogo ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4 mr-2" />
                  )}
                  {uploadingLogo ? 'Uploading...' : 'Upload Logo'}
                </Button>
                <p className="text-xs text-muted-foreground">
                  PNG, JPG, WEBP, or SVG. Max 2MB. Recommended: 128×128px.
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* App Name & Subtitle */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="appName">App Name</Label>
              <Input
                id="appName"
                value={settings.appName}
                onChange={(e) => updateSetting('appName', e.target.value)}
                placeholder="DefenceTrack"
              />
              <p className="text-xs text-muted-foreground">Shown in sidebar, header, and footer</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="appSubtitle">App Subtitle</Label>
              <Input
                id="appSubtitle"
                value={settings.appSubtitle}
                onChange={(e) => updateSetting('appSubtitle', e.target.value)}
                placeholder="OMR Pro"
              />
              <p className="text-xs text-muted-foreground">Shown below the app name in sidebar</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ===== THEME SECTION ===== */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-primary" />
                Color Theme
              </CardTitle>
              <CardDescription>Customize the application color scheme</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetColors}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Reset Colors
              </Button>
              <Button
                size="sm"
                onClick={() =>
                  saveSettings('Theme', {
                    primaryColor: settings.primaryColor,
                    accentColor: settings.accentColor,
                    sidebarColor: settings.sidebarColor,
                  })
                }
                disabled={saving === 'Theme'}
              >
                {saving === 'Theme' ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {/* Primary Color */}
            <div className="space-y-2">
              <Label htmlFor="primaryColor" className="flex items-center gap-2">
                <span
                  className="w-4 h-4 rounded-full border border-border inline-block"
                  style={{ backgroundColor: settings.primaryColor }}
                />
                Primary Color
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="primaryColor"
                  type="color"
                  value={settings.primaryColor}
                  onChange={(e) => {
                    updateSetting('primaryColor', e.target.value);
                    storeUpdateAppSettings({ primaryColor: e.target.value });
                  }}
                  className="w-12 h-10 p-1 cursor-pointer"
                />
                <Input
                  value={settings.primaryColor}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
                      updateSetting('primaryColor', val);
                      storeUpdateAppSettings({ primaryColor: val });
                    }
                  }}
                  placeholder="#008000"
                  className="flex-1 font-mono text-sm"
                  maxLength={7}
                />
              </div>
              <p className="text-xs text-muted-foreground">Buttons, links, active states</p>
            </div>

            {/* Accent Color */}
            <div className="space-y-2">
              <Label htmlFor="accentColor" className="flex items-center gap-2">
                <span
                  className="w-4 h-4 rounded-full border border-border inline-block"
                  style={{ backgroundColor: settings.accentColor }}
                />
                Accent Color
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="accentColor"
                  type="color"
                  value={settings.accentColor}
                  onChange={(e) => {
                    updateSetting('accentColor', e.target.value);
                    storeUpdateAppSettings({ accentColor: e.target.value });
                  }}
                  className="w-12 h-10 p-1 cursor-pointer"
                />
                <Input
                  value={settings.accentColor}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
                      updateSetting('accentColor', val);
                      storeUpdateAppSettings({ accentColor: val });
                    }
                  }}
                  placeholder="#b0d020"
                  className="flex-1 font-mono text-sm"
                  maxLength={7}
                />
              </div>
              <p className="text-xs text-muted-foreground">Highlights, badges, accents</p>
            </div>

            {/* Sidebar Color */}
            <div className="space-y-2">
              <Label htmlFor="sidebarColor" className="flex items-center gap-2">
                <span
                  className="w-4 h-4 rounded-full border border-border inline-block"
                  style={{ backgroundColor: settings.sidebarColor }}
                />
                Sidebar Color
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="sidebarColor"
                  type="color"
                  value={settings.sidebarColor}
                  onChange={(e) => {
                    updateSetting('sidebarColor', e.target.value);
                    storeUpdateAppSettings({ sidebarColor: e.target.value });
                  }}
                  className="w-12 h-10 p-1 cursor-pointer"
                />
                <Input
                  value={settings.sidebarColor}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
                      updateSetting('sidebarColor', val);
                      storeUpdateAppSettings({ sidebarColor: val });
                    }
                  }}
                  placeholder="#002200"
                  className="flex-1 font-mono text-sm"
                  maxLength={7}
                />
              </div>
              <p className="text-xs text-muted-foreground">Sidebar background</p>
            </div>
          </div>

          {/* Live Preview Bar */}
          <div className="mt-6 p-4 rounded-lg border border-border">
            <p className="text-xs font-medium text-muted-foreground mb-3">Live Preview</p>
            <div className="flex items-center gap-3 flex-wrap">
              <div
                className="h-8 px-4 rounded-md text-white text-sm font-medium flex items-center"
                style={{ backgroundColor: settings.primaryColor }}
              >
                Primary Button
              </div>
              <div
                className="h-8 px-4 rounded-md text-sm font-medium flex items-center"
                style={{
                  backgroundColor: settings.sidebarColor,
                  color: '#e0f0e0',
                }}
              >
                Sidebar Text
              </div>
              <div
                className="h-8 px-4 rounded-md text-sm font-medium flex items-center"
                style={{
                  backgroundColor: settings.accentColor,
                  color: '#1a2e1a',
                }}
              >
                Accent Badge
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ===== DASHBOARD SECTION ===== */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Layout className="h-4 w-4 text-primary" />
                Dashboard
              </CardTitle>
              <CardDescription>Configure dashboard welcome text</CardDescription>
            </div>
            <Button
              size="sm"
              onClick={() =>
                saveSettings('Dashboard', {
                  welcomeText: settings.welcomeText,
                  welcomeDescription: settings.welcomeDescription,
                })
              }
              disabled={saving === 'Dashboard'}
            >
              {saving === 'Dashboard' ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="welcomeText">Welcome Text</Label>
            <Input
              id="welcomeText"
              value={settings.welcomeText}
              onChange={(e) => updateSetting('welcomeText', e.target.value)}
              placeholder="Welcome to DefenceTrack OMR Pro"
            />
            <p className="text-xs text-muted-foreground">
              Stored for future dashboard customization
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="welcomeDescription">Welcome Description</Label>
            <textarea
              id="welcomeDescription"
              value={settings.welcomeDescription}
              onChange={(e) => updateSetting('welcomeDescription', e.target.value)}
              placeholder="Manage your defence examinations with precision..."
              rows={3}
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-none"
            />
          </div>
        </CardContent>
      </Card>

      {/* ===== ORGANIZATION SETTINGS ===== */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                Organization
              </CardTitle>
              <CardDescription>Organization details shown in exports</CardDescription>
            </div>
            <Button
              size="sm"
              onClick={() =>
                saveSettings('Organization', {
                  organizationName: settings.organizationName,
                })
              }
              disabled={saving === 'Organization'}
            >
              {saving === 'Organization' ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="orgName">Organization Name</Label>
              <Input
                id="orgName"
                value={settings.organizationName}
                onChange={(e) => updateSetting('organizationName', e.target.value)}
                placeholder="Defence Examination Board"
              />
              <p className="text-xs text-muted-foreground">Shown in PDF exports and reports</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ===== DEFAULT EXAM SETTINGS ===== */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-primary" />
                Default Exam Settings
              </CardTitle>
              <CardDescription>Defaults applied when creating new exams</CardDescription>
            </div>
            <Button
              size="sm"
              onClick={() =>
                saveSettings('Exam', {
                  defaultPassingPercent: settings.defaultPassingPercent,
                  defaultNegativeMarking: settings.defaultNegativeMarking,
                  defaultOptionsPerQuestion: settings.defaultOptionsPerQuestion,
                })
              }
              disabled={saving === 'Exam'}
            >
              {saving === 'Exam' ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="passingPercent">Default Passing %</Label>
              <Input
                id="passingPercent"
                type="number"
                min={0}
                max={100}
                value={settings.defaultPassingPercent}
                onChange={(e) => updateSetting('defaultPassingPercent', parseFloat(e.target.value) || 0)}
              />
              <p className="text-xs text-muted-foreground">Minimum percentage to pass</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="negMarking">Negative Marking</Label>
              <Input
                id="negMarking"
                type="number"
                min={0}
                step={0.25}
                value={settings.defaultNegativeMarking}
                onChange={(e) => updateSetting('defaultNegativeMarking', parseFloat(e.target.value) || 0)}
              />
              <p className="text-xs text-muted-foreground">Marks deducted per wrong answer</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="optionsPerQ">Options Per Question</Label>
              <Select
                value={String(settings.defaultOptionsPerQuestion)}
                onValueChange={(val) => updateSetting('defaultOptionsPerQuestion', parseInt(val))}
              >
                <SelectTrigger id="optionsPerQ">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3 Options (A, B, C)</SelectItem>
                  <SelectItem value="4">4 Options (A, B, C, D)</SelectItem>
                  <SelectItem value="5">5 Options (A, B, C, D, E)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Number of choices per question</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ===== GRADING SETTINGS ===== */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                Grading Settings
              </CardTitle>
              <CardDescription>Grade boundaries by percentage range</CardDescription>
            </div>
            <Button
              size="sm"
              onClick={() =>
                saveSettings('Grading', {
                  gradeA: settings.gradeA,
                  gradeB: settings.gradeB,
                  gradeC: settings.gradeC,
                  gradeD: settings.gradeD,
                  gradeF: settings.gradeF,
                })
              }
              disabled={saving === 'Grading'}
            >
              {saving === 'Grading' ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 md:gap-4">
            {[
              { key: 'gradeA' as const, label: 'Grade A', color: 'bg-chart-1 text-white', emoji: '🟢' },
              { key: 'gradeB' as const, label: 'Grade B', color: 'bg-chart-2 text-white', emoji: '🟡' },
              { key: 'gradeC' as const, label: 'Grade C', color: 'bg-chart-4 text-white', emoji: '🔵' },
              { key: 'gradeD' as const, label: 'Grade D', color: 'bg-amber-500 text-white', emoji: '🟠' },
              { key: 'gradeF' as const, label: 'Grade F', color: 'bg-destructive text-white', emoji: '🔴' },
            ].map((grade) => (
              <div key={grade.key} className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <span>{grade.emoji}</span>
                  {grade.label}
                </Label>
                <Input
                  value={settings[grade.key]}
                  onChange={(e) => updateSetting(grade.key, e.target.value)}
                  placeholder="e.g. 80-100"
                  className="text-center"
                />
                <p className="text-xs text-muted-foreground text-center">Percentage range</p>
              </div>
            ))}
          </div>
          <Separator className="my-4" />
          <div className="flex items-start gap-2 p-3 bg-primary/5 rounded-lg">
            <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              Enter percentage ranges in the format <code className="bg-muted px-1.5 py-0.5 rounded text-[11px]">min-max</code> (e.g., 80-100).
              Grades are assigned based on student percentages.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ===== DISPLAY SETTINGS ===== */}
      <Card>
        <CardHeader className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Eye className="h-4 w-4 text-primary" />
                Display Settings
              </CardTitle>
              <CardDescription>Control what information is shown in reports</CardDescription>
            </div>
            <Button
              size="sm"
              onClick={() =>
                saveSettings('Display', {
                  showRank: settings.showRank,
                  showPercentage: settings.showPercentage,
                  decimalPlaces: settings.decimalPlaces,
                })
              }
              disabled={saving === 'Display'}
            >
              {saving === 'Display' ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Toggle Settings */}
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-lg bg-muted/50">
                <div>
                  <Label htmlFor="showRank" className="text-sm font-medium cursor-pointer">Show Student Rank</Label>
                  <p className="text-xs text-muted-foreground">Display rank column in results and merit list</p>
                </div>
                <Switch
                  id="showRank"
                  checked={settings.showRank}
                  onCheckedChange={(checked) => updateSetting('showRank', checked)}
                />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-lg bg-muted/50">
                <div>
                  <Label htmlFor="showPercentage" className="text-sm font-medium cursor-pointer">Show Percentage</Label>
                  <p className="text-xs text-muted-foreground">Display percentage column in results</p>
                </div>
                <Switch
                  id="showPercentage"
                  checked={settings.showPercentage}
                  onCheckedChange={(checked) => updateSetting('showPercentage', checked)}
                />
              </div>
            </div>

            <Separator />

            {/* Decimal Places */}
            <div className="space-y-2">
              <Label>Decimal Places for Scores</Label>
              <Select
                value={String(settings.decimalPlaces)}
                onValueChange={(val) => updateSetting('decimalPlaces', parseInt(val))}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">0 decimal places (whole numbers)</SelectItem>
                  <SelectItem value="1">1 decimal place (e.g., 85.5)</SelectItem>
                  <SelectItem value="2">2 decimal places (e.g., 85.50)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Number of decimal places displayed for scores and percentages
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}