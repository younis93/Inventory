import React, { useState } from 'react';
import { Check, Search, ChevronDown, ChevronUp } from 'lucide-react';
import { useInventory } from '../context/InventoryContext';

const FilterCard = ({ title, options, selectedValues, onChange, onClear, showProductCount = false, productCount = 0, showSearch = true, collapsible = false }) => {
    const { appearance } = useInventory();
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
        <div role="listbox" aria-multiselectable="true" className={`rounded-2xl shadow-[0_2px_10px_-4px_rgba(0,0,0,0.1)] border border-slate-100 dark:border-slate-700 overflow-hidden flex flex-col w-full min-w-[240px] transition-all ${['liquid', 'default_glass'].includes(appearance?.theme) ? 'glass-panel' : 'bg-white dark:bg-slate-800'}`}>
            {/* Show product count OR title header (clickable when collapsible) */}
            {/* Header section removed as per request */}
            {title && title.length > 0 && (
                <div className="px-4 py-3 pb-2 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{title}</h3>
                    </div>
                    {collapsible && (
                        <button type="button" onClick={() => setIsOpen(!isOpen)} aria-label={isOpen ? 'Collapse filter options' : 'Expand filter options'} className="p-1 rounded-full text-slate-400 hover:text-slate-600">
                            {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                    )}
                </div>
            )}

            {/* Search Input - only show if NOT in product count mode and showSearch is true */}
            {!showProductCount && showSearch && isOpen && (
                <div className="px-3 pb-2">
                    <div className="relative">
                        <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className={`w-full ps-9 pe-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all font-bold text-xs dark:text-white ${['liquid', 'default_glass'].includes(appearance?.theme) ? 'bg-white/40 dark:bg-slate-900/40 backdrop-blur-sm' : 'bg-slate-50 dark:bg-slate-900/50'}`}
                        />
                    </div>
                </div>
            )}

            <div className={`flex-1 px-2 pb-2 space-y-1 max-h-64 overflow-y-auto hide-scrollbar ${!isOpen ? 'hidden' : ''}`}>
                {filteredOptions.map((option) => {
                    const isSelected = selectedValues.includes(option.value);
                    return (
                        <button
                            type="button"
                            role="option"
                            aria-selected={isSelected}
                            key={option.value}
                            onClick={() => handleToggle(option.value)}
                            aria-label={`${option.label} ${isSelected ? 'selected' : 'not selected'}`}
                            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-all group ${isSelected
                                ? 'bg-accent/10'
                                : (['liquid', 'default_glass'].includes(appearance?.theme) ? 'hover:bg-white/20 dark:hover:bg-slate-700/30' : 'hover:bg-slate-50 dark:hover:bg-slate-700/50')
                                }`}
                        >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                                <div className={`w-5 h-5 rounded-[5px] border flex items-center justify-center transition-all ${isSelected
                                    ? 'bg-accent border-accent shadow-sm'
                                    : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
                                    }`}>
                                    {isSelected && <Check className="w-3.5 h-3.5 text-white stroke-[3px]" />}
                                </div>
                                <span className={`text-sm font-semibold truncate ${isSelected ? 'text-accent' : 'text-slate-600 dark:text-slate-300'}`}>
                                    {option.label}
                                </span>
                            </div>
                            <span className={`ms-3 shrink-0 text-xs font-bold ${isSelected ? 'text-accent' : 'text-slate-400 group-hover:text-slate-500'}`}>
                                {option.count}
                            </span>
                        </button>
                    );
                })}
            </div>

            {selectedValues.length > 0 && (
                <div className="px-4 py-3 border-t border-slate-50 dark:border-slate-700/50">
                    <button
                        type="button"
                        onClick={onClear}
                        aria-label="Clear selected filters"
                        className="text-xs font-bold text-accent hover:underline transition-colors flex items-center gap-1"
                    >
                        Clear All
                    </button>
                </div>
            )}
        </div>
    );
};

export default FilterCard;
