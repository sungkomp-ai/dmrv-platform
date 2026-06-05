import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// ─── TGO/T-VER Constants ─────────────────────────────────────────────
const TVER_METHODOLOGY_BIOCHAR = 'T-VER-P-CC-001'; // Carbon Capture & Storage through Biochar
const STOICHIOMETRIC_RATIO = 44 / 12; // 3.667 — CO₂/C molar mass ratio

async function resolveProjectId(providedId?: string): Promise<string> {
  if (providedId && providedId !== 'pyrolysis-sim') return providedId;
  const biocharProject = await db.project.findFirst({ where: { methodology: { contains: 'iochar' } } });
  if (biocharProject) return biocharProject.id;
  const anyProject = await db.project.findFirst();
  if (anyProject) return anyProject.id;
  return '';
}

// GET /api/dmrv/pyrolysis — Get pyrolysis simulation data from dMRV
export async function GET() {
  try {
    const pyrolysisLogs = await db.ingestionLog.findMany({
      where: { sourceType: 'PYROLYSIS_IOT' },
      orderBy: { timestamp: 'desc' },
      take: 500,
    });

    const auditLogs = await db.auditLog.findMany({
      where: { action: { contains: 'PYROLYSIS' } },
      orderBy: { timestamp: 'desc' },
      take: 50,
    });

    const sessionMap = new Map<string, Array<{ id: string; activityType: string; payload: string; timestamp: Date; integrityHash: string }>>();
    for (const log of pyrolysisLogs) {
      const key = log.projectId || 'unknown';
      if (!sessionMap.has(key)) sessionMap.set(key, []);
      sessionMap.get(key)!.push({
        id: log.id,
        activityType: log.activityType,
        payload: log.payload,
        timestamp: log.timestamp,
        integrityHash: log.integrityHash,
      });
    }

    const sessions = Array.from(sessionMap.entries()).map(([projectId, logs]) => {
      const firstLog = logs[logs.length - 1];
      let parsedData: Record<string, unknown> = {};
      try { parsedData = JSON.parse(firstLog.payload); } catch { /* empty */ }

      return {
        projectId,
        roundId: (parsedData as Record<string, unknown>).roundId || 0,
        feedstock: (parsedData as Record<string, unknown>).feedstock || 'Unknown',
        readingCount: logs.length,
        firstTimestamp: firstLog.timestamp.toISOString(),
        lastTimestamp: logs[0].timestamp.toISOString(),
      };
    });

    return NextResponse.json({
      sessions,
      totalLogs: pyrolysisLogs.length,
      auditLogs: auditLogs.map((a) => ({
        id: a.id,
        action: a.action,
        severity: a.severity,
        timestamp: a.timestamp.toISOString(),
        details: a.details,
      })),
      summary: {
        totalSessions: sessions.length,
        totalIoTReadings: pyrolysisLogs.length,
        lastIngestion: pyrolysisLogs[0]?.timestamp?.toISOString() || null,
      },
      tverReference: {
        methodology: TVER_METHODOLOGY_BIOCHAR,
        description: 'การกักเก็บคาร์บอนผ่านการผลิตไบโอชาร์ (Carbon Capture & Storage through Biochar Production)',
        stoichiometricRatio: STOICHIOMETRIC_RATIO,
        unit: 'tCO₂e',
        source: 'TGO Guidelines 2566',
      },
    });
  } catch (error) {
    console.error('Pyrolysis GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch pyrolysis data' }, { status: 500 });
  }
}

