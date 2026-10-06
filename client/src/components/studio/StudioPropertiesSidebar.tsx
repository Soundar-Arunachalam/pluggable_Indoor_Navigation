import React from 'react';
import { useStudioStore } from '../../stores/studioStore';
import { useUIStore } from '../../stores/uiStore';
import { Sliders, Trash2, RotateCw, Move, Palette, Box, Check, X } from 'lucide-react';

export const StudioPropertiesSidebar: React.FC = () => {
  const { isDarkMode } = useUIStore();
  const { selected3DObject, updatePlacedObject, removePlacedObject, setSelected3DObject } = useStudioStore();

  if (!selected3DObject) {
    return (
      <aside className={`w-72 h-full border-l p-6 flex flex-col items-center justify-center text-center select-none transition-colors
        ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-400' : 'bg-white border-slate-200 text-slate-500'}`}>
        <div className="w-12 h-12 rounded-2xl bg-blue-600/10 text-blue-500 flex items-center justify-center mb-3">
          <Box className="w-6 h-6" />
        </div>
        <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">No Object Selected</h3>
        <p className="text-xs text-slate-400 mt-1 max-w-xs">
          Click any 3D unit, POI, or placed architectural object in the scene to inspect & modify properties.
        </p>
      </aside>
    );
  }

  return (
    <aside className={`w-72 h-full border-l flex flex-col z-20 select-none transition-colors overflow-y-auto
      ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'}`}>

      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-blue-500" />
          <h3 className="font-bold text-sm">3D Inspector</h3>
        </div>
        <button
          onClick={() => setSelected3DObject(null)}
          className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 space-y-5 flex-1">
        {/* Name & Category */}
        <div>
          <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-1 block">
            Object Name
          </label>
          <input
            type="text"
            value={selected3DObject.name}
            onChange={(e) => updatePlacedObject(selected3DObject.id, { name: e.target.value })}
            className={`w-full text-xs font-semibold px-3 py-2 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500/20
              ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`}
          />
        </div>

        {/* Position Controls (X, Y in meters) */}
        <div className={`p-3 rounded-2xl border space-y-3 ${isDarkMode ? 'bg-slate-800/40 border-slate-750' : 'bg-slate-50 border-slate-200'}`}>
          <label className="text-xs font-bold flex items-center gap-1.5 text-blue-400">
            <Move className="w-3.5 h-3.5" />
            Position Coordinates (Meters)
          </label>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-[10px] text-slate-400 block mb-0.5">X Position</span>
              <input
                type="number"
                step="0.5"
                value={selected3DObject.x}
                onChange={(e) => updatePlacedObject(selected3DObject.id, { x: parseFloat(e.target.value) || 0 })}
                className={`w-full font-mono px-2.5 py-1.5 rounded-lg border text-xs
                  ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'}`}
              />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block mb-0.5">Y Position</span>
              <input
                type="number"
                step="0.5"
                value={selected3DObject.y}
                onChange={(e) => updatePlacedObject(selected3DObject.id, { y: parseFloat(e.target.value) || 0 })}
                className={`w-full font-mono px-2.5 py-1.5 rounded-lg border text-xs
                  ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'}`}
              />
            </div>
          </div>
        </div>

        {/* Rotation Y Angle */}
        <div className={`p-3 rounded-2xl border space-y-2 ${isDarkMode ? 'bg-slate-800/40 border-slate-750' : 'bg-slate-50 border-slate-200'}`}>
          <div className="flex items-center justify-between text-xs font-bold text-blue-400">
            <span className="flex items-center gap-1.5">
              <RotateCw className="w-3.5 h-3.5" />
              Rotation Y Angle
            </span>
            <span className="font-mono">{selected3DObject.rotation}°</span>
          </div>
          <input
            type="range"
            min="0"
            max="360"
            step="15"
            value={selected3DObject.rotation}
            onChange={(e) => updatePlacedObject(selected3DObject.id, { rotation: parseInt(e.target.value) })}
            className="w-full accent-blue-600 cursor-pointer"
          />
        </div>

        {/* Scale Dimensions (W, H, D) */}
        <div className={`p-3 rounded-2xl border space-y-3 ${isDarkMode ? 'bg-slate-800/40 border-slate-750' : 'bg-slate-50 border-slate-200'}`}>
          <label className="text-xs font-bold text-blue-400">Scale Dimensions (W × H × D)</label>
          <div className="grid grid-cols-3 gap-1.5 text-xs font-mono">
            <div>
              <span className="text-[10px] text-slate-400 block mb-0.5">Width</span>
              <input
                type="number"
                step="0.1"
                value={selected3DObject.scale[0]}
                onChange={(e) => updatePlacedObject(selected3DObject.id, {
                  scale: [parseFloat(e.target.value) || 1, selected3DObject.scale[1], selected3DObject.scale[2]]
                })}
                className={`w-full px-2 py-1 rounded border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-300'}`}
              />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block mb-0.5">Height</span>
              <input
                type="number"
                step="0.1"
                value={selected3DObject.scale[1]}
                onChange={(e) => updatePlacedObject(selected3DObject.id, {
                  scale: [selected3DObject.scale[0], parseFloat(e.target.value) || 1, selected3DObject.scale[2]]
                })}
                className={`w-full px-2 py-1 rounded border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-300'}`}
              />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block mb-0.5">Depth</span>
              <input
                type="number"
                step="0.1"
                value={selected3DObject.scale[2]}
                onChange={(e) => updatePlacedObject(selected3DObject.id, {
                  scale: [selected3DObject.scale[0], selected3DObject.scale[1], parseFloat(e.target.value) || 1]
                })}
                className={`w-full px-2 py-1 rounded border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-300'}`}
              />
            </div>
          </div>
        </div>

        {/* Color Material Picker */}
        <div>
          <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-2 block flex items-center gap-1.5">
            <Palette className="w-3.5 h-3.5 text-blue-500" />
            Material Color
          </label>
          <div className="flex items-center gap-2">
            {['#3b82f6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#64748b'].map((c) => (
              <button
                key={c}
                onClick={() => updatePlacedObject(selected3DObject.id, { color: c })}
                style={{ backgroundColor: c }}
                className={`w-7 h-7 rounded-xl border-2 transition transform hover:scale-110
                  ${selected3DObject.color === c ? 'border-white ring-2 ring-blue-500 shadow-lg' : 'border-transparent'}`}
              />
            ))}
          </div>
        </div>

        {/* Delete Object Action */}
        <button
          onClick={() => removePlacedObject(selected3DObject.id)}
          className="w-full py-2.5 px-4 rounded-xl bg-rose-600/10 hover:bg-rose-600 text-rose-600 hover:text-white border border-rose-500/20 font-bold text-xs flex items-center justify-center gap-2 transition"
        >
          <Trash2 className="w-4 h-4" /> Delete Object
        </button>
      </div>
    </aside>
  );
};
