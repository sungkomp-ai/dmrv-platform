/**
 * IoT Gateway Mini-Service — Port 3035
 * ─────────────────────────────────────────────────────────
 * ให้บริการ:
 *   1. WebSocket (socket.io) → รับ-ส่งข้อมูล Realtime จาก Edge Node
 *   2. HTTP REST           → รับข้อมูล Batch (CSV/JSON) จาก Edge Node
 *   3. Simulated sensors   → จำลองข้อมูล sensor เพื่อสาธิตระบบ
 *   4. Certification       → ตรวจสอบ integrity hash ของข้อมูล
 */

import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import * as cors from 'cors';
import * as crypto from 'crypto';

const PORT = 3035;

// ─── In-Memory State ──────────────────────────────────────────────────
interface SensorReading {
  id: string;
  edgeNodeId: string;
  sensorId: string;
  sensorType: string;
  value: number;
  unit: string;
  timestamp: string;
  receivedAt: string;
  ingestionMode: 'realtime' | 'batch';
  qualityFlag: 'RAW' | 'VALIDATED' | 'CERTIFIED' | 'REJECTED' | 'ANOMALY';
  integrityHash: string;
  signature: string;
}

interface EdgeNodeState {
  nodeId: string;
  name: string;
  nameTh: string;
  province: string;
  lat: number;
  lng: number;
  status: 'online' | 'offline' | 'maintenance';
  protocol: string;
  batteryLevel: number;
  signalStrength: number;
  sensors: SensorConfig[];
  totalReadings: number;
  lastHeartbeat: string;
}

interface SensorConfig {
  sensorId: string;
  sensorType: string;
  unit: string;
  minRange: number;
  maxRange: number;
  samplingRate: number; // วินาที
  status: 'active' | 'inactive';
}

interface BatchJobState {
  id: string;
  edgeNodeId: string;
  fileName: string;
  fileType: string;
  totalRecords: number;
  processedRecords: number;
  validRecords: number;
  rejectedRecords: number;
  anomalyRecords: number;
  status: 'UPLOADED' | 'VALIDATING' | 'PROCESSING' | 'CERTIFYING' | 'COMPLETED' | 'FAILED';
  certificationStatus: 'PENDING' | 'CERTIFIED' | 'PARTIAL' | 'REJECTED';
  merkleRoot: string;
  createdAt: string;
  completedAt?: string;
}

