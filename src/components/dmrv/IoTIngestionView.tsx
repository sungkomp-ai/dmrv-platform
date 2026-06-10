'use client';

import React, { useState, useEffect, useCallback, useMemo, useSyncExternalStore } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  Play, Square, RotateCcw, Send, Activity, BarChart3,
  TrendingUp, MapPin, Zap, Clock, RefreshCw,
  CheckCircle2, Shield, FileCheck, Eye, Radio,
  Database, Server, Upload, Download, AlertTriangle,
  Wifi, WifiOff, Cpu, HardDrive, Thermometer,
  Beaker, Copy, ChevronDown, ChevronRight, Info,
  FileText, Hash, Lock, Unlock,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ComposedChart, ReferenceLine,
} from 'recharts';

// ─── Types ──────────────────────────────────────────────────────────
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
  samplingRate: number;
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
  status: string;
  certificationStatus: string;
  merkleRoot: string;
  createdAt: string;
  completedAt?: string;
}

interface IoTSimStatus {
  running: boolean;
  tick: number;
  edgeNodes: EdgeNodeState[];
  totalReadings: number;
  batchJobs: number;
  connectedClients: number;
}

// ─── Config ─────────────────────────────────────────────────────────
const IOT_PORT = 3035;

const SENSOR_COLORS: Record<string, string> = {
  ch4: '#f97316',
  co2: '#ef4444',
  temperature: '#3b82f6',
  humidity: '#06b6d4',
  soil_moisture: '#22c55e',
  water_level: '#6366f1',
  ph: '#8b5cf6',
  dissolved_oxygen: '#14b8a6',
  cod: '#eab308',
  bod: '#a855f7',
  nitrogen: '#0ea5e9',
  phosphorus: '#ec4899',
  wind_speed: '#64748b',
  solar_irradiance: '#f59e0b',
};

const SENSOR_LABELS: Record<string, { en: string; th: string }> = {
  ch4: { en: 'CH₄ (Methane)', th: 'มีเทน' },
  co2: { en: 'CO₂', th: 'คาร์บอนไดออกไซด์' },
  temperature: { en: 'Temperature', th: 'อุณหภูมิ' },
  humidity: { en: 'Humidity', th: 'ความชื้น' },
  soil_moisture: { en: 'Soil Moisture', th: 'ความชื้นดิน' },
  water_level: { en: 'Water Level', th: 'ระดับน้ำ' },
  ph: { en: 'pH', th: 'ค่า pH' },
  dissolved_oxygen: { en: 'Dissolved O₂', th: 'ออกซิเจนละลาย' },
  cod: { en: 'COD', th: 'COD' },
  bod: { en: 'BOD', th: 'BOD' },
  nitrogen: { en: 'Nitrogen', th: 'ไนโตรเจน' },
  phosphorus: { en: 'Phosphorus', th: 'ฟอสฟอรัส' },
  wind_speed: { en: 'Wind Speed', th: 'ความเร็วลม' },
  solar_irradiance: { en: 'Solar Irradiance', th: 'รังสีดวงอาทิตย์' },
};

const PROTOCOL_ICONS: Record<string, string> = {
  MQTT: '📡',
  HTTP: '🌐',
  WebSocket: '🔌',
  LoRaWAN: '📻',
};

const mountedEmptySub = () => () => {};
function useMounted() {
  return useSyncExternalStore(mountedEmptySub, () => true, () => false);
}

