'use client';

import React from 'react';
import {
  Sprout, BarChart3, Activity, Calculator, FileCheck, Plus, RefreshCw,
  Mountain, Layers, Dam, Waves,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SLOPE_ASPECT_OPTIONS, CHECK_DAM_TYPE_OPTIONS } from './soil-carbon/constants';
import { useSoilCarbonState } from './soil-carbon/useSoilCarbonState';
import OverviewTab from './soil-carbon/OverviewTab';
import PlotsTab from './soil-carbon/PlotsTab';
import IngestionTab from './soil-carbon/IngestionTab';
import CalculatorTab from './soil-carbon/CalculatorTab';
import CertificationTab from './soil-carbon/CertificationTab';

export default function SoilCarbonAgentView() {
  const s = useSoilCarbonState();

  if (s.loading) {
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <div className="text-center space-y-4">
          <RefreshCw className="h-10 w-10 animate-spin text-emerald-400 mx-auto" />
          <p className="text-slate-300">กำลังโหลดข้อมูล Soil Carbon Agent...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="p-5 rounded-xl bg-gradient-to-r from-emerald-500/25 via-emerald-500/10 to-slate-800/60 border-2 border-emerald-500/40 shadow-lg shadow-emerald-500/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-emerald-500/25 border border-emerald-400/40 shadow-inner">
              <Mountain className="h-6 w-6 text-emerald-300" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Soil Carbon — เกษตรกักตะกอนดิน & หญ้าแฝก</h1>
              <p className="text-sm text-emerald-100/80">ระบบติดตามและรับรองโครงการกักคาร์บอนในดิน — พื้นที่สูง/ลาดชัน — คันขอบหญ้าแฝก — T-VER-SOIL-01</p>
            </div>
          </div>
          <Button variant="outline" size="sm" className="border-emerald-500/50 text-emerald-200 hover:bg-emerald-500/20"
            onClick={() => { s.fetchPlots(); s.fetchMeasurements(); s.fetchTerraces(); s.fetchCheckDams(); }}>
            <RefreshCw className="h-4 w-4 mr-1" /> รีเฟรช
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={s.activeTab} onValueChange={s.setActiveTab}>
        <TabsList className="bg-slate-800/70 border border-slate-600/50">
          <TabsTrigger value="overview" className="text-sm data-[state=active]:bg-emerald-500/30 data-[state=active]:text-emerald-200 data-[state=active]:shadow-inner">
            <BarChart3 className="h-4 w-4 mr-1" /> ภาพรวม
          </TabsTrigger>
          <TabsTrigger value="plots" className="text-sm data-[state=active]:bg-emerald-500/30 data-[state=active]:text-emerald-200 data-[state=active]:shadow-inner">
            <Sprout className="h-4 w-4 mr-1" /> แปลงเกษตร
          </TabsTrigger>
          <TabsTrigger value="ingestion" className="text-sm data-[state=active]:bg-emerald-500/30 data-[state=active]:text-emerald-200 data-[state=active]:shadow-inner">
            <Activity className="h-4 w-4 mr-1" /> รับข้อมูล
          </TabsTrigger>
          <TabsTrigger value="calculator" className="text-sm data-[state=active]:bg-emerald-500/30 data-[state=active]:text-emerald-200 data-[state=active]:shadow-inner">
            <Calculator className="h-4 w-4 mr-1" /> คำนวณคาร์บอน
          </TabsTrigger>
          <TabsTrigger value="certification" className="text-sm data-[state=active]:bg-emerald-500/30 data-[state=active]:text-emerald-200 data-[state=active]:shadow-inner">
            <FileCheck className="h-4 w-4 mr-1" /> รับรอง
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <OverviewTab summary={s.summary} sedimentByLayerData={s.sedimentByLayerData}
            waterFlowData={s.waterFlowData} creditSourceData={s.creditSourceData} latestPlots={s.latestPlots} />
        </TabsContent>

        <TabsContent value="plots" className="space-y-4">
          <PlotsTab filteredPlots={s.filteredPlots} provinceFilter={s.provinceFilter}
            setProvinceFilter={s.setProvinceFilter} provinces={s.provinces} expandedPlot={s.expandedPlot}
            plotTerraces={s.plotTerraces} plotCheckDams={s.plotCheckDams}
            onOpenNewPlotDialog={() => s.setShowNewPlotDialog(true)} handleToggleExpand={s.handleToggleExpand} />
        </TabsContent>

        <TabsContent value="ingestion" className="space-y-4">
          <IngestionTab selectedTerraceLayer={s.selectedTerraceLayer}
            setSelectedTerraceLayer={s.setSelectedTerraceLayer} latestSensorData={s.latestSensorData}
            qualitySummary={s.qualitySummary} batchData={s.batchData} setBatchData={s.setBatchData}
            ingesting={s.ingesting} ingestResult={s.ingestResult} autoRefresh={s.autoRefresh}
            setAutoRefresh={s.setAutoRefresh} handleIngest={s.handleIngest} />
        </TabsContent>

        <TabsContent value="calculator" className="space-y-4">
          <CalculatorTab calcPlotId={s.calcPlotId} setCalcPlotId={s.setCalcPlotId}
            calcStartDate={s.calcStartDate} setCalcStartDate={s.setCalcStartDate}
            calcEndDate={s.calcEndDate} setCalcEndDate={s.setCalcEndDate}
            calculating={s.calculating} calcDetail={s.calcDetail} plots={s.plots}
            terraces={s.terraces} checkDams={s.checkDams} handleCalculate={s.handleCalculate} />
        </TabsContent>

        <TabsContent value="certification" className="space-y-4">
          <CertificationTab eligiblePlots={s.eligiblePlots} certStep={s.certStep}
            setCertStep={s.setCertStep} certChecklist={s.certChecklist}
            setCertChecklist={s.setCertChecklist} certHistory={s.certHistory}
            handleCertifyPlot={s.handleCertifyPlot} toggleCertCheck={s.toggleCertCheck} />
        </TabsContent>
      </Tabs>

      {/* New Plot Dialog */}
      <Dialog open={s.showNewPlotDialog} onOpenChange={s.setShowNewPlotDialog}>
        <DialogContent className="bg-slate-900 border-slate-700 max-h-[85vh] overflow-y-auto custom-scrollbar">
          <DialogHeader>
            <DialogTitle className="text-white">เพิ่มแปลงเกษตรขั้นบันได</DialogTitle>
            <DialogDescription className="text-slate-400">กรอกข้อมูลแปลงใหม่ รวมข้อมูลชั้นปลูกและฝายชะลอน้ำ</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <p className="text-xs text-slate-300 font-semibold">ข้อมูลพื้นฐาน</p>
              <div className="grid grid-cols-2 gap-2">
                <div><Label className="text-xs text-slate-400">Plot ID *</Label><Input className="bg-slate-800 border-slate-600 text-white text-sm" value={s.newPlotForm.plotId} onChange={e => s.setNewPlotForm(p => ({ ...p, plotId: e.target.value }))} placeholder="SOIL-XXX-001" /></div>
                <div><Label className="text-xs text-slate-400">ชื่อแปลง *</Label><Input className="bg-slate-800 border-slate-600 text-white text-sm" value={s.newPlotForm.name} onChange={e => s.setNewPlotForm(p => ({ ...p, name: e.target.value }))} placeholder="ชื่อแปลง" /></div>
                <div><Label className="text-xs text-slate-400">ชื่อภาษาไทย</Label><Input className="bg-slate-800 border-slate-600 text-white text-sm" value={s.newPlotForm.nameTh} onChange={e => s.setNewPlotForm(p => ({ ...p, nameTh: e.target.value }))} placeholder="ชื่อแปลงภาษาไทย" /></div>
                <div><Label className="text-xs text-slate-400">จังหวัด</Label><Input className="bg-slate-800 border-slate-600 text-white text-sm" value={s.newPlotForm.province} onChange={e => s.setNewPlotForm(p => ({ ...p, province: e.target.value }))} placeholder="จังหวัด" /></div>
                <div><Label className="text-xs text-slate-400">พื้นที่ (ไร่)</Label><Input className="bg-slate-800 border-slate-600 text-white text-sm" type="number" value={s.newPlotForm.areaRai} onChange={e => s.setNewPlotForm(p => ({ ...p, areaRai: e.target.value }))} /></div>
                <div><Label className="text-xs text-slate-400">ประเภทพืช</Label><Input className="bg-slate-800 border-slate-600 text-white text-sm" value={s.newPlotForm.cropType} onChange={e => s.setNewPlotForm(p => ({ ...p, cropType: e.target.value }))} placeholder="ข้าว, ผัก, ไม้ผล" /></div>
              </div>
            </div>
            <Separator className="bg-slate-700" />
            <div className="space-y-2">
              <p className="text-xs text-slate-300 font-semibold flex items-center gap-1"><Mountain className="h-3.5 w-3.5 text-emerald-400" /> ข้อมูลภูมิประเทศ</p>
              <div className="grid grid-cols-2 gap-2">
                <div><Label className="text-xs text-slate-400">ระดับความสูง (ม.จรดทะเล)</Label><Input className="bg-slate-800 border-slate-600 text-white text-sm" type="number" value={s.newPlotForm.altitudeMasl} onChange={e => s.setNewPlotForm(p => ({ ...p, altitudeMasl: e.target.value }))} placeholder="เช่น 350" /></div>
                <div><Label className="text-xs text-slate-400">ความลาดชัน (องศา)</Label><Input className="bg-slate-800 border-slate-600 text-white text-sm" type="number" value={s.newPlotForm.slopeDegree} onChange={e => s.setNewPlotForm(p => ({ ...p, slopeDegree: e.target.value }))} placeholder="เช่น 25" /></div>
                <div><Label className="text-xs text-slate-400">ทิศทางความลาด</Label><Select value={s.newPlotForm.slopeAspect} onValueChange={v => s.setNewPlotForm(p => ({ ...p, slopeAspect: v }))}><SelectTrigger className="bg-slate-800 border-slate-600 text-white text-sm"><SelectValue /></SelectTrigger><SelectContent className="bg-slate-800 border-slate-600">{SLOPE_ASPECT_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent></Select></div>
                <div><Label className="text-xs text-slate-400">ประเภทดิน</Label><Input className="bg-slate-800 border-slate-600 text-white text-sm" value={s.newPlotForm.soilType} onChange={e => s.setNewPlotForm(p => ({ ...p, soilType: e.target.value }))} placeholder="Clay Loam" /></div>
              </div>
            </div>
            <Separator className="bg-slate-700" />
            <div className="space-y-2">
              <p className="text-xs text-slate-300 font-semibold flex items-center gap-1"><Layers className="h-3.5 w-3.5 text-emerald-400" /> ข้อมูลชั้นปลูก</p>
              <div className="grid grid-cols-3 gap-2">
                <div><Label className="text-xs text-slate-400">จำนวนชั้นปลูก</Label><Input className="bg-slate-800 border-slate-600 text-white text-sm" type="number" value={s.newPlotForm.terraceCount} onChange={e => s.setNewPlotForm(p => ({ ...p, terraceCount: e.target.value }))} /></div>
                <div><Label className="text-xs text-slate-400">ความกว้างชั้น (ม.)</Label><Input className="bg-slate-800 border-slate-600 text-white text-sm" type="number" value={s.newPlotForm.terraceWidthM} onChange={e => s.setNewPlotForm(p => ({ ...p, terraceWidthM: e.target.value }))} placeholder="4" /></div>
                <div><Label className="text-xs text-slate-400">ความสูงชั้น (ม.)</Label><Input className="bg-slate-800 border-slate-600 text-white text-sm" type="number" value={s.newPlotForm.terraceHeightM} onChange={e => s.setNewPlotForm(p => ({ ...p, terraceHeightM: e.target.value }))} placeholder="1.5" /></div>
              </div>
            </div>
            <Separator className="bg-slate-700" />
            <div className="space-y-2">
              <p className="text-xs text-slate-300 font-semibold flex items-center gap-1"><Dam className="h-3.5 w-3.5 text-amber-400" /> ข้อมูลฝายชะลอน้ำ</p>
              <div className="grid grid-cols-2 gap-2">
                <div><Label className="text-xs text-slate-400">จำนวนฝาย</Label><Input className="bg-slate-800 border-slate-600 text-white text-sm" type="number" value={s.newPlotForm.checkDamCount} onChange={e => s.setNewPlotForm(p => ({ ...p, checkDamCount: e.target.value }))} /></div>
                <div><Label className="text-xs text-slate-400">ประเภทฝาย</Label><Select value={s.newPlotForm.checkDamType} onValueChange={v => s.setNewPlotForm(p => ({ ...p, checkDamType: v }))}><SelectTrigger className="bg-slate-800 border-slate-600 text-white text-sm"><SelectValue /></SelectTrigger><SelectContent className="bg-slate-800 border-slate-600">{CHECK_DAM_TYPE_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent></Select></div>
              </div>
            </div>
            <Separator className="bg-slate-700" />
            <div className="space-y-2">
              <p className="text-xs text-slate-300 font-semibold flex items-center gap-1"><Waves className="h-3.5 w-3.5 text-blue-400" /> ข้อมูลตะกอนพื้นฐาน</p>
              <div className="grid grid-cols-2 gap-2">
                <div><Label className="text-xs text-slate-400">ตะกอน Baseline (t/ha/yr)</Label><Input className="bg-slate-800 border-slate-600 text-white text-sm" type="number" value={s.newPlotForm.baselineSediment} onChange={e => s.setNewPlotForm(p => ({ ...p, baselineSediment: e.target.value }))} placeholder="8" /></div>
                <div><Label className="text-xs text-slate-400">ตะกอนโครงการ (t/ha/yr)</Label><Input className="bg-slate-800 border-slate-600 text-white text-sm" type="number" value={s.newPlotForm.projectSediment} onChange={e => s.setNewPlotForm(p => ({ ...p, projectSediment: e.target.value }))} placeholder="3" /></div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="border-slate-600 text-slate-400" onClick={() => s.setShowNewPlotDialog(false)}>ยกเลิก</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={s.handleCreatePlot} disabled={s.creatingPlot || !s.newPlotForm.plotId || !s.newPlotForm.name}>
              {s.creatingPlot ? <RefreshCw className="h-4 w-4 mr-1 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}สร้างแปลง
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Custom Scrollbar Styles */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #475569; border-radius: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #64748b; }
      `}</style>
    </div>
  );
}
