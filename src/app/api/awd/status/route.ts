import { NextResponse } from 'next/server';
import { getAWDSimulation } from '@/lib/awd-simulation';

export async function GET() {
  const sim = getAWDSimulation();
  return NextResponse.json(sim.getStatus());
}
