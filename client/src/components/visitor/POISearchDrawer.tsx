import React, { useState, useMemo } from 'react';
import { POI, Level } from '../../types/client';
import { 
  Search, 
  MapPin, 
  Accessibility, 
  Navigation, 
  Heart, 
  Pill, 
  Utensils, 
  Activity, 
  Coffee, 
  Layers, 
  ArrowRight,
  QrCode,
  X
} from 'lucide-react';

interface POISearchDrawerProps {
  pois: POI[];
  levels: Level[];
  activeLevel: Level | null;
  selectedPOI: POI | null;
  onSelectPOI: (poi: POI) => void;
  onNavigateToPOI: (poi: POI) => void;
  onOpenQRScanner: () => void;
}

const CATEGORIES = [
  { id: 'all', label: 'All', icon: MapPin },
  { id: 'clinic', label: 'Clinics', icon: Activity },
  { id: 'pharmacy', label: 'Pharmacy', icon: Pill },
  { id: 'food', label: 'Dining', icon: Utensils },
  { id: 'restroom', label: 'Restrooms', icon: MapPin },
  { id: 'elevator', label: 'Elevators', icon: Layers }
];

export const POISearchDrawer: React.FC<POISearchDrawerProps> = ({
  pois,
  levels,
  activeLevel,
  selectedPOI,
  onSelectPOI,
  onNavigateToPOI,
  onOpenQRScanner
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [floorFilter, setFloorFilter] = useState<string>('all');
  const [isOpen, setIsOpen] = useState(true);

  // Filter POIs
  const filteredPOIs = useMemo(() => {
    return pois.filter(p => {
      const matchesQuery = !searchQuery || 
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCat = selectedCategory === 'all' || p.category.includes(selectedCategory);
      const matchesFloor = floorFilter === 'all' || p.level_id === floorFilter;

      return matchesQuery && matchesCat && matchesFloor;
    });
  }, [pois, searchQuery, selectedCategory, floorFilter]);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'pharmacy': return <Pill className="w-4 h-4 text-emerald-600" />;
      case 'clinic':
      case 'first_aid': return <Activity className="w-4 h-4 text-rose-600" />;
      case 'food': return <Utensils className="w-4 h-4 text-amber-600" />;
      case 'restroom': return <MapPin className="w-4 h-4 text-purple-600" />;
      case 'elevator': return <Layers className="w-4 h-4 text-blue-600" />;
      default: return <MapPin className="w-4 h-4 text-blue-600" />;
    }
  };

  return (
    <div className="absolute left-4 top-20 bottom-8 z-20 w-80 md:w-96 flex flex-col pointer-events-none">
      {/* Search Header Container */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xl pointer-events-auto flex flex-col gap-3">
        {/* Search Input Bar */}
        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
          <input
            type="text"
            placeholder="Search rooms, clinics, dining..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 text-slate-900 text-xs md:text-sm pl-9 pr-16 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 placeholder-slate-400 transition"
          />
          {searchQuery ? (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-9 text-slate-400 hover:text-slate-700 p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : null}
          <button
            onClick={onOpenQRScanner}
            title="Scan QR Checkpoint"
            className="absolute right-2 p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition"
          >
            <QrCode className="w-4 h-4" />
          </button>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-2.5 py-1.5 rounded-xl font-semibold flex items-center gap-1 shrink-0 transition ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Floor Filter Tabs */}
        {levels.length > 1 && (
          <div className="flex items-center gap-1 text-xs border-t border-slate-100 pt-2">
            <span className="text-slate-500 font-semibold mr-1">Floor:</span>
            <button
              onClick={() => setFloorFilter('all')}
              className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition ${
                floorFilter === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              All
            </button>
            {levels.map((lvl) => (
              <button
                key={lvl.id}
                onClick={() => setFloorFilter(lvl.id)}
                className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition ${
                  floorFilter === lvl.id
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {lvl.short_name || lvl.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Results List Card */}
      <div className="flex-1 mt-2 bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden pointer-events-auto flex flex-col">
        <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <span className="font-semibold">{filteredPOIs.length} Destinations</span>
          {activeLevel && <span>Floor: {activeLevel.short_name || activeLevel.name}</span>}
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {filteredPOIs.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              <MapPin className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p>No places found matching criteria.</p>
            </div>
          ) : (
            filteredPOIs.map((poi) => {
              const isSelected = selectedPOI?.id === poi.id;
              const poiLevel = levels.find(l => l.id === poi.level_id);

              return (
                <div
                  key={poi.id}
                  onClick={() => onSelectPOI(poi)}
                  className={`p-3.5 flex items-center justify-between cursor-pointer transition ${
                    isSelected
                      ? 'bg-blue-50/80 border-l-4 border-blue-600'
                      : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl border ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-slate-100 border-slate-200'
                    }`}>
                      {getCategoryIcon(poi.category)}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-900 text-xs md:text-sm">{poi.name}</span>
                        {poi.is_accessible && (
                          <span title="Wheelchair Accessible">
                            <Accessibility className="w-3.5 h-3.5 text-emerald-600" />
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                        {poiLevel && <span className="font-semibold text-blue-700">{poiLevel.name}</span>}
                        {poi.description && <span>• {poi.description.substring(0, 28)}...</span>}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onNavigateToPOI(poi);
                    }}
                    title="Calculate Route"
                    className={`p-2 rounded-xl border transition ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700'
                        : 'bg-white border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50/50'
                    }`}
                  >
                    <Navigation className="w-4 h-4" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
