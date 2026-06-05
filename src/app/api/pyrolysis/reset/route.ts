import { NextResponse } from 'next/server';
import { getPyrolysisSimulation } from '@/lib/pyrolysis-simulation';

export async function POST() {
  const sim = getPyrolysisSimulation();
  const result = sim.resetSim();
  return NextResponse.json(result);
}
