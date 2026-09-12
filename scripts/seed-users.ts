/**
 * Seed default user accounts for each RBAC role.
 *
 * Usage: bun run seed:users
 *
 * Default passwords are intentionally weak and documented below for demo
 * purposes. In production, replace these before going live.
 */
import bcrypt from 'bcryptjs';
import { db } from '../src/lib/db';

interface SeedUser {
  username: string;
  email: string;
  name: string;
  role: string;
  password: string;
}

const SEED_USERS: SeedUser[] = [
  { username: 'admin', email: 'admin@dmrv.go.th', name: 'System Administrator', role: 'admin', password: 'Admin@123' },
  { username: 'validator', email: 'validator@vvb.co.th', name: 'VVB Validator', role: 'validator', password: 'Validator@123' },
  { username: 'developer', email: 'developer@project.co.th', name: 'Project Developer', role: 'project_developer', password: 'Developer@123' },
  { username: 'buyer', email: 'buyer@corp.co.th', name: 'Carbon Buyer', role: 'buyer', password: 'Buyer@123' },
  { username: 'auditor', email: 'auditor@audit.co.th', name: 'Compliance Auditor', role: 'auditor', password: 'Auditor@123' },
  { username: 'viewer', email: 'viewer@public.go.th', name: 'Public Viewer', role: 'viewer', password: 'Viewer@123' },
];

async function main() {
  console.log('Seeding users...\n');
  let created = 0;
  let skipped = 0;

  for (const seed of SEED_USERS) {
    const existing = await db.user.findUnique({ where: { username: seed.username } });
    if (existing) {
      console.log(`  ⏭  ${seed.username.padEnd(12)} already exists (skip)`);
      skipped++;
      continue;
    }
    const passwordHash = await bcrypt.hash(seed.password, 10);
    const user = await db.user.create({
      data: {
        username: seed.username,
        email: seed.email,
        name: seed.name,
        passwordHash,
        role: seed.role,
        status: 'ACTIVE',
      },
      select: { id: true, username: true, role: true },
    });
    console.log(`  ✓  ${user.username.padEnd(12)} [${user.role.padEnd(18)}] id=${user.id}`);
    created++;
  }

  console.log(`\nDone. Created ${created} user(s), skipped ${skipped} existing.`);
  console.log('\n── Default credentials ──────────────────────────────');
  SEED_USERS.forEach((u) => {
    console.log(`  ${u.username.padEnd(12)} / ${u.password.padEnd(16)} [${u.role}]`);
  });
  console.log('─────────────────────────────────────────────────────');
}

main()
  .then(() => db.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await db.$disconnect();
    process.exit(1);
  });
