import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useVenueStore } from '../../stores/venueStore';
import { useNavStore } from '../../stores/navStore';
import { useUIStore } from '../../stores/uiStore';
import { StudioCanvas } from '../studio/StudioCanvas';
import { StudioToolbar } from '../studio/StudioToolbar';
import { StudioObjectPalette } from '../studio/StudioObjectPalette';
import { StudioPropertiesSidebar } from '../studio/StudioPropertiesSidebar';
import { StudioRoutePanel } from '../studio/StudioRoutePanel';
import { StudioExportModal } from '../studio/StudioExportModal';
import { LevelMapData } from '../../types/client';
import { api } from '../../api/client';

export const StudioPage: React.FC = () => {
  const { venueId, levelId } = useParams();
  const { currentVenue, levels, activeLevel, levelMap, selectVenue, selectLevel, allVenuePOIs } = useVenueStore();
  const { route, clearRoute } = useNavStore();

  const [allLevelMaps, setAllLevelMaps] = useState<Record<string, LevelMapData>>({});
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // Sync URL params to store
  useEffect(() => {
    if (venueId && currentVenue?.id !== venueId) {
      const v = useVenueStore.getState().venues.find((v) => v.id === venueId);
      if (v) selectVenue(v);
    }
  }, [venueId]);

  useEffect(() => {
    if (levelId && activeLevel?.id !== levelId) {
      const l = levels.find((lvl) => lvl.id === levelId);
      if (l) selectLevel(l);
    }
  }, [levelId, levels]);

  // Pre-fetch all level maps for multi-floor 3D building stack rendering
  useEffect(() => {
    if (!currentVenue || levels.length === 0) return;

    const fetchAllMaps = async () => {
      const maps: Record<string, LevelMapData> = {};
      for (const lvl of levels) {
        try {
          const m = await api.getLevelMap(currentVenue.id, lvl.id);
          maps[lvl.id] = m;
        } catch (err) {
          console.error(`Failed to preload map for level ${lvl.name}`, err);
        }
      }
      setAllLevelMaps(maps);
    };

    fetchAllMaps();
  }, [currentVenue?.id, levels]);

  return (
    <div className="flex h-full w-full overflow-hidden bg-slate-950">
      {/* Left Studio Control Sidebar */}
      <div className="h-full flex flex-col shrink-0">
        <StudioToolbar
          levels={levels}
          activeLevel={activeLevel}
          onSelectLevel={selectLevel}
          onExportRender={() => setIsExportModalOpen(true)}
        />
        <StudioObjectPalette />
      </div>

      {/* Center 3D WebGL Studio Canvas */}
      <div className="flex-1 relative overflow-hidden h-full">
        <StudioCanvas
          levels={levels}
          activeLevel={activeLevel}
          levelMap={levelMap}
          allLevelMaps={allLevelMaps}
          route={route}
        />
      </div>

      {/* Right Studio Properties Inspector & Route Panel */}
      <div className="h-full flex flex-col shrink-0">
        <StudioPropertiesSidebar />
        <StudioRoutePanel
          pois={allVenuePOIs}
          levels={levels}
          venueId={currentVenue?.id}
          onClearRoute={clearRoute}
        />
      </div>

      {/* Studio Export Modal */}
      <StudioExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        venue={currentVenue}
      />
    </div>
  );
};
