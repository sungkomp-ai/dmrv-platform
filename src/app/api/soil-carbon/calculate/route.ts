/**
 * POST /api/soil-carbon/calculate
 * ──────────────────────────────────────────────
 * คำนวณเครดิตคาร์บอนสำหรับแปลงขั้นบันได/กักตะกอนดินบนพื้นที่ลาดชัน
 * อ้างอิงวิธีการ T-VER-SOIL-01 สำหรับพื้นที่ลาดชัน (Sediment Trap Methodology)
 *
 * ขั้นตอนการคำนวณ:
 *   Step 1: SOC Stock Change — ΔSOC × 44/12 × areaHa
 *   Step 2: Sediment Trapped Carbon — sedimentTrappedKg × organicCarbonPct/100 / 1000 × 44/12 ต่อชั้นปลูก
 *   Step 2.5: Vetiver Grass Carbon — (vetiverSedimentCarbon + vetiverBiomassCarbon + vetiverErosionCredit) × 44/12 ต่อชั้นปลูกที่มีหญ้าแฝก
 *   Step 3: Check Dam Carbon — sedimentCarbonTc × 44/12 ต่อฝายชะลอน้ำ
 *   Step 4: Erosion Prevention — (baselineSediment − projectSediment) × avgSOCPct/100 × areaHa × 44/12
 *   Step 5: GHG Emission Reduction — (baselineEmission − projectEmission) × areaHa × monitoringYears
 *   Step 6: Gross = Step1+2+2.5+3+4+5, Buffer 20% (T-VER-SOIL-01), Net = Gross × 0.80
 *   Step 7: Co-benefits — การลดการไหลของน้ำ, การลดปริมาณน้ำไหลบ่า
 */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// ─── อัตราส่วน Global Warming Potential (GWP100) ตาม IPCC AR6 ───
const GWP = {
  CO2: 1,
  CH4: 27.9,   // ก๊าซมีเทน
  N2O: 273,    // ก๊าซไนตรัสออกไซด์
};

// ─── อัตราส่วนโมเลกุล ───
const MOLECULAR_RATIO = {
  CO2_TO_C: 44 / 12,   // ≈ 3.667 (แปลงคาร์บอนเป็น CO2)
  CH4_TO_C: 16 / 12,   // ≈ 1.333
  N2O_TO_N: 44 / 28,   // ≈ 1.571
};

// ─── T-VER-SOIL-01 Methodology Constants ───
const T_VER_SOIL = {
  BUFFER_PCT: 20,
  MONITORING_PERIOD_MIN_YR: 1,
  MONITORING_PERIOD_MAX_YR: 10,
  CREDIT_VALIDITY_YR: 10,
  UNCERTAINTY_DEDUCTION_PCT: 20,
  SOC_STOCK_CHANGE_THRESHOLD: 0.05,
  DEFAULT_BULK_DENSITY: 1.3, // g/cm³ ความหนาแน่นรวมของดินเฉลี่ย
};

