import React from 'react';
import { useEditorStore } from '../../stores/editorStore';
import { useVenueStore } from '../../stores/venueStore';
import { Trash2, X } from 'lucide-react';
import { useUIStore } from '../../stores/uiStore';

export const PropertiesSidebar: React.FC = () => {
  const { selectedElement, setSelectedElement, pushHistory } = useEditorStore();
  const { levelMap, setLevelMap } = useVenueStore();
  const { isDarkMode } = useUIStore();

  if (!selectedElement || !levelMap) {
    return (
      <div className={`w-64 lg:w-72 border-l p-4 flex flex-col ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
        <p className="text-sm text-center mt-10">Select an element on the canvas to view its properties.</p>
      </div>
    );
  }

  const handleDeleteSelected = () => {
    const { type, id } = selectedElement;

    let updated = { ...levelMap };
    if (type === 'unit') {
      updated.units = { ...updated.units, features: updated.units.features.filter(u => u.id !== id) };
    } else if (type === 'node') {
      updated.nodes = { ...updated.nodes, features: updated.nodes.features.filter(n => n.id !== id) };
      updated.edges = { ...updated.edges, features: updated.edges.features.filter(
          e => e.properties.from_node_id !== id && e.properties.to_node_id !== id
      ) };
    } else if (type === 'edge') {
      updated.edges = { ...updated.edges, features: updated.edges.features.filter(e => e.id !== id) };
    } else if (type === 'poi') {
      updated.pois = { ...updated.pois, features: updated.pois.features.filter(p => p.id !== id) };
    }

    setLevelMap(updated);
    pushHistory(updated);
    setSelectedElement(null);
  };

  const handleChange = (key: string, value: any) => {
    setSelectedElement({ ...selectedElement, data: { ...selectedElement.data, [key]: value } });
    
    const updated = { ...levelMap };
    if (selectedElement.type === 'unit') {
      const el = updated.units.features.find(u => u.id === selectedElement.id);
      if (el) el.properties[key] = value;
    } else if (selectedElement.type === 'node') {
      const el = updated.nodes.features.find(n => n.id === selectedElement.id);
      if (el) el.properties[key] = value;
    } else if (selectedElement.type === 'poi') {
      const el = updated.pois.features.find(p => p.id === selectedElement.id);
      if (el) el.properties[key] = value;
    }
    setLevelMap(updated);
  };

  const handleBlur = () => {
    // Only push history when done typing to avoid too many history states
    pushHistory(levelMap);
  };

  const inputBase = isDarkMode 
    ? "w-full bg-slate-800 px-3 py-2 rounded-xl border border-slate-700 text-slate-100 focus:outline-none focus:border-blue-500 font-medium"
    : "w-full bg-white px-3 py-2 rounded-xl border border-slate-300 text-slate-900 focus:outline-none focus:border-blue-600 font-medium shadow-sm";

  const labelBase = "text-xs font-semibold block mb-1.5 uppercase tracking-wide " + (isDarkMode ? "text-slate-400" : "text-slate-500");

  return (
    <div className={`w-64 lg:w-72 flex flex-col border-l shadow-xl z-10 overflow-y-auto transition-colors duration-200 ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
      <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
        <h4 className={`font-bold text-xs uppercase tracking-wider ${isDarkMode ? 'text-slate-200' : 'text-slate-900'}`}>
          {selectedElement.type} Properties
        </h4>
        <div className="flex items-center gap-1">
          <button
            onClick={handleDeleteSelected}
            className={`p-1.5 rounded-lg transition ${isDarkMode ? 'text-rose-400 hover:bg-rose-500/20' : 'text-rose-500 hover:bg-rose-50'}`}
            title="Delete item"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setSelectedElement(null)}
            className={`p-1.5 rounded-lg transition ${isDarkMode ? 'text-slate-400 hover:bg-slate-800 hover:text-white' : 'text-slate-400 hover:bg-slate-200 hover:text-slate-700'}`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="p-4 flex flex-col gap-5 text-sm">
        <div>
          <label className={labelBase}>Name / Label</label>
          <input
            type="text"
            value={selectedElement.data.name || ''}
            onChange={(e) => handleChange('name', e.target.value)}
            onBlur={handleBlur}
            className={inputBase}
            placeholder={`Enter ${selectedElement.type} name...`}
          />
        </div>

        {selectedElement.type === 'unit' && (
          <div>
            <label className={labelBase}>Category</label>
            <select
              value={selectedElement.data.category || 'room'}
              onChange={(e) => {
                handleChange('category', e.target.value);
                pushHistory({ ...levelMap });
              }}
              className={inputBase}
            >
              <option value="room">Room / Office</option>
              <option value="hallway">Hallway / Corridor</option>
              <option value="restroom">Restroom</option>
              <option value="clinic">Clinic / Medical</option>
              <option value="food">Cafe / Dining</option>
              <option value="elevator">Elevator Core</option>
              <option value="stairs">Stairwell</option>
            </select>
          </div>
        )}
        
        {selectedElement.type === 'poi' && (
          <div>
             <label className={labelBase}>Description</label>
             <textarea
               rows={3}
               value={selectedElement.data.description || ''}
               onChange={(e) => handleChange('description', e.target.value)}
               onBlur={handleBlur}
               className={`${inputBase} resize-none`}
               placeholder="Enter description..."
             />
          </div>
        )}
        
        {selectedElement.type === 'edge' && (
          <div>
             <label className={labelBase}>Edge Type</label>
             <select
               value={selectedElement.data.edge_type || 'walkway'}
               onChange={(e) => {
                 handleChange('edge_type', e.target.value);
                 pushHistory({ ...levelMap });
               }}
               className={inputBase}
             >
               <option value="walkway">Walkway</option>
               <option value="stairs">Stairs</option>
               <option value="elevator">Elevator</option>
             </select>
          </div>
        )}
      </div>
    </div>
  );
};
