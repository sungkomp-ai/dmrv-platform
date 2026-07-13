'use client';

import React from 'react';
import type { TerraceLayer, CheckDam } from './types';
import { TERRACE_COLORS } from './constants';

interface TerraceCrossSectionProps {
  layers: TerraceLayer[];
  checkDams: CheckDam[];
  compact?: boolean;
}

export default function TerraceCrossSection({ layers, checkDams, compact = false }: TerraceCrossSectionProps) {
  const h = compact ? 220 : 320;
  const w = compact ? 600 : 800;
  const layerCount = layers.length || 5;
  const stepW = w / (layerCount + 0.5);
  const stepH = h / (layerCount + 1.2);

  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} className="rounded-lg" style={{ maxHeight: compact ? 220 : 320 }}>
      <defs>
        <linearGradient id="terraceGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#047857" />
          <stop offset="100%" stopColor="#34d399" />
        </linearGradient>
        <linearGradient id="plantGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#059669" />
          <stop offset="100%" stopColor="#34d399" />
        </linearGradient>
        <linearGradient id="ridgeGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#065f46" />
          <stop offset="100%" stopColor="#047857" />
        </linearGradient>
        <linearGradient id="waterGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.6" />
        </linearGradient>
        <linearGradient id="sedimentGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#d97706" stopOpacity="0.8" />
        </linearGradient>
      </defs>

      {/* Background hillside */}
      <path
        d={`M 0,${h * 0.15} L ${w * 0.1},${h * 0.1} L ${w},${h * 0.85} L ${w},${h} L 0,${h} Z`}
        fill="#1e293b"
        stroke="#475569"
        strokeWidth="1.5"
      />

      {/* Terrace steps */}
      {layers.map((layer, i) => {
        const x1 = i * stepW * 0.7 + stepW * 0.3;
        const y1 = h * 0.1 + i * stepH * 0.7;
        const totalW = stepW * 1.2;
        const ridgeFraction = (layer.ridgeWidthM || 0.85) / (layer.widthM || 2.35);
        const plantingW = totalW * (1 - ridgeFraction);
        const ridgeW = totalW * ridgeFraction;
        const y2 = y1;
        const y3 = y1 + stepH * 0.7;

        // Planting area x range
        const px1 = x1;
        const px2 = x1 + plantingW;
        // Ridge area x range
        const rx1 = px2;
        const rx2 = x1 + totalW;

        const vetiverStatus = layer.vetiverGrassStatus || 'NONE';

        return (
          <g key={layer.id || i}>
            {/* Planting area (main green) */}
            <path
              d={`M ${px1},${y1} L ${px2},${y2} L ${px2},${y3} L ${px1},${y3} Z`}
              fill={TERRACE_COLORS[i % TERRACE_COLORS.length]}
              stroke="#065f46"
              strokeWidth="1.5"
              opacity="1"
            />

            {/* Ridge area (darker green, slightly elevated) */}
            <path
              d={`M ${rx1},${y1 - 3} L ${rx2},${y2 - 3} L ${rx2},${y3} L ${rx1},${y3} Z`}
              fill="url(#ridgeGrad)"
              stroke="#064e3b"
              strokeWidth="1.5"
              opacity="1"
            />

            {/* Sediment layer */}
            {layer.sedimentDepthCm > 0 && (
              <rect
                x={x1 + 4}
                y={y2 - Math.min(layer.sedimentDepthCm * 0.6, stepH * 0.25)}
                width={plantingW - 8}
                height={Math.min(layer.sedimentDepthCm * 0.6, stepH * 0.25)}
                fill="url(#sedimentGrad)"
                rx="2"
              />
            )}

            {/* Vetiver grass lines on ridge */}
            {vetiverStatus !== 'NONE' && (
              <>
                {Array.from({ length: Math.max(3, Math.floor(ridgeW / 8)) }).map((_, gi) => {
                  const gx = rx1 + (gi + 1) * (ridgeW / (Math.max(3, Math.floor(ridgeW / 8)) + 1));
                  const grassH = vetiverStatus === 'MATURE' ? 15 : vetiverStatus === 'ESTABLISHED' ? 11 : 8;
                  const grassColor = vetiverStatus === 'MATURE' ? '#34d399' : vetiverStatus === 'ESTABLISHED' ? '#6ee7b7' : '#a7f3d0';
                  return (
                    <g key={gi}>
                      <line x1={gx - 2} y1={y1 - 3} x2={gx - 3} y2={y1 - 3 - grassH} stroke={grassColor} strokeWidth="1.2" opacity="0.85" />
                      <line x1={gx} y1={y1 - 3} x2={gx + 1} y2={y1 - 3 - grassH - 2} stroke={grassColor} strokeWidth="1.2" opacity="0.95" />
                      <line x1={gx + 2} y1={y1 - 3} x2={gx + 4} y2={y1 - 3 - grassH + 1} stroke={grassColor} strokeWidth="1.2" opacity="0.75" />
                    </g>
                  );
                })}
              </>
            )}

            {/* Check dam indicator */}
            {checkDams.filter(d => d.terraceLayerId === layer.id).length > 0 && (
              <rect
                x={rx2 - 5}
                y={y2 - 3}
                width={7}
                height={y3 - y2 + 3}
                fill="#fbbf24"
                stroke="#b45309"
                strokeWidth="1.5"
                rx="1"
              />
            )}

            {/* Water flow arrow */}
            {i < layerCount - 1 && (
              <>
                <line
                  x1={rx2 - stepW * 0.15}
                  y1={y2 + 4}
                  x2={rx1 + stepW * 0.1}
                  y2={y3 + stepH * 0.35}
                  stroke="#60a5fa"
                  strokeWidth="2.5"
                  strokeDasharray="4,2"
                  opacity="0.9"
                />
                <polygon
                  points={`${rx1 + stepW * 0.1},${y3 + stepH * 0.35} ${rx1 + stepW * 0.02},${y3 + stepH * 0.2} ${rx1 + stepW * 0.15},${y3 + stepH * 0.25}`}
                  fill="#60a5fa"
                  opacity="0.9"
                />
              </>
            )}

            {/* Layer label (planting area) */}
            <text
              x={px1 + plantingW / 2}
              y={y1 + (y3 - y1) / 2 + 4}
              textAnchor="middle"
              fill="white"
              fontSize={compact ? 9 : 12}
              fontWeight="bold"
            >
              ชั้น {layer.layerNumber || i + 1}
            </text>
            {!compact && (
              <text
                x={px1 + plantingW / 2}
                y={y1 + (y3 - y1) / 2 + 18}
                textAnchor="middle"
                fill="#a7f3d0"
                fontSize={9}
              >
                {layer.cropType || 'พืช'} · {layer.plantingAreaWidthM || 1.8}ม.
              </text>
            )}
            {compact && (
              <text
                x={px1 + plantingW / 2}
                y={y1 + (y3 - y1) / 2 + 15}
                textAnchor="middle"
                fill="#a7f3d0"
                fontSize={7}
              >
                {layer.cropType || 'พืช'}
              </text>
            )}

            {/* Ridge label */}
            {!compact && (
              <text
                x={rx1 + ridgeW / 2}
                y={y1 + (y3 - y1) / 2 + 4}
                textAnchor="middle"
                fill="#86efac"
                fontSize={9}
              >
                คันแฝก
              </text>
            )}
            {!compact && vetiverStatus !== 'NONE' && (
              <text
                x={rx1 + ridgeW / 2}
                y={y1 + (y3 - y1) / 2 + 16}
                textAnchor="middle"
                fill="#6ee7b7"
                fontSize={8}
              >
                {layer.ridgeWidthM || 0.85}ม.
              </text>
            )}
          </g>
        );
      })}

      {/* Legend */}
      {!compact && (
        <g transform={`translate(10, ${h - 34})`}>
          <rect x="0" y="0" width="14" height="10" fill="url(#sedimentGrad)" rx="1" />
          <text x="20" y="9" fill="#cbd5e1" fontSize="10" fontWeight="500">ตะกอน</text>
          <rect x="75" y="0" width="7" height="12" fill="#fbbf24" stroke="#b45309" rx="1" />
          <text x="88" y="9" fill="#cbd5e1" fontSize="10" fontWeight="500">ฝาย</text>
          <line x1="130" y1="6" x2="155" y2="6" stroke="#60a5fa" strokeWidth="2" strokeDasharray="3,2" />
          <text x="160" y="9" fill="#cbd5e1" fontSize="10" fontWeight="500">น้ำไหล</text>
          <rect x="215" y="0" width="14" height="10" fill="#065f46" rx="1" />
          <text x="234" y="9" fill="#cbd5e1" fontSize="10" fontWeight="500">คันแฝก</text>
          <line x1="295" y1="10" x2="299" y2="1" stroke="#34d399" strokeWidth="1.5" />
          <line x1="299" y1="10" x2="302" y2="0" stroke="#34d399" strokeWidth="1.5" />
          <text x="308" y="9" fill="#cbd5e1" fontSize="10" fontWeight="500">หญ้าแฝก</text>
        </g>
      )}
    </svg>
  );
}
