'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useSyncExternalStore } from 'react';
import { MapPin, List, Navigation, Layers } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CATEGORY_CONFIG, STATUS_CONFIG, formatCurrency, formatNumber, type Location } from './MapDashboard';

// Import Leaflet components
import { MapContainer, TileLayer, Marker, Popup, useMap, CircleMarker } from 'react-leaflet';
import L from 'leaflet';

interface MapViewProps {
  locations: Location[];
  selectedLocation: Location | null;
  onSelectLocation: (loc: Location) => void;
  mapCenter: [number, number] | null;
  mapZoom: number | null;
  onMapMoved: () => void;
}

const emptySubscribe = () => () => {};
function useMounted() {
  return useSyncExternalStore(emptySubscribe, () => true, () => false);
}

// Component to handle fly-to when center changes
function MapFlyTo({ center, zoom, onMoved }: { center: [number, number] | null; zoom: number | null; onMoved: () => void }) {
  const map = useMap();
  const prevCenterRef = useRef<string>('');

  useEffect(() => {
    if (center) {
      const key = `${center[0]}-${center[1]}-${zoom}`;
      if (key !== prevCenterRef.current) {
        prevCenterRef.current = key;
        map.flyTo(center, zoom || 6, { duration: 1.2 });
        setTimeout(onMoved, 1500);
      }
    }
  }, [center, zoom, map, onMoved]);

  return null;
}

