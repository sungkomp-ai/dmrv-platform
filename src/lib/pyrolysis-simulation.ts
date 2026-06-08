/**
 * Pyrolysis Biochar Carbon Sequestration Simulation Engine
 * Embedded directly in the Next.js process (no external mini-service needed).
 *
 * T-VER Standard Compliance:
 *   - Methodology: T-VER-P-AG-003 (Biochar Carbon Sequestration)
 *   - Also referenced as T-VER-P-CC-001 in the frontend for credit calculation
 *   - Stoichiometric ratio: 44/12 = 3.667 (C to CO₂)
 *   - Carbon fraction varies by temperature: 0.70 (400°C) to 0.85 (700°C)
 *   - Stability factor (permanence): 0.85 (400°C) to 0.94 (700°C)
 *   - Credit formula: ER = M_biochar(t) × f_C × f_perm × (44/12)
 *   - Unit: tCO₂e (tonnes CO₂ equivalent)
 *
 * 3 pyrolysis rounds with different feedstocks:
 *   Round 1: Eucalyptus Hardwood (500 kg, 400°C)
 *   Round 2: Rice Husk (300 kg, 550°C)
 *   Round 3: Coconut Shell (400 kg, 700°C)
 *
 * 60x speed factor, 5-second real-time interval = 5 simulated minutes per tick
 */

// ─── Constants ──────────────────────────────────────────────────────
const REAL_INTERVAL_MS = 5000;
const SIMULATED_MINUTES_PER_TICK = 5;
const STOICHIOMETRIC_RATIO = 3.667; // 44/12

// ─── Types ──────────────────────────────────────────────────────────

export interface PyrolysisRound {
  roundId: number;
  feedstock: string;
  feedstockMassKg: number;
  targetTempC: number;
  moisturePercent: number;
  durationMin: number;
  oxygenLevelPercent: number;
}

export interface IoTSensorReading {
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

export interface RoundCompleteEvent {
  roundId: number;
  feedstock: string;
  totalReadings: number;
  finalBiocharKg: number;
  carbonSequesteredKg: number;
}

export interface SimulationStatus {
  running: boolean;
  roundIndex: number;
  round: PyrolysisRound | null;
  elapsedMin: number;
}

export interface PyrolysisSummary {
  roundId: number;
  feedstock: string;
  feedstockMassKg: number;
  targetTempC: number;
  moisturePercent: number;
  durationMin: number;
  readingCount: number;
  finalBiocharKg: number;
  carbonSequesteredKg: number;
  avgTempC: number;
  peakCoPpm: number;
  peakCo2Ppm: number;
  status: string;
}

export interface PyrolysisFullStatus {
  running: boolean;
  currentRound: number;
  totalRounds: number;
  totalReadings: number;
  rounds: (PyrolysisRound & { readingCount: number })[];
  currentRoundIndex: number;
  elapsedMin: number;
  currentRoundConfig: PyrolysisRound | null;
  completedRounds: RoundCompleteEvent[];
}

// ─── Round Configurations ───────────────────────────────────────────

const ROUNDS: PyrolysisRound[] = [
  {
    roundId: 1,
    feedstock: 'ไม้ยูคาลิปตัส (Eucalyptus Hardwood)',
    feedstockMassKg: 500,
    targetTempC: 400,
    moisturePercent: 18,
    durationMin: 360,
    oxygenLevelPercent: 3.5,
  },
  {
    roundId: 2,
    feedstock: 'แกลบ (Rice Husk)',
    feedstockMassKg: 300,
    targetTempC: 550,
    moisturePercent: 8,
    durationMin: 240,
    oxygenLevelPercent: 2.0,
  },
  {
    roundId: 3,
    feedstock: 'กะลามะพร้าว (Coconut Shell)',
    feedstockMassKg: 400,
    targetTempC: 700,
    moisturePercent: 25,
    durationMin: 420,
    oxygenLevelPercent: 1.5,
  },
];

// ─── Calculation Functions ───────────────────────────────────────────

function getTemperature(round: PyrolysisRound, elapsedMin: number): number {
  const { targetTempC, durationMin, moisturePercent } = round;
  const dryingEnd = (moisturePercent / 100) * durationMin * 0.3 + 20;
  const pyrolysisStart = dryingEnd + 15;
  const pyrolysisEnd = durationMin * 0.85;

  if (elapsedMin < dryingEnd) {
    const progress = elapsedMin / dryingEnd;
    return 25 + progress * 125;
  } else if (elapsedMin < pyrolysisStart) {
    const progress = (elapsedMin - dryingEnd) / (pyrolysisStart - dryingEnd);
    return 150 + progress * (targetTempC - 150);
  } else if (elapsedMin < pyrolysisEnd) {
    const noise = (Math.random() - 0.5) * 20;
    return targetTempC + noise;
  } else if (elapsedMin < durationMin) {
    const progress = (elapsedMin - pyrolysisEnd) / (durationMin - pyrolysisEnd);
    return targetTempC * (1 - progress * 0.7) + 25 * progress * 0.7 + (Math.random() - 0.5) * 10;
  } else {
    return 25 + Math.random() * 5;
  }
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

function generateSensorReading(round: PyrolysisRound, elapsedMin: number): IoTSensorReading {
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
    const coolProgress = (elapsedMin - round.durationMin * 0.85) / (round.durationMin * 0.15);
    coPpm = 200 * (1 - coolProgress) + Math.random() * 50;
    co2Ppm = 2000 * (1 - coolProgress) + Math.random() * 200;
    ch4Ppm = 100 * (1 - coolProgress) + Math.random() * 30;
  }

  const maxBiocharYield = round.feedstockMassKg * (0.25 + (round.targetTempC / 700) * 0.1);
  let biocharMass = 0;
  if (phase === 'PYROLYSIS') {
    const pyrolysisProgress = Math.min(
      (elapsedMin - ((round.moisturePercent / 100) * round.durationMin * 0.3 + 35)) /
        (round.durationMin * 0.85 - ((round.moisturePercent / 100) * round.durationMin * 0.3 + 35)),
      1
    );
    biocharMass = maxBiocharYield * pyrolysisProgress;
  } else if (phase === 'COOLING' || phase === 'COMPLETE') {
    biocharMass = maxBiocharYield;
  }

  const feedstockRemaining = Math.max(round.feedstockMassKg - round.feedstockMassKg * progress * 0.9, 0);

  let energyOutputKj = 0;
  if (phase === 'PYROLYSIS') {
    energyOutputKj = (round.feedstockMassKg * 16) * progress + (Math.random() - 0.5) * 500;
  } else if (phase === 'COOLING' || phase === 'COMPLETE') {
    energyOutputKj = round.feedstockMassKg * 16;
  }

  // T-VER-P-AG-003 / T-VER-P-CC-001 calculation
  const carbonFraction = 0.7 + (round.targetTempC / 700) * 0.15;
  const stabilityFactor = 0.85 + (round.targetTempC / 700) * 0.1;
  const carbonSequestered = biocharMass * carbonFraction * stabilityFactor * STOICHIOMETRIC_RATIO;

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
    feedstockRemainingKg: Math.round(Math.max(feedstockRemaining, 0) * 100) / 100,
    energyOutputKj: Math.round(Math.max(energyOutputKj, 0) * 10) / 10,
    carbonSequesteredKg: Math.round(Math.max(carbonSequestered, 0) * 1000) / 1000,
    phase,
  };
}

