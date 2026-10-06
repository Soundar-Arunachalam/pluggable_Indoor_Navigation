import React, { useEffect } from 'react';
import { Level } from '../../types/client';
import { useUIStore } from '../../stores/uiStore';
import {
  MousePointer, Square, CircleDot, GitBranch, MapPin, Ruler,
  Save, Download, QrCode, Link2, Upload, Undo2, Redo2, Loader2,
  Layers, Hammer
} from 'lucide-react';

export type EditorTool = 'select' | 'room' | 'node' | 'edge' | 'poi' | 'scale';

interface ToolSidebarProps {
  activeTool: EditorTool;
  onSelectTool: (tool: EditorTool) => void;
  levels: Level[];
  activeLevel: Level | null;
  onSelectLevel: (level: Level) => void;
  onSave: () => void;
  onOpenExportModal: () => void;
  onOpenQRGenerator: () => void;
  onOpenVerticalLinker: () => void;
  onOpenUploadModal: () => void;
  isSaving: boolean;
  hasUnsavedChanges: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
}

export const ToolSidebar: React.FC<ToolSidebarProps> = ({
  activeTool, onSelectTool, levels, activeLevel, onSelectLevel,
  onSave, onOpenExportModal, onOpenQRGenerator, onOpenVerticalLinker, onOpenUploadModal,
  isSaving, hasUnsavedChanges, canUndo, canRedo, onUndo, onRedo,
}) => {
  const { isDarkMode } = useUIStore();

  const tools = [
    { id: 'select', label: 'Select & Edit', icon: MousePointer },
    { id: 'room', label: 'Draw Room', icon: Square },
    { id: 'node', label: 'Place Waypoint', icon: CircleDot },
    { id: 'edge', label: 'Connect Pathway', icon: GitBranch },
    { id: 'poi', label: 'Add POI Pin', icon: MapPin },
    { id: 'scale', label: 'Calibrate Scale', icon: Ruler },
  ];

  // Keyboard shortcuts: Ctrl+Z / Ctrl+Y
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); if (canUndo) onUndo(); }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); if (canRedo) onRedo(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); onSave(); }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [canUndo, canRedo, onUndo, onRedo, onSave]);

  const base = isDarkMode
    ? 'bg-slate-900 border-slate-700 text-slate-100'
    : 'bg-slate-50 border-slate-200 text-slate-900';
    
  const btnBase = isDarkMode
    ? 'text-slate-400 hover:text-white hover:bg-slate-800 border-slate-700'
    : 'text-slate-600 hover:text-slate-900 hover:bg-white border-slate-200';

  const sectionLabel = "text-[10px] font-bold uppercase tracking-wider mb-2 " + (isDarkMode ? "text-slate-500" : "text-slate-400");

  return (
    <div className={`w-16 md:w-64 flex flex-col border-r z-20 select-none shadow-sm transition-colors duration-200 overflow-y-auto ${base}`}>
      
      {/* Top Header / Save */}
      <div className="p-4 border-b border-inherit">
        <button
          onClick={onSave} disabled={isSaving}
          title="Save to DB (Ctrl+S)"
          className={`w-full py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition
            ${hasUnsavedChanges
              ? 'bg-emerald-600 hover:bg-emerald-700 text-white ring-2 ring-emerald-400/30'
              : isDarkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
            } disabled:opacity-50 disabled:pointer-events-none`}
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          <span className="hidden md:inline">{isSaving ? 'Saving…' : 'Save Changes'}</span>
          {hasUnsavedChanges && !isSaving && <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-400 animate-pulse hidden md:block" />}
        </button>
      </div>

      <div className="flex-1 p-3 space-y-6">
        {/* Floor Selection */}
        <div>
          <div className={`hidden md:flex items-center gap-1.5 ${sectionLabel}`}>
             <Layers className="w-3.5 h-3.5" /> Floor Level
          </div>
          <select
            value={activeLevel?.id || ''}
            onChange={(e) => {
              const lvl = levels.find(l => l.id === e.target.value);
              if (lvl) onSelectLevel(lvl);
            }}
            className={`w-full text-xs font-bold px-3 py-2 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer transition shadow-sm
              ${isDarkMode
                ? 'bg-slate-800 border-slate-700 text-slate-100 hover:border-blue-500'
                : 'bg-white text-slate-900 border-slate-300 hover:border-blue-500'
              }`}
          >
            {levels.map((lvl) => (
              <option key={lvl.id} value={lvl.id}>{lvl.name} ({lvl.short_name})</option>
            ))}
          </select>
        </div>

        {/* Tools Palette */}
        <div>
           <div className={`hidden md:flex items-center gap-1.5 ${sectionLabel}`}>
             <Hammer className="w-3.5 h-3.5" /> Creation Tools
           </div>
           
           <div className="grid grid-cols-1 gap-1.5">
             {tools.map((t) => {
                const Icon = t.icon;
                const isActive = activeTool === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => onSelectTool(t.id as EditorTool)}
                    title={t.label}
                    className={`px-3 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center md:justify-start gap-3 transition
                      ${isActive
                        ? 'bg-blue-600 text-white shadow-md'
                        : isDarkMode ? 'text-slate-300 hover:text-white hover:bg-slate-800' : 'text-slate-600 hover:text-slate-900 hover:bg-white shadow-sm border border-slate-200'
                      }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden md:inline">{t.label}</span>
                  </button>
                );
              })}
           </div>
        </div>

        {/* Undo/Redo */}
        <div className="flex items-center justify-center md:justify-start gap-2">
          <button
            onClick={onUndo} disabled={!canUndo} title="Undo (Ctrl+Z)"
            className={`p-2.5 rounded-xl border transition shadow-sm disabled:opacity-30 disabled:pointer-events-none flex-1 flex justify-center ${btnBase}`}
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            onClick={onRedo} disabled={!canRedo} title="Redo (Ctrl+Y)"
            className={`p-2.5 rounded-xl border transition shadow-sm disabled:opacity-30 disabled:pointer-events-none flex-1 flex justify-center ${btnBase}`}
          >
            <Redo2 className="w-4 h-4" />
          </button>
        </div>

      </div>

      {/* Bottom Actions */}
      <div className="p-3 border-t border-inherit space-y-1.5">
         <div className={`hidden md:block ${sectionLabel} mb-3`}>Actions & Export</div>
         
         <button onClick={onOpenUploadModal} title="Upload Blueprint"
            className={`w-full p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center md:justify-start gap-2 transition shadow-sm ${btnBase}`}>
            <Upload className="w-4 h-4 text-indigo-500" />
            <span className="hidden md:inline">Upload Map</span>
         </button>
         
         <button onClick={onOpenVerticalLinker} title="Link Elevators & Stairs"
            className={`w-full p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center md:justify-start gap-2 transition shadow-sm ${btnBase}`}>
            <Link2 className="w-4 h-4 text-blue-500" />
            <span className="hidden md:inline">Vertical Links</span>
         </button>

         <button onClick={onOpenQRGenerator} title="QR Checkpoints"
            className={`w-full p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center md:justify-start gap-2 transition shadow-sm ${btnBase}`}>
            <QrCode className="w-4 h-4 text-emerald-500" />
            <span className="hidden md:inline">QR Checkpoints</span>
         </button>

         <button onClick={onOpenExportModal} title="Export IMDF GeoJSON"
            className={`w-full p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center md:justify-start gap-2 transition shadow-sm ${btnBase}`}>
            <Download className="w-4 h-4 text-amber-500" />
            <span className="hidden md:inline">Export IMDF</span>
         </button>
      </div>

    </div>
  );
};