// POST /api/dmrv/pyrolysis — Ingest pyrolysis IoT data into dMRV
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      action: 'ingest_batch' | 'ingest_single' | 'finalize_round';
      projectId?: string;
      readings?: Array<Record<string, unknown>>;
      reading?: Record<string, unknown>;
      roundSummary?: Record<string, unknown>;
    };

    const action = body.action || 'ingest_single';

    if (action === 'ingest_batch' && body.readings && Array.isArray(body.readings)) {
      const projectId = await resolveProjectId(body.projectId);
      if (!projectId) {
        return NextResponse.json({ error: 'No project found for pyrolysis data' }, { status: 400 });
      }

      const created = [];
      for (const reading of body.readings) {
        const integrityHash = `sha256:${Date.now().toString(36)}:${Math.random().toString(36).slice(2)}`;
        const log = await db.ingestionLog.create({
          data: {
            projectId,
            sourceType: 'PYROLYSIS_IOT',
            activityType: `PYROLYSIS_R${reading.roundId}_${reading.phase}`,
            payload: JSON.stringify(reading),
            integrityHash,
            timestamp: reading.timestamp ? new Date(reading.timestamp as string) : new Date(),
          },
        });
        created.push({ id: log.id, integrityHash: log.integrityHash });
      }

      await db.auditLog.create({
        data: {
          agentName: 'PyrolysisAgent',
          action: 'PYROLYSIS_BATCH_INGEST',
          projectId,
          details: JSON.stringify({
            readingCount: created.length,
            roundIds: [...new Set(body.readings.map((r) => r.roundId))],
          }),
          severity: 'INFO',
        },
      });

      return NextResponse.json({
        success: true,
        ingested: created.length,
        integrityHashes: created,
      });
    }

    if (action === 'ingest_single' && body.reading) {
      const projectId = await resolveProjectId(body.projectId);
      if (!projectId) {
        return NextResponse.json({ error: 'No project found for pyrolysis data' }, { status: 400 });
      }

      const reading = body.reading;
      const integrityHash = `sha256:${Date.now().toString(36)}:${Math.random().toString(36).slice(2)}`;

      const log = await db.ingestionLog.create({
        data: {
          projectId,
          sourceType: 'PYROLYSIS_IOT',
          activityType: `PYROLYSIS_R${reading.roundId}_${reading.phase}`,
          payload: JSON.stringify(reading),
          integrityHash,
          timestamp: reading.timestamp ? new Date(reading.timestamp as string) : new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        logId: log.id,
        integrityHash: log.integrityHash,
      });
    }

    if (action === 'finalize_round' && body.roundSummary) {
      const projectId = await resolveProjectId(body.projectId);
      const summary = body.roundSummary;

      await db.auditLog.create({
        data: {
          agentName: 'PyrolysisAgent',
          action: 'PYROLYSIS_ROUND_COMPLETE',
          projectId: projectId || 'unknown',
          details: JSON.stringify(summary),
          severity: 'INFO',
        },
      });

      // T-VER-P-CC-001 Credit Calculation
      // ER = M_biochar(t) × f_C × f_perm × (44/12)
      const biocharKg = Number(summary.biocharKg) || 0;
      const carbonFraction = Number(summary.carbonFraction) || 0.7;
      const stabilityFactor = Number(summary.stabilityFactor) || 0.85;
      const biocharTonnes = biocharKg / 1000; // Convert kg to tonnes
      const emissionReductiontCO2e = biocharTonnes * carbonFraction * stabilityFactor * STOICHIOMETRIC_RATIO;

      if (emissionReductiontCO2e > 0 && projectId) {
        await db.carbonCredit.create({
          data: {
            projectId,
            tokenId: `PYRO-R${summary.roundId}-${Date.now().toString(36)}`,
            amount: emissionReductiontCO2e, // tCO₂e (T-VER standard unit)
            status: 'MINTED',
            metadata: JSON.stringify({
              source: 'PYROLYSIS_SIMULATION',
              tverMethodology: TVER_METHODOLOGY_BIOCHAR,
              roundId: summary.roundId,
              feedstock: summary.feedstock,
              biocharKg,
              biocharTonnes,
              carbonFraction,
              stabilityFactor,
              stoichiometricRatio: STOICHIOMETRIC_RATIO,
              formula: `ER = ${biocharTonnes.toFixed(3)}t × ${carbonFraction} × ${stabilityFactor} × ${STOICHIOMETRIC_RATIO.toFixed(3)}`,
              unit: 'tCO₂e',
            }),
          },
        });
      }

      return NextResponse.json({
        success: true,
        carbonSequesteredTco2e: emissionReductiontCO2e,
        creditCreated: emissionReductiontCO2e > 0,
        tverMethodology: TVER_METHODOLOGY_BIOCHAR,
        formula: `ER = M_biochar × f_C × f_perm × 44/12`,
        breakdown: {
          biocharTonnes,
          carbonFraction,
          stabilityFactor,
          stoichiometricRatio: STOICHIOMETRIC_RATIO,
        },
      });
    }

    return NextResponse.json({ error: 'Invalid action or missing data' }, { status: 400 });
  } catch (error) {
    console.error('Pyrolysis POST error:', error);
    return NextResponse.json({ error: 'Failed to process pyrolysis data' }, { status: 500 });
  }
}
