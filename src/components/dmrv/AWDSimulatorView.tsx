'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef, useSyncExternalStore } from 'react';
import dynamic from 'next/dynamic';
import {
  Droplets, Play, Square, RotateCcw, Send, Thermometer, CloudRain,
  Gauge, Leaf, Wind, Activity, BarChart3, TrendingDown, TrendingUp,
  Sprout, Waves, MapPin, Zap, Clock, RefreshCw, ChevronDown,
  CheckCircle2, Shield, FileCheck, Satellite, Eye,
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
const AwdFieldMap = dynamic(() => import('./AwdFieldMap'), { ssr: false });

// ─── Types ──────────────────────────────────────────────────────────
interface AWDReading {
  tick: number;
  fieldId: string;
  fieldName: string;
  province: string;
  timestamp: string;
  simDAP: number;
  simHour: number;
  growthStage: string;
  // Variety profile (ใหม่)
  profileKey?: string;
  varietyName?: string;
  photosensitive?: boolean;
  awdActive?: boolean;
  drainForced?: boolean;
  awdPhase: string;
  awdCycles: number;
  waterLevelCm: number;
  soilMoisturePct: number;
  rainfallMmHr: number;
  airTempC: number;
  soilTempC: number;
  humidityPct: number;
  soilPH: number;
  // Emissions — raw sensor units
  ch4FluxMgM2Hr: number;
  n2oFluxMgM2Hr: number;
  co2FluxMgM2Hr: number;
  ch4CO2eMgM2Hr: number;
  n2oCO2eMgM2Hr: number;
  netGHGCO2eMgM2Hr: number;
  emissionReductionPct: number;
  // Emissions — T-VER standard units
  ch4EfKgHaDay?: number;       // kg CH₄/ha/day (T-VER EF)
  n2oEfKgHaDay?: number;       // kg N₂O/ha/day
  // Cumulative — T-VER standard units
  cumulativeCH4kg?: number;    // kg CH₄
cumulativeN2Okg?: number;    // kg N₂O
  cumulativeCH4tCO2e?: number;  // tCO₂e from CH₄
cumulativeN2OtCO2e?: number;  // tCO₂e from N₂O
  cumulativeNettCO2e?: number;  // tCO₂e net
  baselineEmissiontCO2e?: number; // tCO₂e baseline
  emissionReductiontCO2e?: number; // tCO₂e reduction
  // Legacy fields (backward compat)
  cumulativeCH4g?: number;
  cumulativeN2Og?: number;
  estimatedYieldKg: number;
  seasonComplete: boolean;
  // T-VER reference
  tverMethodology?: string;
  tverGwpCH4?: number;
  tverGwpN2O?: number;
  // Calculation mode
  calcMode?: 'full' | 'simplified';
  sfAWD?: number;        // Scaling factor applied (simplified mode only)
  baselineEFKgHaDay?: number;  // Baseline EF used (simplified mode only)
}

interface AWDFieldStatus {
  id: string;
  name: string;
  nameTh: string;
  province: string;
  provinceTh: string;
  lat: number;
  lng: number;
  areaHa: number;
  soilType: string;
  waterSource: string;
  riceVariety: string;
  totalDays: number;
  boundary: number[][];
  // ─── Variety profile fields (ใหม่: ปรับตามพันธุ์ + สภาพแวดล้อม) ───
  profileKey?: string;
  varietyName?: string;
  photosensitive?: boolean;
  stageThresholds?: {
    establishmentEndPct: number;
    vegetativeEndPct: number;
    reproductiveEndPct: number;
    maturityEndPct: number;
  };
  // AWD state flags (gate ตาม growth stage)
  awdActive?: boolean;
  drainForced?: boolean;
  currentDAP: number;
  currentHour: number;
  waterLevelCm: number;
  currentAWDPhase: string;
  awdCycles: number;
  growthStage: string;
  // T-VER standard cumulative units
  cumulativeCH4kg: number;
  cumulativeN2Okg: number;
  cumulativeCH4tCO2e: number;
  cumulativeN2OtCO2e: number;
  cumulativeNettCO2e: number;
  baselineEmissiontCO2e: number;
  emissionReductiontCO2e: number;
  estimatedYieldKg: number;
  seasonComplete: boolean;
  // Legacy
  cumulativeCH4g?: number;
  cumulativeN2Og?: number;
}

interface SimStatus {
  running: boolean;
  tickCounter: number;
  speedFactor: number;
  intervalMs: number;
  calcMode?: 'full' | 'simplified';
  fields: AWDFieldStatus[];
}

// ─── Config ─────────────────────────────────────────────────────────
const FIELD_CONFIG: Record<string, {
  color: string;
  emoji: string;
  label: string;
  labelTh: string;
  shortLabel: string;
}> = {
  'awd-korat': { color: '#10b981', emoji: '🌾', label: 'Nakhon Ratchasima (Irrigated)', labelTh: 'นครราชสีมา (ชลประทาน)', shortLabel: 'Korat' },
  'awd-suphan': { color: '#3b82f6', emoji: '🌧️', label: 'Suphan Buri (Rainfed)', labelTh: 'สุพรรณบุรี (น้ำฝน)', shortLabel: 'Suphan' },
  'awd-ubon': { color: '#f59e0b', emoji: '☀️', label: 'Ubon Ratchathani (Drought)', labelTh: 'อุบลราชธานี (แล้ง)', shortLabel: 'Ubon' },
};

const AWD_PHASE_CONFIG: Record<string, { color: string; bg: string; label: string; labelTh: string }> = {
  FLOODED: { color: 'text-blue-600', bg: 'bg-blue-50', label: 'Flooded', labelTh: 'น้ำท่วม' },
  DRAINING: { color: 'text-amber-600', bg: 'bg-amber-50', label: 'Draining', labelTh: 'ระบายน้ำ' },
  DRY: { color: 'text-orange-600', bg: 'bg-orange-50', label: 'Dry', labelTh: 'แห้ง' },
  REFLOODING: { color: 'text-cyan-600', bg: 'bg-cyan-50', label: 'Reflooding', labelTh: 'เติมน้ำ' },
};

// ─── Growth Stage 4 ช่วงหลัก (ปรับตามพันธุ์ + สภาพแวดล้อม) ─────────────
// แทนที่ 8 stages เดิม (GERMINATION/TILLERING/...) ด้วย 4 ช่วงตาม TGO/T-VER
const GROWTH_STAGE_CONFIG: Record<string, { icon: string; color: string; bg: string; label: string; labelTh: string }> = {
  ESTABLISHMENT: { icon: '🌱', color: 'text-emerald-700', bg: 'bg-emerald-50', label: 'Establishment', labelTh: 'ตั้งตัว' },
  VEGETATIVE:    { icon: '🌿', color: 'text-green-700',   bg: 'bg-green-50',   label: 'Vegetative',    labelTh: 'แตกกอ' },
  REPRODUCTIVE:  { icon: '🌸', color: 'text-pink-700',    bg: 'bg-pink-50',    label: 'Reproductive',  labelTh: 'ออกดอก/ผสมเกสร' },
  MATURITY:      { icon: '🌾', color: 'text-amber-700',    bg: 'bg-amber-50',   label: 'Maturity',       labelTh: 'สุกแก่' },
  HARVESTED:     { icon: '✅', color: 'text-slate-600',    bg: 'bg-slate-50',   label: 'Harvested',      labelTh: 'เก็บเกี่ยวแล้ว' },
};

// ─── AWD Active State (gate ตาม growth stage) ───────────────────────
// แสดงว่า AWD เปิดทำงานอยู่ (ช่วง Vegetative) หรือปิด (ช่วงอื่น ๆ)
const AWD_ACTIVE_CONFIG = {
  active:  { color: 'text-green-700',  bg: 'bg-green-100',   label: 'AWD Active',   labelTh: 'AWD เปิด'    },
  inactive:{ color: 'text-slate-600',  bg: 'bg-slate-100',   label: 'AWD Inactive', labelTh: 'AWD ปิด'    },
  drain:   { color: 'text-orange-700', bg: 'bg-orange-100',  label: 'Drain Forced', labelTh: 'บังคับระบาย' },
};

// Backward-compat: stage icons map (ใช้สำหรับ legacy stage names ถ้ายังมี)
const GROWTH_STAGE_ICONS: Record<string, string> = {
  ESTABLISHMENT: '🌱', VEGETATIVE: '🌿',
  REPRODUCTIVE: '🌸', MATURITY: '🌾', HARVESTED: '✅',
  // legacy (fallback)
  GERMINATION: '🌱', TILLERING: '🌿', STEM_ELONGATION: '🎋',
  BOOTING: '🎍', FLOWERING: '🌸', GRAIN_FILLING: '🌾',
};

const mountedEmptySub = () => () => {};
function useMounted() {
  return useSyncExternalStore(mountedEmptySub, () => true, () => false);
}

// ─── Component ──────────────────────────────────────────────────────
export default function AWDSimulatorView() {
  const mounted = useMounted();
  const [connected, setConnected] = useState(false);
  const [status, setStatus] = useState<SimStatus | null>(null);
  const [readings, setReadings] = useState<AWDReading[]>([]);
  const [sendingToDmrv, setSendingToDmrv] = useState(false);
  const [dMRVCount, setDMRVCount] = useState(0);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [standardMode, setStandardMode] = useState<'international' | 'tgo'>('tgo');
  const [calcMode, setCalcMode] = useState<'full' | 'simplified'>('full');
  const [switchingMode, setSwitchingMode] = useState(false);

  // Connect to simulator via Next.js proxy routes (HTTP polling)
  useEffect(() => {
    if (!mounted) return;

    let isRunning = false;

    // Poll status every 2 seconds
    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch('/api/awd/status');
        if (res.ok) {
          const data = await res.json();
          setStatus(data);
          setConnected(true);
          if (data.calcMode) setCalcMode(data.calcMode);
          isRunning = data.running;
        } else {
          setConnected(false);
        }
      } catch {
        setConnected(false);
      }
    }, 2000);

    // Poll readings every 2 seconds
    const readingsInterval = setInterval(async () => {
      if (!isRunning) return;
      try {
        const res = await fetch('/api/awd/readings?limit=50');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            setReadings(prev => {
              const lastTick = prev.length > 0 ? prev[prev.length - 1].tick : 0;
              const newReadings = data.filter((r: AWDReading) => r.tick > lastTick);
              if (newReadings.length === 0) return prev;
              return [...prev, ...newReadings].slice(-500);
            });
          }
        }
      } catch { /* ignore */ }
    }, 2000);

    // Initial fetch
    (async () => {
      try {
        const [statusRes, readingsRes] = await Promise.all([
          fetch('/api/awd/status'),
          fetch('/api/awd/readings?limit=100'),
        ]);
        if (statusRes.ok) {
          const data = await statusRes.json();
          setStatus(data);
          setConnected(true);
          if (data.calcMode) setCalcMode(data.calcMode);
          isRunning = data.running;
        }
        if (readingsRes.ok) {
          const data = await readingsRes.json();
          if (Array.isArray(data)) {
            setReadings(data.slice(-500));
          }
        }
      } catch { /* ignore */ }
    })();

    return () => {
      clearInterval(pollInterval);
      clearInterval(readingsInterval);
    };
  }, [mounted]);

  const startSim = useCallback(async () => {
    try {
      const res = await fetch('/api/awd/start', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        if (data.running) setStatus(prev => prev ? { ...prev, running: true } : prev);
      }
    } catch { /* ignore */ }
  }, []);
  const stopSim = useCallback(async () => {
    try {
      const res = await fetch('/api/awd/stop', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        if (!data.running) setStatus(prev => prev ? { ...prev, running: false } : prev);
      }
    } catch { /* ignore */ }
  }, []);
  const resetSim = useCallback(async () => {
    setReadings([]);
    hasAutoStartedRef.current = false;
    try {
      await fetch('/api/awd/reset', { method: 'POST' });
    } catch { /* ignore */ }
  }, []);

  // Switch calculation mode (Full Sensor ↔ Simplified)
  const switchMode = useCallback(async (mode: 'full' | 'simplified') => {
    if (mode === calcMode || switchingMode) return;
    setSwitchingMode(true);
    try {
      const res = await fetch('/api/awd/mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ calcMode: mode }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.calcMode) setCalcMode(data.calcMode);
        // Reset simulation when switching mode so cumulative values are consistent
        setReadings([]);
        hasAutoStartedRef.current = false;
        await fetch('/api/awd/reset', { method: 'POST' });
      }
    } catch { /* ignore */ }
    finally { setSwitchingMode(false); }
  }, [calcMode, switchingMode]);

  // Auto-start on initial connection only (not after manual stop)
  const hasAutoStartedRef = useRef(false);
  useEffect(() => {
    if (connected && status && !status.running && !hasAutoStartedRef.current && readings.length === 0) {
      hasAutoStartedRef.current = true;
      const timer = setTimeout(() => {
        fetch('/api/awd/start', { method: 'POST' }).catch(() => {});
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [connected, status?.running, readings.length]);

  // Send to dMRV
  const sendToDmrv = useCallback(async () => {
    if (readings.length === 0) return;
    setSendingToDmrv(true);
    try {
      const res = await fetch('/api/dmrv/awd-sim', {
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
  const fieldIds = useMemo(() => ['awd-korat', 'awd-suphan', 'awd-ubon'], []);

  const fieldReadings = useMemo(() => {
    const map: Record<string, AWDReading[]> = {};
    for (const fid of fieldIds) {
      map[fid] = readings.filter(r => r.fieldId === fid).slice(-200);
    }
    return map;
  }, [readings, fieldIds]);

  const latestByField = useMemo(() => {
    const map: Record<string, AWDReading | null> = {};
    for (const fid of fieldIds) {
      const arr = fieldReadings[fid];
      map[fid] = arr.length > 0 ? arr[arr.length - 1] : null;
    }
    return map;
  }, [fieldReadings, fieldIds]);

  // Chart data - grouped by tick
  const chartData = useMemo(() => {
    const tickMap: Record<number, Record<string, AWDReading>> = {};
    for (const r of readings) {
      if (!tickMap[r.tick]) tickMap[r.tick] = {};
      tickMap[r.tick][r.fieldId] = r;
    }
    return Object.entries(tickMap)
      .sort(([a], [b]) => Number(a) - Number(b))
      .slice(-100)
      .map(([tick, fields]) => {
        const entry: Record<string, number | string> = { tick: Number(tick), dap: 0 };
        for (const [fid, r] of Object.entries(fields)) {
          const cfg = FIELD_CONFIG[fid];
          if (!cfg) continue;
          const key = cfg.shortLabel;
          entry[`${key}_water`] = r.waterLevelCm;
          entry[`${key}_ch4`] = r.ch4EfKgHaDay ?? (r.ch4FluxMgM2Hr * 0.24); // T-VER: kg CH₄/ha/day
          entry[`${key}_n2o`] = r.n2oEfKgHaDay ?? (r.n2oFluxMgM2Hr * 0.24); // T-VER: kg N₂O/ha/day
          entry[`${key}_ch4_tgo`] = r.ch4EfKgHaDay ?? (r.ch4FluxMgM2Hr * 0.24); // kg CH₄/ha/day
          entry[`${key}_ch4_intl`] = r.ch4FluxMgM2Hr; // mg/m²/hr
          entry[`${key}_n2o_tgo`] = r.n2oEfKgHaDay ?? (r.n2oFluxMgM2Hr * 0.24); // kg N₂O/ha/day
          entry[`${key}_n2o_intl`] = r.n2oFluxMgM2Hr; // mg/m²/hr
          entry[`${key}_co2e`] = r.cumulativeNettCO2e ?? r.netGHGCO2eMgM2Hr;
          entry[`${key}_temp`] = r.airTempC;
          entry[`${key}_moisture`] = r.soilMoisturePct;
          entry[`${key}_rain`] = r.rainfallMmHr;
          entry[`${key}_reduction`] = r.emissionReductionPct;
          entry[`${key}_er_tco2e`] = r.emissionReductiontCO2e ?? 0;
          entry['dap'] = r.simDAP;
        }
        return entry;
      });
  }, [readings]);

  // Summary stats
  const totalReadings = readings.length;
  const completedFields = status?.fields.filter(f => f.seasonComplete).length || 0;
  const totalAWDCycles = status?.fields.reduce((s, f) => s + f.awdCycles, 0) || 0;
  const avgEmissionReduction = useMemo(() => {
    const allReductions = readings.filter(r => r.emissionReductionPct > 0).map(r => r.emissionReductionPct);
    if (allReductions.length === 0) return 0;
    return Math.round(allReductions.reduce((a, b) => a + b, 0) / allReductions.length * 10) / 10;
  }, [readings]);
  const totalYieldKg = status?.fields.reduce((s, f) => s + f.estimatedYieldKg, 0) || 0;
  // T-VER standard: total emission reduction in tCO₂e
  const totalEmissionReductiontCO2e = useMemo(() => {
    if (!status?.fields) return 0;
    return status.fields.reduce((s, f) => s + (f.emissionReductiontCO2e || 0), 0);
  }, [status?.fields]);

  if (!mounted) {
    return <div className="flex items-center justify-center h-64"><RefreshCw className="h-8 w-8 animate-spin text-emerald-600" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-emerald-700 via-green-600 to-teal-600 p-6 text-white">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-4 right-10 text-8xl">🌾</div>
          <div className="absolute bottom-2 left-20 text-6xl">💧</div>
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <Sprout className="h-7 w-7" />
            <h2 className="text-2xl font-bold">AWD Rice Cultivation Simulator</h2>
            <Badge className="bg-white/20 text-white hover:bg-white/30 text-xs">1800x Speed</Badge>
            <Badge className="bg-amber-500/80 text-white text-[9px]">T-VER-P-AG-001</Badge>
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
            Alternate Wetting & Drying (AWD) simulation for 3 rice fields with different environments in Thailand
          </p>
          <p className="text-[10px] text-white/60 mb-3">
            {standardMode === 'tgo'
              ? 'อ้างอิงมาตรฐาน: T-VER-P-AG-001 (การลดการปล่อยก๊าซมีเทนจากการปลูกข้าวโดยวิธี AWD) | TGO Guidelines 2566 | GWP: CH₄=28, N₂O=265 (IPCC AR5) | หน่วย: kg CH₄/ha/day, tCO₂e'
              : 'Reference: IPCC 2006 Guidelines Vol. 4 Ch. 5 | IPCC AR5 GWP: CH₄=28, N₂O=265 | ISO 14064-2 | Units: mg CH₄/m²/hr, g CH₄ cumulative'
            }
          </p>
          {/* Calculation Mode Toggle — Full Sensor vs Simplified (water level only) */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="text-[10px] text-white/70 font-medium">โหมดคำนวณ:</span>
            <div className="flex items-center gap-0.5 bg-white/10 rounded-lg p-0.5 text-[10px]">
              <button
                onClick={() => switchMode('full')}
                disabled={switchingMode}
                title="Full Sensor Mode — empirical model using 10+ sensor variables (CH₄, N₂O, CO₂, temperature, soil moisture, pH, etc.)"
                className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1 ${calcMode === 'full' ? 'bg-white/25 font-bold text-white' : 'hover:bg-white/10 text-white/70'} ${switchingMode ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <Gauge className="h-3 w-3" /> Full Sensor (10+ sensors)
              </button>
              <button
                onClick={() => switchMode('simplified')}
                disabled={switchingMode}
                title="Simplified Mode — IPCC Tier 1 default method, water level sensor only. CH₄ = baseline EF × SF_AWD × Area × Period"
                className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1 ${calcMode === 'simplified' ? 'bg-amber-400/40 font-bold text-amber-50' : 'hover:bg-white/10 text-white/70'} ${switchingMode ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <Droplets className="h-3 w-3" /> Simplified (water level only)
              </button>
            </div>
            {switchingMode && <RefreshCw className="h-3 w-3 animate-spin text-white/60" />}
            {calcMode === 'simplified' && (
              <Badge className="bg-amber-400/30 text-amber-50 border-amber-300/40 text-[9px]">
                IPCC Tier 1 · SF_AWD: 0 AWD=1.00 · 1 cycle=0.60 · 2+ cycles=0.52
              </Badge>
            )}
            {calcMode === 'full' && (
              <Badge className="bg-cyan-400/30 text-cyan-50 border-cyan-300/40 text-[9px]">
                Empirical Model · CH₄+N₂O+CO₂ flux
              </Badge>
            )}
          </div>
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
        </div>
      </div>

      {/* Simplified Mode Info Banner — shows methodology & SF_AWD table */}
      {calcMode === 'simplified' && (
        <div className="rounded-xl border-2 border-amber-400/40 bg-amber-50/80 p-4">
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 rounded-lg bg-amber-400/30 flex items-center justify-center shrink-0">
              <Droplets className="h-5 w-5 text-amber-700" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-bold text-amber-900 mb-1">
                Simplified Mode — IPCC Tier 1 (Water Level Only)
              </h3>
              <p className="text-xs text-amber-800 mb-3 leading-relaxed">
                โหมดนี้ใช้ sensor วัดระดับน้ำเพียงตัวเดียว และคำนวณ CH₄ จากค่าเริ่มต้น IPCC 2019 Refinement:
                <code className="bg-amber-100/80 px-1.5 py-0.5 rounded text-[11px] ml-1">CH₄ = EF_baseline × SF_AWD × Area × Period</code>
                <br/>
                จำนวนรอบ AWD (drainage cycles) นับจากการที่ระดับน้ำลดลงต่ำกว่าผิวดิน แล้วกลับมาท่วมอีกครั้ง — ไม่ต้องวัด gas flux โดยตรง
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
                <div className="bg-white/70 rounded-lg p-2 border border-amber-300/50">
                  <div className="font-semibold text-amber-900">0 cycles</div>
                  <div className="text-amber-700">SF_AWD = 1.00</div>
                  <div className="text-amber-600/80">continuous flooding (baseline)</div>
                </div>
                <div className="bg-white/70 rounded-lg p-2 border border-amber-300/50">
                  <div className="font-semibold text-amber-900">1 cycle</div>
                  <div className="text-amber-700">SF_AWD = 0.60</div>
                  <div className="text-amber-600/80">ลด CH₄ ~40%</div>
                </div>
                <div className="bg-white/70 rounded-lg p-2 border border-amber-300/50">
                  <div className="font-semibold text-amber-900">2+ cycles</div>
                  <div className="text-amber-700">SF_AWD = 0.52</div>
                  <div className="text-amber-600/80">ลด CH₄ ~48%</div>
                </div>
                <div className="bg-white/70 rounded-lg p-2 border border-amber-300/50">
                  <div className="font-semibold text-amber-900">Baseline EF</div>
                  <div className="text-amber-700">1.30 / 1.00 / 0.70</div>
                  <div className="text-amber-600/80">kg CH₄/ha/day (นาชลประทาน/ฝน/แล้ง)</div>
                </div>
              </div>
              <p className="text-[10px] text-amber-700/80 mt-2">
                ⚠️ โหมดนี้ไม่คำนวณ N₂O และ CO₂ (IPCC Tier 1 สำหรับ AWD พิจารณาเฉพาะ CH₄) — ค่าที่แสดงเป็น 0 หรือ "not measured"
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Full Sensor Mode Info Banner */}
      {calcMode === 'full' && (
        <div className="rounded-xl border border-cyan-400/30 bg-cyan-50/50 p-3">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-cyan-400/30 flex items-center justify-center shrink-0">
              <Gauge className="h-4 w-4 text-cyan-700" />
            </div>
            <p className="text-xs text-cyan-900">
              <span className="font-semibold">Full Sensor Mode:</span>{' '}
              คำนวณ CH₄, N₂O, และ CO₂ flux จาก empirical model ที่ใช้ตัวแปร 10+ ตัว (ระดับน้ำ, อุณหภูมิ, ความชื้นดิน, pH, ระยะการเจริญเติบโต ฯลฯ) — แม่นยำกว่าแต่ต้องการฮาร์ดแวร์เซนเซอร์มากกว่า
            </p>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { icon: Activity, label: 'IoT Readings', value: totalReadings.toLocaleString(), color: 'text-blue-600', bg: 'bg-blue-50' },
          { icon: CheckCircle2, label: 'Fields Complete', value: `${completedFields}/3`, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { icon: Waves, label: 'AWD Cycles', value: totalAWDCycles, color: 'text-cyan-600', bg: 'bg-cyan-50' },
          { icon: TrendingDown, label: standardMode === 'tgo' ? 'ER (tCO\u2082e)' : 'ER (gCO\u2082e)', value: standardMode === 'tgo' ? `${totalEmissionReductiontCO2e.toFixed(3)}` : `${(totalEmissionReductiontCO2e * 1000000).toFixed(1)}`, color: standardMode === 'tgo' ? 'text-green-600' : 'text-teal-600', bg: standardMode === 'tgo' ? 'bg-green-50' : 'bg-teal-50' },
          { icon: Sprout, label: 'Est. Yield (t)', value: `${(totalYieldKg / 1000).toFixed(1)}`, color: 'text-amber-600', bg: 'bg-amber-50' },
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

      {/* TGO/T-VER Methodology Reference */}
      <Card className={standardMode === 'tgo' ? 'border-amber-200 bg-amber-50/50' : 'border-blue-200 bg-blue-50/50'}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${standardMode === 'tgo' ? 'bg-amber-100' : 'bg-blue-100'}`}>
              <Shield className={`h-4 w-4 ${standardMode === 'tgo' ? 'text-amber-600' : 'text-blue-600'}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className={`text-sm font-bold ${standardMode === 'tgo' ? 'text-amber-800' : 'text-blue-800'}`}>
                  {standardMode === 'tgo' ? 'TGO/T-VER Methodology Reference' : 'International Standard Reference'}
                </p>
                <Badge className={`${standardMode === 'tgo' ? 'bg-amber-200 text-amber-800' : 'bg-blue-200 text-blue-800'} text-[9px] h-4`}>
                  {standardMode === 'tgo' ? 'T-VER-P-AG-001' : 'IPCC 2006/AR5'}
                </Badge>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[10px]">
                {standardMode === 'tgo' ? (
                  <div className="text-amber-700">
                    <p className="font-semibold mb-0.5">Emission Factor (EF)</p>
                    <p>นาชลประทาน: 1.30 kg CH₄/ha/day</p>
                    <p>นาน้ำฝน: 1.00 kg CH₄/ha/day</p>
                    <p>นาแล้ง: 0.70 kg CH₄/ha/day</p>
                  </div>
                ) : (
                  <div className="text-blue-700">
                    <p className="font-semibold mb-0.5">Emission Factor (IPCC)</p>
                    <p>Default EF: 1.30 kg CH₄/ha/day</p>
                    <p>Scaling: SFw × SFp × SFo</p>
                    <p>Flux unit: mg CH₄/m²/hr</p>
                  </div>
                )}
                {standardMode === 'tgo' ? (
                  <div className="text-amber-700">
                    <p className="font-semibold mb-0.5">GWP (TGO 2566 / IPCC AR5)</p>
                    <p>CH₄ = 28 kgCO₂e/kg</p>
                    <p>N₂O = 265 kgCO₂e/kg</p>
                    <p>ER = (Baseline - Project) tCO₂e</p>
                  </div>
                ) : (
                  <div className="text-blue-700">
                    <p className="font-semibold mb-0.5">GWP (IPCC AR5)</p>
                    <p>CH₄ = 28 kgCO₂e/kg</p>
                    <p>N₂O = 265 kgCO₂e/kg</p>
                    <p>Net GHG = CH₄ + N₂O - CO₂ offset</p>
                  </div>
                )}
                {standardMode === 'tgo' ? (
                  <div className="text-amber-700">
                    <p className="font-semibold mb-0.5">Credit Calculation</p>
                    <p>ER = EF_CF × Days × Area × GWP_CH₄ - EF_AWD × Days × Area × GWP_CH₄</p>
                    <p>Unit: tCO₂e (tonnes CO₂ equivalent)</p>
                  </div>
                ) : (
                  <div className="text-blue-700">
                    <p className="font-semibold mb-0.5">Measurement Units</p>
                    <p>Flux: mg/m²/hr (chamber method)</p>
                    <p>Cumulative: g CH₄, g N₂O</p>
                    <p>CO₂e: g CO₂e (ISO 14064-2)</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Map + Field Cards Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Map (3/5 width on large) */}
        <div className="lg:col-span-3">
          <Card className="shadow-sm overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="h-4 w-4 text-emerald-600" />
                AWD Field Map
                <Badge variant="secondary" className="text-[9px] h-4">3 Sites</Badge>
                {selectedFieldId && (
                  <Badge className="text-[9px] h-4" style={{ background: FIELD_CONFIG[selectedFieldId]?.color + '20', color: FIELD_CONFIG[selectedFieldId]?.color }}>
                    {FIELD_CONFIG[selectedFieldId]?.shortLabel}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div style={{ height: 440 }}>
                <AwdFieldMap
                  fields={(status?.fields || []).map(f => ({
                    ...f,
                    nameTh: f.nameTh || f.name,
                    provinceTh: f.provinceTh || f.province,
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

        {/* Field Info Sidebar (2/5 width on large) */}
        <div className="lg:col-span-2 space-y-3">
          {fieldIds.map(fid => {
            const cfg = FIELD_CONFIG[fid];
            const field = status?.fields.find(f => f.id === fid);
            const latest = latestByField[fid];
            const awdPhase = latest?.awdPhase || field?.currentAWDPhase || 'FLOODED';
            const phaseCfg = AWD_PHASE_CONFIG[awdPhase] || AWD_PHASE_CONFIG.FLOODED;
            const growthStage = latest?.growthStage || field?.growthStage || 'ESTABLISHMENT';
            const stageCfg = GROWTH_STAGE_CONFIG[growthStage] || GROWTH_STAGE_CONFIG.ESTABLISHMENT;
            // AWD active state (gate ตาม growth stage — ปรับตามพันธุ์ + สภาพแวดล้อม)
            const awdActive = latest?.awdActive ?? field?.awdActive ?? false;
            const drainForced = latest?.drainForced ?? field?.drainForced ?? false;
            const awdStateCfg = drainForced ? AWD_ACTIVE_CONFIG.drain : (awdActive ? AWD_ACTIVE_CONFIG.active : AWD_ACTIVE_CONFIG.inactive);
            const progress = field ? Math.min((field.currentDAP / field.totalDays) * 100, 100) : 0;
            const isSelected = selectedFieldId === fid;

            return (
              <Card
                key={fid}
                className={`shadow-sm border-l-4 cursor-pointer transition-all ${isSelected ? 'ring-2 ring-offset-1' : 'hover:shadow-md'}`}
                style={{ borderLeftColor: cfg.color, ...(isSelected ? { ringColor: cfg.color } : {}) }}
                onClick={() => setSelectedFieldId(isSelected ? null : fid)}
              >
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{cfg.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate">{standardMode === 'tgo' ? cfg.labelTh : cfg.label}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {field?.varietyName || field?.riceVariety} &middot; {field?.soilType}
                      </p>
                    </div>
                    <Badge className={`${phaseCfg.bg} ${phaseCfg.color} text-[9px] h-5 shrink-0`}>
                      <Waves className="h-2.5 w-2.5 mr-1" />
                      {standardMode === 'tgo' ? phaseCfg.labelTh : phaseCfg.label}
                    </Badge>
                  </div>

                  {/* AWD Active/Inactive badge — บอกว่า growth stage ปัจจุบันอนุญาตให้ AWD ทำงานหรือไม่ */}
                  <div className="flex items-center gap-1.5">
                    <Badge className={`${awdStateCfg.bg} ${awdStateCfg.color} text-[9px] h-4 shrink-0`}>
                      <Zap className="h-2.5 w-2.5 mr-1" />
                      {standardMode === 'tgo' ? awdStateCfg.labelTh : awdStateCfg.label}
                    </Badge>
                    {field?.profileKey && (
                      <span className="text-[9px] text-muted-foreground">
                        {field.photosensitive ? '☀️ ไวแสง' : '📜 ไม่ไวแสง'}
                      </span>
                    )}
                  </div>

                  {/* Progress */}
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="flex items-center gap-1">
                        <span>{stageCfg.icon}</span>
                        <span className="font-medium text-[11px]">
                          {standardMode === 'tgo' ? stageCfg.labelTh : stageCfg.label}
                        </span>
                      </span>
                      <span className="text-muted-foreground text-[10px]">DAP {field?.currentDAP || 0}/{field?.totalDays || '?'}</span>
                    </div>
                    <Progress value={progress} className="h-1.5" />
                    {/* Growth stage threshold markers — แสดงขอบเขต 4 ช่วงตามพันธุ์ */}
                    {field?.stageThresholds && (
                      <div className="relative h-1 mt-0.5">
                        <div className="absolute inset-0 flex">
                          <div className="bg-emerald-200/60" style={{ width: `${field.stageThresholds.establishmentEndPct}%` }} title="Establishment" />
                          <div className="bg-green-300/60" style={{ width: `${field.stageThresholds.vegetativeEndPct - field.stageThresholds.establishmentEndPct}%` }} title="Vegetative (AWD active)" />
                          <div className="bg-pink-200/60" style={{ width: `${Math.min(field.stageThresholds.reproductiveEndPct, 100) - field.stageThresholds.vegetativeEndPct}%` }} title="Reproductive" />
                          <div className="bg-amber-200/60" style={{ width: `${100 - Math.min(field.stageThresholds.reproductiveEndPct, 100)}%` }} title="Maturity" />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Metrics Grid */}
                  <div className="grid grid-cols-4 gap-1.5 text-[10px]">
                    <div className="bg-muted/50 rounded p-1.5 text-center">
                      <Droplets className="h-2.5 w-2.5 mx-auto text-blue-500" />
                      <div className="font-bold text-[11px]">{latest?.waterLevelCm ?? field?.waterLevelCm ?? 0}</div>
                      <div className="text-[8px] text-muted-foreground">cm</div>
                    </div>
                    <div className="bg-muted/50 rounded p-1.5 text-center">
                      <Thermometer className="h-2.5 w-2.5 mx-auto text-red-500" />
                      <div className="font-bold text-[11px]">{latest?.airTempC?.toFixed(0) ?? '--'}</div>
                      <div className="text-[8px] text-muted-foreground">°C</div>
                    </div>
                    <div className={standardMode === 'tgo' ? 'bg-green-50 rounded p-1.5 text-center' : 'bg-teal-50 rounded p-1.5 text-center'}>
                      <Wind className={`h-2.5 w-2.5 mx-auto ${standardMode === 'tgo' ? 'text-green-500' : 'text-teal-500'}`} />
                      <div className={`font-bold text-[11px] ${standardMode === 'tgo' ? 'text-green-700' : 'text-teal-700'}`}>
                        {standardMode === 'tgo'
                          ? (latest?.ch4EfKgHaDay?.toFixed(3) ?? (latest?.ch4FluxMgM2Hr ? (latest.ch4FluxMgM2Hr * 0.24).toFixed(3) : '--'))
                          : (latest?.ch4FluxMgM2Hr?.toFixed(2) ?? '--')
                        }
                      </div>
                      <div className={`text-[8px] ${standardMode === 'tgo' ? 'text-green-600' : 'text-teal-600'}`}>
                        {standardMode === 'tgo' ? 'kg CH₄/ha/d' : 'mg CH₄/m²/hr'}
                      </div>
                    </div>
                    <div className={standardMode === 'tgo' ? 'bg-amber-50 rounded p-1.5 text-center' : 'bg-indigo-50 rounded p-1.5 text-center'}>
                      <TrendingDown className={`h-2.5 w-2.5 mx-auto ${standardMode === 'tgo' ? 'text-amber-500' : 'text-indigo-500'}`} />
                      <div className={`font-bold text-[11px] ${standardMode === 'tgo' ? 'text-amber-700' : 'text-indigo-700'}`}>
                        {standardMode === 'tgo'
                          ? (field?.emissionReductiontCO2e?.toFixed(3) ?? '--')
                          : (field?.emissionReductiontCO2e ? (field.emissionReductiontCO2e * 1000000).toFixed(0) : '--')
                        }
                      </div>
                      <div className={`text-[8px] ${standardMode === 'tgo' ? 'text-amber-600' : 'text-indigo-600'}`}>
                        {standardMode === 'tgo' ? 'tCO₂e ER' : 'gCO₂e ER'}
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center gap-2 text-[9px] text-muted-foreground">
                    <MapPin className="h-2.5 w-2.5" />
                    <span>{field?.lat?.toFixed(2)}°N, {field?.lng?.toFixed(2)}°E</span>
                    <span className="ml-auto">{standardMode === 'tgo' ? `${((field?.areaHa ?? 0) * 6.25).toLocaleString(undefined, {maximumFractionDigits: 1})} ไร่` : `${field?.areaHa} ha`}</span>
                    <span>&middot; Cycles: {field?.awdCycles || 0}</span>
                    {field?.seasonComplete && <span className="text-emerald-600 font-medium">✅ Complete</span>}
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
            Simulation Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="water" className="space-y-4">
            <TabsList className="h-8">
              <TabsTrigger value="water" className="text-xs h-6 gap-1"><Waves className="h-3 w-3" /> Water Level</TabsTrigger>
              <TabsTrigger value="emissions" className="text-xs h-6 gap-1"><Wind className="h-3 w-3" /> CH\u2084 & N\u2082O</TabsTrigger>
              <TabsTrigger value="climate" className="text-xs h-6 gap-1"><Thermometer className="h-3 w-3" /> Climate</TabsTrigger>
              <TabsTrigger value="ghg" className="text-xs h-6 gap-1"><TrendingDown className="h-3 w-3" /> GHG & Reduction</TabsTrigger>
              <TabsTrigger value="comparison" className="text-xs h-6 gap-1"><BarChart3 className="h-3 w-3" /> Comparison</TabsTrigger>
            </TabsList>

            {/* Water Level */}
            <TabsContent value="water">
              <ResponsiveContainer width="100%" height={350}>
                <ComposedChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="dap" tick={{ fontSize: 10 }} label={{ value: 'DAP', position: 'insideBottom', offset: -2, fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} label={{ value: 'Water Level (cm)', angle: -90, position: 'insideLeft', fontSize: 10 }} />                  <Tooltip contentStyle={{ fontSize: 11 }} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="3 3" label={{ value: 'Soil Surface', fontSize: 9, fill: '#94a3b8' }} />
                  {fieldIds.map(fid => {
                    const cfg = FIELD_CONFIG[fid];
                    return <Area key={fid} type="monotone" dataKey={`${cfg.shortLabel}_water`} name={`${cfg.shortLabel} Water`} fill={cfg.color} fillOpacity={0.15} stroke={cfg.color} strokeWidth={2} />;
                  })}
                </ComposedChart>
              </ResponsiveContainer>
            </TabsContent>

            {/* CH4 & N2O */}
            <TabsContent value="emissions">
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="dap" tick={{ fontSize: 10 }} label={{ value: 'DAP', position: 'insideBottom', offset: -2, fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} label={{ value: standardMode === 'tgo' ? 'CH\u2084 (kg/ha/day)' : 'CH\u2084 (mg/m\u00b2/hr)', angle: -90, position: 'insideLeft', fontSize: 10 }} />
                  <Tooltip contentStyle={{ fontSize: 11 }} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  {fieldIds.map(fid => {
                    const cfg = FIELD_CONFIG[fid];
                    return <Line key={fid} type="monotone" dataKey={standardMode === 'tgo' ? `${cfg.shortLabel}_ch4_tgo` : `${cfg.shortLabel}_ch4_intl`} name={`${cfg.shortLabel} CH\u2084`} stroke={cfg.color} strokeWidth={2} dot={false} />;
                  })}
                </LineChart>
              </ResponsiveContainer>
            </TabsContent>

            {/* Climate */}
            <TabsContent value="climate">
              <ResponsiveContainer width="100%" height={350}>
                <ComposedChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="dap" tick={{ fontSize: 10 }} />
                  <YAxis yAxisId="temp" tick={{ fontSize: 10 }} label={{ value: 'Temp (°C)', angle: -90, position: 'insideLeft', fontSize: 10 }} />
                  <YAxis yAxisId="rain" orientation="right" tick={{ fontSize: 10 }} label={{ value: 'Rain (mm/hr)', angle: 90, position: 'insideRight', fontSize: 10 }} />
                  <Tooltip contentStyle={{ fontSize: 11 }} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  {fieldIds.map(fid => (
                    <Line key={fid} yAxisId="temp" type="monotone" dataKey={`${FIELD_CONFIG[fid].shortLabel}_temp`} name={`${FIELD_CONFIG[fid].shortLabel} Temp`} stroke={FIELD_CONFIG[fid].color} strokeWidth={1.5} dot={false} />
                  ))}
                  <Bar yAxisId="rain" dataKey="Korat_rain" name="Rain (Korat)" fill="#3b82f6" fillOpacity={0.4} />
                </ComposedChart>
              </ResponsiveContainer>
            </TabsContent>

            {/* GHG & Reduction */}
            <TabsContent value="ghg">
              <ResponsiveContainer width="100%" height={350}>
                <ComposedChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="dap" tick={{ fontSize: 10 }} />
                  <YAxis yAxisId="co2e" tick={{ fontSize: 10 }} label={{ value: 'tCO\u2082e', angle: -90, position: 'insideLeft', fontSize: 10 }} />
                  <YAxis yAxisId="reduction" orientation="right" tick={{ fontSize: 10 }} domain={[0, 50]} label={{ value: 'Reduction %', angle: 90, position: 'insideRight', fontSize: 10 }} />
                  <Tooltip contentStyle={{ fontSize: 11 }} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  {fieldIds.map(fid => (
                    <Area key={fid} yAxisId="co2e" type="monotone" dataKey={`${FIELD_CONFIG[fid].shortLabel}_co2e`} name={`${FIELD_CONFIG[fid].shortLabel} tCO\u2082e`} fill={FIELD_CONFIG[fid].color} fillOpacity={0.1} stroke={FIELD_CONFIG[fid].color} strokeWidth={2} />
                  ))}
                  <Line yAxisId="reduction" type="monotone" dataKey="Korat_reduction" name="CH\u2084 Reduction %" stroke="#10b981" strokeWidth={2} dot={false} strokeDasharray="5 3" />
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
                            <th key={f.id} className="p-2 text-center font-medium" style={{ color: FIELD_CONFIG[f.id]?.color }}>
                              {FIELD_CONFIG[f.id]?.shortLabel}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          ['Soil Type', ...status.fields.map(f => f.soilType)],
                          ['Water Source', ...status.fields.map(f => f.waterSource)],
                          ['Rice Variety', ...status.fields.map(f => f.riceVariety)],
                          [standardMode === 'tgo' ? 'Area (ไร่)' : 'Area (ha)', ...status.fields.map(f => standardMode === 'tgo' ? (f.areaHa * 6.25).toFixed(1) : f.areaHa.toString())],
                          ['Current DAP', ...status.fields.map(f => f.currentDAP.toString())],
                          ['AWD Cycles', ...status.fields.map(f => f.awdCycles.toString())],
                          ['Water Level (cm)', ...status.fields.map(f => f.waterLevelCm.toFixed(1))],
                          ['CH\u2084 Cumulative', ...status.fields.map(f => standardMode === 'tgo' ? `${(f.cumulativeCH4kg || 0).toFixed(3)} kg` : `${((f.cumulativeCH4kg || 0) * 1000).toFixed(1)} g`)],
                          ['N\u2082O Cumulative', ...status.fields.map(f => standardMode === 'tgo' ? `${(f.cumulativeN2Okg || 0).toFixed(3)} kg` : `${((f.cumulativeN2Okg || 0) * 1000).toFixed(1)} g`)],
                          ['Net GHG', ...status.fields.map(f => standardMode === 'tgo' ? `${(f.cumulativeNettCO2e || 0).toFixed(4)} tCO\u2082e` : `${((f.cumulativeNettCO2e || 0) * 1000000).toFixed(0)} gCO\u2082e`)],
                          ['Baseline', ...status.fields.map(f => standardMode === 'tgo' ? `${(f.baselineEmissiontCO2e || 0).toFixed(4)} tCO\u2082e` : `${((f.baselineEmissiontCO2e || 0) * 1000000).toFixed(0)} gCO\u2082e`)],
                          ['ER', ...status.fields.map(f => standardMode === 'tgo' ? `${(f.emissionReductiontCO2e || 0).toFixed(4)} tCO\u2082e` : `${((f.emissionReductiontCO2e || 0) * 1000000).toFixed(0)} gCO\u2082e`)],
                          ['Est. Yield (kg)', ...status.fields.map(f => f.estimatedYieldKg.toLocaleString())],
                          ['Season', ...status.fields.map(f => f.seasonComplete ? '\u2705 Complete' : '\uD83D\uDD04 Active')],
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

                  {/* Yield Comparison Bar Chart */}
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={status.fields.map(f => ({
                      name: FIELD_CONFIG[f.id]?.shortLabel || f.id,
                      yield: f.estimatedYieldKg,
                      ch4kg: f.cumulativeCH4kg || 0,
                      n2okg: f.cumulativeN2Okg || 0,
                      tco2e: f.cumulativeNettCO2e || 0,
                      baseline: f.baselineEmissiontCO2e || 0,
                      er: f.emissionReductiontCO2e || 0,
                      area: f.areaHa,
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Bar dataKey="yield" name="Yield (kg)" fill="#10b981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="er" name="ER (tCO\u2082e)" fill="#f59e0b" radius={[4, 4, 0, 0]} />
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
              { icon: Activity, label: 'IoT Sensors', sub: `${totalReadings} readings`, color: 'bg-blue-50 text-blue-600' },
              { icon: Shield, label: 'Validate', sub: 'Integrity check', color: 'bg-emerald-50 text-emerald-600' },
              { icon: Leaf, label: 'Quantify', sub: 'CH₄/N₂O/CO₂', color: 'bg-green-50 text-green-600' },
              { icon: FileCheck, label: standardMode === 'tgo' ? 'T-VER Credit' : 'Carbon Credit', sub: standardMode === 'tgo' ? `${totalEmissionReductiontCO2e.toFixed(3)} tCO₂e` : `${(totalEmissionReductiontCO2e * 1000000).toFixed(0)} gCO₂e`, color: standardMode === 'tgo' ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600' },
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
        </CardContent>
      </Card>

      {/* Recent Readings Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4 text-emerald-600" />
            Recent IoT Readings
            <Badge variant="secondary" className="text-[9px] h-4">{readings.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-h-64 overflow-y-auto sidebar-scroll">
            <table className="w-full text-[10px]">
              <thead className="sticky top-0 bg-background">
                <tr className="border-b">
                  <th className="p-1.5 text-left font-medium">DAP</th>
                  <th className="p-1.5 text-left font-medium">Field</th>
                  <th className="p-1.5 text-left font-medium">Phase</th>
                  <th className="p-1.5 text-right font-medium">Water(cm)</th>
                  <th className="p-1.5 text-right font-medium">Temp°C</th>
                  <th className="p-1.5 text-right font-medium">{standardMode === 'tgo' ? 'CH₄ (kg/ha/d)' : 'CH₄ (mg/m²/hr)'}</th>
                  <th className="p-1.5 text-right font-medium">{standardMode === 'tgo' ? 'N₂O (kg/ha/d)' : 'N₂O (mg/m²/hr)'}</th>
                  <th className="p-1.5 text-right font-medium">{standardMode === 'tgo' ? 'CO₂e' : 'CO₂e (mg/m²/hr)'}</th>
                  <th className="p-1.5 text-right font-medium">{standardMode === 'tgo' ? 'ER (tCO₂e)' : 'ER (gCO₂e)'}</th>
                </tr>
              </thead>
              <tbody>
                {readings.slice(-30).reverse().map((r, i) => {
                  const cfg = FIELD_CONFIG[r.fieldId];
                  const phaseCfg = AWD_PHASE_CONFIG[r.awdPhase];
                  return (
                    <tr key={i} className="border-b border-muted/50 hover:bg-muted/30">
                      <td className="p-1.5">{r.simDAP}</td>
                      <td className="p-1.5 font-medium" style={{ color: cfg?.color }}>{cfg?.emoji} {cfg?.shortLabel}</td>
                      <td className="p-1.5"><Badge className={`${phaseCfg?.bg} ${phaseCfg?.color} text-[8px] h-3.5 hover:${phaseCfg?.bg}`}>{r.awdPhase}</Badge></td>
                      <td className="p-1.5 text-right">{r.waterLevelCm}</td>
                      <td className="p-1.5 text-right">{r.airTempC}</td>
                      <td className="p-1.5 text-right text-green-600">{standardMode === 'tgo' ? (r.ch4EfKgHaDay?.toFixed(3) ?? (r.ch4FluxMgM2Hr * 0.24).toFixed(3)) : r.ch4FluxMgM2Hr?.toFixed(2)}</td>
                      <td className="p-1.5 text-right text-purple-600">{standardMode === 'tgo' ? (r.n2oEfKgHaDay?.toFixed(4) ?? (r.n2oFluxMgM2Hr * 0.24).toFixed(4)) : r.n2oFluxMgM2Hr?.toFixed(3)}</td>
                      <td className="p-1.5 text-right">{r.netGHGCO2eMgM2Hr?.toFixed(1)}</td>
                      <td className="p-1.5 text-right text-emerald-600 font-medium">{standardMode === 'tgo' ? (r.emissionReductiontCO2e?.toFixed(4) ?? '--') : (r.emissionReductiontCO2e ? (r.emissionReductiontCO2e * 1000000).toFixed(0) : '--')}</td>
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
                  