// Create custom marker icon based on category
function createCategoryIcon(category: string, isSelected: boolean) {
  const config = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.office;
  const size = isSelected ? 40 : 32;
  const borderWidth = isSelected ? 3 : 2;
  const shadow = isSelected ? 'filter: drop-shadow(0 2px 8px rgba(0,0,0,0.3));' : 'filter: drop-shadow(0 1px 4px rgba(0,0,0,0.2));';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size + 12}" viewBox="0 0 ${size} ${size + 12}">
    <defs>
      <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="1" stdDeviation="2" flood-color="rgba(0,0,0,0.2)"/>
      </filter>
    </defs>
    <path d="M${size / 2} ${size + 10} C${size / 2} ${size + 10} ${size * 0.15} ${size * 0.55} ${size * 0.15} ${size * 0.38} C${size * 0.15} ${size * 0.17} ${size * 0.37} 0 ${size / 2} 0 C${size * 0.63} 0 ${size * 0.85} ${size * 0.17} ${size * 0.85} ${size * 0.38} C${size * 0.85} ${size * 0.55} ${size / 2} ${size + 10} ${size / 2} ${size + 10}Z" 
      fill="${config.color}" stroke="white" stroke-width="${borderWidth}" style="${shadow}"/>
    <circle cx="${size / 2}" cy="${size * 0.35}" r="${size * 0.16}" fill="white" opacity="0.9"/>
  </svg>`;

  return L.divIcon({
    html: svg,
    className: 'custom-marker',
    iconSize: [size, size + 12],
    iconAnchor: [size / 2, size + 12],
    popupAnchor: [0, -(size + 8)],
  });
}

export default function MapView({ locations, selectedLocation, onSelectLocation, mapCenter, mapZoom, onMapMoved }: MapViewProps) {
  const mounted = useMounted();

  const handleMoved = useCallback(() => {
    onMapMoved();
  }, [onMapMoved]);

  if (!mounted) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-muted/30">
        <div className="text-center">
          <MapPin className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2 animate-pulse" />
          <p className="text-sm text-muted-foreground">Loading map...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Map */}
      <div className="absolute inset-0">
        <MapContainer center={[20, 0]} zoom={2} className="h-full w-full" style={{ background: '#1a1a2e' }} zoomControl={false}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapFlyTo center={mapCenter} zoom={mapZoom} onMoved={handleMoved} />

          {/* Zoom control positioned top-left */}
          <div className="leaflet-top leaflet-left" style={{ top: '10px', left: '10px' }}>
            <div className="leaflet-control leaflet-bar" style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <ZoomButton direction="in" />
              <ZoomButton direction="out" />
            </div>
          </div>

          {locations.map((location) => {
            const isSelected = selectedLocation?.id === location.id;
            const statusConfig = STATUS_CONFIG[location.status] || STATUS_CONFIG.active;
            return (
              <Marker 
                key={location.id} 
                position={[location.lat, location.lng]} 
                icon={createCategoryIcon(location.category, isSelected)}
              >
                <Popup maxWidth={280} className="custom-popup" closeButton={true}>
                  <div className="p-3 space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm leading-tight">{location.name}</h3>
                        <p className="text-[11px] text-gray-500 mt-0.5">{location.region} · {location.country}</p>
                      </div>
                      <Badge variant={statusConfig.variant} className="text-[10px] shrink-0 h-5">{statusConfig.label}</Badge>
                    </div>
                    <p className="text-xs text-gray-600 leading-relaxed">{location.description}</p>
                    <div className="grid grid-cols-3 gap-1.5">
                      <div className="bg-gray-50 rounded-lg p-1.5 text-center">
                        <p className="text-[9px] text-gray-500">Performance</p>
                        <p className="text-sm font-bold" style={{ color: location.value >= 80 ? '#22c55e' : location.value >= 60 ? '#f97316' : '#ef4444' }}>{location.value}%</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-1.5 text-center">
                        <p className="text-[9px] text-gray-500">Employees</p>
                        <p className="text-sm font-bold">{formatNumber(location.employees)}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-1.5 text-center">
                        <p className="text-[9px] text-gray-500">Revenue</p>
                        <p className="text-sm font-bold">{formatCurrency(location.revenue)}</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="w-full text-xs h-7 mt-1" onClick={() => onSelectLocation(location)}>
                      View Full Details →
                    </Button>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>

      {/* Map Legend */}
      <div className="absolute top-3 right-3 z-[1000]">
        <Card className="shadow-lg py-2.5 px-3 backdrop-blur-xl bg-background/90 border-border/50">
          <div className="flex items-center gap-1.5 mb-2">
            <Layers className="h-3 w-3 text-muted-foreground" />
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Legend</p>
          </div>
          <div className="space-y-1.5">
            {Object.entries(CATEGORY_CONFIG).map(([key, config]) => {
              const count = locations.filter(l => l.category === key).length;
              return (
                <div key={key} className="flex items-center gap-2 text-xs">
                  <div className="h-3 w-3 rounded-full shadow-sm" style={{ backgroundColor: config.color }} />
                  <span className="text-muted-foreground min-w-[65px]">{config.label}</span>
                  <Badge variant="secondary" className="h-4 text-[9px] px-1">{count}</Badge>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Location count badge */}
      <div className="absolute top-3 left-14 z-[1000]">
        <Card className="shadow-lg py-1.5 px-3 backdrop-blur-xl bg-background/90 border-border/50">
          <div className="flex items-center gap-1.5 text-xs">
            <Navigation className="h-3 w-3 text-primary" />
            <span className="font-medium">{locations.length}</span>
            <span className="text-muted-foreground">locations</span>
          </div>
        </Card>
      </div>

      {/* Mobile location list */}
      <div className="absolute bottom-0 left-0 right-0 z-[1000] md:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="secondary" className="mx-auto mb-3 shadow-lg text-xs h-8 backdrop-blur-xl">
              <List className="h-3 w-3 mr-1" /> {locations.length} Locations
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[60vh]">
            <ScrollArea className="h-full">
              <div className="space-y-1 p-2">
                {locations.map((location) => {
                  const config = CATEGORY_CONFIG[location.category] || CATEGORY_CONFIG.office;
                  const Icon = config.icon;
                  return (
                    <button key={location.id} className="w-full text-left p-3 rounded-lg hover:bg-accent transition-colors" onClick={() => onSelectLocation(location)}>
                      <div className="flex items-center gap-2">
                        <div className={`h-8 w-8 rounded-lg ${config.bgColor} ${config.darkBgColor} flex items-center justify-center`}>
                          <Icon className="h-4 w-4" style={{ color: config.color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{location.name}</p>
                          <p className="text-xs text-muted-foreground">{location.region} · {location.country}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold" style={{ color: location.value >= 80 ? '#22c55e' : '#f97316' }}>{location.value}%</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}

// Zoom button component that uses the map context
function ZoomButton({ direction }: { direction: 'in' | 'out' }) {
  const map = useMap();
  return (
    <button
      className="flex items-center justify-center w-8 h-8 bg-white dark:bg-gray-800 rounded shadow-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-sm font-bold text-gray-700 dark:text-gray-200"
      onClick={() => direction === 'in' ? map.zoomIn() : map.zoomOut()}
    >
      {direction === 'in' ? '+' : '−'}
    </button>
  );
}
