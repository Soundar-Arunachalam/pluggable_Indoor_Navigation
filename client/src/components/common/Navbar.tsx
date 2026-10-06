import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useVenueStore } from '../../stores/venueStore';
import { useNavStore } from '../../stores/navStore';
import { useUIStore } from '../../stores/uiStore';
import { Compass, Edit3, MapPin, Database, Navigation, Moon, Sun, PlusCircle, Move3d } from 'lucide-react';

interface NavbarProps {
  activeMode: 'visitor' | 'editor' | 'studio';
  onToggleMode: (mode: 'visitor' | 'editor' | 'studio') => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeMode, onToggleMode }) => {
  const { venues, currentVenue, selectVenue } = useVenueStore();
  const { clearRoute } = useNavStore();
  const { isDarkMode, toggleDarkMode, openModal } = useUIStore();
  const navigate = useNavigate();

  const handleVenueSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const v = venues.find(v => v.id === e.target.value);
    if (v) {
      selectVenue(v);
      clearRoute();
      if (activeMode === 'studio') navigate(`/studio/${v.id}`);
      else if (activeMode === 'editor') navigate(`/editor/${v.id}`);
      else navigate(`/venue/${v.id}`);
    }
  };

  const handleModeToggle = (mode: 'visitor' | 'editor' | 'studio') => {
    onToggleMode(mode);
    if (currentVenue) {
      if (mode === 'studio') navigate(`/studio/${currentVenue.id}`);
      else if (mode === 'editor') navigate(`/editor/${currentVenue.id}`);
      else navigate(`/venue/${currentVenue.id}`);
    }
  };

  return (
    <header className={`h-16 px-4 md:px-6 flex items-center justify-between z-30 select-none border-b transition-colors
      ${isDarkMode
        ? 'bg-slate-900 border-slate-700/60 shadow-slate-900/40'
        : 'bg-white border-slate-200 shadow-sm'
      }`}
    >
      {/* Brand */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-600/25">
          <Navigation className="w-5 h-5 text-white stroke-[2.2]" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className={`text-base md:text-lg font-bold tracking-tight flex items-center gap-1.5 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              NavIndoor
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-blue-600 text-white">
                IMDF 3D
              </span>
            </h1>
          </div>
          <p className={`text-[11px] hidden sm:block ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            Indoor Navigation & 3D Studio Platform
          </p>
        </div>
      </div>

      {/* Center: Venue Switcher */}
      <div className="flex items-center gap-2.5">
        <div className="relative">
          <select
            value={currentVenue?.id || ''}
            onChange={handleVenueSelect}
            className={`text-xs md:text-sm font-semibold pl-8 pr-8 py-2 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 appearance-none cursor-pointer transition shadow-sm
              ${isDarkMode
                ? 'bg-slate-800 border-slate-600 text-slate-100 hover:bg-slate-700'
                : 'bg-slate-50 border-slate-300 text-slate-800 hover:bg-slate-100'
              }`}
          >
            {venues.map((v) => (
              <option key={v.id} value={v.id} className="bg-white text-slate-800">{v.name}</option>
            ))}
          </select>
          <MapPin className="w-4 h-4 text-blue-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* New Venue Button */}
        <button
          onClick={() => openModal('isCreateVenueOpen')}
          title="Create New Venue"
          className={`p-2 rounded-xl border transition shrink-0
            ${isDarkMode
              ? 'bg-slate-800 border-slate-600 text-slate-300 hover:text-white hover:bg-slate-700'
              : 'bg-slate-50 border-slate-300 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
        >
          <PlusCircle className="w-4 h-4" />
        </button>

        {/* DB Status */}
        <div className={`hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold
          ${isDarkMode
            ? 'bg-emerald-950/40 border-emerald-800 text-emerald-400'
            : 'bg-emerald-50 border-emerald-200 text-emerald-700'
          }`}
        >
          <Database className="w-3.5 h-3.5" />
          <span>PG Active</span>
        </div>
      </div>

      {/* Right: Mode Switcher (Visitor | 2D Editor | 3D Studio) + Dark Mode */}
      <div className="flex items-center gap-2">
        <div className={`flex items-center p-1 rounded-xl border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200'}`}>
          <button
            onClick={() => handleModeToggle('visitor')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs md:text-sm font-semibold transition-all duration-150
              ${activeMode === 'visitor'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                : isDarkMode ? 'text-slate-400 hover:text-white hover:bg-slate-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
          >
            <Compass className="w-4 h-4" />
            <span className="hidden sm:inline">Visitor</span>
          </button>
          <button
            onClick={() => handleModeToggle('editor')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs md:text-sm font-semibold transition-all duration-150
              ${activeMode === 'editor'
                ? isDarkMode ? 'bg-slate-600 text-white shadow-sm' : 'bg-slate-900 text-white shadow-sm'
                : isDarkMode ? 'text-slate-400 hover:text-white hover:bg-slate-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
          >
            <Edit3 className="w-4 h-4" />
            <span className="hidden sm:inline">2D Editor</span>
          </button>
          <button
            onClick={() => handleModeToggle('studio')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs md:text-sm font-semibold transition-all duration-150
              ${activeMode === 'studio'
                ? 'bg-cyan-600 text-white shadow-sm shadow-cyan-600/30 font-bold'
                : isDarkMode ? 'text-cyan-400 hover:text-white hover:bg-slate-700' : 'text-cyan-700 hover:text-cyan-900 hover:bg-cyan-100/60'
              }`}
          >
            <Move3d className="w-4 h-4" />
            <span className="hidden sm:inline">3D Studio</span>
          </button>
        </div>

        {/* Dark Mode Toggle */}
        <button
          onClick={toggleDarkMode}
          title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          className={`p-2 rounded-xl border transition
            ${isDarkMode
              ? 'bg-slate-800 border-slate-700 text-amber-400 hover:bg-slate-700'
              : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
        >
          {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>
    </header>
  );
};
