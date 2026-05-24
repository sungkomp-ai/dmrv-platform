'use client';

import { useState, useEffect } from 'react';
import {
  BarChart3, TrendingUp, Globe, Users, DollarSign,
  ArrowUpRight, ArrowDownRight, Activity,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, Legend, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, ComposedChart, Line,
} from 'recharts';

const CHART_COLORS = ['#f97316', '#8b5cf6', '#06b6d4', '#22c55e', '#ec4899'];

interface Analytics {
  categoryData: { name: string; value: number; fill: string }[];
  regionData: { region: string; avgPerformance: number; revenue: number; locations: number }[];
  performanceTrend: { month: string; performance: number; target: number }[];
  revenueByCategory: { category: string; revenue: number }[];
  employeeByRegion: { region: string; employees: number }[];
}

function formatNumberLocal(value: number) {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return value.toString();
}

function formatCurrencyLocal(value: number) {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
  return `$${value}`;
}

export default function AnalyticsView() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [statsData, setStatsData] = useState<{
    byCategory: Record<string, { count: number; employees: number; revenue: number; avgValue: number }>;
    performanceBuckets: { excellent: number; good: number; fair: number; poor: number };
    byStatus: Record<string, number>;
  } | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/map/analytics').then(res => res.json()),
      fetch('/api/map/stats').then(res => res.json()),
    ]).then(([analyticsData, statsData]) => {
      setAnalytics(analyticsData);
      setStatsData(statsData);
    }).catch(console.error);
  }, []);

  if (!analytics || !statsData) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <BarChart3 className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2 animate-pulse" />
          <p className="text-sm text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    );
  }

  const tooltipStyle = {
    borderRadius: '12px',
    border: 'none',
    boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
    padding: '10px 14px',
    fontSize: '12px',
  };

  // Prepare radar data from region data
  const radarData = analytics.regionData.map(r => ({
    region: r.region.length > 10 ? r.region.substring(0, 10) + '…' : r.region,
    performance: r.avgPerformance,
    revenue: Math.min(r.revenue * 10, 100),
    locations: Math.min(r.locations * 15, 100),
  }));

  // Prepare status distribution
  const statusData = Object.entries(statsData.byStatus || {}).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
    fill: name === 'active' ? '#22c55e' : name === 'inactive' ? '#ef4444' : '#f59e0b',
  }));

  // Performance buckets
  const perfBuckets = statsData.performanceBuckets || { excellent: 0, good: 0, fair: 0, poor: 0 };
  const totalPerf = perfBuckets.excellent + perfBuckets.good + perfBuckets.fair + perfBuckets.poor;

  return (
    <ScrollArea className="h-full">
      <div className="p-4 md:p-6 space-y-5 max-w-[1400px] mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <BarChart3 className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight">Analytics Overview</h2>
              <p className="text-xs text-muted-foreground">Performance insights across global operations</p>
            </div>
          </div>
          <Badge variant="outline" className="text-xs gap-1">
            <Activity className="h-3 w-3" /> Live Data
          </Badge>
        </div>

        {/* Performance Buckets */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Excellent', count: perfBuckets.excellent, color: '#22c55e', bg: 'bg-green-100 dark:bg-green-900/20', icon: ArrowUpRight },
            { label: 'Good', count: perfBuckets.good, color: '#f97316', bg: 'bg-orange-100 dark:bg-orange-900/20', icon: TrendingUp },
            { label: 'Fair', count: perfBuckets.fair, color: '#eab308', bg: 'bg-yellow-100 dark:bg-yellow-900/20', icon: Activity },
            { label: 'Poor', count: perfBuckets.poor, color: '#ef4444', bg: 'bg-red-100 dark:bg-red-900/20', icon: ArrowDownRight },
          ].map((bucket) => (
            <Card key={bucket.label} className="shadow-none border-dashed">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className={`h-7 w-7 rounded-lg ${bucket.bg} flex items-center justify-center`}>
                    <bucket.icon className="h-3.5 w-3.5" style={{ color: bucket.color }} />
                  </div>
                  <span className="text-2xl font-bold" style={{ color: bucket.color }}>{bucket.count}</span>
                </div>
                <p className="text-xs text-muted-foreground">{bucket.label} Performance</p>
                <Progress
                  value={totalPerf > 0 ? (bucket.count / totalPerf) * 100 : 0}
                  className="h-1 mt-2"
                />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Row 1: Category Pie + Region Bar */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="shadow-none">
            <CardHeader className="pb-2 pt-4 px-5">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Globe className="h-4 w-4 text-muted-foreground" />
                Category Distribution
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={analytics.categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={95}
                      paddingAngle={4}
                      dataKey="value"
                      stroke="none"
                    >
                      {analytics.categoryData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend
                      verticalAlign="bottom"
                      height={36}
                      formatter={(value: string) => <span className="text-xs text-muted-foreground">{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-none">
            <CardHeader className="pb-2 pt-4 px-5">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                Region Performance
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={analytics.regionData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="region" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} domain={[0, 100]} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="avgPerformance" fill="#f97316" radius={[6, 6, 0, 0]} name="Performance %" barSize={32} />
                    <Line type="monotone" dataKey="avgPerformance" stroke="#8b5cf6" strokeWidth={2} dot={false} name="Trend" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Row 2: Performance Trend */}
        <Card className="shadow-none">
          <CardHeader className="pb-2 pt-4 px-5">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              Performance Trend vs Target
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analytics.performanceTrend}>
                  <defs>
                    <linearGradient id="perfGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="targetGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} domain={[60, 100]} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Area type="monotone" dataKey="performance" stroke="#f97316" strokeWidth={2.5} fill="url(#perfGrad)" name="Actual" />
                  <Area type="monotone" dataKey="target" stroke="#8b5cf6" strokeWidth={2} fill="url(#targetGrad)" strokeDasharray="6 3" name="Target" />
                  <Legend />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Row 3: Revenue + Employees + Radar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="shadow-none">
            <CardHeader className="pb-2 pt-4 px-5">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                Revenue by Category
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.revenueByCategory} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="category" tick={{ fontSize: 10 }} width={80} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="revenue" radius={[0, 6, 6, 0]} name="Revenue ($M)" barSize={16}>
                      {analytics.revenueByCategory.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-none">
            <CardHeader className="pb-2 pt-4 px-5">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                Employees by Region
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.employeeByRegion}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="region" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="employees" fill="#22c55e" radius={[6, 6, 0, 0]} name="Employees" barSize={28}>
                      {analytics.employeeByRegion.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} opacity={0.8} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-none">
            <CardHeader className="pb-2 pt-4 px-5">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Globe className="h-4 w-4 text-muted-foreground" />
                Regional Radar
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                    <PolarGrid stroke="var(--border)" />
                    <PolarAngleAxis dataKey="region" tick={{ fontSize: 9 }} />
                    <PolarRadiusAxis tick={{ fontSize: 8 }} />
                    <Radar name="Performance" dataKey="performance" stroke="#f97316" fill="#f97316" fillOpacity={0.2} strokeWidth={2} />
                    <Radar name="Revenue" dataKey="revenue" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.1} strokeWidth={2} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: '10px' }} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Row 4: Status Distribution + Category Comparison */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="shadow-none">
            <CardHeader className="pb-2 pt-4 px-5">
              <CardTitle className="text-sm font-semibold">Status Distribution</CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend
                      verticalAlign="bottom"
                      height={36}
                      formatter={(value: string) => <span className="text-xs text-muted-foreground">{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Category Comparison */}
          <Card className="shadow-none">
            <CardHeader className="pb-2 pt-4 px-5">
              <CardTitle className="text-sm font-semibold">Category Comparison</CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              <div className="space-y-3">
                {Object.entries(statsData.byCategory || {}).map(([category, data], index) => {
                  const color = CHART_COLORS[index % CHART_COLORS.length];
                  const maxRevenue = Math.max(...Object.values(statsData.byCategory || {}).map(d => d.revenue));
                  return (
                    <div key={category} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
                          <span className="text-xs font-medium capitalize">{category}</span>
                          <Badge variant="outline" className="text-[9px] h-4 px-1">{data.count}</Badge>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span>{formatNumberLocal(data.employees)} emp</span>
                          <span className="font-medium text-foreground">{formatCurrencyLocal(data.revenue)}</span>
                        </div>
                      </div>
                      <div className="relative h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="absolute inset-y-0 left-0 rounded-full transition-all"
                          style={{
                            width: `${maxRevenue > 0 ? (data.revenue / maxRevenue) * 100 : 0}%`,
                            backgroundColor: color,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </ScrollArea>
  );
}
