'use client';

import React from 'react';
import { Layers, Shield, Upload, Send, RefreshCw, Droplets, Thermometer, Waves, Gauge, ArrowDown, Mountain } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { QUALITY_COLORS, QUALITY_LABELS, fmt } from './constants';

interface IngestionTabProps {
  selectedTerraceLayer: string;
  setSelectedTerraceLayer: (v: string) => void;
  latestSensorData: Record<string, any> | null;
  qualitySummary: Record<string, number>;
  batchData: string;
  setBatchData: (v: string) => void;
  ingesting: boolean;
  ingestResult: any;
  autoRefresh: boolean;
  setAutoRefresh: (v: boolean) => void;
  handleIngest: () => void;
}

export default function IngestionTab({
  selectedTerraceLayer,
  setSelectedTerraceLayer,
  latestSensorData,
  qualitySummary,
  batchData,
  setBatchData,
  ingesting,
  ingestResult,
  autoRefresh,
  setAutoRefresh,
  handleIngest,
}: IngestionTabProps) {
  return (
    <>
      {/* Terrace Layer Selector */}
      <Card className="bg-slate-800/50 border-slate-700/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-slate-200 flex items-center gap-2">
            <Layers className="h-4 w-4 text-emerald-400" /> เลือกชั้นปลูก
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            เลือกชั้นปลูกที่ต้องการดู/นำเข้าข้อมูล
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center gap-3">
            <Select value={selectedTerraceLayer} onValueChange={setSelectedTerraceLayer}>
              <SelectTrigger className="bg-slate-800 border-slate-600 text-white w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-600">
                <SelectItem value="all">ทุกชั้น</SelectItem>
                {[1, 2, 3, 4, 5].map(i => (
                  <SelectItem key={i} value={`layer-${i}`}>ชั้นที่ {i}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 text-xs">
              {selectedTerraceLayer === 'all' ? 'ทุกชั้น' : `ชั้น ${selectedTerraceLayer.split('-')[1]}`}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Real-time Sensor Cards */}
      {latestSensorData && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {Object.entries(latestSensorData).map(([key, sensor]: [string, any]) => {
            const Icon = sensor.icon;
            const pct = Math.min(100, Math.max(0, ((sensor.value - sensor.min) / (sensor.max - sensor.min)) * 100));
            const isHigh = key === 'erosion_rate';
            const barColor = isHigh
              ? (pct > 50 ? 'bg-red-500' : 'bg-emerald-500')
              : 'bg-emerald-500';
            return (
              <Card key={key} className="bg-slate-800/50 border-slate-700/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className={`h-4 w-4 ${isHigh ? (pct > 50 ? 'text-red-400' : 'text-emerald-400') : 'text-emerald-400'}`} />
                    <span className="text-xs text-slate-400 truncate">{sensor.label}</span>
                  </div>
                  <p className={`text-xl font-bold ${isHigh ? (pct > 50 ? 'text-red-400' : 'text-emerald-400') : 'text-white'}`}>
                    {fmt(sensor.value, 1)}
                  </p>
                  <p className="text-xs text-slate-500">{sensor.unit}</p>
                  <div className="mt-1.5 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                    <div className={`h-full ${barColor} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Quality Summary */}
      <Card className="bg-slate-800/50 border-slate-700/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-slate-200 flex items-center gap-2">
            <Shield className="h-4 w-4 text-blue-400" /> สรุปคุณภาพข้อมูล
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center gap-4 flex-wrap">
            {Object.entries(qualitySummary).map(([flag, count]) => (
              <div key={flag} className="flex items-center gap-2">
                <Badge variant="outline" className={`text-xs ${QUALITY_COLORS[flag] || ''}`}>
                  {QUALITY_LABELS[flag] || flag}: {count}
                </Badge>
              </div>
            ))}
            <div className="flex items-center gap-2 ml-auto">
              <label className="text-xs text-slate-400 flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={e => setAutoRefresh(e.target.checked)}
                  className="rounded border-slate-600"
                />
                รีเฟรชอัตโนมัติ (10 วินาที)
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Batch Upload */}
      <Card className="bg-slate-800/50 border-slate-700/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-slate-200 flex items-center gap-2">
            <Upload className="h-4 w-4 text-blue-400" /> นำเข้าข้อมูลแบบกลุ่ม (Batch Upload)
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            รองรับรูปแบบ JSON หรือ CSV — เพิ่มฟิลด์ runoffVolumeL, sedimentConcGpL, waterFlowRate, infiltrationRate, erosionRate, terraceLayerId
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            className="bg-slate-900 border-slate-600 text-white text-xs font-mono min-h-[200px]"
            placeholder={`ตัวอย่าง JSON:\n[\n  {\n    "plotId": "SOIL-CMD-001",\n    "measurementDate": "2024-08-01T09:00:00Z",\n    "bulkDensity": 1.3,\n    "organicCarbonPct": 2.5,\n    "soilMoisture": 35.0,\n    "soilTemperature": 28.0,\n    "soilPH": 6.8,\n    "runoffVolumeL": 125,\n    "sedimentConcGpL": 2.4,\n    "waterFlowRate": 48,\n    "infiltrationRate": 15,\n    "erosionRate": 3.2,\n    "terraceLayerId": "layer-1",\n    "sourceDevice": "SENSOR-TERRACE-001"\n  }\n]`}
            value={batchData}
            onChange={e => setBatchData(e.target.value)}
          />
          <div className="flex items-center gap-2">
            <Button
              onClick={handleIngest}
              disabled={ingesting || !batchData.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm"
            >
              {ingesting ? <RefreshCw className="h-4 w-4 mr-1 animate-spin" /> : <Send className="h-4 w-4 mr-1" />}
              นำเข้าข้อมูล
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-slate-600 text-slate-400"
              onClick={() => setBatchData('')}
            >
              ล้าง
            </Button>
          </div>
          {ingestResult && (
            <div className={`p-3 rounded-lg text-xs ${ingestResult.success ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
              {ingestResult.success ? (
                <div className="space-y-1">
                  <p className="text-emerald-400 font-medium">{ingestResult.message}</p>
                  {ingestResult.data?.summary && (
                    <div className="grid grid-cols-4 gap-2 mt-2">
                      <div><span className="text-slate-400">ทั้งหมด:</span> <span className="text-white">{ingestResult.data.summary.total}</span></div>
                      <div><span className="text-slate-400">ผ่าน:</span> <span className="text-emerald-400">{ingestResult.data.summary.valid}</span></div>
                      <div><span className="text-slate-400">ผิดปกติ:</span> <span className="text-amber-400">{ingestResult.data.summary.anomaly}</span></div>
                      <div><span className="text-slate-400">ปฏิเสธ:</span> <span className="text-red-400">{ingestResult.data.summary.rejected}</span></div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-red-400">{ingestResult.error}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
