'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import {
  MapPin, Building2, Factory, Warehouse, Sun, Server,
  Search, X, TrendingUp, Users, DollarSign, Activity, Globe,
  BarChart3, PanelLeftClose, PanelLeft, Menu, Sparkles,
  ArrowUpRight, ChevronDown, Zap, Clock, Radio,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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

export const CATEGORY_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string; bgColor: string; darkBgColor: string; gradient: string }> = {
  office: { label: 'Office', icon: Building2, color: '#f97316', bgColor: 'bg-orange-100', darkBgColor: 'dark:bg-orange-900/30', gradient: 'from-orange-500 to-amber-500' },
  factory: { label: 'Factory', icon: Factory, color: '#8b5cf6', bgColor: 'bg-violet-100', darkBgColor: 'dark:bg-violet-900/30', gradient: 'from-violet-500 to-purple-500' },
  warehouse: { label: 'Warehouse', icon: Warehouse, color: '#06b6d4', bgColor: 'bg-cyan-100', darkBgColor: 'dark:bg-cyan-900/30', gradient: 'from-cyan-500 to-teal-500' },
  renewable: { label: 'Renewable', icon: Sun, color: '#22c55e', bgColor: 'bg-green-100', darkBgColor: 'dark:bg-green-900/30', gradient: 'from-green-500 to-emerald-500' },
  datacenter: { label: 'Data Center', icon: Server, color: '#ec4899', bgColor: 'bg-pink-100', darkBgColor: 'dark:bg-pink-900/30', gradient: 'from-pink-500 to-rose-500' },
};

