/**
 * GET/POST /api/low-carbon-building/energy
 * ──────────────────────────────────────────────
 * จัดการข้อมูลพลังงานอาคาร
 * GET: ดึงรายการข้อมูลพลังงานพร้อมตัวกรอง
 * POST: สร้างบันทึกพลังงานใหม่ (คำนวณ EUI, carbon emission, hash อัตโนมัติ)
 */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import crypto from 'crypto';

// ค่าปัจจัยการปล่อยก๊าซเรือนกระจกของประเทศไทย
// Thailand grid emission factor = 0.5 kgCO2/kWh (EGAT 2023)
const THAILAND_GRID_EF = 0.5; // kgCO2/kWh
const GAS_EMISSION_FACTOR = 2.0; // kgCO2/m³ (natural gas)
const RENEWABLE_OFFSET_FACTOR = 0.5; // kgCO2/kWh offset สำหรับพลังงานหมุนเวียน

// ประเภทบันทึกที่รองรับ
const VALID_RECORD_TYPES = ['HOURLY', 'DAILY', 'MONTHLY', 'YEARLY'];

// ค่า qualityFlag ที่เป็นไปได้
const VALID_QUALITY_FLAGS = ['RAW', 'VALIDATED', 'CERTIFIED', 'REJECTED', 'ANOMALY'];

/**
 * คำนวณ EUI (Energy Use Intensity)
 * EUI = พลังงานรวม / พื้นที่ใช้สอยรวม (kWh/m²)
 */
function calculateEUI(totalEnergyKwh: number, grossFloorArea: number): number {
  if (grossFloorArea <= 0) return 0;
  return Math.round((totalEnergyKwh / grossFloorArea) * 1000) / 1000;
}