// ─── Simulation Engine ──────────────────────────────────────────────

class PyrolysisSimulationEngine {
  private simRunning: boolean = false;
  private simTimer: ReturnType<typeof setInterval> | null = null;
  private currentRoundIndex: number = 0;
  private currentElapsedMin: number = 0;
  private allReadings: IoTSensorReading[] = [];
  private roundReadings: Map<number, IoTSensorReading[]> = new Map();
  private completedRounds: RoundCompleteEvent[] = [];

  getStatus(): PyrolysisFullStatus {
    return {
      running: this.simRunning,
      currentRound: this.currentRoundIndex + 1,
      totalRounds: ROUNDS.length,
      totalReadings: this.allReadings.length,
      rounds: ROUNDS.map((r) => ({
        ...r,
        readingCount: this.roundReadings.get(r.roundId)?.length || 0,
      })),
      currentRoundIndex: this.currentRoundIndex,
      elapsedMin: this.currentElapsedMin,
      currentRoundConfig: this.simRunning ? ROUNDS[this.currentRoundIndex] || null : null,
      completedRounds: this.completedRounds,
    };
  }

  getSimulationStatus(): SimulationStatus {
    return {
      running: this.simRunning,
      roundIndex: this.currentRoundIndex,
      round: this.simRunning ? ROUNDS[this.currentRoundIndex] || null : null,
      elapsedMin: this.currentElapsedMin,
    };
  }

  getReadings(roundId?: number): { readings: IoTSensorReading[]; count: number } {
    if (roundId) {
      const data = this.roundReadings.get(roundId) || [];
      return { readings: data, count: data.length };
    }
    return { readings: this.allReadings, count: this.allReadings.length };
  }

  getRounds(): PyrolysisRound[] {
    return ROUNDS;
  }

  getSummary(): { summaries: PyrolysisSummary[]; totalCarbonKg: number } {
    const summaries: PyrolysisSummary[] = ROUNDS.map((round) => {
      const rds = this.roundReadings.get(round.roundId) || [];
      const lastReading = rds[rds.length - 1];
      return {
        roundId: round.roundId,
        feedstock: round.feedstock,
        feedstockMassKg: round.feedstockMassKg,
        targetTempC: round.targetTempC,
        moisturePercent: round.moisturePercent,
        durationMin: round.durationMin,
        readingCount: rds.length,
        finalBiocharKg: lastReading?.biocharMassKg || 0,
        carbonSequesteredKg: lastReading?.carbonSequesteredKg || 0,
        avgTempC: rds.length > 0
          ? Math.round(rds.reduce((s, r) => s + r.temperatureC, 0) / rds.length * 10) / 10
          : 0,
        peakCoPpm: rds.length > 0
          ? Math.round(Math.max(...rds.map(r => r.coPpm)) * 10) / 10
          : 0,
        peakCo2Ppm: rds.length > 0
          ? Math.round(Math.max(...rds.map(r => r.co2Ppm)) * 10) / 10
          : 0,
        status: lastReading?.phase || 'PENDING',
      };
    });
    return {
      summaries,
      totalCarbonKg: summaries.reduce((s, r) => s + r.carbonSequesteredKg, 0),
    };
  }

