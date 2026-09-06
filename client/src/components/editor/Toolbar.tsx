import React from 'react';
import { Level } from '../../types/client';
import { 
  MousePointer, 
  Square, 
  CircleDot, 
  GitBranch, 
  MapPin, 
  Ruler, 
  Save, 
  Download, 
  QrCode, 
  Layers, 
  Link2,
  Upload
} from 'lucide-react';

export type EditorTool = 'select' | 'room' | 'node' | 'edge' | 'poi' | 'scale';

interface ToolbarProps {
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
}

export const Toolbar: React.FC<ToolbarProps> = ({
  activeTool,
  onSelectTool,
  levels,
  activeLevel,
  onSelectLevel,
  onSave,
  onOpenExportModal,
  onOpenQRGenerator,
  onOpenVerticalLinker,
  onOpenUploadModal,
  isSaving,
  hasUnsavedChanges
}) => {
  const tools = [
    { id: 'select', label: 'Select & Edit', icon: MousePointer },
    { id: 'room', label: 'Draw Room', icon: Square },
    { id: 'node', label: 'Place Waypoint', icon: CircleDot },
    { id: 'edge', label: 'Connect Pathway', icon: GitBranch },
    { id: 'poi', label: 'Add POI Pin', icon: MapPin },
    { id: 'scale', label: 'Calibrate Scale', icon: Ruler }
  ];

  return (
    <div className="h-14 px-4 bg-white border-b border-slate-200 flex items-center justify-between z-20 select-none shadow-sm">
      {/* Left: Tools */}
      <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
        {tools.map((t) => {
          const Icon = t.icon;
          const isActive = activeTool === t.id;
          return (
            <button
              key={t.id}
              onClick={() => onSelectTool(t.id as EditorTool)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
              title={t.label}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden md:inline">{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Center: Floor Switcher */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-500 font-semibold hidden sm:inline">Editing Floor:</span>
        <select
          value={activeLevel?.id || ''}
          onChange={(e) => {
            const lvl = levels.find(l => l.id === e.target.value);
            if (lvl) onSelectLevel(lvl);
          }}
          className="bg-slate-50 text-slate-900 text-xs font-bold px-3 py-1.5 rounded-xl border border-slate-300 hover:border-blue-500 focus:outline-none cursor-pointer"
        >
          {levels.map((lvl) => (
            <option key={lvl.id} value={lvl.id}>
              {lvl.name} ({lvl.short_name})
            </option>
          ))}
        </select>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {/* Upload Layout (IMDF / Blueprint) */}
        <button
          onClick={onOpenUploadModal}
          className="p-2 md:px-3 md:py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-sm"
          title="Upload IMDF GeoJSON or Blueprint Drawing"
        >
          <Upload className="w-4 h-4" />
          <span className="hidden sm:inline">Upload Layout</span>
        </button>

        {/* Multi-floor Elevator linker */}
        <button
          onClick={onOpenVerticalLinker}
          className="p-2 md:px-3 md:py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
          title="Connect Multi-Level Elevators & Stairs"
        >
          <Link2 className="w-4 h-4 text-blue-600" />
          <span className="hidden lg:inline">Link Elevators</span>
        </button>

        {/* QR Wall Plate Generator */}
        <button
          onClick={onOpenQRGenerator}
          className="p-2 md:px-3 md:py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
          title="Printable QR Code Checkpoints"
        >
          <QrCode className="w-4 h-4 text-emerald-600" />
          <span className="hidden lg:inline">QR Checkpoints</span>
        </button>

        {/* Export IMDF */}
        <button
          onClick={onOpenExportModal}
          className="p-2 md:px-3 md:py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
          title="Export OGC IMDF GeoJSON"
        >
          <Download className="w-4 h-4 text-slate-600" />
          <span className="hidden lg:inline">Export IMDF</span>
        </button>

        {/* Save to PostgreSQL */}
        <button
          onClick={onSave}
          disabled={isSaving}
          className={`px-4 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm transition ${
            hasUnsavedChanges
              ? 'bg-emerald-600 hover:bg-emerald-700 text-white animate-pulse'
              : 'bg-slate-800 text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Save className="w-4 h-4" />
          <span>{isSaving ? 'Saving...' : 'Save to DB'}</span>
        </button>
      </div>
    </div>
  );
};
