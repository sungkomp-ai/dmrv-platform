'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Building2, Zap, Leaf, BarChart3, Award, Plus, RefreshCw,
  TrendingUp, TrendingDown, Sun, Wind, Droplets, Thermometer,
  Lightbulb, ChevronDown, ChevronUp, FileCheck, ShieldCheck,
  Calculator, Package, MapPin, Layers, Activity, AlertTriangle,
  CheckCircle, Info, Search, Download, Eye, Trash2, Database,
  CircleDot, Gauge, Sparkles, ArrowRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  LineChart, BarChart, AreaChart, PieChart, ComposedChart,
  ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  Line, Bar, Area, Pie, Cell,
} from 'recharts';

// ─── Types ────────────────────────────────────────────────────────────────

interface LowCarbonBuilding {
  id: string;
  buildingId: string;
  name: string;
  nameTh: string;
  province: string;
  lat: number;
  lng: number;
  buildingType: string;
  floors: number;
  grossFloorArea: number;
  yearBuilt: number;
  certificationStd: string;
  certificationLevel: string;
  baselineEUI: number;
  projectEUI: number;
  baselineEmission: number;
  projectEmission: number;
  emissionReduction: number;
  renewableEnergyPct: number;
  waterReductionPct: number;
  materialSavingsPct: number;
  greenAreaRatio: number;
  status: string;
  methodology: string;
  createdAt: string;
  updatedAt: string;
  energyRecords?: EnergyRecord[];
  materialRecords?: MaterialRecord[];
}

interface EnergyRecord {
  id: string;
  buildingId: string;
  recordDate: string;
  recordType: string;
  electricityKwh: number;
  hvacKwh: number;
  lightingKwh: number;
  equipmentKwh: number;
  solarGeneration: number;
  windGeneration: number;
  gasUsage: number;
  waterUsage: number;
  indoorTemp: number;
  indoorHumidity: number;
  co2Level: number;
  occupancyRate: number;
  eui: number;
  carbonEmission: number;
  ingestionMode: string;
  qualityFlag: string;
  integrityHash: string;
  sourceDevice: string;
  createdAt: string;
  building?: { buildingId: string; name: string; nameTh: string; grossFloorArea: number; buildingType: string; province: string };
}

interface MaterialRecord {
  id: string;
  buildingId: string;
  materialName: string;
  materialNameTh: string;
  category: string;
  quantity: number;
  unit: string;
  carbonFactor: number;
  embodiedCarbon: number;
  recycledContent: number;
  localSource: boolean;
  supplier: string;
  createdAt: string;
  building?: { buildingId: string; name: string; nameTh: string; grossFloorArea: number; province: string };
}

interface CalculationReport {
  buildingInfo: LowCarbonBuilding & { methodology: string };
  monitoringPeriod: {
    startDate: string;
    endDate: string;
    days: number;
    energyRecordsUsed: number;
    calculatedFromRecords: boolean;
  };
  emissionCalculation: {
    baselineEmission: { value: number; unit: string; formula: string };
    projectEmission: { value: number; unit: string; formula: string };
    emissionReduction: { value: number; unit: string; formula: string };
  };
  euiCalculation: {
    baselineEUI: { value: number; unit: string; source: string };
    projectEUI: { value: number; unit: string; source: string };
    improvement: { absolute: number; percentage: number; unit: string; formula: string };
  };
  carbonCreditCalculation: {
    methodology: string;
    grossEmissionReduction: { value: number; unit: string; description: string };
    bufferDeduction: { value: number; unit: string; percentage: string; description: string; formula: string };
    netEmissionReduction: { value: number; unit: string; description: string; formula: string };
    carbonCredits: { value: number; unit: string; description: string };
  };
  greenBuildingScore: {
    totalScore: number;
    level: string;
    breakdown: {
      energyEfficiency: { score: number; percentage: number; details: string };
      renewableEnergy: { score: number; details: string };
      waterEfficiency: { score: number; details: string };
      materialSustainability: { score: number; details: string };
      greenArea: { score: number; details: string };
    };
    weights: Record<string, number>;
  };
  materialSummary: {
    totalEmbodiedCarbon: number;
    unit: string;
    totalMaterials: number;
    localMaterialPct: number;
    recycledContentAvg: number;
    embodiedCarbonPerArea: number;
  };
}

interface CertificationEntry {
  buildingId: string;
  buildingName: string;
  province: string;
  certificationStd: string;
  currentLevel: string;
  recommendedLevel: string;
  greenScore: number;
  eligible: boolean;
  missingItems: string[];
}

// ─── Constants ────────────────────────────────────────────────────────────

const BUILDING_TYPES = [
  { value: 'OFFICE', label: 'สำนักงาน' },
  { value: 'RESIDENTIAL', label: 'อาคารพักอาศัย' },
  { value: 'RETAIL', label: 'ค้าปลีก' },
  { value: 'HOSPITAL', label: 'โรงพยาบาล' },
  { value: 'SCHOOL', label: 'โรงเรียน' },
  { value: 'HOTEL', label: 'โรงแรม' },
  { value: 'MIXED_USE', label: 'ใช้ประโยชน์ร่วม' },
];

const CERT_STANDARDS = [
  { value: 'TGBI', label: 'TGBI' },
  { value: 'LEED', label: 'LEED' },
  { value: 'EDGE', label: 'EDGE' },
  { value: 'TREES', label: 'TREES' },
  { value: 'GREEN_MARK', label: 'Green Mark' },
];

const METHODOLOGIES = [
  { value: 'T-VER-BLDG-01', label: 'T-VER-BLDG-01' },
  { value: 'EDGE', label: 'EDGE' },
  { value: 'LEED-EB', label: 'LEED-EB' },
];

const MATERIAL_CATEGORIES = [
  { value: 'STRUCTURAL', label: 'โครงสร้าง' },
  { value: 'ENVELOPE', label: 'ปิดอาคาร' },
  { value: 'INTERIOR', label: 'ภายใน' },
  { value: 'MEP', label: 'ระบบ' },
  { value: 'RENEWABLE', label: 'พลังงานหมุนเวียน' },
];

const THAI_CARBON_FACTORS: Record<string, { factor: number; nameTh: string; unit: string }> = {
  concrete: { factor: 0.159, nameTh: 'คอนกรีต', unit: 'kg' },
  reinforced_concrete: { factor: 0.224, nameTh: 'คอนกรีตเสริมเหล็ก', unit: 'kg' },
  steel: { factor: 2.89, nameTh: 'เหล็กกล้า', unit: 'kg' },
  steel_rebar: { factor: 2.41, nameTh: 'เหล็กเสริม', unit: 'kg' },
  steel_section: { factor: 2.72, nameTh: 'เหล็กรูปพรรณ', unit: 'kg' },
  timber: { factor: 0.41, nameTh: 'ไม้', unit: 'kg' },
  timber_hardwood: { factor: 0.54, nameTh: 'ไม้เนื้อแข็ง', unit: 'kg' },
  brick: { factor: 0.24, nameTh: 'อิฐ', unit: 'kg' },
  glass: { factor: 1.54, nameTh: 'กระจก', unit: 'kg' },
  glass_double_glazing: { factor: 2.1, nameTh: 'กระจกชั้นคู่', unit: 'kg' },
  insulation_mineral_wool: { factor: 1.35, nameTh: 'ฉนวนขนแกะแร่', unit: 'kg' },
  insulation_fiberglass: { factor: 1.54, nameTh: 'ฉนวนไฟเบอร์กลาส', unit: 'kg' },
  aluminum_cladding: { factor: 8.24, nameTh: 'อะลูมิเนียมแผ่นหุ้ม', unit: 'kg' },
  cement_render: { factor: 0.176, nameTh: 'ปูนฉาบ', unit: 'kg' },
  gypsum_board: { factor: 0.39, nameTh: 'แผ่นยิปซั่ม', unit: 'kg' },
  ceramic_tile: { factor: 0.78, nameTh: 'กระเบื้องเซรามิก', unit: 'kg' },
  paint: { factor: 2.93, nameTh: 'สีทาอาคาร', unit: 'kg' },
  copper_pipe: { factor: 3.81, nameTh: 'ท่อทองแดง', unit: 'kg' },
  pvc_pipe: { factor: 3.1, nameTh: 'ท่อ PVC', unit: 'kg' },
  hvac_unit: { factor: 3.5, nameTh: 'เครื่องปรับอากาศ', unit: 'kg' },
  solar_panel: { factor: 43.0, nameTh: 'แผงโซลาร์เซลล์', unit: 'kg' },
  battery_lithium: { factor: 16.0, nameTh: 'แบตเตอรี่ลิเธียม', unit: 'kg' },
  cement: { factor: 0.91, nameTh: 'ปูนซีเมนต์', unit: 'kg' },
  sand: { factor: 0.005, nameTh: 'ทราย', unit: 'kg' },
  aggregate: { factor: 0.005, nameTh: 'หินผลิต', unit: 'kg' },
};

const PIE_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

const certLevelBadge: Record<string, string> = {
  UNRATED: 'bg-gray-100 text-gray-700 border-gray-200',
  CERTIFIED: 'bg-blue-100 text-blue-700 border-blue-200',
  SILVER: 'bg-teal-100 text-teal-700 border-teal-200',
  GOLD: 'bg-amber-100 text-amber-700 border-amber-200',
  PLATINUM: 'bg-emerald-100 text-emerald-700 border-emerald-200',
};

