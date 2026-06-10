import { NextRequest, NextResponse } from 'next/server';

// ============================================================
// GWP Constants — aligned with T-VER standard
// T-VER uses IPCC AR4: CH₄ GWP = 25, N₂O GWP = 298
// International (CDM/VCS) uses IPCC AR5: CH₄ GWP = 28, N₂O GWP = 265
// ============================================================
const GWP_CH4_TVER = 25;   // T-VER / IPCC AR4
const GWP_CH4_IPCC = 28;   // IPCC AR5
const GWP_N2O_TVER = 298;
const GWP_N2O_IPCC = 265;

// T-VER uncertainty deductions
// < 2 years monitoring: 10% deduction
// ≥ 2 years monitoring: 5% deduction
const UNCERTAINTY_NEW = 0.10;  // < 2 years
const UNCERTAINTY_EST = 0.05;  // ≥ 2 years

// Simulation parameters and results
interface SimulationParams {
  simulationType: 'awd' | 'biogas' | 'solar' | 'biochar' | 'footprint' |
    'methanotrophs' | 'synmec' | 'ccu' | 'waste-to-value' | 'bioremediation';
  years?: number;
  standard?: 'tver' | 'ipcc';  // which GWP to use
  // AWD params
  baselineEmission?: number;
  mitigationFactor?: number;
  areaHa?: number;
  // Biogas params
  ch4CaptureRate?: number;
  animalUnits?: number;
  fuelDisplacementRate?: number;
  // Solar params
  systemCapacityKw?: number;
  capacityFactor?: number;
  gridEmissionFactor?: number;
  // Biochar params
  biocharMassKg?: number;
  carbonFraction?: number;
  stabilityFactor?: number;
  // Footprint params
  electricityKwh?: number;
  dieselLiters?: number;
  gasolineLiters?: number;
  naturalGasM3?: number;
  // BioCarbon params
  ch4Emission?: number;          // Methanotrophs: ton CH₄/yr
  efficiency?: number;           // Methanotrophs/CCU: oxidation/capture efficiency %
  organicLoad?: number;          // SynMEC: ton VS/day
  biogasYield?: number;          // SynMEC: m³ biogas/ton VS
  co2Input?: number;             // CCU: ton CO₂/yr
  captureEfficiency?: number;    // CCU: capture efficiency %
  wasteInput?: number;           // Waste-to-Value: ton waste/day
  processEfficiency?: number;    // Waste-to-Value: process efficiency %
  pollutantLoad?: number;        // Bioremediation: m³/day
  treatmentEfficiency?: number;  // Bioremediation: treatment efficiency %
}

interface SimulationYearResult {
  year: number;
  tco2e: number;
  cumulative: number;
  details: Record<string, unknown>;
}

function getGwpCh4(standard?: string): number {
  return standard === 'ipcc' ? GWP_CH4_IPCC : GWP_CH4_TVER;
}

function getUncertainty(year: number): number {
  return year < 2 ? UNCERTAINTY_NEW : UNCERTAINTY_EST;
}

// ============================================================
// Original Simulation Types
// ============================================================

function runAwdSimulation(params: SimulationParams): { results: SimulationYearResult[]; summary: Record<string, unknown> } {
  const years = params.years ?? 10;
  const baseline = params.baselineEmission ?? 3.5;
  const mitigation = params.mitigationFactor ?? 0.5;
  const area = params.areaHa ?? 100;
  const results: SimulationYearResult[] = [];
  let cumulative = 0;

  for (let y = 1; y <= years; y++) {
    const yearMitigation = mitigation * (1 + 0.02 * (y - 1));
    const tco2e = baseline * yearMitigation * area;
    cumulative += tco2e;
    results.push({
      year: y,
      tco2e: Math.round(tco2e * 100) / 100,
      cumulative: Math.round(cumulative * 100) / 100,
      details: { baseline, mitigationFactor: yearMitigation, area, formula: 'baseline × mitigation × area' },
    });
  }

  return {
    results,
    summary: {
      methodology: 'AWD (Alternate Wetting and Drying)',
      totalYears: years,
      areaHa: area,
      totalTco2e: Math.round(cumulative * 100) / 100,
      annualAverage: Math.round((cumulative / years) * 100) / 100,
    },
  };
}

