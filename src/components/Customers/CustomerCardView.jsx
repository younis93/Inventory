import React from 'react';
import { Edit, MapPin, Phone, ShoppingBag } from 'lucide-react';

const CustomerCardView = ({
    customer,
    appearanceTheme,
    getCustomerStats,
    formatCurrency,
    onOpenHistory,
    onOpenEdit,
    getSocialIcon
}) => {
    const customerId = customer?._id || customer?.id;
    const customerStats = getCustomerStats(customerId);
    const customerOrders = customerStats.orders;
    const totalSpent = customerStats.totalSpent;
    const customerInitial = String(customer?.name || '?').charAt(0) || '?';

    return (
        <div className={`bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-xl transition-all duration-300 group overflow-hidden flex flex-col h-full ${['liquid', 'default_glass'].includes(appearanceTheme) ? 'glass-panel' : ''}`}>
            <div className="p-6 flex-1">
                <div className="flex justify-between items-start mb-6">
                    <div className="w-14 h-14 rounded-2xl bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-[var(--brand-color)] font-black text-xl border border-slate-100 dark:border-slate-800 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900 transition-colors relative">
                        {customerInitial}
                        <div className="absolute -bottom-1 -right-1 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-[8px] font-black px-1 rounded shadow-sm text-slate-400 truncate max-w-[50px]">
                            {customer.createdBy || 'System'}
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            aria-label="Open customer order history"
                            onClick={() => onOpenHistory(customer)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-2 text-slate-500 hover:text-[var(--brand-color)] bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 transition-colors font-black text-xs"
                            title="Order History"
                        >
                            <ShoppingBag className="w-4 h-4" />
                            <span>{customerOrders.length}</span>
                        </button>
                        <button type="button" aria-label="Edit customer profile" onClick={() => onOpenEdit(customer)} className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 transition-colors" title="Edit Profile">
                            <Edit className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                <div className="mb-6">
                    <h3 className="font-bold text-slate-900 dark:text-white text-lg mb-2 truncate">{customer.name}</h3>
                    <div className="flex flex-wrap gap-2">
                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg text-[10px] font-black uppercase tracking-wider">
                            {formatCurrency(totalSpent)}
                        </div>
                    </div>
                </div>

                <div className="space-y-3">
                    <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
                        <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-900 flex items-center justify-center border border-slate-100 dark:border-slate-800 shrink-0">
                            <Phone className="w-4 h-4 text-slate-400" />
                        </div>
                        <span className="font-bold">{customer.phone || 'No phone'}</span>
                    </div>
                    <div className="flex items-start gap-3 text-sm text-slate-600 dark:text-slate-400">
                        <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-900 flex items-center justify-center border border-slate-100 dark:border-slate-800 shrink-0 mt-0.5">
                            <MapPin className="w-4 h-4 text-slate-400" />
                        </div>
                        <div className="flex flex-col">
                            <span className="font-bold text-slate-700 dark:text-slate-300 text-xs">{customer.governorate}</span>
                            <span className="text-[10px] text-slate-400 line-clamp-1">{customer.address}</span>
                        </div>
                    </div>
                    {customer.social && (
                        <div className="flex items-center gap-3 text-sm">
                            <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-900 flex items-center justify-center border border-slate-100 dark:border-slate-800 shrink-0">
                                {getSocialIcon(customer.social)}
                            </div>
                            <span className="text-[10px] font-black uppercase text-blue-500 tracking-wider">{customer.social}</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CustomerCardView;
