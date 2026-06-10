'use client';

import React, { useState, useEffect, useCallback, useMemo, useSyncExternalStore } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  Play, Square, RotateCcw, Send, Activity, BarChart3, TrendingDown,
  TrendingUp, MapPin, Zap, Clock, RefreshCw, ChevronDown,
  CheckCircle2, Shield, FileCheck, Eye, Leaf, Gauge,
  Droplets, Thermometer, Wind, Beaker, Bacteria, FlaskConical,
  AlertTriangle, TreePine,
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
  ComposedChart, ReferenceLine, RadialBarChart, RadialBar,
  PieChart, Pie, Cell,
} from 'recharts';

// ─── Types ──────────────────────────────────────────────────────────
interface MicroorganismGroup {
  id: string;
  nameEn: string;
  nameTh: string;
  category: string;
  function: string;
  optimalTempC: [number, number];
  optimalPH: [number, number];
  growthRatePerDay: number;
  yieldCoeff: number;
}

interface BioReading {
  tick: number;
  stationId: string;
  timestamp: string;
  simYear: number;
  simMonth: number;
  season: 'DRY' | 'WET';

  temperatureC: number;
  pH: number;
  dissolvedOxygenMgPerL: number;
  moisturePct: number;

  ch4InputKgPerDay: number;
  ch4OxidizedKgPerDay: number;
  ch4OxidationEfficiencyPct: number;
  ch4EmissionAvoidedKgPerDay: number;

  co2ProducedKgPerDay: number;
  co2CapturedKgPerDay: number;
  co2NetAvoidedKgPerDay: number;

  biogasProducedM3PerDay: number;
  biogasCh4ContentPct: number;

  biomassProducedKgPerDay: number;
  scpDataKgPerDay: number;
  lipidContentPct: number;

  bioethanolLPerDay: number;
  biohydrogenLPerDay: number;
  biodieselLPerDay: number;
  bioplasticKgPerDay: number;
  biofertilizerKgPerDay: number;

  methanotrophCountCFUPerML: number;
  methanogenCountCFUPerML: number;
  acetogenCountCFUPerML: number;
  algalDensityMgPerL: number;
  totalHeterotrophCountCFUPerML: number;

  nitrogenMgPerL: number;
  phosphorusMgPerL: number;
  codMgPerL: number;
  bodMgPerL: number;

  tverCh4ReductionTco2ePerDay: number;
  tverBiogasOffsetTco2ePerDay: number;
  tverTotalCreditTco2ePerDay: number;
  ipccCh4ReductionTco2ePerDay: number;
  ipccBiogasOffsetTco2ePerDay: number;
  ipccTotalCreditTco2ePerDay: number;

  cumulativeCh4OxidizedKg: number;
  cumulativeCO2CapturedKg: number;
  cumulativeBiogasM3: number;
  cumulativeBiomassKg: number;
  cumulativeCarbonTco2e: number;

  processStabilityPct: number;
  biofilterEfficiencyPct: number;
  monitoringCoveragePct: number;
}

interface BioStationStatus {
  id: string;
  name: string;
  nameTh: string;
  province: string;
  lat: number;
  lng: number;
  siteAreaHa: number;
  siteType: string;
  siteTypeTh: string;
  primaryProcess: string;
  microorganisms: MicroorganismGroup[];
  simYear: number;
  simMonth: number;
  ch4OxidizedKgPerDay: number;
  ch4OxidationEfficiencyPct: number;
  biogasProducedM3PerDay: number;
  biomassProducedKgPerDay: number;
  cumulativeCh4OxidizedKg: number;
  cumulativeCarbonTco2e: number;
  processStabilityPct: number;
  biofilterEfficiencyPct: number;
}

interface BioSimStatus {
  running: boolean;
  tick: number;
  simYear: number;
  simMonth: number;
  season: 'DRY' | 'WET';
  totalYears: number;
  progressPct: number;
  totalReadings: number;
  stations: BioStationStatus[];
}

// ─── Config ─────────────────────────────────────────────────────────
const STATION_CONFIG: Record<string, {
  color: string;
  emoji: string;
  label: string;
  shortLabel: string;
  processEmoji: string;
}> = {
  'rice-paddy-methanotroph': {
    color: '#059669', emoji: '🌾', label: 'Rice Paddy Methanotroph', shortLabel: 'Rice Paddy', processEmoji: '🦠',
  },
  'landfill-biofilter': {
    color: '#d97706', emoji: '🏭', label: 'Landfill Biofilter', shortLabel: 'Landfill', processEmoji: '🔬',
  },
  'biogas-synmec': {
    color: '#7c3aed', emoji: '⚡', label: 'Biogas SynMEC', shortLabel: 'Biogas', processEmoji: '🧬',
  },
};

const PROCESS_LABELS: Record<string, { en: string; th: string; icon: string }> = {
  METHANE_OXIDATION: { en: 'Methane Oxidation', th: 'การย่อยสลายมีเทน', icon: '🦠' },
  METHANOGENESIS: { en: 'Methanogenesis', th: 'การสร้างมีเทน', icon: '🧬' },
  CO2_CAPTURE: { en: 'CO₂ Capture (CCU)', th: 'การดักจับ CO₂', icon: '🌿' },
  FERMENTATION: { en: 'Gas Fermentation', th: 'การหมักก๊าซ', icon: '⚗️' },
  NUTRIENT_RECOVERY: { en: 'Nutrient Recovery', th: 'การกู้คืนสารอาหาร', icon: '♻️' },
};

