import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import DmrvApp from '@/components/dmrv/DmrvApp';

export default async function Home() {
  // Server-side auth gate: redirect to /login if no real session.
  // In dev mode, API routes still fall back to dev-admin via x-dev-role header,
  // but the page itself requires a real NextAuth session to render the app.
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect('/login');
  }
  return <DmrvApp />;
}
