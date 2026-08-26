import { NextResponse } from 'next/server';
import { getAWDSimulation } from '@/lib/awd-simulation';

// GET /api/awd/mode — return current calculation mode
export async function GET() {
  const sim = getAWDSimulation();
  return NextResponse.json({ calcMode: sim.getCalcMode() });
}

// POST /api/awd/mode — set calculation mode ('full' | 'simplified')
export async function POST(req: Request) {
  const sim = getAWDSimulation();
  try {
    const body = await req.json();
    const mode = body?.calcMode;
    if (mode !== 'full' && mode !== 'simplified') {
      return NextResponse.json(
        { success: false, error: "calcMode must be 'full' or 'simplified'" },
        { status: 400 }
      );
    }
    const result = sim.setCalcMode(mode);
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: e?.message || 'Invalid request' },
      { status: 400 }
    );
  }
}
