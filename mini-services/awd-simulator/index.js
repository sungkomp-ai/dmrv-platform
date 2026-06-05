/**
 * AWD Rice Cultivation Simulator - JavaScript
 * 3 areas, 1800x speed, 1hr interval
 */

// Global error handlers to prevent crashes
process.on('uncaughtException', (err) => { console.error('[AWD] Uncaught Exception:', err.message); });
process.on('unhandledRejection', (err) => { console.error('[AWD] Unhandled Rejection:', err); });

const { createServer } = require('http');
const { Server } = require('socket.io');

const PORT = 3032;
const SPEED_FACTOR = 1800;
const INTERVAL_MS = 2000;
const SIM_HOURS_PER_TICK = 1;

function createFields() {
  return [
    {
      id: 'awd-korat',
      name: 'Nakhon Ratchasima AWD (Irrigated)',
      nameTh: '\u0e19\u0e04\u0e23\u0e23\u0e32\u0e0a\u0e2a\u0e35\u0e21\u0e32 AWD (\u0e0a\u0e25\u0e1b\u0e23\u0e30\u0e17\u0e32\u0e19)',
      province: 'Nakhon Ratchasima',
      provinceTh: '\u0e19\u0e04\u0e23\u0e23\u0e32\u0e0a\u0e2a\u0e35\u0e21\u0e32',
      lat: 14.97, lng: 102.08, areaHa: 48,
      soilType: 'Sandy Loam', waterSource: 'Irrigated (Lam Takhong Dam)',
      riceVariety: 'KDML105 (Jasmine Rice)', totalDays: 120,
      boundary: [[14.985,102.060],[14.985,102.100],[14.960,102.100],[14.960,102.080],[14.955,102.070],[14.960,102.060]],
      baseTempMin: 22, baseTempMax: 34, baseHumidity: 72, annualRainfallMm: 1100,
      floodTargetCm: 10, dryThresholdCm: -15, floodDays: 7, dryDays: 5,
      currentDAP: 0, currentHour: 6, waterLevelCm: 0,
      currentAWDPhase: 'FLOODED', awdPhaseDayCounter: 0, totalAWDCycles: 0,
      totalCH4g: 0, totalN2Og: 0, totalYieldKg: 0, seasonComplete: false,
    },
    {
      id: 'awd-suphan',
      name: 'Suphan Buri AWD (Rainfed)',
      nameTh: '\u0e2a\u0e38\u0e1e\u0e23\u0e23\u0e13\u0e1a\u0e38\u0e23\u0e35 AWD (\u0e19\u0e49\u0e33\u0e1d\u0e19)',
      province: 'Suphan Buri',
      provinceTh: '\u0e2a\u0e38\u0e1e\u0e23\u0e23\u0e13\u0e1a\u0e38\u0e23\u0e35',
      lat: 14.47, lng: 100.12, areaHa: 32,
      soilType: 'Clay', waterSource: 'Rainfed + Backup Pump',
      riceVariety: 'PTT1 (Pathum Thani 1)', totalDays: 105,
      boundary: [[14.485,100.105],[14.485,100.140],[14.460,100.140],[14.458,100.120],[14.460,100.105]],
      baseTempMin: 24, baseTempMax: 35, baseHumidity: 78, annualRainfallMm: 1400,
      floodTargetCm: 12, dryThresholdCm: -12, floodDays: 6, dryDays: 4,
      currentDAP: 0, currentHour: 6, waterLevelCm: 0,
      currentAWDPhase: 'FLOODED', awdPhaseDayCounter: 0, totalAWDCycles: 0,
      totalCH4g: 0, totalN2Og: 0, totalYieldKg: 0, seasonComplete: false,
    },
    {
      id: 'awd-ubon',
      name: 'Ubon Ratchathani AWD (Drought-prone)',
      nameTh: '\u0e2d\u0e38\u0e1a\u0e25\u0e23\u0e32\u0e0a\u0e18\u0e32\u0e19\u0e35 AWD (\u0e41\u0e25\u0e49\u0e07)',
      province: 'Ubon Ratchathani',
      provinceTh: '\u0e2d\u0e38\u0e1a\u0e25\u0e23\u0e32\u0e0a\u0e18\u0e32\u0e19\u0e35',
      lat: 15.24, lng: 104.85, areaHa: 25,
      soilType: 'Sandy Soil', waterSource: 'Rainfed Only',
      riceVariety: 'RD43', totalDays: 95,
      boundary: [[15.255,104.835],[15.255,104.870],[15.230,104.870],[15.228,104.850],[15.230,104.835]],
      baseTempMin: 23, baseTempMax: 36, baseHumidity: 65, annualRainfallMm: 800,
      floodTargetCm: 8, dryThresholdCm: -18, floodDays: 5, dryDays: 6,
      currentDAP: 0, currentHour: 6, waterLevelCm: 0,
      currentAWDPhase: 'FLOODED', awdPhaseDayCounter: 0, totalAWDCycles: 0,
      totalCH4g: 0, totalN2Og: 0, totalYieldKg: 0, seasonComplete: false,
    },
  ];
}

