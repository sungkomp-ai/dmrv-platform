/**
 * GET /api/iot/sample
 * ──────────────────────────────────────────────
 * ดึงตัวอย่างข้อมูลสำหรับทดสอบระบบ IoT Ingestion
 * รวมทั้ง Realtime, Batch, และ Edge Node Configuration
 */
import { NextResponse } from 'next/server';

const IOT_PORT = 3035;

export async function GET() {
  try {
    const res = await fetch(`http://localhost:${IOT_PORT}/api/sample-data`);
    if (!res.ok) {
      // Return inline sample data if gateway is not available
      return NextResponse.json(getInlineSampleData());
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(getInlineSampleData());
  }
}

function getInlineSampleData() {
  return {
    sampleRealtime: {
      description: 'ตัวอย่างข้อมูล Realtime — ส่งผ่าน WebSocket หรือ HTTP POST',
      websocket_event: 'iot:ingest:realtime',
      http_endpoint: 'POST /api/iot/ingest',
      curl_example: `curl -X POST http://localhost:3000/api/iot/ingest \\
  -H "Content-Type: application/json" \\
  -d '{
    "edgeNodeId": "EDGE-BKK-001",
    "sensorId": "CH4-BKK-001",
    "sensorType": "ch4",
    "value": 1250.45,
    "unit": "ppm",
    "timestamp": "${new Date().toISOString()}"
  }'`,
      payload: {
        edgeNodeId: 'EDGE-BKK-001',
        sensorId: 'CH4-BKK-001',
        sensorType: 'ch4',
        value: 1250.45,
        unit: 'ppm',
        timestamp: new Date().toISOString(),
      },
    },
    sampleBatch: {
      description: 'ตัวอย่างข้อมูล Batch — ส่งข้อมูลหลายรายการพร้อมกัน',
      http_endpoint: 'POST /api/iot/batch',
      curl_example: `curl -X POST http://localhost:3000/api/iot/batch \\
  -H "Content-Type: application/json" \\
  -d '{
    "edgeNodeId": "EDGE-CNX-001",
    "fileName": "sensor_data_2025_01_15.csv",
    "fileType": "CSV",
    "records": [...]
  }'`,
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
    },
    sampleCertification: {
      description: 'ตัวอย่างการรับรองข้อมูล Batch',
      http_endpoint: 'POST /api/iot/certify',
      payload: {
        batchJobId: 'BATCH-xxx',
        readings: [],
      },
      certification_rules: [
        { id: 'RANGE_CHECK', description: 'ตรวจสอบค่าอยู่ในช่วงที่กำหนด (min-max)' },
        { id: 'TIMESTAMP_ORDER', description: 'ตรวจสอบลำดับเวลาถูกต้อง' },
        { id: 'INTEGRITY_HASH', description: 'ตรวจสอบ SHA-256 integrity hash' },
        { id: 'EDGE_SIGNATURE', description: 'ตรวจสอบลายเซ็นดิจิทัลจาก Edge Node' },
        { id: 'ANOMALY_RATIO', description: 'ตรวจสอบสัดส่วน anomaly ต้อง < 10%' },
      ],
    },
    sampleEdgeConfig: {
      description: 'ตัวอย่างการตั้งค่า Edge Node ใหม่',
      payload: {
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
    },
  };
}
