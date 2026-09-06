import React from 'react';
import { Accessibility } from 'lucide-react';

interface AccessibilityToggleProps {
  accessibleOnly: boolean;
  onToggle: (enabled: boolean) => void;
}

export const AccessibilityToggle: React.FC<AccessibilityToggleProps> = ({
  accessibleOnly,
  onToggle
}) => {
  return (
    <button
      onClick={() => onToggle(!accessibleOnly)}
      className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition flex items-center gap-2 shadow-md border ${
        accessibleOnly
          ? 'bg-emerald-600 border-emerald-600 text-white shadow-emerald-600/20'
          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900'
      }`}
    >
      <Accessibility className={`w-4 h-4 ${accessibleOnly ? 'text-white' : 'text-emerald-600'}`} />
      <span>{accessibleOnly ? 'Step-Free / Elevator Active' : 'Wheelchair / Step-Free'}</span>
      <span className={`w-2 h-2 rounded-full ${accessibleOnly ? 'bg-white' : 'bg-slate-300'}`} />
    </button>
  );
};
