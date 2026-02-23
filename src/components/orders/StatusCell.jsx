import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

const STATUS_OPTIONS = ['Processing', 'Completed', 'Cancelled', 'Pending'];

const StatusCell = ({ order, onUpdate }) => {
    const { t } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const getStatusColor = (status) => {
        switch (status) {
            case 'Processing':
                return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
            case 'Completed':
                return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
            case 'Cancelled':
                return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
            case 'Pending':
                return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
            default:
                return 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300';
        }
    };

    const handleSelect = (newStatus) => {
        if (newStatus !== order.status) {
            onUpdate({ ...order, status: newStatus });
        }
        setIsOpen(false);
    };

    const getStatusLabel = (status) => t(`common.status.${status.toLowerCase()}`, status);

    return (
        <div className="relative" ref={containerRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-all hover:brightness-95 active:scale-95 ${getStatusColor(order.status)}`}
            >
                {getStatusLabel(order.status)}
                <div className={`w-0 h-0 border-s-[3px] border-s-transparent border-t-[4px] border-t-current border-e-[3px] border-e-transparent opacity-50 ${document.dir === 'rtl' ? 'me-1' : 'ms-1'}`} />
            </button>
            {isOpen && (
                <div className={`absolute top-full mt-1 w-32 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-100 dark:border-slate-700 py-1 z-50 animate-in fade-in zoom-in-95 duration-100 ${document.dir === 'rtl' ? 'end-0' : 'start-0'}`}>
                    {STATUS_OPTIONS.map((status) => (
                        <button
                            key={status}
                            onClick={() => handleSelect(status)}
                            className={`w-full text-start px-3 py-2 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${
                                order.status === status
                                    ? 'text-accent bg-slate-50 dark:bg-slate-700/30'
                                    : 'text-slate-600 dark:text-slate-300'
                            }`}
                        >
                            {getStatusLabel(status)}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default StatusCell;