const statusBadge: Record<string, string> = {
  REGISTERED: 'bg-slate-100 text-slate-700',
  MONITORING: 'bg-sky-100 text-sky-700',
  CERTIFIED: 'bg-emerald-100 text-emerald-700',
  RECERTIFIED: 'bg-teal-100 text-teal-700',
  SUSPENDED: 'bg-red-100 text-red-700',
};

const qualityBadge: Record<string, string> = {
  RAW: 'bg-gray-100 text-gray-600',
  VALIDATED: 'bg-emerald-100 text-emerald-700',
  CERTIFIED: 'bg-blue-100 text-blue-700',
  REJECTED: 'bg-red-100 text-red-700',
  ANOMALY: 'bg-amber-100 text-amber-700',
};

const buildingTypeLabels: Record<string, string> = {
  OFFICE: 'สำนักงาน',
  RESIDENTIAL: 'อาคารพักอาศัย',
  RETAIL: 'ค้าปลีก',
  HOSPITAL: 'โรงพยาบาล',
  SCHOOL: 'โรงเรียน',
  HOTEL: 'โรงแรม',
  MIXED_USE: 'ใช้ประโยชน์ร่วม',
};

// ─── API Helpers ──────────────────────────────────────────────────────────

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'API Error');
  return data;
}

// ─── Main Component ───────────────────────────────────────────────────────