// ─── Edge Node Configs (จำลอง) ──────────────────────────────────────
const EDGE_NODES: EdgeNodeState[] = [
  {
    nodeId: 'EDGE-BKK-001',
    name: 'Bangkok Landfill Monitor',
    nameTh: 'สถานีติดตามขยะกรุงเทพ',
    province: 'กรุงเทพมหานคร',
    lat: 13.7563,
    lng: 100.5018,
    status: 'online',
    protocol: 'MQTT',
    batteryLevel: 92,
    signalStrength: -45,
    totalReadings: 0,
    lastHeartbeat: new Date().toISOString(),
    sensors: [
      { sensorId: 'CH4-BKK-001', sensorType: 'ch4', unit: 'ppm', minRange: 0, maxRange: 5000, samplingRate: 60, status: 'active' },
      { sensorId: 'CO2-BKK-001', sensorType: 'co2', unit: 'ppm', minRange: 0, maxRange: 5000, samplingRate: 60, status: 'active' },
      { sensorId: 'TEMP-BKK-001', sensorType: 'temperature', unit: '°C', minRange: -10, maxRange: 60, samplingRate: 300, status: 'active' },
      { sensorId: 'HUM-BKK-001', sensorType: 'humidity', unit: '%', minRange: 0, maxRange: 100, samplingRate: 300, status: 'active' },
      { sensorId: 'DO-BKK-001', sensorType: 'dissolved_oxygen', unit: 'mg/L', minRange: 0, maxRange: 20, samplingRate: 600, status: 'active' },
    ],
  },
  {
    nodeId: 'EDGE-CNX-001',
    name: 'Chiang Mai Rice Paddy Station',
    nameTh: 'สถานีนาข้าวเชียงใหม่',
    province: 'เชียงใหม่',
    lat: 18.7883,
    lng: 98.9853,
    status: 'online',
    protocol: 'LoRaWAN',
    batteryLevel: 78,
    signalStrength: -62,
    totalReadings: 0,
    lastHeartbeat: new Date().toISOString(),
    sensors: [
      { sensorId: 'CH4-CNX-001', sensorType: 'ch4', unit: 'ppm', minRange: 0, maxRange: 2000, samplingRate: 30, status: 'active' },
      { sensorId: 'TEMP-CNX-001', sensorType: 'temperature', unit: '°C', minRange: -10, maxRange: 50, samplingRate: 300, status: 'active' },
      { sensorId: 'SM-CNX-001', sensorType: 'soil_moisture', unit: '%', minRange: 0, maxRange: 100, samplingRate: 600, status: 'active' },
      { sensorId: 'WL-CNX-001', sensorType: 'water_level', unit: 'cm', minRange: 0, maxRange: 50, samplingRate: 300, status: 'active' },
      { sensorId: 'PH-CNX-001', sensorType: 'ph', unit: 'pH', minRange: 0, maxRange: 14, samplingRate: 900, status: 'active' },
    ],
  },
  {
    nodeId: 'EDGE-KKN-001',
    name: 'Khon Kaen Biogas Plant Monitor',
    nameTh: 'สถานีติดตามโรงไบโอก๊าซขอนแก่น',
    province: 'ขอนแก่น',
    lat: 16.4322,
    lng: 102.8236,
    status: 'online',
    protocol: 'MQTT',
    batteryLevel: 85,
    signalStrength: -55,
    totalReadings: 0,
    lastHeartbeat: new Date().toISOString(),
    sensors: [
      { sensorId: 'CH4-KKN-001', sensorType: 'ch4', unit: 'ppm', minRange: 0, maxRange: 10000, samplingRate: 30, status: 'active' },
      { sensorId: 'CO2-KKN-001', sensorType: 'co2', unit: 'ppm', minRange: 0, maxRange: 5000, samplingRate: 30, status: 'active' },
      { sensorId: 'TEMP-KKN-001', sensorType: 'temperature', unit: '°C', minRange: 0, maxRange: 80, samplingRate: 300, status: 'active' },
      { sensorId: 'PH-KKN-001', sensorType: 'ph', unit: 'pH', minRange: 0, maxRange: 14, samplingRate: 600, status: 'active' },
      { sensorId: 'COD-KKN-001', sensorType: 'cod', unit: 'mg/L', minRange: 0, maxRange: 1000, samplingRate: 1800, status: 'active' },
      { sensorId: 'BOD-KKN-001', sensorType: 'bod', unit: 'mg/L', minRange: 0, maxRange: 500, samplingRate: 1800, status: 'active' },
    ],
  },
  {
    nodeId: 'EDGE-PKT-001',
    name: 'Phuket Solar & Coastal Monitor',
    nameTh: 'สถานีติดตามโซลาร์และชายฝั่งภูเก็ต',
    province: 'ภูเก็ต',
    lat: 7.8804,
    lng: 98.3923,
    status: 'offline',
    protocol: 'HTTP',
    batteryLevel: 45,
    signalStrength: -78,
    totalReadings: 0,
    lastHeartbeat: new Date(Date.now() - 3600000).toISOString(),
    sensors: [
      { sensorId: 'SOLAR-PKT-001', sensorType: 'solar_irradiance', unit: 'W/m²', minRange: 0, maxRange: 1200, samplingRate: 300, status: 'active' },
      { sensorId: 'WS-PKT-001', sensorType: 'wind_speed', unit: 'm/s', minRange: 0, maxRange: 50, samplingRate: 300, status: 'active' },
      { sensorId: 'TEMP-PKT-001', sensorType: 'temperature', unit: '°C', minRange: 10, maxRange: 50, samplingRate: 600, status: 'active' },
      { sensorId: 'HUM-PKT-001', sensorType: 'humidity', unit: '%', minRange: 0, maxRange: 100, samplingRate: 600, status: 'inactive' },
    ],
  },
  {
    nodeId: 'EDGE-SKT-001',
    name: 'Surat Thani Mangrove Station',
    nameTh: 'สถานีป่าชายเลมสุราษฎร์ธานี',
    province: 'สุราษฎร์ธานี',
    lat: 9.1382,
    lng: 99.3217,
    status: 'online',
    protocol: 'WebSocket',
    batteryLevel: 67,
    signalStrength: -58,
    totalReadings: 0,
    lastHeartbeat: new Date().toISOString(),
    sensors: [
      { sensorId: 'CH4-SKT-001', sensorType: 'ch4', unit: 'ppm', minRange: 0, maxRange: 3000, samplingRate: 60, status: 'active' },
      { sensorId: 'CO2-SKT-001', sensorType: 'co2', unit: 'ppm', minRange: 0, maxRange: 5000, samplingRate: 60, status: 'active' },
      { sensorId: 'DO-SKT-001', sensorType: 'dissolved_oxygen', unit: 'mg/L', minRange: 0, maxRange: 20, samplingRate: 600, status: 'active' },
      { sensorId: 'N-SKT-001', sensorType: 'nitrogen', unit: 'mg/L', minRange: 0, maxRange: 50, samplingRate: 1800, status: 'active' },
      { sensorId: 'P-SKT-001', sensorType: 'phosphorus', unit: 'mg/L', minRange: 0, maxRange: 20, samplingRate: 1800, status: 'active' },
    ],
  },
];

// ─── Runtime State ─────────────────────────────────────────────────────
let readings: SensorReading[] = [];
let batchJobs: BatchJobState[] = [];
let simRunning = false;
let simInterval: Timer | null = null;
let tickCounter = 0;
let realtimeClients: Set<string> = new Set();

// ─── Helper: Generate Integrity Hash ──────────────────────────────────
function generateHash(sensorId: string, value: number, timestamp: string): string {
  // Simplified SHA-like hash for demo
  const raw = `${sensorId}:${value}:${timestamp}`;
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    const char = raw.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `sha256-${Math.abs(hash).toString(16).padStart(16, '0')}`;
}

