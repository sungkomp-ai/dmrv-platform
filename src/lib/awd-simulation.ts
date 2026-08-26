/**
 * AWD Rice Cultivation Simulation Engine
 * Embedded directly in the Next.js process (no external mini-service needed).
 *
 * T-VER Standard Compliance:
 *   - Methodology: T-VER-P-AG-001
 *   - GWP: CH₄=28, N₂O=265 (IPCC AR5 per TGO 2566)
 *   - Unit conversion: mg/m²/hr → kg/ha/day (factor 0.24)
 *   - Baseline EF for continuous flooding:
 *       Irrigated = 1.30, Rainfed = 1.00, Drought = 0.70 kg CH₄/ha/day
 *   - AWD phases: FLOODED → DRAINING → DRY → REFLOODING → FLOODED
 *
 * 3 Thai rice fields: Korat (Irrigated), Suphan (Rainfed), Ubon (Drought-prone)
 * 1800x speed factor, 2-second real-time interval = 1 simulated hour per tick
 */

// ─── Constants ──────────────────────────────────────────────────────
const SPEED_FACTOR = 1800;
const INTERVAL_MS = 2000;
const SIM_HOURS_PER_TICK = 1;

// T-VER standard constants
const MG_M2_HR_TO_KG_HA_DAY = 0.24; // conversion factor
const GWP_CH4 = 28; // IPCC AR5 per TGO 2566
const GWP_N2O = 265; // IPCC AR5 per TGO 2566
const KG_CH4_TO_TCO2E = GWP_CH4 / 1000;
const KG_N2O_TO_TCO2E = GWP_N2O / 1000;

// ─── Calculation Mode ───────────────────────────────────────────────
// 'full'        = Full Sensor Mode (empirical model, 10+ sensor variables)
//                CH₄/N₂O/CO₂ flux computed from water level, temperature,
//                soil moisture, soil pH, growth stage, etc.
// 'simplified'  = Simplified Mode (IPCC Tier 1, water level only)
//                CH₄ = baseline EF × SF_AWD × Area × Period
//                Only water level sensor needed; N₂O/CO₂ not measured.
export type CalcMode = 'full' | 'simplified';

// IPCC 2019 Refinement Vol. 4 Ch. 5, Table 5.12 — AWD Scaling Factors (SF_AWD)
// SF_AWD adjusts the baseline CH₄ emission factor based on number of drainage cycles.
const SF_AWD_CONTINUOUS = 1.00;  // 0 cycles (continuous flooding) — baseline
const SF_AWD_SINGLE = 0.60;     // 1 aeration/drying cycle — ~40% CH₄ reduction
const SF_AWD_MULTIPLE = 0.52;  // 2+ aeration cycles — ~48% CH₄ reduction

// ─── Types ──────────────────────────────────────────────────────────
interface AWDFieldInternal {
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
  baseTempMin: number;
  baseTempMax: number;
  baseHumidity: number;
  annualRainfallMm: number;
  floodTargetCm: number;
  dryThresholdCm: number;
  floodDays: number;
  dryDays: number;
  currentDAP: number;
  currentHour: number;
  waterLevelCm: number;
  currentAWDPhase: string;
  awdPhaseDayCounter: number;
  totalAWDCycles: number;
  // Legacy cumulative (g)
  totalCH4g: number;
  totalN2Og: number;
  totalYieldKg: number;
  // T-VER standard cumulative
  totalCH4kg: number;
  totalN2Okg: number;
  totalCH4tCO2e: number;
  totalN2OtCO2e: number;
  totalNettCO2e: number;
  baselineEmissiontCO2e: number;
  emissionReductiontCO2e: number;
  seasonComplete: boolean;
}

export interface AWDFieldStatus {
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
  currentDAP: number;
  currentHour: number;
  waterLevelCm: number;
  currentAWDPhase: string;
  awdCycles: number;
  growthStage: string;
  // Legacy
  cumulativeCH4g?: number;
  cumulativeN2Og?: number;
  // T-VER standard cumulative
  cumulativeCH4kg: number;
  cumulativeN2Okg: number;
  cumulativeCH4tCO2e: number;
  cumulativeN2OtCO2e: number;
  cumulativeNettCO2e: number;
  baselineEmissiontCO2e: number;
  emissionReductiontCO2e: number;
  estimatedYieldKg: number;
  seasonComplete: boolean;
}

