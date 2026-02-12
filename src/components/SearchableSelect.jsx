import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';

const SearchableSelect = ({
    title,
    options,
    selectedValue,
    onChange,
    icon: Icon,
    placeholder = "Search...",
    showSearch = true,
    customAction = null,
    disabled = false,
    direction = "down"
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
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

    // Reset search when opening
    useEffect(() => {
        if (isOpen) setSearchTerm('');
    }, [isOpen]);

    const handleSelect = (value) => {
        onChange(value);
        setIsOpen(false);
    };

    const filteredOptions = useMemo(() => {
        if (!searchTerm) return options;
        return options.filter(opt =>
            opt.label.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [options, searchTerm]);

    const selectedOption = options.find(opt => opt.value === selectedValue);
    const displayLabel = selectedOption ? selectedOption.label : title;

    return (
        <div className="relative w-full" ref={containerRef}>
            <button
                type="button"
                disabled={disabled}
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center justify-between w-full px-4 py-3 rounded-xl border-2 transition-all font-bold text-sm outline-none shadow-sm ${disabled
                    ? 'bg-slate-50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-800 text-slate-400 cursor-not-allowed opacity-60'
                    : isOpen
                        ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300'
                        : 'bg-white dark:bg-slate-900 border-white dark:border-slate-800 text-slate-700 dark:text-white hover:border-slate-200 dark:hover:border-slate-700'
                    }`}
            >
                <div className="flex items-center gap-2 truncate">
                    {Icon && <Icon className={`w-4 h-4 ${isOpen ? 'text-blue-500' : 'text-slate-400'}`} />}
                    <span className="truncate">{displayLabel}</span>
                </div>
                <ChevronDown className={`w-4 h-4 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180 text-blue-500' : 'text-slate-400'}`} />
            </button>

            {isOpen && (
                <div className={`absolute left-0 z-[100] w-full min-w-[280px] animate-in fade-in zoom-in-95 duration-200 ${direction === 'up' ? 'bottom-full mb-2' : 'top-full mt-2'}`}>
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-700 overflow-hidden flex flex-col">

                        {showSearch && (
                            <div className="p-3 border-b border-slate-100 dark:border-slate-700">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input
                                        autoFocus
                                        type="text"
                                        placeholder={placeholder}
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-[var(--brand-color)]/20 focus:border-[var(--brand-color)] transition-all font-bold text-xs"
                                    />
                                </div>
                            </div>
                        )}

                        <div className="flex-1 max-h-64 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                            {customAction && (
                                <div
                                    onClick={() => { customAction.onClick(); setIsOpen(false); }}
                                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 text-[var(--brand-color)] font-bold text-sm border border-dashed border-blue-200 dark:border-blue-900/50 mb-1"
                                >
                                    {customAction.icon && <customAction.icon className="w-4 h-4" />}
                                    <span>{customAction.label}</span>
                                </div>
                            )}

                            {filteredOptions.length === 0 ? (
                                <div className="px-4 py-8 text-center text-slate-400">
                                    <p className="text-xs font-bold uppercase tracking-widest">No results found</p>
                                </div>
                            ) : filteredOptions.map((option) => {
                                const isSelected = selectedValue === option.value;
                                return (
                                    <div
                                        key={option.value}
                                        onClick={() => handleSelect(option.value)}
                                        className={`flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-all group ${isSelected
                                            ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                                            : 'hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-600 dark:text-slate-300'
                                            }`}
                                    >
                                        <span className="text-sm font-semibold">{option.label}</span>
                                        {isSelected && (
                                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                                        )}
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

export default SearchableSelect;
