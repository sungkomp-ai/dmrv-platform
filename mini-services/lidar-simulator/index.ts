/**
 * LIDAR Carbon Credit Verification Simulator
 * ═══════════════════════════════════════════════════════════════════════════
 * จำลองการสำรวจ LIDAR เพื่อตรวจสอบคาร์บอนเครดิตป่าไม้
 * สำหรับระบบ dMRV (Digital Measurement, Reporting, and Verification)
 *
 * มาตรฐานอ้างอิง:
 *   - IPCC 2006 GL (Vol 4: AFOLU) — มาตรฐานสากล
 *   - Verra VCS (Verified Carbon Standard) — มาตรฐานสากล
 *   - TGO T-VER-FOR-001 — มาตรฐานไทยสำหรับป่าไม้
 *   - TGO T-VER-BC-001 — มาตรฐานไทยสำหรับป่าชายเลิม (Blue Carbon)
 *   - Ogawa et al. allometric equations — สมการทางชีวมวลสำหรับป่าเขตร้อน
 *
 * พื้นที่จำลอง:
 *   1. เขาใหญ่ — ป่าดงดิบ (Tropical Evergreen) 2,168 ha
 *   2. แม่วงก์ — ป่าผลัดใบ (Mixed Deciduous) 894 ha
 *   3. สมุทรสงคราม — ป่าชายเลิม (Mangrove / Blue Carbon) 312 ha
 *
 * ระบบเวลา:
 *   - 1 วินาทีจริง = 1 เดือนจำลอง
 *   - 12 วินาที = 1 ปี
 *   - 72 วินาที = 6 ปี (ปี 0-5)
 *
 * รอบสำรวจต่อปี:
 *   FLIGHT (เดือน 1-2) → PROCESSING (เดือน 3) → VERIFIED (เดือน 4-12)
 */

import { createServer, IncomingMessage, ServerResponse } from 'http';
import { Server as SocketIOServer } from 'socket.io';

const PORT = 3033;

// ─── Constants ─────────────────────────────────────────────────────────────

const CARBON_TO_CO2E = 44 / 12;          // แปลง tC → tCO₂e
const IPCC_CF_DEFAULT = 0.47;             // IPCC 2006 GL default carbon fraction
const TOTAL_YEARS = 6;                    // Year 0 (baseline) → Year 5
const MONTHS_PER_YEAR = 12;
const TICK_INTERVAL_MS = 1000;            // 1 วินาที = 1 เดือนจำลอง
const MAX_READINGS_STORED = 600;          // เก็บ readings ล่าสุด

// ─── Type Definitions ──────────────────────────────────────────────────────

type SurveyPhase = 'FLIGHT' | 'PROCESSING' | 'VERIFIED';

interface ForestArea {
  id: string;
  name: string;
  nameTh: string;
  province: string;
  location: [number, number];
  areaHa: number;
  forestType: string;
  forestTypeTh: string;
  boundary: [number, number][];

  // Baseline biomass/carbon (Year 0)
  agbBaselineTonnePerHa: number;       // Above Ground Biomass t/ha
  bgbBaselineTonnePerHa: number;       // Below Ground Biomass t/ha
  carbonBaselineTcPerHa: number;       // tC/ha (vegetation carbon)
  soilCarbonBaselineTcPerHa: number;   // tC/ha in soil (mangrove only)

  // Growth parameters
  annualGrowthTcPerHa: number;         // tC/ha/year natural growth
  rootShootRatio: number;              // IPCC root:shoot ratio
  carbonFraction: number;              // IPCC carbon fraction
  tverCarbonFraction: number;          // TGO carbon fraction (Thai-specific)
  tverRootShootRatio: number;          // TGO root:shoot ratio (Thai-specific)

  // LIDAR survey parameters
  pointDensityTarget: number;          // pts/m² target

  // Canopy/CHM characteristics (baseline)
  chmMaxHeightBaseline: number;        // meters
  chmMeanHeightBaseline: number;       // meters
  canopyCoverBaselinePct: number;      // 0-100%
  laiBaseline: number;                 // Leaf Area Index
  treeDensityPerHa: number;            // stems/ha

  // Deforestation events: year → hectares lost
  deforestationEvents: Record<number, number>;

  // ── Mutable state (reset on simulation reset) ──
  cumulativeDeforestationHa: number;
  previousYearCarbonTcPerHa: number;
  previousYearTotalStockTc: number;
}

interface LidarReading {
  tick: number;
  fieldId: string;
  timestamp: string;
  simYear: number;
  simMonth: number;
  surveyPhase: SurveyPhase;

  // LIDAR metrics
  pointDensityPerM2: number;
  scanCoveragePct: number;
  chmMaxHeight: number;
  chmMeanHeight: number;
  canopyCoverPct: number;
  lai: number;
  treeDensityPerHa: number;

  // Biomass & Carbon — International Standard (IPCC 2006 GL / Verra VCS)
  agbTonnePerHa: number;
  bgbTonnePerHa: number;
  carbonTcPerHa: number;
  co2eTonnePerHa: number;

  // TGO Standard (T-VER-FOR-001 / T-VER-BC-001)
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

  // Soil carbon (mangrove only, 0 for others)
  soilCarbonTcPerHa: number;

  surveyComplete: boolean;
}

interface YearSummary {
  year: number;
  fields: {
    fieldId: string;
    fieldName: string;
    forestType: string;
    areaHa: number;
    effectiveAreaHa: number;
    carbonTcPerHa: number;
    totalCarbonStockTc: number;
    totalCO2eStock: number;
    tverCarbonTcPerHa: number;
    tverCo2eTonnePerHa: number;
    tverUncertaintyPct: number;
    annualCarbonChangeTcPerHa: number;
    deforestationHa: number;
    degradationPct: number;
    soilCarbonTcPerHa: number;
    surveyPhase: SurveyPhase;
  }[];
}

