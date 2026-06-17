/**
 * POST /api/low-carbon-building/calculate
 * ──────────────────────────────────────────────
 * คำนวณเครดิตคาร์บอนของอาคาร
 * ใช้ระเบียบวิธี T-VER-BLDG-01
 * คำนวณ: การลดการปล่อย, EUI improvement, เครดิตคาร์บอน
 * คืนค่ารายงานการคำนวณโดยละเอียดพร้อมสูตรและรายละเอียด
 */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// ค่าคงที่สำหรับระเบียบวิธี T-VER-BLDG-01
const METHODOLOGY_CONSTANTS = {
  // ค่าปัจจัยการปล่อยของกริดไทย (kgCO2/kWh) - EGAT 2023
  THAILAND_GRID_EF: 0.5,
  // สัดส่วน Buffer สำหรับความไม่แน่นอน (15% ตาม T-VER-BLDG-01)
  BUFFER_RATIO: 0.15,
  // ค่าเฉลี่ย EUI อ้างอิงตามประเภทอาคารในประเทศไทย (kWh/m²/ปี)
  BASELINE_EUI: {
    OFFICE: 150,
    RESIDENTIAL: 80,
    RETAIL: 200,
    HOSPITAL: 250,
    SCHOOL: 90,
    HOTEL: 180,
    MIXED_USE: 160,
  } as Record<string, number>,
  // น้ำหนักคะแนนสำหรับ Green Building Score
  SCORE_WEIGHTS: {
    energyEfficiency: 0.35,    // ประสิทธิภาพพลังงาน
    renewableEnergy: 0.20,     // พลังงานหมุนเวียน
    waterEfficiency: 0.15,     // ประสิทธิภาพน้ำ
    materialSustainability: 0.15, // วัสดุยั่งยืน
    greenArea: 0.15,           // พื้นที่สีเขียว
  },
};

/**
 * คำนวณประสิทธิภาพพลังงาน (Energy Efficiency Score)
 * เปรียบเทียบ EUI ของโครงการกับค่าอ้างอิง
 */
function calculateEnergyEfficiencyScore(
  baselineEUI: number,
  projectEUI: number,
  buildingType: string
): { score: number; percentage: number; details: string } {
  const referenceEUI = METHODOLOGY_CONSTANTS.BASELINE_EUI[buildingType] || 150;
  const effectiveBaseline = baselineEUI > 0 ? baselineEUI : referenceEUI;
  const improvement = effectiveBaseline - projectEUI;
  const percentage = effectiveBaseline > 0 ? (improvement / effectiveBaseline) * 100 : 0;

  // แปลงเป็นคะแนน 0-100
  // ลด 50% = คะแนนเต็ม 100, ลด 0% = คะแนน 0
  const score = Math.min(100, Math.max(0, percentage * 2));

  return {
    score: Math.round(score * 100) / 100,
    percentage: Math.round(percentage * 100) / 100,
    details: `EUI อ้างอิง: ${effectiveBaseline} kWh/m²/ปี, EUI โครงการ: ${projectEUI} kWh/m²/ปี, ลดลง ${percentage.toFixed(1)}%`,
  };
}

/**
 * คำนวณคะแนนพลังงานหมุนเวียน
 */
function calculateRenewableScore(renewablePct: number): { score: number; details: string } {
  // 100% พลังงานหมุนเวียน = คะแนนเต็ม 100
  const score = Math.min(100, renewablePct * (100 / 50)); // 50% = คะแนน 100
  return {
    score: Math.round(score * 100) / 100,
    details: `พลังงานหมุนเวียน: ${renewablePct}% → คะแนน ${score.toFixed(1)}/100`,
  };
}

/**
 * คำนวณคะแนนประสิทธิภาพน้ำ
 */
function calculateWaterScore(waterReductionPct: number): { score: number; details: string } {
  const score = Math.min(100, waterReductionPct * (100 / 40)); // 40% = คะแนน 100
  return {
    score: Math.round(score * 100) / 100,
    details: `ลดการใช้น้ำ: ${waterReductionPct}% → คะแนน ${score.toFixed(1)}/100`,
  };
}

/**
 * คำนวณคะแนนวัสดุยั่งยืน
 */