function runBiogasSimulation(params: SimulationParams): { results: SimulationYearResult[]; summary: Record<string, unknown> } {
  const years = params.years ?? 10;
  const ch4Rate = params.ch4CaptureRate ?? 0.85;
  const animals = params.animalUnits ?? 500;
  const fuelRate = params.fuelDisplacementRate ?? 20;
  const results: SimulationYearResult[] = [];
  let cumulative = 0;

  for (let y = 1; y <= years; y++) {
    const ch4Baseline = animals * 3.0;
    const ch4Captured = ch4Baseline * ch4Rate;
    const fuelDisplaced = fuelRate * animals / 25;
    const tco2e = ch4Captured + fuelDisplaced;
    cumulative += tco2e;
    results.push({
      year: y,
      tco2e: Math.round(tco2e * 100) / 100,
      cumulative: Math.round(cumulative * 100) / 100,
      details: { ch4Captured: Math.round(ch4Captured * 100) / 100, fuelDisplaced: Math.round(fuelDisplaced * 100) / 100, animals, captureRate: ch4Rate },
    });
  }

  return {
    results,
    summary: {
      methodology: 'Biogas Capture',
      totalYears: years,
      animalUnits: animals,
      totalTco2e: Math.round(cumulative * 100) / 100,
      annualAverage: Math.round((cumulative / years) * 100) / 100,
    },
  };
}

function runSolarSimulation(params: SimulationParams): { results: SimulationYearResult[]; summary: Record<string, unknown> } {
  const years = params.years ?? 25;
  const capacityKw = params.systemCapacityKw ?? 500;
  const capacityFactor = params.capacityFactor ?? 0.18;
  const gridEF = params.gridEmissionFactor ?? 0.51;
  const results: SimulationYearResult[] = [];
  let cumulative = 0;

  for (let y = 1; y <= years; y++) {
    const degradation = 1 - 0.005 * (y - 1);
    const annualKwh = capacityKw * 8760 * capacityFactor * degradation;
    const tco2e = (annualKwh / 1000) * gridEF;
    cumulative += tco2e;
    results.push({
      year: y,
      tco2e: Math.round(tco2e * 100) / 100,
      cumulative: Math.round(cumulative * 100) / 100,
      details: {
        capacityKw,
        capacityFactor,
        degradation: Math.round(degradation * 1000) / 1000,
        annualKwh: Math.round(annualKwh),
        formula: '(kW × 8760 × CF × degradation) / 1000 × gridEF',
      },
    });
  }

  return {
    results,
    summary: {
      methodology: 'Solar PV',
      totalYears: years,
      systemCapacityKw: capacityKw,
      totalTco2e: Math.round(cumulative * 100) / 100,
      annualAverage: Math.round((cumulative / years) * 100) / 100,
    },
  };
}

function runBiocharSimulation(params: SimulationParams): { results: SimulationYearResult[]; summary: Record<string, unknown> } {
  const years = params.years ?? 10;
  const massKg = params.biocharMassKg ?? 50000;
  const carbonFraction = params.carbonFraction ?? 0.7;
  const stability = params.stabilityFactor ?? 0.85;
  const results: SimulationYearResult[] = [];
  let cumulative = 0;

  for (let y = 1; y <= years; y++) {
    const tco2e = massKg * carbonFraction * stability * 3.667;
    cumulative += tco2e;
    results.push({
      year: y,
      tco2e: Math.round(tco2e * 100) / 100,
      cumulative: Math.round(cumulative * 100) / 100,
      details: {
        massKg,
        carbonFraction,
        stability,
        conversionFactor: 3.667,
        formula: 'mass × carbon_fraction × stability × 3.667',
      },
    });
  }

  return {
    results,
    summary: {
      methodology: 'Biochar Carbon Removal',
      totalYears: years,
      annualProductionKg: massKg,
      totalTco2e: Math.round(cumulative * 100) / 100,
      annualAverage: Math.round((cumulative / years) * 100) / 100,
    },
  };
}

