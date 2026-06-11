/**
 * GET /api/iot/edge-nodes
 * ──────────────────────────────────────────────
 * ดึงข้อมูล Edge Node ทั้งหมด พร้อมสถานะปัจจุบัน
 */
import { NextRequest, NextResponse } from 'next/server';

const IOT_PORT = 3035;

export async function GET(req: NextRequest) {
  try {
    const res = await fetch(`http://127.0.0.1:${IOT_PORT}/api/edge-nodes`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) {
      return NextResponse.json({ error: 'Gateway unavailable' }, { status: 502 });
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
