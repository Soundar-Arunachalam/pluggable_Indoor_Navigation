import { create } from 'zustand';
import { POI, RouteResponse, Checkpoint, Level } from '../types/client';
import { api } from '../api/client';

interface UserLocation {
  x: number;
  y: number;
  levelId: string;
  label?: string;
}

interface NavState {
  userLocation: UserLocation | null;
  selectedPOI: POI | null;
  route: RouteResponse | null;
  accessibleOnly: boolean;
  targetPOIForRoute: POI | null;
  routeError: string | null;
  isCalculatingRoute: boolean;

  // Actions
  setUserLocation: (loc: UserLocation | null) => void;
  setSelectedPOI: (poi: POI | null) => void;
  clearRoute: () => void;
  toggleAccessibility: (enabled: boolean) => void;
  calculateRoute: (venueId: string, target: POI, levels: Level[], activeLevelId?: string) => Promise<void>;
  resolveCheckpoint: (venueId: string, code: string, levels: Level[]) => Promise<Checkpoint | null>;
}

export const useNavStore = create<NavState>((set, get) => ({
  userLocation: null,
  selectedPOI: null,
  route: null,
  accessibleOnly: false,
  targetPOIForRoute: null,
  routeError: null,
  isCalculatingRoute: false,

  setUserLocation: (loc) => set({ userLocation: loc }),
  setSelectedPOI: (poi) => set({ selectedPOI: poi }),

  clearRoute: () => set({ route: null, targetPOIForRoute: null, routeError: null }),

  toggleAccessibility: (enabled) => {
    set({ accessibleOnly: enabled });
    const { targetPOIForRoute } = get();
    if (targetPOIForRoute) {
      // Re-trigger route calculation
      // venueId is read from venueStore at call-site; we use a re-export
      const venueStore = require('./venueStore').useVenueStore.getState();
      get().calculateRoute(
        venueStore.currentVenue?.id!,
        targetPOIForRoute,
        venueStore.levels,
        venueStore.activeLevel?.id
      );
    }
  },

  calculateRoute: async (venueId, target, levels, activeLevelId) => {
    const { userLocation, accessibleOnly } = get();
    set({ isCalculatingRoute: true, routeError: null });

    try {
      const startPayload = userLocation
        ? { startCoords: { x: userLocation.x, y: userLocation.y, levelId: userLocation.levelId } }
        : {};

      const res = await api.calculateRoute(venueId, {
        ...startPayload,
        targetPoiId: target.id,
        accessibleOnly,
      });

      if (res.success) {
        set({ route: res, targetPOIForRoute: target, routeError: null });

        // Snap user location if not set
        if (!userLocation && res.waypoints.length > 0) {
          const wp = res.waypoints[0];
          set({
            userLocation: { x: wp.x, y: wp.y, levelId: wp.levelId, label: wp.name || 'Start' },
          });
        }

        // Switch to starting floor if needed
        if (res.waypoints.length > 0 && res.waypoints[0].levelId !== activeLevelId) {
          const startLevel = levels.find(l => l.id === res.waypoints[0].levelId);
          if (startLevel) {
            const { useVenueStore } = require('./venueStore');
            useVenueStore.getState().selectLevel(startLevel);
          }
        }
      } else {
        set({ routeError: res.error || 'No route could be calculated.' });
      }
    } catch (err: any) {
      set({ routeError: err.message || 'Routing service error.' });
    } finally {
      set({ isCalculatingRoute: false });
    }
  },

  resolveCheckpoint: async (venueId, code, levels) => {
    try {
      const cp = await api.resolveCheckpoint(venueId, code);
      const cpLevel = levels.find(l => l.id === cp.level_id);

      set({
        userLocation: {
          x: cp.x_meters || 40,
          y: cp.y_meters || 18,
          levelId: cp.level_id,
          label: cp.label,
        },
      });

      if (cpLevel) {
        const { useVenueStore } = require('./venueStore');
        useVenueStore.getState().selectLevel(cpLevel);
      }

      // Re-route if there's an active target
      const { targetPOIForRoute } = get();
      if (targetPOIForRoute && venueId) {
        setTimeout(() => {
          get().calculateRoute(venueId, targetPOIForRoute, levels, cpLevel?.id);
        }, 120);
      }

      return cp;
    } catch (err: any) {
      return null;
    }
  },
}));