export interface AWDReading {
  tick: number;
  fieldId: string;
  fieldName: string;
  province: string;
  timestamp: string;
  simDAP: number;
  simHour: number;
  growthStage: string;
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
  ch4EfKgHaDay?: number;
  n2oEfKgHaDay?: number;
  // Cumulative — T-VER standard units
  cumulativeCH4kg?: number;
  cumulativeN2Okg?: number;
  cumulativeCH4tCO2e?: number;
  cumulativeN2OtCO2e?: number;
  cumulativeNettCO2e?: number;
  baselineEmissiontCO2e?: number;
  emissionReductiontCO2e?: number;
  // Legacy fields
  cumulativeCH4g?: number;
  cumulativeN2Og?: number;
  estimatedYieldKg: number;
  seasonComplete: boolean;
  // T-VER reference
  tverMethodology?: string;
  tverGwpCH4?: number;
  tverGwpN2O?: number;
  // Calculation mode
  calcMode?: CalcMode;
  sfAWD?: number;        // Scaling factor applied (simplified mode only)
  baselineEFKgHaDay?: number;  // Baseline EF used (simplified mode only)
}

export interface SimStatus {
  running: boolean;
  tickCounter: number;
  speedFactor: number;
  intervalMs: number;
  calcMode: CalcMode;
  fields: AWDFieldStatus[];
}

export interface SimSummary {
  running: boolean;
  tickCounter: number;
  totalReadings: number;
  fields: {
    id: string;
    name: string;
    currentDAP: number;
    awdPhase: string;
    seasonComplete: boolean;
  }[];
}

// ─── Field Factory ──────────────────────────────────────────────────
function createFields(): AWDFieldInternal[] {
  return [
    {
      id: 'awd-korat',
      name: 'Nakhon Ratchasima AWD (Irrigated)',
      nameTh: 'นครราชสีมา AWD (ชลประทาน)',
      province: 'Nakhon Ratchasima',
      provinceTh: 'นครราชสีมา',
      lat: 14.97, lng: 102.08, areaHa: 48,
      soilType: 'Sandy Loam', waterSource: 'Irrigated (Lam Takhong Dam)',
      riceVariety: 'KDML105 (Jasmine Rice)', totalDays: 120,
      boundary: [[14.985,102.060],[14.985,102.100],[14.960,102.100],[14.960,102.080],[14.955,102.070],[14.960,102.060]],
      baseTempMin: 22, baseTempMax: 34, baseHumidity: 72, annualRainfallMm: 1100,
      floodTargetCm: 10, dryThresholdCm: -15, floodDays: 7, dryDays: 5,
      currentDAP: 0, currentHour: 6, waterLevelCm: 0,
      currentAWDPhase: 'FLOODED', awdPhaseDayCounter: 0, totalAWDCycles: 0,
      totalCH4g: 0, totalN2Og: 0, totalYieldKg: 0,
      totalCH4kg: 0, totalN2Okg: 0,
      totalCH4tCO2e: 0, totalN2OtCO2e: 0, totalNettCO2e: 0,
      baselineEmissiontCO2e: 0, emissionReductiontCO2e: 0,
      seasonComplete: false,
    },
    {
      id: 'awd-suphan',
      name: 'Suphan Buri AWD (Rainfed)',
      nameTh: 'สุพรรณบุรี AWD (น้ำฝน)',
      province: 'Suphan Buri',
      provinceTh: 'สุพรรณบุรี',
      lat: 14.47, lng: 100.12, areaHa: 32,
      soilType: 'Clay', waterSource: 'Rainfed + Backup Pump',
      riceVariety: 'PTT1 (Pathum Thani 1)', totalDays: 105,
      boundary: [[14.485,100.105],[14.485,100.140],[14.460,100.140],[14.458,100.120],[14.460,100.105]],
      baseTempMin: 24, baseTempMax: 35, baseHumidity: 78, annualRainfallMm: 1400,
      floodTargetCm: 12, dryThresholdCm: -12, floodDays: 6, dryDays: 4,
      currentDAP: 0, currentHour: 6, waterLevelCm: 0,
      currentAWDPhase: 'FLOODED', awdPhaseDayCounter: 0, totalAWDCycles: 0,
      totalCH4g: 0, totalN2Og: 0, totalYieldKg: 0,
      totalCH4kg: 0, totalN2Okg: 0,
      totalCH4tCO2e: 0, totalN2OtCO2e: 0, totalNettCO2e: 0,
      baselineEmissiontCO2e: 0, emissionReductiontCO2e: 0,
      seasonComplete: false,
    },
    {
      id: 'awd-ubon',
      name: 'Ubon Ratchathani AWD (Drought-prone)',
      nameTh: 'อุบลราชธานี AWD (แล้ง)',
      province: 'Ubon Ratchathani',
      provinceTh: 'อุบลราชธานี',
      lat: 15.24, lng: 104.85, areaHa: 25,
      soilType: 'Sandy Soil', waterSource: 'Rainfed Only',
      riceVariety: 'RD43', totalDays: 95,
      boundary: [[15.255,104.835],[15.255,104.870],[15.230,104.870],[15.228,104.850],[15.230,104.835]],
      baseTempMin: 23, baseTempMax: 36, baseHumidity: 65, annualRainfallMm: 800,
      floodTargetCm: 8, dryThresholdCm: -18, floodDays: 5, dryDays: 6,
      currentDAP: 0, currentHour: 6, waterLevelCm: 0,
      currentAWDPhase: 'FLOODED', awdPhaseDayCounter: 0, totalAWDCycles: 0,
      totalCH4g: 0, totalN2Og: 0, totalYieldKg: 0,
      totalCH4kg: 0, totalN2Okg: 0,
      totalCH4tCO2e: 0, totalN2OtCO2e: 0, totalNettCO2e: 0,
      baselineEmissiontCO2e: 0, emissionReductiontCO2e: 0,
      seasonComplete: false,
    },
  ];
}

