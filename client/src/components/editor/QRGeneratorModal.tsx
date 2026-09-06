import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Venue, Checkpoint } from '../../types/client';
import { api } from '../../api/client';
import QRCode from 'qrcode';
import { QrCode, Download, Copy, Check } from 'lucide-react';

interface QRGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  venue: Venue | null;
}

export const QRGeneratorModal: React.FC<QRGeneratorModalProps> = ({
  isOpen,
  onClose,
  venue
}) => {
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [qrImages, setQrImages] = useState<{ [id: string]: string }>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && venue) {
      api.getCheckpoints(venue.id).then(async (cps) => {
        setCheckpoints(cps);
        const images: { [id: string]: string } = {};
        for (const cp of cps) {
          try {
            const url = await QRCode.toDataURL(cp.code, {
              width: 256,
              margin: 2,
              color: {
                dark: '#0f172a',
                light: '#ffffff'
              }
            });
            images[cp.id] = url;
          } catch (e) {
            console.error(e);
          }
        }
        setQrImages(images);
      });
    }
  }, [isOpen, venue?.id]);

  const handleCopyCode = (cp: Checkpoint) => {
    navigator.clipboard.writeText(cp.code);
    setCopiedId(cp.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Printable QR Code Checkpoints"
      subtitle="Export or print physical QR code plates to stick at entrances, elevators, and corridors"
      maxWidth="max-w-2xl"
    >
      <div className="flex flex-col gap-4 text-slate-900">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto pr-1">
          {checkpoints.map((cp) => (
            <div
              key={cp.id}
              className="p-4 rounded-2xl bg-slate-50 text-slate-900 flex flex-col items-center justify-center text-center shadow-sm border border-slate-200 group hover:border-blue-300 transition"
            >
              {/* QR Image */}
              {qrImages[cp.id] ? (
                <img
                  src={qrImages[cp.id]}
                  alt={cp.label}
                  className="w-36 h-36 rounded-xl border border-slate-200 shadow-sm bg-white"
                />
              ) : (
                <div className="w-36 h-36 bg-slate-200/60 rounded-xl flex items-center justify-center">
                  <QrCode className="w-8 h-8 text-slate-400" />
                </div>
              )}

              {/* Title & Floor */}
              <h5 className="font-bold text-sm text-slate-900 mt-2.5">{cp.label}</h5>
              <p className="text-xs text-slate-500 font-medium">
                {cp.level_name || 'Ground Floor'} • {venue?.name}
              </p>

              {/* Checkpoint Code */}
              <span className="mt-2 px-2.5 py-1 rounded bg-white font-mono text-xs font-bold text-slate-700 tracking-wider border border-slate-200">
                {cp.code}
              </span>

              {/* Download / Copy Buttons */}
              <div className="mt-3.5 flex items-center gap-2 w-full">
                <button
                  onClick={() => handleCopyCode(cp)}
                  className="flex-1 py-1.5 px-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1 transition border border-slate-200 shadow-sm"
                >
                  {copiedId === cp.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedId === cp.id ? 'Copied' : 'Copy'}</span>
                </button>
                {qrImages[cp.id] && (
                  <a
                    href={qrImages[cp.id]}
                    download={`${cp.code}.png`}
                    className="py-1.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center justify-center gap-1 transition shadow-sm"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Save</span>
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
};