  startSim(): { success: boolean; running: boolean; message: string } {
    if (this.simRunning) return { success: true, running: true, message: 'Already running' };

    this.simRunning = true;
    this.currentRoundIndex = 0;
    this.currentElapsedMin = 0;
    this.allReadings = [];
    this.roundReadings = new Map();
    this.completedRounds = [];

    console.log('[Pyrolysis] Simulation started — 3 rounds, 60x speed');

    this.simTimer = setInterval(() => this.simTick(), REAL_INTERVAL_MS);

    return { success: true, running: true, message: 'Simulation started' };
  }

  stopSim(): { success: boolean; running: boolean; message: string } {
    if (!this.simRunning) return { success: true, running: false, message: 'Already stopped' };
    this.simRunning = false;
    if (this.simTimer) {
      clearInterval(this.simTimer);
      this.simTimer = null;
    }
    console.log(`[Pyrolysis] Simulation stopped — ${this.allReadings.length} total readings`);
    return { success: true, running: false, message: 'Simulation stopped' };
  }

  resetSim(): { success: boolean; running: boolean; message: string } {
    this.stopSim();
    this.currentRoundIndex = 0;
    this.currentElapsedMin = 0;
    this.allReadings = [];
    this.roundReadings = new Map();
    this.completedRounds = [];
    console.log('[Pyrolysis] Simulation reset');
    return { success: true, running: false, message: 'Simulation reset' };
  }

  private simTick(): void {
    if (this.currentRoundIndex >= ROUNDS.length) {
      this.stopSim();
      return;
    }

    const round = ROUNDS[this.currentRoundIndex];
    const reading = generateSensorReading(round, this.currentElapsedMin);

    this.allReadings.push(reading);
    if (!this.roundReadings.has(round.roundId)) this.roundReadings.set(round.roundId, []);
    this.roundReadings.get(round.roundId)!.push(reading);

    this.currentElapsedMin += SIMULATED_MINUTES_PER_TICK;

    if (this.currentElapsedMin >= round.durationMin + 30) {
      // Generate final COMPLETE reading
      const finalReading = generateSensorReading(round, round.durationMin + 30);
      finalReading.phase = 'COMPLETE';
      finalReading.temperatureC = 25 + Math.random() * 3;
      finalReading.o2Percent = 20.9;
      finalReading.biocharMassKg = round.feedstockMassKg * (0.25 + (round.targetTempC / 700) * 0.1);
      finalReading.feedstockRemainingKg = 0;
      this.allReadings.push(finalReading);
      this.roundReadings.get(round.roundId)!.push(finalReading);

      const completedEvent: RoundCompleteEvent = {
        roundId: round.roundId,
        feedstock: round.feedstock,
        totalReadings: this.roundReadings.get(round.roundId)!.length,
        finalBiocharKg: finalReading.biocharMassKg,
        carbonSequesteredKg: finalReading.carbonSequesteredKg,
      };
      this.completedRounds.push(completedEvent);

      console.log(`[Pyrolysis] Round ${round.roundId} complete — ${finalReading.biocharMassKg.toFixed(1)} kg biochar, ${finalReading.carbonSequesteredKg.toFixed(2)} kg CO2e`);

      this.currentRoundIndex++;
      this.currentElapsedMin = 0;

      if (this.currentRoundIndex >= ROUNDS.length) {
        this.simRunning = false;
        if (this.simTimer) {
          clearInterval(this.simTimer);
          this.simTimer = null;
        }
        console.log('[Pyrolysis] All rounds complete');
      }
    }

    // Cap stored readings to prevent memory issues
    if (this.allReadings.length > 2000) {
      this.allReadings = this.allReadings.slice(-1500);
    }
  }
}

// ─── Singleton via globalThis ───────────────────────────────────────
// Bump this version when making code changes that require a fresh engine
const ENGINE_VERSION = 1;

const globalForSim = globalThis as typeof globalThis & {
  pyrolysisSimulation?: PyrolysisSimulationEngine;
  pyrolysisSimulationVersion?: number;
};

export function getPyrolysisSimulation(): PyrolysisSimulationEngine {
  if (!globalForSim.pyrolysisSimulation || globalForSim.pyrolysisSimulationVersion !== ENGINE_VERSION) {
    // Clean up old instance if it exists
    if (globalForSim.pyrolysisSimulation) {
      try { globalForSim.pyrolysisSimulation.resetSim(); } catch { /* ignore */ }
    }
    globalForSim.pyrolysisSimulation = new PyrolysisSimulationEngine();
    globalForSim.pyrolysisSimulationVersion = ENGINE_VERSION;
  }
  return globalForSim.pyrolysisSimulation;
}
