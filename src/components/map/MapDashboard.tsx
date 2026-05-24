'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import {
  MapPin, Building2, Factory, Warehouse, Sun, Server,
  Search, X, TrendingUp, Users, DollarSign, Activity, Globe,
  BarChart3, PanelLeftClose, PanelLeft, Menu, Sparkles,
  ArrowUpRight,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

// Lazy load heavy dependencies
const MapView = dynamic(() => import('./MapView'), { ssr: false });
const AnalyticsView = dynamic(() => import('./AnalyticsView'), { ssr: false });

interface Location {
  id: string;
  name: string;
  category: string;
  lat: number;
  lng: number;
  description: string;
  status: string;
  value: number;
  region: string;
  country: string;
  employees: number;
  revenue: number;
  createdAt: string;
  updatedAt: string;
}

interface Stats {
  overview: {
    totalLocations: number;
    activeLocations: number;
    totalEmployees: number;
    totalRevenue: number;
    avgPerformance: number;
    inactiveLocations: number;
  };
  byCategory: Record<string, { count: number; employees: number; revenue: number; avgValue: number; totalValue: number }>;
  byRegion: Record<string, { count: number; employees: number; revenue: number; locations: number }>;
  byStatus: Record<string, number>;
  performanceBuckets: { excellent: number; good: number; fair: number; poor: number };
  revenueTrend: { month: string; revenue: number; target: number }[];
}

export const CATEGORY_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string; bgColor: string; darkBgColor: string }> = {
  office: { label: 'Office', icon: Building2, color: '#f97316', bgColor: 'bg-orange-100', darkBgColor: 'dark:bg-orange-900/30' },
  factory: { label: 'Factory', icon: Factory, color: '#8b5cf6', bgColor: 'bg-violet-100', darkBgColor: 'dark:bg-violet-900/30' },
  warehouse: { label: 'Warehouse', icon: Warehouse, color: '#06b6d4', bgColor: 'bg-cyan-100', darkBgColor: 'dark:bg-cyan-900/30' },
  renewable: { label: 'Renewable', icon: Sun, color: '#22c55e', bgColor: 'bg-green-100', darkBgColor: 'dark:bg-green-900/30' },
  datacenter: { label: 'Data Center', icon: Server, color: '#ec4899', bgColor: 'bg-pink-100', darkBgColor: 'dark:bg-pink-900/30' },
};

export const STATUS_CONFIG: Record<string, { label: string; color: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  active: { label: 'Active', color: 'text-green-600', variant: 'default' },
  inactive: { label: 'Inactive', color: 'text-red-500', variant: 'destructive' },
  maintenance: { label: 'Maintenance', color: 'text-amber-500', variant: 'secondary' },
};

export function formatCurrency(value: number) {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
  return `$${value}`;
}

export function formatNumber(value: number) {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return value.toString();
}

export type { Location, Stats };

