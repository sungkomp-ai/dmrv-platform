import { NextRequest, NextResponse } from 'next/server';

// Bio & Microorganism Simulator API — dMRV Integration
// Receives simulation data and makes it available for dMRV platform

let ingestedCount = 0;
const recentIngestions: Array<{
  timestamp: string;
  count: number;
  stationIds: string[];
}> = [];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, readings } = body;

    if (action === 'ingest_batch' && Array.isArray(readings)) {
      const stationIds = [...new Set(readings.map((r: { stationId: string }) => r.stationId))];
      ingestedCount += readings.length;
      recentIngestions.push({
        timestamp: new Date().toISOString(),
        count: readings.length,
        stationIds,
      });
      // Keep last 50 ingestions
      if (recentIngestions.length > 50) recentIngestions.shift();

      return NextResponse.json({
        ingested: readings.length,
        totalIngested: ingestedCount,
        stationIds,
        standards: {
          tgo: 'T-VER-AG-001 / T-VER-WT-001',
          international: 'IPCC 2006 GL Vol.5 / CDM AMS-III.H / VCS VM-0041',
        },
      });
    }

    if (action === 'status') {
      return NextResponse.json({
        totalIngested: ingestedCount,
        recentIngestions: recentIngestions.slice(-10),
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}

export async function GET() {
  return NextResponse.json({
    totalIngested: ingestedCount,
    recentIngestions: recentIngestions.slice(-10),
    standards: {
      tgo: 'T-VER-AG-001 / T-VER-WT-001',
      international: 'IPCC 2006 GL Vol.5 / CDM AMS-III.H / VCS VM-0041',
    },
  });
}
