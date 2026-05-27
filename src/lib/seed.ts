import { db } from '@/lib/db';

// ─── Project Definitions ────────────────────────────────────────────────
const PROJECTS = [
  {
    name: 'สมุทรสาคร Blue Carbon',
    description: 'Mangrove restoration project along the Tha Chin estuary, restoring coastal blue carbon ecosystems and supporting local fishing communities.',
    methodology: 'T-VER-FOREST',
    status: 'Active',
    areaHa: 500,
    location: 'Samut Sakhon',
    region: 'Central Thailand',
    country: 'Thailand',
    centerLat: 13.55,
    centerLng: 100.27,
    province: 'สมุทรสาคร',
    startDate: new Date('2022-06-15'),
  },
  {
    name: 'ลพบุรี Biochar',
    description: 'Biochar production from agricultural residues, converting rice husk and cassava waste into stable carbon sequestration material.',
    methodology: 'IPCC-2023',
    status: 'Active',
    areaHa: 120,
    location: 'Lopburi',
    region: 'Central Thailand',
    country: 'Thailand',
    centerLat: 14.80,
    centerLng: 100.65,
    province: 'ลพบุรี',
    startDate: new Date('2023-01-10'),
  },
  {
    name: 'นครราชสีมา AWD Rice',
    description: 'Alternate Wetting and Drying (AWD) rice cultivation project reducing methane emissions from paddy fields in the Korat plateau.',
    methodology: 'IPCC-2023',
    status: 'Active',
    areaHa: 800,
    location: 'Nakhon Ratchasima',
    region: 'Northeastern Thailand',
    country: 'Thailand',
    centerLat: 14.97,
    centerLng: 102.08,
    province: 'นครราชสีมา',
    startDate: new Date('2022-09-01'),
  },
  {
    name: 'ชลบุรี Biogas',
    description: 'Biogas capture from industrial wastewater treatment at a cassava starch factory, converting methane into renewable energy.',
    methodology: 'IPCC-2023',
    status: 'Pending',
    areaHa: 50,
    location: 'Chonburi',
    region: 'Eastern Thailand',
    country: 'Thailand',
    centerLat: 13.36,
    centerLng: 100.98,
    province: 'ชลบุรี',
    startDate: new Date('2023-08-20'),
  },
  {
    name: 'ขอนแก่น Solar PV',
    description: 'Utility-scale solar photovoltaic farm replacing fossil fuel electricity generation in the Isan region.',
    methodology: 'IPCC-2023',
    status: 'Active',
    areaHa: 200,
    location: 'Khon Kaen',
    region: 'Northeastern Thailand',
    country: 'Thailand',
    centerLat: 16.43,
    centerLng: 102.83,
    province: 'ขอนแก่น',
    startDate: new Date('2023-03-15'),
  },
  {
    name: 'เชียงใหม่ Forest Conservation',
    description: 'Forest conservation and REDD+ project protecting upper watershed forests in Doi Inthanon National Park buffer zone.',
    methodology: 'T-VER-FOREST',
    status: 'Active',
    areaHa: 1200,
    location: 'Chiang Mai',
    region: 'Northern Thailand',
    country: 'Thailand',
    centerLat: 18.79,
    centerLng: 98.98,
    province: 'เชียงใหม่',
    startDate: new Date('2021-11-01'),
  },
];

// ─── Helper: Generate polygon coordinates around a center point ─────────
function makePolygon(centerLat: number, centerLng: number, offsetDeg: number): string {
  const offsets = [
    [-offsetDeg, -offsetDeg],
    [-offsetDeg, offsetDeg],
    [offsetDeg, offsetDeg],
    [offsetDeg, -offsetDeg],
  ];
  return JSON.stringify(offsets.map(([dlat, dlng]) => [centerLat + dlat, centerLng + dlng]));
}

