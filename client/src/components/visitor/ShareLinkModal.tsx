import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { useUIStore } from '../../stores/uiStore';
import { useNavStore } from '../../stores/navStore';
import { useVenueStore } from '../../stores/venueStore';
import { Share2, Copy, CheckCircle2, MapPin } from 'lucide-react';

export const ShareLinkModal: React.FC = () => {
  const { isShareLinkOpen, closeModal, addToast } = useUIStore();
  const { currentVenue, activeLevel } = useVenueStore();
  const { userLocation, targetPOIForRoute } = useNavStore();
  
  const [shareUrl, setShareUrl] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isShareLinkOpen && currentVenue) {
      const url = new URL(window.location.origin);
      url.pathname = `/venue/${currentVenue.id}`;
      
      if (activeLevel) url.searchParams.set('level', activeLevel.id);
      if (targetPOIForRoute) url.searchParams.set('targetPoi', targetPOIForRoute.id);
      
      if (userLocation) {
        url.searchParams.set('startX', userLocation.x.toFixed(2));
        url.searchParams.set('startY', userLocation.y.toFixed(2));
        url.searchParams.set('startLevel', userLocation.levelId);
      }

      setShareUrl(url.toString());
      setCopied(false);
    }
  }, [isShareLinkOpen, currentVenue, activeLevel, targetPOIForRoute, userLocation]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      addToast({ type: 'success', message: 'Link copied to clipboard!' });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      addToast({ type: 'error', message: 'Failed to copy link.' });
    }
  };

  return (
    <Modal isOpen={isShareLinkOpen} onClose={() => closeModal('isShareLinkOpen')} title="Share Route & Location" maxWidth="max-w-sm">
      <div className="flex flex-col gap-4">
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center mx-auto mb-2">
          <Share2 className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
        </div>
        
        <p className="text-sm text-slate-600 dark:text-slate-400 text-center font-medium">
          Send this link to someone so they can instantly load this venue, floor, and your current navigation route.
        </p>

        <div className="flex items-center gap-2 mt-2">
          <input
            type="text"
            readOnly
            value={shareUrl}
            className="flex-1 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-xs text-slate-600 dark:text-slate-300 font-mono focus:outline-none"
            onClick={(e) => e.currentTarget.select()}
          />
          <button
            onClick={handleCopy}
            className={`p-2.5 rounded-xl text-white font-bold transition flex items-center justify-center ${
              copied ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-indigo-600 hover:bg-indigo-700'
            }`}
          >
            {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>

        {/* Breakdown of what's shared */}
        <div className="mt-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 border border-slate-100 dark:border-slate-700/50">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Included in link:</p>
          <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-1.5 font-medium">
            <li className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-indigo-500" /> Venue: {currentVenue?.name}</li>
            {activeLevel && <li className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-indigo-500" /> Floor: {activeLevel.name}</li>}
            {userLocation && <li className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-emerald-500" /> Your start location</li>}
            {targetPOIForRoute && <li className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-rose-500" /> Destination: {targetPOIForRoute.name}</li>}
          </ul>
        </div>
      </div>
    </Modal>
  );
};