function getGrowthStage(dap, totalDays) {
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

function getTemperature(field, hour) {
  const avgTemp = (field.baseTempMin + field.baseTempMax) / 2;
  const amplitude = (field.baseTempMax - field.baseTempMin) / 2;
  return avgTemp + amplitude * Math.sin(((hour - 5) / 24) * Math.PI * 2 - Math.PI / 2)
    + Math.sin(field.currentDAP * 0.7 + hour * 0.3) * 1.5;
}

function getRainfallMm(field, dap, hour) {
  const rainFactor = field.annualRainfallMm / 1400;
  let baseRainfall = dap < 30 ? 0.15 : dap < 80 ? 0.40 : 0.20;
  if (hour < 12 || hour > 18) return 0;
  const seed = Math.sin(dap * 12.9898 + hour * 78.233) * 43758.5453;
  const rand = seed - Math.floor(seed);
  if (rand > baseRainfall * rainFactor) return 0;
  return Math.round((rand * 7.5 + 0.5) * rainFactor * 10) / 10;
}

function getCH4Emission(field, hour) {
  const stage = getGrowthStage(field.currentDAP, field.totalDays);
  let baseFlux = { GERMINATION: 2, TILLERING: 15, STEM_ELONGATION: 25, BOOTING: 30, FLOWERING: 28, GRAIN_FILLING: 18, MATURITY: 8, HARVESTED: 1 }[stage] || 5;
  let waterFactor = { FLOODED: 1.0, DRAINING: 0.6, DRY: 0.15, REFLOODING: 0.7 }[field.currentAWDPhase] || 1;
  const temp = getTemperature(field, hour);
  const tempFactor = 1 + (temp - 28) * 0.03;
  const soilFactor = field.soilType.includes('Clay') ? 1.3 : field.soilType.includes('Sandy') ? 0.7 : 1.0;
  return Math.max(0, baseFlux * waterFactor * tempFactor * soilFactor);
}

function getN2OEmission(field) {
  const stage = getGrowthStage(field.currentDAP, field.totalDays);
  let baseFlux = { GERMINATION: 0.3, TILLERING: 1.2, STEM_ELONGATION: 1.5, BOOTING: 1.8, FLOWERING: 1.5, GRAIN_FILLING: 1.0, MATURITY: 0.5, HARVESTED: 0.1 }[stage] || 0.5;
  let phaseFactor = { FLOODED: 0.5, DRAINING: 2.5, DRY: 1.2, REFLOODING: 2.8 }[field.currentAWDPhase] || 1;
  const soilFactor = field.soilType.includes('Sandy') ? 1.4 : field.soilType.includes('Clay') ? 0.8 : 1.0;
  return Math.max(0, baseFlux * phaseFactor * soilFactor);
}

function getSoilMoisture(field) {
  let base = { FLOODED: 85 + field.waterLevelCm, DRAINING: 70 + field.waterLevelCm * 0.8, DRY: 30 + field.waterLevelCm * 0.5, REFLOODING: 50 + field.waterLevelCm }[field.currentAWDPhase] || 40;
  if (field.soilType.includes('Sandy')) base -= 8;
  if (field.soilType.includes('Clay')) base += 5;
  return Math.max(15, Math.min(100, base));
}

function getCO2Flux(field, hour) {
  const temp = getTemperature(field, hour);
  const stage = getGrowthStage(field.currentDAP, field.totalDays);
  let baseFlux = { TILLERING: 120, STEM_ELONGATION: 150, BOOTING: 160, FLOWERING: 140, GRAIN_FILLING: 110 }[stage] || 60;
  const tempFactor = Math.exp(0.05 * (temp - 25));
  const moisture = getSoilMoisture(field);
  const moistureFactor = moisture > 60 ? 1.2 : moisture > 30 ? 1.0 : 0.7;
  return baseFlux * tempFactor * moistureFactor;
}

function estimateYieldKgPerHa(field) {
  const p = Math.min(field.currentDAP / field.totalDays, 1);
  const maxKgPerHa = field.riceVariety.includes('KDML') ? 3500 : field.riceVariety.includes('RD43') ? 4200 : 4500;
  const growthFactor = 1 / (1 + Math.exp(-10 * (p - 0.5)));
  const awdPenalty = 0.97;
  const droughtFactor = field.waterSource.includes('Only') ? 0.75 : field.waterSource.includes('Rainfed') ? 0.88 : 1.0;
  return maxKgPerHa * growthFactor * awdPenalty * droughtFactor;
}

function updateWaterLevel(field, rainfall) {
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
        field.currentAWDPhase = 'DRAINING'; field.awdPhaseDayCounter = 0;
      }
      if (field.waterLevelCm < 2 && field.waterSource.includes('Irrigated')) {
        field.waterLevelCm = Math.max(field.waterLevelCm, 3);
      }
      break;
    case 'DRAINING':
      if (field.waterLevelCm <= field.dryThresholdCm) {
        field.currentAWDPhase = 'DRY'; field.awdPhaseDayCounter = 0;
      }
      break;
    case 'DRY':
      if (field.awdPhaseDayCounter >= field.dryDays) {
        field.currentAWDPhase = 'REFLOODING'; field.awdPhaseDayCounter = 0;
      }
      if (rainfall > 5 && field.waterLevelCm > 0) {
        field.currentAWDPhase = 'REFLOODING'; field.awdPhaseDayCounter = 0;
      }
      break;
    case 'REFLOODING':
      if (field.waterLevelCm >= field.floodTargetCm) {
        field.currentAWDPhase = 'FLOODED'; field.awdPhaseDayCounter = 0; field.totalAWDCycles++;
      }
      if (field.waterSource.includes('Irrigated') && field.waterLevelCm < 5) {
        field.waterLevelCm += 0.3;
      }
      break;
  }
  field.waterLevelCm = Math.max(-25, Math.min(20, field.waterLevelCm));
}

