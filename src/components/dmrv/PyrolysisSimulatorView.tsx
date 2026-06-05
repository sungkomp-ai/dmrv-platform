'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo, useSyncExternalStore } from 'react';
// Socket.IO removed — now using embedded API routes via HTTP polling
// Local simulation remains as fallback
import {
  Flame, Thermometer, Droplets, Wind, Cloud, Weight, Zap, Leaf,
  Play, Square, RotateCcw, Send, CheckCircle, AlertTriangle, Clock,
  Activity, BarChart3, TrendingUp, Gauge, Timer,
  CircleDot, Database, ShieldCheck, FileCheck, Layers,
  ArrowRight, Info, Wifi, WifiOff, RefreshCw,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, RadarChart,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ComposedChart,
} from 'recharts';

// ─── Types ─────────────────────────────────────────────────────────────────

interface PyrolysisRound {
  roundId: number;
  feedstock: string;
  feedstockMassKg: number;
  targetTempC: number;
  moisturePercent: number;
  durationMin: number;
  oxygenLevelPercent: number;
}

interface IoTSensorReading {
  timestamp: string;
  simulatedTimeMin: number;
  roundId: number;
  temperatureC: number;
  o2Percent: number;
  coPpm: number;
  co2Ppm: number;
  ch4Ppm: number;
  pressureHpa: number;
  humidityPercent: number;
  biocharMassKg: number;
  feedstockRemainingKg: number;
  energyOutputKj: number;
  carbonSequesteredKg: number;
  phase: 'PREHEAT' | 'DRYING' | 'PYROLYSIS' | 'COOLING' | 'COMPLETE';
}

interface RoundCompleteEvent {
  roundId: number;
  feedstock: string;
  totalReadings: number;
  finalBiocharKg: number;
  carbonSequesteredKg: number;
}

interface SimulationStatus {
  running: boolean;
  roundIndex: number;
  round: PyrolysisRound | null;
  elapsedMin: number;
}

const ROUNDS: PyrolysisRound[] = [
  { roundId: 1, feedstock: 'ไม้ยูคาลิปตัส (Eucalyptus Hardwood)', feedstockMassKg: 500, targetTempC: 400, moisturePercent: 18, durationMin: 360, oxygenLevelPercent: 3.5 },
  { roundId: 2, feedstock: 'แกลบ (Rice Husk)', feedstockMassKg: 300, targetTempC: 550, moisturePercent: 8, durationMin: 240, oxygenLevelPercent: 2.0 },
  { roundId: 3, feedstock: 'กะลามะพร้าว (Coconut Shell)', feedstockMassKg: 400, targetTempC: 700, moisturePercent: 25, durationMin: 420, oxygenLevelPercent: 1.5 },
];

const phaseColors: Record<string, string> = {
  PREHEAT: 'bg-amber-100 text-amber-700 border-amber-200',
  DRYING: 'bg-sky-100 text-sky-700 border-sky-200',
  PYROLYSIS: 'bg-red-100 text-red-700 border-red-200',
  COOLING: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  COMPLETE: 'bg-emerald-100 text-emerald-700 border-emerald-200',
};

const phaseLabels: Record<string, string> = {
  PREHEAT: 'อุ่นเตา',
  DRYING: 'อบแห้ง',
  PYROLYSIS: 'ไพโรไลซิส',
  COOLING: 'เย็นตัว',
  COMPLETE: 'เสร็จสิ้น',
};

const phaseDotColors: Record<string, string> = {
  PREHEAT: 'bg-amber-400',
  DRYING: 'bg-sky-400',
  PYROLYSIS: 'bg-red-500',
  COOLING: 'bg-cyan-400',
  COMPLETE: 'bg-emerald-500',
};

const roundColors = ['#ef4444', '#f59e0b', '#10b981'];
const roundColorsBg = ['bg-red-50 border-red-200', 'bg-amber-50 border-amber-200', 'bg-emerald-50 border-emerald-200'];

function getFeedstockEmoji(feedstock: string): string {
  if (feedstock.includes('ยูคาลิปตัส')) return '🪵';
  if (feedstock.includes('แกลบ')) return '🌾';
  if (feedstock.includes('มะพร้าว')) return '🥥';
  return '🔥';
}

// ─── Client-side Pyrolysis Simulation Engine (fallback) ────────────────────

function getTemperature(round: PyrolysisRound, elapsedMin: number): number {
  const { targetTempC, durationMin, moisturePercent } = round;
  const dryingEnd = (moisturePercent / 100) * durationMin * 0.3 + 20;
  const pyrolysisStart = dryingEnd + 15;
  const pyrolysisEnd = durationMin * 0.85;

  if (elapsedMin < dryingEnd) {
    return 25 + (elapsedMin / dryingEnd) * 125;
  } else if (elapsedMin < pyrolysisStart) {
    return 150 + ((elapsedMin - dryingEnd) / (pyrolysisStart - dryingEnd)) * (targetTempC - 150);
  } else if (elapsedMin < pyrolysisEnd) {
    return targetTempC + (Math.random() - 0.5) * 20;
  } else if (elapsedMin < durationMin) {
    const p = (elapsedMin - pyrolysisEnd) / (durationMin - pyrolysisEnd);
    return targetTempC * (1 - p * 0.7) + 25 * p * 0.7 + (Math.random() - 0.5) * 10;
  }
  return 25 + Math.random() * 5;
}

function getPhase(round: PyrolysisRound, elapsedMin: number): IoTSensorReading['phase'] {
  const { durationMin, moisturePercent } = round;
  const dryingEnd = (moisturePercent / 100) * durationMin * 0.3 + 20;
  const pyrolysisStart = dryingEnd + 15;
  const pyrolysisEnd = durationMin * 0.85;
  if (elapsedMin >= durationMin) return 'COMPLETE';
  if (elapsedMin >= pyrolysisEnd) return 'COOLING';
  if (elapsedMin >= pyrolysisStart) return 'PYROLYSIS';
  if (elapsedMin >= dryingEnd) return 'DRYING';
  return 'PREHEAT';
}

function generateReading(round: PyrolysisRound, elapsedMin: number): IoTSensorReading {
  const temp = getTemperature(round, elapsedMin);
  const phase = getPhase(round, elapsedMin);
  const progress = Math.min(elapsedMin / round.durationMin, 1);

  let o2 = round.oxygenLevelPercent;
  if (phase === 'PREHEAT') o2 = 18 - (elapsedMin / 30) * 10;
  else if (phase === 'DRYING') o2 = round.oxygenLevelPercent + 3;
  else if (phase === 'COOLING') o2 = round.oxygenLevelPercent + (1 - progress) * 5 + 10;
  else if (phase === 'COMPLETE') o2 = 20.9;
  o2 += (Math.random() - 0.5) * 0.5;

  let coPpm = 0, co2Ppm = 0, ch4Ppm = 0;
  if (phase === 'PYROLYSIS') {
    const intensity = Math.sin(progress * Math.PI);
    coPpm = 800 + intensity * 1500 + (Math.random() - 0.5) * 200;
    co2Ppm = 5000 + intensity * 12000 + (Math.random() - 0.5) * 500;
    ch4Ppm = 200 + intensity * 800 + (Math.random() - 0.5) * 100;
  } else if (phase === 'DRYING') {
    coPpm = 50 + Math.random() * 100;
    co2Ppm = 500 + Math.random() * 1000;
    ch4Ppm = 20 + Math.random() * 50;
  } else if (phase === 'COOLING') {
    const cp = (elapsedMin - round.durationMin * 0.85) / (round.durationMin * 0.15);
    coPpm = 200 * (1 - cp) + Math.random() * 50;
    co2Ppm = 2000 * (1 - cp) + Math.random() * 200;
    ch4Ppm = 100 * (1 - cp) + Math.random() * 30;
  }

  const maxYield = round.feedstockMassKg * (0.25 + (round.targetTempC / 700) * 0.1);
  let biocharMass = 0;
  if (phase === 'PYROLYSIS') {
    const pp = Math.min((elapsedMin - ((round.moisturePercent / 100) * round.durationMin * 0.3 + 35)) / (round.durationMin * 0.85 - ((round.moisturePercent / 100) * round.durationMin * 0.3 + 35)), 1);
    biocharMass = maxYield * pp;
  } else if (phase === 'COOLING' || phase === 'COMPLETE') {
    biocharMass = maxYield;
  }

  const carbonFraction = 0.7 + (round.targetTempC / 700) * 0.15;
  const stabilityFactor = 0.85 + (round.targetTempC / 700) * 0.1;
  const carbon = biocharMass * carbonFraction * stabilityFactor * 3.667;

  let pressure = 1013 + (Math.random() - 0.5) * 5;
  if (phase === 'PYROLYSIS') pressure += 15 + Math.random() * 10;

  let humidity = 50 + (Math.random() - 0.5) * 10;
  if (phase === 'DRYING') humidity = 80 + Math.random() * 15;
  else if (phase === 'PYROLYSIS') humidity = 15 + Math.random() * 10;
  else if (phase === 'COOLING') humidity = 30 + Math.random() * 15;

  return {
    timestamp: new Date().toISOString(),
    simulatedTimeMin: Math.round(elapsedMin * 10) / 10,
    roundId: round.roundId,
    temperatureC: Math.round(temp * 10) / 10,
    o2Percent: Math.round(Math.max(o2, 0) * 100) / 100,
    coPpm: Math.round(Math.max(coPpm, 0) * 10) / 10,
    co2Ppm: Math.round(Math.max(co2Ppm, 0) * 10) / 10,
    ch4Ppm: Math.round(Math.max(ch4Ppm, 0) * 10) / 10,
    pressureHpa: Math.round(pressure * 10) / 10,
    humidityPercent: Math.round(humidity * 10) / 10,
    biocharMassKg: Math.round(Math.max(biocharMass, 0) * 100) / 100,
    feedstockRemainingKg: Math.round(Math.max(round.feedstockMassKg - round.feedstockMassKg * progress * 0.9, 0) * 100) / 100,
    energyOutputKj: Math.round(Math.max(phase === 'PYROLYSIS' ? (round.feedstockMassKg * 16) * progress + (Math.random() - 0.5) * 500 : phase === 'COOLING' || phase === 'COMPLETE' ? round.feedstockMassKg * 16 : 0, 0) * 10) / 10,
    carbonSequesteredKg: Math.round(Math.max(carbon, 0) * 1000) / 1000,
    phase,
  };
}

