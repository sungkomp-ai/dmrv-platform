'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ShoppingCart, Plus, ArrowRightLeft, Ban, Briefcase, Loader2,
  FileDown, ExternalLink, CircleDot, TrendingUp, ShieldCheck,
  Layers, FileText, ArrowUpRight, Coins, RefreshCw,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';

type CreditStatus = 'Available' | 'Traded' | 'Retired';

interface MarketplaceCredit {
  id: string;
  tokenId: string;
  amount: number;
  project: string;
  methodology: string;
  location: string;
  metadata: Record<string, unknown>;
}

interface TradedCredit {
  id: string;
  tokenId: string;
  amount: number;
  buyer: string | null;
  project: string;
  tradedAt: string;
}

interface RetiredCredit {
  id: string;
  tokenId: string;
  amount: number;
  buyer: string | null;
  project: string;
  retiredAt: string;
}

interface MarketplaceSummary {
  totalCredits: number;
  availableVolume: number;
  tradedVolume: number;
  retiredVolume: number;
  availableCount: number;
  tradedCount: number;
  retiredCount: number;
}

interface Project {
  id: string;
  name: string;
}

const statusConfig: Record<CreditStatus, { className: string; dotClass: string; label: string }> = {
  Available: {
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dotClass: 'bg-emerald-500',
    label: 'Available',
  },
  Traded: {
    className: 'bg-sky-50 text-sky-700 border-sky-200',
    dotClass: 'bg-sky-500',
    label: 'Traded',
  },
  Retired: {
    className: 'bg-slate-50 text-slate-500 border-slate-200',
    dotClass: 'bg-slate-400',
    label: 'Retired',
  },
};

const methodologyColors: Record<string, string> = {
  'IPCC-2023': 'bg-violet-100 text-violet-700',
  'T-VER-FOREST': 'bg-green-100 text-green-700',
  'T-VER-AG-001': 'bg-amber-100 text-amber-700',
  'T-VER-P-CC-001': 'bg-orange-100 text-orange-700',
};

function getMethodologyClass(m: string) {
  return methodologyColors[m] || 'bg-gray-100 text-gray-600';
}

function truncateTokenId(id: string) {
  if (id.length <= 12) return id;
  return `${id.slice(0, 8)}…${id.slice(-4)}`;
}