// ─── Plot definitions per project ───────────────────────────────────────
const PLOT_DEFINITIONS: Record<number, Array<{ plotId: string; offsetDeg: number; areaHa: number; status: string; ownerInfo: string }>> = {
  0: [ // สมุทรสาคร Blue Carbon
    { plotId: 'SMS-BC-001', offsetDeg: 0.010, areaHa: 120, status: 'ACTIVE', ownerInfo: 'สมาคมประมงบ้านบางน้ำจืด' },
    { plotId: 'SMS-BC-002', offsetDeg: 0.015, areaHa: 140, status: 'VERIFIED', ownerInfo: 'องค์การบริหารส่วนตำบลบางโทรัด' },
    { plotId: 'SMS-BC-003', offsetDeg: 0.020, areaHa: 100, status: 'ACTIVE', ownerInfo: 'กลุ่มอนุรักษ์ป่าชายเลนสมุทรสาคร' },
    { plotId: 'SMS-BC-004', offsetDeg: 0.008, areaHa: 80, status: 'REGISTERED', ownerInfo: 'เทศบาลตำบลท่าจีน' },
    { plotId: 'SMS-BC-005', offsetDeg: 0.012, areaHa: 60, status: 'ACTIVE', ownerInfo: 'ชุมชนประมงบ้านโคกขาม' },
  ],
  1: [ // ลพบุรี Biochar
    { plotId: 'LPB-BC-001', offsetDeg: 0.010, areaHa: 35, status: 'ACTIVE', ownerInfo: 'สหกรณ์การเกษตรลพบุรี' },
    { plotId: 'LPB-BC-002', offsetDeg: 0.015, areaHa: 40, status: 'VERIFIED', ownerInfo: 'บริษัท ไบโอชาร์ไทย จำกัด' },
    { plotId: 'LPB-BC-003', offsetDeg: 0.008, areaHa: 30, status: 'ACTIVE', ownerInfo: 'กลุ่มเกษตรกรอินทรีย์เมืองลพบุรี' },
    { plotId: 'LPB-BC-004', offsetDeg: 0.012, areaHa: 15, status: 'REGISTERED', ownerInfo: 'องค์การบริหารส่วนตำบลเขาสมิง' },
  ],
  2: [ // นครราชสีมา AWD Rice
    { plotId: 'NMA-AWD-001', offsetDeg: 0.020, areaHa: 250, status: 'ACTIVE', ownerInfo: 'สหกรณ์การเกษตรนครราชสีมา' },
    { plotId: 'NMA-AWD-002', offsetDeg: 0.015, areaHa: 200, status: 'ACTIVE', ownerInfo: 'กลุ่มเกษตรกรอัจฉริยะโคราช' },
    { plotId: 'NMA-AWD-003', offsetDeg: 0.010, areaHa: 180, status: 'VERIFIED', ownerInfo: 'ศูนย์เทคโนโลยีการเกษตรภาคตะวันออกเฉียงเหนือ' },
    { plotId: 'NMA-AWD-004', offsetDeg: 0.018, areaHa: 120, status: 'REGISTERED', ownerInfo: 'เกษตรกรรายย่อยอำเภอเมืองนครราชสีมา' },
    { plotId: 'NMA-AWD-005', offsetDeg: 0.012, areaHa: 50, status: 'ACTIVE', ownerInfo: 'กองทุนหมู่บ้านทับบุตรี' },
  ],
  3: [ // ชลบุรี Biogas
    { plotId: 'CBR-BG-001', offsetDeg: 0.005, areaHa: 20, status: 'ACTIVE', ownerInfo: 'บริษัท มันสำปะหลังไทย จำกัด (มหาชน)' },
    { plotId: 'CBR-BG-002', offsetDeg: 0.008, areaHa: 15, status: 'REGISTERED', ownerInfo: 'บริษัท ไบโอก๊าซชลบุรี จำกัด' },
    { plotId: 'CBR-BG-003', offsetDeg: 0.006, areaHa: 15, status: 'ACTIVE', ownerInfo: 'องค์การบริหารส่วนตำบลหนองปลาหมอ' },
  ],
  4: [ // ขอนแก่น Solar PV
    { plotId: 'KKC-SP-001', offsetDeg: 0.012, areaHa: 80, status: 'ACTIVE', ownerInfo: 'บริษัท โซลาร์เอนเนอร์ยี่ขอนแก่น จำกัด' },
    { plotId: 'KKC-SP-002', offsetDeg: 0.010, areaHa: 60, status: 'VERIFIED', ownerInfo: 'การไฟฟ้าส่วนภูมิภาค (กฟภ.)' },
    { plotId: 'KKC-SP-003', offsetDeg: 0.015, areaHa: 40, status: 'ACTIVE', ownerInfo: 'บริษัท พลังงานสะอาดอีสาน จำกัด' },
    { plotId: 'KKC-SP-004', offsetDeg: 0.008, areaHa: 20, status: 'REGISTERED', ownerInfo: 'มหาวิทยาลัยขอนแก่น (ศูนย์พลังงานทดแทน)' },
  ],
  5: [ // เชียงใหม่ Forest Conservation
    { plotId: 'CMM-FC-001', offsetDeg: 0.020, areaHa: 350, status: 'ACTIVE', ownerInfo: 'อุทยานแห่งชาติดอยอินทนนท์' },
    { plotId: 'CMM-FC-002', offsetDeg: 0.018, areaHa: 280, status: 'VERIFIED', ownerInfo: 'กลุ่มอนุรักษ์ป่าชุมชนดอยสุเทพ' },
    { plotId: 'CMM-FC-003', offsetDeg: 0.015, areaHa: 250, status: 'ACTIVE', ownerInfo: 'มูลนิธิโครงการหลวง' },
    { plotId: 'CMM-FC-004', offsetDeg: 0.022, areaHa: 200, status: 'ACTIVE', ownerInfo: 'องค์การบริหารส่วนตำบลแม่แจ่ม' },
    { plotId: 'CMM-FC-005', offsetDeg: 0.010, areaHa: 120, status: 'REGISTERED', ownerInfo: 'กลุ่มวิสาหกิจชุมชนป่าไม้เชียงใหม่' },
  ],
};

