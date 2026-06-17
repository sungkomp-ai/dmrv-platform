/**
 * GET /api/low-carbon-building/sample
 * ──────────────────────────────────────────────
 * ข้อมูลตัวอย่างสำหรับทดสอบ API
 * ประกอบด้วย:
 * - 5 อาคารตัวอย่าง (จังหวัดต่าง ๆ ในประเทศไทย)
 * - ข้อมูลพลังงานตัวอย่างสำหรับแต่ละอาคาร
 * - ข้อมูลวัสดุก่อสร้างตัวอย่าง
 * - ตัวอย่างผลการคำนวณ
 * - คำสั่ง curl สำหรับทดสอบ
 */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// ═══════════════════════════════════════════════════════════════
// ข้อมูลอาคารตัวอย่าง 5 อาคาร (จังหวัดต่าง ๆ ในไทย)
// ═══════════════════════════════════════════════════════════════

const SAMPLE_BUILDINGS = [
  {
    buildingId: 'BLD-BKK-001',
    name: 'Green Tower Bangkok',
    nameTh: 'กรีนทาวเวอร์ กรุงเทพ',
    province: 'กรุงเทพมหานคร',
    lat: 13.7563,
    lng: 100.5018,
    buildingType: 'OFFICE',
    floors: 25,
    grossFloorArea: 25000,
    yearBuilt: 2019,
    certificationStd: 'TGBI',
    certificationLevel: 'GOLD',
    baselineEUI: 150,
    projectEUI: 95,
    baselineEmission: 1875,
    projectEmission: 1187.5,
    emissionReduction: 687.5,
    renewableEnergyPct: 25,
    waterReductionPct: 35,
    materialSavingsPct: 20,
    greenAreaRatio: 0.25,
    status: 'MONITORING',
    methodology: 'T-VER-BLDG-01',
  },
  {
    buildingId: 'BLD-CHM-002',
    name: 'Chiang Mai Eco Mall',
    nameTh: 'เชียงใหม่อีโคมอลล์',
    province: 'เชียงใหม่',
    lat: 18.7883,
    lng: 98.9853,
    buildingType: 'RETAIL',
    floors: 5,
    grossFloorArea: 18000,
    yearBuilt: 2021,
    certificationStd: 'LEED',
    certificationLevel: 'SILVER',
    baselineEUI: 200,
    projectEUI: 140,
    baselineEmission: 1800,
    projectEmission: 1260,
    emissionReduction: 540,
    renewableEnergyPct: 30,
    waterReductionPct: 25,
    materialSavingsPct: 15,
    greenAreaRatio: 0.2,
    status: 'CERTIFIED',
    methodology: 'T-VER-BLDG-01',
  },
  {
    buildingId: 'BLD-KKN-003',
    name: 'Khon Kaen Smart Hospital',
    nameTh: 'โรงพยาบาลสมาร์ทขอนแก่น',
    province: 'ขอนแก่น',
    lat: 16.4322,
    lng: 102.8236,
    buildingType: 'HOSPITAL',
    floors: 12,
    grossFloorArea: 35000,
    yearBuilt: 2020,
    certificationStd: 'EDGE',
    certificationLevel: 'CERTIFIED',
    baselineEUI: 250,
    projectEUI: 190,
    baselineEmission: 4375,
    projectEmission: 3325,
    emissionReduction: 1050,
    renewableEnergyPct: 15,
    waterReductionPct: 20,
    materialSavingsPct: 10,
    greenAreaRatio: 0.15,
    status: 'MONITORING',
    methodology: 'T-VER-BLDG-01',
  },
  {
    buildingId: 'BLD-PKT-004',
    name: 'Phuket Solar School',
    nameTh: 'โรงเรียนโซลาร์ภูเก็ต',
    province: 'ภูเก็ต',
    lat: 7.8804,
    lng: 98.3923,
    buildingType: 'SCHOOL',
    floors: 4,
    grossFloorArea: 8000,
    yearBuilt: 2022,
    certificationStd: 'TREES',
    certificationLevel: 'PLATINUM',
    baselineEUI: 90,
    projectEUI: 45,
    baselineEmission: 360,
    projectEmission: 180,
    emissionReduction: 180,
    renewableEnergyPct: 60,
    waterReductionPct: 45,
    materialSavingsPct: 30,
    greenAreaRatio: 0.35,
    status: 'CERTIFIED',
    methodology: 'T-VER-BLDG-01',
  },
  {
    buildingId: 'BLD-RYT-005',
    name: 'Rayong Green Residence',
    nameTh: 'กรีนเรสซิเดนซ์ระยอง',
    province: 'ระยอง',
    lat: 12.6809,
    lng: 101.2814,
    buildingType: 'RESIDENTIAL',
    floors: 8,
    grossFloorArea: 12000,
    yearBuilt: 2023,
    certificationStd: 'TGBI',
    certificationLevel: 'CERTIFIED',
    baselineEUI: 80,
    projectEUI: 55,
    baselineEmission: 480,
    projectEmission: 330,
    emissionReduction: 150,
    renewableEnergyPct: 40,
    waterReductionPct: 30,
    materialSavingsPct: 25,
    greenAreaRatio: 0.3,
    status: 'REGISTERED',
    methodology: 'T-VER-BLDG-01',
  },
];

