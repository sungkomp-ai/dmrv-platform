/**
 * AWD Rice Cultivation Simulator
 * ─────────────────────────────────
 * อ้างอิงมาตรฐาน TGO/T-VER:
 *   - T-VER-P-AG-001: การลดการปล่อยก๊าซมีเทนจากการปลูกข้าวโดยวิธี AWD
 *   - TGO Guidelines for Rice Cultivation MRV (ฉบับ 2566)
 *   - GWP Values: CH₄ = 28, N₂O = 265 (IPCC AR5, ตามประกาศ TGO 2566)
 *   - หน่วยวัดหลัก: kg CH₄/ha/day (EF), tCO₂e (credit)
 *
 * 3 พื้นที่ปลูกข้าว AWD สภาพแวดล้อมต่างกัน
 * เก็บข้อมูลทุก 1 ชม. (จำลอง) เร่งความเร็ว 1800x
 * 1 วินาทีจริง = 30 นาทีจำลอง → 2 วินาทีจริง = 1 ชม.จำลอง
 *
 * พื้นที่:
 *   1. นครราชสีมา (ชลประทาน) — นาชลประทาน ข้าวหอมมะลิ 120 วัน
 *   2. สุพรรณบุรี (ฝนตก) — นาน้ำฝน ข้าวเจ้า 105 วัน
 *   3. อุบลราชธานี (แล้ง) — นาแล้ง ข้าวกข 95 วัน
 */

import { createServer } from 'http';
import { Server } from 'socket.io';
import mqtt from 'mqtt';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

const PORT = 3032;
const SPEED_FACTOR = 1800; // 1800x speed
const INTERVAL_MS = 2000; // 2 วินาทีจริง = 1 ชม.จำลอง
const SIM_HOURS_PER_TICK = 1;

// ─── MQTT External Broker ────────────────────────────────────────────
// ส่งค่าจำลอง AWD ไปยัง MQTT Broker ภายนอก 35.213.186.240:1883
// Topics ใช้ prefix "awd/"
// รองรับการ override ผ่าน env variable
const MQTT_BROKER_URL = process.env.MQTT_BROKER_URL || 'mqtt://35.213.186.240:1883';
const MQTT_TOPIC_READINGS = process.env.MQTT_TOPIC_READINGS || 'awd/readings';
const MQTT_TOPIC_STATUS = process.env.MQTT_TOPIC_STATUS || 'awd/status';
const MQTT_TOPIC_FIELD_PREFIX = process.env.MQTT_TOPIC_FIELD_PREFIX || 'awd/field';
const MQTT_CLIENT_ID = `awd-sim-${Math.random().toString(16).slice(2, 10)}`;

let mqttClient: mqtt.MqttClient | null = null;
let mqttConnected = false;
let mqttPublishCount = 0;
let mqttErrorCount = 0;

function connectMQTT() {
  console.log(`[MQTT] Connecting to ${MQTT_BROKER_URL} (clientId=${MQTT_CLIENT_ID})...`);
  mqttClient = mqtt.connect(MQTT_BROKER_URL, {
    clientId: MQTT_CLIENT_ID,
    clean: true,
    reconnectPeriod: 5000,     // retry every 5s
    connectTimeout: 10000,     // 10s timeout
    keepalive: 60,
  });

  mqttClient.on('connect', () => {
    mqttConnected = true;
    console.log(`[MQTT] ✅ Connected to ${MQTT_BROKER_URL}`);
    console.log(`[MQTT] Topics:`);
    console.log(`       - ${MQTT_TOPIC_READINGS}        (all readings batch)`);
    console.log(`       - ${MQTT_TOPIC_STATUS}           (simulation status)`);
    console.log(`       - ${MQTT_TOPIC_FIELD_PREFIX}/<fieldId>  (per-field reading)`);
  });

  mqttClient.on('reconnect', () => {
    console.log(`[MQTT] Reconnecting to ${MQTT_BROKER_URL}...`);
  });

  mqttClient.on('error', (err) => {
    mqttErrorCount++;
    if (mqttErrorCount <= 5 || mqttErrorCount % 20 === 0) {
      console.error(`[MQTT] ❌ Error (#${mqttErrorCount}):`, err.message);
    }
  });

  mqttClient.on('close', () => {
    if (mqttConnected) {
      console.warn(`[MQTT] ⚠️ Connection closed`);
    }
    mqttConnected = false;
  });

  mqttClient.on('offline', () => {
    mqttConnected = false;
  });
}

function publishReadingToMQTT(reading: any) {
  if (!mqttClient || !mqttConnected) return;
  try {
    const payload = JSON.stringify(reading);
    // 1) ส่งไปยัง topic รวม (batch topic ใช้ single message ก็ได้ — แต่ละ reading แยก)
    mqttClient.publish(MQTT_TOPIC_READINGS, payload, { qos: 0, retain: false }, (err) => {
      if (err) {
        mqttErrorCount++;
        if (mqttErrorCount <= 5 || mqttErrorCount % 50 === 0) {
          console.error(`[MQTT] publish error (${MQTT_TOPIC_READINGS}):`, err.message);
        }
      }
    });
    // 2) ส่งไปยัง topic เฉพาะแปลง
    const fieldTopic = `${MQTT_TOPIC_FIELD_PREFIX}/${reading.fieldId}`;
    mqttClient.publish(fieldTopic, payload, { qos: 0, retain: false }, (err) => {
      if (err) {
        // silent — already logged on main topic
      }
    });
    mqttPublishCount++;
  } catch (e: any) {
    // ignore — don't crash simulation
  }
}

function publishStatusToMQTT(status: any) {
  if (!mqttClient || !mqttConnected) return;
  try {
    mqttClient.publish(MQTT_TOPIC_STATUS, JSON.stringify(status), { qos: 0, retain: true });
  } catch (e: any) {
    // ignore
  }
}

// ─── Edge Device Authentication ──────────────────────────────────────
// Each AWD field is mapped to a pre-registered edge device that authenticates
// with the IoT Gateway (port 3035) using a pre-shared API key.
// The gateway issues an HMAC-SHA256 signed token used to sign all subsequent
// sensor payloads (integrity hash + signature) for tamper-evident transmission.
interface EdgeCredentialConfig {
  fieldId: string;          // e.g., "awd-korat"
  deviceId: string;         // e.g., "EDGE-AWD-001"
  apiKey: string;           // pre-shared key
  gatewayUrl: string;       // base URL of IoT Gateway
}
const IOT_GATEWAY_URL = process.env.IOT_GATEWAY_URL || 'http://127.0.0.1:3035';

const EDGE_CREDENTIALS: EdgeCredentialConfig[] = [
  { fieldId: 'awd-korat',  deviceId: 'EDGE-AWD-001', apiKey: 'awd-edge-key-2024-korat',  gatewayUrl: IOT_GATEWAY_URL },
  { fieldId: 'awd-suphan', deviceId: 'EDGE-AWD-002', apiKey: 'awd-edge-key-2024-suphan', gatewayUrl: IOT_GATEWAY_URL },
  { fieldId: 'awd-ubon',   deviceId: 'EDGE-AWD-003', apiKey: 'awd-edge-key-2024-ubon',   gatewayUrl: IOT_GATEWAY_URL },
];

// Active tokens per fieldId
interface EdgeSession {
  fieldId: string;
  deviceId: string;
  token: string;
  issuedAt: number;
  expiresAt: number;
}
const edgeSessions: Map<string, EdgeSession> = new Map();

function sha256(input: string): string {
  return crypto.createHash('sha256').update(input, 'utf8').digest('hex');
}
function hmacSha256(key: string, message: string): string {
  return crypto.createHmac('sha256', key).update(message, 'utf8').digest('hex');
}

