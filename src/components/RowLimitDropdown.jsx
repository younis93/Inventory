import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, List } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useInventory } from '../context/InventoryContext';

const RowLimitDropdown = ({ limit, onChange }) => {
    const { t } = useTranslation();
    const { appearance } = useInventory();
    const [isOpen, setIsOpen] = useState(false);
    const [isCustom, setIsCustom] = useState(![50, 100, 500, 1000].includes(limit));
    const containerRef = useRef(null);
    const inputRef = useRef(null);

    const options = [50, 100, 500, 1000];

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (val) => {
        if (val === 'custom') {
            setIsCustom(true);
            // Don't close yet, user needs to type
        } else {
            setIsCustom(false);
            onChange(Number(val));
            setIsOpen(false);
        }
    };

    const handleInputChange = (e) => {
        const val = Number(e.target.value);
        if (val > 0) {
            onChange(val);
        }
    };

    return (
        <div className="relative" ref={containerRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center gap-1.5 px-3 h-[44px] rounded-2xl border-2 transition-all font-bold text-[11px] outline-none ${isOpen
                    ? 'bg-accent/10 border-accent/30 text-accent'
                    : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-800 text-slate-500 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
            >
                <List className="w-4 h-4" />
                <span className="truncate">
                    {t('common.showRows') || 'Rows'}: {limit}
                </span>
                <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute top-full end-0 mt-2 z-50 w-48 animate-in fade-in zoom-in-95 duration-200">
                    <div className={`bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 overflow-hidden py-2 ${['liquid', 'default_glass'].includes(appearance?.theme) ? 'glass-panel' : ''}`}>
                        {options.map((opt) => (
                            <button
                                key={opt}
                                onClick={() => handleSelect(opt)}
                                className={`w-full text-start px-4 py-2 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors ${limit === opt && !isCustom ? 'text-accent bg-accent/5' : 'text-slate-600 dark:text-slate-300'}`}
                            >
                                {opt}
                            </button>
                        ))}
                        <div className="px-2 pt-2 mt-2 border-t border-slate-100 dark:border-slate-700">
                            <button
                                onClick={() => handleSelect('custom')}
                                className={`w-full text-start px-2 py-1.5 text-xs font-black uppercase tracking-widest ${isCustom ? 'text-accent' : 'text-slate-400'}`}
                            >
                                {t('common.custom') || 'Custom'}
                            </button>
                            {isCustom && (
                                <div className="px-2 pb-2">
                                    <input
                                        ref={inputRef}
                                        type="number"
                                        value={limit}
                                        onChange={handleInputChange}
                                        className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold outline-none focus:border-accent transition-all dark:text-white"
                                        placeholder="Value..."
                                        autoFocus
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RowLimitDropdown;
