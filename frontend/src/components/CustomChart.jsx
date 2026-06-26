import React, { useState } from 'react';

const COLORS = [
  '#3b82f6', // blue
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#a855f7', // purple
  '#d946ef', // fuchsia
  '#ec4899', // pink
  '#f43f5e', // rose
  '#10b981', // emerald
  '#14b8a6', // teal
  '#f59e0b', // amber
];

export default function CustomChart({ type = 'bar', data = { labels: [], values: [] }, title }) {
  const [hoveredIdx, setHoveredIdx] = useState(null);

  const labels = data.labels || [];
  const values = data.values || [];

  if (labels.length === 0 || values.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center border border-slate-100 rounded-xl bg-slate-50 text-xs text-slate-400">
        No plot data available
      </div>
    );
  }

  // Dimensions
  const svgWidth = 500;
  const svgHeight = 280;
  const paddingLeft = 55;
  const paddingRight = 25;
  const paddingTop = 40;
  const paddingBottom = 45;

  const chartWidth = svgWidth - paddingLeft - paddingRight;
  const chartHeight = svgHeight - paddingTop - paddingBottom;

  const maxValue = Math.max(...values, 1);
  const totalValue = values.reduce((sum, val) => sum + val, 0);

  // BAR & LINE PLOTTING MATH
  const getX = (index) => paddingLeft + (index / (labels.length - 1 || 1)) * chartWidth;
  const getY = (value) => svgHeight - paddingBottom - (value / maxValue) * chartHeight;

  // PIE CHART MATH
  const renderPieSlices = () => {
    let accumulatedAngle = 0;
    const centerX = 160;
    const centerY = 135;
    const radius = 90;

    return values.map((val, idx) => {
      if (val === 0) return null;
      const percentage = (val / (totalValue || 1)) * 100;
      const angle = (val / (totalValue || 1)) * 360;

      // Calculate path coords
      const startRad = (accumulatedAngle - 90) * (Math.PI / 180);
      const endRad = (accumulatedAngle + angle - 90) * (Math.PI / 180);

      const x1 = centerX + radius * Math.cos(startRad);
      const y1 = centerY + radius * Math.sin(startRad);
      const x2 = centerX + radius * Math.cos(endRad);
      const y2 = centerY + radius * Math.sin(endRad);

      const largeArc = angle > 180 ? 1 : 0;

      const pathData = [
        `M ${centerX} ${centerY}`,
        `L ${x1} ${y1}`,
        `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
        'Z',
      ].join(' ');

      accumulatedAngle += angle;
      const color = COLORS[idx % COLORS.length];
      const isHovered = hoveredIdx === idx;

      return (
        <path
          key={idx}
          d={pathData}
          fill={color}
          className="transition-all duration-300 cursor-pointer origin-center"
          style={{
            transform: isHovered ? 'scale(1.05)' : 'scale(1)',
            transformOrigin: `${centerX}px ${centerY}px`,
            filter: isHovered ? 'drop-shadow(0 4px 6px rgba(0,0,0,0.15))' : 'none',
          }}
          onMouseEnter={() => setHoveredIdx(idx)}
          onMouseLeave={() => setHoveredIdx(null)}
        />
      );
    });
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">{title}</h3>
        <span className="text-[10px] text-slate-400 bg-slate-50 border border-slate-100 rounded px-1.5 py-0.5">
          {type.toUpperCase()} CHART
        </span>
      </div>

      <div className="relative flex justify-center items-center">
        <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-auto select-none overflow-visible">
          {/* Defs for gradients */}
          <defs>
            <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#6366f1" />
            </linearGradient>
            <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* GRID LINES & AXES (Only for Bar & Line charts) */}
          {type !== 'pie' && (
            <>
              {/* Horizontal Gridlines */}
              {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                const yVal = svgHeight - paddingBottom - ratio * chartHeight;
                const gridLabel = (ratio * maxValue).toLocaleString(undefined, {
                  maximumFractionDigits: 1,
                });
                return (
                  <g key={idx} className="opacity-40">
                    <line
                      x1={paddingLeft}
                      y1={yVal}
                      x2={svgWidth - paddingRight}
                      y2={yVal}
                      stroke="#e2e8f0"
                      strokeWidth={1}
                      strokeDasharray="3 3"
                    />
                    <text
                      x={paddingLeft - 8}
                      y={yVal + 3}
                      textAnchor="end"
                      fill="#94a3b8"
                      className="text-[9px] font-medium"
                    >
                      {gridLabel}
                    </text>
                  </g>
                );
              })}

              {/* Y Axis line */}
              <line
                x1={paddingLeft}
                y1={paddingTop}
                x2={paddingLeft}
                y2={svgHeight - paddingBottom}
                stroke="#cbd5e1"
                strokeWidth={1.5}
              />
              {/* X Axis line */}
              <line
                x1={paddingLeft}
                y1={svgHeight - paddingBottom}
                x2={svgWidth - paddingRight}
                y2={svgHeight - paddingBottom}
                stroke="#cbd5e1"
                strokeWidth={1.5}
              />
            </>
          )}

          {/* BAR CHART RENDERING */}
          {type === 'bar' &&
            values.map((val, idx) => {
              const count = values.length;
              const colWidth = (chartWidth / count) * 0.6;
              const gap = (chartWidth / count) * 0.4;
              const xVal = paddingLeft + idx * (colWidth + gap) + gap / 2;
              const yVal = getY(val);
              const barHeight = Math.max((val / maxValue) * chartHeight, 2);
              const isHovered = hoveredIdx === idx;

              return (
                <g key={idx} className="group">
                  <rect
                    x={xVal}
                    y={yVal}
                    width={colWidth}
                    height={barHeight}
                    fill={isHovered ? 'url(#barGrad)' : '#93c5fd'}
                    rx={2}
                    className="transition-colors duration-200 cursor-pointer"
                    onMouseEnter={() => setHoveredIdx(idx)}
                    onMouseLeave={() => setHoveredIdx(null)}
                  />
                  {/* Truncated label below bar */}
                  <text
                    x={xVal + colWidth / 2}
                    y={svgHeight - paddingBottom + 14}
                    textAnchor="middle"
                    fill={isHovered ? '#1e293b' : '#64748b'}
                    className={`text-[8px] font-medium transition-colors ${
                      labels[idx]?.length > 8 ? 'rotate-12 transform origin-center' : ''
                    }`}
                  >
                    {labels[idx]?.length > 10 ? `${labels[idx].substring(0, 8)}…` : labels[idx]}
                  </text>
                </g>
              );
            })}

          {/* LINE CHART RENDERING */}
          {type === 'line' && (
            <>
              {/* Translucent Area Gradient */}
              <polygon
                points={`
                  ${getX(0)},${svgHeight - paddingBottom}
                  ${values.map((v, i) => `${getX(i)},${getY(v)}`).join(' ')}
                  ${getX(values.length - 1)},${svgHeight - paddingBottom}
                `}
                fill="url(#lineGrad)"
              />

              {/* Main Line */}
              <path
                d={values
                  .map((v, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(v)}`)
                  .join(' ')}
                fill="none"
                stroke="#3b82f6"
                strokeWidth={2}
              />

              {/* Circles on dots */}
              {values.map((val, idx) => {
                const xVal = getX(idx);
                const yVal = getY(val);
                const isHovered = hoveredIdx === idx;

                return (
                  <g key={idx}>
                    <circle
                      cx={xVal}
                      cy={yVal}
                      r={isHovered ? 5 : 3.5}
                      fill={isHovered ? '#3b82f6' : '#ffffff'}
                      stroke="#3b82f6"
                      strokeWidth={1.5}
                      className="transition-all cursor-pointer"
                      onMouseEnter={() => setHoveredIdx(idx)}
                      onMouseLeave={() => setHoveredIdx(null)}
                    />
                    {/* X axis labels */}
                    {idx % Math.max(1, Math.round(values.length / 5)) === 0 && (
                      <text
                        x={xVal}
                        y={svgHeight - paddingBottom + 14}
                        textAnchor="middle"
                        fill="#64748b"
                        className="text-[8px] font-medium"
                      >
                        {labels[idx]?.length > 10
                          ? `${labels[idx].substring(0, 8)}…`
                          : labels[idx]}
                      </text>
                    )}
                  </g>
                );
              })}
            </>
          )}

          {/* PIE CHART RENDERING */}
          {type === 'pie' && <g>{renderPieSlices()}</g>}
        </svg>

        {/* Dynamic HTML Tooltip */}
        {hoveredIdx !== null && (
          <div
            className="absolute bg-slate-900/90 text-white px-2.5 py-1.5 rounded-lg text-[10px] pointer-events-none shadow-md backdrop-blur border border-slate-700/50"
            style={{
              top: '8px',
              right: '8px',
            }}
          >
            <p className="font-semibold text-slate-200 truncate max-w-[120px]">
              {labels[hoveredIdx]}
            </p>
            <p className="text-blue-400 font-bold mt-0.5">
              {values[hoveredIdx]?.toLocaleString()} ({((values[hoveredIdx] / (totalValue || 1)) * 100).toFixed(1)}%)
            </p>
          </div>
        )}
      </div>

      {/* Pie Chart Legend panel */}
      {type === 'pie' && (
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 pt-2 border-t border-slate-100 max-h-36 overflow-y-auto">
          {labels.map((lbl, idx) => (
            <div
              key={idx}
              className={`flex items-center gap-2 p-1 rounded transition-colors cursor-pointer text-[10px] ${
                hoveredIdx === idx ? 'bg-slate-50 font-medium text-slate-900' : 'text-slate-500'
              }`}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: COLORS[idx % COLORS.length] }}
              />
              <span className="truncate flex-1">{lbl}</span>
              <span className="text-slate-400 text-[9px] font-semibold">
                {((values[idx] / (totalValue || 1)) * 100).toFixed(0)}%
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
