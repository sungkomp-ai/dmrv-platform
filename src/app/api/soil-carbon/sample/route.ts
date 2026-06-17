/**
 * GET /api/soil-carbon/sample
 * ──────────────────────────────────────────────
 * ส่งข้อมูลตัวอย่าง/ข้อมูลเริ่มต้นสำหรับทดสอบ API
 * รองรับพื้นที่ลาดชัน/ขั้นบันไดบนภูเขา (Terraced Farming / Sediment Trap)
 * รองรับหญ้าแฝกบนคันขอบ (Vetiver Grass Ridge) และการเปลี่ยนผ่านจากไร่เลื่อนลอย
 *
 * ข้อมูลตัวอย่าง 8 แปลงบนพื้นที่ลาดชัน:
 * 1. SOIL-CMD-001: เชียงใหม่ — นาขั้นบันไดข้าวอินทรีย์ (850 ม.รทก., 25°, 5 ชั้น, 5 ฝาย)
 * 2. SOIL-KKN-002: ขอนแก่น — ไร่มันสำปะหลังขั้นบันได (280 ม.รทก., 18°, 4 ชั้น)
 * 3. SOIL-SPB-003: สุพรรณบุรี — สวนผลไม้ลาดชัน (120 ม.รทก., 15°, 3 ชั้น)
 * 4. SOIL-SRN-004: สุรินทร์ — ปลูกข้าวกักตะกอนดิน (180 ม.รทก., 20°, 4 ชั้น)
 * 5. SOIL-PKT-005: ภูเก็ต — วนเกษตรยางพาราลาดชัน (95 ม.รทก., 22°, 3 ชั้น)
 * 6. SOIL-NNN-006: น่าน — สวนกาแฟขั้นบันได (เดิมไร่เลื่อนลอย) (680 ม.รทก., 30°, 6 ชั้น)
 * 7. SOIL-NNN-007: น่าน — สวนมะคาเดเมียขั้นบันได (เดิมไร่เลื่อนลอย) (720 ม.รทก., 28°, 5 ชั้น)
 * 8. SOIL-NNN-008: น่าน — สวนกาแฟอาราบิก้าขั้นบันได (เดิมไร่เลื่อนลอย) (1050 ม.รทก., 35°, 7 ชั้น)
 *
 * มิติขั้นบันได (แก้ไขแล้ว):
 * - คันขอบปลูกหญ้าแฝก (Vetiver Grass Ridge): 0.7-1.0 เมตร
 * - พื้นที่ปลูกพืชหลัก (Main Crop Planting Area): 1.5-2.0 เมตร
 * - ความกว้างรวมต่อชั้น (Total Terrace Width): 2.0-2.7 เมตร
 *
 * เมื่อ ?seed=true จะสร้างแปลง ชั้นปลูก ฝาย และข้อมูลการวัดพร้อมตะกอนดิน
 */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// ─── ข้อมูลแปลงตัวอย่าง 8 แปลง (พื้นที่ลาดชัน/ขั้นบันได + หญ้าแฝก) ───
const SAMPLE_PLOTS = [
  {
    plotId: 'SOIL-CMD-001',
    name: 'Chiang Mai Terraced Organic Rice',
    nameTh: 'นาขั้นบันไดข้าวอินทรีย์ เชียงใหม่',
    province: 'เชียงใหม่',
    lat: 18.7883,
    lng: 98.9853,
    altitudeMasl: 850,
    slopeDegree: 25,
    slopeAspect: 'NE',
    areaRai: 25,
    areaHa: 4.0,
    terraceCount: 5,
    terraceWidthM: 2.5,
    plantingAreaWidthM: 1.7,
    ridgeWidthMPlot: 0.8,
    terraceHeightM: 1.8,
    checkDamCount: 5,
    checkDamType: 'STONE',
    landUseType: 'terraced_farming',
    previousLandUse: 'conventional',
    vetiverGrassCoveragePct: 85,
    soilType: 'Clay Loam',
    cropType: 'Rice',
    practiceType: 'sediment_trap',
    baselineSOC: 28.5,
    projectSOC: 35.2,
    baselineSediment: 18.5,
    projectSediment: 4.2,
    sedimentTrapRate: 22.7,
    baselineEmission: 4.8,
    projectEmission: 2.1,
    monitoringYear: 2,
    status: 'MONITORING',
    methodology: 'T-VER-SOIL-01',
  },
  {
    plotId: 'SOIL-KKN-002',
    name: 'Khon Kaen Terraced Cassava',
    nameTh: 'ไร่มันสำปะหลังขั้นบันได ขอนแก่น',
    province: 'ขอนแก่น',
    lat: 16.4322,
    lng: 102.8236,
    altitudeMasl: 280,
    slopeDegree: 18,
    slopeAspect: 'SE',
    areaRai: 50,
    areaHa: 8.0,
    terraceCount: 4,
    terraceWidthM: 2.7,
    plantingAreaWidthM: 1.9,
    ridgeWidthMPlot: 0.8,
    terraceHeightM: 1.5,
    checkDamCount: 3,
    checkDamType: 'CONCRETE',
    landUseType: 'terraced_farming',
    previousLandUse: 'conventional',
    vetiverGrassCoveragePct: 80,
    soilType: 'Sandy Loam',
    cropType: 'Cassava',
    practiceType: 'sediment_trap',
    baselineSOC: 18.2,
    projectSOC: 24.8,
    baselineSediment: 22.0,
    projectSediment: 6.5,
    sedimentTrapRate: 29.5,
    baselineEmission: 6.5,
    projectEmission: 3.2,
    monitoringYear: 3,
    status: 'VERIFIED',
    methodology: 'T-VER-SOIL-01',
  },
  {
    plotId: 'SOIL-SPB-003',
    name: 'Suphanburi Sloping Fruit Orchard',
    nameTh: 'สวนผลไม้ลาดชัน สุพรรณบุรี',
    province: 'สุพรรณบุรี',
    lat: 14.4746,
    lng: 100.1182,
    altitudeMasl: 120,
    slopeDegree: 15,
    slopeAspect: 'S',
    areaRai: 100,
    areaHa: 16.0,
    terraceCount: 3,
    terraceWidthM: 2.5,
    plantingAreaWidthM: 1.8,
    ridgeWidthMPlot: 0.7,
    terraceHeightM: 1.2,
    checkDamCount: 2,
    checkDamType: 'GABION',
    landUseType: 'terraced_farming',
    previousLandUse: 'conventional',
    vetiverGrassCoveragePct: 90,
    soilType: 'Clay',
    cropType: 'Fruit trees',
    practiceType: 'contour_planting',
    baselineSOC: 22.1,
    projectSOC: 32.5,
    baselineSediment: 14.0,
    projectSediment: 5.0,
    sedimentTrapRate: 35.7,
    baselineEmission: 8.2,
    projectEmission: 3.8,
    monitoringYear: 1,
    status: 'MONITORING',
    methodology: 'T-VER-SOIL-01',
  },
  {
    plotId: 'SOIL-SRN-004',
    name: 'Surin Sediment Trap Rice',
    nameTh: 'ปลูกข้าวกักตะกอนดิน สุรินทร์',
    province: 'สุรินทร์',
    lat: 14.8818,
    lng: 103.4937,
    altitudeMasl: 180,
    slopeDegree: 20,
    slopeAspect: 'SW',
    areaRai: 30,
    areaHa: 4.8,
    terraceCount: 4,
    terraceWidthM: 2.2,
    plantingAreaWidthM: 1.5,
    ridgeWidthMPlot: 0.7,
    terraceHeightM: 1.6,
    checkDamCount: 4,
    checkDamType: 'LOG',
    landUseType: 'terraced_farming',
    previousLandUse: 'conventional',
    vetiverGrassCoveragePct: 85,
    soilType: 'Loam',
    cropType: 'Rice',
    practiceType: 'sediment_trap',
    baselineSOC: 25.3,
    projectSOC: 29.8,
    baselineSediment: 20.0,
    projectSediment: 5.5,
    sedimentTrapRate: 27.5,
    baselineEmission: 5.6,
    projectEmission: 2.4,
    monitoringYear: 2,
    status: 'REGISTERED',
    methodology: 'T-VER-SOIL-01',
  },
  {
    plotId: 'SOIL-PKT-005',
    name: 'Phuket Sloping Agroforestry Rubber',
    nameTh: 'วนเกษตรยางพาราลาดชัน ภูเก็ต',
    province: 'ภูเก็ต',
    lat: 7.8804,
    lng: 98.3923,
    altitudeMasl: 95,
    slopeDegree: 22,
    slopeAspect: 'W',
    areaRai: 40,
    areaHa: 6.4,
    terraceCount: 3,
    terraceWidthM: 2.5,
    plantingAreaWidthM: 1.7,
    ridgeWidthMPlot: 0.8,
    terraceHeightM: 1.4,
    checkDamCount: 3,
    checkDamType: 'VEGETATION',
    landUseType: 'agroforestry',
    previousLandUse: 'degraded_forest',
    vetiverGrassCoveragePct: 100,
    soilType: 'Sandy Clay Loam',
    cropType: 'Rubber',
    practiceType: 'agroforestry',
    baselineSOC: 32.5,
    projectSOC: 42.1,
    baselineSediment: 16.0,
    projectSediment: 3.8,
    sedimentTrapRate: 23.8,
    baselineEmission: 3.2,
    projectEmission: 1.5,
    monitoringYear: 4,
    status: 'CERTIFIED',
    methodology: 'T-VER-SOIL-01',
  },
  // ─── แปลงจังหวัดน่าน (เดิมไร่เลื่อนลอย → เกษตรกักตะกอนดิน) ───
  {
    plotId: 'SOIL-NNN-006',
    name: 'Nan Coffee Terraced Farm (Former Slash-and-Burn)',
    nameTh: 'สวนกาแฟขั้นบันได อ.ท่าวังผา จ.น่าน (เดิมไร่เลื่อนลอย)',
    province: 'น่าน',
    lat: 19.1056,
    lng: 100.8028,
    altitudeMasl: 680,
    slopeDegree: 30,
    slopeAspect: 'SW',
    areaRai: 20,
    areaHa: 3.2,
    terraceCount: 6,
    terraceWidthM: 2.5,
    plantingAreaWidthM: 1.7,
    ridgeWidthMPlot: 0.8,
    terraceHeightM: 1.5,
    checkDamCount: 6,
    checkDamType: 'STONE',
    landUseType: 'terraced_farming',
    previousLandUse: 'slash_and_burn',
    vetiverGrassCoveragePct: 95,
    soilType: 'Sandy Clay Loam',
    cropType: 'Coffee',
    practiceType: 'sediment_trap',
    baselineSOC: 15.2,
    projectSOC: 24.8,
    baselineSediment: 28.0,
    projectSediment: 5.5,
    sedimentTrapRate: 80.4,
    baselineEmission: 8.5,
    projectEmission: 2.8,
    monitoringYear: 2,
    status: 'MONITORING',
    methodology: 'T-VER-SOIL-01',
  },
  {
    plotId: 'SOIL-NNN-007',
    name: 'Nan Macadamia Terraced Farm (Former Slash-and-Burn)',
    nameTh: 'สวนมะคาเดเมียขั้นบันได อ.ปัว จ.น่าน (เดิมไร่เลื่อนลอย)',
    province: 'น่าน',
    lat: 19.2189,
    lng: 100.7314,
    altitudeMasl: 720,
    slopeDegree: 28,
    slopeAspect: 'SE',
    areaRai: 30,
    areaHa: 4.8,
    terraceCount: 5,
    terraceWidthM: 2.7,
    plantingAreaWidthM: 1.9,
    ridgeWidthMPlot: 0.8,
    terraceHeightM: 1.6,
    checkDamCount: 5,
    checkDamType: 'GABION',
    landUseType: 'terraced_farming',
    previousLandUse: 'slash_and_burn',
    vetiverGrassCoveragePct: 90,
    soilType: 'Clay Loam',
    cropType: 'Macadamia',
    practiceType: 'sediment_trap',
    baselineSOC: 16.8,
    projectSOC: 27.5,
    baselineSediment: 25.0,
    projectSediment: 4.8,
    sedimentTrapRate: 80.8,
    baselineEmission: 7.8,
    projectEmission: 2.2,
    monitoringYear: 3,
    status: 'VERIFIED',
    methodology: 'T-VER-SOIL-01',
  },
  {
    plotId: 'SOIL-NNN-008',
    name: 'Nan Arabica Coffee High Altitude (Former Slash-and-Burn)',
    nameTh: 'สวนกาแฟอาราบิก้าขั้นบันได อ.เฉลิมพระเกียรติ จ.น่าน (เดิมไร่เลื่อนลอย)',
    province: 'น่าน',
    lat: 18.9567,
    lng: 100.6542,
    altitudeMasl: 1050,
    slopeDegree: 35,
    slopeAspect: 'NE',
    areaRai: 15,
    areaHa: 2.4,
    terraceCount: 7,
    terraceWidthM: 2.2,
    plantingAreaWidthM: 1.5,
    ridgeWidthMPlot: 0.7,
    terraceHeightM: 1.3,
    checkDamCount: 7,
    checkDamType: 'STONE',
    landUseType: 'terraced_farming',
    previousLandUse: 'slash_and_burn',
    vetiverGrassCoveragePct: 100,
    soilType: 'Loam',
    cropType: 'Arabica Coffee',
    practiceType: 'sediment_trap',
    baselineSOC: 13.5,
    projectSOC: 22.2,
    baselineSediment: 32.0,
    projectSediment: 6.2,
    sedimentTrapRate: 80.6,
    baselineEmission: 9.2,
    projectEmission: 3.1,
    monitoringYear: 1,
    status: 'REGISTERED',
    methodology: 'T-VER-SOIL-01',
  },
];

