import { NextRequest, NextResponse } from 'next/server';
import { getAWDSimulation } from '@/lib/awd-simulation';

export async function GET(req: NextRequest) {
  const sim = getAWDSimulation();
  const limit = parseInt(req.nextUrl.searchParams.get('limit') || '100', 10);
  const data = sim.getReadings(limit);
  return NextResponse.json(data);
}
