'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
  UserPlus, Loader2, RefreshCw, Users, Shield, CircleDot, Ban, CheckCircle2, KeyRound,
} from 'lucide-react';
import { RBAC_ROLES } from '@/lib/rbac';

interface UserRecord {
  id: string;
  username: string;
  email: string;
  name: string;
  role: string;
  status: string;
  lastLoginAt: string | null;
  createdAt: string;
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrator',
  validator: 'VVB Validator',
  project_developer: 'Project Developer',
  buyer: 'Carbon Buyer',
  auditor: 'Compliance Auditor',
  viewer: 'Public Viewer',
};

const roleBadgeClass = (role: string) => {
  switch (role) {
    case 'admin': return 'bg-red-100 text-red-700 border-red-200';
    case 'validator': return 'bg-violet-100 text-violet-700 border-violet-200';
    case 'project_developer': return 'bg-amber-100 text-amber-700 border-amber-200';
    case 'buyer': return 'bg-sky-100 text-sky-700 border-sky-200';
    case 'auditor': return 'bg-teal-100 text-teal-700 border-teal-200';
    default: return 'bg-slate-100 text-slate-600 border-slate-200';
  }
};

const statusBadge = (status: string) => {
  switch (status) {
    case 'ACTIVE':
      return <Badge variant="outline" className="gap-1 text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200"><CheckCircle2 className="h-3 w-3" />ACTIVE</Badge>;
    case 'SUSPENDED':
      return <Badge variant="outline" className="gap-1 text-[10px] bg-amber-50 text-amber-700 border-amber-200"><Ban className="h-3 w-3" />SUSPENDED</Badge>;
    case 'LOCKED':
      return <Badge variant="outline" className="gap-1 text-[10px] bg-red-50 text-red-700 border-red-200"><Ban className="h-3 w-3" />LOCKED</Badge>;
    default:
      return <Badge variant="outline" className="text-[10px]">{status}</Badge>;
  }
};

const fmtDate = (d: string | null) => (d ? new Date(d).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : '—');

