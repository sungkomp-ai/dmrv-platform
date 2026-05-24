'use client';

import React from 'react';
import {
  Leaf,
  FolderKanban,
  Award,
  MapPin,
  ArrowUpRight,
  ArrowDownRight,
  Workflow,
  PlusCircle,
  FileCheck,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

interface StatCardProps {
  title: string;
  value: string;
  change: string;
  trend: 'up' | 'down';
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
}

function StatCard({ title, value, change, trend, icon: Icon, iconBg, iconColor }: StatCardProps) {
  return (
    <Card>
      <CardContent className="p-4 lg:p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold tracking-tight">{value}</p>
            <div className="flex items-center gap-1 text-xs">
              {trend === 'up' ? (
                <ArrowUpRight className="h-3 w-3 text-emerald-600" />
              ) : (
                <ArrowDownRight className="h-3 w-3 text-red-500" />
              )}
              <span className={trend === 'up' ? 'text-emerald-600' : 'text-red-500'}>{change}</span>
              <span className="text-muted-foreground">vs last month</span>
            </div>
          </div>
          <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${iconBg}`}>
            <Icon className={`h-5 w-5 ${iconColor}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

const stats: StatCardProps[] = [
  {
    title: 'Total Projects',
    value: '24',
    change: '+12%',
    trend: 'up',
    icon: FolderKanban,
    iconBg: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
  },
  {
    title: 'Total Credits (tCO2e)',
    value: '156,842',
    change: '+8.3%',
    trend: 'up',
    icon: Leaf,
    iconBg: 'bg-green-50',
    iconColor: 'text-green-600',
  },
  {
    title: 'Active Plots',
    value: '1,247',
    change: '+3.1%',
    trend: 'up',
    icon: MapPin,
    iconBg: 'bg-teal-50',
    iconColor: 'text-teal-600',
  },
  {
    title: 'Certificates',
    value: '89',
    change: '-2.1%',
    trend: 'down',
    icon: Award,
    iconBg: 'bg-amber-50',
    iconColor: 'text-amber-600',
  },
];

interface ActivityItem {
  id: string;
  action: string;
  module: string;
  timestamp: string;
  status: 'success' | 'warning' | 'info' | 'error';
}

const recentActivity: ActivityItem[] = [
  { id: '1', action: 'Workflow completed for Project RICE-001', module: 'Orchestrator', timestamp: '2 min ago', status: 'success' },
  { id: '2', action: 'New satellite data ingested (3 images)', module: 'Ingestion', timestamp: '15 min ago', status: 'info' },
  { id: '3', action: 'T-VER certificate issued #TVER-2024-089', module: 'Certification', timestamp: '1 hr ago', status: 'success' },
  { id: '4', action: 'Low confidence alert on Biochar calculation', module: 'Orchestrator', timestamp: '2 hr ago', status: 'warning' },
  { id: '5', action: 'Credit batch #CB-0456 minted (5,000 tCO2e)', module: 'Marketplace', timestamp: '3 hr ago', status: 'success' },
  { id: '6', action: 'Verification failed for plot P-789', module: 'Verification', timestamp: '4 hr ago', status: 'error' },
  { id: '7', action: 'Soil GHG audit completed — PASSED', module: 'Audit', timestamp: '5 hr ago', status: 'success' },
  { id: '8', action: 'New IoT sensor data stream connected', module: 'Ingestion', timestamp: '6 hr ago', status: 'info' },
  { id: '9', action: 'AWD methodology parameters updated', module: 'Governance', timestamp: '8 hr ago', status: 'info' },
  { id: '10', action: 'Settlement processed for Trade #TR-1234', module: 'Logistics', timestamp: '10 hr ago', status: 'success' },
];

const statusIcon = {
  success: CheckCircle2,
  warning: AlertTriangle,
  info: Info,
  error: AlertTriangle,
};

const statusColor = {
  success: 'text-emerald-600',
  warning: 'text-amber-600',
  info: 'text-slate-500',
  error: 'text-red-600',
};

const badgeVariant = {
  success: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-50',
  warning: 'bg-amber-50 text-amber-700 hover:bg-amber-50',
  info: 'bg-slate-50 text-slate-700 hover:bg-slate-50',
  error: 'bg-red-50 text-red-700 hover:bg-red-50',
};

export default function DashboardView() {
  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-gray-900">Dashboard Overview</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Monitor your dMRV carbon credit platform at a glance
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <StatCard key={stat.title} {...stat} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent Activity */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Recent Activity</CardTitle>
            <CardDescription>Audit log from across all modules</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="max-h-96">
              <div className="px-6">
                {recentActivity.map((item, idx) => {
                  const StatusIcon = statusIcon[item.status];
                  return (
                    <React.Fragment key={item.id}>
                      <div className="flex items-start gap-3 py-3">
                        <StatusIcon className={`mt-0.5 h-4 w-4 shrink-0 ${statusColor[item.status]}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm leading-snug">{item.action}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="secondary" className={`text-[10px] h-5 ${badgeVariant[item.status]}`}>
                              {item.module}
                            </Badge>
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {item.timestamp}
                            </span>
                          </div>
                        </div>
                      </div>
                      {idx < recentActivity.length - 1 && <Separator />}
                    </React.Fragment>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Quick Actions + System Status */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button className="w-full justify-start gap-2 bg-emerald-600 hover:bg-emerald-700" size="sm">
                <Workflow className="h-4 w-4" />
                Run Workflow
              </Button>
              <Button variant="outline" className="w-full justify-start gap-2" size="sm">
                <PlusCircle className="h-4 w-4" />
                New Project
              </Button>
              <Button variant="outline" className="w-full justify-start gap-2" size="sm">
                <FileCheck className="h-4 w-4" />
                Submit for Certification
              </Button>
              <Button variant="outline" className="w-full justify-start gap-2" size="sm">
                <Leaf className="h-4 w-4" />
                Calculate Carbon
              </Button>
            </CardContent>
          </Card>

          {/* System Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">System Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Platform Uptime</span>
                <span className="font-medium text-emerald-600">99.97%</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Active Agents</span>
                <span className="font-medium">3 / 8</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Data Sources</span>
                <span className="font-medium">9 / 13</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Pending Reviews</span>
                <Badge variant="secondary" className="bg-amber-50 text-amber-700 hover:bg-amber-50">
                  4
                </Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Open Alerts</span>
                <Badge variant="secondary" className="bg-red-50 text-red-700 hover:bg-red-50">
                  2
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