// ─── ข้อมูลชั้นปลูกสำหรับแต่ละแปลง (พร้อมข้อมูลหญ้าแฝก) ───
const SAMPLE_TERRACES: Record<string, Array<{
  layerNumber: number;
  layerNameTh: string;
  elevationMasl: number;
  sedimentTrappedKg: number;
  organicCarbonPct: number;
  sedimentDepthCm: number;
  waterFlowInLMin: number;
  waterFlowOutLMin: number;
  ridgeWidthM: number;
  plantingAreaWidthM: number;
  vetiverGrassStatus: string;
  vetiverRootDepthCm: number;
  vetiverPlantDensity: number;
  vetiverErosionPreventionPct: number;
  vetiverSedimentAccumulationKg: number;
  vetiverCarbonSequestrationKg: number;
}>> = {
  'SOIL-CMD-001': [
    { layerNumber: 1, layerNameTh: 'ชั้นปลูกที่ 1 (ข้าวหอมมะลิ)', elevationMasl: 850, sedimentTrappedKg: 320, organicCarbonPct: 2.8, sedimentDepthCm: 5.2, waterFlowInLMin: 15.0, waterFlowOutLMin: 8.5, ridgeWidthM: 0.8, plantingAreaWidthM: 1.7, vetiverGrassStatus: 'ESTABLISHED', vetiverRootDepthCm: 240, vetiverPlantDensity: 7, vetiverErosionPreventionPct: 78, vetiverSedimentAccumulationKg: 72, vetiverCarbonSequestrationKg: 3.2 },
    { layerNumber: 2, layerNameTh: 'ชั้นปลูกที่ 2 (ข้าวเหนียว)', elevationMasl: 848.2, sedimentTrappedKg: 285, organicCarbonPct: 2.5, sedimentDepthCm: 4.8, waterFlowInLMin: 8.5, waterFlowOutLMin: 5.2, ridgeWidthM: 0.8, plantingAreaWidthM: 1.7, vetiverGrassStatus: 'ESTABLISHED', vetiverRootDepthCm: 230, vetiverPlantDensity: 7, vetiverErosionPreventionPct: 75, vetiverSedimentAccumulationKg: 65, vetiverCarbonSequestrationKg: 2.9 },
    { layerNumber: 3, layerNameTh: 'ชั้นปลูกที่ 3 (ข้าวอินทรีย์)', elevationMasl: 846.4, sedimentTrappedKg: 260, organicCarbonPct: 2.3, sedimentDepthCm: 4.5, waterFlowInLMin: 5.2, waterFlowOutLMin: 3.0, ridgeWidthM: 0.8, plantingAreaWidthM: 1.7, vetiverGrassStatus: 'PLANTED', vetiverRootDepthCm: 210, vetiverPlantDensity: 6, vetiverErosionPreventionPct: 70, vetiverSedimentAccumulationKg: 55, vetiverCarbonSequestrationKg: 2.5 },
    { layerNumber: 4, layerNameTh: 'ชั้นปลูกที่ 4 (ผักบุ้ง)', elevationMasl: 844.6, sedimentTrappedKg: 240, organicCarbonPct: 2.1, sedimentDepthCm: 4.0, waterFlowInLMin: 3.0, waterFlowOutLMin: 1.8, ridgeWidthM: 0.8, plantingAreaWidthM: 1.7, vetiverGrassStatus: 'PLANTED', vetiverRootDepthCm: 200, vetiverPlantDensity: 6, vetiverErosionPreventionPct: 68, vetiverSedimentAccumulationKg: 48, vetiverCarbonSequestrationKg: 2.2 },
    { layerNumber: 5, layerNameTh: 'ชั้นปลูกที่ 5 (สมุนไพร)', elevationMasl: 842.8, sedimentTrappedKg: 210, organicCarbonPct: 1.9, sedimentDepthCm: 3.5, waterFlowInLMin: 1.8, waterFlowOutLMin: 0.8, ridgeWidthM: 0.8, plantingAreaWidthM: 1.7, vetiverGrassStatus: 'PLANTED', vetiverRootDepthCm: 190, vetiverPlantDensity: 5, vetiverErosionPreventionPct: 65, vetiverSedimentAccumulationKg: 40, vetiverCarbonSequestrationKg: 1.8 },
  ],
  'SOIL-KKN-002': [
    { layerNumber: 1, layerNameTh: 'ชั้นปลูกที่ 1 (มันสำปะหลัง)', elevationMasl: 280, sedimentTrappedKg: 420, organicCarbonPct: 1.8, sedimentDepthCm: 6.0, waterFlowInLMin: 22.0, waterFlowOutLMin: 14.0, ridgeWidthM: 0.8, plantingAreaWidthM: 1.9, vetiverGrassStatus: 'ESTABLISHED', vetiverRootDepthCm: 235, vetiverPlantDensity: 7, vetiverErosionPreventionPct: 72, vetiverSedimentAccumulationKg: 68, vetiverCarbonSequestrationKg: 3.0 },
    { layerNumber: 2, layerNameTh: 'ชั้นปลูกที่ 2 (ถั่วลิสง)', elevationMasl: 278.5, sedimentTrappedKg: 380, organicCarbonPct: 1.6, sedimentDepthCm: 5.5, waterFlowInLMin: 14.0, waterFlowOutLMin: 8.5, ridgeWidthM: 0.8, plantingAreaWidthM: 1.9, vetiverGrassStatus: 'PLANTED', vetiverRootDepthCm: 210, vetiverPlantDensity: 6, vetiverErosionPreventionPct: 68, vetiverSedimentAccumulationKg: 58, vetiverCarbonSequestrationKg: 2.6 },
    { layerNumber: 3, layerNameTh: 'ชั้นปลูกที่ 3 (มันสำปะหลัง)', elevationMasl: 277.0, sedimentTrappedKg: 350, organicCarbonPct: 1.5, sedimentDepthCm: 5.0, waterFlowInLMin: 8.5, waterFlowOutLMin: 4.2, ridgeWidthM: 0.8, plantingAreaWidthM: 1.9, vetiverGrassStatus: 'PLANTED', vetiverRootDepthCm: 200, vetiverPlantDensity: 6, vetiverErosionPreventionPct: 65, vetiverSedimentAccumulationKg: 50, vetiverCarbonSequestrationKg: 2.2 },
    { layerNumber: 4, layerNameTh: 'ชั้นปลูกที่ 4 (ข้าวโพด)', elevationMasl: 275.5, sedimentTrappedKg: 310, organicCarbonPct: 1.3, sedimentDepthCm: 4.2, waterFlowInLMin: 4.2, waterFlowOutLMin: 2.0, ridgeWidthM: 0.8, plantingAreaWidthM: 1.9, vetiverGrassStatus: 'PLANTED', vetiverRootDepthCm: 190, vetiverPlantDensity: 5, vetiverErosionPreventionPct: 62, vetiverSedimentAccumulationKg: 42, vetiverCarbonSequestrationKg: 1.9 },
  ],
  'SOIL-SPB-003': [
    { layerNumber: 1, layerNameTh: 'ชั้นปลูกที่ 1 (มะม่วง)', elevationMasl: 120, sedimentTrappedKg: 550, organicCarbonPct: 2.5, sedimentDepthCm: 7.0, waterFlowInLMin: 30.0, waterFlowOutLMin: 22.0, ridgeWidthM: 0.7, plantingAreaWidthM: 1.8, vetiverGrassStatus: 'MATURE', vetiverRootDepthCm: 270, vetiverPlantDensity: 8, vetiverErosionPreventionPct: 85, vetiverSedimentAccumulationKg: 88, vetiverCarbonSequestrationKg: 3.9 },
    { layerNumber: 2, layerNameTh: 'ชั้นปลูกที่ 2 (ขนุน)', elevationMasl: 118.8, sedimentTrappedKg: 480, organicCarbonPct: 2.2, sedimentDepthCm: 6.2, waterFlowInLMin: 22.0, waterFlowOutLMin: 16.5, ridgeWidthM: 0.7, plantingAreaWidthM: 1.8, vetiverGrassStatus: 'MATURE', vetiverRootDepthCm: 260, vetiverPlantDensity: 8, vetiverErosionPreventionPct: 82, vetiverSedimentAccumulationKg: 78, vetiverCarbonSequestrationKg: 3.5 },
    { layerNumber: 3, layerNameTh: 'ชั้นปลูกที่ 3 (ทับทิม)', elevationMasl: 117.6, sedimentTrappedKg: 420, organicCarbonPct: 2.0, sedimentDepthCm: 5.5, waterFlowInLMin: 16.5, waterFlowOutLMin: 10.0, ridgeWidthM: 0.7, plantingAreaWidthM: 1.8, vetiverGrassStatus: 'ESTABLISHED', vetiverRootDepthCm: 240, vetiverPlantDensity: 7, vetiverErosionPreventionPct: 78, vetiverSedimentAccumulationKg: 68, vetiverCarbonSequestrationKg: 3.0 },
  ],
  'SOIL-SRN-004': [
    { layerNumber: 1, layerNameTh: 'ชั้นปลูกที่ 1 (ข้าวหอม)', elevationMasl: 180, sedimentTrappedKg: 380, organicCarbonPct: 2.6, sedimentDepthCm: 5.8, waterFlowInLMin: 18.0, waterFlowOutLMin: 12.0, ridgeWidthM: 0.7, plantingAreaWidthM: 1.5, vetiverGrassStatus: 'ESTABLISHED', vetiverRootDepthCm: 245, vetiverPlantDensity: 7, vetiverErosionPreventionPct: 80, vetiverSedimentAccumulationKg: 75, vetiverCarbonSequestrationKg: 3.4 },
    { layerNumber: 2, layerNameTh: 'ชั้นปลูกที่ 2 (ข้าวกล้อง)', elevationMasl: 178.4, sedimentTrappedKg: 340, organicCarbonPct: 2.3, sedimentDepthCm: 5.2, waterFlowInLMin: 12.0, waterFlowOutLMin: 7.0, ridgeWidthM: 0.7, plantingAreaWidthM: 1.5, vetiverGrassStatus: 'ESTABLISHED', vetiverRootDepthCm: 230, vetiverPlantDensity: 7, vetiverErosionPreventionPct: 76, vetiverSedimentAccumulationKg: 65, vetiverCarbonSequestrationKg: 2.9 },
    { layerNumber: 3, layerNameTh: 'ชั้นปลูกที่ 3 (ผักอีสาน)', elevationMasl: 176.8, sedimentTrappedKg: 300, organicCarbonPct: 2.0, sedimentDepthCm: 4.5, waterFlowInLMin: 7.0, waterFlowOutLMin: 3.5, ridgeWidthM: 0.7, plantingAreaWidthM: 1.5, vetiverGrassStatus: 'PLANTED', vetiverRootDepthCm: 210, vetiverPlantDensity: 6, vetiverErosionPreventionPct: 70, vetiverSedimentAccumulationKg: 52, vetiverCarbonSequestrationKg: 2.3 },
    { layerNumber: 4, layerNameTh: 'ชั้นปลูกที่ 4 (สมุนไพรอีสาน)', elevationMasl: 175.2, sedimentTrappedKg: 270, organicCarbonPct: 1.8, sedimentDepthCm: 4.0, waterFlowInLMin: 3.5, waterFlowOutLMin: 1.5, ridgeWidthM: 0.7, plantingAreaWidthM: 1.5, vetiverGrassStatus: 'PLANTED', vetiverRootDepthCm: 195, vetiverPlantDensity: 5, vetiverErosionPreventionPct: 66, vetiverSedimentAccumulationKg: 45, vetiverCarbonSequestrationKg: 2.0 },
  ],
  'SOIL-PKT-005': [
    { layerNumber: 1, layerNameTh: 'ชั้นปลูกที่ 1 (ยางพารา)', elevationMasl: 95, sedimentTrappedKg: 450, organicCarbonPct: 3.2, sedimentDepthCm: 6.5, waterFlowInLMin: 25.0, waterFlowOutLMin: 16.0, ridgeWidthM: 0.8, plantingAreaWidthM: 1.7, vetiverGrassStatus: 'MATURE', vetiverRootDepthCm: 280, vetiverPlantDensity: 9, vetiverErosionPreventionPct: 88, vetiverSedimentAccumulationKg: 92, vetiverCarbonSequestrationKg: 4.1 },
    { layerNumber: 2, layerNameTh: 'ชั้นปลูกที่ 2 (ยางพารา+ไม้ผล)', elevationMasl: 93.6, sedimentTrappedKg: 400, organicCarbonPct: 2.9, sedimentDepthCm: 5.8, waterFlowInLMin: 16.0, waterFlowOutLMin: 9.5, ridgeWidthM: 0.8, plantingAreaWidthM: 1.7, vetiverGrassStatus: 'MATURE', vetiverRootDepthCm: 270, vetiverPlantDensity: 8, vetiverErosionPreventionPct: 85, vetiverSedimentAccumulationKg: 82, vetiverCarbonSequestrationKg: 3.6 },
    { layerNumber: 3, layerNameTh: 'ชั้นปลูกที่ 3 (ไม้ยืนต้น)', elevationMasl: 92.2, sedimentTrappedKg: 360, organicCarbonPct: 2.6, sedimentDepthCm: 5.0, waterFlowInLMin: 9.5, waterFlowOutLMin: 5.0, ridgeWidthM: 0.8, plantingAreaWidthM: 1.7, vetiverGrassStatus: 'ESTABLISHED', vetiverRootDepthCm: 250, vetiverPlantDensity: 7, vetiverErosionPreventionPct: 80, vetiverSedimentAccumulationKg: 70, vetiverCarbonSequestrationKg: 3.1 },
  ],
  // ─── แปลงจังหวัดน่าน — เดิมไร่เลื่อนลอย → เกษตรกักตะกอนดิน ───
  'SOIL-NNN-006': [
    { layerNumber: 1, layerNameTh: 'ชั้นปลูกที่ 1 (กาแฟรอบชั้น)', elevationMasl: 680, sedimentTrappedKg: 450, organicCarbonPct: 2.8, sedimentDepthCm: 6.5, waterFlowInLMin: 18.0, waterFlowOutLMin: 10.0, ridgeWidthM: 0.8, plantingAreaWidthM: 1.7, vetiverGrassStatus: 'MATURE', vetiverRootDepthCm: 280, vetiverPlantDensity: 8, vetiverErosionPreventionPct: 85, vetiverSedimentAccumulationKg: 95, vetiverCarbonSequestrationKg: 4.2 },
    { layerNumber: 2, layerNameTh: 'ชั้นปลูกที่ 2 (กาแฟรอบชั้น)', elevationMasl: 678.5, sedimentTrappedKg: 410, organicCarbonPct: 2.5, sedimentDepthCm: 5.8, waterFlowInLMin: 10.0, waterFlowOutLMin: 6.5, ridgeWidthM: 0.8, plantingAreaWidthM: 1.7, vetiverGrassStatus: 'MATURE', vetiverRootDepthCm: 260, vetiverPlantDensity: 8, vetiverErosionPreventionPct: 82, vetiverSedimentAccumulationKg: 85, vetiverCarbonSequestrationKg: 3.8 },
    { layerNumber: 3, layerNameTh: 'ชั้นปลูกที่ 3 (กาแฟรอบชั้น)', elevationMasl: 677.0, sedimentTrappedKg: 375, organicCarbonPct: 2.3, sedimentDepthCm: 5.2, waterFlowInLMin: 6.5, waterFlowOutLMin: 4.0, ridgeWidthM: 0.8, plantingAreaWidthM: 1.7, vetiverGrassStatus: 'ESTABLISHED', vetiverRootDepthCm: 250, vetiverPlantDensity: 7, vetiverErosionPreventionPct: 78, vetiverSedimentAccumulationKg: 75, vetiverCarbonSequestrationKg: 3.3 },
    { layerNumber: 4, layerNameTh: 'ชั้นปลูกที่ 4 (กาแฟรอบชั้น)', elevationMasl: 675.5, sedimentTrappedKg: 340, organicCarbonPct: 2.1, sedimentDepthCm: 4.8, waterFlowInLMin: 4.0, waterFlowOutLMin: 2.5, ridgeWidthM: 0.8, plantingAreaWidthM: 1.7, vetiverGrassStatus: 'ESTABLISHED', vetiverRootDepthCm: 240, vetiverPlantDensity: 7, vetiverErosionPreventionPct: 75, vetiverSedimentAccumulationKg: 65, vetiverCarbonSequestrationKg: 2.9 },
    { layerNumber: 5, layerNameTh: 'ชั้นปลูกที่ 5 (กาแฟรอบชั้น)', elevationMasl: 674.0, sedimentTrappedKg: 305, organicCarbonPct: 1.9, sedimentDepthCm: 4.2, waterFlowInLMin: 2.5, waterFlowOutLMin: 1.5, ridgeWidthM: 0.8, plantingAreaWidthM: 1.7, vetiverGrassStatus: 'PLANTED', vetiverRootDepthCm: 220, vetiverPlantDensity: 6, vetiverErosionPreventionPct: 70, vetiverSedimentAccumulationKg: 55, vetiverCarbonSequestrationKg: 2.4 },
    { layerNumber: 6, layerNameTh: 'ชั้นปลูกที่ 6 (กาแฟรอบชั้น)', elevationMasl: 672.5, sedimentTrappedKg: 270, organicCarbonPct: 1.7, sedimentDepthCm: 3.8, waterFlowInLMin: 1.5, waterFlowOutLMin: 0.8, ridgeWidthM: 0.8, plantingAreaWidthM: 1.7, vetiverGrassStatus: 'PLANTED', vetiverRootDepthCm: 200, vetiverPlantDensity: 6, vetiverErosionPreventionPct: 66, vetiverSedimentAccumulationKg: 45, vetiverCarbonSequestrationKg: 2.0 },
  ],
  'SOIL-NNN-007': [
    { layerNumber: 1, layerNameTh: 'ชั้นปลูกที่ 1 (มะคาเดเมีย)', elevationMasl: 720, sedimentTrappedKg: 480, organicCarbonPct: 2.6, sedimentDepthCm: 7.0, waterFlowInLMin: 20.0, waterFlowOutLMin: 12.0, ridgeWidthM: 0.8, plantingAreaWidthM: 1.9, vetiverGrassStatus: 'MATURE', vetiverRootDepthCm: 290, vetiverPlantDensity: 8, vetiverErosionPreventionPct: 86, vetiverSedimentAccumulationKg: 98, vetiverCarbonSequestrationKg: 4.4 },
    { layerNumber: 2, layerNameTh: 'ชั้นปลูกที่ 2 (มะคาเดเมีย)', elevationMasl: 718.4, sedimentTrappedKg: 440, organicCarbonPct: 2.3, sedimentDepthCm: 6.2, waterFlowInLMin: 12.0, waterFlowOutLMin: 7.5, ridgeWidthM: 0.8, plantingAreaWidthM: 1.9, vetiverGrassStatus: 'MATURE', vetiverRootDepthCm: 270, vetiverPlantDensity: 8, vetiverErosionPreventionPct: 83, vetiverSedimentAccumulationKg: 88, vetiverCarbonSequestrationKg: 3.9 },
    { layerNumber: 3, layerNameTh: 'ชั้นปลูกที่ 3 (มะคาเดเมีย+กาแฟ)', elevationMasl: 716.8, sedimentTrappedKg: 400, organicCarbonPct: 2.1, sedimentDepthCm: 5.5, waterFlowInLMin: 7.5, waterFlowOutLMin: 4.5, ridgeWidthM: 0.8, plantingAreaWidthM: 1.9, vetiverGrassStatus: 'ESTABLISHED', vetiverRootDepthCm: 250, vetiverPlantDensity: 7, vetiverErosionPreventionPct: 79, vetiverSedimentAccumulationKg: 76, vetiverCarbonSequestrationKg: 3.4 },
    { layerNumber: 4, layerNameTh: 'ชั้นปลูกที่ 4 (มะคาเดเมีย)', elevationMasl: 715.2, sedimentTrappedKg: 360, organicCarbonPct: 1.9, sedimentDepthCm: 4.8, waterFlowInLMin: 4.5, waterFlowOutLMin: 2.5, ridgeWidthM: 0.8, plantingAreaWidthM: 1.9, vetiverGrassStatus: 'ESTABLISHED', vetiverRootDepthCm: 235, vetiverPlantDensity: 7, vetiverErosionPreventionPct: 75, vetiverSedimentAccumulationKg: 65, vetiverCarbonSequestrationKg: 2.9 },
    { layerNumber: 5, layerNameTh: 'ชั้นปลูกที่ 5 (มะคาเดเมีย+สมุนไพร)', elevationMasl: 713.6, sedimentTrappedKg: 320, organicCarbonPct: 1.7, sedimentDepthCm: 4.2, waterFlowInLMin: 2.5, waterFlowOutLMin: 1.2, ridgeWidthM: 0.8, plantingAreaWidthM: 1.9, vetiverGrassStatus: 'PLANTED', vetiverRootDepthCm: 215, vetiverPlantDensity: 6, vetiverErosionPreventionPct: 70, vetiverSedimentAccumulationKg: 55, vetiverCarbonSequestrationKg: 2.5 },
  ],
  'SOIL-NNN-008': [
    { layerNumber: 1, layerNameTh: 'ชั้นปลูกที่ 1 (กาแฟอาราบิก้า)', elevationMasl: 1050, sedimentTrappedKg: 520, organicCarbonPct: 3.0, sedimentDepthCm: 7.5, waterFlowInLMin: 22.0, waterFlowOutLMin: 13.0, ridgeWidthM: 0.7, plantingAreaWidthM: 1.5, vetiverGrassStatus: 'MATURE', vetiverRootDepthCm: 295, vetiverPlantDensity: 9, vetiverErosionPreventionPct: 88, vetiverSedimentAccumulationKg: 102, vetiverCarbonSequestrationKg: 4.5 },
    { layerNumber: 2, layerNameTh: 'ชั้นปลูกที่ 2 (กาแฟอาราบิก้า)', elevationMasl: 1048.7, sedimentTrappedKg: 475, organicCarbonPct: 2.7, sedimentDepthCm: 6.8, waterFlowInLMin: 13.0, waterFlowOutLMin: 8.0, ridgeWidthM: 0.7, plantingAreaWidthM: 1.5, vetiverGrassStatus: 'MATURE', vetiverRootDepthCm: 280, vetiverPlantDensity: 9, vetiverErosionPreventionPct: 86, vetiverSedimentAccumulationKg: 92, vetiverCarbonSequestrationKg: 4.1 },
    { layerNumber: 3, layerNameTh: 'ชั้นปลูกที่ 3 (กาแฟอาราบิก้า)', elevationMasl: 1047.4, sedimentTrappedKg: 430, organicCarbonPct: 2.5, sedimentDepthCm: 6.2, waterFlowInLMin: 8.0, waterFlowOutLMin: 5.0, ridgeWidthM: 0.7, plantingAreaWidthM: 1.5, vetiverGrassStatus: 'ESTABLISHED', vetiverRootDepthCm: 260, vetiverPlantDensity: 8, vetiverErosionPreventionPct: 82, vetiverSedimentAccumulationKg: 82, vetiverCarbonSequestrationKg: 3.6 },
    { layerNumber: 4, layerNameTh: 'ชั้นปลูกที่ 4 (กาแฟอาราบิก้า)', elevationMasl: 1046.1, sedimentTrappedKg: 390, organicCarbonPct: 2.2, sedimentDepthCm: 5.5, waterFlowInLMin: 5.0, waterFlowOutLMin: 3.0, ridgeWidthM: 0.7, plantingAreaWidthM: 1.5, vetiverGrassStatus: 'ESTABLISHED', vetiverRootDepthCm: 245, vetiverPlantDensity: 7, vetiverErosionPreventionPct: 78, vetiverSedimentAccumulationKg: 72, vetiverCarbonSequestrationKg: 3.2 },
    { layerNumber: 5, layerNameTh: 'ชั้นปลูกที่ 5 (กาแฟอาราบิก้า)', elevationMasl: 1044.8, sedimentTrappedKg: 355, organicCarbonPct: 2.0, sedimentDepthCm: 5.0, waterFlowInLMin: 3.0, waterFlowOutLMin: 1.8, ridgeWidthM: 0.7, plantingAreaWidthM: 1.5, vetiverGrassStatus: 'PLANTED', vetiverRootDepthCm: 225, vetiverPlantDensity: 7, vetiverErosionPreventionPct: 74, vetiverSedimentAccumulationKg: 60, vetiverCarbonSequestrationKg: 2.7 },
    { layerNumber: 6, layerNameTh: 'ชั้นปลูกที่ 6 (กาแฟอาราบิก้า)', elevationMasl: 1043.5, sedimentTrappedKg: 320, organicCarbonPct: 1.8, sedimentDepthCm: 4.5, waterFlowInLMin: 1.8, waterFlowOutLMin: 1.0, ridgeWidthM: 0.7, plantingAreaWidthM: 1.5, vetiverGrassStatus: 'PLANTED', vetiverRootDepthCm: 205, vetiverPlantDensity: 6, vetiverErosionPreventionPct: 70, vetiverSedimentAccumulationKg: 50, vetiverCarbonSequestrationKg: 2.2 },
    { layerNumber: 7, layerNameTh: 'ชั้นปลูกที่ 7 (กาแฟอาราบิก้า)', elevationMasl: 1042.2, sedimentTrappedKg: 285, organicCarbonPct: 1.6, sedimentDepthCm: 4.0, waterFlowInLMin: 1.0, waterFlowOutLMin: 0.5, ridgeWidthM: 0.7, plantingAreaWidthM: 1.5, vetiverGrassStatus: 'PLANTED', vetiverRootDepthCm: 190, vetiverPlantDensity: 5, vetiverErosionPreventionPct: 66, vetiverSedimentAccumulationKg: 42, vetiverCarbonSequestrationKg: 1.9 },
  ],
};