function runFootprintSimulation(params: SimulationParams): { results: Record<string, unknown>; summary: Record<string, unknown> } {
  const electricityKwh = params.electricityKwh ?? 100000;
  const dieselLiters = params.dieselLiters ?? 5000;
  const gasolineLiters = params.gasolineLiters ?? 3000;
  const naturalGasM3 = params.naturalGasM3 ?? 2000;

  const scope1 = {
    diesel: dieselLiters * 2.68,
    gasoline: gasolineLiters * 2.31,
    naturalGas: naturalGasM3 * 2.02,
  };
  const scope1Total = Object.values(scope1).reduce((sum, v) => sum + v, 0);

  const scope2 = {
    electricity: electricityKwh * 0.51,
  };
  const scope2Total = Object.values(scope2).reduce((sum, v) => sum + v, 0);

  const totalKgCO2e = scope1Total + scope2Total;

  return {
    results: {
      scope1: {
        breakdown: scope1,
        totalKgCO2e: Math.round(scope1Total * 100) / 100,
      },
      scope2: {
        breakdown: scope2,
        totalKgCO2e: Math.round(scope2Total * 100) / 100,
      },
      totalKgCO2e: Math.round(totalKgCO2e * 100) / 100,
      totalTco2e: Math.round((totalKgCO2e / 1000) * 1000) / 1000,
    },
    summary: {
      methodology: 'Carbon Footprint Assessment',
      inputs: { electricityKwh, dieselLiters, gasolineLiters, naturalGasM3 },
      largestContributor: scope1Total > scope2Total ? 'Scope 1 (Direct emissions)' : 'Scope 2 (Indirect energy)',
    },
  };
}

// ============================================================
// BioCarbon Simulation Types — T-VER & IPCC compliant
// ============================================================

/**
 * Methanotrophs Simulation (จุลินทรีย์ย่อยสลายมีเทน)
 * T-VER Reference: T-VER-AG-001 (Methane avoidance from biological waste)
 * CDM Reference: AMS-III.H (Methane recovery in waste treatment)
 *
 * Formula:
 *   ER_y = CH₄_avoided_y × GWP_CH₄ × (1 - uncertainty_deduction)
 *   CH₄_avoided_y = CH₄_emission × oxidation_efficiency
 */
function runMethanotrophsSimulation(params: SimulationParams): { results: SimulationYearResult[]; summary: Record<string, unknown> } {
  const years = params.years ?? 10;
  const standard = params.standard ?? 'tver';
  const gwpCh4 = getGwpCh4(standard);
  const ch4Emission = params.ch4Emission ?? 100;       // ton CH₄/yr
  const oxidationEff = (params.efficiency ?? 85) / 100; // oxidation efficiency
  const results: SimulationYearResult[] = [];
  let cumulative = 0;

  for (let y = 1; y <= years; y++) {
    // Slight efficiency improvement over years as biofilter matures
    const yearEff = Math.min(0.98, oxidationEff + 0.005 * (y - 1));
    const ch4Avoided = ch4Emission * yearEff;
    const uncertainty = getUncertainty(y);
    const grossReduction = ch4Avoided * gwpCh4;
    const tco2e = grossReduction * (1 - uncertainty);
    cumulative += tco2e;
    results.push({
      year: y,
      tco2e: Math.round(tco2e * 100) / 100,
      cumulative: Math.round(cumulative * 100) / 100,
      details: {
        ch4Emission,
        oxidationEfficiency: Math.round(yearEff * 1000) / 10,
        ch4Avoided: Math.round(ch4Avoided * 100) / 100,
        gwpCh4,
        uncertaintyDeduction: `${Math.round(uncertainty * 100)}%`,
        grossReduction: Math.round(grossReduction * 100) / 100,
        netReduction: Math.round(tco2e * 100) / 100,
        formula: `CH₄(${ch4Emission}t) × efficiency(${Math.round(yearEff * 100)}%) × GWP(${gwpCh4}) × (1-uncertainty(${Math.round(uncertainty * 100)}%))`,
        tverMethodology: 'T-VER-AG-001',
      },
    });
  }

  return {
    results,
    summary: {
      methodology: 'Methanotrophs — CH₄ Oxidation (จุลินทรีย์ย่อยสลายมีเทน)',
      tverReference: 'T-VER-AG-001',
      cdmReference: 'AMS-III.H',
      standard: standard === 'tver' ? 'TGO/T-VER (GWP=25, AR4)' : 'International/IPCC (GWP=28, AR5)',
      totalYears: years,
      ch4Emission,
      avgOxidationEfficiency: Math.round((oxidationEff + Math.min(0.98, oxidationEff + 0.005 * (years - 1))) / 2 * 1000) / 10,
      totalTco2e: Math.round(cumulative * 100) / 100,
      annualAverage: Math.round((cumulative / years) * 100) / 100,
    },
  };
}

