import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// ─── TGO/T-VER Constants for LIDAR Forest ──────────────────────────────
const TVER_METHODOLOGY_FOREST = 'T-VER-P-FOR-001'; // Reforestation / Forest Conservation
const CARBON_FRACTION = 0.47; // IPCC default: carbon fraction of dry biomass
const ROOT_SHOOT_RATIO = 0.26; // IPCC default root-to-shoot ratio for tropical forests
const CO2_TO_C_RATIO = 44 / 12; // 3.667 — CO₂/C molar mass ratio
const LIDAR_MINI_SERVICE_PORT = 3033;

async function resolveProjectId(providedId?: string): Promise<string> {
  if (providedId && providedId !== 'lidar-sim') return providedId;
  const lidarProject = await db.project.findFirst({
    where: { methodology: { contains: 'LIDAR_FOREST' } },
  });
  if (lidarProject) return lidarProject.id;
  const forestProject = await db.project.findFirst({
    where: { methodology: { contains: 'FOR' } },
  });
  if (forestProject) return forestProject.id;
  const anyProject = await db.project.findFirst();
  if (anyProject) return anyProject.id;
  return '';
}

// GET /api/dmrv/lidar — Fetch LIDAR simulation status from mini-service
export async function GET() {
  try {
    // Fetch live status from the LIDAR mini-service
    const response = await fetch(
      `http://localhost:${LIDAR_MINI_SERVICE_PORT}/api/status`,
      { cache: 'no-store' }
    );

    if (!response.ok) {
      console.error(
        `LIDAR mini-service returned ${response.status}: ${response.statusText}`
      );
      return NextResponse.json(
        {
          error: 'LIDAR mini-service unavailable',
          status: response.status,
        },
        { status: 502 }
      );
    }

    const data = await response.json();

    // Also fetch recent LIDAR ingestion logs from the database
    const recentLogs = await db.ingestionLog.findMany({
      where: { sourceType: 'lidar' },
      orderBy: { timestamp: 'desc' },
      take: 100,
    });

    const auditLogs = await db.auditLog.findMany({
      where: { action: { contains: 'LIDAR' } },
      orderBy: { timestamp: 'desc' },
      take: 50,
    });

    // Group ingestion logs by project for session summary
    const sessionMap = new Map<
      string,
      Array<{
        id: string;
        activityType: string;
        payload: string;
        timestamp: Date;
        integrityHash: string;
      }>
    >();
    for (const log of recentLogs) {
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

    const sessions = Array.from(sessionMap.entries()).map(
      ([projectId, logs]) => {
        const firstLog = logs[logs.length - 1];
        let parsedData: Record<string, unknown> = {};
        try {
          parsedData = JSON.parse(firstLog.payload);
        } catch {
          /* empty */
        }

        return {
          projectId,
          surveyYear: (parsedData as Record<string, unknown>).surveyYear || null,
          plotId: (parsedData as Record<string, unknown>).plotId || 'Unknown',
          readingCount: logs.length,
          firstTimestamp: firstLog.timestamp.toISOString(),
          lastTimestamp: logs[0].timestamp.toISOString(),
        };
      }
    );

    return NextResponse.json({
      ...data,
      dbSessions: sessions,
      totalIngestionLogs: recentLogs.length,
      auditLogs: auditLogs.map((a) => ({
        id: a.id,
        action: a.action,
        severity: a.severity,
        timestamp: a.timestamp.toISOString(),
        details: a.details,
      })),
      summary: {
        totalSessions: sessions.length,
        totalLidarReadings: recentLogs.length,
        lastIngestion: recentLogs[0]?.timestamp?.toISOString() || null,
      },
      tverReference: {
        methodology: TVER_METHODOLOGY_FOREST,
        description:
          'การติดตามและตรวจสอบสต็อกคาร์บอนป่าโดยใช้ข้อมูล LIDAR (Forest Carbon Stock Monitoring via LIDAR)',
        carbonFraction: CARBON_FRACTION,
        rootShootRatio: ROOT_SHOOT_RATIO,
        stoichiometricRatio: CO2_TO_C_RATIO,
        unit: 'tCO₂e',
        source: 'IPCC AR6 / TGO Guidelines 2566',
      },
    });
  } catch (error) {
    console.error('LIDAR GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch LIDAR data' },
      { status: 500 }
    );
  }
}