// ─── ข้อมูลฝายชะลอน้ำสำหรับแต่ละแปลง ───
const SAMPLE_CHECK_DAMS: Record<string, Array<{
  damId: string;
  damNameTh: string;
  damType: string;
  sedimentVolumeM3: number;
  sedimentDepthCm: number;
  sedimentSOCpct: number;
  sedimentCarbonTc: number;
  flowRateLMin: number;
  flowReductionPct: number;
  trapEfficiencyPct: number;
  status: string;
}>> = {
  'SOIL-CMD-001': [
    { damId: 'DAM-CMD-001-01', damNameTh: 'ฝายชะลอน้ำชั้นที่ 1', damType: 'STONE', sedimentVolumeM3: 2.8, sedimentDepthCm: 8.5, sedimentSOCpct: 2.6, sedimentCarbonTc: 0.56, flowRateLMin: 8.5, flowReductionPct: 43.3, trapEfficiencyPct: 78.0, status: 'ACTIVE' },
    { damId: 'DAM-CMD-001-02', damNameTh: 'ฝายชะลอน้ำชั้นที่ 2', damType: 'STONE', sedimentVolumeM3: 2.4, sedimentDepthCm: 7.8, sedimentSOCpct: 2.3, sedimentCarbonTc: 0.45, flowRateLMin: 5.2, flowReductionPct: 38.8, trapEfficiencyPct: 75.0, status: 'ACTIVE' },
    { damId: 'DAM-CMD-001-03', damNameTh: 'ฝายชะลอน้ำชั้นที่ 3', damType: 'STONE', sedimentVolumeM3: 2.1, sedimentDepthCm: 7.0, sedimentSOCpct: 2.1, sedimentCarbonTc: 0.38, flowRateLMin: 3.0, flowReductionPct: 42.3, trapEfficiencyPct: 72.0, status: 'ACTIVE' },
    { damId: 'DAM-CMD-001-04', damNameTh: 'ฝายชะลอน้ำชั้นที่ 4', damType: 'STONE', sedimentVolumeM3: 1.8, sedimentDepthCm: 6.2, sedimentSOCpct: 1.9, sedimentCarbonTc: 0.30, flowRateLMin: 1.8, flowReductionPct: 40.0, trapEfficiencyPct: 70.0, status: 'ACTIVE' },
    { damId: 'DAM-CMD-001-05', damNameTh: 'ฝายชะลอน้ำชั้นที่ 5', damType: 'STONE', sedimentVolumeM3: 1.5, sedimentDepthCm: 5.5, sedimentSOCpct: 1.7, sedimentCarbonTc: 0.24, flowRateLMin: 0.8, flowReductionPct: 55.6, trapEfficiencyPct: 68.0, status: 'ACTIVE' },
  ],
  'SOIL-KKN-002': [
    { damId: 'DAM-KKN-002-01', damNameTh: 'ฝายชะลอน้ำชั้นที่ 1', damType: 'CONCRETE', sedimentVolumeM3: 4.2, sedimentDepthCm: 10.0, sedimentSOCpct: 1.7, sedimentCarbonTc: 0.58, flowRateLMin: 14.0, flowReductionPct: 36.4, trapEfficiencyPct: 82.0, status: 'ACTIVE' },
    { damId: 'DAM-KKN-002-02', damNameTh: 'ฝายชะลอน้ำชั้นที่ 2', damType: 'CONCRETE', sedimentVolumeM3: 3.5, sedimentDepthCm: 8.8, sedimentSOCpct: 1.5, sedimentCarbonTc: 0.44, flowRateLMin: 8.5, flowReductionPct: 39.3, trapEfficiencyPct: 79.0, status: 'ACTIVE' },
    { damId: 'DAM-KKN-002-03', damNameTh: 'ฝายชะลอน้ำชั้นที่ 3', damType: 'CONCRETE', sedimentVolumeM3: 2.8, sedimentDepthCm: 7.5, sedimentSOCpct: 1.3, sedimentCarbonTc: 0.32, flowRateLMin: 4.2, flowReductionPct: 50.6, trapEfficiencyPct: 76.0, status: 'ACTIVE' },
  ],
  'SOIL-SPB-003': [
    { damId: 'DAM-SPB-003-01', damNameTh: 'ฝายชะลอน้ำชั้นที่ 1', damType: 'GABION', sedimentVolumeM3: 5.5, sedimentDepthCm: 12.0, sedimentSOCpct: 2.3, sedimentCarbonTc: 0.82, flowRateLMin: 22.0, flowReductionPct: 26.7, trapEfficiencyPct: 85.0, status: 'ACTIVE' },
    { damId: 'DAM-SPB-003-02', damNameTh: 'ฝายชะลอน้ำชั้นที่ 2', damType: 'GABION', sedimentVolumeM3: 4.2, sedimentDepthCm: 9.5, sedimentSOCpct: 2.0, sedimentCarbonTc: 0.58, flowRateLMin: 16.5, flowReductionPct: 25.0, trapEfficiencyPct: 80.0, status: 'ACTIVE' },
  ],
  'SOIL-SRN-004': [
    { damId: 'DAM-SRN-004-01', damNameTh: 'ฝายชะลอน้ำชั้นที่ 1', damType: 'LOG', sedimentVolumeM3: 3.2, sedimentDepthCm: 9.0, sedimentSOCpct: 2.4, sedimentCarbonTc: 0.62, flowRateLMin: 12.0, flowReductionPct: 33.3, trapEfficiencyPct: 76.0, status: 'ACTIVE' },
    { damId: 'DAM-SRN-004-02', damNameTh: 'ฝายชะลอน้ำชั้นที่ 2', damType: 'LOG', sedimentVolumeM3: 2.8, sedimentDepthCm: 8.0, sedimentSOCpct: 2.1, sedimentCarbonTc: 0.50, flowRateLMin: 7.0, flowReductionPct: 41.7, trapEfficiencyPct: 73.0, status: 'ACTIVE' },
    { damId: 'DAM-SRN-004-03', damNameTh: 'ฝายชะลอน้ำชั้นที่ 3', damType: 'LOG', sedimentVolumeM3: 2.2, sedimentDepthCm: 6.8, sedimentSOCpct: 1.8, sedimentCarbonTc: 0.36, flowRateLMin: 3.5, flowReductionPct: 50.0, trapEfficiencyPct: 70.0, status: 'ACTIVE' },
    { damId: 'DAM-SRN-004-04', damNameTh: 'ฝายชะลอน้ำชั้นที่ 4', damType: 'LOG', sedimentVolumeM3: 1.8, sedimentDepthCm: 5.5, sedimentSOCpct: 1.6, sedimentCarbonTc: 0.26, flowRateLMin: 1.5, flowReductionPct: 57.1, trapEfficiencyPct: 67.0, status: 'ACTIVE' },
  ],
  'SOIL-PKT-005': [
    { damId: 'DAM-PKT-005-01', damNameTh: 'ฝายชะลอน้ำชั้นที่ 1', damType: 'VEGETATION', sedimentVolumeM3: 3.8, sedimentDepthCm: 9.5, sedimentSOCpct: 3.0, sedimentCarbonTc: 0.72, flowRateLMin: 16.0, flowReductionPct: 36.0, trapEfficiencyPct: 80.0, status: 'ACTIVE' },
    { damId: 'DAM-PKT-005-02', damNameTh: 'ฝายชะลอน้ำชั้นที่ 2', damType: 'VEGETATION', sedimentVolumeM3: 3.2, sedimentDepthCm: 8.2, sedimentSOCpct: 2.7, sedimentCarbonTc: 0.58, flowRateLMin: 9.5, flowReductionPct: 40.6, trapEfficiencyPct: 77.0, status: 'ACTIVE' },
    { damId: 'DAM-PKT-005-03', damNameTh: 'ฝายชะลอน้ำชั้นที่ 3', damType: 'VEGETATION', sedimentVolumeM3: 2.5, sedimentDepthCm: 7.0, sedimentSOCpct: 2.4, sedimentCarbonTc: 0.42, flowRateLMin: 5.0, flowReductionPct: 47.4, trapEfficiencyPct: 74.0, status: 'ACTIVE' },
  ],
  // ─── ฝายชะลอน้ำ จ.น่าน (เดิมไร่เลื่อนลอย) ───
  'SOIL-NNN-006': [
    { damId: 'DAM-NNN-006-01', damNameTh: 'ฝายชะลอน้ำชั้นที่ 1', damType: 'STONE', sedimentVolumeM3: 3.5, sedimentDepthCm: 9.2, sedimentSOCpct: 2.7, sedimentCarbonTc: 0.68, flowRateLMin: 10.0, flowReductionPct: 44.4, trapEfficiencyPct: 82.0, status: 'ACTIVE' },
    { damId: 'DAM-NNN-006-02', damNameTh: 'ฝายชะลอน้ำชั้นที่ 2', damType: 'STONE', sedimentVolumeM3: 3.0, sedimentDepthCm: 8.5, sedimentSOCpct: 2.4, sedimentCarbonTc: 0.55, flowRateLMin: 6.5, flowReductionPct: 35.0, trapEfficiencyPct: 79.0, status: 'ACTIVE' },
    { damId: 'DAM-NNN-006-03', damNameTh: 'ฝายชะลอน้ำชั้นที่ 3', damType: 'STONE', sedimentVolumeM3: 2.6, sedimentDepthCm: 7.8, sedimentSOCpct: 2.2, sedimentCarbonTc: 0.44, flowRateLMin: 4.0, flowReductionPct: 38.5, trapEfficiencyPct: 76.0, status: 'ACTIVE' },
    { damId: 'DAM-NNN-006-04', damNameTh: 'ฝายชะลอน้ำชั้นที่ 4', damType: 'STONE', sedimentVolumeM3: 2.2, sedimentDepthCm: 7.0, sedimentSOCpct: 2.0, sedimentCarbonTc: 0.36, flowRateLMin: 2.5, flowReductionPct: 37.5, trapEfficiencyPct: 73.0, status: 'ACTIVE' },
    { damId: 'DAM-NNN-006-05', damNameTh: 'ฝายชะลอน้ำชั้นที่ 5', damType: 'STONE', sedimentVolumeM3: 1.8, sedimentDepthCm: 6.2, sedimentSOCpct: 1.8, sedimentCarbonTc: 0.28, flowRateLMin: 1.5, flowReductionPct: 40.0, trapEfficiencyPct: 70.0, status: 'ACTIVE' },
    { damId: 'DAM-NNN-006-06', damNameTh: 'ฝายชะลอน้ำชั้นที่ 6', damType: 'STONE', sedimentVolumeM3: 1.5, sedimentDepthCm: 5.5, sedimentSOCpct: 1.6, sedimentCarbonTc: 0.22, flowRateLMin: 0.8, flowReductionPct: 46.7, trapEfficiencyPct: 67.0, status: 'ACTIVE' },
  ],
  'SOIL-NNN-007': [
    { damId: 'DAM-NNN-007-01', damNameTh: 'ฝายชะลอน้ำชั้นที่ 1', damType: 'GABION', sedimentVolumeM3: 4.0, sedimentDepthCm: 10.5, sedimentSOCpct: 2.5, sedimentCarbonTc: 0.72, flowRateLMin: 12.0, flowReductionPct: 40.0, trapEfficiencyPct: 84.0, status: 'ACTIVE' },
    { damId: 'DAM-NNN-007-02', damNameTh: 'ฝายชะลอน้ำชั้นที่ 2', damType: 'GABION', sedimentVolumeM3: 3.4, sedimentDepthCm: 9.2, sedimentSOCpct: 2.2, sedimentCarbonTc: 0.58, flowRateLMin: 7.5, flowReductionPct: 37.5, trapEfficiencyPct: 81.0, status: 'ACTIVE' },
    { damId: 'DAM-NNN-007-03', damNameTh: 'ฝายชะลอน้ำชั้นที่ 3', damType: 'GABION', sedimentVolumeM3: 2.8, sedimentDepthCm: 8.0, sedimentSOCpct: 2.0, sedimentCarbonTc: 0.46, flowRateLMin: 4.5, flowReductionPct: 40.0, trapEfficiencyPct: 78.0, status: 'ACTIVE' },
    { damId: 'DAM-NNN-007-04', damNameTh: 'ฝายชะลอน้ำชั้นที่ 4', damType: 'GABION', sedimentVolumeM3: 2.2, sedimentDepthCm: 7.0, sedimentSOCpct: 1.8, sedimentCarbonTc: 0.35, flowRateLMin: 2.5, flowReductionPct: 44.4, trapEfficiencyPct: 75.0, status: 'ACTIVE' },
    { damId: 'DAM-NNN-007-05', damNameTh: 'ฝายชะลอน้ำชั้นที่ 5', damType: 'GABION', sedimentVolumeM3: 1.8, sedimentDepthCm: 6.0, sedimentSOCpct: 1.6, sedimentCarbonTc: 0.26, flowRateLMin: 1.2, flowReductionPct: 52.0, trapEfficiencyPct: 72.0, status: 'ACTIVE' },
  ],
  'SOIL-NNN-008': [
    { damId: 'DAM-NNN-008-01', damNameTh: 'ฝายชะลอน้ำชั้นที่ 1', damType: 'STONE', sedimentVolumeM3: 4.5, sedimentDepthCm: 11.0, sedimentSOCpct: 2.9, sedimentCarbonTc: 0.82, flowRateLMin: 13.0, flowReductionPct: 40.9, trapEfficiencyPct: 86.0, status: 'ACTIVE' },
    { damId: 'DAM-NNN-008-02', damNameTh: 'ฝายชะลอน้ำชั้นที่ 2', damType: 'STONE', sedimentVolumeM3: 3.8, sedimentDepthCm: 9.8, sedimentSOCpct: 2.6, sedimentCarbonTc: 0.68, flowRateLMin: 8.0, flowReductionPct: 38.5, trapEfficiencyPct: 83.0, status: 'ACTIVE' },
    { damId: 'DAM-NNN-008-03', damNameTh: 'ฝายชะลอน้ำชั้นที่ 3', damType: 'STONE', sedimentVolumeM3: 3.2, sedimentDepthCm: 8.8, sedimentSOCpct: 2.4, sedimentCarbonTc: 0.56, flowRateLMin: 5.0, flowReductionPct: 37.5, trapEfficiencyPct: 80.0, status: 'ACTIVE' },
    { damId: 'DAM-NNN-008-04', damNameTh: 'ฝายชะลอน้ำชั้นที่ 4', damType: 'STONE', sedimentVolumeM3: 2.6, sedimentDepthCm: 7.8, sedimentSOCpct: 2.1, sedimentCarbonTc: 0.44, flowRateLMin: 3.0, flowReductionPct: 40.0, trapEfficiencyPct: 77.0, status: 'ACTIVE' },
    { damId: 'DAM-NNN-008-05', damNameTh: 'ฝายชะลอน้ำชั้นที่ 5', damType: 'STONE', sedimentVolumeM3: 2.1, sedimentDepthCm: 6.8, sedimentSOCpct: 1.9, sedimentCarbonTc: 0.34, flowRateLMin: 1.8, flowReductionPct: 40.0, trapEfficiencyPct: 74.0, status: 'ACTIVE' },
    { damId: 'DAM-NNN-008-06', damNameTh: 'ฝายชะลอน้ำชั้นที่ 6', damType: 'STONE', sedimentVolumeM3: 1.6, sedimentDepthCm: 5.8, sedimentSOCpct: 1.7, sedimentCarbonTc: 0.25, flowRateLMin: 1.0, flowReductionPct: 44.4, trapEfficiencyPct: 71.0, status: 'ACTIVE' },
    { damId: 'DAM-NNN-008-07', damNameTh: 'ฝายชะลอน้ำชั้นที่ 7', damType: 'STONE', sedimentVolumeM3: 1.2, sedimentDepthCm: 4.8, sedimentSOCpct: 1.5, sedimentCarbonTc: 0.18, flowRateLMin: 0.5, flowReductionPct: 50.0, trapEfficiencyPct: 68.0, status: 'ACTIVE' },
  ],
};

