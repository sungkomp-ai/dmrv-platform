import { db } from '@/lib/db';
import { ensureSeeded } from '@/lib/seed';
import { NextRequest, NextResponse } from 'next/server';

// ─── TGO/T-VER Constants ─────────────────────────────────────────────
const GWP_CH4 = 28;     // IPCC AR5 (ตามประกาศ TGO 2566)
const GWP_N2O = 265;    // IPCC AR5 (ตามประกาศ TGO 2566)
const TVER_METHODOLOGY = 'T-VER-P-AG-001';

export async function GET() {
  await ensureSeeded();

  // Find AWD-related projects
  const projects = await db.project.findMany({
    where: {
      OR: [
        { methodology: { contains: 'AWD' } },
        { province: { contains: 'นครราชสีมา' } },
        { province: { contains: 'สุพรรณบุรี' } },
        { province: { contains: 'อุบลราชธานี' } },
      ],
    },
    include: { plots: true, credits: true, iotSensors: true },
    orderBy: { createdAt: 'asc' },
    take: 5,
  });

  const ingestionLogs = await db.ingestionLog.findMany({
    where: { activityType: 'awd_simulation' },
    orderBy: { timestamp: 'desc' },
    take: 50,
  });

  return NextResponse.json({
    projects,
    ingestionCount: ingestionLogs.length,
    recentIngestions: ingestionLogs.slice(0, 10),
    tverReference: {
      methodology: TVER_METHODOLOGY,
      description: 'การลดการปล่อยก๊าซมีเทนจากการปลูกข้าวโดยวิธี AWD',
      gwpCH4: GWP_CH4,
      gwpN2O: GWP_N2O,
      source: 'IPCC AR5 / TGO Guidelines 2566',
      unit: 'tCO₂e',
    },
  });
}

export async function POST(req: NextRequest) {
  await ensureSeeded();

  const body = await req.json();
  const { action } = body;

  if (action === 'ingest_batch') {
    const { readings } = body as { readings: Array<Record<string, unknown>> };
    if (!readings || !Array.isArray(readings) || readings.length === 0) {
      return NextResponse.json({ error: 'readings array required' }, { status: 400 });
    }

    // Find the AWD project (first match)
    const project = await db.project.findFirst({
      where: { province: { contains: 'นครราชสีมา' } },
    });

    const created = [];
    for (const r of readings) {
      const log = await db.ingestionLog.create({
        data: {
          projectId: project?.id || 'unknown',
          sourceType: 'iot',
          activityType: 'awd_simulation',
          payload: JSON.stringify(r),
          integrityHash: `sha256-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
          classification: 'PUBLIC',
          isEncrypted: false,
          timestamp: new Date(r.timestamp as string || new Date()),
        },
      });
      created.push(log.id);
    }

    return NextResponse.json({ ingested: created.length, ids: created });
  }

  if (action === 'ingest_summary') {
    const { fieldId, totalDAP, totalCH4kg, totalN2Okg, emissionReductiontCO2e, yieldKg, awdCycles, areaHa } = body;
    const project = await db.project.findFirst({
      where: { province: { contains: 'นครราชสีมา' } },
    });

    const log = await db.ingestionLog.create({
      data: {
        projectId: project?.id || 'unknown',
        sourceType: 'iot',
        activityType: 'awd_simulation_summary',
        payload: JSON.stringify({
          fieldId, totalDAP,
          totalCH4kg, totalN2Okg,
          emissionReductiontCO2e,
          yieldKg, awdCycles, areaHa,
          tverMethodology: TVER_METHODOLOGY,
          gwpCH4: GWP_CH4,
          gwpN2O: GWP_N2O,
          unit: 'tCO₂e',
        }),
        integrityHash: `sha256-summary-${Date.now()}`,
        classification: 'CONFIDENTIAL',
        isEncrypted: false,
      },
    });

    // Mint carbon credit if emission reduction > 0
    const erTco2e = Number(emissionReductiontCO2e) || 0;
    let creditCreated = false;
    if (erTco2e > 0 && project) {
      await db.carbonCredit.create({
        data: {
          projectId: project.id,
          tokenId: `AWD-${fieldId}-${Date.now().toString(36)}`,
          amount: erTco2e, // tCO₂e (T-VER standard unit)
          status: 'MINTED',
          metadata: JSON.stringify({
            source: 'AWD_SIMULATION',
            fieldId,
            tverMethodology: TVER_METHODOLOGY,
            totalCH4kg: Number(totalCH4kg) || 0,
            totalN2Okg: Number(totalN2Okg) || 0,
            awdCycles: Number(awdCycles) || 0,
            areaHa: Number(areaHa) || 0,
            gwpCH4: GWP_CH4,
            gwpN2O: GWP_N2O,
            emissionReductiontCO2e: erTco2e,
            unit: 'tCO₂e',
          }),
        },
      });
      creditCreated = true;
    }

    return NextResponse.json({
      ingested: true,
      id: log.id,
      emissionReductiontCO2e: erTco2e,
      creditCreated,
      tverMethodology: TVER_METHODOLOGY,
    });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