// ═══════════════════════════════════════════════════════════════
// ข้อมูลพลังงานตัวอย่าง
// ═══════════════════════════════════════════════════════════════

const SAMPLE_ENERGY_RECORDS = [
  // BLD-BKK-001 - อาคารสำนักงานกรุงเทพ
  {
    buildingId: 'BLD-BKK-001',
    recordDate: '2025-01-15T08:00:00Z',
    recordType: 'HOURLY',
    electricityKwh: 320,
    hvacKwh: 160,
    lightingKwh: 80,
    equipmentKwh: 80,
    solarGeneration: 45,
    windGeneration: 0,
    gasUsage: 5,
    waterUsage: 12,
    indoorTemp: 24.5,
    indoorHumidity: 55,
    co2Level: 650,
    occupancyRate: 75,
    sourceDevice: 'BMS-BKK-001',
  },
  {
    buildingId: 'BLD-BKK-001',
    recordDate: '2025-01-15T12:00:00Z',
    recordType: 'HOURLY',
    electricityKwh: 380,
    hvacKwh: 190,
    lightingKwh: 75,
    equipmentKwh: 115,
    solarGeneration: 62,
    windGeneration: 0,
    gasUsage: 8,
    waterUsage: 15,
    indoorTemp: 25.0,
    indoorHumidity: 52,
    co2Level: 720,
    occupancyRate: 90,
    sourceDevice: 'BMS-BKK-001',
  },
  {
    buildingId: 'BLD-BKK-001',
    recordDate: '2025-01-15T18:00:00Z',
    recordType: 'HOURLY',
    electricityKwh: 250,
    hvacKwh: 100,
    lightingKwh: 60,
    equipmentKwh: 90,
    solarGeneration: 15,
    windGeneration: 0,
    gasUsage: 3,
    waterUsage: 8,
    indoorTemp: 25.5,
    indoorHumidity: 58,
    co2Level: 550,
    occupancyRate: 50,
    sourceDevice: 'BMS-BKK-001',
  },
  // BLD-CHM-002 - ห้างสรรพสินค้าเชียงใหม่
  {
    buildingId: 'BLD-CHM-002',
    recordDate: '2025-01-15T10:00:00Z',
    recordType: 'HOURLY',
    electricityKwh: 450,
    hvacKwh: 200,
    lightingKwh: 150,
    equipmentKwh: 100,
    solarGeneration: 80,
    windGeneration: 5,
    gasUsage: 10,
    waterUsage: 25,
    indoorTemp: 23.5,
    indoorHumidity: 60,
    co2Level: 800,
    occupancyRate: 65,
    sourceDevice: 'BMS-CHM-002',
  },
  {
    buildingId: 'BLD-CHM-002',
    recordDate: '2025-01-15T14:00:00Z',
    recordType: 'HOURLY',
    electricityKwh: 520,
    hvacKwh: 230,
    lightingKwh: 160,
    equipmentKwh: 130,
    solarGeneration: 95,
    windGeneration: 8,
    gasUsage: 12,
    waterUsage: 30,
    indoorTemp: 24.0,
    indoorHumidity: 57,
    co2Level: 900,
    occupancyRate: 85,
    sourceDevice: 'BMS-CHM-002',
  },
  // BLD-KKN-003 - โรงพยาบาลขอนแก่น
  {
    buildingId: 'BLD-KKN-003',
    recordDate: '2025-01-15T06:00:00Z',
    recordType: 'HOURLY',
    electricityKwh: 680,
    hvacKwh: 300,
    lightingKwh: 180,
    equipmentKwh: 200,
    solarGeneration: 20,
    windGeneration: 0,
    gasUsage: 25,
    waterUsage: 45,
    indoorTemp: 23.0,
    indoorHumidity: 50,
    co2Level: 550,
    occupancyRate: 40,
    sourceDevice: 'BMS-KKN-003',
  },
  {
    buildingId: 'BLD-KKN-003',
    recordDate: '2025-01-15T12:00:00Z',
    recordType: 'HOURLY',
    electricityKwh: 850,
    hvacKwh: 380,
    lightingKwh: 200,
    equipmentKwh: 270,
    solarGeneration: 55,
    windGeneration: 0,
    gasUsage: 30,
    waterUsage: 60,
    indoorTemp: 24.5,
    indoorHumidity: 48,
    co2Level: 700,
    occupancyRate: 80,
    sourceDevice: 'BMS-KKN-003',
  },
  // BLD-PKT-004 - โรงเรียนภูเก็ต
  {
    buildingId: 'BLD-PKT-004',
    recordDate: '2025-01-15T08:00:00Z',
    recordType: 'HOURLY',
    electricityKwh: 90,
    hvacKwh: 40,
    lightingKwh: 25,
    equipmentKwh: 25,
    solarGeneration: 60,
    windGeneration: 10,
    gasUsage: 0,
    waterUsage: 15,
    indoorTemp: 26.0,
    indoorHumidity: 70,
    co2Level: 500,
    occupancyRate: 70,
    sourceDevice: 'BMS-PKT-004',
  },
  // BLD-RYT-005 - อาคารพักอาศัยระยอง
  {
    buildingId: 'BLD-RYT-005',
    recordDate: '2025-01-15T07:00:00Z',
    recordType: 'HOURLY',
    electricityKwh: 55,
    hvacKwh: 25,
    lightingKwh: 10,
    equipmentKwh: 20,
    solarGeneration: 30,
    windGeneration: 5,
    gasUsage: 2,
    waterUsage: 8,
    indoorTemp: 25.0,
    indoorHumidity: 65,
    co2Level: 450,
    occupancyRate: 60,
    sourceDevice: 'BMS-RYT-005',
  },
  {
    buildingId: 'BLD-RYT-005',
    recordDate: '2025-01-15T19:00:00Z',
    recordType: 'HOURLY',
    electricityKwh: 70,
    hvacKwh: 35,
    lightingKwh: 15,
    equipmentKwh: 20,
    solarGeneration: 0,
    windGeneration: 8,
    gasUsage: 5,
    waterUsage: 12,
    indoorTemp: 26.5,
    indoorHumidity: 62,
    co2Level: 600,
    occupancyRate: 85,
    sourceDevice: 'BMS-RYT-005',
  },
];

