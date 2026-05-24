'use client';

import { useSyncExternalStore } from 'react';
import { MapPin, List } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CATEGORY_CONFIG, STATUS_CONFIG, formatCurrency, formatNumber, type Location } from './MapDashboard';

// Import Leaflet components
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

// Fix default marker icons
delete (L.Icon.Default.prototype as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface MapViewProps {
  locations: Location[];
  selectedLocation: Location | null;
  onSelectLocation: (loc: Location) => void;
}

const emptySubscribe = () => () => {};
function useMounted() {
  return useSyncExternalStore(emptySubscribe, () => true, () => false);
}

export default function MapView({ locations, selectedLocation, onSelectLocation }: MapViewProps) {
  const mounted = useMounted();

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
        <MapContainer center={[20, 0]} zoom={2} className="h-full w-full" style={{ background: '#1a1a2e' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {locations.map((location) => {
            const statusConfig = STATUS_CONFIG[location.status] || STATUS_CONFIG.active;
            return (
              <Marker key={location.id} position={[location.lat, location.lng]}>
                <Popup maxWidth={280} className="custom-popup">
                  <div className="p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold text-sm leading-tight">{location.name}</h3>
                        <p className="text-xs text-gray-500">{location.region} · {location.country}</p>
                      </div>
                      <Badge variant={statusConfig.variant} className="text-[10px] shrink-0">{statusConfig.label}</Badge>
                    </div>
                    <p className="text-xs text-gray-600">{location.description}</p>
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div className="bg-gray-50 rounded p-1.5">
                        <p className="text-[10px] text-gray-500">Performance</p>
                        <p className="text-sm font-bold">{location.value}%</p>
                      </div>
                      <div className="bg-gray-50 rounded p-1.5">
                        <p className="text-[10px] text-gray-500">Employees</p>
                        <p className="text-sm font-bold">{formatNumber(location.employees)}</p>
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded p-1.5">
                      <p className="text-[10px] text-gray-500">Revenue</p>
                      <p className="text-sm font-bold">{formatCurrency(location.revenue)}</p>
                    </div>
                    <Button variant="outline" size="sm" className="w-full text-xs h-7 mt-1" onClick={() => onSelectLocation(location)}>
                      View Details
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
        <Card className="shadow-lg py-2 px-3">
          <p className="text-[10px] font-medium text-muted-foreground mb-1.5">Categories</p>
          <div className="space-y-1">
            {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
              <div key={key} className="flex items-center gap-2 text-xs">
                <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: config.color }} />
                <span className="text-muted-foreground">{config.label}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Mobile location list */}
      <div className="absolute bottom-0 left-0 right-0 z-[1000] md:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="secondary" className="mx-auto mb-3 shadow-lg text-xs h-8">
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
                    <button key={location.id} className="w-full text-left p-3 rounded-lg hover:bg-accent" onClick={() => onSelectLocation(location)}>
                      <div className="flex items-center gap-2">
                        <div className={`h-8 w-8 rounded-lg ${config.bgColor} ${config.darkBgColor} flex items-center justify-center`}>
                          <Icon className="h-4 w-4" style={{ color: config.color }} />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{location.name}</p>
                          <p className="text-xs text-muted-foreground">{location.region} · {location.country}</p>
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
