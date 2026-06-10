import { NextResponse } from 'next/server';

// GET /api/bio/waste-to-value — Waste to Value processes data
export async function GET() {
  const pathways = [
    {
      id: 1,
      name: 'Bioenergy (Anaerobic Digestion)',
      inputs: ['Livestock waste', 'Food waste', 'Crop residues', 'Wastewater'],
      outputs: ['Biogas (CH₄+CO₂)', 'Digestate', 'Biohydrogen', 'Bioethanol'],
      carbonImpact: -2.5,
      scale: 'Industrial',
      yield: 850,
    },
    {
      id: 2,
      name: 'Gas Fermentation (LanzaTech)',
      inputs: ['CO + CO₂ syngas'],
      outputs: ['Ethanol', 'Butanol', 'Acetone', 'SAF (Sustainable Aviation Fuel)'],
      carbonImpact: -1.8,
      scale: 'Commercial',
      yield: 620,
    },
    {
      id: 3,
      name: 'Nutrient Recovery',
      inputs: ['Digestate', 'Wastewater'],
      outputs: ['Struvite (fertilizer)', 'Slow-release N/P', 'Biofertilizers'],
      carbonImpact: -0.3,
      scale: 'Pilot',
      yield: 280,
    },
    {
      id: 4,
      name: 'Composting & Soil Amendment',
      inputs: ['Organic waste', 'Green waste', 'Agricultural residues'],
      outputs: ['Compost', 'Biochar', 'Soil conditioner', 'Carbon sequestration'],
      carbonImpact: -0.9,
      scale: 'Commercial',
      yield: 420,
    },
    {
      id: 5,
      name: 'Insect-based Bioconversion',
      inputs: ['Food waste', 'Organic byproducts'],
      outputs: ['Insect protein (feed)', 'Frass (fertilizer)', 'Chitin', 'Biodiesel (from larvae oil)'],
      carbonImpact: -1.2,
      scale: 'Pilot',
      yield: 350,
    },
  ];

  const materialFlow = [
    { stage: 'Input', waste: 10000, co2: 5000, ch4: 3000 },
    { stage: 'Processing', waste: 3000, co2: 2500, ch4: 1500 },
    { stage: 'Output', waste: 500, co2: 800, ch4: 200 },
    { stage: 'Product', waste: 0, co2: 200, ch4: 0 },
  ];

  return NextResponse.json({
    pathways,
    materialFlow,
  });
}
