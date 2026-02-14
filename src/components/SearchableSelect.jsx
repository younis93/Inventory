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
                className={`flex items-center justify-between w-full px-3 h-[44px] rounded-xl border-2 transition-all font-bold text-[11px] outline-none shadow-sm ${disabled
                    ? 'bg-slate-50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-800 text-slate-400 cursor-not-allowed opacity-60'
                    : isOpen
                        ? 'bg-accent/10 border-accent/40 text-accent'
                        : 'bg-white dark:bg-slate-900 border-white dark:border-slate-800 text-slate-700 dark:text-white hover:border-slate-200 dark:hover:border-slate-700'
                    }`}
            >
                <div className="flex items-center gap-1 truncate">
                    {Icon && <Icon className={`w-3.5 h-3.5 ${isOpen ? 'text-accent' : 'text-slate-400'}`} />}
                    <span className="truncate">{displayLabel}</span>
                </div>
                <ChevronDown className={`w-3 h-3 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180 text-accent' : 'text-slate-400'}`} />
            </button>

            {isOpen && (
                <div className={`absolute left-0 z-[100] w-full animate-in fade-in zoom-in-95 duration-200 ${direction === 'up' ? 'bottom-full mb-2' : 'top-full mt-2'}`}>
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
                                        className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all font-bold text-xs dark:text-white"
                                    />
                                </div>
                            </div>
                        )}

                        <div className="flex-1 max-h-48 overflow-y-auto p-2 space-y-1">
                            {customAction && (
                                <div
                                    onClick={() => { customAction.onClick(); setIsOpen(false); }}
                                    className="flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 text-accent font-bold text-sm border border-dashed border-accent/30 mb-1"
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
                                        className={`flex items-center justify-between px-3 py-2 rounded-xl cursor-pointer transition-all group ${isSelected
                                            ? 'bg-accent/10 text-accent font-bold'
                                            : 'hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-600 dark:text-slate-300'
                                            }`}
                                    >
                                        <span className={`text-xs font-semibold ${isSelected ? 'text-accent' : 'text-slate-600 dark:text-slate-300'}`}>
                                            {option.label}
                                        </span>
                                        {isSelected && (
                                            <div className="w-1.5 h-1.5 rounded-full bg-accent shadow-[0_0_8px_var(--accent-color)]" />
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
