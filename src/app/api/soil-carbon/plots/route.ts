/**
 * GET /api/soil-carbon/plots
 * POST /api/soil-carbon/plots
 * ──────────────────────────────────────────────
 * จัดการแปลงเกษตรขั้นบันไดบนพื้นที่ลาดชัน (Terraced Farming / Sediment Trap)
 *
 * GET: ดึงรายการแปลงทั้งหมดพร้อมข้อมูลชั้นปลูกและฝายชะลอน้ำ
 *   - รองรับตัวกรอง: province, cropType, practiceType, status, methodology, landUseType
 *   - สรุปสถิติ: จำนวนแปลง, พื้นที่รวม, ชั้นปลูก, ฝาย, ค่าเฉลี่ยความลาดชัน
 *
 * POST: สร้างแปลงใหม่ — รองรับฟิลด์พื้นที่ลาดชันทั้งหมด
 *   - ฟิลด์ใหม่: altitudeMasl, slopeDegree, slopeAspect,
 *     terraceCount, terraceWidthM, terraceHeightM,
 *     checkDamCount, checkDamType,
 *     baselineSediment, projectSediment, sedimentTrapRate
 *   - ฟิลด์หญ้าแฝก: previousLandUse, vetiverGrassCoveragePct,
 *     plantingAreaWidthM, ridgeWidthMPlot
 *   - ถ้า terraceCount > 0 จะสร้าง TerraceLayer และ CheckDam อัตโนมัติ
 *   - TerraceLayer จะกำหนดค่าหญ้าแฝกอัตโนมัติ (vetiverGrassStatus = PLANTED)
 */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// ─── ทิศทางลาดชันที่ยอมรับ ───
const VALID_ASPECTS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

// ─── ประเภทฝายที่ยอมรับ ───
const VALID_DAM_TYPES = ['STONE', 'CONCRETE', 'LOG', 'GABION', 'VEGETATION'];

