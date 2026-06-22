'use client';

import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  DatabaseBackup, Download, Upload, Shield, Clock,
  HardDrive, AlertTriangle, CheckCircle2, FileJson,
  History, Info,
} from 'lucide-react';
import { toast } from 'sonner';

interface BackupInfo {
  exams: number;
  answerKeys: number;
  omrSheets: number;
  results: number;
  settings: number;
  totalRecords: number;
  exportDate: string;
  size?: string;
}

interface BackupRecord {
  id: string;
  date: string;
  records: number;
  size: string;
}

export function BackupPage() {
  const [creating, setCreating] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [backupInfo, setBackupInfo] = useState<BackupInfo | null>(null);
  const [backupHistory, setBackupHistory] = useState<BackupRecord[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchBackupInfo = async () => {
    try {
      const res = await fetch('/api/backup');
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setBackupInfo(data.info || data);
      if (data.history) setBackupHistory(data.history);
    } catch {
      // Backup info endpoint might not have info yet
    }
  };

  const handleCreateBackup = async () => {
    try {
      setCreating(true);
      const res = await fetch('/api/backup', { method: 'GET' });
      if (!res.ok) throw new Error('Failed to create backup');
      const data = await res.json();

      // Create and download JSON file
      const jsonStr = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      link.href = url;
      link.download = `defencetrack-backup-${timestamp}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      // Add to history
      const newRecord: BackupRecord = {
        id: Date.now().toString(),
        date: new Date().toLocaleString(),
        records: data.info?.totalRecords || 0,
        size: (blob.size / 1024).toFixed(1) + ' KB',
      };
      setBackupHistory((prev) => [newRecord, ...prev]);
      setBackupInfo(data.info || null);

      toast.success('Backup created and downloaded successfully!');
    } catch {
      toast.error('Failed to create backup');
    } finally {
      setCreating(false);
    }
  };

  const handleRestore = async () => {
    if (!restoreFile) {
      toast.error('Please select a backup file first');
      return;
    }

    try {
      setRestoring(true);
      const formData = new FormData();
      formData.append('file', restoreFile);

      const res = await fetch('/api/backup', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to restore backup');
      }

      const data = await res.json();
      setBackupInfo(data.info || null);
      toast.success(`Backup restored successfully! ${data.message || ''}`);
      setRestoreFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to restore backup');
    } finally {
      setRestoring(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.json')) {
        toast.error('Please select a JSON backup file');
        return;
      }
      setRestoreFile(file);
      toast.success(`Selected: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Backup & Restore</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Create backups of all data and restore from backup files
        </p>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="gap-0 py-4 px-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-md bg-chart-1/10">
              <Shield className="h-4 w-4 text-chart-1" />
            </div>
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</span>
          </div>
          <p className="text-lg font-bold text-chart-1">Protected</p>
          <p className="text-xs text-muted-foreground mt-1">Data backed up locally</p>
        </Card>

        <Card className="gap-0 py-4 px-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-md bg-chart-2/10">
              <HardDrive className="h-4 w-4 text-chart-2" />
            </div>
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Records</span>
          </div>
          <p className="text-lg font-bold">{backupInfo?.totalRecords || '—'}</p>
          <p className="text-xs text-muted-foreground mt-1">Across all tables</p>
        </Card>

        <Card className="gap-0 py-4 px-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-md bg-chart-4/10">
              <History className="h-4 w-4 text-chart-4" />
            </div>
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Backups</span>
          </div>
          <p className="text-lg font-bold">{backupHistory.length}</p>
          <p className="text-xs text-muted-foreground mt-1">This session</p>
        </Card>

        <Card className="gap-0 py-4 px-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-md bg-chart-1/10">
              <Clock className="h-4 w-4 text-chart-1" />
            </div>
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Last Backup</span>
          </div>
          <p className="text-lg font-bold">
            {backupHistory.length > 0 ? backupHistory[0].date : 'Never'}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {backupHistory.length > 0 ? backupHistory[0].size : 'No backup yet'}
          </p>
        </Card>
      </div>

      {/* Backup Info */}
      {backupInfo && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <DatabaseBackup className="h-4 w-4 text-chart-1" />
              Current Database Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
              {[
                { label: 'Exams', value: backupInfo.exams, icon: '📋' },
                { label: 'Answer Keys', value: backupInfo.answerKeys, icon: '🔑' },
                { label: 'OMR Sheets', value: backupInfo.omrSheets, icon: '📄' },
                { label: 'Results', value: backupInfo.results, icon: '📊' },
                { label: 'Settings', value: backupInfo.settings, icon: '⚙️' },
              ].map((item) => (
                <div key={item.label} className="text-center p-3 rounded-lg bg-chart-1/5">
                  <span className="text-xl">{item.icon}</span>
                  <p className="text-lg font-bold text-chart-1 mt-1">{item.value}</p>
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create Backup */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Download className="h-4 w-4 text-chart-1" />
            Create Backup
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">
                Download a complete backup of all application data as a JSON file.
                This includes exams, answer keys, OMR sheets, results, and settings.
              </p>
            </div>
            <Button
              onClick={handleCreateBackup}
              disabled={creating}
              className="bg-chart-1 hover:bg-chart-1/90 text-white"
            >
              <DatabaseBackup className="h-4 w-4 mr-2" />
              {creating ? 'Creating...' : 'Create & Download Backup'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Restore Backup */}
      <Card className="border-destructive/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2 text-destructive">
            <Upload className="h-4 w-4" />
            Restore Backup
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-2 p-3 bg-destructive/5 rounded-lg border border-destructive/20">
              <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-destructive">Warning</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Restoring a backup will <strong>overwrite all current data</strong>.
                  This action cannot be undone. Please make sure you have a current backup before restoring.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full sm:w-auto"
                >
                  <FileJson className="h-4 w-4 mr-2" />
                  {restoreFile ? restoreFile.name : 'Select Backup File (.json)'}
                </Button>
                {restoreFile && (
                  <p className="text-xs text-muted-foreground mt-2 ml-2">
                    File size: {(restoreFile.size / 1024).toFixed(1)} KB
                  </p>
                )}
              </div>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    disabled={!restoreFile || restoring}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {restoring ? 'Restoring...' : 'Restore Backup'}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently replace all current data with the data from the backup file
                      &quot;{restoreFile?.name}&quot;. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleRestore}
                      className="bg-destructive hover:bg-destructive/90"
                    >
                      Yes, Restore Backup
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Backup History */}
      {backupHistory.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <History className="h-4 w-4 text-chart-1" />
              Session Backup History
              <Badge variant="secondary" className="ml-auto">{backupHistory.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {backupHistory.map((record) => (
                <div
                  key={record.id}
                  className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-lg bg-chart-1/5 border border-chart-1/10"
                >
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-4 w-4 text-chart-1" />
                    <div>
                      <p className="text-sm font-medium">Backup Created</p>
                      <p className="text-xs text-muted-foreground">{record.date}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="text-xs">
                      {record.records} records
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {record.size}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info Card */}
      <Card className="bg-chart-1/5 border-chart-1/20">
        <CardContent className="py-4 px-5">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-chart-1 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-chart-1">Backup Best Practices</p>
              <ul className="text-xs text-muted-foreground mt-1 space-y-1 list-disc list-inside">
                <li>Create regular backups before making significant changes</li>
                <li>Store backup files in a safe, separate location</li>
                <li>Verify backup files by checking their size before restoring</li>
                <li>Keep multiple backup versions for safety</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
