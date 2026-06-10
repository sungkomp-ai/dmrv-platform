'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  FlaskConical,
  Leaf,
  Atom,
  Recycle,
  Calculator,
  Bot,
  Flame,
  Droplets,
  Microscope,
  Zap,
  Beaker,
  Bug,
  TrendingUp,
  Activity,
  ChevronRight,
  Play,
  Pause,
  RotateCcw,
  BarChart3,
  Info,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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

// ============================================================
// SIMULATED DATA - Bio/จุลินทรีย์ ที่เกี่ยวข้องกับคาร์บอน
// Based on BIOTEC-NSTDA research on methanotrophs, SynMEC, CCU, etc.
// ============================================================

const COLORS = ['#10b981', '#f59e0b', '#3b82f6', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

// 1. จุลินทรีย์ย่อยสลายมีเทน (Methanotrophs)
const methanotrophTypes = [
  { id: 'm1', name: 'Methylococcus capsulatus', type: 'Type I (Gammaproteobacteria)', tempRange: '37-45°C', pH: '6.5-7.5', ch4OxRate: 12.5, biomassYield: 0.45, lipidContent: 25, status: 'Active', description: 'แบคทีเรียกรัมลบ ออกซิไดซ์มีเทนผ่านเอนไซม์ pMMO ผลิต biomass ที่มีโปรตีนสูง (คิดเป็น 70% ของน้ำหนักแห้ง)' },
  { id: 'm2', name: 'Methylosinus trichosporium', type: 'Type II (Alphaproteobacteria)', tempRange: '25-35°C', pH: '5.5-7.0', ch4OxRate: 8.3, biomassYield: 0.35, lipidContent: 38, status: 'Active', description: 'สะสม PHB (polyhydroxybutyrate) ในเซลล์ มีศักยภาพในการผลิต bioplastic' },
  { id: 'm3', name: 'Methylocystis parvus', type: 'Type II (Alphaproteobacteria)', tempRange: '25-30°C', pH: '6.0-7.0', ch4OxRate: 6.8, biomassYield: 0.30, lipidContent: 42, status: 'Active', description: 'สะสม lipid สูง เหมาะสำหรับผลิต biodiesel จากมีเทน' },
  { id: 'm4', name: 'Methylomonas methanica', type: 'Type I (Gammaproteobacteria)', tempRange: '30-37°C', pH: '6.8-7.2', ch4OxRate: 10.2, biomassYield: 0.40, lipidContent: 20, status: 'Active', description: 'เจริญเร็ว ผลิต protein single-cell สำหรับอาหารสัตว์' },
  { id: 'm5', name: 'Methylocaldum szegediense', type: 'Type I (Thermophilic)', tempRange: '45-55°C', pH: '6.5-7.5', ch4OxRate: 9.5, biomassYield: 0.38, lipidContent: 18, status: 'Lab', description: 'ทนความร้อน เหมาะสำหรับการย่อยสลายมีเทนในแหล่งที่มีอุณหภูมิสูง' },
  { id: 'm6', name: 'Candidatus Methylomirabilis oxyfera', type: 'NC10 (Denitrifying)', tempRange: '20-30°C', pH: '7.0-8.0', ch4OxRate: 4.2, biomassYield: 0.15, lipidContent: 12, status: 'Research', description: 'ย่อยสลายมีเทนโดยใช้ไนเตรต เป็นออกซิเจนภายในเซลล์ (intra-aerobic oxidation)' },
];

// Methane oxidation simulation over time
function generateMethaneOxidationData(hours: number = 48) {
  const data = [];
  for (let t = 0; t <= hours; t += 2) {
    const growth = 1 - Math.exp(-0.08 * t);
    const ch4Inlet = 50 + Math.sin(t / 6) * 5;
    const efficiency = Math.min(98, 15 + 75 * growth);
    const ch4Outlet = ch4Inlet * (1 - efficiency / 100);
    data.push({
      time: t,
      ch4Inlet: +ch4Inlet.toFixed(1),
      ch4Outlet: +ch4Outlet.toFixed(2),
      efficiency: +efficiency.toFixed(1),
      biomass: +(2.5 * growth + Math.random() * 0.3).toFixed(2),
      co2Produced: +(ch4Inlet * efficiency / 100 * 0.8).toFixed(2),
    });
  }
  return data;
}

// 2. SynMEC - Syntrophic Methanogenic Consortium
const synmecProcesses = [
  { id: 's1', name: 'Syntrophic Acetate Oxidation', organism: 'Syntrophomonas wolfei', partner: 'Methanobacterium', substrate: 'Acetate', product: 'H₂ + CO₂ → CH₄', rate: 3.2, ph: '6.8-7.2', temp: '35-40°C', description: 'ปฏิกิริยา syntrophic ย่อยอะซีเตตเป็น H₂ และ CO₂ โดย H₂ ถูกใช้ทันทีโดย methanogen' },
  { id: 's2', name: 'Propionate Oxidation', organism: 'Syntrophobacter fumaroxidans', partner: 'Methanospirillum', substrate: 'Propionate', product: 'Acetate + H₂ + CO₂', rate: 1.8, ph: '6.5-7.5', temp: '30-37°C', description: 'ย่อยโพรพิโอเนตในสภาวะที่ไม่มีออกซิเจน ต้องการ hydrogenotrophic methanogen เป็น partner' },
  { id: 's3', name: 'Butyrate Oxidation', organism: 'Syntrophomonas zehnderi', partner: 'Methanothermobacter', substrate: 'Butyrate', product: 'Acetate + H₂', rate: 2.1, ph: '6.8-7.2', temp: '35-45°C', description: 'ย่อยบิวทีเรตเป็นอะซีเตตและ H₂ ภายใต้ thermophilic conditions' },
  { id: 's4', name: 'Hydrogenotrophic Methanogenesis', organism: 'Methanobacterium thermoautotrophicum', partner: '—', substrate: 'H₂ + CO₂', product: 'CH₄ + H₂O', rate: 5.5, ph: '6.5-7.5', temp: '40-65°C', description: 'ผลิตมีเทนจาก H₂ และ CO₂ ควบคุมระดับ H₂ ในระบบ syntrophic' },
  { id: 's5', name: 'Acetoclastic Methanogenesis', organism: 'Methanosarcina barkeri', partner: '—', substrate: 'Acetate', product: 'CH₄ + CO₂', rate: 4.0, ph: '6.5-7.5', temp: '30-40°C', description: 'ผลิตมีเทนโดยตรงจากอะซีเตต มีทั้ง pathway แบบ acetoclastic และ methylotrophic' },
];

function generateSynMECData(days: number = 30) {
  const data = [];
  for (let d = 0; d <= days; d++) {
    const phase = d < 5 ? 'lag' : d < 15 ? 'exponential' : 'stationary';
    const growthFactor = phase === 'lag' ? 0.1 + d * 0.15 : phase === 'exponential' ? 0.85 + (d - 5) * 0.01 : 0.95;
    data.push({
      day: d,
      ch4Production: +(35 * growthFactor + Math.random() * 3).toFixed(1),
      h2PartialPressure: +(0.5 * (1 - growthFactor * 0.8) + Math.random() * 0.1).toFixed(2),
      acetateConc: +(200 * (1 - growthFactor * 0.7) + Math.random() * 10).toFixed(0),
      ph: +(7.0 + Math.sin(d / 5) * 0.15).toFixed(2),
      vsRemoval: +(growthFactor * 55 + Math.random() * 3).toFixed(1),
      codReduction: +(growthFactor * 60 + Math.random() * 4).toFixed(1),
    });
  }
  return data;
}

// 3. CO₂ Capture & Utilization (CCU)
const ccuSystems = [
  { id: 'c1', name: 'Acetogenic CO₂ Fixation', organism: 'Clostridium ljungdahlii', pathway: 'Wood-Ljungdahl', substrate: 'CO₂ + H₂', product: 'Acetate/Ethanol', captureRate: 85, temp: '37°C', ph: '6.0', tRL: 'TRL 7', description: 'ใช้ Wood-Ljungdahl pathway ตรึง CO₂ เป็นอะซีเตตและเอทานอล ใช้ในเทคโนโลยี LanzaTech' },
  { id: 'c2', name: 'Cyanobacterial CO₂ Fixation', organism: 'Synechocystis sp. PCC 6803', pathway: 'Calvin-Benson', substrate: 'CO₂ + Light', product: 'Biomass/Bioplastic', captureRate: 92, temp: '30°C', ph: '8.0', tRL: 'TRL 6', description: 'ใช้แสงและ CO₂ ผ่าน Calvin cycle ผลิต biomass และ PHB' },
  { id: 'c3', name: 'Microalgal CO₂ Capture', organism: 'Chlorella vulgaris', pathway: 'Calvin-Benson', substrate: 'CO₂ + Light', product: 'Lipid/Biomass', captureRate: 78, temp: '25-30°C', ph: '7.0', tRL: 'TRL 7', description: 'สาหล่าขนาดเล็กจับ CO₂ ผ่าน光合作用 สะสม lipid สำหรับ biodiesel' },
  { id: 'c4', name: 'Formate Production from CO₂', organism: 'Methylobacterium extorquens', pathway: 'Serpentine', substrate: 'CO₂ + H₂', product: 'Formate', captureRate: 70, temp: '30°C', ph: '7.0', tRL: 'TRL 4', description: 'ตรึง CO₂ เป็นฟอร์เมต ใช้เป็น intermediate ใน C1 metabolism' },
  { id: 'c5', name: 'Microbial Electrosynthesis', organism: 'Sporomusa ovata', pathway: 'Electro-fermentation', substrate: 'CO₂ + e⁻', product: 'Acetate', captureRate: 65, temp: '30°C', ph: '6.5', tRL: 'TRL 4', description: 'ใช้ไฟฟ้าเป็นแหล่งพลังงานตรึง CO₂ เป็นอะซีเตต โดยตรง' },
];

function generateCCUData(days: number = 30) {
  const data = [];
  for (let d = 0; d <= days; d++) {
    const growth = 1 - Math.exp(-0.1 * d);
    data.push({
      day: d,
      co2Captured: +(growth * 5.2 + Math.random() * 0.3).toFixed(2),
      biomassProd: +(growth * 1.8 + Math.random() * 0.2).toFixed(2),
      productYield: +(growth * 2.1 + Math.random() * 0.15).toFixed(2),
      energyInput: +(3.5 + Math.random() * 0.3).toFixed(1),
      efficiency: +(growth * 85 + Math.random() * 3).toFixed(1),
    });
  }
  return data;
}

// 4. Waste to Value
const wasteProcesses = [
  { id: 'w1', name: 'Anaerobic Digestion (AD)', input: 'Organic Waste', output: 'Biogas (CH₄+CO₂)', efficiency: 75, co2eSaved: 3.2, scale: 'Industrial', technology: 'Upflow Anaerobic Sludge Blanket (UASB)', description: 'ย่อยสลายของเสียอินทรีย์ในสภาวะไร้ออกซิเจน ผลิตไบโอก๊าซ (60-70% CH₄)' },
  { id: 'w2', name: 'Gas Fermentation', input: 'Syngas/CO₂', output: 'Ethanol/Acetate', efficiency: 65, co2eSaved: 4.5, scale: 'Pilot', technology: 'LanzaTech Gas Fermentation', description: 'ใช้ acetogenic bacteria เปลี่ยน CO/CO₂ เป็นเอทานอลและสารเคมี' },
  { id: 'w3', name: 'Composting (Aerobic)', input: 'Green Waste', output: 'Compost/CO₂', efficiency: 60, co2eSaved: 1.8, scale: 'Community', technology: 'Windrow Composting', description: 'ย่อยสลายของเสียพืชแบบมีออกซิเจน ผลิตปุ๋ยหมัก ลดการปล่อยมีเทนจาก landfill' },
  { id: 'w4', name: 'Nutrient Recovery (Struvite)', input: 'Wastewater', output: 'Struvite (MgNH₄PO₄)', efficiency: 80, co2eSaved: 1.2, scale: 'Industrial', technology: 'Struvite Precipitation', description: 'กู้คืนไนโตรเจนและฟอสฟอรัสจากน้ำเสียเป็นปุ๋ย struvite' },
  { id: 'w5', name: 'Dark Fermentation', input: 'Organic Waste', output: 'H₂ + Volatile Fatty Acids', efficiency: 45, co2eSaved: 2.8, scale: 'Lab', technology: 'Batch Fermentation', description: 'ผลิต H₂ จากของเสียอินทรีย์โดยไม่ต้องใช้แสง ผลพลอยได้เป็น VFA' },
];

// 5. Bioremediation
const bioremediationProcesses = [
  { id: 'b1', name: 'Phytoremediation', type: 'Plant-based', pollutant: 'Heavy Metals', organism: 'Helianthus annuus (ทานตะวัน)', mechanism: 'Phytoextraction', efficiency: 65, timeDays: 90, co2Sequestered: 2.5, description: 'ใช้พืชดูดซับโลหะหนักจากดิน พืชเก็บสารพิษในเนื้อเยื่อแล้วนำไปกำจัด' },
  { id: 'b2', name: 'Mycoremediation', type: 'Fungal', pollutant: 'Hydrocarbons/PAHs', organism: 'Pleurotus ostreatus (เห็ดนางรม)', mechanism: 'Lignin peroxidase', efficiency: 78, timeDays: 45, co2Sequestered: 1.2, description: 'ใช้เอนไซม์ lignin peroxidase ย่อยสลายสารไฮโดรคาร์บอนและ PAHs' },
  { id: 'b3', name: 'Bioaugmentation', type: 'Microbial', pollutant: 'Organic Pollutants', organism: 'Pseudomonas putida', mechanism: 'Catabolic plasmids', efficiency: 82, timeDays: 30, co2Sequestered: 0.8, description: 'เติมจุลินทรีย์ที่มีความสามารถย่อยสลายสารพิษเฉพาะชนิดลงในดิน/น้ำ' },
  { id: 'b4', name: 'Biostimulation', type: 'Nutrient-enhanced', pollutant: 'Oil Spills', organism: 'Indigenous microbes', mechanism: 'Nutrient addition', efficiency: 70, timeDays: 60, co2Sequestered: 0.5, description: 'เติมสารอาหาร (N, P) เร่งการเจริญของจุลินทรีย์พื้นบ้านให้ย่อยสลายน้ำมัน' },
  { id: 'b5', name: 'Methanotrophic Biocover', type: 'Bio-cover', pollutant: 'CH₄ from Landfill', organism: 'Methylocystis sp.', mechanism: 'CH₄ Oxidation', efficiency: 85, timeDays: 14, co2Sequestered: 25, description: 'ใช้ methanotrophs เป็นชั้นปิดทับหลุมฝังกลบ ย่อยสลายมีเทนที่รั่วออกมา' },
  { id: 'b6', name: 'Constructed Wetland', type: 'Eco-engineered', pollutant: 'Nutrients/BOD', organism: 'Mixed consortium', mechanism: 'Rhizodegradation', efficiency: 72, timeDays: 30, co2Sequestered: 3.8, description: 'ระบบพื้นที่ชุ่มน้ำสร้างใหม่ ใช้พืชและจุลินทรีย์บำบัดน้ำเสีย' },
];

function generateBioremediationData(days: number = 60) {
  const data = [];
  for (let d = 0; d <= days; d += 3) {
    const decay = Math.exp(-0.035 * d);
    data.push({
      day: d,
      pollutantConc: +(100 * decay + Math.random() * 2).toFixed(1),
      microbialGrowth: +(100 * (1 - decay) + Math.random() * 3).toFixed(1),
      co2Evolved: +(5 * (1 - decay) * 10 + Math.random() * 2).toFixed(1),
      ph: +(7.0 + Math.sin(d / 10) * 0.2).toFixed(2),
      temperature: +(28 + Math.sin(d / 7) * 2).toFixed(1),
    });
  }
  return data;
}

// Calculator constants
const GWP_CH4 = 25; // CO₂ equivalent
const GWP_N2O = 298;

// ============================================================
// COMPONENT
// ============================================================

type BioTab = 'overview' | 'methanotrophs' | 'synmec' | 'ccu' | 'waste' | 'bioremediation' | 'calculator' | 'monitoring' | 'ailab';

interface BioCarbonViewProps {
  initialTab?: BioTab;
}

export default function BioCarbonView({ initialTab = 'overview' }: BioCarbonViewProps) {
  const [activeTab, setActiveTab] = useState<BioTab>(initialTab);
  const [standardMode, setStandardMode] = useState<'international' | 'tgo'>('tgo');
  const [simRunning, setSimRunning] = useState(false);
  const [simTime, setSimTime] = useState(0);
  const [simInterval, setSimInterval] = useState<NodeJS.Timeout | null>(null);

  // Methanotroph simulation
  const [methaneData, setMethaneData] = useState(generateMethaneOxidationData(0));
  const [selectedMethanotroph, setSelectedMethanotroph] = useState(methanotrophTypes[0]);

  // SynMEC simulation
  const [synmecData, setSynmecData] = useState(generateSynMECData(0));

  // CCU simulation
  const [ccuData, setCcuData] = useState(generateCCUData(0));

  // Bioremediation simulation
  const [bioremediationData, setBioremediationData] = useState(generateBioremediationData(0));

  // Calculator state
  const [calcInputs, setCalcInputs] = useState({
    ch4Emission: 100, // ton/year
    area: 1000, // ha
    efficiency: 85, // %
    temp: 35, // °C
    retentionTime: 20, // days
  });

  // Simulation control
  const startSimulation = useCallback(() => {
    if (simRunning) return;
    setSimRunning(true);
    setSimTime(0);

    const interval = setInterval(() => {
      setSimTime((prev) => {
        const next = prev + 2;
        if (next >= 48) {
          setSimRunning(false);
          return 48;
        }
        return next;
      });
    }, 200);

    setSimInterval(interval);
  }, [simRunning]);

  const pauseSimulation = useCallback(() => {
    setSimRunning(false);
    if (simInterval) clearInterval(simInterval);
  }, [simInterval]);

  const resetSimulation = useCallback(() => {
    setSimRunning(false);
    if (simInterval) clearInterval(simInterval);
    setSimTime(0);
  }, [simInterval]);

  // Update simulation data based on time
  useEffect(() => {
    setMethaneData(generateMethaneOxidationData(simTime));
    setSynmecData(generateSynMECData(Math.round(simTime * 30 / 48)));
    setCcuData(generateCCUData(Math.round(simTime * 30 / 48)));
    setBioremediationData(generateBioremediationData(Math.round(simTime * 60 / 48)));
  }, [simTime]);

  // Calculator results
  const calcResults = useMemo(() => {
    const ch4Captured = calcInputs.ch4Emission * calcInputs.efficiency / 100;
    const co2eAvoided = ch4Captured * GWP_CH4;
    const biomassProduced = ch4Captured * selectedMethanotroph.biomassYield;
    const lipidProduced = biomassProduced * selectedMethanotroph.lipidContent / 100;
    const areaRai = calcInputs.area * 6.25;
    return {
      ch4Captured: ch4Captured.toFixed(1),
      co2eAvoided: co2eAvoided.toFixed(0),
      biomassProduced: biomassProduced.toFixed(1),
      lipidProduced: lipidProduced.toFixed(1),
      areaRai: areaRai.toFixed(0),
      creditsTVER: (co2eAvoided * 0.9).toFixed(0), // 90% of avoided emissions
    };
  }, [calcInputs, selectedMethanotroph]);

  // Format number
  const fmt = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 1 });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <FlaskConical className="h-6 w-6 text-emerald-600" />
            BioCarbon Simulation Lab
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            จำลองข้อมูลจุลินทรีย์และกระบวนการทางชีวภาพที่เกี่ยวข้องกับคาร์บอน — Based on BIOTEC-NSTDA Research
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5 text-[10px]">
            <button
              onClick={() => setStandardMode('tgo')}
              className={`px-2.5 py-1 rounded-md transition-all ${standardMode === 'tgo' ? 'bg-amber-100 text-amber-800 font-bold shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              🇹🇭 TGO
            </button>
            <button
              onClick={() => setStandardMode('international')}
              className={`px-2.5 py-1 rounded-md transition-all ${standardMode === 'international' ? 'bg-blue-100 text-blue-800 font-bold shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              🌐 Int&apos;l
            </button>
          </div>
          {/* Simulation control */}
          <div className="flex items-center gap-1">
            {!simRunning ? (
              <Button size="sm" onClick={startSimulation} className="gap-1 bg-emerald-600 hover:bg-emerald-700">
                <Play className="h-3.5 w-3.5" /> Run Sim
              </Button>
            ) : (
              <Button size="sm" onClick={pauseSimulation} variant="outline" className="gap-1">
                <Pause className="h-3.5 w-3.5" /> Pause
              </Button>
            )}
            <Button size="sm" onClick={resetSimulation} variant="ghost" className="gap-1">
              <RotateCcw className="h-3.5 w-3.5" /> Reset
            </Button>
          </div>
        </div>
      </div>

      {/* Simulation Progress */}
      {(simRunning || simTime > 0) && (
        <Card className="border-emerald-200 bg-emerald-50/50">
          <CardContent className="py-3 px-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Activity className={`h-4 w-4 ${simRunning ? 'text-emerald-600 animate-pulse' : 'text-slate-500'}`} />
                <span className="text-sm font-medium">
                  {simRunning ? 'Simulation Running...' : simTime >= 48 ? 'Simulation Complete' : 'Simulation Paused'}
                </span>
              </div>
              <div className="flex-1">
                <Progress value={(simTime / 48) * 100} className="h-2" />
              </div>
              <span className="text-sm text-muted-foreground font-mono">
                {simTime}/48 hrs
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as BioTab)}>
        <TabsList className="flex-wrap h-auto gap-1 bg-muted/50 p-1">
          <TabsTrigger value="overview" className="text-xs gap-1"><Microscope className="h-3.5 w-3.5" /> Overview</TabsTrigger>
          <TabsTrigger value="methanotrophs" className="text-xs gap-1"><Flame className="h-3.5 w-3.5" /> Methanotrophs</TabsTrigger>
          <TabsTrigger value="synmec" className="text-xs gap-1"><Atom className="h-3.5 w-3.5" /> SynMEC</TabsTrigger>
          <TabsTrigger value="ccu" className="text-xs gap-1"><Leaf className="h-3.5 w-3.5" /> CO₂ Capture</TabsTrigger>
          <TabsTrigger value="waste" className="text-xs gap-1"><Recycle className="h-3.5 w-3.5" /> Waste→Value</TabsTrigger>
          <TabsTrigger value="bioremediation" className="text-xs gap-1"><Droplets className="h-3.5 w-3.5" /> Bioremediation</TabsTrigger>
          <TabsTrigger value="calculator" className="text-xs gap-1"><Calculator className="h-3.5 w-3.5" /> Calculator</TabsTrigger>
          <TabsTrigger value="monitoring" className="text-xs gap-1"><Info className="h-3.5 w-3.5" /> Monitoring</TabsTrigger>
          <TabsTrigger value="ailab" className="text-xs gap-1"><Bot className="h-3.5 w-3.5" /> AI Lab</TabsTrigger>
        </TabsList>

        {/* ============ OVERVIEW TAB ============ */}
        <TabsContent value="overview" className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {[
              { title: 'CH₄ Oxidation Rate', value: `${fmt(12.5)} g CH₄/g biomass/day`, change: '+15%', icon: Flame, color: 'bg-orange-50 text-orange-600' },
              { title: 'CO₂ Captured', value: `${fmt(5.2)} tCO₂e/ha/yr`, change: '+22%', icon: Leaf, color: 'bg-emerald-50 text-emerald-600' },
              { title: 'Biogas Production', value: `${fmt(35)} m³/ton VS`, change: '+8%', icon: Zap, color: 'bg-amber-50 text-amber-600' },
              { title: 'Remediation Efficiency', value: `${fmt(82)}%`, change: '+5%', icon: Droplets, color: 'bg-blue-50 text-blue-600' },
            ].map((kpi) => (
              <Card key={kpi.title}>
                <CardContent className="p-4 lg:p-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">{kpi.title}</p>
                      <p className="text-2xl font-bold tracking-tight">{kpi.value}</p>
                      <div className="flex items-center gap-1 text-xs">
                        <TrendingUp className="h-3 w-3 text-emerald-600" />
                        <span className="text-emerald-600">{kpi.change}</span>
                        <span className="text-muted-foreground">vs baseline</span>
                      </div>
                    </div>
                    <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${kpi.color}`}>
                      <kpi.icon className="h-5 w-5" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Bio Pathway Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Beaker className="h-4 w-4 text-emerald-600" />
                  Carbon Bio-Pathway Map
                </CardTitle>
                <CardDescription>กระบวนการทางชีวภาพที่เกี่ยวข้องกับวัฏจักรคาร์บอน</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { from: 'CH₄ (Methane)', via: 'Methanotrophs (pMMO/sMMO)', to: 'Biomass + CO₂', color: 'bg-orange-100 border-orange-300' },
                    { from: 'CO₂ + H₂', via: 'Acetogens (Wood-Ljungdahl)', to: 'Acetate/Ethanol', color: 'bg-emerald-100 border-emerald-300' },
                    { from: 'CO₂ + Light', via: 'Cyanobacteria/Microalgae', to: 'Biomass/Lipid/O₂', color: 'bg-blue-100 border-blue-300' },
                    { from: 'Organic Waste', via: 'Anaerobic Digestion', to: 'Biogas (CH₄+CO₂)', color: 'bg-amber-100 border-amber-300' },
                    { from: 'CO₂ + e⁻', via: 'Electrotrophs (MES)', to: 'Acetate/Chemicals', color: 'bg-purple-100 border-purple-300' },
                    { from: 'CH₄ (Landfill)', via: 'Methanotrophic Biocover', to: 'CO₂ + Biomass', color: 'bg-red-100 border-red-300' },
                  ].map((pathway, i) => (
                    <div key={i} className={`flex items-center gap-2 p-2.5 rounded-lg border ${pathway.color} text-xs`}>
                      <span className="font-semibold min-w-[100px]">{pathway.from}</span>
                      <ChevronRight className="h-3 w-3 shrink-0" />
                      <span className="text-muted-foreground flex-1">{pathway.via}</span>
                      <ChevronRight className="h-3 w-3 shrink-0" />
                      <span className="font-semibold min-w-[100px] text-right">{pathway.to}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-emerald-600" />
                  Technology Readiness Level
                </CardTitle>
                <CardDescription>ระดับความพร้อมของเทคโนโลยีชีวภาพ</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={[
                    { name: 'Methanotrophs', trl: 7, co2e: 312 },
                    { name: 'SynMEC/AD', trl: 8, co2e: 220 },
                    { name: 'CCU-Gas Ferm.', trl: 7, co2e: 450 },
                    { name: 'CCU-Algae', trl: 6, co2e: 180 },
                    { name: 'Bioremediation', trl: 7, co2e: 85 },
                    { name: 'MES', trl: 4, co2e: 65 },
                  ]} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" domain={[0, 9]} label={{ value: 'TRL', position: 'bottom', style: { fontSize: 11 } }} />
                    <YAxis type="category" dataKey="name" width={110} style={{ fontSize: 11 }} />
                    <Tooltip formatter={(v: number, name: string) => [v, name === 'trl' ? 'TRL Level' : 'tCO₂e/ha/yr']} />
                    <Bar dataKey="trl" fill="#10b981" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Microorganism Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">จุลินทรีย์หลักที่เกี่ยวข้องกับคาร์บอน</CardTitle>
              <CardDescription>Key microorganisms in carbon cycling and their roles</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {[
                  { name: 'Methanotrophs', role: 'CH₄ Oxidation → Biomass', color: 'border-orange-300 bg-orange-50', count: 6, icon: Flame },
                  { name: 'Acetogens', role: 'CO₂ → Acetate/Ethanol', color: 'border-emerald-300 bg-emerald-50', count: 3, icon: Leaf },
                  { name: 'Cyanobacteria', role: 'CO₂ → Biomass/O₂', color: 'border-blue-300 bg-blue-50', count: 4, icon: Microscope },
                  { name: 'Methanogens', role: 'H₂+CO₂ → CH₄', color: 'border-purple-300 bg-purple-50', count: 3, icon: Atom },
                  { name: 'Syntrophs', role: 'VFA → H₂+Acetate', color: 'border-amber-300 bg-amber-50', count: 3, icon: Beaker },
                  { name: 'Bioremediators', role: 'Pollutant → CO₂+Biomass', color: 'border-teal-300 bg-teal-50', count: 5, icon: Droplets },
                ].map((org) => (
                  <div key={org.name} className={`flex items-center gap-3 p-3 rounded-lg border ${org.color}`}>
                    <org.icon className="h-5 w-5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold">{org.name}</p>
                      <p className="text-[11px] text-muted-foreground">{org.role}</p>
                    </div>
                    <Badge variant="secondary" className="text-[10px]">{org.count} strains</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============ METHANOTROPHS TAB ============ */}
        <TabsContent value="methanotrophs" className="space-y-6">
          {/* Methanotroph selector */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Bug className="h-4 w-4 text-orange-600" />
                จุลินทรีย์ย่อยสลายมีเทน (Methanotrophs)
              </CardTitle>
              <CardDescription>แบคทีเรียที่ใช้มีเทนเป็นแหล่งคาร์บอนและพลังงาน ผ่านเอนไซม์ methane monooxygenase (MMO)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="md:col-span-1">
                  <Label className="text-xs text-muted-foreground mb-2 block">Select Strain</Label>
                  <Select value={selectedMethanotroph.id} onValueChange={(v) => setSelectedMethanotroph(methanotrophTypes.find(m => m.id === v) || methanotrophTypes[0])}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {methanotrophTypes.map((m) => (
                        <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-2 p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground mb-1">{selectedMethanotroph.type}</p>
                  <p className="text-sm">{selectedMethanotroph.description}</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <Badge variant="secondary" className="text-[10px]">🌡️ {selectedMethanotroph.tempRange}</Badge>
                    <Badge variant="secondary" className="text-[10px]">pH {selectedMethanotroph.pH}</Badge>
                    <Badge variant="secondary" className="text-[10px]">CH₄ Ox: {selectedMethanotroph.ch4OxRate} g/g/day</Badge>
                    <Badge variant="secondary" className="text-[10px]">Lipid: {selectedMethanotroph.lipidContent}%</Badge>
                    <Badge className={`text-[10px] ${selectedMethanotroph.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : selectedMethanotroph.status === 'Lab' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                      {selectedMethanotroph.status}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* All strains comparison table */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="text-left p-2 font-medium">Strain</th>
                      <th className="text-left p-2 font-medium">Type</th>
                      <th className="text-right p-2 font-medium">CH₄ Ox Rate</th>
                      <th className="text-right p-2 font-medium">Biomass Yield</th>
                      <th className="text-right p-2 font-medium">Lipid %</th>
                      <th className="text-center p-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {methanotrophTypes.map((m) => (
                      <tr key={m.id} className={`border-b cursor-pointer hover:bg-muted/30 ${selectedMethanotroph.id === m.id ? 'bg-emerald-50' : ''}`} onClick={() => setSelectedMethanotroph(m)}>
                        <td className="p-2 font-medium">{m.name}</td>
                        <td className="p-2 text-muted-foreground">{m.type.split('(')[0].trim()}</td>
                        <td className="p-2 text-right">{m.ch4OxRate}</td>
                        <td className="p-2 text-right">{m.biomassYield}</td>
                        <td className="p-2 text-right">{m.lipidContent}%</td>
                        <td className="p-2 text-center">
                          <Badge className={`text-[9px] ${m.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : m.status === 'Lab' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>{m.status}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Methane Oxidation Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">CH₄ Oxidation Simulation — {simTime}h</CardTitle>
              <CardDescription>จำลองประสิทธิภาพการย่อยสลายมีเทนของ {selectedMethanotroph.name}</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <ComposedChart data={methaneData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" label={{ value: 'Time (hours)', position: 'bottom', style: { fontSize: 11 } }} />
                  <YAxis yAxisId="left" label={{ value: '% CH₄', angle: -90, position: 'insideLeft', style: { fontSize: 11 } }} />
                  <YAxis yAxisId="right" orientation="right" label={{ value: 'g/L', angle: 90, position: 'insideRight', style: { fontSize: 11 } }} />
                  <Tooltip />
                  <Legend />
                  <Area yAxisId="left" type="monotone" dataKey="efficiency" name="Oxidation Efficiency (%)" fill="#10b98130" stroke="#10b981" strokeWidth={2} />
                  <Line yAxisId="left" type="monotone" dataKey="ch4Inlet" name="CH₄ Inlet (%)" stroke="#f59e0b" strokeWidth={1.5} dot={false} />
                  <Line yAxisId="left" type="monotone" dataKey="ch4Outlet" name="CH₄ Outlet (%)" stroke="#ef4444" strokeWidth={1.5} dot={false} />
                  <Line yAxisId="right" type="monotone" dataKey="biomass" name="Biomass (g/L)" stroke="#3b82f6" strokeWidth={2} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Methanotroph comparison radar */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Strain Comparison (Radar)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={[
                    { metric: 'CH₄ Oxidation', TypeI: 12.5, TypeII: 8.3, Thermophilic: 9.5 },
                    { metric: 'Biomass Yield', TypeI: 0.45, TypeII: 0.35, Thermophilic: 0.38 },
                    { metric: 'Lipid Content', TypeI: 25, TypeII: 42, Thermophilic: 18 },
                    { metric: 'Temp Tolerance', TypeI: 70, TypeII: 55, Thermophilic: 90 },
                    { metric: 'pH Tolerance', TypeI: 60, TypeII: 65, Thermophilic: 60 },
                    { metric: 'Growth Rate', TypeI: 80, TypeII: 60, Thermophilic: 65 },
                  ]}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="metric" style={{ fontSize: 10 }} />
                    <Radar name="Type I" dataKey="TypeI" stroke="#10b981" fill="#10b981" fillOpacity={0.2} />
                    <Radar name="Type II" dataKey="TypeII" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.2} />
                    <Radar name="Thermophilic" dataKey="Thermophilic" stroke="#ef4444" fill="#ef4444" fillOpacity={0.2} />
                    <Legend />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">CO₂ Equivalent Reduction by Strain</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={methanotrophTypes.map(m => ({
                    name: m.name.split(' ')[0] + ' ' + m.name.split(' ')[1]?.[0] + '.',
                    co2e: +(m.ch4OxRate * GWP_CH4 * m.biomassYield).toFixed(0),
                    lipid: m.lipidContent,
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" style={{ fontSize: 10 }} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="co2e" name="tCO₂e/ton biomass/yr" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ============ SynMEC TAB ============ */}
        <TabsContent value="synmec" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Atom className="h-4 w-4 text-purple-600" />
                SynMEC — Syntrophic Methanogenic Consortium
              </CardTitle>
              <CardDescription>กลุ่มจุลินทรีย์ที่ทำงานร่วมกัน (syntrophy) ในการผลิตมีเทนจากสารอินทรีย์ — การควบคุม H₂ partial pressure เป็นกุญแจสำคัญ</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {synmecProcesses.map((p) => (
                  <div key={p.id} className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 text-purple-700 text-xs font-bold shrink-0">
                      {p.id[1].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold">{p.name}</span>
                        <Badge variant="secondary" className="text-[9px]">{p.organism}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mb-1">{p.description}</p>
                      <div className="flex flex-wrap gap-2 text-[10px]">
                        <Badge variant="outline" className="text-[9px]">⬇ {p.substrate}</Badge>
                        <Badge variant="outline" className="text-[9px]">⬆ {p.product}</Badge>
                        <Badge variant="outline" className="text-[9px]">🌡️ {p.temp}</Badge>
                        <Badge variant="outline" className="text-[9px]">pH {p.ph}</Badge>
                        <Badge className="text-[9px] bg-purple-50 text-purple-700">Rate: {p.rate} mmol/L/day</Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* SynMEC time series */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">CH₄ Production & H₂ Partial Pressure</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={synmecData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" label={{ value: 'Day', position: 'bottom', style: { fontSize: 11 } }} />
                    <YAxis yAxisId="left" label={{ value: 'm³ CH₄/kg VS', angle: -90, position: 'insideLeft', style: { fontSize: 10 } }} />
                    <YAxis yAxisId="right" orientation="right" label={{ value: 'atm (×10⁻³)', angle: 90, position: 'insideRight', style: { fontSize: 10 } }} />
                    <Tooltip />
                    <Legend />
                    <Area yAxisId="left" type="monotone" dataKey="ch4Production" name="CH₄ Production" fill="#8b5cf620" stroke="#8b5cf6" strokeWidth={2} />
                    <Line yAxisId="right" type="monotone" dataKey="h2PartialPressure" name="H₂ Partial Pressure" stroke="#ef4444" strokeWidth={2} dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">pH & VS Removal</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={synmecData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" />
                    <YAxis yAxisId="left" domain={[5.5, 8.5]} label={{ value: 'pH', angle: -90, position: 'insideLeft', style: { fontSize: 10 } }} />
                    <YAxis yAxisId="right" orientation="right" domain={[0, 70]} label={{ value: '%', angle: 90, position: 'insideRight', style: { fontSize: 10 } }} />
                    <Tooltip />
                    <Legend />
                    <Line yAxisId="left" type="monotone" dataKey="ph" name="pH" stroke="#3b82f6" strokeWidth={2} />
                    <Area yAxisId="right" type="monotone" dataKey="vsRemoval" name="VS Removal (%)" fill="#10b98120" stroke="#10b981" strokeWidth={1.5} />
                    <Area yAxisId="right" type="monotone" dataKey="codReduction" name="COD Reduction (%)" fill="#f59e0b20" stroke="#f59e0b" strokeWidth={1.5} />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ============ CCU TAB ============ */}
        <TabsContent value="ccu" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Leaf className="h-4 w-4 text-emerald-600" />
                CO₂ Capture & Utilization (CCU) — การจับและใช้ประโยชน์จาก CO₂
              </CardTitle>
              <CardDescription>จุลินทรีย์ที่ตรึง CO₂ ผ่านกระบวนการทางชีวภาพ แปลง CO₂ เป็นผลิตภัณฑ์มีคุณค่า</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {ccuSystems.map((sys) => (
                  <div key={sys.id} className="p-4 rounded-lg border bg-muted/30 space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-semibold">{sys.name}</p>
                        <p className="text-[11px] text-muted-foreground">{sys.organism}</p>
                      </div>
                      <Badge className="text-[9px] bg-emerald-50 text-emerald-700">{sys.tRL}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{sys.description}</p>
                    <div className="flex flex-wrap gap-1.5">
                      <Badge variant="outline" className="text-[9px]">Pathway: {sys.pathway}</Badge>
                      <Badge variant="outline" className="text-[9px]">⬇ {sys.substrate}</Badge>
                      <Badge variant="outline" className="text-[9px]">⬆ {sys.product}</Badge>
                    </div>
                    <div className="flex items-center gap-2 text-[11px]">
                      <span className="text-muted-foreground">Capture Rate:</span>
                      <Progress value={sys.captureRate} className="flex-1 h-1.5" />
                      <span className="font-semibold">{sys.captureRate}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">CO₂ Capture & Product Yield Over Time</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={ccuData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Area type="monotone" dataKey="co2Captured" name="CO₂ Captured (t/ha)" fill="#10b98130" stroke="#10b981" strokeWidth={2} />
                    <Area type="monotone" dataKey="productYield" name="Product Yield (t/ha)" fill="#3b82f630" stroke="#3b82f6" strokeWidth={2} />
                    <Area type="monotone" dataKey="biomassProd" name="Biomass (t/ha)" fill="#f59e0b30" stroke="#f59e0b" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">CCU System Efficiency Comparison</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={ccuSystems.map(s => ({ name: s.name.split(' ').slice(0, 2).join(' '), value: s.captureRate }))} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, value }) => `${name}: ${value}%`}>
                      {ccuSystems.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ============ WASTE → VALUE TAB ============ */}
        <TabsContent value="waste" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Recycle className="h-4 w-4 text-amber-600" />
                Waste to Value — ของเสียสู่มูลค่า
              </CardTitle>
              <CardDescription>เทคโนโลยีชีวภาพแปลงของเสียเป็นผลิตภัณฑ์มูลค่าเพิ่ม ลดการปล่อยก๊าซเรือนกระจก</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {wasteProcesses.map((wp) => (
                  <div key={wp.id} className="flex items-center gap-4 p-3 rounded-lg border hover:bg-muted/30 transition-colors">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-700 text-sm font-bold shrink-0">
                      {wp.output.split(' ')[0][0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold">{wp.name}</span>
                        <Badge variant="secondary" className="text-[9px]">{wp.scale}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mb-1">{wp.description}</p>
                      <div className="flex flex-wrap gap-1.5 text-[10px]">
                        <Badge variant="outline" className="text-[9px]">📥 {wp.input}</Badge>
                        <Badge variant="outline" className="text-[9px]">📤 {wp.output}</Badge>
                        <Badge className="text-[9px] bg-emerald-50 text-emerald-700">CO₂e saved: {wp.co2eSaved} t/yr</Badge>
                        <Badge className="text-[9px] bg-amber-50 text-amber-700">Efficiency: {wp.efficiency}%</Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">CO₂e Savings by Technology</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={wasteProcesses.map(w => ({ name: w.name.split('(')[0].trim(), co2e: w.co2eSaved, efficiency: w.efficiency }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" style={{ fontSize: 9 }} angle={-20} textAnchor="end" height={60} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="co2e" name="tCO₂e saved/yr" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="efficiency" name="Efficiency (%)" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Waste-to-Value Flow</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={wasteProcesses.map(w => ({ name: w.name.split('(')[0].trim(), value: w.co2eSaved }))} cx="50%" cy="50%" outerRadius={90} innerRadius={40} dataKey="value" label={({ name, value }) => `${value} tCO₂e`}>
                      {wasteProcesses.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ============ BIOREMEDIATION TAB ============ */}
        <TabsContent value="bioremediation" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Droplets className="h-4 w-4 text-teal-600" />
                Bioremediation — การบำบัดทางชีวภาพ
              </CardTitle>
              <CardDescription>ใช้จุลินทรีย์ พืช และเชื้อราบำบัดสารพิษในดินและน้ำ พร้อมตรึงคาร์บอน</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {bioremediationProcesses.map((bp) => (
                  <div key={bp.id} className="p-4 rounded-lg border space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-semibold">{bp.name}</p>
                        <p className="text-[11px] text-muted-foreground">{bp.type}</p>
                      </div>
                      <Badge variant="secondary" className="text-[9px]">{bp.efficiency}%</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{bp.description}</p>
                    <div className="space-y-1.5 text-[11px]">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Pollutant:</span>
                        <span className="font-medium">{bp.pollutant}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Organism:</span>
                        <span className="font-medium text-xs">{bp.organism}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Time:</span>
                        <span className="font-medium">{bp.timeDays} days</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">CO₂ sequestered:</span>
                        <span className="font-medium text-emerald-600">{bp.co2Sequestered} tCO₂e/ha</span>
                      </div>
                    </div>
                    <Progress value={bp.efficiency} className="h-1.5" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Bioremediation Performance Simulation</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <ComposedChart data={bioremediationData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" label={{ value: 'Days', position: 'bottom', style: { fontSize: 11 } }} />
                  <YAxis yAxisId="left" label={{ value: 'Concentration', angle: -90, position: 'insideLeft', style: { fontSize: 10 } }} />
                  <YAxis yAxisId="right" orientation="right" domain={[0, 100]} label={{ value: '% Growth', angle: 90, position: 'insideRight', style: { fontSize: 10 } }} />
                  <Tooltip />
                  <Legend />
                  <Area yAxisId="left" type="monotone" dataKey="pollutantConc" name="Pollutant Conc. (%)" fill="#ef444420" stroke="#ef4444" strokeWidth={2} />
                  <Line yAxisId="right" type="monotone" dataKey="microbialGrowth" name="Microbial Growth (%)" stroke="#10b981" strokeWidth={2} dot={false} />
                  <Line yAxisId="left" type="monotone" dataKey="co2Evolved" name="CO₂ Evolved (mol)" stroke="#f59e0b" strokeWidth={1.5} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============ CALCULATOR TAB ============ */}
        <TabsContent value="calculator" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Calculator className="h-4 w-4 text-emerald-600" />
                  BioCarbon Credit Calculator
                </CardTitle>
                <CardDescription>คำนวณ Carbon Credit จากกระบวนการทางชีวภาพ — T-VER Standard</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs">CH₄ Emission (ton/year)</Label>
                  <Input type="number" value={calcInputs.ch4Emission} onChange={(e) => setCalcInputs(prev => ({ ...prev, ch4Emission: +e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Area ({standardMode === 'tgo' ? 'ไร่' : 'ha'})</Label>
                  <Input type="number" value={standardMode === 'tgo' ? calcInputs.area * 6.25 : calcInputs.area} onChange={(e) => setCalcInputs(prev => ({ ...prev, area: standardMode === 'tgo' ? +e.target.value / 6.25 : +e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Oxidation Efficiency (%) — {calcInputs.efficiency}%</Label>
                  <Slider value={[calcInputs.efficiency]} onValueChange={([v]) => setCalcInputs(prev => ({ ...prev, efficiency: v }))} min={10} max={99} step={1} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Temperature (°C) — {calcInputs.temp}°C</Label>
                  <Slider value={[calcInputs.temp]} onValueChange={([v]) => setCalcInputs(prev => ({ ...prev, temp: v }))} min={15} max={65} step={1} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Methanotroph Strain</Label>
                  <Select value={selectedMethanotroph.id} onValueChange={(v) => setSelectedMethanotroph(methanotrophTypes.find(m => m.id === v) || methanotrophTypes[0])}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {methanotrophTypes.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Calculation Results</CardTitle>
                <CardDescription>ผลการคำนวณตาม T-VER Methodology</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'CH₄ Captured', value: `${calcResults.ch4Captured} ton/yr`, color: 'text-orange-600' },
                    { label: 'CO₂e Avoided', value: `${Number(calcResults.co2eAvoided).toLocaleString()} tCO₂e/yr`, color: 'text-emerald-600' },
                    { label: 'Biomass Produced', value: `${calcResults.biomassProduced} ton/yr`, color: 'text-blue-600' },
                    { label: 'Lipid Produced', value: `${calcResults.lipidProduced} ton/yr`, color: 'text-amber-600' },
                    { label: 'T-VER Credits', value: `${Number(calcResults.creditsTVER).toLocaleString()} tCO₂e`, color: 'text-emerald-700' },
                    { label: 'Area', value: standardMode === 'tgo' ? `${calcResults.areaRai} ไร่` : `${calcInputs.area} ha`, color: 'text-slate-700' },
                  ].map((r) => (
                    <div key={r.label} className="p-3 rounded-lg bg-muted/50">
                      <p className="text-[10px] text-muted-foreground">{r.label}</p>
                      <p className={`text-lg font-bold ${r.color}`}>{r.value}</p>
                    </div>
                  ))}
                </div>

                <Separator />

                <div className="p-3 rounded-lg border border-emerald-200 bg-emerald-50/50">
                  <p className="text-xs font-semibold text-emerald-700 mb-2">GWP Conversion Factors</p>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between"><span className="text-muted-foreground">CH₄ GWP (AR5)</span><span className="font-mono font-semibold">×{GWP_CH4}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">N₂O GWP (AR5)</span><span className="font-mono font-semibold">×{GWP_N2O}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">T-VER Discount</span><span className="font-mono font-semibold">10%</span></div>
                  </div>
                </div>

                <div className="p-3 rounded-lg border border-amber-200 bg-amber-50/50">
                  <p className="text-xs font-semibold text-amber-700 mb-1">T-VER Methodology Note</p>
                  <p className="text-[11px] text-amber-800">
                    การคำนวณนี้อ้างอิง T-VER-P-TOOL_01 (Tool for calculation of emission reductions from CH₄ capture and destruction)
                    โดยใช้ GWP ตาม IPCC AR5 และหักส่วนลด 10% สำหรับความไม่แน่นอน
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ============ MONITORING PROTOCOL TAB ============ */}
        <TabsContent value="monitoring" className="space-y-6">
          {/* T-VER Methodology Reference */}
          <Card className="border-amber-200 bg-amber-50/30">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                แนวทางการเก็บข้อมูล T-VER (Monitoring Protocol)
              </CardTitle>
              <CardDescription>ข้อกำหนดการติดตาม วัด รายงาน (MRV) ตามมาตรฐาน TGO T-VER สำหรับโครงการ BioCarbon</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* T-VER Standard Reference */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
                  <h4 className="text-sm font-bold text-amber-800 mb-2">🇹🇭 มาตรฐาน T-VER (ไทย)</h4>
                  <div className="space-y-1.5 text-xs text-amber-700">
                    <p><strong>T-VER-AG-001:</strong> การจัดการขยะมีชีวิต (Methane avoidance)</p>
                    <p><strong>T-VER-WT-001:</strong> บำบัดน้ำเสีย (Wastewater treatment)</p>
                    <p><strong>T-VER-P-CC-001:</strong> การกักเก็บคาร์บอนผ่านไบโอชาร์</p>
                    <p><strong>T-VER-P-RE-001:</strong> พลังงานทดแทน (Renewable energy)</p>
                    <Separator className="my-2 bg-amber-200" />
                    <p>CH₄ GWP = 25 (IPCC AR4)</p>
                    <p>หัก uncertainty: 10% (โครงการ &lt;2 ปี), 5% (≥2 ปี)</p>
                    <p>หน่วย: tCO₂e, พื้นที่: ไร่ (1 ไร่ = 0.16 ha)</p>
                  </div>
                </div>
                <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
                  <h4 className="text-sm font-bold text-blue-800 mb-2">🌐 International Standards</h4>
                  <div className="space-y-1.5 text-xs text-blue-700">
                    <p><strong>IPCC 2006 GL Vol. 5:</strong> Waste treatment</p>
                    <p><strong>CDM AMS-III.H:</strong> Methane recovery in waste</p>
                    <p><strong>CDM ACM-0014:</strong> Avoidance of methane</p>
                    <p><strong>Verra VCS VM-0041:</strong> CCU methodology</p>
                    <Separator className="my-2 bg-blue-200" />
                    <p>CH₄ GWP = 28 (IPCC AR5)</p>
                    <p>Uncertainty: Project-specific</p>
                    <p>Units: tCO₂e, ha</p>
                  </div>
                </div>
              </div>

              {/* Monitoring Requirements by Bio Type */}
              <h4 className="text-sm font-semibold mt-4">📋 ข้อกำหนดการติดตามตามประเภทโครงการ</h4>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {[
                  {
                    type: 'Methanotrophs (จุลินทรีย์ย่อยสลายมีเทน)',
                    tver: 'T-VER-AG-001',
                    measurements: [
                      'วัด CH₄ inlet/outlet ด้วย FID หรือ GC — รายวัน',
                      'บันทึกอุณหภูมิและ pH ของไบโอฟิลเตอร์ — ต่อเนื่อง',
                      'วัดอัตราการไหลของก๊าซ (flow rate) — รายวัน',
                      'นับ CFU ของ methanotrophs — รายสัปดาห์',
                      'ส่งตัวอย่างควบคุม (QA/QC) — รายเดือน',
                      'วิเคราะห์ชนิดของจุลินทรีย์ (16S rRNA) — รายไตรมาส',
                    ],
                    frequency: 'รายเดือน → รายปี',
                  },
                  {
                    type: 'SynMEC (สหชีวภาพผลิตมีเทน)',
                    tver: 'T-VER-WT-001',
                    measurements: [
                      'วัด H₂ partial pressure ด้วย GC — รายสัปดาห์',
                      'วิเคราะห์ VFA (Volatile Fatty Acids) — รายสัปดาห์',
                      'บันทึก biogas production และส่วนผสม — รายวัน',
                      'วัด COD/BOD น้ำเสียเข้า/ออก — รายสัปดาห์',
                      'ตรวจ pH/อุณหภูมิ/VS — ต่อเนื่อง',
                      'คำนวณ mass balance — รายเดือน',
                    ],
                    frequency: 'รายเดือน → รายปี',
                  },
                  {
                    type: 'CCU (การดักจับและใช้ประโยชน์ CO₂)',
                    tver: 'T-VER-P-RE-001 (emerging)',
                    measurements: [
                      'วัด CO₂ inlet/outlet ด้วย NDIR — รายวัน',
                      'บันทึก flow rate ของก๊าซเข้า — รายวัน',
                      'วิเคราะห์ผลิตภัณฑ์ (acetate, ethanol, biomass) — รายสัปดาห์',
                      'ตรวจสอบ mass balance ของคาร์บอน — รายเดือน',
                      'วัดประสิทธิภาพจับ CO₂ — รายสัปดาห์',
                      'บันทึก TRL และ operational parameters — รายเดือน',
                    ],
                    frequency: 'รายเดือน → รายปี',
                  },
                  {
                    type: 'Waste-to-Value (เปลี่ยนของเสียเป็นผลิตภัณฑ์)',
                    tver: 'T-VER-AG-001',
                    measurements: [
                      'ชั่งน้ำหนักของเสียเข้า — รายวัน',
                      'วัดไบโอก๊าซด้วย flow meter — รายวัน',
                      'วิเคราะห์ผลิตภัณฑ์ — รายสัปดาห์',
                      'ตรวจสอบ mass balance — รายเดือน',
                      'วิเคราะห์ส่วนผสม CH₄/CO₂ ในไบโอก๊าซ — รายวัน',
                      'วัดอุณหภูมิกระบวนการ — ต่อเนื่อง',
                    ],
                    frequency: 'รายเดือน → รายปี',
                  },
                  {
                    type: 'Bioremediation (การบำบัดทางชีวภาพ)',
                    tver: 'T-VER-WT-001',
                    measurements: [
                      'วัดสารพิษก่อน/หลังบำบัด — รายสัปดาห์',
                      'บันทึกจุลินทรีย์ CFU — รายสัปดาห์',
                      'วิเคราะห์คุณภาพน้ำ (BOD/COD/N/P) — รายเดือน',
                      'วัดอัตราการย่อยสลาย — รายสัปดาห์',
                      'บันทึกสภาพแวดล้อม (temp/pH/DO) — ต่อเนื่อง',
                      'ตรวจสอบประสิทธิภาพรวม — รายเดือน',
                    ],
                    frequency: 'รายเดือน → รายปี',
                  },
                ].map((proto) => (
                  <Card key={proto.type} className="shadow-none">
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-semibold">{proto.type}</p>
                        <Badge className="bg-amber-100 text-amber-800 text-[9px]">{proto.tver}</Badge>
                      </div>
                      <ul className="space-y-1">
                        {proto.measurements.map((m, i) => (
                          <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                            <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0 mt-0.5" />
                            <span>{m}</span>
                          </li>
                        ))}
                      </ul>
                      <p className="text-[10px] text-muted-foreground mt-1">ความถี่รายงาน: {proto.frequency}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Calculation Methodology */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Calculator className="h-4 w-4 text-emerald-600" />
                ระเบียบวิธีการคำนวณ (Calculation Methodology)
              </CardTitle>
              <CardDescription>สูตรคำนวณเครดิตคาร์บอนตามมาตรฐาน T-VER</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* T-VER Formulas */}
                <div className="space-y-3">
                  <h5 className="text-xs font-bold text-amber-800">🇹🇭 T-VER (GWP = 25, AR4)</h5>
                  {[
                    { name: 'Methanotrophs', formula: 'ER = CH₄_avoided × 25 × (1 - unc.)', detail: 'unc. = 10% (<2yr), 5% (≥2yr)' },
                    { name: 'SynMEC/AD', formula: 'ER = VS × yield × 0.65 × 25 × (1-unc.)', detail: '0.65 = CH₄ fraction in biogas' },
                    { name: 'CCU (CO₂)', formula: 'ER = CO₂_captured × (1 - unc.)', detail: 'Direct CO₂, no GWP multiplication' },
                    { name: 'Waste-to-Value', formula: 'ER = Waste × 365 × MCF × eff × 25 × (1-unc.)', detail: 'MCF = 0.05 (managed waste)' },
                    { name: 'Bioremediation', formula: 'ER = Pollutant × 365 × EF × eff × 25 × (1-unc.)', detail: 'EF = 0.001 ton CH₄/m³' },
                  ].map((item) => (
                    <div key={item.name} className="rounded-lg bg-amber-50/50 border border-amber-100 p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold">{item.name}</span>
                      </div>
                      <p className="text-[11px] font-mono text-amber-900">{item.formula}</p>
                      <p className="text-[10px] text-amber-600 mt-0.5">{item.detail}</p>
                    </div>
                  ))}
                </div>

                {/* IPCC Formulas */}
                <div className="space-y-3">
                  <h5 className="text-xs font-bold text-blue-800">🌐 International/IPCC (GWP = 28, AR5)</h5>
                  {[
                    { name: 'Methanotrophs (CDM AMS-III.H)', formula: 'ER = CH₄_avoided × 28', detail: 'Tool: CDM Methodological Tool 11' },
                    { name: 'SynMEC (CDM ACM-0014)', formula: 'ER = BE - PE', detail: 'BE = Baseline, PE = Project emissions' },
                    { name: 'CCU (VCS VM-0041)', formula: 'ER = CO₂_captured × CF', detail: 'CF = Capture factor' },
                    { name: 'Waste (CDM AMS-III.F)', formula: 'ER = CH₄_avoided × 28 - PE', detail: 'PE = Project + leakage emissions' },
                    { name: 'Bioremediation', formula: 'ER = (BE - PE) × GWP', detail: 'Baseline - Project approach' },
                  ].map((item) => (
                    <div key={item.name} className="rounded-lg bg-blue-50/50 border border-blue-100 p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold">{item.name}</span>
                      </div>
                      <p className="text-[11px] font-mono text-blue-900">{item.formula}</p>
                      <p className="text-[10px] text-blue-600 mt-0.5">{item.detail}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* QA/QC */}
              <div className="mt-4 pt-3 border-t">
                <h5 className="text-sm font-semibold mb-2">🔬 การควบคุมคุณภาพ (QA/QC)</h5>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {[
                    { title: 'Data Quality', items: ['Calibrate instruments monthly', 'Duplicate samples (10%)', 'Use certified reference materials', 'Chain of custody documentation'] },
                    { title: 'Verification', items: ['Third-party validation (VVB)', 'Cross-check with IPCC defaults', 'Statistical uncertainty analysis', 'Annual third-party audit'] },
                    { title: 'Documentation', items: ['Monitoring reports per T-VER', 'Data management system (DMS)', 'Archived raw data ≥ 2 years', 'Transparent calculation sheets'] },
                  ].map((qa) => (
                    <div key={qa.title} className="rounded-lg border p-3 bg-slate-50">
                      <p className="text-xs font-semibold mb-2">{qa.title}</p>
                      <ul className="space-y-1">
                        {qa.items.map((item, i) => (
                          <li key={i} className="text-[10px] text-muted-foreground flex items-start gap-1">
                            <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0 mt-0.5" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============ AI LAB TAB ============ */}
        <TabsContent value="ailab" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Bot className="h-4 w-4 text-emerald-600" />
                AI Bio Lab Assistant
              </CardTitle>
              <CardDescription>ใช้ AI วิเคราะห์ข้อมูลจุลินทรีย์และกระบวนการทางชีวภาพที่เกี่ยวข้องกับคาร์บอน</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[
                  { title: '🔬 Strain Analysis', desc: 'วิเคราะห์สายพันธุ์จุลินทรีย์และประสิทธิภาพ', prompt: 'วิเคราะห์ methanotroph strain ที่เหมาะสมสำหรับ Thailand T-VER carbon credit' },
                  { title: '📊 Process Optimization', desc: 'เพิ่มประสิทธิภาพกระบวนการบำบัด', prompt: 'แนะนำวิธีเพิ่มประสิทธิภาพการย่อยสลายมีเทนด้วย methanotrophs ในสภาพภูมิอากาศไทย' },
                  { title: '🌿 Carbon Pathway', desc: 'ออกแบบเส้นทางคาร์บอนที่เหมาะสม', prompt: 'ออกแบบ integrated carbon pathway ที่รวม methanotrophs + CCU + bioremediation สำหรับ T-VER' },
                ].map((tool) => (
                  <button key={tool.title} className="flex flex-col gap-2 p-4 rounded-lg border text-left hover:bg-muted/30 transition-colors">
                    <span className="text-sm font-semibold">{tool.title}</span>
                    <span className="text-xs text-muted-foreground">{tool.desc}</span>
                  </button>
                ))}
              </div>

              <Separator />

              <div className="p-4 rounded-lg bg-muted/30 space-y-3">
                <p className="text-sm font-semibold">💡 AI Insights — คำแนะนำจาก AI</p>
                <div className="space-y-2">
                  {[
                    { insight: 'Methylocystis parvus (Type II) เหมาะที่สุดสำหรับสภาพภูมิอากาศไทย เนื่องจากเจริญได้ดีที่ 25-30°C และสะสม lipid สูง (42%)', type: 'success' },
                    { insight: 'การผสม Methylocystis + Methylococcus เพิ่มประสิทธิภาพ CH₄ oxidation จาก 85% → 93% เนื่องจากใช้ niche ต่างกัน', type: 'info' },
                    { insight: 'ควรติดตาม H₂ partial pressure ในระบบ SynMEC — หากเกิน 10⁻⁴ atm จะยับยั้ง syntrophic oxidation', type: 'warning' },
                    { insight: 'LanzaTech gas fermentation (TRL 7) สามารถประยุกต์ใช้กับอุตสาหกรรมเหล็กกล้าในไทย ลด CO₂ ได้ 150,000 tCO₂e/yr', type: 'success' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs">
                      {item.type === 'success' ? <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" /> :
                       item.type === 'warning' ? <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" /> :
                       <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />}
                      <span>{item.insight}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Footer */}
      <div className="text-center text-[10px] text-muted-foreground py-4">
        BioCarbon Simulation Lab — Based on BIOTEC-NSTDA Research | Thailand T-VER Carbon Credit Standard | 🇹🇭 T-VER: GWP=25 (AR4) | 🌐 Int'l: GWP=28 (AR5)
      </div>
    </div>
  );
}
