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

const PORT = 3032;
const SPEED_FACTOR = 1800; // 1800x speed
const INTERVAL_MS = 2000; // 2 วินาทีจริง = 1 ชม.จำลอง
const SIM_HOURS_PER_TICK = 1;

// ─── MQTT External Broker ────────────────────────────────────────────
// ส่งค่าจำลอง AWD ไปยัง MQTT Broker สาธารณะ broker.hivemq.com:1883
// รองรับทั้ง TCP (1883) และ WebSocket (8000/8081) ผ่าน env variable
const MQTT_BROKER_URL = process.env.MQTT_BROKER_URL || 'mqtt://broker.hivemq.com:1883';
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
      boundary: [
        [14.985, 102.060], [14.985, 102.100],
        [14.960, 102.100], [14.960, 102.080],
        [14.955, 102.070], [14.960, 102.060],
      ],
      baseTempMin: 22,
      baseTempMax: 34,
      baseHumidity: 72,
      annualRainfallMm: 1100,
      floodTargetCm: 10,
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
      boundary: [
        [14.485, 100.105], [14.485, 100.140],
        [14.460, 100.140], [14.458, 100.120],
        [14.460, 100.105],
      ],
      baseTempMin: 24,
      baseTempMax: 35,
      baseHumidity: 78,
      annualRainfallMm: 1400,
      floodTargetCm: 12,
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
      boundary: [
        [15.255, 104.835], [15.255, 104.870],
        [15.230, 104.870], [15.228, 104.850],
        [15.230, 104.835],
      ],
      baseTempMin: 23,
      baseTempMax: 36,
      baseHumidity: 65,
      annualRainfallMm: 800,
      floodTargetCm: 8,
      dryThresholdCm: -18,
      floodDays: 5,
      dryDays: 6,
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

// ─── Growth Stage ────────────────────────────────────────────────────
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
  const stage = getGrowthStage(field.currentDAP, field.totalDays);
  // อัตราปล่อยพื้นฐานตามช่วงเจริญเติบโต (mg/m²/hr)
  // อ้างอิง: T-VER-P-AG-001 EF scaling by growth stage
  let baseFlux = 0;
  switch (stage) {
    case 'GERMINATION': baseFlux = 2; break;
    case 'TILLERING': baseFlux = 15; break;
    case 'STEM_ELONGATION': baseFlux = 25; break;
    case 'BOOTING': baseFlux = 30; break;
    case 'FLOWERING': baseFlux = 28; break;
    case 'GRAIN_FILLING': baseFlux = 18; break;
    case 'MATURITY': baseFlux = 8; break;
    case 'HARVESTED': baseFlux = 1; break;
  }

  // ปัจจัยระดับน้ำ
  let waterFactor = 1.0;
  switch (field.currentAWDPhase) {
    case 'FLOODED': waterFactor = 1.0; break;
    case 'DRAINING': waterFactor = 0.6; break;
    case 'DRY': waterFactor = 0.15; break; // ลดมากตอนแห้ง
    case 'REFLOODING': waterFactor = 0.7; break;
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
  const stage = getGrowthStage(field.currentDAP, field.totalDays);
  let baseFlux = 0;
  switch (stage) {
    case 'GERMINATION': baseFlux = 0.3; break;
    case 'TILLERING': baseFlux = 1.2; break;
    case 'STEM_ELONGATION': baseFlux = 1.5; break;
    case 'BOOTING': baseFlux = 1.8; break;
    case 'FLOWERING': baseFlux = 1.5; break;
    case 'GRAIN_FILLING': baseFlux = 1.0; break;
    case 'MATURITY': baseFlux = 0.5; break;
    case 'HARVESTED': baseFlux = 0.1; break;
  }

  // N2O spike ตอน drain และ reflood
  let phaseFactor = 1.0;
  switch (field.currentAWDPhase) {
    case 'FLOODED': phaseFactor = 0.5; break;
    case 'DRAINING': phaseFactor = 2.5; break;  // spike!
    case 'DRY': phaseFactor = 1.2; break;
    case 'REFLOODING': phaseFactor = 2.8; break; // spike!
  }

  // ดินทราย = N2O มากกว่า (leaching)
  const soilFactor = field.soilType.includes('Sandy') ? 1.4 :
                     field.soilType.includes('Clay') ? 0.8 : 1.0;

  return Math.max(0, baseFlux * phaseFactor * soilFactor);
}

