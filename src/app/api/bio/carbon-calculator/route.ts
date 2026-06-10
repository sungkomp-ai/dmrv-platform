import { NextRequest, NextResponse } from 'next/server';

// ============================================================
// BioCarbon Credit Calculator — Dual Standard (T-VER / IPCC)
// T-VER uses GWP from IPCC AR4: CH₄ = 25, N₂O = 298
// International uses GWP from IPCC AR5: CH₄ = 28, N₂O = 265
// ============================================================

const GWP = {
  tver: { ch4: 25, n2o: 298 },     // IPCC AR4 — TGO/T-VER standard
  ipcc: { ch4: 28, n2o: 265 },      // IPCC AR5 — International standard
};

// Emission factors from T-VER/IPCC methodology
// Negative factor = net reduction (carbon credit)
const EMISSION_FACTORS: Record<string, { factorTver: number; factorIpcc: number; notesTh: string; notesEn: string; unit: string }> = {
  'Methane Oxidation - Biofilter': {
    factorTver: -25,   // 1 ton CH₄ avoided × GWP 25
    factorIpcc: -28,   // 1 ton CH₄ avoided × GWP 28
    notesTh: 'ย่อยสลายมีเทนด้วยไบโอฟิลเตอร์ — ลดการปล่อย CH₄',
    notesEn: 'CH₄ oxidized via biofilter — avoided CH₄ emission',
    unit: 'ton CH₄',
  },
  'Methane Oxidation - Bioreactor': {
    factorTver: -25,
    factorIpcc: -28,
    notesTh: 'ย่อยสลายมีเทนด้วยไบโอรีแอคเตอร์ — ลดการปล่อย CH₄',
    notesEn: 'CH₄ oxidized in bioreactor — avoided CH₄ emission',
    unit: 'ton CH₄',
  },
  'Methane Oxidation - Rice Paddy': {
    factorTver: -25,
    factorIpcc: -28,
    notesTh: 'ย่อยสลายมีเทนในนาข้าวโดย methanotrophs — ลดการปล่อย CH₄',
    notesEn: 'CH₄ oxidized in rice paddies by methanotrophs',
    unit: 'ton CH₄',
  },
  'Microbial CO₂ Capture': {
    factorTver: -1,
    factorIpcc: -1,
    notesTh: 'จับ CO₂ ด้วยจุลินทรีย์ — ลด CO₂ โดยตรง',
    notesEn: 'CO₂ captured by microorganisms — direct CO₂ reduction',
    unit: 'ton CO₂',
  },
  'Microbial CO₂ Capture - Algae': {
    factorTver: -1,
    factorIpcc: -1,
    notesTh: 'จับ CO₂ ด้วยสาหล่า — ผ่านการสังเคราะห์แสง',
    notesEn: 'CO₂ captured by microalgae via photosynthesis',
    unit: 'ton CO₂',
  },
  'Gas Fermentation': {
    factorTver: -0.8,
    factorIpcc: -0.8,
    notesTh: 'หมักก๊าซ CO/CO₂ เป็นผลิตภัณฑ์ — ลดการปล่อยสุทธิ',
    notesEn: 'CO/CO₂ converted to products via gas fermentation',
    unit: 'ton CO₂ equivalent',
  },
  'Biogas from Livestock Waste': {
    factorTver: 0.25,
    factorIpcc: 0.28,
    notesTh: 'การรั่วไหลของ CH₄ จากการผลิตไบโอก๊าซ',
    notesEn: 'Fugitive CH₄ emissions from biogas production',
    unit: 'ton CH₄ produced',
  },
  'Biohydrogen Production': {
    factorTver: 0.1,
    factorIpcc: 0.1,
    notesTh: 'CO₂ จากการหมักแบบไม่ใช้แสง/ใช้แสง',
    notesEn: 'CO₂ from dark/photo fermentation',
    unit: 'ton H₂ produced',
  },
  'Bioethanol Production': {
    factorTver: 0.15,
    factorIpcc: 0.15,
    notesTh: 'CO₂ จากการหมัก (biogenic)',
    notesEn: 'CO₂ from fermentation (biogenic)',
    unit: 'ton ethanol',
  },
  'Bioremediation - Soil': {
    factorTver: 0.5,
    factorIpcc: 0.5,
    notesTh: 'CO₂ จากกระบวนการเมแทบอลิซึมของจุลินทรีย์ในดิน',
    notesEn: 'CO₂ from microbial metabolism in soil',
    unit: 'ton pollutant treated',
  },
  'Bioremediation - Water': {
    factorTver: 0.6,
    factorIpcc: 0.6,
    notesTh: 'CO₂ จากกระบวนการเมแทบอลิซึมในระบบน้ำ',
    notesEn: 'CO₂ from microbial metabolism in aqueous systems',
    unit: 'm³ water treated',
  },
  'Biodegradation - Composting': {
    factorTver: 0.2,
    factorIpcc: 0.2,
    notesTh: 'CO₂ สุทธิจากการย่อยสลายแบบมีออกซิเจน (biogenic)',
    notesEn: 'Net CO₂ from aerobic decomposition (biogenic)',
    unit: 'ton waste composted',
  },
  'Nutrient Recovery': {
    factorTver: 0.05,
    factorIpcc: 0.05,
    notesTh: 'การปล่อยน้อยมากจากกระบวนการกู้คืนสารอาหาร',
    notesEn: 'Minimal emissions from nutrient recovery process',
    unit: 'ton nutrients recovered',
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
  notesTh: string;
  notesEn: string;
  unit: string;
  standard: string;
}

// POST /api/bio/carbon-calculator — Calculate carbon footprint with dual standard
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { entries: CalculatorEntry[]; standard?: 'tver' | 'ipcc' };

    if (!body.entries || !Array.isArray(body.entries)) {
      return NextResponse.json(
        { error: 'Invalid request: "entries" array is required' },
        { status: 400 },
      );
    }

    const standard = body.standard === 'ipcc' ? 'ipcc' : 'tver';
    const results: CalculatorResult[] = [];
    let totalEmissions = 0;
    let totalReductions = 0;
    let totalNet = 0;

    for (const entry of body.entries) {
      const { process, activityData } = entry;

      if (!process || typeof activityData !== 'number') {
        return NextResponse.json(
          { error: 'Each entry must have "process" (string) and "activityData" (number)' },
          { status: 400 },
        );
      }

      const ef = EMISSION_FACTORS[process];
      if (!ef) {
        return NextResponse.json(
          { error: `Unknown process: "${process}". Available processes: ${Object.keys(EMISSION_FACTORS).join(', ')}` },
          { status: 400 },
        );
      }

      const factor = standard === 'ipcc' ? ef.factorIpcc : ef.factorTver;
      const co2e = Math.round(activityData * factor * 100) / 100;
      totalNet += co2e;

      if (co2e < 0) {
        totalReductions += Math.abs(co2e);
      } else {
        totalEmissions += co2e;
      }

      results.push({
        process,
        activityData,
        emissionFactor: factor,
        co2e,
        notesTh: ef.notesTh,
        notesEn: ef.notesEn,
        unit: ef.unit,
        standard: standard === 'tver' ? 'TGO/T-VER (GWP=25, AR4)' : 'International/IPCC (GWP=28, AR5)',
      });
    }

    // Apply T-VER uncertainty deduction if standard is tver
    const uncertaintyDeduction = standard === 'tver' ? 0.10 : 0; // 10% for new projects
    const totalAfterUncertainty = standard === 'tver'
      ? totalNet * (1 - uncertaintyDeduction)
      : totalNet;

    return NextResponse.json({
      results,
      standard: standard === 'tver' ? 'TGO/T-VER (GWP=25, AR4)' : 'International/IPCC (GWP=28, AR5)',
      totalEmissions: Math.round(totalEmissions * 100) / 100,
      totalReductions: Math.round(totalReductions * 100) / 100,
      totalNet: Math.round(totalNet * 100) / 100,
      tverUncertaintyDeduction: standard === 'tver' ? `${(uncertaintyDeduction * 100).toFixed(0)}%` : 'N/A',
      totalAfterUncertainty: Math.round(totalAfterUncertainty * 100) / 100,
      netReduction: totalAfterUncertainty < 0,
      tverCredits: totalAfterUncertainty < 0 ? Math.round(Math.abs(totalAfterUncertainty) * 100) / 100 : 0,
      availableProcesses: Object.keys(EMISSION_FACTORS),
    });
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 },
    );
  }
}

// GET /api/bio/carbon-calculator — List available processes
export async function GET() {
  const processes = Object.entries(EMISSION_FACTORS).map(([key, val]) => ({
    process: key,
    factorTver: val.factorTver,
    factorIpcc: val.factorIpcc,
    notesTh: val.notesTh,
    notesEn: val.notesEn,
    unit: val.unit,
    isReduction: val.factorTver < 0,
  }));

  return NextResponse.json({
    standardInfo: {
      tver: { name: 'TGO/T-VER', gwpCh4: 25, gwpN2o: 298, source: 'IPCC AR4', uncertaintyDeduction: '10% (<2yr), 5% (≥2yr)' },
      ipcc: { name: 'International/IPCC', gwpCh4: 28, gwpN2o: 265, source: 'IPCC AR5', uncertaintyDeduction: 'Project-specific' },
    },
    processes,
    totalProcesses: processes.length,
    reductionProcesses: processes.filter(p => p.isReduction).length,
    emissionProcesses: processes.filter(p => !p.isReduction).length,
  });
}
