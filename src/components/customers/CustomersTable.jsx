import React from 'react';
import { Edit, ShoppingBag, User } from 'lucide-react';
import { format } from 'date-fns';

const SortableHeader = ({ column, label, border = false, columnSort, onColumnSort }) => {
    const isActive = columnSort.column === column;
    return (
        <th
            onClick={() => onColumnSort(column)}
            className={`px-6 py-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors select-none ${border ? 'border-s dark:border-slate-700' : ''}`}
        >
            <div className="flex items-center gap-2">
                {label}
                {isActive && (
                    <span className="text-[var(--brand-color)] font-bold">
                        {columnSort.direction === 'asc' ? '↑' : '↓'}
                    </span>
                )}
            </div>
        </th>
    );
};

const CustomersTable = ({
    t,
    loading,
    customersData,
    formatCurrency,
    getCustomerOrders,
    getValidDate,
    onOpenHistory,
    onOpenEdit,
    columnSort,
    onColumnSort
}) => {
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-start">
                <thead>
                    <tr className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        <SortableHeader column="name" label={t('customers.name')} columnSort={columnSort} onColumnSort={onColumnSort} />
                        <SortableHeader column="governorate" label={t('customers.location')} border={true} columnSort={columnSort} onColumnSort={onColumnSort} />
                        <SortableHeader column="orders" label={t('customers.orders')} border={true} columnSort={columnSort} onColumnSort={onColumnSort} />
                        <SortableHeader column="spent" label={t('customers.totalSpent')} border={true} columnSort={columnSort} onColumnSort={onColumnSort} />
                        <th className="px-6 py-4 border-s dark:border-slate-700 select-none">{t('customers.createdOn')}</th>
                        <th className="px-6 py-4 border-s dark:border-slate-700 select-none">{t('common.createdBy')}</th>
                        <th className="px-6 py-4 text-end border-s dark:border-slate-700">{t('customers.actions')}</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {loading ? (
                        <tr>
                            <td colSpan="6" className="px-6 py-12">
                                <div className="space-y-3">
                                    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/3 animate-pulse"></div>
                                    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2 animate-pulse"></div>
                                    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-2/3 animate-pulse"></div>
                                </div>
                            </td>
                        </tr>
                    ) : customersData.length === 0 ? (
                        <tr>
                            <td colSpan="6" className="px-6 py-12 text-center text-slate-400">
                                <User className="w-12 h-12 mx-auto mb-2 opacity-20" />
                                <p className="font-bold uppercase tracking-widest text-xs">{t('customers.noData')}</p>
                            </td>
                        </tr>
                    ) : customersData.map((customer) => {
                        const customerOrders = getCustomerOrders(customer._id);
                        const totalSpent = customerOrders.reduce((sum, order) => sum + order.total, 0);
                        return (
                            <tr key={customer._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/50 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-[var(--brand-color)] font-bold text-lg border border-slate-100 dark:border-slate-800 shadow-sm">
                                            {customer.name.charAt(0)}
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-bold text-slate-800 dark:text-white">{customer.name}</h4>
                                            <p className="text-xs text-slate-400">{customer.phone}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 border-s dark:border-slate-700">
                                    <div className="flex flex-col">
                                        <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{customer.governorate}</span>
                                        <span className="text-[11px] text-slate-400 line-clamp-1">{customer.address}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 border-s dark:border-slate-700">
                                    <div
                                        className="flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black inline-flex transition-all"
                                        style={{
                                            backgroundColor: 'color-mix(in srgb, var(--accent-color), transparent 90%)',
                                            color: 'var(--accent-color)'
                                        }}
                                    >
                                        <ShoppingBag className="w-3.5 h-3.5" />
                                        {customerOrders.length}
                                    </div>
                                </td>
                                <td className="px-6 py-4 border-s dark:border-slate-700">
                                    <span className="text-sm font-black text-slate-800 dark:text-white">{formatCurrency(totalSpent)}</span>
                                </td>
                                <td className="px-6 py-4 border-s dark:border-slate-700">
                                    <span className="text-xs font-bold text-slate-500 whitespace-nowrap">
                                        {getValidDate(customer) ? format(getValidDate(customer), 'MMM dd, yyyy') : t('orders.receipt.na')}
                                    </span>
                                </td>
                                <td className="px-6 py-4 border-s dark:border-slate-700">
                                    <span className="text-xs font-medium text-slate-500">{customer.createdBy || 'System'}</span>
                                </td>
                                <td className="px-6 py-4 text-end border-s dark:border-slate-700">
                                    <div className="flex items-center justify-end gap-1">
                                        <button
                                            onClick={() => onOpenHistory(customer)}
                                            className="p-2 text-slate-400 hover:text-[var(--brand-color)] hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all"
                                            title="Order History"
                                        >
                                            <ShoppingBag className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => onOpenEdit(customer)}
                                            className="p-2 text-slate-400 hover:text-[var(--brand-color)] hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all"
                                            title="Edit"
                                        >
                                            <Edit className="w-4 h-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

export default CustomersTable;
