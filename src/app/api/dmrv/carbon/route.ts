import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// ─── TGO/T-VER Constants ─────────────────────────────────────────────
const GWP_CH4 = 28;     // IPCC AR5 (ตามประกาศ TGO 2566)
const GWP_N2O = 265;    // IPCC AR5 (ตามประกาศ TGO 2566)
const STOICHIOMETRIC_RATIO = 44 / 12; // 3.667 — CO₂/C molar mass ratio

const TVER_METHODOLOGIES: Record<string, { code: string; name: string; unit: string }> = {
  biochar: {
    code: 'T-VER-P-CC-001',
    name: 'การกักเก็บคาร์บอนผ่านการผลิตไบโอชาร์ (Carbon Capture & Storage through Biochar Production)',
    unit: 'tCO₂e',
  },
  awd: {
    code: 'T-VER-P-AG-001',
    name: 'การลดการปล่อยก๊าซมีเทนจากการปลูกข้าวโดยวิธี AWD (Methane Emission Reduction from Rice Cultivation through AWD)',
    unit: 'tCO₂e',
  },
  biogas: {
    code: 'T-VER-P-EN-001',
    name: 'การผลิตไบโอก๊าซเพื่อผลิตพลังงานทดแทน (Biogas for Renewable Energy)',
    unit: 'tCO₂e',
  },
  solar: {
    code: 'T-VER-P-EN-002',
    name: 'การผลิตไฟฟ้าพลังงานแสงอาทิตย์ (Solar Photovoltaic Electricity Generation)',
    unit: 'tCO₂e',
  },
};

// Carbon quantification formulas (T-VER standards)
interface CarbonCalculationInput {
  methodology: string;
  trackType: string;
  // Biochar inputs (T-VER-P-CC-001)
  mass?: number; // kg
  carbonFraction?: number; // 0-1
  stability?: number; // 0-1 (permanence factor)
  // AWD inputs (T-VER-P-AG-001)
  baseline?: number; // tCO₂e/ha (baseline emission)
  mitigationFactor?: number; // 0-1
  area?: number; // ha
  // Biogas inputs (T-VER-P-EN-001)
  ch4Capture?: number; // tCO₂e
  fuelDisplacement?: number; // tCO₂e
  // Solar inputs (T-VER-P-EN-002)
  kwh?: number; // kWh
  gridEF?: number; // tCO₂e/MWh
  // Project reference
  projectId?: string;
}

function calculateCarbon(input: CarbonCalculationInput & { type?: string }): { tco2e: number; formula: string; breakdown: Record<string, number>; tverMethodology: string } {
  const trackType = input.trackType || input.type || '';

  switch (trackType) {
    case 'biochar': {
      // T-VER-P-CC-001: ER = M_biochar(t) × f_C × f_perm × (44/12)
      const massKg = input.mass ?? 1000;
      const carbonFraction = input.carbonFraction ?? 0.7;
      const stability = input.stability ?? 0.85;
      const massTonnes = massKg / 1000;
      const tco2e = massTonnes * carbonFraction * stability * STOICHIOMETRIC_RATIO;
      return {
        tco2e: Math.round(tco2e * 10000) / 10000,
        formula: 'ER = M_biochar(t) × f_C × f_perm × (44/12)',
        breakdown: { massTonnes, carbonFraction, stability, stoichiometricRatio: STOICHIOMETRIC_RATIO },
        tverMethodology: 'T-VER-P-CC-001',
      };
    }
    case 'awd': {
      // T-VER-P-AG-001: ER = (Baseline - Project) × area
      const baseline = input.baseline ?? 3.5;
      const mitigationFactor = input.mitigationFactor ?? 0.5;
      const area = input.area ?? 1;
      const projectEmission = baseline * (1 - mitigationFactor);
      const tco2e = (baseline - projectEmission) * area;
      return {
        tco2e: Math.round(tco2e * 10000) / 10000,
        formula: 'ER = (BE - PE) × Area = Baseline × MF × Area',
        breakdown: { baseline, projectEmission: Math.round(projectEmission * 100) / 100, mitigationFactor, area, gwpCH4: GWP_CH4 },
        tverMethodology: 'T-VER-P-AG-001',
      };
    }
    case 'biogas': {
      // T-VER-P-EN-001
      const ch4Capture = input.ch4Capture ?? 50;
      const fuelDisplacement = input.fuelDisplacement ?? 20;
      const tco2e = ch4Capture + fuelDisplacement;
      return {
        tco2e: Math.round(tco2e * 10000) / 10000,
        formula: 'ER = CH4_capture + fuel_displacement',
        breakdown: { ch4Capture, fuelDisplacement, gwpCH4: GWP_CH4 },
        tverMethodology: 'T-VER-P-EN-001',
      };
    }
    case 'solar': {
      // T-VER-P-EN-002
      const kwh = input.kwh ?? 500000;
      const gridEF = input.gridEF ?? 0.5;
      const tco2e = (kwh / 1000) * gridEF;
      return {
        tco2e: Math.round(tco2e * 10000) / 10000,
        formula: 'ER = (kWh / 1000) × grid_emission_factor',
        breakdown: { kwh, gridEF },
        tverMethodology: 'T-VER-P-EN-002',
      };
    }
    default:
      return { tco2e: 0, formula: 'Unknown track type', breakdown: {}, tverMethodology: '' };
  }
}

