import { NextResponse } from 'next/server';

// GET /api/bio/synmec — Syntrophic Methanogenic Consortium data
export async function GET() {
  const consortiumData = {
    name: 'SynMEC',
    description: 'Syntrophic Methanogenic Consortium',
    bacteriaGroups: [
      {
        name: 'Syntrophic Bacteria',
        role: 'Break down complex organic matter, produce H₂ and volatile fatty acids',
        keySpecies: [
          'Syntrophomonas wolfei',
          'Syntrophobacter fumaroxidans',
          'Pelotomaculum thermopropionicum',
        ],
        products: ['H₂', 'Acetate', 'Formate'],
      },
      {
        name: 'Methanogens',
        role: 'Consume H₂/acetate to produce methane',
        keySpecies: [
          'Methanobacterium thermautotrophicum',
          'Methanosaeta concilii',
          'Methanosarcina barkeri',
        ],
        products: ['CH₄', 'CO₂'],
      },
    ],
    functions: [
      {
        name: 'H₂ Accumulation Prevention',
        description: 'Methanogens consume H₂ to prevent inhibition',
        efficiency: 94,
      },
      {
        name: 'Increased CH₄ Production',
        description: 'Syntrophic interaction enhances methane yield',
        efficiency: 87,
      },
      {
        name: 'Optimal pH Maintenance',
        description: 'Consortium stabilizes pH between 6.5-7.5',
        efficiency: 91,
      },
      {
        name: 'Resilience/Robustness',
        description: 'Community tolerates environmental stresses',
        efficiency: 88,
      },
    ],
  };

  // Simulate 30-day time series data
  const timeSeriesData = [];
  for (let d = 1; d <= 30; d++) {
    const lagFactor = d <= 5 ? 0.3 : d <= 10 ? 0.6 : d <= 15 ? 0.85 : 1.0;
    const ch4Production = (0.5 + d * 0.12 + Math.sin(d * 0.4) * 0.15) * lagFactor;
    const h2Concentration = Math.max(0.1, 2.1 - d * 0.05 + Math.cos(d * 0.3) * 0.3);
    const ph = 7.2 + Math.sin(d * 0.2) * 0.25 - (d > 20 ? 0.1 : 0);
    const volatileFattyAcids = Math.max(100, 1200 - d * 28 + Math.sin(d * 0.5) * 80);
    timeSeriesData.push({
      day: d,
      ch4Production: Math.round(ch4Production * 100) / 100,
      h2Concentration: Math.round(h2Concentration * 100) / 100,
      ph: Math.round(ph * 100) / 100,
      volatileFattyAcids: Math.round(volatileFattyAcids),
    });
  }

  const metabolicPathways = [
    {
      pathway: 'Hydrogenotrophic methanogenesis',
      equation: '4H₂ + CO₂ → CH₄ + 2H₂O',
      rate: 8.5,
    },
    {
      pathway: 'Acetoclastic methanogenesis',
      equation: 'CH₃COOH → CH₄ + CO₂',
      rate: 6.2,
    },
    {
      pathway: 'Syntrophic acetate oxidation',
      equation: 'CH₃COOH + 2H₂O → 4H₂ + 2CO₂',
      rate: 3.1,
    },
  ];

  return NextResponse.json({
    consortiumData,
    timeSeriesData,
    metabolicPathways,
  });
}
