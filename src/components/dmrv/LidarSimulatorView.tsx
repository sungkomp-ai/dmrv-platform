'use client';

import React, { useState, useEffect, useCallback, useMemo, useSyncExternalStore } from 'react';
import { io, Socket } from 'socket.io-client';
import dynamic from 'next/dynamic';
import {
  Play, Square, RotateCcw, Send, Activity, BarChart3, TrendingDown,
  TrendingUp, MapPin, Zap, Clock, RefreshCw, ChevronDown,
  CheckCircle2, Shield, FileCheck, Satellite, Eye, Trees, Mountain,
  Waves, AlertTriangle, Leaf, Gauge,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ComposedChart, ReferenceLine,
} from 'recharts';

// Dynamic import for map (Leaflet requires window)
const LidarFieldMap = dynamic(() => import('./LidarFieldMap'), { ssr: false });

// ─── Types ──────────────────────────────────────────────────────────
interface LidarReading {
  tick: number;
  fieldId: string;
  timestamp: string;
  simYear: number;
  simMonth: number;
  surveyPhase: 'FLIGHT' | 'PROCESSING' | 'VERIFIED';

  // LIDAR metrics
  pointDensityPerM2: number;
  scanCoveragePct: number;
  chmMaxHeight: number;
  chmMeanHeight: number;
  canopyCoverPct: number;
  lai: number;
  treeDensityPerHa: number;

  // Biomass & Carbon (International)
  agbTonnePerHa: number;
  bgbTonnePerHa: number;
  carbonTcPerHa: number;
  co2eTonnePerHa: number;

  // TGO Standard
  tverCarbonTcPerHa: number;
  tverCo2eTonnePerHa: number;
  tverUncertaintyPct: number;

  // Area totals
  totalCarbonStockTc: number;
  totalCO2eStock: number;

  // Change detection
  annualCarbonChangeTcPerHa: number;
  deforestationHa: number;
  degradationPct: number;

  // Soil carbon (mangrove)
  soilCarbonTcPerHa: number;

  surveyComplete: boolean;
}

interface LidarFieldStatus {
  id: string;
  name: string;
  nameTh: string;
  province: string;
  lat: number;
  lng: number;
  areaHa: number;
  forestType: string;
  boundary: number[][];
  simYear: number;
  simMonth: number;
  surveyPhase: string;
  chmMeanHeight: number;
  canopyCoverPct: number;
  pointDensityPerM2: number;
  scanCoveragePct: number;
  agbTonnePerHa: number;
  carbonTcPerHa: number;
  totalCarbonStockTc: number;
  totalCO2eStock: number;
  deforestationHa: number;
  annualCarbonChangeTcPerHa: number;
  surveyComplete: boolean;
  isMangrove: boolean;
  soilCarbonTcPerHa: number;
}

interface LidarSimStatus {
  running: boolean;
  tick: number;
  simYear: number;
  simMonth: number;
  surveyPhase: string;
  totalYears: number;
  progressPct: number;
  totalReadings: number;
  fields: LidarFieldStatus[];
}

// ─── Config ─────────────────────────────────────────────────────────
const FOREST_CONFIG: Record<string, {
  color: string;
  emoji: string;
  label: string;
  shortLabel: string;
  forestEmoji: string;
}> = {
  'khao-yai': { color: '#059669', emoji: '🌴', label: 'Khao Yai (Evergreen)', shortLabel: 'Khao Yai', forestEmoji: '🌴' },
  'mae-wong': { color: '#d97706', emoji: '🍂', label: 'Mae Wong (Deciduous)', shortLabel: 'Mae Wong', forestEmoji: '🍂' },
  'samut-mangrove': { color: '#0891b2', emoji: '🌊', label: 'Samut Songkhram (Mangrove)', shortLabel: 'Mangrove', forestEmoji: '🌊' },
};

const SURVEY_PHASE_CONFIG: Record<string, { color: string; bg: string; label: string; icon: string }> = {
  FLIGHT: { color: 'text-cyan-600', bg: 'bg-cyan-50', label: 'Scanning', icon: '✈️' },
  PROCESSING: { color: 'text-amber-600', bg: 'bg-amber-50', label: 'Processing', icon: '⚙️' },
  VERIFIED: { color: 'text-emerald-600', bg: 'bg-emerald-50', label: 'Verified', icon: '✅' },
};

const mountedEmptySub = () => () => {};
function useMounted() {
  return useSyncExternalStore(mountedEmptySub, () => true, () => false);
}

