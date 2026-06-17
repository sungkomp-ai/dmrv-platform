/**
 * POST /api/low-carbon-building/ingest
 * ──────────────────────────────────────────────
 * รับข้อมูลพลังงานแบบกลุ่ม (Batch Mode)
 * รับอาร์เรย์ของข้อมูลพลังงาน ตรวจสอบแต่ละรายการ
 * คำนวณ hash และ quality flag อัตโนมัติ
 * คืนค่าสรุปผล (ทั้งหมด, ถูกต้อง, ผิดปกติ, ถูกปฏิเสธ)
 */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import crypto from 'crypto';

// ค่าคงที่การคำนวณ
const THAILAND_GRID_EF = 0.5; // kgCO2/kWh
const GAS_EMISSION_FACTOR = 2.0; // kgCO2/m³
const RENEWABLE_OFFSET_FACTOR = 0.5; // kgCO2/kWh

// ประเภทบันทึกที่รองรับ
const VALID_RECORD_TYPES = ['HOURLY', 'DAILY', 'MONTHLY', 'YEARLY'];

// ขีดจำกัดสูงสุดต่อคำขอ
const MAX_BATCH_SIZE = 500;

/**
 * คำนวณ EUI
 */
function calculateEUI(totalEnergyKwh: number, grossFloorArea: number): number {
  if (grossFloorArea <= 0) return 0;
  return Math.round((totalEnergyKwh / grossFloorArea) * 1000) / 1000;
}

/**
 * คำนวณ carbon emission (tCO2e)
 */
function calculateCarbonEmission(
  electricityKwh: number,
  gasUsage: number,
  solarGeneration: number,
  windGeneration: number
): number {
  const emission =
    (electricityKwh * THAILAND_GRID_EF) +
    (gasUsage * GAS_EMISSION_FACTOR) -
    (solarGeneration * RENEWABLE_OFFSET_FACTOR) -
    (windGeneration * RENEWABLE_OFFSET_FACTOR);
  return Math.round((emission / 1000) * 10000) / 10000;
}

/**
 * คำนวณ integrity hash (SHA-256)
 */
function calculateIntegrityHash(data: {
  buildingId: string;
  recordDate: string;
  electricityKwh: number;
  gasUsage: number;
  solarGeneration: number;
  windGeneration: number;
}): string {
  const payload = JSON.stringify(data);
  return crypto.createHash('sha256').update(payload).digest('hex');
}

/**
 * กำหนดค่า qualityFlag ตามช่วงค่าข้อมูล
 */
function determineQualityFlag(record: {
  electricityKwh: number;
  hvacKwh: number;
  lightingKwh: number;
  equipmentKwh: number;
  indoorTemp: number;
  indoorHumidity: number;
  co2Level: number;
  occupancyRate: number;
}): string {
  // ค่าลบ
  if (
    record.electricityKwh < 0 ||
    record.hvacKwh < 0 ||
    record.lightingKwh < 0 ||
    record.equipmentKwh < 0
  ) {
    return 'REJECTED';
  }

  // ค่าศูนย์ทั้งหมด
  const totalEnergy =
    record.electricityKwh + record.hvacKwh + record.lightingKwh + record.equipmentKwh;
  if (totalEnergy === 0) {
    return 'REJECTED';
  }

  // ตรวจสอบค่าผิดปกติ
  if (record.indoorTemp > 50 || record.indoorTemp < 5) return 'ANOMALY';
  if (record.indoorHumidity > 100 || record.indoorHumidity < 0) return 'ANOMALY';
  if (record.co2Level > 5000 || record.co2Level < 0) return 'ANOMALY';
  if (record.occupancyRate > 100 || record.occupancyRate < 0) return 'ANOMALY';
  if (record.electricityKwh > 1000000) return 'ANOMALY';

  return 'VALIDATED';
}

/**
 * ตรวจสอบความถูกต้องของข้อมูลแต่ละรายการ
 */
