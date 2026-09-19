/**
 * Seed comprehensive user accounts for the dMRV platform.
 * Creates multiple users per RBAC role with realistic Thai names,
 * different statuses, and varied last-login timestamps.
 *
 * Usage: npx tsx scripts/seed-users-full.ts
 */
import bcrypt from 'bcryptjs';
import { db } from '../src/lib/db';

interface SeedUser {
  username: string;
  email: string;
  name: string;
  role: string;
  password: string;
  status: string;
  lastLoginAgoHours: number | null; // hours ago, null = never
}

const SEED_USERS: SeedUser[] = [
  // ─── Admin (3 users) ───────────────────────────────────────
  { username: 'admin', email: 'admin@dmrv.go.th', name: 'Somchai Chaiyanit', role: 'admin', password: 'Admin@123', status: 'ACTIVE', lastLoginAgoHours: 1 },
  { username: 'admin.som', email: 'somphon@dmrv.go.th', name: 'Somphon Sriprasoet', role: 'admin', password: 'Somphon@123', status: 'ACTIVE', lastLoginAgoHours: 5 },
  { username: 'admin.nan', email: 'nanti@dmrv.go.th', name: 'Nanti Suwanchai', role: 'admin', password: 'Nanti@123', status: 'ACTIVE', lastLoginAgoHours: 48 },

  // ─── Validator / VVB (4 users) ─────────────────────────────
  { username: 'validator', email: 'validator@vvb.co.th', name: 'Dr. Prasert Vongvivit', role: 'validator', password: 'Validator@123', status: 'ACTIVE', lastLoginAgoHours: 3 },
  { username: 'validator.anu', email: 'anucha@sgs-thailand.com', name: 'Anucha Tantisatirikul', role: 'validator', password: 'Anucha@123', status: 'ACTIVE', lastLoginAgoHours: 12 },
  { username: 'validator.was', email: 'wasan@bureauveritas.co.th', name: 'Wasan Phromsiri', role: 'validator', password: 'Wasan@123', status: 'ACTIVE', lastLoginAgoHours: 72 },
  { username: 'validator.kan', email: 'kanokporn@tgo.go.th', name: 'Kanokporn Nakornthap', role: 'validator', password: 'Kanokporn@123', status: 'SUSPENDED', lastLoginAgoHours: 168 },

  // ─── Project Developer (5 users) ──────────────────────────
  { username: 'developer', email: 'developer@project.co.th', name: 'Project Developer', role: 'project_developer', password: 'Developer@123', status: 'ACTIVE', lastLoginAgoHours: 2 },
  { username: 'dev.charoen', email: 'charoen@forest-cm.org', name: 'Charoen Wutti', role: 'project_developer', password: 'Charoen@123', status: 'ACTIVE', lastLoginAgoHours: 8 },
  { username: 'dev.manop', email: 'manop@solar-kk.co.th', name: 'Manop Inthrapichai', role: 'project_developer', password: 'Manop@123', status: 'ACTIVE', lastLoginAgoHours: 24 },
  { username: 'dev.sunanta', email: 'sunanta@biogas-cb.co.th', name: 'Sunanta Jantharakhon', role: 'project_developer', password: 'Sunanta@123', status: 'ACTIVE', lastLoginAgoHours: 96 },
  { username: 'dev.thanawat', email: 'thanawat@biochar-lb.co.th', name: 'Thanawat Phakdee', role: 'project_developer', password: 'Thanawat@123', status: 'ACTIVE', lastLoginAgoHours: null },

  // ─── Buyer (6 users) ───────────────────────────────────────
  { username: 'buyer', email: 'buyer@corp.co.th', name: 'Carbon Buyer', role: 'buyer', password: 'Buyer@123', status: 'ACTIVE', lastLoginAgoHours: 6 },
  { username: 'buyer.ptt', email: 'procurement@pttplc.com', name: 'PTT Public Co., Ltd.', role: 'buyer', password: 'PTT@123', status: 'ACTIVE', lastLoginAgoHours: 4 },
  { username: 'buyer.scg', email: 'sustainability@scg.co.th', name: 'SCG Chemicals', role: 'buyer', password: 'SCG@123', status: 'ACTIVE', lastLoginAgoHours: 18 },
  { username: 'buyer.bangchak', email: 'esg@bangchak.co.th', name: 'Bangchak Group', role: 'buyer', password: 'Bangchak@123', status: 'ACTIVE', lastLoginAgoHours: 48 },
  { username: 'buyer.mitsubishi', email: 'thailand@mitsubishicorp.com', name: 'Mitsubishi Corp. Thailand', role: 'buyer', password: 'Mitsubishi@123', status: 'ACTIVE', lastLoginAgoHours: 120 },
  { username: 'buyer.thaibev', email: 'sustainability@thaibev.com', name: 'Thai Beverage Plc.', role: 'buyer', password: 'ThaiBev@123', status: 'LOCKED', lastLoginAgoHours: 720 },

  // ─── Auditor (3 users) ─────────────────────────────────────
  { username: 'auditor', email: 'auditor@audit.co.th', name: 'Compliance Auditor', role: 'auditor', password: 'Auditor@123', status: 'ACTIVE', lastLoginAgoHours: 10 },
  { username: 'auditor.kris', email: 'krisana@kpmg.co.th', name: 'Krisana Anantawong', role: 'auditor', password: 'Krisana@123', status: 'ACTIVE', lastLoginAgoHours: 36 },
  { username: 'auditor.pim', email: 'pim@ey.com', name: 'Pimolporn Charoenrit', role: 'auditor', password: 'Pim@123', status: 'ACTIVE', lastLoginAgoHours: 60 },

  // ─── Viewer / Public (4 users) ────────────────────────────
  { username: 'viewer', email: 'viewer@public.go.th', name: 'Public Viewer', role: 'viewer', password: 'Viewer@123', status: 'ACTIVE', lastLoginAgoHours: 24 },
  { username: 'viewer.student', email: 'student@chula.ac.th', name: 'Nattawut Phakdipoom (Student)', role: 'viewer', password: 'Student@123', status: 'ACTIVE', lastLoginAgoHours: 72 },
  { username: 'viewer.research', email: 'research@kmutt.ac.th', name: 'Dr. Apinya Ratanalert', role: 'viewer', password: 'Research@123', status: 'ACTIVE', lastLoginAgoHours: 144 },
  { username: 'viewer.journalist', email: 'editor@bangkokpost.co.th', name: 'SuchartInsawat (Press)', role: 'viewer', password: 'Press@123', status: 'ACTIVE', lastLoginAgoHours: null },
];

