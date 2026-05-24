'use client';

import React, { useState } from 'react';
import { Shield, CheckCircle2, XCircle, Key, Users, Lock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';

type Role = 'Admin' | 'Auditor' | 'ProjectOwner' | 'CorporateBuyer' | 'DataProvider';

interface RoleInfo {
  name: Role;
  description: string;
  color: string;
  bgColor: string;
  icon: React.ElementType;
}

const roles: RoleInfo[] = [
  { name: 'Admin', description: 'Full system access with user management capabilities', color: 'text-red-700', bgColor: 'bg-red-50 border-red-200', icon: Key },
  { name: 'Auditor', description: 'Read access across all modules for compliance auditing', color: 'text-amber-700', bgColor: 'bg-amber-50 border-amber-200', icon: Shield },
  { name: 'ProjectOwner', description: 'Manage projects, submit data, and request certification', color: 'text-emerald-700', bgColor: 'bg-emerald-50 border-emerald-200', icon: Users },
  { name: 'CorporateBuyer', description: 'Browse marketplace, purchase and retire carbon credits', color: 'text-teal-700', bgColor: 'bg-teal-50 border-teal-200', icon: Users },
  { name: 'DataProvider', description: 'Submit data via ingestion pipelines and view submission status', color: 'text-purple-700', bgColor: 'bg-purple-50 border-purple-200', icon: Lock },
];

const permissions = [
  'dashboard.view',
  'orchestrator.run',
  'orchestrator.view',
  'ingestion.submit',
  'ingestion.view',
  'auth.manage',
  'auth.view',
  'carbon.calculate',
  'carbon.view',
  'certification.submit',
  'certification.view',
  'verification.run',
  'verification.view',
  'monitoring.view',
  'monitoring.manage',
  'reporting.generate',
  'reporting.view',
  'marketplace.buy',
  'marketplace.retire',
  'marketplace.view',
  'logistics.track',
  'logistics.settle',
  'governance.manage',
  'governance.view',
  'submission.create',
  'submission.view',
  'audit.run',
  'audit.view',
  'footprint.calculate',
  'footprint.view',
  'simulation.run',
  'simulation.view',
];

const permissionMatrix: Record<Role, boolean[]> = {
  Admin: permissions.map(() => true),
  Auditor: permissions.map((p) => p.endsWith('.view') || p === 'audit.run'),
  ProjectOwner: permissions.map((p) =>
    ['dashboard.view', 'orchestrator.view', 'ingestion.submit', 'ingestion.view', 'carbon.calculate', 'carbon.view', 'certification.submit', 'certification.view', 'verification.view', 'monitoring.view', 'reporting.generate', 'reporting.view', 'marketplace.view', 'submission.create', 'submission.view', 'footprint.calculate', 'footprint.view', 'simulation.run', 'simulation.view'].includes(p)
  ),
  CorporateBuyer: permissions.map((p) =>
    ['dashboard.view', 'marketplace.buy', 'marketplace.retire', 'marketplace.view', 'reporting.view', 'logistics.track', 'certification.view', 'verification.view'].includes(p)
  ),
  DataProvider: permissions.map((p) =>
    ['dashboard.view', 'ingestion.submit', 'ingestion.view', 'submission.create', 'submission.view', 'monitoring.view'].includes(p)
  ),
};

export default function AuthView() {
  const { toast } = useToast();
  const [selectedRole, setSelectedRole] = useState<Role>('Admin');
  const [simRole, setSimRole] = useState<Role>('ProjectOwner');
  const [simAction, setSimAction] = useState('orchestrator.run');
  const [simResult, setSimResult] = useState<'allowed' | 'denied' | null>(null);

  const handleSimulate = () => {
    const actionIdx = permissions.indexOf(simAction);
    if (actionIdx === -1) return;
    const allowed = permissionMatrix[simRole][actionIdx];
    setSimResult(allowed ? 'allowed' : 'denied');
    toast({
      title: allowed ? 'Access Granted' : 'Access Denied',
      description: `${simRole} ${allowed ? 'can' : 'cannot'} perform "${simAction}"`,
      variant: allowed ? 'default' : 'destructive',
    });
  };

  const selectedRoleInfo = roles.find((r) => r.name === selectedRole);

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-gray-900">Auth & RBAC</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Role-based access control with PDPA-compliant security policies
        </p>
      </div>

      {/* Role Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {roles.map((role) => {
          const Icon = role.icon;
          return (
            <Card
              key={role.name}
              className={`cursor-pointer transition-all hover:shadow-md ${role.bgColor} ${
                selectedRole === role.name ? 'ring-2 ring-emerald-500' : ''
              }`}
              onClick={() => setSelectedRole(role.name)}
            >
              <CardContent className="p-4 text-center space-y-2">
                <div className={`mx-auto flex h-10 w-10 items-center justify-center rounded-full ${role.bgColor}`}>
                  <Icon className={`h-5 w-5 ${role.color}`} />
                </div>
                <h3 className={`font-semibold text-sm ${role.color}`}>{role.name}</h3>
                <p className="text-[11px] text-muted-foreground leading-relaxed">{role.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Permission Matrix */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4 text-emerald-600" />
              Permission Matrix
            </CardTitle>
            <CardDescription>
              {selectedRoleInfo ? `Showing permissions for ${selectedRoleInfo.name}` : 'Select a role to view permissions'}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="max-h-96">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Permission</TableHead>
                    {roles.map((role) => (
                      <TableHead key={role.name} className="text-center text-xs">
                        {role.name}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {permissions.map((perm, idx) => (
                    <TableRow key={perm}>
                      <TableCell className="font-mono text-xs">{perm}</TableCell>
                      {roles.map((role) => {
                        const allowed = permissionMatrix[role.name][idx];
                        return (
                          <TableCell key={role.name} className="text-center">
                            {allowed ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-600 mx-auto" />
                            ) : (
                              <XCircle className="h-4 w-4 text-slate-300 mx-auto" />
                            )}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Access Validation Simulator */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Access Simulator</CardTitle>
            <CardDescription>Test role-permission combinations</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Role</label>
              <Select value={simRole} onValueChange={(v) => { setSimRole(v as Role); setSimResult(null); }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.name} value={role.name}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Action</label>
              <Select value={simAction} onValueChange={(v) => { setSimAction(v); setSimResult(null); }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {permissions.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button onClick={handleSimulate} className="w-full bg-emerald-600 hover:bg-emerald-700">
              Validate Access
            </Button>

            {simResult && (
              <Alert className={simResult === 'allowed' ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'}>
                {simResult === 'allowed' ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-600" />
                )}
                <AlertTitle className={simResult === 'allowed' ? 'text-emerald-800' : 'text-red-800'}>
                  {simResult === 'allowed' ? 'Access Granted' : 'Access Denied'}
                </AlertTitle>
                <AlertDescription className={simResult === 'allowed' ? 'text-emerald-700' : 'text-red-700'}>
                  {simRole} {simResult === 'allowed' ? 'has' : 'does not have'} permission to &quot;{simAction}&quot;
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
