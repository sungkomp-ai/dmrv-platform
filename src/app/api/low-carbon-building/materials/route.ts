/**
 * GET/POST /api/low-carbon-building/materials
 * ──────────────────────────────────────────────
 * จัดการข้อมูลวัสดุก่อสร้างอาคาร
 * GET: ดึงรายการวัสดุพร้อมตัวกรอง
 * POST: สร้างบันทึกวัสดุใหม่ (คำนวณ embodied carbon อัตโนมัติ)
 */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// ประเภทวัสดุที่รองรับ
const VALID_CATEGORIES = ['STRUCTURAL', 'ENVELOPE', 'INTERIOR', 'MEP', 'RENEWABLE'];

// ค่าปัจจัยคาร์บอนของวัสดุก่อสร้างไทย (kgCO2e ต่อหน่วย)
// อ้างอิง: Thai Green Building Institute (TGBI) และ ICE Database
const THAI_MATERIAL_CARBON_FACTORS: Record<string, {
  factor: number;
  unit: string;
  nameTh: string;
  tolerance: number; // % ความคลาดเคลื่อนที่ยอมรับได้
}> = {
  // วัสดุโครงสร้าง (STRUCTURAL)
  'concrete': {
    factor: 0.159,
    unit: 'kg',
    nameTh: 'คอนกรีต',
    tolerance: 30,
  },
  'reinforced_concrete': {
    factor: 0.224,
    unit: 'kg',
    nameTh: 'คอนกรีตเสริมเหล็ก',
    tolerance: 25,
  },
  'steel': {
    factor: 2.89,
    unit: 'kg',
    nameTh: 'เหล็กกล้า',
    tolerance: 20,
  },
  'steel_rebar': {
    factor: 2.41,
    unit: 'kg',
    nameTh: 'เหล็กเสริม',
    tolerance: 20,
  },
  'steel_section': {
    factor: 2.72,
    unit: 'kg',
    nameTh: 'เหล็กรูปพรรณ',
    tolerance: 20,
  },
  'timber': {
    factor: 0.41,
    unit: 'kg',
    nameTh: 'ไม้',
    tolerance: 40,
  },
  'timber_hardwood': {
    factor: 0.54,
    unit: 'kg',
    nameTh: 'ไม้เนื้อแข็ง',
    tolerance: 40,
  },

  // วัสดุปิดอาคาร (ENVELOPE)
  'brick': {
    factor: 0.24,
    unit: 'kg',
    nameTh: 'อิฐ',
    tolerance: 30,
  },
  'glass': {
    factor: 1.54,
    unit: 'kg',
    nameTh: 'กระจก',
    tolerance: 25,
  },
  'glass_double_glazing': {
    factor: 2.1,
    unit: 'kg',
    nameTh: 'กระจกชั้นคู่',
    tolerance: 25,
  },
  'insulation_mineral_wool': {
    factor: 1.35,
    unit: 'kg',
    nameTh: 'ฉนวนขนแกะแร่',
    tolerance: 30,
  },
  'insulation_fiberglass': {
    factor: 1.54,
    unit: 'kg',
    nameTh: 'ฉนวนไฟเบอร์กลาส',
    tolerance: 30,
  },
  'aluminum_cladding': {
    factor: 8.24,
    unit: 'kg',
    nameTh: 'อะลูมิเนียมแผ่นหุ้ม',
    tolerance: 25,
  },
  'cement_render': {
    factor: 0.176,
    unit: 'kg',
    nameTh: 'ปูนฉาบ',
    tolerance: 30,
  },

  // วัสดุภายใน (INTERIOR)
  'gypsum_board': {
    factor: 0.39,
    unit: 'kg',
    nameTh: 'แผ่นยิปซั่ม',
    tolerance: 25,
  },
  'ceramic_tile': {
    factor: 0.78,
    unit: 'kg',
    nameTh: 'กระเบื้องเซรามิก',
    tolerance: 25,
  },
  'paint': {
    factor: 2.93,
    unit: 'kg',
    nameTh: 'สีทาอาคาร',
    tolerance: 35,
  },
  'vinyl_flooring': {
    factor: 3.19,
    unit: 'kg',
    nameTh: 'พื้นวินิล',
    tolerance: 30,
  },
  'carpet': {
    factor: 5.46,
    unit: 'kg',
    nameTh: 'พรม',
    tolerance: 35,
  },

  // วัสดุระบบ (MEP)
  'copper_pipe': {
    factor: 3.81,
    unit: 'kg',
    nameTh: 'ท่อทองแดง',
    tolerance: 25,
  },
  'pvc_pipe': {
    factor: 3.1,
    unit: 'kg',
    nameTh: 'ท่อ PVC',
    tolerance: 25,
  },
  'hvac_unit': {
    factor: 3.5,
    unit: 'kg',
    nameTh: 'เครื่องปรับอากาศ',
    tolerance: 40,
  },
  'led_lighting': {
    factor: 12.5,
    unit: 'kg',
    nameTh: 'หลอด LED',
    tolerance: 50,
  },

  // วัสดุพลังงานหมุนเวียน (RENEWABLE)
  'solar_panel': {
    factor: 43.0,
    unit: 'kg',
    nameTh: 'แผงโซลาร์เซลล์',
    tolerance: 30,
  },
  'solar_inverter': {
    factor: 28.0,
    unit: 'kg',
    nameTh: 'อินเวอร์เตอร์โซลาร์',
    tolerance: 35,
  },
  'battery_lithium': {
    factor: 16.0,
    unit: 'kg',
    nameTh: 'แบตเตอรี่ลิเธียม',
    tolerance: 35,
  },
  'wind_turbine_small': {
    factor: 8.5,
    unit: 'kg',
    nameTh: 'กังหันลมขนาดเล็ก',
    tolerance: 40,
  },

  // วัสดุอื่น ๆ
  'cement': {
    factor: 0.91,
    unit: 'kg',
    nameTh: 'ปูนซีเมนต์',
    tolerance: 20,
  },
  'sand': {
    factor: 0.005,
    unit: 'kg',
    nameTh: 'ทราย',
    tolerance: 50,
  },
  'aggregate': {
    factor: 0.005,
    unit: 'kg',
    nameTh: 'หินผลิต',
    tolerance: 50,
  },
  'water': {
    factor: 0.001,
    unit: 'kg',
    nameTh: 'น้ำ',
    tolerance: 50,
  },
};

