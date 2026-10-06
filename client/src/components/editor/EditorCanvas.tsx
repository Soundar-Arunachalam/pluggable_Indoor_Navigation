import React, { useState, useRef, useEffect } from 'react';
import { useEditorStore } from '../../stores/editorStore';
import { Level, LevelMapData, POI } from '../../types/client';
import { EditorTool } from './ToolSidebar';
import { 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Trash2, 
  Plus, 
  Edit, 
  Check, 
  X,
  Upload,
  Ruler
} from 'lucide-react';
import { generateId } from '../../utils/id';

interface EditorCanvasProps {
  levelMap: LevelMapData | null;
  activeLevel: Level | null;
  activeTool: EditorTool;
  onMapUpdated: (updatedData: LevelMapData) => void;
}

export const EditorCanvas: React.FC<EditorCanvasProps> = ({
  levelMap,
  activeLevel,
  activeTool,
  onMapUpdated
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Tracing states
  const [currentPolygonPoints, setCurrentPolygonPoints] = useState<[number, number][]>([]);
  const [edgeStartNodeId, setEdgeStartNodeId] = useState<string | null>(null);
  const { selectedElement, setSelectedElement } = useEditorStore();
  const [scaleMeasurePoints, setScaleMeasurePoints] = useState<[number, number][]>([]);
  const [isScaleModalOpen, setIsScaleModalOpen] = useState(false);
  const [realWorldMetersInput, setRealWorldMetersInput] = useState('10');

  const widthMeters = activeLevel?.width_meters || 80;
  const heightMeters = activeLevel?.height_meters || 60;
  const scale = activeLevel?.scale_pixels_per_meter || 20;

  const svgWidth = widthMeters * scale;
  const svgHeight = heightMeters * scale;

  // Fit canvas on load
  useEffect(() => {
    if (containerRef.current) {
      const containerWidth = containerRef.current.clientWidth;
      const containerHeight = containerRef.current.clientHeight;
      const fitZoom = Math.min((containerWidth * 0.85) / svgWidth, (containerHeight * 0.85) / svgHeight, 1.2);
      setZoom(fitZoom);
      setPan({
        x: (containerWidth - svgWidth * fitZoom) / 2,
        y: (containerHeight - svgHeight * fitZoom) / 2
      });
    }
  }, [activeLevel?.id, svgWidth, svgHeight]);

  // Convert client click coordinate into meters on the canvas
  const getCanvasCoordsInMeters = (e: React.MouseEvent): [number, number] | null => {
    if (!containerRef.current) return null;
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const svgX = (mouseX - pan.x) / zoom;
    const svgY = (mouseY - pan.y) / zoom;

    const metersX = Math.round((svgX / scale) * 100) / 100;
    const metersY = Math.round((svgY / scale) * 100) / 100;

    return [metersX, metersY];
  };

  // Canvas Click Handlers based on active tool
  const handleCanvasClick = (e: React.MouseEvent) => {
    if (isDragging) return;
    const coords = getCanvasCoordsInMeters(e);
    if (!coords || !levelMap) return;
    const [x, y] = coords;

    // 1. Tool: Place Node
    if (activeTool === 'node') {
      const newNodeId = generateId('node');
      const newNode = {
        type: 'Feature' as const,
        id: newNodeId,
        geometry: { type: 'Point', coordinates: [x, y] },
        properties: {
          name: `Waypoint ${levelMap.nodes.features.length + 1}`,
          node_type: 'hallway',
          is_accessible: true
        }
      };

      const updated = {
        ...levelMap,
        nodes: {
          ...levelMap.nodes,
          features: [...levelMap.nodes.features, newNode]
        }
      };
      onMapUpdated(updated);
      setSelectedElement({ type: 'node', id: newNodeId, data: newNode.properties });
      return;
    }

    // 2. Tool: Draw Room Polygon
    if (activeTool === 'room') {
      // If clicking near first point, close polygon
      if (currentPolygonPoints.length >= 3) {
        const first = currentPolygonPoints[0];
        const dist = Math.sqrt(Math.pow(first[0] - x, 2) + Math.pow(first[1] - y, 2));
        if (dist < 2.0) { // Close polygon
          const finalPoints = [...currentPolygonPoints, first];
          const newUnitId = generateId('unit');
          const newUnit = {
            type: 'Feature' as const,
            id: newUnitId,
            geometry: {
              type: 'Polygon',
              coordinates: [finalPoints]
            },
            properties: {
              name: `Room ${levelMap.units.features.length + 1}`,
              category: 'room',
              accessibility_type: 'standard',
              color: '#c7d2fe'
            }
          };

          const updated = {
            ...levelMap,
            units: {
              ...levelMap.units,
              features: [...levelMap.units.features, newUnit]
            }
          };
          onMapUpdated(updated);
          setCurrentPolygonPoints([]);
          setSelectedElement({ type: 'unit', id: newUnitId, data: newUnit.properties });
          return;
        }
      }

      setCurrentPolygonPoints(prev => [...prev, [x, y]]);
      return;
    }

    // 3. Tool: Place POI Pin
    if (activeTool === 'poi') {
      const newPoiId = generateId('poi');
      const newPoi = {
        type: 'Feature' as const,
        id: newPoiId,
        geometry: { type: 'Point', coordinates: [x, y] },
        properties: {
          name: `Point of Interest ${levelMap.pois.features.length + 1}`,
          category: 'info',
          is_accessible: true,
          icon: 'map-pin',
          description: ''
        }
      };

      const updated = {
        ...levelMap,
        pois: {
          ...levelMap.pois,
          features: [...levelMap.pois.features, newPoi]
        }
      };
      onMapUpdated(updated);
      setSelectedElement({ type: 'poi', id: newPoiId, data: newPoi.properties });
      return;
    }

    // 4. Tool: Calibrate Scale
    if (activeTool === 'scale') {
      if (scaleMeasurePoints.length === 0) {
        setScaleMeasurePoints([[x, y]]);
      } else if (scaleMeasurePoints.length === 1) {
        setScaleMeasurePoints(prev => [...prev, [x, y]]);
        setIsScaleModalOpen(true);
      } else {
        setScaleMeasurePoints([[x, y]]);
      }
    }
  };

  // Node Click handler for Connecting Edges
  const handleNodeClick = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    if (activeTool === 'edge' && levelMap) {
      if (!edgeStartNodeId) {
        setEdgeStartNodeId(nodeId);
      } else {
        if (edgeStartNodeId !== nodeId) {
          // Create edge
          const fromNode = levelMap.nodes.features.find(n => n.id === edgeStartNodeId);
          const toNode = levelMap.nodes.features.find(n => n.id === nodeId);
          if (fromNode && toNode) {
            const [x1, y1] = fromNode.geometry.coordinates;
            const [x2, y2] = toNode.geometry.coordinates;
            const dist = Math.round(Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2)) * 10) / 10;

            const newEdgeId = generateId('edge');
            const newEdge = {
              type: 'Feature' as const,
              id: newEdgeId,
              geometry: {
                type: 'LineString',
                coordinates: [[x1, y1], [x2, y2]]
              },
              properties: {
                from_node_id: edgeStartNodeId,
                to_node_id: nodeId,
                edge_type: 'walkway',
                distance_meters: dist,
                is_accessible: true,
                is_vertical: false
              }
            };

            const updated = {
              ...levelMap,
              edges: {
                ...levelMap.edges,
                features: [...levelMap.edges.features, newEdge]
              }
            };
            onMapUpdated(updated);
          }
        }
        setEdgeStartNodeId(null);
      }
    } else {
      const node = levelMap?.nodes.features.find(n => n.id === nodeId);
      if (node) setSelectedElement({ type: 'node', id: nodeId, data: node.properties });
    }
  };


  // Mouse pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && activeTool === 'select')) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onClick={handleCanvasClick}
      className={`relative w-full h-[calc(100vh-120px)] bg-slate-950 overflow-hidden select-none ${
        activeTool === 'select' ? 'cursor-grab active:cursor-grabbing' : 'cursor-crosshair'
      }`}
    >
      {/* Architectural Blueprint Grid Pattern */}
      <div 
        className="absolute inset-0 opacity-[0.4] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(#e2e8f0 1px, transparent 1px), linear-gradient(90deg, #e2e8f0 1px, transparent 1px)`,
          backgroundSize: '20px 20px'
        }}
      />

      {/* SVG Canvas */}
      <svg
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: '0 0',
          width: svgWidth,
          height: svgHeight
        }}
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="absolute top-0 left-0"
      >
        {/* Floor Base */}
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

        {/* Uploaded Blueprint / Floorplan Overlay Image */}
        {activeLevel?.floorplan_svg_url && (
          <image
            href={activeLevel.floorplan_svg_url}
            x="0"
            y="0"
            width={svgWidth}
            height={svgHeight}
            opacity="0.65"
            preserveAspectRatio="none"
          />
        )}

        {/* Existing Units / Rooms (Polygons & MultiPolygons) */}
        {levelMap?.units.features.map((unit) => {
          const isSelected = selectedElement?.id === unit.id;
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

          return (
            <g
              key={unit.id}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedElement({ type: 'unit', id: unit.id, data: unit.properties });
              }}
              className="cursor-pointer"
            >
              {rings.map((pointsStr, rIdx) => (
                <polygon
                  key={rIdx}
                  points={pointsStr}
                  fill={isSelected ? '#dbeafe' : unit.properties.color || '#f8fafc'}
                  stroke={isSelected ? '#2563eb' : '#94a3b8'}
                  strokeWidth={isSelected ? '2.5' : '1.25'}
                />
              ))}

              {centroidX !== null && centroidY !== null && unit.properties.name && (
                <text
                  x={centroidX}
                  y={centroidY}
                  fill={isSelected ? '#1d4ed8' : '#334155'}
                  fontSize={11}
                  fontWeight="600"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="pointer-events-none font-sans"
                >
                  {unit.properties.name}
                </text>
              )}
            </g>
          );
        })}

        {/* In-Progress Polygon Tracing Preview */}
        {currentPolygonPoints.length > 0 && (
          <g>
            <polyline
              points={currentPolygonPoints.map(([x, y]) => `${x * scale},${y * scale}`).join(' ')}
              fill="none"
              stroke="#2563eb"
              strokeWidth="2"
              strokeDasharray="4 4"
            />
            {currentPolygonPoints.map(([x, y], idx) => (
              <circle
                key={idx}
                cx={x * scale}
                cy={y * scale}
                r="4"
                fill={idx === 0 ? '#16a34a' : '#2563eb'}
                stroke="#ffffff"
                strokeWidth="1.5"
              />
            ))}
          </g>
        )}

        {/* Edges / Walkways */}
        {levelMap?.edges.features.map((edge) => {
          const coords = edge.geometry?.coordinates;
          if (!Array.isArray(coords) || coords.length < 2 || !coords[0] || !coords[1]) return null;
          const [p1, p2] = coords;
          const isSelected = selectedElement?.id === edge.id;
          return (
            <g
              key={edge.id}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedElement({ type: 'edge', id: edge.id, data: edge.properties });
              }}
              className="cursor-pointer"
            >
              <line
                x1={p1[0] * scale}
                y1={p1[1] * scale}
                x2={p2[0] * scale}
                y2={p2[1] * scale}
                stroke={isSelected ? '#2563eb' : '#cbd5e1'}
                strokeWidth={isSelected ? '3.5' : '1.5'}
                strokeDasharray="4 2"
              />
            </g>
          );
        })}

        {/* Nodes / Waypoints */}
        {levelMap?.nodes.features.map((node) => {
          const [nx, ny] = node.geometry.coordinates;
          const isSelected = selectedElement?.id === node.id;
          const isEdgeSource = edgeStartNodeId === node.id;

          return (
            <g
              key={node.id}
              transform={`translate(${nx * scale}, ${ny * scale})`}
              onClick={(e) => handleNodeClick(e, node.id)}
              className="cursor-pointer"
            >
              <circle
                r={isEdgeSource ? '10' : isSelected ? '8' : '5'}
                fill={isEdgeSource ? '#2563eb' : isSelected ? '#2563eb' : '#0284c7'}
                stroke="#ffffff"
                strokeWidth="2"
                className={isEdgeSource ? 'animate-ping' : ''}
              />
              <circle
                r={isSelected ? '8' : '5'}
                fill={isEdgeSource ? '#2563eb' : isSelected ? '#2563eb' : '#0284c7'}
                stroke="#ffffff"
                strokeWidth="2"
              />
            </g>
          );
        })}

        {/* POIs */}
        {levelMap?.pois.features.map((poi) => {
          const [px, py] = poi.geometry.coordinates;
          const isSelected = selectedElement?.id === poi.id;

          return (
            <g
              key={poi.id}
              transform={`translate(${px * scale}, ${py * scale})`}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedElement({ type: 'poi', id: poi.id, data: poi.properties });
              }}
              className="cursor-pointer"
            >
              <circle
                r={isSelected ? '10' : '6'}
                fill={isSelected ? '#2563eb' : '#16a34a'}
                stroke="#ffffff"
                strokeWidth="2"
                filter="drop-shadow(0 2px 4px rgba(0,0,0,0.15))"
              />
            </g>
          );
        })}

        {/* Scale calibration points */}
        {scaleMeasurePoints.map(([sx, sy], idx) => (
          <circle
            key={`scale-pt-${idx}`}
            cx={sx * scale}
            cy={sy * scale}
            r="6"
            fill="#f59e0b"
            stroke="#ffffff"
            strokeWidth="2"
          />
        ))}
      </svg>


      {/* Editor Bottom Status & Help Overlay */}
      <div className="absolute bottom-4 left-4 z-20 bg-white/90 backdrop-blur px-4 py-2 rounded-xl border border-slate-200 shadow-md text-xs text-slate-600 flex items-center gap-3">
        <span className="font-bold text-slate-900">Active Tool:</span>
        <span className="capitalize px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold border border-blue-200">
          {activeTool}
        </span>
        <span className="hidden sm:inline text-slate-400">|</span>
        <span className="hidden sm:inline text-[11px]">
          {activeTool === 'room' && 'Click on canvas to trace room perimeter. Click near first point to close.'}
          {activeTool === 'node' && 'Click anywhere on canvas to place a routing waypoint.'}
          {activeTool === 'edge' && 'Click first waypoint, then second waypoint to create a connecting walkway.'}
          {activeTool === 'poi' && 'Click to drop a searchable Point of Interest pin.'}
          {activeTool === 'select' && 'Click any element to inspect, modify, or delete.'}
          {activeTool === 'scale' && 'Click two points across a known distance to calibrate map scale.'}
        </span>
      </div>
    </div>
  );
};
