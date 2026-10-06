import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Level, LevelMapData, POI, RouteResponse } from '../../types/client';
import { useUIStore } from '../../stores/uiStore';
import {
  ZoomIn, ZoomOut, Maximize2, Navigation, Accessibility, ArrowRight, Layers
} from 'lucide-react';

interface IndoorMapViewerProps {
  levelMap: LevelMapData | null;
  activeLevel: Level | null;
  route: RouteResponse | null;
  userLocation: { x: number; y: number; levelId: string; label?: string } | null;
  selectedPOI: POI | null;
  onSelectPOI: (poi: POI | null) => void;
  onQuickNavigateToPOI: (poi: POI) => void;
}

export const IndoorMapViewer: React.FC<IndoorMapViewerProps> = ({
  levelMap,
  activeLevel,
  route,
  userLocation,
  selectedPOI,
  onSelectPOI,
  onQuickNavigateToPOI,
}) => {
  const { isDarkMode } = useUIStore();
  const containerRef = useRef<HTMLDivElement>(null);

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoveredUnit, setHoveredUnit] = useState<any | null>(null);

  // Touch state
  const touchStartRef = useRef<{ x: number; y: number; dist: number } | null>(null);
  const lastPanRef = useRef({ x: 0, y: 0 });
  const lastZoomRef = useRef(1);

  const widthMeters = activeLevel?.width_meters || 80;
  const heightMeters = activeLevel?.height_meters || 60;
  const scale = activeLevel?.scale_pixels_per_meter || 20;
  const svgWidth = widthMeters * scale;
  const svgHeight = heightMeters * scale;

  // Reset view on level change
  useEffect(() => {
    if (containerRef.current) {
      const cw = containerRef.current.clientWidth;
      const ch = containerRef.current.clientHeight;
      const initZoom = Math.min((cw * 0.88) / svgWidth, (ch * 0.88) / svgHeight, 1.2);
      setZoom(initZoom);
      setPan({ x: (cw - svgWidth * initZoom) / 2, y: (ch - svgHeight * initZoom) / 2 });
    }
  }, [activeLevel?.id, svgWidth, svgHeight]);

  // ── Mouse handlers ──────────────────────────────────────────────────────────
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };
  const handleMouseUp = () => setIsDragging(false);

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.15 : 0.85;
    const newZoom = Math.min(Math.max(zoom * factor, 0.3), 5.0);
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      setPan({ x: mx - (mx - pan.x) * (newZoom / zoom), y: my - (my - pan.y) * (newZoom / zoom) });
    }
    setZoom(newZoom);
  }, [zoom, pan]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  // ── Touch handlers (pinch-to-zoom + pan) ────────────────────────────────────
  const getTouchDist = (t: React.TouchList) => {
    if (t.length < 2) return 0;
    const dx = t[0].clientX - t[1].clientX;
    const dy = t[0].clientY - t[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      touchStartRef.current = { x: e.touches[0].clientX - pan.x, y: e.touches[0].clientY - pan.y, dist: 0 };
    } else if (e.touches.length === 2) {
      touchStartRef.current = {
        x: (e.touches[0].clientX + e.touches[1].clientX) / 2 - pan.x,
        y: (e.touches[0].clientY + e.touches[1].clientY) / 2 - pan.y,
        dist: getTouchDist(e.touches),
      };
    }
    lastPanRef.current = pan;
    lastZoomRef.current = zoom;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    if (!touchStartRef.current) return;

    if (e.touches.length === 1) {
      setPan({
        x: e.touches[0].clientX - touchStartRef.current.x,
        y: e.touches[0].clientY - touchStartRef.current.y,
      });
    } else if (e.touches.length === 2) {
      const dist = getTouchDist(e.touches);
      if (touchStartRef.current.dist === 0) return;
      const newZoom = Math.min(Math.max(lastZoomRef.current * (dist / touchStartRef.current.dist), 0.3), 5.0);
      const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      const rect = containerRef.current!.getBoundingClientRect();
      const mx = midX - rect.left;
      const my = midY - rect.top;
      setPan({
        x: mx - (mx - lastPanRef.current.x) * (newZoom / lastZoomRef.current),
        y: my - (my - lastPanRef.current.y) * (newZoom / lastZoomRef.current),
      });
      setZoom(newZoom);
    }
  };

  const handleTouchEnd = () => {
    touchStartRef.current = null;
  };

  // ── Zoom controls ────────────────────────────────────────────────────────────
  const handleZoomIn = () => setZoom(z => Math.min(z * 1.25, 5.0));
  const handleZoomOut = () => setZoom(z => Math.max(z * 0.8, 0.3));
  const handleFit = () => {
    if (!containerRef.current) return;
    const cw = containerRef.current.clientWidth;
    const ch = containerRef.current.clientHeight;
    const fit = Math.min((cw * 0.88) / svgWidth, (ch * 0.88) / svgHeight, 1.2);
    setZoom(fit);
    setPan({ x: (cw - svgWidth * fit) / 2, y: (ch - svgHeight * fit) / 2 });
  };

  // ── Route geometry for active level ─────────────────────────────────────────
  const activeLevelRouteCoords = useMemo(() => {
    if (!route || !activeLevel || !route.geometryByLevel[activeLevel.id]) return null;
    const geom = route.geometryByLevel[activeLevel.id];
    if (!geom.coordinates || !Array.isArray(geom.coordinates)) return null;
    return geom.coordinates
      .filter(([x, y]) => typeof x === 'number' && typeof y === 'number')
      .map(([x, y]) => `${x * scale},${y * scale}`)
      .join(' ');
  }, [route, activeLevel?.id, scale]);

  const levelTransitions = useMemo(() => {
    if (!route || !activeLevel) return [];
    return route.steps.filter(s => s.isLevelTransition && (s.fromLevelId === activeLevel.id || s.toLevelId === activeLevel.id));
  }, [route, activeLevel?.id]);

  // ── Color tokens ─────────────────────────────────────────────────────────────
  const BG = isDarkMode ? '#0f172a' : '#f8fafc';
  const FLOOR_FILL = isDarkMode ? '#1e293b' : '#ffffff';
  const FLOOR_STROKE = isDarkMode ? '#334155' : '#cbd5e1';
  const UNIT_DEFAULT = isDarkMode ? '#1e293b' : '#f8fafc';
  const UNIT_HOVERED = isDarkMode ? '#1d3461' : '#eff6ff';
  const UNIT_SELECTED = isDarkMode ? '#1e3a8a' : '#dbeafe';
  const UNIT_STROKE_DEFAULT = isDarkMode ? '#475569' : '#94a3b8';
  const UNIT_STROKE_HOVERED = isDarkMode ? '#60a5fa' : '#3b82f6';
  const UNIT_STROKE_SELECTED = isDarkMode ? '#3b82f6' : '#2563eb';
  const LABEL_COLOR = isDarkMode ? '#cbd5e1' : '#334155';
  const LABEL_SELECTED = isDarkMode ? '#93c5fd' : '#1d4ed8';
  const EDGE_COLOR = isDarkMode ? '#334155' : '#cbd5e1';
  const TOOLTIP_BG = isDarkMode ? '#1e293b' : '#0f172a';

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="relative w-full h-full overflow-hidden cursor-grab active:cursor-grabbing select-none touch-none"
      style={{ background: BG }}
    >
      {/* Subtle grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.35] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(${isDarkMode ? '#1e293b' : '#e2e8f0'} 1px, transparent 1px),
                            linear-gradient(90deg, ${isDarkMode ? '#1e293b' : '#e2e8f0'} 1px, transparent 1px)`,
          backgroundSize: '32px 32px',
        }}
      />

      {/* Main SVG Canvas */}
      <svg
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: '0 0',
          transition: isDragging ? 'none' : 'transform 0.04s ease-out',
          width: svgWidth,
          height: svgHeight,
        }}
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="absolute top-0 left-0"
      >
        <defs>
          <filter id="shadow-soft" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="4" stdDeviation="8" floodColor={isDarkMode ? '#000' : '#0f172a'} floodOpacity="0.08" />
          </filter>
        </defs>

        {/* Floor base */}
        <rect x="0" y="0" width={svgWidth} height={svgHeight} rx="12"
          fill={FLOOR_FILL} stroke={FLOOR_STROKE} strokeWidth="2" filter="url(#shadow-soft)" />

        {/* Units (rooms) */}
        {levelMap?.units.features.map((unit) => {
          const isSel = selectedPOI?.id === unit.id;
          const isHov = hoveredUnit?.id === unit.id;
          const geom = unit.geometry;
          if (!geom?.coordinates) return null;

          const rings: string[] = [];
          let tx = 0, ty = 0, pc = 0;

          const processRing = (outer: any[]) => {
            const pts: string[] = [];
            for (const pt of outer) {
              if (Array.isArray(pt) && typeof pt[0] === 'number') {
                pts.push(`${pt[0] * scale},${pt[1] * scale}`);
                tx += pt[0]; ty += pt[1]; pc++;
              }
            }
            if (pts.length) rings.push(pts.join(' '));
          };

          if (geom.type === 'Polygon') processRing(geom.coordinates[0]);
          else if (geom.type === 'MultiPolygon') geom.coordinates.forEach((poly: any) => processRing(poly[0]));

          const cx = pc > 0 ? (tx / pc) * scale : null;
          const cy = pc > 0 ? (ty / pc) * scale : null;
          const fill = isSel ? UNIT_SELECTED : isHov ? UNIT_HOVERED : (unit.properties.color || UNIT_DEFAULT);
          const stroke = isSel ? UNIT_STROKE_SELECTED : isHov ? UNIT_STROKE_HOVERED : UNIT_STROKE_DEFAULT;

          return (
            <g key={unit.id} className="cursor-pointer"
              onMouseEnter={() => setHoveredUnit(unit)}
              onMouseLeave={() => setHoveredUnit(null)}
              onClick={(e) => {
                e.stopPropagation();
                const match = levelMap.pois.features.find(p => p.properties.name === unit.properties.name);
                if (match) onSelectPOI({
                  id: match.id, venue_id: activeLevel?.venue_id || '',
                  level_id: activeLevel?.id || '', name: match.properties.name,
                  category: match.properties.category, is_accessible: match.properties.is_accessible,
                  icon: match.properties.icon, x_meters: match.geometry.coordinates[0],
                  y_meters: match.geometry.coordinates[1], description: match.properties.description,
                });
              }}
            >
              {rings.map((pts, i) => (
                <polygon key={i} points={pts} fill={fill} stroke={stroke}
                  strokeWidth={isSel ? '2.5' : isHov ? '2' : '1.25'}
                  style={{ transition: 'fill 0.12s, stroke 0.12s' }} />
              ))}
              {cx !== null && cy !== null && unit.properties.name && (
                <text x={cx} y={cy} fill={isSel ? LABEL_SELECTED : LABEL_COLOR}
                  fontSize={Math.max(9, Math.min(12, 13 / zoom))} fontWeight="600"
                  textAnchor="middle" dominantBaseline="middle"
                  className="pointer-events-none select-none">
                  {unit.properties.name}
                </text>
              )}
            </g>
          );
        })}

        {/* Walkway network */}
        {levelMap?.edges.features.map((edge) => {
          const coords = edge.geometry?.coordinates;
          if (!Array.isArray(coords) || coords.length < 2) return null;
          if (edge.properties?.is_vertical) return null;
          const [p1, p2] = coords;
          return (
            <line key={edge.id}
              x1={p1[0] * scale} y1={p1[1] * scale}
              x2={p2[0] * scale} y2={p2[1] * scale}
              stroke={EDGE_COLOR} strokeWidth="1.5" strokeDasharray="4 4" />
          );
        })}

        {/* Active route */}
        {activeLevelRouteCoords && (
          <g>
            <polyline points={activeLevelRouteCoords} fill="none" stroke="#93c5fd"
              strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.4" />
            <polyline points={activeLevelRouteCoords} fill="none" stroke="#2563eb"
              strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
            <polyline points={activeLevelRouteCoords} fill="none" stroke="#ffffff"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              strokeDasharray="8 8" className="animate-route-dash" />
          </g>
        )}

        {/* POI markers */}
        {levelMap?.pois.features.map((poi) => {
          const [px, py] = poi.geometry.coordinates;
          const isSel = selectedPOI?.id === poi.id;
          return (
            <g key={poi.id} transform={`translate(${px * scale},${py * scale})`}
              className="cursor-pointer group"
              onClick={(e) => {
                e.stopPropagation();
                onSelectPOI({ id: poi.id, venue_id: activeLevel?.venue_id || '',
                  level_id: activeLevel?.id || '', name: poi.properties.name,
                  category: poi.properties.category, is_accessible: poi.properties.is_accessible,
                  icon: poi.properties.icon, x_meters: px, y_meters: py,
                  description: poi.properties.description });
              }}
            >
              <circle r={isSel ? '14' : '10'} fill={isSel ? '#2563eb' : '#3b82f6'}
                fillOpacity={isSel ? '0.2' : '0.12'}
                style={{ transition: 'r 0.15s, fill-opacity 0.15s' }} />
              <circle r={isSel ? '7' : '5.5'} fill={isSel ? '#2563eb' : '#ffffff'}
                stroke={isSel ? '#ffffff' : poi.properties.is_accessible ? '#16a34a' : '#2563eb'}
                strokeWidth="2.5" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.2))"
                style={{ transition: 'r 0.15s' }} />
              {poi.properties.is_accessible && !isSel && (
                <circle cx="4" cy="-4" r="2.5" fill="#16a34a" />
              )}
              {/* Tooltip */}
              <g transform="translate(0,-20)"
                className={`${isSel ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity duration-150 pointer-events-none`}>
                <rect x="-48" y="-12" width="96" height="21" rx="6" fill={TOOLTIP_BG}
                  filter="drop-shadow(0 3px 6px rgba(0,0,0,0.25))" />
                <text x="0" y="2" fill="#ffffff" fontSize="9.5" fontWeight="700"
                  textAnchor="middle" dominantBaseline="middle">
                  {poi.properties.name.length > 15 ? `${poi.properties.name.slice(0, 13)}…` : poi.properties.name}
                </text>
              </g>
            </g>
          );
        })}

        {/* Level transition badges */}
        {levelTransitions.map((t, i) => (
          <g key={i} transform={`translate(${t.startPoint.x * scale},${t.startPoint.y * scale})`} className="pointer-events-none">
            <rect x="-38" y="-27" width="76" height="22" rx="7" fill="#2563eb"
              stroke="#fff" strokeWidth="1.5" filter="drop-shadow(0 2px 6px rgba(37,99,235,0.35))" />
            <text x="0" y="-14" fill="#ffffff" fontSize="9" fontWeight="700"
              textAnchor="middle" dominantBaseline="middle">
              {t.direction.includes('elevator') ? '🛗 Elevator' : '🪜 Stairs'}
            </text>
          </g>
        ))}

        {/* "You Are Here" marker */}
        {userLocation && userLocation.levelId === activeLevel?.id && (
          <g transform={`translate(${userLocation.x * scale},${userLocation.y * scale})`}>
            <circle cx="0" cy="0" r="22" fill="#2563eb" className="radar-circle pointer-events-none" />
            <circle cx="0" cy="0" r="8" fill="#2563eb" stroke="#ffffff" strokeWidth="2.5"
              filter="drop-shadow(0 2px 8px rgba(37,99,235,0.45))" />
            <g transform="translate(0,16)" className="pointer-events-none">
              <rect x="-40" y="0" width="80" height="16" rx="4" fill={TOOLTIP_BG} />
              <text x="0" y="9" fill="#ffffff" fontSize="8.5" fontWeight="700"
                textAnchor="middle" dominantBaseline="middle">YOU ARE HERE</text>
            </g>
          </g>
        )}
      </svg>

      {/* Zoom controls */}
      <div className="absolute right-4 bottom-24 md:bottom-8 flex flex-col gap-2 z-20">
        <div className={`p-1 rounded-2xl flex flex-col gap-1 shadow-lg border
          ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
          {[
            { icon: <ZoomIn className="w-4 h-4" />, action: handleZoomIn, title: 'Zoom In' },
            { icon: <ZoomOut className="w-4 h-4" />, action: handleZoomOut, title: 'Zoom Out' },
            { icon: <Maximize2 className="w-4 h-4" />, action: handleFit, title: 'Fit Map' },
          ].map((btn, i) => (
            <React.Fragment key={i}>
              {i > 0 && <div className={`h-px mx-1 ${isDarkMode ? 'bg-slate-700' : 'bg-slate-200'}`} />}
              <button onClick={btn.action} title={btn.title}
                className={`p-2.5 rounded-xl transition
                  ${isDarkMode
                    ? 'text-slate-300 hover:text-white hover:bg-slate-800'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}>
                {btn.icon}
              </button>
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Selected POI popup */}
      {selectedPOI && (
        <div className={`absolute left-4 top-4 z-20 max-w-xs pointer-events-auto rounded-2xl border shadow-xl animate-in slide-in-from-top-4 duration-150
          ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'}`}>
          <div className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-base">{selectedPOI.name}</h4>
                  {selectedPOI.is_accessible && (
                    <span className={`px-1.5 py-0.5 rounded flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider border
                      ${isDarkMode ? 'bg-emerald-950/50 text-emerald-400 border-emerald-800' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                      <Accessibility className="w-3 h-3" /> ADA
                    </span>
                  )}
                </div>
                <p className={`text-xs mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  {selectedPOI.description || `Category: ${selectedPOI.category}`}
                </p>
              </div>
              <button onClick={() => onSelectPOI(null)}
                className={`p-1 rounded-lg transition ${isDarkMode ? 'text-slate-500 hover:text-slate-200 hover:bg-slate-800' : 'text-slate-400 hover:text-slate-700'}`}>
                ✕
              </button>
            </div>
            <button
              onClick={() => onQuickNavigateToPOI(selectedPOI)}
              className="mt-3 w-full py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition"
            >
              <Navigation className="w-3.5 h-3.5" /> Get Directions
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