// ─── Track types per project methodology ────────────────────────────────
const TRACK_TYPES = ['forest', 'biochar', 'awd', 'biogas', 'solar', 'forest'];

// ─── IoT Sensor definitions per project ─────────────────────────────────
const SENSOR_TYPES_PER_PROJECT: Record<number, Array<{ sensorType: string; unit: string; readingRange: [number, number] }>> = {
  0: [ // สมุทรสาคร Blue Carbon (Forest)
    { sensorType: 'soil_moisture', unit: '%', readingRange: [40, 80] },
    { sensorType: 'temperature', unit: '°C', readingRange: [25, 38] },
    { sensorType: 'humidity', unit: '%', readingRange: [60, 95] },
    { sensorType: 'co2', unit: 'ppm', readingRange: [380, 520] },
  ],
  1: [ // ลพบุรี Biochar
    { sensorType: 'temperature', unit: '°C', readingRange: [200, 600] },
    { sensorType: 'co2', unit: 'ppm', readingRange: [400, 800] },
    { sensorType: 'ch4', unit: 'ppm', readingRange: [1.5, 12] },
  ],
  2: [ // นครราชสีมา AWD Rice
    { sensorType: 'water_level', unit: 'cm', readingRange: [0, 15] },
    { sensorType: 'soil_moisture', unit: '%', readingRange: [50, 90] },
    { sensorType: 'temperature', unit: '°C', readingRange: [22, 40] },
  ],
  3: [ // ชลบุรี Biogas
    { sensorType: 'ch4', unit: 'ppm', readingRange: [50, 500] },
    { sensorType: 'temperature', unit: '°C', readingRange: [30, 55] },
    { sensorType: 'humidity', unit: '%', readingRange: [55, 85] },
  ],
  4: [ // ขอนแก่น Solar PV
    { sensorType: 'solar_irradiance', unit: 'W/m²', readingRange: [200, 1000] },
    { sensorType: 'temperature', unit: '°C', readingRange: [25, 45] },
    { sensorType: 'wind_speed', unit: 'm/s', readingRange: [0.5, 8] },
  ],
  5: [ // เชียงใหม่ Forest Conservation
    { sensorType: 'co2', unit: 'ppm', readingRange: [370, 490] },
    { sensorType: 'humidity', unit: '%', readingRange: [65, 98] },
    { sensorType: 'temperature', unit: '°C', readingRange: [15, 32] },
    { sensorType: 'soil_moisture', unit: '%', readingRange: [35, 75] },
  ],
};

