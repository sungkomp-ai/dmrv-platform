import DmrvApp from '@/components/dmrv/DmrvApp';

// In development: skip auth — render dashboard directly (dev fallback)
// In production: the middleware/NextAuth handles auth redirects
export default function Home() {
  return <DmrvApp />;
}
