import React, { useState, useMemo, useEffect } from 'react';
import { useVenueStore } from '../../stores/venueStore';
import { useNavStore } from '../../stores/navStore';
import { POI, Level } from '../../types/client';
import Fuse from 'fuse.js';
import {
  Search, MapPin, Accessibility, Navigation, Pill, Utensils,
  Activity, Coffee, Layers, ArrowRight, QrCode, X, ChevronDown, ChevronUp, Tag, Share2
} from 'lucide-react';

interface POISearchDrawerProps {
  onOpenQRScanner: () => void;
  onOpenShare: () => void;
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  pharmacy:   <Pill className="w-3.5 h-3.5 text-emerald-600" />,
  clinic:     <Activity className="w-3.5 h-3.5 text-rose-600" />,
  first_aid:  <Activity className="w-3.5 h-3.5 text-rose-600" />,
  food:       <Utensils className="w-3.5 h-3.5 text-amber-600" />,
  cafe:       <Coffee className="w-3.5 h-3.5 text-amber-700" />,
  restroom:   <MapPin className="w-3.5 h-3.5 text-purple-600" />,
  elevator:   <Layers className="w-3.5 h-3.5 text-blue-600" />,
  entrance:   <ArrowRight className="w-3.5 h-3.5 text-blue-500" />,
};

const getCategoryIcon = (cat: string) =>
  CATEGORY_ICONS[cat] || <MapPin className="w-3.5 h-3.5 text-blue-500" />;

const formatCategory = (cat: string) =>
  cat.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

export const POISearchDrawer: React.FC<POISearchDrawerProps> = ({ onOpenQRScanner, onOpenShare }) => {
  const { allVenuePOIs, levels, activeLevel } = useVenueStore();
  const { selectedPOI, setSelectedPOI, calculateRoute, accessibleOnly } = useNavStore();
  const { currentVenue } = useVenueStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [floorFilter, setFloorFilter] = useState('all');
  const [isOpen, setIsOpen] = useState(true);

  // Dynamically derive categories from actual POI data
  const categories = useMemo(() => {
    const cats = [...new Set(allVenuePOIs.map(p => p.category))].sort();
    return [{ id: 'all', label: 'All' }, ...cats.map(c => ({ id: c, label: formatCategory(c) }))];
  }, [allVenuePOIs]);

  // Fuse.js fuzzy search index
  const fuse = useMemo(() =>
    new Fuse(allVenuePOIs, {
      keys: [
        { name: 'name', weight: 2 },
        { name: 'description', weight: 1 },
        { name: 'category', weight: 0.5 },
      ],
      threshold: 0.4,
      includeScore: true,
    }), [allVenuePOIs]
  );

  const filteredPOIs = useMemo(() => {
    let results: POI[];

    if (searchQuery.trim()) {
      results = fuse.search(searchQuery).map(r => r.item);
    } else {
      results = allVenuePOIs;
    }

    return results.filter(p => {
      const matchesCat = selectedCategory === 'all' || p.category === selectedCategory;
      const matchesFloor = floorFilter === 'all' || p.level_id === floorFilter;
      return matchesCat && matchesFloor;
    });
  }, [allVenuePOIs, searchQuery, selectedCategory, floorFilter, fuse]);

  const handleSelectPOI = (poi: POI) => {
    setSelectedPOI(poi);
    const poiLevel = levels.find(l => l.id === poi.level_id);
    if (poiLevel && poiLevel.id !== activeLevel?.id) {
      useVenueStore.getState().selectLevel(poiLevel);
    }
  };

  const handleNavigate = (poi: POI) => {
    if (!currentVenue) return;
    calculateRoute(currentVenue.id, poi, levels, activeLevel?.id);
  };

  return (
    <div className="absolute left-4 top-4 bottom-8 z-20 w-80 md:w-96 flex flex-col pointer-events-none">
      {/* Search Header */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl pointer-events-auto overflow-hidden">
        {/* Top bar */}
        <div className="flex items-center gap-2 px-3 py-3 border-b border-slate-100 dark:border-slate-700">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search destinations…"
            className="flex-1 text-sm bg-transparent text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')}>
              <X className="w-4 h-4 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200" />
            </button>
          )}
          <button
            onClick={onOpenQRScanner}
            title="Scan QR Checkpoint"
            className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 hover:bg-blue-100 transition shrink-0"
          >
            <QrCode className="w-4 h-4" />
          </button>
          <button
            onClick={onOpenShare}
            title="Share Navigation Link"
            className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 transition shrink-0"
          >
            <Share2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsOpen(o => !o)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition shrink-0"
          >
            {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {/* Filters */}
        {isOpen && (
          <>
            {/* Category chips */}
            <div className="flex gap-1.5 overflow-x-auto px-3 py-2 scrollbar-hide">
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-bold transition whitespace-nowrap border
                    ${selectedCategory === cat.id
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-blue-400 hover:text-blue-600'
                    }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Floor filter */}
            {levels.length > 1 && (
              <div className="px-3 pb-2">
                <select
                  value={floorFilter}
                  onChange={e => setFloorFilter(e.target.value)}
                  className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="all">All Floors</option>
                  {levels.map(l => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
              </div>
            )}
          </>
        )}
      </div>

      {/* POI Results List */}
      {isOpen && (
        <div className="mt-2 flex-1 overflow-y-auto flex flex-col gap-1.5 pointer-events-auto pr-1">
          {filteredPOIs.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 px-4 py-6 text-center shadow">
              <Tag className="w-7 h-7 text-slate-300 mx-auto mb-2" />
              <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">No results found</p>
              {searchQuery && <p className="text-[11px] text-slate-400 mt-1">Try a different search term</p>}
            </div>
          ) : (
            filteredPOIs.map(poi => {
              const isSelected = selectedPOI?.id === poi.id;
              const floor = levels.find(l => l.id === poi.level_id);
              return (
                <div
                  key={poi.id}
                  onClick={() => handleSelectPOI(poi)}
                  className={`bg-white dark:bg-slate-900 rounded-xl border shadow-sm cursor-pointer transition-all duration-150
                    ${isSelected
                      ? 'border-blue-400 dark:border-blue-600 ring-1 ring-blue-400/30 shadow-blue-500/10'
                      : 'border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700'
                    }`}
                >
                  <div className="flex items-center gap-3 p-3">
                    {/* Icon */}
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border
                      ${isSelected
                        ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {getCategoryIcon(poi.category)}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-bold truncate ${isSelected ? 'text-blue-700 dark:text-blue-400' : 'text-slate-900 dark:text-slate-100'}`}>
                        {poi.name}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] text-slate-400 dark:text-slate-500">{formatCategory(poi.category)}</span>
                        {floor && (
                          <>
                            <span className="text-slate-300 dark:text-slate-600">·</span>
                            <span className="text-[11px] text-slate-400 dark:text-slate-500">{floor.short_name}</span>
                          </>
                        )}
                        {poi.is_accessible && (
                          <Accessibility className="w-3 h-3 text-emerald-500 shrink-0" />
                        )}
                      </div>
                    </div>

                    {/* Navigate button */}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleNavigate(poi); }}
                      className={`shrink-0 p-2 rounded-xl transition
                        ${isSelected
                          ? 'bg-blue-600 text-white shadow-sm hover:bg-blue-700'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-blue-600 hover:text-white'
                        }`}
                      title={`Navigate to ${poi.name}`}
                    >
                      <Navigation className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Description (when selected) */}
                  {isSelected && poi.description && (
                    <div className="px-3 pb-3">
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 rounded-lg px-2 py-1.5">{poi.description}</p>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
