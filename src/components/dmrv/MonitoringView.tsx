'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Activity, AlertTriangle, CheckCircle2, XCircle, Bell, Plus, RefreshCw, Cpu, ThermometerSun, Droplets, Wind } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

type Severity = 'CRITICAL' | 'WARNING' | 'INFO';

interface AlertItem {
  id: string;
  severity: string;
  message: string;
  resolved: boolean;
  timestamp: string;
  acknowledged?: boolean;
}

interface HealthMetrics {
  status: string;
  uptime: string;
  lastChecked: string;
  projects: { total: number; active: number };
  credits: { total: number; available: number };
  certificates: { total: number; approved: number; pending: number };
  alerts: { total: number; unresolved: number; critical: number; warning: number };
  activity: { auditLogsLast24h: number; errorsLast24h: number };
}

const severityStyles: Record<string, string> = {
  CRITICAL: 'bg-red-100 text-red-700 hover:bg-red-100',
  WARNING: 'bg-amber-100 text-amber-700 hover:bg-amber-100',
  INFO: 'bg-slate-100 text-slate-700 hover:bg-slate-100',
};

const severityIcons: Record<string, React.ElementType> = {
  CRITICAL: XCircle,
  WARNING: AlertTriangle,
  INFO: Bell,
};

const severityColors: Record<string, string> = {
  CRITICAL: 'text-red-600',
  WARNING: 'text-amber-600',
  INFO: 'text-slate-500',
};