// ─── Calculation Functions ───────────────────────────────────────────
function getGrowthStage(dap: number, totalDays: number): string {
  const p = dap / totalDays;
  if (p < 0.05) return 'GERMINATION';
  if (p < 0.20) return 'TILLERING';
  if (p < 0.40) return 'STEM_ELONGATION';
  if (p < 0.55) return 'BOOTING';
  if (p < 0.65) return 'FLOWERING';
  if (p < 0.85) return 'GRAIN_FILLING';
  if (p < 1.00) return 'MATURITY';
  return 'HARVESTED';
}

function getTemperature(field: AWDFieldInternal, hour: number): number {
  const avgTemp = (field.baseTempMin + field.baseTempMax) / 2;
  const amplitude = (field.baseTempMax - field.baseTempMin) / 2;
  return avgTemp + amplitude * Math.sin(((hour - 5) / 24) * Math.PI * 2 - Math.PI / 2)
    + Math.sin(field.currentDAP * 0.7 + hour * 0.3) * 1.5;
}

function getRainfallMm(field: AWDFieldInternal, dap: number, hour: number): number {
  const rainFactor = field.annualRainfallMm / 1400;
  const baseRainfall = dap < 30 ? 0.15 : dap < 80 ? 0.40 : 0.20;
  if (hour < 12 || hour > 18) return 0;
  const seed = Math.sin(dap * 12.9898 + hour * 78.233) * 43758.5453;
  const rand = seed - Math.floor(seed);
  if (rand > baseRainfall * rainFactor) return 0;
  return Math.round((rand * 7.5 + 0.5) * rainFactor * 10) / 10;
}

function getCH4Emission(field: AWDFieldInternal, hour: number): number {
  const stage = getGrowthStage(field.currentDAP, field.totalDays);
  const baseFluxMap: Record<string, number> = {
    GERMINATION: 2, TILLERING: 15, STEM_ELONGATION: 25,
    BOOTING: 30, FLOWERING: 28, GRAIN_FILLING: 18,
    MATURITY: 8, HARVESTED: 1,
  };
  let baseFlux = baseFluxMap[stage] || 5;

  const waterFactorMap: Record<string, number> = {
    FLOODED: 1.0, DRAINING: 0.6, DRY: 0.15, REFLOODING: 0.7,
  };
  let waterFactor = waterFactorMap[field.currentAWDPhase] || 1;

  const temp = getTemperature(field, hour);
  const tempFactor = 1 + (temp - 28) * 0.03;
  const soilFactor = field.soilType.includes('Clay') ? 1.3 : field.soilType.includes('Sandy') ? 0.7 : 1.0;
  return Math.max(0, baseFlux * waterFactor * tempFactor * soilFactor);
}

