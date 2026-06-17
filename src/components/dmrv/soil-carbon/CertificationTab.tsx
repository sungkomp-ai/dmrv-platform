'use client';

import React from 'react';
import { Award, FileCheck, CheckCircle2, Eye, FileText, Clock, Mountain } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { SoilCarbonPlot, CertificationRecord } from './types';
import { STATUS_COLORS, STATUS_LABELS, CERT_CHECKLIST_ITEMS, fmt, fmtDateTime } from './constants';

interface CertificationTabProps {
  eligiblePlots: SoilCarbonPlot[];
  certStep: Record<string, number>;
  setCertStep: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  certChecklist: Record<string, Record<string, boolean>>;
  setCertChecklist: React.Dispatch<React.SetStateAction<Record<string, Record<string, boolean>>>>;
  certHistory: CertificationRecord[];
  handleCertifyPlot: (plotId: string) => void;
  toggleCertCheck: (plotId: string, key: string) => void;
}

export default function CertificationTab({
  eligiblePlots,
  certStep,
  setCertStep,
  certChecklist,
  setCertChecklist,
  certHistory,
  handleCertifyPlot,
  toggleCertCheck,
}: CertificationTabProps) {
  return (
    <>
      {/* Eligible Plots */}
      <Card className="bg-slate-800/50 border-slate-700/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-slate-200 flex items-center gap-2">
            <Award className="h-4 w-4 text-emerald-400" /> แปลงที่มีสิทธิ์ขอรับรอง
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            แสดงเฉพาะแปลงที่มีสถานะ &quot;กำลังติดตาม&quot; หรือ &quot;ตรวจสอบแล้ว&quot;
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {eligiblePlots.length === 0 ? (
            <div className="text-center py-8">
              <FileCheck className="h-10 w-10 text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-500">ไม่มีแปลงที่มีสิทธิ์ขอรับรองในขณะนี้</p>
              <p className="text-xs text-slate-600">แปลงต้องมีสถานะ MONITORING หรือ VERIFIED จึงจะสามารถขอรับรองได้</p>
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto custom-scrollbar space-y-3">
              {eligiblePlots.map(plot => {
                const step = certStep[plot.plotId] || 0;
                const checks = certChecklist[plot.plotId] || {};
                const allChecked = CERT_CHECKLIST_ITEMS.every(item => checks[item.key]);
                return (
                  <div key={plot.id} className="bg-slate-900/50 rounded-lg border border-slate-700/50 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-emerald-500/10">
                          <Mountain className="h-5 w-5 text-emerald-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">{plot.nameTh || plot.name}</p>
                          <p className="text-xs text-slate-400">{plot.plotId} · {plot.province} · {fmt(plot.areaRai, 1)} ไร่ · {plot.terraceCount || 5} ชั้นปลูก</p>
                        </div>
                      </div>
                      <Badge variant="outline" className={`text-xs px-2 py-0 ${STATUS_COLORS[plot.status] || ''}`}>
                        {STATUS_LABELS[plot.status] || plot.status}
                      </Badge>
                    </div>

                    {/* Certification Workflow Steps */}
                    <div className="flex items-center gap-2 mb-3">
                      {['เลือกแปลง', 'ตรวจสอบข้อมูล', 'รับรอง'].map((label, i) => (
                        <React.Fragment key={i}>
                          <div className="flex items-center gap-1.5">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                              step >= i ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-400'
                            }`}>
                              {step > i ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
                            </div>
                            <span className={`text-xs ${step >= i ? 'text-emerald-400' : 'text-slate-500'}`}>{label}</span>
                          </div>
                          {i < 2 && <div className={`flex-1 h-0.5 ${step > i ? 'bg-emerald-500' : 'bg-slate-700'}`} />}
                        </React.Fragment>
                      ))}
                    </div>

                    {/* Step Content */}
                    {step === 0 && (
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm"
                        onClick={() => setCertStep(prev => ({ ...prev, [plot.plotId]: 1 }))}
                      >
                        <Eye className="h-3 w-3 mr-1" /> เริ่มตรวจสอบ
                      </Button>
                    )}

                    {step === 1 && (
                      <div className="space-y-3">
                        <p className="text-sm text-slate-300 font-medium">ตรวจสอบรายการดังต่อไปนี้:</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {CERT_CHECKLIST_ITEMS.map(item => (
                            <button
                              key={item.key}
                              onClick={() => toggleCertCheck(plot.plotId, item.key)}
                              className={`flex items-start gap-2 p-3 rounded text-left text-sm transition-colors ${
                                checks[item.key]
                                  ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                                  : 'bg-slate-800/50 border border-slate-700/30 text-slate-400 hover:bg-slate-700/50'
                              }`}
                            >
                              {checks[item.key] ? (
                                <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                              ) : (
                                <div className="h-4 w-4 rounded-full border border-slate-600 flex-shrink-0 mt-0.5" />
                              )}
                              {item.label}
                            </button>
                          ))}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm"
                            disabled={!allChecked}
                            onClick={() => setCertStep(prev => ({ ...prev, [plot.plotId]: 2 }))}
                          >
                            <FileCheck className="h-3 w-3 mr-1" /> ยืนยันการตรวจสอบ
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-slate-600 text-slate-400 text-sm"
                            onClick={() => setCertStep(prev => ({ ...prev, [plot.plotId]: 0 }))}
                          >
                            ย้อนกลับ
                          </Button>
                        </div>
                      </div>
                    )}

                    {step === 2 && (
                      <div className="space-y-3">
                        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                          <p className="text-sm text-emerald-300 mb-1">พร้อมรับรองเครดิตคาร์บอน</p>
                          <p className="text-xs text-slate-400">
                            แปลง {plot.nameTh || plot.name} ผ่านการตรวจสอบทุกข้อ สามารถดำเนินการรับรองได้
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm"
                            onClick={() => handleCertifyPlot(plot.plotId)}
                          >
                            <Award className="h-3 w-3 mr-1" /> รับรองเครดิตคาร์บอน
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-slate-600 text-slate-400 text-sm"
                            onClick={() => setCertStep(prev => ({ ...prev, [plot.plotId]: 1 }))}
                          >
                            ย้อนกลับ
                          </Button>
                        </div>
                      </div>
                    )}

                    {step === 3 && (
                      <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                        <div className="flex items-center gap-2 mb-1">
                          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                          <p className="text-sm text-emerald-300 font-medium">รับรองเครดิตคาร์บอนสำเร็จ</p>
                        </div>
                        <p className="text-xs text-slate-400">
                          Certificate ID: {certHistory.find(c => c.plotId === plot.plotId)?.certificateId || `T-VER-${plot.plotId}`}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Certification Requirements (Updated) */}
        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-slate-200 flex items-center gap-2">
              <FileText className="h-4 w-4 text-yellow-400" /> ข้อกำหนดการรับรอง T-VER-SOIL-01 (ขั้นบันได/ฝาย)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm max-h-80 overflow-y-auto custom-scrollbar">
              <div className="flex items-start gap-2 p-2 rounded bg-slate-900/50">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-slate-200">ข้อมูลชั้นปลูกครบถ้วน</p>
                  <p className="text-xs text-slate-500">ระบุจำนวน ความกว้าง ความสูงของแต่ละชั้นปลูก พร้อมข้อมูลพืชและตะกอน</p>
                </div>
              </div>
              <div className="flex items-start gap-2 p-2 rounded bg-slate-900/50">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-slate-200">ข้อมูลฝายชะลอน้ำครบถ้วน</p>
                  <p className="text-xs text-slate-500">ระบุประเภท ขนาด ประสิทธิภาพของฝายในแต่ละชั้น</p>
                </div>
              </div>
              <div className="flex items-start gap-2 p-2 rounded bg-slate-900/50">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-slate-200">ตะกอนดินที่กักได้มีการวัด</p>
                  <p className="text-xs text-slate-500">ต้องมีข้อมูลการวัดปริมาณตะกอนดินที่กักได้ในแต่ละชั้นปลูกและหลังฝาย</p>
                </div>
              </div>
              <div className="flex items-start gap-2 p-2 rounded bg-slate-900/50">
                <CheckCircle2 className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-slate-200">ประสิทธิภาพฝายชะลอน้ำ ≥ 60%</p>
                  <p className="text-xs text-slate-500">ฝายชะลอน้ำทุกแห่งต้องมีประสิทธิภาพในการกักตะกอนอย่างน้อย 60%</p>
                </div>
              </div>
              <div className="flex items-start gap-2 p-2 rounded bg-slate-900/50">
                <CheckCircle2 className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-slate-200">อัตราการพังทลายลดลง ≥ 50%</p>
                  <p className="text-xs text-slate-500">อัตราการพังทลายของดินหลังโครงการต้องลดลงอย่างน้อย 50% จาก Baseline</p>
                </div>
              </div>
              <div className="flex items-start gap-2 p-2 rounded bg-slate-900/50">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-slate-200">ขอบเขตโครงการชัดเจน</p>
                  <p className="text-xs text-slate-500">ระบุพิกัด GPS และพื้นที่แปลงที่สอดคล้องกับหลักฐานสิทธิ์การใช้ที่ดิน</p>
                </div>
              </div>
              <div className="flex items-start gap-2 p-2 rounded bg-slate-900/50">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-slate-200">Baseline SOC สมบูรณ์</p>
                  <p className="text-xs text-slate-500">ต้องมีข้อมูล Baseline SOC จากการวัดภาคสนามหรือห้องปฏิบัติการ</p>
                </div>
              </div>
              <div className="flex items-start gap-2 p-2 rounded bg-slate-900/50">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-slate-200">หักค่าความไม่แน่นอน (Buffer) 20%</p>
                  <p className="text-xs text-slate-500">ตาม T-VER-SOIL-01 ต้องหัก Buffer Pool 20% จาก Gross Credits</p>
                </div>
              </div>
              <div className="flex items-start gap-2 p-2 rounded bg-slate-900/50">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-slate-200">Additionality & Permanence</p>
                  <p className="text-xs text-slate-500">พิสูจน์การเพิ่มขึ้นของการกักคาร์บอนได้ และมีแผนรักษาความคงตัวอย่างน้อย 10 ปี</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Certification History */}
        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-slate-200 flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-400" /> ประวัติการรับรอง
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {certHistory.length === 0 ? (
              <div className="text-center py-6">
                <Award className="h-8 w-8 text-slate-700 mx-auto mb-2" />
                <p className="text-sm text-slate-500">ยังไม่มีประวัติการรับรอง</p>
              </div>
            ) : (
              <div className="max-h-80 overflow-y-auto custom-scrollbar space-y-2">
                {certHistory.map((cert, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded bg-slate-900/50 border border-slate-700/30">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                      <div>
                        <p className="text-sm text-white font-medium">{cert.plotNameTh || cert.plotName}</p>
                        <p className="text-xs text-slate-400">{cert.plotId} · {cert.province}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-emerald-400 font-medium">{fmt(cert.netCredits, 2)} tCO₂e</p>
                      <p className="text-xs text-slate-500">{fmtDateTime(cert.certifiedAt || '')}</p>
                      <p className="text-[9px] text-slate-600 font-mono">{cert.certificateId}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