const BIO_PORT = 3034;

const mountedEmptySub = () => () => {};
function useMounted() {
  return useSyncExternalStore(mountedEmptySub, () => true, () => false);
}

// ─── Component ──────────────────────────────────────────────────────
export default function BioSimulatorView() {
  const mounted = useMounted();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [status, setStatus] = useState<BioSimStatus | null>(null);
  const [readings, setReadings] = useState<BioReading[]>([]);
  const [sendingToDmrv, setSendingToDmrv] = useState(false);
  const [dMRVCount, setDMRVCount] = useState(0);
  const [selectedStationId, setSelectedStationId] = useState<string | null>(null);
  const [standardMode, setStandardMode] = useState<'international' | 'tgo'>('tgo');

  // Connect to simulator
  useEffect(() => {
    if (!mounted) return;
    let s: Socket | null = null;
    try {
      s = io(`/?XTransformPort=${BIO_PORT}`, {
        transports: ['polling', 'websocket'],
        reconnectionAttempts: 5,
        reconnectionDelay: 3000,
        timeout: 8000,
      });
      s.on('connect', () => setConnected(true));
      s.on('disconnect', () => setConnected(false));
      s.on('bio:status', (data: BioSimStatus) => setStatus(data));
      s.on('bio:reading', (data: BioReading[]) => {
        setReadings(prev => [...prev, ...data].slice(-500));
      });
      s.on('bio:readings', (data: BioReading[]) => {
        setReadings(data.slice(-500));
      });
      s.on('bio:started', () => {});
      s.on('bio:stopped', () => {});
      s.on('bio:reset', () => setReadings([]));
      setSocket(s);
    } catch {
      // Fallback
    }

    // HTTP polling fallback
    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/status?XTransformPort=${BIO_PORT}`);
        if (res.ok) {
          const data = await res.json();
          setStatus(data);
          setConnected(true);
        }
        const readingsRes = await fetch(`/api/readings?limit=50&XTransformPort=${BIO_PORT}`);
        if (readingsRes.ok) {
          const rData = await readingsRes.json();
          const readingsArray = Array.isArray(rData) ? rData : (rData.readings || []);
          if (readingsArray.length > 0) {
            setReadings(prev => {
              const lastTick = prev.length > 0 ? prev[prev.length - 1].tick : 0;
              const newReadings = readingsArray.filter((r: BioReading) => r.tick > lastTick);
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
        const res = await fetch(`/api/status?XTransformPort=${BIO_PORT}`);
        if (res.ok) { const data = await res.json(); setStatus(data); setConnected(true); }
      } catch { /* ignore */ }
    })();

    return () => {
      if (s) s.disconnect();
      clearInterval(pollInterval);
    };
  }, [mounted]);

  const startSim = useCallback(async () => {
    if (socket?.connected) { socket.emit('bio:start'); return; }
    try {
      await fetch(`/api/control?XTransformPort=${BIO_PORT}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start' }),
      });
    } catch { /* ignore */ }
  }, [socket]);

  const stopSim = useCallback(async () => {
    if (socket?.connected) { socket.emit('bio:stop'); return; }
    try {
      await fetch(`/api/control?XTransformPort=${BIO_PORT}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stop' }),
      });
    } catch { /* ignore */ }
  }, [socket]);

  const resetSim = useCallback(async () => {
    if (socket?.connected) { socket.emit('bio:reset'); setReadings([]); return; }
    try {
      await fetch(`/api/control?XTransformPort=${BIO_PORT}`, {
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
      const res = await fetch('/api/dmrv/bio', {
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
  const stationIds = useMemo(() => ['rice-paddy-methanotroph', 'landfill-biofilter', 'biogas-synmec'], []);

  const stationReadings = useMemo(() => {
    const map: Record<string, BioReading[]> = {};
    for (const sid of stationIds) {
      map[sid] = readings.filter(r => r.stationId === sid).slice(-200);
    }
    return map;
  }, [readings, stationIds]);

  const latestByStation = useMemo(() => {
    const map: Record<string, BioReading | null> = {};
    for (const sid of stationIds) {
      const arr = stationReadings[sid];
      map[sid] = arr.length > 0 ? arr[arr.length - 1] : null;
    }
    return map;
  }, [stationReadings, stationIds]);

  // Chart data
  const chartData = useMemo(() => {
    const tickMap: Record<number, Record<string, BioReading>> = {};
    for (const r of readings) {
      if (!tickMap[r.tick]) tickMap[r.tick] = {};
      tickMap[r.tick][r.stationId] = r;
    }
    return Object.entries(tickMap)
      .sort(([a], [b]) => Number(a) - Number(b))
      .slice(-100)
      .map(([tick, stations]) => {
        const entry: Record<string, number | string> = { tick: Number(tick), month: 0, year: 0 };
        for (const [sid, r] of Object.entries(stations)) {
          const cfg = STATION_CONFIG[sid];
          if (!cfg) continue;
          const key = cfg.shortLabel;
          // CH₄ oxidized
          entry[`${key}_ch4oxidized`] = r.ch4OxidizedKgPerDay;
          entry[`${key}_ch4efficiency`] = r.ch4OxidationEfficiencyPct;
          // CO₂ captured
          entry[`${key}_co2captured`] = r.co2CapturedKgPerDay;
          entry[`${key}_co2avoided`] = r.co2NetAvoidedKgPerDay;
          // Biogas
          entry[`${key}_biogas`] = r.biogasProducedM3PerDay;
          // Biomass
          entry[`${key}_biomass`] = r.biomassProducedKgPerDay;
          // Carbon credits
          entry[`${key}_tverCredit`] = r.tverTotalCreditTco2ePerDay;
          entry[`${key}_ipccCredit`] = r.ipccTotalCreditTco2ePerDay;
          // Microorganism counts (log scale for display)
          entry[`${key}_methanotroph`] = Math.log10(Math.max(1, r.methanotrophCountCFUPerML));
          entry[`${key}_methanogen`] = Math.log10(Math.max(1, r.methanogenCountCFUPerML));
          // Temperature & pH
          entry[`${key}_temp`] = r.temperatureC;
          entry[`${key}_ph`] = r.pH;
          // Process stability
          entry[`${key}_stability`] = r.processStabilityPct;
          // Cumulative
          entry[`${key}_cumCarbon`] = r.cumulativeCarbonTco2e;
          entry['month'] = r.simMonth;
          entry['year'] = r.simYear;
        }
        return entry;
      });
  }, [readings]);

  // Summary stats
  const totalReadings = readings.length;
  const currentYear = status?.simYear ?? 0;
  const currentMonth = status?.simMonth ?? 0;
  const currentSeason = status?.season ?? 'DRY';

  const totalCH4Oxidized = useMemo(() => {
    if (!status?.stations) return 0;
    return status.stations.reduce((s, f) => s + (f.cumulativeCh4OxidizedKg || 0), 0);
  }, [status?.stations]);

  const totalCarbonCredits = useMemo(() => {
    if (!status?.stations) return 0;
    return status.stations.reduce((s, f) => s + (f.cumulativeCarbonTco2e || 0), 0);
  }, [status?.stations]);

  const totalBiogas = useMemo(() => {
    return readings.reduce((s, r) => s + (r.cumulativeBiogasM3 || 0), 0) / Math.max(1, stationIds.length);
  }, [readings, stationIds]);

  const avgCH4Efficiency = useMemo(() => {
    if (!status?.stations) return 0;
    const stations = status.stations.filter(s => s.ch4OxidationEfficiencyPct > 0);
    if (stations.length === 0) return 0;
    return stations.reduce((s, f) => s + (f.ch4OxidationEfficiencyPct || 0), 0) / stations.length;
  }, [status?.stations]);

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
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-emerald-800 via-teal-700 to-green-700 p-6 text-white">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-4 right-10 text-8xl">🧬</div>
          <div className="absolute bottom-2 left-20 text-6xl">🦠</div>
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <Bacteria className="h-7 w-7" />
            <h2 className="text-2xl font-bold">Bio & Microorganism Carbon Simulator</h2>
            <Badge className="bg-white/20 text-white hover:bg-white/30 text-xs">จุลินทรีย์กินมีเทน</Badge>
            <Badge className="bg-amber-500/80 text-white text-[9px]">T-VER-AG-001</Badge>
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
            จำลองข้อมูลทางด้าน Bio และจุลินทรีย์ที่เกี่ยวกับคาร์บอน — Methanotrophs, SynMEC, Microbial CCU, Algae Capture
          </p>
          <p className="text-[10px] text-white/60 mb-4">
            {standardMode === 'tgo'
              ? 'อ้างอิงมาตรฐาน: TGO T-VER-AG-001 (ขยะมีชีวิต) / T-VER-WT-001 (น้ำเสีย) | CH₄ GWP = 25 | หน่วย: tCO₂e, พื้นที่: ไร่ (1 ไร่ = 0.16 ha) | อ้างอิง BIOTEC/NSTDA'
              : 'Reference: IPCC 2006 GL Vol. 5 (Waste) | CDM AMS-III.H / ACM-0014 | Verra VCS VM-0041 | CH₄ GWP = 28 (AR5) | Units: tCO₂e, ha'
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
              <span>Year {currentYear} / {status?.totalYears ?? 5} &middot; Month {currentMonth}/12 &middot; {currentSeason === 'WET' ? '🌧️ ฤดูฝน' : '☀️ ฤดูแล้ง'}</span>
              <span>1 sec = 1 month simulated</span>
            </div>
            <Progress value={yearProgress} className="h-1.5 bg-white/20" />
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { icon: Beaker, label: 'Bio Readings', value: totalReadings.toLocaleString(), color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { icon: Clock, label: 'Monitor Year', value: `${currentYear}/${status?.totalYears ?? 5}`, color: 'text-teal-600', bg: 'bg-teal-50' },
          { icon: Wind, label: 'CH₄ Oxidized (kg)', value: totalCH4Oxidized.toFixed(0), color: 'text-orange-600', bg: 'bg-orange-50' },
          { icon: Leaf, label: standardMode === 'tgo' ? 'T-VER Credits (tCO₂e)' : 'IPCC Credits (tCO₂e)', value: totalCarbonCredits.toFixed(1), color: 'text-green-600', bg: 'bg-green-50' },
          { icon: Zap, label: 'Avg CH₄ Efficiency', value: `${avgCH4Efficiency.toFixed(1)}%`, color: 'text-amber-600', bg: 'bg-amber-50' },
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
                  {standardMode === 'tgo' ? 'T-VER-AG-001' : 'CDM AMS-III.H'}
                </Badge>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[10px]">
                {standardMode === 'tgo' ? (
                  <div className="text-amber-700">
                    <p className="font-semibold mb-0.5">มาตรฐาน T-VER (ไทย)</p>
                    <p>T-VER-AG-001: การจัดการขยะมีชีวิต</p>
                    <p>T-VER-WT-001: บำบัดน้ำเสีย</p>
                    <p>CH₄ GWP = 25 (AR4)</p>
                  </div>
                ) : (
                  <div className="text-blue-700">
                    <p className="font-semibold mb-0.5">International Standards</p>
                    <p>IPCC 2006 GL Vol. 5 (Waste)</p>
                    <p>CDM AMS-III.H / ACM-0014</p>
                    <p>Verra VCS VM-0041</p>
                  </div>
                )}
                {standardMode === 'tgo' ? (
                  <div className="text-amber-700">
                    <p className="font-semibold mb-0.5">จุลินทรีย์ที่เกี่ยวข้อง (BIOTEC)</p>
                    <p>Methanotrophs: กิน CH₄ → biomass/พลังงาน</p>
                    <p>SynMEC: สหชีวภาพสร้างมีเทน</p>
                    <p>Microalgae: จับ CO₂ → biofuel</p>
                  </div>
                ) : (
                  <div className="text-blue-700">
                    <p className="font-semibold mb-0.5">Microorganism Functions</p>
                    <p>Methanotrophs: CH₄ → CO₂ + biomass</p>
                    <p>Acetogens: CO/CO₂ → organic acids</p>
                    <p>Cyanobacteria: CO₂ → biopolymers</p>
                  </div>
                )}
                {standardMode === 'tgo' ? (
                  <div className="text-amber-700">
                    <p className="font-semibold mb-0.5">การคำนวณเครดิต</p>
                    <p>ER = CH₄_avoided × GWP × (1-uncertainty)</p>
                    <p>หัก uncertainty: 10% (&lt;2yr), 5% (≥2yr)</p>
                    <p>หน่วย: tCO₂e, พื้นที่: ไร่</p>
                  </div>
                ) : (
                  <div className="text-blue-700">
                    <p className="font-semibold mb-0.5">Carbon Credit Calculation</p>
                    <p>ER = CH₄_avoided × GWP₂₈</p>
                    <p>Biogas offset: m³ × emission factor</p>
                    <p>Units: tCO₂e, ha</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Station Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {stationIds.map(sid => {
          const cfg = STATION_CONFIG[sid];
          const station = status?.stations.find(s => s.id === sid);
          const latest = latestByStation[sid];
          const isSelected = selectedStationId === sid;
          const processInfo = PROCESS_LABELS[station?.primaryProcess || 'METHANE_OXIDATION'];

          // Carbon values
          const tverCredit = latest?.tverTotalCreditTco2ePerDay ?? 0;
          const ipccCredit = latest?.ipccTotalCreditTco2ePerDay ?? 0;
          const displayCredit = standardMode === 'tgo' ? tverCredit : ipccCredit;

          return (
            <Card
              key={sid}
              className={`shadow-sm border-l-4 cursor-pointer transition-all ${isSelected ? 'ring-2 ring-offset-1' : 'hover:shadow-md'}`}
              style={{ borderLeftColor: cfg.color, ...(isSelected ? { ringColor: cfg.color } : {}) }}
              onClick={() => setSelectedStationId(isSelected ? null : sid)}
            >
              <CardContent className="p-4 space-y-3">
                {/* Header */}
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{cfg.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate">{cfg.label}</p>
                    <p className="text-[10px] text-muted-foreground">{station?.siteTypeTh ?? station?.siteType}</p>
                  </div>
                  <Badge className="bg-emerald-50 text-emerald-700 text-[9px] h-5 shrink-0">
                    {processInfo?.icon} {processInfo?.en}
                  </Badge>
                </div>

                {/* Location */}
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  <span>{station?.province}</span>
                  <span>&middot; {standardMode === 'tgo' ? `${((station?.siteAreaHa ?? 0) * 6.25).toFixed(1)} ไร่` : `${station?.siteAreaHa} ha`}</span>
                </div>

                {/* Progress */}
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-medium text-[11px]">Year {station?.simYear ?? 0}</span>
                    <span className="text-muted-foreground text-[10px]">
                      {latest?.season === 'WET' ? '🌧️' : '☀️'} Month {station?.simMonth ?? 0}
                    </span>
                  </div>
                  <Progress value={((station?.simMonth ?? 0) / 12) * 100} className="h-1.5" />
                </div>

                {/* Key Metrics Grid */}
                <div className="grid grid-cols-3 gap-1.5 text-[10px]">
                  <div className="bg-orange-50 rounded p-1.5 text-center">
                    <Wind className="h-2.5 w-2.5 mx-auto text-orange-500" />
                    <div className="font-bold text-[11px] text-orange-700">{(latest?.ch4OxidizedKgPerDay ?? 0).toFixed(1)}</div>
                    <div className="text-[8px] text-orange-600">CH₄ ox. (kg/d)</div>
                  </div>
                  <div className="bg-emerald-50 rounded p-1.5 text-center">
                    <Leaf className="h-2.5 w-2.5 mx-auto text-emerald-500" />
                    <div className="font-bold text-[11px] text-emerald-700">{displayCredit.toFixed(3)}</div>
                    <div className="text-[8px] text-emerald-600">{standardMode === 'tgo' ? 'T-VER tCO₂e/d' : 'IPCC tCO₂e/d'}</div>
                  </div>
                  <div className="bg-purple-50 rounded p-1.5 text-center">
                    <Zap className="h-2.5 w-2.5 mx-auto text-purple-500" />
                    <div className="font-bold text-[11px] text-purple-700">{(latest?.biogasProducedM3PerDay ?? 0).toFixed(1)}</div>
                    <div className="text-[8px] text-purple-600">Biogas (m³/d)</div>
                  </div>
                </div>

                {/* Microorganism Tags */}
                <div className="flex flex-wrap gap-1">
                  {station?.microorganisms?.map(m => (
                    <Badge key={m.id} variant="secondary" className="text-[8px] h-4 bg-slate-100 text-slate-700">
                      {m.nameTh.split('(')[0].trim()}
                    </Badge>
                  ))}
                </div>

                {/* Efficiency */}
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-muted-foreground">CH₄ Efficiency</span>
                  <span className="font-medium text-emerald-700">{(latest?.ch4OxidationEfficiencyPct ?? 0).toFixed(1)}%</span>
                </div>
                <Progress value={latest?.ch4OxidationEfficiencyPct ?? 0} className="h-1.5" />

                {/* Cumulative Carbon */}
                <div className="flex items-center gap-1.5 bg-emerald-50 rounded-md px-2 py-1 text-[10px] text-emerald-700">
                  <Leaf className="h-3 w-3 text-emerald-500 shrink-0" />
                  <span className="font-medium">Cumulative: {standardMode === 'tgo' ? (station?.cumulativeCarbonTco2e ?? 0).toFixed(1) : (latest?.cumulativeCarbonTco2e ?? 0).toFixed(1)} tCO₂e</span>
                </div>

                {/* Stability */}
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-muted-foreground">Process Stability</span>
                  <span className="font-medium">{(latest?.processStabilityPct ?? 0).toFixed(1)}%</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Microorganism Detail Panel */}
      {selectedStationId && (() => {
        const station = status?.stations.find(s => s.id === selectedStationId);
        const latest = latestByStation[selectedStationId];
        if (!station || !latest) return null;
        const cfg = STATION_CONFIG[selectedStationId];

        return (
          <Card className="border-l-4" style={{ borderLeftColor: cfg.color }}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Bacteria className="h-4 w-4 text-emerald-600" />
                Microorganism Detail — {cfg.label}
                <Badge variant="secondary" className="text-[9px] h-4">{station.microorganisms.length} species</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Microorganism Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-muted/50">
                        <th className="p-2 text-left font-medium">จุลินทรีย์</th>
                        <th className="p-2 text-center font-medium">Category</th>
                        <th className="p-2 text-center font-medium">Opt. Temp</th>
                        <th className="p-2 text-center font-medium">Opt. pH</th>
                        <th className="p-2 text-center font-medium">μ (1/d)</th>
                        <th className="p-2 text-center font-medium">Y</th>
                      </tr>
                    </thead>
                    <tbody>
                      {station.microorganisms.map(m => (
                        <tr key={m.id} className="border-b border-muted/30">
                          <td className="p-2">
                            <p className="font-medium text-[11px]">{m.nameTh.split('(')[0].trim()}</p>
                            <p className="text-[9px] text-muted-foreground">{m.nameEn}</p>
                          </td>
                          <td className="p-2 text-center"><Badge variant="secondary" className="text-[8px] h-4">{m.category}</Badge></td>
                          <td className="p-2 text-center">{m.optimalTempC[0]}-{m.optimalTempC[1]}°C</td>
                          <td className="p-2 text-center">{m.optimalPH[0]}-{m.optimalPH[1]}</td>
                          <td className="p-2 text-center font-mono">{m.growthRatePerDay}</td>
                          <td className="p-2 text-center font-mono">{m.yieldCoeff}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Live Conditions */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground">Live Environmental Conditions</p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { icon: Thermometer, label: 'Temperature', value: `${latest.temperatureC}°C`, color: latest.temperatureC > 40 ? 'text-red-600' : 'text-emerald-600', bg: latest.temperatureC > 40 ? 'bg-red-50' : 'bg-emerald-50' },
                      { icon: Droplets, label: 'pH', value: latest.pH.toFixed(2), color: 'text-blue-600', bg: 'bg-blue-50' },
                      { icon: Wind, label: 'Dissolved O₂', value: `${latest.dissolvedOxygenMgPerL} mg/L`, color: 'text-cyan-600', bg: 'bg-cyan-50' },
                      { icon: Gauge, label: 'Moisture', value: `${latest.moisturePct}%`, color: 'text-teal-600', bg: 'bg-teal-50' },
                    ].map(c => (
                      <div key={c.label} className={`${c.bg} rounded-lg p-2 flex items-center gap-2`}>
                        <c.icon className={`h-3.5 w-3.5 ${c.color} shrink-0`} />
                        <div>
                          <p className="text-[9px] text-muted-foreground">{c.label}</p>
                          <p className={`text-xs font-bold ${c.color}`}>{c.value}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <p className="text-xs font-semibold text-muted-foreground mt-3">Microorganism Counts</p>
                  <div className="space-y-1">
                    {[
                      { label: 'Methanotrophs', value: latest.methanotrophCountCFUPerML, unit: 'CFU/mL', color: 'bg-emerald-500' },
                      { label: 'Methanogens', value: latest.methanogenCountCFUPerML, unit: 'CFU/mL', color: 'bg-amber-500' },
                      { label: 'Acetogens', value: latest.acetogenCountCFUPerML, unit: 'CFU/mL', color: 'bg-purple-500' },
                      { label: 'Algal Density', value: latest.algalDensityMgPerL, unit: 'mg/L', color: 'bg-cyan-500' },
                      { label: 'Total Heterotrophs', value: latest.totalHeterotrophCountCFUPerML, unit: 'CFU/mL', color: 'bg-slate-500' },
                    ].map(m => (
                      <div key={m.label} className="flex items-center gap-2 text-[10px]">
                        <span className="w-28 text-muted-foreground">{m.label}</span>
                        <div className="flex-1 h-2 bg-muted/50 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${m.color} rounded-full`}
                            style={{ width: `${Math.min(100, Math.log10(Math.max(1, m.value)) * 10)}%` }}
                          />
                        </div>
                        <span className="w-24 text-right font-mono text-[9px]">{m.value.toExponential(2)} {m.unit}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Bio-product Yields */}
              <div className="mt-4 pt-3 border-t">
                <p className="text-xs font-semibold text-muted-foreground mb-2">Bio-product Yields (Waste to Value)</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                  {[
                    { label: 'Biomass', value: latest.biomassProducedKgPerDay, unit: 'kg/d', icon: '🧫' },
                    { label: 'SCP', value: latest.scpDataKgPerDay, unit: 'kg/d', icon: '🥩' },
                    { label: 'Biogas', value: latest.biogasProducedM3PerDay, unit: 'm³/d', icon: '🔥' },
                    { label: 'Bio-H₂', value: latest.biohydrogenLPerDay, unit: 'L/d', icon: '⛽' },
                    { label: 'Bioethanol', value: latest.bioethanolLPerDay, unit: 'L/d', icon: '🍶' },
                    { label: 'Biodiesel', value: latest.biodieselLPerDay, unit: 'L/d', icon: '🛢️' },
                    { label: 'Bioplastic', value: latest.bioplasticKgPerDay, unit: 'kg/d', icon: '♻️' },
                    { label: 'Biofertilizer', value: latest.biofertilizerKgPerDay, unit: 'kg/d', icon: '🌱' },
                    { label: 'Lipid %', value: latest.lipidContentPct, unit: '%', icon: '💧' },
                  ].map(p => (
                    <div key={p.label} className="bg-slate-50 rounded-lg p-2 text-center">
                      <div className="text-sm">{p.icon}</div>
                      <div className="font-bold text-[11px]">{typeof p.value === 'number' ? p.value.toFixed(2) : p.value}</div>
                      <div className="text-[8px] text-muted-foreground">{p.label} ({p.unit})</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Nutrient Dynamics */}
              <div className="mt-4 pt-3 border-t">
                <p className="text-xs font-semibold text-muted-foreground mb-2">Nutrient & Water Quality</p>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: 'N (mg/L)', value: latest.nitrogenMgPerL, color: 'text-blue-600', bg: 'bg-blue-50' },
                    { label: 'P (mg/L)', value: latest.phosphorusMgPerL, color: 'text-purple-600', bg: 'bg-purple-50' },
                    { label: 'COD (mg/L)', value: latest.codMgPerL, color: 'text-amber-600', bg: 'bg-amber-50' },
                    { label: 'BOD (mg/L)', value: latest.bodMgPerL, color: 'text-red-600', bg: 'bg-red-50' },
                  ].map(n => (
                    <div key={n.label} className={`${n.bg} rounded-lg p-2 text-center`}>
                      <div className={`font-bold text-[12px] ${n.color}`}>{n.value.toFixed(1)}</div>
                      <div className="text-[8px] text-muted-foreground">{n.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })()}

      {/* Charts */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-emerald-600" />
            Bio Simulation Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="methane" className="space-y-4">
            <TabsList className="h-8 flex-wrap">
              <TabsTrigger value="methane" className="text-xs h-6 gap-1"><Wind className="h-3 w-3" /> CH₄ Dynamics</TabsTrigger>
              <TabsTrigger value="carbon" className="text-xs h-6 gap-1"><Leaf className="h-3 w-3" /> Carbon Credits</TabsTrigger>
              <TabsTrigger value="bioproduct" className="text-xs h-6 gap-1"><FlaskConical className="h-3 w-3" /> Bio-products</TabsTrigger>
              <TabsTrigger value="microbe" className="text-xs h-6 gap-1"><Bacteria className="h-3 w-3" /> Microorganisms</TabsTrigger>
              <TabsTrigger value="environment" className="text-xs h-6 gap-1"><Thermometer className="h-3 w-3" /> Environment</TabsTrigger>
            </TabsList>

            {/* CH₄ Dynamics */}
            <TabsContent value="methane">
              <ResponsiveContainer width="100%" height={350}>
                <ComposedChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="tick" tick={{ fontSize: 10 }} />
                  <YAxis yAxisId="ch4" tick={{ fontSize: 10 }} label={{ value: 'CH₄ Oxidized (kg/d)', angle: -90, position: 'insideLeft', fontSize: 10 }} />
                  <YAxis yAxisId="eff" orientation="right" domain={[0, 100]} tick={{ fontSize: 10 }} label={{ value: 'Oxidation Efficiency %', angle: 90, position: 'insideRight', fontSize: 10 }} />
                  <Tooltip contentStyle={{ fontSize: 11 }} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  {stationIds.map(sid => {
                    const cfg = STATION_CONFIG[sid];
                    return <Bar key={sid} yAxisId="ch4" dataKey={`${cfg.shortLabel}_ch4oxidized`} name={`${cfg.shortLabel} CH₄ ox.`} fill={cfg.color} fillOpacity={0.6} />;
                  })}
                  {stationIds.map(sid => {
                    const cfg = STATION_CONFIG[sid];
                    return <Line key={`e-${sid}`} yAxisId="eff" type="monotone" dataKey={`${cfg.shortLabel}_ch4efficiency`} name={`${cfg.shortLabel} Eff.%`} stroke={cfg.color} strokeWidth={2} dot={false} strokeDasharray="5 3" />;
                  })}
                </ComposedChart>
              </ResponsiveContainer>
            </TabsContent>

            {/* Carbon Credits */}
            <TabsContent value="carbon">
              <ResponsiveContainer width="100%" height={350}>
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="tick" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} label={{ value: standardMode === 'tgo' ? 'T-VER Credit (tCO₂e/d)' : 'IPCC Credit (tCO₂e/d)', angle: -90, position: 'insideLeft', fontSize: 10 }} />
                  <Tooltip contentStyle={{ fontSize: 11 }} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  {stationIds.map(sid => {
                    const cfg = STATION_CONFIG[sid];
                    const dataKey = standardMode === 'tgo' ? `${cfg.shortLabel}_tverCredit` : `${cfg.shortLabel}_ipccCredit`;
                    return <Area key={sid} type="monotone" dataKey={dataKey} name={`${cfg.shortLabel} ${standardMode === 'tgo' ? 'T-VER' : 'IPCC'}`} fill={cfg.color} fillOpacity={0.15} stroke={cfg.color} strokeWidth={2} />;
                  })}
                </AreaChart>
              </ResponsiveContainer>
            </TabsContent>

            {/* Bio-products */}
            <TabsContent value="bioproduct">
              <ResponsiveContainer width="100%" height={350}>
                <ComposedChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="tick" tick={{ fontSize: 10 }} />
                  <YAxis yAxisId="biogas" tick={{ fontSize: 10 }} label={{ value: 'Biogas (m³/d)', angle: -90, position: 'insideLeft', fontSize: 10 }} />
                  <YAxis yAxisId="biomass" orientation="right" tick={{ fontSize: 10 }} label={{ value: 'Biomass (kg/d)', angle: 90, position: 'insideRight', fontSize: 10 }} />
                  <Tooltip contentStyle={{ fontSize: 11 }} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  {stationIds.map(sid => {
                    const cfg = STATION_CONFIG[sid];
                    return <Bar key={sid} yAxisId="biogas" dataKey={`${cfg.shortLabel}_biogas`} name={`${cfg.shortLabel} Biogas`} fill={cfg.color} fillOpacity={0.5} />;
                  })}
                  {stationIds.map(sid => {
                    const cfg = STATION_CONFIG[sid];
                    return <Line key={`b-${sid}`} yAxisId="biomass" type="monotone" dataKey={`${cfg.shortLabel}_biomass`} name={`${cfg.shortLabel} Biomass`} stroke={cfg.color} strokeWidth={2} dot={false} />;
                  })}
                </ComposedChart>
              </ResponsiveContainer>
            </TabsContent>

            {/* Microorganisms */}
            <TabsContent value="microbe">
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="tick" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} label={{ value: 'log₁₀(CFU/mL)', angle: -90, position: 'insideLeft', fontSize: 10 }} />
                  <Tooltip contentStyle={{ fontSize: 11 }} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  {stationIds.map(sid => {
                    const cfg = STATION_CONFIG[sid];
                    return <Line key={sid} type="monotone" dataKey={`${cfg.shortLabel}_methanotroph`} name={`${cfg.shortLabel} Methanotroph`} stroke={cfg.color} strokeWidth={2} dot={false} />;
                  })}
                  {stationIds.map(sid => {
                    const cfg = STATION_CONFIG[sid];
                    return <Line key={`m-${sid}`} type="monotone" dataKey={`${cfg.shortLabel}_methanogen`} name={`${cfg.shortLabel} Methanogen`} stroke={cfg.color} strokeWidth={1.5} dot={false} strokeDasharray="5 3" />;
                  })}
                </LineChart>
              </ResponsiveContainer>
            </TabsContent>

            {/* Environment */}
            <TabsContent value="environment">
              <ResponsiveContainer width="100%" height={350}>
                <ComposedChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="tick" tick={{ fontSize: 10 }} />
                  <YAxis yAxisId="temp" tick={{ fontSize: 10 }} label={{ value: 'Temperature (°C)', angle: -90, position: 'insideLeft', fontSize: 10 }} />
                  <YAxis yAxisId="ph" orientation="right" domain={[5, 9]} tick={{ fontSize: 10 }} label={{ value: 'pH', angle: 90, position: 'insideRight', fontSize: 10 }} />
                  <Tooltip contentStyle={{ fontSize: 11 }} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  {stationIds.map(sid => {
                    const cfg = STATION_CONFIG[sid];
                    return <Line key={sid} yAxisId="temp" type="monotone" dataKey={`${cfg.shortLabel}_temp`} name={`${cfg.shortLabel} Temp`} stroke={cfg.color} strokeWidth={2} dot={false} />;
                  })}
                  {stationIds.map(sid => {
                    const cfg = STATION_CONFIG[sid];
                    return <Line key={`p-${sid}`} yAxisId="ph" type="monotone" dataKey={`${cfg.shortLabel}_ph`} name={`${cfg.shortLabel} pH`} stroke={cfg.color} strokeWidth={1.5} dot={false} strokeDasharray="3 3" />;
                  })}
                </ComposedChart>
              </ResponsiveContainer>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Comparison Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Eye className="h-4 w-4 text-emerald-600" />
            Station Comparison
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-muted/50">
                  <th className="p-2 text-left font-medium">Parameter</th>
                  {stationIds.map(sid => (
                    <th key={sid} className="p-2 text-center font-medium" style={{ color: STATION_CONFIG[sid]?.color }}>
                      {STATION_CONFIG[sid]?.shortLabel}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { label: 'Process', values: stationIds.map(sid => { const s = status?.stations.find(st => st.id === sid); return PROCESS_LABELS[s?.primaryProcess || '']?.th || '-'; }) },
                  { label: 'CH₄ Oxidized (kg/d)', values: stationIds.map(sid => latestByStation[sid]?.ch4OxidizedKgPerDay?.toFixed(1) ?? '-') },
                  { label: 'CH₄ Efficiency %', values: stationIds.map(sid => latestByStation[sid]?.ch4OxidationEfficiencyPct?.toFixed(1) ?? '-') },
                  { label: 'Biogas (m³/d)', values: stationIds.map(sid => latestByStation[sid]?.biogasProducedM3PerDay?.toFixed(1) ?? '-') },
                  { label: 'Biomass (kg/d)', values: stationIds.map(sid => latestByStation[sid]?.biomassProducedKgPerDay?.toFixed(2) ?? '-') },
                  { label: standardMode === 'tgo' ? 'T-VER Credit (tCO₂e/d)' : 'IPCC Credit (tCO₂e/d)', values: stationIds.map(sid => { const r = latestByStation[sid]; return standardMode === 'tgo' ? r?.tverTotalCreditTco2ePerDay?.toFixed(3) ?? '-' : r?.ipccTotalCreditTco2ePerDay?.toFixed(3) ?? '-'; }) },
                  { label: 'Cumulative Carbon (tCO₂e)', values: stationIds.map(sid => latestByStation[sid]?.cumulativeCarbonTco2e?.toFixed(1) ?? '-') },
                  { label: 'Process Stability %', values: stationIds.map(sid => latestByStation[sid]?.processStabilityPct?.toFixed(1) ?? '-') },
                  { label: 'Temperature (°C)', values: stationIds.map(sid => latestByStation[sid]?.temperatureC?.toFixed(1) ?? '-') },
                  { label: 'pH', values: stationIds.map(sid => latestByStation[sid]?.pH?.toFixed(2) ?? '-') },
                  { label: 'Methanotroph (CFU/mL)', values: stationIds.map(sid => latestByStation[sid]?.methanotrophCountCFUPerML?.toExponential(1) ?? '-') },
                  { label: 'Biofilter Efficiency %', values: stationIds.map(sid => latestByStation[sid]?.biofilterEfficiencyPct?.toFixed(1) ?? '-') },
                ].map((row, idx) => (
                  <tr key={row.label} className={idx % 2 === 0 ? 'bg-white' : 'bg-muted/20'}>
                    <td className="p-2 font-medium text-muted-foreground">{row.label}</td>
                    {row.values.map((v, i) => (
                      <td key={i} className="p-2 text-center font-mono">{v}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
