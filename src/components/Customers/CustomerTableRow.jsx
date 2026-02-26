import React from 'react';
import { format } from 'date-fns';
import { Edit, ShoppingBag } from 'lucide-react';

const CustomerTableRow = ({
    customer,
    style,
    t,
    formatCurrency,
    getCustomerStats,
    getValidDate,
    onOpenHistory,
    onOpenEdit
}) => {
    const customerId = customer?._id || customer?.id;
    const customerStats = getCustomerStats(customerId);
    const customerOrders = customerStats.orders;
    const totalSpent = customerStats.totalSpent;
    const createdDate = getValidDate(customer);
    const customerInitial = String(customer?.name || '?').charAt(0) || '?';

    return (
        <div style={style} className="grid grid-cols-[1.7fr_1.6fr_1fr_1fr_1fr_1.1fr] gap-3 px-4 py-3 border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50/50 dark:hover:bg-slate-700/50 transition-colors">
            <div className="min-w-0">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-[var(--brand-color)] font-bold border border-slate-100 dark:border-slate-800 shadow-sm">
                        {customerInitial}
                    </div>
                    <div className="min-w-0">
                        <h4 className="text-sm font-bold text-slate-800 dark:text-white truncate">{customer.name}</h4>
                        <p className="text-xs text-slate-400 truncate">{customer.phone}</p>
                    </div>
                </div>
            </div>
            <div className="min-w-0">
                <div className="text-sm font-bold text-slate-700 dark:text-slate-300 truncate">{customer.governorate}</div>
                <div className="text-[11px] text-slate-400 truncate">{customer.address}</div>
            </div>
            <div className="text-sm font-black text-slate-800 dark:text-white truncate">{formatCurrency(totalSpent)}</div>
            <div className="text-xs font-bold text-slate-500 truncate">
                {createdDate ? format(createdDate, 'yyyy MMM dd') : t('orders.receipt.na')}
            </div>
            <div className="text-xs font-medium text-slate-500 truncate">{customer.createdBy || 'System'}</div>
            <div className="flex items-center justify-end gap-2">
                <button
                    type="button"
                    onClick={() => onOpenHistory(customer)}
                    aria-label="Open customer order history"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-black text-slate-500 hover:text-[var(--brand-color)] hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all"
                    title="Order History"
                >
                    <ShoppingBag className="w-4 h-4" />
                    {customerOrders.length}
                </button>
                <button
                    type="button"
                    onClick={() => onOpenEdit(customer)}
                    aria-label="Edit customer"
                    className="p-2 text-slate-400 hover:text-[var(--brand-color)] hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all"
                    title="Edit"
                >
                    <Edit className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
};

export default CustomerTableRow;