// ─── Forest Area Factory ───────────────────────────────────────────────────

function createForestAreas(): ForestArea[] {
  return [
    {
      id: 'khao-yai',
      name: 'Khao Yai Evergreen Forest',
      nameTh: 'อุทยานแห่งชาติเขาใหญ่',
      province: 'Nakhon Ratchasima',
      location: [14.44, 101.37],
      areaHa: 2168,
      forestType: 'Tropical Evergreen Forest',
      forestTypeTh: 'ป่าดงดิบ',
      boundary: [
        [14.480, 101.320], [14.485, 101.370], [14.475, 101.420],
        [14.440, 101.440], [14.400, 101.420], [14.395, 101.370],
        [14.400, 101.320], [14.420, 101.300],
      ],
      // ป่าดงดิบ: มวลชีวภาพสูงมาก ถ่านหินสูง
      // อ้างอิง: Ogawa et al. allometric equations for tropical evergreen
      agbBaselineTonnePerHa: 220,
      bgbBaselineTonnePerHa: 55,       // AGB × 0.24 (IPCC R:S for tropical evergreen) ≈ 52.8 → spec uses 55
      carbonBaselineTcPerHa: 127,       // (220 + 55) × 0.47 ≈ 129.25; spec ~127 (adjusted for moisture)
      soilCarbonBaselineTcPerHa: 0,
      annualGrowthTcPerHa: 3.5,        // ป่าสมบูรณ์ เติบโตช้า
      rootShootRatio: 0.24,            // IPCC 2006 GL Table 4.4 — Tropical evergreen
      carbonFraction: IPCC_CF_DEFAULT,
      tverCarbonFraction: 0.47,        // TGO T-VER-FOR-001: ป่าดงดิบ 0.47
      tverRootShootRatio: 0.22,        // Ogawa et al. for Thai tropical evergreen
      pointDensityTarget: 12,          // ความละเอียดสูง พื้นที่ใหญ่
      chmMaxHeightBaseline: 45,
      chmMeanHeightBaseline: 25,
      canopyCoverBaselinePct: 92,
      laiBaseline: 6.2,
      treeDensityPerHa: 520,
      deforestationEvents: {},         // อุทยานแห่งชาติ — ไม่มีการตัดไม้
      cumulativeDeforestationHa: 0,
      previousYearCarbonTcPerHa: 0,
      previousYearTotalStockTc: 0,
    },
    {
      id: 'mae-wong',
      name: 'Mae Wong Deciduous Forest',
      nameTh: 'อุทยานแห่งชาติแม่วงก์',
      province: 'Nakhon Sawan / Kamphaeng Phet',
      location: [16.05, 99.58],
      areaHa: 894,
      forestType: 'Mixed Deciduous Forest',
      forestTypeTh: 'ป่าผลัดใบ',
      boundary: [
        [16.080, 99.540], [16.085, 99.580], [16.075, 99.620],
        [16.030, 99.630], [16.020, 99.600], [16.025, 99.550],
      ],
      // ป่าผลัดใบ: มวลชีวภาพปานกลาง
      agbBaselineTonnePerHa: 120,
      bgbBaselineTonnePerHa: 30,       // AGB × 0.27 (IPCC R:S for tropical deciduous) ≈ 32.4 → spec 30
      carbonBaselineTcPerHa: 69,       // (120 + 30) × 0.47 = 70.5; spec ~69
      soilCarbonBaselineTcPerHa: 0,
      annualGrowthTcPerHa: 2.1,
      rootShootRatio: 0.27,            // IPCC 2006 GL Table 4.4 — Tropical deciduous
      carbonFraction: IPCC_CF_DEFAULT,
      tverCarbonFraction: 0.47,        // TGO T-VER-FOR-001: ป่าผลัดใบ 0.47
      tverRootShootRatio: 0.25,        // Thai-specific
      pointDensityTarget: 10,
      chmMaxHeightBaseline: 30,
      chmMeanHeightBaseline: 18,
      canopyCoverBaselinePct: 68,
      laiBaseline: 3.8,
      treeDensityPerHa: 320,
      // การลักลอบตัดไม้: ปี 2 (8 ha) และ ปี 4 (12 ha)
      deforestationEvents: { 2: 8, 4: 12 },
      cumulativeDeforestationHa: 0,
      previousYearCarbonTcPerHa: 0,
      previousYearTotalStockTc: 0,
    },
    {
      id: 'samut-mangrove',
      name: 'Samut Songkhram Mangrove',
      nameTh: 'ป่าชายเลิมสมุทรสงคราม',
      province: 'Samut Songkhram',
      location: [13.41, 100.00],
      areaHa: 312,
      forestType: 'Mangrove Forest',
      forestTypeTh: 'ป่าชายเลิม — Blue Carbon',
      boundary: [
        [13.430, 99.970], [13.435, 100.010], [13.425, 100.030],
        [13.390, 100.030], [13.388, 99.995], [13.395, 99.965],
      ],
      // ป่าชายเลิม: คาร์บอนในดินสูงมาก (Blue Carbon)
      // อ้างอิง: T-VER-BC-001 สำหรับป่าชายเลิม
      agbBaselineTonnePerHa: 95,
      bgbBaselineTonnePerHa: 45,       // รากเหง้าสูงมาก — AGB × 0.47 ≈ 44.65
      carbonBaselineTcPerHa: 65.8,     // (95 + 45) × 0.47 = 65.8 (vegetation only)
      soilCarbonBaselineTcPerHa: 350,  // คาร์บอนในดินสูงมาก (Blue Carbon)
      annualGrowthTcPerHa: 5.8,        // ป่าชายเลิมเติบโตเร็ว
      rootShootRatio: 0.47,            // IPCC — Mangroves have extensive root systems
      carbonFraction: IPCC_CF_DEFAULT,
      tverCarbonFraction: 0.49,        // TGO T-VER-BC-001: ป่าชายเลิม 0.49
      tverRootShootRatio: 0.47,        // Thai mangrove
      pointDensityTarget: 15,          // ป่าชายเลิมหนาแน่น ต้องการความละเอียดสูง
      chmMaxHeightBaseline: 15,
      chmMeanHeightBaseline: 8,
      canopyCoverBaselinePct: 85,
      laiBaseline: 4.2,
      treeDensityPerHa: 950,
      // การกัดเซาะชายฝั่ง: ปี 3 (8 ha)
      deforestationEvents: { 3: 8 },
      cumulativeDeforestationHa: 0,
      previousYearCarbonTcPerHa: 0,
      previousYearTotalStockTc: 0,
    },
  ];
}

