import React, { useState, useEffect, useRef } from 'react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, isAfter, isBefore, isWithinInterval, differenceInDays, startOfDay, endOfDay } from 'date-fns';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';

const DateRangePicker = ({ onChange, initialRange, range: controlledRange, onRangeChange, brandColor }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [range, setRange] = useState(controlledRange || initialRange || { from: null, to: null });
    const [hoverDate, setHoverDate] = useState(null);
    const [viewDate, setViewDate] = useState(new Date()); // Left calendar month
    const containerRef = useRef(null);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleDayClick = (day) => {
        const cb = onChange || onRangeChange;
        const dayStart = startOfDay(day);
        // Starting new selection (or resetting)
        if (!range.from || (range.from && range.to)) {
            const newRange = { from: dayStart, to: null };
            setRange(newRange);
            // don't call callback until a to-date is chosen
        } else {
            // Complete selection
            let newRange;
            if (isBefore(day, range.from)) {
                newRange = { from: startOfDay(day), to: endOfDay(range.from) };
            } else {
                newRange = { from: startOfDay(range.from), to: endOfDay(day) };
            }
            setRange(newRange);
            if (cb) cb(newRange);
        }
    };

    const handleDayHover = (day) => {
        if (range.from && !range.to) {
            setHoverDate(day);
        } else {
            setHoverDate(null);
        }
    };

    const handleDone = () => {
        setIsOpen(false);
        const cb = onChange || onRangeChange;
        if (cb) {
            // Normalize range so 'to' includes entire day (endOfDay)
            const normalized = { ...range };
            if (range.from) normalized.from = startOfDay(range.from);
            if (range.to) normalized.to = endOfDay(range.to);
            cb(normalized);
        }
    };

    const handleCancel = () => {
        setIsOpen(false);
        setRange(controlledRange || initialRange || { from: null, to: null });
    };

    // Sync with controlled props if provided
    useEffect(() => {
        if (controlledRange) setRange(controlledRange);
    }, [controlledRange]);

    const formatDateRange = () => {
        if (range.from && range.to) {
            return `${format(range.from, 'd MMM yyyy')} — ${format(range.to, 'd MMM yyyy')}`;
        }
        if (range.from) {
            return `${format(range.from, 'd MMM yyyy')} — Select end date`;
        }
        return '';
    };

    const renderMonth = (monthDate) => {
        const monthStart = startOfMonth(monthDate);
        const monthEnd = endOfMonth(monthStart);
        const startDate = startOfWeek(monthStart, { weekStartsOn: 1 }); // Monday start
        const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

        const rows = [];
        let days = [];
        let day = startDate;

        const weekRows = [];
        let currentWeek = [];

        // Generate all days first
        while (day <= endDate) {
            currentWeek.push(day);
            if (currentWeek.length === 7) {
                weekRows.push(currentWeek);
                currentWeek = [];
            }
            day = addDays(day, 1);
        }

        return (
            <div className="grid grid-cols-7 gap-y-2">
                {weekRows.map((week, i) => (
                    week.map((d, j) => {
                        const isSelectedStart = range.from && isSameDay(d, range.from);
                        const isSelectedEnd = range.to && isSameDay(d, range.to);
                        const isInRange = range.from && range.to && isWithinInterval(d, { start: range.from, end: range.to });

                        // Hover range logic
                        let isHoverRange = false;
                        if (range.from && !range.to && hoverDate) {
                            const start = isBefore(range.from, hoverDate) ? range.from : hoverDate;
                            const end = isAfter(range.from, hoverDate) ? range.from : hoverDate;
                            isHoverRange = isWithinInterval(d, { start, end }) && !isSameDay(d, range.from);
                        }

                        const isCurrentMonth = isSameMonth(d, monthStart);

                        // Base styles
                        let wrapperClass = "relative w-10 h-10 flex items-center justify-center";
                        let dayClass = "w-10 h-10 flex items-center justify-center text-sm relative z-10 cursor-pointer rounded-full transition-colors font-medium";
                        let bgClass = "";
                        let textClass = "text-gray-700 dark:text-slate-300";

                        if (!isCurrentMonth) {
                            textClass = "text-gray-300 dark:text-slate-600 pointer-events-none";
                        } else {
                            if (isSelectedStart) {
                                bgClass = "bg-accent text-white font-semibold shadow-accent z-20 brightness-110";
                                textClass = "text-white";
                            } else if (isSelectedEnd) {
                                bgClass = "bg-white dark:bg-slate-800 border-2 border-accent text-accent font-semibold z-20 hover:brightness-110";
                            } else if (isInRange || isHoverRange) {
                                textClass = "text-accent font-semibold";
                            } else {
                                dayClass += " hover:bg-slate-100 dark:hover:bg-slate-700";
                            }
                        }

                        // Background pill logic
                        let pillClass = "";
                        if (isCurrentMonth && (isInRange || isHoverRange)) {
                            pillClass = "absolute h-10 z-0 top-0 bottom-0";
                            const pillStyle = { backgroundColor: 'color-mix(in srgb, var(--accent-color), transparent 90%)' };

                            if (isSelectedStart && (range.to || hoverDate)) {
                                // Start of range
                                pillClass += isBefore(range.to || hoverDate, range.from) ? " left-0 right-1/2" : " left-1/2 right-0 rounded-l-none";
                            } else if (isSelectedEnd) {
                                // End of range (only happens if fully selected)
                                pillClass += " left-0 right-1/2 rounded-r-none";
                            } else if (isSameDay(d, hoverDate) && range.from) {
                                // Hover end
                                pillClass += isBefore(hoverDate, range.from) ? " left-1/2 right-0" : " left-0 right-1/2";
                            } else {
                                // Middle
                                pillClass += " left-0 right-0";
                            }

                            // Edge case corrections
                            if (isSelectedStart && range.to && isBefore(range.to, range.from)) {
                                // Swapped selection
                                pillClass = "absolute h-10 z-0 top-0 bottom-0 left-0 right-1/2";
                            }
                        }

                        return (
                            <div
                                key={d.toISOString()}
                                className={wrapperClass}
                                role="button"
                                aria-label={`Select ${format(d, 'd MMMM yyyy')}`}
                                tabIndex={isCurrentMonth ? 0 : -1}
                                onMouseEnter={() => handleDayHover(d)}
                                onClick={() => handleDayClick(d)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        handleDayClick(d);
                                    }
                                }}
                            >
                                {pillClass && <div className={pillClass} style={{ backgroundColor: 'color-mix(in srgb, var(--accent-color), transparent 90%)' }}></div>}
                                <div className={`${dayClass} ${bgClass} ${textClass}`}>
                                    {format(d, 'd')}
                                </div>
                            </div>
                        );
                    })
                ))}
            </div>
        );
    };

    const nextMonth = () => setViewDate(addMonths(viewDate, 1));
    const prevMonth = () => setViewDate(subMonths(viewDate, 1));

    const weekDays = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

    return (
        <div className="relative w-full max-w-xl font-sans" ref={containerRef}>


            {/* Input Field */}
            <div
                className="relative flex items-center w-full outline-none focus-visible:outline-none"
                onClick={() => setIsOpen(!isOpen)}
                role="button"
                aria-haspopup="dialog"
                aria-expanded={isOpen}
                aria-label="Select date range"
                tabIndex={0}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        setIsOpen(!isOpen);
                    }
                }}
            >
                <div className={`w-full h-[44px] flex items-center ps-4 pe-10 bg-white dark:bg-slate-800 border-2 rounded-2xl cursor-pointer transition-all shadow-sm font-bold
            ${isOpen ? 'border-accent/30 ring-4 ring-accent/10 bg-accent/5 dark:border-slate-500 dark:ring-0 dark:bg-slate-800' : 'border-slate-100 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500'}`}>
                    <span className={`text-[11px] font-bold ${range.from ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-slate-400'}`}>
                        {range.from ? formatDateRange() : 'Select date range'}
                    </span>
                </div>
                <CalendarIcon className={`absolute end-3 w-4 h-4 pointer-events-none transition-colors ${isOpen ? 'text-accent' : 'text-slate-400'}`} />
            </div>

            {/* Popover */}
            {isOpen && (
                <div
                    className="absolute top-full start-0 mt-4 z-50 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-gray-100 dark:border-slate-700 p-0 overflow-hidden w-[680px] animate-in fade-in zoom-in-95 duration-200"
                    role="dialog"
                    aria-modal="true"
                    aria-label="Calendar date range picker"
                >

                    {/* Calendars Container */}
                    <div className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x dark:md:divide-slate-700 md:divide-gray-100">

                        {/* Left Calendar */}
                        <div className="p-6 flex-1 min-w-[320px]">
                            <div className="flex items-center justify-between mb-6">
                                <button onClick={prevMonth} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full text-gray-500 dark:text-slate-400 transition-colors" aria-label="Previous month">
                                    <ChevronLeft className="w-5 h-5" />
                                </button>
                                <h3 className="text-base font-bold text-gray-900 dark:text-white">
                                    {format(viewDate, 'MMMM yyyy')}
                                </h3>
                                <div className="w-7"></div>
                            </div>

                            <div className="grid grid-cols-7 mb-4">
                                {weekDays.map(d => (
                                    <span key={d} className="text-center text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide">{d}</span>
                                ))}
                            </div>

                            {renderMonth(viewDate)}
                        </div>

                        {/* Right Calendar */}
                        <div className="p-6 flex-1 min-w-[320px]">
                            <div className="flex items-center justify-between mb-6">
                                <div className="w-7"></div>
                                <h3 className="text-base font-bold text-gray-900 dark:text-white">
                                    {format(addMonths(viewDate, 1), 'MMMM yyyy')}
                                </h3>
                                <button onClick={nextMonth} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full text-gray-500 dark:text-slate-400 transition-colors" aria-label="Next month">
                                    <ChevronRight className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="grid grid-cols-7 mb-4">
                                {weekDays.map(d => (
                                    <span key={d} className="text-center text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide">{d}</span>
                                ))}
                            </div>

                            {renderMonth(addMonths(viewDate, 1))}
                        </div>

                    </div>

                    {/* Footer */}
                    <div className="border-t border-gray-100 dark:border-slate-700 p-4 flex items-center justify-between bg-white dark:bg-slate-800 px-6 py-4">
                        <span className="text-sm font-semibold text-gray-700 dark:text-slate-300">
                            {range.from && range.to
                                ? `${differenceInDays(range.to, range.from) + 1} days`
                                : range.from ? 'Select end date' : ''}
                        </span>
                        <div className="flex gap-3">
                            <button
                                onClick={handleCancel}
                                className="px-6 py-2.5 text-sm font-bold text-gray-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 hover:text-gray-900 dark:hover:text-white transition-all font-sans"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDone}
                                className="px-8 py-2.5 text-sm font-bold text-white bg-accent rounded-lg shadow-accent transition-all transform active:scale-95 font-sans"
                            >
                                Done
                            </button>
                        </div>
                    </div>

                </div>
            )}
        </div>
    );
};

export default DateRangePicker;
