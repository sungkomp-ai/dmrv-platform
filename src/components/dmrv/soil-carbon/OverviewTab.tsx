'use client';

import React from 'react';
import { MapPin, Layers, Waves, Leaf, TreePine, Sprout, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  BarChart, Bar, ComposedChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts';
import type { SoilCarbonPlot } from './types';
import { CREDIT_SOURCE_COLORS, fmt } from './constants';

interface OverviewTabProps {
  summary: {
    totalPlots: number;
    monitoringPlots: number;
    totalEmissionReduction: number;
    totalAreaHa: number;
    estimatedCredits: number;
    totalTerraceCount: number;
    totalSedimentTrapped: number;
    slashAndBurnPlots: number;
    totalVetiverArea: number;
    totalVetiverCarbon: number;
  };
  sedimentByLayerData: Array<{
    layer: string;
    'ตะกอนที่กักได้': number;
    'ตะกอนหลังฝาย': number;
    'ตะกอนที่เหลือ': number;
  }>;
  waterFlowData: Array<{
    layer: string;
    'น้ำเข้า': number;
    'น้ำออก': number;
    'ลดลง': number;
  }>;
  creditSourceData: Array<{ name: string; value: number; label: string }>;
  latestPlots: SoilCarbonPlot[];
}

export default function OverviewTab({
  summary,
  sedimentByLayerData,
  waterFlowData,
  creditSourceData,
  latestPlots,
}: OverviewTabProps) {
  return (
    <>
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <Card className="bg-gradient-to-br from-blue-500/5 to-slate-800/50 border-blue-500/20">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">แปลงทั้งหมด</p>
                <p className="text-3xl font-bold text-white">{summary.totalPlots}</p>
                <p className="text-xs">พื้นที่ {fmt(summary.totalAreaHa, 1)} เฮกตาร์</p>
              </div>
              <div className="p-3 rounded-lg bg-blue-500/15">
                <MapPin className="h-6 w-6 text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-500/5 to-slate-800/50 border-emerald-500/20">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">ชั้นปลูกรวม</p>
                <p className="text-3xl font-bold text-emerald-400">{summary.totalTerraceCount}</p>
                <p className="text-xs">จาก {summary.totalPlots} แปลง</p>
              </div>
              <div className="p-3 rounded-lg bg-emerald-500/15">
                <Layers className="h-6 w-6 text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500/5 to-slate-800/50 border-amber-500/20">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">ตะกอนดินที่กักได้</p>
                <p className="text-3xl font-bold text-amber-400">{fmt(summary.totalSedimentTrapped, 1)}</p>
                <p className="text-xs">ตัน/ปี</p>
              </div>
              <div className="p-3 rounded-lg bg-amber-500/15">
                <Waves className="h-6 w-6 text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-teal-500/5 to-slate-800/50 border-teal-500/20">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">เครดิตคาร์บอน</p>
                <p className="text-3xl font-bold text-emerald-400">{fmt(summary.estimatedCredits, 1)}</p>
                <p className="text-xs">tCO₂e (สุทธิ)</p>
              </div>
              <div className="p-3 rounded-lg bg-teal-500/15">
                <Leaf className="h-6 w-6 text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional KPI Row: Vetiver & Land Use */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <Card className="bg-gradient-to-br from-orange-500/8 to-slate-800/50 border-orange-500/20 border">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">แปลงเปลี่ยนจากไร่เลื่อนลอย</p>
                <p className="text-3xl font-bold text-orange-400">{summary.slashAndBurnPlots}</p>
                <p className="text-xs">จาก {summary.totalPlots} แปลง</p>
              </div>
              <div className="p-3 rounded-lg bg-orange-500/15">
                <TreePine className="h-6 w-6 text-orange-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-lime-500/8 to-slate-800/50 border-lime-500/20 border">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">พื้นที่หญ้าแฝกรวม</p>
                <p className="text-3xl font-bold text-lime-400">{fmt(summary.totalVetiverArea, 1)}</p>
                <p className="text-xs">เมตร (คันขอบ)</p>
              </div>
              <div className="p-3 rounded-lg bg-lime-500/15">
                <Sprout className="h-6 w-6 text-lime-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-500/8 to-slate-800/50 border-emerald-500/20 border">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">คาร์บอนจากหญ้าแฝกรวม</p>
                <p className="text-3xl font-bold text-emerald-400">{fmt(summary.totalVetiverCarbon, 1)}</p>
                <p className="text-xs">กก. CO₂e</p>
              </div>
              <div className="p-3 rounded-lg bg-emerald-500/15">
                <Leaf className="h-6 w-6 text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Stacked Bar: Sediment by Terrace Layer */}
        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-slate-200 flex items-center gap-2">
              <Layers className="h-4 w-4 text-amber-400" /> ปริมาณตะกอนดินตามชั้น
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              ตะกอนดินที่กักได้ในแต่ละชั้นปลูก (กก.) — ชั้นล่างสะสมมากขึ้น
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={sedimentByLayerData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="layer" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: 8 }}
                  labelStyle={{ color: '#e2e8f0' }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="ตะกอนหลังฝาย" stackId="a" fill="#f59e0b" radius={[0, 0, 0, 0]} />
                <Bar dataKey="ตะกอนที่เหลือ" stackId="a" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* ComposedChart: Water Flow by Layer */}
        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-slate-200 flex items-center gap-2">
              <Waves className="h-4 w-4 text-blue-400" /> การไหลของน้ำตามชั้น
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              อัตราการไหลของน้ำลดลงจากชั้นบนสุดไปชั้นล่างสุด
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <ResponsiveContainer width="100%" height={320}>
              <ComposedChart data={waterFlowData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="layer" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis yAxisId="left" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fill: '#f59e0b', fontSize: 11 }} unit="%" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: 8 }}
                  labelStyle={{ color: '#e2e8f0' }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar yAxisId="left" dataKey="น้ำเข้า" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="left" dataKey="น้ำออก" fill="#60a5fa" radius={[4, 4, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="ลดลง" stroke="#f59e0b" strokeWidth={2} dot={{ fill: '#f59e0b' }} />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Pie: Credit Sources */}
        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-slate-200 flex items-center gap-2">
              <Leaf className="h-4 w-4 text-emerald-400" /> สัดส่วนแหล่งที่มาเครดิตคาร์บอน
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <ResponsiveContainer width="100%" height={320}>
              <PieChart>
                <Pie
                  data={creditSourceData}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  innerRadius={60}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, value }) => `${name} ${value}%`}
                >
                  {creditSourceData.map((_, i) => (
                    <Cell key={i} fill={CREDIT_SOURCE_COLORS[i]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: 8 }}
                  labelStyle={{ color: '#e2e8f0' }}
                />
                <Legend
                  formatter={(value, entry) => <span style={{ color: '#94a3b8', fontSize: 11 }}>{creditSourceData.find(d => d.name === value)?.label || value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Latest Plots Table */}
        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-slate-200 flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-400" /> แปลงล่าสุด
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <div className="max-h-[320px] overflow-y-auto custom-scrollbar">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700/50 hover:bg-transparent">
                    <TableHead className="text-xs text-slate-400 py-2">แปลง</TableHead>
                    <TableHead className="text-xs text-slate-400 py-2">จังหวัด</TableHead>
                    <TableHead className="text-xs text-slate-400 py-2 text-right">ระดับความสูง</TableHead>
                    <TableHead className="text-xs text-slate-400 py-2 text-right">ความลาดชัน</TableHead>
                    <TableHead className="text-xs text-slate-400 py-2 text-right">ชั้นปลูก</TableHead>
                    <TableHead className="text-xs text-slate-400 py-2 text-right">ฝาย</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {latestPlots.map(plot => (
                    <TableRow key={plot.id} className="border-slate-700/30 hover:bg-slate-700/30">
                      <TableCell className="text-sm text-white py-2.5 font-medium">{plot.nameTh || plot.name}</TableCell>
                      <TableCell className="text-sm text-slate-400 py-2.5">{plot.province}</TableCell>
                      <TableCell className="text-sm text-slate-300 py-2.5 text-right">{plot.altitudeMasl ? `${plot.altitudeMasl} ม.` : '—'}</TableCell>
                      <TableCell className="text-sm text-slate-300 py-2.5 text-right">{plot.slopeDegree ? `${plot.slopeDegree}°` : '—'}</TableCell>
                      <TableCell className="text-sm text-emerald-400 py-2.5 text-right">{plot.terraceCount || 5}</TableCell>
                      <TableCell className="text-sm text-amber-400 py-2.5 text-right">{plot.checkDamCount || 5}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