function generateSignature(nodeId: string, hash: string): string {
  const raw = `${nodeId}:${hash}`;
  let sig = 0;
  for (let i = 0; i < raw.length; i++) {
    const char = raw.charCodeAt(i);
    sig = ((sig << 5) - sig) + char;
    sig = sig & sig;
  }
  return `sig-${Math.abs(sig).toString(16).padStart(16, '0')}`;
}

function validateReading(sensor: SensorConfig, value: number): 'VALIDATED' | 'ANOMALY' | 'REJECTED' {
  if (value < sensor.minRange || value > sensor.maxRange) return 'REJECTED';
  // Anomaly detection: if value is in top/bottom 5% of range
  const range = sensor.maxRange - sensor.minRange;
  const lowerBound = sensor.minRange + range * 0.02;
  const upperBound = sensor.maxRange - range * 0.02;
  if (value < lowerBound || value > upperBound) return 'ANOMALY';
  return 'VALIDATED';
}

// ─── Simulated Sensor Value Generation ────────────────────────────────
const BASE_VALUES: Record<string, { base: number; variance: number; seasonal?: boolean }> = {
  ch4: { base: 850, variance: 200, seasonal: true },
  co2: { base: 420, variance: 50, seasonal: true },
  temperature: { base: 30, variance: 5, seasonal: true },
  humidity: { base: 75, variance: 15, seasonal: true },
  soil_moisture: { base: 45, variance: 20, seasonal: true },
  water_level: { base: 15, variance: 8, seasonal: true },
  ph: { base: 7.2, variance: 0.8 },
  dissolved_oxygen: { base: 6.5, variance: 2 },
  cod: { base: 120, variance: 40 },
  bod: { base: 45, variance: 20 },
  nitrogen: { base: 8, variance: 4 },
  phosphorus: { base: 3, variance: 1.5 },
  wind_speed: { base: 3.5, variance: 2 },
  solar_irradiance: { base: 600, variance: 300, seasonal: true },
};

function generateSensorValue(sensorType: string, sensor: SensorConfig, tick: number): number {
  const config = BASE_VALUES[sensorType] || { base: 50, variance: 10 };
  const hour = (tick % 24);
  const seasonalFactor = config.seasonal ? Math.sin((hour / 24) * Math.PI * 2) * 0.2 : 0;
  const noise = (Math.random() - 0.5) * config.variance;
  let value = config.base * (1 + seasonalFactor) + noise;
  // Clamp to sensor range
  value = Math.max(sensor.minRange, Math.min(sensor.maxRange, value));
  return Math.round(value * 100) / 100;
}

// ─── Edge Device Authentication ──────────────────────────────────────
// Edge devices authenticate with the gateway using a pre-shared API key.
// Gateway issues a signed token (HMAC-SHA256) used for subsequent data ingestion.
interface EdgeCredential {
  deviceId: string;
  apiKeyHash: string;       // SHA-256 of pre-shared API key
  name: string;
  province: string;
  lat: number;
  lng: number;
}
interface AuthToken {
  token: string;
  deviceId: string;
  issuedAt: number;
  expiresAt: number;        // epoch ms
}

// Shared secret for HMAC signing (in production, use env variable)
const GATEWAY_SECRET = process.env.GATEWAY_SECRET || 'dmrv-gateway-secret-2024-tver';

// Pre-registered edge credentials (API keys shown for demo; in production store only hash)
const EDGE_CREDENTIALS: EdgeCredential[] = [
  { deviceId: 'EDGE-AWD-001', apiKeyHash: sha256('awd-edge-key-2024-korat'),  name: 'AWD Edge Node - นครราชสีมา', province: 'นครราชสีมา', lat: 14.97,  lng: 102.08 },
  { deviceId: 'EDGE-AWD-002', apiKeyHash: sha256('awd-edge-key-2024-suphan'), name: 'AWD Edge Node - สุพรรณบุรี',    province: 'สุพรรณบุรี',    lat: 14.47,  lng: 100.12 },
  { deviceId: 'EDGE-AWD-003', apiKeyHash: sha256('awd-edge-key-2024-ubon'),   name: 'AWD Edge Node - อุบลราชธานี',   province: 'อุบลราชธานี',   lat: 15.12,  lng: 104.85 },
];

// Active tokens stored in memory (token -> AuthToken)
const ACTIVE_TOKENS: Map<string, AuthToken> = new Map();
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;  // 24 hours

function sha256(input: string): string {
  return crypto.createHash('sha256').update(input, 'utf8').digest('hex');
}

function hmacSha256(key: string, message: string): string {
  return crypto.createHmac('sha256', key).update(message, 'utf8').digest('hex');
}

