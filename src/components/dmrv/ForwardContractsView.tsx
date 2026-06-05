'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Server,
  RefreshCw,
  Plus,
  FileText,
  DollarSign,
  Calendar,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Send,
  Eye,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

// --- Types ---

type ContractStatus = 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'DEFAULTED';

interface ForwardContract {
  id: string;
  projectId: string;
  sellerName: string;
  buyerName: string;
  creditAmount: number;
  pricePerUnit: number;
  totalValue: number;
  deliveryDate: string;
  status: ContractStatus;
  terms: string;
  createdAt: string;
  project: { id: string; name: string; province: string };
}

interface UpcomingDelivery {
  id: string;
  buyerName: string;
  sellerName: string;
  creditAmount: number;
  deliveryDate: string;
  status: string;
  project: { id: string; name: string; province: string };
}

interface ForwardSummary {
  total: number;
  totalContractValue: number;
  byStatus: Record<string, number>;
  upcomingDeliveriesCount: number;
  upcomingDeliveries: UpcomingDelivery[];
}

interface Project {
  id: string;
  name: string;
  province?: string;
}

// --- Constants ---

const statusStyles: Record<ContractStatus, string> = {
  DRAFT: 'bg-slate-100 text-slate-700 hover:bg-slate-100',
  ACTIVE: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100',
  COMPLETED: 'bg-blue-100 text-blue-700 hover:bg-blue-100',
  CANCELLED: 'bg-red-100 text-red-700 hover:bg-red-100',
  DEFAULTED: 'bg-red-100 text-red-800 hover:bg-red-100',
};

const statusLabels: Record<ContractStatus, string> = {
  DRAFT: 'ร่าง (Draft)',
  ACTIVE: 'ใช้งาน (Active)',
  COMPLETED: 'เสร็จสิ้น (Completed)',
  CANCELLED: 'ยกเลิก (Cancelled)',
  DEFAULTED: 'ผิดสัญญา (Defaulted)',
};

const statusIcons: Record<ContractStatus, React.ElementType> = {
  DRAFT: FileText,
  ACTIVE: CheckCircle,
  COMPLETED: CheckCircle,
  CANCELLED: XCircle,
  DEFAULTED: AlertTriangle,
};

// --- Helpers ---

function shortId(id: string): string {
  return id.length > 8 ? `FC-${id.slice(0, 6).toUpperCase()}` : id;
}