async function main() {
  console.log('Seeding comprehensive user database...\n');
  let created = 0;
  let skipped = 0;
  let updated = 0;

  for (const seed of SEED_USERS) {
    const existing = await db.user.findUnique({ where: { username: seed.username } });

    const passwordHash = await bcrypt.hash(seed.password, 10);
    const lastLoginAt = seed.lastLoginAgoHours !== null
      ? new Date(Date.now() - seed.lastLoginAgoHours * 60 * 60 * 1000)
      : null;

    if (existing) {
      // Update existing user: refresh password, status, lastLoginAt
      await db.user.update({
        where: { id: existing.id },
        data: {
          passwordHash,
          status: seed.status,
          lastLoginAt: lastLoginAt,
          name: seed.name,
          email: seed.email,
          role: seed.role,
        },
      });
      updated++;
      console.log(`  ↻  ${seed.username.padEnd(18)} [${seed.role.padEnd(18)}] ${seed.status.padEnd(10)} — updated`);
    } else {
      await db.user.create({
        data: {
          username: seed.username,
          email: seed.email,
          name: seed.name,
          passwordHash,
          role: seed.role,
          status: seed.status,
          lastLoginAt,
        },
      });
      created++;
      console.log(`  ✓  ${seed.username.padEnd(18)} [${seed.role.padEnd(18)}] ${seed.status.padEnd(10)} — created`);
    }
  }

  console.log(`\n✓ Done. Created ${created}, updated ${updated}, total ${created + updated} users.`);

  // Print summary by role
  const allUsers = await db.user.groupBy({
    by: ['role', 'status'],
    _count: true,
  });
  console.log('\n── สรุปจำนวนผู้ใช้แยกตามบทบาท ──────────────────────');
  const roleSummary: Record<string, number> = {};
  allUsers.forEach(g => {
    roleSummary[g.role] = (roleSummary[g.role] || 0) + g._count;
  });
  Object.entries(roleSummary).forEach(([role, count]) => {
    console.log(`  ${role.padEnd(18)} : ${count} users`);
  });

  console.log('\n── สถานะผู้ใช้ ──────────────────────────────────────');
  const statusSummary: Record<string, number> = {};
  allUsers.forEach(g => {
    statusSummary[g.status] = (statusSummary[g.status] || 0) + g._count;
  });
  Object.entries(statusSummary).forEach(([status, count]) => {
    console.log(`  ${status.padEnd(10)} : ${count} users`);
  });

  console.log('\n── รหัสผ่านเริ่มต้น ─────────────────────────────────');
  console.log('  (ดูไฟล์ scripts/seed-users-full.ts สำหรับรายการเต็ม)');
  console.log('  admin/Admin@123, validator/Validator@123, buyer/Buyer@123, ...');
  console.log('──────────────────────────────────────────────────────');

  await db.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
