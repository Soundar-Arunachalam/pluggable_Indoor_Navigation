import React, { useState, useRef } from 'react';
import { Modal } from '../common/Modal';
import { Venue, Level } from '../../types/client';
import { api } from '../../api/client';
import JSZip from 'jszip';
import { 
  Upload, 
  FileJson, 
  Image, 
  CheckCircle2, 
  AlertCircle, 
  Layers, 
  Building2, 
  ShoppingBag, 
  Plane,
  FileUp,
  FolderArchive,
  Compass,
  MapPin,
  DoorOpen,
  PlusCircle,
  RefreshCw,
  Sparkles
} from 'lucide-react';

interface UploadLayoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  venue: Venue | null;
  activeLevel: Level | null;
  onLayoutImported: (importedVenueId?: string) => void;
}

export const UploadLayoutModal: React.FC<UploadLayoutModalProps> = ({
  isOpen,
  onClose,
  venue,
  activeLevel,
  onLayoutImported
}) => {
  const [activeTab, setActiveTab] = useState<'imdf' | 'blueprint' | 'presets'>('imdf');
  const [importMode, setImportMode] = useState<'new' | 'update'>('new');
  const [dragOver, setDragOver] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'info'; message: string; details?: any } | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const blueprintInputRef = useRef<HTMLInputElement>(null);

  // 1. Process Uploaded IMDF Archive (.zip) or GeoJSON Files (.geojson, .json)
  const handleFiles = async (fileList: FileList | File[]) => {
    if (!fileList || fileList.length === 0) return;
    setLoading(true);
    setStatus({ type: 'info', message: 'Analyzing uploaded IMDF files...' });

    try {
      const bundle: Record<string, any> = {};

      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        const lowerName = file.name.toLowerCase();

        if (lowerName.endsWith('.zip')) {
          setStatus({ type: 'info', message: `Unpacking IMDF ZIP archive "${file.name}"...` });
          const zip = new JSZip();
          const zipData = await zip.loadAsync(file);

          for (const [relativePath, zipEntry] of Object.entries(zipData.files)) {
            if (zipEntry.dir) continue;
            const entryLower = relativePath.toLowerCase();
            if (entryLower.endsWith('.geojson') || entryLower.endsWith('.json')) {
              const text = await zipEntry.async('text');
              try {
                const parsed = JSON.parse(text);
                const baseName = relativePath.split('/').pop()?.replace(/\.geojson$/i, '').replace(/\.json$/i, '') || 'layer';
                bundle[baseName] = parsed;
              } catch (e) {
                console.warn(`Failed to parse ${relativePath}:`, e);
              }
            }
          }
        } else if (lowerName.endsWith('.geojson') || lowerName.endsWith('.json')) {
          const text = await file.text();
          const parsed = JSON.parse(text);
          const baseName = file.name.replace(/\.geojson$/i, '').replace(/\.json$/i, '');
          bundle[baseName] = parsed;
        }
      }

      const layerKeys = Object.keys(bundle);
      if (layerKeys.length === 0) {
        throw new Error('No valid IMDF or GeoJSON files found in upload.');
      }

      setStatus({
        type: 'info',
        message: `Found ${layerKeys.length} IMDF layers (${layerKeys.join(', ')}). Ingesting into database & building navigation network...`
      });

      const targetVenueId = importMode === 'update' ? venue?.id : undefined;
      const res = await api.importIMDF(bundle, targetVenueId);

      setStatus({
        type: 'success',
        message: `Successfully imported layout into database!`,
        details: res.imported
      });

      setTimeout(() => {
        onLayoutImported(res.venueId);
        onClose();
        setStatus(null);
      }, 1400);
    } catch (err: any) {
      setStatus({ type: 'error', message: `Import error: ${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  // 2. Process Blueprint Image / SVG Upload
  const handleBlueprintFile = async (file: File) => {
    if (!venue || !activeLevel) return;
    try {
      setLoading(true);
      setStatus({ type: 'info', message: 'Uploading blueprint floorplan overlay...' });
      
      const reader = new FileReader();
      reader.onload = async (e) => {
        const dataUrl = e.target?.result as string;
        await api.updateLevelFloorplan(venue.id, activeLevel.id, {
          floorplan_svg_url: dataUrl
        });

        setStatus({
          type: 'success',
          message: `Blueprint overlay set for ${activeLevel.name}! You can now view and trace over it in the studio.`
        });

        setTimeout(() => {
          onLayoutImported(venue.id);
          onClose();
          setStatus(null);
        }, 1200);
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setStatus({ type: 'error', message: `Blueprint upload error: ${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  // 3. Load Architectural Template Preset
  const handleLoadPreset = async (presetType: 'airport' | 'mall' | 'convention') => {
    setLoading(true);
    setStatus({ type: 'info', message: `Generating ${presetType} architectural layout...` });

    try {
      const targetVenueId = importMode === 'update' && venue ? venue.id : undefined;
      let bundle: any = {};
      if (presetType === 'airport') {
        bundle = generateAirportPreset(targetVenueId || `venue-airport-${Date.now()}`);
      } else if (presetType === 'mall') {
        bundle = generateMallPreset(targetVenueId || `venue-mall-${Date.now()}`);
      } else {
        bundle = generateConventionPreset(targetVenueId || `venue-convention-${Date.now()}`);
      }

      const res = await api.importIMDF(bundle, targetVenueId);
      setStatus({
        type: 'success',
        message: `Architectural preset loaded successfully!`,
        details: res.imported
      });
      setTimeout(() => {
        onLayoutImported(res.venueId);
        onClose();
        setStatus(null);
      }, 1200);
    } catch (err: any) {
      setStatus({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Upload Floor Plan & IMDF Layout"
      subtitle="Import Microsoft Places IMDF ZIP archives, GeoJSON layers, or architectural blueprints"
      maxWidth="max-w-2xl"
    >
      <div className="flex flex-col gap-4 text-xs text-slate-900">
        {/* Mode Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
          <button
            onClick={() => setActiveTab('imdf')}
            className={`px-3.5 py-2 rounded-xl font-bold transition flex items-center gap-1.5 ${
              activeTab === 'imdf'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900'
            }`}
          >
            <FolderArchive className="w-4 h-4" />
            <span>Microsoft Places / IMDF (.zip, .geojson)</span>
          </button>

          <button
            onClick={() => setActiveTab('blueprint')}
            className={`px-3.5 py-2 rounded-xl font-bold transition flex items-center gap-1.5 ${
              activeTab === 'blueprint'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900'
            }`}
          >
            <Image className="w-4 h-4" />
            <span>Blueprint Image / SVG</span>
          </button>

          <button
            onClick={() => setActiveTab('presets')}
            className={`px-3.5 py-2 rounded-xl font-bold transition flex items-center gap-1.5 ${
              activeTab === 'presets'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-4 h-4 text-blue-600" />
            <span>Templates</span>
          </button>
        </div>

        {/* Target Venue Selection (New vs Update) */}
        {(activeTab === 'imdf' || activeTab === 'presets') && (
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
            <span className="text-slate-700 font-semibold">Import Destination:</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setImportMode('new')}
                className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition ${
                  importMode === 'new'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Add as New Venue</span>
              </button>

              <button
                type="button"
                onClick={() => setImportMode('update')}
                className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition ${
                  importMode === 'update'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Update Current ({venue?.name?.substring(0, 14) || 'Active'}...)</span>
              </button>
            </div>
          </div>
        )}

        {/* Tab 1: IMDF ZIP / GeoJSON File Upload */}
        {activeTab === 'imdf' && (
          <div className="flex flex-col gap-3">
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                  handleFiles(e.dataTransfer.files);
                }
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`p-8 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer transition ${
                dragOver ? 'border-blue-600 bg-blue-50/50' : 'border-slate-300 bg-slate-50/70 hover:border-blue-500 hover:bg-blue-50/30'
              }`}
            >
              <input
                type="file"
                ref={fileInputRef}
                accept=".zip,.json,.geojson"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    handleFiles(e.target.files);
                  }
                }}
              />
              <FileUp className="w-10 h-10 text-blue-600 mb-2" />
              <h4 className="font-bold text-sm text-slate-900">
                Drag & drop your Microsoft Places IMDF ZIP or GeoJSON here
              </h4>
              <p className="text-[11px] text-slate-500 mt-1 max-w-md">
                Directly drop the exported <span className="text-blue-700 font-mono font-semibold">.zip</span> archive or select multiple <span className="text-blue-700 font-mono font-semibold">.geojson</span> files
              </p>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-1.5 text-[10px]">
                <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-medium border border-blue-200">Microsoft Places .ZIP</span>
                <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium border border-slate-200">Apple IMDF</span>
                <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-medium border border-emerald-200">WGS-84 Auto-Project</span>
                <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 font-medium border border-amber-200">Auto Navigation Mesh</span>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Blueprint Image / SVG Overlay */}
        {activeTab === 'blueprint' && (
          <div className="flex flex-col gap-3">
            <div
              onClick={() => blueprintInputRef.current?.click()}
              className="p-8 border-2 border-dashed border-slate-300 hover:border-blue-500 bg-slate-50/70 hover:bg-blue-50/30 rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer transition"
            >
              <input
                type="file"
                ref={blueprintInputRef}
                accept=".svg,.png,.jpg,.jpeg"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleBlueprintFile(e.target.files[0]);
                  }
                }}
              />
              <Image className="w-10 h-10 text-blue-600 mb-2" />
              <h4 className="font-bold text-sm text-slate-900">
                Upload Blueprint / CAD Floorplan Drawing
              </h4>
              <p className="text-[11px] text-slate-500 mt-1">
                Upload an SVG, PNG, or JPG blueprint to overlay underneath the canvas for tracing ({activeLevel?.name || 'Active Floor'})
              </p>
            </div>
          </div>
        )}

        {/* Tab 3: Template Presets */}
        {activeTab === 'presets' && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              onClick={() => handleLoadPreset('airport')}
              className="p-4 rounded-2xl bg-slate-50 hover:bg-blue-50/80 border border-slate-200 hover:border-blue-300 transition text-left flex flex-col gap-2 group shadow-sm"
            >
              <div className="p-2.5 rounded-xl bg-blue-100 text-blue-700 w-fit group-hover:bg-blue-600 group-hover:text-white transition">
                <Plane className="w-5 h-5" />
              </div>
              <h5 className="font-bold text-slate-900 text-xs">Airport Concourse</h5>
              <p className="text-[11px] text-slate-500">
                Departure gates, security triage, lounges, and walkways.
              </p>
            </button>

            <button
              onClick={() => handleLoadPreset('mall')}
              className="p-4 rounded-2xl bg-slate-50 hover:bg-blue-50/80 border border-slate-200 hover:border-blue-300 transition text-left flex flex-col gap-2 group shadow-sm"
            >
              <div className="p-2.5 rounded-xl bg-blue-100 text-blue-700 w-fit group-hover:bg-blue-600 group-hover:text-white transition">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <h5 className="font-bold text-slate-900 text-xs">Shopping Mall Complex</h5>
              <p className="text-[11px] text-slate-500">
                Anchor stores, food court, atrium elevators, and escalators.
              </p>
            </button>

            <button
              onClick={() => handleLoadPreset('convention')}
              className="p-4 rounded-2xl bg-slate-50 hover:bg-blue-50/80 border border-slate-200 hover:border-blue-300 transition text-left flex flex-col gap-2 group shadow-sm"
            >
              <div className="p-2.5 rounded-xl bg-blue-100 text-blue-700 w-fit group-hover:bg-blue-600 group-hover:text-white transition">
                <Building2 className="w-5 h-5" />
              </div>
              <h5 className="font-bold text-slate-900 text-xs">Convention Exhibit Hall</h5>
              <p className="text-[11px] text-slate-500">
                Keynote stage, sponsor booths, registration desk, and breakouts.
              </p>
            </button>
          </div>
        )}

        {/* Status Notification */}
        {status && (
          <div className={`p-3.5 rounded-2xl border text-xs flex flex-col gap-2 ${
            status.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-900' :
            status.type === 'error' ? 'bg-rose-50 border-rose-200 text-rose-900' :
            'bg-blue-50 border-blue-200 text-blue-900'
          }`}>
            <div className="flex items-center gap-2 font-bold">
              {status.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> :
               status.type === 'error' ? <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" /> :
               <Compass className="w-4 h-4 text-blue-600 shrink-0 animate-spin" />}
              <span>{status.message}</span>
            </div>

            {status.details && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-emerald-200 text-[11px]">
                <div className="p-2 rounded-xl bg-white border border-emerald-200 flex items-center gap-1.5 font-semibold text-emerald-800">
                  <Layers className="w-3.5 h-3.5 text-emerald-600" />
                  <span><strong>{status.details.levels}</strong> Floors</span>
                </div>
                <div className="p-2 rounded-xl bg-white border border-emerald-200 flex items-center gap-1.5 font-semibold text-emerald-800">
                  <DoorOpen className="w-3.5 h-3.5 text-emerald-600" />
                  <span><strong>{status.details.units}</strong> Rooms</span>
                </div>
                <div className="p-2 rounded-xl bg-white border border-emerald-200 flex items-center gap-1.5 font-semibold text-emerald-800">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                  <span><strong>{status.details.nodes}</strong> Waypoints</span>
                </div>
                <div className="p-2 rounded-xl bg-white border border-emerald-200 flex items-center gap-1.5 font-semibold text-emerald-800">
                  <Compass className="w-3.5 h-3.5 text-emerald-600" />
                  <span><strong>{status.details.pathways}</strong> Pathways</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};

// Preset Generators
function generateAirportPreset(venueId: string) {
  const lvlId = `level-${venueId}-concourse`;
  return {
    manifest: { version: '1.0.0', venue_id: venueId },
    venue: {
      type: 'FeatureCollection',
      features: [{ id: venueId, type: 'Feature', properties: { name: { en: 'International Airport Concourse A' }, category: 'transit' } }]
    },
    levels: {
      type: 'FeatureCollection',
      features: [{ id: lvlId, type: 'Feature', properties: { name: { en: 'Concourse A Gates 1-12' }, short_name: { en: 'A' }, ordinal: 0 } }]
    },
    units: {
      type: 'FeatureCollection',
      features: [
        { id: `u-gate-a1`, type: 'Feature', properties: { level_id: lvlId, name: { en: 'Gate A1 & A2' }, category: 'room', color: '#e0f2fe' }, geometry: { type: 'Polygon', coordinates: [[[10, 10], [35, 10], [35, 25], [10, 25], [10, 10]]] } },
        { id: `u-gate-a3`, type: 'Feature', properties: { level_id: lvlId, name: { en: 'Gate A3 & A4' }, category: 'room', color: '#e0f2fe' }, geometry: { type: 'Polygon', coordinates: [[[45, 10], [70, 10], [70, 25], [45, 25], [45, 10]]] } },
        { id: `u-duty-free`, type: 'Feature', properties: { level_id: lvlId, name: { en: 'Duty Free & Cafe' }, category: 'food', color: '#fed7aa' }, geometry: { type: 'Polygon', coordinates: [[[10, 35], [35, 35], [35, 50], [10, 50], [10, 35]]] } },
        { id: `u-lounge-sky`, type: 'Feature', properties: { level_id: lvlId, name: { en: 'SkyClub Lounge' }, category: 'room', color: '#dcfce7' }, geometry: { type: 'Polygon', coordinates: [[[45, 35], [70, 35], [70, 50], [45, 50], [45, 35]]] } }
      ]
    },
    nodes: {
      type: 'FeatureCollection',
      features: [
        { id: `n-security`, type: 'Feature', properties: { level_id: lvlId, name: 'Security Checkpoint', node_type: 'entrance' }, geometry: { type: 'Point', coordinates: [40, 5] } },
        { id: `n-center-a`, type: 'Feature', properties: { level_id: lvlId, name: 'Central Concourse', node_type: 'hallway' }, geometry: { type: 'Point', coordinates: [40, 25] } },
        { id: `n-gate-1`, type: 'Feature', properties: { level_id: lvlId, name: 'Gate A1 Door', node_type: 'room_entry' }, geometry: { type: 'Point', coordinates: [25, 25] } },
        { id: `n-gate-3`, type: 'Feature', properties: { level_id: lvlId, name: 'Gate A3 Door', node_type: 'room_entry' }, geometry: { type: 'Point', coordinates: [55, 25] } },
        { id: `n-duty-door`, type: 'Feature', properties: { level_id: lvlId, name: 'Duty Free Door', node_type: 'room_entry' }, geometry: { type: 'Point', coordinates: [25, 35] } },
        { id: `n-lounge-door`, type: 'Feature', properties: { level_id: lvlId, name: 'SkyClub Door', node_type: 'room_entry' }, geometry: { type: 'Point', coordinates: [55, 35] } }
      ]
    },
    pathways: {
      type: 'FeatureCollection',
      features: [
        { id: `e-sec-cent`, type: 'Feature', properties: { from_node_id: `n-security`, to_node_id: `n-center-a`, category: 'walkway', distance_meters: 20 } },
        { id: `e-cent-g1`, type: 'Feature', properties: { from_node_id: `n-center-a`, to_node_id: `n-gate-1`, category: 'walkway', distance_meters: 15 } },
        { id: `e-cent-g3`, type: 'Feature', properties: { from_node_id: `n-center-a`, to_node_id: `n-gate-3`, category: 'walkway', distance_meters: 15 } },
        { id: `e-g1-duty`, type: 'Feature', properties: { from_node_id: `n-gate-1`, to_node_id: `n-duty-door`, category: 'walkway', distance_meters: 10 } },
        { id: `e-g3-lounge`, type: 'Feature', properties: { from_node_id: `n-gate-3`, to_node_id: `n-lounge-door`, category: 'walkway', distance_meters: 10 } }
      ]
    }
  };
}

function generateMallPreset(venueId: string) {
  const lvlId = `level-${venueId}-mall-l1`;
  return {
    manifest: { version: '1.0.0', venue_id: venueId },
    venue: {
      type: 'FeatureCollection',
      features: [{ id: venueId, type: 'Feature', properties: { name: { en: 'Grand Galleria Mall' }, category: 'shopping' } }]
    },
    levels: {
      type: 'FeatureCollection',
      features: [{ id: lvlId, type: 'Feature', properties: { name: { en: 'Level 1 Promenade & Atrium' }, short_name: { en: 'L1' }, ordinal: 0 } }]
    },
    units: {
      type: 'FeatureCollection',
      features: [
        { id: `u-apple-store`, type: 'Feature', properties: { level_id: lvlId, name: { en: 'Flagship Tech Store' }, category: 'room', color: '#e0f2fe' }, geometry: { type: 'Polygon', coordinates: [[[10, 10], [35, 10], [35, 25], [10, 25], [10, 10]]] } },
        { id: `u-fashion`, type: 'Feature', properties: { level_id: lvlId, name: { en: 'Luxury Apparel' }, category: 'room', color: '#f3e8ff' }, geometry: { type: 'Polygon', coordinates: [[[45, 10], [70, 10], [70, 25], [45, 25], [45, 10]]] } },
        { id: `u-food-court`, type: 'Feature', properties: { level_id: lvlId, name: { en: 'Food Court & Dining' }, category: 'food', color: '#fed7aa' }, geometry: { type: 'Polygon', coordinates: [[[10, 35], [40, 35], [40, 55], [10, 55], [10, 35]]] } },
        { id: `u-cinema`, type: 'Feature', properties: { level_id: lvlId, name: { en: 'IMAX Multiplex' }, category: 'stage', color: '#fecdd3' }, geometry: { type: 'Polygon', coordinates: [[[45, 35], [75, 35], [75, 55], [45, 55], [45, 35]]] } }
      ]
    },
    nodes: {
      type: 'FeatureCollection',
      features: [
        { id: `n-mall-entrance`, type: 'Feature', properties: { level_id: lvlId, name: 'Promenade Entrance', node_type: 'entrance' }, geometry: { type: 'Point', coordinates: [40, 5] } },
        { id: `n-atrium`, type: 'Feature', properties: { level_id: lvlId, name: 'Central Atrium', node_type: 'hallway' }, geometry: { type: 'Point', coordinates: [40, 30] } },
        { id: `n-tech-door`, type: 'Feature', properties: { level_id: lvlId, name: 'Tech Store Door', node_type: 'room_entry' }, geometry: { type: 'Point', coordinates: [25, 25] } },
        { id: `n-fashion-door`, type: 'Feature', properties: { level_id: lvlId, name: 'Luxury Apparel Door', node_type: 'room_entry' }, geometry: { type: 'Point', coordinates: [55, 25] } },
        { id: `n-dining-door`, type: 'Feature', properties: { level_id: lvlId, name: 'Food Court Door', node_type: 'room_entry' }, geometry: { type: 'Point', coordinates: [25, 35] } },
        { id: `n-cinema-door`, type: 'Feature', properties: { level_id: lvlId, name: 'Cinema Door', node_type: 'room_entry' }, geometry: { type: 'Point', coordinates: [60, 35] } }
      ]
    },
    pathways: {
      type: 'FeatureCollection',
      features: [
        { id: `e-m-ent-atr`, type: 'Feature', properties: { from_node_id: `n-mall-entrance`, to_node_id: `n-atrium`, category: 'walkway', distance_meters: 25 } },
        { id: `e-m-atr-tech`, type: 'Feature', properties: { from_node_id: `n-atrium`, to_node_id: `n-tech-door`, category: 'walkway', distance_meters: 15 } },
        { id: `e-m-atr-fash`, type: 'Feature', properties: { from_node_id: `n-atrium`, to_node_id: `n-fashion-door`, category: 'walkway', distance_meters: 15 } },
        { id: `e-m-atr-dine`, type: 'Feature', properties: { from_node_id: `n-atrium`, to_node_id: `n-dining-door`, category: 'walkway', distance_meters: 15 } },
        { id: `e-m-atr-cine`, type: 'Feature', properties: { from_node_id: `n-atrium`, to_node_id: `n-cinema-door`, category: 'walkway', distance_meters: 20 } }
      ]
    }
  };
}

function generateConventionPreset(venueId: string) {
  const lvlId = `level-${venueId}-convention-g`;
  return {
    manifest: { version: '1.0.0', venue_id: venueId },
    venue: {
      type: 'FeatureCollection',
      features: [{ id: venueId, type: 'Feature', properties: { name: { en: 'Grand Convention & Expo Hall' }, category: 'convention' } }]
    },
    levels: {
      type: 'FeatureCollection',
      features: [{ id: lvlId, type: 'Feature', properties: { name: { en: 'Exhibition Hall Floor' }, short_name: { en: 'EXPO' }, ordinal: 0 } }]
    },
    units: {
      type: 'FeatureCollection',
      features: [
        { id: `u-expo-stage`, type: 'Feature', properties: { level_id: lvlId, name: { en: 'Main Auditorium' }, category: 'stage', color: '#e0e7ff' }, geometry: { type: 'Polygon', coordinates: [[[10, 10], [40, 10], [40, 30], [10, 30], [10, 10]]] } },
        { id: `u-expo-booths`, type: 'Feature', properties: { level_id: lvlId, name: { en: 'Exhibitor Pavilion' }, category: 'room', color: '#fef3c7' }, geometry: { type: 'Polygon', coordinates: [[[45, 10], [75, 10], [75, 30], [45, 30], [45, 10]]] } },
        { id: `u-breakout-1`, type: 'Feature', properties: { level_id: lvlId, name: { en: 'Workshop Rooms A-D' }, category: 'room', color: '#dcfce7' }, geometry: { type: 'Polygon', coordinates: [[[10, 35], [40, 35], [40, 55], [10, 55], [10, 35]]] } }
      ]
    },
    nodes: {
      type: 'FeatureCollection',
      features: [
        { id: `n-reg-desk`, type: 'Feature', properties: { level_id: lvlId, name: 'Registration & Check-in', node_type: 'entrance' }, geometry: { type: 'Point', coordinates: [40, 5] } },
        { id: `n-expo-center`, type: 'Feature', properties: { level_id: lvlId, name: 'Grand Hallway', node_type: 'hallway' }, geometry: { type: 'Point', coordinates: [40, 25] } },
        { id: `n-stage-door`, type: 'Feature', properties: { level_id: lvlId, name: 'Auditorium Door', node_type: 'room_entry' }, geometry: { type: 'Point', coordinates: [25, 25] } },
        { id: `n-booths-door`, type: 'Feature', properties: { level_id: lvlId, name: 'Exhibitor Door', node_type: 'room_entry' }, geometry: { type: 'Point', coordinates: [55, 25] } },
        { id: `n-workshop-door`, type: 'Feature', properties: { level_id: lvlId, name: 'Workshop Door', node_type: 'room_entry' }, geometry: { type: 'Point', coordinates: [25, 35] } }
      ]
    },
    pathways: {
      type: 'FeatureCollection',
      features: [
        { id: `e-reg-center`, type: 'Feature', properties: { from_node_id: `n-reg-desk`, to_node_id: `n-expo-center`, category: 'walkway', distance_meters: 20 } },
        { id: `e-cent-stage`, type: 'Feature', properties: { from_node_id: `n-expo-center`, to_node_id: `n-stage-door`, category: 'walkway', distance_meters: 15 } },
        { id: `e-cent-booth`, type: 'Feature', properties: { from_node_id: `n-expo-center`, to_node_id: `n-booths-door`, category: 'walkway', distance_meters: 15 } },
        { id: `e-stage-work`, type: 'Feature', properties: { from_node_id: `n-stage-door`, to_node_id: `n-workshop-door`, category: 'walkway', distance_meters: 10 } }
      ]
    }
  };
}