function getN2OEmission(field: AWDFieldInternal): number {
  const stage = getGrowthStage(field.currentDAP, field.totalDays);
  const baseFluxMap: Record<string, number> = {
    GERMINATION: 0.3, TILLERING: 1.2, STEM_ELONGATION: 1.5,
    BOOTING: 1.8, FLOWERING: 1.5, GRAIN_FILLING: 1.0,
    MATURITY: 0.5, HARVESTED: 0.1,
  };
  let baseFlux = baseFluxMap[stage] || 0.5;

  const phaseFactorMap: Record<string, number> = {
    FLOODED: 0.5, DRAINING: 2.5, DRY: 1.2, REFLOODING: 2.8,
  };
  let phaseFactor = phaseFactorMap[field.currentAWDPhase] || 1;

  const soilFactor = field.soilType.includes('Sandy') ? 1.4 : field.soilType.includes('Clay') ? 0.8 : 1.0;
  return Math.max(0, baseFlux * phaseFactor * soilFactor);
}

function getSoilMoisture(field: AWDFieldInternal): number {
  const baseMap: Record<string, number> = {
    FLOODED: 85 + field.waterLevelCm,
    DRAINING: 70 + field.waterLevelCm * 0.8,
    DRY: 30 + field.waterLevelCm * 0.5,
    REFLOODING: 50 + field.waterLevelCm,
  };
  let base = baseMap[field.currentAWDPhase] || 40;
  if (field.soilType.includes('Sandy')) base -= 8;
  if (field.soilType.includes('Clay')) base += 5;
  return Math.max(15, Math.min(100, base));
}

function getCO2Flux(field: AWDFieldInternal, hour: number): number {
  const temp = getTemperature(field, hour);
  const stage = getGrowthStage(field.currentDAP, field.totalDays);
  const baseFluxMap: Record<string, number> = {
    TILLERING: 120, STEM_ELONGATION: 150, BOOTING: 160,
    FLOWERING: 140, GRAIN_FILLING: 110,
  };
  let baseFlux = baseFluxMap[stage] || 60;
  const tempFactor = Math.exp(0.05 * (temp - 25));
  const moisture = getSoilMoisture(field);
  const moistureFactor = moisture > 60 ? 1.2 : moisture > 30 ? 1.0 : 0.7;
  return baseFlux * tempFactor * moistureFactor;
}

function estimateYieldKgPerHa(field: AWDFieldInternal): number {
  const p = Math.min(field.currentDAP / field.totalDays, 1);
  const maxKgPerHa = field.riceVariety.includes('KDML') ? 3500 : field.riceVariety.includes('RD43') ? 4200 : 4500;
  const growthFactor = 1 / (1 + Math.exp(-10 * (p - 0.5)));
  const awdPenalty = 0.97;
  const droughtFactor = field.waterSource.includes('Only') ? 0.75 : field.waterSource.includes('Rainfed') ? 0.88 : 1.0;
  return maxKgPerHa * growthFactor * awdPenalty * droughtFactor;
}