/**
 * SynMEC Simulation (สหชีวภาพผลิตมีเทน — Syntrophic Methanogenic Consortium)
 * T-VER Reference: T-VER-WT-001 (Wastewater treatment), T-VER-AG-001
 * CDM Reference: AMS-III.H, ACM-0014
 *
 * Formula:
 *   ER_y = OrganicLoad × 365 × (BiogasYield/1000) × CH₄_fraction × GWP_CH₄ × (1 - uncertainty)
 *   CH₄_fraction = 0.65 (typical biogas CH₄ content)
 */
function runSynMECSimulation(params: SimulationParams): { results: SimulationYearResult[]; summary: Record<string, unknown> } {
  const years = params.years ?? 10;
  const standard = params.standard ?? 'tver';
  const gwpCh4 = getGwpCh4(standard);
  const organicLoad = params.organicLoad ?? 50;         // ton VS/day
  const biogasYield = params.biogasYield ?? 35;         // m³ biogas/ton VS
  const ch4Fraction = 0.65;                              // 65% CH₄ in biogas
  const results: SimulationYearResult[] = [];
  let cumulative = 0;

  for (let y = 1; y <= years; y++) {
    const uncertainty = getUncertainty(y);
    // Annual CH₄ production: daily load × 365 days × biogas yield × CH₄ fraction
    const annualCh4Kg = organicLoad * 365 * biogasYield * ch4Fraction * 0.000716; // m³ CH₄ to ton (0.716 kg/m³ at STP → /1000)
    const ch4Ton = organicLoad * 365 * (biogasYield / 1000) * ch4Fraction; // simplified: ton CH₄/yr
    const grossReduction = ch4Ton * gwpCh4;
    const tco2e = grossReduction * (1 - uncertainty);
    cumulative += tco2e;
    results.push({
      year: y,
      tco2e: Math.round(tco2e * 100) / 100,
      cumulative: Math.round(cumulative * 100) / 100,
      details: {
        organicLoad,
        biogasYield,
        ch4Fraction,
        annualCh4Ton: Math.round(ch4Ton * 100) / 100,
        gwpCh4,
        uncertaintyDeduction: `${Math.round(uncertainty * 100)}%`,
        grossReduction: Math.round(grossReduction * 100) / 100,
        netReduction: Math.round(tco2e * 100) / 100,
        formula: `VS(${organicLoad}t/d) × 365 × yield(${biogasYield}m³/tVS) × CH₄%(${ch4Fraction}) / 1000 × GWP(${gwpCh4}) × (1-unc(${Math.round(uncertainty * 100)}%))`,
        tverMethodology: 'T-VER-WT-001 / T-VER-AG-001',
      },
    });
  }

  return {
    results,
    summary: {
      methodology: 'SynMEC — Syntrophic Methanogenic Consortium (สหชีวภาพผลิตมีเทน)',
      tverReference: 'T-VER-WT-001, T-VER-AG-001',
      cdmReference: 'AMS-III.H, ACM-0014',
      standard: standard === 'tver' ? 'TGO/T-VER (GWP=25, AR4)' : 'International/IPCC (GWP=28, AR5)',
      totalYears: years,
      organicLoadTonVSPerDay: organicLoad,
      biogasYieldM3PerTonVS: biogasYield,
      ch4Fraction,
      totalTco2e: Math.round(cumulative * 100) / 100,
      annualAverage: Math.round((cumulative / years) * 100) / 100,
    },
  };
}

