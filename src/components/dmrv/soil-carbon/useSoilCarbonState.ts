'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { SoilCarbonPlot, SoilCarbonMeasurement, TerraceLayer, CheckDam, SedimentCalcResult, CertificationRecord } from './types';
import { CHECK_DAM_TYPE_OPTIONS, generateMockTerraces, generateMockCheckDams } from './constants';

export function useSoilCarbonState() {
  // ── State ──
  const [plots, setPlots] = useState<SoilCarbonPlot[]>([]);
  const [measurements, setMeasurements] = useState<SoilCarbonMeasurement[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [expandedPlot, setExpandedPlot] = useState<string | null>(null);
  const [plotMeasurements, setPlotMeasurements] = useState<SoilCarbonMeasurement[]>([]);

  const [terraces, setTerraces] = useState<TerraceLayer[]>([]);
  const [checkDams, setCheckDams] = useState<CheckDam[]>([]);
  const [plotTerraces, setPlotTerraces] = useState<TerraceLayer[]>([]);
  const [plotCheckDams, setPlotCheckDams] = useState<CheckDam[]>([]);

  const [showNewPlotDialog, setShowNewPlotDialog] = useState(false);
  const [newPlotForm, setNewPlotForm] = useState({
    plotId: '', name: '', nameTh: '', province: '', areaRai: '',
    landUseType: 'terraced', soilType: '', cropType: '',
    practiceType: 'terraced_farming', methodology: 'T-VER-SOIL-01',
    altitudeMasl: '', slopeDegree: '', slopeAspect: 'N',
    terraceCount: '5', terraceWidthM: '', terraceHeightM: '',
    checkDamCount: '5', checkDamType: 'stone',
    baselineSediment: '', projectSediment: '',
  });
  const [creatingPlot, setCreatingPlot] = useState(false);

  const [batchData, setBatchData] = useState('');
  const [ingesting, setIngesting] = useState(false);
  const [ingestResult, setIngestResult] = useState<any>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [selectedTerraceLayer, setSelectedTerraceLayer] = useState<string>('all');

  const [calcPlotId, setCalcPlotId] = useState('');
  const [calcStartDate, setCalcStartDate] = useState('');
  const [calcEndDate, setCalcEndDate] = useState('');
  const [calculating, setCalculating] = useState(false);
  const [calcResult, setCalcResult] = useState<SedimentCalcResult | null>(null);
  const [calcDetail, setCalcDetail] = useState<SedimentCalcResult | null>(null);

  const [certHistory, setCertHistory] = useState<CertificationRecord[]>([]);
  const [certStep, setCertStep] = useState<Record<string, number>>({});
  const [certChecklist, setCertChecklist] = useState<Record<string, Record<string, boolean>>>({});

  const [provinceFilter, setProvinceFilter] = useState<string>('all');

  // ── Data Fetching ──
  const fetchPlots = useCallback(async () => {
    try {
      const res = await fetch('/api/soil-carbon/plots');
      const json = await res.json();
      if (json.success) {
        setPlots(json.data || []);
        if (!json.data || json.data.length === 0) {
          await fetch('/api/soil-carbon/sample?seed=true');
          const res2 = await fetch('/api/soil-carbon/plots');
          const json2 = await res2.json();
          if (json2.success) setPlots(json2.data || []);
        }
      }
    } catch (err) { console.error('Failed to fetch plots:', err); }
  }, []);

  const fetchMeasurements = useCallback(async (plotId?: string) => {
    try {
      const url = plotId
        ? `/api/soil-carbon/measurements?plotId=${plotId}&limit=50`
        : '/api/soil-carbon/measurements?limit=100';
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) setMeasurements(json.data || []);
    } catch (err) { console.error('Failed to fetch measurements:', err); }
  }, []);

  const fetchPlotMeasurements = useCallback(async (plotId: string) => {
    try {
      const res = await fetch(`/api/soil-carbon/measurements?plotId=${plotId}&limit=20`);
      const json = await res.json();
      if (json.success) setPlotMeasurements(json.data || []);
    } catch (err) { console.error('Failed to fetch plot measurements:', err); }
  }, []);

  const fetchTerraces = useCallback(async (plotId?: string) => {
    try {
      const url = plotId ? `/api/soil-carbon/terraces?plotId=${plotId}` : '/api/soil-carbon/terraces';
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) {
        if (plotId) setPlotTerraces(json.data || []);
        else setTerraces(json.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch terraces:', err);
      if (plotId) setPlotTerraces(generateMockTerraces(plotId));
      else setTerraces(generateMockTerraces('ALL'));
    }
  }, []);

  const fetchCheckDams = useCallback(async (plotId?: string) => {
    try {
      const url = plotId ? `/api/soil-carbon/check-dams?plotId=${plotId}` : '/api/soil-carbon/check-dams';
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) {
        if (plotId) setPlotCheckDams(json.data || []);
        else setCheckDams(json.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch check dams:', err);
      if (plotId) setPlotCheckDams(generateMockCheckDams(plotId));
      else setCheckDams(generateMockCheckDams('ALL'));
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await fetchPlots();
      await fetchMeasurements();
      await fetchTerraces();
      await fetchCheckDams();
      setLoading(false);
    };
    init();
  }, [fetchPlots, fetchMeasurements, fetchTerraces, fetchCheckDams]);

  useEffect(() => {
    if (!autoRefresh || activeTab !== 'ingestion') return;
    const interval = setInterval(() => { fetchMeasurements(); }, 10000);
    return () => clearInterval(interval);
  }, [autoRefresh, activeTab, fetchMeasurements]);

  // ── Computed Data ──
  const summary = useMemo(() => {
    const totalPlots = plots.length;
    const monitoringPlots = plots.filter(p => ['MONITORING', 'VERIFIED', 'CERTIFIED'].includes(p.status)).length;
    const totalEmissionReduction = plots.reduce((s, p) => s + (p.emissionReduction || 0), 0);
    const totalAreaHa = plots.reduce((s, p) => s + (p.areaHa || 0), 0);
    const totalTerraceCount = plots.reduce((s, p) => s + (p.terraceCount || 5), 0);
    const totalSedimentTrapped = terraces.reduce((s, t) => s + (t.sedimentTrappedKg || 0), 0) / 1000;
    const slashAndBurnPlots = plots.filter(p => (p as any).previousLandUse === 'slash_and_burn').length;
    const totalVetiverArea = terraces.reduce((s, t) => s + (t.ridgeWidthM || 0) * (t.vetiverGrassStatus !== 'NONE' ? 1 : 0), 0);
    const totalVetiverCarbon = terraces.reduce((s, t) => s + (t.vetiverCarbonSequestrationKg || 0), 0);
    const estimatedCredits = plots.reduce((s, p) => {
      const deltaSOC = (p.projectSOC || 0) - (p.baselineSOC || 0);
      const socCredits = deltaSOC * (44 / 12) * (p.areaHa || 0) * (p.monitoringYear || 1);
      const emissionRed = (p.emissionReduction || 0) * (p.monitoringYear || 1);
      const sedimentCredits = (p.baselineSediment && p.projectSediment)
        ? ((p.baselineSediment - p.projectSediment) * 0.02 * (44 / 12) * (p.areaHa || 0))
        : 0;
      const gross = socCredits + emissionRed + sedimentCredits;
      return s + gross * 0.8;
    }, 0);
    return { totalPlots, monitoringPlots, totalEmissionReduction, totalAreaHa, estimatedCredits, totalTerraceCount, totalSedimentTrapped, slashAndBurnPlots, totalVetiverArea, totalVetiverCarbon };
  }, [plots, terraces]);

  const sedimentByLayerData = useMemo(() => {
    if (terraces.length === 0) {
      return [1, 2, 3, 4, 5].map(i => ({
        layer: `ชั้น ${i}`,
        'ตะกอนที่กักได้': +(50 + i * 30).toFixed(0),
        'ตะกอนหลังฝาย': +(40 + i * 25).toFixed(0),
        'ตะกอนที่เหลือ': +(10 + i * 5).toFixed(0),
      }));
    }
    const byLayer: Record<number, { trapped: number; behindDam: number; remaining: number }> = {};
    terraces.forEach(t => {
      if (!byLayer[t.layerNumber]) byLayer[t.layerNumber] = { trapped: 0, behindDam: 0, remaining: 0 };
      byLayer[t.layerNumber].trapped += t.sedimentTrappedKg || 0;
      const dam = checkDams.find(d => d.terraceLayerId === t.id);
      byLayer[t.layerNumber].behindDam += dam?.sedimentTrappedKg || (t.sedimentTrappedKg * 0.7) || 0;
      byLayer[t.layerNumber].remaining += (t.sedimentTrappedKg || 0) - (dam?.sedimentTrappedKg || (t.sedimentTrappedKg * 0.7) || 0);
    });
    return Object.entries(byLayer).map(([layer, data]) => ({
      layer: `ชั้น ${layer}`,
      'ตะกอนที่กักได้': +data.trapped.toFixed(0),
      'ตะกอนหลังฝาย': +data.behindDam.toFixed(0),
      'ตะกอนที่เหลือ': +data.remaining.toFixed(0),
    }));
  }, [terraces, checkDams]);

  const waterFlowData = useMemo(() => {
    if (terraces.length === 0) {
      return [1, 2, 3, 4, 5].map(i => ({
        layer: `ชั้น ${i}`, 'น้ำเข้า': +(80 - i * 12).toFixed(0),
        'น้ำออก': +(65 - i * 10).toFixed(0),
        'ลดลง': +((80 - i * 12 - (65 - i * 10)) / (80 - i * 12) * 100).toFixed(1),
      }));
    }
    return terraces.map(t => ({
      layer: `ชั้น ${t.layerNumber}`, 'น้ำเข้า': t.waterFlowInLpm || 0,
      'น้ำออก': t.waterFlowOutLpm || 0,
      'ลดลง': t.waterFlowInLpm > 0 ? +((t.waterFlowInLpm - t.waterFlowOutLpm) / t.waterFlowInLpm * 100).toFixed(1) : 0,
    }));
  }, [terraces]);

  const creditSourceData = useMemo(() => [
    { name: 'SOC Change', value: 30, label: 'การเปลี่ยนแปลง SOC' },
    { name: 'Sediment Trapped', value: 20, label: 'ตะกอนดินที่กักได้' },
    { name: 'Check Dam', value: 12, label: 'ฝายชะลอน้ำ' },
    { name: 'Vetiver Grass', value: 13, label: 'คาร์บอนจากหญ้าแฝก' },
    { name: 'Erosion Prevention', value: 13, label: 'ป้องกันการพังทลาย' },
    { name: 'GHG Reduction', value: 12, label: 'ลดการปล่อย GHG' },
  ], []);

  const latestPlots = useMemo(() => [...plots].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5), [plots]);
  const filteredPlots = useMemo(() => provinceFilter === 'all' ? plots : plots.filter(p => p.province === provinceFilter), [plots, provinceFilter]);
  const provinces = useMemo(() => Array.from(new Set(plots.map(p => p.province).filter(Boolean))).sort(), [plots]);

  const latestSensorData = useMemo(() => {
    if (measurements.length === 0) return null;
    const latest = measurements[0];
    const DropletsIcon = 'Droplets' as any;
    const ThermometerIcon = 'Thermometer' as any;
    const WavesIcon = 'Waves' as any;
    const GaugeIcon = 'Gauge' as any;
    const ArrowDownIcon = 'ArrowDown' as any;
    const MountainIcon = 'Mountain' as any;
    return {
      soil_moisture: { value: latest.soilMoisture, unit: '%', label: 'ความชื้นในดิน', icon: DropletsIcon, min: 0, max: 80 },
      soil_temperature: { value: latest.soilTemperature, unit: '°C', label: 'อุณหภูมิดิน', icon: ThermometerIcon, min: 0, max: 60 },
      sediment_concentration: { value: (latest as any).sedimentConcentration || 2.4, unit: 'g/L', label: 'ความเข้มข้นตะกอน', icon: WavesIcon, min: 0, max: 10 },
      runoff_volume: { value: (latest as any).runoffVolumeL || 125, unit: 'L', label: 'ปริมาณน้ำไหลบ่า', icon: DropletsIcon, min: 0, max: 500 },
      water_flow_rate: { value: (latest as any).waterFlowRate || 48, unit: 'L/min', label: 'อัตราการไหลของน้ำ', icon: GaugeIcon, min: 0, max: 200 },
      infiltration_rate: { value: (latest as any).infiltrationRate || 15, unit: 'mm/hr', label: 'อัตราการซึม', icon: ArrowDownIcon, min: 0, max: 100 },
      erosion_rate: { value: (latest as any).erosionRate || 3.2, unit: 't/ha/yr', label: 'อัตราการพังทลาย', icon: MountainIcon, min: 0, max: 20 },
    };
  }, [measurements]);

  const qualitySummary = useMemo(() => {
    const counts: Record<string, number> = {};
    measurements.forEach(m => { counts[m.qualityFlag] = (counts[m.qualityFlag] || 0) + 1; });
    return counts;
  }, [measurements]);

  const eligiblePlots = useMemo(() => plots.filter(p => ['MONITORING', 'VERIFIED'].includes(p.status)), [plots]);

  // ── Handlers ──
  const handleCreatePlot = async () => {
    setCreatingPlot(true);
    try {
      const areaRai = parseFloat(newPlotForm.areaRai) || 0;
      const res = await fetch('/api/soil-carbon/plots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newPlotForm, areaRai, areaHa: areaRai * 0.16,
          baselineSOC: 25, projectSOC: 30, baselineEmission: 5, projectEmission: 2.5,
          altitudeMasl: parseFloat(newPlotForm.altitudeMasl) || undefined,
          slopeDegree: parseFloat(newPlotForm.slopeDegree) || undefined,
          terraceCount: parseInt(newPlotForm.terraceCount) || 5,
          checkDamCount: parseInt(newPlotForm.checkDamCount) || 5,
          baselineSediment: parseFloat(newPlotForm.baselineSediment) || undefined,
          projectSediment: parseFloat(newPlotForm.projectSediment) || undefined,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setShowNewPlotDialog(false);
        setNewPlotForm({
          plotId: '', name: '', nameTh: '', province: '', areaRai: '',
          landUseType: 'terraced', soilType: '', cropType: '',
          practiceType: 'terraced_farming', methodology: 'T-VER-SOIL-01',
          altitudeMasl: '', slopeDegree: '', slopeAspect: 'N',
          terraceCount: '5', terraceWidthM: '', terraceHeightM: '',
          checkDamCount: '5', checkDamType: 'stone',
          baselineSediment: '', projectSediment: '',
        });
        await fetchPlots();
      }
    } catch (err) { console.error('Failed to create plot:', err); }
    finally { setCreatingPlot(false); }
  };

  const handleIngest = async () => {
    setIngesting(true);
    setIngestResult(null);
    try {
      let readings;
      try { readings = JSON.parse(batchData); } catch {
        const lines = batchData.trim().split('\n');
        const headers = lines[0].split(',').map(h => h.trim());
        readings = lines.slice(1).map(line => {
          const values = line.split(',').map(v => v.trim());
          const obj: Record<string, any> = {};
          headers.forEach((h, i) => { const num = parseFloat(values[i]); obj[h] = isNaN(num) ? values[i] : num; });
          return obj;
        });
      }
      const res = await fetch('/api/soil-carbon/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ readings: readings.map((r: any) => ({ ...r, terraceLayerId: selectedTerraceLayer !== 'all' ? selectedTerraceLayer : r.terraceLayerId })) }),
      });
      const json = await res.json();
      setIngestResult(json);
      if (json.success) await fetchMeasurements();
    } catch (err) { setIngestResult({ success: false, error: 'รูปแบบข้อมูลไม่ถูกต้อง' }); }
    finally { setIngesting(false); }
  };

  const handleCalculate = async () => {
    if (!calcPlotId) return;
    setCalculating(true); setCalcResult(null); setCalcDetail(null);
    try {
      const res = await fetch('/api/soil-carbon/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plotId: calcPlotId, monitoringPeriodStart: calcStartDate || undefined, monitoringPeriodEnd: calcEndDate || undefined, includeDetailReport: true }),
      });
      const json = await res.json();
      if (json.success) {
        const data = json.data;
        const plot = plots.find(p => p.plotId === calcPlotId);
        const plotTerraceData = terraces.filter(t => t.plotId === calcPlotId);
        const plotDamData = checkDams.filter(d => d.plotId === calcPlotId);
        const deltaSOC = (plot?.projectSOC || 30) - (plot?.baselineSOC || 25);
        const areaHa = plot?.areaHa || 4;
        const monitoringYears = data?.monitoringPeriod?.years || 1;
        const socStockChange = deltaSOC * (44 / 12) * areaHa * monitoringYears;
        const totalSediment = plotTerraceData.length > 0 ? plotTerraceData.reduce((s, t) => s + (t.sedimentTrappedKg || 0), 0) / 1000 : (plot?.baselineSediment || 8) - (plot?.projectSediment || 3);
        const avgSocPct = plotTerraceData.length > 0 ? plotTerraceData.reduce((s, t) => s + (t.socPct || 1.5), 0) / plotTerraceData.length / 100 : 0.02;
        const sedimentTrappedCredit = totalSediment * avgSocPct * (44 / 12);
        const totalDamSediment = plotDamData.length > 0 ? plotDamData.reduce((s, d) => s + (d.sedimentTrappedKg || 0), 0) / 1000 : totalSediment * 0.65;
        const checkDamCredit = totalDamSediment * avgSocPct * (44 / 12);
        const erosionPrevention = ((plot?.baselineSediment || 8) - (plot?.projectSediment || 3)) * avgSocPct * (44 / 12);
        const ghgReduction = ((plot?.baselineEmission || 5) - (plot?.projectEmission || 2.5)) * areaHa * monitoringYears;
        const vetiverCarbon = plotTerraceData.length > 0 ? plotTerraceData.reduce((s, t) => s + (t.vetiverCarbonSequestrationKg || 0), 0) / 1000 : generateMockTerraces(calcPlotId).reduce((s, t) => s + (t.vetiverCarbonSequestrationKg || 0), 0) / 1000;
        const grossTotal = socStockChange + sedimentTrappedCredit + checkDamCredit + erosionPrevention + ghgReduction + vetiverCarbon;
        const bufferDeduction = grossTotal * 0.2;
        const netCredits = grossTotal - bufferDeduction;
        const avgFlowIn = plotTerraceData.length > 0 ? plotTerraceData.reduce((s, t) => s + (t.waterFlowInLpm || 0), 0) / plotTerraceData.length : 68;
        const avgFlowOut = plotTerraceData.length > 0 ? plotTerraceData.reduce((s, t) => s + (t.waterFlowOutLpm || 0), 0) / plotTerraceData.length : 45;
        const flowReductionPct = avgFlowIn > 0 ? ((avgFlowIn - avgFlowOut) / avgFlowIn * 100) : 34;
        const runoffReductionLpm = avgFlowIn - avgFlowOut;
        const enrichedData: SedimentCalcResult = {
          ...data,
          socStockChange: { formula: 'ΔSOC × (44/12) × areaHa × years', deltaSOC: +deltaSOC.toFixed(3), molecularRatio: 44 / 12, areaHa, result: +socStockChange.toFixed(3), unit: 'tCO2e' },
          sedimentTrapped: { formula: 'Σ(ตะกอนทุกชั้น) × SOC% × (44/12)', totalSediment: +totalSediment.toFixed(3), socPct: +(avgSocPct * 100).toFixed(2), molecularRatio: 44 / 12, result: +sedimentTrappedCredit.toFixed(3), unit: 'tCO2e',
            byLayer: plotTerraceData.length > 0 ? plotTerraceData.map(t => ({ layer: t.layerNumber, sedimentKg: t.sedimentTrappedKg || 0, socPct: t.socPct || 1.5, credit: +((t.sedimentTrappedKg / 1000) * (t.socPct / 100) * (44 / 12)).toFixed(3) })) : [1, 2, 3, 4, 5].map(i => ({ layer: i, sedimentKg: 50 + i * 30, socPct: +(1.5 + i * 0.3).toFixed(2), credit: +(((50 + i * 30) / 1000) * ((1.5 + i * 0.3) / 100) * (44 / 12)).toFixed(3) })) },
          checkDamCarbon: { formula: 'Σ(ตะกอนหลังฝาย) × (44/12)', totalSedimentBehindDam: +totalDamSediment.toFixed(3), molecularRatio: 44 / 12, result: +checkDamCredit.toFixed(3), unit: 'tCO2e',
            byDam: plotDamData.length > 0 ? plotDamData.map(d => ({ damType: d.damType, sedimentKg: d.sedimentTrappedKg || 0, credit: +((d.sedimentTrappedKg / 1000) * avgSocPct * (44 / 12)).toFixed(3) })) : CHECK_DAM_TYPE_OPTIONS.slice(0, 5).map((opt, i) => ({ damType: opt.value, sedimentKg: 40 + i * 25, credit: +(((40 + i * 25) / 1000) * 0.02 * (44 / 12)).toFixed(3) })) },
          erosionPrevention: { formula: '(baselineSediment - projectSediment) × SOC% × (44/12)', baselineSediment: plot?.baselineSediment || 8, projectSediment: plot?.projectSediment || 3, socPct: +(avgSocPct * 100).toFixed(2), molecularRatio: 44 / 12, result: +erosionPrevention.toFixed(3), unit: 'tCO2e' },
          ghgReduction: { formula: '(baselineEmission - projectEmission) × areaHa × years', baselineEmission: plot?.baselineEmission || 5, projectEmission: plot?.projectEmission || 2.5, areaHa, result: +ghgReduction.toFixed(3), unit: 'tCO2e' },
          creditSummary: { grossCredits: +grossTotal.toFixed(3), grossCreditsUnit: 'tCO2e', bufferDeductionPct: 20, bufferDeduction: +bufferDeduction.toFixed(3), netCredits: +netCredits.toFixed(3), netCreditsUnit: 'tCO2e', annualNetCredits: +(netCredits / monitoringYears).toFixed(3), annualNetCreditsUnit: 'tCO2e/yr', creditValidityYears: 10 },
          coBenefits: { flowReductionPct: +flowReductionPct.toFixed(1), runoffReductionLpm: +runoffReductionLpm.toFixed(1) },
        };
        setCalcDetail(enrichedData); setCalcResult(enrichedData);
      }
    } catch (err) { console.error('Calculation error:', err); }
    finally { setCalculating(false); }
  };

  const handleToggleExpand = async (plotId: string) => {
    if (expandedPlot === plotId) {
      setExpandedPlot(null); setPlotMeasurements([]); setPlotTerraces([]); setPlotCheckDams([]);
    } else {
      setExpandedPlot(plotId);
      await fetchPlotMeasurements(plotId);
      await fetchTerraces(plotId);
      await fetchCheckDams(plotId);
    }
  };

  const handleCertifyPlot = (plotId: string) => {
    const plot = plots.find(p => p.plotId === plotId);
    if (!plot) return;
    const newRecord: CertificationRecord = {
      plotId: plot.plotId, plotName: plot.name, plotNameTh: plot.nameTh, province: plot.province,
      areaHa: plot.areaHa, status: 'CERTIFIED', methodology: plot.methodology,
      monitoringYear: plot.monitoringYear, netCredits: calcDetail?.creditSummary?.netCredits || 0,
      certifiedAt: new Date().toISOString(), certificateId: `T-VER-${plot.plotId}-${Date.now()}`,
    };
    setCertHistory(prev => [newRecord, ...prev]);
    setCertStep(prev => ({ ...prev, [plotId]: 3 }));
  };

  const toggleCertCheck = (plotId: string, key: string) => {
    setCertChecklist(prev => ({ ...prev, [plotId]: { ...(prev[plotId] || {}), [key]: !(prev[plotId]?.[key]) } }));
  };

  return {
    // State
    loading, activeTab, setActiveTab, expandedPlot,
    plots, terraces, checkDams, plotTerraces, plotCheckDams, measurements,
    showNewPlotDialog, setShowNewPlotDialog, newPlotForm, setNewPlotForm, creatingPlot,
    batchData, setBatchData, ingesting, ingestResult, autoRefresh, setAutoRefresh,
    selectedTerraceLayer, setSelectedTerraceLayer,
    calcPlotId, setCalcPlotId, calcStartDate, setCalcStartDate, calcEndDate, setCalcEndDate,
    calculating, calcDetail, certHistory, certStep, setCertStep, certChecklist, setCertChecklist,
    provinceFilter, setProvinceFilter,
    // Computed
    summary, sedimentByLayerData, waterFlowData, creditSourceData, latestPlots,
    filteredPlots, provinces, latestSensorData, qualitySummary, eligiblePlots,
    // Handlers
    fetchPlots, fetchMeasurements, fetchTerraces, fetchCheckDams,
    handleCreatePlot, handleIngest, handleCalculate, handleToggleExpand,
    handleCertifyPlot, toggleCertCheck,
  };
}