// ─── Helper: Random number in range ─────────────────────────────────────
function rand(min: number, max: number): number {
  return Math.round((min + Math.random() * (max - min)) * 100) / 100;
}

function randInt(min: number, max: number): number {
  return Math.floor(min + Math.random() * (max - min + 1));
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ─── Seeding lock ───────────────────────────────────────────────────────
let seedingPromise: Promise<void> | null = null;

export async function ensureSeeded() {
  if (seedingPromise) {
    await seedingPromise;
    return;
  }

  const projectCount = await db.project.count();
  if (projectCount > 0) return;

  seedingPromise = seedAll().finally(() => {
    seedingPromise = null;
  });
  await seedingPromise;
}

async function seedAll() {
  // ── Create Projects ─────────────────────────────────────────────────
  const createdProjects = [];
  for (const proj of PROJECTS) {
    const project = await db.project.create({ data: proj });
    createdProjects.push(project);
  }

  // ── Create Plots ────────────────────────────────────────────────────
  for (let i = 0; i < createdProjects.length; i++) {
    const project = createdProjects[i];
    const plotDefs = PLOT_DEFINITIONS[i];
    const trackType = TRACK_TYPES[i];
    for (const pd of plotDefs) {
      await db.plot.create({
        data: {
          plotId: pd.plotId,
          projectId: project.id,
          coordinates: makePolygon(project.centerLat, project.centerLng, pd.offsetDeg),
          trackType,
          areaHa: pd.areaHa,
          status: pd.status,
          ownerInfo: pd.ownerInfo,
        },
      });
    }
  }

  // ── Create IoT Sensors ──────────────────────────────────────────────
  for (let i = 0; i < createdProjects.length; i++) {
    const project = createdProjects[i];
    const sensorDefs = SENSOR_TYPES_PER_PROJECT[i];
    // 3-5 sensors per project
    const sensorCount = 3 + Math.floor(Math.random() * 3);
    let sensorIdx = 0;
    for (let s = 0; s < sensorCount; s++) {
      const sensorDef = sensorDefs[sensorIdx % sensorDefs.length];
      sensorIdx++;
      const sensorId = `${project.province.split(' ')[0]}-${sensorDef.sensorType.toUpperCase()}-${String(s + 1).padStart(3, '0')}`;
      const isOnline = Math.random() > 0.15; // 85% online
      const lastSeen = new Date(Date.now() - randInt(0, 3600000)); // within last hour
      await db.ioTSensor.create({
        data: {
          projectId: project.id,
          sensorId,
          sensorType: sensorDef.sensorType,
          lat: project.centerLat + rand(-0.01, 0.01),
          lng: project.centerLng + rand(-0.01, 0.01),
          status: isOnline ? 'online' : 'offline',
          lastReading: rand(sensorDef.readingRange[0], sensorDef.readingRange[1]),
          unit: sensorDef.unit,
          battery: randInt(70, 100),
          lastSeen,
        },
      });
    }
  }

  // ── Create Carbon Credits ───────────────────────────────────────────
  const creditStatuses = ['Available', 'Traded', 'Retired'];
  for (let i = 0; i < createdProjects.length; i++) {
    const project = createdProjects[i];
    const creditCount = randInt(2, 4);
    for (let c = 0; c < creditCount; c++) {
      const amount = rand(100, 5000);
      const status = pick(creditStatuses);
      const ts = Date.now() - randInt(0, 86400000 * 30);
      const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
      await db.carbonCredit.create({
        data: {
          projectId: project.id,
          tokenId: `TCO2E-${ts}-${randomSuffix}`,
          amount,
          status,
          metadata: JSON.stringify({
            vintage: `V${2023 + (c % 2)}`,
            standard: project.methodology === 'T-VER-FOREST' ? 'T-VER' : 'IPCC',
            province: project.province,
          }),
        },
      });
    }
  }

  // ── Create Certificates ─────────────────────────────────────────────
  const certStatuses = ['SUBMITTED', 'APPROVED', 'REJECTED', 'REVOKED'];
  for (let i = 0; i < createdProjects.length; i++) {
    const project = createdProjects[i];
    const certCount = randInt(1, 2);
    for (let c = 0; c < certCount; c++) {
      const status = c === 0 ? 'APPROVED' : pick(certStatuses);
      const validFrom = new Date(project.startDate.getTime() + randInt(30, 180) * 86400000);
      const validUntil = new Date(validFrom.getTime() + 365 * 86400000);
      await db.certificate.create({
        data: {
          projectId: project.id,
          status,
          issuedBy: 'TGO',
          certificateNumber: `TGO-CERT-${project.province.substring(0, 3)}-${2024 + c}`,
          validFrom,
          validUntil,
        },
      });
    }
  }

  // ── Create Ingestion Logs ───────────────────────────────────────────
  const sourceTypes = ['satellite', 'iot', 'drone', 'photo', 'lidar'];
  const activityTypes = ['monitoring', 'verification', 'measurement'];
  const classifications = ['PUBLIC', 'CONFIDENTIAL'];
  for (let i = 0; i < createdProjects.length; i++) {
    const project = createdProjects[i];
    const logCount = randInt(5, 8);
    for (let l = 0; l < logCount; l++) {
      const sourceType = pick(sourceTypes);
      const activityType = pick(activityTypes);
      const ts = new Date(Date.now() - randInt(0, 86400000 * 60));
      await db.ingestionLog.create({
        data: {
          projectId: project.id,
          sourceType,
          activityType,
          payload: JSON.stringify({
            resolution: sourceType === 'satellite' ? '10m' : sourceType === 'drone' ? '5cm' : 'N/A',
            coverage_km2: rand(0.5, 50),
            cloud_cover_pct: sourceType === 'satellite' ? randInt(5, 40) : 0,
            bands: sourceType === 'satellite' ? ['RGB', 'NIR', 'SWIR'] : undefined,
            flight_altitude_m: sourceType === 'drone' ? randInt(50, 120) : undefined,
            device_id: sourceType === 'iot' ? `DEV-${randInt(100, 999)}` : undefined,
          }),
          evidenceUrl: `https://evidence.dmrv-th.org/${project.id}/${sourceType}/${ts.getTime()}`,
          integrityHash: `sha256:${Math.random().toString(36).substring(2, 34)}`,
          classification: pick(classifications),
          isEncrypted: Math.random() > 0.7,
          timestamp: ts,
        },
      });
    }
  }

  // ── Create Submissions ──────────────────────────────────────────────
  const submissionTypes = ['VERIFICATION', 'CERTIFICATION', 'MONITORING'];
  const submissionStatuses = ['PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED'];
  const reviewers = ['ดร.สมชาย วิชาการ', 'คุณสุภาพ ตรวจสอบ', 'ดร.วิภา ประเมินผล'];
  const submitters = ['ผู้จัดการโครงการ', 'วิศวกรสิ่งแวดล้อม', 'เจ้าหน้าที่ตรวจวัด'];
  for (let i = 0; i < createdProjects.length; i++) {
    const project = createdProjects[i];
    const subCount = randInt(1, 3);
    for (let s = 0; s < subCount; s++) {
      const type = pick(submissionTypes);
      const status = pick(submissionStatuses);
      const submittedAt = new Date(Date.now() - randInt(7, 90) * 86400000);
      const reviewedAt = status === 'PENDING' || status === 'UNDER_REVIEW' ? null : new Date(submittedAt.getTime() + randInt(3, 21) * 86400000);
      await db.submission.create({
        data: {
          projectId: project.id,
          type,
          status,
          data: JSON.stringify({
            period: `Q${randInt(1, 4)}-${2024 + (s % 2)}`,
            emissions_reduced_tco2e: rand(50, 2000),
            monitoring_data_points: randInt(100, 5000),
            methodology_version: 'v3.2',
          }),
          submittedBy: pick(submitters),
          reviewedBy: reviewedAt ? pick(reviewers) : '',
          submittedAt,
          reviewedAt,
        },
      });
    }
  }

  // ── Create Audit Logs (10-15) ───────────────────────────────────────
  const agentNames = [
    'SecurityAgent',
    'ClassificationAgent',
    'VerificationAgent',
    'IngestionAgent',
    'MonitoringAgent',
    'ReportingAgent',
    'ComplianceAgent',
  ];
  const auditActions = [
    { action: 'DATA_INGESTION_COMPLETED', severity: 'INFO' },
    { action: 'CLASSIFICATION_APPLIED', severity: 'INFO' },
    { action: 'INTEGRITY_CHECK_PASSED', severity: 'INFO' },
    { action: 'VERIFICATION_STARTED', severity: 'INFO' },
    { action: 'CERTIFICATE_APPROVED', severity: 'INFO' },
    { action: 'ANOMALY_DETECTED', severity: 'WARNING' },
    { action: 'SENSOR_OFFLINE_ALERT', severity: 'WARNING' },
    { action: 'DATA_THRESHOLD_EXCEEDED', severity: 'WARNING' },
    { action: 'SUSPICIOUS_ACTIVITY_FLAGGED', severity: 'CRITICAL' },
    { action: 'UNAUTHORIZED_ACCESS_ATTEMPT', severity: 'CRITICAL' },
    { action: 'HASH_MISMATCH_DETECTED', severity: 'ERROR' },
    { action: 'SUBMISSION_REVIEWED', severity: 'INFO' },
    { action: 'CREDIT_MINTED', severity: 'INFO' },
    { action: 'CERTIFICATE_RENEWED', severity: 'INFO' },
    { action: 'MONITORING_REPORT_GENERATED', severity: 'INFO' },
  ];

  const auditCount = randInt(10, 15);
  for (let a = 0; a < auditCount; a++) {
    const auditDef = auditActions[a % auditActions.length];
    const project = pick(createdProjects);
    await db.auditLog.create({
      data: {
        agentName: pick(agentNames),
        action: auditDef.action,
        projectId: project.id,
        details: JSON.stringify({
          projectName: project.name,
          province: project.province,
          timestamp_iso: new Date(Date.now() - randInt(0, 86400000 * 7)).toISOString(),
        }),
        severity: auditDef.severity,
        timestamp: new Date(Date.now() - randInt(0, 86400000 * 7)),
      },
    });
  }

  // ── Create Alerts (3-5) ─────────────────────────────────────────────
  const alerts = [
    { severity: 'CRITICAL', message: 'Sensor CH4-CBR-003 in Chonburi reporting dangerously high methane levels (487 ppm). Immediate inspection required.' },
    { severity: 'WARNING', message: 'Soil moisture sensor SMS-BC-002 in Samut Sakhon offline for 6+ hours. Data gap detected in mangrove monitoring zone.' },
    { severity: 'INFO', message: 'Monthly verification cycle completed for Nakhon Ratchasima AWD Rice project. All plots validated successfully.' },
    { severity: 'WARNING', message: 'Satellite imagery cloud cover exceeds 35% threshold for Lopburi Biochar project. Re-acquisition scheduled.' },
    { severity: 'CRITICAL', message: 'Integrity hash mismatch detected in ingestion log for Khon Kaen Solar PV project. Data tampering investigation initiated.' },
  ];
  const alertCount = randInt(3, 5);
  for (let a = 0; a < alertCount; a++) {
    await db.alert.create({
      data: {
        severity: alerts[a].severity,
        message: alerts[a].message,
        resolved: a === 2, // only the INFO one is resolved
        timestamp: new Date(Date.now() - randInt(0, 86400000 * 3)),
      },
    });
  }
}