/**
 * CCU Simulation (การดักจับและใช้ประโยชน์ CO₂ — Microbial CO₂ Capture & Utilization)
 * T-VER Reference: T-VER-P-RE-001 (Renewable energy), emerging bio-CCU methodology
 * International: VCS VM-0041 (CCU methodology)
 *
 * Formula:
 *   ER_y = CO₂_input × capture_efficiency × (1 - uncertainty)
 *   Direct CO₂ avoidance — no GWP multiplication needed (already CO₂)
 */
function runCCUSimulation(params: SimulationParams): { results: SimulationYearResult[]; summary: Record<string, unknown> } {
  const years = params.years ?? 10;
  const standard = params.standard ?? 'tver';
  const co2Input = params.co2Input ?? 5000;                     // ton CO₂/yr
  const captureEff = (params.captureEfficiency ?? 80) / 100;    // capture efficiency
  const results: SimulationYearResult[] = [];
  let cumulative = 0;

  for (let y = 1; y <= years; y++) {
    const uncertainty = getUncertainty(y);
    // Slight efficiency improvement over years
    const yearEff = Math.min(0.95, captureEff + 0.003 * (y - 1));
    const co2Captured = co2Input * yearEff;
    const grossReduction = co2Captured; // Already in tCO₂e (direct CO₂)
    const tco2e = grossReduction * (1 - uncertainty);
    cumulative += tco2e;
    results.push({
      year: y,
      tco2e: Math.round(tco2e * 100) / 100,
      cumulative: Math.round(cumulative * 100) / 100,
      details: {
        co2Input,
        captureEfficiency: Math.round(yearEff * 1000) / 10,
        co2Captured: Math.round(co2Captured * 100) / 100,
        uncertaintyDeduction: `${Math.round(uncertainty * 100)}%`,
        grossReduction: Math.round(grossReduction * 100) / 100,
        netReduction: Math.round(tco2e * 100) / 100,
        formula: `CO₂(${co2Input}t) × efficiency(${Math.round(yearEff * 100)}%) × (1-uncertainty(${Math.round(uncertainty * 100)}%))`,
        tverMethodology: 'T-VER-P-RE-001 (emerging CCU)',
        note: 'Direct CO₂ avoidance — no GWP multiplication needed',
      },
    });
  }

  return {
    results,
    summary: {
      methodology: 'CCU — Microbial CO₂ Capture & Utilization (การดักจับและใช้ประโยชน์ CO₂)',
      tverReference: 'T-VER-P-RE-001 (emerging CCU)',
      verraReference: 'VCS VM-0041',
      standard: standard === 'tver' ? 'TGO/T-VER' : 'International/IPCC',
      totalYears: years,
      co2InputTonPerYear: co2Input,
      avgCaptureEfficiency: Math.round((captureEff + Math.min(0.95, captureEff + 0.003 * (years - 1))) / 2 * 1000) / 10,
      totalTco2e: Math.round(cumulative * 100) / 100,
      annualAverage: Math.round((cumulative / years) * 100) / 100,
    },
  };
}

/**
 * Waste-to-Value Simulation (เปลี่ยนของเสียเป็นผลิตภัณฑ์)
 * T-VER Reference: T-VER-AG-001 (Methane avoidance from waste)
 * CDM Reference: AMS-III.F (Avoidance of methane through composting)
 *
 * Formula:
 *   ER_y = Waste × 365 × MCF × DOC × F × GWP_CH₄ × process_efficiency × (1 - uncertainty)
 *   Simplified: 5% CH₄ potential from waste × process efficiency × GWP
 *   MCF (Methane Conversion Factor) = 0.05 (managed waste)
 */
