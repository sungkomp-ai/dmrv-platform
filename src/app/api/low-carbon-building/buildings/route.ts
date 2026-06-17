/**
 * GET/POST /api/low-carbon-building/buildings
 * ──────────────────────────────────────────────
 * จัดการข้อมูลอาคารคาร์บอนต่ำ
 * GET: ดึงรายการอาคารทั้งหมดพร้อมข้อมูลพลังงานล่าสุด
 * POST: สร้างอาคารใหม่
 */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// ประเภทอาคารที่รองรับ
const VALID_BUILDING_TYPES = ['OFFICE', 'RESIDENTIAL', 'RETAIL', 'HOSPITAL', 'SCHOOL', 'HOTEL', 'MIXED_USE'];

// มาตรฐานการรับรอง
const VALID_CERT_STDS = ['TGBI', 'LEED', 'EDGE', 'TREES', 'GREEN_MARK'];

// ระดับการรับรอง
const VALID_CERT_LEVELS = ['UNRATED', 'CERTIFIED', 'SILVER', 'GOLD', 'PLATINUM'];

// สถานะอาคาร
const VALID_STATUSES = ['REGISTERED', 'MONITORING', 'CERTIFIED', 'RECERTIFIED', 'SUSPENDED'];

// ระเบียบวิธีี
const VALID_METHODOLOGIES = ['T-VER-BLDG-01', 'EDGE', 'LEED-EB'];