function calculateMaterialScore(materialSavingsPct: number): { score: number; details: string } {
  const score = Math.min(100, materialSavingsPct * (100 / 30)); // 30% = คะแนน 100
  return {
    score: Math.round(score * 100) / 100,
    details: `ประหยัดคาร์บอนวัสดุ: ${materialSavingsPct}% → คะแนน ${score.toFixed(1)}/100`,
  };
}

/**
 * คำนวณคะแนนพื้นที่สีเขียว
 */
function calculateGreenAreaScore(greenAreaRatio: number): { score: number; details: string } {
  const score = Math.min(100, greenAreaRatio * (100 / 0.3)); // ratio 0.3 = คะแนน 100
  return {
    score: Math.round(score * 100) / 100,
    details: `อัตราส่วนพื้นที่สีเขียว: ${greenAreaRatio} → คะแนน ${score.toFixed(1)}/100`,
  };
}

/**
 * คำนวณ Green Building Score รวม
 */
function calculateGreenBuildingScore(
  building: {
    baselineEUI: number;
    projectEUI: number;
    buildingType: string;
    renewableEnergyPct: number;
    waterReductionPct: number;
    materialSavingsPct: number;
    greenAreaRatio: number;
  },
  energyReductionPct: number
) {
  const energyScore = calculateEnergyEfficiencyScore(
    building.baselineEUI,
    building.projectEUI,
    building.buildingType
  );
  const renewableScore = calculateRenewableScore(building.renewableEnergyPct);
  const waterScore = calculateWaterScore(building.waterReductionPct);
  const materialScore = calculateMaterialScore(building.materialSavingsPct);
  const greenAreaScore = calculateGreenAreaScore(building.greenAreaRatio);

  // คำนวณคะแนนรวมด้วยน้ำหนัก
  const totalScore =
    energyScore.score * METHODOLOGY_CONSTANTS.SCORE_WEIGHTS.energyEfficiency +
    renewableScore.score * METHODOLOGY_CONSTANTS.SCORE_WEIGHTS.renewableEnergy +
    waterScore.score * METHODOLOGY_CONSTANTS.SCORE_WEIGHTS.waterEfficiency +
    materialScore.score * METHODOLOGY_CONSTANTS.SCORE_WEIGHTS.materialSustainability +
    greenAreaScore.score * METHODOLOGY_CONSTANTS.SCORE_WEIGHTS.greenArea;

  // กำหนดระดับ
  let level = 'UNRATED';
  if (totalScore >= 80) level = 'PLATINUM';
  else if (totalScore >= 65) level = 'GOLD';
  else if (totalScore >= 50) level = 'SILVER';
  else if (totalScore >= 35) level = 'CERTIFIED';

  return {
    totalScore: Math.round(totalScore * 100) / 100,
    level,
    breakdown: {
      energyEfficiency: energyScore,
      renewableEnergy: renewableScore,
      waterEfficiency: waterScore,
      materialSustainability: materialScore,
      greenArea: greenAreaScore,
    },
    weights: METHODOLOGY_CONSTANTS.SCORE_WEIGHTS,
  };
}