// ─── Component ──────────────────────────────────────────────────────
export default function IoTIngestionView() {
  const mounted = useMounted();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [status, setStatus] = useState<IoTSimStatus | null>(null);
  const [readings, setReadings] = useState<SensorReading[]>([]);
  const [batchJobs, setBatchJobs] = useState<BatchJobState[]>([]);
  const [selectedEdgeNode, setSelectedEdgeNode] = useState<string | null>(null);
  const [selectedSensorType, setSelectedSensorType] = useState<string | null>(null);
  const [certificationResult, setCertificationResult] = useState<any>(null);
  const [sampleData, setSampleData] = useState<any>(null);
  const [sendingBatch, setSendingBatch] = useState(false);
  const [sendingRealtime, setSendingRealtime] = useState(false);
  const [certifying, setCertifying] = useState(false);
  const [expandedSample, setExpandedSample] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Connect to IoT Gateway
  useEffect(() => {
    if (!mounted) return;
    let s: Socket | null = null;
    try {
      s = io(`/?XTransformPort=${IOT_PORT}`, {
        transports: ['polling', 'websocket'],
        reconnectionAttempts: 5,
        reconnectionDelay: 3000,
        timeout: 8000,
      });
      s.on('connect', () => setConnected(true));
      s.on('disconnect', () => setConnected(false));
      s.on('iot:status', (data: IoTSimStatus) => setStatus(data));
      s.on('iot:reading', (data: SensorReading) => {
        setReadings(prev => [...prev, data].slice(-500));
      });
      s.on('iot:readings', (data: SensorReading[]) => {
        setReadings(prev => [...prev, ...data].slice(-500));
      });
      s.on('iot:batch:started', (data: BatchJobState) => {
        setBatchJobs(prev => [data, ...prev]);
      });
      s.on('iot:batch:completed', (data: BatchJobState) => {
        setBatchJobs(prev => prev.map(j => j.id === data.id ? data : j));
      });
      s.on('iot:sim:started', () => {});
      s.on('iot:sim:stopped', () => {});
      s.on('iot:sim:reset', () => { setReadings([]); setBatchJobs([]); });
      setSocket(s);
    } catch { /* fallback */ }

    // HTTP polling via Next.js API routes (proxies to IoT Gateway)
    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch('/api/iot/edge-nodes');
        if (res.ok) {
          const data = await res.json();
          const edgeNodes = data.edgeNodes || [];
          setStatus(prev => ({
            running: prev?.running || false,
            tick: prev?.tick || 0,
            edgeNodes,
            totalReadings: edgeNodes.reduce((s: number, n: EdgeNodeState) => s + n.totalReadings, 0),
            batchJobs: prev?.batchJobs || 0,
            connectedClients: prev?.connectedClients || 0,
          }));
          setConnected(true);
        }
      } catch { /* ignore */ }
    }, 5000);

    // Initial fetch — with fallback to hardcoded data
    (async () => {
      let edgeNodes: EdgeNodeState[] = [];
      try {
        const res = await fetch('/api/iot/edge-nodes');
        if (res.ok) {
          const data = await res.json();
          edgeNodes = data.edgeNodes || [];
          setConnected(true);
        }
      } catch { /* gateway not available */ }

      // Fallback: use embedded edge node config when gateway is unavailable
      if (edgeNodes.length === 0) {
        edgeNodes = [
          { nodeId: 'EDGE-BKK-001', name: 'Bangkok Landfill Monitor', nameTh: 'สถานีติดตามขยะกรุงเทพ', province: 'กรุงเทพมหานคร', lat: 13.7563, lng: 100.5018, status: 'online', protocol: 'MQTT', batteryLevel: 92, signalStrength: -45, totalReadings: 0, lastHeartbeat: new Date().toISOString(), sensors: [
            { sensorId: 'CH4-BKK-001', sensorType: 'ch4', unit: 'ppm', minRange: 0, maxRange: 5000, samplingRate: 60, status: 'active' },
            { sensorId: 'CO2-BKK-001', sensorType: 'co2', unit: 'ppm', minRange: 0, maxRange: 5000, samplingRate: 60, status: 'active' },
            { sensorId: 'TEMP-BKK-001', sensorType: 'temperature', unit: '°C', minRange: -10, maxRange: 60, samplingRate: 300, status: 'active' },
            { sensorId: 'HUM-BKK-001', sensorType: 'humidity', unit: '%', minRange: 0, maxRange: 100, samplingRate: 300, status: 'active' },
            { sensorId: 'DO-BKK-001', sensorType: 'dissolved_oxygen', unit: 'mg/L', minRange: 0, maxRange: 20, samplingRate: 600, status: 'active' },
          ]},
          { nodeId: 'EDGE-CNX-001', name: 'Chiang Mai Rice Paddy', nameTh: 'สถานีนาข้าวเชียงใหม่', province: 'เชียงใหม่', lat: 18.7883, lng: 98.9853, status: 'online', protocol: 'LoRaWAN', batteryLevel: 78, signalStrength: -62, totalReadings: 0, lastHeartbeat: new Date().toISOString(), sensors: [
            { sensorId: 'CH4-CNX-001', sensorType: 'ch4', unit: 'ppm', minRange: 0, maxRange: 2000, samplingRate: 30, status: 'active' },
            { sensorId: 'TEMP-CNX-001', sensorType: 'temperature', unit: '°C', minRange: -10, maxRange: 50, samplingRate: 300, status: 'active' },
            { sensorId: 'SM-CNX-001', sensorType: 'soil_moisture', unit: '%', minRange: 0, maxRange: 100, samplingRate: 600, status: 'active' },
            { sensorId: 'WL-CNX-001', sensorType: 'water_level', unit: 'cm', minRange: 0, maxRange: 50, samplingRate: 300, status: 'active' },
            { sensorId: 'PH-CNX-001', sensorType: 'ph', unit: 'pH', minRange: 0, maxRange: 14, samplingRate: 900, status: 'active' },
          ]},
          { nodeId: 'EDGE-KKN-001', name: 'Khon Kaen Biogas Plant', nameTh: 'สถานีติดตามโรงไบโอก๊าซขอนแก่น', province: 'ขอนแก่น', lat: 16.4322, lng: 102.8236, status: 'online', protocol: 'MQTT', batteryLevel: 85, signalStrength: -55, totalReadings: 0, lastHeartbeat: new Date().toISOString(), sensors: [
            { sensorId: 'CH4-KKN-001', sensorType: 'ch4', unit: 'ppm', minRange: 0, maxRange: 10000, samplingRate: 30, status: 'active' },
            { sensorId: 'CO2-KKN-001', sensorType: 'co2', unit: 'ppm', minRange: 0, maxRange: 5000, samplingRate: 30, status: 'active' },
            { sensorId: 'TEMP-KKN-001', sensorType: 'temperature', unit: '°C', minRange: 0, maxRange: 80, samplingRate: 300, status: 'active' },
            { sensorId: 'PH-KKN-001', sensorType: 'ph', unit: 'pH', minRange: 0, maxRange: 14, samplingRate: 600, status: 'active' },
            { sensorId: 'COD-KKN-001', sensorType: 'cod', unit: 'mg/L', minRange: 0, maxRange: 1000, samplingRate: 1800, status: 'active' },
            { sensorId: 'BOD-KKN-001', sensorType: 'bod', unit: 'mg/L', minRange: 0, maxRange: 500, samplingRate: 1800, status: 'active' },
          ]},
          { nodeId: 'EDGE-PKT-001', name: 'Phuket Solar & Coastal', nameTh: 'สถานีติดตามโซลาร์และชายฝั่งภูเก็ต', province: 'ภูเก็ต', lat: 7.8804, lng: 98.3923, status: 'offline', protocol: 'HTTP', batteryLevel: 45, signalStrength: -78, totalReadings: 0, lastHeartbeat: new Date(Date.now() - 3600000).toISOString(), sensors: [
            { sensorId: 'SOLAR-PKT-001', sensorType: 'solar_irradiance', unit: 'W/m²', minRange: 0, maxRange: 1200, samplingRate: 300, status: 'active' },
            { sensorId: 'WS-PKT-001', sensorType: 'wind_speed', unit: 'm/s', minRange: 0, maxRange: 50, samplingRate: 300, status: 'active' },
            { sensorId: 'TEMP-PKT-001', sensorType: 'temperature', unit: '°C', minRange: 10, maxRange: 50, samplingRate: 600, status: 'active' },
            { sensorId: 'HUM-PKT-001', sensorType: 'humidity', unit: '%', minRange: 0, maxRange: 100, samplingRate: 600, status: 'inactive' },
          ]},
          { nodeId: 'EDGE-SKT-001', name: 'Surat Thani Mangrove', nameTh: 'สถานีป่าชายเลมสุราษฎร์ธานี', province: 'สุราษฎร์ธานี', lat: 9.1382, lng: 99.3217, status: 'online', protocol: 'WebSocket', batteryLevel: 67, signalStrength: -58, totalReadings: 0, lastHeartbeat: new Date().toISOString(), sensors: [
            { sensorId: 'CH4-SKT-001', sensorType: 'ch4', unit: 'ppm', minRange: 0, maxRange: 3000, samplingRate: 60, status: 'active' },
            { sensorId: 'CO2-SKT-001', sensorType: 'co2', unit: 'ppm', minRange: 0, maxRange: 5000, samplingRate: 60, status: 'active' },
            { sensorId: 'DO-SKT-001', sensorType: 'dissolved_oxygen', unit: 'mg/L', minRange: 0, maxRange: 20, samplingRate: 600, status: 'active' },
            { sensorId: 'N-SKT-001', sensorType: 'nitrogen', unit: 'mg/L', minRange: 0, maxRange: 50, samplingRate: 1800, status: 'active' },
            { sensorId: 'P-SKT-001', sensorType: 'phosphorus', unit: 'mg/L', minRange: 0, maxRange: 20, samplingRate: 1800, status: 'active' },
          ]},
        ];
        setConnected(false); // Gateway not available
      }

      setStatus({
        running: false,
        tick: 0,
        edgeNodes,
        totalReadings: 0,
        batchJobs: 0,
        connectedClients: 0,
      });

      try {
        const sampleRes = await fetch('/api/iot/sample');
        if (sampleRes.ok) { const data = await sampleRes.json(); setSampleData(data); }
      } catch { /* ignore */ }
    })();

    return () => {
      if (s) s.disconnect();
      clearInterval(pollInterval);
    };
  }, [mounted]);

  // Controls
  const startSim = useCallback(async () => {
    if (socket?.connected) { socket.emit('iot:sim:start'); return; }
    // For demo: mark as running and start local data generation
    setStatus(prev => prev ? { ...prev, running: true } : prev);
  }, [socket]);

  const stopSim = useCallback(async () => {
    if (socket?.connected) { socket.emit('iot:sim:stop'); return; }
    setStatus(prev => prev ? { ...prev, running: false } : prev);
  }, [socket]);

  const resetSim = useCallback(async () => {
    if (socket?.connected) { socket.emit('iot:sim:reset'); setReadings([]); setBatchJobs([]); return; }
    setReadings([]);
    setBatchJobs([]);
    setStatus(prev => prev ? { ...prev, running: false } : prev);
  }, [socket]);

  // ─── Local simulation when no WebSocket ──────────────────────────
  useEffect(() => {
    if (!mounted || !status?.running || socket?.connected) return;
    const interval = setInterval(() => {
      const edgeNodes = status.edgeNodes.filter(n => n.status === 'online');
      if (edgeNodes.length === 0) return;
      const newReadings: SensorReading[] = [];
      for (const node of edgeNodes) {
        const activeSensors = node.sensors.filter(s => s.status === 'active');
        for (const sensor of activeSensors) {
          // Only generate for some sensors each tick
          if (Math.random() > 0.3) continue;
          const range = sensor.maxRange - sensor.minRange;
          const baseValues: Record<string, number> = {
            ch4: 850, co2: 420, temperature: 30, humidity: 75,
            soil_moisture: 45, water_level: 15, ph: 7.2,
            dissolved_oxygen: 6.5, cod: 120, bod: 45,
            nitrogen: 8, phosphorus: 3, wind_speed: 3.5, solar_irradiance: 600,
          };
          const base = baseValues[sensor.sensorType] || 50;
          const variance = range * 0.15;
          const value = Math.round((base + (Math.random() - 0.5) * variance) * 100) / 100;
          const clampedValue = Math.max(sensor.minRange, Math.min(sensor.maxRange, value));
          const timestamp = new Date().toISOString();
          const hashInput = `${sensor.sensorId}:${clampedValue}:${timestamp}`;
          let hash = 0;
          for (let i = 0; i < hashInput.length; i++) { hash = ((hash << 5) - hash) + hashInput.charCodeAt(i); hash = hash & hash; }
          const integrityHash = `sha256-${Math.abs(hash).toString(16).padStart(16, '0')}`;
          let sig = 0;
          const sigInput = `${node.nodeId}:${integrityHash}`;
          for (let i = 0; i < sigInput.length; i++) { sig = ((sig << 5) - sig) + sigInput.charCodeAt(i); sig = sig & sig; }
          const signature = `sig-${Math.abs(sig).toString(16).padStart(16, '0')}`;

          let qualityFlag: 'VALIDATED' | 'ANOMALY' | 'REJECTED' = 'VALIDATED';
          if (clampedValue < sensor.minRange || clampedValue > sensor.maxRange) qualityFlag = 'REJECTED';
          else if (clampedValue < sensor.minRange + range * 0.02 || clampedValue > sensor.maxRange - range * 0.02) qualityFlag = 'ANOMALY';

          newReadings.push({
            id: `RD-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            edgeNodeId: node.nodeId,
            sensorId: sensor.sensorId,
            sensorType: sensor.sensorType,
            value: clampedValue,
            unit: sensor.unit,
            timestamp,
            receivedAt: new Date().toISOString(),
            ingestionMode: 'realtime',
            qualityFlag,
            integrityHash,
            signature,
          });
        }
      }
      if (newReadings.length > 0) {
        setReadings(prev => [...prev, ...newReadings].slice(-500));
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [mounted, status?.running, status?.edgeNodes, socket?.connected]);

  // Send realtime test data
  const sendRealtimeTest = useCallback(async () => {
    setSendingRealtime(true);
    try {
      const edgeNodes = status?.edgeNodes || [];
      const onlineNodes = edgeNodes.filter(n => n.status === 'online');
      if (onlineNodes.length === 0) return;
      const node = onlineNodes[Math.floor(Math.random() * onlineNodes.length)];
      const activeSensors = node.sensors.filter(s => s.status === 'active');
      if (activeSensors.length === 0) return;
      const sensor = activeSensors[Math.floor(Math.random() * activeSensors.length)];
      const value = Math.round((sensor.minRange + Math.random() * (sensor.maxRange - sensor.minRange)) * 100) / 100;

      if (socket?.connected) {
        socket.emit('iot:ingest:realtime', {
          edgeNodeId: node.nodeId,
          sensorId: sensor.sensorId,
          sensorType: sensor.sensorType,
          value,
          unit: sensor.unit,
          timestamp: new Date().toISOString(),
        });
      } else {
        await fetch('/api/iot/ingest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            edgeNodeId: node.nodeId,
            sensorId: sensor.sensorId,
            sensorType: sensor.sensorType,
            value,
            unit: sensor.unit,
            timestamp: new Date().toISOString(),
          }),
        });
      }
    } finally { setSendingRealtime(false); }
  }, [status, socket]);

  // Send batch test data
  const sendBatchTest = useCallback(async () => {
    setSendingBatch(true);
    try {
      const edgeNodes = status?.edgeNodes || [];
      const onlineNodes = edgeNodes.filter(n => n.status === 'online');
      if (onlineNodes.length === 0) return;
      const node = onlineNodes[Math.floor(Math.random() * onlineNodes.length)];
      const records = [];
      const now = new Date();
      for (let i = 0; i < 20; i++) {
        const sensor = node.sensors[Math.floor(Math.random() * node.sensors.length)];
        const ts = new Date(now.getTime() - (20 - i) * 60000);
        const value = Math.round((sensor.minRange + Math.random() * (sensor.maxRange - sensor.minRange)) * 100) / 100;
        records.push({
          sensorId: sensor.sensorId,
          sensorType: sensor.sensorType,
          value,
          unit: sensor.unit,
          timestamp: ts.toISOString(),
        });
      }

      if (socket?.connected) {
        socket.emit('iot:ingest:batch', {
          edgeNodeId: node.nodeId,
          fileName: `test_batch_${Date.now()}.csv`,
          fileType: 'CSV',
          records,
        });
      } else {
        await fetch('/api/iot/batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            edgeNodeId: node.nodeId,
            fileName: `test_batch_${Date.now()}.csv`,
            fileType: 'CSV',
            records,
          }),
        });
      }
    } finally { setSendingBatch(false); }
  }, [status, socket]);

  // Certify batch
  const certifyBatch = useCallback(async (batchJob: BatchJobState) => {
    setCertifying(true);
    try {
      const batchReadings = readings.filter(r => r.ingestionMode === 'batch');
      const res = await fetch('/api/iot/certify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchJobId: batchJob.id, readings: batchReadings }),
      });
      if (res.ok) {
        const data = await res.json();
        setCertificationResult(data);
      }
    } finally { setCertifying(false); }
  }, [readings]);

  // Copy to clipboard
  const copyToClipboard = useCallback((text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  }, []);

  // ─── Computed ────────────────────────────────────────────────────
  const filteredReadings = useMemo(() => {
    let r = readings;
    if (selectedEdgeNode) r = r.filter(x => x.edgeNodeId === selectedEdgeNode);
    if (selectedSensorType) r = r.filter(x => x.sensorType === selectedSensorType);
    return r;
  }, [readings, selectedEdgeNode, selectedSensorType]);

  const onlineNodes = useMemo(() => (status?.edgeNodes || []).filter(n => n.status === 'online'), [status?.edgeNodes]);
  const offlineNodes = useMemo(() => (status?.edgeNodes || []).filter(n => n.status !== 'online'), [status?.edgeNodes]);

  const qualityStats = useMemo(() => {
    const total = readings.length;
    const validated = readings.filter(r => r.qualityFlag === 'VALIDATED').length;
    const anomaly = readings.filter(r => r.qualityFlag === 'ANOMALY').length;
    const rejected = readings.filter(r => r.qualityFlag === 'REJECTED').length;
    const raw = readings.filter(r => r.qualityFlag === 'RAW').length;
    return { total, validated, anomaly, rejected, raw };
  }, [readings]);

  const modeStats = useMemo(() => {
    const realtime = readings.filter(r => r.ingestionMode === 'realtime').length;
    const batch = readings.filter(r => r.ingestionMode === 'batch').length;
    return { realtime, batch };
  }, [readings]);

  // Chart data
  const chartData = useMemo(() => {
    const byTimestamp: Record<string, Record<string, number>> = {};
    for (const r of filteredReadings.slice(-200)) {
      const key = new Date(r.timestamp).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      if (!byTimestamp[key]) byTimestamp[key] = {};
      const sKey = `${r.edgeNodeId.split('-')[1]}-${r.sensorType}`;
      byTimestamp[key][sKey] = r.value;
      byTimestamp[key]['time'] = key as any;
    }
    return Object.values(byTimestamp);
  }, [filteredReadings]);

  // Edge node chart data
  const edgeNodeChartData = useMemo(() => {
    if (!selectedEdgeNode) return [];
    const nodeReadings = readings.filter(r => r.edgeNodeId === selectedEdgeNode).slice(-100);
    const byTime: Record<string, any> = {};
    for (const r of nodeReadings) {
      const key = new Date(r.timestamp).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      if (!byTime[key]) byTime[key] = { time: key };
      byTime[key][r.sensorType] = r.value;
    }
    return Object.values(byTime);
  }, [readings, selectedEdgeNode]);

  const latestReadingBySensor = useMemo(() => {
    const map: Record<string, SensorReading> = {};
    for (const r of readings) {
      map[r.sensorId] = r;
    }
    return map;
  }, [readings]);

  if (!mounted) {
    return <div className="flex items-center justify-center h-64"><RefreshCw className="h-8 w-8 animate-spin text-emerald-600" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* ─── Hero Header ─────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-slate-800 via-slate-700 to-slate-900 p-6 text-white">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-4 right-10 text-8xl">📡</div>
          <div className="absolute bottom-2 left-20 text-6xl">🔌</div>
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <Radio className="h-7 w-7" />
            <h2 className="text-2xl font-bold">IoT Ingestion Gateway</h2>
            <Badge className="bg-white/20 text-white hover:bg-white/30 text-xs">นำเข้าข้อมูลเซ็นเซอร์</Badge>
            <Badge className="bg-amber-500/80 text-white text-[9px]">T-VER-P-TOOL-001</Badge>
          </div>
          <p className="text-sm text-white/80 mb-1">
            ระบบนำเข้าข้อมูล IoT ทั้งแบบ Realtime (WebSocket/MQTT) และ Batch (CSV/JSON) พร้อมการรับรองข้อมูลตามมาตรฐาน
          </p>
          <p className="text-[10px] text-white/60 mb-4">
            อ้างอิง: TGO T-VER-P-TOOL-001 | ISO 14064-3 | ISO 14065 | Edge Node Signing | Merkle Tree Certification | CH₄ GWP = 25
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Button size="sm" onClick={startSim} disabled={status?.running} className="bg-white/20 hover:bg-white/30 text-white border-white/30">
              <Play className="h-3.5 w-3.5 mr-1" /> เริ่มจำลอง
            </Button>
            <Button size="sm" variant="outline" onClick={stopSim} disabled={!status?.running} className="border-white/30 text-white hover:bg-white/20">
              <Square className="h-3.5 w-3.5 mr-1" /> หยุด
            </Button>
            <Button size="sm" variant="outline" onClick={resetSim} className="border-white/30 text-white hover:bg-white/20">
              <RotateCcw className="h-3.5 w-3.5 mr-1" /> รีเซ็ต
            </Button>
            <div className="w-px h-6 bg-white/30" />
            <Button size="sm" onClick={sendRealtimeTest} disabled={sendingRealtime} className="bg-emerald-500 hover:bg-emerald-400 text-white">
              <Zap className="h-3.5 w-3.5 mr-1" /> ส่ง Realtime
            </Button>
            <Button size="sm" onClick={sendBatchTest} disabled={sendingBatch} className="bg-amber-500 hover:bg-amber-400 text-white">
              <Upload className="h-3.5 w-3.5 mr-1" /> ส่ง Batch
            </Button>
            <div className="flex items-center gap-2 ml-auto text-xs text-white/70">
              <div className={`h-2 w-2 rounded-full ${connected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
              {connected ? 'เชื่อมต่อแล้ว' : 'ตัดการเชื่อมต่อ'}
              {status?.running && <Badge className="bg-green-500/50 text-white text-[9px] animate-pulse">LIVE</Badge>}
            </div>
          </div>
        </div>
      </div>

      {/* ─── KPI Cards ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { icon: Database, label: 'ข้อมูลทั้งหมด', value: qualityStats.total.toLocaleString(), color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { icon: Wifi, label: 'Edge Node ออนไลน์', value: `${onlineNodes.length}/${(status?.edgeNodes?.length || 0)}`, color: 'text-blue-600', bg: 'bg-blue-50' },
          { icon: Zap, label: 'Realtime', value: modeStats.realtime.toLocaleString(), color: 'text-amber-600', bg: 'bg-amber-50' },
          { icon: Upload, label: 'Batch', value: modeStats.batch.toLocaleString(), color: 'text-purple-600', bg: 'bg-purple-50' },
          { icon: CheckCircle2, label: 'ผ่านการตรวจ', value: qualityStats.validated.toLocaleString(), color: 'text-green-600', bg: 'bg-green-50' },
          { icon: AlertTriangle, label: 'Anomaly', value: qualityStats.anomaly.toLocaleString(), color: 'text-orange-600', bg: 'bg-orange-50' },
        ].map(s => (
          <Card key={s.label} className="shadow-none">
            <CardContent className="p-3 flex items-center gap-3">
              <div className={`h-9 w-9 rounded-xl ${s.bg} flex items-center justify-center shrink-0`}>
                <s.icon className={`h-4 w-4 ${s.color}`} />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground font-medium">{s.label}</p>
                <p className="text-lg font-bold leading-none">{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ─── Main Tabs ───────────────────────────────────────────── */}
      <Tabs defaultValue="realtime" className="space-y-4">
        <TabsList className="h-9 flex-wrap">
          <TabsTrigger value="realtime" className="text-xs h-7 gap-1"><Zap className="h-3 w-3" /> Realtime</TabsTrigger>
          <TabsTrigger value="batch" className="text-xs h-7 gap-1"><Upload className="h-3 w-3" /> Batch</TabsTrigger>
          <TabsTrigger value="edge" className="text-xs h-7 gap-1"><Server className="h-3 w-3" /> Edge Nodes</TabsTrigger>
          <TabsTrigger value="certify" className="text-xs h-7 gap-1"><Shield className="h-3 w-3" /> การรับรอง</TabsTrigger>
          <TabsTrigger value="chart" className="text-xs h-7 gap-1"><BarChart3 className="h-3 w-3" /> กราฟ</TabsTrigger>
          <TabsTrigger value="sample" className="text-xs h-7 gap-1"><FileText className="h-3 w-3" /> ตัวอย่าง/API</TabsTrigger>
        </TabsList>

        {/* ─── TAB: Realtime ──────────────────────────────────────── */}
        <TabsContent value="realtime" className="space-y-4">
          <Card className="border-l-4 border-l-emerald-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="h-4 w-4 text-emerald-600" />
                ข้อมูล Realtime (เรียลไทม์)
                <Badge variant="secondary" className="text-[9px] h-4">WebSocket / MQTT</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-emerald-50 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                    <Info className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div className="space-y-2 text-xs text-emerald-800">
                    <p className="font-semibold">กระบวนการนำเข้าข้อมูล Realtime</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <p className="font-medium">1️⃣ Edge Node อ่านค่าจาก Sensor</p>
                        <p className="text-emerald-700">เซ็นเซอร์วัดค่า (CH₄, CO₂, อุณหภูมิ ฯลฯ) ตาม sampling rate</p>
                      </div>
                      <div>
                        <p className="font-medium">2️⃣ Edge Node ลงลายเซ็นดิจิทัล</p>
                        <p className="text-emerald-700">สร้าง integrity hash (SHA-256) และลงลายเซ็นด้วย private key ของ Edge Node</p>
                      </div>
                      <div>
                        <p className="font-medium">3️⃣ ส่งผ่าน WebSocket/MQTT</p>
                        <p className="text-emerald-700">ข้อมูลถูกส่งทันทีไปยัง dMRV Platform ผ่าน protocol ที่กำหนด</p>
                      </div>
                      <div>
                        <p className="font-medium">4️⃣ Platform ตรวจสอบและจัดเก็บ</p>
                        <p className="text-emerald-700">ตรวจสอบ range, hash, signature → กำกับ quality flag (VALIDATED/ANOMALY/REJECTED)</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Live Readings Table */}
              <div className="max-h-96 overflow-y-auto rounded-lg border">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr>
                      <th className="p-2 text-left font-medium">เวลา</th>
                      <th className="p-2 text-left font-medium">Edge Node</th>
                      <th className="p-2 text-left font-medium">Sensor</th>
                      <th className="p-2 text-right font-medium">ค่า</th>
                      <th className="p-2 text-center font-medium">Quality</th>
                      <th className="p-2 text-left font-medium">Hash</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredReadings.filter(r => r.ingestionMode === 'realtime').slice(-50).reverse().map(r => (
                      <tr key={r.id} className="border-b border-muted/30 hover:bg-muted/20">
                        <td className="p-2 font-mono text-[10px]">{new Date(r.timestamp).toLocaleTimeString('th-TH')}</td>
                        <td className="p-2">
                          <Badge variant="secondary" className="text-[8px] h-4">{r.edgeNodeId}</Badge>
                        </td>
                        <td className="p-2">
                          <div className="flex items-center gap-1">
                            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: SENSOR_COLORS[r.sensorType] || '#999' }} />
                            <span>{SENSOR_LABELS[r.sensorType]?.th || r.sensorType}</span>
                          </div>
                        </td>
                        <td className="p-2 text-right font-mono font-medium">{r.value} {r.unit}</td>
                        <td className="p-2 text-center">
                          <Badge className={`text-[8px] h-4 ${
                            r.qualityFlag === 'VALIDATED' ? 'bg-emerald-100 text-emerald-700' :
                            r.qualityFlag === 'ANOMALY' ? 'bg-amber-100 text-amber-700' :
                            r.qualityFlag === 'REJECTED' ? 'bg-red-100 text-red-700' :
                            'bg-slate-100 text-slate-700'
                          }`}>{r.qualityFlag}</Badge>
                        </td>
                        <td className="p-2 font-mono text-[9px] text-muted-foreground">{r.integrityHash.slice(0, 16)}…</td>
                      </tr>
                    ))}
                    {filteredReadings.filter(r => r.ingestionMode === 'realtime').length === 0 && (
                      <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">กด &quot;เริ่มจำลอง&quot; เพื่อดูข้อมูล Realtime</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── TAB: Batch ─────────────────────────────────────────── */}
        <TabsContent value="batch" className="space-y-4">
          <Card className="border-l-4 border-l-amber-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Upload className="h-4 w-4 text-amber-600" />
                ข้อมูล Batch (อัปโหลดเป็นชุด)
                <Badge variant="secondary" className="text-[9px] h-4">CSV / JSON / XML</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-amber-50 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                    <Info className="h-4 w-4 text-amber-600" />
                  </div>
                  <div className="space-y-2 text-xs text-amber-800">
                    <p className="font-semibold">กระบวนการนำเข้าข้อมูล Batch</p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div>
                        <p className="font-medium">1️⃣ Edge Node บันทึกข้อมูล</p>
                        <p className="text-amber-700">Sensor บันทึกค่าลง local storage เมื่อไม่มีการเชื่อมต่อ (offline buffer)</p>
                      </div>
                      <div>
                        <p className="font-medium">2️⃣ อัปโหลดเมื่อเชื่อมต่อ</p>
                        <p className="text-amber-700">เมื่อการเชื่อมต่อกลับมา ข้อมูลจะถูกส่งเป็นชุด (CSV/JSON) พร้อมลายเซ็นรวม</p>
                      </div>
                      <div>
                        <p className="font-medium">3️⃣ ตรวจสอบและรับรอง</p>
                        <p className="text-amber-700">ตรวจสอบแต่ละรายการ + สร้าง Merkle Root + รับรองชุดข้อมูลทั้งหมด</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Batch Jobs */}
              <div className="space-y-3">
                {batchJobs.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    ยังไม่มี Batch Job — กด &quot;ส่ง Batch&quot; เพื่อทดสอบ
                  </div>
                ) : (
                  batchJobs.slice(0, 10).map(job => (
                    <Card key={job.id} className="shadow-sm">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <HardDrive className="h-4 w-4 text-amber-600" />
                            <span className="text-sm font-medium">{job.fileName}</span>
                            <Badge variant="secondary" className="text-[8px] h-4">{job.fileType}</Badge>
                            <Badge className={`text-[8px] h-4 ${
                              job.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' :
                              job.status === 'PROCESSING' ? 'bg-amber-100 text-amber-700' :
                              job.status === 'FAILED' ? 'bg-red-100 text-red-700' :
                              'bg-slate-100 text-slate-700'
                            }`}>{job.status}</Badge>
                            <Badge className={`text-[8px] h-4 ${
                              job.certificationStatus === 'CERTIFIED' ? 'bg-emerald-100 text-emerald-700' :
                              job.certificationStatus === 'PARTIAL' ? 'bg-amber-100 text-amber-700' :
                              job.certificationStatus === 'REJECTED' ? 'bg-red-100 text-red-700' :
                              'bg-slate-100 text-slate-700'
                            }`}>{job.certificationStatus}</Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-muted-foreground">{job.edgeNodeId}</span>
                            {job.status === 'COMPLETED' && (
                              <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => certifyBatch(job)} disabled={certifying}>
                                <Shield className="h-3 w-3 mr-1" /> รับรอง
                              </Button>
                            )}
                          </div>
                        </div>
                        <div className="grid grid-cols-5 gap-2 text-[10px]">
                          <div className="bg-blue-50 rounded p-1.5 text-center">
                            <div className="font-bold text-blue-700">{job.totalRecords}</div>
                            <div className="text-blue-600">ทั้งหมด</div>
                          </div>
                          <div className="bg-emerald-50 rounded p-1.5 text-center">
                            <div className="font-bold text-emerald-700">{job.validRecords}</div>
                            <div className="text-emerald-600">ผ่าน</div>
                          </div>
                          <div className="bg-amber-50 rounded p-1.5 text-center">
                            <div className="font-bold text-amber-700">{job.anomalyRecords}</div>
                            <div className="text-amber-600">Anomaly</div>
                          </div>
                          <div className="bg-red-50 rounded p-1.5 text-center">
                            <div className="font-bold text-red-700">{job.rejectedRecords}</div>
                            <div className="text-red-600">ปฏิเสธ</div>
                          </div>
                          <div className="bg-purple-50 rounded p-1.5 text-center">
                            <div className="font-bold text-purple-700 font-mono text-[8px]">{job.merkleRoot?.slice(0, 12) || '-'}…</div>
                            <div className="text-purple-600">Merkle Root</div>
                          </div>
                        </div>
                        <div className="mt-2">
                          <Progress value={(job.processedRecords / Math.max(1, job.totalRecords)) * 100} className="h-1.5" />
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── TAB: Edge Nodes ────────────────────────────────────── */}
        <TabsContent value="edge" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {(status?.edgeNodes || []).map(node => (
              <Card
                key={node.nodeId}
                className={`shadow-sm cursor-pointer transition-all hover:shadow-md ${selectedEdgeNode === node.nodeId ? 'ring-2 ring-emerald-300' : ''} ${node.status === 'offline' ? 'opacity-60' : ''}`}
                onClick={() => setSelectedEdgeNode(selectedEdgeNode === node.nodeId ? null : node.nodeId)}
              >
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{PROTOCOL_ICONS[node.protocol] || '📡'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate">{node.name}</p>
                      <p className="text-[10px] text-muted-foreground">{node.nameTh}</p>
                    </div>
                    <Badge className={`text-[9px] h-5 ${
                      node.status === 'online' ? 'bg-emerald-100 text-emerald-700' :
                      node.status === 'maintenance' ? 'bg-amber-100 text-amber-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {node.status === 'online' ? '● ออนไลน์' : node.status === 'maintenance' ? '⚠ ซ่อมบำรุง' : '✕ ออฟไลน์'}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    <span>{node.province}</span>
                    <span>·</span>
                    <span>{node.protocol}</span>
                    <span>·</span>
                    <span>{node.sensors.filter(s => s.status === 'active').length}/{node.sensors.length} sensors</span>
                  </div>

                  <div className="grid grid-cols-4 gap-1.5 text-[10px]">
                    <div className="bg-slate-50 rounded p-1.5 text-center">
                      <div className="font-bold">{node.batteryLevel}%</div>
                      <div className="text-[8px] text-muted-foreground">แบตเตอรี่</div>
                    </div>
                    <div className="bg-slate-50 rounded p-1.5 text-center">
                      <div className="font-bold">{node.signalStrength} dBm</div>
                      <div className="text-[8px] text-muted-foreground">สัญญาณ</div>
                    </div>
                    <div className="bg-slate-50 rounded p-1.5 text-center">
                      <div className="font-bold">{node.totalReadings}</div>
                      <div className="text-[8px] text-muted-foreground">ข้อมูล</div>
                    </div>
                    <div className="bg-slate-50 rounded p-1.5 text-center">
                      <div className="font-bold">{node.sensors.filter(s => s.status === 'active').length}</div>
                      <div className="text-[8px] text-muted-foreground">Active</div>
                    </div>
                  </div>

                  {/* Sensor Tags */}
                  <div className="flex flex-wrap gap-1">
                    {node.sensors.map(s => {
                      const latest = latestReadingBySensor[s.sensorId];
                      return (
                        <Badge
                          key={s.sensorId}
                          variant="secondary"
                          className={`text-[8px] h-5 ${s.status === 'active' ? 'bg-slate-100 text-slate-700' : 'bg-slate-50 text-slate-400 line-through'}`}
                        >
                          <div className="h-1.5 w-1.5 rounded-full mr-1" style={{ backgroundColor: SENSOR_COLORS[s.sensorType] || '#999' }} />
                          {SENSOR_LABELS[s.sensorType]?.th || s.sensorType}
                          {latest ? `: ${latest.value}` : ''}
                        </Badge>
                      );
                    })}
                  </div>

                  {/* Last Heartbeat */}
                  <div className="flex items-center justify-between text-[9px] text-muted-foreground">
                    <span>Last heartbeat: {new Date(node.lastHeartbeat).toLocaleString('th-TH')}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ─── TAB: Certification ─────────────────────────────────── */}
        <TabsContent value="certify" className="space-y-4">
          <Card className="border-l-4 border-l-purple-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4 text-purple-600" />
                การรับรองข้อมูล (Data Certification)
                <Badge variant="secondary" className="text-[9px] h-4">ISO 14064-3</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-purple-50 rounded-lg p-4 mb-4">
                <div className="space-y-2 text-xs text-purple-800">
                  <p className="font-semibold">ขั้นตอนการรับรองข้อมูล IoT สำหรับ T-VER</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <p className="font-medium">1️⃣ ตรวจสอบช่วงค่า (Range Check)</p>
                      <p className="text-purple-700">ค่า sensor ต้องอยู่ใน min-max range ที่กำหนด → ถ้าเกิน = REJECTED</p>
                    </div>
                    <div>
                      <p className="font-medium">2️⃣ ตรวจสอบลำดับเวลา (Timestamp Order)</p>
                      <p className="text-purple-700">ข้อมูลต้องเรียงตามเวลาไม่ย้อนหลัง → ป้องกัน data tampering</p>
                    </div>
                    <div>
                      <p className="font-medium">3️⃣ ตรวจสอบ Integrity Hash (SHA-256)</p>
                      <p className="text-purple-700">แต่ละรายการมี hash = SHA256(sensorId + value + timestamp) → ตรวจจับการแก้ไขข้อมูล</p>
                    </div>
                    <div>
                      <p className="font-medium">4️⃣ ตรวจสอบลายเซ็น Edge Node</p>
                      <p className="text-purple-700">ข้อมูลต้องมี digital signature จาก Edge Node → ยืนยันแหล่งที่มา</p>
                    </div>
                    <div>
                      <p className="font-medium">5️⃣ ตรวจสอบ Anomaly Ratio</p>
                      <p className="text-purple-700">สัดส่วน anomaly ต้อง &lt; 10% → ถ้าเกินแสดงว่า sensor มีปัญหา</p>
                    </div>
                    <div>
                      <p className="font-medium">6️⃣ สร้าง Merkle Root & Certificate</p>
                      <p className="text-purple-700">สร้าง Merkle Tree จาก hash ทั้งหมด → ใช้ตรวจสอบภายหลังโดยไม่ต้องเก็บข้อมูลทั้งหมด</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quality Distribution */}
              <div className="grid grid-cols-5 gap-2 mb-4">
                {[
                  { label: 'VALIDATED', count: qualityStats.validated, color: 'bg-emerald-500', bg: 'bg-emerald-50' },
                  { label: 'ANOMALY', count: qualityStats.anomaly, color: 'bg-amber-500', bg: 'bg-amber-50' },
                  { label: 'REJECTED', count: qualityStats.rejected, color: 'bg-red-500', bg: 'bg-red-50' },
                  { label: 'RAW', count: qualityStats.raw, color: 'bg-slate-400', bg: 'bg-slate-50' },
                  { label: 'TOTAL', count: qualityStats.total, color: 'bg-blue-500', bg: 'bg-blue-50' },
                ].map(s => (
                  <div key={s.label} className={`${s.bg} rounded-lg p-3 text-center`}>
                    <div className={`text-xl font-bold ${s.color.replace('bg-', 'text-')}`}>{s.count}</div>
                    <div className="text-[10px] text-muted-foreground font-medium">{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Certification Result */}
              {certificationResult && (
                <Card className="border-emerald-200 bg-emerald-50/50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                      <span className="font-semibold text-emerald-800">ผลการรับรองข้อมูล</span>
                      <Badge className={`text-[9px] h-5 ${
                        certificationResult.certificationStatus === 'CERTIFIED' ? 'bg-emerald-200 text-emerald-800' :
                        certificationResult.certificationStatus === 'PARTIAL' ? 'bg-amber-200 text-amber-800' :
                        'bg-red-200 text-red-800'
                      }`}>{certificationResult.certificationStatus}</Badge>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3 text-[10px]">
                      <div className="bg-white rounded p-2 text-center">
                        <div className="font-bold text-lg">{certificationResult.summary?.integrityScore}%</div>
                        <div className="text-muted-foreground">Integrity Score</div>
                      </div>
                      <div className="bg-white rounded p-2 text-center">
                        <div className="font-bold text-lg">{certificationResult.summary?.validatedReadings}</div>
                        <div className="text-muted-foreground">ผ่าน</div>
                      </div>
                      <div className="bg-white rounded p-2 text-center">
                        <div className="font-bold text-lg">{certificationResult.summary?.anomalyReadings}</div>
                        <div className="text-muted-foreground">Anomaly</div>
                      </div>
                      <div className="bg-white rounded p-2 text-center">
                        <div className="font-bold text-lg">{certificationResult.summary?.rejectedReadings}</div>
                        <div className="text-muted-foreground">ปฏิเสธ</div>
                      </div>
                    </div>
                    <div className="space-y-1">
                      {certificationResult.rules?.map((rule: any) => (
                        <div key={rule.id} className="flex items-center gap-2 text-[10px]">
                          {rule.passed ? <CheckCircle2 className="h-3 w-3 text-emerald-600" /> : <AlertTriangle className="h-3 w-3 text-amber-600" />}
                          <span className="font-medium">{rule.id}</span>
                          <span className="text-muted-foreground">{rule.description}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-2 text-[9px] text-muted-foreground">
                      Certification ID: {certificationResult.certificationId} | By: {certificationResult.certifiedBy} | Ref: {certificationResult.standardRef}
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── TAB: Charts ────────────────────────────────────────── */}
        <TabsContent value="chart" className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-emerald-600" />
                กราฟข้อมูล Sensor
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Sensor Type Filter */}
              <div className="flex flex-wrap gap-1 mb-4">
                <Button size="sm" variant={selectedSensorType === null ? 'default' : 'outline'} className="h-6 text-[10px]"
                  onClick={() => setSelectedSensorType(null)}>ทั้งหมด</Button>
                {Object.entries(SENSOR_LABELS).map(([key, label]) => (
                  <Button key={key} size="sm" variant={selectedSensorType === key ? 'default' : 'outline'} className="h-6 text-[10px] gap-1"
                    onClick={() => setSelectedSensorType(selectedSensorType === key ? null : key)}>
                    <div className="h-2 w-2 rounded-full" style={{ backgroundColor: SENSOR_COLORS[key] }} />
                    {label.th}
                  </Button>
                ))}
              </div>

              {selectedEdgeNode ? (
                <ResponsiveContainer width="100%" height={350}>
                  <ComposedChart data={edgeNodeChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="time" tick={{ fontSize: 9 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip contentStyle={{ fontSize: 11 }} />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                    {Object.entries(SENSOR_COLORS).map(([type, color]) => (
                      <Line key={type} type="monotone" dataKey={type} stroke={color} dot={false} strokeWidth={1.5}
                        name={SENSOR_LABELS[type]?.th || type} />
                    ))}
                  </ComposedChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  เลือก Edge Node เพื่อดูกราฟ (คลิกที่ Edge Node ในแท็บ Edge Nodes)
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── TAB: Sample Data & API ─────────────────────────────── */}
        <TabsContent value="sample" className="space-y-4">
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4 text-blue-600" />
                ตัวอย่างข้อมูลและ API Reference
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-blue-50 rounded-lg p-4 mb-4">
                <div className="space-y-2 text-xs text-blue-800">
                  <p className="font-semibold">รูปแบบการนำเข้าข้อมูล 2 แบบ</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="bg-white rounded-lg p-3">
                      <p className="font-bold text-emerald-700 mb-1">⚡ Realtime (เรียลไทม์)</p>
                      <p className="text-[10px] mb-2">ส่งข้อมูลทีละรายการทันที ผ่าน WebSocket หรือ HTTP POST</p>
                      <ul className="text-[10px] space-y-0.5 text-blue-700">
                        <li>• Protocol: WebSocket / MQTT / HTTP POST</li>
                        <li>• ความถี่: ตาม sampling rate ของแต่ละ sensor (30s–1800s)</li>
                        <li>• ข้อดี: ตรวจจับ anomaly ทันที, แจ้งเตือน real-time</li>
                        <li>• ใช้กรณี: มอนิเตอร์สถานี, ตรวจจับรั่วไหล CH₄</li>
                      </ul>
                    </div>
                    <div className="bg-white rounded-lg p-3">
                      <p className="font-bold text-amber-700 mb-1">📦 Batch (อัปโหลดชุด)</p>
                      <p className="text-[10px] mb-2">ส่งข้อมูลหลายรายการพร้อมกัน เมื่อมีการเชื่อมต่อ</p>
                      <ul className="text-[10px] space-y-0.5 text-blue-700">
                        <li>• Protocol: HTTP POST / File Upload</li>
                        <li>• รูปแบบ: CSV, JSON, XML, PARQUET</li>
                        <li>• ข้อดี: เหมาะกรณี offline, ข้อมูลย้อนหลัง, ปริมาณมาก</li>
                        <li>• ใช้กรณี: ข้อมูลที่บันทึกไว้ใน Edge Node, นำเข้าข้อมูลจากบริษัทภายนอก</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sample sections */}
              {[
                { key: 'realtime', label: 'ตัวอย่าง Realtime', icon: Zap, data: sampleData?.sampleRealtime },
                { key: 'batch', label: 'ตัวอย่าง Batch', icon: Upload, data: sampleData?.sampleBatch },
                { key: 'certification', label: 'ตัวอย่างการรับรอง', icon: Shield, data: sampleData?.sampleCertification },
                { key: 'edge', label: 'ตัวอย่าง Edge Node Config', icon: Server, data: sampleData?.sampleEdgeConfig },
              ].map(section => (
                <div key={section.key} className="border rounded-lg mb-3">
                  <button
                    className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
                    onClick={() => setExpandedSample(expandedSample === section.key ? null : section.key)}
                  >
                    <div className="flex items-center gap-2">
                      <section.icon className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium">{section.label}</span>
                    </div>
                    {expandedSample === section.key ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </button>
                  {expandedSample === section.key && section.data && (
                    <div className="border-t p-3 space-y-2">
                      {section.data.description && (
                        <p className="text-xs text-muted-foreground">{section.data.description}</p>
                      )}
                      {section.data.http_endpoint && (
                        <div className="flex items-center gap-2 text-xs">
                          <Badge variant="secondary" className="text-[9px] h-4 bg-blue-100 text-blue-700">{section.data.http_endpoint.startsWith('POST') ? 'POST' : 'GET'}</Badge>
                          <code className="text-[10px] font-mono bg-slate-100 px-2 py-0.5 rounded">{section.data.http_endpoint}</code>
                        </div>
                      )}
                      {section.data.websocket_event && (
                        <div className="flex items-center gap-2 text-xs">
                          <Badge variant="secondary" className="text-[9px] h-4 bg-purple-100 text-purple-700">WS</Badge>
                          <code className="text-[10px] font-mono bg-slate-100 px-2 py-0.5 rounded">{section.data.websocket_event}</code>
                        </div>
                      )}
                      {section.data.curl_example && (
                        <div className="relative">
                          <pre className="bg-slate-900 text-emerald-400 p-3 rounded-lg text-[10px] overflow-x-auto whitespace-pre-wrap">
                            {section.data.curl_example}
                          </pre>
                          <Button size="sm" variant="ghost" className="absolute top-1 right-1 h-6 w-6 p-0"
                            onClick={() => copyToClipboard(section.data.curl_example, `curl-${section.key}`)}>
                            {copiedId === `curl-${section.key}` ? <CheckCircle2 className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                          </Button>
                        </div>
                      )}
                      {section.data.payload && (
                        <div className="relative">
                          <p className="text-[10px] text-muted-foreground mb-1">Payload:</p>
                          <pre className="bg-slate-900 text-blue-300 p-3 rounded-lg text-[10px] overflow-x-auto whitespace-pre-wrap">
                            {JSON.stringify(section.data.payload, null, 2)}
                          </pre>
                          <Button size="sm" variant="ghost" className="absolute top-5 right-1 h-6 w-6 p-0"
                            onClick={() => copyToClipboard(JSON.stringify(section.data.payload, null, 2), `payload-${section.key}`)}>
                            {copiedId === `payload-${section.key}` ? <CheckCircle2 className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                          </Button>
                        </div>
                      )}
                      {section.data.certification_rules && (
                        <div className="space-y-1">
                          <p className="text-[10px] text-muted-foreground">กฎการรับรอง:</p>
                          {section.data.certification_rules.map((rule: any) => (
                            <div key={rule.id} className="flex items-center gap-2 text-[10px]">
                              <Hash className="h-3 w-3 text-purple-500" />
                              <span className="font-medium">{rule.id}</span>
                              <span className="text-muted-foreground">— {rule.description}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