/**
 * GET /api/low-carbon-building/buildings
 * ดึงรายการอาคารคาร์บอนต่ำทั้งหมด พร้อมข้อมูลพลังงานล่าสุด
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const province = searchParams.get('province');
    const buildingType = searchParams.get('buildingType');
    const status = searchParams.get('status');
    const certificationStd = searchParams.get('certificationStd');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // สร้างเงื่อนไขการค้นหา
    const where: any = {};
    if (province) where.province = province;
    if (buildingType) where.buildingType = buildingType;
    if (status) where.status = status;
    if (certificationStd) where.certificationStd = certificationStd;

    // ดึงข้อมูลอาคารพร้อม energy record ล่าสุด
    const buildings = await db.lowCarbonBuilding.findMany({
      where,
      include: {
        energyRecords: {
          orderBy: { recordDate: 'desc' },
          take: 1, // เอาเฉพาะรายการล่าสุด
        },
        edgeNode: {
          select: { id: true, name: true, status: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    // นับจำนวนทั้งหมด
    const total = await db.lowCarbonBuilding.count({ where });

    // สรุปสถิติ
    const stats = await db.lowCarbonBuilding.aggregate({
      _count: true,
      _sum: {
        grossFloorArea: true,
        baselineEmission: true,
        projectEmission: true,
        emissionReduction: true,
      },
      _avg: {
        renewableEnergyPct: true,
        waterReductionPct: true,
        greenAreaRatio: true,
      },
    });

    // จัดรูปแบบข้อมูลสถิติ
    const summary = {
      totalBuildings: stats._count,
      totalFloorArea: stats._sum.grossFloorArea || 0,
      totalBaselineEmission: stats._sum.baselineEmission || 0,
      totalProjectEmission: stats._sum.projectEmission || 0,
      totalEmissionReduction: stats._sum.emissionReduction || 0,
      avgRenewableEnergyPct: Math.round((stats._avg.renewableEnergyPct || 0) * 100) / 100,
      avgWaterReductionPct: Math.round((stats._avg.waterReductionPct || 0) * 100) / 100,
      avgGreenAreaRatio: Math.round((stats._avg.greenAreaRatio || 0) * 100) / 100,
    };

    return NextResponse.json({
      success: true,
      data: buildings,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
      summary,
    });
  } catch (error: any) {
    console.error('❌ ดึงข้อมูลอาคารล้มเหลว:', error);
    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาดในการดึงข้อมูลอาคาร', detail: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/low-carbon-building/buildings
 * สร้างอาคารคาร์บอนต่ำใหม่
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // ตรวจสอบข้อมูลจำเป็น
    if (!body.buildingId || !body.name) {
      return NextResponse.json(
        { success: false, error: 'กรุณาระบุ buildingId และ name' },
        { status: 400 }
      );
    }

    // ตรวจสอบ buildingId ซ้ำ
    const existing = await db.lowCarbonBuilding.findUnique({
      where: { buildingId: body.buildingId },
    });
    if (existing) {
      return NextResponse.json(
        { success: false, error: `buildingId "${body.buildingId}" มีอยู่ในระบบแล้ว` },
        { status: 409 }
      );
    }

    // ตรวจสอบค่าที่เป็น enum
    if (body.buildingType && !VALID_BUILDING_TYPES.includes(body.buildingType)) {
      return NextResponse.json(
        { success: false, error: `ประเภทอาคารไม่ถูกต้อง ต้องเป็น: ${VALID_BUILDING_TYPES.join(', ')}` },
        { status: 400 }
      );
    }
    if (body.certificationStd && !VALID_CERT_STDS.includes(body.certificationStd)) {
      return NextResponse.json(
        { success: false, error: `มาตรฐานการรับรองไม่ถูกต้อง ต้องเป็น: ${VALID_CERT_STDS.join(', ')}` },
        { status: 400 }
      );
    }
    if (body.certificationLevel && !VALID_CERT_LEVELS.includes(body.certificationLevel)) {
      return NextResponse.json(
        { success: false, error: `ระดับการรับรองไม่ถูกต้อง ต้องเป็น: ${VALID_CERT_LEVELS.join(', ')}` },
        { status: 400 }
      );
    }
    if (body.status && !VALID_STATUSES.includes(body.status)) {
      return NextResponse.json(
        { success: false, error: `สถานะไม่ถูกต้อง ต้องเป็น: ${VALID_STATUSES.join(', ')}` },
        { status: 400 }
      );
    }
    if (body.methodology && !VALID_METHODOLOGIES.includes(body.methodology)) {
      return NextResponse.json(
        { success: false, error: `ระเบียบวิธีไม่ถูกต้อง ต้องเป็น: ${VALID_METHODOLOGIES.join(', ')}` },
        { status: 400 }
      );
    }

    // สร้างอาคารใหม่
    const building = await db.lowCarbonBuilding.create({
      data: {
        buildingId: body.buildingId,
        name: body.name,
        nameTh: body.nameTh || '',
        province: body.province || '',
        lat: body.lat || 0,
        lng: body.lng || 0,
        buildingType: body.buildingType || 'OFFICE',
        floors: body.floors || 1,
        grossFloorArea: body.grossFloorArea || 0,
        yearBuilt: body.yearBuilt || 2020,
        certificationStd: body.certificationStd || 'TGBI',
        certificationLevel: body.certificationLevel || 'UNRATED',
        baselineEUI: body.baselineEUI || 0,
        projectEUI: body.projectEUI || 0,
        baselineEmission: body.baselineEmission || 0,
        projectEmission: body.projectEmission || 0,
        emissionReduction: body.emissionReduction || 0,
        renewableEnergyPct: body.renewableEnergyPct || 0,
        waterReductionPct: body.waterReductionPct || 0,
        materialSavingsPct: body.materialSavingsPct || 0,
        greenAreaRatio: body.greenAreaRatio || 0,
        status: body.status || 'REGISTERED',
        methodology: body.methodology || 'T-VER-BLDG-01',
        edgeNodeId: body.edgeNodeId || null,
      },
      include: {
        energyRecords: { take: 1, orderBy: { recordDate: 'desc' } },
        edgeNode: { select: { id: true, name: true, status: true } },
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: `สร้างอาคาร "${body.name}" (${body.buildingId}) สำเร็จ`,
        data: building,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('❌ สร้างอาคารล้มเหลว:', error);
    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาดในการสร้างอาคาร', detail: error.message },
      { status: 500 }
    );
  }
}
