import React, { useEffect, useRef, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { CalendarDays, ChevronDown, RotateCcw, X } from 'lucide-react';
import { DayPicker } from 'react-day-picker';
import { useModalA11y } from '../../hooks/useModalA11y';

const parseDateSafe = (value) => {
    if (!value) return null;
    try {
        const parsed = parseISO(value);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
    } catch {
        return null;
    }
};

const ReturnOrderModal = ({
    isOpen,
    order,
    reason,
    returnDate,
    isSubmitting,
    onReasonChange,
    onDateChange,
    onClose,
    onConfirm,
    t
}) => {
    const dialogRef = useRef(null);
    const datePickerRef = useRef(null);
    const [isDateOpen, setIsDateOpen] = useState(false);

    useModalA11y({
        isOpen: isOpen && Boolean(order),
        onClose,
        containerRef: dialogRef
    });

    useEffect(() => {
        if (!isDateOpen) return undefined;
        const onOutside = (event) => {
            if (datePickerRef.current && !datePickerRef.current.contains(event.target)) {
                setIsDateOpen(false);
            }
        };
        document.addEventListener('mousedown', onOutside);
        return () => document.removeEventListener('mousedown', onOutside);
    }, [isDateOpen]);

    useEffect(() => {
        if (!isOpen) setIsDateOpen(false);
    }, [isOpen]);

    if (!isOpen || !order) return null;

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/50 p-4">
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="return-order-title"
                tabIndex={-1}
                className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-800"
            >
                <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-700">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-slate-400">{order.orderId}</p>
                        <h3 id="return-order-title" className="mt-1 text-xl font-black text-slate-900 dark:text-white">
                            {t('orders.returnOrder', { defaultValue: 'Return Order' })}
                        </h3>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label={t('common.close', { defaultValue: 'Close' })}
                        className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="space-y-4 px-6 py-5">
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                        {t('orders.returnOrderConfirmMessage', { defaultValue: 'This will mark the order as returned and restore item quantities to stock.' })}
                    </p>

                    <div ref={datePickerRef}>
                        <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-slate-500">
                            {t('orders.returnDate', { defaultValue: 'Return Date' })}
                        </label>
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => setIsDateOpen((prev) => !prev)}
                                aria-label={t('orders.returnDate', { defaultValue: 'Return Date' })}
                                className="h-[44px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold outline-none transition-all focus:border-accent/40 focus:ring-2 focus:ring-accent/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                            >
                                <span className="inline-flex w-full items-center justify-between gap-2">
                                    <span className="inline-flex min-w-0 items-center gap-2 truncate">
                                        <CalendarDays className="h-4 w-4 text-slate-400" />
                                        {returnDate
                                            ? format(parseDateSafe(returnDate) || new Date(returnDate), 'MM/dd/yyyy')
                                            : t('common.select', { defaultValue: 'Select...' })}
                                    </span>
                                    <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${isDateOpen ? 'rotate-180' : ''}`} />
                                </span>
                            </button>

                            {isDateOpen && (
                                <div className="absolute start-0 top-full z-50 mt-2 w-[min(340px,calc(100vw-2.5rem))] rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl dark:border-slate-700 dark:bg-slate-900 sm:w-[340px]">
                                    <DayPicker
                                        mode="single"
                                        selected={returnDate ? parseDateSafe(returnDate) : undefined}
                                        disabled={{ after: new Date() }}
                                        onSelect={(day) => {
                                            if (!day) return;
                                            onDateChange(format(day, 'yyyy-MM-dd'));
                                            setIsDateOpen(false);
                                        }}
                                        showOutsideDays
                                        classNames={{
                                            months: 'flex',
                                            month: 'relative w-full',
                                            month_caption: 'relative mb-3 pe-20 h-10 flex items-center',
                                            caption: 'm-0 flex items-center',
                                            caption_label: 'm-0 leading-none text-xl font-extrabold text-slate-800 dark:text-white',
                                            nav: 'absolute right-0 top-0 h-10 z-10 flex items-center gap-1',
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
                                    <div className="flex items-center justify-between border-t border-slate-100 pt-2 dark:border-slate-700">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                onDateChange('');
                                                setIsDateOpen(false);
                                            }}
                                            className="text-sm font-semibold text-accent"
                                        >
                                            {t('common.clear', { defaultValue: 'Clear' })}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                onDateChange(new Date().toISOString().slice(0, 10));
                                                setIsDateOpen(false);
                                            }}
                                            className="text-sm font-semibold text-accent"
                                        >
                                            {t('common.today', { defaultValue: 'Today' })}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div>
                        <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-slate-500">
                            {t('orders.returnReason', { defaultValue: 'Return Reason' })}
                        </label>
                        <textarea
                            rows={3}
                            value={reason}
                            onChange={(event) => onReasonChange(event.target.value)}
                            placeholder={t('orders.returnReasonPlaceholder', { defaultValue: 'Enter return reason' })}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium outline-none focus:border-accent/40 focus:ring-2 focus:ring-accent/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                        />
                    </div>
                </div>

                <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-4 dark:border-slate-700">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="rounded-xl px-4 py-2 text-sm font-bold text-slate-500 transition-colors hover:bg-slate-100 disabled:opacity-60 dark:hover:bg-slate-700"
                    >
                        {t('common.cancel')}
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={isSubmitting}
                        className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-5 py-2 text-sm font-bold text-white transition-colors hover:bg-amber-700 disabled:opacity-60"
                    >
                        <RotateCcw className="h-4 w-4" />
                        {isSubmitting
                            ? t('common.loading')
                            : t('orders.confirmReturn', { defaultValue: 'Confirm Return' })}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ReturnOrderModal;