// ─── Simulation State ──────────────────────────────────────────────────────

let forestAreas: ForestArea[] = createForestAreas();
let simRunning = false;
let simTick = 0;
let simTimer: ReturnType<typeof setInterval> | null = null;
let allReadings: LidarReading[] = [];
let yearSummaries: YearSummary[] = [];

// ─── Helper: Deterministic Noise ───────────────────────────────────────────
// ใช้ seed-based pseudo-random เพื่อให้ค่า noise สม่ำเสมอ

function seededNoise(seed: number): number {
  const x = Math.sin(seed * 12.9898 + seed * 0.1234) * 43758.5453;
  return x - Math.floor(x); // 0..1
}

// ─── Phase Logic ───────────────────────────────────────────────────────────

function getSurveyPhase(simMonth: number): SurveyPhase {
  if (simMonth <= 2) return 'FLIGHT';
  if (simMonth === 3) return 'PROCESSING';
  return 'VERIFIED';
}

// ─── Carbon Stock Calculation (International Standard) ─────────────────────
// อ้างอิง: IPCC 2006 GL Vol. 4, Chapter 4 — Forest Land
// AGB = f(CHM, canopy_cover, allometric_eq)
// BGB = AGB × root_shoot_ratio (IPCC Table 4.4)
// Carbon = (AGB + BGB) × CF (carbon fraction, 0.47 default)
// CO₂e = Carbon × 44/12

function calcInternationalCarbon(
  area: ForestArea,
  year: number,
  effectiveAreaHa: number,
  degradationFactor: number,
): {
  agb: number; bgb: number; carbonTcPerHa: number;
  co2eTonnePerHa: number; totalCarbonTc: number; totalCO2e: number;
} {
  // มวลชีวภาพเพิ่มขึ้นตามปี — Allometric growth from LIDAR-derived CHM
  const growthFactor = 1 + (area.annualGrowthTcPerHa / area.carbonBaselineTcPerHa) * year;
  // Degradation ลด per-hectare carbon (selective logging, edge effects)
  const adjustedCarbonTcPerHa = area.carbonBaselineTcPerHa * growthFactor * degradationFactor;

  // Reverse-engineer AGB from carbon: AGB = carbon / (CF × (1 + R))
  // carbon = (AGB + BGB) × CF = AGB × (1 + R) × CF
  // AGB = carbon / ((1 + R) × CF)
  const agbTonnePerHa = adjustedCarbonTcPerHa / ((1 + area.rootShootRatio) * area.carbonFraction);
  const bgbTonnePerHa = agbTonnePerHa * area.rootShootRatio;

  const co2eTonnePerHa = adjustedCarbonTcPerHa * CARBON_TO_CO2E;
  const totalCarbonTc = adjustedCarbonTcPerHa * effectiveAreaHa;
  const totalCO2e = co2eTonnePerHa * effectiveAreaHa;

  return {
    agb: agbTonnePerHa,
    bgb: bgbTonnePerHa,
    carbonTcPerHa: adjustedCarbonTcPerHa,
    co2eTonnePerHa,
    totalCarbonTc,
    totalCO2e,
  };
}

// ─── Carbon Stock Calculation (TGO Standard) ──────────────────────────────
// อ้างอิง: TGO T-VER-FOR-001 (ป่าไม้), T-VER-BC-001 (ป่าชายเลิม)
// ใช้สมการ Thai-specific (Ogawa et al.)
// ค่า CF และ R:S ตาม TGO database
// หัก uncertainty deduction: 10% ถ้า <5 ตัวอย่าง, 5% ถ้า ≥5 ตัวอย่าง

function calcTGOStandard(
  area: ForestArea,
  year: number,
  effectiveAreaHa: number,
  degradationFactor: number,
  numSurveys: number, // จำนวนรอบสำรวจสะสม (รวม baseline)
): {
  tverCarbonTcPerHa: number;
  tverCo2eTonnePerHa: number;
  tverUncertaintyPct: number;
} {
  // Thai-specific allometric growth (Ogawa et al.)
  const growthFactor = 1 + (area.annualGrowthTcPerHa / area.carbonBaselineTcPerHa) * year;

  // TGO uses Thai-specific CF and R:S
  // carbon = AGB × (1 + tverRootShootRatio) × tverCarbonFraction
  // Note: tver values may differ slightly from IPCC due to different parameters
  const tverBaseCarbonTcPerHa = area.agbBaselineTonnePerHa *
    (1 + area.tverRootShootRatio) * area.tverCarbonFraction;

  const tverCarbonTcPerHa = tverBaseCarbonTcPerHa * growthFactor * degradationFactor;

  // TGO Uncertainty deduction (T-VER-FOR-001 / T-VER-BC-001)
  // 10% สำหรับ <5 ตัวอย่าง, 5% สำหรับ ≥5 ตัวอย่าง
  const tverUncertaintyPct = numSurveys >= 5 ? 5 : 10;

  // หัก uncertainty ออกจาก carbon stock
  const tverCarbonAfterUncertainty = tverCarbonTcPerHa * (1 - tverUncertaintyPct / 100);
  const tverCo2eTonnePerHa = tverCarbonAfterUncertainty * CARBON_TO_CO2E;

  return {
    tverCarbonTcPerHa: tverCarbonAfterUncertainty,
    tverCo2eTonnePerHa,
    tverUncertaintyPct,
  };
}

