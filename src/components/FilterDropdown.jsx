import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Filter } from 'lucide-react';
import FilterCard from './FilterCard';
import { useInventory } from '../context/InventoryContext';

const FilterDropdown = ({ title, options, selectedValues, onChange, icon: Icon, showProductCount = false, productCount = 0, showSearch = true, ariaLabel = null }) => {
    const { appearance } = useInventory();
    const [isOpen, setIsOpen] = useState(false);
    const [mobileAlignEnd, setMobileAlignEnd] = useState(false);
    const containerRef = useRef(null);
    const triggerRef = useRef(null);

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

    useEffect(() => {
        if (!isOpen) return undefined;

        const onKeyDown = (event) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                setIsOpen(false);
                triggerRef.current?.focus();
            }
        };

        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return undefined;

        const syncMobileAlignment = () => {
            if (window.innerWidth >= 640) {
                setMobileAlignEnd(false);
                return;
            }

            const rect = containerRef.current?.getBoundingClientRect();
            if (!rect) return;

            const panelWidth = Math.min(288, window.innerWidth - 16);
            const wouldOverflowRight = rect.left + panelWidth > window.innerWidth - 8;
            const rightAlignedFits = rect.right - panelWidth >= 8;
            setMobileAlignEnd(wouldOverflowRight && rightAlignedFits);
        };

        syncMobileAlignment();
        window.addEventListener('resize', syncMobileAlignment);
        return () => window.removeEventListener('resize', syncMobileAlignment);
    }, [isOpen]);

    const handleClear = () => {
        onChange([]);
        // Optional: keep open or close? Usually keep open to allow re-selection
    };

    const handleClose = () => {
        setIsOpen(false);
    };


    const hasSelection = selectedValues.length > 0;
    const selectedOptions = options.filter((option) => selectedValues.includes(option.value));
    const selectedTotalCount = selectedOptions.reduce((sum, option) => {
        const value = Number(option?.count || 0);
        return sum + (Number.isFinite(value) ? value : 0);
    }, 0);

    const triggerLabel = (() => {
        if (!hasSelection) return title;
        if (selectedOptions.length === 1) {
            const selected = selectedOptions[0];
            const hasCount = Number.isFinite(Number(selected?.count));
            return hasCount ? `${selected.label} (${selected.count})` : selected.label;
        }
        return selectedTotalCount > 0
            ? `${selectedValues.length} Selected (${selectedTotalCount})`
            : `${selectedValues.length} Selected`;
    })();

    return (
        <div className="relative" ref={containerRef}>
            <button
                ref={triggerRef}
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setIsOpen((prev) => !prev);
                    } else if (event.key === 'ArrowDown') {
                        event.preventDefault();
                        setIsOpen(true);
                    }
                }}
                aria-label={ariaLabel || title || 'Filter'}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
                className={`flex items-center gap-1.5 px-3 h-[44px] rounded-2xl border-2 transition-all font-bold text-[11px] outline-none ${isOpen || hasSelection
                    ? 'bg-accent/10 border-accent/30 dark:border-slate-500 text-accent shadow-[0_0_15px_-3px_rgba(0,0,0,0.1)]'
                    : (['liquid', 'default_glass'].includes(appearance?.theme)
                        ? 'bg-white/40 dark:bg-slate-800/40 backdrop-blur-md border-white/20 dark:border-slate-600 text-slate-500 hover:bg-white/60 dark:hover:bg-slate-700/60 dark:hover:border-slate-500'
                        : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-600 text-slate-500 hover:border-slate-300 dark:hover:border-slate-500')
                    }`}
            >
                {Icon ? <Icon className="w-4 h-4" /> : <Filter className="w-4 h-4" />}
                <span className="truncate max-w-[120px]">
                    {triggerLabel}
                </span>
                <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className={`absolute top-full mt-2 z-50 w-[min(18rem,calc(100vw-1rem))] sm:start-0 sm:right-auto sm:w-72 animate-in fade-in zoom-in-95 duration-200 ${mobileAlignEnd ? 'end-0' : 'start-0'}`}>
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
