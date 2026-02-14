import React from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';
import { useInventory } from '../context/InventoryContext';

const Toasts = () => {
    const { toasts } = useInventory();

    return (
        <div className="fixed bottom-8 right-8 z-[1000] flex flex-col gap-3 pointer-events-none">
            {toasts.map((toast) => (
                <div
                    key={toast.id}
                    className={`
                        pointer-events-auto
                        flex items-center gap-4 px-6 py-4 rounded-2xl shadow-2xl backdrop-blur-md
                        animate-in slide-in-from-right-8 fade-in duration-300
                        ${toast.type === 'success' ? 'bg-emerald-500/90 text-white' :
                            toast.type === 'error' ? 'bg-red-500/90 text-white' :
                                'bg-slate-800/90 text-white'}
                    `}
                >
                    <div className="flex-shrink-0">
                        {toast.type === 'success' && <CheckCircle className="w-6 h-6" />}
                        {toast.type === 'error' && <AlertCircle className="w-6 h-6" />}
                        {toast.type === 'info' && <Info className="w-6 h-6" />}
                    </div>
                    <div className="flex-1">
                        <p className="font-bold text-sm">{toast.message}</p>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default Toasts;
