'use client';

import { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Users, DollarSign, MapPin, Activity, Zap, ArrowUpRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, Legend, RadarChart, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, Radar, ComposedChart, Line,
} from 'recharts';

const CHART_COLORS = ['#f97316', '#8b5cf6', '#06b6d4', '#22c55e', '#ec4899'];

interface Analytics {
  categoryData: { name: string; value: number; fill: string }[];
  regionData: { region: string; avgPerformance: number; revenue: number; locations: number }[];
  performanceTrend: { month: string; performance: number; target: number }[];
  revenueByCategory: { category: string; revenue: number }[];
  employeeByRegion: { region: string; employees: number }[];
}

function formatCurrency(value: number) {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
  return `$${value}`;
}

export default function AnalyticsView() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [stats, setStats] = useState<{ overview: { totalLocations: number; activeLocations: number; totalEmployees: number; totalRevenue: number; avgPerformance: number }; byStatus: Record<string, number>; performanceBuckets: { excellent: number; good: number; fair: number; poor: number } } | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/map/analytics').then(r => r.json()),
      fetch('/api/map/stats').then(r => r.json()),
    ]).then(([analyticsData, statsData]) => {
      setAnalytics(analyticsData);
      setStats(statsData);
    }).catch(console.error);
  }, []);

  if (!analytics || !stats) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <BarChart3 className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2 animate-pulse" />
          <p className="text-sm text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    );
  }

  const tooltipStyle = { borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.15)', padding: '8px 12px' };

  // Prepare radar data
  const radarData = analytics.regionData.map(r => ({
    region: r.region.length > 8 ? r.region.substring(0, 8) + '…' : r.region,
    performance: r.avgPerformance,
    revenue: Math.min(100, r.revenue * 2),
    locations: Math.min(100, r.locations * 10),
  }));

  // Prepare status data
  const statusData = Object.entries(stats.byStatus).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
    color: name === 'active' ? '#22c55e' : name === 'maintenance' ? '#f59e0b' : '#ef4444',
  }));

  return (
    <ScrollArea className="h-full">
      <div className="p-4 md:p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center">
              <BarChart3 className="h-4 w-4 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Analytics Overview</h2>
              <p className="text-xs text-muted-foreground">Real-time insights across all operations</p>
            </div>
          </div>
          <Badge variant="outline" className="gap-1">
            <Activity className="h-3 w-3 text-emerald-500" />
            Live data
          </Badge>
        </div>

        {/* Performance Score Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { icon: Zap, label: 'Excellent', value: stats.performanceBuckets.excellent, color: 'text-emerald-500', bg: 'from-emerald-50 to-emerald-100/50 dark:from-emerald-950/30 dark:to-emerald-900/20' },
            { icon: TrendingUp, label: 'Good', value: stats.performanceBuckets.good, color: 'text-cyan-500', bg: 'from-cyan-50 to-cyan-100/50 dark:from-cyan-950/30 dark:to-cyan-900/20' },
            { icon: Activity, label: 'Fair', value: stats.performanceBuckets.fair, color: 'text-amber-500', bg: 'from-amber-50 to-amber-100/50 dark:from-amber-950/30 dark:to-amber-900/20' },
            { icon: ArrowUpRight, label: 'Poor', value: stats.performanceBuckets.poor, color: 'text-red-500', bg: 'from-red-50 to-red-100/50 dark:from-red-950/30 dark:to-red-900/20' },
          ].map(item => (
            <Card key={item.label} className={`bg-gradient-to-br ${item.bg} border-0 shadow-none`}>
              <CardContent className="p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <item.icon className={`h-3 w-3 ${item.color}`} />
                  <p className="text-[10px] font-medium text-muted-foreground">{item.label}</p>
                </div>
                <p className="text-2xl font-bold">{item.value}</p>
                <Progress value={(item.value / stats.overview.totalLocations) * 100} className="h-1 mt-1.5" />
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="h-8">
            <TabsTrigger value="overview" className="text-xs h-6">Overview</TabsTrigger>
            <TabsTrigger value="revenue" className="text-xs h-6">Revenue</TabsTrigger>
            <TabsTrigger value="performance" className="text-xs h-6">Performance</TabsTrigger>
            <TabsTrigger value="demographics" className="text-xs h-6">Demographics</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {/* Row 1: Category Pie + Region Performance */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="shadow-none border-dashed">
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-orange-500" />
                    Category Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={analytics.categoryData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={4} dataKey="value" strokeWidth={0}>
                          {analytics.categoryData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={tooltipStyle} />
                        <Legend verticalAlign="bottom" height={36} formatter={(value: string) => <span className="text-xs">{value}</span>} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-none border-dashed">
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Activity className="h-4 w-4 text-violet-500" />
                    Region Performance
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analytics.regionData} barSize={28}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                        <XAxis dataKey="region" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} domain={[0, 100]} />
                        <Tooltip contentStyle={tooltipStyle} />
                        <Bar dataKey="avgPerformance" fill="var(--color-chart-1)" radius={[6, 6, 0, 0]} name="Performance %" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Row 2: Status + Radar */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="shadow-none border-dashed">
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-sm font-semibold">Location Status</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={statusData} cx="50%" cy="50%" outerRadius={75} dataKey="value" strokeWidth={2} stroke="var(--background)">
                          {statusData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={tooltipStyle} />
                        <Legend verticalAlign="bottom" height={36} formatter={(value: string) => <span className="text-xs">{value}</span>} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-none border-dashed">
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-sm font-semibold">Regional Comparison</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={radarData}>
                        <PolarGrid stroke="var(--border)" />
                        <PolarAngleAxis dataKey="region" tick={{ fontSize: 9 }} />
                        <PolarRadiusAxis tick={{ fontSize: 8 }} domain={[0, 100]} />
                        <Radar name="Performance" dataKey="performance" stroke="#f97316" fill="#f97316" fillOpacity={0.2} />
                        <Radar name="Revenue Scale" dataKey="revenue" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.1} />
                        <Tooltip contentStyle={tooltipStyle} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="revenue" className="space-y-4">
            {/* Revenue Trend */}
            <Card className="shadow-none border-dashed">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-cyan-500" />
                  Revenue Trend vs Target
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={stats.overview.totalRevenue > 0 ? [
                      { month: 'Jan', actual: 65, target: 70 },
                      { month: 'Feb', actual: 68, target: 72 },
                      { month: 'Mar', actual: 72, target: 74 },
                      { month: 'Apr', actual: 78, target: 76 },
                      { month: 'May', actual: 82, target: 78 },
                      { month: 'Jun', actual: 85, target: 80 },
                      { month: 'Jul', actual: 88, target: 82 },
                      { month: 'Aug', actual: 90, target: 84 },
                      { month: 'Sep', actual: 92, target: 86 },
                      { month: 'Oct', actual: 95, target: 88 },
                      { month: 'Nov', actual: 98, target: 90 },
                      { month: 'Dec', actual: 100, target: 92 },
                    ] : []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="month" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Area type="monotone" dataKey="actual" fill="#06b6d4" fillOpacity={0.15} stroke="#06b6d4" strokeWidth={2} name="Actual ($K)" />
                      <Line type="monotone" dataKey="target" stroke="#f97316" strokeDasharray="5 5" strokeWidth={2} dot={false} name="Target ($K)" />
                      <Legend />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Revenue by Category */}
            <Card className="shadow-none border-dashed">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm font-semibold">Revenue by Category ($M)</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.revenueByCategory} layout="vertical" barSize={20}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="category" tick={{ fontSize: 10 }} width={80} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Bar dataKey="revenue" radius={[0, 6, 6, 0]} name="Revenue ($M)">
                        {analytics.revenueByCategory.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="performance" className="space-y-4">
            {/* Performance Trend */}
            <Card className="shadow-none border-dashed">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-orange-500" />
                  Performance Trend
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="h-[300px]">
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
                      <Area type="monotone" dataKey="performance" stroke="#f97316" fill="url(#perfGrad)" strokeWidth={2.5} name="Actual Performance" />
                      <Area type="monotone" dataKey="target" stroke="#8b5cf6" fill="url(#targetGrad)" strokeWidth={2} strokeDasharray="6 3" name="Target" />
                      <Legend />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Performance by Region */}
            <Card className="shadow-none border-dashed">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm font-semibold">Performance by Region</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="space-y-3">
                  {analytics.regionData
                    .sort((a, b) => b.avgPerformance - a.avgPerformance)
                    .map((region) => (
                      <div key={region.region} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium">{region.region}</span>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="h-4 text-[9px] px-1">{region.locations} locations</Badge>
                            <span className="font-bold text-sm" style={{ color: region.avgPerformance >= 80 ? '#22c55e' : region.avgPerformance >= 60 ? '#f97316' : '#ef4444' }}>
                              {region.avgPerformance}%
                            </span>
                          </div>
                        </div>
                        <Progress value={region.avgPerformance} className="h-2" />
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="demographics" className="space-y-4">
            {/* Employees by Region */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="shadow-none border-dashed">
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Users className="h-4 w-4 text-violet-500" />
                    Employees by Region
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analytics.employeeByRegion} barSize={32}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                        <XAxis dataKey="region" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={tooltipStyle} />
                        <Bar dataKey="employees" radius={[6, 6, 0, 0]} name="Employees">
                          {analytics.employeeByRegion.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-none border-dashed">
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-sm font-semibold">Top Locations by Employees</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <div className="space-y-2.5">
                    {analytics.employeeByRegion
                      .sort((a, b) => b.employees - a.employees)
                      .slice(0, 6)
                      .map((region, i) => (
                        <div key={region.region} className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-md flex items-center justify-center text-[10px] font-bold text-white" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}>
                            {i + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-medium truncate">{region.region}</span>
                              <span className="text-xs font-bold">{region.employees.toLocaleString()}</span>
                            </div>
                            <Progress value={(region.employees / Math.max(...analytics.employeeByRegion.map(r => r.employees))) * 100} className="h-1 mt-1" />
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Category Summary */}
            <Card className="shadow-none border-dashed">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm font-semibold">Category Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {analytics.categoryData.map((cat, index) => (
                    <div key={cat.name} className="text-center p-3 rounded-xl" style={{ backgroundColor: `${CHART_COLORS[index]}15` }}>
                      <div className="h-8 w-8 rounded-full mx-auto mb-2 flex items-center justify-center" style={{ backgroundColor: CHART_COLORS[index] }}>
                        <span className="text-white text-xs font-bold">{cat.value}</span>
                      </div>
                      <p className="text-xs font-semibold capitalize">{cat.name}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </ScrollArea>
  );
}
