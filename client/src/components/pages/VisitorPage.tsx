import React, { useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useVenueStore } from '../../stores/venueStore';
import { useNavStore } from '../../stores/navStore';
import { useUIStore } from '../../stores/uiStore';
import { IndoorMapViewer } from '../visitor/IndoorMapViewer';
import { LevelSelector } from '../visitor/LevelSelector';
import { POISearchDrawer } from '../visitor/POISearchDrawer';
import { RouteGuidanceHUD } from '../visitor/RouteGuidanceHUD';
import { AccessibilityToggle } from '../visitor/AccessibilityToggle';
import { QRScannerModal } from '../visitor/QRScannerModal';
import { AlertCircle, Share2 } from 'lucide-react';

export const VisitorPage: React.FC = () => {
  const { venueId, levelId } = useParams();
  const [searchParams] = useSearchParams();
  const { venues, currentVenue, levels, activeLevel, levelMap, selectVenue, selectLevel, allVenuePOIs } = useVenueStore();
  const { route, routeError, selectedPOI, userLocation, accessibleOnly, calculateRoute, clearRoute, toggleAccessibility, setSelectedPOI, setUserLocation } = useNavStore();
  const { isQRScannerOpen, openModal, closeModal } = useUIStore();

  // Sync URL params → store
  useEffect(() => {
    if (venueId && venues.length > 0) {
      const target = venues.find(v => v.id === venueId);
      if (target && target.id !== currentVenue?.id) selectVenue(target);
    }
  }, [venueId, venues.length]);

  useEffect(() => {
    if (levelId && levels.length > 0) {
      const target = levels.find(l => l.id === levelId);
      if (target && target.id !== activeLevel?.id) selectLevel(target);
    }
  }, [levelId, levels.length]);

  // Read Shareable Link Query Params
  useEffect(() => {
    if (!currentVenue || levels.length === 0 || allVenuePOIs.length === 0) return;

    let targetPoiToRoute = null;
    
    // Parse target POI
    const targetPoiId = searchParams.get('targetPoi');
    if (targetPoiId) {
      const poi = allVenuePOIs.find(p => p.id === targetPoiId);
      if (poi) {
        setSelectedPOI(poi);
        targetPoiToRoute = poi;
      }
    }

    // Parse user location
    const startX = searchParams.get('startX');
    const startY = searchParams.get('startY');
    const startLevel = searchParams.get('startLevel');
    
    if (startX && startY && startLevel) {
      setUserLocation({
        x: parseFloat(startX),
        y: parseFloat(startY),
        levelId: startLevel,
        label: 'Shared Location'
      });
    }

    // Auto-calculate route if both present
    if (targetPoiToRoute && startX && startY && startLevel) {
      setTimeout(() => {
        calculateRoute(currentVenue.id, targetPoiToRoute!, levels, activeLevel?.id);
      }, 500); // short delay to ensure UI updates
    }
  }, [currentVenue?.id, levels.length, allVenuePOIs.length]);

  return (
    <>
      {/* Interactive SVG Indoor Map */}
      <IndoorMapViewer
        levelMap={levelMap}
        activeLevel={activeLevel}
        route={route}
        userLocation={userLocation}
        selectedPOI={selectedPOI}
        onSelectPOI={setSelectedPOI}
        onQuickNavigateToPOI={(poi) => calculateRoute(currentVenue!.id, poi, levels, activeLevel?.id)}
      />

      {/* Floor Switcher */}
      <LevelSelector
        levels={levels}
        activeLevel={activeLevel}
        onSelectLevel={selectLevel}
        route={route}
      />

      {/* POI Search Drawer */}
      <POISearchDrawer
        onOpenQRScanner={() => openModal('isQRScannerOpen')}
        onOpenShare={() => openModal('isShareLinkOpen')}
      />

      {/* Accessibility Toggle */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20">
        <AccessibilityToggle accessibleOnly={accessibleOnly} onToggle={toggleAccessibility} />
      </div>

      {/* Route Guidance HUD */}
      {route && (
        <RouteGuidanceHUD
          route={route}
          activeLevel={activeLevel}
          onClearRoute={clearRoute}
          onJumpToLevel={(lvlId) => {
            const l = levels.find(l => l.id === lvlId);
            if (l) selectLevel(l);
          }}
        />
      )}

      {/* Error Toast */}
      {routeError && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 bg-white dark:bg-slate-800 px-4 py-2.5 rounded-2xl border border-rose-200 text-rose-700 dark:text-rose-400 text-xs flex items-center gap-2 shadow-xl animate-in slide-in-from-bottom-4">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{routeError}</span>
          <button onClick={() => useNavStore.getState().clearRoute()} className="ml-2 text-slate-400 hover:text-slate-700">✕</button>
        </div>
      )}

      {/* QR Scanner Modal */}
      <QRScannerModal
        isOpen={isQRScannerOpen}
        onClose={() => closeModal('isQRScannerOpen')}
        venue={currentVenue}
        onLocationResolved={() => {}}
      />
    </>
  );
};