export default function MapDashboard() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [detailPanelOpen, setDetailPanelOpen] = useState(false);
  const [activeView, setActiveView] = useState<'map' | 'analytics'>('map');

  useEffect(() => {
    async function fetchData() {
      try {
        const [locRes, statsRes] = await Promise.all([
          fetch('/api/map/locations'),
          fetch('/api/map/stats'),
        ]);
        const locData = await locRes.json();
        const statsData = await statsRes.json();
        setLocations(locData.locations || []);
        setStats(statsData);
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const filteredLocations = locations.filter(loc => {
    const matchesSearch = loc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      loc.country.toLowerCase().includes(searchQuery.toLowerCase()) ||
      loc.region.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = activeFilters.length === 0 || activeFilters.includes(loc.category);
    return matchesSearch && matchesFilter;
  });

  const toggleFilter = useCallback((category: string) => {
    setActiveFilters(prev =>
      prev.includes(category) ? prev.filter(f => f !== category) : [...prev, category]
    );
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <Globe className="h-12 w-12 text-primary animate-spin" style={{ animationDuration: '3s' }} />
            <Sparkles className="h-5 w-5 text-chart-4 absolute -top-1 -right-1 animate-pulse" />
          </div>
          <p className="text-muted-foreground text-sm font-medium">Loading map dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="h-8 w-8 md:hidden" onClick={() => setSidebarOpen(!sidebarOpen)}>
              <Menu className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center">
                <Globe className="h-4 w-4 text-white" />
              </div>
              <div>
                <h1 className="text-sm font-bold leading-none">GeoDashboard</h1>
                <p className="text-[10px] text-muted-foreground leading-none mt-0.5">Global Operations Overview</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1 bg-muted rounded-lg p-0.5">
              <Button variant={activeView === 'map' ? 'default' : 'ghost'} size="sm" className="h-7 text-xs" onClick={() => setActiveView('map')}>
                <MapPin className="h-3 w-3 mr-1" /> Map
              </Button>
              <Button variant={activeView === 'analytics' ? 'default' : 'ghost'} size="sm" className="h-7 text-xs" onClick={() => setActiveView('analytics')}>
                <BarChart3 className="h-3 w-3 mr-1" /> Analytics
              </Button>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 hidden md:flex" onClick={() => setSidebarOpen(!sidebarOpen)}>
              {sidebarOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </header>

      {/* Stats Bar */}
      {stats && (
        <div className="border-b bg-background/95 backdrop-blur">
          <div className="flex overflow-x-auto px-4 py-3 gap-3 scrollbar-none">
            {[
              { icon: MapPin, bg: 'bg-orange-100 dark:bg-orange-900/30', iconColor: 'text-orange-600 dark:text-orange-400', label: 'Locations', value: stats.overview.totalLocations },
              { icon: Activity, bg: 'bg-green-100 dark:bg-green-900/30', iconColor: 'text-green-600 dark:text-green-400', label: 'Active', value: stats.overview.activeLocations, arrow: true },
              { icon: Users, bg: 'bg-violet-100 dark:bg-violet-900/30', iconColor: 'text-violet-600 dark:text-violet-400', label: 'Employees', value: formatNumber(stats.overview.totalEmployees) },
              { icon: DollarSign, bg: 'bg-cyan-100 dark:bg-cyan-900/30', iconColor: 'text-cyan-600 dark:text-cyan-400', label: 'Revenue', value: formatCurrency(stats.overview.totalRevenue), trend: true },
              { icon: TrendingUp, bg: 'bg-pink-100 dark:bg-pink-900/30', iconColor: 'text-pink-600 dark:text-pink-400', label: 'Performance', value: `${stats.overview.avgPerformance}%` },
            ].map((stat, i) => (
              <Card key={stat.label} className="min-w-[160px] py-2 px-3 shadow-none border-dashed">
                <div className="flex items-center gap-2">
                  <div className={`h-8 w-8 rounded-lg ${stat.bg} flex items-center justify-center`}>
                    <stat.icon className={`h-4 w-4 ${stat.iconColor}`} />
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground font-medium">{stat.label}</p>
                    <div className="flex items-center gap-1">
                      <p className="text-lg font-bold leading-none">{stat.value}</p>
                      {stat.arrow && <ArrowUpRight className="h-3 w-3 text-green-500" />}
                      {stat.trend && <TrendingUp className="h-3 w-3 text-green-500" />}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex relative overflow-hidden">
        {/* Sidebar */}
        {sidebarOpen && (
          <aside className="w-[320px] border-r bg-background flex flex-col overflow-hidden shrink-0 z-40 max-md:hidden">
            {/* Search */}
            <div className="p-3 space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search locations..." className="pl-9 h-9 text-sm" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                {searchQuery && (
                  <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6" onClick={() => setSearchQuery('')}>
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
              {/* Category Filters */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-muted-foreground">Filter by Category</p>
                  {activeFilters.length > 0 && (
                    <Button variant="ghost" size="sm" className="h-5 text-[10px] px-1" onClick={() => setActiveFilters([])}>Clear</Button>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(CATEGORY_CONFIG).map(([key, config]) => {
                    const Icon = config.icon;
                    const isActive = activeFilters.includes(key);
                    return (
                      <Button key={key} variant={isActive ? 'default' : 'outline'} size="sm" className={`h-7 text-xs gap-1.5`} onClick={() => toggleFilter(key)}>
                        <Icon className="h-3 w-3" />
                        {config.label}
                        <Badge variant="secondary" className="ml-0.5 h-4 min-w-[18px] px-1 text-[10px]">
                          {locations.filter(l => l.category === key).length}
                        </Badge>
                      </Button>
                    );
                  })}
                </div>
              </div>
            </div>
            <Separator />
            {/* Location List */}
            <div className="flex-1 overflow-hidden">
              <div className="p-3 pb-1">
                <p className="text-xs font-medium text-muted-foreground">
                  {filteredLocations.length} location{filteredLocations.length !== 1 ? 's' : ''}
                </p>
              </div>
              <ScrollArea className="h-[calc(100%-32px)]">
                <div className="p-2 space-y-1">
                  {filteredLocations.map((location) => {
                    const config = CATEGORY_CONFIG[location.category] || CATEGORY_CONFIG.office;
                    const statusConfig = STATUS_CONFIG[location.status] || STATUS_CONFIG.active;
                    const Icon = config.icon;
                    const isSelected = selectedLocation?.id === location.id;
                    return (
                      <button key={location.id} className={`w-full text-left p-2.5 rounded-lg transition-all hover:bg-accent group ${isSelected ? 'bg-accent ring-1 ring-primary/20' : ''}`}
                        onClick={() => { setSelectedLocation(location); setDetailPanelOpen(true); }}>
                        <div className="flex items-start gap-2.5">
                          <div className={`h-8 w-8 rounded-lg ${config.bgColor} ${config.darkBgColor} flex items-center justify-center shrink-0 mt-0.5`}>
                            <Icon className="h-4 w-4" style={{ color: config.color }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{location.name}</p>
                            <p className="text-[11px] text-muted-foreground truncate">{location.region} · {location.country}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant={statusConfig.variant} className="h-4 text-[9px] px-1.5">{statusConfig.label}</Badge>
                              <div className="flex items-center gap-1">
                                <Progress value={location.value} className="h-1 w-12" />
                                <span className="text-[10px] text-muted-foreground">{location.value}%</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                  {filteredLocations.length === 0 && (
                    <div className="text-center py-8">
                      <Search className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">No locations found</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          </aside>
        )}

        {/* Map / Analytics View */}
        <div className="flex-1 relative">
          {activeView === 'map' ? (
            <MapView
              locations={filteredLocations}
              selectedLocation={selectedLocation}
              onSelectLocation={(loc) => { setSelectedLocation(loc); setDetailPanelOpen(true); }}
            />
          ) : (
            <AnalyticsView />
          )}

          {/* Detail Panel */}
          {detailPanelOpen && selectedLocation && (
            <div className="absolute top-0 right-0 h-full w-[360px] max-w-[90vw] bg-background border-l shadow-xl z-[1001] overflow-hidden">
              <div className="h-full flex flex-col">
                <div className="p-4 border-b">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      {(() => {
                        const config = CATEGORY_CONFIG[selectedLocation.category] || CATEGORY_CONFIG.office;
                        const Icon = config.icon;
                        return (
                          <div className={`h-10 w-10 rounded-xl ${config.bgColor} ${config.darkBgColor} flex items-center justify-center shrink-0`}>
                            <Icon className="h-5 w-5" style={{ color: config.color }} />
                          </div>
                        );
                      })()}
                      <div>
                        <h3 className="font-bold text-base">{selectedLocation.name}</h3>
                        <p className="text-xs text-muted-foreground">{selectedLocation.region} · {selectedLocation.country}</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setDetailPanelOpen(false)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <ScrollArea className="flex-1">
                  <div className="p-4 space-y-4">
                    <div className="flex items-center gap-2">
                      <Badge variant={(STATUS_CONFIG[selectedLocation.status] || STATUS_CONFIG.active).variant}>
                        {(STATUS_CONFIG[selectedLocation.status] || STATUS_CONFIG.active).label}
                      </Badge>
                      <Badge variant="outline">{(CATEGORY_CONFIG[selectedLocation.category] || CATEGORY_CONFIG.office).label}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{selectedLocation.description}</p>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">Performance Score</span>
                        <span className="font-bold" style={{ color: selectedLocation.value >= 80 ? '#22c55e' : selectedLocation.value >= 60 ? '#f97316' : '#ef4444' }}>
                          {selectedLocation.value}%
                        </span>
                      </div>
                      <Progress value={selectedLocation.value} className="h-2" />
                    </div>
                    <Separator />
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-muted/50 rounded-lg p-3">
                        <div className="flex items-center gap-1.5 mb-1">
                          <Users className="h-3 w-3 text-muted-foreground" />
                          <p className="text-[10px] text-muted-foreground font-medium">Employees</p>
                        </div>
                        <p className="text-xl font-bold">{formatNumber(selectedLocation.employees)}</p>
                      </div>
                      <div className="bg-muted/50 rounded-lg p-3">
                        <div className="flex items-center gap-1.5 mb-1">
                          <DollarSign className="h-3 w-3 text-muted-foreground" />
                          <p className="text-[10px] text-muted-foreground font-medium">Revenue</p>
                        </div>
                        <p className="text-xl font-bold">{formatCurrency(selectedLocation.revenue)}</p>
                      </div>
                    </div>
                    <Separator />
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">Coordinates</p>
                      <div className="bg-muted/50 rounded px-2 py-1 text-xs font-mono">
                        {selectedLocation.lat.toFixed(4)}°, {selectedLocation.lng.toFixed(4)}°
                      </div>
                    </div>
                    {stats && (() => {
                      const regionData = stats.byRegion[selectedLocation.region];
                      if (!regionData) return null;
                      return (
                        <>
                          <Separator />
                          <div className="space-y-2">
                            <p className="text-xs font-medium text-muted-foreground">Region: {selectedLocation.region}</p>
                            <div className="space-y-1.5">
                              <div className="flex justify-between text-xs"><span className="text-muted-foreground">Locations</span><span className="font-medium">{regionData.locations}</span></div>
                              <div className="flex justify-between text-xs"><span className="text-muted-foreground">Employees</span><span className="font-medium">{formatNumber(regionData.employees)}</span></div>
                              <div className="flex justify-between text-xs"><span className="text-muted-foreground">Revenue</span><span className="font-medium">{formatCurrency(regionData.revenue)}</span></div>
                            </div>
                          </div>
                        </>
                      );
                    })()}
                    <div className="flex gap-2 pt-2">
                      <Button className="flex-1 text-xs h-9"><MapPin className="h-3 w-3 mr-1" />Focus on Map</Button>
                      <Button variant="outline" className="flex-1 text-xs h-9"><BarChart3 className="h-3 w-3 mr-1" />View Analytics</Button>
                    </div>
                  </div>
                </ScrollArea>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
