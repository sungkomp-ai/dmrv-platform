// ─── Shared Constants, Labels & Helpers for Soil Carbon DMRV ─────

import type { TerraceLayer, CheckDam } from './types';

// ─── Color Palette (vivid, high-contrast) ───────────────────────
export const COLORS = ['#34d399', '#fbbf24', '#60a5fa', '#f87171', '#a78bfa', '#f472b6', '#22d3ee', '#a3e635', '#fb923c', '#818cf8'];
export const TERRACE_COLORS = ['#047857', '#059669', '#10b981', '#34d399', '#6ee7b7'];
export const CREDIT_SOURCE_COLORS = ['#34d399', '#fbbf24', '#60a5fa', '#a3e635', '#f87171', '#a78bfa'];

export const STATUS_COLORS: Record<string, string> = {
  REGISTERED: 'bg-sky-500/25 text-sky-300 border-sky-500/50',
  MONITORING: 'bg-amber-500/25 text-amber-300 border-amber-500/50',
  VERIFIED: 'bg-green-500/25 text-green-300 border-green-500/50',
  CERTIFIED: 'bg-emerald-500/25 text-emerald-300 border-emerald-500/50',
  SUSPENDED: 'bg-red-500/25 text-red-300 border-red-500/50',
};

export const QUALITY_COLORS: Record<string, string> = {
  RAW: 'bg-slate-500/25 text-slate-300 border-slate-500/50',
  VALIDATED: 'bg-green-500/25 text-green-300 border-green-500/50',
  CERTIFIED: 'bg-emerald-500/25 text-emerald-300 border-emerald-500/50',
  REJECTED: 'bg-red-500/25 text-red-300 border-red-500/50',
  ANOMALY: 'bg-orange-500/25 text-orange-300 border-orange-500/50',
};

// ─── Label Maps ──────────────────────────────────────────────────
export const LAND_USE_LABELS: Record<string, string> = {
  paddy: 'นาข้าว',
  upland: 'ไร่พืชไร่',
  agroforestry: 'วนเกษตร',
  orchard: 'สวนผลไม้',
  pasture: 'ทุ่งหญ้าเลี้ยงสัตว์',
  terraced: 'ขั้นบันได',
};

export const PRACTICE_LABELS: Record<string, string> = {
  conventional: 'การเกษตรแบบดั้งเดิม',
  organic: 'อินทรีย์',
  conservation_tillage: 'การไถน้อย/อนุรักษ์ดิน',
  cover_crop: 'ปลูกพืชคลุมดิน',
  biochar: 'ไบโอชาร์',
  awd: 'ระบบ AWD',
  agroforestry: 'วนเกษตร',
  no_till: 'ไม่ไถพรวน',
  crop_rotation: 'หมุนเวียนพืช',
  integrated_farming: 'เกษตรผสมผสาน',
  terraced_farming: 'เกษตรขั้นบันได/ฝายชะลอน้ำ',
};

export const STATUS_LABELS: Record<string, string> = {
  REGISTERED: 'ลงทะเบียน',
  MONITORING: 'กำลังติดตาม',
  VERIFIED: 'ตรวจสอบแล้ว',
  CERTIFIED: 'รับรองแล้ว',
  SUSPENDED: 'ระงับ',
};

export const QUALITY_LABELS: Record<string, string> = {
  RAW: 'ดิบ',
  VALIDATED: 'ผ่านการตรวจสอบ',
  CERTIFIED: 'รับรองแล้ว',
  REJECTED: 'ปฏิเสธ',
  ANOMALY: 'ค่าผิดปกติ',
};

export const SLOPE_ASPECT_OPTIONS = [
  { value: 'N', label: 'ทิศเหนือ (N)' },
  { value: 'NE', label: 'ทิศตะวันออกเฉียงเหนือ (NE)' },
  { value: 'E', label: 'ทิศตะวันออก (E)' },
  { value: 'SE', label: 'ทิศตะวันออกเฉียงใต้ (SE)' },
  { value: 'S', label: 'ทิศใต้ (S)' },
  { value: 'SW', label: 'ทิศตะวันตกเฉียงใต้ (SW)' },
  { value: 'W', label: 'ทิศตะวันตก (W)' },
  { value: 'NW', label: 'ทิศตะวันตกเฉียงเหนือ (NW)' },
];

