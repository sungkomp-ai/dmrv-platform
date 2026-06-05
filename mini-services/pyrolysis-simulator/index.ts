import { createServer, IncomingMessage, ServerResponse } from 'http';
import { Server as SocketIOServer } from 'socket.io';

const PORT = 3031;

// ─── Pyrolysis Simulation Engine ───────────────────────────────────────────

interface PyrolysisRound {
  roundId: number;
  feedstock: string;
  feedstockMassKg: number;
  targetTempC: number;
  moisturePercent: number;
  durationMin: number;
  oxygenLevelPercent: number;
}

interface IoTSensorReading {
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

// ─── Temperature Profile Generator ────────────────────────────────────────

function getTemperature(round: PyrolysisRound, elapsedMin: number): number {
  const { targetTempC, durationMin, moisturePercent } = round;
  const dryingEnd = (moisturePercent / 100) * durationMin * 0.3 + 20;
  const pyrolysisStart = dryingEnd + 15;
  const pyrolysisEnd = durationMin * 0.85;
  const coolingStart = pyrolysisEnd;

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
    const progress = (elapsedMin - coolingStart) / (durationMin - coolingStart);
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

  const carbonFraction = 0.7 + (round.targetTempC / 700) * 0.15;
  const stabilityFactor = 0.85 + (round.targetTempC / 700) * 0.1;
  const carbonSequestered = biocharMass * carbonFraction * stabilityFactor * 3.667;

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

// ─── Simulation State ─────────────────────────────────────────────────────

let simulationRunning = false;
let currentRoundIndex = 0;
let currentElapsedMin = 0;
let simulationInterval: ReturnType<typeof setInterval> | null = null;
let allReadings: IoTSensorReading[] = [];
let roundReadings: Map<number, IoTSensorReading[]> = new Map();

const REAL_INTERVAL_MS = 5000;
const SIMULATED_MINUTES_PER_TICK = 5;

function startSimulation() {
  if (simulationRunning) return;
  simulationRunning = true;
  currentRoundIndex = 0;
  currentElapsedMin = 0;
  allReadings = [];
  roundReadings = new Map();

  console.log(`[Pyrolysis] Simulation started — 3 rounds, 60x speed`);

  io.emit('simulation:status', {
    running: true,
    roundIndex: currentRoundIndex,
    round: ROUNDS[currentRoundIndex],
    elapsedMin: currentElapsedMin,
  });

  simulationInterval = setInterval(() => {
    if (currentRoundIndex >= ROUNDS.length) {
      stopSimulation();
      return;
    }

    const round = ROUNDS[currentRoundIndex];
    const reading = generateSensorReading(round, currentElapsedMin);

    allReadings.push(reading);
    if (!roundReadings.has(round.roundId)) roundReadings.set(round.roundId, []);
    roundReadings.get(round.roundId)!.push(reading);

    io.emit('iot:reading', reading);

    currentElapsedMin += SIMULATED_MINUTES_PER_TICK;

    if (currentElapsedMin >= round.durationMin + 30) {
      const finalReading = generateSensorReading(round, round.durationMin + 30);
      finalReading.phase = 'COMPLETE';
      finalReading.temperatureC = 25 + Math.random() * 3;
      finalReading.o2Percent = 20.9;
      finalReading.biocharMassKg = round.feedstockMassKg * (0.25 + (round.targetTempC / 700) * 0.1);
      finalReading.feedstockRemainingKg = 0;
      allReadings.push(finalReading);
      roundReadings.get(round.roundId)!.push(finalReading);
      io.emit('iot:reading', finalReading);

      io.emit('round:complete', {
        roundId: round.roundId,
        feedstock: round.feedstock,
        totalReadings: roundReadings.get(round.roundId)!.length,
        finalBiocharKg: finalReading.biocharMassKg,
        carbonSequesteredKg: finalReading.carbonSequesteredKg,
      });

      console.log(`[Pyrolysis] Round ${round.roundId} complete — ${finalReading.biocharMassKg.toFixed(1)} kg biochar, ${finalReading.carbonSequesteredKg.toFixed(2)} kg CO2e`);

      currentRoundIndex++;
      currentElapsedMin = 0;

      if (currentRoundIndex < ROUNDS.length) {
        io.emit('simulation:status', {
          running: true,
          roundIndex: currentRoundIndex,
          round: ROUNDS[currentRoundIndex],
          elapsedMin: 0,
        });
        console.log(`[Pyrolysis] Starting Round ${currentRoundIndex + 1}: ${ROUNDS[currentRoundIndex].feedstock}`);
      }
    }
  }, REAL_INTERVAL_MS);
}

function stopSimulation() {
  simulationRunning = false;
  if (simulationInterval) {
    clearInterval(simulationInterval);
    simulationInterval = null;
  }
  io.emit('simulation:status', {
    running: false,
    roundIndex: currentRoundIndex,
    round: null,
    elapsedMin: currentElapsedMin,
  });
  console.log(`[Pyrolysis] Simulation stopped — ${allReadings.length} total readings`);
}

// ─── Single HTTP Server with REST + Socket.IO ─────────────────────────────

const httpServer = createServer((req: IncomingMessage, res: ServerResponse) => {
  // CORS headers
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
    res.end(JSON.stringify({
      running: simulationRunning,
      currentRound: currentRoundIndex + 1,
      totalRounds: ROUNDS.length,
      totalReadings: allReadings.length,
      rounds: ROUNDS.map((r) => ({
        ...r,
        readingCount: roundReadings.get(r.roundId)?.length || 0,
      })),
    }));
    return;
  }

  if (url.pathname === '/api/readings' && req.method === 'GET') {
    const roundId = url.searchParams.get('roundId');
    let data = allReadings;
    if (roundId) data = roundReadings.get(Number(roundId)) || [];
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ readings: data, count: data.length }));
    return;
  }

  if (url.pathname === '/api/summary' && req.method === 'GET') {
    const summaries = ROUNDS.map((round) => {
      const rds = roundReadings.get(round.roundId) || [];
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
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ summaries, totalCarbonKg: summaries.reduce((s, r) => s + r.carbonSequesteredKg, 0) }));
    return;
  }

  // Health check endpoint
  if (url.pathname === '/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', service: 'pyrolysis-simulator', port: PORT }));
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