// ─── Phase Timeline Component ──────────────────────────────────────────────

function PhaseTimeline({ readings, roundId }: { readings: IoTSensorReading[]; roundId: number }) {
  const roundReadings = readings.filter(r => r.roundId === roundId);
  if (roundReadings.length === 0) return null;

  const phases = ['PREHEAT', 'DRYING', 'PYROLYSIS', 'COOLING', 'COMPLETE'] as const;
  const phaseRanges: Record<string, { start: number; end: number }> = {};
  for (const phase of phases) {
    const pr = roundReadings.filter(r => r.phase === phase);
    if (pr.length > 0) phaseRanges[phase] = { start: pr[0].simulatedTimeMin, end: pr[pr.length - 1].simulatedTimeMin };
  }
  const maxTime = Math.max(...roundReadings.map(r => r.simulatedTimeMin), 1);

  return (
    <div className="space-y-1">
      {phases.map(phase => {
        const range = phaseRanges[phase];
        if (!range) return null;
        return (
          <div key={phase} className="flex items-center gap-2">
            <span className="text-[9px] w-16 text-right text-muted-foreground">{phaseLabels[phase]}</span>
            <div className="flex-1 h-4 bg-slate-100 rounded-full relative overflow-hidden">
              <div className={`absolute top-0 h-full rounded-full ${phaseDotColors[phase]} opacity-70`} style={{ left: `${(range.start / maxTime) * 100}%`, width: `${Math.max(((range.end - range.start) / maxTime) * 100, 2)}%` }} />
            </div>
            <span className="text-[9px] w-12 text-muted-foreground">{Math.round(range.end - range.start)} min</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────

const mountedEmptySub = () => () => {};
function useMounted() {
  return useSyncExternalStore(mountedEmptySub, () => true, () => false);
}

export default function PyrolysisSimulatorView() {
  const mounted = useMounted();
  const localSimRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [connected, setConnected] = useState(false);
  const [useLocal, setUseLocal] = useState(false);
  const [useApi, setUseApi] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [status, setStatus] = useState<SimulationStatus | null>(null);
  const [rounds] = useState<PyrolysisRound[]>(ROUNDS);
  const [readings, setReadings] = useState<IoTSensorReading[]>([]);
  const [latestReading, setLatestReading] = useState<IoTSensorReading | null>(null);
  const [completedRounds, setCompletedRounds] = useState<RoundCompleteEvent[]>([]);
  const [sendingToDmrv, setSendingToDmrv] = useState(false);
  const [dmrvSent, setDmrvSent] = useState(false);
  const [dmrvLog, setDmrvLog] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [standardMode, setStandardMode] = useState<'international' | 'tgo'>('tgo');
  const [isLocalRunning, setIsLocalRunning] = useState(false);

  // Local simulation state
  const localStateRef = useRef({ running: false, roundIndex: 0, elapsedMin: 0 });

  // ─── HTTP Polling Connection (embedded API routes, fallback to local) ─────

  const lastReadingCountRef = useRef(0);

  useEffect(() => {
    if (!mounted) return;
    let settled = false;
    let stopped = false;

    // Try to reach the embedded API routes
    const tryApiConnection = async () => {
      try {
        const res = await fetch('/api/pyrolysis/status');
        if (res.ok && !stopped) {
          const data = await res.json();
          setConnected(true);
          setUseApi(true);
          setUseLocal(false);
          settled = true;
          console.log('[Pyrolysis] Connected to embedded API simulation');
          return true;
        }
      } catch { /* ignore */ }
      return false;
    };

    // Initial connection attempt
    tryApiConnection();

    // If after 3 seconds no API connection, fall back to local
    const fallbackTimer = setTimeout(() => {
      if (!settled && !stopped) {
        setUseLocal(true);
        settled = true;
        console.log('[Pyrolysis] Fallback to local simulation');
      }
    }, 3000);

    // HTTP polling — fetch status and new readings every 5s
    const pollInterval = setInterval(async () => {
      if (stopped) return;
      try {
        const statusRes = await fetch('/api/pyrolysis/status');
        if (!statusRes.ok) return;

        const statusData = await statusRes.json();

        if (!settled) {
          setConnected(true);
          setUseApi(true);
          setUseLocal(false);
          settled = true;
        }

        // Update simulation status
        setStatus({
          running: statusData.running,
          roundIndex: statusData.currentRoundIndex,
          round: statusData.currentRoundConfig,
          elapsedMin: statusData.elapsedMin,
        });

        // Update completed rounds
        if (statusData.completedRounds) {
          setCompletedRounds(prev => {
            // Only add new completed rounds
            const existingIds = new Set(prev.map(r => r.roundId));
            const newCompleted = statusData.completedRounds.filter(
              (r: RoundCompleteEvent) => !existingIds.has(r.roundId)
            );
            return newCompleted.length > 0 ? [...prev, ...newCompleted] : prev;
          });
        }

        // Fetch new readings since last check
        const readingsRes = await fetch('/api/pyrolysis/readings');
        if (readingsRes.ok) {
          const readingsData = await readingsRes.json();
          if (readingsData && Array.isArray(readingsData.readings)) {
            const allApiReadings: IoTSensorReading[] = readingsData.readings;
            if (allApiReadings.length > lastReadingCountRef.current) {
              // Get only the new readings
              const newReadings = allApiReadings.slice(lastReadingCountRef.current);
              if (newReadings.length > 0) {
                setReadings(allApiReadings);
                setLatestReading(allApiReadings[allApiReadings.length - 1]);
                lastReadingCountRef.current = allApiReadings.length;
              }
            } else if (allApiReadings.length < lastReadingCountRef.current) {
              // Simulation was reset — update all readings
              setReadings(allApiReadings);
              setLatestReading(allApiReadings.length > 0 ? allApiReadings[allApiReadings.length - 1] : null);
              lastReadingCountRef.current = allApiReadings.length;
            }
          }
        }
      } catch { /* ignore — will retry next interval */ }
    }, 5000);

    pollRef.current = pollInterval;

    return () => {
      stopped = true;
      clearTimeout(fallbackTimer);
      clearInterval(pollInterval);
      pollRef.current = null;
    };
  }, [mounted]);

  // ─── Local Simulation Engine ──────────────────────────────────────────────

  const autoStartRef = useRef(false);

  const startLocalSimulation = useCallback(() => {
    if (localSimRef.current) clearInterval(localSimRef.current);

    localStateRef.current = { running: true, roundIndex: 0, elapsedMin: 0 };
    setIsLocalRunning(true);
    setReadings([]);
    setLatestReading(null);
    setCompletedRounds([]);
    setDmrvSent(false);
    setDmrvLog([]);
    setStatus({ running: true, roundIndex: 0, round: ROUNDS[0], elapsedMin: 0 });

    localSimRef.current = setInterval(() => {
      const st = localStateRef.current;
      if (!st.running || st.roundIndex >= ROUNDS.length) {
        if (st.roundIndex >= ROUNDS.length) {
          clearInterval(localSimRef.current!);
          localSimRef.current = null;
          st.running = false;
          setIsLocalRunning(false);
          setStatus({ running: false, roundIndex: st.roundIndex, round: null, elapsedMin: st.elapsedMin });
        }
        return;
      }

      const round = ROUNDS[st.roundIndex];
      const reading = generateReading(round, st.elapsedMin);

      setReadings(prev => [...prev, reading]);
      setLatestReading(reading);

      st.elapsedMin += 5;

      if (st.elapsedMin >= round.durationMin + 30) {
        const finalReading = generateReading(round, round.durationMin + 30);
        finalReading.phase = 'COMPLETE';
        finalReading.temperatureC = 25 + Math.random() * 3;
        finalReading.o2Percent = 20.9;
        finalReading.biocharMassKg = round.feedstockMassKg * (0.25 + (round.targetTempC / 700) * 0.1);
        finalReading.feedstockRemainingKg = 0;

        setReadings(prev => [...prev, finalReading]);
        setLatestReading(finalReading);

        const completedEvent: RoundCompleteEvent = {
          roundId: round.roundId,
          feedstock: round.feedstock,
          totalReadings: 0,
          finalBiocharKg: finalReading.biocharMassKg,
          carbonSequesteredKg: finalReading.carbonSequesteredKg,
        };
        setCompletedRounds(prev => [...prev, completedEvent]);

        st.roundIndex++;
        st.elapsedMin = 0;

        if (st.roundIndex < ROUNDS.length) {
          setStatus({ running: true, roundIndex: st.roundIndex, round: ROUNDS[st.roundIndex], elapsedMin: 0 });
        } else {
          st.running = false;
          setIsLocalRunning(false);
          setStatus({ running: false, roundIndex: st.roundIndex, round: null, elapsedMin: 0 });
          clearInterval(localSimRef.current!);
          localSimRef.current = null;
        }
      } else {
        setStatus({ running: true, roundIndex: st.roundIndex, round: ROUNDS[st.roundIndex], elapsedMin: st.elapsedMin });
      }
    }, 5000); // 5 seconds = 5 simulated minutes at 60x
  }, []);

  const stopLocalSimulation = useCallback(() => {
    if (localSimRef.current) {
      clearInterval(localSimRef.current);
      localSimRef.current = null;
    }
    localStateRef.current.running = false;
    setIsLocalRunning(false);
    setStatus({ running: false, roundIndex: localStateRef.current.roundIndex, round: null, elapsedMin: localStateRef.current.elapsedMin });
  }, []);

  const resetLocalSimulation = useCallback(() => {
    stopLocalSimulation();
    localStateRef.current = { running: false, roundIndex: 0, elapsedMin: 0 };
    autoStartRef.current = false;
    setReadings([]);
    setLatestReading(null);
    setCompletedRounds([]);
    setDmrvSent(false);
    setDmrvLog([]);
    setStatus(null);
  }, [stopLocalSimulation]);

  // ─── Unified Simulation Controls ─────────────────────────────────────────

  const isRunning = status?.running || isLocalRunning;
  const canStart = !isRunning;

  const startSimulation = useCallback(async () => {
    if (useApi && connected) {
      try {
        const res = await fetch('/api/pyrolysis/start', { method: 'POST' });
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setStatus({ running: true, roundIndex: 0, round: ROUNDS[0], elapsedMin: 0 });
            return;
          }
        }
      } catch { /* fall through to local */ }
    }
    startLocalSimulation();
  }, [useApi, connected, startLocalSimulation]);

  const stopSimulation = useCallback(async () => {
    if (useApi && connected) {
      try {
        const res = await fetch('/api/pyrolysis/stop', { method: 'POST' });
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setStatus(prev => prev ? { ...prev, running: false, round: null } : null);
            return;
          }
        }
      } catch { /* fall through to local */ }
    }
    stopLocalSimulation();
  }, [useApi, connected, stopLocalSimulation]);

  const resetSimulation = useCallback(async () => {
    if (useApi && connected) {
      try {
        const res = await fetch('/api/pyrolysis/reset', { method: 'POST' });
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setReadings([]);
            setLatestReading(null);
            setCompletedRounds([]);
            setDmrvSent(false);
            setDmrvLog([]);
            setStatus(null);
            lastReadingCountRef.current = 0;
            return;
          }
        }
      } catch { /* fall through to local */ }
    }
    resetLocalSimulation();
  }, [useApi, connected, resetLocalSimulation]);

  // Auto-start simulation once ready (only when not already running and no data)
  useEffect(() => {
    if ((connected || useLocal) && !isRunning && completedRounds.length === 0 && readings.length === 0 && !autoStartRef.current) {
      autoStartRef.current = true;
      const timer = setTimeout(() => startSimulation(), 2000);
      return () => clearTimeout(timer);
    }
  }, [connected, useLocal, isRunning, completedRounds.length, readings.length, startSimulation]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (localSimRef.current) clearInterval(localSimRef.current);
    };
  }, []);

  // ─── Send to dMRV ──────────────────────────────────────────────────────

  const sendToDmrv = useCallback(async () => {
    if (readings.length === 0) return;
    setSendingToDmrv(true);
    setDmrvLog([]);
    const log = (msg: string) => setDmrvLog(prev => [...prev, msg]);

    try {
      log('🔄 เริ่มส่งข้อมูลเข้าระบบ dMRV...');

      const roundGroups = new Map<number, IoTSensorReading[]>();
      for (const r of readings) {
        if (!roundGroups.has(r.roundId)) roundGroups.set(r.roundId, []);
        roundGroups.get(r.roundId)!.push(r);
      }

      for (const [roundId, roundReadings] of roundGroups) {
        const roundConfig = rounds.find(r => r.roundId === roundId);
        const enrichedReadings = roundReadings.map(r => ({
          ...r,
          feedstock: roundConfig?.feedstock || 'Unknown',
          targetTempC: roundConfig?.targetTempC || 0,
          moisturePercent: roundConfig?.moisturePercent || 0,
        }));

        const res = await fetch('/api/dmrv/pyrolysis', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'ingest_batch', projectId: 'pyrolysis-sim', readings: enrichedReadings }),
        });

        if (res.ok) {
          const data = await res.json();
          log(`✅ รอบที่ ${roundId}: ส่ง ${data.ingested} รายการสำเร็จ`);
        } else {
          log(`❌ รอบที่ ${roundId}: ส่งข้อมูลล้มเหลว`);
        }
      }

      for (const completed of completedRounds) {
        const roundConfig = rounds.find(r => r.roundId === completed.roundId);
        const carbonFraction = 0.7 + ((roundConfig?.targetTempC || 400) / 700) * 0.15;
        const stabilityFactor = 0.85 + ((roundConfig?.targetTempC || 400) / 700) * 0.1;

        const res = await fetch('/api/dmrv/pyrolysis', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'finalize_round',
            projectId: 'pyrolysis-sim',
            roundSummary: { roundId: completed.roundId, feedstock: completed.feedstock, biocharKg: completed.finalBiocharKg, carbonSequesteredKg: completed.carbonSequesteredKg, carbonFraction, stabilityFactor },
          }),
        });

        if (res.ok) {
          const data = await res.json();
          log(`🏆 รอบที่ ${completed.roundId}: Carbon Credit ${standardMode === 'tgo' ? `${data.carbonSequesteredTco2e?.toFixed(4)} tCO₂e (T-VER)` : `${(data.carbonSequesteredTco2e || 0) * 1000} kg C (ISO 14064)`} ${data.creditCreated ? '✅ Minted' : '⏳ Pending'}`);
        }
      }

      log('🎉 ส่งข้อมูลเข้าระบบ dMRV เสร็จสมบูรณ์!');
      setDmrvSent(true);
    } catch (error) {
      log(`❌ เกิดข้อผิดพลาด: ${error instanceof Error ? error.message : 'Unknown'}`);
    } finally {
      setSendingToDmrv(false);
    }
  }, [readings, rounds, completedRounds, standardMode]);

  // ─── Computed Data ──────────────────────────────────────────────────────

  const getRoundReadings = useCallback((roundId: number) => readings.filter(r => r.roundId === roundId), [readings]);

  const roundSummaries = useMemo(() => rounds.map(round => {
    const roundData = getRoundReadings(round.roundId);
    const completed = completedRounds.find(c => c.roundId === round.roundId);
    const isCurrentRound = status?.running && status.round?.roundId === round.roundId;
    const lastReading = roundData[roundData.length - 1];
    const temps = roundData.map(r => r.temperatureC);
    const coPpms = roundData.map(r => r.coPpm);
    const phaseReadings: Record<string, IoTSensorReading[]> = {};
    for (const r of roundData) { if (!phaseReadings[r.phase]) phaseReadings[r.phase] = []; phaseReadings[r.phase].push(r); }

    return {
      ...round,
      readingCount: roundData.length,
      isComplete: !!completed,
      isCurrent: isCurrentRound,
      currentPhase: lastReading?.phase || 'PENDING',
      currentTemp: lastReading?.temperatureC || 0,
      biocharKg: completed?.finalBiocharKg || lastReading?.biocharMassKg || 0,
      carbonKg: completed?.carbonSequesteredKg || lastReading?.carbonSequesteredKg || 0,
      progress: lastReading ? Math.min((lastReading.simulatedTimeMin / round.durationMin) * 100, 100) : 0,
      peakTemp: temps.length > 0 ? Math.max(...temps) : 0,
      avgTemp: temps.length > 0 ? temps.reduce((a, b) => a + b, 0) / temps.length : 0,
      peakCO: coPpms.length > 0 ? Math.max(...coPpms) : 0,
      biocharYield: round.feedstockMassKg > 0 ? ((completed?.finalBiocharKg || lastReading?.biocharMassKg || 0) / round.feedstockMassKg) * 100 : 0,
      phaseCount: Object.keys(phaseReadings).length,
    };
  }), [rounds, getRoundReadings, completedRounds, status]);

  const totalCarbon = roundSummaries.reduce((s, r) => s + r.carbonKg, 0);
  const totalBiochar = roundSummaries.reduce((s, r) => s + r.biocharKg, 0);
  const totalFeedstock = roundSummaries.reduce((s, r) => s + r.feedstockMassKg, 0);

  const tempChartData = useMemo(() => readings.map(r => ({ time: r.simulatedTimeMin, temp: r.temperatureC, round: `R${r.roundId}` })), [readings]);
  const emissionsChartData = useMemo(() => readings.filter(r => r.phase === 'PYROLYSIS').map(r => ({ time: r.simulatedTimeMin, CO: r.coPpm, CO2: r.co2Ppm, CH4: r.ch4Ppm, round: `R${r.roundId}` })), [readings]);
  const biocharChartData = useMemo(() => readings.filter(r => r.biocharMassKg > 0).map(r => ({ 
    time: r.simulatedTimeMin, 
    biochar: r.biocharMassKg, 
    carbon: r.carbonSequesteredKg, 
    carbonTco2e: r.carbonSequesteredKg / 1000,
    carbonKgC: r.carbonSequesteredKg / 3.667, // kg C = tCO₂e × 1000 / 3.667
    round: `R${r.roundId}` 
  })), [readings]);

  const radarData = useMemo(() => {
    if (roundSummaries.every(r => r.readingCount === 0)) return [];
    const mT = Math.max(...roundSummaries.map(r => r.peakTemp), 1);
    const mC = Math.max(...roundSummaries.map(r => r.peakCO), 1);
    const mB = Math.max(...roundSummaries.map(r => r.biocharKg), 1);
    const mCO = Math.max(...roundSummaries.map(r => r.carbonKg), 1);
    const mY = Math.max(...roundSummaries.map(r => r.biocharYield), 1);
    return [
      { metric: 'อุณหภูมิสูงสุด', R1: Math.round((roundSummaries[0]?.peakTemp || 0) / mT * 100), R2: Math.round((roundSummaries[1]?.peakTemp || 0) / mT * 100), R3: Math.round((roundSummaries[2]?.peakTemp || 0) / mT * 100) },
      { metric: 'CO สูงสุด', R1: Math.round((roundSummaries[0]?.peakCO || 0) / mC * 100), R2: Math.round((roundSummaries[1]?.peakCO || 0) / mC * 100), R3: Math.round((roundSummaries[2]?.peakCO || 0) / mC * 100) },
      { metric: 'Biochar', R1: Math.round((roundSummaries[0]?.biocharKg || 0) / mB * 100), R2: Math.round((roundSummaries[1]?.biocharKg || 0) / mB * 100), R3: Math.round((roundSummaries[2]?.biocharKg || 0) / mB * 100) },
      { metric: 'Carbon กักเก็บ', R1: Math.round((roundSummaries[0]?.carbonKg || 0) / mCO * 100), R2: Math.round((roundSummaries[1]?.carbonKg || 0) / mCO * 100), R3: Math.round((roundSummaries[2]?.carbonKg || 0) / mCO * 100) },
      { metric: 'อัตราผลผลิต', R1: Math.round((roundSummaries[0]?.biocharYield || 0) / mY * 100), R2: Math.round((roundSummaries[1]?.biocharYield || 0) / mY * 100), R3: Math.round((roundSummaries[2]?.biocharYield || 0) / mY * 100) },
    ];
  }, [roundSummaries]);

  // ─── Render ─────────────────────────────────────────────────────────────

  if (!mounted) {
    return <div className="flex items-center justify-center h-64"><RefreshCw className="h-8 w-8 animate-spin text-emerald-600" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-600 via-red-600 to-amber-700 p-6 text-white shadow-xl">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-4 right-8 text-8xl">🔥</div>
          <div className="absolute bottom-2 left-12 text-6xl opacity-50">🌿</div>
        </div>
        <div className="relative z-10">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h2 className="text-2xl font-bold tracking-tight flex items-center gap-3">
                <Flame className="h-7 w-7" />
                Pyrolysis Dashboard
              </h2>
              <p className="text-orange-100 text-sm mt-1 max-w-xl">
                จำลองการเผาถ่านไพโรไลซิส 3 รอบ — วัตถุดิบและสภาพแวดล้อมต่างกัน — IoT บันทึกทุก 5 นาที (เร่ง 60x) → ส่งเข้า dMRV
              </p>
              <p className="text-orange-200/80 text-[10px] mt-1">
                {standardMode === 'tgo' 
                  ? 'อ้างอิงมาตรฐาน: T-VER-P-CC-001 (การกักเก็บคาร์บอนผ่านการผลิตไบโอชาร์) | TGO Guidelines 2566 | หน่วย: tCO₂e'
                  : 'Reference: IPCC 2006 Guidelines Vol. 4 | ISO 14064-2 | Verra VCS AR-ACM0003 | Units: kg C, tCO₂e'
                }
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className={`text-xs px-3 py-1 ${connected && useApi ? 'bg-emerald-100 text-emerald-700' : useLocal ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                {connected && useApi ? <><Wifi className="h-3 w-3 mr-1 inline" /> API Connected</> : useLocal ? <><Activity className="h-3 w-3 mr-1 inline" /> Local Simulation</> : <><WifiOff className="h-3 w-3 mr-1 inline" /> Connecting...</>}
              </Badge>
              {status?.running && (
                <Badge className="bg-white/20 text-white border-white/30 animate-pulse text-xs px-3 py-1">
                  🔥 รอบที่ {(status.roundIndex || 0) + 1} — {status.round?.feedstock?.split('(')[0]}
                </Badge>
              )}
              {completedRounds.length === 3 && !status?.running && (
                <Badge className="bg-emerald-100 text-emerald-700 text-xs px-3 py-1">✅ จำลองเสร็จสมบูรณ์</Badge>
              )}
              <Badge className="bg-amber-100 text-amber-800 text-[9px] h-5 px-2">T-VER-P-CC-001</Badge>
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
          </div>

          {/* Control Panel */}
          <div className="flex items-center gap-3 mt-4 flex-wrap">
            <Button onClick={startSimulation} disabled={!canStart} className="gap-2 bg-white/20 hover:bg-white/30 text-white border-white/30" size="sm">
              <Play className="h-3.5 w-3.5" />
              เริ่มจำลอง
            </Button>
            <Button onClick={stopSimulation} disabled={!isRunning} variant="outline" className="gap-2 bg-white/10 hover:bg-white/20 text-white border-white/30" size="sm">
              <Square className="h-3.5 w-3.5" /> หยุด
            </Button>
            <Button onClick={resetSimulation} disabled={isRunning} variant="outline" className="gap-2 bg-white/10 hover:bg-white/20 text-white border-white/30" size="sm">
              <RotateCcw className="h-3.5 w-3.5" /> รีเซ็ต
            </Button>
            <Separator orientation="vertical" className="h-7 bg-white/30" />
            <Button onClick={sendToDmrv} disabled={sendingToDmrv || readings.length === 0 || dmrvSent} className="gap-2 bg-emerald-500 hover:bg-emerald-600 text-white" size="sm">
              <Send className="h-3.5 w-3.5" />
              {sendingToDmrv ? 'กำลังส่ง...' : dmrvSent ? 'ส่งแล้ว ✓' : 'ส่งเข้า dMRV'}
            </Button>
            {readings.length > 0 && (
              <span className="text-xs text-orange-100">{readings.length} รายการ IoT • ความเร็ว 60x {useApi ? '(API)' : useLocal ? '(local)' : '...'}</span>
            )}
          </div>
        </div>
      </div>

      {/* KPI Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { icon: CheckCircle, label: 'รอบเสร็จสิ้น', value: `${completedRounds.length}/3`, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { icon: Activity, label: 'IoT Readings', value: String(readings.length), color: 'text-blue-600', bg: 'bg-blue-50' },
          { icon: Weight, label: standardMode === 'tgo' ? 'Biochar รวม (kg)' : 'Biochar Total (kg)', value: `${totalBiochar.toFixed(1)} kg`, color: 'text-amber-600', bg: 'bg-amber-50' },
          { icon: Leaf, label: standardMode === 'tgo' ? 'Carbon กักเก็บ' : 'C Sequestered', value: standardMode === 'tgo' ? `${(totalCarbon / 1000).toFixed(4)} tCO₂e` : `${totalCarbon.toFixed(1)} kg C`, color: standardMode === 'tgo' ? 'text-emerald-600' : 'text-teal-600', bg: standardMode === 'tgo' ? 'bg-emerald-50' : 'bg-teal-50' },
          { icon: Gauge, label: 'วัตถุดิบรวม', value: `${totalFeedstock} kg`, color: 'text-slate-600', bg: 'bg-slate-50' },
          { icon: TrendingUp, label: 'อัตราผลผลิต', value: totalFeedstock > 0 ? `${((totalBiochar / totalFeedstock) * 100).toFixed(1)}%` : '0%', color: 'text-purple-600', bg: 'bg-purple-50' },
        ].map(kpi => (
          <Card key={kpi.label} className="border-0 shadow-sm">
            <CardContent className="p-4 text-center">
              <div className={`inline-flex items-center justify-center w-8 h-8 rounded-lg ${kpi.bg} mb-2`}>
                <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
              </div>
              <p className="text-xl font-bold">{kpi.value}</p>
              <p className="text-[10px] text-muted-foreground">{kpi.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* TGO/T-VER Methodology Reference */}
      <Card className={standardMode === 'tgo' ? 'border-amber-200 bg-amber-50/50' : 'border-blue-200 bg-blue-50/50'}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${standardMode === 'tgo' ? 'bg-amber-100' : 'bg-blue-100'}`}>
              <ShieldCheck className={`h-4 w-4 ${standardMode === 'tgo' ? 'text-amber-600' : 'text-blue-600'}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className={`text-sm font-bold ${standardMode === 'tgo' ? 'text-amber-800' : 'text-blue-800'}`}>
                  {standardMode === 'tgo' ? 'TGO/T-VER Methodology Reference' : 'International Standard Reference'}
                </p>
                <Badge className={`${standardMode === 'tgo' ? 'bg-amber-200 text-amber-800' : 'bg-blue-200 text-blue-800'} text-[9px] h-4`}>
                  {standardMode === 'tgo' ? 'T-VER-P-CC-001' : 'IPCC/ISO 14064'}
                </Badge>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[10px]">
                {standardMode === 'tgo' ? (
                  <>
                    <div className="text-amber-700">
                      <p className="font-semibold mb-0.5">Carbon Fraction (T-VER)</p>
                      <p>400°C: 0.70 (Hardwood)</p>
                      <p>550°C: 0.78 (Rice Husk)</p>
                      <p>700°C: 0.85 (Coconut Shell)</p>
                    </div>
                    <div className="text-amber-700">
                      <p className="font-semibold mb-0.5">Stability Factor (H/C)</p>
                      <p>400°C: 0.86 (H/C &lt; 0.4)</p>
                      <p>550°C: 0.90 (H/C &lt; 0.3)</p>
                      <p>700°C: 0.94 (H/C &lt; 0.2)</p>
                    </div>
                    <div className="text-amber-700">
                      <p className="font-semibold mb-0.5">Credit Calculation (T-VER)</p>
                      <p>ER = M_biochar(t) × f_C × f_perm × (44/12)</p>
                      <p>44/12 = 3.667 (Stoichiometric ratio)</p>
                      <p>Unit: tCO₂e (tonnes CO₂ equivalent)</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-blue-700">
                      <p className="font-semibold mb-0.5">Carbon Content (IPCC)</p>
                      <p>Wood biochar: 65-85% C</p>
                      <p>Rice husk biochar: 35-45% C</p>
                      <p>Coconut shell: 70-90% C</p>
                    </div>
                    <div className="text-blue-700">
                      <p className="font-semibold mb-0.5">Permanence (Verra/VCS)</p>
                      <p>&gt;100 yr: 0.86-0.94</p>
                      <p>Based on H/C molar ratio</p>
                      <p>Permanence deduction: 5-20%</p>
                    </div>
                    <div className="text-blue-700">
                      <p className="font-semibold mb-0.5">Measurement Units</p>
                      <p>Carbon mass: kg C</p>
                      <p>CO₂ equivalent: kg C × 44/12</p>
                      <p>Energy: kJ (calorimetry)</p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Round Comparison Cards */}
      <div>
        <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
          <Layers className="h-4 w-4 text-orange-500" /> สภาพแวดล้อม 3 รอบ — เปรียบเทียบ
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {roundSummaries.map((round, idx) => (
            <Card key={round.roundId} className={`border-2 overflow-hidden ${round.isCurrent ? 'border-orange-400 shadow-lg ring-2 ring-orange-100' : round.isComplete ? 'border-emerald-300' : 'border-slate-200'}`}>
              <div className={`p-3 ${roundColorsBg[idx]} border-b`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{getFeedstockEmoji(round.feedstock)}</span>
                    <div>
                      <p className="text-sm font-bold text-slate-800">รอบที่ {round.roundId}</p>
                      <p className="text-[10px] text-slate-600 leading-tight">{round.feedstock}</p>
                    </div>
                  </div>
                  <Badge className={phaseColors[round.currentPhase] || 'bg-slate-100 text-slate-600'}>{phaseLabels[round.currentPhase] || 'รอดำเนินการ'}</Badge>
                </div>
              </div>
              <CardContent className="p-3 space-y-3">
                <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px]">
                  <div className="flex justify-between"><span className="text-muted-foreground flex items-center gap-1"><Thermometer className="h-3 w-3" /> เป้าหมาย</span><span className="font-semibold">{round.targetTempC}°C</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground flex items-center gap-1"><Droplets className="h-3 w-3" /> ความชื้น</span><span className="font-semibold">{round.moisturePercent}%</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground flex items-center gap-1"><Wind className="h-3 w-3" /> O₂</span><span className="font-semibold">{round.oxygenLevelPercent}%</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground flex items-center gap-1"><Timer className="h-3 w-3" /> ระยะเวลา</span><span className="font-semibold">{round.durationMin} min</span></div>
                  <div className="col-span-2 flex justify-between"><span className="text-muted-foreground flex items-center gap-1"><Weight className="h-3 w-3" /> วัตถุดิบ</span><span className="font-semibold">{round.feedstockMassKg} kg</span></div>
                </div>
                <div>
                  <div className="flex justify-between text-[10px] mb-1"><span>ความคืบหน้า</span><span className="font-medium">{round.progress.toFixed(0)}%</span></div>
                  <Progress value={round.progress} className="h-2" />
                </div>
                {round.readingCount > 0 && (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-slate-50 rounded-lg p-2 text-center">
                      <p className="text-[9px] text-muted-foreground">อุณหภูมิสูงสุด</p>
                      <p className={`text-sm font-bold ${round.peakTemp > 500 ? 'text-red-600' : 'text-orange-600'}`}>{round.peakTemp.toFixed(0)}°C</p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-2 text-center">
                      <p className="text-[9px] text-muted-foreground">อุณหภูมิปัจจุบัน</p>
                      <p className={`text-sm font-bold ${round.currentTemp > 500 ? 'text-red-600' : 'text-orange-600'}`}>{round.currentTemp.toFixed(0)}°C</p>
                    </div>
                  </div>
                )}
                {round.biocharKg > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-amber-50 rounded-lg p-2 text-center"><p className="text-[9px] text-muted-foreground">Biochar</p><p className="text-sm font-bold text-amber-700">{round.biocharKg.toFixed(1)}</p><p className="text-[8px] text-muted-foreground">kg</p></div>
                    <div className={standardMode === 'tgo' ? 'bg-emerald-50 rounded-lg p-2 text-center' : 'bg-teal-50 rounded-lg p-2 text-center'}><p className="text-[9px] text-muted-foreground">{standardMode === 'tgo' ? 'Carbon' : 'C Sequestered'}</p><p className={`text-sm font-bold ${standardMode === 'tgo' ? 'text-emerald-700' : 'text-teal-700'}`}>{standardMode === 'tgo' ? (round.carbonKg / 1000).toFixed(4) : round.carbonKg.toFixed(1)}</p><p className="text-[8px] text-muted-foreground">{standardMode === 'tgo' ? 'tCO₂e' : 'kg C'}</p></div>
                    <div className="bg-purple-50 rounded-lg p-2 text-center"><p className="text-[9px] text-muted-foreground">อัตราผลผลิต</p><p className="text-sm font-bold text-purple-700">{round.biocharYield.toFixed(1)}</p><p className="text-[8px] text-muted-foreground">%</p></div>
                  </div>
                )}
                {round.readingCount > 2 && <PhaseTimeline readings={readings} roundId={round.roundId} />}
                <div className="flex justify-between text-[10px] text-muted-foreground"><span>{round.readingCount} readings</span><span>{round.phaseCount} phases</span></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Live Sensor Panel */}
      {latestReading && isRunning && (
        <Card className="border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Zap className="h-4 w-4 text-orange-500 animate-pulse" />
              Live IoT Sensor — รอบที่ {latestReading.roundId} • {phaseLabels[latestReading.phase]}
              <Badge className={phaseColors[latestReading.phase]}>{latestReading.phase}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-8 gap-2">
              {[
                { label: 'อุณหภูมิ', value: `${latestReading.temperatureC.toFixed(1)}°C`, icon: Thermometer, color: latestReading.temperatureC > 500 ? 'text-red-600' : 'text-orange-600', bg: latestReading.temperatureC > 500 ? 'bg-red-50' : 'bg-orange-50' },
                { label: 'O₂', value: `${latestReading.o2Percent.toFixed(1)}%`, icon: Wind, color: 'text-blue-600', bg: 'bg-blue-50' },
                { label: 'CO', value: `${latestReading.coPpm.toFixed(0)} ppm`, icon: Cloud, color: 'text-amber-600', bg: 'bg-amber-50' },
                { label: 'CO₂', value: `${latestReading.co2Ppm.toFixed(0)} ppm`, icon: Cloud, color: 'text-slate-600', bg: 'bg-slate-50' },
                { label: 'CH₄', value: `${latestReading.ch4Ppm.toFixed(0)} ppm`, icon: Flame, color: 'text-purple-600', bg: 'bg-purple-50' },
                { label: 'ความดัน', value: `${latestReading.pressureHpa.toFixed(0)} hPa`, icon: Gauge, color: 'text-teal-600', bg: 'bg-teal-50' },
                { label: 'ความชื้น', value: `${latestReading.humidityPercent.toFixed(0)}%`, icon: Droplets, color: 'text-cyan-600', bg: 'bg-cyan-50' },
                { label: 'เวลาจำลอง', value: `${latestReading.simulatedTimeMin.toFixed(0)} min`, icon: Timer, color: 'text-slate-600', bg: 'bg-slate-50' },
              ].map(item => (
                <div key={item.label} className={`text-center p-2.5 rounded-xl border ${item.bg}`}>
                  <item.icon className={`h-4 w-4 mx-auto mb-1 ${item.color}`} />
                  <p className="text-[9px] text-muted-foreground">{item.label}</p>
                  <p className={`text-xs font-bold ${item.color}`}>{item.value}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts Section */}
      {readings.length > 2 && (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview" className="text-xs">ภาพรวม</TabsTrigger>
            <TabsTrigger value="temperature" className="text-xs">อุณหภูมิ</TabsTrigger>
            <TabsTrigger value="emissions" className="text-xs">การปล่อยก๊าซ</TabsTrigger>
            <TabsTrigger value="biochar" className="text-xs">Biochar</TabsTrigger>
            <TabsTrigger value="comparison" className="text-xs">เปรียบเทียบ</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Thermometer className="h-4 w-4 text-red-500" /> โปรไฟล์อุณหภูมิ — ทุกรอบ</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="time" type="number" tick={{ fontSize: 9 }} />
                      <YAxis tick={{ fontSize: 9 }} />
                      <Tooltip contentStyle={{ fontSize: 10 }} />
                      <Legend wrapperStyle={{ fontSize: 9 }} />
                      {[1, 2, 3].map(rid => (
                        <Area key={rid} type="monotone" dataKey="temp" data={tempChartData.filter(d => d.round === `R${rid}`)} name={`รอบ ${rid}`} stroke={roundColors[rid - 1]} fill={roundColors[rid - 1]} fillOpacity={0.08} strokeWidth={2} />
                      ))}
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Leaf className="h-4 w-4 text-emerald-500" /> {standardMode === 'tgo' ? 'การกักเก็บคาร์บอน' : 'Carbon Sequestration'} — ทุกรอบ</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="time" type="number" tick={{ fontSize: 9 }} />
                      <YAxis tick={{ fontSize: 9 }} label={{ value: standardMode === 'tgo' ? 'tCO₂e' : 'kg C', angle: -90, position: 'insideLeft', style: { fontSize: 9 } }} />
                      <Tooltip contentStyle={{ fontSize: 10 }} />
                      <Legend wrapperStyle={{ fontSize: 9 }} />
                      {[1, 2, 3].map(rid => (
                        <Area key={rid} type="monotone" dataKey={standardMode === 'tgo' ? 'carbonTco2e' : 'carbonKgC'} data={biocharChartData.filter(d => d.round === `R${rid}`)} name={`รอบ ${rid}`} stroke={roundColors[rid - 1]} fill={roundColors[rid - 1]} fillOpacity={0.12} strokeWidth={2} />
                      ))}
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="temperature" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map(rid => {
                const round = rounds.find(r => r.roundId === rid);
                const rd = tempChartData.filter(d => d.round === `R${rid}`);
                return (
                  <Card key={rid}>
                    <CardHeader className="pb-2"><CardTitle className="text-xs flex items-center gap-2"><div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: roundColors[rid - 1] }} /> รอบ {rid}: {round?.feedstock?.split('(')[0]}</CardTitle></CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={200}>
                        <AreaChart data={rd}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis dataKey="time" tick={{ fontSize: 8 }} />
                          <YAxis tick={{ fontSize: 8 }} />
                          <Tooltip contentStyle={{ fontSize: 9 }} />
                          <defs><linearGradient id={`tg${rid}`} x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={roundColors[rid - 1]} stopOpacity={0.3} /><stop offset="95%" stopColor={roundColors[rid - 1]} stopOpacity={0} /></linearGradient></defs>
                          <Area type="monotone" dataKey="temp" stroke={roundColors[rid - 1]} fill={`url(#tg${rid})`} strokeWidth={2} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="emissions" className="space-y-4 mt-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Wind className="h-4 w-4 text-amber-500" /> การปล่อยก๊าซ — Pyrolysis Phase</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <ComposedChart data={emissionsChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="time" tick={{ fontSize: 9 }} />
                    <YAxis tick={{ fontSize: 9 }} />
                    <Tooltip contentStyle={{ fontSize: 10 }} />
                    <Legend wrapperStyle={{ fontSize: 9 }} />
                    <Line type="monotone" dataKey="CO" stroke="#ef4444" strokeWidth={1.5} dot={false} name="CO" />
                    <Line type="monotone" dataKey="CO2" stroke="#f59e0b" strokeWidth={1.5} dot={false} name="CO₂" />
                    <Line type="monotone" dataKey="CH4" stroke="#8b5cf6" strokeWidth={1.5} dot={false} name="CH₄" />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="biochar" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Weight className="h-4 w-4 text-amber-600" /> การผลิต Biochar — ทุกรอบ</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" /><XAxis dataKey="time" type="number" tick={{ fontSize: 9 }} /><YAxis tick={{ fontSize: 9 }} /><Tooltip contentStyle={{ fontSize: 10 }} /><Legend wrapperStyle={{ fontSize: 9 }} />
                      {[1, 2, 3].map(rid => <Area key={rid} type="monotone" dataKey="biochar" data={biocharChartData.filter(d => d.round === `R${rid}`)} name={`รอบ ${rid}`} stroke={roundColors[rid - 1]} fill={roundColors[rid - 1]} fillOpacity={0.12} strokeWidth={2} />)}
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Leaf className="h-4 w-4 text-emerald-500" /> {standardMode === 'tgo' ? 'การกักเก็บคาร์บอน' : 'Carbon Sequestration'} — ทุกรอบ</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" /><XAxis dataKey="time" type="number" tick={{ fontSize: 9 }} /><YAxis tick={{ fontSize: 9 }} label={{ value: standardMode === 'tgo' ? 'tCO₂e' : 'kg C', angle: -90, position: 'insideLeft', style: { fontSize: 9 } }} /><Tooltip contentStyle={{ fontSize: 10 }} /><Legend wrapperStyle={{ fontSize: 9 }} />
                      {[1, 2, 3].map(rid => <Area key={rid} type="monotone" dataKey={standardMode === 'tgo' ? 'carbonTco2e' : 'carbonKgC'} data={biocharChartData.filter(d => d.round === `R${rid}`)} name={`รอบ ${rid}`} stroke={roundColors[rid - 1]} fill={roundColors[rid - 1]} fillOpacity={0.12} strokeWidth={2} />)}
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
            {completedRounds.length > 0 && (
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><BarChart3 className="h-4 w-4 text-slate-500" /> สรุปผลการจำลอง — Biochar & Carbon</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={completedRounds.map(cr => { const rc = rounds.find(r => r.roundId === cr.roundId); return { name: `รอบ ${cr.roundId}\n${rc?.feedstock?.split('(')[0] || ''}`, biochar: cr.finalBiocharKg, carbonTco2e: cr.carbonSequesteredKg / 1000, carbonKgC: cr.carbonSequesteredKg / 3.667, feedstock: rc?.feedstockMassKg || 0 }; })}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#d1d5db" /><XAxis dataKey="name" tick={{ fontSize: 9 }} /><YAxis tick={{ fontSize: 9 }} /><Tooltip contentStyle={{ fontSize: 10 }} /><Legend wrapperStyle={{ fontSize: 9 }} />
                      <Bar dataKey="feedstock" fill="#94a3b8" name="วัตถุดิบ (kg)" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="biochar" fill="#f59e0b" name="Biochar (kg)" radius={[4, 4, 0, 0]} />
                      <Bar dataKey={standardMode === 'tgo' ? 'carbonTco2e' : 'carbonKgC'} fill="#10b981" name={standardMode === 'tgo' ? 'Carbon (tCO₂e)' : 'Carbon (kg C)'} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="comparison" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {radarData.length > 0 && (
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><CircleDot className="h-4 w-4 text-purple-500" /> Radar เปรียบเทียบ — 3 รอบ</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={320}>
                      <RadarChart data={radarData}>
                        <PolarGrid /><PolarAngleAxis dataKey="metric" tick={{ fontSize: 9 }} /><PolarRadiusAxis tick={{ fontSize: 8 }} domain={[0, 100]} />
                        <Radar name="รอบ 1 🪵" dataKey="R1" stroke={roundColors[0]} fill={roundColors[0]} fillOpacity={0.15} />
                        <Radar name="รอบ 2 🌾" dataKey="R2" stroke={roundColors[1]} fill={roundColors[1]} fillOpacity={0.15} />
                        <Radar name="รอบ 3 🥥" dataKey="R3" stroke={roundColors[2]} fill={roundColors[2]} fillOpacity={0.15} />
                        <Legend wrapperStyle={{ fontSize: 9 }} /><Tooltip contentStyle={{ fontSize: 10 }} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Info className="h-4 w-4 text-slate-500" /> เปรียบเทียบสภาพแวดล้อม</CardTitle></CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead><tr className="border-b"><th className="text-left p-2 text-muted-foreground font-medium">พารามิเตอร์</th>{rounds.map((_, i) => <th key={i} className="text-center p-2"><div className="flex items-center justify-center gap-1"><div className="h-2 w-2 rounded-full" style={{ backgroundColor: roundColors[i] }} />รอบ {i + 1}</div></th>)}</tr></thead>
                      <tbody>
                        {[
                          { label: 'วัตถุดิบ', values: rounds.map(r => r.feedstock.split('(')[0]) },
                          { label: 'มวล (kg)', values: rounds.map(r => String(r.feedstockMassKg)) },
                          { label: 'เป้าหมาย (°C)', values: rounds.map(r => String(r.targetTempC)) },
                          { label: 'ความชื้น (%)', values: rounds.map(r => String(r.moisturePercent)) },
                          { label: 'O₂ (%)', values: rounds.map(r => String(r.oxygenLevelPercent)) },
                          { label: 'ระยะเวลา (min)', values: rounds.map(r => String(r.durationMin)) },
                          { label: 'อุณหภูมิสูงสุด', values: roundSummaries.map(r => r.peakTemp > 0 ? r.peakTemp.toFixed(0) : '-') },
                          { label: 'Biochar (kg)', values: roundSummaries.map(r => r.biocharKg > 0 ? r.biocharKg.toFixed(1) : '-') },
                          { label: standardMode === 'tgo' ? 'Carbon (tCO₂e)' : 'Carbon (kg C)', values: roundSummaries.map(r => r.carbonKg > 0 ? (standardMode === 'tgo' ? (r.carbonKg / 1000).toFixed(4) : (r.carbonKg / 3.667).toFixed(1)) : '-') },
                          { label: 'อัตราผลผลิต (%)', values: roundSummaries.map(r => r.biocharYield > 0 ? r.biocharYield.toFixed(1) : '-') },
                        ].map((row, i) => (
                          <tr key={i} className="border-b hover:bg-slate-50"><td className="p-2 font-medium text-slate-700">{row.label}</td>{row.values.map((val, j) => <td key={j} className="p-2 text-center font-mono">{val}</td>)}</tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* T-VER Carbon Credit Calculation */}
            {completedRounds.length > 0 && (
              <Card className="border-emerald-200">
                <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><ShieldCheck className={`h-4 w-4 ${standardMode === 'tgo' ? 'text-emerald-600' : 'text-blue-600'}`} /> {standardMode === 'tgo' ? 'T-VER Carbon Credit Calculation' : 'International Carbon Credit Calculation'}</CardTitle><CardDescription className="text-[10px]">{standardMode === 'tgo' ? 'การคำนวณ Carbon Credit ตามมาตรฐาน T-VER' : 'Carbon Credit calculation per IPCC/ISO 14064-2'}</CardDescription></CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead><tr className="border-b bg-emerald-50"><th className="text-left p-2.5 font-semibold text-emerald-800">ตัวแปร</th>{completedRounds.map((_, i) => <th key={i} className="text-center p-2.5 font-semibold text-emerald-800">รอบ {i + 1}</th>)}<th className="text-center p-2.5 font-semibold text-emerald-800">รวม</th></tr></thead>
                      <tbody>
                        {(() => {
                          const data = completedRounds.map(cr => {
                            const rc = rounds.find(r => r.roundId === cr.roundId);
                            const cf = 0.7 + ((rc?.targetTempC || 400) / 700) * 0.15;
                            const sf = 0.85 + ((rc?.targetTempC || 400) / 700) * 0.1;
                            return { feedstock: rc?.feedstockMassKg || 0, biocharKg: cr.finalBiocharKg, yieldPct: rc?.feedstockMassKg ? (cr.finalBiocharKg / rc.feedstockMassKg * 100) : 0, carbonFraction: cf, stabilityFactor: sf, carbonKg: cr.carbonSequesteredKg, tco2e: cr.carbonSequesteredKg / 1000 };
                          });
                          const total = { feedstock: data.reduce((s, d) => s + d.feedstock, 0), biocharKg: data.reduce((s, d) => s + d.biocharKg, 0), carbonKg: data.reduce((s, d) => s + d.carbonKg, 0), tco2e: data.reduce((s, d) => s + d.tco2e, 0) };
                          const rows = [
                            { label: 'วัตถุดิบ (kg)', values: data.map(d => d.feedstock.toFixed(0)), total: total.feedstock.toFixed(0) },
                            { label: 'Biochar ผลผลิต (kg)', values: data.map(d => d.biocharKg.toFixed(1)), total: total.biocharKg.toFixed(1) },
                            { label: 'อัตราผลผลิต (%)', values: data.map(d => d.yieldPct.toFixed(1)), total: (total.biocharKg / total.feedstock * 100).toFixed(1) },
                            { label: 'Carbon Fraction', values: data.map(d => d.carbonFraction.toFixed(3)), total: '-' },
                            { label: 'Stability Factor', values: data.map(d => d.stabilityFactor.toFixed(3)), total: '-' },
                            { label: standardMode === 'tgo' ? 'Carbon กักเก็บ (tCO₂e)' : 'C Sequestered (kg C)', values: data.map(d => standardMode === 'tgo' ? (d.carbonKg / 1000).toFixed(4) : (d.carbonKg / 3.667).toFixed(1)), total: standardMode === 'tgo' ? (total.carbonKg / 1000).toFixed(4) : (total.carbonKg / 3.667).toFixed(1), color: standardMode === 'tgo' ? 'text-emerald-600' : 'text-teal-600' },
                            { label: standardMode === 'tgo' ? 'Carbon Credit (tCO₂e)' : 'Carbon Credit (kg C)', values: data.map(d => standardMode === 'tgo' ? d.tco2e.toFixed(4) : (d.carbonKg / 3.667).toFixed(1)), total: standardMode === 'tgo' ? total.tco2e.toFixed(4) : (total.carbonKg / 3.667).toFixed(1), bold: true, color: standardMode === 'tgo' ? 'text-emerald-700' : 'text-teal-700' },
                          ];
                          return rows.map((row, i) => (
                            <tr key={i} className={`border-b ${row.bold ? 'bg-emerald-50 font-bold' : 'hover:bg-slate-50'}`}>
                              <td className={`p-2.5 ${row.color || ''}`}>{row.label}</td>
                              {row.values.map((v, j) => <td key={j} className={`p-2.5 text-center font-mono ${row.color || ''}`}>{v}</td>)}
                              <td className={`p-2.5 text-center font-mono font-bold ${row.color || ''}`}>{row.total}</td>
                            </tr>
                          ));
                        })()}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* dMRV Pipeline Status */}
      {dmrvLog.length > 0 && (
        <Card className={dmrvSent ? 'border-emerald-300 bg-emerald-50/30' : 'border-blue-300 bg-blue-50/30'}>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2">{dmrvSent ? <CheckCircle className="h-4 w-4 text-emerald-500" /> : <Send className="h-4 w-4 text-blue-500" />} dMRV Pipeline Integration</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center gap-1 mb-4 overflow-x-auto pb-2">
              {[
                { icon: Database, label: 'IoT Ingest', done: dmrvLog.some(l => l.includes('ส่ง')) },
                { icon: ShieldCheck, label: 'Validate', done: dmrvLog.some(l => l.includes('สำเร็จ')) },
                { icon: FileCheck, label: 'Quantify', done: dmrvLog.some(l => l.includes('tCO₂e')) },
                { icon: CheckCircle, label: 'Mint Credit', done: dmrvSent },
              ].map((step, i) => (
                <React.Fragment key={step.label}>
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs whitespace-nowrap ${step.done ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
                    <step.icon className={`h-3.5 w-3.5 ${step.done ? 'text-emerald-500' : 'text-slate-300'}`} />
                    <span className="font-medium">{step.label}</span>
                    {step.done && <CheckCircle className="h-3 w-3 text-emerald-500" />}
                  </div>
                  {i < 3 && <ArrowRight className={`h-3.5 w-3.5 shrink-0 ${step.done ? 'text-emerald-400' : 'text-slate-300'}`} />}
                </React.Fragment>
              ))}
            </div>
            <div className="max-h-36 overflow-y-auto space-y-0.5">
              {dmrvLog.map((msg, idx) => <p key={idx} className="text-xs font-mono">{msg}</p>)}
            </div>
          </CardContent>
        </Card>
      )}

      {/* IoT Data Table */}
      {readings.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><BarChart3 className="h-4 w-4 text-slate-500" /> ข้อมูล IoT ดิบ — ล่าสุด 30 รายการ<Badge variant="secondary" className="text-[9px]">{readings.length} รายการทั้งหมด</Badge></CardTitle></CardHeader>
          <CardContent>
            <div className="max-h-72 overflow-y-auto">
              <div className="overflow-x-auto">
                <table className="w-full text-[10px]">
                  <thead className="sticky top-0 bg-white z-10">
                    <tr className="border-b">
                      <th className="text-left p-1.5 font-medium text-muted-foreground">เวลา</th>
                      <th className="text-left p-1.5 font-medium text-muted-foreground">รอบ</th>
                      <th className="text-left p-1.5 font-medium text-muted-foreground">Phase</th>
                      <th className="text-right p-1.5 font-medium text-muted-foreground">°C</th>
                      <th className="text-right p-1.5 font-medium text-muted-foreground">O₂%</th>
                      <th className="text-right p-1.5 font-medium text-muted-foreground">CO</th>
                      <th className="text-right p-1.5 font-medium text-muted-foreground">CO₂</th>
                      <th className="text-right p-1.5 font-medium text-muted-foreground">CH₄</th>
                      <th className="text-right p-1.5 font-medium text-muted-foreground">ความดัน</th>
                      <th className="text-right p-1.5 font-medium text-muted-foreground">ความชื้น</th>
                      <th className="text-right p-1.5 font-medium text-muted-foreground">Biochar</th>
                      <th className="text-right p-1.5 font-medium text-muted-foreground">Carbon</th>
                    </tr>
                  </thead>
                  <tbody>
                    {readings.slice(-30).reverse().map((r, idx) => (
                      <tr key={idx} className="border-b hover:bg-slate-50 transition-colors">
                        <td className="p-1.5 text-muted-foreground font-mono">{r.simulatedTimeMin.toFixed(0)}m</td>
                        <td className="p-1.5"><span className="inline-flex items-center gap-1"><div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: roundColors[r.roundId - 1] }} />R{r.roundId}</span></td>
                        <td className="p-1.5"><Badge className={`text-[8px] h-4 ${phaseColors[r.phase] || ''}`}>{r.phase}</Badge></td>
                        <td className={`p-1.5 text-right font-mono ${r.temperatureC > 500 ? 'text-red-600 font-bold' : ''}`}>{r.temperatureC.toFixed(1)}</td>
                        <td className="p-1.5 text-right font-mono">{r.o2Percent.toFixed(1)}</td>
                        <td className="p-1.5 text-right font-mono">{r.coPpm.toFixed(0)}</td>
                        <td className="p-1.5 text-right font-mono">{r.co2Ppm.toFixed(0)}</td>
                        <td className="p-1.5 text-right font-mono">{r.ch4Ppm.toFixed(0)}</td>
                        <td className="p-1.5 text-right font-mono">{r.pressureHpa.toFixed(0)}</td>
                        <td className="p-1.5 text-right font-mono">{r.humidityPercent.toFixed(0)}</td>
                        <td className="p-1.5 text-right font-mono text-amber-600">{r.biocharMassKg.toFixed(1)}</td>
                        <td className="p-1.5 text-right font-mono text-emerald-600">{r.carbonSequesteredKg.toFixed(3)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Waiting to start */}
      {readings.length === 0 && (!connected && !useLocal) && (
        <Card className="border-dashed border-2 border-slate-300">
          <CardContent className="p-12 text-center">
            <div className="animate-spin h-8 w-8 border-2 border-orange-500 border-t-transparent rounded-full mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-600 mb-2">กำลังเชื่อมต่อกับ Pyrolysis Simulator...</h3>
            <p className="text-sm text-muted-foreground">หากเชื่อมต่อไม่ได้ ระบบจะเปลี่ยนเป็นโหมด Local Simulation อัตโนมัติ</p>
          </CardContent>
        </Card>
      )}

      {readings.length === 0 && (connected || useLocal) && !isRunning && (
        <Card className="border-dashed border-2 border-orange-300 bg-orange-50/30">
          <CardContent className="p-12 text-center">
            <Flame className="h-12 w-12 mx-auto text-orange-400 mb-4" />
            <h3 className="text-lg font-semibold text-slate-600 mb-2">กดปุ่ม &quot;เริ่มจำลอง&quot; เพื่อเริ่ม Pyrolysis 3 รอบ</h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">ระบบจะบันทึกข้อมูล IoT ทุก 5 นาที (เร่ง 60x = ทุก 5 วินาที) หรือรอสักครู่เพื่อเริ่มอัตโนมัติ</p>
            <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
              {rounds.map((r, i) => (
                <div key={r.roundId} className={`px-4 py-2 rounded-lg border ${roundColorsBg[i]}`}>
                  <span className="text-lg">{getFeedstockEmoji(r.feedstock)}</span>
                  <p className="font-medium mt-1">รอบ {r.roundId}: {r.feedstock.split('(')[0]}</p>
                  <p className="text-[10px]">{r.targetTempC}°C • {r.feedstockMassKg} kg • {r.durationMin} min</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
