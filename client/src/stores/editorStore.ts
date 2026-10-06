import { create } from 'zustand';
import { LevelMapData } from '../types/client';
import { EditorTool } from '../components/editor/ToolSidebar';
import { api } from '../api/client';

const MAX_HISTORY = 30;

interface EditorState {
  activeTool: EditorTool;
  isSaving: boolean;
  hasUnsavedChanges: boolean;
  history: LevelMapData[];
  historyIndex: number;
  selectedElement: { type: 'unit' | 'node' | 'edge' | 'poi'; id: string; data: any } | null;

  // Actions
  setActiveTool: (tool: EditorTool) => void;
  setSelectedElement: (el: { type: 'unit' | 'node' | 'edge' | 'poi'; id: string; data: any } | null) => void;
  pushHistory: (map: LevelMapData) => void;
  undo: () => LevelMapData | null;
  redo: () => LevelMapData | null;
  canUndo: () => boolean;
  canRedo: () => boolean;
  markSaved: () => void;
  saveGeometry: (venueId: string, levelId: string, map: LevelMapData) => Promise<void>;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  activeTool: 'select',
  isSaving: false,
  hasUnsavedChanges: false,
  history: [],
  historyIndex: -1,
  selectedElement: null,

  setActiveTool: (tool) => set({ activeTool: tool }),
  setSelectedElement: (el) => set({ selectedElement: el }),

  pushHistory: (map) => {
    const { history, historyIndex } = get();
    // Discard any redo states ahead of current index
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(map);
    if (newHistory.length > MAX_HISTORY) newHistory.shift();
    set({
      history: newHistory,
      historyIndex: newHistory.length - 1,
      hasUnsavedChanges: true,
    });
  },

  undo: () => {
    const { history, historyIndex } = get();
    if (historyIndex <= 0) return null;
    const newIndex = historyIndex - 1;
    set({ historyIndex: newIndex });
    return history[newIndex];
  },

  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex >= history.length - 1) return null;
    const newIndex = historyIndex + 1;
    set({ historyIndex: newIndex });
    return history[newIndex];
  },

  canUndo: () => get().historyIndex > 0,
  canRedo: () => get().historyIndex < get().history.length - 1,

  markSaved: () => set({ hasUnsavedChanges: false }),

  saveGeometry: async (venueId, levelId, map) => {
    set({ isSaving: true });
    try {
      const units = map.units.features.map(u => ({
        id: u.id,
        name: u.properties.name,
        category: u.properties.category,
        accessibility_type: u.properties.accessibility_type,
        geometry_geojson: u.geometry,
        color: u.properties.color,
      }));
      const nodes = map.nodes.features.map(n => ({
        id: n.id,
        x_meters: n.geometry.coordinates[0],
        y_meters: n.geometry.coordinates[1],
        node_type: n.properties.node_type,
        is_accessible: n.properties.is_accessible,
        name: n.properties.name,
      }));
      const edges = map.edges.features.map(e => ({
        id: e.id,
        from_node_id: e.properties.from_node_id,
        to_node_id: e.properties.to_node_id,
        edge_type: e.properties.edge_type,
        distance_meters: e.properties.distance_meters,
        is_accessible: e.properties.is_accessible,
        vertical_connector_group: e.properties.vertical_connector_group,
      }));
      const pois = map.pois.features.map(p => ({
        id: p.id,
        name: p.properties.name,
        category: p.properties.category,
        is_accessible: p.properties.is_accessible,
        icon: p.properties.icon,
        x_meters: p.geometry.coordinates[0],
        y_meters: p.geometry.coordinates[1],
        description: p.properties.description,
      }));

      await api.saveGeometry(venueId, levelId, { units, nodes, edges, pois });
      set({ hasUnsavedChanges: false });

      // Refresh POIs in venue store
      const { useVenueStore } = require('./venueStore');
      await useVenueStore.getState().refreshPOIs(venueId);
    } catch (err: any) {
      const { useUIStore } = require('./uiStore');
      useUIStore.getState().addToast({ type: 'error', message: 'Save failed: ' + err.message });
    } finally {
      set({ isSaving: false });
    }
  },
}));
