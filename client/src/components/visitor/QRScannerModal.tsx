import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Checkpoint, Venue } from '../../types/client';
import { api } from '../../api/client';
import { QrCode, MapPin, Camera, CheckCircle2, AlertCircle } from 'lucide-react';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  venue: Venue | null;
  onLocationResolved: (checkpoint: Checkpoint) => void;
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({
  isOpen,
  onClose,
  venue,
  onLocationResolved
}) => {
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [customCode, setCustomCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && venue) {
      setLoading(true);
      setError(null);
      api.getCheckpoints(venue.id)
        .then(setCheckpoints)
        .catch(err => setError(err.message))
        .finally(() => setLoading(false));
    }
  }, [isOpen, venue?.id]);

  const handleSelectCheckpoint = (cp: Checkpoint) => {
    onLocationResolved(cp);
    onClose();
  };

  const handleScanCode = async (code: string) => {
    if (!venue || !code.trim()) return;
    try {
      setLoading(true);
      setError(null);
      const cp = await api.resolveCheckpoint(venue.id, code.trim());
      onLocationResolved(cp);
      onClose();
    } catch (err: any) {
      setError(err.message || 'QR code not recognized.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Position Fix & QR Checkpoint"
      subtitle="Scan a physical QR code plate or select a venue checkpoint to set your position"
      maxWidth="max-w-md"
    >
      <div className="flex flex-col gap-4 text-slate-900">
        {/* Simulated Camera Viewfinder */}
        <div className="relative aspect-video rounded-2xl bg-slate-900 border border-slate-300 overflow-hidden flex flex-col items-center justify-center shadow-inner">
          <div className="w-32 h-32 border-2 border-dashed border-blue-400 rounded-2xl flex flex-col items-center justify-center p-4">
            <QrCode className="w-14 h-14 text-blue-400/80" />
          </div>

          <div className="absolute bottom-3 px-3 py-1 rounded-full bg-slate-900/90 text-[11px] text-slate-200 flex items-center gap-1.5 border border-slate-700">
            <Camera className="w-3.5 h-3.5 text-blue-400" />
            <span>Scanning Active Checkpoints...</span>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Checkpoint Quick Selector */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
            Select Known Checkpoint
          </h4>
          
          {loading ? (
            <div className="py-4 text-center text-xs text-slate-400">Loading checkpoints...</div>
          ) : (
            <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
              {checkpoints.map((cp) => (
                <button
                  key={cp.id}
                  onClick={() => handleSelectCheckpoint(cp)}
                  className="p-3 rounded-xl bg-slate-50 hover:bg-blue-50/80 border border-slate-200 hover:border-blue-300 transition flex items-center justify-between text-left group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-100/70 text-blue-700 group-hover:bg-blue-600 group-hover:text-white transition">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-slate-900 group-hover:text-blue-900 transition">
                        {cp.label}
                      </h5>
                      <p className="text-[11px] text-slate-500">
                        {cp.description || `Floor: ${cp.level_name || 'Ground'}`}
                      </p>
                    </div>
                  </div>

                  <span className="px-2 py-1 rounded bg-slate-200/60 text-[10px] font-mono text-slate-700">
                    {cp.code}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Manual Code Input */}
        <div className="pt-3 border-t border-slate-200 flex gap-2">
          <input
            type="text"
            placeholder="Or enter code (e.g. QR-METRO-L1-ENTRANCE)"
            value={customCode}
            onChange={(e) => setCustomCode(e.target.value)}
            className="flex-1 bg-slate-50 text-xs px-3 py-2 rounded-xl border border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600"
          />
          <button
            onClick={() => handleScanCode(customCode)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition shadow-sm"
          >
            Locate
          </button>
        </div>
      </div>
    </Modal>
  );
};