// ── Stat Card ──────────────────────────────────────────────
function StatCard({
  icon: Icon, label, value, color, sub,
}: {
  icon: React.ElementType; label: string; value: string; color: string; sub?: string;
}) {
  return (
    <div className={`relative overflow-hidden rounded-xl border bg-white p-5 transition-shadow hover:shadow-md`}>
      <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-xl ${color}`} />
      <div className="flex items-start justify-between">
        <div className="space-y-1 pl-2">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold tracking-tight text-gray-900">{value}</p>
          {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
        </div>
        <div className={`rounded-lg p-2.5 ${color.replace('bg-', 'bg-').replace('-600', '-50')}`}>
          <Icon className={`h-5 w-5 ${color.replace('bg-', 'text-')}`} />
        </div>
      </div>
    </div>
  );
}

export default function MarketplaceView() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [available, setAvailable] = useState<MarketplaceCredit[]>([]);
  const [traded, setTraded] = useState<TradedCredit[]>([]);
  const [retired, setRetired] = useState<RetiredCredit[]>([]);
  const [summary, setSummary] = useState<MarketplaceSummary | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);

  // Mint form
  const [mintProjectId, setMintProjectId] = useState('');
  const [mintTrackType, setMintTrackType] = useState('biochar');
  const [mintAmount, setMintAmount] = useState('');
  const [minting, setMinting] = useState(false);

  // Trade form
  const [tradeId, setTradeId] = useState('');
  const [tradeBuyer, setTradeBuyer] = useState('');
  const [trading, setTrading] = useState(false);

  // Retire form
  const [retireId, setRetireId] = useState('');
  const [retiring, setRetiring] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [marketRes, projectsRes] = await Promise.all([
        fetch('/api/dmrv/marketplace'),
        fetch('/api/dmrv'),
      ]);
      if (!marketRes.ok || !projectsRes.ok) throw new Error('Failed to fetch data');

      const marketData = await marketRes.json();
      const projectsData = await projectsRes.json();

      setAvailable(marketData.marketplace?.available || []);
      setTraded(marketData.marketplace?.traded || []);
      setRetired(marketData.marketplace?.retired || []);
      setSummary(marketData.summary || null);
      setProjects((projectsData.projects || []).map((p: { id: string; name: string }) => ({ id: p.id, name: p.name })));
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to load marketplace data', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleMint = async () => {
    const amount = parseFloat(mintAmount);
    if (!mintProjectId || isNaN(amount) || amount <= 0) {
      toast({ title: 'Validation Error', description: 'Project and valid amount are required', variant: 'destructive' });
      return;
    }
    try {
      setMinting(true);
      const res = await fetch('/api/dmrv/marketplace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mint', projectId: mintProjectId, amount, trackType: mintTrackType }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Mint failed');
      }
      toast({ title: 'Credits Minted', description: `${amount.toLocaleString()} tCO2e minted successfully` });
      setMintAmount('');
      setMintProjectId('');
      await fetchData();
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed to mint credits', variant: 'destructive' });
    } finally {
      setMinting(false);
    }
  };

  const handleTrade = async () => {
    if (!tradeId) {
      toast({ title: 'Validation Error', description: 'Select a credit to trade', variant: 'destructive' });
      return;
    }
    if (!tradeBuyer.trim()) {
      toast({ title: 'Validation Error', description: 'Buyer name is required', variant: 'destructive' });
      return;
    }
    const credit = available.find((c) => c.id === tradeId);
    if (!credit) {
      toast({ title: 'Cannot Trade', description: 'Only available credits can be traded', variant: 'destructive' });
      return;
    }
    try {
      setTrading(true);
      const res = await fetch('/api/dmrv/marketplace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'trade', projectId: credit.methodology, creditId: tradeId, buyer: tradeBuyer.trim() }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Trade failed');
      }
      toast({ title: 'Credit Traded', description: `${credit.tokenId} has been traded to ${tradeBuyer.trim()}` });
      setTradeId('');
      setTradeBuyer('');
      await fetchData();
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed to trade credit', variant: 'destructive' });
    } finally {
      setTrading(false);
    }
  };

  const handleRetire = async () => {
    if (!retireId) {
      toast({ title: 'Validation Error', description: 'Select a credit to retire', variant: 'destructive' });
      return;
    }
    try {
      setRetiring(true);
      const credit = [...available, ...traded].find((c) => c.id === retireId);
      const projectId = credit ? ('methodology' in credit ? (credit as MarketplaceCredit).methodology : (credit as TradedCredit).project) : '';
      const res = await fetch('/api/dmrv/marketplace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'retire', projectId: projectId || 'unknown', creditId: retireId }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Retire failed');
      }
      toast({ title: 'Credit Retired', description: `Credit has been permanently retired` });
      setRetireId('');
      await fetchData();
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed to retire credit', variant: 'destructive' });
    } finally {
      setRetiring(false);
    }
  };

  const allCredits = [
    ...available.map((c) => ({ ...c, status: 'Available' as CreditStatus, certNumber: c.tokenId, batchId: c.tokenId, projectId: c.project, type: c.methodology, price: (c.metadata?.price as number) || 0, createdAt: '' })),
    ...traded.map((c) => ({ ...c, status: 'Traded' as CreditStatus, certNumber: c.tokenId, batchId: c.tokenId, projectId: c.project, type: '', price: 0, createdAt: c.tradedAt })),
    ...retired.map((c) => ({ ...c, status: 'Retired' as CreditStatus, certNumber: c.tokenId, batchId: c.tokenId, projectId: c.project, type: '', price: 0, createdAt: c.retiredAt })),
  ];

  const availablePct = useMemo(() => {
    if (!summary || summary.totalCredits === 0) return 0;
    return Math.round((summary.availableVolume / summary.totalCredits) * 100);
  }, [summary]);

  const tradedPct = useMemo(() => {
    if (!summary || summary.totalCredits === 0) return 0;
    return Math.round((summary.tradedVolume / summary.totalCredits) * 100);
  }, [summary]);

  const retiredPct = useMemo(() => {
    if (!summary || summary.totalCredits === 0) return 0;
    return Math.round((summary.retiredVolume / summary.totalCredits) * 100);
  }, [summary]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-40 w-full rounded-2xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-28 w-full rounded-xl" />
        </div>
        <Skeleton className="h-80 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Hero Banner ──────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 p-6 sm:p-8">
        {/* Decorative blobs */}
        <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 -left-16 h-56 w-56 rounded-full bg-teal-400/10 blur-3xl" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          {/* Title block */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/20">
                <Coins className="h-5 w-5 text-emerald-400" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Marketplace</h2>
            </div>
            <p className="text-emerald-200/70 text-sm max-w-xl leading-relaxed">
              ตลาดซื้อขายคาร์บอนเครดิตแบบ Tokenized สำหรับ Mint, Trade และ Retire เครดิตคาร์บอนจากโครงการที่ผ่านการรับรองแล้ว รองรับมาตรฐาน T-VER, Verra, Gold Standard
            </p>
            <div className="flex items-center gap-4 text-xs text-emerald-300/60">
              <span className="flex items-center gap-1.5"><CircleDot className="h-3 w-3" />{available.length} Available</span>
              <span className="flex items-center gap-1.5"><ArrowRightLeft className="h-3 w-3" />{traded.length} Traded</span>
              <span className="flex items-center gap-1.5"><ShieldCheck className="h-3 w-3" />{retired.length} Retired</span>
            </div>
          </div>

          {/* PDF Document Card */}
          <a
            href="/Tokenized-Carbon-Credit-Platform.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex-shrink-0 w-full lg:w-80 rounded-xl border border-emerald-500/20 bg-white/5 backdrop-blur-sm p-4 hover:bg-white/10 transition-all duration-200 cursor-pointer"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg bg-red-500/20">
                <FileText className="h-5 w-5 text-red-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">Tokenized Carbon Credit Platform</p>
                <p className="text-xs text-emerald-300/50 mt-0.5">เอกสารอธิบายระบบ Tokenization ครบวงจร 11 บท</p>
                <div className="flex items-center gap-1.5 mt-2 text-xs text-emerald-400 font-medium group-hover:text-emerald-300 transition-colors">
                  <FileDown className="h-3.5 w-3.5" />
                  ดาวน์โหลด PDF (17 หน้า)
                  <ArrowUpRight className="h-3 w-3 ml-auto transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </div>
              </div>
            </div>
          </a>
        </div>
      </div>

      {/* ── Stats Cards ──────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Layers}
          label="Available"
          value={(summary?.availableVolume ?? 0).toLocaleString()}
          color="bg-emerald-600"
          sub={`${summary?.availableCount ?? 0} batches · tCO2e`}
        />
        <StatCard
          icon={ArrowRightLeft}
          label="Traded"
          value={(summary?.tradedVolume ?? 0).toLocaleString()}
          color="bg-sky-600"
          sub={`${summary?.tradedCount ?? 0} batches · tCO2e`}
        />
        <StatCard
          icon={ShieldCheck}
          label="Retired"
          value={(summary?.retiredVolume ?? 0).toLocaleString()}
          color="bg-slate-500"
          sub={`${summary?.retiredCount ?? 0} batches · tCO2e`}
        />
        <StatCard
          icon={TrendingUp}
          label="Total Credits"
          value={(summary?.totalCredits ?? 0).toLocaleString()}
          color="bg-teal-600"
          sub="tCO2e minted"
        />
      </div>

      {/* ── Tabs ──────────────────────────────────────── */}
      <Tabs defaultValue="listing">
        <TabsList className="bg-slate-100">
          <TabsTrigger value="listing" className="gap-1.5 data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Layers className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Credit Listing</span>
            <span className="sm:hidden">Listing</span>
          </TabsTrigger>
          <TabsTrigger value="mint" className="gap-1.5 data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Mint Credits</span>
            <span className="sm:hidden">Mint</span>
          </TabsTrigger>
          <TabsTrigger value="actions" className="gap-1.5 data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <ArrowRightLeft className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Trade / Retire</span>
            <span className="sm:hidden">Trade</span>
          </TabsTrigger>
          <TabsTrigger value="portfolio" className="gap-1.5 data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Briefcase className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Portfolio</span>
            <span className="sm:hidden">Portfolio</span>
          </TabsTrigger>
        </TabsList>

        {/* ── Tab: Credit Listing ─────────────────────── */}
        <TabsContent value="listing" className="mt-4">
          <Card className="overflow-hidden">
            <CardHeader className="bg-slate-50/80 border-b px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4 text-emerald-600" />
                    Credit Listing
                  </CardTitle>
                  <CardDescription className="mt-1">รายการเครดิตคาร์บอนทั้งหมดในระบบ Marketplace</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={fetchData} className="gap-1.5">
                  <RefreshCw className="h-3.5 w-3.5" />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="max-h-[420px]">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/50 hover:bg-slate-50/50">
                      <TableHead className="w-[180px]">Token ID</TableHead>
                      <TableHead>Project</TableHead>
                      <TableHead className="w-[130px]">Methodology</TableHead>
                      <TableHead className="text-right w-[120px]">Amount (tCO2e)</TableHead>
                      <TableHead className="text-center w-[100px]">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allCredits.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-12">
                          <Coins className="h-8 w-8 mx-auto mb-2 opacity-30" />
                          <p>No credits found</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      allCredits.map((credit) => {
                        const sc = statusConfig[credit.status];
                        return (
                          <TableRow key={credit.id} className="group">
                            <TableCell className="font-mono text-xs text-muted-foreground">
                              <span className="bg-slate-100 px-1.5 py-0.5 rounded" title={credit.batchId}>
                                {truncateTokenId(credit.batchId)}
                              </span>
                            </TableCell>
                            <TableCell className="text-sm font-medium">{credit.projectId}</TableCell>
                            <TableCell>
                              {credit.type ? (
                                <Badge variant="outline" className={`text-[10px] h-5 font-semibold ${getMethodologyClass(credit.type)}`}>
                                  {credit.type}
                                </Badge>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm font-semibold tabular-nums">
                              {credit.amount.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="outline" className={`text-[10px] h-5 gap-1 font-medium ${sc.className}`}>
                                <span className={`h-1.5 w-1.5 rounded-full ${sc.dotClass}`} />
                                {sc.label}
                              </Badge>
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
        </TabsContent>

        {/* ── Tab: Mint Credits ────────────────────────── */}
        <TabsContent value="mint" className="mt-4">
          <Card>
            <CardHeader className="bg-emerald-50/50 border-b">
              <CardTitle className="text-base flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-100">
                  <Plus className="h-4 w-4 text-emerald-700" />
                </div>
                Mint New Credits
              </CardTitle>
              <CardDescription>สร้างเครดิตคาร์บอนใหม่จากใบรับรองที่ได้รับอนุมัติแล้ว (Minting / Tokenization)</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Project</Label>
                  <Select value={mintProjectId} onValueChange={setMintProjectId}>
                    <SelectTrigger className="bg-white"><SelectValue placeholder="เลือกโครงการ" /></SelectTrigger>
                    <SelectContent>
                      {projects.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.name} ({p.id})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Track Type</Label>
                  <Select value={mintTrackType} onValueChange={setMintTrackType}>
                    <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['biochar', 'awd', 'biogas', 'solar', 'forest'].map((t) => (
                        <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Amount (tCO2e)</Label>
                  <Input type="number" placeholder="เช่น 5000" value={mintAmount} onChange={(e) => setMintAmount(e.target.value)} className="bg-white" />
                </div>
              </div>
              <Button onClick={handleMint} disabled={minting} className="bg-emerald-600 hover:bg-emerald-700 gap-2 shadow-sm">
                {minting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                {minting ? 'Minting...' : 'Mint Credits'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab: Trade / Retire ─────────────────────── */}
        <TabsContent value="actions" className="mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <Card className="overflow-hidden">
              <CardHeader className="bg-sky-50/50 border-b">
                <CardTitle className="text-base flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-md bg-sky-100">
                    <ArrowRightLeft className="h-4 w-4 text-sky-700" />
                  </div>
                  Trade Credits
                </CardTitle>
                <CardDescription>โอนเครดิตที่พร้อมซื้อขายไปยังผู้ซื้อ</CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Select Credit</Label>
                  <Select value={tradeId} onValueChange={setTradeId}>
                    <SelectTrigger className="bg-white"><SelectValue placeholder="เลือกเครดิต" /></SelectTrigger>
                    <SelectContent>
                      {available.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {truncateTokenId(c.tokenId)} — {c.amount.toLocaleString()} tCO2e
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Buyer Name</Label>
                  <Input placeholder="เช่น PTT Public Co." value={tradeBuyer} onChange={(e) => setTradeBuyer(e.target.value)} className="bg-white" />
                </div>
                <Button onClick={handleTrade} disabled={trading} className="w-full bg-sky-600 hover:bg-sky-700 gap-2 shadow-sm">
                  {trading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRightLeft className="h-4 w-4" />}
                  {trading ? 'Trading...' : 'Execute Trade'}
                </Button>
              </CardContent>
            </Card>

            <Card className="overflow-hidden">
              <CardHeader className="bg-slate-50 border-b">
                <CardTitle className="text-base flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-200">
                    <Ban className="h-4 w-4 text-slate-700" />
                  </div>
                  Retire Credits
                </CardTitle>
                <CardDescription>เกษียณเครดิตถาวร เพื่อนำไปใช้ Offset ก๊าซเรือนกระจก</CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Select Credit</Label>
                  <Select value={retireId} onValueChange={setRetireId}>
                    <SelectTrigger className="bg-white"><SelectValue placeholder="เลือกเครดิต" /></SelectTrigger>
                    <SelectContent>
                      {available.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {truncateTokenId(c.tokenId)} — {c.amount.toLocaleString()} tCO2e (Available)
                        </SelectItem>
                      ))}
                      {traded.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {truncateTokenId(c.tokenId)} — {c.amount.toLocaleString()} tCO2e (Traded)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleRetire} disabled={retiring} variant="destructive" className="w-full gap-2">
                  {retiring ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
                  {retiring ? 'Retiring...' : 'Retire Credits'}
                </Button>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  ⚠️ เครดิตที่เกษียณแล้วจะถูกถอนออกจากระบบอย่างถาวร และไม่สามารถนำกลับมาซื้อขายได้อีก
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Tab: Portfolio ───────────────────────────── */}
        <TabsContent value="portfolio" className="mt-4">
          <Card>
            <CardHeader className="bg-gradient-to-r from-slate-50 to-teal-50/30 border-b">
              <CardTitle className="text-base flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-teal-100">
                  <Briefcase className="h-4 w-4 text-teal-700" />
                </div>
                Portfolio Summary
              </CardTitle>
              <CardDescription>ภาพรวมสถานะเครดิตคาร์บอนทั้งหมดในระบบ</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              {/* Progress overview */}
              <div className="space-y-4 mb-6">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Credit Distribution</span>
                  <span>{allCredits.length} total batches</span>
                </div>
                <div className="flex h-3 overflow-hidden rounded-full bg-slate-100">
                  <div className="bg-emerald-500 transition-all duration-500" style={{ width: `${availablePct}%` }} />
                  <div className="bg-sky-500 transition-all duration-500" style={{ width: `${tradedPct}%` }} />
                  <div className="bg-slate-400 transition-all duration-500" style={{ width: `${retiredPct}%` }} />
                </div>
                <div className="flex items-center gap-5 text-xs">
                  <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />Available {availablePct}%</span>
                  <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-sky-500" />Traded {tradedPct}%</span>
                  <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-slate-400" />Retired {retiredPct}%</span>
                </div>
              </div>

              {/* Detail cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/30 p-5 text-center">
                  <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
                    <Layers className="h-5 w-5 text-emerald-600" />
                  </div>
                  <p className="text-2xl font-bold text-emerald-700 tabular-nums">{(summary?.availableVolume ?? 0).toLocaleString()}</p>
                  <p className="text-xs text-emerald-600/70 font-medium mt-0.5">Available tCO2e</p>
                  <Progress value={availablePct} className="mt-3 h-1.5 bg-emerald-100" />
                  <p className="text-[11px] text-emerald-600/50 mt-1.5">{summary?.availableCount ?? 0} batches</p>
                </div>
                <div className="rounded-xl border border-sky-200 bg-sky-50/30 p-5 text-center">
                  <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-sky-100">
                    <ArrowRightLeft className="h-5 w-5 text-sky-600" />
                  </div>
                  <p className="text-2xl font-bold text-sky-700 tabular-nums">{(summary?.tradedVolume ?? 0).toLocaleString()}</p>
                  <p className="text-xs text-sky-600/70 font-medium mt-0.5">Traded tCO2e</p>
                  <Progress value={tradedPct} className="mt-3 h-1.5 bg-sky-100" />
                  <p className="text-[11px] text-sky-600/50 mt-1.5">{summary?.tradedCount ?? 0} batches</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50/30 p-5 text-center">
                  <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-slate-200">
                    <ShieldCheck className="h-5 w-5 text-slate-600" />
                  </div>
                  <p className="text-2xl font-bold text-slate-600 tabular-nums">{(summary?.retiredVolume ?? 0).toLocaleString()}</p>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">Retired tCO2e</p>
                  <Progress value={retiredPct} className="mt-3 h-1.5 bg-slate-200" />
                  <p className="text-[11px] text-slate-400 mt-1.5">{summary?.retiredCount ?? 0} batches</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