// ─── Main Simulation ─────────────────────────────────────────────────
const httpServer = createServer();
const io = new Server(httpServer, { cors: { origin: '*' } });

let fields = createFields();
let simRunning = false;
let simTimer = null;
let simTickCounter = 0;
let readings = [];

function simTick() {
  simTickCounter++;
  const newReadings = [];

  for (const field of fields) {
    if (field.seasonComplete) continue;
    field.currentHour += SIM_HOURS_PER_TICK;
    if (field.currentHour >= 24) {
      field.currentHour -= 24;
      field.currentDAP++;
    }
    if (field.currentDAP >= field.totalDays) {
      field.seasonComplete = true;
      field.currentAWDPhase = 'DRY'; field.waterLevelCm = -20;
    }

    const temp = getTemperature(field, field.currentHour);
    const humidity = field.baseHumidity +
      (field.currentAWDPhase === 'DRY' ? -8 : field.currentAWDPhase === 'FLOODED' ? 5 : 0) +
      Math.sin(field.currentDAP * 0.5 + field.currentHour * 0.2) * 5;
    const rainfall = getRainfallMm(field, field.currentDAP, field.currentHour);
    updateWaterLevel(field, rainfall);

    const ch4Flux = getCH4Emission(field, field.currentHour);
    const n2oFlux = getN2OEmission(field);
    const co2Flux = getCO2Flux(field, field.currentHour);
    const soilMoisture = getSoilMoisture(field);
    const soilPH = 5.5 + Math.sin(field.currentDAP * 0.1) * 0.3;
    const soilTempC = temp - 2 + Math.sin(field.currentDAP * 0.3) * 0.5;
    const growthStage = getGrowthStage(field.currentDAP, field.totalDays);
    const yieldKgPerHa = estimateYieldKgPerHa(field);

    // T-VER standard: unit conversion mg/m2/hr -> kg/ha/day = 0.24
    const MG_M2_HR_TO_KG_HA_DAY = 0.24;
    const GWP_CH4 = 28; const GWP_N2O = 265;
    const KG_CH4_TO_TCO2E = GWP_CH4 / 1000;
    const KG_N2O_TO_TCO2E = GWP_N2O / 1000;

    const areaM2 = field.areaHa * 10000;
    // Legacy (g)
    field.totalCH4g += ch4Flux * areaM2 / 1e6;
    field.totalN2Og += n2oFlux * areaM2 / 1e6;
    // T-VER standard (kg, tCO2e)
    if (!field.totalCH4kg) field.totalCH4kg = 0;
    if (!field.totalN2Okg) field.totalN2Okg = 0;
    if (!field.totalCH4tCO2e) field.totalCH4tCO2e = 0;
    if (!field.totalN2OtCO2e) field.totalN2OtCO2e = 0;
    if (!field.totalNettCO2e) field.totalNettCO2e = 0;
    if (!field.baselineEmissiontCO2e) field.baselineEmissiontCO2e = 0;
    if (!field.emissionReductiontCO2e) field.emissionReductiontCO2e = 0;
    const ch4KgPerHaThisHour = ch4Flux * MG_M2_HR_TO_KG_HA_DAY / 24;
    const n2oKgPerHaThisHour = n2oFlux * MG_M2_HR_TO_KG_HA_DAY / 24;
    field.totalCH4kg += ch4KgPerHaThisHour * field.areaHa;
    field.totalN2Okg += n2oKgPerHaThisHour * field.areaHa;
    field.totalCH4tCO2e = field.totalCH4kg * KG_CH4_TO_TCO2E;
    field.totalN2OtCO2e = field.totalN2Okg * KG_N2O_TO_TCO2E;
    const co2KgThisHour = co2Flux * areaM2 / 1e6;
    field.totalNettCO2e = field.totalCH4tCO2e + field.totalN2OtCO2e - (co2KgThisHour / 1000 * 0.3);
    field.totalYieldKg = yieldKgPerHa * field.areaHa;

    // T-VER Baseline (continuous flooding)
    const baselineEF = field.waterSource.includes('Irrigated') ? 1.30 :
                       field.waterSource.includes('Only') ? 0.70 : 1.00;
    const baselineCH4KgThisHour = baselineEF * field.areaHa / 24;
    field.baselineEmissiontCO2e += baselineCH4KgThisHour * KG_CH4_TO_TCO2E;
    field.emissionReductiontCO2e = Math.max(0, field.baselineEmissiontCO2e - field.totalNettCO2e);

    const ch4CO2e = ch4Flux * GWP_CH4;
    const n2oCO2e = n2oFlux * GWP_N2O;
    const totalGHGCO2e = ch4CO2e + n2oCO2e - co2Flux;
    const baselineCH4Flux = ch4Flux / 0.6;
    const emissionReductionPct = ((baselineCH4Flux - ch4Flux) / baselineCH4Flux) * 100;

    newReadings.push({
      tick: simTickCounter, fieldId: field.id, fieldName: field.name, province: field.province,
      timestamp: new Date().toISOString(), simDAP: field.currentDAP, simHour: field.currentHour,
      growthStage, awdPhase: field.currentAWDPhase, awdCycles: field.totalAWDCycles,
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
      tverMethodology: 'T-VER-P-AG-001', tverGwpCH4: GWP_CH4, tverGwpN2O: GWP_N2O,
    });
  }

  readings.push(...newReadings);
  if (readings.length > 600) readings = readings.slice(-600);

  io.emit('awd:reading', newReadings);
  io.emit('awd:status', getStatus());
}