// ─── Soil Carbon (Mangrove only, T-VER-BC-001) ────────────────────────────

function calcSoilCarbon(
  area: ForestArea,
  cumulativeDeforestationHa: number,
): number {
  if (area.soilCarbonBaselineTcPerHa === 0) return 0;
  // การกัดเซาะชายฝั่งทำให้ดินสูญเสียคาร์บอน
  // สมมติว่าพื้นที่ที่สูญเสียมี soil carbon เท่าค่าเฉลี่ย
  // Soil carbon per ha ยังคงที่ (คาร์บอนในดินเปลี่ยนช้า)
  // แต่ total soil carbon ลดลงตามพื้นที่ที่สูญเสีย
  // เรา return ค่า per-ha ซึ่งค่อนข้างคงที่
  const erosionLossFactor = 1 - (cumulativeDeforestationHa / area.areaHa) * 0.05;
  return area.soilCarbonBaselineTcPerHa * erosionLossFactor;
}

// ─── Generate Reading for One Area ─────────────────────────────────────────

function generateReading(area: ForestArea, tick: number, simYear: number, simMonth: number): LidarReading {
  const phase = getSurveyPhase(simMonth);
  const noise = seededNoise(tick * 100 + area.areaHa * 0.01 + simMonth);

  // ── Flight progress ──
  // เดือน 1-2: point density และ coverage เพิ่มขึ้นทีละน้อย
  let flightProgress = 0;
  if (phase === 'FLIGHT') {
    flightProgress = simMonth === 1
      ? (0.3 + noise * 0.2)  // เดือน 1: ~30-50%
      : (0.7 + noise * 0.15); // เดือน 2: ~70-85%
  } else {
    flightProgress = 1.0; // PROCESSING และ VERIFIED = scan เสร็จแล้ว
  }

  // ── Point density & coverage ──
  const pointDensityPerM2 = phase === 'FLIGHT'
    ? Math.round(area.pointDensityTarget * flightProgress * 10) / 10
    : Math.round((area.pointDensityTarget + (noise - 0.5) * 0.4) * 10) / 10;

  const scanCoveragePct = phase === 'FLIGHT'
    ? Math.round(flightProgress * 100 * 10) / 10
    : 100.0;

  // ── Deforestation tracking ──
  const currentYearDeforestation = area.deforestationEvents[simYear] || 0;
  const cumulativeDeforestation = area.cumulativeDeforestationHa +
    (phase === 'VERIFIED' && simMonth === 4 ? currentYearDeforestation : 0);

  const effectiveAreaHa = area.areaHa - cumulativeDeforestation;

  // Degradation factor: selective logging ลด per-hectare carbon เล็กน้อย
  const degradationPct = Math.round((cumulativeDeforestation / area.areaHa) * 100 * 100) / 100;
  const degradationFactor = 1 - (cumulativeDeforestation / area.areaHa) * 0.5;

  // ── Number of completed surveys (for TGO uncertainty) ──
  const numSurveys = simYear + 1; // Year 0 = 1st survey, Year 1 = 2nd, ...

  // ── Compute carbon values based on phase ──
  let chmMaxHeight = 0;
  let chmMeanHeight = 0;
  let canopyCoverPct = 0;
  let lai = 0;
  let treeDensityPerHa = 0;
  let agbTonnePerHa = 0;
  let bgbTonnePerHa = 0;
  let carbonTcPerHa = 0;
  let co2eTonnePerHa = 0;
  let tverCarbonTcPerHa = 0;
  let tverCo2eTonnePerHa = 0;
  let tverUncertaintyPct = 0;
  let totalCarbonStockTc = 0;
  let totalCO2eStock = 0;
  let annualCarbonChangeTcPerHa = 0;
  let soilCarbonTcPerHa = 0;
  let surveyComplete = false;

  if (phase === 'FLIGHT') {
    // ยังสแกนอยู่ — ค่าส่วนใหญ่ยังไม่พร้อม
    // แสดงค่าบางส่วนจาก flight progress
    chmMaxHeight = Math.round(area.chmMaxHeightBaseline * flightProgress * 0.3 * 10) / 10;
    chmMeanHeight = Math.round(area.chmMeanHeightBaseline * flightProgress * 0.2 * 10) / 10;
    canopyCoverPct = Math.round(area.canopyCoverBaselinePct * flightProgress * 0.3 * 10) / 10;
    lai = Math.round(area.laiBaseline * flightProgress * 0.2 * 100) / 100;
    treeDensityPerHa = Math.round(area.treeDensityPerHa * flightProgress * 0.2);
  } else if (phase === 'PROCESSING') {
    // กำลังประมวลผล point cloud — ค่าเริ่มปรากฏ (90-95% ของค่าจริง)
    const processingProgress = 0.92 + noise * 0.06;
    chmMaxHeight = Math.round(area.chmMaxHeightBaseline * (1 + simYear * 0.01) * processingProgress * 10) / 10;
    chmMeanHeight = Math.round(area.chmMeanHeightBaseline * (1 + simYear * 0.008) * processingProgress * 10) / 10;
    canopyCoverPct = Math.round(area.canopyCoverBaselinePct * (1 + simYear * 0.003) * processingProgress * 10) / 10;
    lai = Math.round(area.laiBaseline * (1 + simYear * 0.005) * processingProgress * 100) / 100;
    treeDensityPerHa = Math.round(area.treeDensityPerHa * processingProgress);

    // Partial carbon values (still being computed)
    const intl = calcInternationalCarbon(area, simYear, effectiveAreaHa, degradationFactor);
    agbTonnePerHa = Math.round(intl.agb * processingProgress * 100) / 100;
    bgbTonnePerHa = Math.round(intl.bgb * processingProgress * 100) / 100;
    carbonTcPerHa = Math.round(intl.carbonTcPerHa * processingProgress * 100) / 100;
    co2eTonnePerHa = Math.round(intl.co2eTonnePerHa * processingProgress * 100) / 100;

    const tgo = calcTGOStandard(area, simYear, effectiveAreaHa, degradationFactor, numSurveys);
    tverCarbonTcPerHa = Math.round(tgo.tverCarbonTcPerHa * processingProgress * 100) / 100;
    tverCo2eTonnePerHa = Math.round(tgo.tverCo2eTonnePerHa * processingProgress * 100) / 100;
    tverUncertaintyPct = tgo.tverUncertaintyPct;

    soilCarbonTcPerHa = Math.round(calcSoilCarbon(area, cumulativeDeforestation) * processingProgress * 100) / 100;

    totalCarbonStockTc = Math.round((carbonTcPerHa + soilCarbonTcPerHa) * effectiveAreaHa * 100) / 100;
    totalCO2eStock = Math.round(totalCarbonStockTc * CARBON_TO_CO2E * 100) / 100;
  } else {
    // VERIFIED — ค่าสุดท้าย
    surveyComplete = true;

    // CHM values with small seasonal noise
    const seasonalNoise = (Math.sin(simMonth * 0.5 + area.areaHa) * 0.5);
    chmMaxHeight = Math.round((area.chmMaxHeightBaseline * (1 + simYear * 0.01) + seasonalNoise) * 10) / 10;
    chmMeanHeight = Math.round((area.chmMeanHeightBaseline * (1 + simYear * 0.008) + seasonalNoise * 0.5) * 10) / 10;
    canopyCoverPct = Math.round((area.canopyCoverBaselinePct * (1 + simYear * 0.003) + (noise - 0.5) * 2) * 10) / 10;
    lai = Math.round((area.laiBaseline * (1 + simYear * 0.005) + (noise - 0.5) * 0.2) * 100) / 100;
    treeDensityPerHa = Math.round(area.treeDensityPerHa * (1 + simYear * 0.002) + (noise - 0.5) * 10);

    // International Standard (IPCC / Verra VCS)
    const intl = calcInternationalCarbon(area, simYear, effectiveAreaHa, degradationFactor);
    agbTonnePerHa = Math.round(intl.agb * 100) / 100;
    bgbTonnePerHa = Math.round(intl.bgb * 100) / 100;
    carbonTcPerHa = Math.round(intl.carbonTcPerHa * 100) / 100;
    co2eTonnePerHa = Math.round(intl.co2eTonnePerHa * 100) / 100;
    totalCarbonStockTc = Math.round(intl.totalCarbonTc * 100) / 100;
    totalCO2eStock = Math.round(intl.totalCO2e * 100) / 100;

    // TGO Standard
    const tgo = calcTGOStandard(area, simYear, effectiveAreaHa, degradationFactor, numSurveys);
    tverCarbonTcPerHa = Math.round(tgo.tverCarbonTcPerHa * 100) / 100;
    tverCo2eTonnePerHa = Math.round(tgo.tverCo2eTonnePerHa * 100) / 100;
    tverUncertaintyPct = tgo.tverUncertaintyPct;

    // Soil carbon (mangrove)
    soilCarbonTcPerHa = Math.round(calcSoilCarbon(area, cumulativeDeforestation) * 100) / 100;

    // Include soil carbon in totals for mangrove
    if (soilCarbonTcPerHa > 0) {
      totalCarbonStockTc = Math.round((carbonTcPerHa + soilCarbonTcPerHa) * effectiveAreaHa * 100) / 100;
      totalCO2eStock = Math.round(totalCarbonStockTc * CARBON_TO_CO2E * 100) / 100;
    }

    // Change detection — เทียบกับปีก่อนหน้า
    if (simYear === 0) {
      annualCarbonChangeTcPerHa = 0; // Baseline year — ไม่มีการเปรียบเทียบ
    } else {
      annualCarbonChangeTcPerHa = Math.round((carbonTcPerHa - area.previousYearCarbonTcPerHa) * 100) / 100;
    }
  }

  return {
    tick,
    fieldId: area.id,
    timestamp: new Date().toISOString(),
    simYear,
    simMonth,
    surveyPhase: phase,
    pointDensityPerM2: Math.max(0, pointDensityPerM2),
    scanCoveragePct: Math.min(100, Math.max(0, scanCoveragePct)),
    chmMaxHeight: Math.max(0, chmMaxHeight),
    chmMeanHeight: Math.max(0, chmMeanHeight),
    canopyCoverPct: Math.min(100, Math.max(0, canopyCoverPct)),
    lai: Math.max(0, lai),
    treeDensityPerHa: Math.max(0, treeDensityPerHa),
    agbTonnePerHa: Math.max(0, agbTonnePerHa),
    bgbTonnePerHa: Math.max(0, bgbTonnePerHa),
    carbonTcPerHa: Math.max(0, carbonTcPerHa),
    co2eTonnePerHa: Math.max(0, co2eTonnePerHa),
    tverCarbonTcPerHa: Math.max(0, tverCarbonTcPerHa),
    tverCo2eTonnePerHa: Math.max(0, tverCo2eTonnePerHa),
    tverUncertaintyPct,
    totalCarbonStockTc: Math.max(0, totalCarbonStockTc),
    totalCO2eStock: Math.max(0, totalCO2eStock),
    annualCarbonChangeTcPerHa,
    deforestationHa: phase === 'VERIFIED' ? currentYearDeforestation : 0,
    degradationPct,
    soilCarbonTcPerHa: Math.max(0, soilCarbonTcPerHa),
    surveyComplete,
  };
}

