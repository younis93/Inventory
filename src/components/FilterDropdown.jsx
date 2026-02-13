import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Filter } from 'lucide-react';
import FilterCard from './FilterCard';

const FilterDropdown = ({ title, options, selectedValues, onChange, icon: Icon, showProductCount = false, productCount = 0, showSearch = true, ariaLabel = null }) => {
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

    const handleClear = () => {
        onChange([]);
        // Optional: keep open or close? Usually keep open to allow re-selection
    };

    const handleClose = () => {
        setIsOpen(false);
    };


    const hasSelection = selectedValues.length > 0;

    return (
        <div className="relative" ref={containerRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                aria-label={ariaLabel || title || 'Filter'}
                className={`flex items-center gap-1.5 px-3 h-[44px] rounded-2xl border-2 transition-all font-bold text-[11px] outline-none ${isOpen || hasSelection
                    ? 'bg-accent/10 border-accent/30 text-accent'
                    : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-800 text-slate-500 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
            >
                {Icon ? <Icon className="w-4 h-4" /> : <Filter className="w-4 h-4" />}
                <span className="truncate max-w-[120px]">
                    {hasSelection ? `${selectedValues.length} Selected` : title}
                </span>
                <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 mt-2 z-50 w-72 animate-in fade-in zoom-in-95 duration-200">
                    <FilterCard
                        title=""
                        options={options}
                        selectedValues={selectedValues}
                        onChange={onChange}
                        onClear={handleClear}
                        onClose={handleClose}
                        showProductCount={showProductCount}
                        productCount={productCount}
                        showSearch={showSearch}
                    />
                </div>
            )}
        </div>
    );
};

export default FilterDropdown;
