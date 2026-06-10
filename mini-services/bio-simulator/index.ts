/**
 * Bio & Microorganism Carbon Simulator
 * ═══════════════════════════════════════════════════════════════════════════
 * จำลองข้อมูลทางด้าน Bio และจุลินทรีย์ที่เกี่ยวกับคาร์บอน
 * สำหรับระบบ dMRV (Digital Measurement, Reporting, and Verification)
 *
 * อ้างอิง: BIOTEC / NSTDA
 *   - Methanotrophs: จุลินทรีย์กินมีเทน (CH₄) → biomass / lipids / biofuels
 *   - Syntrophic Methanogenic Consortium (SynMEC): organic matter → H₂ → CH₄
 *   - Microbial CO₂ Capture & Utilization (biological CCU): CO₂ → organic acids / biopolymers
 *   - Algae-based Capture: CO₂ → biomass → biofuels / bioplastics
 *   - Waste to Value: biogas, biohydrogen, bioethanol, gas fermentation, nutrient recovery
 *
 * มาตรฐานอ้างอิง:
 *   - TGO T-VER-AG-001 (การจัดการขยะมีชีวิต / Biogenic waste management)
 *   - TGO T-VER-WT-001 (บำบัดน้ำเสีย / Wastewater treatment)
 *   - IPCC 2006 GL Vol. 5 (Waste) — CH₄ from landfills, wastewater
 *   - CDM Methodology AMS-III.H / ACM-0014 — Methane recovery
 *   - Verra VCS VM-0041 — Waste-to-energy
 *
 * สถานีจำลอง (3 สถานี):
 *   1. Rice Paddy Methanotroph Station (สถานีจุลินทรีย์กินมีเทนในนาข้าว)
 *   2. Landfill Biofilter Station (สถานีไบโอฟิลเตอร์บ่อขยะ)
 *   3. Biogas Plant SynMEC Station (สถานี SynMEC โรงไบโอก๊าซ)
 *
 * ระบบเวลา:
 *   - 1 วินาทีจริง = 1 เดือนจำลอง
 *   - 12 วินาที = 1 ปี
 *   - 60 วินาที = 5 ปี (Year 0-4)
 */

import { createServer, IncomingMessage, ServerResponse } from 'http';
import { Server as SocketIOServer } from 'socket.io';

const PORT = 3034;

// ─── Constants ─────────────────────────────────────────────────────────────

const CARBON_TO_CO2E = 44 / 12;          // แปลง tC → tCO₂e
const CH4_GWP20 = 80;                     // CH₄ GWP over 20 years (IPCC AR6)
const CH4_GWP100 = 28;                    // CH₄ GWP over 100 years (IPCC AR5)
const TOTAL_YEARS = 5;                    // Year 0 → Year 4
const MONTHS_PER_YEAR = 12;
const TICK_INTERVAL_MS = 1000;            // 1 วินาที = 1 เดือนจำลอง
const MAX_READINGS_STORED = 600;

// ─── Type Definitions ──────────────────────────────────────────────────────

type Season = 'DRY' | 'WET';  // ฤดูแล้ง / ฤดูฝน
type BioProcess = 'METHANE_OXIDATION' | 'METHANOGENESIS' | 'CO2_CAPTURE' | 'FERMENTATION' | 'NUTRIENT_RECOVERY';

interface MicroorganismGroup {
  id: string;
  nameEn: string;
  nameTh: string;
  category: string;
  function: string;
  optimalTempC: [number, number];
  optimalPH: [number, number];
  growthRatePerDay: number;     // specific growth rate μ (1/day)
  yieldCoeff: number;           // Y (g biomass / g substrate)
}

interface BioStation {
  id: string;
  name: string;
  nameTh: string;
  province: string;
  location: [number, number];
  siteAreaHa: number;
  siteType: string;
  siteTypeTh: string;
  boundary: [number, number][];

  // Microorganism groups at this station
  microorganisms: MicroorganismGroup[];

  // Primary bio-process
  primaryProcess: BioProcess;

  // Feedstock / input parameters
  ch4InputKgPerDay: number;     // CH₄ input (kg/day)
  organicLoadTPerDay: number;   // Organic matter input (t/day)
  co2InputKgPerDay: number;     // CO₂ input for capture (kg/day)
  wastewaterM3PerDay: number;   // Wastewater volume (m³/day)

  // Bioreactor parameters
  reactorVolumeM3: number;      // Bioreactor volume
  retentionTimeDays: number;    // Hydraulic retention time
  operatingTempC: number;       // Operating temperature
  operatingPH: number;          // Operating pH

  // Baseline methane emissions (without bio-treatment)
  baselineCh4EmissionKgPerDay: number;
  // Baseline CO₂ from fossil displacement
  baselineFossilCO2KgPerDay: number;

  // ── Mutable state ──
  cumulativeCh4OxidizedKg: number;
  cumulativeCO2CapturedKg: number;
  cumulativeBiogasProducedM3: number;
  cumulativeBiomassProducedKg: number;
  cumulativeCarbonCreditTco2e: number;
  previousYearCh4OxidizedKg: number;
}

