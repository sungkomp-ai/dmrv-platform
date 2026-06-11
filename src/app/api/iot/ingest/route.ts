/**
 * POST /api/iot/ingest
 * ──────────────────────────────────────────────
 * รับข้อมูล Realtime จาก Edge Node ผ่าน HTTP
 * ส่งต่อไปยัง IoT Gateway (port 3035) เพื่อประมวลผล
 */
import { NextRequest, NextResponse } from 'next/server';

const IOT_PORT = 3035;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    const res = await fetch(`http://127.0.0.1:${IOT_PORT}/api/realtime-ingest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: 'Gateway error' }));
      return NextResponse.json(error, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const limit = req.nextUrl.searchParams.get('limit') || '100';
    const edgeNodeId = req.nextUrl.searchParams.get('edgeNodeId') || '';
    const sensorType = req.nextUrl.searchParams.get('sensorType') || '';
    
    const params = new URLSearchParams({ limit });
    if (edgeNodeId) params.set('edgeNodeId', edgeNodeId);
    if (sensorType) params.set('sensorType', sensorType);

    const res = await fetch(`http://127.0.0.1:${IOT_PORT}/api/readings?${params}`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) {
      return NextResponse.json({ error: 'Gateway unavailable' }, { status: 502 });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
