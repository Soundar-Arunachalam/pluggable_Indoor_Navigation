import { Venue, Level, LevelMapData, POI, Checkpoint, RouteResponse } from '../types/client';

const API_BASE = '/api/venues';

export const api = {
  async getVenues(): Promise<Venue[]> {
    const res = await fetch(API_BASE);
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to fetch venues');
    return data.data;
  },

  async createVenue(payload: { name: string; description?: string; category: string; levels?: any[] }): Promise<Venue> {
    const res = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to create venue');
    return data.data;
  },

  async getVenueDetails(venueId: string): Promise<{ venue: Venue; levels: Level[]; stats: any }> {
    const res = await fetch(`${API_BASE}/${venueId}`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to fetch venue details');
    return data.data;
  },

  async getLevelMap(venueId: string, levelId: string): Promise<LevelMapData> {
    const res = await fetch(`${API_BASE}/${venueId}/levels/${levelId}/map`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to fetch level map');
    return data.data;
  },

  async searchPOIs(
    venueId: string,
    params: { q?: string; category?: string; levelId?: string } = {}
  ): Promise<POI[]> {
    const query = new URLSearchParams();
    if (params.q) query.append('q', params.q);
    if (params.category) query.append('category', params.category);
    if (params.levelId) query.append('levelId', params.levelId);

    const res = await fetch(`${API_BASE}/${venueId}/pois?${query.toString()}`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to search POIs');
    return data.data;
  },

  async calculateRoute(
    venueId: string,
    body: {
      startNodeId?: string;
      startCoords?: { x: number; y: number; levelId: string };
      targetNodeId?: string;
      targetPoiId?: string;
      accessibleOnly?: boolean;
      preferElevator?: boolean;
    }
  ): Promise<RouteResponse> {
    const res = await fetch(`${API_BASE}/${venueId}/route`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    return data;
  },

  async getCheckpoints(venueId: string): Promise<Checkpoint[]> {
    const res = await fetch(`${API_BASE}/${venueId}/checkpoints`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to fetch checkpoints');
    return data.data;
  },

  async resolveCheckpoint(venueId: string, code: string): Promise<Checkpoint> {
    const res = await fetch(`${API_BASE}/${venueId}/checkpoints/${encodeURIComponent(code)}`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Checkpoint not found');
    return data.data;
  },

  async saveGeometry(
    venueId: string,
    levelId: string,
    payload: { units?: any[]; nodes?: any[]; edges?: any[]; pois?: any[] }
  ) {
    const res = await fetch(`${API_BASE}/${venueId}/geometry`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ levelId, ...payload })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to save geometry');
    return data.data;
  },

  async importIMDF(bundle: any, venueId?: string) {
    const url = venueId ? `${API_BASE}/${venueId}/import/imdf` : `${API_BASE}/import`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bundle)
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to import IMDF layout');
    return data;
  },

  async updateLevelFloorplan(
    venueId: string,
    levelId: string,
    payload: { floorplan_svg_url?: string; scale_pixels_per_meter?: number; width_meters?: number; height_meters?: number }
  ) {
    const res = await fetch(`${API_BASE}/${venueId}/levels/${levelId}/floorplan`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to update level floorplan');
    return data;
  },

  getIMDFExportUrl(venueId: string): string {
    return `${API_BASE}/${venueId}/export/imdf`;
  }
};