// ─── สร้างข้อมูลการวัดตัวอย่างพร้อมข้อมูลตะกอนดิน ───
function generateSampleMeasurements(
  plotId: string,
  plotData: typeof SAMPLE_PLOTS[0],
  terraceIds?: string[]
) {
  const baseDate = new Date('2024-01-15');
  const measurements = [];

  // สร้างข้อมูลการวัด 3 ครั้งต่อแปลง (ทุก 4 เดือน)
  for (let i = 0; i < 3; i++) {
    const date = new Date(baseDate.getTime() + i * 120 * 24 * 60 * 60 * 1000);
    const isAnomaly = i === 2 && plotId === 'SOIL-KKN-002'; // แปลงขอนแก่น มีข้อมูลผิดปกติในรอบสุดท้าย

    // ข้อมูลตะกอนดินตามความลาดชัน
    const slopeFactor = plotData.slopeDegree / 20;
    const runoffVolumeL = Math.round((500 + slopeFactor * 2000 + Math.random() * 500) * 10) / 10;
    const sedimentConcGpL = Math.round((5 + slopeFactor * 15 + Math.random() * 5) * 100) / 100;

    measurements.push({
      plotId,
      measurementDate: date.toISOString(),
      measurementType: i === 1 ? 'LAB' : 'FIELD',
      depthCm: 30,
      soilMoisture: isAnomaly ? 95 : 30 + Math.random() * 15,
      soilTemperature: 25 + Math.random() * 5,
      soilPH: 6.0 + Math.random() * 0.8,
      bulkDensity: isAnomaly ? 3.2 : 1.1 + Math.random() * 0.3,
      organicCarbonPct: plotData.baselineSOC / 30 + (i * 0.4) + Math.random() * 0.2,
      totalNitrogen: 0.12 + Math.random() * 0.05,
      cec: 12 + Math.random() * 8,
      aboveGroundBiomass: 3 + Math.random() * 2,
      belowGroundBiomass: 1.2 + Math.random() * 0.8,
      co2Flux: 2 + Math.random() * 3,
      ch4Flux: plotData.cropType === 'Rice' ? 5 + Math.random() * 10 : 0.5 + Math.random() * 2,
      n2oFlux: 10 + Math.random() * 30,
      runoffVolumeL,
      sedimentConcGpL,
      sedimentLoadKg: Math.round(runoffVolumeL * sedimentConcGpL / 1000 * 1000) / 1000,
      erosionRateTpHa: Math.round((plotData.baselineSediment / 3 + Math.random() * 3) * 1000) / 1000,
      waterFlowRateLMin: Math.round((5 + slopeFactor * 15 + Math.random() * 5) * 10) / 10,
      infiltrationMmHr: Math.round((20 + Math.random() * 30) * 10) / 10,
      ingestionMode: i === 2 ? 'batch' : 'realtime',
      qualityFlag: isAnomaly ? 'ANOMALY' : 'VALIDATED',
      sourceDevice: i === 1 ? `LAB-${plotId.split('-')[1]}-001` : `SENSOR-${plotId.split('-')[1]}-001`,
      notes: isAnomaly
        ? 'ค่า bulkDensity ผิดปกติ กรุณาตรวจสอบ'
        : `การวัดครั้งที่ ${i + 1} (พื้นที่ลาดชัน ${plotData.slopeDegree}°)`,
    });

    // เพิ่มข้อมูลการวัดเฉพาะชั้นปลูก (ถ้ามี terraceIds)
    if (terraceIds && terraceIds.length > 0) {
      for (let t = 0; t < Math.min(terraceIds.length, 2); t++) {
        measurements.push({
          plotId,
          terraceLayerId: terraceIds[t],
          measurementDate: date.toISOString(),
          measurementType: 'FIELD',
          depthCm: 30,
          soilMoisture: 32 + Math.random() * 12,
          soilTemperature: 24 + Math.random() * 5,
          soilPH: 6.2 + Math.random() * 0.6,
          bulkDensity: 1.1 + Math.random() * 0.2,
          organicCarbonPct: plotData.baselineSOC / 30 + (t * 0.2) + Math.random() * 0.1,
          totalNitrogen: 0.10 + Math.random() * 0.04,
          cec: 14 + Math.random() * 6,
          aboveGroundBiomass: 2.5 + Math.random() * 1.5,
          belowGroundBiomass: 1.0 + Math.random() * 0.5,
          co2Flux: 2.5 + Math.random() * 2,
          ch4Flux: 1 + Math.random() * 3,
          n2oFlux: 12 + Math.random() * 20,
          runoffVolumeL: Math.round((200 + t * 100 + Math.random() * 100) * 10) / 10,
          sedimentConcGpL: Math.round((3 + plotData.slopeDegree / 10 + Math.random() * 3) * 100) / 100,
          sedimentLoadKg: 0, // จะคำนวณอัตโนมัติ
          erosionRateTpHa: Math.round((plotData.baselineSediment / 5 + Math.random() * 2) * 1000) / 1000,
          waterFlowRateLMin: Math.round((3 + t * 2 + Math.random() * 3) * 10) / 10,
          infiltrationMmHr: Math.round((25 + Math.random() * 20) * 10) / 10,
          ingestionMode: 'realtime',
          qualityFlag: 'VALIDATED',
          sourceDevice: `SENSOR-${plotId.split('-')[1]}-T${t + 1}`,
          notes: `การวัดชั้นปลูกที่ ${t + 1}`,
        });
      }
    }
  }

  return measurements;
}