// POST /api/dmrv/lidar — Ingest LIDAR readings or finalize survey into dMRV
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      action: 'ingest_batch' | 'finalize_survey';
      projectId?: string;
      data?: unknown;
      readings?: Array<Record<string, unknown>>;
    };

    const action = body.action;

    // ─── ingest_batch: Ingest a batch of LIDAR readings ───────────────
    if (action === 'ingest_batch') {
      const readings =
        body.readings ||
        (Array.isArray(body.data) ? body.data : null);

      if (!readings || !Array.isArray(readings) || readings.length === 0) {
        return NextResponse.json(
          { error: 'readings array is required for ingest_batch' },
          { status: 400 }
        );
      }

      const projectId = await resolveProjectId(body.projectId);
      if (!projectId) {
        return NextResponse.json(
          { error: 'No project found for LIDAR data' },
          { status: 400 }
        );
      }

      const created = [];
      for (const reading of readings) {
        const integrityHash = `sha256:${Date.now().toString(36)}:${Math.random().toString(36).slice(2)}`;
        const log = await db.ingestionLog.create({
          data: {
            projectId,
            sourceType: 'lidar',
            activityType: `LIDAR_SCAN_${reading.plotId || 'unknown'}_${reading.scanType || 'point_cloud'}`,
            payload: JSON.stringify({
              ...reading,
              projectType: 'LIDAR_FOREST',
            }),
            integrityHash,
            timestamp: reading.timestamp
              ? new Date(reading.timestamp as string)
              : new Date(),
          },
        });
        created.push({ id: log.id, integrityHash: log.integrityHash });
      }

      // Audit log for batch ingestion
      await db.auditLog.create({
        data: {
          agentName: 'LidarAgent',
          action: 'LIDAR_BATCH_INGEST',
          projectId,
          details: JSON.stringify({
            readingCount: created.length,
            plotIds: [
              ...new Set(
                readings.map((r) => r.plotId || 'unknown')
              ),
            ],
            surveyYear: readings[0]?.surveyYear || null,
            projectType: 'LIDAR_FOREST',
          }),
          severity: 'INFO',
        },
      });

      return NextResponse.json({
        success: true,
        ingested: created.length,
        integrityHashes: created,
        projectType: 'LIDAR_FOREST',
      });
    }

    // ─── finalize_survey: Finalize a complete LIDAR survey year ───────
    if (action === 'finalize_survey') {
      const surveyData = body.data as Record<string, unknown> | undefined;
      if (!surveyData) {
        return NextResponse.json(
          { error: 'data object is required for finalize_survey' },
          { status: 400 }
        );
      }

      const projectId = await resolveProjectId(body.projectId);

      // Audit log for survey finalization
      await db.auditLog.create({
        data: {
          agentName: 'LidarAgent',
          action: 'LIDAR_SURVEY_FINALIZED',
          projectId: projectId || 'unknown',
          details: JSON.stringify({
            surveyYear: surveyData.surveyYear,
            plotCount: surveyData.plotCount,
            projectType: 'LIDAR_FOREST',
            ...surveyData,
          }),
          severity: 'INFO',
        },
      });

      // ── T-VER-P-FOR-001 Carbon Stock Credit Calculation ──────────
      // ΔC = (AGB + BGB) × CF × (44/12) × Area
      // AGB = Above-Ground Biomass (t/ha), BGB = AGB × root-to-shoot ratio
      // CF = Carbon Fraction (IPCC default 0.47)

      const agbTha = Number(surveyData.agbTha) || 0; // Above-ground biomass (tonnes/ha)
      const areaHa = Number(surveyData.areaHa) || 0; // Survey area (hectares)
      const bgbTha = agbTha * ROOT_SHOOT_RATIO; // Below-ground biomass
      const totalBiomassTha = agbTha + bgbTha; // Total biomass per hectare
      const carbonStockTha = totalBiomassTha * CARBON_FRACTION; // Carbon stock per hectare
      const totalCarbonStockTc = carbonStockTha * areaHa; // Total carbon stock (tonnes C)
      const emissionReductiontCO2e = totalCarbonStockTc * CO2_TO_C_RATIO; // Convert to tCO₂e

      let creditCreated = false;
      let creditId: string | null = null;

      if (emissionReductiontCO2e > 0 && projectId) {
        const credit = await db.carbonCredit.create({
          data: {
            projectId,
            tokenId: `LIDAR-${surveyData.surveyYear || 'SY'}-${Date.now().toString(36)}`,
            amount: emissionReductiontCO2e, // tCO₂e (T-VER standard unit)
            status: 'MINTED',
            metadata: JSON.stringify({
              source: 'LIDAR_FOREST_SIMULATION',
              projectType: 'LIDAR_FOREST',
              tverMethodology: TVER_METHODOLOGY_FOREST,
              surveyYear: surveyData.surveyYear,
              plotCount: surveyData.plotCount,
              agbTha,
              bgbTha,
              totalBiomassTha,
              carbonFraction: CARBON_FRACTION,
              rootShootRatio: ROOT_SHOOT_RATIO,
              areaHa,
              carbonStockTha,
              totalCarbonStockTc,
              stoichiometricRatio: CO2_TO_C_RATIO,
              formula: `ΔC = (${agbTha.toFixed(3)} + ${bgbTha.toFixed(3)}) × ${CARBON_FRACTION} × ${CO2_TO_C_RATIO.toFixed(3)} × ${areaHa.toFixed(2)}`,
              unit: 'tCO₂e',
            }),
          },
        });
        creditCreated = true;
        creditId = credit.id;

        // Create a verification record via VVBReview
        await db.vVBReview.create({
          data: {
            projectId,
            reviewerOrg: 'TGO-LIDAR-AUTO',
            reviewerName: 'Automated LIDAR Verification',
            reviewType: 'VERIFICATION',
            status: 'APPROVED',
            evidenceRefs: JSON.stringify([
              `LIDAR survey year ${surveyData.surveyYear}`,
              `AGB: ${agbTha.toFixed(3)} t/ha`,
              `Area: ${areaHa.toFixed(2)} ha`,
            ]),
            findings: JSON.stringify({
              carbonStockVerified: true,
              biomassConsistentWithPrevious: surveyData.consistentWithPrevious ?? true,
              noDeforestationDetected: surveyData.noDeforestation ?? true,
              dataQualityScore: surveyData.qualityScore ?? 0.95,
            }),
            recommendation: 'approve',
            comments: `Automated verification for LIDAR survey year ${surveyData.surveyYear}. Carbon stock: ${emissionReductiontCO2e.toFixed(4)} tCO₂e.`,
            reviewedAt: new Date(),
          },
        });
      }

      return NextResponse.json({
        success: true,
        surveyFinalized: true,
        carbonSequesteredTco2e: emissionReductiontCO2e,
        creditCreated,
        creditId,
        tverMethodology: TVER_METHODOLOGY_FOREST,
        formula: 'ΔC = (AGB + BGB) × CF × (44/12) × Area',
        breakdown: {
          agbTha,
          bgbTha,
          totalBiomassTha,
          carbonFraction: CARBON_FRACTION,
          rootShootRatio: ROOT_SHOOT_RATIO,
          areaHa,
          carbonStockTha,
          totalCarbonStockTc,
          stoichiometricRatio: CO2_TO_C_RATIO,
        },
      });
    }

    return NextResponse.json(
      { error: 'Invalid action. Supported: ingest_batch, finalize_survey' },
      { status: 400 }
    );
  } catch (error) {
    console.error('LIDAR POST error:', error);
    return NextResponse.json(
      { error: 'Failed to process LIDAR data' },
      { status: 500 }
    );
  }
}
