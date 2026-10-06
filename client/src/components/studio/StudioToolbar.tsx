import React from 'react';
import { useStudioStore, RenderStyle, CameraPreset, StudioTool } from '../../stores/studioStore';
import { useUIStore } from '../../stores/uiStore';
import { Level } from '../../types/client';
import {
  Box, Camera, Eye, Grid, Layers, Sparkles, Sliders, Shield, Palette, Ruler, Move3d, Compass, Maximize2, RotateCcw
} from 'lucide-react';

interface StudioToolbarProps {
  levels: Level[];
  activeLevel: Level | null;
  onSelectLevel: (level: Level) => void;
  onExportRender: () => void;
}

const RENDER_STYLES: { id: RenderStyle; label: string; desc: string; icon: string }[] = [
  { id: 'blueprint', label: 'CAD Blueprint', desc: 'Technical cyan blueprint aesthetic', icon: '📐' },
  { id: 'clay', label: 'Clay Architectural', desc: 'Monochrome clay ambient occlusion', icon: '🏛️' },
  { id: 'glass', label: 'Translucent Glass', desc: 'Glass cutaway to see inner paths', icon: '💎' },
  { id: 'realistic', label: 'Modern Studio', desc: 'Realistic lit architectural model', icon: '🎨' },
  { id: 'cyberpunk', label: 'Cyberpunk Neon', desc: 'Dark neon glowing wireframes', icon: '⚡' },
  { id: 'wireframe', label: 'Schematic Mesh', desc: 'Pure wireframe geometry', icon: '🕸️' },
];

const CAMERA_PRESETS: { id: CameraPreset; label: string; icon: string }[] = [
  { id: 'isometric_sw', label: 'SW Isometric', icon: '↘️' },
  { id: 'isometric_ne', label: 'NE Isometric', icon: '↖️' },
  { id: 'perspective', label: 'Free Perspective', icon: '👁️' },
  { id: 'top_down', label: 'Top-Down 2D/3D', icon: '⬇️' },
  { id: 'front_elevation', label: 'Front Elevation', icon: '⏹️' },
  { id: 'first_person', label: 'Walkthrough', icon: '🚶' },
];