function getStatus() {
  return {
    running: simRunning, tickCounter: simTickCounter,
    speedFactor: SPEED_FACTOR, intervalMs: INTERVAL_MS,
    fields: fields.map(f => ({
      id: f.id, name: f.name, nameTh: f.nameTh, province: f.province, provinceTh: f.provinceTh,
      lat: f.lat, lng: f.lng, areaHa: f.areaHa, soilType: f.soilType,
      waterSource: f.waterSource, riceVariety: f.riceVariety, totalDays: f.totalDays,
      boundary: f.boundary, currentDAP: f.currentDAP, currentHour: f.currentHour,
      waterLevelCm: Math.round(f.waterLevelCm * 10) / 10, currentAWDPhase: f.currentAWDPhase,
      awdCycles: f.totalAWDCycles, growthStage: getGrowthStage(f.currentDAP, f.totalDays),
      // Legacy
      cumulativeCH4g: Math.round(f.totalCH4g * 100) / 100,
      cumulativeN2Og: Math.round(f.totalN2Og * 100) / 100,
      // T-VER standard
      cumulativeCH4kg: Math.round((f.totalCH4kg || 0) * 1000) / 1000,
      cumulativeN2Okg: Math.round((f.totalN2Okg || 0) * 1000) / 1000,
      cumulativeCH4tCO2e: Math.round((f.totalCH4tCO2e || 0) * 10000) / 10000,
      cumulativeN2OtCO2e: Math.round((f.totalN2OtCO2e || 0) * 10000) / 10000,
      cumulativeNettCO2e: Math.round((f.totalNettCO2e || 0) * 10000) / 10000,
      baselineEmissiontCO2e: Math.round((f.baselineEmissiontCO2e || 0) * 10000) / 10000,
      emissionReductiontCO2e: Math.round((f.emissionReductiontCO2e || 0) * 10000) / 10000,
      estimatedYieldKg: Math.round(f.totalYieldKg), seasonComplete: f.seasonComplete,
    })),
  };
}