// Issue a token to a verified edge device
function issueToken(deviceId: string): AuthToken {
  const issuedAt = Date.now();
  const expiresAt = issuedAt + TOKEN_TTL_MS;
  // Token = base payload + HMAC signature
  const payload = `${deviceId}:${issuedAt}:${expiresAt}`;
  const signature = hmacSha256(GATEWAY_SECRET, payload);
  const token = `${payload}.${signature}`;
  const authToken: AuthToken = { token, deviceId, issuedAt, expiresAt };
  ACTIVE_TOKENS.set(token, authToken);
  return authToken;
}

// Verify a token; returns deviceId if valid, null otherwise
function verifyToken(token: string): string | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payload, signature] = parts;
  const expectedSig = hmacSha256(GATEWAY_SECRET, payload);
  // Constant-time compare
  if (signature.length !== expectedSig.length) return null;
  let diff = 0;
  for (let i = 0; i < signature.length; i++) {
    diff |= signature.charCodeAt(i) ^ expectedSig.charCodeAt(i);
  }
  if (diff !== 0) return null;
  const [deviceId, issuedAtStr, expiresAtStr] = payload.split(':');
  const expiresAt = parseInt(expiresAtStr, 10);
  if (Date.now() > expiresAt) {
    ACTIVE_TOKENS.delete(token);
    return null;
  }
  return deviceId;
}

// Verify an integrity hash + signature submitted by an edge device
// Returns { valid, deviceId, error? }
function verifyEdgePayload(token: string, payloadJson: string, integrityHash: string, signature: string): { valid: boolean; deviceId?: string; error?: string } {
  const deviceId = verifyToken(token);
  if (!deviceId) return { valid: false, error: 'Invalid or expired token' };
  // Verify integrity hash (SHA-256 of payload)
  const expectedHash = sha256(payloadJson);
  if (expectedHash !== integrityHash) {
    return { valid: false, deviceId, error: `Integrity hash mismatch (expected ${expectedHash.slice(0,12)}..., got ${integrityHash.slice(0,12)}...)` };
  }
  // Verify signature (HMAC-SHA256 of integrityHash with token as key)
  const expectedSig = hmacSha256(token, integrityHash);
  if (signature !== expectedSig) {
    return { valid: false, deviceId, error: 'Signature verification failed' };
  }
  return { valid: true, deviceId };
}

