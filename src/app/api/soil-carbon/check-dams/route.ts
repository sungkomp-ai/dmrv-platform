/**
 * GET /api/soil-carbon/check-dams
 * POST /api/soil-carbon/check-dams
 * ──────────────────────────────────────────────
 * จัดการข้อมูลฝายชะลอน้ำ (Check Dam) สำหรับโครงการเกษตรขั้นบันได
 * GET: ดึงรายการฝาย (กรองตาม plotId ได้)
 * POST: สร้าง/อัปเดตฝาย
 */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// ─── GET: ดึงรายการฝายชะลอน้ำจากฐานข้อมูล ───
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const plotId = searchParams.get('plotId') || '';
    const status = searchParams.get('status') || '';
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    const where: Record<string, any> = {};
    if (plotId) where.plotId = plotId;
    if (status) where.status = status;

    const checkDams = await db.checkDam.findMany({
      where,
      orderBy: { damId: 'asc' },
      take: limit,
      skip: offset,
    });

    const total = await db.checkDam.count({ where });

    return NextResponse.json({
      success: true,
      data: checkDams,
      pagination: { total, limit, offset, hasMore: offset + limit < total },
    });
  } catch (error) {
    console.error('Check dams GET error:', error);
    return NextResponse.json(
      { success: false, error: 'ไม่สามารถดึงข้อมูลฝายชะลอน้ำได้', details: String(error) },
      { status: 500 }
    );
  }
}

// ─── POST: สร้างหรืออัปเดตฝายชะลอน้ำ ───
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      plotId, damId, damName, damNameTh, damType,
      heightM, widthM, thicknessM,
      upstreamDepthM, sedimentDepthCm, sedimentVolumeM3,
      sedimentSOCpct, sedimentCarbonTc,
      flowRateLMin, flowReductionPct, trapEfficiencyPct,
      status, lastInspection,
    } = body;

    if (!plotId || !damId) {
      return NextResponse.json(
        { success: false, error: 'ต้องระบุ plotId และ damId' },
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

    // ค้นหาฝายที่มีอยู่ (plotId + damId)
    const existing = await db.checkDam.findFirst({
      where: { plotId, damId },
    });

    // คำนวณ sedimentCarbonTc อัตโนมัติ (ถ้าไม่ได้ระบุ)
    let finalSedimentCarbonTc = sedimentCarbonTc;
    if (finalSedimentCarbonTc === undefined && sedimentVolumeM3 && sedimentSOCpct) {
      const bulkDensity = 1.3; // g/cm³ ค่าเริ่มต้น
      finalSedimentCarbonTc = sedimentVolumeM3 * bulkDensity * 1000 * (sedimentSOCpct / 100) / 1000;
    }

    if (existing) {
      // อัปเดตฝายที่มีอยู่
      const updated = await db.checkDam.update({
        where: { id: existing.id },
        data: {
          damName: damName || existing.damName,
          damNameTh: damNameTh || existing.damNameTh,
          damType: damType || existing.damType,
          heightM: heightM ?? existing.heightM,
          widthM: widthM ?? existing.widthM,
          thicknessM: thicknessM ?? existing.thicknessM,
          upstreamDepthM: upstreamDepthM ?? existing.upstreamDepthM,
          sedimentDepthCm: sedimentDepthCm ?? existing.sedimentDepthCm,
          sedimentVolumeM3: sedimentVolumeM3 ?? existing.sedimentVolumeM3,
          sedimentSOCpct: sedimentSOCpct ?? existing.sedimentSOCpct,
          sedimentCarbonTc: finalSedimentCarbonTc ?? existing.sedimentCarbonTc,
          flowRateLMin: flowRateLMin ?? existing.flowRateLMin,
          flowReductionPct: flowReductionPct ?? existing.flowReductionPct,
          trapEfficiencyPct: trapEfficiencyPct ?? existing.trapEfficiencyPct,
          status: status || existing.status,
          lastInspection: lastInspection ? new Date(lastInspection) : existing.lastInspection,
        },
      });

      return NextResponse.json({
        success: true,
        data: updated,
        message: `อัปเดตฝาย "${damId}" สำเร็จ`,
      });
    }

    // สร้างฝายใหม่
    const checkDam = await db.checkDam.create({
      data: {
        plotId,
        damId,
        damName: damName || `Check Dam ${damId}`,
        damNameTh: damNameTh || `ฝายชะลอน้ำ ${damId}`,
        damType: damType || 'STONE',
        heightM: heightM || 0,
        widthM: widthM || 0,
        thicknessM: thicknessM || 0,
        upstreamDepthM: upstreamDepthM || 0,
        sedimentDepthCm: sedimentDepthCm || 0,
        sedimentVolumeM3: sedimentVolumeM3 || 0,
        sedimentSOCpct: sedimentSOCpct || 0,
        sedimentCarbonTc: finalSedimentCarbonTc || 0,
        flowRateLMin: flowRateLMin || 0,
        flowReductionPct: flowReductionPct || 0,
        trapEfficiencyPct: trapEfficiencyPct || 0,
        status: status || 'ACTIVE',
        lastInspection: lastInspection ? new Date(lastInspection) : null,
      },
    });

    return NextResponse.json(
      { success: true, data: checkDam, message: `สร้างฝาย "${damId}" สำเร็จ` },
      { status: 201 }
    );
  } catch (error) {
    console.error('Check dams POST error:', error);
    return NextResponse.json(
      { success: false, error: 'ไม่สามารถสร้างฝายชะลอน้ำได้', details: String(error) },
      { status: 500 }
    );
  }
}
