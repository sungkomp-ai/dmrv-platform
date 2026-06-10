import { NextRequest } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';

// POST /api/bio/chat — AI chat about bio/microorganisms using LLM with streaming
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      messages?: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
    };

    if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
      return new Response(
        JSON.stringify({ error: '"messages" array is required and must not be empty' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const zai = await ZAI.create();

    const systemPrompt = `You are BioCarbon AI, an expert assistant specializing in microorganism-based carbon reduction and bioconversion processes. Your expertise covers:

1. **Methanotrophs & Methane Oxidation**: Methylococcus capsulatus, Methylosinus trichosporium, and other methane-oxidizing bacteria. Type I, Type II, and Type X (Verrucomicrobia) methanotrophs. CH₄ oxidation pathways (pMMO/sMMO), lipid/biofuel production, biopolymer (PHB) synthesis.

2. **Syntrophic Methanogenic Consortium (SynMEC)**: Syntrophic bacteria (Syntrophomonas wolfei, Syntrophobacter fumaroxidans) working with methanogens (Methanobacterium thermautotrophicum, Methanosaeta concilii, Methanosarcina barkeri). Hydrogenotrophic and acetoclastic methanogenesis pathways. Interspecies hydrogen transfer and thermodynamic feasibility.

3. **Microbial CO₂ Capture & Utilization (CCU)**: Acetogens (Clostridium spp.), cyanobacteria, microalgae, electro-microbial conversion. Products: acetic acid, bioethanol, biopolymers (PHA/PLA), biodiesel. Algae biofuel production with Chlorella, Spirulina, Nannochloropsis.

4. **Waste-to-Value Pathways**: Anaerobic digestion (biogas from livestock/food waste), gas fermentation (LanzaTech process for ethanol/SAF from syngas), nutrient recovery (struvite, biofertilizers), composting, insect bioconversion.

5. **Carbon Footprint Calculation**: Emission factors for bioremediation, methane oxidation, microbial CO₂ capture, gas fermentation, biofuel production. IPCC GWP values (CH₄ GWP=28, N₂O GWP=265).

Provide scientifically accurate, detailed responses with specific species names, metabolic pathways, and quantitative data where relevant. Use proper biochemical notation (e.g., CH₄, CO₂, H₂, NADH, FADH₂).`;

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      ...body.messages,
    ];

    const completion = await zai.chat.completions.create({
      messages,
      stream: true,
    });

    // Stream the response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of completion) {
            const content = chunk.choices?.[0]?.delta?.content;
            if (content) {
              controller.enqueue(encoder.encode(content));
            }
          }
          controller.close();
        } catch (streamError) {
          console.error('Stream error:', streamError);
          controller.error(streamError);
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Chat error:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to process chat request',
        details: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