// ─── GET: ดึงรายการแปลงทั้งหมดพร้อมข้อมูลชั้นปลูกและฝาย ───
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const province = searchParams.get('province') || '';
    const cropType = searchParams.get('cropType') || '';
    const practiceType = searchParams.get('practiceType') || '';
    const status = searchParams.get('status') || '';
    const methodology = searchParams.get('methodology') || '';
    const landUseType = searchParams.get('landUseType') || '';
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // สร้างเงื่อนไขการค้นหา (filters)
    const where: Record<string, any> = {};
    if (province) where.province = province;
    if (cropType) where.cropType = cropType;
    if (practiceType) where.practiceType = practiceType;
    if (status) where.status = status;
    if (methodology) where.methodology = methodology;
    if (landUseType) where.landUseType = landUseType;

    // ดึงข้อมูลแปลงพร้อมชั้นปลูก ฝาย และการวัดล่าสุด
    const plots = await db.soilCarbonPlot.findMany({
      where,
      include: {
        measurements: {
          orderBy: { measurementDate: 'desc' },
          take: 1,
        },
        terraces: {
          orderBy: { layerNumber: 'asc' },
          include: {
            checkDam: true,
            measurements: {
              orderBy: { measurementDate: 'desc' },
              take: 1,
            },
          },
        },
        checkDams: {
          orderBy: { damId: 'asc' },
        },
        edgeNode: {
          select: {
            id: true,
            nodeId: true,
            name: true,
            nameTh: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    // นับจำนวนทั้งหมด
    const total = await db.soilCarbonPlot.count({ where });

    // สรุปสถิติ
    const allPlots = await db.soilCarbonPlot.findMany({
      where,
      select: {
        province: true,
        status: true,
        practiceType: true,
        cropType: true,
        landUseType: true,
        areaHa: true,
        slopeDegree: true,
        terraceCount: true,
        checkDamCount: true,
        altitudeMasl: true,
      },
    });

    const byProvince: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    const byPractice: Record<string, number> = {};
    const byCrop: Record<string, number> = {};
    const byLandUse: Record<string, number> = {};
    let totalAreaHa = 0;
    let totalTerraceCount = 0;
    let totalCheckDamCount = 0;
    let avgSlope = 0;
    let slopeCount = 0;
    let avgAltitude = 0;
    let altitudeCount = 0;

    for (const p of allPlots) {
      byProvince[p.province] = (byProvince[p.province] || 0) + 1;
      byStatus[p.status] = (byStatus[p.status] || 0) + 1;
      byPractice[p.practiceType] = (byPractice[p.practiceType] || 0) + 1;
      byCrop[p.cropType] = (byCrop[p.cropType] || 0) + 1;
      byLandUse[p.landUseType] = (byLandUse[p.landUseType] || 0) + 1;
      totalAreaHa += p.areaHa;
      totalTerraceCount += p.terraceCount;
      totalCheckDamCount += p.checkDamCount;
      if (p.slopeDegree > 0) {
        avgSlope += p.slopeDegree;
        slopeCount++;
      }
      if (p.altitudeMasl > 0) {
        avgAltitude += p.altitudeMasl;
        altitudeCount++;
      }
    }

    if (slopeCount > 0) avgSlope = avgSlope / slopeCount;
    if (altitudeCount > 0) avgAltitude = avgAltitude / altitudeCount;

    // จัดรูปแบบข้อมูลแปลงพร้อมการวัดล่าสุด
    const formattedPlots = plots.map(plot => ({
      ...plot,
      latestMeasurement: plot.measurements.length > 0 ? plot.measurements[0] : null,
      measurements: undefined,
    }));

    return NextResponse.json({
      success: true,
      data: formattedPlots,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
      summary: {
        totalPlots: total,
        totalAreaHa: Math.round(totalAreaHa * 100) / 100,
        totalAreaRai: Math.round(totalAreaHa / 0.16 * 100) / 100,
        totalTerraceCount,
        totalCheckDamCount,
        avgSlopeDegree: Math.round(avgSlope * 10) / 10,
        avgAltitudeMasl: Math.round(avgAltitude * 10) / 10,
        byProvince,
        byStatus,
        byPractice,
        byCrop,
        byLandUse,
      },
    });
  } catch (error) {
    console.error('Soil carbon plots GET error:', error);
    return NextResponse.json(
      { success: false, error: 'ไม่สามารถดึงข้อมูลแปลงได้', details: String(error) },
      { status: 500 }
    );
  }
}

// ─── POST: สร้างแปลงใหม่พร้อมสร้างชั้นปลูกและฝายอัตโนมัติ ───
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // ตรวจสอบข้อมูลที่จำเป็น (required fields)
    const {
      plotId, name, nameTh, province, lat, lng,
      areaRai, areaHa, landUseType, soilType, cropType, practiceType,
      baselineSOC, projectSOC, baselineEmission, projectEmission,
      methodology, edgeNodeId,
      // ข้อมูลพื้นที่ลาดชัน / ขั้นบันได (ใหม่)
      altitudeMasl, slopeDegree, slopeAspect,
      terraceCount, terraceWidthM, terraceHeightM,
      checkDamCount, checkDamType,
      baselineSediment, projectSediment, sedimentTrapRate,
      // ข้อมูลหญ้าแฝกและการใช้ประโยชน์ก่อนหน้า (ใหม่)
      previousLandUse, vetiverGrassCoveragePct,
      plantingAreaWidthM, ridgeWidthMPlot,
    } = body;

    if (!plotId || !name) {
      return NextResponse.json(
        { success: false, error: 'ต้องระบุ plotId และ name' },
        { status: 400 }
      );
    }

    // ตรวจสอบว่า plotId ซ้ำหรือไม่
    const existing = await db.soilCarbonPlot.findUnique({ where: { plotId } });
    if (existing) {
      return NextResponse.json(
        { success: false, error: `plotId "${plotId}" มีอยู่ในระบบแล้ว` },
        { status: 409 }
      );
    }

    // ตรวจสอบ slopeAspect
    const finalSlopeAspect = slopeAspect || 'N';
    if (!VALID_ASPECTS.includes(finalSlopeAspect)) {
      return NextResponse.json(
        { success: false, error: `slopeAspect ต้องเป็นหนึ่งใน: ${VALID_ASPECTS.join(', ')}` },
        { status: 400 }
      );
    }

    // ตรวจสอบ slopeDegree (0-90)
    const finalSlopeDegree = slopeDegree || 0;
    if (finalSlopeDegree < 0 || finalSlopeDegree > 90) {
      return NextResponse.json(
        { success: false, error: 'slopeDegree ต้องอยู่ระหว่าง 0-90 องศา' },
        { status: 400 }
      );
    }

    // ตรวจสอบ checkDamType
    const finalCheckDamType = checkDamType || 'STONE';
    if (!VALID_DAM_TYPES.includes(finalCheckDamType)) {
      return NextResponse.json(
        { success: false, error: `checkDamType ต้องเป็นหนึ่งใน: ${VALID_DAM_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    // คำนวณพื้นที่อัตโนมัติ (ไร่ ↔ เฮกตาร์)
    const finalAreaRai = areaRai || (areaHa ? areaHa / 0.16 : 0);
    const finalAreaHa = areaHa || (areaRai ? areaRai * 0.16 : 0);

    // คำนวณ emissionReduction อัตโนมัติ
    const finalBaselineEmission = baselineEmission || 0;
    const finalProjectEmission = projectEmission || 0;
    const emissionReduction = (finalBaselineEmission - finalProjectEmission) * finalAreaHa;

    // คำนวณ sedimentTrapRate อัตโนมัติ (ถ้าไม่ระบุ)
    const finalBaselineSediment = baselineSediment || 0;
    const finalProjectSediment = projectSediment || 0;
    let finalSedimentTrapRate = sedimentTrapRate || 0;
    if (finalSedimentTrapRate === 0 && finalBaselineSediment > 0) {
      finalSedimentTrapRate = Math.round((finalProjectSediment / finalBaselineSediment) * 10000) / 100;
    }

    // ตรวจสอบ edgeNodeId ถ้าระบุมา
    if (edgeNodeId) {
      const edgeNode = await db.ioTEdgeNode.findUnique({ where: { id: edgeNodeId } });
      if (!edgeNode) {
        return NextResponse.json(
          { success: false, error: `ไม่พบ Edge Node ที่ระบุ: ${edgeNodeId}` },
          { status: 404 }
        );
      }
    }

    // จำนวนชั้นปลูกและฝาย
    const finalTerraceCount = terraceCount || 0;
    const finalTerraceWidthM = terraceWidthM || 0;
    const finalTerraceHeightM = terraceHeightM || 0;
    const finalCheckDamCount = checkDamCount || 0;
    const finalAltitudeMasl = altitudeMasl || 0;

    // ข้อมูลหญ้าแฝกและมิติคันขอบ (Vetiver Grass & Ridge Dimensions)
    // คันขอบปลูกหญ้าแฝก: 0.7-1.0 เมตร, พื้นที่ปลูกพืชหลัก: 1.5-2.0 เมตร
    // ความกว้างรวมต่อชั้น: 2.0-2.7 เมตร (ridgeWidthMPlot + plantingAreaWidthM)
    const finalRidgeWidthMPlot = ridgeWidthMPlot || 0.85; // ค่าเริ่มต้น 0.85 ม. (ช่วง 0.7-1.0)
    const finalPlantingAreaWidthM = plantingAreaWidthM || 1.8; // ค่าเริ่มต้น 1.8 ม. (ช่วง 1.5-2.0)
    const finalPreviousLandUse = previousLandUse || '';
    const finalVetiverGrassCoveragePct = vetiverGrassCoveragePct || 0;

    // ถ้าไม่ได้ระบุ terraceWidthM ให้คำนวณจาก ridgeWidthMPlot + plantingAreaWidthM
    const computedTerraceWidthM = finalTerraceWidthM > 0
      ? finalTerraceWidthM
      : finalRidgeWidthMPlot + finalPlantingAreaWidthM;

    // สร้างแปลงใหม่
    const plot = await db.soilCarbonPlot.create({
      data: {
        plotId,
        name,
        nameTh: nameTh || '',
        province: province || '',
        lat: lat || 0,
        lng: lng || 0,
        altitudeMasl: finalAltitudeMasl,
        slopeDegree: finalSlopeDegree,
        slopeAspect: finalSlopeAspect,
        areaRai: finalAreaRai,
        areaHa: finalAreaHa,
        terraceCount: finalTerraceCount,
        terraceWidthM: computedTerraceWidthM,
        plantingAreaWidthM: finalPlantingAreaWidthM,
        ridgeWidthMPlot: finalRidgeWidthMPlot,
        terraceHeightM: finalTerraceHeightM,
        checkDamCount: finalCheckDamCount,
        checkDamType: finalCheckDamType,
        landUseType: landUseType || 'terraced_farming',
        previousLandUse: finalPreviousLandUse,
        vetiverGrassCoveragePct: finalVetiverGrassCoveragePct,
        soilType: soilType || '',
        cropType: cropType || '',
        practiceType: practiceType || 'sediment_trap',
        baselineSOC: baselineSOC || 0,
        projectSOC: projectSOC || 0,
        baselineSediment: finalBaselineSediment,
        projectSediment: finalProjectSediment,
        sedimentTrapRate: finalSedimentTrapRate,
        baselineEmission: finalBaselineEmission,
        projectEmission: finalProjectEmission,
        emissionReduction: Math.max(0, emissionReduction),
        monitoringYear: body.monitoringYear || 1,
        status: body.status || 'REGISTERED',
        methodology: methodology || 'T-VER-SOIL-01',
        edgeNodeId: edgeNodeId || null,
      },
      include: {
        edgeNode: {
          select: { id: true, nodeId: true, name: true, nameTh: true, status: true },
        },
      },
    });

    // ─── สร้าง TerraceLayer และ CheckDam อัตโนมัติเมื่อ terraceCount > 0 ───
    const createdTerraces: any[] = [];
    const createdCheckDams: any[] = [];

    // สร้างฝายชะลอน้ำก่อน (เพื่อให้ TerraceLayer อ้างอิงได้)
    if (finalCheckDamCount > 0) {
      for (let i = 1; i <= finalCheckDamCount; i++) {
        const damIdStr = `DAM-${plotId.split('-').slice(1).join('-')}-${String(i).padStart(2, '0')}`;
        const dam = await db.checkDam.create({
          data: {
            plotId: plot.plotId,
            damId: damIdStr,
            damName: `Check Dam ${i} - ${name}`,
            damNameTh: `ฝายชะลอน้ำชั้นที่ ${i}`,
            damType: finalCheckDamType,
            heightM: finalTerraceHeightM * 0.8 || 0.5,
            widthM: finalTerraceWidthM * 0.6 || 2,
            thicknessM: 0.3,
            upstreamDepthM: 0,
            sedimentDepthCm: 0,
            sedimentVolumeM3: 0,
            sedimentSOCpct: 0,
            sedimentCarbonTc: 0,
            flowRateLMin: 0,
            flowReductionPct: 0,
            trapEfficiencyPct: 0,
            status: 'ACTIVE',
          },
        });
        createdCheckDams.push(dam);
      }
    }

    // สร้างชั้นปลูก (TerraceLayer) — 1 ชั้นต่อ 1 ฝาย ถ้าจำนวนพอกัน
    if (finalTerraceCount > 0) {
      for (let i = 1; i <= finalTerraceCount; i++) {
        // คำนวณระดับความสูงของแต่ละชั้น (ลดลงตามลำดับ)
        const elevation = finalAltitudeMasl - (i - 1) * finalTerraceHeightM;
        // ความยาวตามแนวระดับ — ใช้ computedTerraceWidthM (รวมคันขอบ + พื้นที่ปลูก)
        const lengthM = computedTerraceWidthM > 0
          ? Math.round((finalAreaHa * 10000 / finalTerraceCount / computedTerraceWidthM) * 100) / 100
          : 0;
        // พื้นที่ชั้นรวม (รวมคันขอบหญ้าแฝก) = computedTerraceWidthM × lengthM
        const areaSqm = Math.round(computedTerraceWidthM * lengthM * 100) / 100;
        // พื้นที่ปลูกพืชหลัก (ไม่รวมคันขอบ) = plantingAreaWidthM × lengthM
        const plantingAreaSqm = Math.round(finalPlantingAreaWidthM * lengthM * 100) / 100;

        // เชื่อมกับฝาย (1 ชั้นต่อ 1 ฝาย ถ้ามีจำนวนพอกัน)
        const linkedDam = i <= createdCheckDams.length ? createdCheckDams[i - 1] : null;

        // ─── กำหนดค่าหญ้าแฝกอัตโนมัติ (Vetiver Grass Auto-Config) ───
        // สร้างขั้นบันไดพร้อมหญ้าแฝก จึงกำหนดสถานะเป็น PLANTED
        // รากหญ้าแฝก: ปกติ 200-300 ซม. (2-3 เมตร) — ใช้ 250 ซม. เป็นค่าเริ่มต้น
        // ความหนาแน่นปลูก: 5-10 กอ/ตร.ม. — ใช้ 7 กอ/ตร.ม. เป็นค่าเริ่มต้น
        const vetiverStatus = finalVetiverGrassCoveragePct > 0 ? 'PLANTED' : 'NONE';
        const vetiverRootDepth = vetiverStatus !== 'NONE' ? 250 : 0; // ซม. (2.5 ม.)
        const vetiverDensity = vetiverStatus !== 'NONE' ? 7 : 0; // กอ/ตร.ม.

        const terrace = await db.terraceLayer.create({
          data: {
            plotId: plot.plotId,
            layerNumber: i,
            layerName: `Terrace Layer ${i}`,
            layerNameTh: `ชั้นปลูกที่ ${i}`,
            elevationMasl: Math.round(elevation * 100) / 100,
            widthM: computedTerraceWidthM || 0,
            plantingAreaWidthM: finalPlantingAreaWidthM || 0,
            heightM: finalTerraceHeightM || 0,
            lengthM,
            areaSqm,
            plantingAreaSqm,
            cropType: cropType || '',
            soilDepthCm: 30,
            sedimentDepthCm: 0,
            waterFlowInLMin: 0,
            waterFlowOutLMin: 0,
            sedimentTrappedKg: 0,
            organicCarbonPct: 0,
            socStockTcHa: 0,
            // ข้อมูลหญ้าแฝกบนคันขอบ (Vetiver Grass Ridge)
            ridgeWidthM: finalRidgeWidthMPlot,
            vetiverGrassStatus: vetiverStatus,
            vetiverRootDepthCm: vetiverRootDepth,
            vetiverPlantDensity: vetiverDensity,
            vetiverErosionPreventionPct: 0,
            vetiverSedimentAccumulationKg: 0,
            vetiverCarbonSequestrationKg: 0,
            checkDamId: linkedDam?.id || null,
          },
        });
        createdTerraces.push(terrace);
      }
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          ...plot,
          terraces: createdTerraces,
          checkDams: createdCheckDams,
        },
        autoGenerated: {
          terraceCount: createdTerraces.length,
          checkDamCount: createdCheckDams.length,
          message: finalTerraceCount > 0
            ? `สร้างชั้นปลูก ${createdTerraces.length} ชั้น และฝายชะลอน้ำ ${createdCheckDams.length} แห่ง อัตโนมัติ`
            : 'ไม่มีการสร้างชั้นปลูกหรือฝาย (terraceCount = 0)',
        },
        message: `สร้างแปลง "${name}" สำเร็จ (plotId: ${plotId})`,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Soil carbon plot POST error:', error);
    return NextResponse.json(
      { success: false, error: 'ไม่สามารถสร้างแปลงได้', details: String(error) },
      { status: 500 }
    );
  }
}