/**
 * POST /api/low-carbon-building/calculate
 * คำนวณเครดิตคาร์บอนของอาคารตามระเบียบวิธี T-VER-BLDG-01
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // ตรวจสอบข้อมูลจำเป็น
    if (!body.buildingId) {
      return NextResponse.json(
        { success: false, error: 'กรุณาระบุ buildingId' },
        { status: 400 }
      );
    }

    // ดึงข้อมูลอาคาร
    const building = await db.lowCarbonBuilding.findUnique({
      where: { buildingId: body.buildingId },
      include: {
        energyRecords: {
          orderBy: { recordDate: 'desc' },
          take: 100,
        },
        materialRecords: true,
      },
    });

    if (!building) {
      return NextResponse.json(
        { success: false, error: `ไม่พบอาคารที่มี buildingId "${body.buildingId}"` },
        { status: 404 }
      );
    }

    // กำหนดช่วงเวลาติดตาม
    const monitoringStartDate = body.monitoringStartDate
      ? new Date(body.monitoringStartDate)
      : building.energyRecords.length > 0
        ? building.energyRecords[building.energyRecords.length - 1].recordDate
        : new Date(new Date().getFullYear(), 0, 1);

    const monitoringEndDate = body.monitoringEndDate
      ? new Date(body.monitoringEndDate)
      : new Date();

    // กรองข้อมูลพลังงานตามช่วงเวลา
    const monitoringRecords = building.energyRecords.filter((r) => {
      return r.recordDate >= monitoringStartDate && r.recordDate <= monitoringEndDate;
    });

    // ═══════════════════════════════════════════════════════════════
    // 1. คำนวณการลดการปล่อยก๊าซเรือนกระจก (Emission Reduction)
    // ═══════════════════════════════════════════════════════════════

    const baselineEmission = building.baselineEmission || 0;
    const projectEmission = building.projectEmission || 0;
    const emissionReduction = baselineEmission - projectEmission;

    // คำนวณจากข้อมูลจริง (ถ้ามี)
    let actualProjectEmission = projectEmission;
    let actualBaselineEmission = baselineEmission;
    let calculatedFromRecords = false;

    if (monitoringRecords.length > 0) {
      calculatedFromRecords = true;
      // รวม carbon emission จากข้อมูลจริง
      actualProjectEmission = monitoringRecords.reduce((sum, r) => sum + r.carbonEmission, 0);

      // คำนวณ baseline จาก EUI อ้างอิง
      const referenceEUI = METHODOLOGY_CONSTANTS.BASELINE_EUI[building.buildingType] || 150;
      const daysInPeriod = Math.max(1, Math.ceil(
        (monitoringEndDate.getTime() - monitoringStartDate.getTime()) / (1000 * 60 * 60 * 24)
      ));
      const yearlyFraction = daysInPeriod / 365;
      actualBaselineEmission =
        (referenceEUI * building.grossFloorArea * METHODOLOGY_CONSTANTS.THAILAND_GRID_EF) /
        1000 * // แปลงเป็น tCO2e
        yearlyFraction;
    }

    const actualEmissionReduction = actualBaselineEmission - actualProjectEmission;

    // ═══════════════════════════════════════════════════════════════
    // 2. คำนวณ EUI Improvement
    // ═══════════════════════════════════════════════════════════════

    const baselineEUI = building.baselineEUI || METHODOLOGY_CONSTANTS.BASELINE_EUI[building.buildingType] || 150;
    const projectEUI = building.projectEUI || 0;
    const euiImprovement = baselineEUI - projectEUI;
    const euiImprovementPct = baselineEUI > 0 ? (euiImprovement / baselineEUI) * 100 : 0;

    // คำนวณ EUI จริงจากข้อมูล
    let actualProjectEUI = projectEUI;
    if (monitoringRecords.length > 0 && building.grossFloorArea > 0) {
      const totalEnergy = monitoringRecords.reduce((sum, r) => sum + r.electricityKwh, 0);
      // ปรับเป็นรายปี
      const daysInPeriod = Math.max(1, Math.ceil(
        (monitoringEndDate.getTime() - monitoringStartDate.getTime()) / (1000 * 60 * 60 * 24)
      ));
      const yearlyFactor = 365 / daysInPeriod;
      actualProjectEUI = (totalEnergy * yearlyFactor) / building.grossFloorArea;
    }

    // ═══════════════════════════════════════════════════════════════
    // 3. คำนวณเครดิตคาร์บอนตาม T-VER-BLDG-01
    // ═══════════════════════════════════════════════════════════════

    // การลดการปล่อยก่อนหัก buffer
    const grossEmissionReduction = Math.max(0, actualEmissionReduction);

    // หัก Buffer 15% สำหรับความไม่แน่นอน (ตาม T-VER-BLDG-01)
    const bufferDeduction = grossEmissionReduction * METHODOLOGY_CONSTANTS.BUFFER_RATIO;
    const netEmissionReduction = grossEmissionReduction - bufferDeduction;

    // เครดิตคาร์บอน (1 tCO2e = 1 เครดิต)
    const carbonCredits = netEmissionReduction;

    // ═══════════════════════════════════════════════════════════════
    // 4. คำนวณ Green Building Score
    // ═══════════════════════════════════════════════════════════════

    const energyReductionPct = baselineEUI > 0 ? ((baselineEUI - actualProjectEUI) / baselineEUI) * 100 : 0;

    const greenBuildingScore = calculateGreenBuildingScore(
      {
        baselineEUI,
        projectEUI: actualProjectEUI,
        buildingType: building.buildingType,
        renewableEnergyPct: building.renewableEnergyPct,
        waterReductionPct: building.waterReductionPct,
        materialSavingsPct: building.materialSavingsPct,
        greenAreaRatio: building.greenAreaRatio,
      },
      energyReductionPct
    );

    // ═══════════════════════════════════════════════════════════════
    // 5. สรุปข้อมูลวัสดุ
    // ═══════════════════════════════════════════════════════════════

    const totalEmbodiedCarbon = building.materialRecords.reduce(
      (sum, r) => sum + r.embodiedCarbon,
      0
    );
    const localMaterialPct =
      building.materialRecords.length > 0
        ? (building.materialRecords.filter((r) => r.localSource).length /
            building.materialRecords.length) *
          100
        : 0;
    const recycledContentAvg =
      building.materialRecords.length > 0
        ? building.materialRecords.reduce((sum, r) => sum + r.recycledContent, 0) /
          building.materialRecords.length
        : 0;

    // ═══════════════════════════════════════════════════════════════
    // 6. อัพเดทข้อมูลอาคาร
    // ═══════════════════════════════════════════════════════════════

    await db.lowCarbonBuilding.update({
      where: { buildingId: body.buildingId },
      data: {
        baselineEUI,
        projectEUI: actualProjectEUI || projectEUI,
        baselineEmission: actualBaselineEmission || baselineEmission,
        projectEmission: actualProjectEmission || projectEmission,
        emissionReduction: Math.max(0, actualEmissionReduction || emissionReduction),
      },
    });

    // ═══════════════════════════════════════════════════════════════
    // สร้างรายงานการคำนวณ
    // ═══════════════════════════════════════════════════════════════

    const report = {
      // ข้อมูลทั่วไป
      buildingInfo: {
        buildingId: building.buildingId,
        name: building.name,
        nameTh: building.nameTh,
        province: building.province,
        buildingType: building.buildingType,
        grossFloorArea: building.grossFloorArea,
        floors: building.floors,
        yearBuilt: building.yearBuilt,
        certificationStd: building.certificationStd,
        certificationLevel: building.certificationLevel,
        methodology: building.methodology,
      },

      // ช่วงเวลาติดตาม
      monitoringPeriod: {
        startDate: monitoringStartDate.toISOString(),
        endDate: monitoringEndDate.toISOString(),
        days: Math.ceil(
          (monitoringEndDate.getTime() - monitoringStartDate.getTime()) / (1000 * 60 * 60 * 24)
        ),
        energyRecordsUsed: monitoringRecords.length,
        calculatedFromRecords,
      },

      // การคำนวณการลดการปล่อย
      emissionCalculation: {
        baselineEmission: {
          value: Math.round(actualBaselineEmission * 10000) / 10000,
          unit: 'tCO2e/ปี',
          formula: calculatedFromRecords
            ? `EUI_อ้างอิง (${baselineEUI} kWh/m²/ปี) × พื้นที่ (${building.grossFloorArea} m²) × ปัจจัยการปล่อย (${METHODOLOGY_CONSTANTS.THAILAND_GRID_EF} kgCO2/kWh) / 1000 = ${actualBaselineEmission.toFixed(4)} tCO2e`
            : `ค่า baseline ที่บันทึกไว้: ${actualBaselineEmission} tCO2e/ปี`,
        },
        projectEmission: {
          value: Math.round(actualProjectEmission * 10000) / 10000,
          unit: 'tCO2e/ปี',
          formula: calculatedFromRecords
            ? `ผลรวม carbon emission จาก ${monitoringRecords.length} รายการ = ${actualProjectEmission.toFixed(4)} tCO2e`
            : `ค่า project ที่บันทึกไว้: ${actualProjectEmission} tCO2e/ปี`,
        },
        emissionReduction: {
          value: Math.round(actualEmissionReduction * 10000) / 10000,
          unit: 'tCO2e/ปี',
          formula: `Baseline (${actualBaselineEmission.toFixed(4)}) - Project (${actualProjectEmission.toFixed(4)}) = ${actualEmissionReduction.toFixed(4)} tCO2e`,
        },
      },

      // การคำนวณ EUI
      euiCalculation: {
        baselineEUI: {
          value: baselineEUI,
          unit: 'kWh/m²/ปี',
          source: building.baselineEUI > 0 ? 'บันทึกไว้' : `ค่าอ้างอิง ${building.buildingType}`,
        },
        projectEUI: {
          value: Math.round(actualProjectEUI * 100) / 100,
          unit: 'kWh/m²/ปี',
          source: calculatedFromRecords ? 'คำนวณจากข้อมูลจริง' : 'บันทึกไว้',
        },
        improvement: {
          absolute: Math.round(euiImprovement * 100) / 100,
          percentage: Math.round(euiImprovementPct * 100) / 100,
          unit: 'kWh/m²/ปี',
          formula: `(${baselineEUI} - ${actualProjectEUI.toFixed(2)}) / ${baselineEUI} × 100 = ${euiImprovementPct.toFixed(2)}%`,
        },
      },

      // การคำนวณเครดิตคาร์บอน T-VER-BLDG-01
      carbonCreditCalculation: {
        methodology: 'T-VER-BLDG-01',
        grossEmissionReduction: {
          value: Math.round(grossEmissionReduction * 10000) / 10000,
          unit: 'tCO2e',
          description: 'การลดการปล่อยก่อนหัก buffer',
        },
        bufferDeduction: {
          value: Math.round(bufferDeduction * 10000) / 10000,
          unit: 'tCO2e',
          percentage: `${(METHODOLOGY_CONSTANTS.BUFFER_RATIO * 100).toFixed(0)}%`,
          description: 'หัก Buffer สำหรับความไม่แน่นอน (15% ตาม T-VER-BLDG-01)',
          formula: `${grossEmissionReduction.toFixed(4)} × ${METHODOLOGY_CONSTANTS.BUFFER_RATIO} = ${bufferDeduction.toFixed(4)} tCO2e`,
        },
        netEmissionReduction: {
          value: Math.round(netEmissionReduction * 10000) / 10000,
          unit: 'tCO2e',
          description: 'การลดการปล่อยสุทธิหลังหัก buffer',
          formula: `${grossEmissionReduction.toFixed(4)} - ${bufferDeduction.toFixed(4)} = ${netEmissionReduction.toFixed(4)} tCO2e`,
        },
        carbonCredits: {
          value: Math.round(carbonCredits * 10000) / 10000,
          unit: 'เครดิต (tCO2e)',
          description: 'จำนวนเครดิตคาร์บอนที่ได้รับ',
        },
      },

      // Green Building Score
      greenBuildingScore,

      // ข้อมูลวัสดุ
      materialSummary: {
        totalEmbodiedCarbon: Math.round(totalEmbodiedCarbon * 100) / 100,
        unit: 'kgCO2e',
        totalMaterials: building.materialRecords.length,
        localMaterialPct: Math.round(localMaterialPct * 100) / 100,
        recycledContentAvg: Math.round(recycledContentAvg * 100) / 100,
        embodiedCarbonPerArea:
          building.grossFloorArea > 0
            ? Math.round((totalEmbodiedCarbon / building.grossFloorArea) * 100) / 100
            : 0,
      },

      // ค่าคงที่ที่ใช้
      constants: {
        thailandGridEF: `${METHODOLOGY_CONSTANTS.THAILAND_GRID_EF} kgCO2/kWh (ค่าปัจจัยการปล่อยของกริดไทย ปี 2023)`,
        bufferRatio: `${(METHODOLOGY_CONSTANTS.BUFFER_RATIO * 100).toFixed(0)}% (ตามระเบียบวิธี T-VER-BLDG-01)`,
        baselineEUIReference: METHODOLOGY_CONSTANTS.BASELINE_EUI,
      },
    };

    return NextResponse.json({
      success: true,
      message: `คำนวณเครดิตคาร์บอนสำเร็จ: ${carbonCredits.toFixed(4)} เครดิต (tCO2e)`,
      report,
    });
  } catch (error: any) {
    console.error('❌ คำนวณเครดิตคาร์บอนล้มเหลว:', error);
    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาดในการคำนวณเครดิตคาร์บอน', detail: error.message },
      { status: 500 }
    );
  }
}
