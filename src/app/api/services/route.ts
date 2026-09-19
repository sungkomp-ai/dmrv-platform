import { NextResponse } from 'next/server';
import { ensureMiniServices, serviceStatuses } from '@/lib/mini-service-manager';

/**
 * GET /api/services — status of every mini-service (no side effects).
 * POST /api/services — ensure every mini-service is running (idempotent).
 */
export async function GET() {
  const services = await serviceStatuses();
  return NextResponse.json({ services, allRunning: services.every((s) => s.running) });
}

export async function POST() {
  try {
    const services = await ensureMiniServices();
    return NextResponse.json({
      services,
      allRunning: services.every((s) => s.running),
    });
  } catch (error) {
    console.error('Mini-service start error:', error);
    return NextResponse.json({ error: 'Failed to start mini-services' }, { status: 500 });
  }
}