// Authenticate with IoT Gateway — fetch signed token
function authenticateEdge(fieldId: string): Promise<EdgeSession> {
  const cred = EDGE_CREDENTIALS.find(c => c.fieldId === fieldId);
  if (!cred) return Promise.reject(new Error(`No edge credential for field ${fieldId}`));

  const body = JSON.stringify({ deviceId: cred.deviceId, apiKey: cred.apiKey });
  return new Promise((resolve, reject) => {
    const url = new URL('/api/edge/auth', cred.gatewayUrl);
    const lib = url.protocol === 'https:' ? require('https') : require('http');
    const req = lib.request(url.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
      timeout: 5000,
    }, (res: any) => {
      let data = '';
      res.on('data', (chunk: any) => data += chunk);
      res.on('end', () => {
        try {
          if (res.statusCode !== 200) {
            reject(new Error(`Auth failed (${res.statusCode}): ${data}`));
            return;
          }
          const parsed = JSON.parse(data);
          if (!parsed.success || !parsed.token) {
            reject(new Error(`Auth response missing token: ${data}`));
            return;
          }
          const session: EdgeSession = {
            fieldId,
            deviceId: cred.deviceId,
            token: parsed.token,
            issuedAt: parsed.issuedAt,
            expiresAt: parsed.expiresAt,
          };
          edgeSessions.set(fieldId, session);
          console.log(`[Auth] ✅ Edge authenticated: ${cred.deviceId} → field ${fieldId} (expires in ${Math.floor((parsed.expiresAt - Date.now())/1000)}s)`);
          resolve(session);
        } catch (e: any) {
          reject(new Error(`Auth parse error: ${e.message}`));
        }
      });
    });
    req.on('error', (e: any) => reject(new Error(`Auth request error: ${e.message}`)));
    req.on('timeout', () => { req.destroy(); reject(new Error('Auth request timeout')); });
    req.write(body);
    req.end();
  });
}

// Authenticate all 3 fields in parallel on startup
async function authenticateAllEdges(): Promise<void> {
  console.log(`[Auth] Authenticating ${EDGE_CREDENTIALS.length} edge devices with IoT Gateway (${IOT_GATEWAY_URL})...`);
  const results = await Promise.allSettled(EDGE_CREDENTIALS.map(c => authenticateEdge(c.fieldId)));
  let ok = 0, fail = 0;
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') ok++;
    else { fail++; console.error(`[Auth] ❌ Failed for ${EDGE_CREDENTIALS[i].fieldId}: ${r.reason?.message || r.reason}`); }
  });
  console.log(`[Auth] Done: ${ok} ok, ${fail} failed`);
}

// Get a session, re-authenticating if missing or about to expire (within 5 minutes)
async function getOrRefreshSession(fieldId: string): Promise<EdgeSession | null> {
  const existing = edgeSessions.get(fieldId);
  if (existing && existing.expiresAt - Date.now() > 5 * 60 * 1000) {
    return existing;
  }
  try {
    return await authenticateEdge(fieldId);
  } catch (e: any) {
    console.error(`[Auth] Refresh failed for ${fieldId}: ${e.message}`);
    return null;
  }
}

// Build the authenticated/hashed payload for a reading
// Adds: edgeNodeId, authToken, integrityHash (SHA-256 of reading JSON), signature (HMAC-SHA256 of hash using token)
function signReading(reading: any, session: EdgeSession): any {
  // Build "core" reading (without auth fields) then hash it
  const corePayload = JSON.stringify(reading);
  const integrityHash = sha256(corePayload);
  const signature = hmacSha256(session.token, integrityHash);
  return {
    ...reading,
    // Edge authentication & integrity fields
    edgeNodeId: session.deviceId,
    integrityHash,
    signature,
    signatureAlgorithm: 'HMAC-SHA256',
    hashAlgorithm: 'SHA-256',
    tokenExpiresAt: new Date(session.expiresAt).toISOString(),
  };
}

// ─── CSV Logging ─────────────────────────────────────────────────────
// All readings (with auth/hash fields) are appended to a CSV file for audit trail.
const CSV_DIR = path.join(__dirname, 'data');
const CSV_FILE = path.join(CSV_DIR, 'awd-readings.csv');
let csvHeaderWritten = false;

const CSV_COLUMNS = [
  'timestamp', 'tick', 'fieldId', 'fieldName', 'province', 'edgeNodeId',
  'simDAP', 'simHour', 'growthStage', 'profileKey', 'varietyName', 'awdActive', 'drainForced', 'awdPhase', 'awdCycles',
  'waterLevelCm', 'soilMoisturePct', 'rainfallMmHr',
  'airTempC', 'soilTempC', 'humidityPct', 'soilPH',
  'ch4FluxMgM2Hr', 'ch4EfKgHaDay', 'n2oFluxMgM2Hr', 'n2oEfKgHaDay', 'co2FluxMgM2Hr',
  'ch4CO2eMgM2Hr', 'n2oCO2eMgM2Hr', 'netGHGCO2eMgM2Hr', 'emissionReductionPct',
  'cumulativeCH4kg', 'cumulativeN2Okg', 'cumulativeCH4tCO2e', 'cumulativeN2OtCO2e',
  'cumulativeNettCO2e', 'baselineEmissiontCO2e', 'emissionReductiontCO2e',
  'estimatedYieldKg', 'seasonComplete',
  'integrityHash', 'signature',
  'tverMethodology',
];

function ensureCsvFile() {
  try {
    if (!fs.existsSync(CSV_DIR)) {
      fs.mkdirSync(CSV_DIR, { recursive: true });
    }
    if (!fs.existsSync(CSV_FILE)) {
      // Write header
      const header = CSV_COLUMNS.join(',') + '\n';
      fs.writeFileSync(CSV_FILE, header, 'utf8');
      csvHeaderWritten = true;
      console.log(`[CSV] Created: ${CSV_FILE}`);
    } else {
      csvHeaderWritten = true;
    }
  } catch (e: any) {
    console.error(`[CSV] Init error: ${e.message}`);
  }
}

