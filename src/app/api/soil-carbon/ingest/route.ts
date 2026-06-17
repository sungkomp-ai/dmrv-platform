/**
 * POST /api/soil-carbon/ingest
 * ──────────────────────────────────────────────
 * นำเข้าข้อมูลเซ็นเซอร์แบบกลุ่ม (Bulk Ingest)
 * รับอาร์เรย์ของการอ่านค่าเซ็นเซอร์ ตรวจสอบความถูกต้อง
 * และกำหนด qualityFlag อัตโนมัติ
 *
 * รองรับเซ็นเซอร์ตะกอนดินและพื้นที่ลาดชัน:
 * - sediment_concentration: ความเข้มข้นตะกอน (g/L)
 * - runoff_volume: ปริมาณน้ำไหลบ่า (L)
 * - water_flow_rate: อัตราการไหลของน้ำ (L/min)
 * - infiltration_rate: อัตราซึมน้ำ (mm/hr)
 * - erosion_rate: อัตราการพังทลายดิน (t/ha/yr)
 *
 * ลำดับการประมวลผล:
 * 1. ตรวจสอบค่าแต่ละรายการกับช่วงของประเภทเซ็นเซอร์ (รวมตะกอนดิน)
 * 2. กำหนด qualityFlag: VALIDATED (อยู่ในช่วง) / ANOMALY (เกินช่วง)
 * 3. คำนวณ integrity hash สำหรับแต่ละรายการ
 * 4. คำนวณ SOC Stock อัตโนมัติ
 * 5. คำนวณ sedimentLoadKg = runoffVolumeL × sedimentConcGpL / 1000 อัตโนมัติ
 * 6. ส่งผลสรุป (total, valid, anomaly, rejected)
 */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// ─── ช่วงค่าที่ยอมรับได้สำหรับแต่ละประเภทเซ็นเซอร์ (Sensor Validation Ranges) ───
// รวมเซ็นเซอร์สำหรับพื้นที่ลาดชัน/กักตะกอนดิน
const SENSOR_RANGES: Record<string, { min: number; max: number; unit: string; labelTh: string }> = {
  // ─── เซ็นเซอร์พื้นฐาน ───
  soil_moisture:      { min: 0, max: 80, unit: '%', labelTh: 'ความชื้นในดิน' },
  soil_temperature:   { min: 0, max: 60, unit: '°C', labelTh: 'อุณหภูมิดิน' },
  soil_ph:            { min: 2, max: 12, unit: 'pH', labelTh: 'ค่า pH ของดิน' },
  bulk_density:       { min: 0.3, max: 2.5, unit: 'g/cm³', labelTh: 'ความหนาแน่นรวมของดิน' },
  organic_carbon_pct: { min: 0, max: 30, unit: '%', labelTh: 'ร้อยละคาร์บอนอินทรีย์' },
  total_nitrogen:     { min: 0, max: 5, unit: '%', labelTh: 'ไนโตรเจนรวม' },
  cec:                { min: 0, max: 50, unit: 'cmol/kg', labelTh: 'ความจุแลกเปลี่ยนประจุ' },
  above_ground_biomass: { min: 0, max: 50, unit: 't/ha', labelTh: 'มวลชีวภาพเหนือพื้นดิน' },
  below_ground_biomass: { min: 0, max: 20, unit: 't/ha', labelTh: 'มวลชีวภาพใต้พื้นดิน' },
  co2_flux:           { min: -20, max: 100, unit: 'µmol/m²/s', labelTh: 'ฟลักซ์ CO₂' },
  ch4_flux:           { min: -10, max: 200, unit: 'mg/m²/hr', labelTh: 'ฟลักซ์ CH₄' },
  n2o_flux:           { min: -200, max: 2000, unit: 'µg/m²/hr', labelTh: 'ฟลักซ์ N₂O' },
  // ─── เซ็นเซอร์ตะกอนดิน/พื้นที่ลาดชัน (ใหม่) ───
  sediment_concentration: { min: 0, max: 50, unit: 'g/L', labelTh: 'ความเข้มข้นตะกอน' },
  runoff_volume:         { min: 0, max: 100000, unit: 'L', labelTh: 'ปริมาณน้ำไหลบ่า' },
  water_flow_rate:       { min: 0, max: 500, unit: 'L/min', labelTh: 'อัตราการไหลของน้ำ' },
  infiltration_rate:     { min: 0, max: 500, unit: 'mm/hr', labelTh: 'อัตราซึมน้ำ' },
  erosion_rate:          { min: 0, max: 100, unit: 't/ha/yr', labelTh: 'อัตราการพังทลายดิน' },
};