export const CHECK_DAM_TYPE_OPTIONS = [
  { value: 'stone', label: 'ฝายหิน' },
  { value: 'concrete', label: 'ฝายคอนกรีต' },
  { value: 'log', label: 'ฝายไม้ซุง' },
  { value: 'gabion', label: 'ฝายตะกร้าหิน' },
  { value: 'earth', label: 'ฝายดิน' },
];

export const PREVIOUS_LAND_USE_LABELS: Record<string, string> = {
  slash_and_burn: 'ไร่เลื่อนลอย → เกษตรกักตะกอนดิน',
  conventional: 'การเกษตรแบบดั้งเดิม → กักตะกอนดิน',
  degraded_forest: 'ป่าเสื่อมโทรม → วนเกษตร',
  abandoned_mining: 'พื้นที่เหมืองที่ถูกทิ้ง → ฟื้นฟู',
  grassland: 'ทุ่งหญ้า → เกษตรกักตะกอนดิน',
};

export const VETIVER_STATUS_LABELS: Record<string, string> = {
  NONE: 'ยังไม่ปลูก',
  PLANTED: 'ปลูกแล้ว (เริ่มต้น)',
  ESTABLISHED: 'ตั้งตัวแล้ว',
  MATURE: 'เติบโตเต็มที่',
};

export const VETIVER_STATUS_COLORS: Record<string, string> = {
  NONE: 'bg-slate-500/25 text-slate-300 border-slate-500/50',
  PLANTED: 'bg-amber-500/25 text-amber-300 border-amber-500/50',
  ESTABLISHED: 'bg-green-500/25 text-green-300 border-green-500/50',
  MATURE: 'bg-emerald-500/25 text-emerald-300 border-emerald-500/50',
};

// ─── Certification Checklist Items ────────────────────────────────
export const CERT_CHECKLIST_ITEMS = [
  { key: 'boundary', label: 'ขอบเขตแปลงชัดเจน พร้อมพิกัด GPS' },
  { key: 'baseline', label: 'ข้อมูล Baseline SOC สมบูรณ์' },
  { key: 'monitoring', label: 'ข้อมูลการติดตามต่อเนื่อง ≥ 1 ปี' },
  { key: 'measurements', label: 'จำนวนการวัดเพียงพอ (≥ 3 ครั้ง)' },
  { key: 'quality', label: 'ข้อมูลผ่านการตรวจสอบคุณภาพ (VALIDATED/CERTIFIED)' },
  { key: 'methodology', label: 'ปฏิบัติตามวิธีการ T-VER-SOIL-01' },
  { key: 'additionality', label: 'พิสูจน์การเพิ่มขึ้น (Additionality) ได้' },
  { key: 'permanence', label: 'แผนรักษาความคงตัว (Permanence) ชัดเจน' },
  { key: 'terrace_data', label: 'ข้อมูลชั้นปลูกครบถ้วน' },
  { key: 'check_dam_data', label: 'ข้อมูลฝายชะลอน้ำครบถ้วน' },
  { key: 'sediment_measured', label: 'ตะกอนดินที่กักได้มีการวัด' },
  { key: 'dam_efficiency', label: 'ประสิทธิภาพฝายชะลอน้ำ ≥ 60%' },
  { key: 'erosion_reduction', label: 'อัตราการพังทลายลดลง ≥ 50%' },
  { key: 'vetiver_data', label: 'ข้อมูลหญ้าแฝกครบถ้วน (สถานะ/ความหนาแน่น)' },
  { key: 'vetiver_ridge_width', label: 'คันขอบหญ้าแฝกกว้าง 0.7-1.0 ม.' },
  { key: 'planting_area_width', label: 'พื้นที่ปลูกกว้าง 1.5-2.0 ม.' },
];

