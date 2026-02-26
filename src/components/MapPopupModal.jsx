import React, { useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { MapPin, X } from 'lucide-react';
import IraqMap from './IraqMap';
import { useModalA11y } from '../hooks/useModalA11y';
import { useInventory } from '../context/InventoryContext';

const MapPopupModal = ({
    isOpen,
    onClose,
    data = {},
    selectedGovernorates = [],
    onSelect,
    title = 'Map',
    closeLabel = 'Close'
}) => {
    const dialogRef = useRef(null);
    const { appearance, language } = useInventory();

    useModalA11y({ isOpen, onClose, containerRef: dialogRef });

    const isGlassTheme = useMemo(
        () => Boolean(appearance?.glassBackground) || ['liquid', 'default_glass'].includes(appearance?.theme),
        [appearance?.glassBackground, appearance?.theme]
    );

    if (!isOpen) return null;
    if (typeof document === 'undefined') return null;

    return createPortal(
        <div
            className={`fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-0 sm:p-4 ${language === 'ar' ? 'lg:pr-[280px]' : 'lg:pl-[280px]'}`}
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) onClose?.();
            }}
        >
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="map-popup-modal-title"
                tabIndex={-1}
                className={`relative flex h-[100dvh] w-full max-w-none flex-col overflow-hidden rounded-none border shadow-2xl sm:h-[min(92vh,900px)] sm:max-w-6xl sm:rounded-3xl ${isGlassTheme ? 'glass-panel border-white/25 dark:border-slate-700/40' : 'border-slate-100 bg-white dark:border-slate-700 dark:bg-slate-800'}`}
            >
                <button
                    type="button"
                    onClick={onClose}
                    className="sm:hidden absolute end-3 top-[max(0.75rem,env(safe-area-inset-top))] z-30 inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white/95 text-slate-500 shadow-md dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-200"
                    aria-label={closeLabel}
                    title={closeLabel}
                >
                    <X className="h-5 w-5" />
                </button>
                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] dark:border-slate-700 sm:px-5 sm:pt-3">
                    <h3 id="map-popup-modal-title" className="inline-flex items-center gap-2 text-base font-black text-slate-900 dark:text-white sm:text-lg">
                        <MapPin className="h-4 w-4 text-accent sm:h-5 sm:w-5" />
                        {title}
                    </h3>
                    <button
                        type="button"
                        onClick={onClose}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-100"
                        aria-label={closeLabel}
                        title={closeLabel}
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="min-h-0 flex-1 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-5">
                    <div className="h-full overflow-hidden rounded-2xl border border-slate-100 shadow-sm dark:border-slate-700">
                        <IraqMap
                            data={data}
                            selectedGovernorates={selectedGovernorates}
                            onSelect={onSelect}
                        />
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default MapPopupModal;