// ─── Socket.IO on the SAME server ─────────────────────────────────────────

const io = new SocketIOServer(httpServer, {
  cors: { origin: '*' },
  // Allow both polling and websocket — polling works better through proxies
  transports: ['polling', 'websocket'],
  // Allow upgrade from polling to websocket
  allowUpgrades: true,
});

io.on('connection', (socket) => {
  console.log(`[Pyrolysis] Client connected: ${socket.id} (transport: ${socket.conn.transport.name})`);

  // Handle transport upgrade
  socket.conn.on('upgrade', (transport) => {
    console.log(`[Pyrolysis] Client ${socket.id} upgraded to ${transport.name}`);
  });

  // Send current state
  socket.emit('rounds:config', ROUNDS);
  socket.emit('simulation:status', {
    running: simulationRunning,
    roundIndex: currentRoundIndex,
    round: simulationRunning ? ROUNDS[currentRoundIndex] : null,
    elapsedMin: currentElapsedMin,
  });

  // Send historical data
  socket.emit('readings:history', allReadings);

  // Send per-round summaries
  const summaries = Array.from(roundReadings.entries()).map(([roundId, rds]) => ({
    roundId,
    readingCount: rds.length,
    readings: rds,
  }));
  socket.emit('rounds:data', summaries);

  socket.on('simulation:start', () => {
    startSimulation();
  });

  socket.on('simulation:stop', () => {
    stopSimulation();
  });

  socket.on('simulation:reset', () => {
    stopSimulation();
    allReadings = [];
    roundReadings = new Map();
    currentRoundIndex = 0;
    currentElapsedMin = 0;
    io.emit('simulation:reset');
    io.emit('readings:history', []);
    console.log('[Pyrolysis] Simulation reset');
  });

  socket.on('simulation:getReadings', () => {
    socket.emit('readings:history', allReadings);
  });

  socket.on('disconnect', (reason) => {
    console.log(`[Pyrolysis] Client disconnected: ${socket.id} (reason: ${reason})`);
  });
});

// ─── Start Server ─────────────────────────────────────────────────────────

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`🔥 Pyrolysis Simulator running on port ${PORT}`);
  console.log(`   WebSocket: ws://0.0.0.0:${PORT}`);
  console.log(`   REST API:  http://0.0.0.0:${PORT}/api/status|readings|summary`);
  console.log(`   Health:    http://0.0.0.0:${PORT}/health`);
  console.log(`   3 rounds × 60x speed — IoT every 5 simulated min (5 real sec)`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('[Pyrolysis] Shutting down...');
  stopSimulation();
  io.close();
  httpServer.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('[Pyrolysis] Received SIGTERM...');
  stopSimulation();
  io.close();
  httpServer.close();
  process.exit(0);
});
