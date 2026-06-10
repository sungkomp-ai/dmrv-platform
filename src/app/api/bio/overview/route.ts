import { NextResponse } from 'next/server';

// GET /api/bio/overview — Dashboard overview statistics
export async function GET() {
  const trendData = [
    { month: 'Jan', co2: 980, ch4: 720, biofuel: 450 },
    { month: 'Feb', co2: 1050, ch4: 780, biofuel: 480 },
    { month: 'Mar', co2: 1120, ch4: 830, biofuel: 510 },
    { month: 'Apr', co2: 1080, ch4: 790, biofuel: 490 },
    { month: 'May', co2: 1200, ch4: 870, biofuel: 530 },
    { month: 'Jun', co2: 1150, ch4: 850, biofuel: 520 },
    { month: 'Jul', co2: 1280, ch4: 920, biofuel: 560 },
    { month: 'Aug', co2: 1320, ch4: 950, biofuel: 580 },
    { month: 'Sep', co2: 1180, ch4: 860, biofuel: 510 },
    { month: 'Oct', co2: 1090, ch4: 800, biofuel: 470 },
    { month: 'Nov', co2: 1020, ch4: 750, biofuel: 440 },
    { month: 'Dec', co2: 988, ch4: 703, biofuel: 458 },
  ];

  return NextResponse.json({
    totalCo2Reduction: 12458.7,
    ch4Oxidized: 8923.4,
    microorganismTypes: 47,
    activeBioreactors: 12,
    carbonCreditsGenerated: 3421,
    biofuelProduced: 5678.9,
    trendData,
  });
}