// ─── คำสั่ง curl สำหรับทดสอบ ───
function generateCurlCommands() {
  return {
    plots: {
      list: {
        description: 'ดึงรายการแปลงทั้งหมด (List all terraced plots)',
        command: `curl -s http://localhost:3000/api/soil-carbon/plots | jq .`,
      },
      listWithSlope: {
        description: 'ค้นหาแปลงตามประเภทการปลูก (Filter by practiceType)',
        command: `curl -s "http://localhost:3000/api/soil-carbon/plots?practiceType=sediment_trap" | jq .`,
      },
      listNanProvince: {
        description: 'ค้นหาแปลงจังหวัดน่าน (Filter by province=น่าน)',
        command: `curl -s "http://localhost:3000/api/soil-carbon/plots?province=%E0%B8%99%E0%B9%88%E0%B8%B2%E0%B8%99" | jq .`,
      },
      createTerraced: {
        description: 'สร้างแปลงขั้นบันไดใหม่พร้อมหญ้าแฝก (Create a new terraced plot with vetiver grass)',
        command: `curl -s -X POST http://localhost:3000/api/soil-carbon/plots \\
  -H "Content-Type: application/json" \\
  -d '{
    "plotId": "SOIL-TEST-001",
    "name": "Test Terraced Field with Vetiver",
    "nameTh": "แปลงขั้นบันไดทดสอบ (หญ้าแฝก)",
    "province": "ลำพูน",
    "lat": 18.55,
    "lng": 99.05,
    "altitudeMasl": 600,
    "slopeDegree": 20,
    "slopeAspect": "NE",
    "areaRai": 15,
    "terraceCount": 4,
    "terraceWidthM": 2.5,
    "plantingAreaWidthM": 1.7,
    "ridgeWidthMPlot": 0.8,
    "terraceHeightM": 1.5,
    "checkDamCount": 3,
    "checkDamType": "STONE",
    "landUseType": "terraced_farming",
    "previousLandUse": "slash_and_burn",
    "vetiverGrassCoveragePct": 90,
    "soilType": "Loam",
    "cropType": "Rice",
    "practiceType": "sediment_trap",
    "baselineSOC": 22.0,
    "projectSOC": 30.0,
    "baselineSediment": 16.0,
    "projectSediment": 4.0,
    "baselineEmission": 4.0,
    "projectEmission": 1.8,
    "methodology": "T-VER-SOIL-01"
  }' | jq .`,
      },
    },
    measurements: {
      list: {
        description: 'ดึงรายการข้อมูลการวัด (List measurements)',
        command: `curl -s http://localhost:3000/api/soil-carbon/measurements | jq .`,
      },
      listByPlot: {
        description: 'ดึงข้อมูลการวัดตามแปลง (Filter by plotId)',
        command: `curl -s "http://localhost:3000/api/soil-carbon/measurements?plotId=SOIL-CMD-001" | jq .`,
      },
      listByTerrace: {
        description: 'ดึงข้อมูลการวัดตามชั้นปลูก (Filter by terraceLayerId)',
        command: `curl -s "http://localhost:3000/api/soil-carbon/measurements?terraceLayerId=TERRACE_ID" | jq .`,
      },
      createWithSediment: {
        description: 'สร้างข้อมูลการวัดพร้อมข้อมูลตะกอนดิน (Create with sediment data)',
        command: `curl -s -X POST http://localhost:3000/api/soil-carbon/measurements \\
  -H "Content-Type: application/json" \\
  -d '{
    "plotId": "SOIL-CMD-001",
    "measurementDate": "2024-06-15T10:30:00Z",
    "measurementType": "FIELD",
    "depthCm": 30,
    "soilMoisture": 38.5,
    "soilTemperature": 27.3,
    "soilPH": 6.5,
    "bulkDensity": 1.35,
    "organicCarbonPct": 2.8,
    "totalNitrogen": 0.15,
    "cec": 18.2,
    "aboveGroundBiomass": 4.2,
    "belowGroundBiomass": 1.8,
    "co2Flux": 3.5,
    "ch4Flux": 8.2,
    "n2oFlux": 25.0,
    "runoffVolumeL": 2500,
    "sedimentConcGpL": 12.5,
    "waterFlowRateLMin": 8.5,
    "infiltrationMmHr": 35.0,
    "sourceDevice": "SENSOR-CMD-001",
    "notes": "การวัดภาคสนามบนพื้นที่ลาดชัน"
  }' | jq .`,
      },
    },
    calculate: {
      description: 'คำนวณเครดิตคาร์บอนแบบ Sediment Trap (Calculate with sediment trap + vetiver grass methodology)',
      command: `curl -s -X POST http://localhost:3000/api/soil-carbon/calculate \\
  -H "Content-Type: application/json" \\
  -d '{
    "plotId": "SOIL-NNN-006",
    "monitoringPeriodStart": "2024-01-01",
    "monitoringPeriodEnd": "2024-12-31",
    "includeDetailReport": true
  }' | jq .`,
    },
    ingest: {
      description: 'นำเข้าข้อมูลเซ็นเซอร์แบบกลุ่มพร้อมข้อมูลตะกอนดิน (Bulk ingest with sediment data)',
      command: `curl -s -X POST http://localhost:3000/api/soil-carbon/ingest \\
  -H "Content-Type: application/json" \\
  -d '{
    "readings": [
      {
        "plotId": "SOIL-CMD-001",
        "measurementDate": "2024-08-01T09:00:00Z",
        "bulkDensity": 1.3,
        "organicCarbonPct": 2.5,
        "soilMoisture": 35.0,
        "soilTemperature": 28.0,
        "soilPH": 6.8,
        "co2Flux": 2.8,
        "ch4Flux": 6.5,
        "n2oFlux": 20.0,
        "runoffVolumeL": 1800,
        "sedimentConcGpL": 10.2,
        "waterFlowRateLMin": 7.5,
        "infiltrationMmHr": 32.0,
        "sourceDevice": "SENSOR-CMD-001"
      },
      {
        "plotId": "SOIL-KKN-002",
        "measurementDate": "2024-08-01T10:00:00Z",
        "bulkDensity": 1.15,
        "organicCarbonPct": 1.8,
        "soilMoisture": 28.0,
        "soilTemperature": 30.5,
        "soilPH": 6.2,
        "co2Flux": 4.2,
        "ch4Flux": 1.2,
        "n2oFlux": 35.0,
        "runoffVolumeL": 3500,
        "sedimentConcGpL": 15.0,
        "waterFlowRateLMin": 12.0,
        "infiltrationMmHr": 22.0,
        "sourceDevice": "SENSOR-KKN-001"
      }
    ]
  }' | jq .`,
    },
    seed: {
      description: 'สร้างข้อมูลตัวอย่างลงฐานข้อมูล (Seed sample data — 8 plots including Nan province)',
      command: `curl -s "http://localhost:3000/api/soil-carbon/sample?seed=true" | jq .`,
    },
  };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const seed = searchParams.get('seed') === 'true';
    const section = searchParams.get('section') || 'all'; // all, plots, measurements, calculations, curl

    // ─── ถ้าต้องการ seed ข้อมูลลงฐานข้อมูล ───
    if (seed) {
      const seededPlots: any[] = [];
      const seededTerraces: any[] = [];
      const seededCheckDams: any[] = [];
      const seededMeasurements: any[] = [];

      for (const plotData of SAMPLE_PLOTS) {
        // ตรวจสอบว่ามีอยู่แล้วหรือไม่
        let plot = await db.soilCarbonPlot.findUnique({ where: { plotId: plotData.plotId } });
        if (plot) {
          seededPlots.push(plot);
        } else {
          // สร้างแปลง (รวมฟิลด์หญ้าแฝกและการใช้ประโยชน์ก่อนหน้า)
          plot = await db.soilCarbonPlot.create({ data: plotData });
          seededPlots.push(plot);
        }

        // ─── ตรวจสอบว่ามีชั้นปลูก/ฝายอยู่แล้วหรือไม่ ถ้าไม่มีจะสร้างใหม่ ───
        const existingTerraces = await db.terraceLayer.findMany({ where: { plotId: plot.plotId } });
        const existingDams = await db.checkDam.findMany({ where: { plotId: plot.plotId } });

        if (existingTerraces.length > 0 || existingDams.length > 0) {
          // มี terraces/dams อยู่แล้ว ใช้ข้อมูลเดิม
          seededTerraces.push(...existingTerraces);
          seededCheckDams.push(...existingDams);
          continue;
        }

        // ─── สร้างฝายชะลอน้ำก่อน (เพื่อให้ TerraceLayer อ้างอิงได้) ───
        const damIds: string[] = [];
        const sampleDams = SAMPLE_CHECK_DAMS[plotData.plotId] || [];
        for (const damData of sampleDams) {
          const dam = await db.checkDam.create({
            data: {
              plotId: plot.plotId,
              damId: damData.damId,
              damName: `Check Dam ${damData.damId}`,
              damNameTh: damData.damNameTh,
              damType: damData.damType,
              heightM: plotData.terraceHeightM * 0.8 || 0.5,
              widthM: plotData.terraceWidthM * 0.6 || 2,
              thicknessM: 0.3,
              upstreamDepthM: damData.sedimentDepthCm / 100 * 0.5,
              sedimentDepthCm: damData.sedimentDepthCm,
              sedimentVolumeM3: damData.sedimentVolumeM3,
              sedimentSOCpct: damData.sedimentSOCpct,
              sedimentCarbonTc: damData.sedimentCarbonTc,
              flowRateLMin: damData.flowRateLMin,
              flowReductionPct: damData.flowReductionPct,
              trapEfficiencyPct: damData.trapEfficiencyPct,
              status: damData.status,
            },
          });
          damIds.push(dam.id);
          seededCheckDams.push(dam);
        }

        // ─── สร้างชั้นปลูก (TerraceLayer) พร้อมข้อมูลหญ้าแฝก ───
        const terraceIds: string[] = [];
        const sampleTerraces = SAMPLE_TERRACES[plotData.plotId] || [];
        for (const terraceData of sampleTerraces) {
          const lengthM = plotData.terraceWidthM > 0
            ? Math.round((plotData.areaHa * 10000 / plotData.terraceCount / plotData.terraceWidthM) * 100) / 100
            : 0;
          const areaSqm = Math.round(plotData.terraceWidthM * lengthM * 100) / 100;
          const plantingAreaSqm = Math.round((plotData.plantingAreaWidthM || 0) * lengthM * 100) / 100;

          const terrace = await db.terraceLayer.create({
            data: {
              plotId: plot.plotId,
              layerNumber: terraceData.layerNumber,
              layerName: `Terrace Layer ${terraceData.layerNumber}`,
              layerNameTh: terraceData.layerNameTh,
              elevationMasl: terraceData.elevationMasl,
              widthM: plotData.terraceWidthM || 0,
              plantingAreaWidthM: terraceData.plantingAreaWidthM || plotData.plantingAreaWidthM || 0,
              heightM: plotData.terraceHeightM || 0,
              lengthM,
              areaSqm,
              plantingAreaSqm,
              cropType: plotData.cropType || '',
              soilDepthCm: 30,
              sedimentDepthCm: terraceData.sedimentDepthCm,
              waterFlowInLMin: terraceData.waterFlowInLMin,
              waterFlowOutLMin: terraceData.waterFlowOutLMin,
              sedimentTrappedKg: terraceData.sedimentTrappedKg,
              organicCarbonPct: terraceData.organicCarbonPct,
              socStockTcHa: 0, // จะคำนวณจากข้อมูลการวัด
              // ข้อมูลหญ้าแฝกบนคันขอบ (Vetiver Grass Ridge)
              ridgeWidthM: terraceData.ridgeWidthM,
              vetiverGrassStatus: terraceData.vetiverGrassStatus,
              vetiverRootDepthCm: terraceData.vetiverRootDepthCm,
              vetiverPlantDensity: terraceData.vetiverPlantDensity,
              vetiverErosionPreventionPct: terraceData.vetiverErosionPreventionPct,
              vetiverSedimentAccumulationKg: terraceData.vetiverSedimentAccumulationKg,
              vetiverCarbonSequestrationKg: terraceData.vetiverCarbonSequestrationKg,
              checkDamId: terraceData.layerNumber <= damIds.length ? damIds[terraceData.layerNumber - 1] : null,
            },
          });
          terraceIds.push(terrace.id);
          seededTerraces.push(terrace);
        }

        // ─── สร้างข้อมูลการวัดตัวอย่างพร้อมข้อมูลตะกอนดิน ───
        const measurements = generateSampleMeasurements(plotData.plotId, plotData, terraceIds);
        for (const m of measurements) {
          // คำนวณ SOC Stock
          const socStock = m.bulkDensity * (m.organicCarbonPct / 100) * (m.depthCm / 100);
          // คำนวณ sedimentLoadKg อัตโนมัติถ้ายังไม่มี
          const sedimentLoadKg = m.sedimentLoadKg || (m.runoffVolumeL * m.sedimentConcGpL / 1000);

          const measurement = await db.soilCarbonMeasurement.create({
            data: {
              ...m,
              socStock: Math.round(socStock * 1000) / 1000,
              sedimentLoadKg: Math.round(sedimentLoadKg * 1000) / 1000,
              integrityHash: 'seeded-sample-terraced',
            },
          });
          seededMeasurements.push(measurement);
        }
      }

      return NextResponse.json({
        success: true,
        message: `สร้างข้อมูลตัวอย่างสำเร็จ: ${seededPlots.length} แปลง, ${seededTerraces.length} ชั้นปลูก, ${seededCheckDams.length} ฝาย, ${seededMeasurements.length} รายการวัด`,
        data: {
          plots: seededPlots,
          terraces: seededTerraces,
          checkDams: seededCheckDams,
          measurements: seededMeasurements,
        },
      });
    }

    // ─── ส่งข้อมูลตัวอย่าง (ไม่บันทึกลงฐานข้อมูล) ───
    const result: Record<string, any> = {};

    if (section === 'all' || section === 'plots') {
      result.plots = {
        description: 'ข้อมูลแปลงตัวอย่าง 8 แปลง (พื้นที่ลาดชัน/ขั้นบันได + หญ้าแฝก จังหวัดต่างๆ ในประเทศไทย)',
        count: SAMPLE_PLOTS.length,
        data: SAMPLE_PLOTS,
        provinces: [...new Set(SAMPLE_PLOTS.map(p => p.province))],
        cropTypes: [...new Set(SAMPLE_PLOTS.map(p => p.cropType))],
        practiceTypes: [...new Set(SAMPLE_PLOTS.map(p => p.practiceType))],
        altitudeRange: `${Math.min(...SAMPLE_PLOTS.map(p => p.altitudeMasl))} - ${Math.max(...SAMPLE_PLOTS.map(p => p.altitudeMasl))} ม.รทก.`,
        slopeRange: `${Math.min(...SAMPLE_PLOTS.map(p => p.slopeDegree))}° - ${Math.max(...SAMPLE_PLOTS.map(p => p.slopeDegree))}°`,
        totalTerraceCount: SAMPLE_PLOTS.reduce((s, p) => s + p.terraceCount, 0),
        totalCheckDamCount: SAMPLE_PLOTS.reduce((s, p) => s + p.checkDamCount, 0),
        vetiverGrassCoverage: {
          description: 'ความครอบคลุมหญ้าแฝกบนคันขอบ (% ของพื้นที่คันขอบทั้งแปลง)',
          range: `${Math.min(...SAMPLE_PLOTS.map(p => p.vetiverGrassCoveragePct))}% - ${Math.max(...SAMPLE_PLOTS.map(p => p.vetiverGrassCoveragePct))}%`,
          nanProvincePlots: SAMPLE_PLOTS.filter(p => p.province === 'น่าน').length,
          slashAndBurnConversion: SAMPLE_PLOTS.filter(p => p.previousLandUse === 'slash_and_burn').length,
        },
      };
    }

    if (section === 'all' || section === 'terraces') {
      result.terraces = {
        description: 'ข้อมูลชั้นปลูกตัวอย่างสำหรับแต่ละแปลง (พร้อมข้อมูลหญ้าแฝก)',
        data: SAMPLE_TERRACES,
      };
    }

    if (section === 'all' || section === 'checkdams') {
      result.checkDams = {
        description: 'ข้อมูลฝายชะลอน้ำตัวอย่างสำหรับแต่ละแปลง',
        data: SAMPLE_CHECK_DAMS,
      };
    }

    if (section === 'all' || section === 'measurements') {
      const allMeasurements = SAMPLE_PLOTS.map(plot => ({
        plotId: plot.plotId,
        name: plot.name,
        nameTh: plot.nameTh,
        slopeDegree: plot.slopeDegree,
        altitudeMasl: plot.altitudeMasl,
        measurements: generateSampleMeasurements(plot.plotId, plot),
      }));
      result.measurements = {
        description: 'ข้อมูลการวัดตัวอย่างพร้อมข้อมูลตะกอนดิน (3+ รายการต่อแปลง)',
        totalMeasurements: allMeasurements.reduce((sum, p) => sum + p.measurements.length, 0),
        data: allMeasurements,
      };
    }

    if (section === 'all' || section === 'calculations') {
      result.calculations = {
        description: 'ผลการคำนวณเครดิตคาร์บอนตัวอย่าง (T-VER-SOIL-01 Sediment Trap + Vetiver Grass Methodology)',
        methodology: 'T-VER-SOIL-01',
        bufferPct: 20,
        formulas: {
          step1: 'SOC Stock Change = ΔSOC × 44/12 × areaHa',
          step2: 'Sediment Trapped = sedimentTrappedKg × organicCarbonPct/100 / 1000 × 44/12 (ต่อชั้นปลูก)',
          step2_5: 'Vetiver Grass = (vetiverSedimentCarbon + vetiverBiomassCarbon + vetiverErosionCredit) × 44/12 (ต่อชั้นปลูก)',
          step3: 'Check Dam Carbon = sedimentCarbonTc × 44/12 (ต่อฝาย)',
          step4: 'Erosion Prevention = (baselineSediment − projectSediment) × avgSOCPct/100 × areaHa × 44/12',
          step5: 'GHG Reduction = (baselineEmission − projectEmission) × areaHa × monitoringYears',
          step6: 'Net = Gross × 0.80 (หัก Buffer 20%)',
        },
        data: SAMPLE_PLOTS.map(plot => {
          const deltaSOC = plot.projectSOC - plot.baselineSOC;
          const step1 = deltaSOC * (44 / 12) * plot.areaHa;
          // Step 2: คำนวณจากข้อมูลชั้นปลูก
          const terraces = SAMPLE_TERRACES[plot.plotId] || [];
          const step2 = terraces.reduce((sum, t) => {
            const sedimentCarbon = t.sedimentTrappedKg * (t.organicCarbonPct / 100) / 1000;
            return sum + sedimentCarbon * (44 / 12);
          }, 0);
          // Step 2.5: คำนวณจากข้อมูลหญ้าแฝก (Vetiver Grass Carbon Credit)
          const step2_5 = terraces.reduce((sum, t) => {
            if (t.vetiverGrassStatus === 'NONE') return sum;
            // vetiverSedimentCarbon = vetiverSedimentAccumulationKg × organicCarbonPct/100 / 1000 × 44/12
            const vetiverSedimentCarbon = t.vetiverSedimentAccumulationKg * (t.organicCarbonPct / 100) / 1000 * (44 / 12);
            // vetiverBiomassCarbon = vetiverCarbonSequestrationKg / 1000 × 44/12
            const vetiverBiomassCarbon = t.vetiverCarbonSequestrationKg / 1000 * (44 / 12);
            // vetiverErosionCredit (simplified)
            const vetiverErosionCredit = (t.vetiverErosionPreventionPct / 100) * t.ridgeWidthM * (plot.areaHa * 10000 / plot.terraceCount / plot.terraceWidthM) * plot.baselineSediment * 0.001 * (44 / 12);
            return sum + vetiverSedimentCarbon + vetiverBiomassCarbon + vetiverErosionCredit;
          }, 0);
          // Step 3: คำนวณจากข้อมูลฝาย
          const dams = SAMPLE_CHECK_DAMS[plot.plotId] || [];
          const step3 = dams.reduce((sum, d) => sum + d.sedimentCarbonTc * (44 / 12), 0);
          // Step 4: Erosion Prevention
          const step4 = (plot.baselineSediment - plot.projectSediment) * (plot.baselineSOC / 30) / 100 * plot.areaHa * (44 / 12);
          // Step 5: GHG Reduction
          const step5 = (plot.baselineEmission - plot.projectEmission) * plot.areaHa * plot.monitoringYear;
          const gross = step1 + step2 + step2_5 + step3 + step4 + step5;
          const net = gross * 0.80;

          return {
            plotId: plot.plotId,
            nameTh: plot.nameTh,
            province: plot.province,
            slopeDegree: plot.slopeDegree,
            altitudeMasl: plot.altitudeMasl,
            previousLandUse: plot.previousLandUse,
            vetiverGrassCoveragePct: plot.vetiverGrassCoveragePct,
            steps: {
              step1_socStockChange: Math.round(step1 * 1000) / 1000,
              step2_sedimentTrapped: Math.round(step2 * 1000) / 1000,
              step2_5_vetiverGrass: Math.round(step2_5 * 1000) / 1000,
              step3_checkDamCarbon: Math.round(step3 * 1000) / 1000,
              step4_erosionPrevention: Math.round(step4 * 1000) / 1000,
              step5_ghgReduction: Math.round(step5 * 1000) / 1000,
            },
            gross: Math.round(gross * 1000) / 1000,
            buffer: Math.round(gross * 0.2 * 1000) / 1000,
            net: Math.round(net * 1000) / 1000,
            unit: 'tCO2e',
          };
        }),
      };
    }

    if (section === 'all' || section === 'curl') {
      result.curl = {
        description: 'คำสั่ง curl สำหรับทดสอบ API ทั้งหมด (พื้นที่ลาดชัน/ขั้นบันได + หญ้าแฝก)',
        base_url: 'http://localhost:3000',
        endpoints: generateCurlCommands(),
      };
    }

    // ─── ข้อมูลเพิ่มเติม: ช่วงค่าเซ็นเซอร์ ───
    if (section === 'all') {
      result.sensorValidationRanges = {
        description: 'ช่วงค่าที่ยอมรับสำหรับการตรวจสอบข้อมูลเซ็นเซอร์ (รวมเซ็นเซอร์ตะกอนดิน)',
        ranges: {
          soil_moisture: { min: 0, max: 80, unit: '%', labelTh: 'ความชื้นในดิน' },
          soil_temperature: { min: 0, max: 60, unit: '°C', labelTh: 'อุณหภูมิดิน' },
          soil_ph: { min: 2, max: 12, unit: 'pH', labelTh: 'ค่า pH ของดิน' },
          bulk_density: { min: 0.3, max: 2.5, unit: 'g/cm³', labelTh: 'ความหนาแน่นรวมของดิน' },
          organic_carbon_pct: { min: 0, max: 30, unit: '%', labelTh: 'ร้อยละคาร์บอนอินทรีย์' },
          total_nitrogen: { min: 0, max: 5, unit: '%', labelTh: 'ไนโตรเจนรวม' },
          cec: { min: 0, max: 50, unit: 'cmol/kg', labelTh: 'ความจุแลกเปลี่ยนประจุ' },
          above_ground_biomass: { min: 0, max: 50, unit: 't/ha', labelTh: 'มวลชีวภาพเหนือพื้นดิน' },
          below_ground_biomass: { min: 0, max: 20, unit: 't/ha', labelTh: 'มวลชีวภาพใต้พื้นดิน' },
          co2_flux: { min: -20, max: 100, unit: 'µmol/m²/s', labelTh: 'ฟลักซ์ CO₂' },
          ch4_flux: { min: -10, max: 200, unit: 'mg/m²/hr', labelTh: 'ฟลักซ์ CH₄' },
          n2o_flux: { min: -200, max: 2000, unit: 'µg/m²/hr', labelTh: 'ฟลักซ์ N₂O' },
          sediment_concentration: { min: 0, max: 50, unit: 'g/L', labelTh: 'ความเข้มข้นตะกอน' },
          runoff_volume: { min: 0, max: 100000, unit: 'L', labelTh: 'ปริมาณน้ำไหลบ่า' },
          water_flow_rate: { min: 0, max: 500, unit: 'L/min', labelTh: 'อัตราการไหลของน้ำ' },
          infiltration_rate: { min: 0, max: 500, unit: 'mm/hr', labelTh: 'อัตราซึมน้ำ' },
          erosion_rate: { min: 0, max: 100, unit: 't/ha/yr', labelTh: 'อัตราการพังทลายดิน' },
        },
      };

      result.methodologyInfo = {
        name: 'T-VER-SOIL-01',
        descriptionTh: 'วิธีการตรวจสอบและรับรองโครงการกักเก็บคาร์บอนในดิน (พื้นที่ลาดชัน/ขั้นบันได + หญ้าแฝก)',
        keyParameters: {
          bufferPct: 20,
          monitoringPeriodMinYr: 1,
          monitoringPeriodMaxYr: 10,
          creditValidityYr: 10,
          uncertaintyDeductionPct: 20,
          socChangeThreshold: '0.05 tC/ha/yr',
        },
        calculationSteps: {
          step1: 'SOC Stock Change = ΔSOC × 44/12 × areaHa',
          step2: 'Sediment Trapped = sedimentTrappedKg × organicCarbonPct/100 / 1000 × 44/12',
          step2_5: 'Vetiver Grass = (vetiverSedimentCarbon + vetiverBiomassCarbon + vetiverErosionCredit) × 44/12',
          step3: 'Check Dam Carbon = sedimentCarbonTc × 44/12',
          step4: 'Erosion Prevention = (baselineSediment − projectSediment) × avgSOCPct/100 × areaHa × 44/12',
          step5: 'GHG Reduction = (baselineEmission − projectEmission) × areaHa × monitoringYears',
          step6: 'Net = Gross × 0.80 (Buffer 20%)',
        },
        vetiverGrassInfo: {
          descriptionTh: 'หญ้าแฝกบนคันขอบขั้นบันได — ประโยชน์ด้านคาร์บอน',
          ridgeWidth: '0.7-1.0 เมตร (คันขอบปลูกหญ้าแฝก)',
          plantingAreaWidth: '1.5-2.0 เมตร (พื้นที่ปลูกพืชหลัก)',
          totalTerraceWidth: '2.0-2.7 เมตร (ความกว้างรวมต่อชั้น)',
          rootDepth: '200-300 ซม. (2-3 เมตร)',
          plantDensity: '5-10 กอ/ตร.ม.',
          erosionPrevention: '60-90%',
          carbonPools: [
            'ตะกอนดินเพิ่มเติมจากหญ้าแฝก (vetiverSedimentAccumulationKg)',
            'คาร์บอนจากมวลชีวภาพหญ้าแฝก (vetiverCarbonSequestrationKg)',
            'เครดิตจากการป้องกันการพังทลาย (vetiverErosionPreventionPct)',
          ],
          slashAndBurnConversion: 'แปลงที่เปลี่ยนจากไร่เลื่อนลอยจะได้เครดิตเพิ่มจากการลดการปล่อยก๊าซเรือนกระจก',
        },
        gwpFactors: {
          CO2: 1,
          CH4: 27.9,
          N2O: 273,
          source: 'IPCC AR6',
        },
      };

      result.seedInstructions = {
        description: 'วิธีการสร้างข้อมูลตัวอย่างลงฐานข้อมูล (พื้นที่ลาดชันพร้อมชั้นปลูก ฝาย หญ้าแฝก และข้อมูลตะกอนดิน)',
        command: 'curl -s "http://localhost:3000/api/soil-carbon/sample?seed=true" | jq .',
        note: 'ข้อมูลจะถูกสร้างเฉพาะที่ยังไม่มีอยู่ (จะไม่เขียนทับ)',
        includes: [
          '8 แปลงตัวอย่างบนพื้นที่ลาดชัน (5 แปลงเดิม + 3 แปลงจ.น่าน)',
          'ชั้นปลูก (TerraceLayer) สำหรับแต่ละแปลง พร้อมข้อมูลตะกอนดินและหญ้าแฝก',
          'ฝายชะลอน้ำ (CheckDam) พร้อมข้อมูลตะกอนดินที่กักไว้',
          'ข้อมูลการวัด (Measurements) พร้อม runoffVolumeL, sedimentConcGpL',
          'ข้อมูลหญ้าแฝกบนคันขอบ (ridgeWidthM, vetiverGrassStatus, vetiverRootDepthCm, vetiverPlantDensity, vetiverErosionPreventionPct, vetiverSedimentAccumulationKg, vetiverCarbonSequestrationKg)',
          'แปลงจ.น่าน 3 แปลง — เดิมไร่เลื่อนลอย → เกษตรกักตะกอนดิน (previousLandUse = slash_and_burn)',
        ],
      };
    }

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Soil carbon sample GET error:', error);
    return NextResponse.json(
      { success: false, error: 'ไม่สามารถดึงข้อมูลตัวอย่างได้', details: String(error) },
      { status: 500 }
    );
  }
}
