'use client';

import { useState, useEffect } from 'react';
import { signIn, getSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, ShieldCheck, LogIn, Eye, EyeOff, Leaf } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface QuickAccount {
  username: string;
  password: string;
  role: string;
  desc: string;
  color: string;
}

const QUICK_ACCOUNTS: QuickAccount[] = [
  { username: 'admin', password: 'Admin@123', role: 'Administrator', desc: 'Full access · ทุก module', color: 'from-red-500 to-rose-600' },
  { username: 'validator', password: 'Validator@123', role: 'VVB Validator', desc: 'Verify · approve · reject', color: 'from-violet-500 to-purple-600' },
  { username: 'developer', password: 'Developer@123', role: 'Project Developer', desc: 'Create · submit · manage', color: 'from-amber-500 to-orange-600' },
  { username: 'buyer', password: 'Buyer@123', role: 'Carbon Buyer', desc: 'Trade · retire credits', color: 'from-sky-500 to-blue-600' },
  { username: 'auditor', password: 'Auditor@123', role: 'Compliance Auditor', desc: 'Read-only · audit trail', color: 'from-teal-500 to-emerald-600' },
  { username: 'viewer', password: 'Viewer@123', role: 'Public Viewer', desc: 'Read-only public data', color: 'from-slate-500 to-gray-600' },
];

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  const callbackUrl = searchParams.get('callbackUrl') || '/';

  // If already logged in, redirect away
  useEffect(() => {
    getSession().then((session) => {
      if (session) {
        router.replace(callbackUrl);
      } else {
        setCheckingSession(false);
      }
    });
  }, [router, callbackUrl]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      toast({ title: 'Validation Error', description: 'กรุณากรอก username และ password', variant: 'destructive' });
      return;
    }
    setLoading(true);
    const res = await signIn('credentials', {
      username: username.trim().toLowerCase(),
      password,
      redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      toast({ title: 'เข้าสู่ระบบไม่สำเร็จ', description: 'Username หรือ password ไม่ถูกต้อง', variant: 'destructive' });
      return;
    }
    toast({ title: 'ยินดีต้อนรับ', description: `เข้าสู่ระบบสำเร็จในฐานะ "${username.trim().toLowerCase()}"` });
    // Use hard redirect (not router.replace) to ensure the new session cookie
    // is sent to the server on the next request. Client-side navigation via
    // router.replace can miss the freshly-set cookie.
    window.location.href = callbackUrl;
  };

  const quickLogin = async (acc: QuickAccount) => {
    setUsername(acc.username);
    setPassword(acc.password);
    setLoading(true);
    const res = await signIn('credentials', {
      username: acc.username,
      password: acc.password,
      redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      toast({ title: 'เข้าสู่ระบบไม่สำเร็จ', description: 'Quick login ล้มเหลว', variant: 'destructive' });
      return;
    }
    toast({ title: 'ยินดีต้อนรับ', description: `เข้าสู่ระบบในฐานะ ${acc.role}` });
    window.location.href = callbackUrl;
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center bg-slate-950 overflow-hidden px-4 py-8">
      {/* Decorative background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-teal-400/10 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full bg-emerald-600/5 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-5xl grid lg:grid-cols-2 gap-8 items-center">
        {/* Left: Branding */}
        <div className="hidden lg:flex flex-col gap-6 text-white pr-8">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/20 border border-emerald-400/30">
              <Leaf className="h-6 w-6 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">TGO dMRV Platform</h1>
              <p className="text-xs text-emerald-300/60">Digital MRV · Carbon Credit System</p>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-4xl font-bold leading-tight tracking-tight">
              ระบบวัด รายงาน<br />
              <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
                และตรวจสอบ
              </span><br />
              คาร์บอนเครดิต
            </h2>
            <p className="text-emerald-200/70 text-sm leading-relaxed max-w-md">
              แพลตฟอร์มจัดการคาร์บอนเครดิตแบบครบวงจร ตั้งแต่การวัด การรายงาน การตรวจสอบ
              ไปจนถึงการซื้อขายและเกษียณเครดิตบน blockchain
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 pt-4">
            {[
              { label: 'Projects', value: '6' },
              { label: 'Tokens', value: '69' },
              { label: 'tCO₂e', value: '238K' },
            ].map((s) => (
              <div key={s.label} className="rounded-lg border border-emerald-500/20 bg-white/5 p-3">
                <div className="text-2xl font-bold text-white">{s.value}</div>
                <div className="text-[10px] uppercase tracking-wider text-emerald-300/60">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Login form */}
        <div className="w-full max-w-md mx-auto">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 backdrop-blur-xl shadow-2xl p-8">
            {/* Mobile brand */}
            <div className="flex lg:hidden items-center gap-3 mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/20 border border-emerald-400/30">
                <Leaf className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <h1 className="text-base font-bold text-white">TGO dMRV Platform</h1>
                <p className="text-[10px] text-emerald-300/60">Carbon Credit System</p>
              </div>
            </div>

            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/20 border border-emerald-400/30">
                <ShieldCheck className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Sign in</h2>
                <p className="text-xs text-slate-400">เข้าสู่ระบบเพื่อใช้งานแพลตฟอร์ม</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="username" className="text-xs text-slate-300">Username</Label>
                <Input
                  id="username"
                  placeholder="admin"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-emerald-500"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs text-slate-300">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-emerald-500 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 gap-2 h-11"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
                {loading ? 'กำลังเข้าสู่ระบบ…' : 'เข้าสู่ระบบ'}
              </Button>
            </form>

            {/* Divider */}
            <div className="my-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-slate-800" />
              <span className="text-[10px] uppercase tracking-wider text-slate-500">บัญชีตัวอย่าง</span>
              <div className="h-px flex-1 bg-slate-800" />
            </div>

            {/* Quick accounts */}
            <div className="grid grid-cols-2 gap-2">
              {QUICK_ACCOUNTS.map((acc) => (
                <button
                  key={acc.username}
                  type="button"
                  onClick={() => quickLogin(acc)}
                  disabled={loading}
                  className="group relative overflow-hidden rounded-lg border border-slate-700 bg-slate-800/50 p-2.5 text-left transition hover:border-slate-600 hover:bg-slate-800 disabled:opacity-50"
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${acc.color} opacity-0 group-hover:opacity-10 transition-opacity`} />
                  <div className="relative">
                    <div className="flex items-center gap-2">
                      <div className={`h-6 w-6 rounded-full bg-gradient-to-br ${acc.color} flex items-center justify-center text-[10px] font-bold text-white uppercase`}>
                        {acc.username.charAt(0)}
                      </div>
                      <span className="text-xs font-semibold text-white">{acc.username}</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1 leading-tight">{acc.role}</p>
                    <p className="text-[9px] text-slate-500 mt-0.5">{acc.desc}</p>
                  </div>
                </button>
              ))}
            </div>

            <p className="text-center text-[10px] text-slate-500 mt-6">
              ระบบสำหรับสาธิต · รหัสผ่านเริ่มต้นตามตารางด้านบน
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