// GET /api/dmrv/carbon — List carbon credits
export async function GET() {
  try {
    const credits = await db.carbonCredit.findMany({
      include: { project: { select: { id: true, name: true, methodology: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const summary = {
      totalCredits: credits.reduce((sum, c) => sum + c.amount, 0),
      available: credits.filter((c) => c.status === 'Available').reduce((sum, c) => sum + c.amount, 0),
      traded: credits.filter((c) => c.status === 'Traded').reduce((sum, c) => sum + c.amount, 0),
      retired: credits.filter((c) => c.status === 'Retired').reduce((sum, c) => sum + c.amount, 0),
    };

    return NextResponse.json({
      credits,
      summary,
      tverMethodologies: TVER_METHODOLOGIES,
      gwpValues: { CH4: GWP_CH4, N2O: GWP_N2O, source: 'IPCC AR5 / TGO 2566' },
    });
  } catch (error) {
    console.error('Error fetching carbon credits:', error);
    return NextResponse.json({ error: 'Failed to fetch carbon credits' }, { status: 500 });
  }
}

// POST /api/dmrv/carbon — Calculate carbon and optionally create credit
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CarbonCalculationInput & { createCredit?: boolean };
    const { projectId, createCredit } = body;

    const calculation = calculateCarbon(body);

    if (createCredit && projectId) {
      const project = await db.project.findUnique({ where: { id: projectId } });
      if (!project) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 });
      }

      const tokenId = `TCO2E-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
      const credit = await db.carbonCredit.create({
        data: {
          tokenId,
          projectId,
          amount: calculation.tco2e,
          status: 'Available',
          metadata: JSON.stringify({
            formula: calculation.formula,
            breakdown: calculation.breakdown,
            trackType: body.trackType,
            tverMethodology: calculation.tverMethodology,
            unit: 'tCO₂e',
          }),
        },
      });

      await db.auditLog.create({
        data: {
          agentName: 'CarbonQuantifier',
          action: 'create_credit',
          projectId,
          details: JSON.stringify({
            tokenId,
            amount: calculation.tco2e,
            trackType: body.trackType,
            tverMethodology: calculation.tverMethodology,
            unit: 'tCO₂e',
          }),
          severity: 'INFO',
        },
      });

      return NextResponse.json({ success: true, calculation, credit }, { status: 201 });
    }

    return NextResponse.json({ success: true, calculation });
  } catch (error) {
    console.error('Carbon calculation error:', error);
    return NextResponse.json({ error: 'Carbon calculation failed', details: String(error) }, { status: 500 });
  }
}
