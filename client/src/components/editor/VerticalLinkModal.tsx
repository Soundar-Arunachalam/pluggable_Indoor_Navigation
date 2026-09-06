import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Venue, Level } from '../../types/client';
import { api } from '../../api/client';
import { Layers, CheckCircle2 } from 'lucide-react';
import { generateId } from '../../utils/id';

interface VerticalLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  venue: Venue | null;
  levels: Level[];
}

export const VerticalLinkModal: React.FC<VerticalLinkModalProps> = ({
  isOpen,
  onClose,
  venue,
  levels
}) => {
  const [level1Id, setLevel1Id] = useState('');
  const [level2Id, setLevel2Id] = useState('');
  const [connectorType, setConnectorType] = useState<'elevator' | 'stairs'>('elevator');
  const [groupName, setGroupName] = useState('Elevator-Core-Main');
  const [isAccessible, setIsAccessible] = useState(true);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (levels.length >= 2) {
      setLevel1Id(levels[0].id);
      setLevel2Id(levels[1].id);
    }
  }, [levels]);

  const handleCreateVerticalLink = async () => {
    if (!venue || !level1Id || !level2Id || level1Id === level2Id) {
      setStatus('Please select two distinct levels.');
      return;
    }

    try {
      const map1 = await api.getLevelMap(venue.id, level1Id);
      const map2 = await api.getLevelMap(venue.id, level2Id);

      const node1 = map1.nodes.features.find(
        n => n.properties.node_type.includes(connectorType) || n.properties.name.toLowerCase().includes(connectorType)
      ) || map1.nodes.features[0];

      const node2 = map2.nodes.features.find(
        n => n.properties.node_type.includes(connectorType) || n.properties.name.toLowerCase().includes(connectorType)
      ) || map2.nodes.features[0];

      if (!node1 || !node2) {
        setStatus(`Could not locate suitable ${connectorType} nodes on both selected floors.`);
        return;
      }

      const verticalEdge = {
        id: generateId('edge-vlink'),
        venue_id: venue.id,
        from_node_id: node1.id,
        to_node_id: node2.id,
        edge_type: connectorType,
        distance_meters: 5.0,
        is_accessible: connectorType === 'elevator' ? isAccessible : false,
        bidirectional: true,
        vertical_connector_group: groupName
      };

      await api.saveGeometry(venue.id, level1Id, { edges: [verticalEdge] });
      setStatus(`Vertical ${connectorType} link created between ${map1.level.name} and ${map2.level.name}!`);
      setTimeout(() => {
        onClose();
        setStatus(null);
      }, 1400);
    } catch (err: any) {
      setStatus(`Error linking levels: ${err.message}`);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Multi-Floor Vertical Linker"
      subtitle="Connect elevators, stairs, and escalators between floor levels for 3D A* pathfinding"
      maxWidth="max-w-md"
    >
      <div className="flex flex-col gap-4 text-xs text-slate-900">
        <div>
          <label className="text-slate-700 font-bold block mb-1.5">Connector Type</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                setConnectorType('elevator');
                setIsAccessible(true);
              }}
              className={`p-2.5 rounded-xl border text-left font-bold transition flex items-center gap-2 ${
                connectorType === 'elevator'
                  ? 'bg-blue-50 border-blue-600 text-blue-900 shadow-sm'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Layers className="w-4 h-4 text-blue-600" />
              <span>Elevator (ADA)</span>
            </button>

            <button
              onClick={() => {
                setConnectorType('stairs');
                setIsAccessible(false);
              }}
              className={`p-2.5 rounded-xl border text-left font-bold transition flex items-center gap-2 ${
                connectorType === 'stairs'
                  ? 'bg-amber-50 border-amber-500 text-amber-900 shadow-sm'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Layers className="w-4 h-4 text-amber-600" />
              <span>Stairwell (Stairs)</span>
            </button>
          </div>
        </div>

        <div>
          <label className="text-slate-700 font-bold block mb-1">Connector Group Identifier</label>
          <input
            type="text"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="e.g. Elevator-North-Core"
            className="w-full bg-slate-50 px-3 py-2 rounded-xl border border-slate-300 text-slate-900 focus:outline-none focus:border-blue-600 font-medium"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-slate-700 font-bold block mb-1">From Floor</label>
            <select
              value={level1Id}
              onChange={(e) => setLevel1Id(e.target.value)}
              className="w-full bg-slate-50 px-3 py-2 rounded-xl border border-slate-300 text-slate-900 focus:outline-none focus:border-blue-600 font-medium"
            >
              {levels.map((lvl) => (
                <option key={lvl.id} value={lvl.id}>{lvl.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-slate-700 font-bold block mb-1">To Floor</label>
            <select
              value={level2Id}
              onChange={(e) => setLevel2Id(e.target.value)}
              className="w-full bg-slate-50 px-3 py-2 rounded-xl border border-slate-300 text-slate-900 focus:outline-none focus:border-blue-600 font-medium"
            >
              {levels.map((lvl) => (
                <option key={lvl.id} value={lvl.id}>{lvl.name}</option>
              ))}
            </select>
          </div>
        </div>

        {status && (
          <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{status}</span>
          </div>
        )}

        <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 font-semibold"
          >
            Cancel
          </button>
          <button
            onClick={handleCreateVerticalLink}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition shadow-sm"
          >
            Link Floors
          </button>
        </div>
      </div>
    </Modal>
  );
};
