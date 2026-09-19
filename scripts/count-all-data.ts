import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL || 'file:./db/custom.db',
});
const db = new PrismaClient({ adapter });

const tables = [
  'project', 'plot', 'carbonCredit', 'certificate', 'ingestionLog',
  'submission', 'auditLog', 'alert', 'ioTSensor', 'vVBReview',
  'conflictCase', 'auditTrailEntry', 'deviceRegistration', 'bufferPoolEntry',
  'forwardContract', 'apiKey', 'webhook', 'methodologyRule',
  'aIGenerationSession', 'crossChainBridge', 'settlement', 'bridgeTransaction',
  'ioTEdgeNode', 'ioTSensorV2', 'ioTSensorReading', 'iotBatchJob',
  'iotCertificationLog', 'soilCarbonPlot', 'terraceLayer', 'checkDam',
  'soilCarbonMeasurement', 'lowCarbonBuilding', 'buildingEnergyRecord',
  'buildingMaterialRecord', 'user',
] as const;

async function main() {
  for (const t of tables) {
    try {
      const c = await (db as any)[t].count();
      console.log(t.padEnd(26), c);
    } catch (e) {
      console.log(t.padEnd(26), 'ERR', (e as Error).message.slice(0, 70));
    }
  }
  await db.$disconnect();
}

main();
