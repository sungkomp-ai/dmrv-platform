import { NextResponse } from 'next/server';
import { getAWDSimulation } from '@/lib/awd-simulation';

export async function POST() {
  const sim = getAWDSimulation();
  const result = sim.stopSim();
  return NextResponse.json(result);
}
