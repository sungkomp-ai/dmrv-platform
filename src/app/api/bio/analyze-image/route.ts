import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

// POST /api/bio/analyze-image — Analyze bio/microorganism images using VLM
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { imagePath?: string; question?: string };

    if (!body.imagePath || !body.question) {
      return NextResponse.json(
        { error: 'Both "imagePath" and "question" are required' },
        { status: 400 }
      );
    }

    const { imagePath, question } = body;

    // Resolve the image path — read from /home/z/my-project/upload/ directory
    const fileName = imagePath.replace(/^\/upload\//, '');
    const fullPath = join('/home/z/my-project/upload', fileName);

    if (!existsSync(fullPath)) {
      return NextResponse.json(
        { error: `Image not found: ${imagePath}` },
        { status: 404 }
      );
    }

    // Read the image and convert to base64
    const imageBuffer = readFileSync(fullPath);
    const base64Image = imageBuffer.toString('base64');

    // Determine MIME type from extension
    const ext = fileName.toLowerCase().split('.').pop();
    const mimeMap: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
      bmp: 'image/bmp',
    };
    const mimeType = mimeMap[ext || ''] || 'image/jpeg';

    const dataUrl = `data:${mimeType};base64,${base64Image}`;

    const zai = await ZAI.create();

    const systemPrompt = `You are an expert microbiologist and biochemist specializing in:
- Methanotrophs and methane oxidation processes
- Syntrophic methanogenic consortia (SynMEC)
- Microbial CO₂ capture and utilization (CCU)
- Waste-to-value bioprocesses
- Carbon footprint analysis of biological processes
- Anaerobic digestion, gas fermentation, and nutrient recovery

When analyzing images, provide detailed, scientifically accurate descriptions of the biological processes, microorganisms, and biochemical pathways shown. Include relevant species names, metabolic pathways, and environmental conditions when visible.`;

    const completion = await zai.chat.completions.createVision({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: [
            { type: 'text', text: question },
            { type: 'image_url', image_url: { url: dataUrl } },
          ],
        },
      ],
    });

    const analysis =
      completion.choices?.[0]?.message?.content ||
      'Unable to analyze the image.';

    return NextResponse.json({ analysis });
  } catch (error) {
    console.error('Image analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze image', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