// ─── Create Server ────────────────────────────────────────────────────
const httpServer = createServer();
const io = new SocketIOServer(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

// ─── WebSocket Connection Handler ─────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`[IoT Gateway] Client connected: ${socket.id}`);
  realtimeClients.add(socket.id);

  // ส่งสถานะปัจจุบันให้ client ใหม่
  socket.emit('iot:status', {
    running: simRunning,
    tick: tickCounter,
    edgeNodes: EDGE_NODES.map(n => ({
      ...n,
      sensors: n.sensors.map(s => ({
        ...s,
        lastReading: 0,
        lastReadingAt: null,
      })),
    })),
    totalReadings: readings.length,
    batchJobs: batchJobs.length,
    connectedClients: realtimeClients.size,
  });

  // ส่งข้อมูล 50 รายการล่าสุด
  socket.emit('iot:readings', readings.slice(-50));

  // ─── Realtime Ingestion: รับข้อมูลจาก Edge Node ────────────────
  socket.on('iot:ingest:realtime', (data: {
    edgeNodeId: string;
    sensorId: string;
    sensorType: string;
    value: number;
    unit: string;
    timestamp: string;
  }) => {
    const edgeNode = EDGE_NODES.find(n => n.nodeId === data.edgeNodeId);
    if (!edgeNode) {
      socket.emit('iot:error', { message: `Edge node ${data.edgeNodeId} not found` });
      return;
    }

    const sensor = edgeNode.sensors.find(s => s.sensorId === data.sensorId);
    const qualityFlag = sensor ? validateReading(sensor, data.value) : 'RAW';
    const integrityHash = generateHash(data.sensorId, data.value, data.timestamp);
    const signature = generateSignature(data.edgeNodeId, integrityHash);

    const reading: SensorReading = {
      id: `RD-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      edgeNodeId: data.edgeNodeId,
      sensorId: data.sensorId,
      sensorType: data.sensorType,
      value: data.value,
      unit: data.unit,
      timestamp: data.timestamp,
      receivedAt: new Date().toISOString(),
      ingestionMode: 'realtime',
      qualityFlag,
      integrityHash,
      signature,
    };

    readings.push(reading);
    edgeNode.totalReadings++;

    // Broadcast ไปยัง client ทุกคน
    io.emit('iot:reading', reading);
  });

  // ─── Batch Ingestion: รับข้อมูลเป็นชุด ──────────────────────────
  socket.on('iot:ingest:batch', (data: {
    edgeNodeId: string;
    fileName: string;
    fileType: string;
    records: Array<{
      sensorId: string;
      sensorType: string;
      value: number;
      unit: string;
      timestamp: string;
    }>;
  }) => {
    const edgeNode = EDGE_NODES.find(n => n.nodeId === data.edgeNodeId);
    if (!edgeNode) {
      socket.emit('iot:error', { message: `Edge node ${data.edgeNodeId} not found` });
      return;
    }

    const batchJob: BatchJobState = {
      id: `BATCH-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      edgeNodeId: data.edgeNodeId,
      fileName: data.fileName,
      fileType: data.fileType,
      totalRecords: data.records.length,
      processedRecords: 0,
      validRecords: 0,
      rejectedRecords: 0,
      anomalyRecords: 0,
      status: 'PROCESSING',
      certificationStatus: 'PENDING',
      merkleRoot: '',
      createdAt: new Date().toISOString(),
    };

    batchJobs.push(batchJob);
    io.emit('iot:batch:started', batchJob);

    // ประมวลผล batch
    const batchReadings: SensorReading[] = [];
    for (const record of data.records) {
      const sensor = edgeNode.sensors.find(s => s.sensorId === record.sensorId);
      const qualityFlag = sensor ? validateReading(sensor, record.value) : 'RAW';
      const integrityHash = generateHash(record.sensorId, record.value, record.timestamp);
      const signature = generateSignature(data.edgeNodeId, integrityHash);

      const reading: SensorReading = {
        id: `RD-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        edgeNodeId: data.edgeNodeId,
        sensorId: record.sensorId,
        sensorType: record.sensorType,
        value: record.value,
        unit: record.unit,
        timestamp: record.timestamp,
        receivedAt: new Date().toISOString(),
        ingestionMode: 'batch',
        qualityFlag,
        integrityHash,
        signature,
      };

      batchReadings.push(reading);
      batchJob.processedRecords++;

      if (qualityFlag === 'VALIDATED') batchJob.validRecords++;
      else if (qualityFlag === 'ANOMALY') { batchJob.anomalyRecords++; batchJob.validRecords++; }
      else if (qualityFlag === 'REJECTED') batchJob.rejectedRecords++;
    }

    readings.push(...batchReadings);
    edgeNode.totalReadings += batchReadings.length;

    // Certify batch
    batchJob.status = 'CERTIFYING';
    batchJob.certificationStatus = batchJob.rejectedRecords === 0 ? 'CERTIFIED' : (batchJob.validRecords > batchJob.rejectedRecords ? 'PARTIAL' : 'REJECTED');
    batchJob.merkleRoot = generateHash(batchJob.id, batchJob.validRecords, batchJob.createdAt);
    batchJob.status = 'COMPLETED';
    batchJob.completedAt = new Date().toISOString();

    io.emit('iot:batch:completed', batchJob);
    io.emit('iot:readings', batchReadings);
  });

  // ─── Control: เริ่ม/หยุด การจำลอง ───────────────────────────────
  socket.on('iot:sim:start', () => {
    if (simRunning) return;
    simRunning = true;
    console.log('[IoT Gateway] Simulation started');
    io.emit('iot:sim:started');
    startSimulation();
  });

  socket.on('iot:sim:stop', () => {
    simRunning = false;
    if (simInterval) { clearInterval(simInterval); simInterval = null; }
    console.log('[IoT Gateway] Simulation stopped');
    io.emit('iot:sim:stopped');
  });

  socket.on('iot:sim:reset', () => {
    simRunning = false;
    if (simInterval) { clearInterval(simInterval); simInterval = null; }
    readings = [];
    batchJobs = [];
    tickCounter = 0;
    EDGE_NODES.forEach(n => n.totalReadings = 0);
    console.log('[IoT Gateway] Simulation reset');
    io.emit('iot:sim:reset');
    io.emit('iot:readings', []);
  });

  // ─── Edge Node: Heartbeat ─────────────────────────────────────────
  socket.on('iot:edge:heartbeat', (data: { nodeId: string }) => {
    const edgeNode = EDGE_NODES.find(n => n.nodeId === data.nodeId);
    if (edgeNode) {
      edgeNode.lastHeartbeat = new Date().toISOString();
      edgeNode.status = 'online';
    }
  });

  socket.on('disconnect', () => {
    realtimeClients.delete(socket.id);
    console.log(`[IoT Gateway] Client disconnected: ${socket.id}`);
  });
});

// ─── Simulation Engine ────────────────────────────────────────────────
function startSimulation() {
  if (simInterval) clearInterval(simInterval);
  simInterval = setInterval(() => {
    if (!simRunning) return;
    tickCounter++;

    const newReadings: SensorReading[] = [];

    for (const edgeNode of EDGE_NODES) {
      if (edgeNode.status !== 'online') continue;

      for (const sensor of edgeNode.sensors) {
        if (sensor.status !== 'active') continue;

        // สุ่มค่าตาม sampling rate (เพื่อไม่ให้ทุก sensor ส่งทุก tick)
        if (tickCounter % Math.max(1, Math.floor(sensor.samplingRate / 10)) !== 0) continue;

        const value = generateSensorValue(sensor.sensorType, sensor, tickCounter);
        const timestamp = new Date().toISOString();
        const qualityFlag = validateReading(sensor, value);
        const integrityHash = generateHash(sensor.sensorId, value, timestamp);
        const signature = generateSignature(edgeNode.nodeId, integrityHash);

        const reading: SensorReading = {
          id: `RD-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          edgeNodeId: edgeNode.nodeId,
          sensorId: sensor.sensorId,
          sensorType: sensor.sensorType,
          value,
          unit: sensor.unit,
          timestamp,
          receivedAt: new Date().toISOString(),
          ingestionMode: 'realtime',
          qualityFlag,
          integrityHash,
          signature,
        };

        newReadings.push(reading);
        edgeNode.totalReadings++;
      }

      // Update heartbeat
      edgeNode.lastHeartbeat = new Date().toISOString();
    }

    if (newReadings.length > 0) {
      readings.push(...newReadings);
      // เก็บแค่ 2000 รายการล่าสุด
      if (readings.length > 2000) readings = readings.slice(-2000);

      // Broadcast
      io.emit('iot:readings', newReadings);
    }

    // ส่ง status update
    io.emit('iot:status', {
      running: simRunning,
      tick: tickCounter,
      edgeNodes: EDGE_NODES,
      totalReadings: readings.length,
      batchJobs: batchJobs.length,
      connectedClients: realtimeClients.size,
    });

  }, 2000); // ทุก 2 วินาที
}

