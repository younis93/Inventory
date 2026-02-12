import React, { useState } from 'react';
import { X, Check, Search, ChevronDown, ChevronUp } from 'lucide-react';

const FilterCard = ({ title, options, selectedValues, onChange, onClear, showProductCount = false, productCount = 0, showSearch = true, collapsible = false }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isOpen, setIsOpen] = useState(!collapsible);

    const handleToggle = (value) => {
        const newSelection = selectedValues.includes(value)
            ? selectedValues.filter((v) => v !== value)
            : [...selectedValues, value];
        onChange(newSelection);
    };

    // Filter options based on search term (only if search is shown)
    const filteredOptions = !showSearch ? options : (showProductCount ? options : options.filter(option =>
        option.label.toLowerCase().includes(searchTerm.toLowerCase())
    ));

    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-[0_2px_10px_-4px_rgba(0,0,0,0.1)] border border-slate-100 dark:border-slate-700 overflow-hidden flex flex-col w-full min-w-[240px]">
            {/* Show product count OR title header (clickable when collapsible) */}
            {showProductCount ? (
                <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700">
                    <span className="text-sm font-bold text-slate-600 dark:text-slate-400">
                        Products: <span className="text-[var(--brand-color)]">{productCount}</span>
                    </span>
                </div>
            ) : (
                // Only render header if a title is provided
                (title && title.length > 0) ? (
                    <div className="px-4 py-3 pb-2 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{title}</h3>
                        </div>
                        {collapsible && (
                            <button onClick={() => setIsOpen(!isOpen)} className="p-1 rounded-full text-slate-400 hover:text-slate-600">
                                {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                        )}
                    </div>
                ) : null
            )}

            {/* Search Input - only show if NOT in product count mode and showSearch is true */}
            {!showProductCount && showSearch && isOpen && (
                <div className="px-3 pb-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                        />
                    </div>
                </div>
            )}

            <div className={`flex-1 px-2 pb-2 space-y-1 max-h-64 overflow-y-auto ${!isOpen ? 'hidden' : ''}`}>
                {filteredOptions.map((option) => {
                    const isSelected = selectedValues.includes(option.value);
                    return (
                        <div
                            key={option.value}
                            onClick={() => handleToggle(option.value)}
                            className={`flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-all group ${isSelected
                                ? 'bg-blue-50 dark:bg-blue-900/20'
                                : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`w-5 h-5 rounded-[5px] border flex items-center justify-center transition-all ${isSelected
                                    ? 'bg-blue-600 border-blue-600 shadow-sm'
                                    : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
                                    }`}>
                                    {isSelected && <Check className="w-3.5 h-3.5 text-white stroke-[3px]" />}
                                </div>
                                <span className={`text-sm font-semibold ${isSelected ? 'text-blue-700 dark:text-blue-300' : 'text-slate-600 dark:text-slate-300'}`}>
                                    {option.label}
                                </span>
                            </div>
                            <span className={`text-xs font-bold ${isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 group-hover:text-slate-500'}`}>
                                {option.count}
                            </span>
                        </div>
                    );
                })}
            </div>

            {selectedValues.length > 0 && (
                <div className="px-4 py-3 border-t border-slate-50 dark:border-slate-700/50">
                    <button
                        onClick={onClear}
                        className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 hover:underline transition-colors flex items-center gap-1"
                    >
                        Clear All
                    </button>
                </div>
            )}
        </div>
    );
};

export default FilterCard;