function updateWaterLevel(field: AWDFieldInternal, rainfall: number): void {
  const hour = field.currentHour;
  const temp = getTemperature(field, hour);
  const dayETmm = 3 + (temp - 25) * 0.15;
  const hourETmm = dayETmm / 24;
  const percMmPerDay = field.soilType.includes('Sandy') ? 8 : field.soilType.includes('Clay') ? 1.5 : 3.5;
  const percMmPerHr = percMmPerDay / 24;
  const inflowMm = rainfall;
  const outflowMm = hourETmm + percMmPerHr;
  const waterChangeCm = (inflowMm - outflowMm) / 10;

  let irrigationCm = 0;
  if (field.waterSource.includes('Irrigated') && (field.currentAWDPhase === 'FLOODED' || field.currentAWDPhase === 'REFLOODING') && hour === 7) {
    irrigationCm = 0.5;
  }
  if (field.waterSource.includes('Backup') && field.currentAWDPhase === 'FLOODED' && field.waterLevelCm < 3 && hour === 8) {
    irrigationCm = 0.3;
  }

  field.waterLevelCm += waterChangeCm + irrigationCm;
  field.awdPhaseDayCounter += 1 / 24;

  switch (field.currentAWDPhase) {
    case 'FLOODED':
      if (field.awdPhaseDayCounter >= field.floodDays) {
        field.currentAWDPhase = 'DRAINING';
        field.awdPhaseDayCounter = 0;
      }
      if (field.waterLevelCm < 2 && field.waterSource.includes('Irrigated')) {
        field.waterLevelCm = Math.max(field.waterLevelCm, 3);
      }
      break;
    case 'DRAINING':
      if (field.waterLevelCm <= field.dryThresholdCm) {
        field.currentAWDPhase = 'DRY';
        field.awdPhaseDayCounter = 0;
      }
      break;
    case 'DRY':
      if (field.awdPhaseDayCounter >= field.dryDays) {
        field.currentAWDPhase = 'REFLOODING';
        field.awdPhaseDayCounter = 0;
      }
      if (rainfall > 5 && field.waterLevelCm > 0) {
        field.currentAWDPhase = 'REFLOODING';
        field.awdPhaseDayCounter = 0;
      }
      break;
    case 'REFLOODING':
      if (field.waterLevelCm >= field.floodTargetCm) {
        field.currentAWDPhase = 'FLOODED';
        field.awdPhaseDayCounter = 0;
        field.totalAWDCycles++;
      }
      if (field.waterSource.includes('Irrigated') && field.waterLevelCm < 5) {
        field.waterLevelCm += 0.3;
      }
      break;
  }
  field.waterLevelCm = Math.max(-25, Math.min(20, field.waterLevelCm));
}

// ─── IPCC Tier 1: AWD Scaling Factor ─────────────────────────────────
// Returns SF_AWD based on number of completed AWD cycles (drainage events).
// Reference: IPCC 2019 Refinement Vol. 4 Ch. 5, Table 5.12
function getSfAWD(cycles: number): number {
  if (cycles <= 0) return SF_AWD_CONTINUOUS;  // 0 cycles = continuous flooding
  if (cycles === 1) return SF_AWD_SINGLE;       // 1 aeration
  return SF_AWD_MULTIPLE;                       // 2+ aeration cycles
}

// Returns the baseline emission factor (kg CH₄/ha/day) for a field
// based on its water source type (T-VER-P-AG-001 default values).
function getBaselineEF(field: AWDFieldInternal): number {
  if (field.waterSource.includes('Irrigated')) return 1.30;
  if (field.waterSource.includes('Only')) return 0.70;     // rainfed only (drought-prone)
  return 1.00;                                             // rainfed + backup
}

// ─── Simulation Engine ──────────────────────────────────────────────
class AWDSimulationEngine {
  private fields: AWDFieldInternal[];
  private simRunning: boolean = false;
  private simTimer: ReturnType<typeof setInterval> | null = null;
  private simTickCounter: number = 0;
  private readings: AWDReading[] = [];
  private calcMode: CalcMode = 'full';

  constructor() {
    this.fields = createFields();
  }

  setCalcMode(mode: CalcMode): { success: boolean; calcMode: CalcMode; message: string } {
    this.calcMode = mode;
    return {
      success: true,
      calcMode: mode,
      message: mode === 'simplified'
        ? 'Switched to Simplified Mode (IPCC Tier 1, water level only)'
        : 'Switched to Full Sensor Mode (empirical model, 10+ sensors)',
    };
  }

  getCalcMode(): CalcMode {
    return this.calcMode;
  }