// ─── HTTP REST Endpoints ──────────────────────────────────────────────
// สำหรับ Batch upload ผ่าน HTTP (เผื่อ Edge Node ที่ไม่ได้ใช้ WebSocket)

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

httpServer.on('request', async (req, res) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, CORS_HEADERS);
    res.end();
    return;
  }

  const url = new URL(req.url || '/', `http://localhost:${PORT}`);

  // GET /api/status
  if (url.pathname === '/api/status' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json', ...CORS_HEADERS });
    res.end(JSON.stringify({
      running: simRunning,
      tick: tickCounter,
      edgeNodes: EDGE_NODES,
      totalReadings: readings.length,
      batchJobs: batchJobs.length,
      connectedClients: realtimeClients.size,
    }));
    return;
  }

  // GET /api/readings
  if (url.pathname === '/api/readings' && req.method === 'GET') {
    const limit = parseInt(url.searchParams.get('limit') || '100');
    const edgeNodeId = url.searchParams.get('edgeNodeId');
    const sensorType = url.searchParams.get('sensorType');
    let filtered = readings;
    if (edgeNodeId) filtered = filtered.filter(r => r.edgeNodeId === edgeNodeId);
    if (sensorType) filtered = filtered.filter(r => r.sensorType === sensorType);
    res.writeHead(200, { 'Content-Type': 'application/json', ...CORS_HEADERS });
    res.end(JSON.stringify({ readings: filtered.slice(-limit), total: filtered.length }));
    return;
  }

  // GET /api/edge-nodes
  if (url.pathname === '/api/edge-nodes' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json', ...CORS_HEADERS });
    res.end(JSON.stringify({ edgeNodes: EDGE_NODES }));
    return;
  }

  // GET /api/batch-jobs
  if (url.pathname === '/api/batch-jobs' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json', ...CORS_HEADERS });
    res.end(JSON.stringify({ batchJobs }));
    return;
  }

  // POST /api/batch-upload
  if (url.pathname === '/api/batch-upload' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const edgeNode = EDGE_NODES.find(n => n.nodeId === data.edgeNodeId);
        if (!edgeNode) {
          res.writeHead(404, { 'Content-Type': 'application/json', ...CORS_HEADERS });
          res.end(JSON.stringify({ error: 'Edge node not found' }));
          return;
        }

        const batchJob: BatchJobState = {
          id: `BATCH-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          edgeNodeId: data.edgeNodeId,
          fileName: data.fileName || 'upload.json',
          fileType: data.fileType || 'JSON',
          totalRecords: data.records?.length || 0,
          processedRecords: 0,
          validRecords: 0,
          rejectedRecords: 0,
          anomalyRecords: 0,
          status: 'COMPLETED',
          certificationStatus: 'CERTIFIED',
          merkleRoot: generateHash('batch', data.records?.length || 0, new Date().toISOString()),
          createdAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
        };

        const batchReadings: SensorReading[] = (data.records || []).map((record: any) => {
          const sensor = edgeNode.sensors.find(s => s.sensorId === record.sensorId);
          const qualityFlag = sensor ? validateReading(sensor, record.value) : 'RAW';
          const integrityHash = generateHash(record.sensorId, record.value, record.timestamp);
          const signature = generateSignature(data.edgeNodeId, integrityHash);

          if (qualityFlag === 'VALIDATED') batchJob.validRecords++;
          else if (qualityFlag === 'ANOMALY') { batchJob.anomalyRecords++; batchJob.validRecords++; }
          else batchJob.rejectedRecords++;

          batchJob.processedRecords++;

          return {
            id: `RD-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            edgeNodeId: data.edgeNodeId,
            sensorId: record.sensorId,
            sensorType: record.sensorType,
            value: record.value,
            unit: record.unit || '',
            timestamp: record.timestamp,
            receivedAt: new Date().toISOString(),
            ingestionMode: 'batch' as const,
            qualityFlag,
            integrityHash,
            signature,
          };
        });

        readings.push(...batchReadings);
        edgeNode.totalReadings += batchReadings.length;
        batchJobs.push(batchJob);

        io.emit('iot:batch:completed', batchJob);

        res.writeHead(200, { 'Content-Type': 'application/json', ...CORS_HEADERS });
        res.end(JSON.stringify({ success: true, batchJob, readingsCount: batchReadings.length }));
      } catch (e: any) {
        res.writeHead(400, { 'Content-Type': 'application/json', ...CORS_HEADERS });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // POST /api/realtime-ingest
  if (url.pathname === '/api/realtime-ingest' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const edgeNode = EDGE_NODES.find(n => n.nodeId === data.edgeNodeId);
        if (!edgeNode) {
          res.writeHead(404, { 'Content-Type': 'application/json', ...CORS_HEADERS });
          res.end(JSON.stringify({ error: 'Edge node not found' }));
          return;
        }

        const sensor = edgeNode.sensors.find(s => s.sensorId === data.sensorId);
        const qualityFlag = sensor ? validateReading(sensor, data.value) : 'RAW';
        const integrityHash = generateHash(data.sensorId, data.value, data.timestamp);
        const signature = generateSignature(data.edgeNodeId, integrityHash);

        const reading: SensorReading = {
          id: `RD-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          edgeNodeId: data.edgeNodeId,
          sensorId: data.sensorId,
          sensorType: data.sensorType,
          value: data.value,
          unit: data.unit,
          timestamp: data.timestamp,
          receivedAt: new Date().toISOString(),
          ingestionMode: 'realtime',
          qualityFlag,
          integrityHash,
          signature,
        };

        readings.push(reading);
        edgeNode.totalReadings++;
        io.emit('iot:reading', reading);

        res.writeHead(200, { 'Content-Type': 'application/json', ...CORS_HEADERS });
        res.end(JSON.stringify({ success: true, reading }));
      } catch (e: any) {
        res.writeHead(400, { 'Content-Type': 'application/json', ...CORS_HEADERS });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // GET /api/sample-data — ตัวอย่างข้อมูลสำหรับทดสอบ
  if (url.pathname === '/api/sample-data' && req.method === 'GET') {
    const sampleRealtime = {
      description: 'ตัวอย่างข้อมูล Realtime — ส่งผ่าน WebSocket หรือ HTTP POST',
      websocket_event: 'iot:ingest:realtime',
      http_endpoint: 'POST /api/realtime-ingest',
      payload: {
        edgeNodeId: 'EDGE-BKK-001',
        sensorId: 'CH4-BKK-001',
        sensorType: 'ch4',
        value: 1250.45,
        unit: 'ppm',
        timestamp: new Date().toISOString(),
      },
    };

    const sampleBatch = {
      description: 'ตัวอย่างข้อมูล Batch — ส่งผ่าน WebSocket หรือ HTTP POST',
      websocket_event: 'iot:ingest:batch',
      http_endpoint: 'POST /api/batch-upload',
      payload: {
        edgeNodeId: 'EDGE-CNX-001',
        fileName: 'sensor_data_2025_01_15.csv',
        fileType: 'CSV',
        records: [
          { sensorId: 'CH4-CNX-001', sensorType: 'ch4', value: 580.2, unit: 'ppm', timestamp: '2025-01-15T08:00:00Z' },
          { sensorId: 'CH4-CNX-001', sensorType: 'ch4', value: 620.8, unit: 'ppm', timestamp: '2025-01-15T08:01:00Z' },
          { sensorId: 'TEMP-CNX-001', sensorType: 'temperature', value: 28.5, unit: '°C', timestamp: '2025-01-15T08:00:00Z' },
          { sensorId: 'SM-CNX-001', sensorType: 'soil_moisture', value: 42.3, unit: '%', timestamp: '2025-01-15T08:00:00Z' },
          { sensorId: 'WL-CNX-001', sensorType: 'water_level', value: 12.1, unit: 'cm', timestamp: '2025-01-15T08:00:00Z' },
        ],
      },
    };

    const sampleEdgeConfig = {
      description: 'ตัวอย่างการตั้งค่า Edge Node',
      edgeNodeRegistration: {
        nodeId: 'EDGE-NEW-001',
        name: 'New Station',
        nameTh: 'สถานีใหม่',
        province: 'นครราชสีมา',
        lat: 14.97,
        lng: 102.1,
        protocol: 'MQTT',
        firmwareVersion: '1.2.0',
        sensors: [
          { sensorId: 'CH4-NEW-001', sensorType: 'ch4', unit: 'ppm', minRange: 0, maxRange: 5000, samplingRate: 60 },
          { sensorId: 'TEMP-NEW-001', sensorType: 'temperature', unit: '°C', minRange: -10, maxRange: 60, samplingRate: 300 },
        ],
      },
    };

    res.writeHead(200, { 'Content-Type': 'application/json', ...CORS_HEADERS });
    res.end(JSON.stringify({ sampleRealtime, sampleBatch, sampleEdgeConfig }));
    return;
  }

  // ─── Edge Auth: POST /api/edge/auth ───────────────────────────────
  // Edge device authenticates with deviceId + apiKey, receives a signed token
  if (url.pathname === '/api/edge/auth' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const { deviceId, apiKey } = JSON.parse(body);
        if (!deviceId || !apiKey) {
          res.writeHead(400, { 'Content-Type': 'application/json', ...CORS_HEADERS });
          res.end(JSON.stringify({ error: 'Missing deviceId or apiKey' }));
          return;
        }
        const cred = EDGE_CREDENTIALS.find(c => c.deviceId === deviceId);
        if (!cred) {
          res.writeHead(404, { 'Content-Type': 'application/json', ...CORS_HEADERS });
          res.end(JSON.stringify({ error: `Edge device ${deviceId} not registered` }));
          return;
        }
        const apiKeyHash = sha256(apiKey);
        if (apiKeyHash !== cred.apiKeyHash) {
          res.writeHead(401, { 'Content-Type': 'application/json', ...CORS_HEADERS });
          res.end(JSON.stringify({ error: 'Invalid API key' }));
          return;
        }
        const authToken = issueToken(deviceId);
        console.log(`[Auth] ✅ Edge device authenticated: ${deviceId}`);
        res.writeHead(200, { 'Content-Type': 'application/json', ...CORS_HEADERS });
        res.end(JSON.stringify({
          success: true,
          deviceId,
          name: cred.name,
          province: cred.province,
          token: authToken.token,
          issuedAt: authToken.issuedAt,
          expiresAt: authToken.expiresAt,
          ttlSeconds: Math.floor((authToken.expiresAt - authToken.issuedAt) / 1000),
          hashAlgorithm: 'SHA-256',
          signatureAlgorithm: 'HMAC-SHA256',
        }));
      } catch (e: any) {
        res.writeHead(400, { 'Content-Type': 'application/json', ...CORS_HEADERS });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // ─── Edge Verify: POST /api/edge/verify ───────────────────────────
  // Verifies a payload's integrity hash + signature submitted by an edge device
  if (url.pathname === '/api/edge/verify' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const { token, payload, integrityHash, signature } = JSON.parse(body);
        if (!token || !payload || !integrityHash || !signature) {
          res.writeHead(400, { 'Content-Type': 'application/json', ...CORS_HEADERS });
          res.end(JSON.stringify({ error: 'Missing required fields: token, payload, integrityHash, signature' }));
          return;
        }
        const result = verifyEdgePayload(token, JSON.stringify(payload), integrityHash, signature);
        if (result.valid) {
          res.writeHead(200, { 'Content-Type': 'application/json', ...CORS_HEADERS });
          res.end(JSON.stringify({
            valid: true,
            deviceId: result.deviceId,
            message: 'Payload integrity and signature verified',
            verifiedAt: new Date().toISOString(),
          }));
        } else {
          res.writeHead(401, { 'Content-Type': 'application/json', ...CORS_HEADERS });
          res.end(JSON.stringify({
            valid: false,
            deviceId: result.deviceId,
            error: result.error,
          }));
        }
      } catch (e: any) {
        res.writeHead(400, { 'Content-Type': 'application/json', ...CORS_HEADERS });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // ─── Edge Credentials List: GET /api/edge/credentials ────────────
  // Demo endpoint — returns deviceId + apiKey pairs that simulators can use to authenticate
  if (url.pathname === '/api/edge/credentials' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json', ...CORS_HEADERS });
    res.end(JSON.stringify({
      description: 'Pre-registered AWD edge credentials for demo (deviceId + apiKey pairs)',
      authEndpoint: 'POST /api/edge/auth',
      verifyEndpoint: 'POST /api/edge/verify',
      credentials: [
        { deviceId: 'EDGE-AWD-001', apiKey: 'awd-edge-key-2024-korat',  name: 'AWD Edge Node - นครราชสีมา', province: 'นครราชสีมา' },
        { deviceId: 'EDGE-AWD-002', apiKey: 'awd-edge-key-2024-suphan', name: 'AWD Edge Node - สุพรรณบุรี',    province: 'สุพรรณบุรี' },
        { deviceId: 'EDGE-AWD-003', apiKey: 'awd-edge-key-2024-ubon',   name: 'AWD Edge Node - อุบลราชธานี',   province: 'อุบลราชธานี' },
      ],
    }));
    return;
  }

  // 404
  res.writeHead(404, { 'Content-Type': 'application/json', ...CORS_HEADERS });
  res.end(JSON.stringify({ error: 'Not found' }));
});

// ─── Start Server ─────────────────────────────────────────────────────
httpServer.listen(PORT, () => {
  console.log(`[IoT Gateway] 🚀 Running on port ${PORT}`);
  console.log(`[IoT Gateway] WebSocket: ws://localhost:${PORT}`);
  console.log(`[IoT Gateway] HTTP API:  http://localhost:${PORT}/api/`);
  console.log(`[IoT Gateway] Edge Nodes: ${EDGE_NODES.length} configured`);
  console.log(`[IoT Gateway] Total Sensors: ${EDGE_NODES.reduce((s, n) => s + n.sensors.length, 0)}`);
});
