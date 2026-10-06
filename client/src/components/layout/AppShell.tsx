import React, { useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Navbar } from '../common/Navbar';
import { ToastStack } from '../common/ToastStack';
import { useVenueStore } from '../../stores/venueStore';
import { useUIStore } from '../../stores/uiStore';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { CreateVenueModal } from '../editor/CreateVenueModal';
import { ShareLinkModal } from '../visitor/ShareLinkModal';

export const AppShell: React.FC = () => {
  const { fetchVenues, loading, error, clearError } = useVenueStore();
  const { isDarkMode } = useUIStore();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    fetchVenues();
  }, []);

  const activeMode = location.pathname.startsWith('/studio')
    ? 'studio'
    : location.pathname.startsWith('/editor')
      ? 'editor'
      : 'visitor';

  const handleToggleMode = (mode: 'visitor' | 'editor' | 'studio') => {
    if (mode === 'studio') navigate('/studio');
    else if (mode === 'editor') navigate('/editor');
    else navigate('/venue');
  };

  if (loading) {
    return (
      <div className={`w-screen h-screen flex flex-col items-center justify-center gap-4 ${isDarkMode ? 'bg-slate-950 text-slate-200' : 'bg-slate-50 text-slate-700'}`}>
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center shadow-xl shadow-blue-600/30">
            <Loader2 className="w-8 h-8 text-white animate-spin" />
          </div>
        </div>
        <div className="text-center">
          <p className="text-sm font-bold tracking-wide">Initializing NavIndoor</p>
          <p className="text-xs text-slate-400 mt-1">Loading venue data & navigation graph…</p>
        </div>
      </div>
    );
  }

  if (error && !loading) {
    return (
      <div className="w-screen h-screen flex flex-col items-center justify-center gap-4 bg-slate-50 text-slate-700">
        <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center">
          <AlertCircle className="w-7 h-7 text-rose-600" />
        </div>
        <div className="text-center max-w-sm">
          <p className="font-bold text-slate-900">Connection Failed</p>
          <p className="text-sm text-slate-500 mt-1">{error}</p>
          <p className="text-xs text-slate-400 mt-1">Is the backend running at port 4000?</p>
        </div>
        <button
          onClick={() => { clearError(); fetchVenues(); }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition"
        >
          <RefreshCw className="w-4 h-4" /> Retry
        </button>
      </div>
    );
  }

  return (
    <div className={`w-screen h-screen flex flex-col overflow-hidden ${isDarkMode ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      <Navbar activeMode={activeMode} onToggleMode={handleToggleMode} />
      <main className="relative flex-1 w-full overflow-hidden">
        <Outlet />
      </main>
      <CreateVenueModal />
      <ShareLinkModal />
      <ToastStack />
    </div>
  );
};
