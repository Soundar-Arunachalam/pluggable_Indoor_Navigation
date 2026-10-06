import React, { useState } from 'react';
import { useUIStore } from '../../stores/uiStore';
import { useStudioStore } from '../../stores/studioStore';
import { Venue } from '../../types/client';
import { Download, Camera, FileCode, Check, X, ShieldCheck, Sparkles, Layers } from 'lucide-react';

interface StudioExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  venue: Venue | null;
}

export const StudioExportModal: React.FC<StudioExportModalProps> = ({ isOpen, onClose, venue }) => {
  const { isDarkMode } = useUIStore();
  const { renderStyle, wallHeightMeters, placedObjects } = useStudioStore();
  const [downloaded, setDownloaded] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleExportPNG = () => {
    // Find Three.js canvas in DOM
    const canvas = document.querySelector('canvas');
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = `${venue?.name || 'Architectural'}_3D_Studio_Blueprint.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();

    setDownloaded('png');
    setTimeout(() => setDownloaded(null), 3000);
  };

  const handleExportJSON = () => {
    const sceneExportData = {
      venue: venue?.name,
      renderStyle,
      wallHeightMeters,
      placedObjects,
      timestamp: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(sceneExportData, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.download = `${venue?.name || 'Architectural'}_3D_Scene_Data.json`;
    link.href = URL.createObjectURL(blob);
    link.click();

    setDownloaded('json');
    setTimeout(() => setDownloaded(null), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className={`w-full max-w-md rounded-3xl border shadow-2xl overflow-hidden transition-colors
        ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'}`}>

        {/* Modal Header */}
        <div className="p-6 border-b flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/30">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base tracking-tight">Export 3D Architectural Blueprint</h3>
              <p className="text-xs text-slate-400">Professional Studio Export</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-slate-800/40 border-slate-750' : 'bg-slate-50 border-slate-200'}`}>
            <div className="text-xs font-bold text-blue-400 mb-1 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" /> Export Specifications
            </div>
            <div className="text-xs space-y-1 text-slate-400">
              <div>Venue: <span className="font-semibold text-slate-200">{venue?.name || 'NavIndoor Venue'}</span></div>
              <div>Current Render Preset: <span className="font-semibold uppercase text-blue-400">{renderStyle}</span></div>
              <div>3D Objects in Scene: <span className="font-semibold text-slate-200">{placedObjects.length} items</span></div>
            </div>
          </div>

          <div className="space-y-3">
            {/* Image PNG Export */}
            <button
              onClick={handleExportPNG}
              className="w-full p-4 rounded-2xl border flex items-center justify-between text-left transition hover:border-blue-500 hover:bg-blue-600/10 group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-600/20 text-blue-500 flex items-center justify-center">
                  <Download className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-bold text-xs group-hover:text-blue-400">High-Res Render Screenshot (PNG)</p>
                  <p className="text-[11px] text-slate-400">2K Resolution WebGL canvas snapshot</p>
                </div>
              </div>
              {downloaded === 'png' ? <Check className="w-4 h-4 text-emerald-400" /> : <Download className="w-4 h-4 text-slate-400" />}
            </button>

            {/* Scene Data JSON Export */}
            <button
              onClick={handleExportJSON}
              className="w-full p-4 rounded-2xl border flex items-center justify-between text-left transition hover:border-blue-500 hover:bg-blue-600/10 group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-cyan-600/20 text-cyan-500 flex items-center justify-center">
                  <FileCode className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-bold text-xs group-hover:text-cyan-400">3D Scene Definition (JSON)</p>
                  <p className="text-[11px] text-slate-400">Architectural geometry & placed object specs</p>
                </div>
              </div>
              {downloaded === 'json' ? <Check className="w-4 h-4 text-emerald-400" /> : <Download className="w-4 h-4 text-slate-400" />}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t flex justify-end bg-slate-950/20">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};