/**
 * ตรวจสอบ carbon factor กับค่าอ้างอิงของวัสดุไทย
 * คืนค่า validation result พร้อมคำแนะนำ
 */
function validateCarbonFactor(
  materialName: string,
  carbonFactor: number
): {
  isValid: boolean;
  reference?: { factor: number; unit: string; nameTh: string };
  deviation?: number; // % ส่วนเบี่ยงเบนจากค่าอ้างอิง
  warning?: string;
} {
  const normalizedName = materialName.toLowerCase().replace(/[\s\-_]+/g, '_');

  // ค้นหาค่าอ้างอิง
  const reference = THAI_MATERIAL_CARBON_FACTORS[normalizedName];

  if (!reference) {
    return {
      isValid: true, // ไม่มีค่าอ้างอิง ถือว่าผ่าน แต่แจ้งเตือน
      warning: `ไม่พบค่าอ้างอิง carbon factor สำหรับ "${materialName}" ในฐานข้อมูลวัสดุไทย`,
    };
  }

  const deviation = Math.abs((carbonFactor - reference.factor) / reference.factor) * 100;

  if (deviation <= reference.tolerance) {
    return {
      isValid: true,
      reference,
      deviation: Math.round(deviation * 100) / 100,
    };
  }

  return {
    isValid: true, // ยังอนุญาต แต่แจ้งเตือน
    reference,
    deviation: Math.round(deviation * 100) / 100,
    warning: `ค่า carbon factor (${carbonFactor}) ส่วนเบี่ยงเบน ${deviation.toFixed(1)}% จากค่าอ้างอิง (${reference.factor}) สำหรับ "${reference.nameTh}" (ยอมรับได้ ±${reference.tolerance}%)`,
  };
}