interface BioReading {
  tick: number;
  stationId: string;
  timestamp: string;
  simYear: number;
  simMonth: number;
  season: Season;

  // Environmental conditions
  temperatureC: number;
  pH: number;
  dissolvedOxygenMgPerL: number;
  moisturePct: number;

  // Methane dynamics
  ch4InputKgPerDay: number;
  ch4OxidizedKgPerDay: number;
  ch4OxidationEfficiencyPct: number;
  ch4EmissionAvoidedKgPerDay: number;

  // CO₂ dynamics
  co2ProducedKgPerDay: number;       // from microbial respiration
  co2CapturedKgPerDay: number;       // by autotrophs
  co2NetAvoidedKgPerDay: number;     // net CO₂ avoided

  // Biogas production
  biogasProducedM3PerDay: number;
  biogasCh4ContentPct: number;

  // Biomass production
  biomassProducedKgPerDay: number;
  scpDataKgPerDay: number;           // Single Cell Protein
  lipidContentPct: number;

  // Bio-product yields
  bioethanolLPerDay: number;
  biohydrogenLPerDay: number;
  biodieselLPerDay: number;
  bioplasticKgPerDay: number;
  biofertilizerKgPerDay: number;

  // Microorganism activity
  methanotrophCountCFUPerML: number;
  methanogenCountCFUPerML: number;
  acetogenCountCFUPerML: number;
  algalDensityMgPerL: number;
  totalHeterotrophCountCFUPerML: number;

  // Nutrient dynamics
  nitrogenMgPerL: number;
  phosphorusMgPerL: number;
  codMgPerL: number;                 // Chemical Oxygen Demand
  bodMgPerL: number;                 // Biochemical Oxygen Demand

  // Carbon credit calculation
  tverCh4ReductionTco2ePerDay: number;
  tverBiogasOffsetTco2ePerDay: number;
  tverTotalCreditTco2ePerDay: number;
  ipccCh4ReductionTco2ePerDay: number;
  ipccBiogasOffsetTco2ePerDay: number;
  ipccTotalCreditTco2ePerDay: number;

  // Cumulative
  cumulativeCh4OxidizedKg: number;
  cumulativeCO2CapturedKg: number;
  cumulativeBiogasM3: number;
  cumulativeBiomassKg: number;
  cumulativeCarbonTco2e: number;

  // Quality metrics
  processStabilityPct: number;
  biofilterEfficiencyPct: number;
  monitoringCoveragePct: number;
}