// ─── Component ──────────────────────────────────────────────────────
export default function LidarSimulatorView() {
  const mounted = useMounted();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [status, setStatus] = useState<LidarSimStatus | null>(null);
  const [readings, setReadings] = useState<LidarReading[]>([]);
  const [sendingToDmrv, setSendingToDmrv] = useState(false);
  const [dMRVCount, setDMRVCount] = useState(0);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [standardMode, setStandardMode] = useState<'international' | 'tgo'>('tgo');

  // Connect to simulator
  useEffect(() => {
    if (!mounted) return;
    let s: Socket | null = null;
    try {
      s = io('/?XTransformPort=3033', { transports: ['polling', 'websocket'], reconnectionAttempts: 5, reconnectionDelay: 3000, timeout: 8000 });
      s.on('connect', () => setConnected(true));
      s.on('disconnect', () => setConnected(false));
      s.on('lidar:status', (data: LidarSimStatus) => setStatus(data));
      s.on('lidar:reading', (data: LidarReading[]) => {
        setReadings(prev => [...prev, ...data].slice(-500));
      });
      s.on('lidar:readings', (data: LidarReading[]) => {
        setReadings(data.slice(-500));
      });
      s.on('lidar:started', () => {});
      s.on('lidar:stopped', () => {});
      s.on('lidar:reset', () => setReadings([]));
      setSocket(s);
    } catch {
      // Fallback: poll via HTTP
    }

    // HTTP polling fallback — fetch status every 3s if WebSocket fails
    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch('/api/status?XTransformPort=3033');
        if (res.ok) {
          const data = await res.json();
          setStatus(data);
          setConnected(true);
        }
        const readingsRes = await fetch('/api/readings?limit=50&XTransformPort=3033');
        if (readingsRes.ok) {
          const rData = await readingsRes.json();
          const readingsArray = Array.isArray(rData) ? rData : (rData.readings || []);
          if (readingsArray.length > 0) {
            setReadings(prev => {
              const lastTick = prev.length > 0 ? prev[prev.length - 1].tick : 0;
              const newReadings = readingsArray.filter((r: LidarReading) => r.tick > lastTick);
              if (newReadings.length > 0) return [...prev, ...newReadings].slice(-500);
              return prev;
            });
          }
        }
      } catch { /* ignore */ }
    }, 3000);

    // Initial fetch
    (async () => {
      try {
        const res = await fetch('/api/status?XTransformPort=3033');
        if (res.ok) { const data = await res.json(); setStatus(data); setConnected(true); }
      } catch { /* ignore */ }
    })();

    return () => {
      if (s) s.disconnect();
      clearInterval(pollInterval);
    };
  }, [mounted]);

  const startSim = useCallback(async () => {
    if (socket?.connected) { socket.emit('lidar:start'); return; }
    try {
      await fetch('/api/control?XTransformPort=3033', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start' }),
      });
    } catch { /* ignore */ }
  }, [socket]);
  const stopSim = useCallback(async () => {
    if (socket?.connected) { socket.emit('lidar:stop'); return; }
    try {
      await fetch('/api/control?XTransformPort=3033', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stop' }),
      });
    } catch { /* ignore */ }
  }, [socket]);
  const resetSim = useCallback(async () => {
    if (socket?.connected) { socket.emit('lidar:reset'); setReadings([]); return; }
    try {
      await fetch('/api/control?XTransformPort=3033', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset' }),
      });
    } catch { /* ignore */ }
    setReadings([]);
  }, [socket]);

  // Auto-start when connected
  useEffect(() => {
    if (connected && status && !status.running) {
      const timer = setTimeout(() => startSim(), 1000);
      return () => clearTimeout(timer);
    }
  }, [connected, status?.running, startSim]);

  // Send to dMRV
  const sendToDmrv = useCallback(async () => {
    if (readings.length === 0) return;
    setSendingToDmrv(true);
    try {
      const res = await fetch('/api/dmrv/lidar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'ingest_batch', readings: readings.slice(-50) }),
      });
      if (res.ok) {
        const data = await res.json();
        setDMRVCount(prev => prev + (data.ingested || 0));
      }
    } finally { setSendingToDmrv(false); }
  }, [readings]);

  // ─── Computed Data ────────────────────────────────────────────────
  const fieldIds = useMemo(() => ['khao-yai', 'mae-wong', 'samut-mangrove'], []);

  const fieldReadings = useMemo(() => {
    const map: Record<string, LidarReading[]> = {};
    for (const fid of fieldIds) {
      map[fid] = readings.filter(r => r.fieldId === fid).slice(-200);
    }
    return map;
  }, [readings, fieldIds]);

  const latestByField = useMemo(() => {
    const map: Record<string, LidarReading | null> = {};
    for (const fid of fieldIds) {
      const arr = fieldReadings[fid];
      map[fid] = arr.length > 0 ? arr[arr.length - 1] : null;
    }
    return map;
  }, [fieldReadings, fieldIds]);

  // Chart data - grouped by tick
  const chartData = useMemo(() => {
    const tickMap: Record<number, Record<string, LidarReading>> = {};
    for (const r of readings) {
      if (!tickMap[r.tick]) tickMap[r.tick] = {};
      tickMap[r.tick][r.fieldId] = r;
    }
    return Object.entries(tickMap)
      .sort(([a], [b]) => Number(a) - Number(b))
      .slice(-100)
      .map(([tick, fields]) => {
        const entry: Record<string, number | string> = { tick: Number(tick), month: 0, year: 0 };
        for (const [fid, r] of Object.entries(fields)) {
          const cfg = FOREST_CONFIG[fid];
          if (!cfg) continue;
          const key = cfg.shortLabel;
          // Carbon stock (convert to per-rai in TGO mode)
          entry[`${key}_carbon`] = standardMode === 'tgo' ? (r.tverCarbonTcPerHa ?? r.carbonTcPerHa) * 0.16 : (r.tverCarbonTcPerHa ?? r.carbonTcPerHa);
          entry[`${key}_co2e`] = standardMode === 'tgo' ? (r.tverCo2eTonnePerHa ?? r.co2eTonnePerHa) : r.co2eTonnePerHa;
          entry[`${key}_totalCarbon`] = r.totalCarbonStockTc;
          entry[`${key}_totalCO2e`] = r.totalCO2eStock;
          // Biomass (convert to per-rai in TGO mode)
          entry[`${key}_agb`] = standardMode === 'tgo' ? r.agbTonnePerHa * 0.16 : r.agbTonnePerHa;
          entry[`${key}_bgb`] = standardMode === 'tgo' ? r.bgbTonnePerHa * 0.16 : r.bgbTonnePerHa;
          // Change detection (convert to per-rai in TGO mode)
          entry[`${key}_change`] = standardMode === 'tgo' ? r.annualCarbonChangeTcPerHa * 0.16 : r.annualCarbonChangeTcPerHa;
          entry[`${key}_deforest`] = standardMode === 'tgo' ? r.deforestationHa * 6.25 : r.deforestationHa;
          // LIDAR quality
          entry[`${key}_pointDensity`] = r.pointDensityPerM2;
          entry[`${key}_scanCoverage`] = r.scanCoveragePct;
          // Structural metrics
          entry[`${key}_height`] = r.chmMeanHeight;
          entry[`${key}_canopy`] = r.canopyCoverPct;
          entry[`${key}_lai`] = r.lai;
          // Soil carbon (convert to per-rai in TGO mode)
          entry[`${key}_soilCarbon`] = standardMode === 'tgo' ? r.soilCarbonTcPerHa * 0.16 : r.soilCarbonTcPerHa;
          // TGO uncertainty
          entry[`${key}_uncertainty`] = r.tverUncertaintyPct ?? 0;
          entry['month'] = r.simMonth;
          entry['year'] = r.simYear;
        }
        return entry;
      });
  }, [readings, standardMode]);

  // Summary stats
  const totalReadings = readings.length;
  const currentYear = status?.simYear ?? 0;
  const currentMonth = status?.simMonth ?? 0;
  const totalCarbonStock = useMemo(() => {
    if (!status?.fields) return 0;
    return status.fields.reduce((s, f) => s + (f.totalCarbonStockTc || 0), 0);
  }, [status?.fields]);
  const totalCO2eStock = useMemo(() => {
    if (!status?.fields) return 0;
    return status.fields.reduce((s, f) => s + (f.totalCO2eStock || 0), 0);
  }, [status?.fields]);
  const deforestationAlerts = useMemo(() => {
    if (!status?.fields) return 0;
    return status.fields.filter(f => f.deforestationHa > 0).length;
  }, [status?.fields]);

  // Year progress (0-5 years)
  const yearProgress = useMemo(() => {
    if (!status) return 0;
    const totalMonths = (status.totalYears || 5) * 12;
    const elapsedMonths = (status.simYear || 0) * 12 + (status.simMonth || 0);
    return Math.min((elapsedMonths / totalMonths) * 100, 100);
  }, [status]);

  if (!mounted) {
    return <div className="flex items-center justify-center h-64"><RefreshCw className="h-8 w-8 animate-spin text-emerald-600" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-emerald-800 via-teal-700 to-cyan-700 p-6 text-white">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-4 right-10 text-8xl">🌴</div>
          <div className="absolute bottom-2 left-20 text-6xl">🌲</div>
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <Trees className="h-7 w-7" />
            <h2 className="text-2xl font-bold">LIDAR Carbon Credit Verification</h2>
            <Badge className="bg-white/20 text-white hover:bg-white/30 text-xs">5-Year Monitoring</Badge>
            <Badge className="bg-amber-500/80 text-white text-[9px]">T-VER-P-FOR-001</Badge>
            <div className="flex items-center gap-1 bg-white/10 rounded-lg p-0.5 text-[10px]">
              <button
                onClick={() => setStandardMode('tgo')}
                className={`px-2.5 py-1 rounded-md transition-all ${standardMode === 'tgo' ? 'bg-white/25 font-bold' : 'hover:bg-white/10'}`}
              >
                🇹🇭 TGO/T-VER
              </button>
              <button
                onClick={() => setStandardMode('international')}
                className={`px-2.5 py-1 rounded-md transition-all ${standardMode === 'international' ? 'bg-white/25 font-bold' : 'hover:bg-white/10'}`}
              >
                🌐 International
              </button>
            </div>
          </div>
          <p className="text-sm text-white/80 mb-1">
            LIDAR-based forest carbon stock monitoring across 3 Thai forest areas with 5-year verification cycle
          </p>
          <p className="text-[10px] text-white/60 mb-4">
            {standardMode === 'tgo'
              ? 'อ้างอิงมาตรฐาน: T-VER-P-FOR-001 (ป่าไม้) / T-VER-BC-001 (Blue Carbon) | Thai allometric equations (Ogawa et al.) | CF: 0.47 evergreen, 0.49 mangrove | หน่วย: tC/ไร่, tCO₂e, พื้นที่: ไร่ (1 ไร่ = 0.16 ha)'
              : 'Reference: IPCC 2006 GL Vol. 4 | Verra VCS VM0047 | Gold Standard | IPCC allometric equations | CF = 0.47 default | ISO 14064-2 | Units: tC/ha, tCO₂e/ha'
            }
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Button size="sm" onClick={startSim} disabled={status?.running} className="bg-white/20 hover:bg-white/30 text-white border-white/30">
              <Play className="h-3.5 w-3.5 mr-1" /> Start
            </Button>
            <Button size="sm" variant="outline" onClick={stopSim} disabled={!status?.running} className="border-white/30 text-white hover:bg-white/20">
              <Square className="h-3.5 w-3.5 mr-1" /> Stop
            </Button>
            <Button size="sm" variant="outline" onClick={resetSim} className="border-white/30 text-white hover:bg-white/20">
              <RotateCcw className="h-3.5 w-3.5 mr-1" /> Reset
            </Button>
            <div className="w-px h-6 bg-white/30" />
            <Button size="sm" onClick={sendToDmrv} disabled={sendingToDmrv || readings.length === 0}
              className="bg-emerald-500 hover:bg-emerald-400 text-white">
              <Send className="h-3.5 w-3.5 mr-1" /> Send to dMRV
            </Button>
            <div className="flex items-center gap-2 ml-auto text-xs text-white/70">
              <div className={`h-2 w-2 rounded-full ${connected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
              {connected ? 'Connected' : 'Disconnected'}
              {status?.running && <Badge className="bg-green-500/50 text-white text-[9px] animate-pulse">LIVE</Badge>}
            </div>
          </div>
          {/* Year/Month Progress */}
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-white/70 mb-1">
              <span>Year {currentYear} / {status?.totalYears ?? 5} &middot; Month {currentMonth}/12</span>
              <span>1 sec = 1 month simulated</span>
            </div>
            <Progress value={yearProgress} className="h-1.5 bg-white/20" />
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { icon: Satellite, label: 'LIDAR Scans', value: totalReadings.toLocaleString(), color: 'text-cyan-600', bg: 'bg-cyan-50' },
          { icon: Clock, label: 'Survey Year', value: `${currentYear}/${status?.totalYears ?? 5}`, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { icon: Trees, label: standardMode === 'tgo' ? 'Total Carbon (tC)' : 'Total Carbon (tC)', value: totalCarbonStock.toFixed(1), color: 'text-green-600', bg: 'bg-green-50' },
          { icon: Leaf, label: 'Total CO\u2082e', value: totalCO2eStock.toFixed(1), color: 'text-teal-600', bg: 'bg-teal-50' },
          { icon: AlertTriangle, label: 'Deforestation', value: deforestationAlerts, color: 'text-red-600', bg: 'bg-red-50' },
          { icon: Send, label: 'dMRV Sent', value: dMRVCount, color: 'text-purple-600', bg: 'bg-purple-50' },
        ].map(s => (
          <Card key={s.label} className="shadow-none">
            <CardContent className="p-3 flex items-center gap-3">
              <div className={`h-9 w-9 rounded-xl ${s.bg} flex items-center justify-center shrink-0`}>
                <s.icon className={`h-4 w-4 ${s.color}`} />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground font-medium">{s.label}</p>
                <p className="text-lg font-bold leading-none">{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Methodology Reference Card */}
      <Card className={standardMode === 'tgo' ? 'border-amber-200 bg-amber-50/50' : 'border-blue-200 bg-blue-50/50'}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${standardMode === 'tgo' ? 'bg-amber-100' : 'bg-blue-100'}`}>
              <Shield className={`h-4 w-4 ${standardMode === 'tgo' ? 'text-amber-600' : 'text-blue-600'}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <p className={`text-sm font-bold ${standardMode === 'tgo' ? 'text-amber-800' : 'text-blue-800'}`}>
                  {standardMode === 'tgo' ? 'TGO/T-VER Methodology Reference' : 'International Standard Reference'}
                </p>
                <Badge className={`${standardMode === 'tgo' ? 'bg-amber-200 text-amber-800' : 'bg-blue-200 text-blue-800'} text-[9px] h-4`}>
                  {standardMode === 'tgo' ? 'T-VER-P-FOR-001' : 'IPCC 2006/VCS'}
                </Badge>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[10px]">
                {standardMode === 'tgo' ? (
                  <div className="text-amber-700">
                    <p className="font-semibold mb-0.5">Allometric Equations (Thai)</p>
                    <p>Ogawa et al. (Evergreen forest)</p>
                    <p>Tsuji et al. (Deciduous forest)</p>
                    <p>Komiyama et al. (Mangrove)</p>
                  </div>
                ) : (
                  <div className="text-blue-700">
                    <p className="font-semibold mb-0.5">Allometric Equations (IPCC)</p>
                    <p>IPCC 2006 GL Vol. 4 Ch. 4</p>
                    <p>Generic tropical equations</p>
                    <p>Biomass expansion factor (BEF)</p>
                  </div>
                )}
                {standardMode === 'tgo' ? (
                  <div className="text-amber-700">
                    <p className="font-semibold mb-0.5">Carbon Fraction & GWP</p>
                    <p>CF: 0.47 (Evergreen), 0.49 (Mangrove)</p>
                    <p>Uncertainty deduction applied</p>
                    <p>Units: tC/ไร่, tCO\u2082e (1 ไร่ = 0.16 ha)</p>
                  </div>
                ) : (
                  <div className="text-blue-700">
                    <p className="font-semibold mb-0.5">Carbon Fraction & GWP</p>
                    <p>CF = 0.47 default (IPCC)</p>
                    <p>Verra VCS VM0047</p>
                    <p>Units: tC/ha, tCO\u2082e/ha</p>
                  </div>
                )}
                {standardMode === 'tgo' ? (
                  <div className="text-amber-700">
                    <p className="font-semibold mb-0.5">T-VER Credit Calculation</p>
                    <p>ΔC = (C_project - C_baseline) × Area</p>
                    <p>Deduction: uncertainty × buffer%</p>
                    <p>Blue Carbon: T-VER-BC-001 (mangrove)</p>
                  </div>
                ) : (
                  <div className="text-blue-700">
                    <p className="font-semibold mb-0.5">Carbon Credit Calculation</p>
                    <p>ΔC = (C_project - C_baseline) × Area</p>
                    <p>ISO 14064-2 quantification</p>
                    <p>Gold Standard LUF methodology</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Map + Forest Cards Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Map (3/5 width on large) */}
        <div className="lg:col-span-3">
          <Card className="shadow-sm overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="h-4 w-4 text-emerald-600" />
                LIDAR Forest Map
                <Badge variant="secondary" className="text-[9px] h-4">3 Sites</Badge>
                {selectedFieldId && (
                  <Badge className="text-[9px] h-4" style={{ background: FOREST_CONFIG[selectedFieldId]?.color + '20', color: FOREST_CONFIG[selectedFieldId]?.color }}>
                    {FOREST_CONFIG[selectedFieldId]?.shortLabel}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div style={{ height: 440 }}>
                <LidarFieldMap
                  fields={(status?.fields || []).map(f => ({
                    ...f,
                    nameTh: f.nameTh || f.name,
                  }))}
                  latestReadings={latestByField}
                  selectedFieldId={selectedFieldId}
                  onFieldSelect={setSelectedFieldId}
                  standardMode={standardMode}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Forest Info Sidebar (2/5 width on large) */}
        <div className="lg:col-span-2 space-y-3">
          {fieldIds.map(fid => {
            const cfg = FOREST_CONFIG[fid];
            const field = status?.fields.find(f => f.id === fid);
            const latest = latestByField[fid];
            const surveyPhase = (latest?.surveyPhase || field?.surveyPhase || 'FLIGHT') as keyof typeof SURVEY_PHASE_CONFIG;
            const phaseCfg = SURVEY_PHASE_CONFIG[surveyPhase] || SURVEY_PHASE_CONFIG.FLIGHT;
            const yearProgressField = field ? Math.min((field.simMonth / 12) * 100, 100) : 0;
            const isSelected = selectedFieldId === fid;
            const hasDeforestation = (latest?.deforestationHa ?? field?.deforestationHa ?? 0) > 0;

            // Carbon values based on standard mode
            const carbonTcPerHa = standardMode === 'tgo'
              ? (latest?.tverCarbonTcPerHa ?? field?.carbonTcPerHa ?? 0)
              : (latest?.carbonTcPerHa ?? field?.carbonTcPerHa ?? 0);
            const co2ePerHa = standardMode === 'tgo'
              ? (latest?.tverCo2eTonnePerHa ?? field?.co2eTonnePerHa ?? 0)
              : (latest?.co2eTonnePerHa ?? field?.co2eTonnePerHa ?? 0);

            return (
              <Card
                key={fid}
                className={`shadow-sm border-l-4 cursor-pointer transition-all ${isSelected ? 'ring-2 ring-offset-1' : 'hover:shadow-md'}`}
                style={{ borderLeftColor: cfg.color, ...(isSelected ? { ringColor: cfg.color } : {}) }}
                onClick={() => setSelectedFieldId(isSelected ? null : fid)}
              >
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{cfg.forestEmoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate">{cfg.label}</p>
                      <p className="text-[10px] text-muted-foreground">{field?.forestType} &middot; {standardMode === 'tgo' ? `${((field?.areaHa ?? 0) * 6.25).toLocaleString(undefined, {maximumFractionDigits: 1})} ไร่` : `${field?.areaHa?.toLocaleString() ?? '--'} ha`}</p>
                    </div>
                    <Badge className={`${phaseCfg.bg} ${phaseCfg.color} text-[9px] h-5 shrink-0`}>
                      {phaseCfg.icon} {phaseCfg.label}
                    </Badge>
                  </div>

                  {/* Year Progress */}
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="flex items-center gap-1">
                        <span className="font-medium text-[11px]">Year {field?.simYear ?? 0}</span>
                      </span>
                      <span className="text-muted-foreground text-[10px]">Month {field?.simMonth ?? 0}/12</span>
                    </div>
                    <Progress value={yearProgressField} className="h-1.5" />
                  </div>

                  {/* Metrics Grid */}
                  <div className="grid grid-cols-4 gap-1.5 text-[10px]">
                    <div className="bg-muted/50 rounded p-1.5 text-center">
                      <Mountain className="h-2.5 w-2.5 mx-auto text-emerald-500" />
                      <div className="font-bold text-[11px]">{(latest?.chmMeanHeight ?? field?.chmMeanHeight ?? 0).toFixed(1)}</div>
                      <div className="text-[8px] text-muted-foreground">Height (m)</div>
                    </div>
                    <div className="bg-amber-50 rounded p-1.5 text-center">
                      <Leaf className="h-2.5 w-2.5 mx-auto text-amber-500" />
                      <div className="font-bold text-[11px] text-amber-700">{standardMode === 'tgo' ? ((latest?.agbTonnePerHa ?? field?.agbTonnePerHa ?? 0) * 0.16).toFixed(2) : (latest?.agbTonnePerHa ?? field?.agbTonnePerHa ?? 0).toFixed(1)}</div>
                      <div className="text-[8px] text-amber-600">{standardMode === 'tgo' ? 'AGB (t/ไร่)' : 'AGB (t/ha)'}</div>
                    </div>
                    <div className={standardMode === 'tgo' ? 'bg-green-50 rounded p-1.5 text-center' : 'bg-teal-50 rounded p-1.5 text-center'}>
                      <Trees className={`h-2.5 w-2.5 mx-auto ${standardMode === 'tgo' ? 'text-green-500' : 'text-teal-500'}`} />
                      <div className={`font-bold text-[11px] ${standardMode === 'tgo' ? 'text-green-700' : 'text-teal-700'}`}>
                        {standardMode === 'tgo' ? (carbonTcPerHa * 0.16).toFixed(3) : carbonTcPerHa.toFixed(2)}
                      </div>
                      <div className={`text-[8px] ${standardMode === 'tgo' ? 'text-green-600' : 'text-teal-600'}`}>
                        {standardMode === 'tgo' ? 'T-VER tC/ไร่' : 'tC/ha'}
                      </div>
                    </div>
                    <div className={standardMode === 'tgo' ? 'bg-amber-50 rounded p-1.5 text-center' : 'bg-cyan-50 rounded p-1.5 text-center'}>
                      <Gauge className={`h-2.5 w-2.5 mx-auto ${standardMode === 'tgo' ? 'text-amber-500' : 'text-cyan-500'}`} />
                      <div className={`font-bold text-[11px] ${standardMode === 'tgo' ? 'text-amber-700' : 'text-cyan-700'}`}>
                        {standardMode === 'tgo' ? (co2ePerHa * 0.16).toFixed(2) : co2ePerHa.toFixed(1)}
                      </div>
                      <div className={`text-[8px] ${standardMode === 'tgo' ? 'text-amber-600' : 'text-cyan-600'}`}>
                        {standardMode === 'tgo' ? 'tCO\u2082e/ไร่' : 'tCO\u2082e/ha'}
                      </div>
                    </div>
                  </div>

                  {/* Deforestation alert */}
                  {hasDeforestation && (
                    <div className="flex items-center gap-1.5 bg-red-50 rounded-md px-2 py-1 text-[10px] text-red-700">
                      <AlertTriangle className="h-3 w-3 text-red-500 shrink-0" />
                      <span className="font-medium">Deforestation: {standardMode === 'tgo' ? `${((latest?.deforestationHa ?? field?.deforestationHa ?? 0) * 6.25).toFixed(2)} ไร่` : `${(latest?.deforestationHa ?? field?.deforestationHa ?? 0).toFixed(2)} ha`}</span>
                      {latest?.degradationPct != null && latest.degradationPct > 0 && (
                        <span className="text-red-500">&middot; Degradation: {latest.degradationPct.toFixed(1)}%</span>
                      )}
                    </div>
                  )}

                  {/* Soil carbon for mangrove */}
                  {field?.isMangrove && (latest?.soilCarbonTcPerHa ?? field?.soilCarbonTcPerHa ?? 0) > 0 && (
                    <div className="flex items-center gap-1.5 bg-cyan-50 rounded-md px-2 py-1 text-[10px] text-cyan-700">
                      <Waves className="h-3 w-3 text-cyan-500 shrink-0" />
                      <span className="font-medium">Soil Carbon: {standardMode === 'tgo' ? `${((latest?.soilCarbonTcPerHa ?? field?.soilCarbonTcPerHa ?? 0) * 0.16).toFixed(3)} tC/ไร่` : `${(latest?.soilCarbonTcPerHa ?? field?.soilCarbonTcPerHa ?? 0).toFixed(2)} tC/ha`}</span>
                    </div>
                  )}

                  {/* Footer */}
                  <div className="flex items-center gap-2 text-[9px] text-muted-foreground">
                    <MapPin className="h-2.5 w-2.5" />
                    <span>{field?.lat?.toFixed(2)}°N, {field?.lng?.toFixed(2)}°E</span>
                    <span className="ml-auto">{standardMode === 'tgo' ? `${((field?.areaHa ?? 0) * 6.25).toLocaleString(undefined, {maximumFractionDigits: 1})} ไร่` : `${field?.areaHa?.toLocaleString() ?? '--'} ha`}</span>
                    <span>&middot; Coverage: {(latest?.scanCoveragePct ?? field?.scanCoveragePct ?? 0).toFixed(0)}%</span>
                    {field?.surveyComplete && <span className="text-emerald-600 font-medium">✅ Complete</span>}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Charts */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-emerald-600" />
            LIDAR Simulation Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="carbon" className="space-y-4">
            <TabsList className="h-8">
              <TabsTrigger value="carbon" className="text-xs h-6 gap-1"><Trees className="h-3 w-3" /> Carbon Stock</TabsTrigger>
              <TabsTrigger value="biomass" className="text-xs h-6 gap-1"><Leaf className="h-3 w-3" /> Biomass</TabsTrigger>
              <TabsTrigger value="change" className="text-xs h-6 gap-1"><TrendingDown className="h-3 w-3" /> Change Detection</TabsTrigger>
              <TabsTrigger value="quality" className="text-xs h-6 gap-1"><Satellite className="h-3 w-3" /> LIDAR Quality</TabsTrigger>
              <TabsTrigger value="comparison" className="text-xs h-6 gap-1"><BarChart3 className="h-3 w-3" /> Comparison</TabsTrigger>
            </TabsList>

            {/* Carbon Stock — Area Chart */}
            <TabsContent value="carbon">
              <ResponsiveContainer width="100%" height={350}>
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="tick" tick={{ fontSize: 10 }} label={{ value: 'Tick (1 = 1 month)', position: 'insideBottom', offset: -2, fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} label={{ value: standardMode === 'tgo' ? 'T-VER Carbon (tC/ไร่)' : 'Carbon (tC/ha)', angle: -90, position: 'insideLeft', fontSize: 10 }} />
                  <Tooltip contentStyle={{ fontSize: 11 }} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  {fieldIds.map(fid => {
                    const cfg = FOREST_CONFIG[fid];
                    return <Area key={fid} type="monotone" dataKey={`${cfg.shortLabel}_carbon`} name={`${cfg.shortLabel} Carbon`} fill={cfg.color} fillOpacity={0.15} stroke={cfg.color} strokeWidth={2} />;
                  })}
                </AreaChart>
              </ResponsiveContainer>
            </TabsContent>

            {/* Biomass — Stacked Bar Chart */}
            <TabsContent value="biomass">
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="tick" tick={{ fontSize: 10 }} label={{ value: 'Tick', position: 'insideBottom', offset: -2, fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} label={{ value: standardMode === 'tgo' ? 'Biomass (t/ไร่)' : 'Biomass (t/ha)', angle: -90, position: 'insideLeft', fontSize: 10 }} />
                  <Tooltip contentStyle={{ fontSize: 11 }} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  {fieldIds.map(fid => {
                    const cfg = FOREST_CONFIG[fid];
                    return (
                      <React.Fragment key={fid}>
                        <Bar dataKey={`${cfg.shortLabel}_agb`} name={`${cfg.shortLabel} AGB`} fill={cfg.color} fillOpacity={0.8} stackId={fid} radius={[0, 0, 0, 0]} />
                        <Bar dataKey={`${cfg.shortLabel}_bgb`} name={`${cfg.shortLabel} BGB`} fill={cfg.color} fillOpacity={0.4} stackId={fid} radius={[4, 4, 0, 0]} />
                      </React.Fragment>
                    );
                  })}
                </BarChart>
              </ResponsiveContainer>
            </TabsContent>

            {/* Change Detection — Line + Bar */}
            <TabsContent value="change">
              <ResponsiveContainer width="100%" height={350}>
                <ComposedChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="tick" tick={{ fontSize: 10 }} />
                  <YAxis yAxisId="change" tick={{ fontSize: 10 }} label={{ value: standardMode === 'tgo' ? 'Carbon Change (tC/ไร่/yr)' : 'Carbon Change (tC/ha/yr)', angle: -90, position: 'insideLeft', fontSize: 10 }} />
                  <YAxis yAxisId="deforest" orientation="right" tick={{ fontSize: 10 }} label={{ value: standardMode === 'tgo' ? 'Deforestation (ไร่)' : 'Deforestation (ha)', angle: 90, position: 'insideRight', fontSize: 10 }} />
                  <Tooltip contentStyle={{ fontSize: 11 }} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <ReferenceLine yAxisId="change" y={0} stroke="#94a3b8" strokeDasharray="3 3" />
                  {fieldIds.map(fid => {
                    const cfg = FOREST_CONFIG[fid];
                    return <Line key={fid} yAxisId="change" type="monotone" dataKey={`${cfg.shortLabel}_change`} name={`${cfg.shortLabel} ΔC`} stroke={cfg.color} strokeWidth={2} dot={false} />;
                  })}
                  {fieldIds.map(fid => {
                    const cfg = FOREST_CONFIG[fid];
                    return <Bar key={`d-${fid}`} yAxisId="deforest" dataKey={`${cfg.shortLabel}_deforest`} name={`${cfg.shortLabel} Deforest`} fill={cfg.color} fillOpacity={0.3} />;
                  })}
                </ComposedChart>
              </ResponsiveContainer>
            </TabsContent>

            {/* LIDAR Quality — Line Chart */}
            <TabsContent value="quality">
              <ResponsiveContainer width="100%" height={350}>
                <ComposedChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="tick" tick={{ fontSize: 10 }} />
                  <YAxis yAxisId="density" tick={{ fontSize: 10 }} label={{ value: 'Point Density (pts/m²)', angle: -90, position: 'insideLeft', fontSize: 10 }} />
                  <YAxis yAxisId="coverage" orientation="right" tick={{ fontSize: 10 }} domain={[0, 100]} label={{ value: 'Scan Coverage %', angle: 90, position: 'insideRight', fontSize: 10 }} />
                  <Tooltip contentStyle={{ fontSize: 11 }} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  {fieldIds.map(fid => {
                    const cfg = FOREST_CONFIG[fid];
                    return <Line key={fid} yAxisId="density" type="monotone" dataKey={`${cfg.shortLabel}_pointDensity`} name={`${cfg.shortLabel} Density`} stroke={cfg.color} strokeWidth={2} dot={false} />;
                  })}
                  {fieldIds.map(fid => {
                    const cfg = FOREST_CONFIG[fid];
                    return <Line key={`c-${fid}`} yAxisId="coverage" type="monotone" dataKey={`${cfg.shortLabel}_scanCoverage`} name={`${cfg.shortLabel} Coverage`} stroke={cfg.color} strokeWidth={1.5} dot={false} strokeDasharray="5 3" />;
                  })}
                </ComposedChart>
              </ResponsiveContainer>
            </TabsContent>

            {/* Comparison */}
            <TabsContent value="comparison">
              {status && (
                <div className="space-y-4">
                  {/* Comparison Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="bg-muted/50">
                          <th className="p-2 text-left font-medium">Parameter</th>
                          {status.fields.map(f => (
                            <th key={f.id} className="p-2 text-center font-medium" style={{ color: FOREST_CONFIG[f.id]?.color }}>
                              {FOREST_CONFIG[f.id]?.shortLabel}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          ['Forest Type', ...status.fields.map(f => f.forestType)],
                          [standardMode === 'tgo' ? 'Area (ไร่)' : 'Area (ha)', ...status.fields.map(f => standardMode === 'tgo' ? (f.areaHa * 6.25).toLocaleString(undefined, {maximumFractionDigits: 1}) : f.areaHa.toLocaleString())],
                          ['Province', ...status.fields.map(f => f.province)],
                          ['Survey Year', ...status.fields.map(f => f.simYear.toString())],
                          ['Survey Month', ...status.fields.map(f => f.simMonth.toString())],
                          ['Survey Phase', ...status.fields.map(f => f.surveyPhase)],
                          ['Canopy Height (m)', ...status.fields.map(f => f.chmMeanHeight.toFixed(1))],
                          ['Canopy Cover %', ...status.fields.map(f => f.canopyCoverPct.toFixed(1))],
                          [standardMode === 'tgo' ? 'AGB (t/ไร่)' : 'AGB (t/ha)', ...status.fields.map(f => standardMode === 'tgo' ? (f.agbTonnePerHa * 0.16).toFixed(2) : f.agbTonnePerHa.toFixed(1))],
                          [standardMode === 'tgo' ? 'Carbon (tC/ไร่)' : 'Carbon (tC/ha)', ...status.fields.map(f => standardMode === 'tgo' ? (f.carbonTcPerHa * 0.16).toFixed(3) : f.carbonTcPerHa.toFixed(2))],
                          ['CO\u2082e Stock', ...status.fields.map(f => f.totalCO2eStock.toFixed(1))],
                          ['Carbon Stock (tC)', ...status.fields.map(f => f.totalCarbonStockTc.toFixed(1))],
                          [standardMode === 'tgo' ? 'Deforestation (ไร่)' : 'Deforestation (ha)', ...status.fields.map(f => standardMode === 'tgo' ? (f.deforestationHa * 6.25).toFixed(2) : f.deforestationHa.toFixed(2))],
                          [standardMode === 'tgo' ? 'Carbon Change (tC/ไร่/yr)' : 'Carbon Change (tC/ha/yr)', ...status.fields.map(f => standardMode === 'tgo' ? (f.annualCarbonChangeTcPerHa * 0.16).toFixed(4) : f.annualCarbonChangeTcPerHa.toFixed(3))],
                          ['Point Density (pts/m\u00b2)', ...status.fields.map(f => f.pointDensityPerM2.toFixed(1))],
                          ['Scan Coverage %', ...status.fields.map(f => f.scanCoveragePct.toFixed(1))],
                          ['Mangrove', ...status.fields.map(f => f.isMangrove ? '🌊 Yes' : '—')],
                          [standardMode === 'tgo' ? 'Soil Carbon (tC/ไร่)' : 'Soil Carbon (tC/ha)', ...status.fields.map(f => f.isMangrove ? (standardMode === 'tgo' ? (f.soilCarbonTcPerHa * 0.16).toFixed(3) : f.soilCarbonTcPerHa.toFixed(2)) : '—')],
                          ['Survey', ...status.fields.map(f => f.surveyComplete ? '\u2705 Complete' : '\uD83D\uDD04 Active')],
                        ].map(([label, ...vals], i) => (
                          <tr key={i} className={i % 2 === 0 ? '' : 'bg-muted/30'}>
                            <td className="p-2 font-medium text-muted-foreground">{label}</td>
                            {vals.map((v, j) => (
                              <td key={j} className="p-2 text-center">{v}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Carbon Stock Comparison Bar Chart */}
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={status.fields.map(f => ({
                      name: FOREST_CONFIG[f.id]?.shortLabel || f.id,
                      totalCarbon: f.totalCarbonStockTc,
                      totalCO2e: f.totalCO2eStock,
                      agb: f.agbTonnePerHa * f.areaHa,
                      deforest: f.deforestationHa,
                      area: f.areaHa,
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: 10 }} />
                      <Bar dataKey="totalCarbon" name="Total Carbon (tC)" fill="#059669" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="totalCO2e" name="Total CO\u2082e" fill="#0891b2" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* dMRV Pipeline */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-4 w-4 text-emerald-600" />
            dMRV Integration Pipeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 overflow-x-auto pb-2">
            {[
              { icon: Satellite, label: 'LIDAR Scan', sub: `${totalReadings} readings`, color: 'bg-cyan-50 text-cyan-600' },
              { icon: Shield, label: 'Validate', sub: 'Integrity check', color: 'bg-emerald-50 text-emerald-600' },
              { icon: Trees, label: 'Quantify', sub: standardMode === 'tgo' ? 'T-VER Carbon' : 'IPCC Carbon', color: 'bg-green-50 text-green-600' },
              { icon: FileCheck, label: standardMode === 'tgo' ? 'T-VER Credit' : 'Carbon Credit', sub: `${totalCO2eStock.toFixed(1)} tCO\u2082e`, color: standardMode === 'tgo' ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600' },
            ].map((step, i) => (
              <React.Fragment key={step.label}>
                <div className="flex flex-col items-center gap-1 min-w-[80px]">
                  <div className={`h-10 w-10 rounded-xl ${step.color} flex items-center justify-center`}>
                    <step.icon className="h-4 w-4" />
                  </div>
                  <span className="text-[10px] font-medium">{step.label}</span>
                  <span className="text-[9px] text-muted-foreground">{step.sub}</span>
                </div>
                {i < 3 && <ChevronDown className="h-4 w-4 text-muted-foreground rotate-[-90deg] shrink-0" />}
              </React.Fragment>
            ))}
          </div>
          <Separator className="my-3" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{dMRVCount > 0 ? `${dMRVCount} records ingested` : 'No data sent yet'}</span>
            </div>
            <Button size="sm" onClick={sendToDmrv} disabled={sendingToDmrv || readings.length === 0}
              className="bg-emerald-600 hover:bg-emerald-500 text-white">
              <Send className="h-3.5 w-3.5 mr-1" /> Send to dMRV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Readings Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4 text-emerald-600" />
            Recent LIDAR Readings
            <Badge variant="secondary" className="text-[9px] h-4">{readings.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-h-96 overflow-y-auto">
            <table className="w-full text-[10px]">
              <thead className="sticky top-0 bg-background">
                <tr className="border-b">
                  <th className="p-1.5 text-left font-medium">Time</th>
                  <th className="p-1.5 text-left font-medium">Area</th>
                  <th className="p-1.5 text-left font-medium">Phase</th>
                  <th className="p-1.5 text-right font-medium">Yr/Mo</th>
                  <th className="p-1.5 text-right font-medium">AGB</th>
                  <th className="p-1.5 text-right font-medium">Carbon</th>
                  <th className="p-1.5 text-right font-medium">CO\u2082e</th>
                  <th className="p-1.5 text-right font-medium">Change</th>
                  <th className="p-1.5 text-right font-medium">Deforest</th>
                </tr>
              </thead>
              <tbody>
                {readings.slice(-30).reverse().map((r, i) => {
                  const cfg = FOREST_CONFIG[r.fieldId];
                  const phaseCfg = SURVEY_PHASE_CONFIG[r.surveyPhase];
                  return (
                    <tr key={i} className="border-b border-muted/50 hover:bg-muted/30">
                      <td className="p-1.5">{r.tick}</td>
                      <td className="p-1.5 font-medium" style={{ color: cfg?.color }}>{cfg?.emoji} {cfg?.shortLabel}</td>
                      <td className="p-1.5">
                        <Badge className={`${phaseCfg?.bg} ${phaseCfg?.color} text-[8px] h-3.5`}>
                          {phaseCfg?.icon} {phaseCfg?.label}
                        </Badge>
                      </td>
                      <td className="p-1.5 text-right">{r.simYear}/{r.simMonth}</td>
                      <td className="p-1.5 text-right text-amber-600">{standardMode === 'tgo' ? (r.agbTonnePerHa * 0.16).toFixed(2) : r.agbTonnePerHa.toFixed(1)}</td>
                      <td className="p-1.5 text-right text-green-600">
                        {standardMode === 'tgo' ? ((r.tverCarbonTcPerHa ?? r.carbonTcPerHa) * 0.16).toFixed(3) : r.carbonTcPerHa.toFixed(2)}
                      </td>
                      <td className="p-1.5 text-right">
                        {standardMode === 'tgo' ? ((r.tverCo2eTonnePerHa ?? r.co2eTonnePerHa) * 0.16).toFixed(2) : r.co2eTonnePerHa.toFixed(1)}
                      </td>
                      <td className={`p-1.5 text-right font-medium ${r.annualCarbonChangeTcPerHa >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {r.annualCarbonChangeTcPerHa >= 0 ? '+' : ''}{r.annualCarbonChangeTcPerHa.toFixed(3)}
                      </td>
                      <td className="p-1.5 text-right">
                        {r.deforestationHa > 0 ? (
                          <span className="text-red-600 font-medium">{r.deforestationHa.toFixed(2)}</span>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
