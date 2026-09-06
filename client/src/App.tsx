import React, { useState, useEffect, useCallback } from 'react';
import { Venue, Level, LevelMapData, POI, RouteResponse, Checkpoint } from './types/client';
import { api } from './api/client';
import { Navbar } from './components/common/Navbar';
import { IndoorMapViewer } from './components/visitor/IndoorMapViewer';
import { LevelSelector } from './components/visitor/LevelSelector';
import { POISearchDrawer } from './components/visitor/POISearchDrawer';
import { RouteGuidanceHUD } from './components/visitor/RouteGuidanceHUD';
import { AccessibilityToggle } from './components/visitor/AccessibilityToggle';
import { QRScannerModal } from './components/visitor/QRScannerModal';
import { Toolbar, EditorTool } from './components/editor/Toolbar';
import { EditorCanvas } from './components/editor/EditorCanvas';
import { VerticalLinkModal } from './components/editor/VerticalLinkModal';
import { QRGeneratorModal } from './components/editor/QRGeneratorModal';
import { IMDFExportModal } from './components/editor/IMDFExportModal';
import { UploadLayoutModal } from './components/editor/UploadLayoutModal';
import { Loader2, AlertCircle } from 'lucide-react';

export const App: React.FC = () => {
  // Global States
  const [venues, setVenues] = useState<Venue[]>([]);
  const [currentVenue, setCurrentVenue] = useState<Venue | null>(null);
  const [levels, setLevels] = useState<Level[]>([]);
  const [activeLevel, setActiveLevel] = useState<Level | null>(null);
  const [levelMap, setLevelMap] = useState<LevelMapData | null>(null);
  const [allVenuePOIs, setAllVenuePOIs] = useState<POI[]>([]);

  // Navigation States
  const [activeMode, setActiveMode] = useState<'visitor' | 'editor'>('visitor');
  const [userLocation, setUserLocation] = useState<{ x: number; y: number; levelId: string; label?: string } | null>(null);
  const [selectedPOI, setSelectedPOI] = useState<POI | null>(null);
  const [route, setRoute] = useState<RouteResponse | null>(null);
  const [accessibleOnly, setAccessibleOnly] = useState<boolean>(false);
  const [targetPOIForRoute, setTargetPOIForRoute] = useState<POI | null>(null);

  // Editor States
  const [editorTool, setEditorTool] = useState<EditorTool>('select');
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Modals
  const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);
  const [isIMDFExportOpen, setIsIMDFExportOpen] = useState(false);
  const [isQRGeneratorOpen, setIsQRGeneratorOpen] = useState(false);
  const [isVerticalLinkerOpen, setIsVerticalLinkerOpen] = useState(false);
  const [isUploadLayoutOpen, setIsUploadLayoutOpen] = useState(false);

  // Status & Errors
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 1. Initial Load: Fetch Venues
  useEffect(() => {
    setLoading(true);
    api.getVenues()
      .then((loadedVenues) => {
        setVenues(loadedVenues);
        if (loadedVenues.length > 0) {
          setCurrentVenue(loadedVenues[0]);
        }
      })
      .catch((err) => {
        console.error(err);
        setError('Failed to connect to backend navigation server.');
      })
      .finally(() => setLoading(false));
  }, []);

  // 2. Load Venue Details & Levels
  useEffect(() => {
    if (!currentVenue) return;
    api.getVenueDetails(currentVenue.id)
      .then((details) => {
        setLevels(details.levels);
        if (details.levels.length > 0) {
          setActiveLevel(details.levels[0]);
        }
      })
      .catch(console.error);

    // Fetch checkpoints and set initial user location to main entrance
    api.getCheckpoints(currentVenue.id)
      .then((cps) => {
        if (cps.length > 0 && !userLocation) {
          const firstCp = cps.find(c => c.code.includes('ENTRANCE')) || cps[0];
          setUserLocation({
            x: firstCp.x_meters || 40,
            y: firstCp.y_meters || 8,
            levelId: firstCp.level_id,
            label: firstCp.label
          });
        }
      })
      .catch(console.error);

    // Fetch all POIs in this venue for search
    api.searchPOIs(currentVenue.id)
      .then(setAllVenuePOIs)
      .catch(console.error);
  }, [currentVenue?.id]);

  // 3. Load Level Map
  const loadActiveLevelMap = useCallback(async () => {
    if (!currentVenue || !activeLevel) return;
    try {
      const map = await api.getLevelMap(currentVenue.id, activeLevel.id);
      setLevelMap(map);
    } catch (e) {
      console.error(e);
    }
  }, [currentVenue?.id, activeLevel?.id]);

  useEffect(() => {
    loadActiveLevelMap();
  }, [loadActiveLevelMap]);

  // 4. Calculate Route Function (Invoked from POI click or accessibility change)
  const calculateRouteToTarget = useCallback(async (target: POI, isAccessible: boolean) => {
    if (!currentVenue) return;

    try {
      setError(null);
      const startPayload: any = userLocation
        ? {
            startCoords: {
              x: userLocation.x,
              y: userLocation.y,
              levelId: userLocation.levelId
            }
          }
        : {};

      const res = await api.calculateRoute(currentVenue.id, {
        ...startPayload,
        targetPoiId: target.id,
        accessibleOnly: isAccessible
      });

      if (res.success) {
        setRoute(res);
        setTargetPOIForRoute(target);
        setError(null);

        // If user location was not previously set, snap it to the starting waypoint
        if (!userLocation && res.waypoints.length > 0) {
          const firstWp = res.waypoints[0];
          setUserLocation({
            x: firstWp.x,
            y: firstWp.y,
            levelId: firstWp.levelId,
            label: firstWp.name || 'Starting Point'
          });
        }

        // Switch to starting floor if different from active
        if (res.waypoints.length > 0 && res.waypoints[0].levelId !== activeLevel?.id) {
          const startingLevel = levels.find(l => l.id === res.waypoints[0].levelId);
          if (startingLevel) setActiveLevel(startingLevel);
        }
      } else {
        setError(res.error || 'No route could be calculated.');
      }
    } catch (err: any) {
      setError(err.message || 'Routing service error.');
    }
  }, [currentVenue?.id, activeLevel?.id, userLocation, levels]);

  // Re-calculate route when accessibility mode changes
  const handleToggleAccessibility = (enabled: boolean) => {
    setAccessibleOnly(enabled);
    if (targetPOIForRoute) {
      calculateRouteToTarget(targetPOIForRoute, enabled);
    }
  };

  // Checkpoint Scanned Handler
  const handleLocationResolved = (cp: Checkpoint) => {
    const cpLevel = levels.find(l => l.id === cp.level_id);
    if (cpLevel) {
      setActiveLevel(cpLevel);
    }
    setUserLocation({
      x: cp.x_meters || 40,
      y: cp.y_meters || 18,
      levelId: cp.level_id,
      label: cp.label
    });

    // If there was an active target, recompute route from new location
    if (targetPOIForRoute) {
      setTimeout(() => {
        calculateRouteToTarget(targetPOIForRoute, accessibleOnly);
      }, 100);
    }
  };

  // Editor: Save Geometry to DB
  const handleSaveEditorGeometry = async () => {
    if (!currentVenue || !activeLevel || !levelMap) return;
    try {
      setIsSaving(true);
      const units = levelMap.units.features.map(u => ({
        id: u.id,
        name: u.properties.name,
        category: u.properties.category,
        accessibility_type: u.properties.accessibility_type,
        geometry_geojson: u.geometry,
        color: u.properties.color
      }));

      const nodes = levelMap.nodes.features.map(n => ({
        id: n.id,
        x_meters: n.geometry.coordinates[0],
        y_meters: n.geometry.coordinates[1],
        node_type: n.properties.node_type,
        is_accessible: n.properties.is_accessible,
        name: n.properties.name
      }));

      const edges = levelMap.edges.features.map(e => ({
        id: e.id,
        from_node_id: e.properties.from_node_id,
        to_node_id: e.properties.to_node_id,
        edge_type: e.properties.edge_type,
        distance_meters: e.properties.distance_meters,
        is_accessible: e.properties.is_accessible,
        vertical_connector_group: e.properties.vertical_connector_group
      }));

      const pois = levelMap.pois.features.map(p => ({
        id: p.id,
        name: p.properties.name,
        category: p.properties.category,
        is_accessible: p.properties.is_accessible,
        icon: p.properties.icon,
        x_meters: p.geometry.coordinates[0],
        y_meters: p.geometry.coordinates[1],
        description: p.properties.description
      }));

      await api.saveGeometry(currentVenue.id, activeLevel.id, { units, nodes, edges, pois });
      setHasUnsavedChanges(false);
      // Reload POIs
      const updatedPOIs = await api.searchPOIs(currentVenue.id);
      setAllVenuePOIs(updatedPOIs);
    } catch (e: any) {
      alert('Error saving geometry: ' + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="w-screen h-screen bg-slate-50 flex flex-col items-center justify-center gap-3 text-slate-700">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        <p className="text-sm font-semibold tracking-wide">Initializing Indoor Navigation Platform...</p>
      </div>
    );
  }

  return (
    <div className="w-screen h-screen bg-slate-50 flex flex-col overflow-hidden text-slate-900">
      {/* Top Navbar */}
      <Navbar
        venues={venues}
        currentVenue={currentVenue}
        onSelectVenue={(v) => {
          setCurrentVenue(v);
          setRoute(null);
          setSelectedPOI(null);
          setTargetPOIForRoute(null);
        }}
        activeMode={activeMode}
        onToggleMode={setActiveMode}
      />

      {/* Main View Area */}
      <main className="relative flex-1 w-full h-[calc(100vh-64px)] overflow-hidden">
        {activeMode === 'visitor' ? (
          <>
            {/* Interactive SVG Indoor Map Canvas */}
            <IndoorMapViewer
              levelMap={levelMap}
              activeLevel={activeLevel}
              route={route}
              userLocation={userLocation}
              selectedPOI={selectedPOI}
              onSelectPOI={setSelectedPOI}
              onQuickNavigateToPOI={(poi) => calculateRouteToTarget(poi, accessibleOnly)}
            />

            {/* Level / Floor Switcher */}
            <LevelSelector
              levels={levels}
              activeLevel={activeLevel}
              onSelectLevel={setActiveLevel}
              route={route}
            />

            {/* POI Search & Directory Drawer */}
            <POISearchDrawer
              pois={allVenuePOIs}
              levels={levels}
              activeLevel={activeLevel}
              selectedPOI={selectedPOI}
              onSelectPOI={(poi) => {
                setSelectedPOI(poi);
                const poiLevel = levels.find(l => l.id === poi.level_id);
                if (poiLevel && poiLevel.id !== activeLevel?.id) {
                  setActiveLevel(poiLevel);
                }
              }}
              onNavigateToPOI={(poi) => calculateRouteToTarget(poi, accessibleOnly)}
              onOpenQRScanner={() => setIsQRScannerOpen(true)}
            />

            {/* Accessibility Mode Toggle Button (Top Center) */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20">
              <AccessibilityToggle
                accessibleOnly={accessibleOnly}
                onToggle={handleToggleAccessibility}
              />
            </div>

            {/* Turn-by-Turn Route Guidance Card */}
            {route && (
              <RouteGuidanceHUD
                route={route}
                activeLevel={activeLevel}
                onClearRoute={() => {
                  setRoute(null);
                  setTargetPOIForRoute(null);
                }}
                onJumpToLevel={(lvlId) => {
                  const targetLvl = levels.find(l => l.id === lvlId);
                  if (targetLvl) setActiveLevel(targetLvl);
                }}
              />
            )}
          </>
        ) : (
          <>
            {/* Map Authoring & Tracing Studio */}
            <Toolbar
              activeTool={editorTool}
              onSelectTool={setEditorTool}
              levels={levels}
              activeLevel={activeLevel}
              onSelectLevel={setActiveLevel}
              onSave={handleSaveEditorGeometry}
              onOpenExportModal={() => setIsIMDFExportOpen(true)}
              onOpenQRGenerator={() => setIsQRGeneratorOpen(true)}
              onOpenVerticalLinker={() => setIsVerticalLinkerOpen(true)}
              onOpenUploadModal={() => setIsUploadLayoutOpen(true)}
              isSaving={isSaving}
              hasUnsavedChanges={hasUnsavedChanges}
            />

            <EditorCanvas
              levelMap={levelMap}
              activeLevel={activeLevel}
              activeTool={editorTool}
              onMapUpdated={(updated) => {
                setLevelMap(updated);
                setHasUnsavedChanges(true);
              }}
            />
          </>
        )}

        {/* Global Error Toast Notification */}
        {error && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 bg-white px-4 py-2.5 rounded-2xl border border-rose-200 text-rose-700 text-xs flex items-center gap-2 shadow-xl animate-in slide-in-from-bottom-4">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
            <button onClick={() => setError(null)} className="ml-2 text-slate-400 hover:text-slate-700">✕</button>
          </div>
        )}
      </main>

      {/* QR Checkpoint Scanner Modal */}
      <QRScannerModal
        isOpen={isQRScannerOpen}
        onClose={() => setIsQRScannerOpen(false)}
        venue={currentVenue}
        onLocationResolved={handleLocationResolved}
      />

      {/* Upload Layout Modal (IMDF / Blueprint Overlay) */}
      <UploadLayoutModal
        isOpen={isUploadLayoutOpen}
        onClose={() => setIsUploadLayoutOpen(false)}
        venue={currentVenue}
        activeLevel={activeLevel}
        onLayoutImported={async (importedVenueId?: string) => {
          try {
            const updatedVenues = await api.getVenues();
            setVenues(updatedVenues);

            const targetId = importedVenueId || currentVenue?.id;
            const targetVenue = (targetId && updatedVenues.find(v => v.id === targetId)) || updatedVenues[0];

            if (targetVenue) {
              setCurrentVenue(targetVenue);
              setRoute(null);
              setSelectedPOI(null);
              setTargetPOIForRoute(null);

              const details = await api.getVenueDetails(targetVenue.id);
              setLevels(details.levels);
              if (details.levels.length > 0) {
                setActiveLevel(details.levels[0]);
                const map = await api.getLevelMap(targetVenue.id, details.levels[0].id);
                setLevelMap(map);
              } else {
                setActiveLevel(null);
                setLevelMap(null);
              }

              const pois = await api.searchPOIs(targetVenue.id);
              setAllVenuePOIs(pois);
            }
          } catch (e) {
            console.error('Error refreshing venue after import:', e);
          }
        }}
      />

      {/* IMDF Standard GeoJSON Exporter Modal */}
      <IMDFExportModal
        isOpen={isIMDFExportOpen}
        onClose={() => setIsIMDFExportOpen(false)}
        venue={currentVenue}
      />

      {/* Printable QR Generator Modal */}
      <QRGeneratorModal
        isOpen={isQRGeneratorOpen}
        onClose={() => setIsQRGeneratorOpen(false)}
        venue={currentVenue}
      />

      {/* Multi-Floor Vertical Linker Modal */}
      <VerticalLinkModal
        isOpen={isVerticalLinkerOpen}
        onClose={() => {
          setIsVerticalLinkerOpen(false);
          loadActiveLevelMap();
        }}
        venue={currentVenue}
        levels={levels}
      />
    </div>
  );
};
export default App;