function runWasteToValueSimulation(params: SimulationParams): { results: SimulationYearResult[]; summary: Record<string, unknown> } {
  const years = params.years ?? 10;
  const standard = params.standard ?? 'tver';
  const gwpCh4 = getGwpCh4(standard);
  const wasteInput = params.wasteInput ?? 100;                      // ton waste/day
  const processEff = (params.processEfficiency ?? 65) / 100;        // process efficiency
  const mcf = 0.05;  // Methane conversion factor for managed waste (IPCC default)
  const results: SimulationYearResult[] = [];
  let cumulative = 0;

  for (let y = 1; y <= years; y++) {
    const uncertainty = getUncertainty(y);
    // CH₄ avoided: waste × 365 × MCF × process efficiency
    const ch4Avoided = wasteInput * 365 * mcf * processEff; // ton CH₄/yr
    const grossReduction = ch4Avoided * gwpCh4;
    const tco2e = grossReduction * (1 - uncertainty);
    cumulative += tco2e;
    results.push({
      year: y,
      tco2e: Math.round(tco2e * 100) / 100,
      cumulative: Math.round(cumulative * 100) / 100,
      details: {
        wasteInput,
        processEfficiency: Math.round(processEff * 1000) / 10,
        methaneConversionFactor: mcf,
        ch4Avoided: Math.round(ch4Avoided * 100) / 100,
        gwpCh4,
        uncertaintyDeduction: `${Math.round(uncertainty * 100)}%`,
        grossReduction: Math.round(grossReduction * 100) / 100,
        netReduction: Math.round(tco2e * 100) / 100,
        formula: `Waste(${wasteInput}t/d) × 365 × MCF(${mcf}) × efficiency(${Math.round(processEff * 100)}%) × GWP(${gwpCh4}) × (1-unc(${Math.round(uncertainty * 100)}%))`,
        tverMethodology: 'T-VER-AG-001',
      },
    });
  }

  return {
    results,
    summary: {
      methodology: 'Waste-to-Value (เปลี่ยนของเสียเป็นผลิตภัณฑ์)',
      tverReference: 'T-VER-AG-001',
      cdmReference: 'AMS-III.F',
      standard: standard === 'tver' ? 'TGO/T-VER (GWP=25, AR4)' : 'International/IPCC (GWP=28, AR5)',
      totalYears: years,
      wasteInputTonPerDay: wasteInput,
      processEfficiencyPct: Math.round(processEff * 1000) / 10,
      methaneConversionFactor: mcf,
      totalTco2e: Math.round(cumulative * 100) / 100,
      annualAverage: Math.round((cumulative / years) * 100) / 100,
    },
  };
}

/**
 * Bioremediation Simulation (การบำบัดทางชีวภาพ)
 * T-VER Reference: T-VER-WT-001 (Wastewater treatment)
 * CDM Reference: AMS-III.H (Methane recovery)
 *
 * Formula:
 *   ER_y = PollutantLoad × 365 × emission_factor × treatment_efficiency × GWP_CH₄ × (1 - uncertainty)
 *   emission_factor = 0.001 (small CH₄ potential per m³ treated)
 */
