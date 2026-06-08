import { NextResponse } from 'next/server';
import { getAWDSimulation } from '@/lib/awd-simulation';

export async function POST() {
  const sim = getAWDSimulation();
  const result = sim.resetSim();
  return NextResponse.json(result);
}