function formatCurrency(value: number, mode: 'tgo' | 'international'): string {
  if (mode === 'tgo') {
    return `฿${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `$${(value / 34.5).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function daysUntil(iso: string): number {
  const now = new Date();
  const target = new Date(iso);
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

// --- Component ---

export default function ForwardContractsView() {
  const { toast } = useToast();

  // State
  const [standardMode, setStandardMode] = useState<'tgo' | 'international'>('tgo');
  const [contracts, setContracts] = useState<ForwardContract[]>([]);
  const [summary, setSummary] = useState<ForwardSummary | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedContract, setSelectedContract] = useState<ForwardContract | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Create form state
  const [formProjectId, setFormProjectId] = useState('');
  const [formBuyer, setFormBuyer] = useState('');
  const [formSeller, setFormSeller] = useState('');
  const [formCreditAmount, setFormCreditAmount] = useState('');
  const [formPricePerUnit, setFormPricePerUnit] = useState('');
  const [formDeliveryDate, setFormDeliveryDate] = useState('');
  const [formTerms, setFormTerms] = useState('');
  const [creating, setCreating] = useState(false);

  // --- Data Fetching ---

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const [forwardRes, projectsRes] = await Promise.all([
        fetch('/api/dmrv/forward'),
        fetch('/api/dmrv'),
      ]);
      if (!forwardRes.ok) throw new Error('Failed to fetch forward contracts');
      if (!projectsRes.ok) throw new Error('Failed to fetch projects');

      const forwardData = await forwardRes.json();
      const projectsData = await projectsRes.json();

      setContracts(forwardData.contracts || []);
      setSummary(forwardData.summary || null);
      setProjects(
        (projectsData.projects || []).map((p: { id: string; name: string; province?: string }) => ({
          id: p.id,
          name: p.name,
          province: p.province,
        }))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
      toast({ title: 'Error', description: 'Failed to load forward contract data', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchData();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // --- Handlers ---

  const handleRefresh = async () => {
    setLoading(true);
    await fetchData();
    toast({ title: 'Refreshed', description: 'Forward contract data updated' });
  };

  const handleCreate = async () => {
    if (!formProjectId) {
      toast({ title: 'Validation Error', description: 'Please select a project', variant: 'destructive' });
      return;
    }
    if (!formBuyer.trim()) {
      toast({ title: 'Validation Error', description: 'Buyer name is required', variant: 'destructive' });
      return;
    }
    if (!formSeller.trim()) {
      toast({ title: 'Validation Error', description: 'Seller name is required', variant: 'destructive' });
      return;
    }
    const amount = parseFloat(formCreditAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({ title: 'Validation Error', description: 'Valid credit amount is required', variant: 'destructive' });
      return;
    }
    const price = parseFloat(formPricePerUnit);
    if (isNaN(price) || price <= 0) {
      toast({ title: 'Validation Error', description: 'Valid price per unit is required', variant: 'destructive' });
      return;
    }
    if (!formDeliveryDate) {
      toast({ title: 'Validation Error', description: 'Delivery date is required', variant: 'destructive' });
      return;
    }

    setCreating(true);
    try {
      const res = await fetch('/api/dmrv/forward', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          projectId: formProjectId,
          buyerName: formBuyer.trim(),
          sellerName: formSeller.trim(),
          creditAmount: amount,
          pricePerUnit: price,
          deliveryDate: formDeliveryDate,
          status: 'DRAFT',
          terms: formTerms || '{}',
        }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Create failed');
      }
      toast({
        title: 'Contract Created',
        description: `Forward contract for ${amount.toLocaleString()} tCO2e created as Draft`,
      });
      // Reset form
      setFormProjectId('');
      setFormBuyer('');
      setFormSeller('');
      setFormCreditAmount('');
      setFormPricePerUnit('');
      setFormDeliveryDate('');
      setFormTerms('');
      await fetchData();
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to create contract',
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  };

  const handleStatusUpdate = async (contractId: string, newStatus: ContractStatus) => {
    setActionLoading(contractId);
    try {
      const res = await fetch('/api/dmrv/forward', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update', contractId, status: newStatus }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Update failed');
      }
      toast({
        title: 'Contract Updated',
        description: `Contract ${shortId(contractId)} status changed to ${statusLabels[newStatus]}`,
      });
      await fetchData();
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to update contract',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  };

  // --- Computed ---

  const totalCreditsContracted = contracts.reduce((sum, c) => sum + c.creditAmount, 0);
  const activeValue = contracts
    .filter((c) => c.status === 'ACTIVE')
    .reduce((sum, c) => sum + c.totalValue, 0);
  const currencyLabel = standardMode === 'tgo' ? 'THB' : 'USD';

  // --- Loading Skeleton ---

  if (loading && contracts.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-56" />
            <Skeleton className="h-4 w-80 mt-2" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-8 w-24" />
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-4 text-center">
                <Skeleton className="h-8 w-16 mx-auto" />
                <Skeleton className="h-3 w-24 mx-auto mt-2" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card>
            <CardContent className="p-6">
              <Skeleton className="h-80" />
            </CardContent>
          </Card>
          <div className="lg:col-span-2">
            <Card>
              <CardContent className="p-6">
                <Skeleton className="h-80" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // --- Main Render ---

  return (
    <div className="space-y-6">
      {/* Page Title & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <Server className="h-6 w-6 text-emerald-600" />
            Forward Contracts
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Manage forward credit contracts, pricing, and delivery schedules for T-VER
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Standard Mode Toggle */}
          <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5 text-[10px]">
            <button
              onClick={() => setStandardMode('tgo')}
              className={`px-2.5 py-1 rounded-md transition-all ${
                standardMode === 'tgo'
                  ? 'bg-amber-100 text-amber-800 font-bold shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              🇹🇭 TGO/T-VER
            </button>
            <button
              onClick={() => setStandardMode('international')}
              className={`px-2.5 py-1 rounded-md transition-all ${
                standardMode === 'international'
                  ? 'bg-blue-100 text-blue-800 font-bold shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              🌐 Int&apos;l
            </button>
          </div>
          <Button variant="outline" size="sm" onClick={handleRefresh} className="gap-2">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600 shrink-0" />
            <div>
              <p className="text-sm font-medium text-red-800">Error Loading Data</p>
              <p className="text-xs text-red-600">{error}. Click Refresh to try again.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPI Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
                <FileText className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{summary?.total ?? 0}</p>
                <p className="text-xs text-muted-foreground">Total Contracts</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-50">
                <DollarSign className="h-5 w-5 text-teal-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-teal-700">
                  {formatCurrency(activeValue, standardMode)}
                </p>
                <p className="text-xs text-muted-foreground">Active Value ({currencyLabel})</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50">
                <Calendar className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-700">{summary?.upcomingDeliveriesCount ?? 0}</p>
                <p className="text-xs text-muted-foreground">Upcoming Deliveries</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-700">{totalCreditsContracted.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Total Credits (tCO2e)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status Breakdown Mini Bar */}
      {summary?.byStatus && Object.keys(summary.byStatus).length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground font-medium">Contracts by Status:</span>
          {Object.entries(summary.byStatus).map(([status, count]) => (
            <Badge
              key={status}
              variant="secondary"
              className={`text-[10px] h-5 gap-1 ${statusStyles[status as ContractStatus] || ''}`}
            >
              {statusLabels[status as ContractStatus] || status}: {count}
            </Badge>
          ))}
        </div>
      )}

      {/* Main Content: Sidebar Form + Contract Table */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Create Contract Form */}
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Plus className="h-4 w-4 text-emerald-600" />
              Create Forward Contract
            </CardTitle>
            <CardDescription>
              Draft a new forward credit agreement for T-VER projects
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Project Selector */}
            <div className="space-y-2">
              <Label>โครงการ (Project)</Label>
              <Select value={formProjectId} onValueChange={setFormProjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="เลือกโครงการ..." />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} {p.province ? `— ${p.province}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Seller & Buyer */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>ผู้ขาย (Seller)</Label>
                <Input
                  placeholder="e.g., บริษัท กรีน เอนเนอร์จี้"
                  value={formSeller}
                  onChange={(e) => setFormSeller(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>ผู้ซื้อ (Buyer)</Label>
                <Input
                  placeholder="e.g., PTT Public Co."
                  value={formBuyer}
                  onChange={(e) => setFormBuyer(e.target.value)}
                />
              </div>
            </div>

            {/* Credit Amount & Price */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>จำนวนเครดิต (Credits tCO2e)</Label>
                <Input
                  type="number"
                  placeholder="e.g., 5000"
                  value={formCreditAmount}
                  onChange={(e) => setFormCreditAmount(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>
                  ราคา/หน่วย (Price/{standardMode === 'tgo' ? 'tCO2e ฿' : 'tCO2e $'})
                </Label>
                <Input
                  type="number"
                  placeholder={standardMode === 'tgo' ? 'e.g., 500' : 'e.g., 14.50'}
                  value={formPricePerUnit}
                  onChange={(e) => setFormPricePerUnit(e.target.value)}
                />
              </div>
            </div>

            {/* Calculated Total */}
            {formCreditAmount && formPricePerUnit && (
              <div className="rounded-md bg-emerald-50 p-3 text-sm">
                <span className="text-muted-foreground">มูลค่ารวม (Total Value): </span>
                <span className="font-bold text-emerald-700">
                  {formatCurrency(
                    parseFloat(formCreditAmount || '0') * parseFloat(formPricePerUnit || '0'),
                    standardMode
                  )}
                </span>
              </div>
            )}

            {/* Delivery Date */}
            <div className="space-y-2">
              <Label>วันส่งมอบ (Delivery Date)</Label>
              <Input
                type="date"
                value={formDeliveryDate}
                onChange={(e) => setFormDeliveryDate(e.target.value)}
              />
            </div>

            {/* Terms */}
            <div className="space-y-2">
              <Label>เงื่อนไข (Terms)</Label>
              <Textarea
                placeholder="เงื่อนไขข้อตกลงสัญญา..."
                value={formTerms}
                onChange={(e) => setFormTerms(e.target.value)}
                rows={3}
              />
            </div>

            {/* Unit Info */}
            <p className="text-[10px] text-muted-foreground">
              หน่วยพื้นที่: {standardMode === 'tgo' ? 'ไร่ (1 ไร่ = 0.16 ha)' : 'ha (1 ha = 6.25 ไร่)'}
            </p>

            {/* Submit Button */}
            <Button
              onClick={handleCreate}
              disabled={creating}
              className="w-full bg-emerald-600 hover:bg-emerald-700 gap-2"
            >
              {creating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {creating ? 'กำลังสร้าง...' : 'สร้างสัญญา (Create Contract)'}
            </Button>
          </CardContent>
        </Card>

        {/* Contract List + Upcoming Deliveries */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contract Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4 text-emerald-600" />
                All Forward Contracts
              </CardTitle>
              <CardDescription>
                Complete listing of all forward credit contracts across projects
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="max-h-[480px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-[11px]">Contract ID</TableHead>
                      <TableHead className="text-[11px]">โครงการ</TableHead>
                      <TableHead className="text-[11px]">Buyer</TableHead>
                      <TableHead className="text-[11px]">Seller</TableHead>
                      <TableHead className="text-[11px]">Credits</TableHead>
                      <TableHead className="text-[11px]">Price/Unit</TableHead>
                      <TableHead className="text-[11px]">Total Value</TableHead>
                      <TableHead className="text-[11px]">Delivery</TableHead>
                      <TableHead className="text-[11px]">Status</TableHead>
                      <TableHead className="text-[11px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contracts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                          No forward contracts found. Create one using the form.
                        </TableCell>
                      </TableRow>
                    ) : (
                      contracts.map((contract) => {
                        const StatusIcon = statusIcons[contract.status] || FileText;
                        const days = daysUntil(contract.deliveryDate);
                        const isOverdue = days < 0 && contract.status === 'ACTIVE';

                        return (
                          <TableRow key={contract.id} className={isOverdue ? 'bg-red-50/50' : ''}>
                            <TableCell className="font-mono text-xs font-semibold">
                              {shortId(contract.id)}
                            </TableCell>
                            <TableCell className="text-xs max-w-[120px] truncate" title={contract.project?.name}>
                              {contract.project?.name || contract.projectId}
                            </TableCell>
                            <TableCell className="text-xs max-w-[100px] truncate" title={contract.buyerName}>
                              {contract.buyerName}
                            </TableCell>
                            <TableCell className="text-xs max-w-[100px] truncate" title={contract.sellerName}>
                              {contract.sellerName}
                            </TableCell>
                            <TableCell className="font-mono text-xs">
                              {contract.creditAmount.toLocaleString()}
                              <span className="text-[10px] text-muted-foreground ml-0.5">tCO2e</span>
                            </TableCell>
                            <TableCell className="font-mono text-xs">
                              {formatCurrency(contract.pricePerUnit, standardMode)}
                            </TableCell>
                            <TableCell className="font-mono text-xs font-semibold">
                              {formatCurrency(contract.totalValue, standardMode)}
                            </TableCell>
                            <TableCell className="text-xs">
                              <div className="flex flex-col">
                                <span>{formatDate(contract.deliveryDate)}</span>
                                {contract.status !== 'COMPLETED' && contract.status !== 'CANCELLED' && (
                                  <span
                                    className={`text-[10px] ${
                                      isOverdue
                                        ? 'text-red-600 font-bold'
                                        : days <= 30
                                          ? 'text-amber-600 font-medium'
                                          : 'text-muted-foreground'
                                    }`}
                                  >
                                    {isOverdue
                                      ? `เลยกำหนด ${Math.abs(days)} วัน`
                                      : `${days} วัน`}
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="secondary"
                                className={`text-[10px] h-5 gap-1 ${statusStyles[contract.status] || ''}`}
                              >
                                <StatusIcon className="h-3 w-3" />
                                {statusLabels[contract.status] || contract.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                {/* Activate: DRAFT → ACTIVE */}
                                {contract.status === 'DRAFT' && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleStatusUpdate(contract.id, 'ACTIVE')}
                                    disabled={actionLoading === contract.id}
                                    className="h-7 px-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                    title="Activate Contract"
                                  >
                                    {actionLoading === contract.id ? (
                                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                      <CheckCircle className="h-3.5 w-3.5" />
                                    )}
                                  </Button>
                                )}
                                {/* Complete: ACTIVE → COMPLETED */}
                                {contract.status === 'ACTIVE' && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleStatusUpdate(contract.id, 'COMPLETED')}
                                    disabled={actionLoading === contract.id}
                                    className="h-7 px-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                    title="Complete Contract"
                                  >
                                    {actionLoading === contract.id ? (
                                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                      <CheckCircle className="h-3.5 w-3.5" />
                                    )}
                                  </Button>
                                )}
                                {/* Cancel: DRAFT or ACTIVE → CANCELLED */}
                                {(contract.status === 'DRAFT' || contract.status === 'ACTIVE') && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleStatusUpdate(contract.id, 'CANCELLED')}
                                    disabled={actionLoading === contract.id}
                                    className="h-7 px-2 text-red-500 hover:text-red-600 hover:bg-red-50"
                                    title="Cancel Contract"
                                  >
                                    <XCircle className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                                {/* View Details Dialog */}
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => setSelectedContract(contract)}
                                      className="h-7 px-2 text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                                      title="View Details"
                                    >
                                      <Eye className="h-3.5 w-3.5" />
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="max-w-lg">
                                    <DialogHeader>
                                      <DialogTitle className="flex items-center gap-2">
                                        <FileText className="h-4 w-4 text-emerald-600" />
                                        Contract Details — {selectedContract ? shortId(selectedContract.id) : ''}
                                      </DialogTitle>
                                    </DialogHeader>
                                    {selectedContract && (
                                      <div className="space-y-4">
                                        <div className="grid grid-cols-2 gap-3 text-sm">
                                          <div>
                                            <span className="text-muted-foreground">Contract ID:</span>
                                            <p className="font-mono font-semibold">{shortId(selectedContract.id)}</p>
                                          </div>
                                          <div>
                                            <span className="text-muted-foreground">Status:</span>
                                            <p>
                                              <Badge
                                                variant="secondary"
                                                className={`text-[10px] h-5 gap-1 ${statusStyles[selectedContract.status] || ''}`}
                                              >
                                                {statusLabels[selectedContract.status] || selectedContract.status}
                                              </Badge>
                                            </p>
                                          </div>
                                          <div>
                                            <span className="text-muted-foreground">โครงการ:</span>
                                            <p className="font-medium">{selectedContract.project?.name || selectedContract.projectId}</p>
                                          </div>
                                          <div>
                                            <span className="text-muted-foreground">จังหวัด:</span>
                                            <p>{selectedContract.project?.province || '—'}</p>
                                          </div>
                                          <div>
                                            <span className="text-muted-foreground">ผู้ขาย:</span>
                                            <p className="font-medium">{selectedContract.sellerName}</p>
                                          </div>
                                          <div>
                                            <span className="text-muted-foreground">ผู้ซื้อ:</span>
                                            <p className="font-medium">{selectedContract.buyerName}</p>
                                          </div>
                                          <div>
                                            <span className="text-muted-foreground">จำนวนเครดิต:</span>
                                            <p className="font-semibold text-emerald-700">
                                              {selectedContract.creditAmount.toLocaleString()} tCO2e
                                            </p>
                                          </div>
                                          <div>
                                            <span className="text-muted-foreground">ราคา/หน่วย:</span>
                                            <p className="font-mono">{formatCurrency(selectedContract.pricePerUnit, standardMode)}</p>
                                          </div>
                                          <div>
                                            <span className="text-muted-foreground">มูลค่ารวม:</span>
                                            <p className="font-mono font-bold text-emerald-700">
                                              {formatCurrency(selectedContract.totalValue, standardMode)}
                                            </p>
                                          </div>
                                          <div>
                                            <span className="text-muted-foreground">วันส่งมอบ:</span>
                                            <p>{formatDate(selectedContract.deliveryDate)}</p>
                                          </div>
                                          <div className="col-span-2">
                                            <span className="text-muted-foreground">วันที่สร้าง:</span>
                                            <p>{formatDate(selectedContract.createdAt)}</p>
                                          </div>
                                        </div>
                                        {selectedContract.terms && selectedContract.terms !== '{}' && (
                                          <>
                                            <Separator />
                                            <div>
                                              <span className="text-muted-foreground text-sm">เงื่อนไข (Terms):</span>
                                              <p className="text-sm mt-1 rounded-md bg-slate-50 p-3">
                                                {selectedContract.terms}
                                              </p>
                                            </div>
                                          </>
                                        )}
                                      </div>
                                    )}
                                  </DialogContent>
                                </Dialog>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Upcoming Deliveries Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-600" />
                Upcoming Deliveries
              </CardTitle>
              <CardDescription>
                Near-term delivery schedule for active and draft contracts
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!summary?.upcomingDeliveries || summary.upcomingDeliveries.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  <Clock className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                  No upcoming deliveries scheduled
                </div>
              ) : (
                <ScrollArea className="max-h-64">
                  <div className="space-y-3">
                    {summary.upcomingDeliveries.map((delivery, idx) => {
                      const days = daysUntil(delivery.deliveryDate);
                      const isUrgent = days <= 14 && days >= 0;
                      const isOverdue = days < 0;

                      return (
                        <React.Fragment key={delivery.id}>
                          <div className="flex items-center justify-between gap-4 p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium truncate">
                                  {delivery.project?.name || 'Unknown Project'}
                                </p>
                                {isUrgent && (
                                  <Badge variant="secondary" className="text-[10px] h-5 bg-amber-100 text-amber-700 shrink-0">
                                    เร่งด่วน
                                  </Badge>
                                )}
                                {isOverdue && (
                                  <Badge variant="secondary" className="text-[10px] h-5 bg-red-100 text-red-700 shrink-0">
                                    เลยกำหนด
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                <span>ผู้ซื้อ: {delivery.buyerName}</span>
                                <span>·</span>
                                <span>ผู้ขาย: {delivery.sellerName}</span>
                                <span>·</span>
                                <span>{delivery.creditAmount.toLocaleString()} tCO2e</span>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-sm font-medium">{formatDate(delivery.deliveryDate)}</p>
                              <p
                                className={`text-[10px] font-medium ${
                                  isOverdue
                                    ? 'text-red-600'
                                    : isUrgent
                                      ? 'text-amber-600'
                                      : 'text-muted-foreground'
                                }`}
                              >
                                {isOverdue
                                  ? `${Math.abs(days)} วันที่ผ่านมา`
                                  : `${days} วัน`}
                              </p>
                            </div>
                          </div>
                          {idx < summary.upcomingDeliveries.length - 1 && <Separator />}
                        </React.Fragment>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