function validateReading(reading: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!reading.buildingId) errors.push('ไม่มี buildingId');
  if (!reading.recordDate) errors.push('ไม่มี recordDate');

  if (reading.recordType && !VALID_RECORD_TYPES.includes(reading.recordType)) {
    errors.push(`ประเภทบันทึก "${reading.recordType}" ไม่ถูกต้อง`);
  }

  // ตรวจสอบค่าตัวเลข
  const numericFields = [
    'electricityKwh', 'hvacKwh', 'lightingKwh', 'equipmentKwh',
    'solarGeneration', 'windGeneration', 'gasUsage', 'waterUsage',
    'indoorTemp', 'indoorHumidity', 'co2Level', 'occupancyRate',
  ];
  for (const field of numericFields) {
    if (reading[field] !== undefined && typeof reading[field] !== 'number') {
      errors.push(`ค่า ${field} ต้องเป็นตัวเลข`);
    }
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * POST /api/low-carbon-building/ingest
 * รับข้อมูลพลังงานแบบกลุ่ม
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // ตรวจสอบว่าเป็นอาร์เรย์
    if (!Array.isArray(body.readings) && !Array.isArray(body)) {
      return NextResponse.json(
        { success: false, error: 'กรุณาส่งข้อมูลเป็นอาร์เรย์ (readings)' },
        { status: 400 }
      );
    }

    const readings = Array.isArray(body.readings) ? body.readings : body;

    // ตรวจสอบขนาด batch
    if (readings.length === 0) {
      return NextResponse.json(
        { success: false, error: 'อาร์เรย์ว่าง กรุณาส่งข้อมูลอย่างน้อย 1 รายการ' },
        { status: 400 }
      );
    }

    if (readings.length > MAX_BATCH_SIZE) {
      return NextResponse.json(
        { success: false, error: `จำนวนรายการเกินกำหนด (สูงสุด ${MAX_BATCH_SIZE} รายการต่อคำขอ)` },
        { status: 400 }
      );
    }

    // ดึงรายการ buildingId ทั้งหมดที่ต้องการ
    const requestedBuildingIds = [...new Set(readings.map((r: any) => r.buildingId).filter(Boolean))];

    // ดึงข้อมูลอาคารทั้งหมดในครั้งเดียว
    const buildings = await db.lowCarbonBuilding.findMany({
      where: { buildingId: { in: requestedBuildingIds } },
    });
    const buildingMap = new Map(buildings.map((b) => [b.buildingId, b]));

    // สถิติผลการประมวลผล
    const summary = {
      total: readings.length,
      valid: 0,
      anomaly: 0,
      rejected: 0,
      errors: [] as { index: number; buildingId?: string; errors: string[] }[],
    };

    const createdRecords: any[] = [];
    const anomalyRecords: any[] = [];
    const rejectedRecords: any[] = [];

    // ประมวลผลทีละรายการ
    for (let i = 0; i < readings.length; i++) {
      const reading = readings[i];

      // ตรวจสอบความถูกต้อง
      const validation = validateReading(reading);
      if (!validation.isValid) {
        summary.rejected++;
        rejectedRecords.push({
          index: i,
          buildingId: reading.buildingId,
          errors: validation.errors,
        });
        summary.errors.push({ index: i, buildingId: reading.buildingId, errors: validation.errors });
        continue;
      }

      // ตรวจสอบว่าอาคารมีอยู่จริง
      const building = buildingMap.get(reading.buildingId);
      if (!building) {
        summary.rejected++;
        rejectedRecords.push({
          index: i,
          buildingId: reading.buildingId,
          errors: [`ไม่พบอาคารที่มี buildingId "${reading.buildingId}"`],
        });
        summary.errors.push({
          index: i,
          buildingId: reading.buildingId,
          errors: [`ไม่พบอาคาร "${reading.buildingId}"`],
        });
        continue;
      }

      // ค่าพลังงาน
      const electricityKwh = reading.electricityKwh || 0;
      const hvacKwh = reading.hvacKwh || 0;
      const lightingKwh = reading.lightingKwh || 0;
      const equipmentKwh = reading.equipmentKwh || 0;
      const solarGeneration = reading.solarGeneration || 0;
      const windGeneration = reading.windGeneration || 0;
      const gasUsage = reading.gasUsage || 0;
      const waterUsage = reading.waterUsage || 0;
      const indoorTemp = reading.indoorTemp || 0;
      const indoorHumidity = reading.indoorHumidity || 0;
      const co2Level = reading.co2Level || 0;
      const occupancyRate = reading.occupancyRate || 0;

      // คำนวณ
      const totalEnergy = electricityKwh + hvacKwh + lightingKwh + equipmentKwh;
      const eui = calculateEUI(totalEnergy, building.grossFloorArea);
      const carbonEmission = calculateCarbonEmission(electricityKwh, gasUsage, solarGeneration, windGeneration);

      const recordDate = new Date(reading.recordDate);
      const integrityHash = calculateIntegrityHash({
        buildingId: reading.buildingId,
        recordDate: recordDate.toISOString(),
        electricityKwh,
        gasUsage,
        solarGeneration,
        windGeneration,
      });

      const qualityFlag = determineQualityFlag({
        electricityKwh,
        hvacKwh,
        lightingKwh,
        equipmentKwh,
        indoorTemp,
        indoorHumidity,
        co2Level,
        occupancyRate,
      });

      // สร้างรายการ
      try {
        const record = await db.buildingEnergyRecord.create({
          data: {
            buildingId: reading.buildingId,
            recordDate,
            recordType: reading.recordType || 'HOURLY',
            electricityKwh,
            hvacKwh,
            lightingKwh,
            equipmentKwh,
            solarGeneration,
            windGeneration,
            gasUsage,
            waterUsage,
            indoorTemp,
            indoorHumidity,
            co2Level,
            occupancyRate,
            eui,
            carbonEmission,
            ingestionMode: 'batch', // ระบุว่ามาจาก batch mode
            qualityFlag,
            integrityHash,
            sourceDevice: reading.sourceDevice || 'BULK_INGEST',
          },
        });

        createdRecords.push(record);

        if (qualityFlag === 'VALIDATED') {
          summary.valid++;
        } else if (qualityFlag === 'ANOMALY') {
          summary.anomaly++;
          anomalyRecords.push({
            index: i,
            buildingId: reading.buildingId,
            recordId: record.id,
            qualityFlag,
            reason: 'ค่าข้อมูลผิดปกติ',
          });
        } else if (qualityFlag === 'REJECTED') {
          summary.rejected++;
          rejectedRecords.push({
            index: i,
            buildingId: reading.buildingId,
            recordId: record.id,
            qualityFlag,
            reason: 'ค่าข้อมูลไม่ถูกต้อง',
          });
        }
      } catch (dbError: any) {
        summary.rejected++;
        rejectedRecords.push({
          index: i,
          buildingId: reading.buildingId,
          errors: [`ข้อผิดพลาดฐานข้อมูล: ${dbError.message}`],
        });
        summary.errors.push({
          index: i,
          buildingId: reading.buildingId,
          errors: [`DB Error: ${dbError.message}`],
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `นำเข้าข้อมูลสำเร็จ: ${summary.valid} ถูกต้อง, ${summary.anomaly} ผิดปกติ, ${summary.rejected} ถูกปฏิเสธ จากทั้งหมด ${summary.total} รายการ`,
      summary: {
        total: summary.total,
        valid: summary.valid,
        anomaly: summary.anomaly,
        rejected: summary.rejected,
        validPct: Math.round((summary.valid / summary.total) * 10000) / 100,
        anomalyPct: Math.round((summary.anomaly / summary.total) * 10000) / 100,
        rejectedPct: Math.round((summary.rejected / summary.total) * 10000) / 100,
      },
      details: {
        createdCount: createdRecords.length,
        anomalyRecords: anomalyRecords.slice(0, 20), // จำกัดจำนวนที่คืน
        rejectedRecords: rejectedRecords.slice(0, 20),
        errors: summary.errors.slice(0, 20),
      },
      calculations: {
        thailandGridEF: `${THAILAND_GRID_EF} kgCO2/kWh`,
        gasEmissionFactor: `${GAS_EMISSION_FACTOR} kgCO2/m³`,
        renewableOffsetFactor: `${RENEWABLE_OFFSET_FACTOR} kgCO2/kWh`,
        hashAlgorithm: 'SHA-256',
      },
    }, { status: 201 });
  } catch (error: any) {
    console.error('❌ นำเข้าข้อมูลแบบกลุ่มล้มเหลว:', error);
    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาดในการนำเข้าข้อมูล', detail: error.message },
      { status: 500 }
    );
  }
}
