import { create } from 'zustand';
import { Venue, Level, LevelMapData, POI, Checkpoint } from '../types/client';
import { api } from '../api/client';

interface VenueState {
  // Data
  venues: Venue[];
  currentVenue: Venue | null;
  levels: Level[];
  activeLevel: Level | null;
  levelMap: LevelMapData | null;
  allVenuePOIs: POI[];

  // Loading / Error
  loading: boolean;
  error: string | null;

  // Actions
  fetchVenues: () => Promise<void>;
  selectVenue: (venue: Venue) => void;
  fetchVenueDetails: (venueId: string) => Promise<void>;
  selectLevel: (level: Level) => void;
  fetchLevelMap: (venueId: string, levelId: string) => Promise<void>;
  refreshPOIs: (venueId: string) => Promise<void>;
  setLevelMap: (map: LevelMapData) => void;
  setError: (err: string | null) => void;
  clearError: () => void;
}

export const useVenueStore = create<VenueState>((set, get) => ({
  venues: [],
  currentVenue: null,
  levels: [],
  activeLevel: null,
  levelMap: null,
  allVenuePOIs: [],
  loading: false,
  error: null,

  fetchVenues: async () => {
    set({ loading: true, error: null });
    try {
      const venues = await api.getVenues();
      set({ venues });
      if (venues.length > 0 && !get().currentVenue) {
        await get().fetchVenueDetails(venues[0].id);
      }
    } catch (err: any) {
      set({ error: err.message || 'Failed to connect to navigation server.' });
    } finally {
      set({ loading: false });
    }
  },

  selectVenue: (venue) => {
    set({
      currentVenue: venue,
      levels: [],
      activeLevel: null,
      levelMap: null,
    });
    get().fetchVenueDetails(venue.id);
  },

  fetchVenueDetails: async (venueId) => {
    try {
      const details = await api.getVenueDetails(venueId);
      const venue = get().venues.find(v => v.id === venueId) || details.venue;
      set({ currentVenue: venue, levels: details.levels });

      if (details.levels.length > 0) {
        const firstLevel = details.levels[0];
        set({ activeLevel: firstLevel });
        await get().fetchLevelMap(venueId, firstLevel.id);
      }

      // Load POIs
      const pois = await api.searchPOIs(venueId);
      set({ allVenuePOIs: pois });

      // Set initial user location from entrance checkpoint
      const checkpoints = await api.getCheckpoints(venueId);
      if (checkpoints.length > 0) {
        const entrance = checkpoints.find(c => c.code.includes('ENTRANCE')) || checkpoints[0];
        useNavStore.getState().setUserLocation({
          x: entrance.x_meters || 40,
          y: entrance.y_meters || 8,
          levelId: entrance.level_id,
          label: entrance.label,
        });
      }
    } catch (err: any) {
      set({ error: err.message || 'Failed to load venue.' });
    }
  },

  selectLevel: (level) => {
    const { currentVenue } = get();
    set({ activeLevel: level });
    if (currentVenue) get().fetchLevelMap(currentVenue.id, level.id);
  },

  fetchLevelMap: async (venueId, levelId) => {
    try {
      const map = await api.getLevelMap(venueId, levelId);
      set({ levelMap: map });
    } catch (err: any) {
      console.error('Failed to load level map:', err);
    }
  },

  refreshPOIs: async (venueId) => {
    try {
      const pois = await api.searchPOIs(venueId);
      set({ allVenuePOIs: pois });
    } catch (err: any) {
      console.error('Failed to refresh POIs:', err);
    }
  },

  setLevelMap: (map) => set({ levelMap: map }),
  setError: (err) => set({ error: err }),
  clearError: () => set({ error: null }),
}));

// Import navStore lazily to avoid circular reference
import { useNavStore } from './navStore';
