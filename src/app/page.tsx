'use client';

import React, { useState, useCallback, useMemo } from 'react';
import {
  FlaskConical, Leaf, Atom, Recycle, Calculator, Bot, Flame, Droplets,
  Microscope, Zap, Beaker, Bug, TrendingUp, Activity, ChevronRight,
  Play, Pause, RotateCcw, BarChart3, Info, AlertTriangle, CheckCircle2,
  Menu, X,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ComposedChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts';

const COLORS = ['#10b981', '#f59e0b', '#3b82f6', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

const methanotrophTypes = [
  { id: 'm1', name: 'Methylococcus capsulatus', type: 'Type I (Gammaproteobacteria)', tempRange: '37-45°C', pH: '6.5-7.5', ch4OxRate: 12.5, biomassYield: 0.45, lipidContent: 25, status: 'Active', description: 'แบคทีเรียกรัมลบ ออกซิไดซ์มีเทนผ่านเอนไซม์ pMMO ผลิต biomass ที่มีโปรตีนสูง (70% ของน้ำหนักแห้ง)' },
  { id: 'm2', name: 'Methylosinus trichosporium', type: 'Type II (Alphaproteobacteria)', tempRange: '25-35°C', pH: '5.5-7.0', ch4OxRate: 8.3, biomassYield: 0.35, lipidContent: 38, status: 'Active', description: 'สะสม PHB (polyhydroxybutyrate) ในเซลล์ มีศักยภาพในการผลิต bioplastic' },
  { id: 'm3', name: 'Methylocystis parvus', type: 'Type II (Alphaproteobacteria)', tempRange: '25-30°C', pH: '6.0-7.0', ch4OxRate: 6.8, biomassYield: 0.30, lipidContent: 42, status: 'Active', description: 'สะสม lipid สูง เหมาะสำหรับผลิต biodiesel จากมีเทน' },
  { id: 'm4', name: 'Methylomonas methanica', type: 'Type I (Gammaproteobacteria)', tempRange: '30-37°C', pH: '6.8-7.2', ch4OxRate: 10.2, biomassYield: 0.40, lipidContent: 20, status: 'Active', description: 'เจริญเร็ว ผลิต protein single-cell สำหรับอาหารสัตว์' },
  { id: 'm5', name: 'Methylocaldum szegediense', type: 'Type I (Thermophilic)', tempRange: '45-55°C', pH: '6.5-7.5', ch4OxRate: 9.5, biomassYield: 0.38, lipidContent: 18, status: 'Lab', description: 'ทนความร้อน เหมาะสำหรับการย่อยสลายมีเทนในแหล่งที่มีอุณหภูมิสูง' },
  { id: 'm6', name: 'Ca. Methylomirabilis oxyfera', type: 'NC10 (Denitrifying)', tempRange: '20-30°C', pH: '7.0-8.0', ch4OxRate: 4.2, biomassYield: 0.15, lipidContent: 12, status: 'Research', description: 'ย่อยสลายมีเทนโดยใช้ไนเตรต เป็นออกซิเจนภายในเซลล์ (intra-aerobic)' },
];

function generateMethaneOxidationData(hours: number) {
  const data = [];
  for (let t = 0; t <= hours; t += 2) {
    const growth = 1 - Math.exp(-0.08 * t);
    const ch4Inlet = 50 + Math.sin(t / 6) * 5;
    const efficiency = Math.min(98, 15 + 75 * growth);
    data.push({ time: t, ch4Inlet: +ch4Inlet.toFixed(1), ch4Outlet: +(ch4Inlet * (1 - efficiency / 100)).toFixed(2), efficiency: +efficiency.toFixed(1), biomass: +(2.5 * growth + Math.random() * 0.2).toFixed(2) });
  }
  return data;
}

const synmecProcesses = [
  { id: 's1', name: 'Syntrophic Acetate Oxidation', organism: 'Syntrophomonas wolfei', substrate: 'Acetate', product: 'H₂ + CO₂ → CH₄', rate: 3.2, ph: '6.8-7.2', temp: '35-40°C', description: 'ปฏิกิริยา syntrophic ย่อยอะซีเตตเป็น H₂ และ CO₂' },
  { id: 's2', name: 'Propionate Oxidation', organism: 'Syntrophobacter fumaroxidans', substrate: 'Propionate', product: 'Acetate + H₂ + CO₂', rate: 1.8, ph: '6.5-7.5', temp: '30-37°C', description: 'ย่อยโพรพิโอเนตในสภาวะที่ไม่มีออกซิเจน' },
  { id: 's3', name: 'Butyrate Oxidation', organism: 'Syntrophomonas zehnderi', substrate: 'Butyrate', product: 'Acetate + H₂', rate: 2.1, ph: '6.8-7.2', temp: '35-45°C', description: 'ย่อยบิวทีเรตเป็นอะซีเตตและ H₂' },
  { id: 's4', name: 'Hydrogenotrophic Methanogenesis', organism: 'M. thermoautotrophicum', substrate: 'H₂ + CO₂', product: 'CH₄ + H₂O', rate: 5.5, ph: '6.5-7.5', temp: '40-65°C', description: 'ผลิตมีเทนจาก H₂ และ CO₂ ควบคุมระดับ H₂' },
  { id: 's5', name: 'Acetoclastic Methanogenesis', organism: 'Methanosarcina barkeri', substrate: 'Acetate', product: 'CH₄ + CO₂', rate: 4.0, ph: '6.5-7.5', temp: '30-40°C', description: 'ผลิตมีเทนโดยตรงจากอะซีเตต' },
];

function generateSynMECData(days: number) {
  const data = [];
  for (let d = 0; d <= days; d++) {
    const g = d < 5 ? 0.1 + d * 0.15 : d < 15 ? 0.85 + (d - 5) * 0.01 : 0.95;
    data.push({ day: d, ch4: +(35 * g + Math.random() * 2).toFixed(1), h2: +(0.5 * (1 - g * 0.8) + Math.random() * 0.05).toFixed(2), ph: +(7.0 + Math.sin(d / 5) * 0.15).toFixed(2), vs: +(g * 55 + Math.random() * 2).toFixed(1) });
  }
  return data;
}

const ccuSystems = [
  { id: 'c1', name: 'Acetogenic CO₂ Fixation', organism: 'C. ljungdahlii', pathway: 'Wood-Ljungdahl', substrate: 'CO₂ + H₂', product: 'Acetate/Ethanol', captureRate: 85, trl: 'TRL 7', description: 'ใช้ Wood-Ljungdahl pathway ตรึง CO₂ (LanzaTech)' },
  { id: 'c2', name: 'Cyanobacterial CO₂ Fixation', organism: 'Synechocystis sp.', pathway: 'Calvin-Benson', substrate: 'CO₂ + Light', product: 'Biomass/Bioplastic', captureRate: 92, trl: 'TRL 6', description: 'ใช้แสงและ CO₂ ผ่าน Calvin cycle' },
  { id: 'c3', name: 'Microalgal CO₂ Capture', organism: 'Chlorella vulgaris', pathway: 'Calvin-Benson', substrate: 'CO₂ + Light', product: 'Lipid/Biomass', captureRate: 78, trl: 'TRL 7', description: 'สาหล่าขนาดเล็กจับ CO₂ สะสม lipid' },
  { id: 'c4', name: 'Formate Production', organism: 'M. extorquens', pathway: 'Serpentine', substrate: 'CO₂ + H₂', product: 'Formate', captureRate: 70, trl: 'TRL 4', description: 'ตรึง CO₂ เป็นฟอร์เมต' },
  { id: 'c5', name: 'Microbial Electrosynthesis', organism: 'Sporomusa ovata', pathway: 'Electro-fermentation', substrate: 'CO₂ + e⁻', product: 'Acetate', captureRate: 65, trl: 'TRL 4', description: 'ใช้ไฟฟ้าตรึง CO₂ เป็นอะซีเตต' },
];

function generateCCUData(days: number) {
  const data = [];
  for (let d = 0; d <= days; d++) {
    const g = 1 - Math.exp(-0.1 * d);
    data.push({ day: d, co2: +(g * 5.2 + Math.random() * 0.2).toFixed(2), product: +(g * 2.1 + Math.random() * 0.1).toFixed(2), biomass: +(g * 1.8 + Math.random() * 0.1).toFixed(2) });
  }
  return data;
}

const wasteProcesses = [
  { id: 'w1', name: 'Anaerobic Digestion', input: 'Organic Waste', output: 'Biogas (CH₄+CO₂)', efficiency: 75, co2eSaved: 3.2, scale: 'Industrial', description: 'ย่อยสลายของเสียอินทรีย์ไร้ O₂ ผลิตไบโอก๊าซ' },
  { id: 'w2', name: 'Gas Fermentation', input: 'Syngas/CO₂', output: 'Ethanol/Acetate', efficiency: 65, co2eSaved: 4.5, scale: 'Pilot', description: 'ใช้ acetogenic bacteria เปลี่ยน CO/CO₂' },
  { id: 'w3', name: 'Composting', input: 'Green Waste', output: 'Compost/CO₂', efficiency: 60, co2eSaved: 1.8, scale: 'Community', description: 'ย่อยสลายของเสียพืชมี O₂ ผลิตปุ๋ย' },
  { id: 'w4', name: 'Nutrient Recovery', input: 'Wastewater', output: 'Struvite', efficiency: 80, co2eSaved: 1.2, scale: 'Industrial', description: 'กู้คืน N และ P จากน้ำเสีย' },
  { id: 'w5', name: 'Dark Fermentation', input: 'Organic Waste', output: 'H₂ + VFA', efficiency: 45, co2eSaved: 2.8, scale: 'Lab', description: 'ผลิต H₂ จากของเสียโดยไม่ใช้แสง' },
];

const bioremediationProcesses = [
  { id: 'b1', name: 'Phytoremediation', type: 'Plant', pollutant: 'Heavy Metals', organism: 'Helianthus annuus', efficiency: 65, timeDays: 90, co2Seq: 2.5, description: 'ใช้พืชดูดซับโลหะหนักจากดิน' },
  { id: 'b2', name: 'Mycoremediation', type: 'Fungal', pollutant: 'Hydrocarbons', organism: 'Pleurotus ostreatus', efficiency: 78, timeDays: 45, co2Seq: 1.2, description: 'ใช้เอนไซม์ lignin peroxidase ย่อยสลาย' },
  { id: 'b3', name: 'Bioaugmentation', type: 'Microbial', pollutant: 'Organics', organism: 'Pseudomonas putida', efficiency: 82, timeDays: 30, co2Seq: 0.8, description: 'เติมจุลินทรีย์ย่อยสลายสารพิษ' },
  { id: 'b4', name: 'Methanotrophic Biocover', type: 'Bio-cover', pollutant: 'CH₄ Landfill', organism: 'Methylocystis sp.', efficiency: 85, timeDays: 14, co2Seq: 25, description: 'ใช้ methanotrophs ปิดทับหลุมฝังกลบ' },
  { id: 'b5', name: 'Constructed Wetland', type: 'Eco', pollutant: 'Nutrients/BOD', organism: 'Mixed consortium', efficiency: 72, timeDays: 30, co2Seq: 3.8, description: 'พื้นที่ชุ่มน้ำบำบัดน้ำเสีย' },
  { id: 'b6', name: 'Biostimulation', type: 'Nutrient', pollutant: 'Oil Spills', organism: 'Indigenous', efficiency: 70, timeDays: 60, co2Seq: 0.5, description: 'เติมสารอาหารเร่งจุลินทรีย์พื้นบ้าน' },
];

function generateBioremediationData(days: number) {
  const data = [];
  for (let d = 0; d <= days; d += 3) {
    const decay = Math.exp(-0.035 * d);
    data.push({ day: d, pollutant: +(100 * decay + Math.random() * 1.5).toFixed(1), microbial: +(100 * (1 - decay) + Math.random() * 2).toFixed(1), co2: +(50 * (1 - decay) + Math.random() * 1.5).toFixed(1) });
  }
  return data;
}

const GWP_CH4 = 25;
type Tab = 'overview' | 'methanotrophs' | 'synmec' | 'ccu' | 'waste' | 'bioremediation' | 'calculator' | 'ailab';

const tabs: { value: Tab; label: string; icon: React.ElementType }[] = [
  { value: 'overview', label: 'Overview', icon: Microscope },
  { value: 'methanotrophs', label: 'Methanotrophs', icon: Flame },
  { value: 'synmec', label: 'SynMEC', icon: Atom },
  { value: 'ccu', label: 'CO₂ Capture', icon: Leaf },
  { value: 'waste', label: 'Waste→Value', icon: Recycle },
  { value: 'bioremediation', label: 'Bioremediation', icon: Droplets },
  { value: 'calculator', label: 'Calculator', icon: Calculator },
  { value: 'ailab', label: 'AI Lab', icon: Bot },
];

export default function BioCarbonPage() {
  const [tab, setTab] = useState<Tab>('overview');
  const [std, setStd] = useState<'tgo' | 'int'>('tgo');
  const [running, setRunning] = useState(false);
  const [simT, setSimT] = useState(0);
  const [sel, setSel] = useState(methanotrophTypes[0]);
  const [menu, setMenu] = useState(false);
  const [calc, setCalc] = useState({ ch4: 100, area: 1000, eff: 85, temp: 35 });

  const startSim = useCallback(() => {
    if (running) return;
    setRunning(true); setSimT(0);
    const iv = setInterval(() => {
      setSimT(p => { const n = p + 2; if (n >= 48) { setRunning(false); clearInterval(iv); return 48; } return n; });
    }, 200);
  }, [running]);

  const methaneData = useMemo(() => generateMethaneOxidationData(simT), [simT]);
  const synmecData = useMemo(() => generateSynMECData(Math.round(simT * 30 / 48)), [simT]);
  const ccuData = useMemo(() => generateCCUData(Math.round(simT * 30 / 48)), [simT]);
  const bioremData = useMemo(() => generateBioremediationData(Math.round(simT * 60 / 48)), [simT]);

  const calcRes = useMemo(() => {
    const c = calc.ch4 * calc.eff / 100;
    return { ch4: c.toFixed(1), co2e: Math.round(c * GWP_CH4).toLocaleString(), bio: (c * sel.biomassYield).toFixed(1), lipid: (c * sel.biomassYield * sel.lipidContent / 100).toFixed(1), credits: Math.round(c * GWP_CH4 * 0.9).toLocaleString(), rai: (calc.area * 6.25).toFixed(0) };
  }, [calc, sel]);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b bg-white px-4 shadow-sm">
        <button className="lg:hidden" onClick={() => setMenu(!menu)}>{menu ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button>
        <FlaskConical className="h-5 w-5 text-emerald-600" />
        <h1 className="text-base font-semibold text-gray-900">dMRV BioCarbon Lab</h1>
        <div className="ml-auto flex items-center gap-2">
          <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5 text-[10px]">
            <button onClick={() => setStd('tgo')} className={`px-2 py-1 rounded-md ${std === 'tgo' ? 'bg-amber-100 text-amber-800 font-bold' : 'text-muted-foreground'}`}>🇹🇭 TGO</button>
            <button onClick={() => setStd('int')} className={`px-2 py-1 rounded-md ${std === 'int' ? 'bg-blue-100 text-blue-800 font-bold' : 'text-muted-foreground'}`}>🌐 Int&apos;l</button>
          </div>
          {!running ? <Button size="sm" onClick={startSim} className="gap-1 bg-emerald-600 hover:bg-emerald-700 text-xs"><Play className="h-3 w-3" />Run Sim</Button>
            : <Button size="sm" onClick={() => setRunning(false)} variant="outline" className="gap-1 text-xs"><Pause className="h-3 w-3" />Pause</Button>}
          <Button size="sm" onClick={() => { setRunning(false); setSimT(0); }} variant="ghost" className="gap-1 text-xs"><RotateCcw className="h-3 w-3" /></Button>
        </div>
      </header>

      {(running || simT > 0) && (
        <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-2">
          <div className="flex items-center gap-3">
            <Activity className={`h-4 w-4 ${running ? 'text-emerald-600 animate-pulse' : 'text-slate-500'}`} />
            <span className="text-xs font-medium">{running ? 'Running...' : simT >= 48 ? 'Complete' : 'Paused'}</span>
            <Progress value={(simT / 48) * 100} className="flex-1 h-2" />
            <span className="text-xs font-mono text-muted-foreground">{simT}/48h</span>
          </div>
        </div>
      )}

      <div className="flex flex-1">
        <aside className="hidden lg:flex flex-col w-52 border-r bg-slate-900 text-white p-2 gap-0.5">
          <div className="flex items-center gap-2 px-3 py-3 border-b border-slate-700 mb-2">
            <div className="h-7 w-7 rounded-lg bg-emerald-600 flex items-center justify-center text-xs font-bold">BC</div>
            <div><p className="text-xs font-bold">BioCarbon</p><p className="text-[9px] text-slate-400">Lab v1.0</p></div>
          </div>
          {tabs.map(t => {
            const I = t.icon; const a = tab === t.value;
            return <button key={t.value} onClick={() => setTab(t.value)} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-all ${a ? 'bg-emerald-600/20 text-emerald-400' : 'text-slate-300 hover:bg-slate-800'}`}><I className="h-4 w-4" /><span className="text-xs">{t.label}</span>{a && <div className="ml-auto h-1.5 w-1.5 rounded-full bg-emerald-400" />}</button>;
          })}
          <div className="mt-auto border-t border-slate-700 px-3 py-2"><div className="flex items-center gap-1 text-[9px] text-slate-500"><Activity className="h-3 w-3 text-emerald-500" />System Online</div></div>
        </aside>

        {menu && <div className="lg:hidden fixed inset-0 z-50 bg-black/50" onClick={() => setMenu(false)}><div className="w-60 h-full bg-slate-900 text-white p-3" onClick={e => e.stopPropagation()}>{tabs.map(t => { const I = t.icon; return <button key={t.value} onClick={() => { setTab(t.value); setMenu(false); }} className={`flex items-center gap-2 w-full rounded-lg px-3 py-2 text-sm mb-1 ${tab === t.value ? 'bg-emerald-600/20 text-emerald-400' : 'text-slate-300'}`}><I className="h-4 w-4" /><span className="text-xs">{t.label}</span></button>; })}</div></div>}

        <main className="flex-1 overflow-y-auto p-4 lg:p-6 max-w-7xl mx-auto w-full space-y-6">
          {/* OVERVIEW */}
          {tab === 'overview' && (<>
            <div><h2 className="text-2xl font-bold tracking-tight">BioCarbon Simulation Lab</h2><p className="text-muted-foreground text-sm mt-1">จำลองข้อมูลจุลินทรีย์และกระบวนการทางชีวภาพที่เกี่ยวข้องกับคาร์บอน — BIOTEC-NSTDA Research</p></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              {[{ t: 'CH₄ Oxidation Rate', v: '12.5 g/g/day', c: '+15%', i: Flame, cl: 'bg-orange-50 text-orange-600' }, { t: 'CO₂ Captured', v: '5.2 tCO₂e/ha/yr', c: '+22%', i: Leaf, cl: 'bg-emerald-50 text-emerald-600' }, { t: 'Biogas Production', v: '35 m³/ton VS', c: '+8%', i: Zap, cl: 'bg-amber-50 text-amber-600' }, { t: 'Remediation Eff.', v: '82%', c: '+5%', i: Droplets, cl: 'bg-blue-50 text-blue-600' }].map(k => (
                <Card key={k.t}><CardContent className="p-4 lg:p-6"><div className="flex items-start justify-between"><div className="space-y-1"><p className="text-sm text-muted-foreground">{k.t}</p><p className="text-2xl font-bold">{k.v}</p><div className="flex items-center gap-1 text-xs"><TrendingUp className="h-3 w-3 text-emerald-600" /><span className="text-emerald-600">{k.c}</span></div></div><div className={`flex h-10 w-10 items-center justify-center rounded-lg ${k.cl}`}><k.i className="h-5 w-5" /></div></div></CardContent></Card>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card><CardHeader><CardTitle className="text-base flex items-center gap-2"><Beaker className="h-4 w-4 text-emerald-600" />Carbon Bio-Pathway Map</CardTitle><CardDescription>กระบวนการทางชีวภาพที่เกี่ยวข้องกับวัฏจักรคาร์บอน</CardDescription></CardHeader>
                <CardContent><div className="space-y-2">{[
                  { from: 'CH₄', via: 'Methanotrophs (pMMO)', to: 'Biomass + CO₂', c: 'bg-orange-100 border-orange-300' },
                  { from: 'CO₂ + H₂', via: 'Acetogens (Wood-Ljungdahl)', to: 'Acetate/Ethanol', c: 'bg-emerald-100 border-emerald-300' },
                  { from: 'CO₂ + Light', via: 'Cyanobacteria/Algae', to: 'Biomass/Lipid/O₂', c: 'bg-blue-100 border-blue-300' },
                  { from: 'Organic Waste', via: 'Anaerobic Digestion', to: 'Biogas (CH₄+CO₂)', c: 'bg-amber-100 border-amber-300' },
                  { from: 'CO₂ + e⁻', via: 'Electrotrophs (MES)', to: 'Acetate/Chemicals', c: 'bg-purple-100 border-purple-300' },
                  { from: 'CH₄ (Landfill)', via: 'Methanotrophic Biocover', to: 'CO₂ + Biomass', c: 'bg-red-100 border-red-300' },
                ].map((p, i) => <div key={i} className={`flex items-center gap-2 p-2 rounded-lg border ${p.c} text-xs`}><span className="font-semibold min-w-[70px]">{p.from}</span><ChevronRight className="h-3 w-3" /><span className="flex-1 text-muted-foreground">{p.via}</span><ChevronRight className="h-3 w-3" /><span className="font-semibold min-w-[80px] text-right">{p.to}</span></div>)}</div></CardContent></Card>
              <Card><CardHeader><CardTitle className="text-base">Technology Readiness Level</CardTitle></CardHeader>
                <CardContent><ResponsiveContainer width="100%" height={280}><BarChart data={[{ n: 'Methanotrophs', t: 7 }, { n: 'SynMEC/AD', t: 8 }, { n: 'CCU-Gas', t: 7 }, { n: 'CCU-Algae', t: 6 }, { n: 'Bioremediation', t: 7 }, { n: 'MES', t: 4 }]} layout="vertical"><CartesianGrid strokeDasharray="3 3" /><XAxis type="number" domain={[0, 9]} /><YAxis type="category" dataKey="n" width={100} style={{ fontSize: 11 }} /><Tooltip /><Bar dataKey="t" fill="#10b981" radius={[0, 4, 4, 0]} /></BarChart></ResponsiveContainer></CardContent></Card>
            </div>
            <Card><CardHeader><CardTitle className="text-base">จุลินทรีย์หลักที่เกี่ยวข้องกับคาร์บอน</CardTitle></CardHeader>
              <CardContent><div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">{[
                { n: 'Methanotrophs', r: 'CH₄ → Biomass', c: 'border-orange-300 bg-orange-50', cnt: 6, i: Flame },
                { n: 'Acetogens', r: 'CO₂ → Acetate/Ethanol', c: 'border-emerald-300 bg-emerald-50', cnt: 3, i: Leaf },
                { n: 'Cyanobacteria', r: 'CO₂ → Biomass/O₂', c: 'border-blue-300 bg-blue-50', cnt: 4, i: Microscope },
                { n: 'Methanogens', r: 'H₂+CO₂ → CH₄', c: 'border-purple-300 bg-purple-50', cnt: 3, i: Atom },
                { n: 'Syntrophs', r: 'VFA → H₂+Acetate', c: 'border-amber-300 bg-amber-50', cnt: 3, i: Beaker },
                { n: 'Bioremediators', r: 'Pollutant → CO₂', c: 'border-teal-300 bg-teal-50', cnt: 5, i: Droplets },
              ].map(o => <div key={o.n} className={`flex items-center gap-3 p-3 rounded-lg border ${o.c}`}><o.i className="h-5 w-5" /><div className="flex-1"><p className="text-sm font-semibold">{o.n}</p><p className="text-[11px] text-muted-foreground">{o.r}</p></div><Badge variant="secondary" className="text-[10px]">{o.cnt} strains</Badge></div>)}</div></CardContent></Card>
          </>)}

          {/* METHANOTROPHS */}
          {tab === 'methanotrophs' && (<>
            <Card><CardHeader><CardTitle className="text-base flex items-center gap-2"><Bug className="h-4 w-4 text-orange-600" />จุลินทรีย์ย่อยสลายมีเทน (Methanotrophs)</CardTitle><CardDescription>แบคทีเรียที่ใช้มีเทนเป็นแหล่งคาร์บอนและพลังงาน ผ่านเอนไซม์ MMO</CardDescription></CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div><Label className="text-xs mb-2 block">Select Strain</Label><Select value={sel.id} onValueChange={v => setSel(methanotrophTypes.find(m => m.id === v) || methanotrophTypes[0])}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{methanotrophTypes.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent></Select></div>
                  <div className="md:col-span-2 p-3 rounded-lg bg-muted/50"><p className="text-xs text-muted-foreground mb-1">{sel.type}</p><p className="text-sm">{sel.description}</p><div className="flex flex-wrap gap-2 mt-2"><Badge variant="secondary" className="text-[10px]">🌡️ {sel.tempRange}</Badge><Badge variant="secondary" className="text-[10px]">pH {sel.pH}</Badge><Badge variant="secondary" className="text-[10px]">CH₄: {sel.ch4OxRate}</Badge><Badge variant="secondary" className="text-[10px]">Lipid: {sel.lipidContent}%</Badge><Badge className={`text-[10px] ${sel.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : sel.status === 'Lab' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>{sel.status}</Badge></div></div>
                </div>
                <div className="overflow-x-auto"><table className="w-full text-xs"><thead><tr className="border-b bg-muted/30"><th className="text-left p-2">Strain</th><th className="text-left p-2">Type</th><th className="text-right p-2">Rate</th><th className="text-right p-2">Yield</th><th className="text-right p-2">Lipid%</th><th className="text-center p-2">Status</th></tr></thead><tbody>{methanotrophTypes.map(m => (<tr key={m.id} className={`border-b cursor-pointer hover:bg-muted/30 ${sel.id === m.id ? 'bg-emerald-50' : ''}`} onClick={() => setSel(m)}><td className="p-2 font-medium">{m.name}</td><td className="p-2 text-muted-foreground">{m.type.split('(')[0].trim()}</td><td className="p-2 text-right">{m.ch4OxRate}</td><td className="p-2 text-right">{m.biomassYield}</td><td className="p-2 text-right">{m.lipidContent}%</td><td className="p-2 text-center"><Badge className={`text-[9px] ${m.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : m.status === 'Lab' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>{m.status}</Badge></td></tr>))}</tbody></table></div>
              </CardContent></Card>
            <Card><CardHeader><CardTitle className="text-base">CH₄ Oxidation Simulation — {simT}h</CardTitle></CardHeader>
              <CardContent><ResponsiveContainer width="100%" height={350}><ComposedChart data={methaneData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="time" label={{ value: 'Hours', position: 'bottom', style: { fontSize: 11 } }} /><YAxis yAxisId="l" /><YAxis yAxisId="r" orientation="right" /><Tooltip /><Legend /><Area yAxisId="l" type="monotone" dataKey="efficiency" name="Efficiency %" fill="#10b98130" stroke="#10b981" strokeWidth={2} /><Line yAxisId="l" type="monotone" dataKey="ch4Inlet" name="CH₄ Inlet" stroke="#f59e0b" strokeWidth={1.5} dot={false} /><Line yAxisId="l" type="monotone" dataKey="ch4Outlet" name="CH₄ Outlet" stroke="#ef4444" strokeWidth={1.5} dot={false} /><Line yAxisId="r" type="monotone" dataKey="biomass" name="Biomass g/L" stroke="#3b82f6" strokeWidth={2} dot={false} /></ComposedChart></ResponsiveContainer></CardContent></Card>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card><CardHeader><CardTitle className="text-sm">Strain Comparison</CardTitle></CardHeader><CardContent><ResponsiveContainer width="100%" height={280}><RadarChart data={[{ m: 'CH₄ Ox', I: 12.5, II: 8.3, Th: 9.5 }, { m: 'Yield', I: 45, II: 35, Th: 38 }, { m: 'Lipid', I: 25, II: 42, Th: 18 }, { m: 'Temp', I: 70, II: 55, Th: 90 }, { m: 'pH', I: 60, II: 65, Th: 60 }, { m: 'Growth', I: 80, II: 60, Th: 65 }]}><PolarGrid /><PolarAngleAxis dataKey="m" style={{ fontSize: 10 }} /><Radar name="Type I" dataKey="I" stroke="#10b981" fill="#10b981" fillOpacity={0.2} /><Radar name="Type II" dataKey="II" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.2} /><Radar name="Thermo" dataKey="Th" stroke="#ef4444" fill="#ef4444" fillOpacity={0.2} /><Legend /></RadarChart></ResponsiveContainer></CardContent></Card>
              <Card><CardHeader><CardTitle className="text-sm">CO₂e by Strain</CardTitle></CardHeader><CardContent><ResponsiveContainer width="100%" height={280}><BarChart data={methanotrophTypes.map(m => ({ name: m.name.split(' ')[0].substring(0, 8), co2e: +(m.ch4OxRate * GWP_CH4 * m.biomassYield).toFixed(0) }))}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" style={{ fontSize: 10 }} /><YAxis /><Tooltip /><Bar dataKey="co2e" name="tCO₂e/ton/yr" fill="#10b981" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></CardContent></Card>
            </div>
          </>)}

          {/* SynMEC */}
          {tab === 'synmec' && (<>
            <Card><CardHeader><CardTitle className="text-base flex items-center gap-2"><Atom className="h-4 w-4 text-purple-600" />SynMEC — Syntrophic Methanogenic Consortium</CardTitle><CardDescription>กลุ่มจุลินทรีย์ที่ทำงานร่วมกัน (syntrophy) ในการผลิตมีเทน</CardDescription></CardHeader>
              <CardContent><div className="space-y-3">{synmecProcesses.map(p => (<div key={p.id} className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 text-purple-700 text-xs font-bold shrink-0">{p.id[1].toUpperCase()}</div><div className="flex-1"><div className="flex items-center gap-2 mb-1"><span className="text-sm font-semibold">{p.name}</span><Badge variant="secondary" className="text-[9px]">{p.organism}</Badge></div><p className="text-xs text-muted-foreground">{p.description}</p><div className="flex flex-wrap gap-1.5 mt-1"><Badge variant="outline" className="text-[9px]">⬇ {p.substrate}</Badge><Badge variant="outline" className="text-[9px]">⬆ {p.product}</Badge><Badge variant="outline" className="text-[9px]">🌡️ {p.temp}</Badge><Badge className="text-[9px] bg-purple-50 text-purple-700">Rate: {p.rate}</Badge></div></div></div>))}</div></CardContent></Card>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card><CardHeader><CardTitle className="text-sm">CH₄ & H₂ Pressure</CardTitle></CardHeader><CardContent><ResponsiveContainer width="100%" height={280}><ComposedChart data={synmecData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="day" /><YAxis yAxisId="l" /><YAxis yAxisId="r" orientation="right" /><Tooltip /><Legend /><Area yAxisId="l" type="monotone" dataKey="ch4" name="CH₄ m³/kg VS" fill="#8b5cf620" stroke="#8b5cf6" strokeWidth={2} /><Line yAxisId="r" type="monotone" dataKey="h2" name="H₂ Pressure" stroke="#ef4444" strokeWidth={2} dot={false} /></ComposedChart></ResponsiveContainer></CardContent></Card>
              <Card><CardHeader><CardTitle className="text-sm">pH & VS Removal</CardTitle></CardHeader><CardContent><ResponsiveContainer width="100%" height={280}><ComposedChart data={synmecData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="day" /><YAxis yAxisId="l" domain={[6, 8]} /><YAxis yAxisId="r" orientation="right" domain={[0, 60]} /><Tooltip /><Legend /><Line yAxisId="l" type="monotone" dataKey="ph" name="pH" stroke="#3b82f6" strokeWidth={2} /><Area yAxisId="r" type="monotone" dataKey="vs" name="VS Removal %" fill="#10b98120" stroke="#10b981" strokeWidth={1.5} /></ComposedChart></ResponsiveContainer></CardContent></Card>
            </div>
          </>)}

          {/* CCU */}
          {tab === 'ccu' && (<>
            <Card><CardHeader><CardTitle className="text-base flex items-center gap-2"><Leaf className="h-4 w-4 text-emerald-600" />CO₂ Capture & Utilization</CardTitle><CardDescription>จุลินทรีย์ที่ตรึง CO₂ ผ่านกระบวนการทางชีวภาพ</CardDescription></CardHeader>
              <CardContent><div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">{ccuSystems.map(s => (<div key={s.id} className="p-4 rounded-lg border bg-muted/30 space-y-2"><div className="flex items-start justify-between"><div><p className="text-sm font-semibold">{s.name}</p><p className="text-[11px] text-muted-foreground">{s.organism}</p></div><Badge className="text-[9px] bg-emerald-50 text-emerald-700">{s.trl}</Badge></div><p className="text-xs text-muted-foreground">{s.description}</p><div className="flex flex-wrap gap-1.5"><Badge variant="outline" className="text-[9px]">{s.pathway}</Badge><Badge variant="outline" className="text-[9px]">⬇ {s.substrate}</Badge><Badge variant="outline" className="text-[9px]">⬆ {s.product}</Badge></div><div className="flex items-center gap-2 text-[11px]"><span className="text-muted-foreground">Capture:</span><Progress value={s.captureRate} className="flex-1 h-1.5" /><span className="font-semibold">{s.captureRate}%</span></div></div>))}</div></CardContent></Card>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card><CardHeader><CardTitle className="text-sm">CO₂ Capture Over Time</CardTitle></CardHeader><CardContent><ResponsiveContainer width="100%" height={280}><AreaChart data={ccuData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="day" /><YAxis /><Tooltip /><Legend /><Area type="monotone" dataKey="co2" name="CO₂ t/ha" fill="#10b98130" stroke="#10b981" strokeWidth={2} /><Area type="monotone" dataKey="product" name="Product t/ha" fill="#3b82f630" stroke="#3b82f6" strokeWidth={2} /><Area type="monotone" dataKey="biomass" name="Biomass t/ha" fill="#f59e0b30" stroke="#f59e0b" strokeWidth={2} /></AreaChart></ResponsiveContainer></CardContent></Card>
              <Card><CardHeader><CardTitle className="text-sm">Efficiency</CardTitle></CardHeader><CardContent><ResponsiveContainer width="100%" height={280}><PieChart><Pie data={ccuSystems.map(s => ({ name: s.name.split(' ')[0], value: s.captureRate }))} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, value }) => `${name}: ${value}%`}>{ccuSystems.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></CardContent></Card>
            </div>
          </>)}

          {/* WASTE → VALUE */}
          {tab === 'waste' && (<>
            <Card><CardHeader><CardTitle className="text-base flex items-center gap-2"><Recycle className="h-4 w-4 text-amber-600" />Waste to Value</CardTitle><CardDescription>เทคโนโลยีชีวภาพแปลงของเสียเป็นผลิตภัณฑ์มูลค่าเพิ่ม</CardDescription></CardHeader>
              <CardContent><div className="space-y-3">{wasteProcesses.map(w => (<div key={w.id} className="flex items-center gap-4 p-3 rounded-lg border hover:bg-muted/30"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-700 text-sm font-bold shrink-0">{w.output[0]}</div><div className="flex-1"><div className="flex items-center gap-2 mb-1"><span className="text-sm font-semibold">{w.name}</span><Badge variant="secondary" className="text-[9px]">{w.scale}</Badge></div><p className="text-xs text-muted-foreground">{w.description}</p><div className="flex flex-wrap gap-1.5 mt-1"><Badge variant="outline" className="text-[9px]">📥 {w.input}</Badge><Badge variant="outline" className="text-[9px]">📤 {w.output}</Badge><Badge className="text-[9px] bg-emerald-50 text-emerald-700">CO₂e: {w.co2eSaved}</Badge><Badge className="text-[9px] bg-amber-50 text-amber-700">Eff: {w.efficiency}%</Badge></div></div></div>))}</div></CardContent></Card>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card><CardHeader><CardTitle className="text-sm">CO₂e Savings</CardTitle></CardHeader><CardContent><ResponsiveContainer width="100%" height={280}><BarChart data={wasteProcesses.map(w => ({ name: w.name, co2e: w.co2eSaved, eff: w.efficiency }))}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" style={{ fontSize: 9 }} angle={-15} textAnchor="end" height={50} /><YAxis /><Tooltip /><Bar dataKey="co2e" name="tCO₂e/yr" fill="#10b981" radius={[4, 4, 0, 0]} /><Bar dataKey="eff" name="Eff %" fill="#f59e0b" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></CardContent></Card>
              <Card><CardHeader><CardTitle className="text-sm">Distribution</CardTitle></CardHeader><CardContent><ResponsiveContainer width="100%" height={280}><PieChart><Pie data={wasteProcesses.map(w => ({ name: w.name, value: w.co2eSaved }))} cx="50%" cy="50%" outerRadius={90} innerRadius={40} dataKey="value" label={({ value }) => `${value} tCO₂e`}>{wasteProcesses.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer></CardContent></Card>
            </div>
          </>)}

          {/* BIOREMEDIATION */}
          {tab === 'bioremediation' && (<>
            <Card><CardHeader><CardTitle className="text-base flex items-center gap-2"><Droplets className="h-4 w-4 text-teal-600" />Bioremediation</CardTitle><CardDescription>ใช้จุลินทรีย์ พืช และเชื้อราบำบัดสารพิษ พร้อมตรึงคาร์บอน</CardDescription></CardHeader>
              <CardContent><div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">{bioremediationProcesses.map(b => (<div key={b.id} className="p-4 rounded-lg border space-y-2"><div className="flex items-start justify-between"><div><p className="text-sm font-semibold">{b.name}</p><p className="text-[11px] text-muted-foreground">{b.type}</p></div><Badge variant="secondary" className="text-[9px]">{b.efficiency}%</Badge></div><p className="text-xs text-muted-foreground">{b.description}</p><div className="space-y-1 text-[11px]"><div className="flex justify-between"><span className="text-muted-foreground">Pollutant:</span><span className="font-medium">{b.pollutant}</span></div><div className="flex justify-between"><span className="text-muted-foreground">Organism:</span><span>{b.organism}</span></div><div className="flex justify-between"><span className="text-muted-foreground">Time:</span><span>{b.timeDays} days</span></div><div className="flex justify-between"><span className="text-muted-foreground">CO₂:</span><span className="text-emerald-600 font-medium">{b.co2Seq} tCO₂e/ha</span></div></div><Progress value={b.efficiency} className="h-1.5" /></div>))}</div></CardContent></Card>
            <Card><CardHeader><CardTitle className="text-sm">Performance Simulation</CardTitle></CardHeader><CardContent><ResponsiveContainer width="100%" height={320}><ComposedChart data={bioremData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="day" /><YAxis yAxisId="l" /><YAxis yAxisId="r" orientation="right" domain={[0, 100]} /><Tooltip /><Legend /><Area yAxisId="l" type="monotone" dataKey="pollutant" name="Pollutant %" fill="#ef444420" stroke="#ef4444" strokeWidth={2} /><Line yAxisId="r" type="monotone" dataKey="microbial" name="Microbial %" stroke="#10b981" strokeWidth={2} dot={false} /><Line yAxisId="l" type="monotone" dataKey="co2" name="CO₂" stroke="#f59e0b" strokeWidth={1.5} dot={false} /></ComposedChart></ResponsiveContainer></CardContent></Card>
          </>)}

          {/* CALCULATOR */}
          {tab === 'calculator' && (<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card><CardHeader><CardTitle className="text-base flex items-center gap-2"><Calculator className="h-4 w-4 text-emerald-600" />BioCarbon Credit Calculator</CardTitle><CardDescription>คำนวณ Carbon Credit — T-VER Standard</CardDescription></CardHeader>
              <CardContent className="space-y-4">
                <div><Label className="text-xs">CH₄ Emission (ton/yr)</Label><Input type="number" value={calc.ch4} onChange={e => setCalc(p => ({ ...p, ch4: +e.target.value }))} /></div>
                <div><Label className="text-xs">Area ({std === 'tgo' ? 'ไร่' : 'ha'})</Label><Input type="number" value={std === 'tgo' ? calc.area * 6.25 : calc.area} onChange={e => setCalc(p => ({ ...p, area: std === 'tgo' ? +e.target.value / 6.25 : +e.target.value }))} /></div>
                <div><Label className="text-xs">Oxidation Efficiency — {calc.eff}%</Label><Slider value={[calc.eff]} onValueChange={([v]) => setCalc(p => ({ ...p, eff: v }))} min={10} max={99} step={1} /></div>
                <div><Label className="text-xs">Temperature — {calc.temp}°C</Label><Slider value={[calc.temp]} onValueChange={([v]) => setCalc(p => ({ ...p, temp: v }))} min={15} max={65} step={1} /></div>
                <div><Label className="text-xs">Methanotroph Strain</Label><Select value={sel.id} onValueChange={v => setSel(methanotrophTypes.find(m => m.id === v) || methanotrophTypes[0])}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{methanotrophTypes.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent></Select></div>
              </CardContent></Card>
            <Card><CardHeader><CardTitle className="text-base">Results</CardTitle></CardHeader><CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">{[
                { l: 'CH₄ Captured', v: `${calcRes.ch4} ton/yr`, c: 'text-orange-600' },
                { l: 'CO₂e Avoided', v: `${calcRes.co2e} tCO₂e`, c: 'text-emerald-600' },
                { l: 'Biomass', v: `${calcRes.bio} ton/yr`, c: 'text-blue-600' },
                { l: 'Lipid', v: `${calcRes.lipid} ton/yr`, c: 'text-amber-600' },
                { l: 'T-VER Credits', v: `${calcRes.credits} tCO₂e`, c: 'text-emerald-700' },
                { l: 'Area', v: std === 'tgo' ? `${calcRes.rai} ไร่` : `${calc.area} ha`, c: 'text-slate-700' },
              ].map(r => <div key={r.l} className="p-3 rounded-lg bg-muted/50"><p className="text-[10px] text-muted-foreground">{r.l}</p><p className={`text-lg font-bold ${r.c}`}>{r.v}</p></div>)}</div>
              <Separator />
              <div className="p-3 rounded-lg border border-emerald-200 bg-emerald-50/50"><p className="text-xs font-semibold text-emerald-700 mb-2">GWP Factors (IPCC AR5)</p><div className="space-y-1 text-xs"><div className="flex justify-between"><span className="text-muted-foreground">CH₄ GWP</span><span className="font-mono font-semibold">×{GWP_CH4}</span></div><div className="flex justify-between"><span className="text-muted-foreground">N₂O GWP</span><span className="font-mono font-semibold">×298</span></div><div className="flex justify-between"><span className="text-muted-foreground">T-VER Discount</span><span className="font-mono font-semibold">10%</span></div></div></div>
              <div className="p-3 rounded-lg border border-amber-200 bg-amber-50/50"><p className="text-xs font-semibold text-amber-700">T-VER Note</p><p className="text-[11px] text-amber-800">อ้างอิง T-VER-P-TOOL_01 สำหรับการคำนวณ CH₄ capture and destruction หักส่วนลด 10% สำหรับความไม่แน่นอน</p></div>
            </CardContent></Card>
          </div>)}

          {/* AI LAB */}
          {tab === 'ailab' && (<Card><CardHeader><CardTitle className="text-base flex items-center gap-2"><Bot className="h-4 w-4 text-emerald-600" />AI Bio Lab Assistant</CardTitle><CardDescription>ใช้ AI วิเคราะห์ข้อมูลจุลินทรีย์และกระบวนการทางชีวภาพ</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">{[
                { t: '🔬 Strain Analysis', d: 'วิเคราะห์สายพันธุ์จุลินทรีย์และประสิทธิภาพ' },
                { t: '📊 Process Optimization', d: 'เพิ่มประสิทธิภาพกระบวนการบำบัด' },
                { t: '🌿 Carbon Pathway', d: 'ออกแบบเส้นทางคาร์บอนที่เหมาะสม' },
              ].map(tool => <button key={tool.t} className="flex flex-col gap-2 p-4 rounded-lg border text-left hover:bg-muted/30"><span className="text-sm font-semibold">{tool.t}</span><span className="text-xs text-muted-foreground">{tool.d}</span></button>)}</div>
              <Separator />
              <div className="p-4 rounded-lg bg-muted/30 space-y-3"><p className="text-sm font-semibold">💡 AI Insights</p><div className="space-y-2">{[
                { text: 'Methylocystis parvus (Type II) เหมาะที่สุดสำหรับสภาพภูมิอากาศไทย — เจริญดีที่ 25-30°C สะสม lipid สูง (42%)', type: 'success' },
                { text: 'การผสม Methylocystis + Methylococcus เพิ่ม CH₄ oxidation จาก 85% → 93%', type: 'info' },
                { text: 'ควรติดตาม H₂ partial pressure ใน SynMEC — หากเกิน 10⁻⁴ atm จะยับยั้ง syntrophic oxidation', type: 'warning' },
                { text: 'LanzaTech gas fermentation (TRL 7) ประยุกต์ใช้กับอุตสาหกรรมเหล็กกล้าไทย ลด CO₂ 150,000 tCO₂e/yr', type: 'success' },
              ].map((item, i) => (<div key={i} className="flex items-start gap-2 text-xs">{item.type === 'success' ? <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" /> : item.type === 'warning' ? <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" /> : <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />}<span>{item.text}</span></div>))}</div></div>
            </CardContent></Card>)}

          <div className="text-center text-[10px] text-muted-foreground py-4">BioCarbon Simulation Lab — BIOTEC-NSTDA Research | Thailand T-VER | GWP: IPCC AR5</div>
        </main>
      </div>
    </div>
  );
}