/**
 * GET /api/low-carbon-building/materials
 * ดึงรายการวัสดุก่อสร้าง พร้อมตัวกรอง
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const buildingId = searchParams.get('buildingId');
    const category = searchParams.get('category');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    // สร้างเงื่อนไขการค้นหา
    const where: any = {};
    if (buildingId) where.buildingId = buildingId;
    if (category) {
      if (!VALID_CATEGORIES.includes(category)) {
        return NextResponse.json(
          { success: false, error: `ประเภทวัสดุไม่ถูกต้อง ต้องเป็น: ${VALID_CATEGORIES.join(', ')}` },
          { status: 400 }
        );
      }
      where.category = category;
    }

    const records = await db.buildingMaterialRecord.findMany({
      where,
      include: {
        building: {
          select: {
            buildingId: true,
            name: true,
            nameTh: true,
            grossFloorArea: true,
            province: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    const total = await db.buildingMaterialRecord.count({ where });

    // สรุปสถิติ
    const stats = await db.buildingMaterialRecord.aggregate({
      where,
      _count: true,
      _sum: {
        embodiedCarbon: true,
        quantity: true,
        recycledContent: true,
      },
    });

    // สรุปตามประเภท
    const categoryBreakdown: Record<string, { count: number; totalEmbodiedCarbon: number }> = {};
    for (const cat of VALID_CATEGORIES) {
      const catStats = await db.buildingMaterialRecord.aggregate({
        where: { ...where, category: cat },
        _count: true,
        _sum: { embodiedCarbon: true },
      });
      categoryBreakdown[cat] = {
        count: catStats._count,
        totalEmbodiedCarbon: catStats._sum.embodiedCarbon || 0,
      };
    }

    // นับวัสดุที่มาในพื้นที่
    const localSourceCount = await db.buildingMaterialRecord.count({
      where: { ...where, localSource: true },
    });

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
        totalEmbodiedCarbon: stats._sum.embodiedCarbon || 0,
        totalQuantity: stats._sum.quantity || 0,
        avgRecycledContent: stats._sum.recycledContent
          ? Math.round((stats._sum.recycledContent / stats._count) * 100) / 100
          : 0,
        localSourcePct: stats._count > 0
          ? Math.round((localSourceCount / stats._count) * 10000) / 100
          : 0,
        categoryBreakdown,
      },
      referenceFactors: THAI_MATERIAL_CARBON_FACTORS,
    });
  } catch (error: any) {
    console.error('❌ ดึงข้อมูลวัสดุล้มเหลว:', error);
    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาดในการดึงข้อมูลวัสดุ', detail: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/low-carbon-building/materials
 * สร้างบันทึกวัสดุใหม่ พร้อมคำนวณ embodied carbon อัตโนมัติ
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // ตรวจสอบข้อมูลจำเป็น
    if (!body.buildingId || !body.materialName) {
      return NextResponse.json(
        { success: false, error: 'กรุณาระบุ buildingId และ materialName' },
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

    // ตรวจสอบประเภทวัสดุ
    const category = body.category || 'STRUCTURAL';
    if (!VALID_CATEGORIES.includes(category)) {
      return NextResponse.json(
        { success: false, error: `ประเภทวัสดุไม่ถูกต้อง ต้องเป็น: ${VALID_CATEGORIES.join(', ')}` },
        { status: 400 }
      );
    }

    const quantity = body.quantity || 0;
    const carbonFactor = body.carbonFactor || 0;
    const unit = body.unit || 'kg';

    // ตรวจสอบค่าที่ไม่ถูกต้อง
    if (quantity < 0) {
      return NextResponse.json(
        { success: false, error: 'ปริมาณวัสดุต้องไม่ติดลบ' },
        { status: 400 }
      );
    }
    if (carbonFactor < 0) {
      return NextResponse.json(
        { success: false, error: 'ค่า carbon factor ต้องไม่ติดลบ' },
        { status: 400 }
      );
    }

    // ตรวจสอบ carbon factor กับค่าอ้างอิง
    const validation = validateCarbonFactor(body.materialName, carbonFactor);

    // คำนวณ embodied carbon: ปริมาณ × ค่าปัจจัยคาร์บอน
    const embodiedCarbon = quantity * carbonFactor;

    // สร้างบันทึกวัสดุ
    const record = await db.buildingMaterialRecord.create({
      data: {
        buildingId: body.buildingId,
        materialName: body.materialName,
        materialNameTh: body.materialNameTh || validation.reference?.nameTh || '',
        category,
        quantity,
        unit,
        carbonFactor,
        embodiedCarbon: Math.round(embodiedCarbon * 100) / 100,
        recycledContent: body.recycledContent || 0,
        localSource: body.localSource || false,
        supplier: body.supplier || '',
      },
      include: {
        building: {
          select: {
            buildingId: true,
            name: true,
            nameTh: true,
            grossFloorArea: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: `บันทึกข้อมูลวัสดุ "${body.materialName}" สำเร็จ`,
        data: record,
        calculations: {
          embodiedCarbon: {
            value: record.embodiedCarbon,
            formula: `${quantity} ${unit} × ${carbonFactor} kgCO2e/${unit} = ${record.embodiedCarbon} kgCO2e`,
          },
          carbonFactorValidation: {
            isValid: validation.isValid,
            deviation: validation.deviation,
            reference: validation.reference
              ? {
                  factor: validation.reference.factor,
                  unit: validation.reference.unit,
                  nameTh: validation.reference.nameTh,
                }
              : null,
            warning: validation.warning || null,
          },
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('❌ สร้างบันทึกวัสดุล้มเหลว:', error);
    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาดในการสร้างบันทึกวัสดุ', detail: error.message },
      { status: 500 }
    );
  }
}