function csvEscape(value: any): string {
  if (value === null || value === undefined) return '';
  const s = String(value);
  // RFC 4180 — wrap in quotes if contains comma, quote, newline
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function appendReadingsToCsv(readings: any[]) {
  if (!csvHeaderWritten) return;
  try {
    const lines = readings.map(r => CSV_COLUMNS.map(col => csvEscape(r[col])).join(',')).join('\n');
    fs.appendFileSync(CSV_FILE, lines + '\n', 'utf8');
  } catch (e: any) {
    console.error(`[CSV] Append error: ${e.message}`);
  }
}

// ─── TGO/T-VER Constants ─────────────────────────────────────────────
const GWP_CH4 = 28;     // IPCC AR5 (ตามประกาศ TGO 2566)
const GWP_N2O = 265;    // IPCC AR5 (ตามประกาศ TGO 2566)
// T-VER-P-AG-001 Baseline EF for continuous flooding in Thailand
const TVER_EF_CF_IRRIGATED = 1.30;  // kg CH₄/ha/day นาชลประทาน
const TVER_EF_CF_RAINFED = 1.00;    // kg CH₄/ha/day นาน้ำฝน
const TVER_EF_CF_DRY = 0.70;       // kg CH₄/ha/day นาแล้ง
// Unit conversion: mg/m²/hr → kg/ha/day
// 1 mg/m²/hr × 10000 m²/ha ÷ 1e6 mg/kg × 24 hr/day = 0.24 kg/ha/day
const MG_M2_HR_TO_KG_HA_DAY = 0.24;
// kg CH₄ → tCO₂e: kg × GWP / 1000
const KG_CH4_TO_TCO2E = GWP_CH4 / 1000;
const KG_N2O_TO_TCO2E = GWP_N2O / 1000;

// ─── AWD Water Management Phases ─────────────────────────────────────
type AWDPhase = 'FLOODED' | 'DRAINING' | 'DRY' | 'REFLOODING';

// ─── Growth Stage (สี่ช่วงหลักตาม TGO/T-VER) ──────────────────────────
// แต่ละพันธุ์ + สภาพแวดล้อม มี threshold เป็นเปอร์เซ็นต์ของ totalDays
//   ESTABLISHMENT (ตั้งตัว)      — AWD ปิด (ขังน้ำ +3..+5 ซม.)
//   VEGETATIVE (แตกกอ)           — AWD เปิด (เปียกสลับแห้ง +5..-15 ซม.)
//   REPRODUCTIVE (ออกดอก/ผสมเกสร) — AWD ปิด (รักษาน้ำ)
//   MATURITY (สุกแก่)            — AWD ปิด + ระบายน้ำ
type GrowthStageKey = 'ESTABLISHMENT' | 'VEGETATIVE' | 'REPRODUCTIVE' | 'MATURITY' | 'HARVESTED';

/**
 * VarietyProfile — growth-stage thresholds เป็นเปอร์เซ็นต์ของ totalDays.
 * ปรับตามพันธุ์ข้าว + สภาพแวดล้อม:
 *  - พันธุ์ไวแสง (KDML105, PTT1, RD43): ช่วง Vegetative สั้น ออกดอกเร็ว
 *  - พันธุ์ไม่ไวแสง (RD6, RD15): ช่วง Vegetative ยาว ตอบสนอง photoperiod
 *  - นาแล้ง: establishment สั้นกว่า (เสี่ยงเครียดน้ำ) แต่ maturity เร็วกว่า
 *  - นาชลประทาน: สามารถยืด vegetative ได้นานขึ้น (น้ำคุมได้)
 */
interface VarietyProfile {
  variety: string;       // รหัสพันธุ์ (เช่น 'KDML105', 'PTT1', 'RD6')
  varietyName: string;   // ชื่อพันธุ์ภาษาไทย
  photosensitive: boolean; // ไวแสง? (true = ไม่ไวแสง ออกดอกตามฤดู)
  // thresholds เป็นเปอร์เซ็นต์ของ totalDays (cumulative)
  // ผลรวมต้อง = 100 (4 ช่วง + harvested)
  establishmentEndPct: number;  // สิ้นสุดช่วงตั้งตัว
  vegetativeEndPct: number;    // สิ้นสุดช่วงแตกกอ (AWD active สิ้นสุดที่นี่)
  reproductiveEndPct: number;  // สิ้นสุดช่วงออกดอก
  maturityEndPct: number;       // สิ้นสุดช่วงสุกแก่ (= 100)
  // AWD configuration ที่เหมาะกับพันธุ์/สภาพแวดล้อม
  awdFloodTargetCm: number;     // ระดับน้ำท่วมเป้าหมาย (cm จากผิวดิน)
  awdDryThresholdCm: number;    // ระดับน้ำแห้งเกณฑ์ (cm ติดลบ = ต่ำกว่าผิวดิน)
  awdFloodDays: number;         // วันท่วมต่อรอบ
  awdDryDays: number;           // วันแห้งต่อรอบ
  // ผลผลิตสูงสุด kg/ha ประมาณการณ์
  maxKgPerHa: number;
}

// ─── 3 พันธุ์ × สภาพแวดล้อม (อ้างอิง TGO Rice Cultivation Guide 2566) ───
const VARIETY_PROFILES: Record<string, VarietyProfile> = {
  // ข้าวหอมมะลิ 105 — ไวแสน นาชลประทาน 120 วัน
  KDML105_IRRIGATED: {
    variety: 'KDML105',
    varietyName: 'ข้าวหอมมะลิ 105 (นาชลประทาน)',
    photosensitive: false,
    establishmentEndPct: 12.5,   // วัน 1-15  (12.5% ของ 120d)
    vegetativeEndPct: 66.7,      // วัน 16-80 (AWD active ~55% ของฤดู)
    reproductiveEndPct: 83.3,    // วัน 81-100
    maturityEndPct: 91.7,        // วัน 101-110
    awdFloodTargetCm: 5,
    awdDryThresholdCm: -15,
    awdFloodDays: 7,
    awdDryDays: 5,
    maxKgPerHa: 3500,
  },
  // ข้าวเจ้า ปทุมธานี 1 — ไวแสง นาน้ำฝน 105 วัน
  PTT1_RAINFED: {
    variety: 'PTT1',
    varietyName: 'ข้าวเจ้า ปทุมธานี 1 (นาน้ำฝน)',
    photosensitive: false,
    establishmentEndPct: 14.3,   // วัน 1-15  (14.3% ของ 105d)
    vegetativeEndPct: 76.2,      // วัน 16-80
    reproductiveEndPct: 95.2,     // วัน 81-100
    maturityEndPct: 100.0,       // วัน 101-105
    awdFloodTargetCm: 5,
    awdDryThresholdCm: -12,      // ดินเหนียว hold น้ำดี → ไม่ต้องแห้งลึก
    awdFloodDays: 6,
    awdDryDays: 4,
    maxKgPerHa: 4500,
  },
  // ข้าวกข 43 (RD43) — ไวแสง นาแล้ง 95 วัน (early-maturing, drought-tolerant)
  RD43_DRY: {
    variety: 'RD43',
    varietyName: 'ข้าวเจ้า กข 43 (นาแล้ง)',
    photosensitive: false,
    establishmentEndPct: 15.8,   // วัน 1-15  (15.8% ของ 95d)
    vegetativeEndPct: 84.2,     // วัน 16-80
    reproductiveEndPct: 105.3,   // วัน 81-100 → เกิน totalDays → cap at 100%
    maturityEndPct: 100.0,      // 95 วันสุดท้าย
    awdFloodTargetCm: 5,
    awdDryThresholdCm: -10,      // นาแล้ง: น้ำน้อยอยู่แล้ว → ไม่แห้งลึก
    awdFloodDays: 5,
    awdDryDays: 3,
    maxKgPerHa: 4200,
  },
};

interface AWDField {
  id: string;
  name: string;
  province: string;
  lat: number;
  lng: number;
  areaHa: number;
  soilType: string;
  waterSource: string;
  riceVariety: string;
  totalDays: number;   // รวมฤดูกาล (วัน)
  // พิกัดขอบเขตพื้นที่ [[lat,lng],...]
  boundary: number[][];
  // Variety profile key — index into VARIETY_PROFILES (พันธุ์ + สภาพแวดล้อม)
  profileKey: string;
  // สภาพแวดล้อมพื้นฐาน
  baseTempMin: number;  // °C ต่ำสุดเฉลี่ย
  baseTempMax: number;  // °C สูงสุดเฉลี่ย
  baseHumidity: number; // % เฉลี่ย
  annualRainfallMm: number;
  // AWD parameters
  floodTargetCm: number;   // ระดับน้ำท่วมเป้าหมาย (cm)
  dryThresholdCm: number;  // ระดับน้ำแห้งเกณฑ์ (cm ต่ำกว่าผิวดิน)
  floodDays: number;       // จำนวนวันท่วมต่อรอบ
  dryDays: number;         // จำนวนวันแห้งต่อรอบ
  // Simulation state
  currentDAP: number;      // Days After Planting
  currentHour: number;     // ชม. ในวันนั้น (0-23)
  waterLevelCm: number;
  currentAWDPhase: AWDPhase;
  awdPhaseDayCounter: number;
  totalAWDCycles: number;
  // Cumulative (T-VER units)
  totalCH4kg: number;      // kg CH₄ สะสม (T-VER standard unit)
  totalN2Okg: number;      // kg N₂O สะสม
  totalCH4tCO2e: number;   // tCO₂e from CH₄ (T-VER credit unit)
  totalN2OtCO2e: number;   // tCO₂e from N₂O
  totalNettCO2e: number;   // tCO₂e สุทธิ (CH₄ + N₂O - CO₂ soil offset)
  baselineEmissiontCO2e: number; // tCO₂e ถ้าปลูกแบบท่วมตลอด (baseline)
  emissionReductiontCO2e: number; // tCO₂e ที่ลดได้ (baseline - project)
  totalYieldKg: number;    // ผลผลิตข้าวเปลือก (kg) - ประมาณจาก growth
  // Season tracking
  seasonComplete: boolean;
}

// ─── 3 พื้นที่ AWD ──────────────────────────────────────────────────
function createFields(): AWDField[] {
  return [
    {
      id: 'awd-korat',
      name: 'นครราชสีมา AWD (ชลประทาน)',
      province: 'นครราชสีมา',
      lat: 14.97,
      lng: 102.08,
      areaHa: 48,
      soilType: 'ดินร่วนปนทราย (Sandy Loam)',
      waterSource: 'ชลประทาน เขื่อนลำตะคอง',
      riceVariety: 'ข้าวหอมมะลิ 105 (KDML105)',
      totalDays: 120,
      profileKey: 'KDML105_IRRIGATED',
      boundary: [
        [14.985, 102.060], [14.985, 102.100],
        [14.960, 102.100], [14.960, 102.080],
        [14.955, 102.070], [14.960, 102.060],
      ],
      baseTempMin: 22,
      baseTempMax: 34,
      baseHumidity: 72,
      annualRainfallMm: 1100,
      // AWD params สอดคล้องกับ KDML105_IRRIGATED profile
      floodTargetCm: 5,
      dryThresholdCm: -15,
      floodDays: 7,
      dryDays: 5,
      currentDAP: 0,
      currentHour: 6,
      waterLevelCm: 0,
      currentAWDPhase: 'FLOODED',
      awdPhaseDayCounter: 0,
      totalAWDCycles: 0,
      totalCH4kg: 0,
      totalN2Okg: 0,
      totalCH4tCO2e: 0,
      totalN2OtCO2e: 0,
      totalNettCO2e: 0,
      baselineEmissiontCO2e: 0,
      emissionReductiontCO2e: 0,
      totalYieldKg: 0,
      seasonComplete: false,
    },
    {
      id: 'awd-suphan',
      name: 'สุพรรณบุรี AWD (น้ำฝน)',
      province: 'สุพรรณบุรี',
      lat: 14.47,
      lng: 100.12,
      areaHa: 32,
      soilType: 'ดินเหนียว (Clay)',
      waterSource: 'น้ำฝน + ระบบสูบน้ำสำรอง',
      riceVariety: 'ข้าวเจ้า ปทุมธานี 1 (PTT1)',
      totalDays: 105,
      profileKey: 'PTT1_RAINFED',
      boundary: [
        [14.485, 100.105], [14.485, 100.140],
        [14.460, 100.140], [14.458, 100.120],
        [14.460, 100.105],
      ],
      baseTempMin: 24,
      baseTempMax: 35,
      baseHumidity: 78,
      annualRainfallMm: 1400,
      // AWD params สอดคล้องกับ PTT1_RAINFED profile
      floodTargetCm: 5,
      dryThresholdCm: -12,
      floodDays: 6,
      dryDays: 4,
      currentDAP: 0,
      currentHour: 6,
      waterLevelCm: 0,
      currentAWDPhase: 'FLOODED',
      awdPhaseDayCounter: 0,
      totalAWDCycles: 0,
      totalCH4kg: 0,
      totalN2Okg: 0,
      totalCH4tCO2e: 0,
      totalN2OtCO2e: 0,
      totalNettCO2e: 0,
      baselineEmissiontCO2e: 0,
      emissionReductiontCO2e: 0,
      totalYieldKg: 0,
      seasonComplete: false,
    },
    {
      id: 'awd-ubon',
      name: 'อุบลราชธานี AWD (แล้ง)',
      province: 'อุบลราชธานี',
      lat: 15.24,
      lng: 104.85,
      areaHa: 25,
      soilType: 'ดินทราย (Sandy Soil)',
      waterSource: 'ฝนตกเท่านั้น (Rainfed)',
      riceVariety: 'ข้าวกข 43 (RD43)',
      totalDays: 95,
      profileKey: 'RD43_DRY',
      boundary: [
        [15.255, 104.835], [15.255, 104.870],
        [15.230, 104.870], [15.228, 104.850],
        [15.230, 104.835],
      ],
      baseTempMin: 23,
      baseTempMax: 36,
      baseHumidity: 65,
      annualRainfallMm: 800,
      // AWD params สอดคล้องกับ RD43_DRY profile
      floodTargetCm: 5,
      dryThresholdCm: -10,
      floodDays: 5,
      dryDays: 3,
      currentDAP: 0,
      currentHour: 6,
      waterLevelCm: 0,
      currentAWDPhase: 'FLOODED',
      awdPhaseDayCounter: 0,
      totalAWDCycles: 0,
      totalCH4kg: 0,
      totalN2Okg: 0,
      totalCH4tCO2e: 0,
      totalN2OtCO2e: 0,
      totalNettCO2e: 0,
      baselineEmissiontCO2e: 0,
      emissionReductiontCO2e: 0,
      totalYieldKg: 0,
      seasonComplete: false,
    },
  ];
}

// ─── Growth Stage (ปรับตามพันธุ์ + สภาพแวดล้อม) ───────────────────────
// สี่ช่วงหลักตาม TGO/T-VER Rice Cultivation Guideline:
//   ESTABLISHMENT → VEGETATIVE → REPRODUCTIVE → MATURITY → HARVESTED
// แต่ละพันธุ์มี threshold เป็นเปอร์เซ็นต์ของ totalDays (เก็บใน VARIETY_PROFILES)
function getGrowthStage(dap: number, totalDays: number, profileKey?: string): string {
  const profile = profileKey ? VARIETY_PROFILES[profileKey] : undefined;
  const p = Math.min(dap / totalDays, 1.0);

  // ใช้ profile threshold ถ้ามี, ไม่งั้นใช้ default (KDML105 สไตล์เดิม)
  const est = profile?.establishmentEndPct ?? 12.5;
  const veg = profile?.vegetativeEndPct ?? 66.7;
  const rep = profile?.reproductiveEndPct ?? 83.3;
  const mat = profile?.maturityEndPct ?? 91.7;

  if (p >= 1.0) return 'HARVESTED';
  if (p * 100 >= mat) return 'MATURITY';
  if (p * 100 >= rep) return 'REPRODUCTIVE';
  if (p * 100 >= veg) return 'REPRODUCTIVE'; // ป้องกัน gap ถ้า rep < veg
  if (p * 100 >= est) return 'VEGETATIVE';
  return 'ESTABLISHMENT';
}

/** ดึง VarietyProfile ของ field — fallback ไป default ถ้าไม่มี */
function getFieldProfile(field: AWDField): VarietyProfile | undefined {
  return VARIETY_PROFILES[field.profileKey];
}

/**
 * ตรวจสอบว่า AWD ควรเปิดทำงานหรือไม่ในช่วง growth stage ปัจจุบัน
 * ตามแนวทาง TGO/T-VER:
 *   ESTABLISHMENT  → AWD ปิด (ขังน้ำ +3..+5 ซม. ให้ต้นก้าตั้งท้อง)
 *   VEGETATIVE     → AWD เปิด (เปียกสลับแห้ง +5..-15 ซม. ลด CH4)
 *   REPRODUCTIVE   → AWD ปิด (รักษาน้ำ ป้องกันช่องเกสรแห้ง ผลผลิตตก)
 *   MATURITY       → AWD ปิด + force DRAIN (ระบายน้ำเพื่อเก็บเกี่ยว)
 *   HARVESTED      → AWD ปิด
 */
function isAWDActive(field: AWDField): boolean {
  const stage = getGrowthStage(field.currentDAP, field.totalDays, field.profileKey);
  return stage === 'VEGETATIVE';
}

/** บอกว่า growth stage ปัจจุบันบังคับระบายน้ำหรือไม่ (ช่วงสุกแก่) */
function isDrainForced(field: AWDField): boolean {
  const stage = getGrowthStage(field.currentDAP, field.totalDays, field.profileKey);
  return stage === 'MATURITY' || stage === 'HARVESTED';
}

// ─── Temperature Model ───────────────────────────────────────────────
function getTemperature(field: AWDField, hour: number): number {
  // อุณหภูมิตามช่วงเวลา (รอบ 24 ชม.) sin curve
  const avgTemp = (field.baseTempMin + field.baseTempMax) / 2;
  const amplitude = (field.baseTempMax - field.baseTempMin) / 2;
  // peak at 14:00, low at 05:00
  const temp = avgTemp + amplitude * Math.sin(((hour - 5) / 24) * Math.PI * 2 - Math.PI / 2);
  // เพิ่ม noise เล็กน้อย
  return temp + (Math.sin(field.currentDAP * 0.7 + hour * 0.3) * 1.5);
}

// ─── Rainfall Model ──────────────────────────────────────────────────
function getRainfallMm(field: AWDField, dap: number, hour: number): number {
  // ฝนตกตามฤดู: มิ.ย.-ต.ค. = ฝนชุก, พ.ย.-พ.ค. = แล้ง
  // DAP 0-30 = ต้นฤดู (ฝนเริ่ม), 30-80 = กลางฤดู (ฝนชุก), 80+ = ปลายฤดู
  const rainFactor = field.annualRainfallMm / 1400;
  let baseRainfall = 0;
  if (dap < 30) baseRainfall = 0.15;       // ต้นฤดู 15% โอกาสฝนตก
  else if (dap < 80) baseRainfall = 0.40;  // กลางฤดู 40%
  else baseRainfall = 0.20;                // ปลายฤดู 20%

  // ฝนตกเฉพาะบางช่วงเวลา (12:00-18:00)
  const isRainyHour = hour >= 12 && hour <= 18;
  if (!isRainyHour) return 0;

  // ใช้ deterministic pseudo-random จาก DAP + hour
  const seed = Math.sin(dap * 12.9898 + hour * 78.233) * 43758.5453;
  const rand = seed - Math.floor(seed);
  if (rand > baseRainfall * rainFactor) return 0;

  // ปริมาณฝน 0.5-8 mm/hr
  const intensity = (rand * 7.5 + 0.5) * rainFactor;
  return Math.round(intensity * 10) / 10;
}

// ─── CH4 Emission Model (T-VER-P-AG-001) ────────────────────────────
// CH4 ปล่อยมากตอนน้ำท่วม ลดลงมากตอนแห้ง (AWD ช่วยลด CH4)
// หน่วย: mg/m²/hr → แปลงเป็น kg CH₄/ha/day สำหรับ T-VER
function getCH4Emission(field: AWDField, hour: number): number {
  const stage = getGrowthStage(field.currentDAP, field.totalDays, field.profileKey);
  // อัตราปล่อยพื้นฐานตามช่วง growth stage (mg/m²/hr)
  // อ้างอิง: T-VER-P-AG-001 EF scaling — สูงสุดในช่วง Vegetative และ Reproductive
  let baseFlux = 0;
  switch (stage) {
    case 'ESTABLISHMENT': baseFlux = 5; break;   // ตั้งตัว: ปานกลาง (น้ำขัง)
    case 'VEGETATIVE':    baseFlux = 25; break;  // แตกกอ: สูง (ช่วงที่ AWD active)
    case 'REPRODUCTIVE':  baseFlux = 30; break; // ออกดอก: สูงสุด (AWD ปิด → ใช้ baseline)
    case 'MATURITY':      baseFlux = 8; break;   // สุกแก่: ลดลง
    case 'HARVESTED':     baseFlux = 1; break;
  }

  // ปัจจัยระดับน้ำ — ถ้า AWD ไม่ active ใช้ baseline (FLOODED = 1.0)
  const awdOn = isAWDActive(field);
  let waterFactor = 1.0;
  if (awdOn) {
    switch (field.currentAWDPhase) {
      case 'FLOODED': waterFactor = 1.0; break;
      case 'DRAINING': waterFactor = 0.6; break;
      case 'DRY': waterFactor = 0.15; break; // ลดมากตอนแห้ง
      case 'REFLOODING': waterFactor = 0.7; break;
    }
  } else {
    // AWD ปิด → ถือว่าท่วมตลอด (baseline continuous flooding)
    // ยกเว้นช่วง MATURITY ที่ force DRAIN → waterFactor = 0.2
    waterFactor = isDrainForced(field) ? 0.2 : 1.0;
  }

  // อุณหภูมิ affect: สูงขึ้น = CH4 เพิ่ม
  const temp = getTemperature(field, hour);
  const tempFactor = 1 + (temp - 28) * 0.03;

  // ดินเหนียว = ปล่อย CH4 มากกว่าดินทราย
  const soilFactor = field.soilType.includes('Clay') ? 1.3 :
                     field.soilType.includes('Sandy') ? 0.7 : 1.0;

  return Math.max(0, baseFlux * waterFactor * tempFactor * soilFactor);
}

// ─── N2O Emission Model (T-VER-P-AG-001) ────────────────────────────
// N2O เพิ่มตอน drain/reflood (nitrification/denitrification)
function getN2OEmission(field: AWDField): number {
  const stage = getGrowthStage(field.currentDAP, field.totalDays, field.profileKey);
  let baseFlux = 0;
  switch (stage) {
    case 'ESTABLISHMENT': baseFlux = 0.4; break;
    case 'VEGETATIVE':    baseFlux = 1.5; break;  // สูงตอนแตกกอ (AWD active → drain/reflood cycles)
    case 'REPRODUCTIVE':  baseFlux = 1.2; break;
    case 'MATURITY':      baseFlux = 0.5; break;
    case 'HARVESTED':     baseFlux = 0.1; break;
  }

  // N2O spike ตอน drain/reflood — แต่ถ้า AWD ปิด ใช้ phase factor 1.0 (baseline)
  const awdOn = isAWDActive(field);
  let phaseFactor = 1.0;
  if (awdOn) {
    switch (field.currentAWDPhase) {
      case 'FLOODED': phaseFactor = 0.5; break;
      case 'DRAINING': phaseFactor = 2.5; break;  // spike!
      case 'DRY': phaseFactor = 1.2; break;
      case 'REFLOODING': phaseFactor = 2.8; break; // spike!
    }
  } else {
    // AWD ปิด → baseline (FLOODED) ตลอด ยกเว้น MATURITY ที่ force drain
    phaseFactor = isDrainForced(field) ? 1.8 : 0.5; // drain ตอนสุกแก่ ก็เกิด N2O
  }

  // ดินทราย = N2O มากกว่า (leaching)
  const soilFactor = field.soilType.includes('Sandy') ? 1.4 :
                     field.soilType.includes('Clay') ? 0.8 : 1.0;

  return Math.max(0, baseFlux * phaseFactor * soilFactor);
}

// ─── Water Level Update ──────────────────────────────────────────────
// Gated by growth stage (ปรับตามพันธุ์ + สภาพแวดล้อม):
//   ESTABLISHMENT → hold FLOODED (+3..+5 cm), no AWD cycling
//   VEGETATIVE    → run normal AWD cycling (FLOODED→DRAINING→DRY→REFLOODING)
//   REPRODUCTIVE  → hold FLOODED, no AWD cycling (protect flowering)
//   MATURITY      → force DRAIN to dry out field for harvest
function updateWaterLevel(field: AWDField, rainfall: number): void {
  const hour = field.currentHour;
  const awdOn = isAWDActive(field);
  const drainForced = isDrainForced(field);

  // การระเหย (ET) ขึ้นกับอุณหภูมิและช่วงเวลา
  const temp = getTemperature(field, hour);
  const dayETmm = 3 + (temp - 25) * 0.15; // mm/day
  const hourETmm = dayETmm / 24;
  // percolation ขึ้นกับชนิดดิน
  const percMmPerDay = field.soilType.includes('Sandy') ? 8 :
                       field.soilType.includes('Clay') ? 1.5 : 3.5;
  const percMmPerHr = percMmPerDay / 24;

  // น้ำเข้า: ฝน
  const inflowMm = rainfall;
  // น้ำออก: ระเหย + ซึม (เร่งซึมตอน force-drain ช่วงสุกแก่)
  const drainBoost = drainForced ? 3.0 : 1.0;
  const outflowMm = hourETmm + percMmPerHr * drainBoost;

  // แปลง mm → cm
  const waterChangeCm = (inflowMm - outflowMm) / 10;

  // ชลประทาน: เติมน้ำตอน FLOODED/REFLOODING — เฉพาะเมื่อ AWD active หรือ establishment/flowering
  let irrigationCm = 0;
  if (field.waterSource.includes('ชลประทาน') &&
      !drainForced &&
      (field.currentAWDPhase === 'FLOODED' || field.currentAWDPhase === 'REFLOODING') &&
      hour === 7) { // เติมน้ำตอนเช้า
    irrigationCm = 0.5; // cm/hr เมื่อเปิดประตูน้ำ
  }
  // สูบน้ำสำรอง (สุพรรณ)
  if (field.waterSource.includes('สำรอง') &&
      !drainForced &&
      field.currentAWDPhase === 'FLOODED' && field.waterLevelCm < 3 &&
      hour === 8) {
    irrigationCm = 0.3;
  }

  field.waterLevelCm += waterChangeCm + irrigationCm;

  // AWD Phase transitions — gated by growth stage
  if (drainForced) {
    // MATURITY: force DRY (no FLOODED/REFLOODING cycles) → ระบายน้ำเพื่อเก็บเกี่ยว
    field.currentAWDPhase = 'DRY';
    field.awdPhaseDayCounter = 0;
    // ปล่อยให้น้ำลดลงตามธรรมชาติ (drainBoost เร่งซึม)
  } else if (!awdOn) {
    // ESTABLISHMENT / REPRODUCTIVE: hold FLOODED, no cycling
    field.currentAWDPhase = 'FLOODED';
    field.awdPhaseDayCounter = 0;
    // รักษาระดับน้ำ +3..+5 ซม.
    if (field.waterLevelCm < 3) {
      field.waterLevelCm = Math.max(field.waterLevelCm, 3);
    }
    if (field.waterLevelCm > field.floodTargetCm + 2) {
      field.waterLevelCm = field.floodTargetCm + 2; // ไม่ให้ท่วมลึกเกินไป
    }
  } else {
    // VEGETATIVE: normal AWD cycling
    field.awdPhaseDayCounter += 1 / 24; // เพิ่ม 1 ชม. เป็นเศษของวัน

    switch (field.currentAWDPhase) {
      case 'FLOODED':
        if (field.awdPhaseDayCounter >= field.floodDays) {
          field.currentAWDPhase = 'DRAINING';
          field.awdPhaseDayCounter = 0;
        }
        // รักษาระดับน้ำถ้าต่ำเกิน
        if (field.waterLevelCm < 2 && field.waterSource.includes('ชลประทาน')) {
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
        // ฝนตกหนักอาจเติมน้ำให้เร็วขึ้น
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
        // ชลประทานช่วยเติมน้ำ
        if (field.waterSource.includes('ชลประทาน') && field.waterLevelCm < 5) {
          field.waterLevelCm += 0.3;
        }
        break;
    }
  }

  // Clamp water level
  field.waterLevelCm = Math.max(-25, Math.min(20, field.waterLevelCm));
}

// ─── Soil Moisture ───────────────────────────────────────────────────
function getSoilMoisture(field: AWDField): number {
  let base = 40;
  switch (field.currentAWDPhase) {
    case 'FLOODED': base = 85 + field.waterLevelCm; break;
    case 'DRAINING': base = 70 + field.waterLevelCm * 0.8; break;
    case 'DRY': base = 30 + field.waterLevelCm * 0.5; break;
    case 'REFLOODING': base = 50 + field.waterLevelCm; break;
  }
  // ดินทรายแห้งเร็วกว่า
  if (field.soilType.includes('Sandy')) base -= 8;
  if (field.soilType.includes('Clay')) base += 5;
  return Math.max(15, Math.min(100, base));
}

// ─── Rice Yield Estimation ───────────────────────────────────────────
function estimateYieldKgPerHa(field: AWDField): number {
  // ประมาณผลผลิตจาก DAP
  const p = Math.min(field.currentDAP / field.totalDays, 1);
  const maxKgPerHa = field.riceVariety.includes('KDML') ? 3500 :
                     field.riceVariety.includes('RD43') ? 4200 : 4500;
  // S-curve growth
  const growthFactor = 1 / (1 + Math.exp(-10 * (p - 0.5)));
  // AWD ลดผลผลิตเล็กน้อย 0-5% แต่ประหยัดน้ำ 30%
  const awdPenalty = 0.97;
  // นาแล้งผลผลิตต่ำกว่า
  const droughtFactor = field.waterSource.includes('ฝนเท่านั้น') ? 0.75 :
                        field.waterSource.includes('ฝน') ? 0.88 : 1.0;
  return maxKgPerHa * growthFactor * awdPenalty * droughtFactor;
}

// ─── CO2 from Soil Respiration ───────────────────────────────────────
function getCO2Flux(field: AWDField, hour: number): number {
  const temp = getTemperature(field, hour);
  const stage = getGrowthStage(field.currentDAP, field.totalDays, field.profileKey);
  let baseFlux = 50; // mg/m²/hr พื้นฐาน
  switch (stage) {
    case 'ESTABLISHMENT': baseFlux = 60; break;
    case 'VEGETATIVE':    baseFlux = 150; break;  // สูงสุดช่วงแตกกอ (root respiration peak)
    case 'REPRODUCTIVE':  baseFlux = 140; break;
    case 'MATURITY':      baseFlux = 80; break;
    case 'HARVESTED':     baseFlux = 30; break;
  }
  // อุณหภูมิ
  const tempFactor = Math.exp(0.05 * (temp - 25));
  // ความชื้นดิน
  const moisture = getSoilMoisture(field);
  const moistureFactor = moisture > 60 ? 1.2 : moisture > 30 ? 1.0 : 0.7;
  return baseFlux * tempFactor * moistureFactor;
}

// ─── Main Simulation ─────────────────────────────────────────────────
const httpServer = createServer();
const io = new Server(httpServer, { cors: { origin: '*' } });

let fields: AWDField[] = createFields();
let simRunning = false;
let simTimer: ReturnType<typeof setInterval> | null = null;
let simTickCounter = 0;
let readings: any[] = []; // last 200 readings

function simTick() {
  simTickCounter++;
  const newReadings: any[] = [];

  for (const field of fields) {
    if (field.seasonComplete) continue;

    // Advance time
    field.currentHour += SIM_HOURS_PER_TICK;
    if (field.currentHour >= 24) {
      field.currentHour -= 24;
      field.currentDAP++;
    }

    // Check season end
    if (field.currentDAP >= field.totalDays) {
      field.seasonComplete = true;
      field.currentAWDPhase = 'DRY';
      field.waterLevelCm = -20;
    }

    // Environment
    const temp = getTemperature(field, field.currentHour);
    const humidity = field.baseHumidity +
      (field.currentAWDPhase === 'DRY' ? -8 : field.currentAWDPhase === 'FLOODED' ? 5 : 0) +
      Math.sin(field.currentDAP * 0.5 + field.currentHour * 0.2) * 5;
    const rainfall = getRainfallMm(field, field.currentDAP, field.currentHour);

    // Water
    updateWaterLevel(field, rainfall);

    // Emissions
    const ch4Flux = getCH4Emission(field, field.currentHour);
    const n2oFlux = getN2OEmission(field);
    const co2Flux = getCO2Flux(field, field.currentHour);

    // Soil
    const soilMoisture = getSoilMoisture(field);
    const soilPH = 5.5 + Math.sin(field.currentDAP * 0.1) * 0.3;
    const soilTempC = temp - 2 + Math.sin(field.currentDAP * 0.3) * 0.5;

    // Growth
    const growthStage = getGrowthStage(field.currentDAP, field.totalDays, field.profileKey);
    const yieldKgPerHa = estimateYieldKgPerHa(field);

    // Accumulate — T-VER standard units
    const areaM2 = field.areaHa * 10000;
    // Convert flux mg/m²/hr → kg/ha for this hour
    const ch4KgPerHaThisHour = ch4Flux * MG_M2_HR_TO_KG_HA_DAY / 24; // kg CH₄/ha for 1 hr
    const n2oKgPerHaThisHour = n2oFlux * MG_M2_HR_TO_KG_HA_DAY / 24; // kg N₂O/ha for 1 hr
    // Total kg = per ha × area
    const ch4KgThisHour = ch4KgPerHaThisHour * field.areaHa;
    const n2oKgThisHour = n2oKgPerHaThisHour * field.areaHa;

    field.totalCH4kg += ch4KgThisHour;
    field.totalN2Okg += n2oKgThisHour;
    field.totalCH4tCO2e = field.totalCH4kg * KG_CH4_TO_TCO2E;
    field.totalN2OtCO2e = field.totalN2Okg * KG_N2O_TO_TCO2E;

    // CO₂ soil respiration offset (plant uptake ~offsets soil respiration)
    const co2KgThisHour = co2Flux * areaM2 / 1e6; // mg/m²/hr → kg
    field.totalNettCO2e = field.totalCH4tCO2e + field.totalN2OtCO2e - (co2KgThisHour / 1000 * 0.3); // 30% offset
    field.totalYieldKg = yieldKgPerHa * field.areaHa;

    // T-VER-P-AG-001: Baseline (continuous flooding) emission calculation
    // Baseline EF depends on water source type
    const baselineEF = field.waterSource.includes('ชลประทาน') ? TVER_EF_CF_IRRIGATED :
                       field.waterSource.includes('ฝนเท่านั้น') ? TVER_EF_CF_DRY :
                       TVER_EF_CF_RAINFED;
    const baselineCH4KgPerDay = baselineEF * field.areaHa; // kg CH₄/day for whole area
    const baselineCH4KgThisHour = baselineCH4KgPerDay / 24;
    field.baselineEmissiontCO2e += baselineCH4KgThisHour * KG_CH4_TO_TCO2E;
    field.emissionReductiontCO2e = Math.max(0, field.baselineEmissiontCO2e - field.totalNettCO2e);

    // Convert CH4 to CO2e (GWP=28 per TGO/IPCC AR5), N2O to CO2e (GWP=265)
    const ch4CO2e = ch4Flux * GWP_CH4; // mgCO2e/m²/hr
    const n2oCO2e = n2oFlux * GWP_N2O;
    const totalGHGCO2e = ch4CO2e + n2oCO2e - co2Flux; // net
    // AWD emission reduction vs continuous flooding
    const baselineCH4Flux = ch4Flux / 0.6; // continuous flooding = higher
    const emissionReductionPct = ((baselineCH4Flux - ch4Flux) / baselineCH4Flux) * 100;

    const reading = {
      tick: simTickCounter,
      fieldId: field.id,
      fieldName: field.name,
      province: field.province,
      timestamp: new Date().toISOString(),
      simDAP: field.currentDAP,
      simHour: field.currentHour,
      growthStage,
      // Variety + profile metadata (ปรับตามพันธุ์ + สภาพแวดล้อม)
      profileKey: field.profileKey,
      varietyName: getFieldProfile(field)?.varietyName ?? field.riceVariety,
      photosensitive: getFieldProfile(field)?.photosensitive ?? false,
      // AWD state — บอกว่า growth stage ปัจจุบันอนุญาตให้ AWD ทำงานหรือไม่
      awdActive: isAWDActive(field),
      drainForced: isDrainForced(field),
      awdPhase: field.currentAWDPhase,
      awdCycles: field.totalAWDCycles,
      // Water
      waterLevelCm: Math.round(field.waterLevelCm * 10) / 10,
      soilMoisturePct: Math.round(soilMoisture * 10) / 10,
      rainfallMmHr: Math.round(rainfall * 10) / 10,
      // Climate
      airTempC: Math.round(temp * 10) / 10,
      soilTempC: Math.round(soilTempC * 10) / 10,
      humidityPct: Math.round(humidity * 10) / 10,
      soilPH: Math.round(soilPH * 100) / 100,
      // Emissions — T-VER standard units
      ch4FluxMgM2Hr: Math.round(ch4Flux * 100) / 100,         // mg/m²/hr (raw sensor)
      ch4EfKgHaDay: Math.round(ch4Flux * MG_M2_HR_TO_KG_HA_DAY * 1000) / 1000,  // kg CH₄/ha/day (T-VER EF)
      n2oFluxMgM2Hr: Math.round(n2oFlux * 100) / 100,
      n2oEfKgHaDay: Math.round(n2oFlux * MG_M2_HR_TO_KG_HA_DAY * 1000) / 1000,
      co2FluxMgM2Hr: Math.round(co2Flux * 10) / 10,
      ch4CO2eMgM2Hr: Math.round(ch4CO2e * 100) / 100,
      n2oCO2eMgM2Hr: Math.round(n2oCO2e * 100) / 100,
      netGHGCO2eMgM2Hr: Math.round(totalGHGCO2e * 100) / 100,
      emissionReductionPct: Math.round(emissionReductionPct * 10) / 10,
      // Cumulative — T-VER units
      cumulativeCH4kg: Math.round(field.totalCH4kg * 1000) / 1000,   // kg CH₄
      cumulativeN2Okg: Math.round(field.totalN2Okg * 1000) / 1000,   // kg N₂O
      cumulativeCH4tCO2e: Math.round(field.totalCH4tCO2e * 10000) / 10000,  // tCO₂e
      cumulativeN2OtCO2e: Math.round(field.totalN2OtCO2e * 10000) / 10000,
      cumulativeNettCO2e: Math.round(field.totalNettCO2e * 10000) / 10000,
      baselineEmissiontCO2e: Math.round(field.baselineEmissiontCO2e * 10000) / 10000,
      emissionReductiontCO2e: Math.round(field.emissionReductiontCO2e * 10000) / 10000,
      estimatedYieldKg: Math.round(field.totalYieldKg),
      seasonComplete: field.seasonComplete,
      // T-VER methodology reference
      tverMethodology: 'T-VER-P-AG-001',
      tverGwpCH4: GWP_CH4,
      tverGwpN2O: GWP_N2O,
    };

    newReadings.push(reading);
  }

  // Store raw readings
  readings.push(...newReadings);
  if (readings.length > 600) readings = readings.slice(-600);

  // Emit raw readings via Socket.IO (local dashboard)
  io.emit('awd:reading', newReadings);
  io.emit('awd:status', getStatus());

  // Publish via MQTT to external broker (35.213.186.240:1883)
  // Auto-reconnect if connection dropped mid-simulation
  if (!mqttConnected && !mqttClient) {
    connectMQTT();
  }

  // Sign each reading with edge auth (integrityHash + signature) and publish + log to CSV
  // Use async IIFE to await session refresh for each field
  (async () => {
    const signedReadings: any[] = [];
    for (const reading of newReadings) {
      const session = await getOrRefreshSession(reading.fieldId);
      if (!session) {
        // Skip signing — publish raw reading (degraded mode)
        publishReadingToMQTT(reading);
        continue;
      }
      const signed = signReading(reading, session);
      signedReadings.push(signed);
      publishReadingToMQTT(signed);
    }
    // Append signed readings to CSV (audit trail with hash + signature)
    if (signedReadings.length > 0) {
      appendReadingsToCsv(signedReadings);
    }
  })().catch(e => console.error('[SIM] Sign/publish error:', e.message));
}

function getStatus() {
  return {
    running: simRunning,
    tickCounter: simTickCounter,
    speedFactor: SPEED_FACTOR,
    intervalMs: INTERVAL_MS,
    fields: fields.map(f => ({
      id: f.id,
      name: f.name,
      province: f.province,
      lat: f.lat,
      lng: f.lng,
      areaHa: f.areaHa,
      soilType: f.soilType,
      waterSource: f.waterSource,
      riceVariety: f.riceVariety,
      totalDays: f.totalDays,
      profileKey: f.profileKey,
      varietyName: getFieldProfile(f)?.varietyName ?? f.riceVariety,
      photosensitive: getFieldProfile(f)?.photosensitive ?? false,
      // growth stage thresholds (เปอร์เซ็นต์ของ totalDays) ส่งไปให้ frontend แสดง
      stageThresholds: getFieldProfile(f) ? {
        establishmentEndPct: getFieldProfile(f)!.establishmentEndPct,
        vegetativeEndPct: getFieldProfile(f)!.vegetativeEndPct,
        reproductiveEndPct: getFieldProfile(f)!.reproductiveEndPct,
        maturityEndPct: getFieldProfile(f)!.maturityEndPct,
      } : undefined,
      boundary: f.boundary,
      currentDAP: f.currentDAP,
      currentHour: f.currentHour,
      waterLevelCm: Math.round(f.waterLevelCm * 10) / 10,
      currentAWDPhase: f.currentAWDPhase,
      // AWD state flags (ปรับตาม growth stage)
      awdActive: isAWDActive(f),
      drainForced: isDrainForced(f),
      awdCycles: f.totalAWDCycles,
      growthStage: getGrowthStage(f.currentDAP, f.totalDays, f.profileKey),
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

function startSim() {
  if (simRunning) return;
  simRunning = true;
  // Ensure MQTT is connected to 35.213.186.240:1883 before publishing
  // (auto-reconnect if connection was lost or never established)
  if (!mqttConnected) {
    console.log('[SIM] MQTT not connected — reconnecting to 35.213.186.240:1883 before starting simulation...');
    if (mqttClient) {
      try { mqttClient.end(true); } catch (e) {}
      mqttClient = null;
      mqttConnected = false;
    }
    connectMQTT();
  }
  simTimer = setInterval(simTick, INTERVAL_MS);
  io.emit('awd:started', { speedFactor: SPEED_FACTOR });
  publishStatusToMQTT(getStatus());
}

function stopSim() {
  if (!simRunning) return;
  simRunning = false;
  if (simTimer) { clearInterval(simTimer); simTimer = null; }
  io.emit('awd:stopped');
  publishStatusToMQTT(getStatus());
}

function resetSim() {
  stopSim();
  fields = createFields();
  simTickCounter = 0;
  readings = [];
  io.emit('awd:reset');
  io.emit('awd:status', getStatus());
  publishStatusToMQTT(getStatus());
}

// ─── Socket.IO ───────────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`[AWD] Client connected: ${socket.id}`);

  // Send current status
  socket.emit('awd:status', getStatus());

  // Send recent readings
  if (readings.length > 0) {
    socket.emit('awd:readings', readings.slice(-100));
  }

  socket.on('awd:start', () => { startSim(); });
  socket.on('awd:stop', () => { stopSim(); });
  socket.on('awd:reset', () => { resetSim(); });

  socket.on('disconnect', () => {
    console.log(`[AWD] Client disconnected: ${socket.id}`);
  });
});

// ─── REST API ────────────────────────────────────────────────────────
httpServer.on('request', (req, res) => {
  const url = new URL(req.url || '/', `http://localhost:${PORT}`);

  // Handle CORS preflight
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return; }

  res.setHeader('Content-Type', 'application/json');

  // POST control endpoints — work even when Socket.IO is not connected
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
  } else if (url.pathname === '/api/mqtt-status') {
    res.end(JSON.stringify({
      broker: MQTT_BROKER_URL,
      connected: mqttConnected,
      clientId: MQTT_CLIENT_ID,
      topics: {
        readings: MQTT_TOPIC_READINGS,
        status: MQTT_TOPIC_STATUS,
        fieldPrefix: MQTT_TOPIC_FIELD_PREFIX,
      },
      stats: {
        published: mqttPublishCount,
        errors: mqttErrorCount,
      },
    }));
  } else if (url.pathname === '/api/edge-sessions') {
    res.end(JSON.stringify({
      gatewayUrl: IOT_GATEWAY_URL,
      credentials: EDGE_CREDENTIALS.map(c => ({
        fieldId: c.fieldId,
        deviceId: c.deviceId,
        gatewayUrl: c.gatewayUrl,
      })),
      sessions: Array.from(edgeSessions.values()).map(s => ({
        fieldId: s.fieldId,
        deviceId: s.deviceId,
        issuedAt: new Date(s.issuedAt).toISOString(),
        expiresAt: new Date(s.expiresAt).toISOString(),
        ttlSeconds: Math.max(0, Math.floor((s.expiresAt - Date.now()) / 1000)),
        tokenPreview: s.token.slice(0, 24) + '...',
      })),
    }));
  } else if (url.pathname === '/api/csv-info') {
    try {
      const stats = fs.existsSync(CSV_FILE) ? fs.statSync(CSV_FILE) : null;
      res.end(JSON.stringify({
        csvFile: CSV_FILE,
        exists: !!stats,
        sizeBytes: stats?.size ?? 0,
        sizeKB: stats ? Math.round(stats.size / 1024 * 10) / 10 : 0,
        lastModified: stats?.mtime?.toISOString() ?? null,
      }));
    } catch (e: any) {
      res.end(JSON.stringify({ error: e.message }));
    }
  } else if (url.pathname === '/api/mqtt-reconnect') {
    if (mqttClient) {
      try { mqttClient.end(true); } catch (e) {}
      mqttClient = null;
      mqttConnected = false;
    }
    setTimeout(() => connectMQTT(), 500);
    res.end(JSON.stringify({ success: true, message: 'Reconnecting to MQTT broker' }));
  } else if (url.pathname === '/api/readings') {
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '100'), 500);
    res.end(JSON.stringify(readings.slice(-limit)));
  } else if (url.pathname === '/api/summary') {
    const summary = fields.map(f => ({
      id: f.id,
      name: f.name,
      province: f.province,
      areaHa: f.areaHa,
      currentDAP: f.currentDAP,
      growthStage: getGrowthStage(f.currentDAP, f.totalDays),
      awdPhase: f.currentAWDPhase,
      waterLevelCm: Math.round(f.waterLevelCm * 10) / 10,
      awdCycles: f.totalAWDCycles,
      cumulativeCH4kg: Math.round(f.totalCH4kg * 1000) / 1000,
      cumulativeN2Okg: Math.round(f.totalN2Okg * 1000) / 1000,
      cumulativeCH4tCO2e: Math.round(f.totalCH4tCO2e * 10000) / 10000,
      cumulativeN2OtCO2e: Math.round(f.totalN2OtCO2e * 10000) / 10000,
      cumulativeNettCO2e: Math.round(f.totalNettCO2e * 10000) / 10000,
      baselineEmissiontCO2e: Math.round(f.baselineEmissiontCO2e * 10000) / 10000,
      emissionReductiontCO2e: Math.round(f.emissionReductiontCO2e * 10000) / 10000,
      estimatedYieldKg: Math.round(f.totalYieldKg),
      seasonComplete: f.seasonComplete,
    }));
    res.end(JSON.stringify({
      running: simRunning,
      tickCounter: simTickCounter,
      totalReadings: readings.length,
      fields: summary,
    }));
  } else {
    res.statusCode = 404;
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

httpServer.listen(PORT, async () => {
  console.log(`🌾 AWD Rice Simulator running on port ${PORT}`);
  console.log(`   Speed: ${SPEED_FACTOR}x (1 tick = ${SIM_HOURS_PER_TICK}hr simulated, every ${INTERVAL_MS / 1000}s real)`);
  console.log(`   Fields: ${fields.map(f => f.name).join(', ')}`);
  console.log(`   🔐 IoT Gateway: ${IOT_GATEWAY_URL} (edge auth via /api/edge/auth)`);
  console.log(`   📡 MQTT Broker: ${MQTT_BROKER_URL}`);
  console.log(`      Topics (prefix: awd/):`);
  console.log(`        - ${MQTT_TOPIC_READINGS}        (per-tick readings, qos=0)`);
  console.log(`        - ${MQTT_TOPIC_STATUS}           (status, retain=true)`);
  console.log(`        - ${MQTT_TOPIC_FIELD_PREFIX}/<fieldId>  (per-field readings)`);
  console.log(`   📄 CSV Log: ${CSV_FILE}`);
  // Initialize CSV file
  ensureCsvFile();
  // เริ่มการเชื่อมต่อ MQTT ไปยัง 35.213.186.240
  connectMQTT();
  // Authenticate all edge devices with IoT Gateway
  try {
    await authenticateAllEdges();
  } catch (e: any) {
    console.error(`[Auth] Startup auth error: ${e.message}`);
  }
});

// ตรวจสอบสถานะ MQTT ทุก 30 วินาที — log stats
setInterval(() => {
  if (mqttPublishCount > 0 || mqttErrorCount > 0) {
    console.log(`[MQTT] Stats: published=${mqttPublishCount}, errors=${mqttErrorCount}, connected=${mqttConnected}`);
  }
}, 30000);

// ปิดการเชื่อมต่อ MQTT เมื่อ process ปิด
process.on('SIGINT', () => {
  console.log('[AWD] Shutting down...');
  if (mqttClient) {
    try { mqttClient.end(true); } catch (e) {}
  }
  process.exit(0);
});
process.on('SIGTERM', () => {
  console.log('[AWD] Terminated');
  if (mqttClient) {
    try { mqttClient.end(true); } catch (e) {}
  }
  process.exit(0);
});
