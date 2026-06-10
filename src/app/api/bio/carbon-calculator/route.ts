import { NextRequest, NextResponse } from 'next/server';

// Emission factors from the Excel templates (tCO2e per unit activity)
const EMISSION_FACTORS: Record<string, { factor: number; notes: string }> = {
  'Bioremediation - Soil': {
    factor: 0.5,
    notes: 'CO2 from microbial metabolism',
  },
  'Bioremediation - Water': {
    factor: 0.6,
    notes: 'CO2 from microbial metabolism in aqueous systems',
  },
  'Biodegradation - Composting': {
    factor: 0.2,
    notes: 'Net CO2 from aerobic decomposition (biogenic)',
  },
  'Methane Oxidation - Biofilter': {
    factor: -28,
    notes: 'CH4 oxidized, tCO2e reduction (GWP 28)',
  },
  'Methane Oxidation - Bioreactor': {
    factor: -28,
    notes: 'CH4 oxidized in bioreactor, tCO2e reduction (GWP 28)',
  },
  'Microbial CO₂ Capture': {
    factor: -1,
    notes: 'CO2 captured by microorganisms, tCO2e reduction',
  },
  'Algae Biofuel Production': {
    factor: 0.2,
    notes: 'Net CO2 from algae processing (offset by capture)',
  },
  'Biogas from Livestock Waste': {
    factor: 0.25,
    notes: 'Fugitive emissions from biogas production',
  },
  'Biohydrogen Production': {
    factor: 0.1,
    notes: 'Minimal CO2 from dark/photo fermentation',
  },
  'Bioethanol Production': {
    factor: 0.15,
    notes: 'CO2 from fermentation (biogenic)',
  },
  'Gas Fermentation': {
    factor: -0.8,
    notes: 'CO/CO2 converted to products, net reduction',
  },
  'Nutrient Recovery': {
    factor: 0.05,
    notes: 'Minimal emissions from nutrient recovery process',
  },
};

interface CalculatorEntry {
  process: string;
  activityData: number;
}

interface CalculatorResult {
  process: string;
  activityData: number;
  emissionFactor: number;
  co2e: number;
  notes: string;
}

// POST /api/bio/carbon-calculator — Calculate carbon footprint
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { entries: CalculatorEntry[] };

    if (!body.entries || !Array.isArray(body.entries)) {
      return NextResponse.json(
        { error: 'Invalid request: "entries" array is required' },
        { status: 400 }
      );
    }

    const results: CalculatorResult[] = [];
    let totalEmissions = 0;

    for (const entry of body.entries) {
      const { process, activityData } = entry;

      if (!process || typeof activityData !== 'number') {
        return NextResponse.json(
          { error: 'Each entry must have "process" (string) and "activityData" (number)' },
          { status: 400 }
        );
      }

      const ef = EMISSION_FACTORS[process];
      if (!ef) {
        return NextResponse.json(
          { error: `Unknown process: "${process}". Available processes: ${Object.keys(EMISSION_FACTORS).join(', ')}` },
          { status: 400 }
        );
      }

      const co2e = Math.round(activityData * ef.factor * 100) / 100;
      totalEmissions += co2e;

      results.push({
        process,
        activityData,
        emissionFactor: ef.factor,
        co2e,
        notes: ef.notes,
      });
    }

    totalEmissions = Math.round(totalEmissions * 100) / 100;

    return NextResponse.json({
      results,
      totalEmissions,
      netReduction: totalEmissions < 0,
    });
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    );
  }
}
