/**
 * GET /api/soil-carbon/measurements
 * POST /api/soil-carbon/measurements
 * ──────────────────────────────────────────────
 * จัดการข้อมูลการวัดคาร์บอนในดิน (Soil Carbon Measurement)
 * รองรับพื้นที่ลาดชัน/ขั้นบันได พร้อมข้อมูลตะกอนดิน
 *
 * GET: ดึงรายการข้อมูลการวัดพร้อมตัวกรอง (รวม terraceLayerId)
 * POST: สร้างการวัดใหม่พร้อมคำนวณอัตโนมัติ
 *   - รองรับ terraceLayerId: ผูกการวัดกับชั้นปลูกเฉพาะเจาะจง
 *   - คำนวณ SOC Stock = bulkDensity × organicCarbonPct/100 × depthCm/100
 *   - คำนวณ sedimentLoadKg = runoffVolumeL × sedimentConcGpL / 1000 (อัตโนมัติ)
 *   - คำนวณ erosionRateTpHa จากความลาดชันและตะกอนดิน
 *   - กำหนด qualityFlag ตามช่วงค่า (รวมตรวจสอบค่าสำหรับพื้นที่ลาดชัน)
 *   - คำนวณ Integrity Hash = SHA-256(plotId + value + timestamp)
 */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// ─── ฟังก์ชันคำนวณ SHA-256 Integrity Hash ───
