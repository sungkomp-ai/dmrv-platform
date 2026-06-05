'use client';

import React, { useState, useEffect, useRef, useCallback, useSyncExternalStore } from 'react';
import L from 'leaflet';

// ─── Types ──────────────────────────────────────────────────────────
interface AWDFieldMapData {
  id: string;
  name: string;
  nameTh: string;
  province: string;
  lat: number;
  lng: number;
  areaHa: number;
  soilType: string;
  waterSource: string;
  riceVariety: string;
  boundary: number[][];
  currentDAP: number;
  totalDays: number;
  waterLevelCm: number;
  currentAWDPhase: string;
  awdCycles: number;
  growthStage: string;
  cumulativeCH4g: number;
  cumulativeN2Og: number;
  estimatedYieldKg: number;
  seasonComplete: boolean;
}

interface AWDReading {
  tick: number;
  fieldId: string;
  waterLevelCm: number;
  airTempC: number;
  soilMoisturePct: number;
  ch4FluxMgM2Hr: number;
  n2oFluxMgM2Hr: number;
  emissionReductionPct: number;
}

interface AwdFieldMapProps {
  fields: AWDFieldMapData[];
  latestReadings: Record<string, AWDReading | null>;
  selectedFieldId: string | null;
  onFieldSelect: (fieldId: string) => void;
  standardMode: 'international' | 'tgo';
}

// ─── Config ─────────────────────────────────────────────────────────
const FIELD_COLORS: Record<string, { fill: string; stroke: string; label: string }> = {
  'awd-korat': { fill: '#10b981', stroke: '#059669', label: 'Korat' },
  'awd-suphan': { fill: '#3b82f6', stroke: '#2563eb', label: 'Suphan' },
  'awd-ubon': { fill: '#f59e0b', stroke: '#d97706', label: 'Ubon' },
};

const AWD_PHASE_COLORS: Record<string, string> = {
  FLOODED: '#3b82f6',
  DRAINING: '#f59e0b',
  DRY: '#ef4444',
  REFLOODING: '#06b6d4',
};

const GROWTH_STAGE_EMOJI: Record<string, string> = {
  GERMINATION: '🌱', TILLERING: '🌿', STEM_ELONGATION: '🎋',
  BOOTING: '🎍', FLOWERING: '🌸', GRAIN_FILLING: '🌾',
  MATURITY: '🏞️', HARVESTED: '✅',
};

const SATELLITE_URL = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const STREET_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const SATELLITE_LABELS_URL = 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}';

const emptySubscribe = () => () => {};
function useMounted() {
  return useSyncExternalStore(emptySubscribe, () => true, () => false);
}

