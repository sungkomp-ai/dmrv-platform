'use client';

import { useState } from 'react';
import { signIn, signOut } from 'next-auth/react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, LogIn, ShieldCheck, LogOut, UserCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface LoginDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const QUICK_LOGIN: { username: string; password: string; role: string; desc: string }[] = [
  { username: 'admin', password: 'Admin@123', role: 'admin', desc: 'Full access' },
  { username: 'validator', password: 'Validator@123', role: 'validator', desc: 'VVB verify' },
  { username: 'buyer', password: 'Buyer@123', role: 'buyer', desc: 'Trade/retire' },
  { username: 'viewer', password: 'Viewer@123', role: 'viewer', desc: 'Read-only' },
];

export function LoginDialog({ open, onOpenChange, onSuccess }: LoginDialogProps) {
  const { toast } = useToast();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      toast({ title: 'Validation Error', description: 'Username and password are required', variant: 'destructive' });
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
      toast({ title: 'Login Failed', description: 'Invalid username or password', variant: 'destructive' });
      return;
    }
    toast({ title: 'Welcome back', description: `Logged in as "${username.trim().toLowerCase()}"` });
    setUsername('');
    setPassword('');
    onOpenChange(false);
    onSuccess?.();
  };

  const quickLogin = async (q: { username: string; password: string }) => {
    setUsername(q.username);
    setPassword(q.password);
    setLoading(true);
    const res = await signIn('credentials', {
      username: q.username,
      password: q.password,
      redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      toast({ title: 'Login Failed', description: 'Quick login failed', variant: 'destructive' });
      return;
    }
    toast({ title: 'Welcome', description: `Logged in as "${q.username}"` });
    onOpenChange(false);
    onSuccess?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100">
              <ShieldCheck className="h-4 w-4 text-emerald-700" />
            </div>
            Sign in to dMRV Platform
          </DialogTitle>
          <DialogDescription>
            กรอกชื่อผู้ใช้และรหัสผ่านเพื่อเข้าสู่ระบบ หรือเลือกบัญชีตัวอย่างด้านล่าง
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="login-username">Username</Label>
            <Input id="login-username" placeholder="admin" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="login-password">Password</Label>
            <Input id="login-password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>
          </DialogFooter>
        </form>

        {/* Quick login accounts */}
        <div className="mt-2 border-t pt-4">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-2">Demo accounts</p>
          <div className="grid grid-cols-2 gap-2">
            {QUICK_LOGIN.map((q) => (
              <button
                key={q.username}
                type="button"
                onClick={() => quickLogin(q)}
                disabled={loading}
                className="flex flex-col items-start rounded-lg border border-slate-200 bg-slate-50/60 p-2 text-left transition hover:bg-slate-100 disabled:opacity-50"
              >
                <span className="text-xs font-semibold capitalize text-slate-800">{q.username}</span>
                <span className="text-[10px] text-muted-foreground">{q.desc}</span>
              </button>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function LogoutButton({ onLoggedOut, className }: { onLoggedOut?: () => void; className?: string }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const handle = async () => {
    setLoading(true);
    await signOut({ redirect: false });
    setLoading(false);
    toast({ title: 'Signed out', description: 'You have been logged out' });
    onLoggedOut?.();
  };
  return (
    <Button variant="ghost" size="sm" onClick={handle} disabled={loading} className={className}>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
      Sign out
    </Button>
  );
}