async function calculateIntegrityHash(plotId: string, socStock: number, timestamp: string): Promise<string> {
  const data = `${plotId}|${socStock.toFixed(6)}|${timestamp}`;
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ─── ฟังก์ชันประเมิน qualityFlag ตามช่วงค่า (รวมพื้นที่ลาดชัน) ───
function determineQualityFlag(measurement: {
  soilMoisture: number;
  soilTemperature: number;
  soilPH: number;
  bulkDensity: number;
  organicCarbonPct: number;
  co2Flux: number;
  ch4Flux: number;
  n2oFlux: number;
  runoffVolumeL: number;
  sedimentConcGpL: number;
  erosionRateTpHa: number;
  infiltrationMmHr: number;
}, slopeDegree: number): string {
  const anomalies: string[] = [];

  // ความชื้นในดิน: ปกติ 0-80%
  if (measurement.soilMoisture < 0 || measurement.soilMoisture > 80) {
    anomalies.push(`soilMoisture=${measurement.soilMoisture} (ช่วงปกติ: 0-80%)`);
  }

  // อุณหภูมิดิน: ปกติ 0-60°C
  if (measurement.soilTemperature < 0 || measurement.soilTemperature > 60) {
    anomalies.push(`soilTemperature=${measurement.soilTemperature} (ช่วงปกติ: 0-60°C)`);
  }

  // pH: ปกติ 2-12
  if (measurement.soilPH < 2 || measurement.soilPH > 12) {
    anomalies.push(`soilPH=${measurement.soilPH} (ช่วงปกติ: 2-12)`);
  }

  // Bulk Density: ปกติ 0.3-2.5 g/cm³
  if (measurement.bulkDensity < 0.3 || measurement.bulkDensity > 2.5) {
    anomalies.push(`bulkDensity=${measurement.bulkDensity} (ช่วงปกติ: 0.3-2.5 g/cm³)`);
  }

  // Organic Carbon %: ปกติ 0-30%
  if (measurement.organicCarbonPct < 0 || measurement.organicCarbonPct > 30) {
    anomalies.push(`organicCarbonPct=${measurement.organicCarbonPct} (ช่วงปกติ: 0-30%)`);
  }

  // CO2 Flux: ปกติ -20 ถึง 100 µmol/m²/s
  if (measurement.co2Flux < -20 || measurement.co2Flux > 100) {
    anomalies.push(`co2Flux=${measurement.co2Flux} (ช่วงปกติ: -20 ถึง 100 µmol/m²/s)`);
  }

  // CH4 Flux: ปกติ -10 ถึง 200 mg/m²/hr
  if (measurement.ch4Flux < -10 || measurement.ch4Flux > 200) {
    anomalies.push(`ch4Flux=${measurement.ch4Flux} (ช่วงปกติ: -10 ถึง 200 mg/m²/hr)`);
  }

  // N2O Flux: ปกติ -200 ถึง 2000 µg/m²/hr
  if (measurement.n2oFlux < -200 || measurement.n2oFlux > 2000) {
    anomalies.push(`n2oFlux=${measurement.n2oFlux} (ช่วงปกติ: -200 ถึง 2000 µg/m²/hr)`);
  }

  // ─── ตรวจสอบค่าสำหรับพื้นที่ลาดชัน ───
  // ปริมาณน้ำไหลบ่า: ปกติ 0-100,000 ลิตร
  if (measurement.runoffVolumeL < 0 || measurement.runoffVolumeL > 100000) {
    anomalies.push(`runoffVolumeL=${measurement.runoffVolumeL} (ช่วงปกติ: 0-100,000 ลิตร)`);
  }

  // ความเข้มข้นตะกอน: ปกติ 0-50 กรัม/ลิตร
  if (measurement.sedimentConcGpL < 0 || measurement.sedimentConcGpL > 50) {
    anomalies.push(`sedimentConcGpL=${measurement.sedimentConcGpL} (ช่วงปกติ: 0-50 กรัม/ลิตร)`);
  }

  // อัตราการพังทลายดิน: ตรวจสอบตามความลาดชัน
  if (measurement.erosionRateTpHa < 0) {
    anomalies.push(`erosionRateTpHa=${measurement.erosionRateTpHa} (ต้องไม่ติดลบ)`);
  } else {
    const maxErosionBySlope = slopeDegree > 20 ? 100 : slopeDegree > 5 ? 30 : 5;
    if (measurement.erosionRateTpHa > maxErosionBySlope) {
      anomalies.push(`erosionRateTpHa=${measurement.erosionRateTpHa} (ช่วงปกติสำหรับความลาด ${slopeDegree}°: 0-${maxErosionBySlope} t/ha/yr)`);
    }
  }

  // อัตราซึมน้ำ: ปกติ 0-500 มม./ชม.
  if (measurement.infiltrationMmHr < 0 || measurement.infiltrationMmHr > 500) {
    anomalies.push(`infiltrationMmHr=${measurement.infiltrationMmHr} (ช่วงปกติ: 0-500 มม./ชม.)`);
  }

  if (anomalies.length > 0) {
    return 'ANOMALY';
  }

  return 'VALIDATED';
}

// ─── ฟังก์ชันประเมิน emission จากการเปลี่ยนแปลง SOC ───
function estimateEmissionsFromSOC(
  currentSOCStock: number,
  previousSOCStock: number | null,
  areaHa: number
): { socChange: number; co2Equivalent: number; ch4Estimate: number; n2oEstimate: number } {
  if (previousSOCStock === null) {
    return {
      socChange: 0,
      co2Equivalent: 0,
      ch4Estimate: 0,
      n2oEstimate: 0,
    };
  }

  const socChange = currentSOCStock - previousSOCStock;
  const co2Equivalent = socChange * (44 / 12);
  const ch4Estimate = Math.abs(socChange) * 0.03 * (16 / 12) * 28;
  const n2oEstimate = Math.abs(socChange) * 0.015 * (44 / 28) * 265;

  return {
    socChange,
    co2Equivalent,
    ch4Estimate: Math.round(ch4Estimate * 1000) / 1000,
    n2oEstimate: Math.round(n2oEstimate * 1000) / 1000,
  };
}

// ─── ฟังก์ชันคำนวณ erosionRateTpHa จากความลาดชันและตะกอนดิน ───
// อ้างอิง RUSLE (Revised Universal Soil Loss Equation) แบบย่อ
function calculateErosionRate(
  sedimentLoadKg: number,
  slopeDegree: number,
  areaHa: number
): number {
  if (areaHa <= 0 || sedimentLoadKg <= 0) return 0;

  // แปลง kg → ตัน แล้วหาอัตราต่อเฮกแตร์
  const sedimentLoadTonnes = sedimentLoadKg / 1000;
  const baseErosion = sedimentLoadTonnes / areaHa;

  // ปรับค่าตามมุมลาดชัน (RUSLE LS factor แบบย่อ)
  const slopeFactor = Math.pow(slopeDegree / 10, 1.2);

  return slopeDegree > 0
    ? Math.round(baseErosion * (1 + slopeFactor) * 1000) / 1000
    : Math.round(baseErosion * 1000) / 1000;
}

// ─── GET: ดึงรายการข้อมูลการวัดพร้อมตัวกรอง ───
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const plotId = searchParams.get('plotId') || '';
    const terraceLayerId = searchParams.get('terraceLayerId') || '';
    const dateFrom = searchParams.get('dateFrom') || '';
    const dateTo = searchParams.get('dateTo') || '';
    const qualityFlag = searchParams.get('qualityFlag') || '';
    const measurementType = searchParams.get('measurementType') || '';
    const ingestionMode = searchParams.get('ingestionMode') || '';
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    // สร้างเงื่อนไขการค้นหา (filters)
    const where: Record<string, any> = {};
    if (plotId) where.plotId = plotId;
    if (terraceLayerId) where.terraceLayerId = terraceLayerId;
    if (qualityFlag) where.qualityFlag = qualityFlag;
    if (measurementType) where.measurementType = measurementType;
    if (ingestionMode) where.ingestionMode = ingestionMode;

    // ช่วงวันที่
    if (dateFrom || dateTo) {
      where.measurementDate = {};
      if (dateFrom) where.measurementDate.gte = new Date(dateFrom);
      if (dateTo) where.measurementDate.lte = new Date(dateTo);
    }

    const measurements = await db.soilCarbonMeasurement.findMany({
      where,
      include: {
        plot: {
          select: {
            plotId: true,
            name: true,
            nameTh: true,
            province: true,
            cropType: true,
            practiceType: true,
            areaHa: true,
            slopeDegree: true,
            landUseType: true,
          },
        },
        terraceLayer: {
          select: {
            id: true,
            layerNumber: true,
            layerName: true,
            layerNameTh: true,
            elevationMasl: true,
            cropType: true,
            ridgeWidthM: true,
            plantingAreaWidthM: true,
            vetiverGrassStatus: true,
          },
        },
      },
      orderBy: { measurementDate: 'desc' },
      take: limit,
      skip: offset,
    });

    const total = await db.soilCarbonMeasurement.count({ where });

    // สรุปสถิติตาม qualityFlag
    const allMeasurements = await db.soilCarbonMeasurement.findMany({
      where,
      select: {
        qualityFlag: true,
        measurementType: true,
        ingestionMode: true,
        socStock: true,
        erosionRateTpHa: true,
        sedimentLoadKg: true,
      },
    });

    const byQualityFlag: Record<string, number> = {};
    const byMeasurementType: Record<string, number> = {};
    const byIngestionMode: Record<string, number> = {};
    let avgSocStock = 0;
    let socStockCount = 0;
    let avgErosionRate = 0;
    let erosionCount = 0;
    let totalSedimentLoad = 0;

    for (const m of allMeasurements) {
      byQualityFlag[m.qualityFlag] = (byQualityFlag[m.qualityFlag] || 0) + 1;
      byMeasurementType[m.measurementType] = (byMeasurementType[m.measurementType] || 0) + 1;
      byIngestionMode[m.ingestionMode] = (byIngestionMode[m.ingestionMode] || 0) + 1;
      if (m.socStock > 0) {
        avgSocStock += m.socStock;
        socStockCount++;
      }
      if (m.erosionRateTpHa > 0) {
        avgErosionRate += m.erosionRateTpHa;
        erosionCount++;
      }
      totalSedimentLoad += m.sedimentLoadKg || 0;
    }

    if (socStockCount > 0) {
      avgSocStock = Math.round((avgSocStock / socStockCount) * 1000) / 1000;
    }
    if (erosionCount > 0) {
      avgErosionRate = Math.round((avgErosionRate / erosionCount) * 1000) / 1000;
    }

    return NextResponse.json({
      success: true,
      data: measurements,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
      summary: {
        totalMeasurements: total,
        avgSocStock,
        avgErosionRate,
        totalSedimentLoadKg: Math.round(totalSedimentLoad * 100) / 100,
        byQualityFlag,
        byMeasurementType,
        byIngestionMode,
      },
    });
  } catch (error) {
    console.error('Soil carbon measurements GET error:', error);
    return NextResponse.json(
      { success: false, error: 'ไม่สามารถดึงข้อมูลการวัดได้', details: String(error) },
      { status: 500 }
    );
  }
}