function runBioremediationSimulation(params: SimulationParams): { results: SimulationYearResult[]; summary: Record<string, unknown> } {
  const years = params.years ?? 10;
  const standard = params.standard ?? 'tver';
  const gwpCh4 = getGwpCh4(standard);
  const pollutantLoad = params.pollutantLoad ?? 500;                       // m³/day
  const treatmentEff = (params.treatmentEfficiency ?? 75) / 100;           // treatment efficiency
  const ch4EmissionFactor = 0.001;  // ton CH₄ per m³ treated (small CH₄ potential)
  const results: SimulationYearResult[] = [];
  let cumulative = 0;

  for (let y = 1; y <= years; y++) {
    const uncertainty = getUncertainty(y);
    // CH₄ avoided from bioremediation
    const ch4Avoided = pollutantLoad * 365 * ch4EmissionFactor * treatmentEff; // ton CH₄/yr
    const grossReduction = ch4Avoided * gwpCh4;
    const tco2e = grossReduction * (1 - uncertainty);
    cumulative += tco2e;
    results.push({
      year: y,
      tco2e: Math.round(tco2e * 100) / 100,
      cumulative: Math.round(cumulative * 100) / 100,
      details: {
        pollutantLoad,
        treatmentEfficiency: Math.round(treatmentEff * 1000) / 10,
        ch4EmissionFactor,
        ch4Avoided: Math.round(ch4Avoided * 100) / 100,
        gwpCh4,
        uncertaintyDeduction: `${Math.round(uncertainty * 100)}%`,
        grossReduction: Math.round(grossReduction * 100) / 100,
        netReduction: Math.round(tco2e * 100) / 100,
        formula: `Pollutant(${pollutantLoad}m³/d) × 365 × EF(${ch4EmissionFactor}) × efficiency(${Math.round(treatmentEff * 100)}%) × GWP(${gwpCh4}) × (1-unc(${Math.round(uncertainty * 100)}%))`,
        tverMethodology: 'T-VER-WT-001',
      },
    });
  }

  return {
    results,
    summary: {
      methodology: 'Bioremediation (การบำบัดทางชีวภาพ)',
      tverReference: 'T-VER-WT-001',
      cdmReference: 'AMS-III.H',
      standard: standard === 'tver' ? 'TGO/T-VER (GWP=25, AR4)' : 'International/IPCC (GWP=28, AR5)',
      totalYears: years,
      pollutantLoadM3PerDay: pollutantLoad,
      treatmentEfficiencyPct: Math.round(treatmentEff * 1000) / 10,
      ch4EmissionFactor,
      totalTco2e: Math.round(cumulative * 100) / 100,
      annualAverage: Math.round((cumulative / years) * 100) / 100,
    },
  };
}

// ============================================================
// Main POST handler
// ============================================================
const VALID_TYPES = [
  'awd', 'biogas', 'solar', 'biochar', 'footprint',
  'methanotrophs', 'synmec', 'ccu', 'waste-to-value', 'bioremediation',
];

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SimulationParams;

    const simulationType = body.simulationType || (body as unknown as Record<string, unknown>).type as string || '';
    if (!simulationType) {
      return NextResponse.json(
        { error: 'simulationType is required', validTypes: VALID_TYPES },
        { status: 400 },
      );
    }

    let simulationResult: Record<string, unknown>;

    switch (simulationType) {
      case 'awd':
        simulationResult = runAwdSimulation(body);
        break;
      case 'biogas':
        simulationResult = runBiogasSimulation(body);
        break;
      case 'solar':
        simulationResult = runSolarSimulation(body);
        break;
      case 'biochar':
        simulationResult = runBiocharSimulation(body);
        break;
      case 'footprint':
        simulationResult = runFootprintSimulation(body);
        break;
      case 'methanotrophs':
        simulationResult = runMethanotrophsSimulation(body);
        break;
      case 'synmec':
        simulationResult = runSynMECSimulation(body);
        break;
      case 'ccu':
        simulationResult = runCCUSimulation(body);
        break;
      case 'waste-to-value':
        simulationResult = runWasteToValueSimulation(body);
        break;
      case 'bioremediation':
        simulationResult = runBioremediationSimulation(body);
        break;
      default:
        return NextResponse.json(
          { error: `Unknown simulation type: ${simulationType}`, validTypes: VALID_TYPES },
          { status: 400 },
        );
    }

    return NextResponse.json({
      success: true,
      simulationType,
      simulation: simulationResult,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Simulation error:', error);
    return NextResponse.json({ error: 'Simulation failed', details: String(error) }, { status: 500 });
  }
}
