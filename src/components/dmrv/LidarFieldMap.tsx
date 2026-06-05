'use client';

import React, { useState, useEffect, useRef, useCallback, useSyncExternalStore } from 'react';
import L from 'leaflet';

// ─── Types ──────────────────────────────────────────────────────────
interface LidarFieldMapData {
  id: string;
  name: string;
  nameTh: string;
  province: string;
  lat: number;
  lng: number;
  areaHa: number;
  forestType: string;
  boundary: number[][];
  simYear: number;
  simMonth: number;
  surveyPhase: 'FLIGHT' | 'PROCESSING' | 'VERIFIED';
  chmMeanHeight: number;
  canopyCoverPct: number;
  agbTonnePerHa: number;
  carbonTcPerHa: number;
  totalCO2eStock: number;
  deforestationHa: number;
  annualCarbonChangeTcPerHa: number;
  surveyComplete: boolean;
  pointDensityPerM2: number;
  scanCoveragePct: number;
  isMangrove: boolean;
  soilCarbonTcPerHa: number;
}

interface LidarReading {
  tick: number;
  fieldId: string;
  pointDensityPerM2: number;
  scanCoveragePct: number;
  chmMaxHeight: number;
  chmMeanHeight: number;
  canopyCoverPct: number;
  lai: number;
  treeDensityPerHa: number;
  agbTonnePerHa: number;
  bgbTonnePerHa: number;
  carbonTcPerHa: number;
  co2eTonnePerHa: number;
  tverCarbonTcPerHa: number;
  tverCo2eTonnePerHa: number;
  totalCarbonStockTc: number;
  totalCO2eStock: number;
  annualCarbonChangeTcPerHa: number;
  deforestationHa: number;
  degradationPct: number;
  soilCarbonTcPerHa: number;
  surveyPhase: string;
}

interface LidarFieldMapProps {
  fields: LidarFieldMapData[];
  latestReadings: Record<string, LidarReading | null>;
  selectedFieldId: string | null;
  onFieldSelect: (fieldId: string) => void;
  standardMode: 'international' | 'tgo';
}

// ─── Config ─────────────────────────────────────────────────────────
const FIELD_COLORS: Record<string, { fill: string; stroke: string; label: string; icon: string }> = {
  'khao-yai': { fill: '#059669', stroke: '#047857', label: 'Khao Yai', icon: '🌴' },
  'mae-wong': { fill: '#d97706', stroke: '#b45309', label: 'Mae Wong', icon: '🍂' },
  'samut-mangrove': { fill: '#0891b2', stroke: '#0e7490', label: 'Mangrove', icon: '🌊' },
};

const SURVEY_PHASE_COLORS: Record<string, string> = {
  FLIGHT: '#6366f1',
  PROCESSING: '#f59e0b',
  VERIFIED: '#10b981',
};

const SURVEY_PHASE_LABELS: Record<string, string> = {
  FLIGHT: '🛩️ Flight Scanning',
  PROCESSING: '⚙️ Processing',
  VERIFIED: '✅ Verified',
};

const SATELLITE_URL = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const STREET_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const SATELLITE_LABELS_URL = 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}';

const emptySubscribe = () => () => {};
function useMounted() {
  return useSyncExternalStore(emptySubscribe, () => true, () => false);
}