export default function LowCarbonBuildingAgentView() {
  // ── State ──
  const [buildings, setBuildings] = useState<LowCarbonBuilding[]>([]);
  const [energyRecords, setEnergyRecords] = useState<EnergyRecord[]>([]);
  const [materialRecords, setMaterialRecords] = useState<MaterialRecord[]>([]);
  const [calcResult, setCalcResult] = useState<CalculationReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [expandedBuilding, setExpandedBuilding] = useState<string | null>(null);
  const [showAddBuilding, setShowAddBuilding] = useState(false);
  const [showAddEnergy, setShowAddEnergy] = useState(false);
  const [showAddMaterial, setShowAddMaterial] = useState(false);
  const [energySubTab, setEnergySubTab] = useState('energy');
  const [calcBuildingId, setCalcBuildingId] = useState('');
  const [calcStartDate, setCalcStartDate] = useState('');
  const [calcEndDate, setCalcEndDate] = useState('');
  const [calcLoading, setCalcLoading] = useState(false);
  const [certHistory, setCertHistory] = useState<{ buildingId: string; name: string; level: string; date: string; std: string }[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // ── Form States ──
  const [newBuilding, setNewBuilding] = useState({
    buildingId: '', name: '', nameTh: '', province: '', buildingType: 'OFFICE',
    floors: 1, grossFloorArea: 0, yearBuilt: 2024, certificationStd: 'TGBI', methodology: 'T-VER-BLDG-01',
  });
  const [newEnergy, setNewEnergy] = useState({
    buildingId: '', recordDate: '', recordType: 'HOURLY',
    electricityKwh: 0, hvacKwh: 0, lightingKwh: 0, equipmentKwh: 0,
    solarGeneration: 0, windGeneration: 0, gasUsage: 0, waterUsage: 0,
    indoorTemp: 25, indoorHumidity: 55, co2Level: 600, occupancyRate: 70, sourceDevice: '',
  });
  const [newMaterial, setNewMaterial] = useState({
    buildingId: '', materialName: '', materialNameTh: '', category: 'STRUCTURAL',
    quantity: 0, unit: 'kg', carbonFactor: 0, recycledContent: 0, localSource: false, supplier: '',
  });

  // ── Data Loading ──
  const loadBuildings = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiFetch<any>('/api/low-carbon-building/buildings');
      setBuildings(res.data || []);
      setSummary(res.summary || null);
      // Auto-seed if empty
      if ((!res.data || res.data.length === 0)) {
        await fetch('/api/low-carbon-building/sample?seed=true');
        const res2 = await apiFetch<any>('/api/low-carbon-building/buildings');
        setBuildings(res2.data || []);
        setSummary(res2.summary || null);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadEnergy = useCallback(async () => {
    try {
      const res = await apiFetch<any>('/api/low-carbon-building/energy?limit=200');
      setEnergyRecords(res.data || []);
    } catch { /* ignore */ }
  }, []);

  const loadMaterials = useCallback(async () => {
    try {
      const res = await apiFetch<any>('/api/low-carbon-building/materials?limit=200');
      setMaterialRecords(res.data || []);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    loadBuildings().then(() => { loadEnergy(); loadMaterials(); });
  }, [loadBuildings, loadEnergy, loadMaterials]);

  // ── Computed Data ──
  const kpiData = useMemo(() => {
    const total = buildings.length;
    const monitored = buildings.filter(b => b.status === 'MONITORING' || b.status === 'CERTIFIED' || b.status === 'RECERTIFIED').length;
    const totalReduction = buildings.reduce((s, b) => s + (b.emissionReduction || 0), 0);
    const bufferRatio = 0.15;
    const estimatedCredits = totalReduction * (1 - bufferRatio);
    return { total, monitored, totalReduction, estimatedCredits };
  }, [buildings]);

  const monthlyEnergyData = useMemo(() => {
    const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    return months.map((m, i) => {
      const gridVal = 180 + Math.sin(i * 0.5) * 40 + Math.random() * 20;
      const solarVal = 30 + Math.sin((i - 2) * 0.6) * 25 + Math.random() * 10;
      const windVal = 5 + Math.cos(i * 0.4) * 5 + Math.random() * 3;
      return {
        name: m,
        ไฟฟ้ากริด: Math.round(gridVal),
        โซลาร์เซลล์: Math.round(solarVal),
        ลม: Math.round(windVal),
        EUI: Math.round((gridVal + solarVal + windVal) / 3.5),
      };
    });
  }, []);

  const emissionByBuildingData = useMemo(() => {
    return buildings.slice(0, 8).map(b => ({
      name: b.nameTh || b.name,
      การลดการปล่อย: Math.round(b.emissionReduction * 10) / 10,
      การปล่อยจริง: Math.round(b.projectEmission * 10) / 10,
    }));
  }, [buildings]);

  const buildingTypePieData = useMemo(() => {
    const counts: Record<string, number> = {};
    buildings.forEach(b => { counts[b.buildingType] = (counts[b.buildingType] || 0) + 1; });
    return Object.entries(counts).map(([type, count]) => ({
      name: buildingTypeLabels[type] || type,
      value: count,
    }));
  }, [buildings]);

  const certificationList = useMemo((): CertificationEntry[] => {
    return buildings.map(b => {
      const hasEnergy = energyRecords.some(e => e.buildingId === b.buildingId);
      const hasReduction = b.emissionReduction > 0;
      let recommended = 'UNRATED';
      if (b.emissionReduction > 0) recommended = 'CERTIFIED';
      if (b.emissionReduction > 300) recommended = 'SILVER';
      if (b.emissionReduction > 600) recommended = 'GOLD';
      if (b.emissionReduction > 1000) recommended = 'PLATINUM';
      const missing: string[] = [];
      if (!hasEnergy) missing.push('ไม่มีข้อมูลพลังงาน');
      if (!hasReduction) missing.push('ไม่มีการลดการปล่อย');
      if (b.greenAreaRatio < 0.1) missing.push('พื้นที่สีเขียวต่ำ');
      return {
        buildingId: b.buildingId,
        buildingName: b.nameTh || b.name,
        province: b.province,
        certificationStd: b.certificationStd,
        currentLevel: b.certificationLevel,
        recommendedLevel: recommended,
        greenScore: Math.round(b.emissionReduction / 10),
        eligible: hasEnergy && hasReduction,
        missingItems: missing,
      };
    });
  }, [buildings, energyRecords]);

  // ── Handlers ──
  const handleAddBuilding = async () => {
    try {
      await apiFetch('/api/low-carbon-building/buildings', {
        method: 'POST',
        body: JSON.stringify(newBuilding),
      });
      setShowAddBuilding(false);
      setNewBuilding({ buildingId: '', name: '', nameTh: '', province: '', buildingType: 'OFFICE', floors: 1, grossFloorArea: 0, yearBuilt: 2024, certificationStd: 'TGBI', methodology: 'T-VER-BLDG-01' });
      loadBuildings();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleAddEnergy = async () => {
    try {
      await apiFetch('/api/low-carbon-building/energy', {
        method: 'POST',
        body: JSON.stringify(newEnergy),
      });
      setShowAddEnergy(false);
      setNewEnergy({ buildingId: '', recordDate: '', recordType: 'HOURLY', electricityKwh: 0, hvacKwh: 0, lightingKwh: 0, equipmentKwh: 0, solarGeneration: 0, windGeneration: 0, gasUsage: 0, waterUsage: 0, indoorTemp: 25, indoorHumidity: 55, co2Level: 600, occupancyRate: 70, sourceDevice: '' });
      loadEnergy();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleAddMaterial = async () => {
    try {
      await apiFetch('/api/low-carbon-building/materials', {
        method: 'POST',
        body: JSON.stringify(newMaterial),
      });
      setShowAddMaterial(false);
      setNewMaterial({ buildingId: '', materialName: '', materialNameTh: '', category: 'STRUCTURAL', quantity: 0, unit: 'kg', carbonFactor: 0, recycledContent: 0, localSource: false, supplier: '' });
      loadMaterials();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCalculate = async () => {
    if (!calcBuildingId) return;
    try {
      setCalcLoading(true);
      const body: any = { buildingId: calcBuildingId };
      if (calcStartDate) body.monitoringStartDate = calcStartDate;
      if (calcEndDate) body.monitoringEndDate = calcEndDate;
      const res = await apiFetch<any>('/api/low-carbon-building/calculate', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      setCalcResult(res.report);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setCalcLoading(false);
    }
  };

  const handleCertify = (entry: CertificationEntry) => {
    const building = buildings.find(b => b.buildingId === entry.buildingId);
    setCertHistory(prev => [{
      buildingId: entry.buildingId,
      name: entry.buildingName,
      level: entry.recommendedLevel,
      date: new Date().toLocaleDateString('th-TH'),
      std: entry.certificationStd,
    }, ...prev]);
    alert(`ออกใบรับรอง ${entry.certificationStd} ระดับ ${entry.recommendedLevel} สำหรับ ${entry.buildingName} สำเร็จ`);
  };

  const realtimeEnergyCards = useMemo(() => {
    if (energyRecords.length === 0) return null;
    const latest = energyRecords[0];
    return {
      electricity: latest.electricityKwh,
      hvac: latest.hvacKwh,
      lighting: latest.lightingKwh,
      solar: latest.solarGeneration,
      wind: latest.windGeneration,
    };
  }, [energyRecords]);

  const totalEmbodiedCarbon = useMemo(() => {
    return materialRecords.reduce((s, m) => s + (m.embodiedCarbon || 0), 0);
  }, [materialRecords]);

  // ── Render ──
  if (loading) {
    return (
      <div className="flex items-center justify-center h-[80vh] bg-slate-950 text-white">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="h-8 w-8 animate-spin text-emerald-400" />
          <span className="text-slate-300">กำลังโหลดข้อมูลอาคารคาร์บอนต่ำ...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-600/20 border border-emerald-500/30">
            <Building2 className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Low-Carbon Building Agent</h1>
            <p className="text-xs text-slate-400">ระบบติดตามและจัดการอาคารคาร์บอนต่ำ — T-VER-BLDG-01</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="border-emerald-500/30 text-emerald-400">
            <Activity className="h-3 w-3 mr-1" /> {buildings.length} อาคาร
          </Badge>
          <Button size="sm" variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-800" onClick={() => { loadBuildings(); loadEnergy(); loadMaterials(); }}>
            <RefreshCw className="h-3.5 w-3.5 mr-1" /> รีเฟรช
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-slate-900 border border-slate-700/50 p-1 h-auto flex flex-wrap gap-1">
          <TabsTrigger value="overview" className="data-[state=active]:bg-emerald-600/20 data-[state=active]:text-emerald-400 text-slate-400 text-xs px-3 py-1.5">
            📊 ภาพรวม
          </TabsTrigger>
          <TabsTrigger value="buildings" className="data-[state=active]:bg-emerald-600/20 data-[state=active]:text-emerald-400 text-slate-400 text-xs px-3 py-1.5">
            🏢 อาคาร
          </TabsTrigger>
          <TabsTrigger value="energy" className="data-[state=active]:bg-emerald-600/20 data-[state=active]:text-emerald-400 text-slate-400 text-xs px-3 py-1.5">
            ⚡ พลังงาน & วัสดุ
          </TabsTrigger>
          <TabsTrigger value="calculator" className="data-[state=active]:bg-emerald-600/20 data-[state=active]:text-emerald-400 text-slate-400 text-xs px-3 py-1.5">
            🧮 คำนวณคาร์บอน
          </TabsTrigger>
          <TabsTrigger value="certification" className="data-[state=active]:bg-emerald-600/20 data-[state=active]:text-emerald-400 text-slate-400 text-xs px-3 py-1.5">
            📋 รับรอง
          </TabsTrigger>
        </TabsList>

        {/* ═══════════════════════════════════════════════════════════════════
            TAB 1: ภาพรวม (Overview)
        ═══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="overview" className="space-y-4">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="bg-slate-900 border-slate-700/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Building2 className="h-4 w-4 text-slate-400" />
                  <span className="text-xs text-slate-400">อาคารทั้งหมด</span>
                </div>
                <p className="text-2xl font-bold text-white">{kpiData.total}</p>
                <p className="text-xs text-slate-500">อาคาร</p>
              </CardContent>
            </Card>
            <Card className="bg-slate-900 border-slate-700/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="h-4 w-4 text-sky-400" />
                  <span className="text-xs text-slate-400">อาคารที่ติดตาม</span>
                </div>
                <p className="text-2xl font-bold text-sky-400">{kpiData.monitored}</p>
                <p className="text-xs text-slate-500">กำลังติดตาม</p>
              </CardContent>
            </Card>
            <Card className="bg-slate-900 border-slate-700/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Leaf className="h-4 w-4 text-emerald-400" />
                  <span className="text-xs text-slate-400">การลดการปล่อยรวม</span>
                </div>
                <p className="text-2xl font-bold text-emerald-400">{kpiData.totalReduction.toFixed(1)}</p>
                <p className="text-xs text-slate-500">tCO2e/yr</p>
              </CardContent>
            </Card>
            <Card className="bg-slate-900 border-slate-700/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Award className="h-4 w-4 text-amber-400" />
                  <span className="text-xs text-slate-400">เครดิตคาร์บอนคาดการณ์</span>
                </div>
                <p className="text-2xl font-bold text-amber-400">{kpiData.estimatedCredits.toFixed(1)}</p>
                <p className="text-xs text-slate-500">tCO2e (หัก Buffer 15%)</p>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* ComposedChart: Monthly Energy */}
            <Card className="bg-slate-900 border-slate-700/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-white">การใช้พลังงานรายเดือน (kWh)</CardTitle>
                <CardDescription className="text-xs text-slate-400">Grid + Solar + Wind พร้อม EUI Overlay</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <ResponsiveContainer width="100%" height={260}>
                  <ComposedChart data={monthlyEnergyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: 8, color: '#f1f5f9' }} />
                    <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
                    <Bar dataKey="ไฟฟ้ากริด" stackId="energy" fill="#3b82f6" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="โซลาร์เซลล์" stackId="energy" fill="#f59e0b" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="ลม" stackId="energy" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                    <Line type="monotone" dataKey="EUI" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981', r: 3 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Bar: Emission by Building */}
            <Card className="bg-slate-900 border-slate-700/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-white">การลดการปล่อยตามอาคาร (tCO2e/yr)</CardTitle>
                <CardDescription className="text-xs text-slate-400">เปรียบเทียบการลดการปล่อยกับการปล่อยจริง</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={emissionByBuildingData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <YAxis dataKey="name" type="category" width={120} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: 8, color: '#f1f5f9' }} />
                    <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
                    <Bar dataKey="การลดการปล่อย" fill="#10b981" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="การปล่อยจริง" fill="#ef4444" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Pie Chart + Table Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Pie: Building Type Distribution */}
            <Card className="bg-slate-900 border-slate-700/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-white">สัดส่วนประเภทอาคาร</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {buildingTypePieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={buildingTypePieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={{ stroke: '#94a3b8' }}>
                        {buildingTypePieData.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: 8, color: '#f1f5f9' }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[220px] text-slate-500 text-sm">ไม่มีข้อมูล</div>
                )}
              </CardContent>
            </Card>

            {/* Table: Recent Buildings */}
            <Card className="bg-slate-900 border-slate-700/50 lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-white">รายการอาคารล่าสุด</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <ScrollArea className="max-h-64">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-slate-700/50 hover:bg-transparent">
                        <TableHead className="text-slate-400 text-xs">รหัส</TableHead>
                        <TableHead className="text-slate-400 text-xs">ชื่อ</TableHead>
                        <TableHead className="text-slate-400 text-xs">จังหวัด</TableHead>
                        <TableHead className="text-slate-400 text-xs">ประเภท</TableHead>
                        <TableHead className="text-slate-400 text-xs">ระดับ</TableHead>
                        <TableHead className="text-slate-400 text-xs">สถานะ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {buildings.slice(0, 5).map(b => (
                        <TableRow key={b.buildingId} className="border-slate-700/30 hover:bg-slate-800/50">
                          <TableCell className="text-xs font-mono text-emerald-400">{b.buildingId}</TableCell>
                          <TableCell className="text-xs text-white">{b.nameTh || b.name}</TableCell>
                          <TableCell className="text-xs text-slate-300">{b.province}</TableCell>
                          <TableCell className="text-xs text-slate-300">{buildingTypeLabels[b.buildingType] || b.buildingType}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${certLevelBadge[b.certificationLevel] || 'bg-gray-100 text-gray-700'}`}>
                              {b.certificationLevel}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${statusBadge[b.status] || 'bg-slate-100 text-slate-700'}`}>
                              {b.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════════
            TAB 2: อาคาร (Buildings)
        ═══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="buildings" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">รายการอาคารคาร์บอนต่ำ</h2>
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => setShowAddBuilding(true)}>
              <Plus className="h-4 w-4 mr-1" /> เพิ่มอาคาร
            </Button>
          </div>

          <Card className="bg-slate-900 border-slate-700/50">
            <CardContent className="p-0">
              <ScrollArea className="max-h-96">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-700/50 hover:bg-transparent">
                      <TableHead className="text-slate-400 text-xs">รหัส</TableHead>
                      <TableHead className="text-slate-400 text-xs">ชื่อ</TableHead>
                      <TableHead className="text-slate-400 text-xs">จังหวัด</TableHead>
                      <TableHead className="text-slate-400 text-xs">ประเภท</TableHead>
                      <TableHead className="text-slate-400 text-xs">ชั้น</TableHead>
                      <TableHead className="text-slate-400 text-xs">พื้นที่ (m²)</TableHead>
                      <TableHead className="text-slate-400 text-xs">EUI Baseline</TableHead>
                      <TableHead className="text-slate-400 text-xs">EUI Project</TableHead>
                      <TableHead className="text-slate-400 text-xs">ลดการปล่อย</TableHead>
                      <TableHead className="text-slate-400 text-xs">มาตรฐาน</TableHead>
                      <TableHead className="text-slate-400 text-xs">ระดับ</TableHead>
                      <TableHead className="text-slate-400 text-xs">สถานะ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {buildings.map(b => (
                      <React.Fragment key={b.buildingId}>
                        <TableRow
                          className="border-slate-700/30 hover:bg-slate-800/50 cursor-pointer"
                          onClick={() => setExpandedBuilding(expandedBuilding === b.buildingId ? null : b.buildingId)}
                        >
                          <TableCell className="text-xs font-mono text-emerald-400">{b.buildingId}</TableCell>
                          <TableCell className="text-xs text-white font-medium">{b.nameTh || b.name}</TableCell>
                          <TableCell className="text-xs text-slate-300">{b.province}</TableCell>
                          <TableCell className="text-xs text-slate-300">{buildingTypeLabels[b.buildingType] || b.buildingType}</TableCell>
                          <TableCell className="text-xs text-slate-300 text-center">{b.floors}</TableCell>
                          <TableCell className="text-xs text-slate-300 text-right">{b.grossFloorArea.toLocaleString()}</TableCell>
                          <TableCell className="text-xs text-slate-300 text-right">{b.baselineEUI}</TableCell>
                          <TableCell className="text-xs text-emerald-400 text-right font-medium">{b.projectEUI}</TableCell>
                          <TableCell className="text-xs text-emerald-400 text-right font-medium">{b.emissionReduction.toFixed(1)}</TableCell>
                          <TableCell className="text-xs text-slate-300">{b.certificationStd}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${certLevelBadge[b.certificationLevel] || ''}`}>
                              {b.certificationLevel}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${statusBadge[b.status] || ''}`}>
                                {b.status}
                              </Badge>
                              {expandedBuilding === b.buildingId ? <ChevronUp className="h-3 w-3 text-slate-400" /> : <ChevronDown className="h-3 w-3 text-slate-400" />}
                            </div>
                          </TableCell>
                        </TableRow>
                        {expandedBuilding === b.buildingId && (
                          <TableRow className="border-slate-700/30 bg-slate-800/30">
                            <TableCell colSpan={12} className="p-4">
                              <div className="space-y-3">
                                <h4 className="text-sm font-semibold text-emerald-400">ข้อมูลเพิ่มเติม: {b.name}</h4>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                                  <div>
                                    <span className="text-slate-400">พลังงานหมุนเวียน:</span>
                                    <span className="ml-1 text-white font-medium">{b.renewableEnergyPct}%</span>
                                  </div>
                                  <div>
                                    <span className="text-slate-400">ลดการใช้น้ำ:</span>
                                    <span className="ml-1 text-white font-medium">{b.waterReductionPct}%</span>
                                  </div>
                                  <div>
                                    <span className="text-slate-400">ประหยัดวัสดุ:</span>
                                    <span className="ml-1 text-white font-medium">{b.materialSavingsPct}%</span>
                                  </div>
                                  <div>
                                    <span className="text-slate-400">พื้นที่สีเขียว:</span>
                                    <span className="ml-1 text-white font-medium">{b.greenAreaRatio}</span>
                                  </div>
                                  <div>
                                    <span className="text-slate-400">Baseline Emission:</span>
                                    <span className="ml-1 text-amber-400 font-medium">{b.baselineEmission} tCO2e/yr</span>
                                  </div>
                                  <div>
                                    <span className="text-slate-400">Project Emission:</span>
                                    <span className="ml-1 text-emerald-400 font-medium">{b.projectEmission} tCO2e/yr</span>
                                  </div>
                                  <div>
                                    <span className="text-slate-400">ระเบียบวิธี:</span>
                                    <span className="ml-1 text-white font-medium">{b.methodology}</span>
                                  </div>
                                  <div>
                                    <span className="text-slate-400">ปีสร้าง:</span>
                                    <span className="ml-1 text-white font-medium">{b.yearBuilt}</span>
                                  </div>
                                </div>
                                {/* Energy History */}
                                <div className="mt-3">
                                  <h5 className="text-xs font-semibold text-slate-300 mb-2">ประวัติพลังงานล่าสุด</h5>
                                  <ScrollArea className="max-h-40">
                                    <Table>
                                      <TableHeader>
                                        <TableRow className="border-slate-600/50 hover:bg-transparent">
                                          <TableHead className="text-slate-400 text-[10px]">วันที่</TableHead>
                                          <TableHead className="text-slate-400 text-[10px]">ไฟฟ้า (kWh)</TableHead>
                                          <TableHead className="text-slate-400 text-[10px]">โซลาร์ (kWh)</TableHead>
                                          <TableHead className="text-slate-400 text-[10px]">ลม (kWh)</TableHead>
                                          <TableHead className="text-slate-400 text-[10px]">EUI</TableHead>
                                          <TableHead className="text-slate-400 text-[10px]">Carbon (tCO2e)</TableHead>
                                          <TableHead className="text-slate-400 text-[10px]">Quality</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {energyRecords
                                          .filter(e => e.buildingId === b.buildingId)
                                          .slice(0, 10)
                                          .map(e => (
                                            <TableRow key={e.id} className="border-slate-600/30 hover:bg-slate-700/30">
                                              <TableCell className="text-[10px] text-slate-300">{new Date(e.recordDate).toLocaleString('th-TH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</TableCell>
                                              <TableCell className="text-[10px] text-white text-right">{e.electricityKwh}</TableCell>
                                              <TableCell className="text-[10px] text-amber-400 text-right">{e.solarGeneration}</TableCell>
                                              <TableCell className="text-[10px] text-sky-400 text-right">{e.windGeneration}</TableCell>
                                              <TableCell className="text-[10px] text-white text-right">{e.eui}</TableCell>
                                              <TableCell className="text-[10px] text-emerald-400 text-right">{e.carbonEmission}</TableCell>
                                              <TableCell>
                                                <Badge variant="outline" className={`text-[9px] px-1 py-0 ${qualityBadge[e.qualityFlag] || ''}`}>
                                                  {e.qualityFlag}
                                                </Badge>
                                              </TableCell>
                                            </TableRow>
                                          ))}
                                      </TableBody>
                                    </Table>
                                  </ScrollArea>
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Add Building Dialog */}
          <Dialog open={showAddBuilding} onOpenChange={setShowAddBuilding}>
            <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-lg">
              <DialogHeader>
                <DialogTitle className="text-white">เพิ่มอาคารใหม่</DialogTitle>
                <DialogDescription className="text-slate-400">กรอกข้อมูลอาคารคาร์บอนต่ำ</DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto p-1">
                <div className="space-y-1">
                  <Label className="text-xs text-slate-300">รหัสอาคาร *</Label>
                  <Input value={newBuilding.buildingId} onChange={e => setNewBuilding({ ...newBuilding, buildingId: e.target.value })} placeholder="BLD-XXX-001" className="bg-slate-800 border-slate-600 text-white text-xs" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-300">ชื่ออาคาร (EN) *</Label>
                  <Input value={newBuilding.name} onChange={e => setNewBuilding({ ...newBuilding, name: e.target.value })} placeholder="Building Name" className="bg-slate-800 border-slate-600 text-white text-xs" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-300">ชื่ออาคาร (TH)</Label>
                  <Input value={newBuilding.nameTh} onChange={e => setNewBuilding({ ...newBuilding, nameTh: e.target.value })} placeholder="ชื่ออาคารภาษาไทย" className="bg-slate-800 border-slate-600 text-white text-xs" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-300">จังหวัด</Label>
                  <Input value={newBuilding.province} onChange={e => setNewBuilding({ ...newBuilding, province: e.target.value })} placeholder="กรุงเทพมหานคร" className="bg-slate-800 border-slate-600 text-white text-xs" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-300">ประเภทอาคาร</Label>
                  <Select value={newBuilding.buildingType} onValueChange={v => setNewBuilding({ ...newBuilding, buildingType: v })}>
                    <SelectTrigger className="bg-slate-800 border-slate-600 text-white text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-600">
                      {BUILDING_TYPES.map(t => <SelectItem key={t.value} value={t.value} className="text-xs text-white">{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-300">จำนวนชั้น</Label>
                  <Input type="number" value={newBuilding.floors} onChange={e => setNewBuilding({ ...newBuilding, floors: parseInt(e.target.value) || 1 })} className="bg-slate-800 border-slate-600 text-white text-xs" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-300">พื้นที่ใช้สอย (m²)</Label>
                  <Input type="number" value={newBuilding.grossFloorArea} onChange={e => setNewBuilding({ ...newBuilding, grossFloorArea: parseFloat(e.target.value) || 0 })} className="bg-slate-800 border-slate-600 text-white text-xs" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-300">ปีที่สร้าง</Label>
                  <Input type="number" value={newBuilding.yearBuilt} onChange={e => setNewBuilding({ ...newBuilding, yearBuilt: parseInt(e.target.value) || 2020 })} className="bg-slate-800 border-slate-600 text-white text-xs" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-300">มาตรฐานรับรอง</Label>
                  <Select value={newBuilding.certificationStd} onValueChange={v => setNewBuilding({ ...newBuilding, certificationStd: v })}>
                    <SelectTrigger className="bg-slate-800 border-slate-600 text-white text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-600">
                      {CERT_STANDARDS.map(s => <SelectItem key={s.value} value={s.value} className="text-xs text-white">{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-300">ระเบียบวิธี</Label>
                  <Select value={newBuilding.methodology} onValueChange={v => setNewBuilding({ ...newBuilding, methodology: v })}>
                    <SelectTrigger className="bg-slate-800 border-slate-600 text-white text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-600">
                      {METHODOLOGIES.map(m => <SelectItem key={m.value} value={m.value} className="text-xs text-white">{m.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowAddBuilding(false)} className="border-slate-600 text-slate-300">ยกเลิก</Button>
                <Button onClick={handleAddBuilding} className="bg-emerald-600 hover:bg-emerald-700 text-white">สร้างอาคาร</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════════
            TAB 3: พลังงาน & วัสดุ (Energy & Materials)
        ═══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="energy" className="space-y-4">
          {/* Sub-tabs */}
          <div className="flex gap-2">
            <Button size="sm" variant={energySubTab === 'energy' ? 'default' : 'outline'} className={energySubTab === 'energy' ? 'bg-emerald-600 text-white' : 'border-slate-600 text-slate-300'} onClick={() => setEnergySubTab('energy')}>
              <Zap className="h-3.5 w-3.5 mr-1" /> พลังงาน
            </Button>
            <Button size="sm" variant={energySubTab === 'materials' ? 'default' : 'outline'} className={energySubTab === 'materials' ? 'bg-emerald-600 text-white' : 'border-slate-600 text-slate-300'} onClick={() => setEnergySubTab('materials')}>
              <Package className="h-3.5 w-3.5 mr-1" /> วัสดุก่อสร้าง
            </Button>
          </div>

          {energySubTab === 'energy' ? (
            <div className="space-y-4">
              {/* Realtime Energy Cards */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <Card className="bg-slate-900 border-slate-700/50">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Zap className="h-3.5 w-3.5 text-amber-400" />
                      <span className="text-[10px] text-slate-400">ไฟฟ้ากริด</span>
                    </div>
                    <p className="text-lg font-bold text-amber-400">{realtimeEnergyCards?.electricity?.toFixed(0) || '—'}</p>
                    <p className="text-[10px] text-slate-500">kWh</p>
                  </CardContent>
                </Card>
                <Card className="bg-slate-900 border-slate-700/50">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Thermometer className="h-3.5 w-3.5 text-red-400" />
                      <span className="text-[10px] text-slate-400">HVAC</span>
                    </div>
                    <p className="text-lg font-bold text-red-400">{realtimeEnergyCards?.hvac?.toFixed(0) || '—'}</p>
                    <p className="text-[10px] text-slate-500">kWh</p>
                  </CardContent>
                </Card>
                <Card className="bg-slate-900 border-slate-700/50">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Lightbulb className="h-3.5 w-3.5 text-sky-400" />
                      <span className="text-[10px] text-slate-400">แสงสว่าง</span>
                    </div>
                    <p className="text-lg font-bold text-sky-400">{realtimeEnergyCards?.lighting?.toFixed(0) || '—'}</p>
                    <p className="text-[10px] text-slate-500">kWh</p>
                  </CardContent>
                </Card>
                <Card className="bg-slate-900 border-slate-700/50">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Sun className="h-3.5 w-3.5 text-yellow-400" />
                      <span className="text-[10px] text-slate-400">โซลาร์เซลล์</span>
                    </div>
                    <p className="text-lg font-bold text-yellow-400">{realtimeEnergyCards?.solar?.toFixed(0) || '—'}</p>
                    <p className="text-[10px] text-slate-500">kWh</p>
                  </CardContent>
                </Card>
                <Card className="bg-slate-900 border-slate-700/50">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Wind className="h-3.5 w-3.5 text-cyan-400" />
                      <span className="text-[10px] text-slate-400">ลม</span>
                    </div>
                    <p className="text-lg font-bold text-cyan-400">{realtimeEnergyCards?.wind?.toFixed(0) || '—'}</p>
                    <p className="text-[10px] text-slate-500">kWh</p>
                  </CardContent>
                </Card>
              </div>

              {/* Energy Records Table */}
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white">บันทึกพลังงาน</h3>
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => { setNewEnergy({ ...newEnergy, buildingId: buildings[0]?.buildingId || '', recordDate: new Date().toISOString().slice(0, 16) }); setShowAddEnergy(true); }}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> เพิ่มบันทึก
                </Button>
              </div>
              <Card className="bg-slate-900 border-slate-700/50">
                <CardContent className="p-0">
                  <ScrollArea className="max-h-96">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-slate-700/50 hover:bg-transparent">
                          <TableHead className="text-slate-400 text-xs">อาคาร</TableHead>
                          <TableHead className="text-slate-400 text-xs">วันที่</TableHead>
                          <TableHead className="text-slate-400 text-xs">ไฟฟ้า</TableHead>
                          <TableHead className="text-slate-400 text-xs">โซลาร์</TableHead>
                          <TableHead className="text-slate-400 text-xs">ลม</TableHead>
                          <TableHead className="text-slate-400 text-xs">EUI</TableHead>
                          <TableHead className="text-slate-400 text-xs">Carbon</TableHead>
                          <TableHead className="text-slate-400 text-xs">Quality</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {energyRecords.slice(0, 50).map(e => (
                          <TableRow key={e.id} className="border-slate-700/30 hover:bg-slate-800/50">
                            <TableCell className="text-xs text-emerald-400 font-mono">{e.buildingId}</TableCell>
                            <TableCell className="text-xs text-slate-300">{new Date(e.recordDate).toLocaleString('th-TH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</TableCell>
                            <TableCell className="text-xs text-white text-right">{e.electricityKwh}</TableCell>
                            <TableCell className="text-xs text-amber-400 text-right">{e.solarGeneration}</TableCell>
                            <TableCell className="text-xs text-sky-400 text-right">{e.windGeneration}</TableCell>
                            <TableCell className="text-xs text-white text-right">{e.eui}</TableCell>
                            <TableCell className="text-xs text-emerald-400 text-right">{e.carbonEmission}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={`text-[9px] px-1 py-0 ${qualityBadge[e.qualityFlag] || ''}`}>
                                {e.qualityFlag}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Add Energy Dialog */}
              <Dialog open={showAddEnergy} onOpenChange={setShowAddEnergy}>
                <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-lg">
                  <DialogHeader>
                    <DialogTitle className="text-white">เพิ่มบันทึกพลังงาน</DialogTitle>
                    <DialogDescription className="text-slate-400">ระบบจะคำนวณ EUI, Carbon Emission และ Integrity Hash อัตโนมัติ</DialogDescription>
                  </DialogHeader>
                  <div className="grid grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto p-1">
                    <div className="space-y-1 col-span-2">
                      <Label className="text-xs text-slate-300">อาคาร *</Label>
                      <Select value={newEnergy.buildingId} onValueChange={v => setNewEnergy({ ...newEnergy, buildingId: v })}>
                        <SelectTrigger className="bg-slate-800 border-slate-600 text-white text-xs"><SelectValue placeholder="เลือกอาคาร" /></SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-600">
                          {buildings.map(b => <SelectItem key={b.buildingId} value={b.buildingId} className="text-xs text-white">{b.buildingId} - {b.nameTh || b.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-slate-300">วันที่บันทึก *</Label>
                      <Input type="datetime-local" value={newEnergy.recordDate} onChange={e => setNewEnergy({ ...newEnergy, recordDate: e.target.value })} className="bg-slate-800 border-slate-600 text-white text-xs" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-slate-300">ประเภทบันทึก</Label>
                      <Select value={newEnergy.recordType} onValueChange={v => setNewEnergy({ ...newEnergy, recordType: v })}>
                        <SelectTrigger className="bg-slate-800 border-slate-600 text-white text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-600">
                          <SelectItem value="HOURLY" className="text-xs text-white">รายชั่วโมง</SelectItem>
                          <SelectItem value="DAILY" className="text-xs text-white">รายวัน</SelectItem>
                          <SelectItem value="MONTHLY" className="text-xs text-white">รายเดือน</SelectItem>
                          <SelectItem value="YEARLY" className="text-xs text-white">รายปี</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-slate-300">ไฟฟ้ากริด (kWh)</Label>
                      <Input type="number" value={newEnergy.electricityKwh} onChange={e => setNewEnergy({ ...newEnergy, electricityKwh: parseFloat(e.target.value) || 0 })} className="bg-slate-800 border-slate-600 text-white text-xs" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-slate-300">HVAC (kWh)</Label>
                      <Input type="number" value={newEnergy.hvacKwh} onChange={e => setNewEnergy({ ...newEnergy, hvacKwh: parseFloat(e.target.value) || 0 })} className="bg-slate-800 border-slate-600 text-white text-xs" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-slate-300">แสงสว่าง (kWh)</Label>
                      <Input type="number" value={newEnergy.lightingKwh} onChange={e => setNewEnergy({ ...newEnergy, lightingKwh: parseFloat(e.target.value) || 0 })} className="bg-slate-800 border-slate-600 text-white text-xs" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-slate-300">อุปกรณ์ (kWh)</Label>
                      <Input type="number" value={newEnergy.equipmentKwh} onChange={e => setNewEnergy({ ...newEnergy, equipmentKwh: parseFloat(e.target.value) || 0 })} className="bg-slate-800 border-slate-600 text-white text-xs" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-slate-300">โซลาร์ (kWh)</Label>
                      <Input type="number" value={newEnergy.solarGeneration} onChange={e => setNewEnergy({ ...newEnergy, solarGeneration: parseFloat(e.target.value) || 0 })} className="bg-slate-800 border-slate-600 text-white text-xs" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-slate-300">ลม (kWh)</Label>
                      <Input type="number" value={newEnergy.windGeneration} onChange={e => setNewEnergy({ ...newEnergy, windGeneration: parseFloat(e.target.value) || 0 })} className="bg-slate-800 border-slate-600 text-white text-xs" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-slate-300">แก๊ส (m³)</Label>
                      <Input type="number" value={newEnergy.gasUsage} onChange={e => setNewEnergy({ ...newEnergy, gasUsage: parseFloat(e.target.value) || 0 })} className="bg-slate-800 border-slate-600 text-white text-xs" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-slate-300">น้ำ (m³)</Label>
                      <Input type="number" value={newEnergy.waterUsage} onChange={e => setNewEnergy({ ...newEnergy, waterUsage: parseFloat(e.target.value) || 0 })} className="bg-slate-800 border-slate-600 text-white text-xs" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-slate-300">อุณหภูมิ (°C)</Label>
                      <Input type="number" step="0.1" value={newEnergy.indoorTemp} onChange={e => setNewEnergy({ ...newEnergy, indoorTemp: parseFloat(e.target.value) || 0 })} className="bg-slate-800 border-slate-600 text-white text-xs" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-slate-300">ความชื้น (%)</Label>
                      <Input type="number" value={newEnergy.indoorHumidity} onChange={e => setNewEnergy({ ...newEnergy, indoorHumidity: parseFloat(e.target.value) || 0 })} className="bg-slate-800 border-slate-600 text-white text-xs" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-slate-300">CO₂ (ppm)</Label>
                      <Input type="number" value={newEnergy.co2Level} onChange={e => setNewEnergy({ ...newEnergy, co2Level: parseFloat(e.target.value) || 0 })} className="bg-slate-800 border-slate-600 text-white text-xs" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-slate-300">การใช้พื้นที่ (%)</Label>
                      <Input type="number" value={newEnergy.occupancyRate} onChange={e => setNewEnergy({ ...newEnergy, occupancyRate: parseFloat(e.target.value) || 0 })} className="bg-slate-800 border-slate-600 text-white text-xs" />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowAddEnergy(false)} className="border-slate-600 text-slate-300">ยกเลิก</Button>
                    <Button onClick={handleAddEnergy} className="bg-emerald-600 hover:bg-emerald-700 text-white">บันทึก</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          ) : (
            /* ── Materials Sub-tab ── */
            <div className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Total Embodied Carbon Summary */}
                <Card className="bg-slate-900 border-slate-700/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold text-white">Embodied Carbon รวม</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-3xl font-bold text-amber-400">{totalEmbodiedCarbon.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                    <p className="text-xs text-slate-500">kgCO2e</p>
                    <Separator className="my-3 bg-slate-700/50" />
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between text-slate-400">
                        <span>จำนวนวัสดุ</span>
                        <span className="text-white">{materialRecords.length}</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>วัสดุท้องถิ่น</span>
                        <span className="text-emerald-400">{materialRecords.filter(m => m.localSource).length}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Thai Carbon Factor Reference */}
                <Card className="bg-slate-900 border-slate-700/50 lg:col-span-2">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold text-white">ตารางอ้างอิงค่าปัจจัยคาร์บอนไทย</CardTitle>
                    <CardDescription className="text-xs text-slate-400">Thai Carbon Factor Reference (kgCO2e/kg)</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <ScrollArea className="max-h-52">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-slate-700/50 hover:bg-transparent">
                            <TableHead className="text-slate-400 text-[10px]">วัสดุ (TH)</TableHead>
                            <TableHead className="text-slate-400 text-[10px]">รหัส</TableHead>
                            <TableHead className="text-slate-400 text-[10px]">ค่าปัจจัย</TableHead>
                            <TableHead className="text-slate-400 text-[10px]">หน่วย</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {Object.entries(THAI_CARBON_FACTORS).slice(0, 15).map(([key, val]) => (
                            <TableRow key={key} className="border-slate-700/30 hover:bg-slate-800/50">
                              <TableCell className="text-[10px] text-white">{val.nameTh}</TableCell>
                              <TableCell className="text-[10px] text-slate-400 font-mono">{key}</TableCell>
                              <TableCell className="text-[10px] text-emerald-400 font-medium text-right">{val.factor}</TableCell>
                              <TableCell className="text-[10px] text-slate-400">{val.unit}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>

              {/* Material Table */}
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white">บันทึกวัสดุก่อสร้าง</h3>
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => { setNewMaterial({ ...newMaterial, buildingId: buildings[0]?.buildingId || '' }); setShowAddMaterial(true); }}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> เพิ่มวัสดุ
                </Button>
              </div>
              <Card className="bg-slate-900 border-slate-700/50">
                <CardContent className="p-0">
                  <ScrollArea className="max-h-96">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-slate-700/50 hover:bg-transparent">
                          <TableHead className="text-slate-400 text-xs">อาคาร</TableHead>
                          <TableHead className="text-slate-400 text-xs">วัสดุ</TableHead>
                          <TableHead className="text-slate-400 text-xs">ประเภท</TableHead>
                          <TableHead className="text-slate-400 text-xs">ปริมาณ</TableHead>
                          <TableHead className="text-slate-400 text-xs">Carbon Factor</TableHead>
                          <TableHead className="text-slate-400 text-xs">Embodied Carbon</TableHead>
                          <TableHead className="text-slate-400 text-xs">รีไซเคิล</TableHead>
                          <TableHead className="text-slate-400 text-xs">ท้องถิ่น</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {materialRecords.slice(0, 50).map(m => (
                          <TableRow key={m.id} className="border-slate-700/30 hover:bg-slate-800/50">
                            <TableCell className="text-xs text-emerald-400 font-mono">{m.buildingId}</TableCell>
                            <TableCell className="text-xs text-white">{m.materialNameTh || m.materialName}</TableCell>
                            <TableCell className="text-xs text-slate-300">{MATERIAL_CATEGORIES.find(c => c.value === m.category)?.label || m.category}</TableCell>
                            <TableCell className="text-xs text-slate-300 text-right">{m.quantity.toLocaleString()} {m.unit}</TableCell>
                            <TableCell className="text-xs text-slate-300 text-right">{m.carbonFactor}</TableCell>
                            <TableCell className="text-xs text-amber-400 text-right font-medium">{m.embodiedCarbon.toLocaleString(undefined, { maximumFractionDigits: 1 })}</TableCell>
                            <TableCell className="text-xs text-slate-300 text-right">{m.recycledContent}%</TableCell>
                            <TableCell>
                              {m.localSource ? <CheckCircle className="h-3.5 w-3.5 text-emerald-400" /> : <span className="text-slate-500 text-xs">—</span>}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Add Material Dialog */}
              <Dialog open={showAddMaterial} onOpenChange={setShowAddMaterial}>
                <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-lg">
                  <DialogHeader>
                    <DialogTitle className="text-white">เพิ่มวัสดุก่อสร้าง</DialogTitle>
                    <DialogDescription className="text-slate-400">ระบบจะคำนวณ Embodied Carbon อัตโนมัติ</DialogDescription>
                  </DialogHeader>
                  <div className="grid grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto p-1">
                    <div className="space-y-1 col-span-2">
                      <Label className="text-xs text-slate-300">อาคาร *</Label>
                      <Select value={newMaterial.buildingId} onValueChange={v => setNewMaterial({ ...newMaterial, buildingId: v })}>
                        <SelectTrigger className="bg-slate-800 border-slate-600 text-white text-xs"><SelectValue placeholder="เลือกอาคาร" /></SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-600">
                          {buildings.map(b => <SelectItem key={b.buildingId} value={b.buildingId} className="text-xs text-white">{b.buildingId} - {b.nameTh || b.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-slate-300">ชื่อวัสดุ (EN) *</Label>
                      <Select value={newMaterial.materialName} onValueChange={v => {
                        const ref = THAI_CARBON_FACTORS[v];
                        setNewMaterial({
                          ...newMaterial,
                          materialName: v,
                          materialNameTh: ref?.nameTh || newMaterial.materialNameTh,
                          carbonFactor: ref?.factor || newMaterial.carbonFactor,
                          unit: ref?.unit || newMaterial.unit,
                        });
                      }}>
                        <SelectTrigger className="bg-slate-800 border-slate-600 text-white text-xs"><SelectValue placeholder="เลือกวัสดุ" /></SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-600 max-h-60">
                          {Object.entries(THAI_CARBON_FACTORS).map(([key, val]) => (
                            <SelectItem key={key} value={key} className="text-xs text-white">{val.nameTh} ({key})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-slate-300">ชื่อวัสดุ (TH)</Label>
                      <Input value={newMaterial.materialNameTh} onChange={e => setNewMaterial({ ...newMaterial, materialNameTh: e.target.value })} className="bg-slate-800 border-slate-600 text-white text-xs" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-slate-300">ประเภท</Label>
                      <Select value={newMaterial.category} onValueChange={v => setNewMaterial({ ...newMaterial, category: v })}>
                        <SelectTrigger className="bg-slate-800 border-slate-600 text-white text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-600">
                          {MATERIAL_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value} className="text-xs text-white">{c.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-slate-300">ปริมาณ *</Label>
                      <Input type="number" value={newMaterial.quantity} onChange={e => setNewMaterial({ ...newMaterial, quantity: parseFloat(e.target.value) || 0 })} className="bg-slate-800 border-slate-600 text-white text-xs" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-slate-300">หน่วย</Label>
                      <Input value={newMaterial.unit} onChange={e => setNewMaterial({ ...newMaterial, unit: e.target.value })} className="bg-slate-800 border-slate-600 text-white text-xs" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-slate-300">Carbon Factor (kgCO2e/{newMaterial.unit})</Label>
                      <Input type="number" step="0.001" value={newMaterial.carbonFactor} onChange={e => setNewMaterial({ ...newMaterial, carbonFactor: parseFloat(e.target.value) || 0 })} className="bg-slate-800 border-slate-600 text-white text-xs" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-slate-300">รีไซเคิล (%)</Label>
                      <Input type="number" value={newMaterial.recycledContent} onChange={e => setNewMaterial({ ...newMaterial, recycledContent: parseFloat(e.target.value) || 0 })} className="bg-slate-800 border-slate-600 text-white text-xs" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-slate-300">ผู้จัดหา</Label>
                      <Input value={newMaterial.supplier} onChange={e => setNewMaterial({ ...newMaterial, supplier: e.target.value })} className="bg-slate-800 border-slate-600 text-white text-xs" />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowAddMaterial(false)} className="border-slate-600 text-slate-300">ยกเลิก</Button>
                    <Button onClick={handleAddMaterial} className="bg-emerald-600 hover:bg-emerald-700 text-white">บันทึก</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════════
            TAB 4: คำนวณคาร์บอน (Calculator)
        ═══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="calculator" className="space-y-4">
          {/* Calculator Input */}
          <Card className="bg-slate-900 border-slate-700/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
                <Calculator className="h-4 w-4 text-emerald-400" /> คำนวณเครดิตคาร์บอน — T-VER-BLDG-01
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">เลือกอาคารและช่วงเวลาติดตามเพื่อคำนวณเครดิตคาร์บอน</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                <div className="space-y-1">
                  <Label className="text-xs text-slate-300">เลือกอาคาร *</Label>
                  <Select value={calcBuildingId} onValueChange={setCalcBuildingId}>
                    <SelectTrigger className="bg-slate-800 border-slate-600 text-white text-xs"><SelectValue placeholder="เลือกอาคาร" /></SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-600">
                      {buildings.map(b => <SelectItem key={b.buildingId} value={b.buildingId} className="text-xs text-white">{b.buildingId} - {b.nameTh || b.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-300">วันที่เริ่มติดตาม</Label>
                  <Input type="date" value={calcStartDate} onChange={e => setCalcStartDate(e.target.value)} className="bg-slate-800 border-slate-600 text-white text-xs" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-300">วันที่สิ้นสุด</Label>
                  <Input type="date" value={calcEndDate} onChange={e => setCalcEndDate(e.target.value)} className="bg-slate-800 border-slate-600 text-white text-xs" />
                </div>
                <Button onClick={handleCalculate} disabled={!calcBuildingId || calcLoading} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  {calcLoading ? <RefreshCw className="h-4 w-4 animate-spin mr-1" /> : <Calculator className="h-4 w-4 mr-1" />}
                  คำนวณ
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Calculation Results */}
          {calcResult && (
            <div className="space-y-4">
              {/* Emission Reduction Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Card className="bg-slate-900 border-slate-700/50">
                  <CardContent className="p-4">
                    <span className="text-[10px] text-slate-400">การลดการปล่อย (Baseline - Project)</span>
                    <p className="text-xl font-bold text-emerald-400 mt-1">{calcResult.emissionCalculation.emissionReduction.value.toFixed(2)}</p>
                    <p className="text-[10px] text-slate-500">tCO2e/yr</p>
                  </CardContent>
                </Card>
                <Card className="bg-slate-900 border-slate-700/50">
                  <CardContent className="p-4">
                    <span className="text-[10px] text-slate-400">EUI Improvement</span>
                    <p className="text-xl font-bold text-sky-400 mt-1">{calcResult.euiCalculation.improvement.absolute.toFixed(1)}</p>
                    <p className="text-[10px] text-slate-500">kWh/m²/yr ({calcResult.euiCalculation.improvement.percentage.toFixed(1)}%)</p>
                  </CardContent>
                </Card>
                <Card className="bg-slate-900 border-slate-700/50">
                  <CardContent className="p-4">
                    <span className="text-[10px] text-slate-400">หัก Buffer 15%</span>
                    <p className="text-xl font-bold text-amber-400 mt-1">{calcResult.carbonCreditCalculation.bufferDeduction.value.toFixed(2)}</p>
                    <p className="text-[10px] text-slate-500">tCO2e (T-VER-BLDG-01)</p>
                  </CardContent>
                </Card>
                <Card className="bg-slate-900 border-emerald-700/50 border">
                  <CardContent className="p-4">
                    <span className="text-[10px] text-emerald-400">เครดิตคาร์บอนสุทธิ</span>
                    <p className="text-2xl font-bold text-emerald-400 mt-1">{calcResult.carbonCreditCalculation.carbonCredits.value.toFixed(2)}</p>
                    <p className="text-[10px] text-emerald-600">tCO2e/yr</p>
                  </CardContent>
                </Card>
              </div>

              {/* Green Building Score */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Score Breakdown Bar Chart */}
                <Card className="bg-slate-900 border-slate-700/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold text-white">Green Building Score — ส่วนประกอบ</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart
                        data={[
                          { name: 'พลังงาน', คะแนน: Math.round(calcResult.greenBuildingScore.breakdown.energyEfficiency.score), น้ำหนัก: 35 },
                          { name: 'หมุนเวียน', คะแนน: Math.round(calcResult.greenBuildingScore.breakdown.renewableEnergy.score), น้ำหนัก: 20 },
                          { name: 'น้ำ', คะแนน: Math.round(calcResult.greenBuildingScore.breakdown.waterEfficiency.score), น้ำหนัก: 15 },
                          { name: 'วัสดุ', คะแนน: Math.round(calcResult.greenBuildingScore.breakdown.materialSustainability.score), น้ำหนัก: 15 },
                          { name: 'พื้นที่สีเขียว', คะแนน: Math.round(calcResult.greenBuildingScore.breakdown.greenArea.score), น้ำหนัก: 15 },
                        ]}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                        <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} domain={[0, 100]} />
                        <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: 8, color: '#f1f5f9' }} />
                        <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
                        <Bar dataKey="คะแนน" fill="#10b981" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="น้ำหนัก" fill="#475569" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Radial Progress + Level */}
                <Card className="bg-slate-900 border-slate-700/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold text-white">คะแนนรวม & ระดับรับรอง</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex flex-col items-center gap-4">
                      {/* Radial Score Indicator */}
                      <div className="relative w-48 h-48">
                        <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                          <circle cx="60" cy="60" r="52" fill="none" stroke="#334155" strokeWidth="8" />
                          <circle
                            cx="60" cy="60" r="52" fill="none"
                            stroke={calcResult.greenBuildingScore.totalScore >= 80 ? '#10b981' : calcResult.greenBuildingScore.totalScore >= 65 ? '#f59e0b' : calcResult.greenBuildingScore.totalScore >= 50 ? '#06b6d4' : calcResult.greenBuildingScore.totalScore >= 35 ? '#3b82f6' : '#94a3b8'}
                            strokeWidth="8"
                            strokeDasharray={`${(calcResult.greenBuildingScore.totalScore / 100) * 326.73} 326.73`}
                            strokeLinecap="round"
                          />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-3xl font-bold text-white">{calcResult.greenBuildingScore.totalScore.toFixed(0)}</span>
                          <span className="text-[10px] text-slate-400">/ 100</span>
                        </div>
                      </div>
                      {/* Level Badge */}
                      <Badge variant="outline" className={`text-sm px-4 py-1 ${certLevelBadge[calcResult.greenBuildingScore.level] || ''}`}>
                        ระดับ: {calcResult.greenBuildingScore.level}
                      </Badge>
                      {/* Breakdown list */}
                      <div className="w-full space-y-2">
                        {[
                          { label: 'ประสิทธิภาพพลังงาน (35%)', score: calcResult.greenBuildingScore.breakdown.energyEfficiency.score },
                          { label: 'พลังงานหมุนเวียน (20%)', score: calcResult.greenBuildingScore.breakdown.renewableEnergy.score },
                          { label: 'ประสิทธิภาพน้ำ (15%)', score: calcResult.greenBuildingScore.breakdown.waterEfficiency.score },
                          { label: 'วัสดุยั่งยืน (15%)', score: calcResult.greenBuildingScore.breakdown.materialSustainability.score },
                          { label: 'พื้นที่สีเขียว (15%)', score: calcResult.greenBuildingScore.breakdown.greenArea.score },
                        ].map((item, i) => (
                          <div key={i} className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-400">{item.label}</span>
                              <span className="text-white font-medium">{item.score.toFixed(1)}</span>
                            </div>
                            <Progress value={item.score} className="h-1.5 bg-slate-700 [&>div]:bg-emerald-500" />
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Detailed Calculation Info */}
              <Card className="bg-slate-900 border-slate-700/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-white">รายละเอียดการคำนวณ</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="space-y-2">
                      <h4 className="font-semibold text-emerald-400">การคำนวณการปล่อย</h4>
                      <div className="bg-slate-800/50 p-2 rounded text-slate-300">
                        <p>Baseline: {calcResult.emissionCalculation.baselineEmission.value} tCO2e/yr</p>
                        <p className="text-slate-500 mt-1 text-[10px]">{calcResult.emissionCalculation.baselineEmission.formula}</p>
                      </div>
                      <div className="bg-slate-800/50 p-2 rounded text-slate-300">
                        <p>Project: {calcResult.emissionCalculation.projectEmission.value} tCO2e/yr</p>
                        <p className="text-slate-500 mt-1 text-[10px]">{calcResult.emissionCalculation.projectEmission.formula}</p>
                      </div>
                      <div className="bg-emerald-900/20 border border-emerald-700/30 p-2 rounded text-emerald-300">
                        <p>การลดการปล่อย: {calcResult.emissionCalculation.emissionReduction.value} tCO2e/yr</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-semibold text-emerald-400">เครดิตคาร์บอน (T-VER-BLDG-01)</h4>
                      <div className="bg-slate-800/50 p-2 rounded text-slate-300">
                        <p>ก่อนหัก Buffer: {calcResult.carbonCreditCalculation.grossEmissionReduction.value} tCO2e</p>
                      </div>
                      <div className="bg-slate-800/50 p-2 rounded text-slate-300">
                        <p>หัก Buffer ({calcResult.carbonCreditCalculation.bufferDeduction.percentage}): {calcResult.carbonCreditCalculation.bufferDeduction.value} tCO2e</p>
                        <p className="text-slate-500 mt-1 text-[10px]">{calcResult.carbonCreditCalculation.bufferDeduction.formula}</p>
                      </div>
                      <div className="bg-emerald-900/20 border border-emerald-700/30 p-2 rounded text-emerald-300">
                        <p>เครดิตสุทธิ: {calcResult.carbonCreditCalculation.carbonCredits.value} tCO2e</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════════
            TAB 5: รับรอง (Certification)
        ═══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="certification" className="space-y-4">
          <h2 className="text-lg font-semibold text-white">ระบบรับรองอาคารคาร์บอนต่ำ</h2>

          {/* Eligible Buildings */}
          <Card className="bg-slate-900 border-slate-700/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-white">อาคารที่มีสิทธิ์รับรอง</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <ScrollArea className="max-h-64">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-700/50 hover:bg-transparent">
                      <TableHead className="text-slate-400 text-xs">อาคาร</TableHead>
                      <TableHead className="text-slate-400 text-xs">จังหวัด</TableHead>
                      <TableHead className="text-slate-400 text-xs">มาตรฐาน</TableHead>
                      <TableHead className="text-slate-400 text-xs">ระดับปัจจุบัน</TableHead>
                      <TableHead className="text-slate-400 text-xs">ระดับแนะนำ</TableHead>
                      <TableHead className="text-slate-400 text-xs">คะแนน</TableHead>
                      <TableHead className="text-slate-400 text-xs">สถานะ</TableHead>
                      <TableHead className="text-slate-400 text-xs">การดำเนินการ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {certificationList.map(c => (
                      <TableRow key={c.buildingId} className="border-slate-700/30 hover:bg-slate-800/50">
                        <TableCell className="text-xs text-white font-medium">{c.buildingName}</TableCell>
                        <TableCell className="text-xs text-slate-300">{c.province}</TableCell>
                        <TableCell className="text-xs text-slate-300">{c.certificationStd}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${certLevelBadge[c.currentLevel] || ''}`}>{c.currentLevel}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${certLevelBadge[c.recommendedLevel] || ''}`}>{c.recommendedLevel}</Badge>
                        </TableCell>
                        <TableCell className="text-xs text-white text-right">{c.greenScore}</TableCell>
                        <TableCell>
                          {c.eligible ? (
                            <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">พร้อมรับรอง</Badge>
                          ) : (
                            <Badge className="bg-amber-100 text-amber-700 text-[10px]">รอข้อมูล</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-emerald-600/50 text-emerald-400 hover:bg-emerald-600/10 text-[10px] h-6"
                            disabled={!c.eligible}
                            onClick={() => handleCertify(c)}
                          >
                            <FileCheck className="h-3 w-3 mr-1" /> รับรอง
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Certification Requirements Checklist */}
          <Card className="bg-slate-900 border-slate-700/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-white">เงื่อนไขการรับรอง</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* TGBI Requirements */}
                <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/30">
                  <h4 className="text-xs font-semibold text-emerald-400 mb-2">TGBI — สถาบันอาคารเขียวไทย</h4>
                  <ul className="space-y-1.5 text-[10px] text-slate-300">
                    {[
                      'EUI ต่ำกว่าค่าอ้างอิง 25% ขึ้นไป',
                      'พลังงานหมุนเวียน ≥ 10%',
                      'ลดการใช้น้ำ ≥ 20%',
                      'วัสดุท้องถิ่น ≥ 30%',
                      'พื้นที่สีเขียว ≥ 15% ของพื้นที่ทั้งหมด',
                      'ระบบ BMS หรือระบบติดตามอัตโนมัติ',
                      'รายงานพลังงานรายปี ≥ 1 ปี',
                    ].map((req, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <CheckCircle className="h-3 w-3 text-emerald-500 mt-0.5 shrink-0" />
                        <span>{req}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                {/* LEED Requirements */}
                <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/30">
                  <h4 className="text-xs font-semibold text-sky-400 mb-2">LEED — Leadership in Energy</h4>
                  <ul className="space-y-1.5 text-[10px] text-slate-300">
                    {[
                      'Energy & Atmosphere ≥ 30 คะแนน',
                      'Water Efficiency ≥ 10 คะแนน',
                      'Materials & Resources ≥ 8 คะแนน',
                      'Indoor Environmental Quality ≥ 12 คะแนน',
                      'Sustainable Sites ≥ 10 คะแนน',
                      'Innovation in Design ≥ 5 คะแนน',
                      'Regional Priority ≥ 4 คะแนน',
                    ].map((req, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <CheckCircle className="h-3 w-3 text-sky-500 mt-0.5 shrink-0" />
                        <span>{req}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                {/* EDGE Requirements */}
                <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/30">
                  <h4 className="text-xs font-semibold text-amber-400 mb-2">EDGE — Excellence in Design</h4>
                  <ul className="space-y-1.5 text-[10px] text-slate-300">
                    {[
                      'ลดการใช้พลังงาน ≥ 20%',
                      'ลดการใช้น้ำ ≥ 20%',
                      'ลด embodied energy วัสดุ ≥ 20%',
                      'มีข้อมูลพลังงาน ≥ 12 เดือน',
                      'คำนวณตาม EDGE App',
                      'ผ่านการตรวจสอบจาก EDGE Auditor',
                      'ชำระค่ารับรองตามกำหนด',
                    ].map((req, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <CheckCircle className="h-3 w-3 text-amber-500 mt-0.5 shrink-0" />
                        <span>{req}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Certification History */}
          <Card className="bg-slate-900 border-slate-700/50">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-white">ประวัติการรับรอง</CardTitle>
                <Button size="sm" variant="outline" className="border-slate-600 text-slate-300 text-xs h-7" onClick={() => {
                  // Generate report
                  alert('สร้างรายงานการรับรองสำเร็จ — ดาวน์โหลด PDF');
                }}>
                  <Download className="h-3 w-3 mr-1" /> สร้างรายงาน
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {certHistory.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-sm">
                  <FileCheck className="h-8 w-8 mx-auto mb-2 text-slate-600" />
                  ยังไม่มีประวัติการรับรอง — กดปุ่ม "รับรอง" เพื่อออกใบรับรอง
                </div>
              ) : (
                <ScrollArea className="max-h-64">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-slate-700/50 hover:bg-transparent">
                        <TableHead className="text-slate-400 text-xs">วันที่</TableHead>
                        <TableHead className="text-slate-400 text-xs">อาคาร</TableHead>
                        <TableHead className="text-slate-400 text-xs">รหัส</TableHead>
                        <TableHead className="text-slate-400 text-xs">มาตรฐาน</TableHead>
                        <TableHead className="text-slate-400 text-xs">ระดับ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {certHistory.map((h, i) => (
                        <TableRow key={i} className="border-slate-700/30 hover:bg-slate-800/50">
                          <TableCell className="text-xs text-slate-300">{h.date}</TableCell>
                          <TableCell className="text-xs text-white">{h.name}</TableCell>
                          <TableCell className="text-xs text-emerald-400 font-mono">{h.buildingId}</TableCell>
                          <TableCell className="text-xs text-slate-300">{h.std}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${certLevelBadge[h.level] || ''}`}>{h.level}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          {/* Certification Workflow */}
          <Card className="bg-slate-900 border-slate-700/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-white">ขั้นตอนการรับรอง</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
                {[
                  { icon: Search, label: '1. เลือกอาคาร', desc: 'เลือกอาคารที่ต้องการรับรอง', color: 'text-sky-400' },
                  { icon: Activity, label: '2. ตรวจสอบข้อมูล', desc: 'ตรวจสอบข้อมูลพลังงานและวัสดุ', color: 'text-amber-400' },
                  { icon: Calculator, label: '3. คำนวณเครดิต', desc: 'คำนวณเครดิตคาร์บอนตามระเบียบวิธี', color: 'text-emerald-400' },
                  { icon: FileCheck, label: '4. ออกใบรับรอง', desc: 'ออกใบรับรองระดับที่เหมาะสม', color: 'text-teal-400' },
                ].map((step, i) => (
                  <React.Fragment key={i}>
                    <div className="flex-1 bg-slate-800/50 p-3 rounded-lg border border-slate-700/30 text-center">
                      <step.icon className={`h-5 w-5 mx-auto mb-1.5 ${step.color}`} />
                      <p className="text-xs font-semibold text-white">{step.label}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{step.desc}</p>
                    </div>
                    {i < 3 && <ArrowRight className="h-4 w-4 text-slate-600 hidden md:block shrink-0" />}
                  </React.Fragment>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