// ─── ฟังก์ชันคำนวณ SHA-256 Integrity Hash ───
async function calculateIntegrityHash(plotId: string, socStock: number, timestamp: string): Promise<string> {
  const data = `${plotId}|${socStock.toFixed(6)}|${timestamp}`;
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ─── ประเภทข้อมูลการอ่านค่าเซ็นเซอร์ ───
interface SensorReading {
  plotId: string;
  measurementDate?: string;
  measurementType?: string;
  depthCm?: number;
  soilMoisture?: number;
  soilTemperature?: number;
  soilPH?: number;
  bulkDensity?: number;
  organicCarbonPct?: number;
  totalNitrogen?: number;
  cec?: number;
  aboveGroundBiomass?: number;
  belowGroundBiomass?: number;
  co2Flux?: number;
  ch4Flux?: number;
  n2oFlux?: number;
  // ─── ข้อมูลตะกอนดิน/พื้นที่ลาดชัน (ใหม่) ───
  terraceLayerId?: string;
  runoffVolumeL?: number;
  sedimentConcGpL?: number;
  sedimentLoadKg?: number;
  erosionRateTpHa?: number;
  waterFlowRateLMin?: number;
  infiltrationMmHr?: number;
  sourceDevice?: string;
  notes?: string;
}

// ─── ผลการตรวจสอบ ───
interface ValidationResult {
  valid: boolean;
  qualityFlag: 'VALIDATED' | 'ANOMALY' | 'REJECTED';
  anomalies: string[];
  rejectedReasons: string[];
}

// ─── ตรวจสอบค่าเซ็นเซอร์แต่ละรายการ (รวมตะกอนดิน) ───
function validateReading(reading: SensorReading): ValidationResult {
  const anomalies: string[] = [];
  const rejectedReasons: string[] = [];

  // ตรวจสอบข้อมูลจำเป็น
  if (!reading.plotId) {
    rejectedReasons.push('ไม่ระบุ plotId');
  }

  // ตรวจสอบค่าแต่ละฟิลด์กับช่วงที่กำหนด (เซ็นเซอร์พื้นฐาน)
  const fieldToSensor: Record<string, { sensorKey: string; value?: number }> = {
    soilMoisture: { sensorKey: 'soil_moisture', value: reading.soilMoisture },
    soilTemperature: { sensorKey: 'soil_temperature', value: reading.soilTemperature },
    soilPH: { sensorKey: 'soil_ph', value: reading.soilPH },
    bulkDensity: { sensorKey: 'bulk_density', value: reading.bulkDensity },
    organicCarbonPct: { sensorKey: 'organic_carbon_pct', value: reading.organicCarbonPct },
    totalNitrogen: { sensorKey: 'total_nitrogen', value: reading.totalNitrogen },
    cec: { sensorKey: 'cec', value: reading.cec },
    aboveGroundBiomass: { sensorKey: 'above_ground_biomass', value: reading.aboveGroundBiomass },
    belowGroundBiomass: { sensorKey: 'below_ground_biomass', value: reading.belowGroundBiomass },
    co2Flux: { sensorKey: 'co2_flux', value: reading.co2Flux },
    ch4Flux: { sensorKey: 'ch4_flux', value: reading.ch4Flux },
    n2oFlux: { sensorKey: 'n2o_flux', value: reading.n2oFlux },
    // ─── เซ็นเซอร์ตะกอนดิน/พื้นที่ลาดชัน ───
    sedimentConcGpL: { sensorKey: 'sediment_concentration', value: reading.sedimentConcGpL },
    runoffVolumeL: { sensorKey: 'runoff_volume', value: reading.runoffVolumeL },
    waterFlowRateLMin: { sensorKey: 'water_flow_rate', value: reading.waterFlowRateLMin },
    infiltrationMmHr: { sensorKey: 'infiltration_rate', value: reading.infiltrationMmHr },
    erosionRateTpHa: { sensorKey: 'erosion_rate', value: reading.erosionRateTpHa },
  };

  for (const [field, { sensorKey, value }] of Object.entries(fieldToSensor)) {
    if (value !== undefined && value !== null) {
      const range = SENSOR_RANGES[sensorKey];
      if (range && (value < range.min || value > range.max)) {
        anomalies.push(
          `${field}: ${value} ${range.unit} (ช่วงปกติ: ${range.min}-${range.max} ${range.unit}, ${range.labelTh})`
        );
      }
    }
  }

  // กำหนดสถานะ
  if (rejectedReasons.length > 0) {
    return { valid: false, qualityFlag: 'REJECTED', anomalies, rejectedReasons };
  }
  if (anomalies.length > 0) {
    return { valid: true, qualityFlag: 'ANOMALY', anomalies, rejectedReasons: [] };
  }
  return { valid: true, qualityFlag: 'VALIDATED', anomalies: [], rejectedReasons: [] };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const readings: SensorReading[] = body.readings || body;

    // ตรวจสอบว่าเป็นอาร์เรย์
    if (!Array.isArray(readings)) {
      return NextResponse.json(
        { success: false, error: 'ข้อมูลต้องเป็นอาร์เรย์ของการอ่านค่าเซ็นเซอร์' },
        { status: 400 }
      );
    }

    if (readings.length === 0) {
      return NextResponse.json(
        { success: false, error: 'ไม่มีข้อมูลสำหรับนำเข้า' },
        { status: 400 }
      );
    }

    if (readings.length > 1000) {
      return NextResponse.json(
        { success: false, error: 'จำนวนข้อมูลเกิน 1,000 รายการ กรุณาแบ่งเป็นชุดเล็กลง' },
        { status: 400 }
      );
    }

    // ─── สถิติการนำเข้า ───
    let totalProcessed = 0;
    let validCount = 0;
    let anomalyCount = 0;
    let rejectedCount = 0;
    const createdMeasurements: any[] = [];
    const rejectedReadings: any[] = [];
    const anomalyReadings: any[] = [];

    // ─── ดึงรายการ plotId ที่มีอยู่ในระบบ (ตรวจสอบครั้งเดียว) ───
    const allPlotIds = await db.soilCarbonPlot.findMany({
      select: { plotId: true, areaHa: true, slopeDegree: true },
    });
    const plotMap = new Map(allPlotIds.map(p => [p.plotId, { areaHa: p.areaHa, slopeDegree: p.slopeDegree }]));

    // ─── ประมวลผลทีละรายการ ───
    for (const reading of readings) {
      totalProcessed++;

      // ตรวจสอบความถูกต้อง (รวมเซ็นเซอร์ตะกอนดิน)
      const validation = validateReading(reading);

      // ถ้าถูกปฏิเสธ (ข้อมูลไม่ครบ)
      if (validation.qualityFlag === 'REJECTED') {
        rejectedCount++;
        rejectedReadings.push({
          index: totalProcessed,
          reading,
          reasons: validation.rejectedReasons,
        });
        continue;
      }

      // ตรวจสอบว่า plotId มีอยู่ในระบบ
      if (!plotMap.has(reading.plotId)) {
        rejectedCount++;
        rejectedReadings.push({
          index: totalProcessed,
          reading,
          reasons: [`ไม่พบแปลงที่มี plotId: ${reading.plotId}`],
        });
        continue;
      }

      // ตรวจสอบ terraceLayerId ถ้าระบุมา
      if (reading.terraceLayerId) {
        const terrace = await db.terraceLayer.findUnique({ where: { id: reading.terraceLayerId } });
        if (!terrace) {
          rejectedCount++;
          rejectedReadings.push({
            index: totalProcessed,
            reading,
            reasons: [`ไม่พบชั้นปลูกที่มี id: ${reading.terraceLayerId}`],
          });
          continue;
        }
        if (terrace.plotId !== reading.plotId) {
          rejectedCount++;
          rejectedReadings.push({
            index: totalProcessed,
            reading,
            reasons: [`ชั้นปลูก ${reading.terraceLayerId} ไม่ได้อยู่ในแปลง ${reading.plotId}`],
          });
          continue;
        }
      }

      // ─── คำนวณ SOC Stock ───
      const bulkDensity = reading.bulkDensity || 0;
      const organicCarbonPct = reading.organicCarbonPct || 0;
      const depthCm = reading.depthCm || 30;
      const socStock = bulkDensity * (organicCarbonPct / 100) * (depthCm / 100);

      // ─── คำนวณ sedimentLoadKg อัตโนมัติ ───
      // สูตร: sedimentLoadKg = runoffVolumeL × sedimentConcGpL / 1000
      const finalRunoffVolumeL = reading.runoffVolumeL || 0;
      const finalSedimentConcGpL = reading.sedimentConcGpL || 0;
      const calculatedSedimentLoadKg = reading.sedimentLoadKg || (finalRunoffVolumeL * finalSedimentConcGpL / 1000);

      // ─── คำนวณ Integrity Hash ───
      const timestamp = reading.measurementDate || new Date().toISOString();
      const integrityHash = await calculateIntegrityHash(reading.plotId, socStock, timestamp);

      // ─── สร้างรายการวัด ───
      try {
        const measurement = await db.soilCarbonMeasurement.create({
          data: {
            plotId: reading.plotId,
            terraceLayerId: reading.terraceLayerId || null,
            measurementDate: reading.measurementDate ? new Date(reading.measurementDate) : new Date(),
            measurementType: reading.measurementType || 'FIELD',
            depthCm,
            soilMoisture: reading.soilMoisture || 0,
            soilTemperature: reading.soilTemperature || 0,
            soilPH: reading.soilPH || 7,
            bulkDensity,
            organicCarbonPct,
            totalNitrogen: reading.totalNitrogen || 0,
            cec: reading.cec || 0,
            aboveGroundBiomass: reading.aboveGroundBiomass || 0,
            belowGroundBiomass: reading.belowGroundBiomass || 0,
            socStock: Math.round(socStock * 1000) / 1000,
            co2Flux: reading.co2Flux || 0,
            ch4Flux: reading.ch4Flux || 0,
            n2oFlux: reading.n2oFlux || 0,
            // ─── ข้อมูลตะกอนดิน/พื้นที่ลาดชัน ───
            runoffVolumeL: finalRunoffVolumeL,
            sedimentConcGpL: finalSedimentConcGpL,
            sedimentLoadKg: Math.round(calculatedSedimentLoadKg * 1000) / 1000,
            erosionRateTpHa: reading.erosionRateTpHa || 0,
            waterFlowRateLMin: reading.waterFlowRateLMin || 0,
            infiltrationMmHr: reading.infiltrationMmHr || 0,
            ingestionMode: 'batch',
            qualityFlag: validation.qualityFlag,
            integrityHash,
            sourceDevice: reading.sourceDevice || 'BULK-INGEST',
            notes: reading.notes || (validation.anomalies.length > 0 ? `ค่าผิดปกติ: ${validation.anomalies.join('; ')}` : ''),
          },
        });

        createdMeasurements.push({
          id: measurement.id,
          plotId: measurement.plotId,
          terraceLayerId: measurement.terraceLayerId,
          qualityFlag: measurement.qualityFlag,
          socStock: measurement.socStock,
          sedimentLoadKg: measurement.sedimentLoadKg,
          integrityHash: measurement.integrityHash,
          anomalies: validation.anomalies,
        });

        if (validation.qualityFlag === 'VALIDATED') {
          validCount++;
        } else {
          anomalyCount++;
          anomalyReadings.push({
            index: totalProcessed,
            measurementId: measurement.id,
            anomalies: validation.anomalies,
          });
        }
      } catch (createError) {
        // หากสร้างไม่สำเร็จ ให้นับเป็น rejected
        rejectedCount++;
        rejectedReadings.push({
          index: totalProcessed,
          reading,
          reasons: [`ข้อผิดพลาดในการสร้าง: ${String(createError)}`],
        });
      }
    }

    // ─── สรุปผลการนำเข้า ───
    const summary = {
      total: totalProcessed,
      valid: validCount,
      anomaly: anomalyCount,
      rejected: rejectedCount,
      successRate: totalProcessed > 0
        ? Math.round(((validCount + anomalyCount) / totalProcessed) * 100 * 10) / 10
        : 0,
      validationRate: (validCount + anomalyCount) > 0
        ? Math.round((validCount / (validCount + anomalyCount)) * 100 * 10) / 10
        : 0,
    };

    // ─── สร้างรายงานการตรวจสอบช่วงค่าเซ็นเซอร์ (รวมตะกอนดิน) ───
    const sensorValidationReport = Object.entries(SENSOR_RANGES).map(([key, range]) => ({
      sensorType: key,
      labelTh: range.labelTh,
      acceptableRange: `${range.min} - ${range.max} ${range.unit}`,
      unit: range.unit,
      isSedimentSensor: ['sediment_concentration', 'runoff_volume', 'water_flow_rate', 'infiltration_rate', 'erosion_rate'].includes(key),
    }));

    return NextResponse.json({
      success: true,
      data: {
        summary,
        createdMeasurements: createdMeasurements.length <= 50
          ? createdMeasurements
          : `${createdMeasurements.length} measurements created (แสดงเฉพาะสรุปเนื่องจากจำนวนมาก)`,
        anomalyReadings: anomalyReadings.length <= 20
          ? anomalyReadings
          : `${anomalyReadings.length} anomaly readings (แสดงเฉพาะสรุป)`,
        rejectedReadings: rejectedReadings.length <= 20
          ? rejectedReadings
          : `${rejectedReadings.length} rejected readings (แสดงเฉพาะสรุป)`,
        sensorValidationReport,
      },
      message: `นำเข้าข้อมูลเสร็จสิ้น: ทั้งหมด ${summary.total} รายการ, ผ่าน ${summary.valid}, ผิดปกติ ${summary.anomaly}, ปฏิเสธ ${summary.rejected}`,
    });
  } catch (error) {
    console.error('Soil carbon ingest error:', error);
    return NextResponse.json(
      { success: false, error: 'ไม่สามารถนำเข้าข้อมูลได้', details: String(error) },
      { status: 500 }
    );
  }
}