export default function LidarFieldMap({
  fields, latestReadings, selectedFieldId, onFieldSelect, standardMode,
}: LidarFieldMapProps) {
  const mounted = useMounted();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const labelLayerRef = useRef<L.TileLayer | null>(null);
  const fieldGroupRef = useRef<L.LayerGroup | null>(null);
  const markerGroupRef = useRef<L.LayerGroup | null>(null);
  const alertGroupRef = useRef<L.LayerGroup | null>(null);
  const prevFieldsJson = useRef<string>('');
  const [isSatellite, setIsSatellite] = useState(true);

  // ─── CSS keyframes for animations ──────────────────────────────────
  useEffect(() => {
    const styleId = 'lidar-map-animations';
    if (document.getElementById(styleId)) return;
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      @keyframes lidar-pulse {
        0% { transform: scale(1); opacity: 0.7; }
        50% { transform: scale(1.5); opacity: 0.2; }
        100% { transform: scale(1); opacity: 0.7; }
      }
      @keyframes lidar-scan {
        0% { stroke-dashoffset: 0; }
        100% { stroke-dashoffset: 40; }
      }
      @keyframes alert-pulse {
        0% { transform: scale(0.8); opacity: 0.9; }
        50% { transform: scale(1.4); opacity: 0.3; }
        100% { transform: scale(0.8); opacity: 0.9; }
      }
      .lidar-alert-marker {
        animation: alert-pulse 1.5s ease-in-out infinite;
      }
    `;
    document.head.appendChild(style);
    return () => { style.remove(); };
  }, []);

  // ─── Initialize map ────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [14.5, 100.5],
      zoom: 6,
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
    alertGroupRef.current = L.layerGroup().addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // ─── Toggle satellite/street ───────────────────────────────────────
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

  // ─── Update fields on map ──────────────────────────────────────────
  useEffect(() => {
    if (!fieldGroupRef.current || !markerGroupRef.current || !alertGroupRef.current) return;

    const fieldsJson = JSON.stringify(fields.map(f => ({
      id: f.id, boundary: f.boundary, surveyPhase: f.surveyPhase,
      chmMeanHeight: f.chmMeanHeight, canopyCoverPct: f.canopyCoverPct,
      agbTonnePerHa: f.agbTonnePerHa, carbonTcPerHa: f.carbonTcPerHa,
      totalCO2eStock: f.totalCO2eStock, deforestationHa: f.deforestationHa,
      annualCarbonChangeTcPerHa: f.annualCarbonChangeTcPerHa,
      surveyComplete: f.surveyComplete, pointDensityPerM2: f.pointDensityPerM2,
      scanCoveragePct: f.scanCoveragePct, isMangrove: f.isMangrove,
      soilCarbonTcPerHa: f.soilCarbonTcPerHa, simYear: f.simYear, simMonth: f.simMonth,
      selected: f.id === selectedFieldId,
    })));

    if (fieldsJson === prevFieldsJson.current) return;
    prevFieldsJson.current = fieldsJson;

    fieldGroupRef.current.clearLayers();
    markerGroupRef.current.clearLayers();
    alertGroupRef.current.clearLayers();

    fields.forEach(field => {
      const cfg = FIELD_COLORS[field.id] || FIELD_COLORS['khao-yai'];
      const phaseColor = SURVEY_PHASE_COLORS[field.surveyPhase] || '#6b7280';
      const isSelected = field.id === selectedFieldId;
      const reading = latestReadings[field.id];

      // ─── Draw boundary polygon ────────────────────────────────────
      if (field.boundary && field.boundary.length >= 3) {
        const latLngs: L.LatLngExpression[] = field.boundary.map(
          (c: number[]) => [c[0], c[1]] as L.LatLngExpression
        );

        // Fill style depends on survey phase
        let fillOpacity: number;
        let dashArray: string;
        let fillColor: string;
        let weight: number;
        let borderColor: string;

        if (field.surveyPhase === 'FLIGHT') {
          fillOpacity = 0.15;
          dashArray = '12, 6';
          fillColor = cfg.fill;
          weight = isSelected ? 4 : 2.5;
          borderColor = isSelected ? phaseColor : cfg.stroke;
        } else if (field.surveyPhase === 'PROCESSING') {
          fillOpacity = 0.25;
          dashArray = '8, 4';
          fillColor = cfg.fill;
          weight = isSelected ? 3.5 : 2;
          borderColor = isSelected ? phaseColor : cfg.stroke;
        } else {
          // VERIFIED
          fillOpacity = 0.40;
          dashArray = '';
          fillColor = cfg.fill;
          weight = isSelected ? 4 : 2.5;
          borderColor = isSelected ? '#10b981' : cfg.stroke;
        }

        const polygon = L.polygon(latLngs, {
          color: borderColor,
          weight,
          opacity: 0.9,
          fillColor,
          fillOpacity,
          dashArray,
        });

        // ─── Build popup HTML ──────────────────────────────────────
        const progress = Math.min((field.simMonth / 12) * 100, 100);
        const hasDeforestation = field.deforestationHa > 0;
        const isTgo = standardMode === 'tgo';
        const carbonLabel = isTgo ? 'T-VER Carbon' : 'IPCC Carbon';
        const carbonValue = isTgo
          ? (reading?.tverCarbonTcPerHa?.toFixed(2) ?? field.carbonTcPerHa.toFixed(2))
          : (reading?.carbonTcPerHa?.toFixed(2) ?? field.carbonTcPerHa.toFixed(2));
        const co2eValue = isTgo
          ? (reading?.tverCo2eTonnePerHa?.toFixed(1) ?? field.totalCO2eStock.toFixed(0))
          : (reading?.co2eTonnePerHa?.toFixed(1) ?? field.totalCO2eStock.toFixed(0));
        const methodology = isTgo ? 'T-VER (Thailand Verified Emission Reduction)' : 'IPCC 2006 GL Vol 4';
        const carbonChange = reading?.annualCarbonChangeTcPerHa ?? field.annualCarbonChangeTcPerHa;
        const carbonChangeSign = carbonChange >= 0 ? '+' : '';
        const carbonChangeColor = carbonChange >= 0 ? '#059669' : '#dc2626';

        const popupHtml = `
          <div style="min-width: 280px; font-family: system-ui, -apple-system, sans-serif;">
            <!-- Header -->
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
              <div style="
                width: 40px; height: 40px; border-radius: 10px;
                background: ${cfg.fill}18; display: flex; align-items: center;
                justify-content: center; font-size: 22px; flex-shrink: 0;
              ">${cfg.icon}</div>
              <div style="min-width: 0;">
                <h4 style="font-size: 14px; font-weight: 700; margin: 0; color: #1f2937; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${field.nameTh}</h4>
                <p style="font-size: 12px; color: #6b7280; margin: 2px 0 0;">${field.name}</p>
                <p style="font-size: 11px; color: #9ca3af; margin: 0;">${field.province} · ${standardMode === 'tgo' ? `${(field.areaHa * 6.25).toLocaleString(undefined, {maximumFractionDigits: 1})} ไร่` : `${field.areaHa.toLocaleString()} ha`}</p>
              </div>
            </div>

            <!-- Badges -->
            <div style="display: flex; gap: 4px; flex-wrap: wrap; margin-bottom: 10px;">
              <span style="background: ${phaseColor}18; color: ${phaseColor}; padding: 3px 10px; border-radius: 99px; font-size: 10px; font-weight: 600; border: 1px solid ${phaseColor}30;">${SURVEY_PHASE_LABELS[field.surveyPhase] || field.surveyPhase}</span>
              ${field.surveyComplete ? '<span style="background: #ecfdf5; color: #047857; padding: 3px 10px; border-radius: 99px; font-size: 10px; font-weight: 600; border: 1px solid #a7f3d0;">✅ Complete</span>' : ''}
              ${field.isMangrove ? '<span style="background: #ecfeff; color: #0e7490; padding: 3px 10px; border-radius: 99px; font-size: 10px; font-weight: 600; border: 1px solid #a5f3fc;">🌊 Mangrove</span>' : ''}
              ${hasDeforestation ? '<span style="background: #fef2f2; color: #dc2626; padding: 3px 10px; border-radius: 99px; font-size: 10px; font-weight: 600; border: 1px solid #fecaca;">⚠️ Deforestation</span>' : ''}
            </div>

            <!-- Year/Month progress bar -->
            <div style="background: #f9fafb; border-radius: 8px; padding: 8px 10px; margin-bottom: 10px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                <span style="font-size: 10px; color: #6b7280; font-weight: 500;">Survey Progress (Y${field.simYear})</span>
                <span style="font-size: 10px; font-weight: 700; color: #374151;">Month ${field.simMonth}/12</span>
              </div>
              <div style="background: #e5e7eb; border-radius: 99px; height: 6px; overflow: hidden;">
                <div style="background: linear-gradient(90deg, ${cfg.fill}, ${phaseColor}); height: 100%; border-radius: 99px; width: ${progress}%; transition: width 0.5s;"></div>
              </div>
            </div>

            <!-- LIDAR metrics grid -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 8px;">
              <div style="background: #f0fdf4; padding: 7px 8px; border-radius: 8px; text-align: center; border: 1px solid #bbf7d0;">
                <div style="color: #15803d; font-size: 9px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Canopy Height</div>
                <div style="font-weight: 800; color: #15803d; font-size: 16px; margin-top: 2px;">${(reading?.chmMeanHeight ?? field.chmMeanHeight).toFixed(1)}<span style="font-size: 10px; font-weight: 600;"> m</span></div>
              </div>
              <div style="background: #fffbeb; padding: 7px 8px; border-radius: 8px; text-align: center; border: 1px solid #fde68a;">
                <div style="color: #92400e; font-size: 9px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">AGB</div>
                <div style="font-weight: 800; color: #92400e; font-size: 16px; margin-top: 2px;">${standardMode === 'tgo' ? ((reading?.agbTonnePerHa ?? field.agbTonnePerHa) * 0.16).toFixed(2) : (reading?.agbTonnePerHa ?? field.agbTonnePerHa).toFixed(1)}<span style="font-size: 10px; font-weight: 600;"> ${standardMode === 'tgo' ? 't/ไร่' : 't/ha'}</span></div>
              </div>
              <div style="background: #eff6ff; padding: 7px 8px; border-radius: 8px; text-align: center; border: 1px solid #bfdbfe;">
                <div style="color: #1d4ed8; font-size: 9px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">${carbonLabel}</div>
                <div style="font-weight: 800; color: #1d4ed8; font-size: 16px; margin-top: 2px;">${standardMode === 'tgo' ? (Number(carbonValue) * 0.16).toFixed(3) : carbonValue}<span style="font-size: 10px; font-weight: 600;"> ${standardMode === 'tgo' ? 'tC/ไร่' : 'tC/ha'}</span></div>
              </div>
              <div style="background: #f5f3ff; padding: 7px 8px; border-radius: 8px; text-align: center; border: 1px solid #ddd6fe;">
                <div style="color: #7c3aed; font-size: 9px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">CO₂e Stock</div>
                <div style="font-weight: 800; color: #7c3aed; font-size: 16px; margin-top: 2px;">${Number(co2eValue).toLocaleString()}<span style="font-size: 10px; font-weight: 600;"> t</span></div>
              </div>
            </div>

            <!-- Canopy cover & scan info row -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 8px;">
              <div style="background: #f0fdf4; padding: 5px 8px; border-radius: 6px; text-align: center;">
                <div style="color: #047857; font-size: 9px; font-weight: 600;">Canopy Cover</div>
                <div style="font-weight: 700; color: #047857; font-size: 13px;">${(reading?.canopyCoverPct ?? field.canopyCoverPct).toFixed(1)}%</div>
              </div>
              <div style="background: #f8fafc; padding: 5px 8px; border-radius: 6px; text-align: center;">
                <div style="color: #475569; font-size: 9px; font-weight: 600;">Scan Coverage</div>
                <div style="font-weight: 700; color: #475569; font-size: 13px;">${(reading?.scanCoveragePct ?? field.scanCoveragePct).toFixed(1)}%</div>
              </div>
            </div>

            ${hasDeforestation ? `
            <!-- Deforestation alert -->
            <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 8px 10px; margin-bottom: 8px;">
              <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
                <span style="font-size: 14px;">🔴</span>
                <span style="font-size: 11px; font-weight: 700; color: #dc2626;">Deforestation Alert</span>
              </div>
              <div style="font-size: 12px; color: #991b1b; font-weight: 600;">${standardMode === 'tgo' ? `${(field.deforestationHa * 6.25).toFixed(2)} ไร่` : `${field.deforestationHa.toFixed(2)} ha`} affected</div>
              ${reading?.degradationPct ? `<div style="font-size: 10px; color: #b91c1c; margin-top: 2px;">Degradation: ${reading.degradationPct.toFixed(1)}%</div>` : ''}
            </div>
            ` : ''}

            <!-- Carbon change indicator -->
            <div style="display: flex; align-items: center; justify-content: space-between; background: #f9fafb; padding: 7px 10px; border-radius: 8px; margin-bottom: 8px; border: 1px solid #e5e7eb;">
              <div style="display: flex; align-items: center; gap: 6px;">
                <span style="font-size: 13px;">${carbonChange >= 0 ? '📈' : '📉'}</span>
                <span style="font-size: 10px; font-weight: 600; color: #374151;">Annual Carbon Change</span>
              </div>
              <span style="font-weight: 800; color: ${carbonChangeColor}; font-size: 14px;">${carbonChangeSign}${standardMode === 'tgo' ? (carbonChange * 0.16).toFixed(4) : carbonChange.toFixed(3)} ${standardMode === 'tgo' ? 'tC/ไร่/yr' : 'tC/ha/yr'}</span>
            </div>

            ${field.isMangrove && field.soilCarbonTcPerHa > 0 ? `
            <!-- Soil carbon for mangroves -->
            <div style="background: #ecfeff; border: 1px solid #a5f3fc; border-radius: 8px; padding: 6px 10px; margin-bottom: 8px; display: flex; align-items: center; justify-content: space-between;">
              <div style="display: flex; align-items: center; gap: 6px;">
                <span style="font-size: 13px;">🧪</span>
                <span style="font-size: 10px; font-weight: 600; color: #0e7490;">Soil Carbon</span>
              </div>
              <span style="font-weight: 700; color: #0e7490; font-size: 13px;">${standardMode === 'tgo' ? `${((reading?.soilCarbonTcPerHa ?? field.soilCarbonTcPerHa) * 0.16).toFixed(3)} tC/ไร่` : `${(reading?.soilCarbonTcPerHa ?? field.soilCarbonTcPerHa).toFixed(2)} tC/ha`}</span>
            </div>
            ` : ''}

            <!-- Methodology reference -->
            <div style="font-size: 9px; color: #9ca3af; text-align: center; padding-top: 6px; border-top: 1px solid #f3f4f6;">
              📋 ${methodology} · LIDAR Point Density: ${field.pointDensityPerM2.toFixed(1)} pts/m²
            </div>
          </div>
        `;

        polygon.bindPopup(popupHtml, { className: 'custom-popup', maxWidth: 320 });
        polygon.on('click', () => onFieldSelect(field.id));
        fieldGroupRef.current!.addLayer(polygon);
      }

      // ─── Deforestation alert overlay ──────────────────────────────
      if (field.deforestationHa > 0) {
        const alertRadius = Math.max(500, Math.sqrt(field.deforestationHa * 10000) * 2);
        const alertCircle = L.circle([field.lat, field.lng], {
          radius: alertRadius,
          color: '#dc2626',
          weight: 2,
          opacity: 0.7,
          fillColor: '#dc2626',
          fillOpacity: 0.12,
          dashArray: '6, 4',
          className: 'lidar-alert-marker',
        });
        alertCircle.bindTooltip(`⚠️ ${standardMode === 'tgo' ? `${(field.deforestationHa * 6.25).toFixed(2)} ไร่` : `${field.deforestationHa.toFixed(2)} ha`} deforested`, {
          permanent: false,
          direction: 'top',
          className: 'custom-tooltip',
        });
        alertGroupRef.current!.addLayer(alertCircle);

        // Pulsing alert marker at center
        const alertIcon = L.divIcon({
          className: 'lidar-alert-marker',
          html: `
            <div style="
              width: 28px; height: 28px; border-radius: 50%;
              background: radial-gradient(circle, #dc2626 30%, transparent 70%);
              animation: alert-pulse 1.5s ease-in-out infinite;
              display: flex; align-items: center; justify-content: center;
              font-size: 14px; font-weight: bold; color: white;
            ">⚠️</div>
          `,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });
        const alertMarker = L.marker([field.lat, field.lng], { icon: alertIcon, interactive: false });
        alertGroupRef.current!.addLayer(alertMarker);
      }

      // ─── Field center marker ───────────────────────────────────────
      const markerIcon = L.divIcon({
        className: 'custom-marker',
        html: `
          <div style="
            width: ${isSelected ? '56px' : '44px'};
            height: ${isSelected ? '56px' : '44px'};
            border-radius: 50%;
            background: ${cfg.fill};
            border: 3px solid ${isSelected ? phaseColor : 'white'};
            box-shadow: 0 2px 12px rgba(0,0,0,0.35), 0 0 0 ${isSelected ? '5px' : '0px'} ${phaseColor}40;
            display: flex; align-items: center; justify-content: center;
            color: white; font-weight: bold;
            cursor: pointer; transition: transform 0.15s;
            flex-direction: column; line-height: 1;
          " onmouseover="this.style.transform='scale(1.12)'" onmouseout="this.style.transform='scale(1)'">
            <span style="font-size: ${isSelected ? '18px' : '14px'}; line-height: 1;">${cfg.icon}</span>
            <span style="font-size: ${isSelected ? '8px' : '7px'}; margin-top: 1px; letter-spacing: -0.2px;">${cfg.label}</span>
          </div>
        `,
        iconSize: [isSelected ? 56 : 44, isSelected ? 56 : 44],
        iconAnchor: [isSelected ? 28 : 22, isSelected ? 28 : 22],
        popupAnchor: [0, -(isSelected ? 30 : 24)],
      });

      const marker = L.marker([field.lat, field.lng], { icon: markerIcon });
      marker.on('click', () => onFieldSelect(field.id));
      markerGroupRef.current!.addLayer(marker);

      // ─── Flight scanning ring (animated) for FLIGHT phase ──────────
      if (field.surveyPhase === 'FLIGHT') {
        const scanRing = L.circle([field.lat, field.lng], {
          radius: Math.sqrt(field.areaHa * 10000) * 0.6,
          color: phaseColor,
          weight: 1.5,
          opacity: 0.5,
          fillColor: phaseColor,
          fillOpacity: 0.05,
          dashArray: '10, 8',
          className: 'lidar-scan-ring',
        });
        fieldGroupRef.current!.addLayer(scanRing);

        // Outer pulsing ring for FLIGHT phase
        const pulseRing = L.circle([field.lat, field.lng], {
          radius: Math.sqrt(field.areaHa * 10000) * 0.8,
          color: phaseColor,
          weight: 1,
          opacity: 0.25,
          fillColor: 'transparent',
          fillOpacity: 0,
          dashArray: '4, 6',
        });
        fieldGroupRef.current!.addLayer(pulseRing);
      }
    });
  }, [fields, latestReadings, selectedFieldId, onFieldSelect, standardMode]);

  // ─── Fly to selected field ─────────────────────────────────────────
  useEffect(() => {
    if (!selectedFieldId || !mapRef.current) return;
    const field = fields.find(f => f.id === selectedFieldId);
    if (!field) return;
    mapRef.current.flyTo([field.lat, field.lng], 10, { duration: 1.2 });
  }, [selectedFieldId, fields]);

  if (!mounted) {
    return <div className="w-full h-full bg-muted/30 animate-pulse rounded-xl" />;
  }

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full rounded-xl" style={{ minHeight: 380, background: '#0f172a' }} />

      {/* ─── Map style toggle ────────────────────────────────────────── */}
      <button
        onClick={() => setIsSatellite(prev => !prev)}
        className="absolute top-3 left-3 z-[1000] h-8 px-3 bg-background/95 backdrop-blur-xl rounded-lg shadow-md border text-xs font-medium flex items-center gap-1.5 hover:bg-background transition-colors"
      >
        {isSatellite ? '🛰️ Satellite' : '🗺️ Street'}
      </button>

      {/* ─── Standard mode badge ──────────────────────────────────────── */}
      <div className="absolute top-3 right-14 z-[1000] h-8 px-3 bg-background/95 backdrop-blur-xl rounded-lg shadow-md border text-xs font-medium flex items-center gap-1.5">
        {standardMode === 'tgo' ? '🇹🇭 T-VER' : '🌍 IPCC'}
      </div>

      {/* ─── Legend ────────────────────────────────────────────────────── */}
      <div className="absolute bottom-3 left-3 z-[1000] bg-background/95 backdrop-blur-xl rounded-lg shadow-lg border p-3 text-xs max-w-[200px]">
        <p className="font-semibold text-muted-foreground mb-2 text-[10px] uppercase tracking-wider">LIDAR Forest Areas</p>
        <div className="space-y-1.5">
          {fields.map(field => {
            const cfg = FIELD_COLORS[field.id];
            if (!cfg) return null;
            return (
              <button
                key={field.id}
                className="flex items-center gap-2 hover:bg-muted/50 rounded px-1 py-0.5 w-full text-left transition-colors"
                onClick={() => onFieldSelect(field.id)}
              >
                <div className="h-3 w-3 rounded-full shadow-sm shrink-0" style={{ background: cfg.fill }} />
                <span className="text-muted-foreground text-[11px] truncate">{cfg.label}</span>
                <span className="ml-auto text-[9px] font-medium" style={{ color: SURVEY_PHASE_COLORS[field.surveyPhase] }}>
                  {field.surveyPhase}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-2 pt-2 border-t space-y-1">
          <p className="font-semibold text-muted-foreground text-[10px] uppercase tracking-wider">Area</p>
          {fields.map(field => {
            const cfg = FIELD_COLORS[field.id];
            if (!cfg) return null;
            return (
              <div key={field.id} className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: cfg.fill }} />
                <span className="text-muted-foreground text-[10px]">{cfg.label}: {standardMode === 'tgo' ? `${(field.areaHa * 6.25).toLocaleString(undefined, {maximumFractionDigits: 1})} ไร่` : `${field.areaHa.toLocaleString()} ha`}</span>
              </div>
            );
          })}
        </div>

        <div className="mt-2 pt-2 border-t space-y-1">
          <p className="font-semibold text-muted-foreground text-[10px] uppercase tracking-wider">Survey Phase</p>
          {Object.entries(SURVEY_PHASE_COLORS).map(([phase, color]) => (
            <div key={phase} className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: color }} />
              <span className="text-muted-foreground text-[10px]">{SURVEY_PHASE_LABELS[phase]}</span>
            </div>
          ))}
        </div>

        <div className="mt-2 pt-2 border-t">
          <div className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full shrink-0 bg-red-500" style={{ animation: 'alert-pulse 1.5s ease-in-out infinite' }} />
            <span className="text-muted-foreground text-[10px]">Deforestation Alert</span>
          </div>
        </div>

        <div className="mt-2 pt-2 border-t">
          <p className="text-[9px] text-muted-foreground/70">
            {standardMode === 'tgo' ? '🇹🇭 T-VER Standard' : '🌍 IPCC 2006 GL'}
          </p>
        </div>
      </div>
    </div>
  );
}
