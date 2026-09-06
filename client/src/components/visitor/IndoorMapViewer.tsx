import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Level, LevelMapData, POI, RouteResponse, Checkpoint } from '../../types/client';
import { 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  MapPin, 
  Navigation, 
  Layers, 
  Accessibility,
  ArrowRight
} from 'lucide-react';

interface IndoorMapViewerProps {
  levelMap: LevelMapData | null;
  activeLevel: Level | null;
  route: RouteResponse | null;
  userLocation: { x: number; y: number; levelId: string; label?: string } | null;
  selectedPOI: POI | null;
  onSelectPOI: (poi: POI) => void;
  onQuickNavigateToPOI: (poi: POI) => void;
  onMapClickPosition?: (coords: { x: number; y: number; levelId: string }) => void;
}

export const IndoorMapViewer: React.FC<IndoorMapViewerProps> = ({
  levelMap,
  activeLevel,
  route,
  userLocation,
  selectedPOI,
  onSelectPOI,
  onQuickNavigateToPOI,
  onMapClickPosition
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoveredUnit, setHoveredUnit] = useState<any | null>(null);

  // Map scale and dimensions in meters
  const widthMeters = activeLevel?.width_meters || 80;
  const heightMeters = activeLevel?.height_meters || 60;
  const scale = activeLevel?.scale_pixels_per_meter || 20;

  const svgWidth = widthMeters * scale;
  const svgHeight = heightMeters * scale;

  // Reset pan/zoom on level switch
  useEffect(() => {
    if (containerRef.current) {
      const containerWidth = containerRef.current.clientWidth;
      const containerHeight = containerRef.current.clientHeight;
      const scaleX = (containerWidth * 0.88) / svgWidth;
      const scaleY = (containerHeight * 0.88) / svgHeight;
      const initialZoom = Math.min(scaleX, scaleY, 1.2);
      
      setZoom(initialZoom);
      setPan({
        x: (containerWidth - svgWidth * initialZoom) / 2,
        y: (containerHeight - svgHeight * initialZoom) / 2
      });
    }
  }, [activeLevel?.id, svgWidth, svgHeight]);

  // Mouse pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Zoom handlers
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
    const newZoom = Math.min(Math.max(zoom * zoomFactor, 0.4), 4.0);

    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      setPan({
        x: mouseX - (mouseX - pan.x) * (newZoom / zoom),
        y: mouseY - (mouseY - pan.y) * (newZoom / zoom)
      });
    }
    setZoom(newZoom);
  };

  const handleZoomIn = () => setZoom(z => Math.min(z * 1.25, 4.0));
  const handleZoomOut = () => setZoom(z => Math.max(z * 0.8, 0.4));
  const handleFit = () => {
    if (containerRef.current) {
      const containerWidth = containerRef.current.clientWidth;
      const containerHeight = containerRef.current.clientHeight;
      const scaleX = (containerWidth * 0.88) / svgWidth;
      const scaleY = (containerHeight * 0.88) / svgHeight;
      const fitZoom = Math.min(scaleX, scaleY, 1.2);
      setZoom(fitZoom);
      setPan({
        x: (containerWidth - svgWidth * fitZoom) / 2,
        y: (containerHeight - svgHeight * fitZoom) / 2
      });
    }
  };

  // Map route coordinates for the current floor
  const activeLevelRouteCoords = useMemo(() => {
    if (!route || !activeLevel || !route.geometryByLevel[activeLevel.id]) {
      return null;
    }
    const levelGeom = route.geometryByLevel[activeLevel.id];
    if (!levelGeom.coordinates || !Array.isArray(levelGeom.coordinates)) return null;
    return levelGeom.coordinates
      .filter(([x, y]) => typeof x === 'number' && typeof y === 'number')
      .map(([x, y]) => `${x * scale},${y * scale}`)
      .join(' ');
  }, [route, activeLevel?.id, scale]);

  // Find transition points (e.g. elevators or stairs to switch floor)
  const levelTransitions = useMemo(() => {
    if (!route || !activeLevel) return [];
    return route.steps.filter(
      s => s.isLevelTransition && (s.fromLevelId === activeLevel.id || s.toLevelId === activeLevel.id)
    );
  }, [route, activeLevel?.id]);

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      className="relative w-full h-full bg-slate-100 overflow-hidden cursor-grab active:cursor-grabbing select-none"
    >
      {/* Clean Architectural Grid Pattern */}
      <div 
        className="absolute inset-0 opacity-[0.4] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(#e2e8f0 1px, transparent 1px), linear-gradient(90deg, #e2e8f0 1px, transparent 1px)`,
          backgroundSize: '32px 32px'
        }}
      />

      {/* Main SVG Vector Canvas */}
      <svg
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: '0 0',
          transition: isDragging ? 'none' : 'transform 0.05s ease-out',
          width: svgWidth,
          height: svgHeight
        }}
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="absolute top-0 left-0"
      >
        <defs>
          {/* Subtle Route Drop Shadow */}
          <filter id="routeShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* 1. Floor Base Boundary (Crisp White with Soft Border) */}
        <rect
          x="0"
          y="0"
          width={svgWidth}
          height={svgHeight}
          rx="12"
          fill="#ffffff"
          stroke="#cbd5e1"
          strokeWidth="2"
          filter="drop-shadow(0 4px 12px rgba(15,23,42,0.06))"
        />

        {/* 2. Units / Rooms (Polygons & MultiPolygons) */}
        {levelMap?.units.features.map((unit) => {
          const isSelected = selectedPOI?.id === unit.id;
          const isHovered = hoveredUnit?.id === unit.id;

          const geom = unit.geometry;
          if (!geom || !geom.coordinates) return null;

          const rings: string[] = [];
          let totalX = 0, totalY = 0, ptCount = 0;

          if (geom.type === 'Polygon' && Array.isArray(geom.coordinates)) {
            const outer = geom.coordinates[0];
            if (Array.isArray(outer)) {
              const pts: string[] = [];
              for (const pt of outer) {
                if (Array.isArray(pt) && typeof pt[0] === 'number' && typeof pt[1] === 'number') {
                  pts.push(`${pt[0] * scale},${pt[1] * scale}`);
                  totalX += pt[0];
                  totalY += pt[1];
                  ptCount++;
                }
              }
              if (pts.length > 0) rings.push(pts.join(' '));
            }
          } else if (geom.type === 'MultiPolygon' && Array.isArray(geom.coordinates)) {
            for (const poly of geom.coordinates) {
              if (Array.isArray(poly) && Array.isArray(poly[0])) {
                const pts: string[] = [];
                for (const pt of poly[0]) {
                  if (Array.isArray(pt) && typeof pt[0] === 'number' && typeof pt[1] === 'number') {
                    pts.push(`${pt[0] * scale},${pt[1] * scale}`);
                    totalX += pt[0];
                    totalY += pt[1];
                    ptCount++;
                  }
                }
                if (pts.length > 0) rings.push(pts.join(' '));
              }
            }
          }

          const centroidX = ptCount > 0 ? (totalX / ptCount) * scale : null;
          const centroidY = ptCount > 0 ? (totalY / ptCount) * scale : null;

          // Clean architectural fill colors
          const fillColor = isSelected
            ? '#dbeafe'
            : isHovered
            ? '#eff6ff'
            : unit.properties.color || '#f8fafc';

          const strokeColor = isSelected
            ? '#2563eb'
            : isHovered
            ? '#3b82f6'
            : '#94a3b8';

          return (
            <g
              key={unit.id}
              className="cursor-pointer transition-all duration-150"
              onMouseEnter={() => setHoveredUnit(unit)}
              onMouseLeave={() => setHoveredUnit(null)}
              onClick={(e) => {
                e.stopPropagation();
                const matchingPoi = levelMap.pois.features.find(p => p.properties.name === unit.properties.name);
                if (matchingPoi) {
                  onSelectPOI({
                    id: matchingPoi.id,
                    venue_id: activeLevel?.venue_id || '',
                    level_id: activeLevel?.id || '',
                    name: matchingPoi.properties.name,
                    category: matchingPoi.properties.category,
                    is_accessible: matchingPoi.properties.is_accessible,
                    icon: matchingPoi.properties.icon,
                    x_meters: matchingPoi.geometry.coordinates[0],
                    y_meters: matchingPoi.geometry.coordinates[1],
                    description: matchingPoi.properties.description
                  });
                }
              }}
            >
              {/* Unit Polygon Rings */}
              {rings.map((pointsStr, rIdx) => (
                <polygon
                  key={rIdx}
                  points={pointsStr}
                  fill={fillColor}
                  stroke={strokeColor}
                  strokeWidth={isSelected ? '2.5' : isHovered ? '2' : '1.25'}
                  className="transition-colors duration-150"
                />
              ))}

              {/* Room Label at Centroid */}
              {centroidX !== null && centroidY !== null && unit.properties.name && (
                <text
                  x={centroidX}
                  y={centroidY}
                  fill={isSelected ? '#1d4ed8' : '#334155'}
                  fontSize={Math.max(10, Math.min(12, 13 / zoom))}
                  fontWeight="600"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="pointer-events-none select-none font-sans"
                >
                  {unit.properties.name}
                </text>
              )}
            </g>
          );
        })}

        {/* 3. Walkway Hallway Network */}
        {levelMap?.edges.features.map((edge) => {
          const coords = edge.geometry?.coordinates;
          if (!Array.isArray(coords) || coords.length < 2 || !coords[0] || !coords[1]) return null;
          const [p1, p2] = coords;
          const isVertical = edge.properties?.is_vertical;
          if (isVertical) return null;

          return (
            <line
              key={edge.id}
              x1={p1[0] * scale}
              y1={p1[1] * scale}
              x2={p2[0] * scale}
              y2={p2[1] * scale}
              stroke="#cbd5e1"
              strokeWidth="1.5"
              strokeDasharray="4 4"
            />
          );
        })}

        {/* 4. Active Turn-by-Turn Route Polyline (High-Contrast Royal Blue) */}
        {activeLevelRouteCoords && (
          <g>
            {/* Outer Blue Halo */}
            <polyline
              points={activeLevelRouteCoords}
              fill="none"
              stroke="#93c5fd"
              strokeWidth="8"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeOpacity="0.6"
            />

            {/* Core Solid Blue Route Line */}
            <polyline
              points={activeLevelRouteCoords}
              fill="none"
              stroke="#2563eb"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Moving White Direction Dashes */}
            <polyline
              points={activeLevelRouteCoords}
              fill="none"
              stroke="#ffffff"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="8 8"
              className="animate-route-dash"
            />
          </g>
        )}

        {/* 5. Points of Interest (POIs) Markers */}
        {levelMap?.pois.features.map((poi) => {
          const [px, py] = poi.geometry.coordinates;
          const isSelected = selectedPOI?.id === poi.id;
          const isAccessible = poi.properties.is_accessible;

          return (
            <g
              key={poi.id}
              transform={`translate(${px * scale}, ${py * scale})`}
              className="cursor-pointer group"
              onClick={(e) => {
                e.stopPropagation();
                onSelectPOI({
                  id: poi.id,
                  venue_id: activeLevel?.venue_id || '',
                  level_id: activeLevel?.id || '',
                  name: poi.properties.name,
                  category: poi.properties.category,
                  is_accessible: poi.properties.is_accessible,
                  icon: poi.properties.icon,
                  x_meters: px,
                  y_meters: py,
                  description: poi.properties.description
                });
              }}
            >
              {/* Outer halo */}
              <circle
                r={isSelected ? '14' : '9'}
                fill={isSelected ? '#2563eb' : '#3b82f6'}
                fillOpacity={isSelected ? '0.2' : '0.1'}
                className="group-hover:scale-125 transition-transform duration-150"
              />

              {/* Pin Base */}
              <circle
                r={isSelected ? '7' : '5'}
                fill={isSelected ? '#2563eb' : '#ffffff'}
                stroke={isSelected ? '#ffffff' : isAccessible ? '#16a34a' : '#2563eb'}
                strokeWidth="2"
                filter="drop-shadow(0 2px 4px rgba(0,0,0,0.15))"
              />

              {/* Accessible green dot */}
              {isAccessible && !isSelected && (
                <circle
                  cx="3.5"
                  cy="-3.5"
                  r="2"
                  fill="#16a34a"
                />
              )}

              {/* Hover Tooltip */}
              <g
                transform="translate(0, -18)"
                className={`${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity duration-150 pointer-events-none`}
              >
                <rect
                  x="-45"
                  y="-11"
                  width="90"
                  height="20"
                  rx="6"
                  fill="#0f172a"
                  filter="drop-shadow(0 4px 6px rgba(0,0,0,0.2))"
                />
                <text
                  x="0"
                  y="2"
                  fill="#ffffff"
                  fontSize="9.5"
                  fontWeight="600"
                  textAnchor="middle"
                  dominantBaseline="middle"
                >
                  {poi.properties.name.length > 14 ? `${poi.properties.name.substring(0, 12)}...` : poi.properties.name}
                </text>
              </g>
            </g>
          );
        })}

        {/* 6. Level Transition Badges (Elevator / Stairs) */}
        {levelTransitions.map((t, idx) => {
          const pt = t.startPoint;
          return (
            <g
              key={`trans-${idx}`}
              transform={`translate(${pt.x * scale}, ${pt.y * scale})`}
              className="pointer-events-none"
            >
              <rect
                x="-36"
                y="-26"
                width="72"
                height="20"
                rx="6"
                fill="#2563eb"
                stroke="#ffffff"
                strokeWidth="1.5"
                filter="drop-shadow(0 2px 6px rgba(37,99,235,0.3))"
              />
              <text
                x="0"
                y="-14"
                fill="#ffffff"
                fontSize="9"
                fontWeight="700"
                textAnchor="middle"
                dominantBaseline="middle"
              >
                {t.direction.includes('elevator') ? 'Elevator' : 'Stairs'}
              </text>
            </g>
          );
        })}

        {/* 7. "You Are Here" User Location Marker */}
        {userLocation && userLocation.levelId === activeLevel?.id && (
          <g transform={`translate(${userLocation.x * scale}, ${userLocation.y * scale})`}>
            {/* Animated radar ripple */}
            <circle
              cx="0"
              cy="0"
              r="20"
              fill="#2563eb"
              className="radar-circle pointer-events-none"
            />
            {/* Center solid royal blue marker */}
            <circle
              cx="0"
              cy="0"
              r="7"
              fill="#2563eb"
              stroke="#ffffff"
              strokeWidth="2.5"
              filter="drop-shadow(0 2px 6px rgba(37,99,235,0.4))"
            />
            {/* Label */}
            <g transform="translate(0, 14)" className="pointer-events-none">
              <rect
                x="-36"
                y="0"
                width="72"
                height="16"
                rx="4"
                fill="#0f172a"
              />
              <text
                x="0"
                y="9"
                fill="#ffffff"
                fontSize="8.5"
                fontWeight="700"
                textAnchor="middle"
                dominantBaseline="middle"
              >
                YOU ARE HERE
              </text>
            </g>
          </g>
        )}
      </svg>

      {/* Floating Canvas View Controls (+ / - / Reset) */}
      <div className="absolute right-4 bottom-24 md:bottom-8 flex flex-col gap-2 z-20">
        <div className="bg-white p-1 rounded-2xl flex flex-col gap-1 shadow-lg border border-slate-200">
          <button
            onClick={handleZoomIn}
            className="p-2.5 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <div className="h-[1px] bg-slate-200 mx-1" />
          <button
            onClick={handleZoomOut}
            className="p-2.5 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <div className="h-[1px] bg-slate-200 mx-1" />
          <button
            onClick={handleFit}
            className="p-2.5 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition"
            title="Fit Map to View"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Selected POI Details Popup Banner */}
      {selectedPOI && (
        <div className="absolute left-4 top-4 z-20 max-w-sm bg-white p-4 rounded-2xl border border-slate-200 shadow-xl animate-in slide-in-from-top-4 duration-150 text-slate-900">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-slate-900 text-base">{selectedPOI.name}</h4>
                {selectedPOI.is_accessible && (
                  <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 border border-emerald-200">
                    <Accessibility className="w-3 h-3" /> ADA
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1">{selectedPOI.description || `Category: ${selectedPOI.category}`}</p>
            </div>
            <button
              onClick={() => onSelectPOI(null as any)}
              className="text-slate-400 hover:text-slate-700 text-sm p-1"
            >
              ✕
            </button>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={() => onQuickNavigateToPOI(selectedPOI)}
              className="flex-1 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition"
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>Get Directions</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
