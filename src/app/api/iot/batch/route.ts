/**
 * POST /api/iot/batch
 * ──────────────────────────────────────────────
 * รับข้อมูล Batch (CSV/JSON) จาก Edge Node
 * ประมวลผล ตรวจสอบ และรับรองข้อมูลเป็นชุด
 */
import { NextRequest, NextResponse } from 'next/server';

const IOT_PORT = 3035;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const res = await fetch(`http://localhost:${IOT_PORT}/api/batch-upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
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
    const res = await fetch(`http://localhost:${IOT_PORT}/api/batch-jobs`);
    if (!res.ok) {
      return NextResponse.json({ error: 'Gateway unavailable' }, { status: 502 });
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
