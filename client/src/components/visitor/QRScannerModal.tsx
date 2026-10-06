import React, { useEffect, useRef, useState } from 'react';
import { Modal } from '../common/Modal';
import { Venue, Checkpoint } from '../../types/client';
import { useNavStore } from '../../stores/navStore';
import { useVenueStore } from '../../stores/venueStore';
import { useUIStore } from '../../stores/uiStore';
import { QrCode, Camera, Keyboard, CheckCircle2, AlertCircle, Loader2, X } from 'lucide-react';
import { BrowserQRCodeReader } from '@zxing/browser';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  venue: Venue | null;
  onLocationResolved: (cp: Checkpoint) => void;
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({ isOpen, onClose, venue, onLocationResolved }) => {
  const { resolveCheckpoint } = useNavStore();
  const { levels } = useVenueStore();
  const { addToast } = useUIStore();

  const [mode, setMode] = useState<'camera' | 'manual'>('camera');
  const [manualCode, setManualCode] = useState('');
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'info'; msg: string } | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [cameraPermission, setCameraPermission] = useState<'pending' | 'granted' | 'denied'>('pending');

  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserQRCodeReader | null>(null);
  const controlsRef = useRef<any>(null);

  // Start camera scanning when modal opens and mode is camera
  useEffect(() => {
    if (!isOpen || mode !== 'camera') return;
    startCamera();
    return () => stopCamera();
  }, [isOpen, mode]);

  const startCamera = async () => {
    if (!videoRef.current) return;
    try {
      setIsScanning(true);
      readerRef.current = new BrowserQRCodeReader();
      const devices = await BrowserQRCodeReader.listVideoInputDevices();

      if (devices.length === 0) {
        setCameraPermission('denied');
        setMode('manual');
        return;
      }

      setCameraPermission('granted');
      // Prefer back camera on mobile
      const backCamera = devices.find(d => d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('rear')) || devices[0];

      controlsRef.current = await readerRef.current.decodeFromVideoDevice(
        backCamera.deviceId,
        videoRef.current,
        (result, error) => {
          if (result) {
            const code = result.getText();
            handleCodeDetected(code);
          }
        }
      );
    } catch (err: any) {
      setCameraPermission('denied');
      setMode('manual');
    } finally {
      setIsScanning(false);
    }
  };

  const stopCamera = () => {
    try {
      controlsRef.current?.stop();
    } catch (_) {}
    readerRef.current = null;
    controlsRef.current = null;
  };

  const handleCodeDetected = async (code: string) => {
    if (!venue || isResolving) return;
    stopCamera();
    setIsResolving(true);
    setStatus({ type: 'info', msg: `Resolving checkpoint: ${code}` });

    const cp = await resolveCheckpoint(venue.id, code, levels);

    if (cp) {
      setStatus({ type: 'success', msg: `📍 Located at: ${cp.label}` });
      onLocationResolved(cp);
      addToast({ type: 'success', message: `Location set: ${cp.label}` });
      setTimeout(() => {
        onClose();
        setStatus(null);
      }, 1500);
    } else {
      setStatus({ type: 'error', msg: `QR code "${code}" not found in this venue.` });
      setTimeout(() => startCamera(), 2000);
    }
    setIsResolving(false);
  };

  const handleManualSubmit = () => {
    if (manualCode.trim()) handleCodeDetected(manualCode.trim().toUpperCase());
  };

  const handleClose = () => {
    stopCamera();
    setStatus(null);
    setManualCode('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="QR Location Scanner" maxWidth="max-w-sm">
      <div className="flex flex-col gap-4">
        {/* Mode Tabs */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
          <button
            onClick={() => setMode('camera')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition
              ${mode === 'camera' ? 'bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-400 shadow-sm' : 'text-slate-500'}`}
          >
            <Camera className="w-3.5 h-3.5" /> Camera
          </button>
          <button
            onClick={() => { stopCamera(); setMode('manual'); }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition
              ${mode === 'manual' ? 'bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-400 shadow-sm' : 'text-slate-500'}`}
          >
            <Keyboard className="w-3.5 h-3.5" /> Manual
          </button>
        </div>

        {/* Camera View */}
        {mode === 'camera' && (
          <div className="relative bg-slate-900 rounded-2xl overflow-hidden aspect-square">
            <video ref={videoRef} className="w-full h-full object-cover" muted autoPlay playsInline />

            {/* Scanning frame overlay */}
            {cameraPermission !== 'denied' && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-48 h-48 border-2 border-blue-400 rounded-xl opacity-70">
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-blue-500 rounded-tl-xl" />
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-blue-500 rounded-tr-xl" />
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-blue-500 rounded-bl-xl" />
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-blue-500 rounded-br-xl" />
                </div>
                <div className="absolute bottom-4 px-3 py-1.5 bg-black/60 rounded-xl">
                  <p className="text-white text-xs font-semibold">Point at a QR checkpoint code</p>
                </div>
              </div>
            )}

            {/* Camera denied fallback */}
            {cameraPermission === 'denied' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-900">
                <Camera className="w-10 h-10 text-slate-500" />
                <p className="text-slate-400 text-xs text-center px-4">Camera access denied. Use manual code entry.</p>
              </div>
            )}

            {isScanning && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                <Loader2 className="w-8 h-8 text-white animate-spin" />
              </div>
            )}
          </div>
        )}

        {/* Manual Input */}
        {mode === 'manual' && (
          <div className="flex flex-col gap-3">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 flex items-center justify-center mx-auto">
              <QrCode className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
              Enter the checkpoint code printed on the QR placard
            </p>
            <input
              type="text"
              value={manualCode}
              onChange={e => setManualCode(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && handleManualSubmit()}
              placeholder="e.g. ENTRANCE-A, LIFT-F2"
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
              autoFocus
            />
            <button
              onClick={handleManualSubmit}
              disabled={!manualCode.trim() || isResolving}
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:pointer-events-none text-white font-bold text-sm transition"
            >
              {isResolving ? 'Locating…' : 'Set My Location'}
            </button>
          </div>
        )}

        {/* Status */}
        {status && (
          <div className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-xs font-semibold
            ${status.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300' :
              status.type === 'error' ? 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300' :
              'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-300'
            }`}
          >
            {status.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> :
             status.type === 'error' ? <AlertCircle className="w-4 h-4 shrink-0" /> :
             <Loader2 className="w-4 h-4 shrink-0 animate-spin" />}
            {status.msg}
          </div>
        )}
      </div>
    </Modal>
  );
};
