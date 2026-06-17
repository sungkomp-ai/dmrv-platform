'use client';

import React from 'react';
import {
  Plus, MapPin, ChevronDown, ChevronUp, Sprout, Layers, TreePine, Dam,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { SoilCarbonPlot, TerraceLayer, CheckDam } from './types';
import {
  TERRACE_COLORS, STATUS_COLORS, STATUS_LABELS, PREVIOUS_LAND_USE_LABELS,
  VETIVER_STATUS_LABELS, VETIVER_STATUS_COLORS, CHECK_DAM_TYPE_OPTIONS,
  fmt, generateMockTerraces, generateMockCheckDams,
} from './constants';
import TerraceCrossSection from './TerraceCrossSection';

interface PlotsTabProps {
  filteredPlots: SoilCarbonPlot[];
  provinceFilter: string;
  setProvinceFilter: (v: string) => void;
  provinces: string[];
  expandedPlot: string | null;
  plotTerraces: TerraceLayer[];
  plotCheckDams: CheckDam[];
  onOpenNewPlotDialog: () => void;
  handleToggleExpand: (plotId: string) => void;
}

export default function PlotsTab({
  filteredPlots,
  provinceFilter,
  setProvinceFilter,
  provinces,
  expandedPlot,
  plotTerraces,
  plotCheckDams,
  onOpenNewPlotDialog,
  handleToggleExpand,
}: PlotsTabProps) {
  return (
    <>
      {/* Filters and Add Plot Button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm text-slate-400">รายการแปลง ({filteredPlots.length} แปลง)</p>
          <Select value={provinceFilter} onValueChange={setProvinceFilter}>
            <SelectTrigger className="bg-slate-800 border-slate-600 text-white w-48 text-sm">
              <SelectValue placeholder="ทุกจังหวัด" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-600">
              <SelectItem value="all">ทุกจังหวัด</SelectItem>
              {provinces.map(p => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant={provinceFilter === 'น่าน' ? 'default' : 'outline'}
            size="sm"
            className={provinceFilter === 'น่าน' ? 'bg-emerald-600 hover:bg-emerald-700 text-white text-sm' : 'border-slate-600 text-slate-400 text-sm hover:bg-slate-700'}
            onClick={() => setProvinceFilter(provinceFilter === 'น่าน' ? 'all' : 'น่าน')}
          >
            <MapPin className="h-3 w-3 mr-1" /> พื้นที่จังหวัดน่าน
          </Button>
        </div>
        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={onOpenNewPlotDialog}>
          <Plus className="h-4 w-4 mr-1" /> เพิ่มแปลง
        </Button>
      </div>

      {/* Plots Table */}
      <Card className="bg-slate-800/50 border-slate-700/50">
        <CardContent className="p-0">
          <div className="max-h-[700px] overflow-y-auto custom-scrollbar">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-700/50 hover:bg-transparent">
                  <TableHead className="text-xs font-medium text-slate-400 py-3 w-8"></TableHead>
                  <TableHead className="text-xs font-medium text-slate-400 py-3">Plot ID</TableHead>
                  <TableHead className="text-xs font-medium text-slate-400 py-3">ชื่อ</TableHead>
                  <TableHead className="text-xs font-medium text-slate-400 py-3">จังหวัด</TableHead>
                  <TableHead className="text-xs font-medium text-slate-400 py-3 text-right">ระดับความสูง</TableHead>
                  <TableHead className="text-xs font-medium text-slate-400 py-3 text-right">ความลาดชัน</TableHead>
                  <TableHead className="text-xs font-medium text-slate-400 py-3 text-right">ชั้นปลูก</TableHead>
                  <TableHead className="text-xs font-medium text-slate-400 py-3 text-right">ฝาย</TableHead>
                  <TableHead className="text-xs font-medium text-slate-400 py-3 text-right">ตะกอนที่กัก</TableHead>
                  <TableHead className="text-xs font-medium text-slate-400 py-3 text-right">การลดการปล่อย</TableHead>
                  <TableHead className="text-xs font-medium text-slate-400 py-3">สถานะ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPlots.map(plot => (
                  <React.Fragment key={plot.id}>
                    <TableRow
                      className="border-slate-700/30 hover:bg-slate-700/30 cursor-pointer"
                      onClick={() => handleToggleExpand(plot.plotId)}
                    >
                      <TableCell className="py-3">
                        {expandedPlot === plot.plotId
                          ? <ChevronUp className="h-3 w-3 text-slate-400" />
                          : <ChevronDown className="h-3 w-3 text-slate-400" />}
                      </TableCell>
                      <TableCell className="text-sm text-slate-300 font-mono py-3">{plot.plotId}</TableCell>
                      <TableCell className="text-sm text-white py-3 font-medium">{plot.nameTh || plot.name}</TableCell>
                      <TableCell className="text-sm text-slate-400 py-3">{plot.province}</TableCell>
                      <TableCell className="text-sm text-slate-300 py-3 text-right">{plot.altitudeMasl ? `${plot.altitudeMasl} ม.` : '—'}</TableCell>
                      <TableCell className="text-sm text-slate-300 py-3 text-right">{plot.slopeDegree ? `${plot.slopeDegree}°` : '—'}</TableCell>
                      <TableCell className="text-sm text-emerald-400 py-3 text-right font-medium">{plot.terraceCount || 5}</TableCell>
                      <TableCell className="text-sm text-amber-400 py-3 text-right font-medium">{plot.checkDamCount || 5}</TableCell>
                      <TableCell className="text-sm text-slate-300 py-3 text-right">{plot.baselineSediment && plot.projectSediment ? fmt(plot.baselineSediment - plot.projectSediment, 1) : '—'} t/ha</TableCell>
                      <TableCell className="text-sm text-slate-300 py-3 text-right">{fmt(plot.emissionReduction, 2)}</TableCell>
                      <TableCell className="py-3">
                        <Badge variant="outline" className={`text-xs px-2.5 py-0.5 ${STATUS_COLORS[plot.status] || ''}`}>
                          {STATUS_LABELS[plot.status] || plot.status}
                        </Badge>
                      </TableCell>
                    </TableRow>

                    {/* Expanded Row: Terrace Cross-Section + Vetiver Info */}
                    {expandedPlot === plot.plotId && (
                      <TableRow className="border-slate-700/30 bg-slate-900/30">
                        <TableCell colSpan={11} className="p-4">
                          <div className="space-y-4">
                            {/* Plot Info: Previous Land Use + Vetiver Coverage + Dimensions */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                              {/* Previous Land Use */}
                              <div className="bg-slate-800/50 rounded-lg border border-slate-700/30 p-4">
                                <p className="text-sm font-medium text-slate-400 mb-1 flex items-center gap-1">
                                  <TreePine className="h-3 w-3 text-orange-400" /> การใช้ประโยชน์ก่อนหน้า
                                </p>
                                {(plot as any).previousLandUse ? (
                                  <Badge variant="outline" className="text-xs bg-orange-500/10 text-orange-400 border-orange-500/30">
                                    {PREVIOUS_LAND_USE_LABELS[(plot as any).previousLandUse] || (plot as any).previousLandUse}
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-xs bg-slate-700/30 text-slate-500 border-slate-600/30">
                                    ไม่ระบุ
                                  </Badge>
                                )}
                              </div>

                              {/* Vetiver Grass Coverage */}
                              <div className="bg-slate-800/50 rounded-lg border border-slate-700/30 p-4">
                                <p className="text-sm font-medium text-slate-400 mb-1 flex items-center gap-1">
                                  <Sprout className="h-3 w-3 text-lime-400" /> หญ้าแฝกคลุมคันขอบ
                                </p>
                                <div className="flex items-center gap-2">
                                  <Progress
                                    value={(plot as any).vetiverGrassCoveragePct || 0}
                                    className="h-2 flex-1"
                                  />
                                  <span className="text-base text-lime-400 font-medium">{(plot as any).vetiverGrassCoveragePct || 0}%</span>
                                </div>
                              </div>

                              {/* Dimension Diagram */}
                              <div className="bg-slate-800/50 rounded-lg border border-slate-700/30 p-4">
                                <p className="text-sm font-medium text-slate-400 mb-1">สัดส่วนชั้นปลูก (ม.)</p>
                                <div className="flex items-stretch gap-0 h-10 rounded overflow-hidden">
                                  <div className="bg-emerald-600/40 flex items-center justify-center border-r border-slate-600/50" style={{ width: `${((plot as any).plantingAreaWidthM || 1.8) / ((plot as any).plantingAreaWidthM || 1.8 + (plot as any).ridgeWidthMPlot || 0.85) * 100}%` }}>
                                    <span className="text-xs text-emerald-300">{(plot as any).plantingAreaWidthM || 1.8}ม.</span>
                                  </div>
                                  <div className="bg-emerald-900/60 flex items-center justify-center" style={{ width: `${((plot as any).ridgeWidthMPlot || 0.85) / ((plot as any).plantingAreaWidthM || 1.8 + (plot as any).ridgeWidthMPlot || 0.85) * 100}%` }}>
                                    <span className="text-xs text-lime-300">{(plot as any).ridgeWidthMPlot || 0.85}ม.</span>
                                  </div>
                                </div>
                                <div className="flex justify-between text-xs text-slate-500 mt-1">
                                  <span>พื้นที่ปลูก</span>
                                  <span>คันแฝก</span>
                                </div>
                                <p className="text-xs text-slate-400 mt-1">รวม {fmt(((plot as any).plantingAreaWidthM || 1.8) + ((plot as any).ridgeWidthMPlot || 0.85), 2)} ม./ชั้น</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 mb-2">
                              <Layers className="h-4 w-4 text-emerald-400" />
                              <p className="text-base font-medium text-white">ภาพตัดขวางชั้นปลูก</p>
                            </div>

                            {/* Terrace Cross-Section SVG */}
                            <div className="bg-slate-900/50 rounded-lg border border-slate-700/50 p-3">
                              <TerraceCrossSection
                                layers={plotTerraces.length > 0 ? plotTerraces : generateMockTerraces(plot.plotId)}
                                checkDams={plotCheckDams.length > 0 ? plotCheckDams : generateMockCheckDams(plot.plotId)}
                              />
                            </div>

                            {/* Layer Details with Vetiver Info */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                              {(plotTerraces.length > 0 ? plotTerraces : generateMockTerraces(plot.plotId)).map((layer, i) => (
                                <div key={layer.id || i} className="bg-slate-800/50 rounded-lg border border-slate-700/30 p-4">
                                  <div className="flex items-center gap-2 mb-2">
                                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: TERRACE_COLORS[i % TERRACE_COLORS.length] }}>
                                      {layer.layerNumber || i + 1}
                                    </div>
                                    <span className="text-sm text-white font-medium">ชั้น {layer.layerNumber || i + 1}</span>
                                  </div>
                                  <div className="space-y-1 text-xs">
                                    <div className="flex justify-between">
                                      <span className="text-slate-400">พืช:</span>
                                      <span className="text-slate-200">{layer.cropType || '—'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-slate-400">พื้นที่ปลูก:</span>
                                      <span className="text-emerald-400">{layer.plantingAreaWidthM || 1.8} ม.</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-slate-400">ความลึกตะกอน:</span>
                                      <span className="text-amber-400">{layer.sedimentDepthCm || 0} cm</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-slate-400">น้ำเข้า:</span>
                                      <span className="text-blue-400">{layer.waterFlowInLpm || 0} L/min</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-slate-400">น้ำออก:</span>
                                      <span className="text-blue-300">{layer.waterFlowOutLpm || 0} L/min</span>
                                    </div>
                                    {/* Vetiver Grass Status */}
                                    <div className="mt-1 pt-1 border-t border-slate-700/30">
                                      <div className="flex justify-between items-center">
                                        <span className="text-slate-400">หญ้าแฝก:</span>
                                        <Badge variant="outline" className={`text-xs px-1 py-0 ${VETIVER_STATUS_COLORS[layer.vetiverGrassStatus || 'NONE']}`}>
                                          {VETIVER_STATUS_LABELS[layer.vetiverGrassStatus || 'NONE']}
                                        </Badge>
                                      </div>
                                      {layer.vetiverGrassStatus && layer.vetiverGrassStatus !== 'NONE' && (
                                        <>
                                          <div className="flex justify-between mt-0.5">
                                            <span className="text-slate-500">คันขอบ:</span>
                                            <span className="text-lime-400">{layer.ridgeWidthM || 0.85} ม.</span>
                                          </div>
                                          <div className="flex justify-between">
                                            <span className="text-slate-500">รากลึก:</span>
                                            <span className="text-lime-300">{layer.vetiverRootDepthCm || 0} ซม.</span>
                                          </div>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>

                            {/* Vetiver Grass Performance Summary */}
                            <div className="space-y-2">
                              <p className="text-sm font-medium text-slate-300 flex items-center gap-1">
                                <Sprout className="h-3.5 w-3.5 text-lime-400" /> ประสิทธิภาพหญ้าแฝก
                              </p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {(plotTerraces.length > 0 ? plotTerraces : generateMockTerraces(plot.plotId)).map((layer, i) => (
                                  <div key={`vetiver-${layer.id || i}`} className="bg-lime-500/5 rounded-lg border border-lime-500/20 p-4">
                                    <div className="flex items-center gap-2 mb-1">
                                      <Sprout className="h-3 w-3 text-lime-400" />
                                      <span className="text-sm text-lime-400 font-medium">ชั้น {layer.layerNumber || i + 1}</span>
                                    </div>
                                    <div className="space-y-0.5 text-xs">
                                      <div className="flex justify-between">
                                        <span className="text-slate-400">ป้องกันพังทลาย:</span>
                                        <span className="text-lime-400">{layer.vetiverErosionPreventionPct || 0}%</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-slate-400">ตะกอนเพิ่ม:</span>
                                        <span className="text-amber-300">{layer.vetiverSedimentAccumulationKg || 0} กก.</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-slate-400">กักคาร์บอน:</span>
                                        <span className="text-emerald-400">{layer.vetiverCarbonSequestrationKg || 0} กก.</span>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Check Dam Details */}
                            <div className="space-y-2">
                              <p className="text-sm font-medium text-slate-300 flex items-center gap-1">
                                <Dam className="h-3.5 w-3.5 text-amber-400" /> ฝายชะลอน้ำ
                              </p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {(plotCheckDams.length > 0 ? plotCheckDams : generateMockCheckDams(plot.plotId)).map((dam, i) => (
                                  <div key={dam.id || i} className="bg-amber-500/5 rounded-lg border border-amber-500/20 p-4">
                                    <div className="flex items-center gap-2 mb-1">
                                      <div className="w-2 h-4 rounded-sm bg-amber-500" />
                                      <span className="text-sm text-amber-400 font-medium">ฝาย ชั้น {i + 1}</span>
                                    </div>
                                    <div className="space-y-0.5 text-xs">
                                      <div className="flex justify-between">
                                        <span className="text-slate-400">ประเภท:</span>
                                        <span className="text-slate-200">{CHECK_DAM_TYPE_OPTIONS.find(o => o.value === dam.damType)?.label || dam.damType}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-slate-400">ตะกอนที่กัก:</span>
                                        <span className="text-amber-300">{dam.sedimentTrappedKg || 0} กก.</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-slate-400">ประสิทธิภาพ:</span>
                                        <span className="text-emerald-400">{((dam.efficiency || 0) * 100).toFixed(0)}%</span>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