  getStatus(): SimStatus {
    return {
      running: this.simRunning,
      tickCounter: this.simTickCounter,
      speedFactor: SPEED_FACTOR,
      intervalMs: INTERVAL_MS,
      calcMode: this.calcMode,
      fields: this.fields.map((f) => ({
        id: f.id,
        name: f.name,
        nameTh: f.nameTh,
        province: f.province,
        provinceTh: f.provinceTh,
        lat: f.lat,
        lng: f.lng,
        areaHa: f.areaHa,
        soilType: f.soilType,
        waterSource: f.waterSource,
        riceVariety: f.riceVariety,
        totalDays: f.totalDays,
        boundary: f.boundary,
        currentDAP: f.currentDAP,
        currentHour: f.currentHour,
        waterLevelCm: Math.round(f.waterLevelCm * 10) / 10,
        currentAWDPhase: f.currentAWDPhase,
        awdCycles: f.totalAWDCycles,
        growthStage: getGrowthStage(f.currentDAP, f.totalDays),
        // Legacy
        cumulativeCH4g: Math.round(f.totalCH4g * 100) / 100,
        cumulativeN2Og: Math.round(f.totalN2Og * 100) / 100,
        // T-VER standard
        cumulativeCH4kg: Math.round(f.totalCH4kg * 1000) / 1000,
        cumulativeN2Okg: Math.round(f.totalN2Okg * 1000) / 1000,
        cumulativeCH4tCO2e: Math.round(f.totalCH4tCO2e * 10000) / 10000,
        cumulativeN2OtCO2e: Math.round(f.totalN2OtCO2e * 10000) / 10000,
        cumulativeNettCO2e: Math.round(f.totalNettCO2e * 10000) / 10000,
        baselineEmissiontCO2e: Math.round(f.baselineEmissiontCO2e * 10000) / 10000,
        emissionReductiontCO2e: Math.round(f.emissionReductiontCO2e * 10000) / 10000,
        estimatedYieldKg: Math.round(f.totalYieldKg),
        seasonComplete: f.seasonComplete,
      })),
    };
  }

  getSummary(): SimSummary {
    return {
      running: this.simRunning,
      tickCounter: this.simTickCounter,
      totalReadings: this.readings.length,
      fields: this.fields.map((f) => ({
        id: f.id,
        name: f.name,
        currentDAP: f.currentDAP,
        awdPhase: f.currentAWDPhase,
        seasonComplete: f.seasonComplete,
      })),
    };
  }

  getReadings(limit: number = 100): AWDReading[] {
    const maxLimit = Math.min(limit, 500);
    return this.readings.slice(-maxLimit);
  }

  startSim(): { success: boolean; running: boolean; message: string } {
    if (this.simRunning) return { success: true, running: true, message: 'Already running' };
    this.simRunning = true;
    this.simTimer = setInterval(() => this.simTick(), INTERVAL_MS);
    return { success: true, running: true, message: 'Simulation started' };
  }

  stopSim(): { success: boolean; running: boolean; message: string } {
    if (!this.simRunning) return { success: true, running: false, message: 'Already stopped' };
    this.simRunning = false;
    if (this.simTimer) {
      clearInterval(this.simTimer);
      this.simTimer = null;
    }
    return { success: true, running: false, message: 'Simulation stopped' };
  }

  resetSim(): { success: boolean; running: boolean; message: string } {
    this.stopSim();
    this.fields = createFields();
    this.simTickCounter = 0;
    this.readings = [];
    return { success: true, running: false, message: 'Simulation reset' };
  }