// ─── Simulation Tick ───────────────────────────────────────────────────────

function simulationTick(): void {
  simTick++;

  // คำนวณปีและเดือนจาก tick
  const totalMonths = simTick; // tick 1 = month 1 of year 0
  const simYear = Math.floor((totalMonths - 1) / MONTHS_PER_YEAR);
  const simMonth = ((totalMonths - 1) % MONTHS_PER_YEAR) + 1;

  // ตรวจสอบว่าจบการจำลองหรือยัง (Year 5, Month 12 = tick 72)
  if (simYear >= TOTAL_YEARS) {
    stopSimulation();
    console.log('[LIDAR] ✅ Simulation complete — 5-year monitoring period finished');
    return;
  }

  const newReadings: LidarReading[] = [];

  for (const area of forestAreas) {
    const reading = generateReading(area, simTick, simYear, simMonth);
    newReadings.push(reading);

    // ── อัปเดต state เมื่อเข้าสู่ VERIFIED phase (เดือน 4) ──
    if (simMonth === 4 && getSurveyPhase(simMonth) === 'VERIFIED') {
      // อัปเดต cumulative deforestation
      const yearDeforestation = area.deforestationEvents[simYear] || 0;
      area.cumulativeDeforestationHa += yearDeforestation;

      // บันทึก per-hectare carbon เพื่อใช้เปรียบเทียบปีถัดไป
      area.previousYearCarbonTcPerHa = reading.carbonTcPerHa;
      area.previousYearTotalStockTc = reading.totalCarbonStockTc;
    }
  }

  // เก็บ readings
  allReadings.push(...newReadings);
  if (allReadings.length > MAX_READINGS_STORED) {
    allReadings = allReadings.slice(-MAX_READINGS_STORED);
  }

  // Emit readings
  io.emit('lidar:reading', newReadings);
  io.emit('lidar:status', getStatus());

  // ── Year complete event ──
  // เมื่อจบเดือน 12 ของปีใด ๆ → ส่ง year summary
  if (simMonth === 12) {
    const yearSummary: YearSummary = {
      year: simYear,
      fields: forestAreas.map(area => {
        // หา VERIFIED reading ของปีนี้ (เดือน 4 เป็นตัวแทน)
        const verifiedReading = allReadings.find(
          r => r.fieldId === area.id && r.simYear === simYear && r.simMonth === 4 && r.surveyPhase === 'VERIFIED'
        );
        return {
          fieldId: area.id,
          fieldName: area.name,
          forestType: area.forestType,
          areaHa: area.areaHa,
          effectiveAreaHa: area.areaHa - area.cumulativeDeforestationHa,
          carbonTcPerHa: verifiedReading?.carbonTcPerHa || 0,
          totalCarbonStockTc: verifiedReading?.totalCarbonStockTc || 0,
          totalCO2eStock: verifiedReading?.totalCO2eStock || 0,
          tverCarbonTcPerHa: verifiedReading?.tverCarbonTcPerHa || 0,
          tverCo2eTonnePerHa: verifiedReading?.tverCo2eTonnePerHa || 0,
          tverUncertaintyPct: verifiedReading?.tverUncertaintyPct || 0,
          annualCarbonChangeTcPerHa: verifiedReading?.annualCarbonChangeTcPerHa || 0,
          deforestationHa: area.deforestationEvents[simYear] || 0,
          degradationPct: verifiedReading?.degradationPct || 0,
          soilCarbonTcPerHa: verifiedReading?.soilCarbonTcPerHa || 0,
          surveyPhase: 'VERIFIED',
        };
      }),
    };
    yearSummaries.push(yearSummary);
    io.emit('lidar:year:complete', yearSummary);
    console.log(`[LIDAR] 📊 Year ${simYear} survey complete — ${yearSummary.fields.map(f => `${f.fieldId}: ${f.carbonTcPerHa} tC/ha`).join(', ')}`);
  }

  // Log progress
  if (simMonth === 1 || simMonth === 3 || simMonth === 4) {
    console.log(`[LIDAR] Tick ${simTick} | Year ${simYear} Month ${simMonth} | Phase: ${getSurveyPhase(simMonth)}`);
  }
}