// ═══════════════════════════════════════════════════════════════
// ข้อมูลวัสดุก่อสร้างตัวอย่าง
// ═══════════════════════════════════════════════════════════════

const SAMPLE_MATERIAL_RECORDS = [
  // BLD-BKK-001 - อาคารสำนักงานกรุงเทพ
  {
    buildingId: 'BLD-BKK-001',
    materialName: 'concrete',
    materialNameTh: 'คอนกรีต',
    category: 'STRUCTURAL',
    quantity: 5000000,
    unit: 'kg',
    carbonFactor: 0.159,
    recycledContent: 15,
    localSource: true,
    supplier: 'SCG Cement จำกัด',
  },
  {
    buildingId: 'BLD-BKK-001',
    materialName: 'steel_rebar',
    materialNameTh: 'เหล็กเสริม',
    category: 'STRUCTURAL',
    quantity: 800000,
    unit: 'kg',
    carbonFactor: 2.41,
    recycledContent: 65,
    localSource: true,
    supplier: 'โรงงานเหล็กสยาม',
  },
  {
    buildingId: 'BLD-BKK-001',
    materialName: 'glass_double_glazing',
    materialNameTh: 'กระจกชั้นคู่',
    category: 'ENVELOPE',
    quantity: 12000,
    unit: 'kg',
    carbonFactor: 2.1,
    recycledContent: 20,
    localSource: false,
    supplier: 'Thai Glass Industries',
  },
  {
    buildingId: 'BLD-BKK-001',
    materialName: 'solar_panel',
    materialNameTh: 'แผงโซลาร์เซลล์',
    category: 'RENEWABLE',
    quantity: 2500,
    unit: 'kg',
    carbonFactor: 43.0,
    recycledContent: 5,
    localSource: false,
    supplier: 'Sungevity Thailand',
  },
  // BLD-CHM-002 - ห้างสรรพสินค้าเชียงใหม่
  {
    buildingId: 'BLD-CHM-002',
    materialName: 'concrete',
    materialNameTh: 'คอนกรีต',
    category: 'STRUCTURAL',
    quantity: 3500000,
    unit: 'kg',
    carbonFactor: 0.159,
    recycledContent: 10,
    localSource: true,
    supplier: 'SCG Cement จำกัด (สาขาเชียงใหม่)',
  },
  {
    buildingId: 'BLD-CHM-002',
    materialName: 'steel_section',
    materialNameTh: 'เหล็กรูปพรรณ',
    category: 'STRUCTURAL',
    quantity: 450000,
    unit: 'kg',
    carbonFactor: 2.72,
    recycledContent: 55,
    localSource: true,
    supplier: 'เหล็กไทย จำกัด',
  },
  // BLD-KKN-003 - โรงพยาบาลขอนแก่น
  {
    buildingId: 'BLD-KKN-003',
    materialName: 'concrete',
    materialNameTh: 'คอนกรีต',
    category: 'STRUCTURAL',
    quantity: 7000000,
    unit: 'kg',
    carbonFactor: 0.159,
    recycledContent: 12,
    localSource: true,
    supplier: 'SCG Cement จำกัด (สาขาขอนแก่น)',
  },
  {
    buildingId: 'BLD-KKN-003',
    materialName: 'hvac_unit',
    materialNameTh: 'เครื่องปรับอากาศ',
    category: 'MEP',
    quantity: 120,
    unit: 'kg',
    carbonFactor: 3.5,
    recycledContent: 10,
    localSource: false,
    supplier: 'Daikin Thailand',
  },
  // BLD-PKT-004 - โรงเรียนภูเก็ต
  {
    buildingId: 'BLD-PKT-004',
    materialName: 'timber',
    materialNameTh: 'ไม้',
    category: 'STRUCTURAL',
    quantity: 50000,
    unit: 'kg',
    carbonFactor: 0.41,
    recycledContent: 0,
    localSource: true,
    supplier: 'ป่าชุมชนภูเก็ต',
  },
  {
    buildingId: 'BLD-PKT-004',
    materialName: 'solar_panel',
    materialNameTh: 'แผงโซลาร์เซลล์',
    category: 'RENEWABLE',
    quantity: 1200,
    unit: 'kg',
    carbonFactor: 43.0,
    recycledContent: 5,
    localSource: false,
    supplier: 'Sungevity Thailand',
  },
  // BLD-RYT-005 - อาคารพักอาศัยระยอง
  {
    buildingId: 'BLD-RYT-005',
    materialName: 'concrete',
    materialNameTh: 'คอนกรีต',
    category: 'STRUCTURAL',
    quantity: 2500000,
    unit: 'kg',
    carbonFactor: 0.159,
    recycledContent: 20,
    localSource: true,
    supplier: 'SCG Cement จำกัด (สาขาระยอง)',
  },
  {
    buildingId: 'BLD-RYT-005',
    materialName: 'insulation_fiberglass',
    materialNameTh: 'ฉนวนไฟเบอร์กลาส',
    category: 'ENVELOPE',
    quantity: 3000,
    unit: 'kg',
    carbonFactor: 1.54,
    recycledContent: 30,
    localSource: false,
    supplier: 'Owens Corning Thailand',
  },
];

