import { NextRequest, NextResponse } from 'next/server';
import { getPyrolysisSimulation } from '@/lib/pyrolysis-simulation';

export async function GET(req: NextRequest) {
  const sim = getPyrolysisSimulation();
  const roundId = req.nextUrl.searchParams.get('roundId');
  const data = sim.getReadings(roundId ? Number(roundId) : undefined);
  return NextResponse.json(data);
}
