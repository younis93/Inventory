import React from 'react';
import { FixedSizeList as List } from 'react-window';
import { format, parseISO } from 'date-fns';
import { Download, Edit, Eye, Printer, ShoppingBag, Trash2 } from 'lucide-react';
import Skeleton from '../common/Skeleton';
import StatusCell from './StatusCell';
import { useTranslation } from 'react-i18next';

const headerColumns = [
    { key: 'orderId', labelKey: 'orders.table.orderId' },
    { key: 'customer', labelKey: 'orders.table.customer' },
    { key: 'date', labelKey: 'orders.table.date' },
    { key: 'total', labelKey: 'orders.table.total' },
    { key: 'status', labelKey: 'orders.table.status' },
    { key: 'createdBy', labelKey: 'common.createdBy' },
    { key: 'actions', labelKey: 'common.actions' }
];

const gridClass = 'grid grid-cols-[1.2fr_1.8fr_1fr_1fr_1fr_1fr_1.5fr]';

const formatOrderDate = (value) => {
    if (!value) return '-';
    try {
        const parsed = typeof value === 'string' ? parseISO(value) : new Date(value);
        if (Number.isNaN(parsed.getTime())) return String(value);
        return format(parsed, 'yyyy MMM dd');
    } catch {
        return String(value);
    }
};

const OrdersTable = ({
    t,
    loading,
    orders,
    formatCurrency,
    columnSort,
    onColumnSort,
    onUpdateStatus,
    onViewOrder,
    onEditOrder,
    onPDFInvoice,
    onThermalPrint,
    onRequestReturn,
    canDeleteOrder,
    onRequestDelete
}) => {
    const { i18n } = useTranslation();
    const isRTL = i18n.dir() === 'rtl';

    if (loading) {
        return (
            <div className="hidden sm:block p-4 space-y-2">
                <div className={`${gridClass} gap-3 px-4 py-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl`}>
                    {headerColumns.map((column) => (
                        <Skeleton key={column.key} className="h-4 w-20" />
                    ))}
                </div>
                {Array.from({ length: 5 }).map((_, idx) => (
                    <div key={idx} className={`${gridClass} gap-3 px-4 py-4 border-b border-slate-100 dark:border-slate-700`}>
                        {Array.from({ length: 7 }).map((__, cellIdx) => (
                            <Skeleton key={cellIdx} className="h-4 w-24" />
                        ))}
                    </div>
                ))}
            </div>
        );
    }

    if (!orders.length) {
        return (
            <div className="hidden sm:block py-12 text-center text-slate-400">
                <ShoppingBag className="w-12 h-12 mx-auto mb-2 opacity-20" />
                <p className="font-bold uppercase tracking-widest text-xs">{t('orders.noOrders') || t('orders.title')}</p>
            </div>
        );
    }

    const listHeight = Math.min(560, Math.max(160, orders.length * 78));

    return (
        <div className="hidden sm:block overflow-x-auto custom-scrollbar" dir={isRTL ? 'rtl' : 'ltr'}>
            <div className="min-w-[1080px]">
                <div className={`${gridClass} gap-3 px-4 py-3 bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-500 uppercase rounded-t-2xl`}>
                    {headerColumns.map((column) => {
                        if (column.key === 'actions') {
                            return (
                                <div key={column.key} className="text-end pe-2">
                                    {t(column.labelKey)}
                                </div>
                            );
                        }

                        const isActive = columnSort.column === column.key;
                        return (
                            <button
                                key={column.key}
                                type="button"
                                onClick={() => onColumnSort(column.key)}
                                className="flex items-center gap-2 text-start hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                            >
                                {t(column.labelKey)}
                                {isActive && (
                                    <span className="text-accent font-bold">
                                        {columnSort.direction === 'asc' ? '↑' : '↓'}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>

                <List
                    height={listHeight}
                    itemCount={orders.length}
                    itemSize={78}
                    width="100%"
                    direction={isRTL ? 'rtl' : 'ltr'}
                    className="custom-scrollbar"
                >
                    {({ index, style }) => {
                        const order = orders[index];
                        return (
                            <div
                                style={style}
                                className={`${gridClass} gap-3 px-4 py-3 border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50/50 dark:hover:bg-slate-700/50 transition-colors`}
                            >
                                <div className="text-sm font-semibold text-[var(--brand-color)] truncate">{order.orderId}</div>
                                <div className="min-w-0">
                                    <div className="text-sm font-medium text-slate-800 dark:text-white truncate">{order.customer.name}</div>
                                    <div className="text-xs text-slate-500 truncate">{order.customer.phone}</div>
                                </div>
                                <div className="text-sm text-slate-600 dark:text-slate-400 truncate">{formatOrderDate(order.date)}</div>
                                <div className="text-sm font-bold text-slate-800 dark:text-white truncate">{formatCurrency(order.total)}</div>
                                <div>
                                    <StatusCell order={order} onUpdate={onUpdateStatus} onRequestReturn={onRequestReturn} />
                                </div>
                                <div className="text-sm text-slate-600 dark:text-slate-400 truncate">{order.createdBy || 'System'}</div>
                                <div className="flex items-center justify-end gap-2">
                                    <button type="button" aria-label="View order details" onClick={() => onViewOrder(order)} className="p-2 text-slate-400 hover:text-[var(--brand-color)] hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg" title="View Details">
                                        <Eye className="w-4 h-4" />
                                    </button>
                                    <button type="button" aria-label="Edit order" onClick={() => onEditOrder(order)} className="p-2 text-slate-400 hover:text-[var(--brand-color)] hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg" title="Edit Order">
                                        <Edit className="w-4 h-4" />
                                    </button>
                                    <button type="button" aria-label="Download PDF invoice" onClick={() => onPDFInvoice(order)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg" title="PDF Invoice">
                                        <Download className="w-4 h-4" />
                                    </button>
                                    <button type="button" aria-label="Print thermal receipt" onClick={() => onThermalPrint(order)} className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg" title="Thermal Print">
                                        <Printer className="w-4 h-4" />
                                    </button>
                                    {canDeleteOrder(order) && (
                                        <button type="button" aria-label="Delete order" onClick={() => onRequestDelete(order)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg" title="Delete Order">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    }}
                </List>
            </div>
        </div>
    );
};

export default OrdersTable;