// ─── Water Level Update ──────────────────────────────────────────────
function updateWaterLevel(field: AWDField, rainfall: number): void {
  const hour = field.currentHour;

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
  // น้ำออก: ระเหย + ซึม
  const outflowMm = hourETmm + percMmPerHr;

  // แปลง mm → cm
  const waterChangeCm = (inflowMm - outflowMm) / 10;

  // ชลประทาน: เติมน้ำตอน FLOODED/REFLOODING
  let irrigationCm = 0;
  if (field.waterSource.includes('ชลประทาน') &&
      (field.currentAWDPhase === 'FLOODED' || field.currentAWDPhase === 'REFLOODING') &&
      hour === 7) { // เติมน้ำตอนเช้า
    irrigationCm = 0.5; // cm/hr เมื่อเปิดประตูน้ำ
  }
  // สูบน้ำสำรอง (สุพรรณ)
  if (field.waterSource.includes('สำรอง') &&
      field.currentAWDPhase === 'FLOODED' && field.waterLevelCm < 3 &&
      hour === 8) {
    irrigationCm = 0.3;
  }

  field.waterLevelCm += waterChangeCm + irrigationCm;

  // AWD Phase transitions
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
  const stage = getGrowthStage(field.currentDAP, field.totalDays);
  let baseFlux = 50; // mg/m²/hr พื้นฐาน
  switch (stage) {
    case 'TILLERING': baseFlux = 120; break;
    case 'STEM_ELONGATION': baseFlux = 150; break;
    case 'BOOTING': baseFlux = 160; break;
    case 'FLOWERING': baseFlux = 140; break;
    case 'GRAIN_FILLING': baseFlux = 110; break;
    default: baseFlux = 60;
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
    const growthStage = getGrowthStage(field.currentDAP, field.totalDays);
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

  // Store readings
  readings.push(...newReadings);
  if (readings.length > 600) readings = readings.slice(-600);

  // Emit via Socket.IO (local dashboard)
  io.emit('awd:reading', newReadings);
  io.emit('awd:status', getStatus());

  // Publish via MQTT to external broker (broker.hivemq.com)
  for (const reading of newReadings) {
    publishReadingToMQTT(reading);
  }
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
      boundary: f.boundary,
      currentDAP: f.currentDAP,
      currentHour: f.currentHour,
      waterLevelCm: Math.round(f.waterLevelCm * 10) / 10,
      currentAWDPhase: f.currentAWDPhase,
      awdCycles: f.totalAWDCycles,
      growthStage: getGrowthStage(f.currentDAP, f.totalDays),
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

httpServer.listen(PORT, () => {
  console.log(`🌾 AWD Rice Simulator running on port ${PORT}`);
  console.log(`   Speed: ${SPEED_FACTOR}x (1 tick = ${SIM_HOURS_PER_TICK}hr simulated, every ${INTERVAL_MS / 1000}s real)`);
  console.log(`   Fields: ${fields.map(f => f.name).join(', ')}`);
  console.log(`   📡 MQTT Broker: ${MQTT_BROKER_URL}`);
  console.log(`      Topics:`);
  console.log(`        - ${MQTT_TOPIC_READINGS}        (per-tick readings, qos=0)`);
  console.log(`        - ${MQTT_TOPIC_STATUS}           (status, retain=true)`);
  console.log(`        - ${MQTT_TOPIC_FIELD_PREFIX}/<fieldId>  (per-field readings)`);
  // เริ่มการเชื่อมต่อ MQTT ไปยัง 35.213.186.240
  connectMQTT();
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
