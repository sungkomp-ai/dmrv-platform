import { NextRequest, NextResponse } from 'next/server';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

// GET /api/bio/serve-image — Serve uploaded images
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const file = searchParams.get('file');

    if (!file) {
      return NextResponse.json({ error: 'File parameter is required' }, { status: 400 });
    }

    // Security: prevent directory traversal
    const safeName = file.replace(/[^a-zA-Z0-9._-]/g, '');
    const fullPath = join('/home/z/my-project/upload', safeName);

    if (!existsSync(fullPath)) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    const buffer = readFileSync(fullPath);

    const ext = safeName.toLowerCase().split('.').pop();
    const mimeMap: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
      bmp: 'image/bmp',
    };
    const mimeType = mimeMap[ext || ''] || 'image/jpeg';

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': mimeType,
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to serve image' }, { status: 500 });
  }
}
