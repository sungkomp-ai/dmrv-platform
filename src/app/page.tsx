import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { cookies } from 'next/headers';
import DmrvApp from '@/components/dmrv/DmrvApp';

export default async function Home() {
  // Server-side auth gate: redirect to /login if no real session.
  // Catches JWEDecryptionFailed errors (stale cookies from old secret)
  // and clears them before redirecting to /login for a fresh login.
  let session;
  try {
    session = await getServerSession(authOptions);
  } catch {
    // JWT decryption failed — old cookie is invalid. Clear all auth cookies.
    const cookieStore = await cookies();
    cookieStore.delete('next-auth.session-token');
    cookieStore.delete('next-auth.callback-url');
    cookieStore.delete('next-auth.csrf-token');
    cookieStore.delete('__Secure-next-auth.session-token');
    redirect('/login?reason=stale');
  }
  if (!session) {
    redirect('/login');
  }
  return <DmrvApp />;
}
