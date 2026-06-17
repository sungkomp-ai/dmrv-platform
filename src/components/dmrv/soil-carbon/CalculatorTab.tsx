'use client';

import React from 'react';
import { Calculator, RefreshCw, Leaf, Mountain, Sprout, Shield, Layers, Droplets, Waves, BarChart3, TrendingDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts';
import { Dam } from 'lucide-react';
import type { SoilCarbonPlot, TerraceLayer, CheckDam, SedimentCalcResult } from './types';
import { fmt, generateMockTerraces, generateMockCheckDams } from './constants';
import TerraceCrossSection from './TerraceCrossSection';

interface CalculatorTabProps {
  calcPlotId: string;
  setCalcPlotId: (v: string) => void;
  calcStartDate: string;
  setCalcStartDate: (v: string) => void;
  calcEndDate: string;
  setCalcEndDate: (v: string) => void;
  calculating: boolean;
  calcDetail: SedimentCalcResult | null;
  plots: SoilCarbonPlot[];
  terraces: TerraceLayer[];
  checkDams: CheckDam[];
  handleCalculate: () => void;
}

export default function CalculatorTab({
  calcPlotId,
  setCalcPlotId,
  calcStartDate,
  setCalcStartDate,
  calcEndDate,
  setCalcEndDate,
  calculating,
  calcDetail,
  plots,
  terraces,
  checkDams,
  handleCalculate,
}: CalculatorTabProps) {
  return (
    <>
      {/* Input Section */}
      <Card className="bg-slate-800/50 border-slate-700/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-slate-200 flex items-center gap-2">
            <Calculator className="h-4 w-4 text-emerald-400" /> คำนวณเครดิตคาร์บอน — วิธีการกักตะกอน
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            คำนวณเครดิตคาร์บอนจากการเปลี่ยนแปลง SOC + ตะกอนดินที่กักได้ + ฝายชะลอน้ำ + หญ้าแฝก + การป้องกันการพังทลาย + การลด GHG
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs text-slate-400">เลือกแปลง *</Label>
              <Select value={calcPlotId} onValueChange={setCalcPlotId}>
                <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                  <SelectValue placeholder="เลือกแปลง..." />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-600">
                  {plots.map(p => (
                    <SelectItem key={p.plotId} value={p.plotId}>
                      {p.plotId} — {p.nameTh || p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-slate-400">วันที่เริ่มติดตาม</Label>
              <Input className="bg-slate-800 border-slate-600 text-white" type="date" value={calcStartDate} onChange={e => setCalcStartDate(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs text-slate-400">วันที่สิ้นสุดติดตาม</Label>
              <Input className="bg-slate-800 border-slate-600 text-white" type="date" value={calcEndDate} onChange={e => setCalcEndDate(e.target.value)} />
            </div>
          </div>
          <div className="mt-3">
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleCalculate}
              disabled={calculating || !calcPlotId}
            >
              {calculating ? <RefreshCw className="h-4 w-4 mr-1 animate-spin" /> : <Calculator className="h-4 w-4 mr-1" />}
              คำนวณเครดิตคาร์บอน
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {calcDetail && (
        <div className="space-y-4">
          {/* 6 Calculation Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {/* 1. SOC Stock Change */}
            <Card className="bg-gradient-to-br from-emerald-500/8 to-slate-800/50 border-emerald-500/20 border">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 rounded-lg bg-emerald-500/10">
                    <Leaf className="h-4 w-4 text-emerald-400" />
                  </div>
                  <span className="text-xs font-medium text-emerald-400">SOC Stock Change</span>
                </div>
                <p className="text-2xl font-bold text-white">{fmt(calcDetail.socStockChange?.result || 0, 3)}</p>
                <p className="text-xs text-slate-400">tCO₂e</p>
                <p className="text-[10px] text-slate-500 mt-1">ΔSOC × 44/12 × areaHa</p>
              </CardContent>
            </Card>

            {/* 2. Sediment Trapped */}
            <Card className="bg-gradient-to-br from-amber-500/8 to-slate-800/50 border-amber-500/20 border">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 rounded-lg bg-amber-500/10">
                    <Mountain className="h-4 w-4 text-amber-400" />
                  </div>
                  <span className="text-xs font-medium text-amber-400">Sediment Trapped</span>
                </div>
                <p className="text-2xl font-bold text-white">{fmt(calcDetail.sedimentTrapped?.result || 0, 3)}</p>
                <p className="text-xs text-slate-400">tCO₂e</p>
                <p className="text-[10px] text-slate-500 mt-1">Σ(ตะกอนทุกชั้น) × SOC% × 44/12</p>
              </CardContent>
            </Card>

            {/* 3. Check Dam Carbon */}
            <Card className="bg-gradient-to-br from-blue-500/8 to-slate-800/50 border-blue-500/20 border">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <Dam className="h-4 w-4 text-blue-400" />
                  </div>
                  <span className="text-xs font-medium text-blue-400">Check Dam Carbon</span>
                </div>
                <p className="text-2xl font-bold text-white">{fmt(calcDetail.checkDamCarbon?.result || 0, 3)}</p>
                <p className="text-xs text-slate-400">tCO₂e</p>
                <p className="text-[10px] text-slate-500 mt-1">Σ(ตะกอนหลังฝาย) × 44/12</p>
              </CardContent>
            </Card>

            {/* 4. Vetiver Grass CO2e */}
            <Card className="bg-gradient-to-br from-lime-500/8 to-slate-800/50 border-lime-500/20 border">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 rounded-lg bg-lime-500/10">
                    <Sprout className="h-4 w-4 text-lime-400" />
                  </div>
                  <span className="text-xs font-medium text-lime-400">คาร์บอนจากหญ้าแฝก</span>
                </div>
                <p className="text-2xl font-bold text-white">{fmt(
                  terraces.filter(t => t.plotId === calcPlotId).reduce((s, t) => s + (t.vetiverCarbonSequestrationKg || 0), 0) / 1000
                  || generateMockTerraces(calcPlotId).reduce((s, t) => s + (t.vetiverCarbonSequestrationKg || 0), 0) / 1000
                , 4)}</p>
                <p className="text-xs text-slate-400">tCO₂e</p>
                <p className="text-[10px] text-slate-500 mt-1">Σ(กักคาร์บอนหญ้าแฝก) / 1000</p>
              </CardContent>
            </Card>

            {/* 5. Erosion Prevention */}
            <Card className="bg-gradient-to-br from-red-500/8 to-slate-800/50 border-red-500/20 border">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 rounded-lg bg-red-500/10">
                    <Shield className="h-4 w-4 text-red-400" />
                  </div>
                  <span className="text-xs font-medium text-red-400">Erosion Prevention</span>
                </div>
                <p className="text-2xl font-bold text-white">{fmt(calcDetail.erosionPrevention?.result || 0, 3)}</p>
                <p className="text-xs text-slate-400">tCO₂e</p>
                <p className="text-[10px] text-slate-500 mt-1">(baseline - project) × SOC% × 44/12</p>
              </CardContent>
            </Card>

            {/* 6. GHG Reduction */}
            <Card className="bg-gradient-to-br from-purple-500/8 to-slate-800/50 border-purple-500/20 border">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 rounded-lg bg-purple-500/10">
                    <TrendingDown className="h-4 w-4 text-purple-400" />
                  </div>
                  <span className="text-xs font-medium text-purple-400">GHG Reduction</span>
                </div>
                <p className="text-2xl font-bold text-white">{fmt(calcDetail.ghgReduction?.result || 0, 3)}</p>
                <p className="text-xs text-slate-400">tCO₂e</p>
                <p className="text-[10px] text-slate-500 mt-1">(baseline - project) × areaHa</p>
              </CardContent>
            </Card>
          </div>

          {/* Summary Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Card className="bg-slate-800/50 border-slate-600/30 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-slate-400/50" />
              <CardContent className="p-4 text-center pl-6">
                <p className="text-sm text-slate-400 mb-1">Gross Total</p>
                <p className="text-3xl font-bold text-white">{fmt(calcDetail.creditSummary?.grossCredits || 0, 3)}</p>
                <p className="text-sm text-slate-500">tCO₂e</p>
              </CardContent>
            </Card>
            <Card className="bg-slate-800/50 border-slate-600/30 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-amber-400/70" />
              <CardContent className="p-4 text-center pl-6">
                <p className="text-sm text-slate-400 mb-1">หัก Buffer (20% T-VER-SOIL-01)</p>
                <p className="text-3xl font-bold text-amber-400">-{fmt(calcDetail.creditSummary?.bufferDeduction || 0, 3)}</p>
                <p className="text-sm text-slate-500">tCO₂e</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-emerald-500/15 to-emerald-500/5 border-emerald-500/40 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-emerald-400" />
              <CardContent className="p-4 text-center pl-6">
                <p className="text-sm text-emerald-400 mb-1">Net Carbon Credits</p>
                <p className="text-3xl font-bold text-emerald-400">{fmt(calcDetail.creditSummary?.netCredits || 0, 3)}</p>
                <p className="text-sm text-emerald-500/70">tCO₂e</p>
              </CardContent>
            </Card>
          </div>

          {/* Visualization Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Stacked Horizontal Bar */}
            <Card className="bg-slate-800/50 border-slate-700/50 p-5">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold text-slate-200 flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-emerald-400" /> สัดส่วนแหล่งที่มาเครดิตคาร์บอน
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart
                    data={[{
                      name: 'เครดิตคาร์บอน',
                      'SOC Change': calcDetail.socStockChange?.result || 0,
                      'Sediment Trapped': calcDetail.sedimentTrapped?.result || 0,
                      'Check Dam': calcDetail.checkDamCarbon?.result || 0,
                      'Vetiver Grass': (terraces.filter(t => t.plotId === calcPlotId).reduce((s, t) => s + (t.vetiverCarbonSequestrationKg || 0), 0) / 1000) || (generateMockTerraces(calcPlotId).reduce((s, t) => s + (t.vetiverCarbonSequestrationKg || 0), 0) / 1000),
                      'Erosion Prevention': calcDetail.erosionPrevention?.result || 0,
                      'GHG Reduction': calcDetail.ghgReduction?.result || 0,
                    }]}
                    layout="vertical"
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <YAxis dataKey="name" type="category" tick={{ fill: '#94a3b8', fontSize: 11 }} width={80} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: 8 }}
                      labelStyle={{ color: '#e2e8f0' }}
                    />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                    <Bar dataKey="SOC Change" stackId="a" fill="#10b981" />
                    <Bar dataKey="Sediment Trapped" stackId="a" fill="#f59e0b" />
                    <Bar dataKey="Check Dam" stackId="a" fill="#3b82f6" />
                    <Bar dataKey="Vetiver Grass" stackId="a" fill="#84cc16" />
                    <Bar dataKey="Erosion Prevention" stackId="a" fill="#ef4444" />
                    <Bar dataKey="GHG Reduction" stackId="a" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Cross-Section SVG with Water Flow */}
            <Card className="bg-slate-800/50 border-slate-700/50 p-5">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold text-slate-200 flex items-center gap-2">
                  <Layers className="h-4 w-4 text-emerald-400" /> ภาพตัดขวาง — การไหลของน้ำและตะกอน
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <TerraceCrossSection
                  layers={terraces.filter(t => t.plotId === calcPlotId).length > 0
                    ? terraces.filter(t => t.plotId === calcPlotId)
                    : generateMockTerraces(calcPlotId)}
                  checkDams={checkDams.filter(d => d.plotId === calcPlotId).length > 0
                    ? checkDams.filter(d => d.plotId === calcPlotId)
                    : generateMockCheckDams(calcPlotId)}
                />
              </CardContent>
            </Card>
          </div>

          {/* Co-benefits */}
          {calcDetail.coBenefits && (
            <Card className="bg-slate-800/50 border-slate-700/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold text-slate-200 flex items-center gap-2">
                  <Droplets className="h-4 w-4 text-blue-400" /> ประโยชน์ร่วม (ไม่นับเป็นเครดิต)
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
                    <Droplets className="h-6 w-6 text-blue-400 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-blue-300">การลดอัตราการไหลของน้ำ</p>
                      <p className="text-xl font-bold text-blue-400">{fmt(calcDetail.coBenefits.flowReductionPct, 1)}%</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-cyan-500/5 border border-cyan-500/20">
                    <Waves className="h-6 w-6 text-cyan-400 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-cyan-300">ปริมาณน้ำไหลบ่าลดลง</p>
                      <p className="text-xl font-bold text-cyan-400">{fmt(calcDetail.coBenefits.runoffReductionLpm, 1)} ลิตร/นาที</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Detailed Calculation Info */}
          {calcDetail.monitoringPeriod && (
            <Card className="bg-slate-800/50 border-slate-700/50">
              <CardContent className="p-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-slate-400">ช่วงเวลาติดตาม</p>
                    <p className="text-white">{calcDetail.monitoringPeriod.start} — {calcDetail.monitoringPeriod.end}</p>
                  </div>
                  <div>
                    <p className="text-slate-400">ระยะเวลา</p>
                    <p className="text-white">{fmt(calcDetail.monitoringPeriod.years, 2)} ปี</p>
                  </div>
                  <div>
                    <p className="text-slate-400">จำนวนการวัด</p>
                    <p className="text-white">{calcDetail.monitoringPeriod.measurementCount} รายการ</p>
                  </div>
                  <div>
                    <p className="text-slate-400">การวัดที่ผ่านการตรวจสอบ</p>
                    <p className="text-emerald-400">{calcDetail.monitoringPeriod.validMeasurementCount} รายการ</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Sediment by Layer Detail */}
          {calcDetail.sedimentTrapped?.byLayer && calcDetail.sedimentTrapped.byLayer.length > 0 && (
            <Card className="bg-slate-800/50 border-slate-700/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold text-slate-200 flex items-center gap-2">
                  <Layers className="h-4 w-4 text-amber-400" /> เครดิตคาร์บอนจากตะกอนแต่ละชั้น
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="max-h-48 overflow-y-auto custom-scrollbar">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-slate-700/50 hover:bg-transparent">
                        <TableHead className="text-xs text-slate-400 py-2">ชั้น</TableHead>
                        <TableHead className="text-xs text-slate-400 py-2 text-right">ตะกอน (กก.)</TableHead>
                        <TableHead className="text-xs text-slate-400 py-2 text-right">SOC%</TableHead>
                        <TableHead className="text-xs text-slate-400 py-2 text-right">เครดิต (tCO₂e)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {calcDetail.sedimentTrapped.byLayer.map((layer, i) => (
                        <TableRow key={i} className="border-slate-700/30 hover:bg-slate-700/30">
                          <TableCell className="text-sm text-white py-2">ชั้น {layer.layer}</TableCell>
                          <TableCell className="text-sm text-amber-400 py-2 text-right">{fmt(layer.sedimentKg, 1)}</TableCell>
                          <TableCell className="text-sm text-slate-300 py-2 text-right">{fmt(layer.socPct, 2)}%</TableCell>
                          <TableCell className="text-sm text-emerald-400 py-2 text-right font-medium">{fmt(layer.credit, 4)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </>
  );
}