export default function AwdFieldMap({
  fields, latestReadings, selectedFieldId, onFieldSelect, standardMode,
}: AwdFieldMapProps) {
  const mounted = useMounted();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const labelLayerRef = useRef<L.TileLayer | null>(null);
  const fieldGroupRef = useRef<L.LayerGroup | null>(null);
  const markerGroupRef = useRef<L.LayerGroup | null>(null);
  const prevFieldsJson = useRef<string>('');
  const [isSatellite, setIsSatellite] = useState(true);

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [14.8, 102.5],
      zoom: 7,
      zoomControl: false,
    });

    L.control.zoom({ position: 'topright' }).addTo(map);

    tileLayerRef.current = L.tileLayer(SATELLITE_URL, {
      attribution: '© Esri',
      maxZoom: 19,
    }).addTo(map);

    labelLayerRef.current = L.tileLayer(SATELLITE_LABELS_URL, {
      maxZoom: 19,
    }).addTo(map);

    fieldGroupRef.current = L.layerGroup().addTo(map);
    markerGroupRef.current = L.layerGroup().addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Toggle satellite/street
  useEffect(() => {
    if (!mapRef.current || !tileLayerRef.current) return;

    mapRef.current.removeLayer(tileLayerRef.current);
    if (labelLayerRef.current) mapRef.current.removeLayer(labelLayerRef.current);

    if (isSatellite) {
      tileLayerRef.current = L.tileLayer(SATELLITE_URL, {
        attribution: '© Esri',
        maxZoom: 19,
      }).addTo(mapRef.current);
      labelLayerRef.current = L.tileLayer(SATELLITE_LABELS_URL, {
        maxZoom: 19,
      }).addTo(mapRef.current);
    } else {
      tileLayerRef.current = L.tileLayer(STREET_URL, {
        attribution: '© OpenStreetMap',
        maxZoom: 19,
      }).addTo(mapRef.current);
      labelLayerRef.current = null;
    }
  }, [isSatellite]);

  // Update fields on map
  useEffect(() => {
    if (!fieldGroupRef.current || !markerGroupRef.current) return;

    const fieldsJson = JSON.stringify(fields.map(f => ({
      id: f.id, boundary: f.boundary, waterLevelCm: f.waterLevelCm,
      awdPhase: f.currentAWDPhase, dap: f.currentDAP, cycles: f.awdCycles,
      growthStage: f.growthStage, seasonComplete: f.seasonComplete,
      areaHa: f.areaHa,
      selected: f.id === selectedFieldId,
      standardMode,
    })));

    if (fieldsJson === prevFieldsJson.current) return;
    prevFieldsJson.current = fieldsJson;

    fieldGroupRef.current.clearLayers();
    markerGroupRef.current.clearLayers();

    fields.forEach(field => {
      const cfg = FIELD_COLORS[field.id] || FIELD_COLORS['awd-korat'];
      const phaseColor = AWD_PHASE_COLORS[field.currentAWDPhase] || '#6b7280';
      const isSelected = field.id === selectedFieldId;
      const reading = latestReadings[field.id];

      // Draw boundary polygon
      if (field.boundary && field.boundary.length >= 3) {
        const latLngs: L.LatLngExpression[] = field.boundary.map(
          (c: number[]) => [c[0], c[1]] as L.LatLngExpression
        );

        const waterFillOpacity = field.currentAWDPhase === 'FLOODED' ? 0.35 :
                                field.currentAWDPhase === 'DRAINING' ? 0.25 :
                                field.currentAWDPhase === 'DRY' ? 0.15 : 0.30;

        const polygon = L.polygon(latLngs, {
          color: isSelected ? phaseColor : cfg.stroke,
          weight: isSelected ? 3.5 : 2,
          opacity: 0.9,
          fillColor: field.currentAWDPhase === 'DRY' ? cfg.fill : phaseColor,
          fillOpacity: waterFillOpacity,
          dashArray: field.currentAWDPhase === 'DRY' ? '8, 4' : '',
        });

        const emoji = GROWTH_STAGE_EMOJI[field.growthStage] || '🌱';
        const progress = Math.min((field.currentDAP / field.totalDays) * 100, 100);

        polygon.bindPopup(`
          <div style="min-width: 260px; font-family: system-ui;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
              <span style="font-size: 24px;">${emoji}</span>
              <div>
                <h4 style="font-size: 14px; font-weight: 700; margin: 0; color: #1f2937;">${field.nameTh || field.name}</h4>
                <p style="font-size: 11px; color: #6b7280; margin: 0;">${field.province} · ${standardMode === 'tgo' ? `${(field.areaHa * 6.25).toLocaleString(undefined, {maximumFractionDigits: 1})} ไร่` : `${field.areaHa} ha`}</p>
              </div>
            </div>
            <div style="display: flex; gap: 4px; flex-wrap: wrap; margin-bottom: 8px;">
              <span style="background: ${phaseColor}20; color: ${phaseColor}; padding: 2px 10px; border-radius: 99px; font-size: 10px; font-weight: 600;">${field.currentAWDPhase}</span>
              <span style="background: #f3f4f6; color: #374151; padding: 2px 10px; border-radius: 99px; font-size: 10px;">DAP ${field.currentDAP}/${field.totalDays}</span>
              ${field.seasonComplete ? '<span style="background: #ecfdf5; color: #047857; padding: 2px 10px; border-radius: 99px; font-size: 10px;">✅ Complete</span>' : ''}
            </div>
            <div style="background: #f9fafb; border-radius: 8px; padding: 8px; margin-bottom: 8px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                <span style="font-size: 10px; color: #6b7280;">Growth Progress</span>
                <span style="font-size: 10px; font-weight: 600; color: #1f2937;">${progress.toFixed(0)}%</span>
              </div>
              <div style="background: #e5e7eb; border-radius: 99px; height: 6px; overflow: hidden;">
                <div style="background: ${cfg.fill}; height: 100%; border-radius: 99px; width: ${progress}%;"></div>
              </div>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; font-size: 12px;">
              <div style="background: #eff6ff; padding: 6px; border-radius: 6px; text-align: center;">
                <div style="color: #1d4ed8; font-size: 10px;">Water Level</div>
                <div style="font-weight: 700; color: #1d4ed8;">${field.waterLevelCm} cm</div>
              </div>
              <div style="background: #fef3c7; padding: 6px; border-radius: 6px; text-align: center;">
                <div style="color: #92400e; font-size: 10px;">Air Temp</div>
                <div style="font-weight: 700; color: #92400e;">${reading?.airTempC?.toFixed(1) ?? '--'}°C</div>
              </div>
              <div style="background: ${standardMode === 'tgo' ? '#ecfdf5' : '#f0fdf4'}; padding: 6px; border-radius: 6px; text-align: center;">
                <div style="color: ${standardMode === 'tgo' ? '#047857' : '#15803d'}; font-size: 10px;">${standardMode === 'tgo' ? 'CH₄ (T-VER)' : 'CH₄ Flux'}</div>
                <div style="font-weight: 700; color: ${standardMode === 'tgo' ? '#047857' : '#15803d'};">${standardMode === 'tgo' ? (reading?.ch4FluxMgM2Hr ? (reading.ch4FluxMgM2Hr * 0.24).toFixed(3) : '--') : (reading?.ch4FluxMgM2Hr?.toFixed(1) ?? '--')} ${standardMode === 'tgo' ? 'kg/ha/d' : 'mg/m²hr'}</div>
              </div>
              <div style="background: ${standardMode === 'tgo' ? '#fffbeb' : '#f0fdf4'}; padding: 6px; border-radius: 6px; text-align: center;">
                <div style="color: ${standardMode === 'tgo' ? '#92400e' : '#15803d'}; font-size: 10px;">${standardMode === 'tgo' ? 'Area (ไร่)' : 'CH₄ Reduction'}</div>
                <div style="font-weight: 700; color: ${standardMode === 'tgo' ? '#92400e' : '#15803d'};">${standardMode === 'tgo' ? `${(field.areaHa * 6.25).toLocaleString(undefined, {maximumFractionDigits: 1})} ไร่` : `${reading?.emissionReductionPct?.toFixed(0) ?? '--'}%`}</div>
              </div>
            </div>
            <div style="margin-top: 8px; font-size: 11px; color: #6b7280; display: flex; gap: 8px;">
              <span>🔄 ${field.awdCycles} cycles</span>
              <span>🌾 ${field.riceVariety}</span>
            </div>
          </div>
        `, { className: 'custom-popup', maxWidth: 300 });

        polygon.on('click', () => onFieldSelect(field.id));
        fieldGroupRef.current!.addLayer(polygon);
      }

      // Field center marker with AWD phase indicator
      const phaseEmoji = field.currentAWDPhase === 'FLOODED' ? '💧' :
                         field.currentAWDPhase === 'DRY' ? '☀️' :
                         field.currentAWDPhase === 'DRAINING' ? '🔽' : '🔼';

      const markerIcon = L.divIcon({
        className: 'custom-marker',
        html: `
          <div style="
            width: ${isSelected ? '52px' : '44px'};
            height: ${isSelected ? '52px' : '44px'};
            border-radius: 50%;
            background: ${cfg.fill};
            border: 3px solid ${isSelected ? phaseColor : 'white'};
            box-shadow: 0 2px 12px rgba(0,0,0,0.35), 0 0 0 ${isSelected ? '4px' : '0px'} ${phaseColor}40;
            display: flex; align-items: center; justify-content: center;
            color: white; font-weight: bold;
            cursor: pointer; transition: transform 0.15s;
            flex-direction: column; line-height: 1;
          " onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">
            <span style="font-size: ${isSelected ? '16px' : '14px'}; line-height: 1;">${phaseEmoji}</span>
            <span style="font-size: 8px; margin-top: 1px;">${cfg.label}</span>
          </div>
        `,
        iconSize: [isSelected ? 52 : 44, isSelected ? 52 : 44],
        iconAnchor: [isSelected ? 26 : 22, isSelected ? 26 : 22],
        popupAnchor: [0, -(isSelected ? 28 : 24)],
      });

      const marker = L.marker([field.lat, field.lng], { icon: markerIcon });
      marker.on('click', () => onFieldSelect(field.id));
      markerGroupRef.current!.addLayer(marker);
    });
  }, [fields, latestReadings, selectedFieldId, onFieldSelect, standardMode]);

  // Fly to selected field
  useEffect(() => {
    if (!selectedFieldId || !mapRef.current) return;
    const field = fields.find(f => f.id === selectedFieldId);
    if (!field) return;
    mapRef.current.flyTo([field.lat, field.lng], 11, { duration: 1 });
  }, [selectedFieldId, fields]);

  if (!mounted) {
    return <div className="w-full h-full bg-muted/30 animate-pulse rounded-xl" />;
  }

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full rounded-xl" style={{ minHeight: 380, background: '#1a1a2e' }} />
      {/* Map style toggle */}
      <button
        onClick={() => setIsSatellite(prev => !prev)}
        className="absolute top-3 left-3 z-[1000] h-8 px-3 bg-background/95 backdrop-blur-xl rounded-lg shadow-md border text-xs font-medium flex items-center gap-1.5 hover:bg-background transition-colors"
      >
        {isSatellite ? '🛰️ Satellite' : '🗺️ Street'}
      </button>
      {/* Standard mode badge */}
      <div className="absolute top-3 right-14 z-[1000] h-8 px-3 bg-background/95 backdrop-blur-xl rounded-lg shadow-md border text-xs font-medium flex items-center gap-1.5">
        {standardMode === 'tgo' ? '🇹🇭 T-VER' : '🌍 IPCC'}
      </div>

      {/* Legend */}
      <div className="absolute bottom-3 left-3 z-[1000] bg-background/95 backdrop-blur-xl rounded-lg shadow-lg border p-3 text-xs max-w-[200px]">
        <p className="font-semibold text-muted-foreground mb-2 text-[10px] uppercase tracking-wider">AWD Fields</p>
        <div className="space-y-1.5">
          {Object.entries(FIELD_COLORS).map(([key, cfg]) => {
            const field = fields.find(f => f.id === key);
            return (
              <button key={key} className="flex items-center gap-2 hover:bg-muted/50 rounded px-1 py-0.5 w-full text-left transition-colors"
                onClick={() => onFieldSelect(key)}>
                <div className="h-3 w-3 rounded-full shadow-sm shrink-0" style={{ background: cfg.fill }} />
                <span className="text-muted-foreground text-[11px]">{cfg.label}</span>
                {field && <span className="ml-auto text-[9px] font-medium" style={{ color: AWD_PHASE_COLORS[field.currentAWDPhase] }}>{field.currentAWDPhase}</span>}
              </button>
            );
          })}
        </div>
        <div className="mt-2 pt-2 border-t space-y-1">
          <p className="font-semibold text-muted-foreground text-[10px] uppercase tracking-wider">Area</p>
          {Object.entries(FIELD_COLORS).map(([key, cfg]) => {
            const field = fields.find(f => f.id === key);
            if (!field) return null;
            return (
              <div key={key} className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: cfg.fill }} />
                <span className="text-muted-foreground text-[10px]">{standardMode === 'tgo' ? `${(field.areaHa * 6.25).toLocaleString(undefined, {maximumFractionDigits: 1})} ไร่` : `${field.areaHa} ha`}</span>
              </div>
            );
          })}
        </div>
        <div className="mt-2 pt-2 border-t space-y-1">
          <p className="font-semibold text-muted-foreground text-[10px] uppercase tracking-wider">AWD Phase</p>
          {Object.entries(AWD_PHASE_COLORS).map(([phase, color]) => (
            <div key={phase} className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: color }} />
              <span className="text-muted-foreground text-[10px]">{phase}</span>
            </div>
          ))}
        </div>
        <div className="mt-2 pt-2 border-t">
          <p className="text-[9px] text-muted-foreground/70">
            {standardMode === 'tgo' ? '🇹🇭 T-VER Standard (ไร่)' : '🌍 IPCC Standard (ha)'}
          </p>
        </div>
      </div>
    </div>
  );
}
