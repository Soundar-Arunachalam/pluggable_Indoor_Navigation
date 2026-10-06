import { create } from 'zustand';

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  durationMs?: number;
}

interface UIState {
  // Modals
  isQRScannerOpen: boolean;
  isIMDFExportOpen: boolean;
  isQRGeneratorOpen: boolean;
  isVerticalLinkerOpen: boolean;
  isUploadLayoutOpen: boolean;
  isCreateVenueOpen: boolean;
  isShareLinkOpen: boolean;
  isDarkMode: boolean;

  // Toast notifications
  toasts: Toast[];

  // Actions
  openModal: (modal: keyof Pick<UIState,
    'isQRScannerOpen' | 'isIMDFExportOpen' | 'isQRGeneratorOpen' |
    'isVerticalLinkerOpen' | 'isUploadLayoutOpen' | 'isCreateVenueOpen' | 'isShareLinkOpen'>) => void;
  closeModal: (modal: keyof Pick<UIState,
    'isQRScannerOpen' | 'isIMDFExportOpen' | 'isQRGeneratorOpen' |
    'isVerticalLinkerOpen' | 'isUploadLayoutOpen' | 'isCreateVenueOpen' | 'isShareLinkOpen'>) => void;
  toggleDarkMode: () => void;
  addToast: (toast: Omit<Toast, 'id'>) => void;
  dismissToast: (id: string) => void;
}

let toastCounter = 0;

export const useUIStore = create<UIState>((set, get) => ({
  isQRScannerOpen: false,
  isIMDFExportOpen: false,
  isQRGeneratorOpen: false,
  isVerticalLinkerOpen: false,
  isUploadLayoutOpen: false,
  isCreateVenueOpen: false,
  isShareLinkOpen: false,
  isDarkMode: false,
  toasts: [],

  openModal: (modal) => set({ [modal]: true }),
  closeModal: (modal) => set({ [modal]: false }),

  toggleDarkMode: () => {
    const next = !get().isDarkMode;
    set({ isDarkMode: next });
    document.documentElement.classList.toggle('dark', next);
  },

  addToast: (toast) => {
    const id = `toast-${++toastCounter}`;
    const duration = toast.durationMs ?? 4000;
    set(s => ({ toasts: [...s.toasts, { ...toast, id }] }));
    setTimeout(() => get().dismissToast(id), duration);
  },

  dismissToast: (id) => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })),
}));