export const StudioToolbar: React.FC<StudioToolbarProps> = ({
  levels,
  activeLevel,
  onSelectLevel,
  onExportRender,
}) => {
  const { isDarkMode } = useUIStore();
  const {
    renderStyle,
    cameraPreset,
    activeStudioTool,
    wallHeightMeters,
    explodeSpacingMeters,
    isMultiFloorExploded,
    showGrid,
    showPOILabels,
    showWalkways3D,
    setRenderStyle,
    setCameraPreset,
    setActiveStudioTool,
    setWallHeightMeters,
    setExplodeSpacingMeters,
    setIsMultiFloorExploded,
    toggleGrid,
    togglePOILabels,
    toggleWalkways3D,
  } = useStudioStore();

  return (
    <aside className={`w-80 h-full border-r flex flex-col z-20 select-none transition-colors overflow-y-auto
      ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'}`}>

      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-600/30">
            <Move3d className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-extrabold text-sm tracking-tight">3D Design Studio</h2>
            <p className="text-[11px] text-slate-400">Architectural Diagramming</p>
          </div>
        </div>
        <button
          onClick={onExportRender}
          className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-sm"
        >
          Export 3D
        </button>
      </div>

      <div className="p-4 space-y-6 flex-1">
        {/* Studio Active Tool Selector */}
        <div>
          <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-2 block">
            Studio Tools
          </label>
          <div className="grid grid-cols-3 gap-1.5">
            {[
              { id: 'select' as StudioTool, label: 'Select', icon: <Compass className="w-4 h-4" /> },
              { id: 'place_object' as StudioTool, label: 'Objects', icon: <Box className="w-4 h-4" /> },
              { id: 'measure' as StudioTool, label: 'Measure', icon: <Ruler className="w-4 h-4" /> },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveStudioTool(t.id)}
                className={`py-2 px-2 rounded-xl text-xs font-bold flex flex-col items-center gap-1 border transition
                  ${activeStudioTool === t.id
                    ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/25'
                    : isDarkMode
                      ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
              >
                {t.icon}
                <span>{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Level Selector */}
        <div>
          <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-2 block flex items-center justify-between">
            <span>Building Levels</span>
            <span className="text-[10px] text-blue-500 font-bold">{levels.length} Floors</span>
          </label>
          <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
            {levels.map((lvl) => {
              const isSelected = activeLevel?.id === lvl.id;
              return (
                <button
                  key={lvl.id}
                  onClick={() => onSelectLevel(lvl)}
                  className={`w-full py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-between border transition
                    ${isSelected
                      ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                      : isDarkMode
                        ? 'bg-slate-800/60 border-slate-750 text-slate-300 hover:bg-slate-800'
                        : 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100'
                    }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-md bg-slate-700/40 flex items-center justify-center text-[10px] font-extrabold">
                      L{lvl.ordinal}
                    </span>
                    <span>{lvl.name}</span>
                  </div>
                  <span className="text-[10px] opacity-75">{lvl.width_meters}m × {lvl.height_meters}m</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Multi-Floor Exploded View Settings */}
        <div className={`p-3 rounded-2xl border space-y-3 ${isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-blue-500" />
              Exploded Floor Stack
            </span>
            <button
              onClick={() => setIsMultiFloorExploded(!isMultiFloorExploded)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition
                ${isMultiFloorExploded ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300'}`}
            >
              {isMultiFloorExploded ? 'Exploded' : 'Compact'}
            </button>
          </div>

          {isMultiFloorExploded && (
            <div>
              <div className="flex items-center justify-between text-[11px] font-medium text-slate-400 mb-1">
                <span>Floor Gap Spacing</span>
                <span className="font-mono text-blue-400 font-bold">{explodeSpacingMeters} m</span>
              </div>
              <input
                type="range"
                min="1.0"
                max="15.0"
                step="0.5"
                value={explodeSpacingMeters}
                onChange={(e) => setExplodeSpacingMeters(parseFloat(e.target.value))}
                className="w-full accent-blue-600 cursor-pointer"
              />
            </div>
          )}

          <div>
            <div className="flex items-center justify-between text-[11px] font-medium text-slate-400 mb-1">
              <span>3D Wall Height</span>
              <span className="font-mono text-blue-400 font-bold">{wallHeightMeters} m</span>
            </div>
            <input
              type="range"
              min="1.0"
              max="8.0"
              step="0.25"
              value={wallHeightMeters}
              onChange={(e) => setWallHeightMeters(parseFloat(e.target.value))}
              className="w-full accent-blue-600 cursor-pointer"
            />
          </div>
        </div>

        {/* Rendering Style Palette */}
        <div>
          <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-2 block flex items-center gap-1.5">
            <Palette className="w-3.5 h-3.5 text-blue-500" />
            Architectural Render Style
          </label>
          <div className="grid grid-cols-2 gap-2">
            {RENDER_STYLES.map((st) => (
              <button
                key={st.id}
                onClick={() => setRenderStyle(st.id)}
                className={`p-2.5 rounded-xl border text-left transition flex flex-col gap-0.5
                  ${renderStyle === st.id
                    ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/20'
                    : isDarkMode
                      ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750'
                      : 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100'
                  }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-xs">
                  <span>{st.icon}</span>
                  <span className="truncate">{st.label}</span>
                </div>
                <span className={`text-[10px] leading-tight ${renderStyle === st.id ? 'text-blue-100' : 'text-slate-400'}`}>
                  {st.desc}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Camera Angles */}
        <div>
          <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-2 block flex items-center gap-1.5">
            <Camera className="w-3.5 h-3.5 text-blue-500" />
            Camera Presets
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            {CAMERA_PRESETS.map((cp) => (
              <button
                key={cp.id}
                onClick={() => setCameraPreset(cp.id)}
                className={`py-2 px-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition
                  ${cameraPreset === cp.id
                    ? 'bg-slate-700 text-white border-slate-600 shadow-sm'
                    : isDarkMode
                      ? 'bg-slate-800/80 border-slate-750 text-slate-300 hover:bg-slate-800'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
              >
                <span>{cp.icon}</span>
                <span className="truncate">{cp.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Visibility Toggles */}
        <div>
          <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-2 block flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5 text-blue-500" />
            Display Toggles
          </label>
          <div className="space-y-1.5">
            {[
              { label: 'CAD Grid Overlay', active: showGrid, toggle: toggleGrid, icon: <Grid className="w-3.5 h-3.5" /> },
              { label: '3D POI Badges', active: showPOILabels, toggle: togglePOILabels, icon: <Sparkles className="w-3.5 h-3.5" /> },
              { label: '3D Corridor Network', active: showWalkways3D, toggle: toggleWalkways3D, icon: <Sliders className="w-3.5 h-3.5" /> },
            ].map((t, idx) => (
              <button
                key={idx}
                onClick={t.toggle}
                className={`w-full py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-between border transition
                  ${t.active
                    ? isDarkMode ? 'bg-slate-800 text-blue-400 border-slate-700' : 'bg-blue-50 text-blue-700 border-blue-200'
                    : isDarkMode ? 'bg-slate-900/50 border-slate-800 text-slate-500' : 'bg-slate-50 border-slate-200 text-slate-400'
                  }`}
              >
                <div className="flex items-center gap-2">
                  {t.icon}
                  <span>{t.label}</span>
                </div>
                <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${t.active ? 'bg-blue-600 border-blue-600' : 'border-slate-500'}`}>
                  {t.active && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                </div>
              </button>
            ))}
          </div>
        </div>

      </div>
    </aside>
  );
};
