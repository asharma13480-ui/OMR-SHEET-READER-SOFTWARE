'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Key,
  Plus,
  Copy,
  Check,
  Search,
  Shield,
  ShieldCheck,
  ShieldX,
  Clock,
  Download,
  Trash2,
  Ban,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';

interface LicenseKeyRow {
  id: string;
  key: string;
  type: string;
  status: string;
  activatedAt: string | null;
  expiresAt: string | null;
  deviceInfo: string | null;
  activatedBy: string | null;
  maxDevices: number;
  createdAt: string;
}

function maskKey(key: string): string {
  const parts = key.split('-');
  if (parts.length !== 4) return key;
  return `****-****-****-${parts[3]}`;
}

function statusBadge(status: string) {
  switch (status) {
    case 'active':
      return <Badge className="bg-green-600 text-white border-green-600">Active</Badge>;
    case 'unused':
      return <Badge className="bg-yellow-600 text-white border-yellow-600">Unused</Badge>;
    case 'expired':
      return <Badge className="bg-red-600 text-white border-red-600">Expired</Badge>;
    case 'revoked':
      return <Badge variant="destructive">Revoked</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function typeBadge(type: string) {
  switch (type) {
    case 'trial':
      return <Badge variant="outline" className="border-amber-500 text-amber-600">Trial</Badge>;
    case 'monthly':
      return <Badge variant="outline" className="border-green-500 text-green-600">Monthly</Badge>;
    case 'yearly':
      return <Badge variant="outline" className="border-emerald-500 text-emerald-600">Yearly</Badge>;
    case 'lifetime':
      return <Badge variant="outline" className="border-purple-500 text-purple-600">Lifetime</Badge>;
    default:
      return <Badge variant="outline">{type}</Badge>;
  }
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function LicenseManagementPage() {
  const [keys, setKeys] = useState<LicenseKeyRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  // Filters
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Generate form
  const [genCount, setGenCount] = useState('10');
  const [genType, setGenType] = useState('monthly');

  // Generated keys display
  const [generatedKeys, setGeneratedKeys] = useState<string[]>([]);
  const [showGenerated, setShowGenerated] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = useState<LicenseKeyRow | null>(null);

  const limit = 50;

  const fetchKeys = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (filterStatus && filterStatus !== 'all') params.set('status', filterStatus);
      if (filterType && filterType !== 'all') params.set('type', filterType);
      if (searchQuery) params.set('search', searchQuery);

      const res = await fetch(`/api/license?${params}`);
      const data = await res.json();
      setKeys(data.keys || []);
      setTotal(data.total || 0);
    } catch {
      toast.error('Failed to load license keys');
    } finally {
      setLoading(false);
    }
  }, [page, filterStatus, filterType, searchQuery]);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await fetch('/api/license', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count: genCount, type: genType }),
      });
      const data = await res.json();
      if (data.keys) {
        setGeneratedKeys(data.keys);
        setShowGenerated(true);
        toast.success(`Generated ${data.keys.length} ${genType} license keys`);
        fetchKeys();
      } else {
        toast.error(data.error || 'Failed to generate keys');
      }
    } catch {
      toast.error('Failed to generate license keys');
    } finally {
      setGenerating(false);
    }
  };

  const handleRevoke = async (row: LicenseKeyRow) => {
    try {
      const res = await fetch('/api/license', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: row.id, action: 'revoke' }),
      });
      if (res.ok) {
        toast.success('License key revoked');
        fetchKeys();
      } else {
        toast.error('Failed to revoke key');
      }
    } catch {
      toast.error('Failed to revoke key');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch('/api/license', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: deleteTarget.id }),
      });
      if (res.ok) {
        toast.success('License key deleted');
        setDeleteTarget(null);
        fetchKeys();
      } else {
        toast.error('Failed to delete key');
      }
    } catch {
      toast.error('Failed to delete key');
    }
  };

  const copyToClipboard = async (key: string) => {
    try {
      await navigator.clipboard.writeText(key);
      setCopiedKey(key);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  const exportCSV = () => {
    const header = 'Key,Type,Status,Activated At,Expires At,Created At\n';
    const rows = keys
      .map(
        (k) =>
          `${k.key},${k.type},${k.status},${k.activatedAt || ''},${k.expiresAt || ''},${k.createdAt}`
      )
      .join('\n');
    const csv = header + rows;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `license-keys-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported');
  };

  // Stats
  const stats = {
    total: total,
    active: keys.filter((k) => k.status === 'active').length,
    unused: keys.filter((k) => k.status === 'unused').length,
    expired: keys.filter((k) => k.status === 'expired').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Key className="h-6 w-6 text-green-600" />
            License Management
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Generate, manage, and track license keys for your software
          </p>
        </div>
        <Button onClick={exportCSV} variant="outline" className="gap-2 w-fit">
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 text-green-700">
                <Key className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total Keys</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 text-green-700">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{stats.active}</p>
                <p className="text-xs text-muted-foreground">Active</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-100 text-yellow-700">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-yellow-600">{stats.unused}</p>
                <p className="text-xs text-muted-foreground">Unused</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100 text-red-700">
                <ShieldX className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">{stats.expired}</p>
                <p className="text-xs text-muted-foreground">Expired</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Generate Keys Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Plus className="h-5 w-5 text-green-600" />
            Generate New Keys
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              type="number"
              min="1"
              max="500"
              value={genCount}
              onChange={(e) => setGenCount(e.target.value)}
              placeholder="Count"
              className="w-full sm:w-32"
            />
            <Select value={genType} onValueChange={setGenType}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="trial">Trial (7 days)</SelectItem>
                <SelectItem value="monthly">Monthly (30 days)</SelectItem>
                <SelectItem value="yearly">Yearly (365 days)</SelectItem>
                <SelectItem value="lifetime">Lifetime</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={handleGenerate}
              disabled={generating}
              className="gap-2 bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto"
            >
              {generating ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Generate Keys
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Generated Keys Dialog */}
      <Dialog open={showGenerated} onOpenChange={setShowGenerated}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Generated License Keys</DialogTitle>
            <DialogDescription>
              {generatedKeys.length} {genType} key(s) generated. Click copy to copy individual keys.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>License Key</TableHead>
                  <TableHead className="w-20">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {generatedKeys.map((key, i) => (
                  <TableRow key={key}>
                    <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                    <TableCell className="font-mono text-sm">{key}</TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyToClipboard(key)}
                        className="gap-1 h-8"
                      >
                        {copiedKey === key ? (
                          <Check className="h-3.5 w-3.5 text-green-600" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                        {copiedKey === key ? 'Copied' : 'Copy'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                const allKeys = generatedKeys.join('\n');
                navigator.clipboard.writeText(allKeys);
                toast.success('All keys copied');
              }}
            >
              Copy All
            </Button>
            <Button onClick={() => setShowGenerated(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by key..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            className="pl-9"
          />
        </div>
        <Select
          value={filterStatus}
          onValueChange={(v) => {
            setFilterStatus(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="unused">Unused</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
            <SelectItem value="revoked">Revoked</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={filterType}
          onValueChange={(v) => {
            setFilterType(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="trial">Trial</SelectItem>
            <SelectItem value="monthly">Monthly</SelectItem>
            <SelectItem value="yearly">Yearly</SelectItem>
            <SelectItem value="lifetime">Lifetime</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={fetchKeys} className="gap-1">
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </Button>
      </div>

      {/* Keys Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Key</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden md:table-cell">Activated At</TableHead>
                  <TableHead className="hidden md:table-cell">Expires At</TableHead>
                  <TableHead className="hidden lg:table-cell">Device Info</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Loading license keys...
                    </TableCell>
                  </TableRow>
                ) : keys.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      <Shield className="h-8 w-8 mx-auto mb-2 opacity-40" />
                      No license keys found
                    </TableCell>
                  </TableRow>
                ) : (
                  keys.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-mono text-xs">{maskKey(row.key)}</TableCell>
                      <TableCell>{typeBadge(row.type)}</TableCell>
                      <TableCell>{statusBadge(row.status)}</TableCell>
                      <TableCell className="hidden md:table-cell text-xs">
                        {formatDate(row.activatedAt)}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-xs">
                        {formatDate(row.expiresAt)}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-xs text-muted-foreground max-w-[150px] truncate">
                        {row.deviceInfo || '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0"
                            onClick={() => copyToClipboard(row.key)}
                            title="Copy full key"
                          >
                            {copiedKey === row.key ? (
                              <Check className="h-3.5 w-3.5 text-green-600" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </Button>
                          {row.status === 'active' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 text-red-500 hover:text-red-700"
                              onClick={() => handleRevoke(row)}
                              title="Revoke key"
                            >
                              <Ban className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {row.status !== 'active' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 text-red-500 hover:text-red-700"
                              onClick={() => setDeleteTarget(row)}
                              title="Delete key"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {/* Pagination */}
          {total > limit && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <p className="text-sm text-muted-foreground">
                Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}
              </p>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  Prev
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page * limit >= total}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete License Key</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this license key? This action cannot be undone.
              <br />
              <span className="font-mono text-xs mt-1 block">{deleteTarget?.key}</span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}