/**
 * GET /api/soil-carbon/terraces
 * POST /api/soil-carbon/terraces
 * ──────────────────────────────────────────────
 * จัดการข้อมูลชั้นปลูก (Terrace Layer) สำหรับโครงการเกษตรขั้นบันได
 * GET: ดึงรายการชั้นปลูก (กรองตาม plotId ได้)
 * POST: สร้าง/อัปเดตชั้นปลูก
 */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// ─── GET: ดึงรายการชั้นปลูกจากฐานข้อมูล ───
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const plotId = searchParams.get('plotId') || '';
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    const where: Record<string, any> = {};
    if (plotId) where.plotId = plotId;

    const terraces = await db.terraceLayer.findMany({
      where,
      orderBy: { layerNumber: 'asc' },
      include: {
        checkDam: true,
        measurements: {
          orderBy: { measurementDate: 'desc' },
          take: 3,
        },
      },
      take: limit,
      skip: offset,
    });

    const total = await db.terraceLayer.count({ where });

    return NextResponse.json({
      success: true,
      data: terraces,
      pagination: { total, limit, offset, hasMore: offset + limit < total },
    });
  } catch (error) {
    console.error('Terraces GET error:', error);
    return NextResponse.json(
      { success: false, error: 'ไม่สามารถดึงข้อมูลชั้นปลูกได้', details: String(error) },
      { status: 500 }
    );
  }
}

// ─── POST: สร้างหรืออัปเดตชั้นปลูก ───
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      plotId, layerNumber, layerName, layerNameTh,
      elevationMasl, widthM, heightM, lengthM, areaSqm,
      cropType, soilDepthCm, sedimentDepthCm,
      waterFlowInLMin, waterFlowOutLMin, sedimentTrappedKg,
      organicCarbonPct, socStockTcHa, checkDamId,
    } = body;

    if (!plotId || !layerNumber) {
      return NextResponse.json(
        { success: false, error: 'ต้องระบุ plotId และ layerNumber' },
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

    // ค้นหาชั้นปลูกที่มีอยู่แล้ว (plotId + layerNumber)
    const existing = await db.terraceLayer.findFirst({
      where: { plotId, layerNumber },
    });

    if (existing) {
      // อัปเดตข้อมูลชั้นปลูกที่มีอยู่
      const updated = await db.terraceLayer.update({
        where: { id: existing.id },
        data: {
          layerName: layerName || existing.layerName,
          layerNameTh: layerNameTh || existing.layerNameTh,
          elevationMasl: elevationMasl ?? existing.elevationMasl,
          widthM: widthM ?? existing.widthM,
          heightM: heightM ?? existing.heightM,
          lengthM: lengthM ?? existing.lengthM,
          areaSqm: areaSqm ?? existing.areaSqm,
          cropType: cropType ?? existing.cropType,
          soilDepthCm: soilDepthCm ?? existing.soilDepthCm,
          sedimentDepthCm: sedimentDepthCm ?? existing.sedimentDepthCm,
          waterFlowInLMin: waterFlowInLMin ?? existing.waterFlowInLMin,
          waterFlowOutLMin: waterFlowOutLMin ?? existing.waterFlowOutLMin,
          sedimentTrappedKg: sedimentTrappedKg ?? existing.sedimentTrappedKg,
          organicCarbonPct: organicCarbonPct ?? existing.organicCarbonPct,
          socStockTcHa: socStockTcHa ?? existing.socStockTcHa,
          checkDamId: checkDamId !== undefined ? checkDamId : existing.checkDamId,
        },
        include: { checkDam: true },
      });

      return NextResponse.json({
        success: true,
        data: updated,
        message: `อัปเดตชั้นปลูกที่ ${layerNumber} สำเร็จ`,
      });
    }

    // สร้างชั้นปลูกใหม่
    const terrace = await db.terraceLayer.create({
      data: {
        plotId,
        layerNumber,
        layerName: layerName || `Terrace Layer ${layerNumber}`,
        layerNameTh: layerNameTh || `ชั้นปลูกที่ ${layerNumber}`,
        elevationMasl: elevationMasl || 0,
        widthM: widthM || 0,
        heightM: heightM || 0,
        lengthM: lengthM || 0,
        areaSqm: areaSqm || 0,
        cropType: cropType || '',
        soilDepthCm: soilDepthCm || 30,
        sedimentDepthCm: sedimentDepthCm || 0,
        waterFlowInLMin: waterFlowInLMin || 0,
        waterFlowOutLMin: waterFlowOutLMin || 0,
        sedimentTrappedKg: sedimentTrappedKg || 0,
        organicCarbonPct: organicCarbonPct || 0,
        socStockTcHa: socStockTcHa || 0,
        checkDamId: checkDamId || null,
      },
      include: { checkDam: true },
    });

    return NextResponse.json(
      { success: true, data: terrace, message: `สร้างชั้นปลูกที่ ${layerNumber} สำเร็จ` },
      { status: 201 }
    );
  } catch (error) {
    console.error('Terraces POST error:', error);
    return NextResponse.json(
      { success: false, error: 'ไม่สามารถสร้างชั้นปลูกได้', details: String(error) },
      { status: 500 }
    );
  }
}
