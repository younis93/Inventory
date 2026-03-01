import React, { useEffect, useMemo, useRef, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { CalendarDays, ChevronDown } from 'lucide-react';
import { DayPicker } from 'react-day-picker';

const parseDateSafe = (value) => {
    if (!value) return null;
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
    try {
        const parsedIso = parseISO(String(value));
        if (!Number.isNaN(parsedIso.getTime())) return parsedIso;
    } catch {
        // no-op
    }
    const fallback = new Date(value);
    return Number.isNaN(fallback.getTime()) ? null : fallback;
};

const toIsoDate = (value) => {
    const parsed = parseDateSafe(value);
    if (!parsed) return '';
    return format(parsed, 'yyyy-MM-dd');
};

const AppDatePicker = ({
    value,
    onChange,
    ariaLabel = 'Date',
    placeholder = 'Select date',
    minDate,
    maxDate = new Date(),
    disabled = false,
    compact = false,
    hasError = false,
    popupAlign = 'start',
    showToday = true,
    allowClear = false,
    className = ''
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);

    const selectedDate = useMemo(() => parseDateSafe(value), [value]);
    const min = useMemo(() => parseDateSafe(minDate), [minDate]);
    const max = useMemo(() => parseDateSafe(maxDate), [maxDate]);

    const disabledDays = useMemo(() => {
        const rules = {};
        if (min && (!max || min <= max)) rules.before = min;
        if (max) rules.after = max;
        return Object.keys(rules).length ? rules : undefined;
    }, [min, max]);

    useEffect(() => {
        if (!isOpen) return undefined;
        const handleOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleOutside);
        return () => document.removeEventListener('mousedown', handleOutside);
    }, [isOpen]);

    const handleSelect = (day) => {
        if (!day) return;
        onChange?.(toIsoDate(day));
        setIsOpen(false);
    };

    const buttonBase = compact
        ? 'h-[36px] rounded-lg px-2 text-xs'
        : 'h-[44px] rounded-xl px-3 text-sm';

    const buttonState = hasError
        ? 'border-red-500 text-red-500 ring-4 ring-red-500/10'
        : 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200';

    return (
        <div ref={containerRef} className={`relative ${className}`}>
            <button
                type="button"
                onClick={() => !disabled && setIsOpen((prev) => !prev)}
                aria-label={ariaLabel}
                disabled={disabled}
                className={`flex w-full items-center justify-between gap-2 border font-semibold outline-none transition focus:border-accent/40 focus:ring-2 focus:ring-accent/20 disabled:cursor-not-allowed disabled:opacity-60 ${buttonBase} ${buttonState}`}
            >
                <span className="inline-flex min-w-0 items-center gap-2 truncate">
                    <CalendarDays className={`${compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} text-slate-400`} />
                    {selectedDate ? format(selectedDate, compact ? 'MM/dd/yy' : 'MM/dd/yyyy') : placeholder}
                </span>
                <ChevronDown className={`${compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className={`absolute top-full z-50 mt-2 w-[min(340px,calc(100vw-2rem))] rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl dark:border-slate-700 dark:bg-slate-900 ${popupAlign === 'end' ? 'end-0' : 'start-0'}`}>
                    <DayPicker
                        mode="single"
                        selected={selectedDate || undefined}
                        disabled={disabledDays}
                        onSelect={handleSelect}
                        showOutsideDays
                        classNames={{
                            months: 'flex',
                            month: 'w-full',
                            month_caption: 'mb-3 h-10 pe-20 flex items-center',
                            caption: 'm-0 flex items-center',
                            caption_label: 'm-0 leading-none text-xl font-extrabold text-slate-800 dark:text-white',
                            nav: 'absolute right-4 top-4 h-10 z-10 flex items-center gap-1',
                            nav_button: 'h-8 w-8 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center',
                            button_previous: '!static',
                            button_next: '!static',
                            month_grid: 'w-full',
                            weekdays: 'grid grid-cols-7 mb-1',
                            weekday: 'h-10 text-[13px] font-bold text-slate-400 text-center flex items-center justify-center',
                            week: 'grid grid-cols-7',
                            day: 'h-10 w-10 flex items-center justify-center',
                            day_button: 'h-9 w-9 flex items-center justify-center rounded-lg text-[16px] font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors',
                            day_selected: 'bg-accent text-white font-black shadow-md',
                            day_today: 'ring-2 ring-accent/50 font-black',
                            outside: '!text-slate-300 dark:!text-slate-600',
                            day_outside: '!text-slate-300 dark:!text-slate-600'
                        }}
                    />
                    {(showToday || allowClear) && (
                        <div className="flex items-center justify-between border-t border-slate-100 pt-2 dark:border-slate-700">
                            {allowClear ? (
                                <button
                                    type="button"
                                    onClick={() => {
                                        onChange?.('');
                                        setIsOpen(false);
                                    }}
                                    className="text-sm font-semibold text-accent"
                                >
                                    Clear
                                </button>
                            ) : (
                                <span />
                            )}
                            {showToday && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        onChange?.(toIsoDate(new Date()));
                                        setIsOpen(false);
                                    }}
                                    className="text-sm font-semibold text-accent"
                                >
                                    Today
                                </button>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default AppDatePicker;