// ═══════════════════════════════════════════════════════════════
// คำสั่ง curl สำหรับทดสอบ
// ═══════════════════════════════════════════════════════════════

const CURL_EXAMPLES = {
  // ─── Buildings ─────────────────────────────────────────
  listBuildings: `curl -X GET "http://localhost:3000/api/low-carbon-building/buildings" | jq .`,

  listBuildingsByProvince: `curl -X GET "http://localhost:3000/api/low-carbon-building/buildings?province=กรุงเทพมหานคร" | jq .`,

  listBuildingsByType: `curl -X GET "http://localhost:3000/api/low-carbon-building/buildings?buildingType=OFFICE" | jq .`,

  createBuilding: `curl -X POST "http://localhost:3000/api/low-carbon-building/buildings" \\
  -H "Content-Type: application/json" \\
  -d '{
    "buildingId": "BLD-TEST-001",
    "name": "Test Green Building",
    "nameTh": "อาคารเขียวทดสอบ",
    "province": "นนทบุรี",
    "lat": 13.8621,
    "lng": 100.5144,
    "buildingType": "OFFICE",
    "floors": 10,
    "grossFloorArea": 8000,
    "yearBuilt": 2024,
    "certificationStd": "TGBI",
    "certificationLevel": "SILVER",
    "baselineEUI": 150,
    "projectEUI": 100,
    "renewableEnergyPct": 20,
    "waterReductionPct": 30,
    "greenAreaRatio": 0.2
  }' | jq .`,

  // ─── Energy Records ───────────────────────────────────
  listEnergyRecords: `curl -X GET "http://localhost:3000/api/low-carbon-building/energy" | jq .`,

  listEnergyByBuilding: `curl -X GET "http://localhost:3000/api/low-carbon-building/energy?buildingId=BLD-BKK-001" | jq .`,

  listEnergyByDateRange: `curl -X GET "http://localhost:3000/api/low-carbon-building/energy?buildingId=BLD-BKK-001&startDate=2025-01-01&endDate=2025-01-31" | jq .`,

  createEnergyRecord: `curl -X POST "http://localhost:3000/api/low-carbon-building/energy" \\
  -H "Content-Type: application/json" \\
  -d '{
    "buildingId": "BLD-BKK-001",
    "recordDate": "2025-06-15T10:00:00Z",
    "recordType": "HOURLY",
    "electricityKwh": 350,
    "hvacKwh": 170,
    "lightingKwh": 85,
    "equipmentKwh": 95,
    "solarGeneration": 50,
    "windGeneration": 0,
    "gasUsage": 6,
    "waterUsage": 14,
    "indoorTemp": 24.8,
    "indoorHumidity": 53,
    "co2Level": 680,
    "occupancyRate": 80,
    "sourceDevice": "BMS-TEST-001"
  }' | jq .`,

  // ─── Materials ────────────────────────────────────────
  listMaterials: `curl -X GET "http://localhost:3000/api/low-carbon-building/materials" | jq .`,

  listMaterialsByBuilding: `curl -X GET "http://localhost:3000/api/low-carbon-building/materials?buildingId=BLD-BKK-001" | jq .`,

  listMaterialsByCategory: `curl -X GET "http://localhost:3000/api/low-carbon-building/materials?category=STRUCTURAL" | jq .`,

  createMaterial: `curl -X POST "http://localhost:3000/api/low-carbon-building/materials" \\
  -H "Content-Type: application/json" \\
  -d '{
    "buildingId": "BLD-BKK-001",
    "materialName": "cement",
    "materialNameTh": "ปูนซีเมนต์",
    "category": "STRUCTURAL",
    "quantity": 100000,
    "unit": "kg",
    "carbonFactor": 0.91,
    "recycledContent": 5,
    "localSource": true,
    "supplier": "SCG Cement"
  }' | jq .`,

  // ─── Calculate ────────────────────────────────────────
  calculateCredits: `curl -X POST "http://localhost:3000/api/low-carbon-building/calculate" \\
  -H "Content-Type: application/json" \\
  -d '{
    "buildingId": "BLD-BKK-001",
    "monitoringStartDate": "2025-01-01",
    "monitoringEndDate": "2025-01-31"
  }' | jq .`,

  // ─── Ingest (Bulk) ───────────────────────────────────
  bulkIngest: `curl -X POST "http://localhost:3000/api/low-carbon-building/ingest" \\
  -H "Content-Type: application/json" \\
  -d '{
    "readings": [
      {
        "buildingId": "BLD-BKK-001",
        "recordDate": "2025-06-16T08:00:00Z",
        "recordType": "HOURLY",
        "electricityKwh": 300,
        "hvacKwh": 150,
        "lightingKwh": 75,
        "equipmentKwh": 75,
        "solarGeneration": 40,
        "gasUsage": 4,
        "indoorTemp": 24.0,
        "indoorHumidity": 55,
        "co2Level": 600,
        "occupancyRate": 70
      },
      {
        "buildingId": "BLD-BKK-001",
        "recordDate": "2025-06-16T09:00:00Z",
        "recordType": "HOURLY",
        "electricityKwh": 310,
        "hvacKwh": 155,
        "lightingKwh": 78,
        "equipmentKwh": 77,
        "solarGeneration": 48,
        "gasUsage": 5,
        "indoorTemp": 24.3,
        "indoorHumidity": 54,
        "co2Level": 630,
        "occupancyRate": 75
      }
    ]
  }' | jq .`,

  // ─── Sample Data ─────────────────────────────────────
  getSampleData: `curl -X GET "http://localhost:3000/api/low-carbon-building/sample" | jq .`,

  seedDatabase: `curl -X GET "http://localhost:3000/api/low-carbon-building/sample?seed=true" | jq .`,
};

