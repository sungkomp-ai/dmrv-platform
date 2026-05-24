'use client';

import React, { useState } from 'react';
import { Activity, AlertTriangle, CheckCircle2, XCircle, Bell, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';

type Severity = 'critical' | 'warning' | 'info';

interface AlertItem {
  id: string;
  title: string;
  description: string;
  severity: Severity;
  module: string;
  timestamp: string;
  acknowledged: boolean;
}

const mockAlerts: AlertItem[] = [
  { id: '1', title: 'Agent Pipeline Stalled', description: 'Orchestrator agent #5 has not responded for 10 minutes', severity: 'critical', module: 'Orchestrator', timestamp: '5 min ago', acknowledged: false },
  { id: '2', title: 'Low Confidence Score', description: 'Biochar carbon calculation confidence dropped below 85%', severity: 'warning', module: 'Carbon', timestamp: '20 min ago', acknowledged: false },
  { id: '3', title: 'IoT Sensor Offline', description: 'Sensor moisture_012 has been offline for 2 hours', severity: 'warning', module: 'Ingestion', timestamp: '1 hr ago', acknowledged: false },
  { id: '4', title: 'New Data Ingested', description: '3 satellite images ingested from Sentinel-2', severity: 'info', module: 'Ingestion', timestamp: '2 hr ago', acknowledged: true },
  { id: '5', title: 'Certificate Expired', description: 'TVER-2024-078 has expired and requires renewal', severity: 'warning', module: 'Certification', timestamp: '3 hr ago', acknowledged: true },
  { id: '6', title: 'Verification Failed', description: 'Plot P-789 verification integrity below threshold', severity: 'critical', module: 'Verification', timestamp: '4 hr ago', acknowledged: true },
  { id: '7', title: 'Settlement Completed', description: 'Trade #TR-1234 settlement processed successfully', severity: 'info', module: 'Logistics', timestamp: '5 hr ago', acknowledged: true },
  { id: '8', title: 'Database Backup Complete', description: 'Daily backup completed at 02:00 UTC', severity: 'info', module: 'System', timestamp: '6 hr ago', acknowledged: true },
];

const severityStyles: Record<Severity, string> = {
  critical: 'bg-red-100 text-red-700 hover:bg-red-100',
  warning: 'bg-amber-100 text-amber-700 hover:bg-amber-100',
  info: 'bg-slate-100 text-slate-700 hover:bg-slate-100',
};

const severityIcons: Record<Severity, React.ElementType> = {
  critical: XCircle,
  warning: AlertTriangle,
  info: Bell,
};

const severityColors: Record<Severity, string> = {
  critical: 'text-red-600',
  warning: 'text-amber-600',
  info: 'text-slate-500',
};

export default function MonitoringView() {
  const { toast } = useToast();
  const [alerts, setAlerts] = useState<AlertItem[]>(mockAlerts);
  const [showForm, setShowForm] = useState(false);
  const [newAlertTitle, setNewAlertTitle] = useState('');
  const [newAlertDesc, setNewAlertDesc] = useState('');
  const [newAlertSeverity, setNewAlertSeverity] = useState<Severity>('warning');
  const [newAlertModule, setNewAlertModule] = useState('System');

  const handleCreateAlert = () => {
    if (!newAlertTitle.trim()) {
      toast({ title: 'Validation Error', description: 'Alert title is required', variant: 'destructive' });
      return;
    }
    const alert: AlertItem = {
      id: String(alerts.length + 1),
      title: newAlertTitle.trim(),
      description: newAlertDesc.trim(),
      severity: newAlertSeverity,
      module: newAlertModule,
      timestamp: 'Just now',
      acknowledged: false,
    };
    setAlerts((prev) => [alert, ...prev]);
    setNewAlertTitle('');
    setNewAlertDesc('');
    setShowForm(false);
    toast({ title: 'Alert Created', description: `${newAlertSeverity.toUpperCase()}: ${alert.title}` });
  };

  const acknowledgeAlert = (id: string) => {
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, acknowledged: true } : a)));
    toast({ title: 'Alert Acknowledged' });
  };

  const criticalCount = alerts.filter((a) => a.severity === 'critical' && !a.acknowledged).length;
  const warningCount = alerts.filter((a) => a.severity === 'warning' && !a.acknowledged).length;
  const infoCount = alerts.filter((a) => a.severity === 'info' && !a.acknowledged).length;

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">Monitoring</h2>
          <p className="text-muted-foreground text-sm mt-1">System health, metrics, and alert management</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
          <Plus className="h-4 w-4" />
          Create Alert
        </Button>
      </div>

      {/* System Health */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xl font-bold">99.97%</p>
              <p className="text-xs text-muted-foreground">Uptime</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-50">
              <Activity className="h-5 w-5 text-teal-600" />
            </div>
            <div>
              <p className="text-xl font-bold">3 / 8</p>
              <p className="text-xs text-muted-foreground">Active Agents</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xl font-bold">{warningCount}</p>
              <p className="text-xs text-muted-foreground">Warnings</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50">
              <XCircle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-xl font-bold">{criticalCount}</p>
              <p className="text-xs text-muted-foreground">Critical</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Create Alert Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Create New Alert</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Alert Title</Label>
                <Input placeholder="e.g., Sensor malfunction" value={newAlertTitle} onChange={(e) => setNewAlertTitle(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Severity</Label>
                <Select value={newAlertSeverity} onValueChange={(v) => setNewAlertSeverity(v as Severity)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="info">Info</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea placeholder="Describe the alert condition..." value={newAlertDesc} onChange={(e) => setNewAlertDesc(e.target.value)} rows={2} />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCreateAlert} className="bg-emerald-600 hover:bg-emerald-700">Create</Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Alert List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Alert List</CardTitle>
          <CardDescription>All system alerts — {criticalCount} critical, {warningCount} warning, {infoCount} info unacknowledged</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="max-h-96">
            <div className="px-6">
              {alerts.map((alert, idx) => {
                const Icon = severityIcons[alert.severity];
                return (
                  <React.Fragment key={alert.id}>
                    <div className={`flex items-start gap-3 py-3 ${alert.acknowledged ? 'opacity-60' : ''}`}>
                      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${severityColors[alert.severity]}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium">{alert.title}</span>
                          <Badge variant="secondary" className={`text-[10px] h-5 ${severityStyles[alert.severity]}`}>
                            {alert.severity.toUpperCase()}
                          </Badge>
                          <Badge variant="secondary" className="text-[10px] h-5">
                            {alert.module}
                          </Badge>
                          {alert.acknowledged && (
                            <Badge variant="secondary" className="text-[10px] h-5 bg-emerald-50 text-emerald-600 hover:bg-emerald-50">
                              ACK
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{alert.description}</p>
                        <span className="text-[10px] text-muted-foreground">{alert.timestamp}</span>
                      </div>
                      {!alert.acknowledged && (
                        <Button variant="ghost" size="sm" onClick={() => acknowledgeAlert(alert.id)} className="shrink-0 text-xs">
                          Acknowledge
                        </Button>
                      )}
                    </div>
                    {idx < alerts.length - 1 && <Separator />}
                  </React.Fragment>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
