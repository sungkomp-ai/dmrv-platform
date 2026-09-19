import { db } from '../src/lib/db';

async function main() {
  const users = await db.user.findMany({
    orderBy: { createdAt: 'asc' },
    select: { id: true, username: true, email: true, name: true, role: true, status: true, lastLoginAt: true, createdAt: true },
  });
  console.log('=== ผู้ใช้ในระบบปัจจุบัน ===');
  console.log('Total users:', users.length);
  console.log('');
  users.forEach(u => {
    const last = u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' }) : 'never';
    console.log(`  ${u.username.padEnd(15)} | ${u.role.padEnd(18)} | ${u.status.padEnd(10)} | ${u.name.padEnd(25)} | last: ${last}`);
  });
  await db.$disconnect();
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