// ─── ปัดเศษทศนิยม ───
function round(val: number, decimals: number = 3): number {
  const factor = Math.pow(10, decimals);
  return Math.round(val * factor) / factor;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { plotId, monitoringPeriodStart, monitoringPeriodEnd, includeDetailReport } = body;

    // ─── ตรวจสอบข้อมูลที่จำเป็น ───
    if (!plotId) {
      return NextResponse.json(
        { success: false, error: 'ต้องระบุ plotId' },
        { status: 400 }
      );
    }

    // ─── ดึงข้อมูลแปลงพร้อมชั้นปลูก ฝาย และการวัด ───
    const plot = await db.soilCarbonPlot.findUnique({
      where: { plotId },
      include: {
        measurements: {
          orderBy: { measurementDate: 'desc' },
        },
        terraces: {
          orderBy: { layerNumber: 'asc' },
          include: {
            checkDam: true,
            measurements: {
              orderBy: { measurementDate: 'desc' },
            },
          },
        },
        checkDams: {
          orderBy: { damId: 'asc' },
        },
      },
    });

    if (!plot) {
      return NextResponse.json(
        { success: false, error: `ไม่พบแปลงที่มี plotId: ${plotId}` },
        { status: 404 }
      );
    }

    // ─── กำหนดช่วงเวลาติดตาม ───
    const startDate = monitoringPeriodStart ? new Date(monitoringPeriodStart) : new Date(plot.createdAt);
    const endDate = monitoringPeriodEnd ? new Date(monitoringPeriodEnd) : new Date();
    const monitoringYears = Math.max(
      T_VER_SOIL.MONITORING_PERIOD_MIN_YR,
      (endDate.getTime() - startDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
    );

    if (monitoringYears > T_VER_SOIL.MONITORING_PERIOD_MAX_YR) {
      return NextResponse.json(
        { success: false, error: `รอบติดตามเกิน ${T_VER_SOIL.MONITORING_PERIOD_MAX_YR} ปี ไม่เป็นไปตาม T-VER-SOIL-01` },
        { status: 400 }
      );
    }

    // ─── กรองข้อมูลการวัดตามช่วงเวลา ───
    const periodMeasurements = plot.measurements.filter((m: any) => {
      const mDate = new Date(m.measurementDate);
      return mDate >= startDate && mDate <= endDate;
    });

    // ═══════════════════════════════════════════════════════════════════════
    // Step 1: SOC Stock Change (การเปลี่ยนแปลง SOC)
    // ΔSOC = projectSOC − baselineSOC (tC/ha)
    // SOC Credits = ΔSOC × 44/12 × areaHa (tCO2e)
    // ═══════════════════════════════════════════════════════════════════════
    const deltaSOC = plot.projectSOC - plot.baselineSOC;
    const socCreditsCO2e = deltaSOC * MOLECULAR_RATIO.CO2_TO_C * plot.areaHa;

    // ═══════════════════════════════════════════════════════════════════════
    // Step 2: Sediment Trapped Carbon (คาร์บอนในตะกอนที่ถูกกักในชั้นปลูก)
    // สำหรับแต่ละชั้นปลูก:
    //   sedimentCarbon = sedimentTrappedKg × organicCarbonPct/100 / 1000 (tC)
    //   sedimentCO2e = sedimentCarbon × 44/12
    // ═══════════════════════════════════════════════════════════════════════
    const terraceSedimentDetails: any[] = [];
    let totalTerraceSedimentCarbonTc = 0;
    let totalTerraceSedimentCO2e = 0;

    for (const terrace of plot.terraces) {
      // ใช้ sedimentTrappedKg และ organicCarbonPct จากชั้นปลูกโดยตรง
      const sedimentTrappedKg = terrace.sedimentTrappedKg || 0;
      const organicCarbonPct = terrace.organicCarbonPct || 0;

      // สูตร: sedimentCarbon = sedimentTrappedKg × organicCarbonPct/100 / 1000 (tC)
      const sedimentCarbon = sedimentTrappedKg * (organicCarbonPct / 100) / 1000;

      // แปลงเป็น CO2e
      const sedimentCO2e = sedimentCarbon * MOLECULAR_RATIO.CO2_TO_C;

      totalTerraceSedimentCarbonTc += sedimentCarbon;
      totalTerraceSedimentCO2e += sedimentCO2e;

      terraceSedimentDetails.push({
        layerNumber: terrace.layerNumber,
        layerNameTh: terrace.layerNameTh,
        elevationMasl: terrace.elevationMasl,
        dimensions: {
          lengthM: terrace.lengthM,
          widthM: terrace.widthM,
          plantingAreaWidthM: terrace.plantingAreaWidthM,
          ridgeWidthM: terrace.ridgeWidthM,
          sedimentDepthCm: terrace.sedimentDepthCm,
        },
        calculations: {
          sedimentTrappedKg: round(sedimentTrappedKg),
          organicCarbonPct: round(organicCarbonPct, 2),
          sedimentCarbonTc: round(sedimentCarbon),
          sedimentCO2e: round(sedimentCO2e),
        },
        // ข้อมูลหญ้าแฝกบนคันขอบ (Vetiver Grass) — จะเพิ่มค่า CO2e ใน Step 2.5
        vetiverData: terrace.vetiverGrassStatus !== 'NONE' ? {
          ridgeWidthM: terrace.ridgeWidthM,
          plantingAreaWidthM: terrace.plantingAreaWidthM,
          vetiverGrassStatus: terrace.vetiverGrassStatus,
          vetiverRootDepthCm: terrace.vetiverRootDepthCm,
          vetiverErosionPreventionPct: terrace.vetiverErosionPreventionPct,
          vetiverSedimentAccumulationKg: terrace.vetiverSedimentAccumulationKg,
          vetiverCarbonSequestrationKg: terrace.vetiverCarbonSequestrationKg,
          vetiverCO2e: 0, // จะคำนวณใน Step 2.5
        } : null,
      });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // Step 2.5: Vetiver Grass Carbon Sequestration (เครดิตคาร์บอนจากหญ้าแฝกบนคันขอบ)
    // สำหรับแต่ละชั้นปลูกที่มีหญ้าแฝก (vetiverGrassStatus != 'NONE'):
    //   vetiverSedimentCarbon = vetiverSedimentAccumulationKg × organicCarbonPct/100 / 1000 × 44/12
    //   vetiverBiomassCarbon = vetiverCarbonSequestrationKg / 1000 × 44/12
    //   vetiverErosionCredit = (vetiverErosionPreventionPct/100) × ridgeWidthM × lengthM × baselineSediment × 0.001 × 44/12
    //   Total vetiver credit per terrace = sum of above
    // ═══════════════════════════════════════════════════════════════════════
    let totalVetiverCO2e = 0;
    const vetiverDetails: any[] = [];

    for (const terrace of plot.terraces) {
      if ((terrace.vetiverGrassStatus || 'NONE') === 'NONE') continue;

      const organicCarbonPct = terrace.organicCarbonPct || 0;
      const ridgeWidthM = terrace.ridgeWidthM || 0;
      const lengthM = terrace.lengthM || 0;

      // ─── ตะกอนดินเพิ่มเติมจากหญ้าแฝก (Vetiver Sediment Carbon) ───
      // สูตร: vetiverSedimentAccumulationKg × organicCarbonPct/100 / 1000 × 44/12 (tCO2e)
      const vetiverSedimentCarbon = (terrace.vetiverSedimentAccumulationKg || 0) * (organicCarbonPct / 100) / 1000;
      const vetiverSedimentCO2e = vetiverSedimentCarbon * MOLECULAR_RATIO.CO2_TO_C;

      // ─── คาร์บอนจากมวลชีวภาพหญ้าแฝก (Vetiver Biomass Carbon) ───
      // สูตร: vetiverCarbonSequestrationKg / 1000 × 44/12 (tCO2e)
      const vetiverBiomassCarbon = (terrace.vetiverCarbonSequestrationKg || 0) / 1000;
      const vetiverBiomassCO2e = vetiverBiomassCarbon * MOLECULAR_RATIO.CO2_TO_C;

      // ─── เครดิตจากการป้องกันการพังทลายดินโดยหญ้าแฝก (Vetiver Erosion Prevention Credit) ───
      // สูตร: (vetiverErosionPreventionPct/100) × ridgeWidthM × lengthM × baselineSediment × 0.001 × 44/12 (tCO2e)
      // คิดจากพื้นที่คันขอบ × อัตราการพังทลายพื้นฐาน × % ที่หญ้าแฝกป้องกัน
      const vetiverErosionCreditTc = (terrace.vetiverErosionPreventionPct || 0) / 100 * ridgeWidthM * lengthM * plot.baselineSediment * 0.001;
      const vetiverErosionCO2e = vetiverErosionCreditTc * MOLECULAR_RATIO.CO2_TO_C;

      // รวมเครดิตหญ้าแฝกของชั้นนี้
      const vetiverCO2e = vetiverSedimentCO2e + vetiverBiomassCO2e + vetiverErosionCO2e;
      totalVetiverCO2e += vetiverCO2e;

      // อัปเดต vetiverCO2e ใน terraceSedimentDetails
      const detailItem = terraceSedimentDetails.find(d => d.layerNumber === terrace.layerNumber);
      if (detailItem && detailItem.vetiverData) {
        detailItem.vetiverData.vetiverCO2e = round(vetiverCO2e);
      }

      vetiverDetails.push({
        layerNumber: terrace.layerNumber,
        layerNameTh: terrace.layerNameTh,
        vetiverGrassStatus: terrace.vetiverGrassStatus,
        vetiverRootDepthCm: terrace.vetiverRootDepthCm,
        vetiverPlantDensity: terrace.vetiverPlantDensity,
        calculations: {
          vetiverSedimentCarbon: round(vetiverSedimentCarbon),
          vetiverSedimentCO2e: round(vetiverSedimentCO2e),
          vetiverBiomassCarbon: round(vetiverBiomassCarbon),
          vetiverBiomassCO2e: round(vetiverBiomassCO2e),
          vetiverErosionCreditTc: round(vetiverErosionCreditTc),
          vetiverErosionCO2e: round(vetiverErosionCO2e),
          totalVetiverCO2e: round(vetiverCO2e),
        },
      });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // Step 3: Check Dam Carbon (คาร์บอนในตะกอนหลังฝายชะลอน้ำ)
    // sedimentCarbonTc (ที่เก็บไว้แล้ว) × 44/12 = tCO2e
    // ═══════════════════════════════════════════════════════════════════════
    const checkDamDetails: any[] = [];
    let totalCheckDamCarbonTc = 0;
    let totalCheckDamCO2e = 0;

    for (const dam of plot.checkDams) {
      // ใช้ค่า sedimentCarbonTc ที่เก็บไว้แล้วโดยตรง
      const sedimentCarbonTc = dam.sedimentCarbonTc || 0;
      const damCO2e = sedimentCarbonTc * MOLECULAR_RATIO.CO2_TO_C;

      totalCheckDamCarbonTc += sedimentCarbonTc;
      totalCheckDamCO2e += damCO2e;

      checkDamDetails.push({
        damId: dam.damId,
        damNameTh: dam.damNameTh,
        damType: dam.damType,
        status: dam.status,
        dimensions: {
          heightM: dam.heightM,
          widthM: dam.widthM,
          thicknessM: dam.thicknessM,
        },
        sedimentData: {
          sedimentVolumeM3: round(dam.sedimentVolumeM3),
          sedimentDepthCm: round(dam.sedimentDepthCm),
          sedimentSOCpct: round(dam.sedimentSOCpct, 2),
          sedimentCarbonTc: round(sedimentCarbonTc),
        },
        flowData: {
          flowRateLMin: round(dam.flowRateLMin),
          flowReductionPct: round(dam.flowReductionPct, 1),
          trapEfficiencyPct: round(dam.trapEfficiencyPct, 1),
        },
        calculations: {
          sedimentCarbonTc: round(sedimentCarbonTc),
          co2e: round(damCO2e),
        },
      });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // Step 4: Erosion Prevention (เครดิตจากการป้องกันการพังทลายดิน)
    // Erosion Prevention = (baselineSediment − projectSediment) × avgSOCPct/100 × areaHa × 44/12
    // ═══════════════════════════════════════════════════════════════════════
    const erosionReduction = plot.baselineSediment - plot.projectSediment; // t/ha/yr

    // คำนวณ avgSOCPct จากข้อมูลการวัด (เฉลี่ย organicCarbonPct ของการวัดที่ผ่านการตรวจสอบ)
    let avgSOCPct = 0;
    let socPctCount = 0;
    for (const m of periodMeasurements) {
      if ((m.qualityFlag === 'VALIDATED' || m.qualityFlag === 'CERTIFIED') && m.organicCarbonPct > 0) {
        avgSOCPct += m.organicCarbonPct;
        socPctCount++;
      }
    }
    if (socPctCount > 0) avgSOCPct = avgSOCPct / socPctCount;
    // ถ้าไม่มีข้อมูลการวัด ใช้ค่าประมาณจาก baselineSOC
    if (avgSOCPct === 0 && plot.baselineSOC > 0) {
      avgSOCPct = (plot.baselineSOC / 30) * 100 / 100; // ประมาณ SOC% จาก tC/ha (30cm depth)
    }

    const erosionPreventionCO2e = erosionReduction * (avgSOCPct / 100) * plot.areaHa * MOLECULAR_RATIO.CO2_TO_C;

    // ═══════════════════════════════════════════════════════════════════════
    // Step 5: GHG Emission Reduction (การลดการปล่อยก๊าซเรือนกระจก)
    // (baselineEmission − projectEmission) × areaHa × monitoringYears
    // ═══════════════════════════════════════════════════════════════════════
    const emissionReductionPerHa = plot.baselineEmission - plot.projectEmission; // tCO2e/ha/yr
    const ghgReductionCO2e = emissionReductionPerHa * plot.areaHa * monitoringYears;

    // ประเมิน GHG จาก flux ข้อมูลการวัด
    let totalCO2Flux = 0;
    let totalCH4Flux = 0;
    let totalN2OFlux = 0;
    let validMeasurementCount = 0;

    for (const m of periodMeasurements) {
      if (m.qualityFlag === 'VALIDATED' || m.qualityFlag === 'CERTIFIED') {
        totalCO2Flux += m.co2Flux || 0;
        totalCH4Flux += m.ch4Flux || 0;
        totalN2OFlux += m.n2oFlux || 0;
        validMeasurementCount++;
      }
    }

    const avgCO2Flux = validMeasurementCount > 0 ? totalCO2Flux / validMeasurementCount : 0;
    const avgCH4Flux = validMeasurementCount > 0 ? totalCH4Flux / validMeasurementCount : 0;
    const avgN2OFlux = validMeasurementCount > 0 ? totalN2OFlux / validMeasurementCount : 0;

    const ghgFromMeasurements = {
      co2: avgCO2Flux * 0.139 * plot.areaHa * monitoringYears,
      ch4: avgCH4Flux * 0.0876 * GWP.CH4 * plot.areaHa * monitoringYears,
      n2o: avgN2OFlux * 0.00000876 * GWP.N2O * plot.areaHa * monitoringYears,
    };

    // ═══════════════════════════════════════════════════════════════════════
    // Step 6: Total & Buffer (รวมและหัก Buffer 20%)
    // Gross = SOC Credits + Sediment Trapped + Check Dam + Erosion Prevention + GHG Reduction
    // Buffer deduction: 20% (T-VER-SOIL-01)
    // Net = Gross × 0.80
    // ═══════════════════════════════════════════════════════════════════════
    const grossCredits = socCreditsCO2e + totalTerraceSedimentCO2e + totalVetiverCO2e + totalCheckDamCO2e + erosionPreventionCO2e + ghgReductionCO2e;
    const bufferDeduction = grossCredits * (T_VER_SOIL.BUFFER_PCT / 100);
    const netCredits = grossCredits * 0.80;

    // ═══════════════════════════════════════════════════════════════════════
    // Step 7: Co-benefits (ประโยชน์ร่วม — ไม่นับเครดิต)
    // - การลดการไหลของน้ำ (Water Flow Reduction)
    // - การลดปริมาณน้ำไหลบ่า (Runoff Volume Reduction)
    // ═══════════════════════════════════════════════════════════════════════
    let totalFlowIn = 0;
    let totalFlowOut = 0;
    for (const terrace of plot.terraces) {
      totalFlowIn += terrace.waterFlowInLMin;
      totalFlowOut += terrace.waterFlowOutLMin;
    }
    const avgFlowReductionPct = totalFlowIn > 0 ? ((totalFlowIn - totalFlowOut) / totalFlowIn) * 100 : 0;

    // คำนวณการลดปริมาณน้ำไหลบ่าจากข้อมูลการวัด
    let totalRunoffBaseline = 0;
    let totalRunoffProject = 0;
    let runoffCount = 0;
    for (const m of periodMeasurements) {
      if (m.qualityFlag === 'VALIDATED' || m.qualityFlag === 'CERTIFIED') {
        totalRunoffProject += m.runoffVolumeL || 0;
        runoffCount++;
      }
    }
    // ประมาณ baseline runoff จาก slopeDegree และพื้นที่
    if (runoffCount > 0) {
      totalRunoffBaseline = plot.areaHa * 10000 * plot.slopeDegree * 0.5; // ประมาณจากพื้นที่และความลาดชัน
    }
    const runoffReductionPct = totalRunoffBaseline > 0
      ? ((totalRunoffBaseline - totalRunoffProject) / totalRunoffBaseline) * 100
      : 0;

    // สถิติฝายชะลอน้ำ
    let totalDamFlowReduction = 0;
    let totalDamTrapEfficiency = 0;
    let activeDamCount = 0;
    for (const dam of plot.checkDams) {
      if (dam.status === 'ACTIVE') {
        totalDamFlowReduction += dam.flowReductionPct;
        totalDamTrapEfficiency += dam.trapEfficiencyPct;
        activeDamCount++;
      }
    }

    const coBenefits = {
      waterFlowReduction: {
        descriptionTh: 'การลดการไหลของน้ำ',
        terraceFlowReduction: {
          totalFlowInLMin: round(totalFlowIn),
          totalFlowOutLMin: round(totalFlowOut),
          flowReductionPct: round(avgFlowReductionPct, 1),
          descriptionTh: 'อัตราการลดการไหลของน้ำจากชั้นปลูก',
        },
        checkDamEffectiveness: {
          activeDams: activeDamCount,
          avgFlowReductionPct: activeDamCount > 0 ? round(totalDamFlowReduction / activeDamCount, 1) : 0,
          avgTrapEfficiencyPct: activeDamCount > 0 ? round(totalDamTrapEfficiency / activeDamCount, 1) : 0,
          descriptionTh: 'ประสิทธิภาพฝายชะลอน้ำ',
        },
        estimatedWaterRetainedM3: round(
          totalFlowIn > 0
            ? (totalFlowIn - totalFlowOut) * 60 * 24 * 365 / 1000 * monitoringYears
            : 0
        ),
      },
      runoffVolumeReduction: {
        descriptionTh: 'การลดปริมาณน้ำไหลบ่า',
        estimatedBaselineRunoffL: round(totalRunoffBaseline),
        measuredProjectRunoffL: round(totalRunoffProject),
        runoffReductionPct: round(runoffReductionPct, 1),
        descriptionThDetail: 'ประมาณการลดปริมาณน้ำไหลบ่าจากข้อมูลการวัด',
      },
      noteTh: 'ประโยชน์ร่วมด้านการจัดการน้ำ (ไม่นับเป็นเครดิตคาร์บอน)',
    };

    // ─── ตรวจสอบเกณฑ์ขั้นต่ำ ───
    const annualDeltaSOC = deltaSOC / monitoringYears;
    const passesThreshold = annualDeltaSOC >= T_VER_SOIL.SOC_STOCK_CHANGE_THRESHOLD;

    // ─── สร้างรายงานผลการคำนวณ ───
    const calculationReport = {
      // ข้อมูลแปลง
      plotInfo: {
        plotId: plot.plotId,
        name: plot.name,
        nameTh: plot.nameTh,
        province: plot.province,
        areaHa: plot.areaHa,
        areaRai: plot.areaRai,
        cropType: plot.cropType,
        practiceType: plot.practiceType,
        landUseType: plot.landUseType,
        methodology: plot.methodology,
        previousLandUse: plot.previousLandUse,
        vetiverGrassCoveragePct: plot.vetiverGrassCoveragePct,
        // ข้อมูลพื้นที่ลาดชัน
        terrainInfo: {
          altitudeMasl: plot.altitudeMasl,
          slopeDegree: plot.slopeDegree,
          slopeAspect: plot.slopeAspect,
          terraceCount: plot.terraceCount,
          checkDamCount: plot.checkDamCount,
          checkDamType: plot.checkDamType,
          plantingAreaWidthM: plot.plantingAreaWidthM,
          ridgeWidthMPlot: plot.ridgeWidthMPlot,
        },
      },

      // ช่วงเวลาติดตาม
      monitoringPeriod: {
        start: startDate.toISOString().split('T')[0],
        end: endDate.toISOString().split('T')[0],
        years: round(monitoringYears),
        measurementCount: periodMeasurements.length,
        validMeasurementCount,
      },

      // Step 1: SOC Stock Change
      step1_socStockChange: {
        nameTh: 'การเปลี่ยนแปลง SOC',
        formula: 'ΔSOC × 44/12 × areaHa',
        baselineSOC: plot.baselineSOC,
        projectSOC: plot.projectSOC,
        deltaSOC: round(deltaSOC),
        deltaSOCUnit: 'tC/ha',
        molecularRatio: round(MOLECULAR_RATIO.CO2_TO_C),
        areaHa: plot.areaHa,
        result: round(socCreditsCO2e),
        unit: 'tCO2e',
      },

      // Step 2: Sediment Trapped Carbon
      step2_sedimentTrapped: {
        nameTh: 'คาร์บอนในตะกอนดินที่ถูกกัก (ชั้นปลูก)',
        formula: 'sedimentTrappedKg × organicCarbonPct/100 / 1000 × 44/12',
        terraceCount: plot.terraces.length,
        details: terraceSedimentDetails,
        totalSedimentCarbonTc: round(totalTerraceSedimentCarbonTc),
        totalCO2e: round(totalTerraceSedimentCO2e),
        unit: 'tCO2e',
      },

      // Step 2.5: Vetiver Grass Carbon Sequestration
      step2_5_vetiverGrass: {
        nameTh: 'เครดิตคาร์บอนจากหญ้าแฝกบนคันขอบ',
        formulaTh: 'ตะกอนดินเพิ่มเติม + มวลชีวภาพ + การป้องกันการพังทลาย',
        formula: '(vetiverSedimentCarbon + vetiverBiomassCarbon + vetiverErosionCredit) × 44/12',
        vetiverTerraceCount: vetiverDetails.length,
        details: vetiverDetails,
        totalCO2e: round(totalVetiverCO2e),
        unit: 'tCO2e',
        noteTh: 'คำนวณเฉพาะชั้นปลูกที่มีหญ้าแฝก (vetiverGrassStatus != NONE)',
      },

      // Step 3: Check Dam Carbon
      step3_checkDamCarbon: {
        nameTh: 'คาร์บอนในตะกอนดินหลังฝายชะลอน้ำ',
        formula: 'sedimentCarbonTc × 44/12',
        checkDamCount: plot.checkDams.length,
        details: checkDamDetails,
        totalSedimentCarbonTc: round(totalCheckDamCarbonTc),
        totalCO2e: round(totalCheckDamCO2e),
        unit: 'tCO2e',
      },

      // Step 4: Erosion Prevention
      step4_erosionPrevention: {
        nameTh: 'เครดิตจากการป้องกันการพังทลายดิน',
        formula: '(baselineSediment − projectSediment) × avgSOCPct/100 × areaHa × 44/12',
        baselineSediment: round(plot.baselineSediment),
        baselineSedimentUnit: 't/ha/yr',
        projectSediment: round(plot.projectSediment),
        projectSedimentUnit: 't/ha/yr',
        erosionReduction: round(erosionReduction),
        erosionReductionUnit: 't/ha/yr',
        sedimentTrapRate: round(plot.sedimentTrapRate, 1),
        sedimentTrapRateUnit: '%',
        avgSOCPct: round(avgSOCPct, 2),
        areaHa: plot.areaHa,
        molecularRatio: round(MOLECULAR_RATIO.CO2_TO_C),
        result: round(erosionPreventionCO2e),
        unit: 'tCO2e',
      },

      // Step 5: GHG Emission Reduction
      step5_ghgReduction: {
        nameTh: 'การลดการปล่อยก๊าซเรือนกระจก',
        formula: '(baselineEmission − projectEmission) × areaHa × monitoringYears',
        baselineEmission: plot.baselineEmission,
        projectEmission: plot.projectEmission,
        emissionReductionPerHa: round(emissionReductionPerHa),
        emissionReductionPerHaUnit: 'tCO2e/ha/yr',
        areaHa: plot.areaHa,
        monitoringYears: round(monitoringYears),
        result: round(ghgReductionCO2e),
        unit: 'tCO2e',
      },

      // GHG จากข้อมูลการวัด (ถ้ามี)
      ghgFromMeasurements: validMeasurementCount > 0 ? {
        co2: {
          avgFlux: round(avgCO2Flux),
          fluxUnit: 'µmol/m²/s',
          co2Equivalent: round(ghgFromMeasurements.co2),
        },
        ch4: {
          avgFlux: round(avgCH4Flux),
          fluxUnit: 'mg/m²/hr',
          co2Equivalent: round(ghgFromMeasurements.ch4),
          gwp: GWP.CH4,
        },
        n2o: {
          avgFlux: round(avgN2OFlux),
          fluxUnit: 'µg/m²/hr',
          co2Equivalent: round(ghgFromMeasurements.n2o),
          gwp: GWP.N2O,
        },
      } : null,

      // Step 6: Total & Buffer
      step6_totalAndBuffer: {
        nameTh: 'รวมและหัก Buffer',
        breakdown: {
          socStockChange: round(socCreditsCO2e),
          sedimentTrapped: round(totalTerraceSedimentCO2e),
          vetiverGrass: round(totalVetiverCO2e),
          checkDamCarbon: round(totalCheckDamCO2e),
          erosionPrevention: round(erosionPreventionCO2e),
          ghgReduction: round(ghgReductionCO2e),
        },
        grossCredits: round(grossCredits),
        grossCreditsUnit: 'tCO2e',
        bufferPct: T_VER_SOIL.BUFFER_PCT,
        bufferDeduction: round(bufferDeduction),
        netCredits: round(netCredits),
        netCreditsUnit: 'tCO2e',
        annualNetCredits: round(netCredits / monitoringYears),
        annualNetCreditsUnit: 'tCO2e/yr',
      },

      // Step 7: Co-benefits (ประโยชน์ร่วม)
      step7_coBenefits: coBenefits,

      // สถานะและคำแนะนำ
      assessment: {
        eligible: passesThreshold && netCredits > 0,
        methodology: plot.methodology,
        slopeSpecific: plot.slopeDegree > 5,
        uncertaintyDeduction: `${T_VER_SOIL.UNCERTAINTY_DEDUCTION_PCT}%`,
        recommendations: generateSlopeRecommendations(
          plot,
          deltaSOC,
          netCredits,
          validMeasurementCount,
          passesThreshold,
          totalTerraceSedimentCO2e,
          totalCheckDamCO2e,
          erosionReduction
        ),
      },
    };

    // ─── อัปเดตข้อมูลแปลง ───
    await db.soilCarbonPlot.update({
      where: { plotId },
      data: {
        emissionReduction: round(emissionReductionPerHa),
        monitoringYear: Math.ceil(monitoringYears),
        status: netCredits > 0 ? 'MONITORING' : plot.status,
      },
    });

    return NextResponse.json({
      success: true,
      data: includeDetailReport ? calculationReport : {
        ...calculationReport.step6_totalAndBuffer,
        breakdown: calculationReport.step6_totalAndBuffer.breakdown,
        coBenefits: calculationReport.step7_coBenefits,
      },
      detailAvailable: true,
      message: netCredits > 0
        ? `คำนวณเครดิตคาร์บอนสำเร็จ: ${round(netCredits)} tCO2e (หัก buffer ${T_VER_SOIL.BUFFER_PCT}%) — รวมตะกอนดิน ${round(totalTerraceSedimentCO2e + totalCheckDamCO2e)} tCO2e, หญ้าแฝก ${round(totalVetiverCO2e)} tCO2e`
        : 'แปลงนี้ยังไม่มีสิทธิ์รับเครดิตคาร์บอน กรุณาตรวจสอบข้อมูล',
    });
  } catch (error) {
    console.error('Soil carbon calculate error:', error);
    return NextResponse.json(
      { success: false, error: 'ไม่สามารถคำนวณเครดิตคาร์บอนได้', details: String(error) },
      { status: 500 }
    );
  }
}

// ─── ฟังก์ชันสร้างคำแนะนำสำหรับพื้นที่ลาดชัน ───
function generateSlopeRecommendations(
  plot: any,
  deltaSOC: number,
  netCredits: number,
  validMeasurementCount: number,
  passesThreshold: boolean,
  terraceSedimentCO2e: number,
  checkDamCO2e: number,
  erosionReduction: number
): string[] {
  const recommendations: string[] = [];

  if (!passesThreshold) {
    recommendations.push(
      `การเปลี่ยนแปลง SOC (${deltaSOC.toFixed(3)} tC/ha/yr) ต่ำกว่าเกณฑ์ขั้นต่ำ (0.05 tC/ha/yr) กรุณาพิจารณาปรับปรุงแนวทางปฏิบัติ`
    );
  }

  if (validMeasurementCount < 3) {
    recommendations.push(
      `จำนวนข้อมูลการวัดที่ผ่านการตรวจสอบน้อย (${validMeasurementCount} รายการ) แนะนำเพิ่มความถี่การวัด`
    );
  }

  // คำแนะนำเฉพาะพื้นที่ลาดชัน
  if (plot.slopeDegree > 30) {
    recommendations.push(
      `ความลาดชันสูงมาก (${plot.slopeDegree}°) แนะนำเพิ่มจำนวนชั้นปลูกและฝายชะลอน้ำเพื่อลดการพังทลายดิน`
    );
  }

  if (plot.terraceCount === 0 && plot.slopeDegree > 10) {
    recommendations.push(
      `พื้นที่มีความลาดชัน (${plot.slopeDegree}°) แต่ยังไม่มีชั้นปลูก แนะนำสร้างขั้นบันไดเพื่อกักตะกอนดิน`
    );
  }

  if (plot.checkDamCount === 0 && plot.slopeDegree > 15) {
    recommendations.push(
      `พื้นที่มีความลาดชัน (${plot.slopeDegree}°) แต่ยังไม่มีฝายชะลอน้ำ แนะนำสร้างฝายเพื่อกักตะกอนดินและลดการไหลบ่า`
    );
  }

  if (terraceSedimentCO2e === 0 && plot.terraceCount > 0) {
    recommendations.push(
      'มีชั้นปลูกแต่ยังไม่มีข้อมูลตะกอนดินที่ถูกกัก กรุณาบันทึกข้อมูล sedimentTrappedKg และ organicCarbonPct ของแต่ละชั้น'
    );
  }

  if (checkDamCO2e === 0 && plot.checkDamCount > 0) {
    recommendations.push(
      'มีฝายชะลอน้ำแต่ยังไม่มีข้อมูลตะกอนดินหลังฝาย กรุณาบันทึกข้อมูล sedimentCarbonTc'
    );
  }

  if (erosionReduction <= 0 && plot.slopeDegree > 5) {
    recommendations.push(
      'อัตราการลดการพังทลายดินเป็นศูนย์หรือติดลบ กรุณาตรวจสอบค่า baselineSediment และ projectSediment'
    );
  }

  if (plot.practiceType === 'conventional') {
    recommendations.push(
      'แนะนำเปลี่ยนจากการเกษตรแบบดั้งเดิมเป็นแนวทางปฏิบัติบนพื้นที่ลาดชัน (เช่น sediment_trap, terraced, contour_planting)'
    );
  }

  // ─── คำแนะนำเกี่ยวกับหญ้าแฝก (Vetiver Grass Recommendations) ───
  // ถ้าพื้นที่มีความลาดชันมาก (> 20°) แต่ยังไม่มีหญ้าแฝก ควรแนะนำปลูกหญ้าแฝก
  const hasVetiverGrass = plot.terraces?.some(
    (t: any) => t.vetiverGrassStatus && t.vetiverGrassStatus !== 'NONE'
  );
  if (plot.slopeDegree > 20 && !hasVetiverGrass) {
    recommendations.push(
      `พื้นที่มีความลาดชันสูง (${plot.slopeDegree}°) แต่ยังไม่มีหญ้าแฝกบนคันขอบ แนะนำปลูกหญ้าแฝกเพื่อเพิ่มเครดิตคาร์บอนและลดการพังทลายดิน (คาดการณ์เพิ่ม 0.5-2.0 tCO2e/ชั้น)`
    );
  }

  // ถ้าเปลี่ยนจากไร่เลื่อนลอย ให้ระบุถึงประโยชน์ของการเปลี่ยนผ่าน
  if (plot.previousLandUse === 'slash_and_burn') {
    recommendations.push(
      'แปลงนี้เปลี่ยนจากไร่เลื่อนลอย (Slash-and-Burn) เป็นเกษตรกักตะกอนดิน มีศักยภาพสูงในการกักคาร์บอนจากการลดการปล่อยก๊าซเรือนกระจกและเพิ่ม SOC'
    );
  }

  if (deltaSOC < 0) {
    recommendations.push(
      'พบว่า SOC ลดลง อาจเกิดจากการพังทลายดินบนพื้นที่ลาดชัน กรุณาตรวจสอบแนวทางการจัดการดิน'
    );
  }

  if (netCredits <= 0) {
    recommendations.push(
      'เครดิตคาร์บอนสุทธิเป็นศูนย์หรือติดลบ กรุณาปรับปรุงแนวทางปฏิบัติ เพิ่มชั้นปลูก/ฝาย หรือเพิ่มพื้นที่โครงการ'
    );
  }

  if (recommendations.length === 0) {
    recommendations.push(
      'แปลงนี้มีศักยภาพในการกักคาร์บอนดี (รวมเครดิตจากตะกอนดิน) สามารถดำเนินการขอรับรองเครดิตคาร์บอนได้'
    );
  }

  return recommendations;
}