// ─── Helper Functions ────────────────────────────────────────────
export const fmt = (n: number, decimals = 2) => {
  if (n === undefined || n === null || isNaN(n)) return '—';
  return n.toLocaleString('th-TH', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
};

export const fmtDate = (d: string) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
};

export const fmtDateTime = (d: string) => {
  if (!d) return '—';
  return new Date(d).toLocaleString('th-TH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

// ─── Mock Data Generators ────────────────────────────────────────
export function generateMockTerraces(plotId: string): TerraceLayer[] {
  const layers: TerraceLayer[] = [];
  const count = 5;
  const vetiverStatuses = ['MATURE', 'ESTABLISHED', 'MATURE', 'PLANTED', 'MATURE'];
  for (let i = 1; i <= count; i++) {
    const ridgeWidth = +(0.7 + Math.random() * 0.3).toFixed(2);
    const plantingWidth = +(1.5 + Math.random() * 0.5).toFixed(2);
    const status = vetiverStatuses[i - 1] || 'NONE';
    layers.push({
      id: `T-${plotId}-${i}`,
      plotId,
      layerNumber: i,
      cropType: i <= 2 ? 'ข้าว' : i <= 4 ? 'ผัก' : 'ไม้ผล',
      widthM: +(ridgeWidth + plantingWidth).toFixed(2),
      plantingAreaWidthM: plantingWidth,
      sedimentDepthCm: +(2 + i * 1.5).toFixed(1),
      waterFlowInLpm: +(80 - i * 12).toFixed(1),
      waterFlowOutLpm: +(65 - i * 10).toFixed(1),
      sedimentTrappedKg: +(50 + i * 30).toFixed(1),
      socPct: +(1.5 + i * 0.3).toFixed(2),
      heightM: 1.5,
      createdAt: new Date().toISOString(),
      ridgeWidthM: ridgeWidth,
      vetiverGrassStatus: status,
      vetiverRootDepthCm: status === 'MATURE' ? 200 + i * 30 : status === 'ESTABLISHED' ? 120 + i * 20 : status === 'PLANTED' ? 40 + i * 10 : 0,
      vetiverPlantDensity: status === 'MATURE' ? 8 + i * 2 : status === 'ESTABLISHED' ? 6 + i : status === 'PLANTED' ? 3 : 0,
      vetiverErosionPreventionPct: status === 'MATURE' ? 70 + i * 3 : status === 'ESTABLISHED' ? 50 + i * 3 : status === 'PLANTED' ? 20 + i * 2 : 0,
      vetiverSedimentAccumulationKg: status === 'MATURE' ? +(15 + i * 8).toFixed(1) : status === 'ESTABLISHED' ? +(8 + i * 4).toFixed(1) : status === 'PLANTED' ? +(2 + i).toFixed(1) : 0,
      vetiverCarbonSequestrationKg: status === 'MATURE' ? +(5 + i * 2.5).toFixed(2) : status === 'ESTABLISHED' ? +(2.5 + i * 1.2).toFixed(2) : status === 'PLANTED' ? +(0.5 + i * 0.2).toFixed(2) : 0,
    });
  }
  return layers;
}

export function generateMockCheckDams(plotId: string): CheckDam[] {
  const dams: CheckDam[] = [];
  const count = 5;
  for (let i = 1; i <= count; i++) {
    dams.push({
      id: `CD-${plotId}-${i}`,
      plotId,
      terraceLayerId: `T-${plotId}-${i}`,
      damType: ['stone', 'gabion', 'concrete', 'log', 'stone'][i - 1],
      heightM: 1.2,
      widthM: 3.5,
      sedimentTrappedKg: +(40 + i * 25).toFixed(1),
      efficiency: +(0.6 + i * 0.05).toFixed(2),
      createdAt: new Date().toISOString(),
    });
  }
  return dams;
}
