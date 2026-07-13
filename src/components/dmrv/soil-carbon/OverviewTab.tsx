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
        <Card className="bg-gradient-to-br from-sky-500/20 to-slate-800/60 border-2 border-sky-500/40 hover:border-sky-400/60 transition-colors">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-200 font-medium">แปลงทั้งหมด</p>
                <p className="text-3xl font-bold text-sky-300">{summary.totalPlots}</p>
                <p className="text-xs text-slate-300">พื้นที่ {fmt(summary.totalAreaHa, 1)} เฮกตาร์</p>
              </div>
              <div className="p-3 rounded-lg bg-sky-500/30 border border-sky-400/40 shadow-inner">
                <MapPin className="h-6 w-6 text-sky-200" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-500/20 to-slate-800/60 border-2 border-emerald-500/40 hover:border-emerald-400/60 transition-colors">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-200 font-medium">ชั้นปลูกรวม</p>
                <p className="text-3xl font-bold text-emerald-300">{summary.totalTerraceCount}</p>
                <p className="text-xs text-slate-300">จาก {summary.totalPlots} แปลง</p>
              </div>
              <div className="p-3 rounded-lg bg-emerald-500/30 border border-emerald-400/40 shadow-inner">
                <Layers className="h-6 w-6 text-emerald-200" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500/20 to-slate-800/60 border-2 border-amber-500/40 hover:border-amber-400/60 transition-colors">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-200 font-medium">ตะกอนดินที่กักได้</p>
                <p className="text-3xl font-bold text-amber-300">{fmt(summary.totalSedimentTrapped, 1)}</p>
                <p className="text-xs text-slate-300">ตัน/ปี</p>
              </div>
              <div className="p-3 rounded-lg bg-amber-500/30 border border-amber-400/40 shadow-inner">
                <Waves className="h-6 w-6 text-amber-200" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-teal-500/20 to-slate-800/60 border-2 border-teal-500/40 hover:border-teal-400/60 transition-colors">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-200 font-medium">เครดิตคาร์บอน</p>
                <p className="text-3xl font-bold text-teal-300">{fmt(summary.estimatedCredits, 1)}</p>
                <p className="text-xs text-slate-300">tCO₂e (สุทธิ)</p>
              </div>
              <div className="p-3 rounded-lg bg-teal-500/30 border border-teal-400/40 shadow-inner">
                <Leaf className="h-6 w-6 text-teal-200" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional KPI Row: Vetiver & Land Use */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <Card className="bg-gradient-to-br from-orange-500/20 to-slate-800/60 border-2 border-orange-500/40 hover:border-orange-400/60 transition-colors">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-200 font-medium">แปลงเปลี่ยนจากไร่เลื่อนลอย</p>
                <p className="text-3xl font-bold text-orange-300">{summary.slashAndBurnPlots}</p>
                <p className="text-xs text-slate-300">จาก {summary.totalPlots} แปลง</p>
              </div>
              <div className="p-3 rounded-lg bg-orange-500/30 border border-orange-400/40 shadow-inner">
                <TreePine className="h-6 w-6 text-orange-200" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-lime-500/20 to-slate-800/60 border-2 border-lime-500/40 hover:border-lime-400/60 transition-colors">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-200 font-medium">พื้นที่หญ้าแฝกรวม</p>
                <p className="text-3xl font-bold text-lime-300">{fmt(summary.totalVetiverArea, 1)}</p>
                <p className="text-xs text-slate-300">เมตร (คันขอบ)</p>
              </div>
              <div className="p-3 rounded-lg bg-lime-500/30 border border-lime-400/40 shadow-inner">
                <Sprout className="h-6 w-6 text-lime-200" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-500/20 to-slate-800/60 border-2 border-emerald-500/40 hover:border-emerald-400/60 transition-colors">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-200 font-medium">คาร์บอนจากหญ้าแฝกรวม</p>
                <p className="text-3xl font-bold text-emerald-300">{fmt(summary.totalVetiverCarbon, 1)}</p>
                <p className="text-xs text-slate-300">กก. CO₂e</p>
              </div>
              <div className="p-3 rounded-lg bg-emerald-500/30 border border-emerald-400/40 shadow-inner">
                <Leaf className="h-6 w-6 text-emerald-200" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Stacked Bar: Sediment by Terrace Layer */}
        <Card className="bg-slate-800/70 border-slate-600/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-slate-100 flex items-center gap-2">
              <Layers className="h-4 w-4 text-amber-400" /> ปริมาณตะกอนดินตามชั้น
            </CardTitle>
            <CardDescription className="text-xs text-slate-400">
              ตะกอนดินที่กักได้ในแต่ละชั้นปลูก (กก.) — ชั้นล่างสะสมมากขึ้น
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={sedimentByLayerData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                <XAxis dataKey="layer" tick={{ fill: '#cbd5e1', fontSize: 11, fontWeight: 600 }} />
                <YAxis tick={{ fill: '#cbd5e1', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #64748b', borderRadius: 8, color: '#e2e8f0' }}
                  labelStyle={{ color: '#fbbf24', fontWeight: 600 }}
                  itemStyle={{ color: '#e2e8f0' }}
                />
                <Legend wrapperStyle={{ fontSize: 11, color: '#cbd5e1' }} />
                <Bar dataKey="ตะกอนหลังฝาย" stackId="a" fill="#fbbf24" radius={[0, 0, 0, 0]} />
                <Bar dataKey="ตะกอนที่เหลือ" stackId="a" fill="#34d399" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* ComposedChart: Water Flow by Layer */}
        <Card className="bg-slate-800/70 border-slate-600/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-slate-100 flex items-center gap-2">
              <Waves className="h-4 w-4 text-sky-400" /> การไหลของน้ำตามชั้น
            </CardTitle>
            <CardDescription className="text-xs text-slate-400">
              อัตราการไหลของน้ำลดลงจากชั้นบนสุดไปชั้นล่างสุด
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <ResponsiveContainer width="100%" height={320}>
              <ComposedChart data={waterFlowData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                <XAxis dataKey="layer" tick={{ fill: '#cbd5e1', fontSize: 11, fontWeight: 600 }} />
                <YAxis yAxisId="left" tick={{ fill: '#cbd5e1', fontSize: 11 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fill: '#fbbf24', fontSize: 11, fontWeight: 600 }} unit="%" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #64748b', borderRadius: 8, color: '#e2e8f0' }}
                  labelStyle={{ color: '#60a5fa', fontWeight: 600 }}
                  itemStyle={{ color: '#e2e8f0' }}
                />
                <Legend wrapperStyle={{ fontSize: 11, color: '#cbd5e1' }} />
                <Bar yAxisId="left" dataKey="น้ำเข้า" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="left" dataKey="น้ำออก" fill="#60a5fa" radius={[4, 4, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="ลดลง" stroke="#fbbf24" strokeWidth={3} dot={{ fill: '#fbbf24', r: 5 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Pie: Credit Sources */}
        <Card className="bg-slate-800/70 border-slate-600/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-slate-100 flex items-center gap-2">
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
                  outerRadius={110}
                  innerRadius={65}
                  paddingAngle={4}
                  dataKey="value"
                  label={({ name, value }) => `${name} ${value}%`}
                  labelLine={{ stroke: '#64748b' }}
                >
                  {creditSourceData.map((_, i) => (
                    <Cell key={i} fill={CREDIT_SOURCE_COLORS[i]} stroke="#0f172a" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #64748b', borderRadius: 8, color: '#e2e8f0' }}
                  labelStyle={{ color: '#34d399', fontWeight: 600 }}
                  itemStyle={{ color: '#e2e8f0' }}
                />
                <Legend
                  formatter={(value, entry) => <span style={{ color: '#cbd5e1', fontSize: 11, fontWeight: 500 }}>{creditSourceData.find(d => d.name === value)?.label || value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Latest Plots Table */}
        <Card className="bg-slate-800/70 border-slate-600/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-slate-100 flex items-center gap-2">
              <Clock className="h-4 w-4 text-sky-400" /> แปลงล่าสุด
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <div className="max-h-[320px] overflow-y-auto custom-scrollbar">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-600/60 hover:bg-transparent">
                    <TableHead className="text-xs text-slate-300 py-2 font-semibold">แปลง</TableHead>
                    <TableHead className="text-xs text-slate-300 py-2 font-semibold">จังหวัด</TableHead>
                    <TableHead className="text-xs text-slate-300 py-2 text-right font-semibold">ระดับความสูง</TableHead>
                    <TableHead className="text-xs text-slate-300 py-2 text-right font-semibold">ความลาดชัน</TableHead>
                    <TableHead className="text-xs text-slate-300 py-2 text-right font-semibold">ชั้นปลูก</TableHead>
                    <TableHead className="text-xs text-slate-300 py-2 text-right font-semibold">ฝาย</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {latestPlots.map(plot => (
                    <TableRow key={plot.id} className="border-slate-700/40 hover:bg-slate-700/40">
                      <TableCell className="text-sm text-white py-2.5 font-medium">{plot.nameTh || plot.name}</TableCell>
                      <TableCell className="text-sm text-slate-300 py-2.5">{plot.province}</TableCell>
                      <TableCell className="text-sm text-slate-200 py-2.5 text-right">{plot.altitudeMasl ? `${plot.altitudeMasl} ม.` : '—'}</TableCell>
                      <TableCell className="text-sm text-slate-200 py-2.5 text-right">{plot.slopeDegree ? `${plot.slopeDegree}°` : '—'}</TableCell>
                      <TableCell className="text-sm text-emerald-300 py-2.5 text-right font-bold">{plot.terraceCount || 5}</TableCell>
                      <TableCell className="text-sm text-amber-300 py-2.5 text-right font-bold">{plot.checkDamCount || 5}</TableCell>
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
