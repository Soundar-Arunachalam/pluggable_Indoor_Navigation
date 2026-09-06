import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Venue } from '../../types/client';
import { api } from '../../api/client';
import { Download, CheckCircle2, Copy, Check } from 'lucide-react';

interface IMDFExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  venue: Venue | null;
}

export const IMDFExportModal: React.FC<IMDFExportModalProps> = ({
  isOpen,
  onClose,
  venue
}) => {
  const [imdfData, setImdfData] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<'manifest' | 'venue' | 'levels' | 'units' | 'nodes' | 'pathways'>('manifest');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && venue) {
      setLoading(true);
      fetch(`/api/venues/${venue.id}/export/imdf`)
        .then(res => res.json())
        .then(data => setImdfData(data))
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [isOpen, venue?.id]);

  const handleCopyJSON = () => {
    if (imdfData) {
      navigator.clipboard.writeText(JSON.stringify(imdfData, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Apple IMDF Standard GeoJSON Bundle"
      subtitle="OGC Community Standard compliant archive ready for Apple Maps, GIS tools, and web integrators"
      maxWidth="max-w-3xl"
    >
      <div className="flex flex-col gap-4 text-slate-900">
        {/* Compliance Banner */}
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <h5 className="font-bold text-xs text-slate-900">IMDF 1.0.0 Specification Validated</h5>
              <p className="text-[11px] text-emerald-700">
                Includes venue, levels, units, nodes, and 3D vertical pathways.
              </p>
            </div>
          </div>

          {venue && (
            <a
              href={api.getIMDFExportUrl(venue.id)}
              download={`imdf-${venue.id}.json`}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 transition shadow-sm"
            >
              <Download className="w-4 h-4" />
              <span>Download Bundle</span>
            </a>
          )}
        </div>

        {/* Layer Tabs */}
        <div className="flex items-center gap-1.5 border-b border-slate-200 pb-2 overflow-x-auto text-xs">
          {(['manifest', 'venue', 'levels', 'units', 'nodes', 'pathways'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded-lg font-bold capitalize transition ${
                activeTab === tab
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Code Preview */}
        <div className="relative">
          <button
            onClick={handleCopyJSON}
            className="absolute right-3 top-3 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs flex items-center gap-1 border border-slate-700 transition"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy All'}</span>
          </button>

          <pre className="bg-slate-900 p-4 rounded-2xl border border-slate-300 text-[11px] font-mono text-emerald-400 overflow-x-auto max-h-72 leading-relaxed">
            {loading
              ? '// Generating IMDF GeoJSON archive...'
              : imdfData && imdfData[activeTab]
              ? JSON.stringify(imdfData[activeTab], null, 2)
              : '// Layer data empty'}
          </pre>
        </div>
      </div>
    </Modal>
  );
};
