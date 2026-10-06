import { create } from 'zustand';
import { POI, Level } from '../types/client';

export type RenderStyle = 'blueprint' | 'clay' | 'glass' | 'realistic' | 'cyberpunk' | 'wireframe';
export type CameraPreset = 'perspective' | 'isometric_sw' | 'isometric_ne' | 'top_down' | 'front_elevation' | 'first_person';
export type StudioTool = 'select' | 'measure' | 'place_object' | 'wall_extrude' | 'navigate_3d';

export interface Placed3DObject {
  id: string;
  level_id: string;
  name: string;
  category: 'furniture' | 'door' | 'window' | 'pillar' | 'escalator' | 'elevator' | 'stairs' | 'kiosk' | 'plant' | 'signage' | 'emergency';
  modelType: string;
  x: number; // meters
  y: number; // meters
  z: number; // height offset in meters
  scale: [number, number, number];
  rotation: number; // degrees around Y axis
  color?: string;
}

export interface StudioState {
  renderStyle: RenderStyle;
  cameraPreset: CameraPreset;
  activeStudioTool: StudioTool;
  wallHeightMeters: number;
  wallThicknessMeters: number;
  explodeSpacingMeters: number;
  isMultiFloorExploded: boolean;
  showGrid: boolean;
  showPOILabels: boolean;
  showWalkways3D: boolean;
  showRoofCeiling: boolean;
  ambientLightIntensity: number;

  // Selected object in 3D scene
  selected3DObject: Placed3DObject | null;
  placedObjects: Placed3DObject[];

  // Selected tool object payload
  selectedPaletteItem: {
    category: Placed3DObject['category'];
    modelType: string;
    name: string;
    color: string;
    scale: [number, number, number];
  } | null;

  // 3D Measurement Tool
  measurePoints: Array<{ x: number; y: number; z: number; levelId: string }>;
  measuredDistanceMeters: number | null;

  // 3D Route Simulation
  routeStartPOI: POI | null;
  routeEndPOI: POI | null;
  is3DRouteAnimating: boolean;

  // Actions
  setRenderStyle: (style: RenderStyle) => void;
  setCameraPreset: (preset: CameraPreset) => void;
  setActiveStudioTool: (tool: StudioTool) => void;
  setWallHeightMeters: (h: number) => void;
  setWallThicknessMeters: (t: number) => void;
  setExplodeSpacingMeters: (s: number) => void;
  setIsMultiFloorExploded: (exploded: boolean) => void;
  toggleGrid: () => void;
  togglePOILabels: () => void;
  toggleWalkways3D: () => void;
  toggleRoofCeiling: () => void;
  setAmbientLightIntensity: (val: number) => void;
  setSelected3DObject: (obj: Placed3DObject | null) => void;
  setSelectedPaletteItem: (item: StudioState['selectedPaletteItem']) => void;
  addPlacedObject: (obj: Omit<Placed3DObject, 'id'>) => void;
  updatePlacedObject: (id: string, partial: Partial<Placed3DObject>) => void;
  removePlacedObject: (id: string) => void;
  addMeasurePoint: (pt: { x: number; y: number; z: number; levelId: string }) => void;
  clearMeasurePoints: () => void;
  setRoutePOIs: (start: POI | null, end: POI | null) => void;
  setIs3DRouteAnimating: (animating: boolean) => void;
}

export const useStudioStore = create<StudioState>((set, get) => ({
  renderStyle: 'blueprint',
  cameraPreset: 'isometric_sw',
  activeStudioTool: 'select',
  wallHeightMeters: 3.0,
  wallThicknessMeters: 0.25,
  explodeSpacingMeters: 5.0,
  isMultiFloorExploded: true,
  showGrid: true,
  showPOILabels: true,
  showWalkways3D: true,
  showRoofCeiling: false,
  ambientLightIntensity: 0.8,

  selected3DObject: null,
  placedObjects: [
    // Pre-populated default 3D architectural items for visual flair
    {
      id: 'default-desk-1',
      level_id: 'default',
      name: 'Executive Desk',
      category: 'furniture',
      modelType: 'desk',
      x: 15,
      y: 12,
      z: 0,
      scale: [1.8, 0.75, 0.9],
      rotation: 0,
      color: '#3b82f6',
    },
    {
      id: 'default-kiosk-1',
      level_id: 'default',
      name: 'Interactive Info Kiosk',
      category: 'kiosk',
      modelType: 'kiosk',
      x: 25,
      y: 18,
      z: 0,
      scale: [0.8, 1.8, 0.6],
      rotation: 45,
      color: '#06b6d4',
    }
  ],

  selectedPaletteItem: null,

  measurePoints: [],
  measuredDistanceMeters: null,

  routeStartPOI: null,
  routeEndPOI: null,
  is3DRouteAnimating: false,

  setRenderStyle: (renderStyle) => set({ renderStyle }),
  setCameraPreset: (cameraPreset) => set({ cameraPreset }),
  setActiveStudioTool: (tool) => set({ activeStudioTool: tool }),
  setWallHeightMeters: (wallHeightMeters) => set({ wallHeightMeters }),
  setWallThicknessMeters: (wallThicknessMeters) => set({ wallThicknessMeters }),
  setExplodeSpacingMeters: (explodeSpacingMeters) => set({ explodeSpacingMeters }),
  setIsMultiFloorExploded: (isMultiFloorExploded) => set({ isMultiFloorExploded }),
  toggleGrid: () => set((state) => ({ showGrid: !state.showGrid })),
  togglePOILabels: () => set((state) => ({ showPOILabels: !state.showPOILabels })),
  toggleWalkways3D: () => set((state) => ({ showWalkways3D: !state.showWalkways3D })),
  toggleRoofCeiling: () => set((state) => ({ showRoofCeiling: !state.showRoofCeiling })),
  setAmbientLightIntensity: (ambientLightIntensity) => set({ ambientLightIntensity }),

  setSelected3DObject: (selected3DObject) => set({ selected3DObject }),
  setSelectedPaletteItem: (item) => set({ selectedPaletteItem: item }),

  addPlacedObject: (objData) => {
    const newObj: Placed3DObject = {
      ...objData,
      id: `3d-obj-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    };
    set((state) => ({
      placedObjects: [...state.placedObjects, newObj],
      selected3DObject: newObj,
    }));
  },

  updatePlacedObject: (id, partial) => {
    set((state) => {
      const updated = state.placedObjects.map((obj) => (obj.id === id ? { ...obj, ...partial } : obj));
      const sel = state.selected3DObject?.id === id ? { ...state.selected3DObject, ...partial } : state.selected3DObject;
      return { placedObjects: updated, selected3DObject: sel };
    });
  },

  removePlacedObject: (id) => {
    set((state) => ({
      placedObjects: state.placedObjects.filter((o) => o.id !== id),
      selected3DObject: state.selected3DObject?.id === id ? null : state.selected3DObject,
    }));
  },

  addMeasurePoint: (pt) => {
    set((state) => {
      const newPts = [...state.measurePoints, pt];
      let dist: number | null = null;
      if (newPts.length >= 2) {
        const p1 = newPts[newPts.length - 2];
        const p2 = newPts[newPts.length - 1];
        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        const dz = p1.z - p2.z;
        dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      }
      return { measurePoints: newPts, measuredDistanceMeters: dist };
    });
  },

  clearMeasurePoints: () => set({ measurePoints: [], measuredDistanceMeters: null }),

  setRoutePOIs: (start, end) => set({ routeStartPOI: start, routeEndPOI: end }),
  setIs3DRouteAnimating: (is3DRouteAnimating) => set({ is3DRouteAnimating }),
}));