// ─── Simulation Control ────────────────────────────────────────────────────

function startSimulation(): void {
  if (simRunning) return;
  simRunning = true;
  console.log('[LIDAR] 🚀 Simulation started — 5-year monitoring (72 ticks, ~72 seconds)');

  io.emit('lidar:started', {
    totalYears: TOTAL_YEARS,
    totalTicks: TOTAL_YEARS * MONTHS_PER_YEAR,
    areas: forestAreas.map(a => ({ id: a.id, name: a.name, areaHa: a.areaHa })),
  });

  simTimer = setInterval(simulationTick, TICK_INTERVAL_MS);
}

function stopSimulation(): void {
  if (!simRunning) return;
  simRunning = false;
  if (simTimer) {
    clearInterval(simTimer);
    simTimer = null;
  }
  io.emit('lidar:stopped', { tick: simTick, totalReadings: allReadings.length });
  console.log(`[LIDAR] ⏹️  Simulation stopped at tick ${simTick} — ${allReadings.length} readings`);
}

function resetSimulation(): void {
  stopSimulation();
  simTick = 0;
  allReadings = [];
  yearSummaries = [];
  forestAreas = createForestAreas();
  io.emit('lidar:reset');
  io.emit('lidar:status', getStatus());
  console.log('[LIDAR] 🔄 Simulation reset');
}