  private simTick(): void {
    this.simTickCounter++;
    const newReadings: AWDReading[] = [];

    for (const field of this.fields) {
      if (field.seasonComplete) continue;

      field.currentHour += SIM_HOURS_PER_TICK;
      if (field.currentHour >= 24) {
        field.currentHour -= 24;
        field.currentDAP++;
      }
      if (field.currentDAP >= field.totalDays) {
        field.seasonComplete = true;
        field.currentAWDPhase = 'DRY';
        field.waterLevelCm = -20;
      }

      const temp = getTemperature(field, field.currentHour);
      const humidity =
        field.baseHumidity +
        (field.currentAWDPhase === 'DRY' ? -8 : field.currentAWDPhase === 'FLOODED' ? 5 : 0) +
        Math.sin(field.currentDAP * 0.5 + field.currentHour * 0.2) * 5;
      const rainfall = getRainfallMm(field, field.currentDAP, field.currentHour);
      updateWaterLevel(field, rainfall);

      const growthStage = getGrowthStage(field.currentDAP, field.totalDays);
      const yieldKgPerHa = estimateYieldKgPerHa(field);

      // T-VER standard calculations
      const areaM2 = field.areaHa * 10000;
      const baselineEF = getBaselineEF(field);

      // ─── Branch on calculation mode ───────────────────────────────
      // FULL mode: empirical flux model using 10+ sensor variables
      // SIMPLIFIED mode: IPCC Tier 1 default method using water level only
      let ch4Flux = 0, n2oFlux = 0, co2Flux = 0;
      let soilMoisture = 0, soilPH = 0, soilTempC = 0;
      let ch4CO2e = 0, n2oCO2e = 0, totalGHGCO2e = 0, emissionReductionPct = 0;
      let sfAWD = 1.0;

      if (this.calcMode === 'simplified') {
        // ── Simplified Mode (IPCC Tier 1) ──────────────────────────
        // CH₄ = baseline EF × SF_AWD × Area × Period
        // Only water level + AWD cycle count are used.
        // N₂O and CO₂ are NOT measured in this mode.
        sfAWD = getSfAWD(field.totalAWDCycles);
        const projectCH4KgPerHour = (baselineEF * sfAWD * field.areaHa) / 24; // kg CH₄ this hour
        field.totalCH4kg += projectCH4KgPerHour;
        field.totalCH4tCO2e = field.totalCH4kg * KG_CH4_TO_TCO2E;
        // N₂O not calculated in simplified mode
        field.totalNettCO2e = field.totalCH4tCO2e;
        field.totalYieldKg = yieldKgPerHa * field.areaHa;

        // Baseline (continuous flooding, SF_AWD = 1.0)
        const baselineCH4KgThisHour = (baselineEF * field.areaHa) / 24;
        field.baselineEmissiontCO2e += baselineCH4KgThisHour * KG_CH4_TO_TCO2E;
        field.emissionReductiontCO2e = Math.max(0, field.baselineEmissiontCO2e - field.totalNettCO2e);

        // Back-calculate display flux from kg/ha/day for chart compatibility
        ch4Flux = projectCH4KgPerHour / field.areaHa * 24 / MG_M2_HR_TO_KG_HA_DAY; // kg/ha/day → mg/m²/hr
        n2oFlux = 0;
        co2Flux = 0;
        // Sensor values not measured — set to 0 (UI will show "not measured")
        soilMoisture = 0;
        soilPH = 0;
        soilTempC = 0;

        ch4CO2e = ch4Flux * GWP_CH4;
        n2oCO2e = 0;
        totalGHGCO2e = ch4CO2e;
        // Reduction % = (1 - SF_AWD) × 100
        emissionReductionPct = Math.round((1 - sfAWD) * 1000) / 10;
      } else {
        // ── Full Sensor Mode (empirical model) ─────────────────────
        ch4Flux = getCH4Emission(field, field.currentHour);
        n2oFlux = getN2OEmission(field);
        co2Flux = getCO2Flux(field, field.currentHour);
        soilMoisture = getSoilMoisture(field);
        soilPH = 5.5 + Math.sin(field.currentDAP * 0.1) * 0.3;
        soilTempC = temp - 2 + Math.sin(field.currentDAP * 0.3) * 0.5;

        // Legacy (g)
        field.totalCH4g += (ch4Flux * areaM2) / 1e6;
        field.totalN2Og += (n2oFlux * areaM2) / 1e6;

        // T-VER standard (kg, tCO2e)
        const ch4KgPerHaThisHour = (ch4Flux * MG_M2_HR_TO_KG_HA_DAY) / 24;
        const n2oKgPerHaThisHour = (n2oFlux * MG_M2_HR_TO_KG_HA_DAY) / 24;
        field.totalCH4kg += ch4KgPerHaThisHour * field.areaHa;
        field.totalN2Okg += n2oKgPerHaThisHour * field.areaHa;
        field.totalCH4tCO2e = field.totalCH4kg * KG_CH4_TO_TCO2E;
        field.totalN2OtCO2e = field.totalN2Okg * KG_N2O_TO_TCO2E;
        const co2KgThisHour = (co2Flux * areaM2) / 1e6;
        field.totalNettCO2e = field.totalCH4tCO2e + field.totalN2OtCO2e - (co2KgThisHour / 1000) * 0.3;
        field.totalYieldKg = yieldKgPerHa * field.areaHa;

        // T-VER Baseline (continuous flooding)
        const baselineCH4KgThisHour = (baselineEF * field.areaHa) / 24;
        field.baselineEmissiontCO2e += baselineCH4KgThisHour * KG_CH4_TO_TCO2E;
        field.emissionReductiontCO2e = Math.max(0, field.baselineEmissiontCO2e - field.totalNettCO2e);

        ch4CO2e = ch4Flux * GWP_CH4;
        n2oCO2e = n2oFlux * GWP_N2O;
        totalGHGCO2e = ch4CO2e + n2oCO2e - co2Flux;
        const baselineCH4Flux = ch4Flux / 0.6;
        emissionReductionPct = ((baselineCH4Flux - ch4Flux) / baselineCH4Flux) * 100;
      }

      newReadings.push({
        tick: this.simTickCounter,
        fieldId: field.id,
        fieldName: field.name,
        province: field.province,
        timestamp: new Date().toISOString(),
        simDAP: field.currentDAP,
        simHour: field.currentHour,
        growthStage,
        awdPhase: field.currentAWDPhase,
        awdCycles: field.totalAWDCycles,
        waterLevelCm: Math.round(field.waterLevelCm * 10) / 10,
        soilMoisturePct: Math.round(soilMoisture * 10) / 10,
        rainfallMmHr: Math.round(rainfall * 10) / 10,
        airTempC: Math.round(temp * 10) / 10,
        soilTempC: Math.round(soilTempC * 10) / 10,
        humidityPct: Math.round(humidity * 10) / 10,
        soilPH: Math.round(soilPH * 100) / 100,
        ch4FluxMgM2Hr: Math.round(ch4Flux * 100) / 100,
        ch4EfKgHaDay: Math.round(ch4Flux * MG_M2_HR_TO_KG_HA_DAY * 1000) / 1000,
        n2oFluxMgM2Hr: Math.round(n2oFlux * 100) / 100,
        n2oEfKgHaDay: Math.round(n2oFlux * MG_M2_HR_TO_KG_HA_DAY * 1000) / 1000,
        co2FluxMgM2Hr: Math.round(co2Flux * 10) / 10,
        ch4CO2eMgM2Hr: Math.round(ch4CO2e * 100) / 100,
        n2oCO2eMgM2Hr: Math.round(n2oCO2e * 100) / 100,
        netGHGCO2eMgM2Hr: Math.round(totalGHGCO2e * 100) / 100,
        emissionReductionPct: Math.round(emissionReductionPct * 10) / 10,
        // Legacy cumulative (g)
        cumulativeCH4g: Math.round(field.totalCH4g * 100) / 100,
        cumulativeN2Og: Math.round(field.totalN2Og * 100) / 100,
        // T-VER cumulative (kg, tCO2e)
        cumulativeCH4kg: Math.round(field.totalCH4kg * 1000) / 1000,
        cumulativeN2Okg: Math.round(field.totalN2Okg * 1000) / 1000,
        cumulativeCH4tCO2e: Math.round(field.totalCH4tCO2e * 10000) / 10000,
        cumulativeN2OtCO2e: Math.round(field.totalN2OtCO2e * 10000) / 10000,
        cumulativeNettCO2e: Math.round(field.totalNettCO2e * 10000) / 10000,
        baselineEmissiontCO2e: Math.round(field.baselineEmissiontCO2e * 10000) / 10000,
        emissionReductiontCO2e: Math.round(field.emissionReductiontCO2e * 10000) / 10000,
        estimatedYieldKg: Math.round(field.totalYieldKg),
        seasonComplete: field.seasonComplete,
        tverMethodology: 'T-VER-P-AG-001',
        tverGwpCH4: GWP_CH4,
        tverGwpN2O: GWP_N2O,
        // Calculation mode metadata
        calcMode: this.calcMode,
        sfAWD: this.calcMode === 'simplified' ? Math.round(sfAWD * 100) / 100 : undefined,
        baselineEFKgHaDay: this.calcMode === 'simplified' ? Math.round(baselineEF * 100) / 100 : undefined,
      });
    }

    this.readings.push(...newReadings);
    if (this.readings.length > 600) {
      this.readings = this.readings.slice(-600);
    }
  }
}

// ─── Singleton via globalThis ───────────────────────────────────────
// Bump this version when making code changes that require a fresh engine
const ENGINE_VERSION = 3;

const globalForSim = globalThis as typeof globalThis & {
  awdSimulation?: AWDSimulationEngine;
  awdSimulationVersion?: number;
};

export function getAWDSimulation(): AWDSimulationEngine {
  if (!globalForSim.awdSimulation || globalForSim.awdSimulationVersion !== ENGINE_VERSION) {
    // Clean up old instance if it exists
    if (globalForSim.awdSimulation) {
      try { globalForSim.awdSimulation.resetSim(); } catch { /* ignore */ }
    }
    globalForSim.awdSimulation = new AWDSimulationEngine();
    globalForSim.awdSimulationVersion = ENGINE_VERSION;
  }
  return globalForSim.awdSimulation;
}