/**
 * คำนวณการปล่อยก๊าซเรือนกระจก
 * carbonEmission = (ไฟฟ้า × 0.5) + (แก๊ส × 2.0) - (โซลาร์ × 0.5) - (ลม × 0.5)
 * หน่วย: tCO2e (ตันคาร์บอนไดออกไซด์สมมูล)
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
  // แปลงจาก kgCO2e เป็น tCO2e
  return Math.round((emission / 1000) * 10000) / 10000;
}

/**
 * คำนวณ integrity hash (SHA-256)
 * เพื่อป้องกันการแก้ไขข้อมูล
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
 * - VALIDATED: ค่าอยู่ในช่วงปกติ
 * - ANOMALY: ค่าผิดปกติ (สูงหรือต่ำเกินไป)
 * - REJECTED: ค่าเป็นลบหรือเป็นศูนย์ทั้งหมด
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
  // ตรวจสอบค่าลบ
  if (
    record.electricityKwh < 0 ||
    record.hvacKwh < 0 ||
    record.lightingKwh < 0 ||
    record.equipmentKwh < 0
  ) {
    return 'REJECTED';
  }

  // ตรวจสอบค่าศูนย์ทั้งหมด
  const totalEnergy =
    record.electricityKwh + record.hvacKwh + record.lightingKwh + record.equipmentKwh;
  if (totalEnergy === 0) {
    return 'REJECTED';
  }

  // ตรวจสอบค่าผิดปกติ - อุณหภูมิ
  if (record.indoorTemp > 50 || record.indoorTemp < 5) {
    return 'ANOMALY';
  }

  // ตรวจสอบค่าผิดปกติ - ความชื้น
  if (record.indoorHumidity > 100 || record.indoorHumidity < 0) {
    return 'ANOMALY';
  }

  // ตรวจสอบค่าผิดปกติ - CO₂
  if (record.co2Level > 5000 || record.co2Level < 0) {
    return 'ANOMALY';
  }

  // ตรวจสอบค่าผิดปกติ - อัตราการใช้พื้นที่
  if (record.occupancyRate > 100 || record.occupancyRate < 0) {
    return 'ANOMALY';
  }

  // ตรวจสอบค่าไฟฟ้าผิดปกติสูงเกิน (มากกว่า 1,000,000 kWh ต่อชั่วโมง)
  if (record.electricityKwh > 1000000) {
    return 'ANOMALY';
  }

  return 'VALIDATED';
}

/**
 * GET /api/low-carbon-building/energy
 * ดึงรายการข้อมูลพลังงานอาคาร พร้อมตัวกรอง
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const buildingId = searchParams.get('buildingId');
    const recordType = searchParams.get('recordType');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const qualityFlag = searchParams.get('qualityFlag');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    // สร้างเงื่อนไขการค้นหา
    const where: any = {};
    if (buildingId) where.buildingId = buildingId;
    if (recordType) where.recordType = recordType;
    if (qualityFlag) where.qualityFlag = qualityFlag;
    if (startDate || endDate) {
      where.recordDate = {};
      if (startDate) where.recordDate.gte = new Date(startDate);
      if (endDate) where.recordDate.lte = new Date(endDate);
    }

    const records = await db.buildingEnergyRecord.findMany({
      where,
      include: {
        building: {
          select: {
            buildingId: true,
            name: true,
            nameTh: true,
            grossFloorArea: true,
            buildingType: true,
            province: true,
          },
        },
      },
      orderBy: { recordDate: 'desc' },
      take: limit,
      skip: offset,
    });

    const total = await db.buildingEnergyRecord.count({ where });

    // สรุปสถิติ
    const stats = await db.buildingEnergyRecord.aggregate({
      where,
      _count: true,
      _sum: {
        electricityKwh: true,
        solarGeneration: true,
        windGeneration: true,
        gasUsage: true,
        waterUsage: true,
        carbonEmission: true,
      },
      _avg: {
        eui: true,
        indoorTemp: true,
        indoorHumidity: true,
        co2Level: true,
        occupancyRate: true,
      },
    });

    // นับจำนวนตาม quality flag
    const qualityBreakdown: Record<string, number> = {};
    for (const flag of VALID_QUALITY_FLAGS) {
      qualityBreakdown[flag] = await db.buildingEnergyRecord.count({
        where: { ...where, qualityFlag: flag },
      });
    }

    return NextResponse.json({
      success: true,
      data: records,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
      stats: {
        totalRecords: stats._count,
        totalElectricityKwh: stats._sum.electricityKwh || 0,
        totalSolarGeneration: stats._sum.solarGeneration || 0,
        totalWindGeneration: stats._sum.windGeneration || 0,
        totalGasUsage: stats._sum.gasUsage || 0,
        totalWaterUsage: stats._sum.waterUsage || 0,
        totalCarbonEmission: stats._sum.carbonEmission || 0,
        avgEUI: Math.round((stats._avg.eui || 0) * 100) / 100,
        avgIndoorTemp: Math.round((stats._avg.indoorTemp || 0) * 10) / 10,
        avgIndoorHumidity: Math.round((stats._avg.indoorHumidity || 0) * 10) / 10,
        avgCo2Level: Math.round((stats._avg.co2Level || 0) * 10) / 10,
        avgOccupancyRate: Math.round((stats._avg.occupancyRate || 0) * 100) / 100,
        qualityBreakdown,
      },
    });
  } catch (error: any) {
    console.error('❌ ดึงข้อมูลพลังงานล้มเหลว:', error);
    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาดในการดึงข้อมูลพลังงาน', detail: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/low-carbon-building/energy
 * สร้างบันทึกพลังงานใหม่ พร้อมคำนวณ EUI, carbon emission, integrity hash อัตโนมัติ
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // ตรวจสอบข้อมูลจำเป็น
    if (!body.buildingId || !body.recordDate) {
      return NextResponse.json(
        { success: false, error: 'กรุณาระบุ buildingId และ recordDate' },
        { status: 400 }
      );
    }

    // ตรวจสอบว่าอาคารมีอยู่จริง
    const building = await db.lowCarbonBuilding.findUnique({
      where: { buildingId: body.buildingId },
    });
    if (!building) {
      return NextResponse.json(
        { success: false, error: `ไม่พบอาคารที่มี buildingId "${body.buildingId}"` },
        { status: 404 }
      );
    }

    // ตรวจสอบ recordType
    const recordType = body.recordType || 'HOURLY';
    if (!VALID_RECORD_TYPES.includes(recordType)) {
      return NextResponse.json(
        { success: false, error: `ประเภทบันทึกไม่ถูกต้อง ต้องเป็น: ${VALID_RECORD_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    // ค่าพลังงาน
    const electricityKwh = body.electricityKwh || 0;
    const hvacKwh = body.hvacKwh || 0;
    const lightingKwh = body.lightingKwh || 0;
    const equipmentKwh = body.equipmentKwh || 0;
    const solarGeneration = body.solarGeneration || 0;
    const windGeneration = body.windGeneration || 0;
    const gasUsage = body.gasUsage || 0;
    const waterUsage = body.waterUsage || 0;
    const indoorTemp = body.indoorTemp || 0;
    const indoorHumidity = body.indoorHumidity || 0;
    const co2Level = body.co2Level || 0;
    const occupancyRate = body.occupancyRate || 0;

    // คำนวณพลังงานรวม
    const totalEnergy = electricityKwh + hvacKwh + lightingKwh + equipmentKwh;

    // คำนวณ EUI (kWh/m²)
    const eui = calculateEUI(totalEnergy, building.grossFloorArea);

    // คำนวณ carbon emission (tCO2e)
    const carbonEmission = calculateCarbonEmission(
      electricityKwh,
      gasUsage,
      solarGeneration,
      windGeneration
    );

    // คำนวณ integrity hash
    const recordDate = new Date(body.recordDate);
    const integrityHash = calculateIntegrityHash({
      buildingId: body.buildingId,
      recordDate: recordDate.toISOString(),
      electricityKwh,
      gasUsage,
      solarGeneration,
      windGeneration,
    });

    // กำหนด quality flag
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

    // สร้างบันทึกพลังงาน
    const record = await db.buildingEnergyRecord.create({
      data: {
        buildingId: body.buildingId,
        recordDate,
        recordType,
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
        ingestionMode: body.ingestionMode || 'realtime',
        qualityFlag,
        integrityHash,
        sourceDevice: body.sourceDevice || '',
      },
      include: {
        building: {
          select: {
            buildingId: true,
            name: true,
            nameTh: true,
            grossFloorArea: true,
            buildingType: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: `บันทึกข้อมูลพลังงานสำเร็จ (qualityFlag: ${qualityFlag})`,
        data: record,
        calculations: {
          totalEnergyKwh: totalEnergy,
          eui: {
            value: eui,
            formula: `${totalEnergy} kWh / ${building.grossFloorArea} m² = ${eui} kWh/m²`,
          },
          carbonEmission: {
            value: carbonEmission,
            formula: `(${electricityKwh} × ${THAILAND_GRID_EF}) + (${gasUsage} × ${GAS_EMISSION_FACTOR}) - (${solarGeneration} × ${RENEWABLE_OFFSET_FACTOR}) - (${windGeneration} × ${RENEWABLE_OFFSET_FACTOR}) = ${carbonEmission} tCO2e`,
            factors: {
              thailandGridEF: `${THAILAND_GRID_EF} kgCO2/kWh (ค่าปัจจัยการปล่อยของกริดไทย)`,
              gasEmissionFactor: `${GAS_EMISSION_FACTOR} kgCO2/m³ (แก๊สธรรมชาติ)`,
              renewableOffsetFactor: `${RENEWABLE_OFFSET_FACTOR} kgCO2/kWh (ออฟเซ็ตพลังงานหมุนเวียน)`,
            },
          },
          integrityHash: {
            algorithm: 'SHA-256',
            hash: integrityHash,
          },
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('❌ สร้างบันทึกพลังงานล้มเหลว:', error);
    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาดในการสร้างบันทึกพลังงาน', detail: error.message },
      { status: 500 }
    );
  }
}