function startSim() {
  if (simRunning) return;
  simRunning = true;
  simTimer = setInterval(simTick, INTERVAL_MS);
  io.emit('awd:started', { speedFactor: SPEED_FACTOR });
}

function stopSim() {
  if (!simRunning) return;
  simRunning = false;
  if (simTimer) { clearInterval(simTimer); simTimer = null; }
  io.emit('awd:stopped');
}

function resetSim() {
  stopSim();
  fields = createFields();
  simTickCounter = 0; readings = [];
  io.emit('awd:reset');
  io.emit('awd:status', getStatus());
}

io.on('connection', (socket) => {
  socket.emit('awd:status', getStatus());
  if (readings.length > 0) socket.emit('awd:readings', readings.slice(-100));
  socket.on('awd:start', () => startSim());
  socket.on('awd:stop', () => stopSim());
  socket.on('awd:reset', () => resetSim());
});

httpServer.on('request', (req, res) => {
  // Skip Socket.IO internal requests
  if (req.url && req.url.startsWith('/socket.io/')) return;

  const url = new URL(req.url || '/', 'http://localhost:' + PORT);
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return; }
  res.setHeader('Content-Type', 'application/json');

  // POST control endpoints
  if (req.method === 'POST' && url.pathname === '/api/start') {
    startSim();
    res.end(JSON.stringify({ success: true, running: simRunning, message: 'Simulation started' }));
  } else if (req.method === 'POST' && url.pathname === '/api/stop') {
    stopSim();
    res.end(JSON.stringify({ success: true, running: simRunning, message: 'Simulation stopped' }));
  } else if (req.method === 'POST' && url.pathname === '/api/reset') {
    resetSim();
    res.end(JSON.stringify({ success: true, running: simRunning, message: 'Simulation reset' }));
  } else if (url.pathname === '/api/status') {
    res.end(JSON.stringify(getStatus()));
  } else if (url.pathname === '/api/readings') {
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '100'), 500);
    res.end(JSON.stringify(readings.slice(-limit)));
  } else if (url.pathname === '/api/summary') {
    res.end(JSON.stringify({ running: simRunning, tickCounter: simTickCounter, totalReadings: readings.length, fields: fields.map(f => ({ id: f.id, name: f.name, currentDAP: f.currentDAP, awdPhase: f.currentAWDPhase, seasonComplete: f.seasonComplete })) }));
  } else {
    res.statusCode = 404; res.end(JSON.stringify({ error: 'Not found' }));
  }
});

httpServer.listen(PORT, () => {
  console.log('AWD Rice Simulator running on port ' + PORT);
  console.log('Speed: ' + SPEED_FACTOR + 'x, interval: ' + INTERVAL_MS + 'ms');
  console.log('Fields: ' + fields.map(f => f.id).join(', '));
});
