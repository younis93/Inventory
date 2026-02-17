import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Filter } from 'lucide-react';
import { useInventory } from '../context/InventoryContext';

const SortDropdown = ({ title, options, selectedValue, onChange, icon: Icon }) => {
    const { appearance } = useInventory();
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleSelect = (value) => {
        onChange(value);
        setIsOpen(false);
    };

    const selectedLabel = options.find(opt => opt.value === selectedValue)?.label || title;

    return (
        <div className="relative" ref={containerRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center gap-1.5 px-3 h-[44px] rounded-2xl border-2 transition-all font-bold text-[11px] outline-none ${isOpen
                    ? 'bg-accent/10 border-accent/30 text-accent shadow-[0_0_15px_-3px_rgba(0,0,0,0.1)]'
                    : (['liquid', 'default_glass'].includes(appearance?.theme)
                        ? 'bg-white/40 dark:bg-slate-800/40 backdrop-blur-md border-white/20 dark:border-slate-700/50 text-slate-500 hover:bg-white/60 dark:hover:bg-slate-700/60'
                        : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-800 text-slate-500 hover:border-slate-300 dark:hover:border-slate-600')
                    }`}
            >
                {Icon ? <Icon className="w-4 h-4" /> : <Filter className="w-4 h-4" />}
                <span className="truncate max-w-[120px]">
                    {selectedLabel}
                </span>
                <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute top-full start-0 mt-2 z-50 w-72 animate-in fade-in zoom-in-95 duration-200">
                    <div className={`rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 overflow-hidden flex flex-col w-full min-w-[240px] transition-all ${['liquid', 'default_glass'].includes(appearance?.theme) ? 'glass-panel' : 'bg-white dark:bg-slate-800'}`}>
                        <div className="px-4 py-3 pb-2 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{title}</h3>
                            </div>
                        </div>

                        <div className="flex-1 px-2 pb-2 space-y-1 max-h-64 overflow-y-auto">
                            {options.map((option) => {
                                const isSelected = selectedValue === option.value;
                                return (
                                    <div
                                        key={option.value}
                                        onClick={() => handleSelect(option.value)}
                                        className={`flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-all group ${isSelected
                                            ? 'bg-accent/10'
                                            : (['liquid', 'default_glass'].includes(appearance?.theme) ? 'hover:bg-white/20 dark:hover:bg-slate-700/30' : 'hover:bg-slate-50 dark:hover:bg-slate-700/50')
                                            }`}
                                    >
                                        <span className={`text-sm font-semibold ${isSelected ? 'text-accent' : 'text-slate-600 dark:text-slate-300'}`}>
                                            {option.label}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SortDropdown;