export default function MonitoringView() {
  const { toast } = useToast();
  const [standardMode, setStandardMode] = useState<'international' | 'tgo'>('tgo');
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [health, setHealth] = useState<HealthMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newAlertTitle, setNewAlertTitle] = useState('');
  const [newAlertDesc, setNewAlertDesc] = useState('');
  const [newAlertSeverity, setNewAlertSeverity] = useState<string>('WARNING');
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const fetchData = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const res = await fetch('/api/dmrv/monitoring');
      if (!res.ok) throw new Error('Failed to fetch monitoring data');
      const data = await res.json();
      // Preserve acknowledged state from local state
      setAlerts((prev) => {
        const acknowledgedIds = new Set(prev.filter((a) => a.acknowledged).map((a) => a.id));
        return (data.alerts || []).map((a: AlertItem) => ({
          ...a,
          acknowledged: acknowledgedIds.has(a.id) || a.resolved,
        }));
      });
      setHealth(data.health || null);
    } catch {
      toast({ title: 'Error', description: 'Failed to load monitoring data', variant: 'destructive' });
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData(true);
    // Auto-refresh every 30 seconds
    pollRef.current = setInterval(() => {
      fetchData(false);
    }, 30000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchData]);

  const handleRefresh = async () => {
    setLoading(true);
    await fetchData(false);
    setLoading(false);
    toast({ title: 'Refreshed', description: 'Monitoring data updated' });
  };

  const handleCreateAlert = async () => {
    if (!newAlertTitle.trim()) {
      toast({ title: 'Validation Error', description: 'Alert title is required', variant: 'destructive' });
      return;
    }
    setCreating(true);
    try {
      const res = await fetch('/api/dmrv/monitoring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          severity: newAlertSeverity,
          message: `${newAlertTitle.trim()}${newAlertDesc.trim() ? ': ' + newAlertDesc.trim() : ''}`,
        }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to create alert');
      }
      toast({ title: 'Alert Created', description: `${newAlertSeverity}: ${newAlertTitle.trim()}` });
      setNewAlertTitle('');
      setNewAlertDesc('');
      setShowForm(false);
      await fetchData(false);
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed to create alert', variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  const acknowledgeAlert = (id: string) => {
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, acknowledged: true } : a)));
    toast({ title: 'Alert Acknowledged' });
  };

  const criticalCount = alerts.filter((a) => a.severity === 'CRITICAL' && !a.acknowledged).length;
  const warningCount = alerts.filter((a) => a.severity === 'WARNING' && !a.acknowledged).length;
  const infoCount = alerts.filter((a) => a.severity === 'INFO' && !a.acknowledged).length;

  const statusColor = (status: string) => {
    if (status === 'HEALTHY') return 'text-emerald-600';
    if (status === 'WARNING') return 'text-amber-600';
    return 'text-red-600';
  };

  const statusBg = (status: string) => {
    if (status === 'HEALTHY') return 'bg-emerald-50';
    if (status === 'WARNING') return 'bg-amber-50';
    return 'bg-red-50';
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-4 flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div>
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-3 w-16 mt-1" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <Card><CardContent className="p-6"><Skeleton className="h-64" /></CardContent></Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">Monitoring</h2>
          <p className="text-muted-foreground text-sm mt-1">System health, metrics, and alert management</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5 text-[10px]">
            <button onClick={() => setStandardMode('tgo')} className={`px-2.5 py-1 rounded-md transition-all ${standardMode === 'tgo' ? 'bg-amber-100 text-amber-800 font-bold shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>🇹🇭 TGO/T-VER</button>
            <button onClick={() => setStandardMode('international')} className={`px-2.5 py-1 rounded-md transition-all ${standardMode === 'international' ? 'bg-blue-100 text-blue-800 font-bold shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>🌐 Int'l</button>
          </div>
          <Button variant="outline" size="sm" onClick={handleRefresh} className="gap-2">
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
          <Button onClick={() => setShowForm(!showForm)} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
            <Plus className="h-4 w-4" />
            Create Alert
          </Button>
        </div>
      </div>

      {/* System Health */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${health ? statusBg(health.status) : 'bg-emerald-50'}`}>
              <CheckCircle2 className={`h-5 w-5 ${health ? statusColor(health.status) : 'text-emerald-600'}`} />
            </div>
            <div>
              <p className={`text-xl font-bold ${health ? statusColor(health.status) : ''}`}>
                {health?.status || 'N/A'}
              </p>
              <p className="text-xs text-muted-foreground">System Status</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-50">
              <Activity className="h-5 w-5 text-teal-600" />
            </div>
            <div>
              <p className="text-xl font-bold">{health?.projects?.active ?? 0} / {health?.projects?.total ?? 0}</p>
              <p className="text-xs text-muted-foreground">Active Projects</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-amber-600">{warningCount}</p>
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
              <p className="text-xl font-bold text-red-600">{criticalCount}</p>
              <p className="text-xs text-muted-foreground">Critical</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Health Metrics */}
      {health && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-lg font-bold">{health.credits.total.toLocaleString('en-US', { maximumFractionDigits: 1 })}</p>
              <p className="text-xs text-muted-foreground">
                {standardMode === 'tgo' ? 'Total Credits (tCO₂e T-VER)' : 'Total Credits (tCO₂e)'}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-lg font-bold text-emerald-600">{health.certificates.approved}</p>
              <p className="text-xs text-muted-foreground">
                {standardMode === 'tgo' ? 'ใบรับรองที่อนุมัติ' : 'Approved Certificates'}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-lg font-bold text-amber-600">{health.certificates.pending}</p>
              <p className="text-xs text-muted-foreground">
                {standardMode === 'tgo' ? 'ใบรับรองรอตรวจ' : 'Pending Certificates'}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-lg font-bold">{health.activity.auditLogsLast24h}</p>
              <p className="text-xs text-muted-foreground">Audit Logs (24h)</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* IoT Sensor Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Cpu className="h-4 w-4 text-emerald-600" />
            IoT Sensor Summary
          </CardTitle>
          <CardDescription>
            {standardMode === 'tgo' ? 'สถานะเซ็นเซอร์ IoT ตามเกณฑ์ T-VER' : 'IoT sensor status overview'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { icon: ThermometerSun, type: standardMode === 'tgo' ? 'CH₄ Sensor' : 'CH₄ Sensor', count: 12, active: 10, warn: 1, fault: 1, color: 'text-orange-600', bg: 'bg-orange-50' },
              { icon: Droplets, type: standardMode === 'tgo' ? 'N₂O Sensor' : 'N₂O Sensor', count: 8, active: 7, warn: 1, fault: 0, color: 'text-blue-600', bg: 'bg-blue-50' },
              { icon: Wind, type: standardMode === 'tgo' ? 'CO₂ Sensor' : 'CO₂ Flux', count: 15, active: 14, warn: 0, fault: 1, color: 'text-teal-600', bg: 'bg-teal-50' },
              { icon: Activity, type: standardMode === 'tgo' ? 'อุณหภูมิ/ความชื้น' : 'Temp/Humidity', count: 20, active: 19, warn: 1, fault: 0, color: 'text-purple-600', bg: 'bg-purple-50' },
            ].map((sensor) => (
              <div key={sensor.type} className="rounded-lg border p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <div className={`flex h-7 w-7 items-center justify-center rounded ${sensor.bg}`}>
                    <sensor.icon className={`h-3.5 w-3.5 ${sensor.color}`} />
                  </div>
                  <span className="text-xs font-semibold">{sensor.type}</span>
                </div>
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-muted-foreground">Total: {sensor.count}</span>
                  <span className="text-emerald-600 font-medium">Active: {sensor.active}</span>
                </div>
                <div className="flex gap-1.5">
                  {sensor.warn > 0 && <Badge variant="secondary" className="text-[8px] h-4 bg-amber-50 text-amber-700 hover:bg-amber-50">{sensor.warn} warn</Badge>}
                  {sensor.fault > 0 && <Badge variant="secondary" className="text-[8px] h-4 bg-red-50 text-red-700 hover:bg-red-50">{sensor.fault} fault</Badge>}
                  {sensor.warn === 0 && sensor.fault === 0 && <Badge variant="secondary" className="text-[8px] h-4 bg-emerald-50 text-emerald-700 hover:bg-emerald-50">OK</Badge>}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* T-VER Monitoring Reference Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4 text-amber-600" />
            {standardMode === 'tgo' ? 'แนวทางการติดตามตรวจสอบ T-VER' : 'Monitoring Reference'}
          </CardTitle>
          <CardDescription>
            {standardMode === 'tgo'
              ? 'ตามแนวทาง TGO 2566 สำหรับโครงการ T-VER'
              : 'International monitoring standards reference'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {standardMode === 'tgo' ? (
            <div className="space-y-3">
              <div className="flex items-start gap-2 text-sm">
                <Badge variant="secondary" className="text-[10px] h-5 bg-amber-100 text-amber-800 hover:bg-amber-100 shrink-0">TGO 2566</Badge>
                <span>แนวทางการติดตามตรวจสอบ TGO 2566 — กรณีโครงการลดก๊าซเรือนกระจก</span>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <Badge variant="secondary" className="text-[10px] h-5 bg-teal-100 text-teal-800 hover:bg-teal-100 shrink-0">ความถี่</Badge>
                <span>รายงานผลการติดตามทุกเดือน (รายเดือน)</span>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <Badge variant="secondary" className="text-[10px] h-5 bg-emerald-100 text-emerald-800 hover:bg-emerald-100 shrink-0">IoT</Badge>
                <span>เกณฑ์การตรวจสอบ IoT — ต้องมีระบบบันทึกอัตโนมัติอย่างน้อย 95% uptime</span>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <Badge variant="secondary" className="text-[10px] h-5 bg-orange-100 text-orange-800 hover:bg-orange-100 shrink-0">CH₄/N₂O</Badge>
                <span>ต้องติดตั้งเซ็นเซอร์ CH₄ และ N₂O ตามพื้นที่โครงการ ตาม T-VER-P-CC-001, T-VER-P-AG-001</span>
              </div>
              <Separator />
              <div className="text-xs text-muted-foreground">
                อ้างอิง: คู่มือการติดตามตรวจสอบโครงการ T-VER โดยองค์การบริหารจัดการก๊าซเรือนกระจก (TGO) พ.ศ. 2566
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-start gap-2 text-sm">
                <Badge variant="secondary" className="text-[10px] h-5 bg-blue-100 text-blue-800 hover:bg-blue-100 shrink-0">IPCC</Badge>
                <span>IPCC 2006 Guidelines for National Greenhouse Gas Inventories — monitoring and reporting framework</span>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <Badge variant="secondary" className="text-[10px] h-5 bg-emerald-100 text-emerald-800 hover:bg-emerald-100 shrink-0">Verra VCS</Badge>
                <span>Verra VCS Monitoring Report requirements per methodology — annual reporting cycle</span>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <Badge variant="secondary" className="text-[10px] h-5 bg-purple-100 text-purple-800 hover:bg-purple-100 shrink-0">ISO 14064-2</Badge>
                <span>ISO 14064-2 reporting frequency — project-level quantification, monitoring and reporting</span>
              </div>
              <Separator />
              <div className="text-xs text-muted-foreground">
                Reference: IPCC 2006 GL, Verra VCS Standard v4.5, ISO 14064-2:2019
              </div>
            </div>
          )}
        </CardContent>
      </Card>

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
                <Select value={newAlertSeverity} onValueChange={setNewAlertSeverity}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CRITICAL">Critical</SelectItem>
                    <SelectItem value="WARNING">Warning</SelectItem>
                    <SelectItem value="INFO">Info</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea placeholder="Describe the alert condition..." value={newAlertDesc} onChange={(e) => setNewAlertDesc(e.target.value)} rows={2} />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCreateAlert} disabled={creating} className="bg-emerald-600 hover:bg-emerald-700">
                {creating ? 'Creating...' : 'Create'}
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Alert List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{standardMode === 'tgo' ? 'รายการแจ้งเตือน' : 'Alert List'}</CardTitle>
          <CardDescription>
            {standardMode === 'tgo'
              ? `แจ้งเตือนระบบ — วิกฤต ${criticalCount}, เตือน ${warningCount}, ข้อมูล ${infoCount} ที่ยังไม่รับทราบ`
              : `All system alerts — ${criticalCount} critical, ${warningCount} warning, ${infoCount} info unacknowledged`}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="max-h-96">
            <div className="px-6">
              {alerts.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground text-sm">
                  No alerts found. System is healthy.
                </div>
              ) : (
                alerts.map((alert, idx) => {
                  const Icon = severityIcons[alert.severity] || Bell;
                  return (
                    <React.Fragment key={alert.id}>
                      <div className={`flex items-start gap-3 py-3 ${alert.acknowledged ? 'opacity-60' : ''}`}>
                        <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${severityColors[alert.severity] || ''}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium">{alert.message.split(':')[0]}</span>
                            <Badge variant="secondary" className={`text-[10px] h-5 ${severityStyles[alert.severity] || ''}`}>
                              {standardMode === 'tgo'
                                ? (alert.severity === 'CRITICAL' ? 'วิกฤต' : alert.severity === 'WARNING' ? 'เตือน' : 'ข้อมูล')
                                : alert.severity}
                            </Badge>
                            {alert.acknowledged && (
                              <Badge variant="secondary" className="text-[10px] h-5 bg-emerald-50 text-emerald-600 hover:bg-emerald-50">
                                ACK
                              </Badge>
                            )}
                          </div>
                          {alert.message.includes(':') && (
                            <p className="text-xs text-muted-foreground mt-0.5">{alert.message.split(':').slice(1).join(':').trim()}</p>
                          )}
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(alert.timestamp).toLocaleString()}
                          </span>
                        </div>
                        {!alert.acknowledged && (
                          <Button variant="ghost" size="sm" onClick={() => acknowledgeAlert(alert.id)} className="shrink-0 text-xs">
                            {standardMode === 'tgo' ? 'รับทราบ' : 'Acknowledge'}
                          </Button>
                        )}
                      </div>
                      {idx < alerts.length - 1 && <Separator />}
                    </React.Fragment>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