/**
 * GET /api/low-carbon-building/sample
 * ข้อมูลตัวอย่างสำหรับทดสอบ API
 * ใส่ ?seed=true เพื่อนำเข้าข้อมูลตัวอย่างลงฐานข้อมูลจริง
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const shouldSeed = searchParams.get('seed') === 'true';

    // ถ้าต้องการนำเข้าข้อมูลจริง
    if (shouldSeed) {
      const seedResult = await seedDatabase();
      return NextResponse.json({
        success: true,
        message: 'นำเข้าข้อมูลตัวอย่างสำเร็จ',
        seedResult,
      });
    }

    // คืนค่าข้อมูลตัวอย่างโดยไม่นำเข้าฐานข้อมูล
    return NextResponse.json({
      success: true,
      message: 'ข้อมูลตัวอย่างสำหรับทดสอบ API อาคารคาร์บอนต่ำ',
      usage: 'เพิ่ม ?seed=true เพื่อนำเข้าข้อมูลตัวอย่างลงฐานข้อมูลจริง',
      sampleData: {
        buildings: SAMPLE_BUILDINGS,
        energyRecords: SAMPLE_ENERGY_RECORDS,
        materialRecords: SAMPLE_MATERIAL_RECORDS,
      },
      sampleCalculation: {
        buildingId: 'BLD-BKK-001',
        methodology: 'T-VER-BLDG-01',
        description: 'ตัวอย่างผลการคำนวณเครดิตคาร์บอน',
        inputs: {
          baselineEUI: 150,
          projectEUI: 95,
          grossFloorArea: 25000,
          thailandGridEF: 0.5,
        },
        calculations: {
          baselineEmission: {
            value: 1875,
            unit: 'tCO2e/ปี',
            formula: '150 kWh/m²/ปี × 25,000 m² × 0.5 kgCO2/kWh / 1000 = 1,875 tCO2e',
          },
          projectEmission: {
            value: 1187.5,
            unit: 'tCO2e/ปี',
            formula: '95 kWh/m²/ปี × 25,000 m² × 0.5 kgCO2/kWh / 1000 = 1,187.5 tCO2e',
          },
          emissionReduction: {
            value: 687.5,
            unit: 'tCO2e/ปี',
            formula: '1,875 - 1,187.5 = 687.5 tCO2e',
          },
          bufferDeduction: {
            value: 103.125,
            unit: 'tCO2e',
            formula: '687.5 × 15% = 103.125 tCO2e (Buffer ตาม T-VER-BLDG-01)',
          },
          netCredits: {
            value: 584.375,
            unit: 'เครดิต (tCO2e)',
            formula: '687.5 - 103.125 = 584.375 เครดิต',
          },
          euiImprovement: {
            absolute: 55,
            percentage: 36.67,
            formula: '(150 - 95) / 150 × 100 = 36.67%',
          },
        },
      },
      curlExamples: CURL_EXAMPLES,
      apiEndpoints: {
        buildings: {
          GET: '/api/low-carbon-building/buildings - ดึงรายการอาคาร',
          POST: '/api/low-carbon-building/buildings - สร้างอาคารใหม่',
        },
        energy: {
          GET: '/api/low-carbon-building/energy - ดึงข้อมูลพลังงาน (ตัวกรอง: buildingId, recordType, startDate, endDate, qualityFlag)',
          POST: '/api/low-carbon-building/energy - สร้างบันทึกพลังงาน (คำนวณ EUI, carbon, hash อัตโนมัติ)',
        },
        materials: {
          GET: '/api/low-carbon-building/materials - ดึงข้อมูลวัสดุ (ตัวกรอง: buildingId, category)',
          POST: '/api/low-carbon-building/materials - สร้างบันทึกวัสดุ (คำนวณ embodied carbon อัตโนมัติ)',
        },
        calculate: {
          POST: '/api/low-carbon-building/calculate - คำนวณเครดิตคาร์บอนตาม T-VER-BLDG-01',
        },
        ingest: {
          POST: '/api/low-carbon-building/ingest - นำเข้าข้อมูลพลังงานแบบกลุ่ม (batch)',
        },
        sample: {
          GET: '/api/low-carbon-building/sample - ข้อมูลตัวอย่าง (?seed=true เพื่อนำเข้าฐานข้อมูล)',
        },
      },
    });
  } catch (error: any) {
    console.error('❌ ดึงข้อมูลตัวอย่างล้มเหลว:', error);
    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาด', detail: error.message },
      { status: 500 }
    );
  }
}

/**
 * นำเข้าข้อมูลตัวอย่างลงฐานข้อมูลจริง
 */
