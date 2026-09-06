import React from 'react';
import { Venue } from '../../types/client';
import { Compass, Edit3, MapPin, Database, Navigation } from 'lucide-react';

interface NavbarProps {
  venues: Venue[];
  currentVenue: Venue | null;
  onSelectVenue: (venue: Venue) => void;
  activeMode: 'visitor' | 'editor';
  onToggleMode: (mode: 'visitor' | 'editor') => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  venues,
  currentVenue,
  onSelectVenue,
  activeMode,
  onToggleMode
}) => {
  return (
    <header className="h-16 px-4 md:px-6 flex items-center justify-between bg-white border-b border-slate-200 z-30 select-none shadow-sm">
      {/* Brand & Logo */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-md shadow-blue-600/20">
          <Navigation className="w-5 h-5 text-white stroke-[2.2]" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base md:text-lg font-bold tracking-tight text-slate-900 flex items-center gap-1.5">
              NavIndoor
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                IMDF
              </span>
            </h1>
          </div>
          <p className="text-[11px] text-slate-500 hidden sm:block">Indoor Navigation Platform</p>
        </div>
      </div>

      {/* Venue Switcher */}
      <div className="flex items-center gap-2.5">
        <div className="relative">
          <select
            value={currentVenue?.id || ''}
            onChange={(e) => {
              const selected = venues.find(v => v.id === e.target.value);
              if (selected) onSelectVenue(selected);
            }}
            className="bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs md:text-sm font-semibold pl-8 pr-8 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 appearance-none cursor-pointer transition shadow-sm"
          >
            {venues.map((v) => (
              <option key={v.id} value={v.id} className="bg-white text-slate-800">
                {v.name}
              </option>
            ))}
          </select>
          <MapPin className="w-4 h-4 text-blue-600 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* PostgreSQL status badge */}
        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
          <Database className="w-3.5 h-3.5 text-emerald-600" />
          <span>PostgreSQL Active</span>
        </div>
      </div>

      {/* Mode Switcher Tabs */}
      <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
        <button
          onClick={() => onToggleMode('visitor')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs md:text-sm font-semibold transition-all duration-150 ${
            activeMode === 'visitor'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
          }`}
        >
          <Compass className="w-4 h-4" />
          <span>Visitor View</span>
        </button>

        <button
          onClick={() => onToggleMode('editor')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs md:text-sm font-semibold transition-all duration-150 ${
            activeMode === 'editor'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
          }`}
        >
          <Edit3 className="w-4 h-4" />
          <span>Map Studio</span>
        </button>
      </div>
    </header>
  );
};