export const STATUS_CONFIG: Record<string, { label: string; color: string; dotColor: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  active: { label: 'Active', color: 'text-emerald-600', dotColor: 'bg-emerald-500', variant: 'default' },
  inactive: { label: 'Offline', color: 'text-red-500', dotColor: 'bg-red-500', variant: 'destructive' },
  maintenance: { label: 'Maintenance', color: 'text-amber-500', dotColor: 'bg-amber-500', variant: 'secondary' },
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
  const [mapCenter, setMapCenter] = useState<[number, number] | null>(null);
  const [mapZoom, setMapZoom] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

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

  const filteredLocations = useMemo(() => {
    return locations.filter(loc => {
      const matchesSearch = loc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        loc.country.toLowerCase().includes(searchQuery.toLowerCase()) ||
        loc.region.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = activeFilters.length === 0 || activeFilters.includes(loc.category);
      return matchesSearch && matchesFilter;
    });
  }, [locations, searchQuery, activeFilters]);

  const groupedLocations = useMemo(() => {
    const groups: Record<string, Location[]> = {};
    filteredLocations.forEach(loc => {
      if (!groups[loc.region]) groups[loc.region] = [];
      groups[loc.region].push(loc);
    });
    return groups;
  }, [filteredLocations]);

  const toggleFilter = useCallback((category: string) => {
    setActiveFilters(prev =>
      prev.includes(category) ? prev.filter(f => f !== category) : [...prev, category]
    );
  }, []);

  const handleSelectLocation = useCallback((loc: Location) => {
    setSelectedLocation(loc);
    setDetailPanelOpen(true);
    setMapCenter([loc.lat, loc.lng]);
    setMapZoom(8);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setDetailPanelOpen(false);
  }, []);

  const handleResetMap = useCallback(() => {
    setMapCenter([20, 0]);
    setMapZoom(2);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <Globe className="h-14 w-14 text-primary animate-spin" style={{ animationDuration: '3s' }} />
            <Sparkles className="h-5 w-5 text-chart-4 absolute -top-1 -right-1 animate-pulse" />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-foreground">Loading GeoDashboard</p>
            <p className="text-xs text-muted-foreground mt-1">Fetching global operations data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 z-50">
        <div className="flex items-center justify-between px-4 h-12">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="h-8 w-8 md:hidden" onClick={() => setSidebarOpen(!sidebarOpen)}>
              <Menu className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-orange-500 via-pink-500 to-violet-500 flex items-center justify-center shadow-lg shadow-orange-500/20">
                <Globe className="h-4 w-4 text-white" />
              </div>
              <div>
                <h1 className="text-sm font-bold leading-none tracking-tight">GeoDashboard</h1>
                <p className="text-[10px] text-muted-foreground leading-none mt-0.5">Global Operations Center</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="hidden md:flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 px-2.5 py-1 rounded-full">
                    <Radio className="h-3 w-3 text-emerald-500 animate-pulse" />
                    <span>Live</span>
                    <Clock className="h-3 w-3 ml-1" />
                    <span className="font-mono">{currentTime.toLocaleTimeString()}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>Real-time data feed active</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <div className="hidden sm:flex items-center gap-0.5 bg-muted rounded-lg p-0.5">
              <Button variant={activeView === 'map' ? 'default' : 'ghost'} size="sm" className="h-7 text-xs gap-1" onClick={() => setActiveView('map')}>
                <MapPin className="h-3 w-3" /> Map
              </Button>
              <Button variant={activeView === 'analytics' ? 'default' : 'ghost'} size="sm" className="h-7 text-xs gap-1" onClick={() => setActiveView('analytics')}>
                <BarChart3 className="h-3 w-3" /> Analytics
              </Button>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 hidden lg:flex" onClick={() => setSidebarOpen(!sidebarOpen)}>
              {sidebarOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </header>

      {/* Stats Bar */}
      {stats && (
        <div className="border-b bg-background/95 backdrop-blur">
          <div className="flex overflow-x-auto px-4 py-2.5 gap-2.5 scrollbar-none">
            {[
              { icon: MapPin, bg: 'bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/50 dark:to-orange-900/30', iconColor: 'text-orange-600 dark:text-orange-400', label: 'Locations', value: stats.overview.totalLocations, sub: `${stats.overview.activeLocations} active` },
              { icon: Activity, bg: 'bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/50 dark:to-emerald-900/30', iconColor: 'text-emerald-600 dark:text-emerald-400', label: 'Active', value: stats.overview.activeLocations, sub: `${Math.round(stats.overview.activeLocations / stats.overview.totalLocations * 100)}% uptime` },
              { icon: Users, bg: 'bg-gradient-to-br from-violet-50 to-violet-100 dark:from-violet-950/50 dark:to-violet-900/30', iconColor: 'text-violet-600 dark:text-violet-400', label: 'Employees', value: formatNumber(stats.overview.totalEmployees), sub: 'Global workforce' },
              { icon: DollarSign, bg: 'bg-gradient-to-br from-cyan-50 to-cyan-100 dark:from-cyan-950/50 dark:to-cyan-900/30', iconColor: 'text-cyan-600 dark:text-cyan-400', label: 'Revenue', value: formatCurrency(stats.overview.totalRevenue), sub: 'Annual', trend: '+12.4%' },
              { icon: Zap, bg: 'bg-gradient-to-br from-pink-50 to-pink-100 dark:from-pink-950/50 dark:to-pink-900/30', iconColor: 'text-pink-600 dark:text-pink-400', label: 'Performance', value: `${stats.overview.avgPerformance}%`, sub: stats.performanceBuckets.excellent >= 10 ? 'Excellent' : 'Good' },
            ].map((stat) => (
              <Card key={stat.label} className="min-w-[150px] py-2 px-3 shadow-none border-dashed hover:border-solid hover:shadow-sm transition-all duration-200">
                <div className="flex items-center gap-2.5">
                  <div className={`h-9 w-9 rounded-xl ${stat.bg} flex items-center justify-center shrink-0`}>
                    <stat.icon className={`h-4 w-4 ${stat.iconColor}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] text-muted-foreground font-medium">{stat.label}</p>
                    <div className="flex items-center gap-1">
                      <p className="text-lg font-bold leading-none">{stat.value}</p>
                      {stat.trend && (
                        <span className="text-[10px] font-medium text-emerald-500 flex items-center">
                          <ArrowUpRight className="h-2.5 w-2.5" />{stat.trend}
                        </span>
                      )}
                    </div>
                    <p className="text-[9px] text-muted-foreground/70">{stat.sub}</p>
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
          <aside className="w-[300px] border-r bg-background flex flex-col overflow-hidden shrink-0 z-40 max-md:hidden">
            {/* Search */}
            <div className="p-3 space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search locations, countries..." className="pl-9 h-9 text-sm bg-muted/30" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                {searchQuery && (
                  <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6" onClick={() => setSearchQuery('')}>
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
              {/* Category Filters */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Categories</p>
                  {activeFilters.length > 0 && (
                    <Button variant="ghost" size="sm" className="h-5 text-[10px] px-1.5 text-primary" onClick={() => setActiveFilters([])}>
                      Clear all
                    </Button>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(CATEGORY_CONFIG).map(([key, config]) => {
                    const Icon = config.icon;
                    const isActive = activeFilters.includes(key);
                    const count = locations.filter(l => l.category === key).length;
                    return (
                      <Button key={key} variant={isActive ? 'default' : 'outline'} size="sm" className={`h-7 text-xs gap-1.5 ${isActive ? 'shadow-sm' : ''}`} onClick={() => toggleFilter(key)}>
                        <Icon className="h-3 w-3" />
                        {config.label}
                        <Badge variant="secondary" className={`ml-0.5 h-4 min-w-[18px] px-1 text-[10px] ${isActive ? 'bg-primary-foreground/20 text-primary-foreground' : ''}`}>
                          {count}
                        </Badge>
                      </Button>
                    );
                  })}
                </div>
              </div>
            </div>
            <Separator />
            {/* Location List */}
            <div className="flex-1 overflow-hidden flex flex-col">
              <div className="p-3 pb-1 flex items-center justify-between">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  {filteredLocations.length} Location{filteredLocations.length !== 1 ? 's' : ''}
                </p>
                {activeView === 'map' && (
                  <Button variant="ghost" size="sm" className="h-5 text-[10px] px-1.5" onClick={handleResetMap}>
                    Reset view
                  </Button>
                )}
              </div>
              <ScrollArea className="flex-1">
                <div className="p-2 space-y-1">
                  {Object.entries(groupedLocations).map(([region, locs]) => (
                    <div key={region}>
                      <div className="flex items-center gap-2 px-2 py-1.5">
                        <ChevronDown className="h-3 w-3 text-muted-foreground" />
                        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{region}</span>
                        <Badge variant="outline" className="h-4 text-[9px] px-1">{locs.length}</Badge>
                      </div>
                      {locs.map((location) => {
                        const config = CATEGORY_CONFIG[location.category] || CATEGORY_CONFIG.office;
                        const statusConfig = STATUS_CONFIG[location.status] || STATUS_CONFIG.active;
                        const Icon = config.icon;
                        const isSelected = selectedLocation?.id === location.id;
                        return (
                          <button key={location.id} className={`w-full text-left p-2 rounded-lg transition-all duration-150 hover:bg-accent group ${isSelected ? 'bg-accent ring-1 ring-primary/30 shadow-sm' : ''}`}
                            onClick={() => handleSelectLocation(location)}>
                            <div className="flex items-start gap-2.5">
                              <div className={`h-8 w-8 rounded-lg ${config.bgColor} ${config.darkBgColor} flex items-center justify-center shrink-0 mt-0.5`}>
                                <Icon className="h-4 w-4" style={{ color: config.color }} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <p className="text-sm font-medium truncate">{location.name}</p>
                                  <div className={`h-1.5 w-1.5 rounded-full ${statusConfig.dotColor} shrink-0 ${location.status === 'active' ? 'animate-pulse' : ''}`} />
                                </div>
                                <p className="text-[11px] text-muted-foreground truncate">{location.country}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <Progress value={location.value} className="h-1 w-12" />
                                  <span className="text-[10px] text-muted-foreground font-medium">{location.value}%</span>
                                </div>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ))}
                  {filteredLocations.length === 0 && (
                    <div className="text-center py-8">
                      <Search className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">No locations found</p>
                      <p className="text-xs text-muted-foreground/70 mt-1">Try adjusting your search or filters</p>
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
              onSelectLocation={handleSelectLocation}
              mapCenter={mapCenter}
              mapZoom={mapZoom}
              onMapMoved={() => { setMapCenter(null); setMapZoom(null); }}
            />
          ) : (
            <AnalyticsView />
          )}

          {/* Detail Panel */}
          {detailPanelOpen && selectedLocation && (
            <div className="absolute top-0 right-0 h-full w-[340px] max-w-[90vw] bg-background/95 backdrop-blur-xl border-l shadow-2xl z-[1001] overflow-hidden">
              <div className="h-full flex flex-col">
                {/* Panel Header */}
                <div className="p-4 border-b">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      {(() => {
                        const config = CATEGORY_CONFIG[selectedLocation.category] || CATEGORY_CONFIG.office;
                        const Icon = config.icon;
                        return (
                          <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${config.gradient} flex items-center justify-center shrink-0 shadow-lg`}>
                            <Icon className="h-5 w-5 text-white" />
                          </div>
                        );
                      })()}
                      <div>
                        <h3 className="font-bold text-sm">{selectedLocation.name}</h3>
                        <p className="text-xs text-muted-foreground">{selectedLocation.region} · {selectedLocation.country}</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={handleCloseDetail}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <ScrollArea className="flex-1">
                  <div className="p-4 space-y-4">
                    {/* Status Badges */}
                    <div className="flex items-center gap-2">
                      <Badge variant={(STATUS_CONFIG[selectedLocation.status] || STATUS_CONFIG.active).variant} className="gap-1">
                        <div className={`h-1.5 w-1.5 rounded-full ${(STATUS_CONFIG[selectedLocation.status] || STATUS_CONFIG.active).dotColor}`} />
                        {(STATUS_CONFIG[selectedLocation.status] || STATUS_CONFIG.active).label}
                      </Badge>
                      <Badge variant="outline">{(CATEGORY_CONFIG[selectedLocation.category] || CATEGORY_CONFIG.office).label}</Badge>
                    </div>

                    <p className="text-sm text-muted-foreground leading-relaxed">{selectedLocation.description}</p>

                    {/* Performance */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">Performance Score</span>
                        <span className="font-bold text-base" style={{ color: selectedLocation.value >= 80 ? '#22c55e' : selectedLocation.value >= 60 ? '#f97316' : '#ef4444' }}>
                          {selectedLocation.value}%
                        </span>
                      </div>
                      <Progress value={selectedLocation.value} className="h-2.5" />
                      <div className="flex justify-between text-[10px] text-muted-foreground">
                        <span>Poor</span>
                        <span>Fair</span>
                        <span>Good</span>
                        <span>Excellent</span>
                      </div>
                    </div>

                    <Separator />

                    {/* Key Metrics */}
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="bg-gradient-to-br from-violet-50 to-violet-100/50 dark:from-violet-950/30 dark:to-violet-900/20 rounded-xl p-3">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <Users className="h-3 w-3 text-violet-500" />
                          <p className="text-[10px] text-muted-foreground font-medium">Employees</p>
                        </div>
                        <p className="text-xl font-bold">{formatNumber(selectedLocation.employees)}</p>
                      </div>
                      <div className="bg-gradient-to-br from-cyan-50 to-cyan-100/50 dark:from-cyan-950/30 dark:to-cyan-900/20 rounded-xl p-3">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <DollarSign className="h-3 w-3 text-cyan-500" />
                          <p className="text-[10px] text-muted-foreground font-medium">Revenue</p>
                        </div>
                        <p className="text-xl font-bold">{formatCurrency(selectedLocation.revenue)}</p>
                      </div>
                    </div>

                    <Separator />

                    {/* Coordinates */}
                    <div className="space-y-1.5">
                      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Coordinates</p>
                      <div className="bg-muted/50 rounded-lg px-3 py-2 text-xs font-mono flex items-center gap-3">
                        <span>Lat: {selectedLocation.lat.toFixed(4)}°</span>
                        <span>Lng: {selectedLocation.lng.toFixed(4)}°</span>
                      </div>
                    </div>

                    {/* Region Stats */}
                    {stats && (() => {
                      const regionData = stats.byRegion[selectedLocation.region];
                      if (!regionData) return null;
                      return (
                        <>
                          <Separator />
                          <div className="space-y-2.5">
                            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Region: {selectedLocation.region}</p>
                            <div className="space-y-2">
                              {[
                                { label: 'Locations', value: regionData.locations, icon: MapPin },
                                { label: 'Employees', value: formatNumber(regionData.employees), icon: Users },
                                { label: 'Revenue', value: formatCurrency(regionData.revenue), icon: DollarSign },
                              ].map(item => (
                                <div key={item.label} className="flex items-center justify-between">
                                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                    <item.icon className="h-3 w-3" />
                                    {item.label}
                                  </div>
                                  <span className="text-xs font-semibold">{item.value}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </>
                      );
                    })()}

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-2">
                      <Button size="sm" className="flex-1 text-xs h-9 gap-1">
                        <MapPin className="h-3 w-3" /> Focus
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1 text-xs h-9 gap-1" onClick={() => setActiveView('analytics')}>
                        <BarChart3 className="h-3 w-3" /> Analytics
                      </Button>
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
