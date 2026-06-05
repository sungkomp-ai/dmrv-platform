import { NextResponse } from 'next/server';
import { getPyrolysisSimulation } from '@/lib/pyrolysis-simulation';

export async function GET() {
  const sim = getPyrolysisSimulation();
  return NextResponse.json(sim.getRounds());
}
