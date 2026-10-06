import React, { useState } from 'react';
import { POI, Level, RouteResponse } from '../../types/client';
import { useNavStore } from '../../stores/navStore';
import { useVenueStore } from '../../stores/venueStore';
import { useUIStore } from '../../stores/uiStore';
import { Navigation, Compass, MapPin, ArrowRight, X, Play, RefreshCw, Accessibility } from 'lucide-react';

interface StudioRoutePanelProps {
  pois: POI[];
  levels: Level[];
  venueId?: string;
  onClearRoute: () => void;
}

export const StudioRoutePanel: React.FC<StudioRoutePanelProps> = ({
  pois,
  levels,
  venueId,
  onClearRoute,
}) => {
  const { isDarkMode } = useUIStore();
  const { route, calculateRoute, clearRoute, accessibleOnly, toggleAccessibility } = useNavStore();

  const [startPoiId, setStartPoiId] = useState<string>('');
  const [endPoiId, setEndPoiId] = useState<string>('');
  const [isCalculating, setIsCalculating] = useState(false);

  const handleSimulate3DRoute = async () => {
    if (!venueId || !startPoiId || !endPoiId) return;

    const startPoi = pois.find((p) => p.id === startPoiId);
    const endPoi = pois.find((p) => p.id === endPoiId);

    if (!endPoi) return;

    setIsCalculating(true);
    try {
      if (startPoi) {
        useNavStore.getState().setUserLocation({
          x: startPoi.x_meters,
          y: startPoi.y_meters,
          levelId: startPoi.level_id,
          label: startPoi.name,
        });
      }
      await calculateRoute(venueId, endPoi, levels, startPoi?.level_id);
    } finally {
      setIsCalculating(false);
    }
  };

  return (
    <div className={`p-4 border-t transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'}`}>
      <div className="flex items-center justify-between mb-3">
        <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <Navigation className="w-3.5 h-3.5 text-blue-500" />
          3D Multi-Floor Route Simulation
        </label>
        {route && (
          <button
            onClick={() => { clearRoute(); onClearRoute(); }}
            className="text-[10px] font-bold text-rose-500 hover:text-rose-400"
          >
            Clear Route
          </button>
        )}
      </div>

      <div className="space-y-2 text-xs">
        {/* Origin */}
        <div className="relative">
          <select
            value={startPoiId}
            onChange={(e) => setStartPoiId(e.target.value)}
            className={`w-full font-semibold pl-8 pr-3 py-2 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500/20 appearance-none cursor-pointer
              ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-800'}`}
          >
            <option value="">-- Select Origin Location --</option>
            {pois.map((p) => (
              <option key={p.id} value={p.id}>
                📍 {p.name} ({p.level_name || 'Level'})
              </option>
            ))}
          </select>
          <MapPin className="w-3.5 h-3.5 text-emerald-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Destination */}
        <div className="relative">
          <select
            value={endPoiId}
            onChange={(e) => setEndPoiId(e.target.value)}
            className={`w-full font-semibold pl-8 pr-3 py-2 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500/20 appearance-none cursor-pointer
              ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-800'}`}
          >
            <option value="">-- Select Destination POI --</option>
            {pois.map((p) => (
              <option key={p.id} value={p.id}>
                🎯 {p.name} ({p.level_name || 'Level'})
              </option>
            ))}
          </select>
          <Compass className="w-3.5 h-3.5 text-blue-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Controls & ADA */}
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={() => toggleAccessibility(!accessibleOnly)}
            title="ADA Wheelchair Accessible Routing"
            className={`px-3 py-2 rounded-xl border font-bold text-[11px] flex items-center gap-1 transition
              ${accessibleOnly
                ? 'bg-emerald-600 text-white border-emerald-500'
                : isDarkMode ? 'bg-slate-800 text-slate-400 border-slate-700' : 'bg-white text-slate-600 border-slate-300'}`}
          >
            <Accessibility className="w-3.5 h-3.5" /> ADA
          </button>

          <button
            disabled={!startPoiId || !endPoiId || isCalculating}
            onClick={handleSimulate3DRoute}
            className="flex-1 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-blue-600/30 transition"
          >
            {isCalculating ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-current" />
            )}
            Simulate 3D Path
          </button>
        </div>
      </div>

      {/* Active Route Stats */}
      {route && (
        <div className={`mt-3 p-3 rounded-xl border text-xs space-y-1.5 animate-in slide-in-from-bottom-2
          ${isDarkMode ? 'bg-blue-950/40 border-blue-800 text-blue-200' : 'bg-blue-50 border-blue-200 text-blue-900'}`}>
          <div className="flex items-center justify-between font-bold">
            <span>Distance: {route.totalDistanceMeters} m</span>
            <span>Est. Time: {Math.ceil(route.totalDurationSeconds / 60)} min</span>
          </div>
          <div className="text-[11px] opacity-80">
            Levels Traversed: {route.levelsTraversed?.length || 1} floor(s)
          </div>
        </div>
      )}
    </div>
  );
};