// ─── Status Helper ─────────────────────────────────────────────────────────

function getStatus() {
  const totalMonths = simTick || 0;
  const simYear = totalMonths > 0 ? Math.floor((totalMonths - 1) / MONTHS_PER_YEAR) : 0;
  const simMonth = totalMonths > 0 ? ((totalMonths - 1) % MONTHS_PER_YEAR) + 1 : 0;

  return {
    running: simRunning,
    tick: simTick,
    simYear,
    simMonth,
    surveyPhase: simMonth > 0 ? getSurveyPhase(simMonth) : 'FLIGHT',
    totalYears: TOTAL_YEARS,
    progressPct: simTick > 0 ? Math.round((simTick / (TOTAL_YEARS * MONTHS_PER_YEAR)) * 100 * 10) / 10 : 0,
    totalReadings: allReadings.length,
    fields: forestAreas.map(area => {
      const isMangrove = area.id === 'samut-mangrove';
      // Get latest reading for this area
      const latestReading = allReadings.filter(r => r.fieldId === area.id).slice(-1)[0];
      return {
        id: area.id,
        name: area.name,
        nameTh: area.nameTh,
        province: area.province,
        lat: area.location[0],
        lng: area.location[1],
        location: area.location,
        areaHa: area.areaHa,
        effectiveAreaHa: area.areaHa - area.cumulativeDeforestationHa,
        forestType: area.forestType,
        forestTypeTh: area.forestTypeTh,
        boundary: area.boundary,
        pointDensityTarget: area.pointDensityTarget,
        annualGrowthTcPerHa: area.annualGrowthTcPerHa,
        cumulativeDeforestationHa: area.cumulativeDeforestationHa,
        previousYearCarbonTcPerHa: Math.round(area.previousYearCarbonTcPerHa * 100) / 100,
        // Current survey state
        simYear: simYear,
        simMonth: simMonth,
        surveyPhase: simMonth > 0 ? getSurveyPhase(simMonth) : 'FLIGHT',
        // Latest metrics from readings
        chmMeanHeight: latestReading?.chmMeanHeight ?? area.chmMeanHeightBaseline,
        canopyCoverPct: latestReading?.canopyCoverPct ?? area.canopyCoverBaselinePct,
        pointDensityPerM2: latestReading?.pointDensityPerM2 ?? 0,
        scanCoveragePct: latestReading?.scanCoveragePct ?? 0,
        agbTonnePerHa: latestReading?.agbTonnePerHa ?? area.agbBaselineTonnePerHa,
        bgbTonnePerHa: latestReading?.bgbTonnePerHa ?? area.bgbBaselineTonnePerHa,
        carbonTcPerHa: latestReading?.carbonTcPerHa ?? area.carbonBaselineTcPerHa,
        co2eTonnePerHa: latestReading?.co2eTonnePerHa ?? 0,
        tverCarbonTcPerHa: latestReading?.tverCarbonTcPerHa ?? 0,
        tverCo2eTonnePerHa: latestReading?.tverCo2eTonnePerHa ?? 0,
        totalCarbonStockTc: latestReading?.totalCarbonStockTc ?? 0,
        totalCO2eStock: latestReading?.totalCO2eStock ?? 0,
        deforestationHa: latestReading?.deforestationHa ?? 0,
        annualCarbonChangeTcPerHa: latestReading?.annualCarbonChangeTcPerHa ?? 0,
        soilCarbonTcPerHa: latestReading?.soilCarbonTcPerHa ?? area.soilCarbonBaselineTcPerHa,
        isMangrove: isMangrove,
        surveyComplete: simTick >= TOTAL_YEARS * MONTHS_PER_YEAR,
      };
    }),
  };
}

// ─── HTTP Server + Socket.IO ───────────────────────────────────────────────