interface BioSimStatus {
  running: boolean;
  tick: number;
  simYear: number;
  simMonth: number;
  season: Season;
  totalYears: number;
  progressPct: number;
  totalReadings: number;
  stations: BioStationStatus[];
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
  primaryProcess: BioProcess;
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

// ─── Microorganism Definitions ─────────────────────────────────────────────

const METHANOTROPHS: MicroorganismGroup = {
  id: 'methanotrophs',
  nameEn: 'Methanotrophs (Type I & II)',
  nameTh: 'จุลินทรีย์กินมีเทน (Type I & II)',
  category: 'Methylotroph',
  function: 'CH₄ oxidation → CO₂ + biomass (lipids, SCP)',
  optimalTempC: [25, 40],
  optimalPH: [6.5, 7.5],
  growthRatePerDay: 0.8,
  yieldCoeff: 0.55,
};

const METHANOGENS: MicroorganismGroup = {
  id: 'methanogens',
  nameEn: 'Methanogens (Methanobacterium, Methanosarcina)',
  nameTh: 'แบคทีเรียก่อมีเทน (Methanobacterium, Methanosarcina)',
  category: 'Archaea',
  function: 'Organic acid + H₂ → CH₄ (biogas)',
  optimalTempC: [35, 55],
  optimalPH: [6.8, 7.4],
  growthRatePerDay: 0.3,
  yieldCoeff: 0.08,
};

const SYNTROPHIC_BACTERIA: MicroorganismGroup = {
  id: 'syntrophic',
  nameEn: 'Syntrophic Bacteria (SynMEC)',
  nameTh: 'แบคทีเรีย Syn trophic (SynMEC)',
  category: 'Syntroph',
  function: 'Organic matter → H₂ + acetate (for methanogens)',
  optimalTempC: [30, 45],
  optimalPH: [5.5, 7.0],
  growthRatePerDay: 0.25,
  yieldCoeff: 0.06,
};

const ACETOGENS: MicroorganismGroup = {
  id: 'acetogens',
  nameEn: 'Acetogens (Clostridium sp.)',
  nameTh: 'แบคทีเรียสร้างอะซีเตต (Clostridium sp.)',
  category: 'Autotroph',
  function: 'CO + CO₂ → acetic acid, ethanol, butanol',
  optimalTempC: [30, 40],
  optimalPH: [5.8, 7.0],
  growthRatePerDay: 0.4,
  yieldCoeff: 0.15,
};

const MICROALGAE: MicroorganismGroup = {
  id: 'microalgae',
  nameEn: 'Microalgae (Chlorella, Spirulina)',
  nameTh: 'สาหร่ายขนาดเล็ก (Chlorella, Spirulina)',
  category: 'Photoautotroph',
  function: 'CO₂ + light → biomass → biofuel, bioplastic',
  optimalTempC: [20, 35],
  optimalPH: [7.0, 9.0],
  growthRatePerDay: 1.2,
  yieldCoeff: 0.85,
};

const NITRIFYING_BACTERIA: MicroorganismGroup = {
  id: 'nitrifying',
  nameEn: 'Nitrifying Bacteria (Nitrosomonas, Nitrobacter)',
  nameTh: 'แบคทีเรียไนตริฟาย (Nitrosomonas, Nitrobacter)',
  category: 'Chemoautotroph',
  function: 'NH₄⁺ → NO₂⁻ → NO₃⁻ (nutrient recovery)',
  optimalTempC: [25, 35],
  optimalPH: [7.5, 8.5],
  growthRatePerDay: 0.6,
  yieldCoeff: 0.12,
};

// ─── Station Factory ───────────────────────────────────────────────────────

function createStations(): BioStation[] {
  return [
    {
      id: 'rice-paddy-methanotroph',
      name: 'Rice Paddy Methanotroph Station',
      nameTh: 'สถานีจุลินทรีย์กินมีเทนในนาข้าว',
      province: 'Pathum Thani',
      location: [14.02, 100.53],
      siteAreaHa: 50,
      siteType: 'Rice Paddy AWD + Methanotroph Biofilter',
      siteTypeTh: 'นาข้าว AWD + ไบโอฟิลเตอร์จุลินทรีย์กินมีเทน',
      boundary: [
        [14.030, 100.520], [14.035, 100.540], [14.025, 100.550],
        [14.010, 100.540], [14.008, 100.520],
      ],
      microorganisms: [METHANOTROPHS, NITRIFYING_BACTERIA, MICROALGAE],
      primaryProcess: 'METHANE_OXIDATION',
      ch4InputKgPerDay: 85,         // CH₄ from rice paddy (AWD reduces by ~50%)
      organicLoadTPerDay: 0.5,
      co2InputKgPerDay: 30,         // CO₂ for algae
      wastewaterM3PerDay: 200,
      reactorVolumeM3: 500,
      retentionTimeDays: 7,
      operatingTempC: 30,
      operatingPH: 7.0,
      baselineCh4EmissionKgPerDay: 170,  // Without AWD/methanotroph
      baselineFossilCO2KgPerDay: 50,
      cumulativeCh4OxidizedKg: 0,
      cumulativeCO2CapturedKg: 0,
      cumulativeBiogasProducedM3: 0,
      cumulativeBiomassProducedKg: 0,
      cumulativeCarbonCreditTco2e: 0,
      previousYearCh4OxidizedKg: 0,
    },
    {
      id: 'landfill-biofilter',
      name: 'Landfill Methane Biofilter Station',
      nameTh: 'สถานีไบโอฟิลเตอร์บ่อขยะ',
      province: 'Nakhon Pathom',
      location: [13.82, 100.08],
      siteAreaHa: 20,
      siteType: 'Landfill Methane Oxidation Biofilter',
      siteTypeTh: 'ไบโอฟิลเตอร์ย่อยสลายมีเทนจากบ่อขยะ',
      boundary: [
        [13.825, 100.070], [13.828, 100.085], [13.822, 100.095],
        [13.810, 100.090], [13.808, 100.075],
      ],
      microorganisms: [METHANOTROPHS, SYNTROPHIC_BACTERIA, NITRIFYING_BACTERIA],
      primaryProcess: 'METHANE_OXIDATION',
      ch4InputKgPerDay: 320,        // CH₄ from landfill
      organicLoadTPerDay: 2.0,
      co2InputKgPerDay: 0,
      wastewaterM3PerDay: 50,
      reactorVolumeM3: 800,
      retentionTimeDays: 14,
      operatingTempC: 35,
      operatingPH: 7.2,
      baselineCh4EmissionKgPerDay: 320,  // All methane vents without biofilter
      baselineFossilCO2KgPerDay: 0,
      cumulativeCh4OxidizedKg: 0,
      cumulativeCO2CapturedKg: 0,
      cumulativeBiogasProducedM3: 0,
      cumulativeBiomassProducedKg: 0,
      cumulativeCarbonCreditTco2e: 0,
      previousYearCh4OxidizedKg: 0,
    },
    {
      id: 'biogas-synmec',
      name: 'Biogas Plant SynMEC Station',
      nameTh: 'สถานี SynMEC โรงไบโอก๊าซ',
      province: 'Ratchaburi',
      location: [13.53, 99.81],
      siteAreaHa: 15,
      siteType: 'Biogas Plant with Syntrophic Methanogenic Consortium',
      siteTypeTh: 'โรงไบโอก๊าซพร้อม SynMEC',
      boundary: [
        [13.535, 99.800], [13.538, 99.815], [13.532, 99.825],
        [13.520, 99.820], [13.518, 99.805],
      ],
      microorganisms: [METHANOGENS, SYNTROPHIC_BACTERIA, ACETOGENS, MICROALGAE],
      primaryProcess: 'METHANOGENESIS',
      ch4InputKgPerDay: 0,
      organicLoadTPerDay: 5.0,      // Livestock waste
      co2InputKgPerDay: 80,         // CO₂ from biogas upgrading + flue gas
      wastewaterM3PerDay: 500,
      reactorVolumeM3: 2000,
      retentionTimeDays: 21,
      operatingTempC: 38,
      operatingPH: 7.0,
      baselineCh4EmissionKgPerDay: 200,  // Without anaerobic digester
      baselineFossilCO2KgPerDay: 120,    // Fossil fuel displaced by biogas
      cumulativeCh4OxidizedKg: 0,
      cumulativeCO2CapturedKg: 0,
      cumulativeBiogasProducedM3: 0,
      cumulativeBiomassProducedKg: 0,
      cumulativeCarbonCreditTco2e: 0,
      previousYearCh4OxidizedKg: 0,
    },
  ];
}

// ─── Simulation State ──────────────────────────────────────────────────────

let stations: BioStation[] = createStations();
let simRunning = false;
let simTick = 0;
let simTimer: ReturnType<typeof setInterval> | null = null;
let allReadings: BioReading[] = [];

// ─── Helper Functions ──────────────────────────────────────────────────────

function seededNoise(seed: number): number {
  const x = Math.sin(seed * 12.9898 + seed * 0.1234) * 43758.5453;
  return x - Math.floor(x);
}

function getSeason(month: number): Season {
  // Thailand: WET = May-Oct, DRY = Nov-Apr
  return (month >= 5 && month <= 10) ? 'WET' : 'DRY';
}

function getSeasonalFactor(season: Season): number {
  // Microbial activity higher in wet season (warmer, more moisture)
  return season === 'WET' ? 1.15 : 0.85;
}

// ─── Generate Reading for One Station ──────────────────────────────────────

function generateReading(station: BioStation, tick: number, simYear: number, simMonth: number): BioReading {
  const season = getSeason(simMonth);
  const noise = seededNoise(tick * 100 + station.siteAreaHa * 0.01 + simMonth);
  const noise2 = seededNoise(tick * 50 + simYear * 7.3 + simMonth * 3.1);
  const seasonalFactor = getSeasonalFactor(season);

  // ── Environmental conditions ──
  // Temperature varies by season and location
  const baseTemp = station.operatingTempC;
  const tempVariation = (season === 'WET' ? 3 : -2) + (noise - 0.5) * 4;
  const temperatureC = Math.round((baseTemp + tempVariation) * 10) / 10;

  // pH varies slightly with microbial activity
  const pH = Math.round((station.operatingPH + (noise2 - 0.5) * 0.4) * 100) / 100;

  // Dissolved oxygen (higher in dry season, lower in bioreactor)
  const dissolvedOxygenMgPerL = Math.round((2.5 + (noise - 0.5) * 1.5 + (season === 'DRY' ? 1.0 : 0)) * 100) / 100;

  // Moisture (higher in wet season)
  const moisturePct = Math.round(Math.min(100, (season === 'WET' ? 75 : 50) + (noise - 0.5) * 20) * 10) / 10;

  // ── Process efficiency based on conditions ──
  // Temperature deviation from optimal reduces efficiency
  const tempDeviation = Math.abs(temperatureC - station.operatingTempC);
  const tempEfficiency = Math.max(0.3, 1 - tempDeviation * 0.03);

  // pH deviation
  const phDeviation = Math.abs(pH - station.operatingPH);
  const phEfficiency = Math.max(0.5, 1 - phDeviation * 0.2);

  // Combined biological efficiency
  const bioEfficiency = tempEfficiency * phEfficiency * seasonalFactor;

  // Year-over-year improvement (system matures)
  const maturityFactor = 1 + simYear * 0.05; // 5% improvement per year

  // ── CH₄ Oxidation (Methanotrophs) ──
  let ch4InputKgPerDay = 0;
  let ch4OxidizedKgPerDay = 0;
  let ch4OxidationEfficiencyPct = 0;
  let ch4EmissionAvoidedKgPerDay = 0;

  if (station.primaryProcess === 'METHANE_OXIDATION' || station.ch4InputKgPerDay > 0) {
    ch4InputKgPerDay = Math.round(station.ch4InputKgPerDay * (0.9 + noise * 0.2) * 100) / 100;

    // Methanotroph oxidation efficiency: typically 60-90% in biofilters
    // Higher with maturity, seasonal variation
    const baseEfficiency = station.id === 'landfill-biofilter' ? 0.65 : 0.55;
    ch4OxidationEfficiencyPct = Math.round(
      Math.min(95, (baseEfficiency * bioEfficiency * maturityFactor + noise * 0.05) * 100) * 10
    ) / 10;

    ch4OxidizedKgPerDay = Math.round(ch4InputKgPerDay * (ch4OxidationEfficiencyPct / 100) * 100) / 100;
    ch4EmissionAvoidedKgPerDay = Math.round(ch4OxidizedKgPerDay * 100) / 100;
  }

  // ── CO₂ Dynamics ──
  // CO₂ produced from microbial respiration
  const co2ProducedKgPerDay = Math.round(
    (ch4OxidizedKgPerDay * (44 / 16) * 0.5 + station.organicLoadTPerDay * 20 * (noise2 * 0.3 + 0.7)) * 100
  ) / 100;

  // CO₂ captured by autotrophs (algae, acetogens)
  const co2CaptureEfficiency = station.microorganisms.some(m => m.id === 'microalgae' || m.id === 'acetogens')
    ? 0.3 + noise * 0.2
    : 0;
  const co2CapturedKgPerDay = Math.round(
    station.co2InputKgPerDay * co2CaptureEfficiency * bioEfficiency * maturityFactor * 100
  ) / 100;

  // Net CO₂ avoided = CH₄ avoided (as CO₂e) - CO₂ produced + CO₂ captured + fossil fuel displacement
  const co2NetAvoidedKgPerDay = Math.round(
    (ch4EmissionAvoidedKgPerDay * CH4_GWP100 - co2ProducedKgPerDay + co2CapturedKgPerDay) * 100
  ) / 100;

  // ── Biogas Production (Methanogenesis / SynMEC) ──
  let biogasProducedM3PerDay = 0;
  let biogasCh4ContentPct = 0;

  if (station.primaryProcess === 'METHANOGENESIS') {
    // Biogas from anaerobic digestion: ~0.5 m³/kg VS, CH₄ content 55-70%
    const vsPerDay = station.organicLoadTPerDay * 0.8 * 1000; // Volatile solids kg
    const biogasYield = 0.45 + noise * 0.1; // m³/kg VS
    biogasProducedM3PerDay = Math.round(vsPerDay * biogasYield * bioEfficiency * maturityFactor * 100) / 100;
    biogasCh4ContentPct = Math.round((60 + (noise2 - 0.5) * 10) * 10) / 10;
  } else if (station.microorganisms.some(m => m.id === 'methanogens')) {
    // Secondary biogas from co-digestion
    biogasProducedM3PerDay = Math.round(station.organicLoadTPerDay * 200 * (0.3 + noise * 0.2) * bioEfficiency * 100) / 100;
    biogasCh4ContentPct = Math.round((55 + (noise2 - 0.5) * 8) * 10) / 10;
  }

  // ── Biomass Production ──
  // Methanotroph biomass yield: ~0.55 g biomass / g CH₄
  const biomassFromMethanotrophs = ch4OxidizedKgPerDay * METHANOTROPHS.yieldCoeff;
  const biomassFromAlgae = co2CapturedKgPerDay * (MICROALGAE.yieldCoeff * 0.5);
  const biomassProducedKgPerDay = Math.round((biomassFromMethanotrophs + biomassFromAlgae) * 100) / 100;

  // Single Cell Protein from methanotrophs
  const scpDataKgPerDay = Math.round(biomassFromMethanotrophs * 0.7 * 100) / 100;

  // Lipid content (for biodiesel): methanotrophs produce lipids
  const lipidContentPct = Math.round((20 + (noise - 0.5) * 10) * 10) / 10;

  // ── Bio-product Yields ──
  const bioethanolLPerDay = station.microorganisms.some(m => m.id === 'acetogens')
    ? Math.round(station.organicLoadTPerDay * 80 * bioEfficiency * maturityFactor * (0.5 + noise * 0.3) * 100) / 100
    : 0;

  const biohydrogenLPerDay = station.microorganisms.some(m => m.id === 'syntrophic')
    ? Math.round(station.organicLoadTPerDay * 30 * bioEfficiency * (0.4 + noise * 0.2) * 100) / 100
    : 0;

  const biodieselLPerDay = biomassFromAlgae > 0
    ? Math.round(biomassFromAlgae * 0.2 * (0.5 + noise * 0.3) * 100) / 100
    : 0;

  const bioplasticKgPerDay = station.microorganisms.some(m => m.id === 'microalgae')
    ? Math.round(co2CapturedKgPerDay * 0.1 * bioEfficiency * 100) / 100
    : 0;

  const biofertilizerKgPerDay = station.microorganisms.some(m => m.id === 'nitrifying')
    ? Math.round(station.wastewaterM3PerDay * 0.05 * bioEfficiency * (0.5 + noise * 0.3) * 100) / 100
    : 0;

  // ── Microorganism Counts ──
  const hasMethanotrophs = station.microorganisms.some(m => m.id === 'methanotrophs');
  const hasMethanogens = station.microorganisms.some(m => m.id === 'methanogens');
  const hasAcetogens = station.microorganisms.some(m => m.id === 'acetogens');
  const hasAlgae = station.microorganisms.some(m => m.id === 'microalgae');

  const methanotrophCountCFUPerML = hasMethanotrophs
    ? Math.round(1e6 * (1 + noise * 0.5) * bioEfficiency * maturityFactor)
    : Math.round(1e3 * noise);

  const methanogenCountCFUPerML = hasMethanogens
    ? Math.round(5e5 * (1 + noise2 * 0.3) * bioEfficiency * maturityFactor)
    : Math.round(1e2 * noise);

  const acetogenCountCFUPerML = hasAcetogens
    ? Math.round(3e5 * (1 + noise * 0.4) * bioEfficiency * maturityFactor)
    : Math.round(5e2 * noise);

  const algalDensityMgPerL = hasAlgae
    ? Math.round(200 * (1 + noise2 * 0.5) * bioEfficiency * maturityFactor * 100) / 100
    : 0;

  const totalHeterotrophCountCFUPerML = Math.round(
    (1e5 + 1e4 * noise + (season === 'WET' ? 5e4 : 0)) * maturityFactor
  );

  // ── Nutrient Dynamics ──
  const nitrogenMgPerL = Math.round((15 + (noise - 0.5) * 10 - (station.microorganisms.some(m => m.id === 'nitrifying') ? 5 : 0)) * 100) / 100;
  const phosphorusMgPerL = Math.round((5 + (noise2 - 0.5) * 3) * 100) / 100;
  const codMgPerL = Math.round((200 - simYear * 10 + (noise - 0.5) * 50) * bioEfficiency * 100) / 100;
  const bodMgPerL = Math.round((120 - simYear * 8 + (noise2 - 0.5) * 30) * bioEfficiency * 100) / 100;

  // ── Carbon Credit Calculation ──

  // TGO Standard (T-VER)
  // CH₄ reduction: GWP = 25 (TGO uses AR4 value) with uncertainty deduction
  const tverUncertaintyDeduction = simYear >= 2 ? 0.95 : 0.90; // 10% for <2yr, 5% for ≥2yr
  const tverCh4ReductionTco2ePerDay = Math.round(
    ch4EmissionAvoidedKgPerDay * 25 / 1000 * tverUncertaintyDeduction * 100
  ) / 100;
  const tverBiogasOffsetTco2ePerDay = Math.round(
    biogasProducedM3PerDay * 0.0018 * tverUncertaintyDeduction * 100
  ) / 100; // 0.0018 tCO₂e/m³ biogas (approx)
  const tverTotalCreditTco2ePerDay = Math.round(
    (tverCh4ReductionTco2ePerDay + tverBiogasOffsetTco2ePerDay) * 100
  ) / 100;

  // IPCC Standard (AR5)
  // CH₄ reduction: GWP = 28 (IPCC AR5)
  const ipccCh4ReductionTco2ePerDay = Math.round(
    ch4EmissionAvoidedKgPerDay * CH4_GWP100 / 1000 * 100
  ) / 100;
  const ipccBiogasOffsetTco2ePerDay = Math.round(
    biogasProducedM3PerDay * 0.002 * 100
  ) / 100;
  const ipccTotalCreditTco2ePerDay = Math.round(
    (ipccCh4ReductionTco2ePerDay + ipccBiogasOffsetTco2ePerDay) * 100
  ) / 100;

  // ── Cumulative Updates ──
  station.cumulativeCh4OxidizedKg += ch4OxidizedKgPerDay * 30; // ~30 days per month
  station.cumulativeCO2CapturedKg += co2CapturedKgPerDay * 30;
  station.cumulativeBiogasProducedM3 += biogasProducedM3PerDay * 30;
  station.cumulativeBiomassProducedKg += biomassProducedKgPerDay * 30;
  station.cumulativeCarbonCreditTco2e += ipccTotalCreditTco2ePerDay * 30;

  // ── Quality Metrics ──
  const processStabilityPct = Math.round(
    Math.min(99, 70 + simYear * 5 + bioEfficiency * 15 + noise * 5) * 10
  ) / 10;

  const biofilterEfficiencyPct = ch4OxidationEfficiencyPct > 0
    ? Math.round(Math.min(95, ch4OxidationEfficiencyPct + noise * 5) * 10) / 10
    : Math.round(Math.min(90, 60 + simYear * 5 + noise * 10) * 10) / 10;

  const monitoringCoveragePct = Math.round(
    Math.min(100, 85 + simYear * 3 + noise * 5) * 10
  ) / 10;

  return {
    tick,
    stationId: station.id,
    timestamp: new Date().toISOString(),
    simYear,
    simMonth,
    season,
    temperatureC,
    pH,
    dissolvedOxygenMgPerL,
    moisturePct,
    ch4InputKgPerDay,
    ch4OxidizedKgPerDay,
    ch4OxidationEfficiencyPct,
    ch4EmissionAvoidedKgPerDay,
    co2ProducedKgPerDay,
    co2CapturedKgPerDay,
    co2NetAvoidedKgPerDay,
    biogasProducedM3PerDay,
    biogasCh4ContentPct,
    biomassProducedKgPerDay,
    scpDataKgPerDay,
    lipidContentPct,
    bioethanolLPerDay,
    biohydrogenLPerDay,
    biodieselLPerDay,
    bioplasticKgPerDay,
    biofertilizerKgPerDay,
    methanotrophCountCFUPerML,
    methanogenCountCFUPerML,
    acetogenCountCFUPerML,
    algalDensityMgPerL,
    totalHeterotrophCountCFUPerML,
    nitrogenMgPerL,
    phosphorusMgPerL,
    codMgPerL,
    bodMgPerL,
    tverCh4ReductionTco2ePerDay,
    tverBiogasOffsetTco2ePerDay,
    tverTotalCreditTco2ePerDay,
    ipccCh4ReductionTco2ePerDay,
    ipccBiogasOffsetTco2ePerDay,
    ipccTotalCreditTco2ePerDay,
    cumulativeCh4OxidizedKg: Math.round(station.cumulativeCh4OxidizedKg * 100) / 100,
    cumulativeCO2CapturedKg: Math.round(station.cumulativeCO2CapturedKg * 100) / 100,
    cumulativeBiogasM3: Math.round(station.cumulativeBiogasProducedM3 * 100) / 100,
    cumulativeBiomassKg: Math.round(station.cumulativeBiomassProducedKg * 100) / 100,
    cumulativeCarbonTco2e: Math.round(station.cumulativeCarbonCreditTco2e * 100) / 100,
    processStabilityPct,
    biofilterEfficiencyPct,
    monitoringCoveragePct,
  };
}

// ─── Simulation Tick ───────────────────────────────────────────────────────

function simulationTick(): void {
  simTick++;

  const totalMonths = simTick;
  const simYear = Math.floor((totalMonths - 1) / MONTHS_PER_YEAR);
  const simMonth = ((totalMonths - 1) % MONTHS_PER_YEAR) + 1;

  if (simYear >= TOTAL_YEARS) {
    stopSimulation();
    console.log('[BIO] ✅ Simulation complete — 5-year monitoring period finished');
    return;
  }

  const newReadings: BioReading[] = [];

  for (const station of stations) {
    const reading = generateReading(station, simTick, simYear, simMonth);
    newReadings.push(reading);

    // Update previous year tracking at end of year
    if (simMonth === 12) {
      station.previousYearCh4OxidizedKg = station.cumulativeCh4OxidizedKg;
    }
  }

  allReadings.push(...newReadings);
  if (allReadings.length > MAX_READINGS_STORED) {
    allReadings = allReadings.slice(-MAX_READINGS_STORED);
  }

  io.emit('bio:reading', newReadings);
  io.emit('bio:status', getStatus());

  if (simMonth === 1 || simMonth === 6 || simMonth === 12) {
    console.log(`[BIO] Tick ${simTick} | Year ${simYear} Month ${simMonth} | Season: ${getSeason(simMonth)}`);
  }
}

// ─── Simulation Control ────────────────────────────────────────────────────

function startSimulation(): void {
  if (simRunning) return;
  simRunning = true;
  console.log('[BIO] 🚀 Simulation started — 5-year monitoring (60 ticks, ~60 seconds)');

  io.emit('bio:started', {
    totalYears: TOTAL_YEARS,
    totalTicks: TOTAL_YEARS * MONTHS_PER_YEAR,
    stations: stations.map(s => ({ id: s.id, name: s.name, siteAreaHa: s.siteAreaHa })),
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
  io.emit('bio:stopped', { tick: simTick, totalReadings: allReadings.length });
  console.log(`[BIO] ⏹️  Simulation stopped at tick ${simTick} — ${allReadings.length} readings`);
}

function resetSimulation(): void {
  stopSimulation();
  simTick = 0;
  allReadings = [];
  stations = createStations();
  io.emit('bio:reset');
  io.emit('bio:status', getStatus());
  console.log('[BIO] 🔄 Simulation reset');
}

// ─── Status Helper ─────────────────────────────────────────────────────────

function getStatus(): BioSimStatus {
  const totalMonths = simTick || 0;
  const simYear = totalMonths > 0 ? Math.floor((totalMonths - 1) / MONTHS_PER_YEAR) : 0;
  const simMonth = totalMonths > 0 ? ((totalMonths - 1) % MONTHS_PER_YEAR) + 1 : 0;

  return {
    running: simRunning,
    tick: simTick,
    simYear,
    simMonth,
    season: simMonth > 0 ? getSeason(simMonth) : 'DRY',
    totalYears: TOTAL_YEARS,
    progressPct: simTick > 0 ? Math.round((simTick / (TOTAL_YEARS * MONTHS_PER_YEAR)) * 100 * 10) / 10 : 0,
    totalReadings: allReadings.length,
    stations: stations.map(station => {
      const latestReading = allReadings.filter(r => r.stationId === station.id).slice(-1)[0];
      return {
        id: station.id,
        name: station.name,
        nameTh: station.nameTh,
        province: station.province,
        lat: station.location[0],
        lng: station.location[1],
        siteAreaHa: station.siteAreaHa,
        siteType: station.siteType,
        siteTypeTh: station.siteTypeTh,
        primaryProcess: station.primaryProcess,
        microorganisms: station.microorganisms,
        simYear,
        simMonth,
        ch4OxidizedKgPerDay: latestReading?.ch4OxidizedKgPerDay ?? 0,
        ch4OxidationEfficiencyPct: latestReading?.ch4OxidationEfficiencyPct ?? 0,
        biogasProducedM3PerDay: latestReading?.biogasProducedM3PerDay ?? 0,
        biomassProducedKgPerDay: latestReading?.biomassProducedKgPerDay ?? 0,
        cumulativeCh4OxidizedKg: Math.round(station.cumulativeCh4OxidizedKg * 100) / 100,
        cumulativeCarbonTco2e: Math.round(station.cumulativeCarbonCreditTco2e * 100) / 100,
        processStabilityPct: latestReading?.processStabilityPct ?? 0,
        biofilterEfficiencyPct: latestReading?.biofilterEfficiencyPct ?? 0,
      };
    }),
  };
}

// ─── HTTP Server + Socket.IO ───────────────────────────────────────────────

const httpServer = createServer((req: IncomingMessage, res: ServerResponse) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url || '/', `http://localhost:${PORT}`);

  if (url.pathname === '/api/status' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(getStatus()));
    return;
  }

  if (url.pathname === '/api/readings' && req.method === 'GET') {
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '100'), MAX_READINGS_STORED);
    const stationId = url.searchParams.get('stationId');
    let data = allReadings;
    if (stationId) {
      data = data.filter(r => r.stationId === stationId);
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      readings: data.slice(-limit),
      count: Math.min(data.length, limit),
      total: data.length,
    }));
    return;
  }

  if (url.pathname === '/api/summary' && req.method === 'GET') {
    const stationSummaries = stations.map(station => {
      const stationReadings = allReadings.filter(r => r.stationId === station.id);
      const latest = stationReadings[stationReadings.length - 1];

      return {
        stationId: station.id,
        stationName: station.name,
        nameTh: station.nameTh,
        province: station.province,
        siteType: station.siteType,
        siteTypeTh: station.siteTypeTh,
        siteAreaHa: station.siteAreaHa,
        primaryProcess: station.primaryProcess,
        microorganisms: station.microorganisms.map(m => ({ id: m.id, nameEn: m.nameEn, nameTh: m.nameTh })),
        cumulativeCh4OxidizedKg: Math.round(station.cumulativeCh4OxidizedKg * 100) / 100,
        cumulativeCO2CapturedKg: Math.round(station.cumulativeCO2CapturedKg * 100) / 100,
        cumulativeBiogasM3: Math.round(station.cumulativeBiogasProducedM3 * 100) / 100,
        cumulativeBiomassKg: Math.round(station.cumulativeBiomassProducedKg * 100) / 100,
        cumulativeCarbonTco2e: Math.round(station.cumulativeCarbonCreditTco2e * 100) / 100,
        latestTverCredit: latest?.tverTotalCreditTco2ePerDay ?? 0,
        latestIpccCredit: latest?.ipccTotalCreditTco2ePerDay ?? 0,
        totalReadings: stationReadings.length,
      };
    });

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      running: simRunning,
      tick: simTick,
      totalReadings: allReadings.length,
      stations: stationSummaries,
      standards: {
        international: 'IPCC AR5 / CDM AMS-III.H / Verra VCS VM-0041',
        thailand: 'TGO T-VER-AG-001 / T-VER-WT-001',
      },
    }));
    return;
  }

  if (url.pathname === '/api/control' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk: string) => { body += chunk; });
    req.on('end', () => {
      try {
        const { action } = JSON.parse(body);
        switch (action) {
          case 'start': startSimulation(); break;
          case 'stop': stopSimulation(); break;
          case 'reset': resetSimulation(); break;
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

  if (url.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', service: 'bio-simulator', port: PORT, simulationRunning: simRunning, currentTick: simTick }));
    return;
  }

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
  console.log(`[BIO] Client connected: ${socket.id}`);

  socket.emit('bio:status', getStatus());
  if (allReadings.length > 0) {
    socket.emit('bio:readings', allReadings.slice(-30));
  }

  socket.on('bio:start', () => startSimulation());
  socket.on('bio:stop', () => stopSimulation());
  socket.on('bio:reset', () => { resetSimulation(); });

  socket.on('disconnect', () => {
    console.log(`[BIO] Client disconnected: ${socket.id}`);
  });
});

// ─── Start Server ──────────────────────────────────────────────────────────

httpServer.listen(PORT, () => {
  console.log(`[BIO] 🧬 Bio & Microorganism Carbon Simulator running on port ${PORT}`);
  console.log(`[BIO] 📡 Socket.IO enabled | HTTP endpoints: /api/status, /api/readings, /api/summary, /health`);
  console.log(`[BIO] 🔬 Stations: Rice Paddy Methanotroph, Landfill Biofilter, Biogas SynMEC`);
});