// ─── POST: สร้างการวัดใหม่พร้อมคำนวณอัตโนมัติ ───
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      plotId, measurementDate, measurementType, depthCm,
      soilMoisture, soilTemperature, soilPH, bulkDensity, organicCarbonPct,
      totalNitrogen, cec, aboveGroundBiomass, belowGroundBiomass,
      co2Flux, ch4Flux, n2oFlux,
      ingestionMode, sourceDevice, notes,
      // ข้อมูลชั้นปลูกและตะกอนดิน (พื้นที่ลาดชัน)
      terraceLayerId,
      runoffVolumeL, sedimentConcGpL,
      sedimentLoadKg, erosionRateTpHa,
      waterFlowRateLMin, infiltrationMmHr,
    } = body;

    // ตรวจสอบข้อมูลที่จำเป็น
    if (!plotId) {
      return NextResponse.json(
        { success: false, error: 'ต้องระบุ plotId' },
        { status: 400 }
      );
    }

    // ตรวจสอบว่าแปลงมีอยู่จริง
    const plot = await db.soilCarbonPlot.findUnique({ where: { plotId } });
    if (!plot) {
      return NextResponse.json(
        { success: false, error: `ไม่พบแปลงที่มี plotId: ${plotId}` },
        { status: 404 }
      );
    }

    // ตรวจสอบ terraceLayerId ถ้าระบุมา
    if (terraceLayerId) {
      const terrace = await db.terraceLayer.findUnique({ where: { id: terraceLayerId } });
      if (!terrace) {
        return NextResponse.json(
          { success: false, error: `ไม่พบชั้นปลูกที่มี id: ${terraceLayerId}` },
          { status: 404 }
        );
      }
      // ตรวจสอบว่าชั้นปลูกนี้อยู่ในแปลงที่ระบุ
      if (terrace.plotId !== plotId) {
        return NextResponse.json(
          { success: false, error: `ชั้นปลูก ${terraceLayerId} ไม่ได้อยู่ในแปลง ${plotId}` },
          { status: 400 }
        );
      }
    }

    // ─── 1. คำนวณ SOC Stock อัตโนมัติ ───
    const finalBulkDensity = bulkDensity || 0;
    const finalOrganicCarbonPct = organicCarbonPct || 0;
    const finalDepthCm = depthCm || 30;
    const socStock = finalBulkDensity * (finalOrganicCarbonPct / 100) * (finalDepthCm / 100);

    // ─── 2. คำนวณ sedimentLoadKg อัตโนมัติ ───
    // สูตร: sedimentLoadKg = runoffVolumeL × sedimentConcGpL / 1000
    const finalRunoffVolumeL = runoffVolumeL || 0;
    const finalSedimentConcGpL = sedimentConcGpL || 0;
    const calculatedSedimentLoadKg = sedimentLoadKg || (finalRunoffVolumeL * finalSedimentConcGpL / 1000);

    // ─── 3. คำนวณ erosionRateTpHa ───
    // ถ้าไม่ระบุมา ให้คำนวณจากตะกอนดินและความลาดชัน
    const calculatedErosionRate = erosionRateTpHa || calculateErosionRate(
      calculatedSedimentLoadKg,
      plot.slopeDegree,
      plot.areaHa
    );

    // ─── 4. คำนวณ Integrity Hash ───
    const timestamp = measurementDate || new Date().toISOString();
    const integrityHash = await calculateIntegrityHash(plotId, socStock, timestamp);

    // ─── 5. กำหนด qualityFlag ───
    const measurementData = {
      soilMoisture: soilMoisture || 0,
      soilTemperature: soilTemperature || 0,
      soilPH: soilPH || 7,
      bulkDensity: finalBulkDensity,
      organicCarbonPct: finalOrganicCarbonPct,
      co2Flux: co2Flux || 0,
      ch4Flux: ch4Flux || 0,
      n2oFlux: n2oFlux || 0,
      runoffVolumeL: finalRunoffVolumeL,
      sedimentConcGpL: finalSedimentConcGpL,
      erosionRateTpHa: calculatedErosionRate,
      infiltrationMmHr: infiltrationMmHr || 0,
    };
    const qualityFlag = determineQualityFlag(measurementData, plot.slopeDegree);

    // ─── 6. ประเมิน emission estimates จากการเปลี่ยนแปลง SOC ───
    const latestMeasurement = await db.soilCarbonMeasurement.findFirst({
      where: { plotId },
      orderBy: { measurementDate: 'desc' },
    });

    const previousSOCStock = latestMeasurement ? latestMeasurement.socStock : null;
    const emissionEstimates = estimateEmissionsFromSOC(socStock, previousSOCStock, plot.areaHa);

    // ─── 7. สร้างรายการวัดใหม่ ───
    const measurement = await db.soilCarbonMeasurement.create({
      data: {
        plotId,
        terraceLayerId: terraceLayerId || null,
        measurementDate: measurementDate ? new Date(measurementDate) : new Date(),
        measurementType: measurementType || 'FIELD',
        depthCm: finalDepthCm,
        soilMoisture: soilMoisture || 0,
        soilTemperature: soilTemperature || 0,
        soilPH: soilPH || 7,
        bulkDensity: finalBulkDensity,
        organicCarbonPct: finalOrganicCarbonPct,
        totalNitrogen: totalNitrogen || 0,
        cec: cec || 0,
        aboveGroundBiomass: aboveGroundBiomass || 0,
        belowGroundBiomass: belowGroundBiomass || 0,
        socStock: Math.round(socStock * 1000) / 1000,
        co2Flux: co2Flux || 0,
        ch4Flux: ch4Flux || 0,
        n2oFlux: n2oFlux || 0,
        runoffVolumeL: finalRunoffVolumeL,
        sedimentConcGpL: finalSedimentConcGpL,
        sedimentLoadKg: Math.round(calculatedSedimentLoadKg * 1000) / 1000,
        erosionRateTpHa: Math.round(calculatedErosionRate * 1000) / 1000,
        waterFlowRateLMin: waterFlowRateLMin || 0,
        infiltrationMmHr: infiltrationMmHr || 0,
        ingestionMode: ingestionMode || 'realtime',
        qualityFlag,
        integrityHash,
        sourceDevice: sourceDevice || '',
        notes: notes || '',
      },
      include: {
        plot: {
          select: {
            plotId: true,
            name: true,
            nameTh: true,
            province: true,
            cropType: true,
            practiceType: true,
            areaHa: true,
            slopeDegree: true,
          },
        },
        terraceLayer: {
          select: {
            id: true,
            layerNumber: true,
            layerName: true,
            layerNameTh: true,
            elevationMasl: true,
            cropType: true,
            ridgeWidthM: true,
            plantingAreaWidthM: true,
            vetiverGrassStatus: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: measurement,
        calculations: {
          socStock: {
            formula: 'socStock = bulkDensity × (organicCarbonPct / 100) × (depthCm / 100)',
            values: {
              bulkDensity: finalBulkDensity,
              organicCarbonPct: finalOrganicCarbonPct,
              depthCm: finalDepthCm,
              result: Math.round(socStock * 1000) / 1000,
            },
            unit: 'tC/ha',
          },
          sedimentLoad: {
            formula: 'sedimentLoadKg = runoffVolumeL × sedimentConcGpL / 1000',
            values: {
              runoffVolumeL: finalRunoffVolumeL,
              sedimentConcGpL: finalSedimentConcGpL,
              result: Math.round(calculatedSedimentLoadKg * 1000) / 1000,
            },
            unit: 'kg',
          },
          erosionRate: {
            formula: 'erosionRateTpHa = f(sedimentLoad, slopeDegree, areaHa) [RUSLE simplified]',
            values: {
              sedimentLoadKg: Math.round(calculatedSedimentLoadKg * 1000) / 1000,
              slopeDegree: plot.slopeDegree,
              areaHa: plot.areaHa,
              result: Math.round(calculatedErosionRate * 1000) / 1000,
            },
            unit: 't/ha/yr',
          },
          integrityHash: {
            algorithm: 'SHA-256',
            input: `${plotId}|${socStock.toFixed(6)}|${timestamp}`,
            result: integrityHash,
          },
          qualityAssessment: {
            flag: qualityFlag,
            slopeDegree: plot.slopeDegree,
            description: qualityFlag === 'VALIDATED'
              ? 'ค่าทั้งหมดอยู่ในช่วงปกติ (รวมพื้นที่ลาดชัน)'
              : 'พบค่าที่อาจผิดปกติ กรุณาตรวจสอบ (รวมตรวจสอบค่าตะกอนดิน)',
          },
          emissionEstimates: {
            previousSOCStock,
            socChange: emissionEstimates.socChange,
            co2Equivalent: Math.round(emissionEstimates.co2Equivalent * 1000) / 1000,
            ch4Estimate: emissionEstimates.ch4Estimate,
            n2oEstimate: emissionEstimates.n2oEstimate,
            co2Unit: 'tCO2e/ha',
            ch4Unit: 'tCO2e/ha (GWP100)',
            n2oUnit: 'tCO2e/ha (GWP100)',
          },
        },
        message: `สร้างข้อมูลการวัดสำเร็จ (qualityFlag: ${qualityFlag}${terraceLayerId ? `, ชั้นปลูก: ${terraceLayerId}` : ''})`,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Soil carbon measurement POST error:', error);
    return NextResponse.json(
      { success: false, error: 'ไม่สามารถสร้างข้อมูลการวัดได้', details: String(error) },
      { status: 500 }
    );
  }
}
