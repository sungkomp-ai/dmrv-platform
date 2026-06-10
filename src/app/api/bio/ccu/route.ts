import { NextResponse } from 'next/server';

// GET /api/bio/ccu — Microbial CO₂ Capture and Utilization data
export async function GET() {
  const processes = [
    {
      id: 1,
      name: 'Microbial CO₂ Capture',
      microorganisms: ['Acetogens (Clostridium spp.)', 'Cyanobacteria', 'Microalgae'],
      input: 'CO₂ from flue gas',
      products: ['Acetic acid', 'Lactic acid', 'Bioethanol', 'Biopolymers (PHA, PLA)'],
      efficiency: 78,
      co2Captured: 2340,
      scale: 'Pilot',
    },
    {
      id: 2,
      name: 'Algae Biofuel Production',
      microorganisms: ['Chlorella vulgaris', 'Spirulina platensis', 'Nannochloropsis sp.'],
      input: 'CO₂ + Sunlight',
      products: ['Biodiesel', 'Bioethanol', 'Biogas', 'Bioplastics'],
      efficiency: 65,
      co2Captured: 1870,
      scale: 'Commercial',
    },
    {
      id: 3,
      name: 'Electro-microbial Conversion',
      microorganisms: ['Sporomusa ovata', 'Clostridium ljungdahlii', 'Moorella thermoacetica'],
      input: 'CO₂ + Renewable electricity',
      products: ['Acetate', 'Ethanol', 'Butanol', 'Bioplastics'],
      efficiency: 52,
      co2Captured: 890,
      scale: 'Laboratory',
    },
    {
      id: 4,
      name: 'Cyanobacterial Bioplastics',
      microorganisms: ['Synechocystis sp. PCC 6803', 'Synechococcus elongatus', 'Nostoc sp.'],
      input: 'CO₂ + Sunlight',
      products: ['PHA', 'PHB', 'Bioethylene', 'Bioisoprene'],
      efficiency: 44,
      co2Captured: 520,
      scale: 'Pilot',
    },
    {
      id: 5,
      name: 'Microbial Mineralization',
      microorganisms: ['Bacillus pasteurii', 'Sporosarcina pasteurii', 'Pseudomonas aeruginosa'],
      input: 'CO₂ + Calcium source',
      products: ['Calcium carbonate (CaCO₃)', 'Building materials', 'Self-healing concrete'],
      efficiency: 85,
      co2Captured: 3120,
      scale: 'Pilot',
    },
    {
      id: 6,
      name: 'Formate-based Bioprocessing',
      microorganisms: ['Cupriavidus necator', 'Escherichia coli (engineered)', 'Methylobacterium extorquens'],
      input: 'CO₂ + H₂ (from electrolysis)',
      products: ['Protein feed', 'Bioplastics (PHB)', 'Oleochemicals', 'Organic acids'],
      efficiency: 60,
      co2Captured: 1450,
      scale: 'Demonstration',
    },
  ];

  // 12-month capture trend
  const captureTrend = [
    { month: 'Jan', co2Captured: 450, biofuelProduced: 180, bioplasticProduced: 45 },
    { month: 'Feb', co2Captured: 480, biofuelProduced: 195, bioplasticProduced: 52 },
    { month: 'Mar', co2Captured: 520, biofuelProduced: 210, bioplasticProduced: 58 },
    { month: 'Apr', co2Captured: 560, biofuelProduced: 230, bioplasticProduced: 65 },
    { month: 'May', co2Captured: 610, biofuelProduced: 250, bioplasticProduced: 72 },
    { month: 'Jun', co2Captured: 650, biofuelProduced: 265, bioplasticProduced: 78 },
    { month: 'Jul', co2Captured: 680, biofuelProduced: 275, bioplasticProduced: 82 },
    { month: 'Aug', co2Captured: 670, biofuelProduced: 270, bioplasticProduced: 80 },
    { month: 'Sep', co2Captured: 620, biofuelProduced: 255, bioplasticProduced: 70 },
    { month: 'Oct', co2Captured: 570, biofuelProduced: 235, bioplasticProduced: 62 },
    { month: 'Nov', co2Captured: 510, biofuelProduced: 205, bioplasticProduced: 55 },
    { month: 'Dec', co2Captured: 470, biofuelProduced: 190, bioplasticProduced: 48 },
  ];

  return NextResponse.json({
    processes,
    captureTrend,
  });
}
