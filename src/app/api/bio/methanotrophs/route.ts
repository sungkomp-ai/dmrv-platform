import { NextResponse } from 'next/server';

// GET /api/bio/methanotrophs — Methane-oxidizing microorganisms data
export async function GET() {
  const organisms = [
    {
      id: 1,
      name: 'Methylococcus capsulatus',
      type: 'Type I Methanotroph',
      optimalTemp: '45°C',
      optimalPH: '6.8',
      ch4OxidationRate: 12.5,
      biomassYield: 0.85,
      lipidContent: 22.3,
      product: 'Biofuel, Lipids',
      status: 'Active',
      habitat: 'Soil, Landfill cover',
    },
    {
      id: 2,
      name: 'Methylosinus trichosporium',
      type: 'Type II Methanotroph',
      optimalTemp: '30°C',
      optimalPH: '6.5',
      ch4OxidationRate: 9.8,
      biomassYield: 0.72,
      lipidContent: 28.5,
      product: 'PHB Biopolymer, Lipids',
      status: 'Active',
      habitat: 'Soil, Rice paddies',
    },
    {
      id: 3,
      name: 'Methylobacter luteus',
      type: 'Type I Methanotroph',
      optimalTemp: '35°C',
      optimalPH: '7.0',
      ch4OxidationRate: 11.2,
      biomassYield: 0.78,
      lipidContent: 18.7,
      product: 'Single-cell protein',
      status: 'Active',
      habitat: 'Freshwater sediment',
    },
    {
      id: 4,
      name: 'Methanomonas methanica',
      type: 'Type I Methanotroph',
      optimalTemp: '28°C',
      optimalPH: '7.2',
      ch4OxidationRate: 8.5,
      biomassYield: 0.65,
      lipidContent: 15.4,
      product: 'Biofuel',
      status: 'Under Study',
      habitat: 'Wetland soil',
    },
    {
      id: 5,
      name: 'Methylocystis parvus',
      type: 'Type II Methanotroph',
      optimalTemp: '32°C',
      optimalPH: '6.4',
      ch4OxidationRate: 7.9,
      biomassYield: 0.68,
      lipidContent: 32.1,
      product: 'Lipids, Bioplastics',
      status: 'Active',
      habitat: 'Peat bogs, Soil',
    },
    {
      id: 6,
      name: 'Methylacidiphilum infernorum',
      type: 'Type X (Verrucomicrobia)',
      optimalTemp: '55°C',
      optimalPH: '2.5',
      ch4OxidationRate: 6.3,
      biomassYield: 0.42,
      lipidContent: 8.2,
      product: 'Extremozymes',
      status: 'Under Study',
      habitat: 'Geothermal springs, Volcanic soil',
    },
    {
      id: 7,
      name: 'Methylocella silvestris',
      type: 'Type II Methanotroph',
      optimalTemp: '25°C',
      optimalPH: '5.5',
      ch4OxidationRate: 5.7,
      biomassYield: 0.55,
      lipidContent: 25.8,
      product: 'Lipids, Organic acids',
      status: 'Active',
      habitat: 'Acidic forest soil',
    },
    {
      id: 8,
      name: 'Methylomicrobium album',
      type: 'Type I Methanotroph',
      optimalTemp: '38°C',
      optimalPH: '7.5',
      ch4OxidationRate: 10.8,
      biomassYield: 0.80,
      lipidContent: 20.1,
      product: 'Biofuel, Feed additive',
      status: 'Active',
      habitat: 'Lake sediment, Wastewater',
    },
    {
      id: 9,
      name: 'Methylocapsa acidiphila',
      type: 'Type II Methanotroph',
      optimalTemp: '22°C',
      optimalPH: '5.2',
      ch4OxidationRate: 4.9,
      biomassYield: 0.48,
      lipidContent: 26.3,
      product: 'Lipids, EPS',
      status: 'Under Study',
      habitat: 'Acidic moorland',
    },
    {
      id: 10,
      name: 'Candidatus Methylacidimicrobium tartarense',
      type: 'Type X (Verrucomicrobia)',
      optimalTemp: '50°C',
      optimalPH: '3.0',
      ch4OxidationRate: 7.1,
      biomassYield: 0.38,
      lipidContent: 6.5,
      product: 'Thermostable enzymes',
      status: 'Under Study',
      habitat: 'Geothermal environments',
    },
  ];

  // Simulate 24-hour methanotroph process data
  const processData = [];
  for (let h = 0; h <= 24; h += 2) {
    const ch4Concentration = Math.max(5, 100 - h * 3.5 + Math.sin(h * 0.5) * 5);
    const oxidationRate = h === 0 ? 0 : Math.min(15, h * 0.8 + Math.sin(h * 0.3) * 1.2);
    const biomassGrowth = h === 0 ? 0 : Math.min(0.85, h * 0.035 + Math.cos(h * 0.2) * 0.02);
    processData.push({
      hour: h,
      ch4Concentration: Math.round(ch4Concentration * 10) / 10,
      oxidationRate: Math.round(oxidationRate * 100) / 100,
      biomassGrowth: Math.round(biomassGrowth * 1000) / 1000,
    });
  }

  const speciesDistribution = [
    { name: 'Type I (Gammaproteobacteria)', value: 45 },
    { name: 'Type II (Alphaproteobacteria)', value: 30 },
    { name: 'Type X (Verrucomicrobia)', value: 15 },
    { name: 'ANME (Archaea)', value: 10 },
  ];

  return NextResponse.json({
    organisms,
    processData,
    speciesDistribution,
  });
}
