import { db } from '@/lib/db';
import { ensureSeeded } from '@/lib/seed';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    await ensureSeeded();
    const locations = await db.location.findMany({ orderBy: { createdAt: 'desc' } });
    return NextResponse.json({ locations });
  } catch (error) {
    console.error('Error fetching locations:', error);
    return NextResponse.json({ error: 'Failed to fetch locations' }, { status: 500 });
  }
}