async function seedDatabase() {
  const result = {
    buildings: { created: 0, skipped: 0, errors: [] as string[] },
    energyRecords: { created: 0, skipped: 0, errors: [] as string[] },
    materialRecords: { created: 0, skipped: 0, errors: [] as string[] },
  };

  // 1. นำเข้าอาคาร
  for (const buildingData of SAMPLE_BUILDINGS) {
    try {
      const existing = await db.lowCarbonBuilding.findUnique({
        where: { buildingId: buildingData.buildingId },
      });
      if (existing) {
        result.buildings.skipped++;
        continue;
      }
      await db.lowCarbonBuilding.create({ data: buildingData });
      result.buildings.created++;
    } catch (err: any) {
      result.buildings.errors.push(`${buildingData.buildingId}: ${err.message}`);
    }
  }

  // 2. นำเข้าข้อมูลพลังงาน
  for (const energyData of SAMPLE_ENERGY_RECORDS) {
    try {
      const building = await db.lowCarbonBuilding.findUnique({
        where: { buildingId: energyData.buildingId },
      });
      if (!building) {
        result.energyRecords.skipped++;
        continue;
      }

      // คำนวณค่าต่าง ๆ
      const totalEnergy = energyData.electricityKwh + energyData.hvacKwh + energyData.lightingKwh + energyData.equipmentKwh;
      const eui = building.grossFloorArea > 0 ? Math.round((totalEnergy / building.grossFloorArea) * 1000) / 1000 : 0;
      const carbonEmission = Math.round(
        ((energyData.electricityKwh * 0.5 + energyData.gasUsage * 2.0 - energyData.solarGeneration * 0.5 - energyData.windGeneration * 0.5) / 1000) * 10000
      ) / 10000;

      // กำหนด quality flag
      let qualityFlag = 'VALIDATED';
      if (energyData.indoorTemp > 50 || energyData.indoorTemp < 5) qualityFlag = 'ANOMALY';
      if (energyData.indoorHumidity > 100 || energyData.indoorHumidity < 0) qualityFlag = 'ANOMALY';
      if (totalEnergy === 0) qualityFlag = 'REJECTED';

      // คำนวณ hash
      const crypto = await import('crypto');
      const integrityHash = crypto.createHash('sha256')
        .update(JSON.stringify({
          buildingId: energyData.buildingId,
          recordDate: new Date(energyData.recordDate).toISOString(),
          electricityKwh: energyData.electricityKwh,
          gasUsage: energyData.gasUsage,
          solarGeneration: energyData.solarGeneration,
          windGeneration: energyData.windGeneration,
        }))
        .digest('hex');

      await db.buildingEnergyRecord.create({
        data: {
          ...energyData,
          recordDate: new Date(energyData.recordDate),
          eui,
          carbonEmission,
          ingestionMode: 'batch',
          qualityFlag,
          integrityHash,
        },
      });
      result.energyRecords.created++;
    } catch (err: any) {
      result.energyRecords.errors.push(`${energyData.buildingId}: ${err.message}`);
    }
  }

  // 3. นำเข้าข้อมูลวัสดุ
  for (const materialData of SAMPLE_MATERIAL_RECORDS) {
    try {
      const building = await db.lowCarbonBuilding.findUnique({
        where: { buildingId: materialData.buildingId },
      });
      if (!building) {
        result.materialRecords.skipped++;
        continue;
      }

      const embodiedCarbon = Math.round(materialData.quantity * materialData.carbonFactor * 100) / 100;

      await db.buildingMaterialRecord.create({
        data: {
          ...materialData,
          embodiedCarbon,
        },
      });
      result.materialRecords.created++;
    } catch (err: any) {
      result.materialRecords.errors.push(`${materialData.buildingId}: ${err.message}`);
    }
  }

  return result;
}