export default function UserManagementView() {
  const { toast } = useToast();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);

  // create form
  const [form, setForm] = useState({ username: '', email: '', name: '', password: '', role: 'viewer' });
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/dmrv/users');
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to fetch users');
      }
      const data = await res.json();
      setUsers(data.users || []);
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed to load users', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.username.trim() || !form.email.trim() || !form.name.trim() || form.password.length < 6) {
      toast({ title: 'Validation Error', description: 'All fields required (password ≥ 6 chars)', variant: 'destructive' });
      return;
    }
    try {
      setCreating(true);
      const res = await fetch('/api/dmrv/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Create failed');
      }
      toast({ title: 'User created', description: `"${form.username}" added with role "${ROLE_LABELS[form.role] || form.role}"` });
      setForm({ username: '', email: '', name: '', password: '', role: 'viewer' });
      setCreateOpen(false);
      await fetchUsers();
    } catch (err) {
      toast({ title: 'Create failed', description: err instanceof Error ? err.message : 'unknown', variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  const startEdit = (u: UserRecord) => {
    setEditingId(u.id);
    setEditRole(u.role);
    setEditStatus(u.status);
  };
  const cancelEdit = () => { setEditingId(null); };

  const saveEdit = async (u: UserRecord) => {
    try {
      setSavingEdit(true);
      const res = await fetch('/api/dmrv/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: u.id,
          role: editRole !== u.role ? editRole : undefined,
          status: editStatus !== u.status ? editStatus : undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Update failed');
      }
      toast({ title: 'User updated', description: `"${u.username}" — role: ${editRole}, status: ${editStatus}` });
      setEditingId(null);
      await fetchUsers();
    } catch (err) {
      toast({ title: 'Update failed', description: err instanceof Error ? err.message : 'unknown', variant: 'destructive' });
    } finally {
      setSavingEdit(false);
    }
  };

  const activeCount = users.filter((u) => u.status === 'ACTIVE').length;
  const suspendedCount = users.filter((u) => u.status === 'SUSPENDED').length;
  const lockedCount = users.filter((u) => u.status === 'LOCKED').length;

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-80 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-violet-950 to-slate-900 p-6 sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-violet-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 -left-16 h-56 w-56 rounded-full bg-fuchsia-400/10 blur-3xl" />
        <div className="relative z-10 space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/20">
              <Users className="h-5 w-5 text-violet-300" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">User Management</h2>
          </div>
          <p className="text-violet-200/70 text-sm max-w-2xl leading-relaxed">
            ระบบจัดการบัญชีผู้ใช้งาน — สร้าง, แก้ไขบทบาท, ระงับ/ล็อคบัญชี และตรวจสอบสถานะการเข้าใช้งานล่าสุด
          </p>
          <div className="flex flex-wrap items-center gap-4 text-xs text-violet-300/60">
            <span className="flex items-center gap-1.5"><CircleDot className="h-3 w-3" />{activeCount} Active</span>
            <span className="flex items-center gap-1.5"><Ban className="h-3 w-3" />{suspendedCount} Suspended</span>
            <span className="flex items-center gap-1.5"><Shield className="h-3 w-3" />{lockedCount} Locked</span>
            <span className="ml-auto text-violet-300/40">{users.length} total users · {Object.keys(RBAC_ROLES).length} roles</span>
          </div>
        </div>
      </div>

      {/* Users table */}
      <Card className="overflow-hidden">
        <CardHeader className="bg-slate-50/80 border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4 text-violet-600" />
                Registered Users
              </CardTitle>
              <CardDescription className="mt-1">รายการบัญชีผู้ใช้งานทั้งหมดในระบบ</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={fetchUsers} className="gap-1.5">
                <RefreshCw className="h-3.5 w-3.5" />
                Refresh
              </Button>
              <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-1.5 bg-violet-600 hover:bg-violet-700">
                <UserPlus className="h-3.5 w-3.5" />
                Add User
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="max-h-[600px]">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/50 hover:bg-slate-50/50">
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="w-[140px]">Role</TableHead>
                  <TableHead className="w-[110px]">Status</TableHead>
                  <TableHead className="w-[180px]">Last Login</TableHead>
                  <TableHead className="w-[160px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                      <Users className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      No users found
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white text-xs font-bold">
                            {u.name.charAt(0).toUpperCase() || u.username.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">{u.name || '—'}</div>
                            <div className="text-[11px] font-mono text-muted-foreground">@{u.username}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{u.email}</TableCell>
                      <TableCell>
                        {editingId === u.id ? (
                          <Select value={editRole} onValueChange={setEditRole}>
                            <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {Object.keys(RBAC_ROLES).map((r) => (
                                <SelectItem key={r} value={r}>{ROLE_LABELS[r] || r}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge variant="outline" className={`text-[10px] ${roleBadgeClass(u.role)}`}>
                            {ROLE_LABELS[u.role] || u.role}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {editingId === u.id ? (
                          <Select value={editStatus} onValueChange={setEditStatus}>
                            <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                              <SelectItem value="SUSPENDED">SUSPENDED</SelectItem>
                              <SelectItem value="LOCKED">LOCKED</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : statusBadge(u.status)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{fmtDate(u.lastLoginAt)}</TableCell>
                      <TableCell className="text-right">
                        {editingId === u.id ? (
                          <div className="flex items-center justify-end gap-1">
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={cancelEdit} disabled={savingEdit}>Cancel</Button>
                            <Button size="sm" className="h-7 text-xs gap-1 bg-violet-600 hover:bg-violet-700" onClick={() => saveEdit(u)} disabled={savingEdit}>
                              {savingEdit ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                              Save
                            </Button>
                          </div>
                        ) : (
                          <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={() => startEdit(u)}>
                            <KeyRound className="h-3 w-3" />
                            Edit
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Create user dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100">
                <UserPlus className="h-4 w-4 text-violet-700" />
              </div>
              Create New User
            </DialogTitle>
            <DialogDescription>เพิ่มบัญชีผู้ใช้ใหม่เข้าสู่ระบบ</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Username</Label>
                <Input placeholder="e.g. jane.doe" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase().trim() })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Email</Label>
                <Input type="email" placeholder="jane@company.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Display Name</Label>
              <Input placeholder="Jane Doe" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Password</Label>
                <Input type="password" placeholder="min 6 chars" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Role</Label>
                <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.keys(RBAC_ROLES).map((r) => (
                      <SelectItem key={r} value={r}>{ROLE_LABELS[r] || r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={creating} className="gap-2 bg-violet-600 hover:bg-violet-700">
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                {creating ? 'Creating…' : 'Create User'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
