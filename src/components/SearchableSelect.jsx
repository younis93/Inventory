import React, { useState, useRef, useEffect, useMemo, useId } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { useInventory } from '../context/InventoryContext';

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
    const { appearance } = useInventory();
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const containerRef = useRef(null);
    const triggerRef = useRef(null);
    const optionRefs = useRef([]);
    const instanceId = useId();
    const listboxId = `${instanceId}-listbox`;

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
    const renderedItems = useMemo(() => {
        const items = [];
        if (customAction) {
            items.push({ type: 'action', key: '__custom_action__', label: customAction.label });
        }
        filteredOptions.forEach((option) => {
            items.push({
                type: 'option',
                key: String(option.value),
                option
            });
        });
        return items;
    }, [customAction, filteredOptions]);

    useEffect(() => {
        if (!isOpen) {
            setHighlightedIndex(-1);
            return;
        }

        const selectedIdx = renderedItems.findIndex((item) => item.type === 'option' && item.option.value === selectedValue);
        setHighlightedIndex(selectedIdx >= 0 ? selectedIdx : 0);
    }, [isOpen, renderedItems, selectedValue]);

    useEffect(() => {
        if (!isOpen || highlightedIndex < 0) return;
        const target = optionRefs.current[highlightedIndex];
        if (target && typeof target.focus === 'function') target.focus();
    }, [highlightedIndex, isOpen]);

    const moveHighlight = (direction) => {
        if (!renderedItems.length) return;
        if (highlightedIndex < 0) {
            setHighlightedIndex(direction > 0 ? 0 : renderedItems.length - 1);
            return;
        }
        const next = (highlightedIndex + direction + renderedItems.length) % renderedItems.length;
        setHighlightedIndex(next);
    };

    const handleTriggerKeyDown = (event) => {
        if (disabled) return;

        if (event.key === 'ArrowDown') {
            event.preventDefault();
            if (!isOpen) setIsOpen(true);
            else moveHighlight(1);
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            if (!isOpen) setIsOpen(true);
            else moveHighlight(-1);
        } else if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            setIsOpen((prev) => !prev);
        } else if (event.key === 'Escape') {
            event.preventDefault();
            setIsOpen(false);
        }
    };

    const handleListKeyDown = (event) => {
        if (event.key === 'ArrowDown') {
            event.preventDefault();
            moveHighlight(1);
            return;
        }
        if (event.key === 'ArrowUp') {
            event.preventDefault();
            moveHighlight(-1);
            return;
        }
        if (event.key === 'Home') {
            event.preventDefault();
            if (renderedItems.length) setHighlightedIndex(0);
            return;
        }
        if (event.key === 'End') {
            event.preventDefault();
            if (renderedItems.length) setHighlightedIndex(renderedItems.length - 1);
            return;
        }
        if (event.key === 'Escape') {
            event.preventDefault();
            setIsOpen(false);
            triggerRef.current?.focus();
            return;
        }

        if ((event.key === 'Enter' || event.key === ' ') && highlightedIndex >= 0) {
            event.preventDefault();
            const item = renderedItems[highlightedIndex];
            if (!item) return;
            if (item.type === 'action') {
                customAction?.onClick?.();
                setIsOpen(false);
                return;
            }
            handleSelect(item.option.value);
        }
    };

    return (
        <div className="relative w-full" ref={containerRef}>
            <button
                ref={triggerRef}
                type="button"
                disabled={disabled}
                onClick={() => setIsOpen(!isOpen)}
                onKeyDown={handleTriggerKeyDown}
                aria-label={title}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
                aria-controls={isOpen ? listboxId : undefined}
                className={`flex items-center justify-between w-full px-3 h-[44px] rounded-xl border-2 transition-all font-bold text-[11px] outline-none shadow-sm ${disabled
                    ? 'bg-slate-50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-800 text-slate-400 cursor-not-allowed opacity-60'
                    : isOpen
                        ? 'bg-accent/10 border-accent/40 text-accent shadow-[0_0_15px_-3px_rgba(0,0,0,0.1)]'
                        : (['liquid', 'default_glass'].includes(appearance?.theme)
                            ? 'bg-white/40 dark:bg-slate-800/40 backdrop-blur-md border-white/20 dark:border-slate-700/50 text-slate-700 dark:text-white hover:bg-white/60 dark:hover:bg-slate-700/60'
                            : 'bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-700 dark:text-white hover:border-slate-200 dark:hover:border-slate-700')
                    }`}
            >
                <div className="flex items-center gap-1 truncate">
                    {Icon && <Icon className={`w-3.5 h-3.5 ${isOpen ? 'text-accent' : 'text-slate-400'}`} />}
                    <span className="truncate">{displayLabel}</span>
                </div>
                <ChevronDown className={`w-3 h-3 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180 text-accent' : 'text-slate-400'}`} />
            </button>

            {isOpen && (
                <div className={`absolute start-0 z-[100] w-full animate-in fade-in zoom-in-95 duration-200 ${direction === 'up' ? 'bottom-full mb-2' : 'top-full mt-2'}`}>
                    <div
                        role="listbox"
                        id={listboxId}
                        aria-activedescendant={highlightedIndex >= 0 ? `${instanceId}-option-${highlightedIndex}` : undefined}
                        tabIndex={-1}
                        onKeyDown={handleListKeyDown}
                        className={`rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-700 overflow-hidden flex flex-col transition-all ${['liquid', 'default_glass'].includes(appearance?.theme) ? 'glass-panel' : 'bg-white dark:bg-slate-800'}`}
                    >

                        {showSearch && (
                            <div className="p-3 border-b border-slate-100 dark:border-slate-700">
                                <div className="relative">
                                    <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input
                                        autoFocus
                                        type="text"
                                        placeholder={placeholder}
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className={`w-full ps-9 pe-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all font-bold text-xs dark:text-white ${['liquid', 'default_glass'].includes(appearance?.theme) ? 'bg-white/40 dark:bg-slate-900/40 backdrop-blur-sm' : 'bg-slate-50 dark:bg-slate-900/50'}`}
                                    />
                                </div>
                            </div>
                        )}

                        <div className="flex-1 max-h-48 overflow-y-auto p-2 space-y-1">
                            {customAction && (
                                <button
                                    type="button"
                                    id={`${instanceId}-option-0`}
                                    ref={(el) => { optionRefs.current[0] = el; }}
                                    role="option"
                                    aria-selected={highlightedIndex === 0}
                                    onClick={() => { customAction.onClick(); setIsOpen(false); }}
                                    onMouseEnter={() => setHighlightedIndex(0)}
                                    className="flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 text-accent font-bold text-sm border border-dashed border-accent/30 mb-1"
                                >
                                    {customAction.icon && <customAction.icon className="w-4 h-4" />}
                                    <span>{customAction.label}</span>
                                </button>
                            )}

                            {filteredOptions.length === 0 ? (
                                <div className="px-4 py-8 text-center text-slate-400">
                                    <p className="text-xs font-bold uppercase tracking-widest">No results found</p>
                                </div>
                            ) : filteredOptions.map((option, index) => {
                                const isSelected = selectedValue === option.value;
                                const optionIndex = customAction ? index + 1 : index;
                                return (
                                    <button
                                        type="button"
                                        key={option.value}
                                        id={`${instanceId}-option-${optionIndex}`}
                                        ref={(el) => { optionRefs.current[optionIndex] = el; }}
                                        role="option"
                                        aria-selected={isSelected}
                                        onClick={() => handleSelect(option.value)}
                                        onMouseEnter={() => setHighlightedIndex(optionIndex)}
                                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl cursor-pointer transition-all group ${isSelected
                                            ? 'bg-accent/10 text-accent font-bold'
                                            : 'hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-600 dark:text-slate-300'
                                            }`}
                                    >
                                        <span className={`text-xs font-semibold min-w-0 flex-1 truncate text-start ${isSelected ? 'text-accent' : 'text-slate-600 dark:text-slate-300'}`}>
                                            {option.label}
                                        </span>
                                        {isSelected && (
                                            <div className="ms-3 me-1 w-1.5 h-1.5 rounded-full bg-accent shadow-[0_0_8px_var(--accent-color)] shrink-0" />
                                        )}
                                    </button>
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