const httpServer = createServer((req: IncomingMessage, res: ServerResponse) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url || '/', `http://localhost:${PORT}`);

  // ── GET /api/status ── สถานะการจำลองพร้อมรายละเอียดพื้นที่
  if (url.pathname === '/api/status' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(getStatus()));
    return;
  }

  // ── GET /api/readings?limit=100 ── ดึง readings ล่าสุด
  if (url.pathname === '/api/readings' && req.method === 'GET') {
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '100'), MAX_READINGS_STORED);
    const fieldId = url.searchParams.get('fieldId');
    let data = allReadings;
    if (fieldId) {
      data = data.filter(r => r.fieldId === fieldId);
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      readings: data.slice(-limit),
      count: Math.min(data.length, limit),
      total: data.length,
    }));
    return;
  }

  // ── GET /api/summary ── สรุปต่อพื้นที่พร้อมยอดรวมรายปี
  if (url.pathname === '/api/summary' && req.method === 'GET') {
    const fieldSummaries = forestAreas.map(area => {
      // หา latest VERIFIED reading สำหรับแต่ละพื้นที่
      const verifiedReadings = allReadings.filter(
        r => r.fieldId === area.id && r.surveyPhase === 'VERIFIED'
      );
      const latestVerified = verifiedReadings[verifiedReadings.length - 1];

      // สรุปยอดรายปี
      const yearlyData: { year: number; carbonTcPerHa: number; totalCO2e: number; deforestationHa: number }[] = [];
      for (let y = 0; y < TOTAL_YEARS; y++) {
        const yearReading = verifiedReadings.find(r => r.simYear === y && r.simMonth === 4);
        if (yearReading) {
          yearlyData.push({
            year: y,
            carbonTcPerHa: yearReading.carbonTcPerHa,
            totalCO2e: yearReading.totalCO2eStock,
            deforestationHa: yearReading.deforestationHa,
          });
        }
      }

      return {
        fieldId: area.id,
        fieldName: area.name,
        nameTh: area.nameTh,
        province: area.province,
        forestType: area.forestType,
        forestTypeTh: area.forestTypeTh,
        areaHa: area.areaHa,
        effectiveAreaHa: area.areaHa - area.cumulativeDeforestationHa,
        cumulativeDeforestationHa: area.cumulativeDeforestationHa,
        degradationPct: Math.round((area.cumulativeDeforestationHa / area.areaHa) * 100 * 100) / 100,
        latestCarbonTcPerHa: latestVerified?.carbonTcPerHa || 0,
        latestCO2eTonnePerHa: latestVerified?.co2eTonnePerHa || 0,
        latestTotalCarbonStockTc: latestVerified?.totalCarbonStockTc || 0,
        latestTotalCO2eStock: latestVerified?.totalCO2eStock || 0,
        latestTverCarbonTcPerHa: latestVerified?.tverCarbonTcPerHa || 0,
        latestTverCo2eTonnePerHa: latestVerified?.tverCo2eTonnePerHa || 0,
        latestTverUncertaintyPct: latestVerified?.tverUncertaintyPct || 0,
        latestSoilCarbonTcPerHa: latestVerified?.soilCarbonTcPerHa || 0,
        annualGrowthTcPerHa: area.annualGrowthTcPerHa,
        totalReadings: verifiedReadings.length,
        yearlyData,
      };
    });

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      running: simRunning,
      tick: simTick,
      totalReadings: allReadings.length,
      yearSummaries,
      fields: fieldSummaries,
      // มาตรฐานอ้างอิง
      standards: {
        international: 'IPCC 2006 GL / Verra VCS',
        thailand: 'TGO T-VER-FOR-001 / T-VER-BC-001',
      },
    }));
    return;
  }

  // ── POST /api/control ── Control simulation (start/stop/reset)
  if (url.pathname === '/api/control' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk: string) => { body += chunk; });
    req.on('end', () => {
      try {
        const { action } = JSON.parse(body);
        switch (action) {
          case 'start':
            startSimulation();
            break;
          case 'stop':
            stopSimulation();
            break;
          case 'reset':
            resetSimulation();
            break;
          default:
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Invalid action', validActions: ['start', 'stop', 'reset'] }));
            return;
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, action, running: simRunning, tick: simTick }));
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON body' }));
      }
    });
    return;
  }

  // ── GET /health ── Health check
  if (url.pathname === '/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      service: 'lidar-simulator',
      port: PORT,
      simulationRunning: simRunning,
      currentTick: simTick,
    }));
    return;
  }

  // 404
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found', availableEndpoints: ['/api/status', '/api/readings', '/api/summary', '/health'] }));
});

// ─── Socket.IO ─────────────────────────────────────────────────────────────

const io = new SocketIOServer(httpServer, {
  cors: { origin: '*' },
  transports: ['polling', 'websocket'],
  allowUpgrades: true,
});

io.on('connection', (socket) => {
  console.log(`[LIDAR] Client connected: ${socket.id} (transport: ${socket.conn.transport.name})`);

  socket.conn.on('upgrade', (transport) => {
    console.log(`[LIDAR] Client ${socket.id} upgraded to ${transport.name}`);
  });

  // ส่งสถานะปัจจุบัน
  socket.emit('lidar:status', getStatus());

  // ส่งข้อมูล history
  if (allReadings.length > 0) {
    socket.emit('lidar:reading', allReadings.slice(-30)); // ส่ง 30 readings ล่าสุด
  }

  // ส่ง year summaries ที่ผ่านมา
  if (yearSummaries.length > 0) {
    for (const ys of yearSummaries) {
      socket.emit('lidar:year:complete', ys);
    }
  }

  // ── Client commands ──
  socket.on('lidar:start', () => {
    console.log(`[LIDAR] Start command from ${socket.id}`);
    startSimulation();
  });

  socket.on('lidar:stop', () => {
    console.log(`[LIDAR] Stop command from ${socket.id}`);
    stopSimulation();
  });

  socket.on('lidar:reset', () => {
    console.log(`[LIDAR] Reset command from ${socket.id}`);
    resetSimulation();
  });

  socket.on('disconnect', (reason) => {
    console.log(`[LIDAR] Client disconnected: ${socket.id} (reason: ${reason})`);
  });
});

// ─── Start Server ──────────────────────────────────────────────────────────

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`🛩️  LIDAR Carbon Credit Verification Simulator running on port ${PORT}`);
  console.log(`   WebSocket: ws://0.0.0.0:${PORT}`);
  console.log(`   REST API:  http://0.0.0.0:${PORT}/api/status|readings|summary`);
  console.log(`   Health:    http://0.0.0.0:${PORT}/health`);
  console.log(`   Speed: 1 sec = 1 month | 72 sec = 5-year monitoring`);
  console.log(`   Standards: IPCC 2006 GL / Verra VCS + TGO T-VER-FOR-001 / T-VER-BC-001`);
  console.log(`   Areas:`);
  forestAreas.forEach(a => {
    console.log(`     • ${a.name} (${a.nameTh}) — ${a.areaHa} ha, ${a.forestType}`);
    console.log(`       Baseline: ${a.carbonBaselineTcPerHa} tC/ha, Growth: +${a.annualGrowthTcPerHa} tC/ha/yr`);
    if (a.soilCarbonBaselineTcPerHa > 0) {
      console.log(`       Soil Carbon: ${a.soilCarbonBaselineTcPerHa} tC/ha (Blue Carbon)`);
    }
  });
});

// ─── Graceful Shutdown ─────────────────────────────────────────────────────

process.on('SIGINT', () => {
  console.log('[LIDAR] Shutting down...');
  stopSimulation();
  io.close();
  httpServer.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('[LIDAR] Received SIGTERM...');
  stopSimulation();
  io.close();
  httpServer.close();
  process.exit(0);
});
