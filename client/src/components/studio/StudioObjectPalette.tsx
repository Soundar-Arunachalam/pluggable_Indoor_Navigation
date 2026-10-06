import React from 'react';
import { useStudioStore, Placed3DObject } from '../../stores/studioStore';
import { useUIStore } from '../../stores/uiStore';
import { Box, Plus, Check, Info } from 'lucide-react';

interface PaletteItem {
  name: string;
  category: Placed3DObject['category'];
  modelType: string;
  icon: string;
  color: string;
  scale: [number, number, number]; // width, height, depth in meters
  desc: string;
}

const OBJECT_PALETTE: PaletteItem[] = [
  { name: 'Executive Office Desk', category: 'furniture', modelType: 'desk', icon: '🪑', color: '#3b82f6', scale: [1.8, 0.75, 0.9], desc: 'Standard office desk fixture' },
  { name: 'Interactive Info Kiosk', category: 'kiosk', modelType: 'kiosk', icon: '🖥️', color: '#06b6d4', scale: [0.8, 1.8, 0.6], desc: 'Digital touchscreen kiosk unit' },
  { name: 'Single Glass Door', category: 'door', modelType: 'door', icon: '🚪', color: '#64748b', scale: [1.0, 2.2, 0.15], desc: 'Standard door frame opening' },
  { name: 'Architectural Column', category: 'pillar', modelType: 'pillar', icon: '🏛️', color: '#475569', scale: [0.6, 3.2, 0.6], desc: 'Structural concrete pillar' },
  { name: 'Elevator Shaft Enclosure', category: 'elevator', modelType: 'elevator', icon: '🛗', color: '#2563eb', scale: [2.5, 3.2, 2.5], desc: 'Multi-floor vertical elevator shaft' },
  { name: 'Escalator Corridor Unit', category: 'escalator', modelType: 'escalator', icon: '🪜', color: '#0891b2', scale: [1.5, 3.0, 6.0], desc: 'Diagonal motorized escalator' },
  { name: 'Security Access Gate', category: 'furniture', modelType: 'kiosk', icon: '🛡️', color: '#16a34a', scale: [1.2, 1.2, 0.4], desc: 'RFID Turnstile gate barrier' },
  { name: 'Decorative Indoor Plant', category: 'plant', modelType: 'plant', icon: '🪴', color: '#22c55e', scale: [0.8, 1.4, 0.8], desc: 'Foliage potted plant decor' },
  { name: 'Wayfinding Signage Post', category: 'signage', modelType: 'signage', icon: '🪧', color: '#f59e0b', scale: [0.6, 2.4, 0.3], desc: 'Directional map signboard' },
  { name: 'Emergency First Aid Station', category: 'emergency', modelType: 'kiosk', icon: '🚨', color: '#ef4444', scale: [0.8, 1.6, 0.5], desc: 'AED and emergency medical kit' },
];

export const StudioObjectPalette: React.FC = () => {
  const { isDarkMode } = useUIStore();
  const { selectedPaletteItem, setSelectedPaletteItem, setActiveStudioTool } = useStudioStore();

  const handleSelectItem = (item: PaletteItem) => {
    setSelectedPaletteItem({
      category: item.category,
      modelType: item.modelType,
      name: item.name,
      color: item.color,
      scale: item.scale,
    });
    setActiveStudioTool('place_object');
  };

  return (
    <div className={`p-4 border-t transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
      <div className="flex items-center justify-between mb-2">
        <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <Box className="w-3.5 h-3.5 text-blue-500" />
          3D Architectural Palette
        </label>
        <span className="text-[10px] text-blue-500 font-bold">Click to Place</span>
      </div>

      <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
        {OBJECT_PALETTE.map((item, idx) => {
          const isSelected = selectedPaletteItem?.name === item.name;
          return (
            <button
              key={idx}
              onClick={() => handleSelectItem(item)}
              className={`p-2 rounded-xl border text-left flex items-start gap-2 transition
                ${isSelected
                  ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/25'
                  : isDarkMode
                    ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-750'
                    : 'bg-white border-slate-200 text-slate-800 hover:bg-slate-100'
                }`}
            >
              <span className="text-lg leading-none shrink-0">{item.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-xs truncate">{item.name}</p>
                <p className={`text-[10px] truncate ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                  {item.scale[0]}m × {item.scale[1]}m × {item.scale[2]}m
                </p>
              </div>
              {isSelected && <Check className="w-3.5 h-3.5 text-white shrink-0" />}
            </button>
          );
        })}
      </div>
    </div>
  );
};
