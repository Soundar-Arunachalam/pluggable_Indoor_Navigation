import React from 'react';
import { Level, RouteResponse } from '../../types/client';
import { Layers } from 'lucide-react';

interface LevelSelectorProps {
  levels: Level[];
  activeLevel: Level | null;
  onSelectLevel: (level: Level) => void;
  route: RouteResponse | null;
}

export const LevelSelector: React.FC<LevelSelectorProps> = ({
  levels,
  activeLevel,
  onSelectLevel,
  route
}) => {
  if (levels.length <= 1) return null;

  // Sort levels top to bottom (highest ordinal first)
  const sortedLevels = [...levels].sort((a, b) => b.ordinal - a.ordinal);

  return (
    <div className="absolute right-4 top-20 z-20 flex flex-col items-end gap-2">
      <div className="bg-white p-1.5 rounded-2xl flex flex-col gap-1 shadow-lg border border-slate-200">
        <div className="px-2.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 border-b border-slate-100 pb-1.5 mb-0.5">
          <Layers className="w-3 h-3 text-slate-400" />
          <span>Floors</span>
        </div>

        {sortedLevels.map((lvl) => {
          const isActive = activeLevel?.id === lvl.id;
          const isTraversedByRoute = route?.levelsTraversed.includes(lvl.id);

          return (
            <button
              key={lvl.id}
              onClick={() => onSelectLevel(lvl)}
              className={`relative px-3 py-2 rounded-xl text-xs font-bold transition flex items-center justify-between gap-3 ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm'
                  : isTraversedByRoute
                  ? 'bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-[11px] ${
                  isActive ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-700'
                }`}>
                  {lvl.short_name || `L${lvl.ordinal + 1}`}
                </span>
                <span className="hidden sm:inline font-medium text-left">{lvl.name}</span>
              </div>

              {/* Route Indicator Dot */}
              {isTraversedByRoute && !isActive && (
                <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
