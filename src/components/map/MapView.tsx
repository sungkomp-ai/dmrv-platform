'use client';

import { useEffect, useRef } from 'react';
import { MapPin, List } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CATEGORY_CONFIG, STATUS_CONFIG, formatCurrency, formatNumber, type Location } from './MapDashboard';

import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

interface MapViewProps {
  locations: Location[];
  selectedLocation: Location | null;
  onSelectLocation: (loc: Location) => void;
}

// Custom icon creator using divIcon for colored markers
function createCategoryIcon(category: string, isSelected: boolean = false): L.DivIcon {
  const config = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.office;
  const size = isSelected ? 40 : 32;
  const borderWidth = isSelected ? 3 : 2;
  const shadow = isSelected
    ? '0 0 0 4px rgba(255,255,255,0.6), 0 4px 12px rgba(0,0,0,0.3)'
    : '0 2px 8px rgba(0,0,0,0.25)';
  const scale = isSelected ? 'scale(1.15)' : 'scale(1)';

  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      width: ${size}px;
      height: ${size}px;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg) ${scale};
      background: ${config.color};
      border: ${borderWidth}px solid white;
      box-shadow: ${shadow};
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
      position: relative;
    ">
      <div style="
        transform: rotate(45deg);
        color: white;
        font-size: ${isSelected ? 14 : 12}px;
        font-weight: 700;
        line-height: 1;
      ">${config.label.charAt(0)}</div>
    </div>
    ${isSelected ? `<div style="
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 52px;
      height: 52px;
      border-radius: 50%;
      border: 2px solid ${config.color};
      opacity: 0;
      animation: marker-pulse 1.5s ease-out infinite;
    "></div>` : ''}`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size],
  });
}

// Component to fly to selected location
function FlyToLocation({ location }: { location: Location | null }) {
  const map = useMap();
  const prevLocationRef = useRef<string | null>(null);

  useEffect(() => {
    if (location && location.id !== prevLocationRef.current) {
      prevLocationRef.current = location.id;
      map.flyTo([location.lat, location.lng], 6, {
        duration: 1.2,
        easeLinearity: 0.25,
      });
    }
  }, [location, map]);

  return null;
}

export default function MapView({ locations, selectedLocation, onSelectLocation }: MapViewProps) {
  return (
    <>
      {/* Map */}
      <div className="absolute inset-0">
        <MapContainer
          center={[25, 10]}
          zoom={3}
          minZoom={2}
          maxZoom={18}
          className="h-full w-full"
          style={{ background: '#1a1a2e' }}
          zoomControl={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <FlyToLocation location={selectedLocation} />

          {locations.map((location) => {
            const isSelected = selectedLocation?.id === location.id;
            const statusConfig = STATUS_CONFIG[location.status] || STATUS_CONFIG.active;
            const config = CATEGORY_CONFIG[location.category] || CATEGORY_CONFIG.office;
            const Icon = config.icon;

            return (
              <Marker
                key={location.id}
                position={[location.lat, location.lng]}
                icon={createCategoryIcon(location.category, isSelected)}
                eventHandlers={{
                  click: () => onSelectLocation(location),
                }}
              >
                <Popup maxWidth={300} className="custom-popup">
                  <div className="p-3 space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div
                          className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0"
                          style={{ backgroundColor: config.color + '20', color: config.color }}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-sm leading-tight">{location.name}</h3>
                          <p className="text-xs text-gray-500">{location.region} · {location.country}</p>
                        </div>
                      </div>
                      <Badge variant={statusConfig.variant} className="text-[10px] shrink-0">{statusConfig.label}</Badge>
                    </div>
                    <p className="text-xs text-gray-600 leading-relaxed">{location.description}</p>
                    <div className="grid grid-cols-3 gap-2 pt-1">
                      <div className="bg-gray-50 rounded-lg p-2 text-center">
                        <p className="text-[10px] text-gray-500 mb-0.5">Performance</p>
                        <p className="text-sm font-bold" style={{ color: location.value >= 80 ? '#22c55e' : location.value >= 60 ? '#f97316' : '#ef4444' }}>
                          {location.value}%
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-2 text-center">
                        <p className="text-[10px] text-gray-500 mb-0.5">Employees</p>
                        <p className="text-sm font-bold">{formatNumber(location.employees)}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-2 text-center">
                        <p className="text-[10px] text-gray-500 mb-0.5">Revenue</p>
                        <p className="text-sm font-bold">{formatCurrency(location.revenue)}</p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs h-8 mt-1 border-dashed hover:bg-accent"
                      onClick={() => onSelectLocation(location)}
                    >
                      <MapPin className="h-3 w-3 mr-1" /> View Full Details
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
        <Card className="shadow-lg py-2.5 px-3.5 backdrop-blur-sm bg-background/90">
          <p className="text-[10px] font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Categories</p>
          <div className="space-y-1.5">
            {Object.entries(CATEGORY_CONFIG).map(([key, config]) => {
              const count = locations.filter(l => l.category === key).length;
              return (
                <div key={key} className="flex items-center gap-2 text-xs">
                  <div className="h-3 w-3 rounded-full shrink-0 ring-1 ring-white/20" style={{ backgroundColor: config.color }} />
                  <span className="text-muted-foreground flex-1">{config.label}</span>
                  <span className="text-[10px] font-mono text-muted-foreground/70">{count}</span>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Mobile location list */}
      <div className="absolute bottom-0 left-0 right-0 z-[1000] md:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="secondary" className="mx-auto mb-3 shadow-lg text-xs h-9 gap-2 backdrop-blur-sm">
              <MapPin className="h-3.5 w-3.5" /> {locations.length} Locations
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[60vh]">
            <ScrollArea className="h-full">
              <div className="space-y-1 p-2">
                {locations.map((location) => {
                  const config = CATEGORY_CONFIG[location.category] || CATEGORY_CONFIG.office;
                  const Icon = config.icon;
                  return (
                    <button
                      key={location.id}
                      className="w-full text-left p-3 rounded-lg hover:bg-accent transition-colors"
                      onClick={() => onSelectLocation(location)}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0"
                          style={{ backgroundColor: config.color + '20', color: config.color }}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{location.name}</p>
                          <p className="text-xs text-muted-foreground">{location.region} · {location.country}</p>
                        </div>
                        <Badge variant="outline" className="text-[10px] shrink-0">
                          {location.value}%
                        </Badge>
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
