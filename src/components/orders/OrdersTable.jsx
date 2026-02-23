import React from 'react';
import { Download, Edit, Eye, Printer, ShoppingBag, Trash2 } from 'lucide-react';
import Skeleton from '../common/Skeleton';
import StatusCell from './StatusCell';

const SortableHeader = ({ column, label, border = false, columnSort, onColumnSort }) => {
    const isActive = columnSort.column === column;

    return (
        <th
            onClick={() => onColumnSort(column)}
            className={`px-6 py-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors select-none ${border ? 'border-s dark:border-slate-700' : ''}`}
        >
            <div className="flex items-center gap-2">
                {label}
                {isActive && <span className="text-accent font-bold">{columnSort.direction === 'asc' ? '↑' : '↓'}</span>}
            </div>
        </th>
    );
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
    canDeleteOrder,
    onRequestDelete
}) => {
    return (
        <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-left">
                <thead>
                    <tr className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-500 uppercase">
                        <SortableHeader column="orderId" label={t('orders.table.orderId')} columnSort={columnSort} onColumnSort={onColumnSort} />
                        <SortableHeader column="customer" label={t('orders.table.customer')} columnSort={columnSort} onColumnSort={onColumnSort} />
                        <SortableHeader column="date" label={t('orders.table.date')} border={true} columnSort={columnSort} onColumnSort={onColumnSort} />
                        <SortableHeader column="total" label={t('orders.table.total')} border={true} columnSort={columnSort} onColumnSort={onColumnSort} />
                        <SortableHeader column="status" label={t('orders.table.status')} border={true} columnSort={columnSort} onColumnSort={onColumnSort} />
                        <SortableHeader column="createdBy" label={t('common.createdBy')} border={true} columnSort={columnSort} onColumnSort={onColumnSort} />
                        <th className="ps-6 pe-6 py-4 text-end border-s dark:border-slate-700">{t('common.actions')}</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {loading ? (
                        Array.from({ length: 5 }).map((_, i) => (
                            <tr key={i}>
                                <td className="px-6 py-4"><Skeleton className="w-20 h-5" /></td>
                                <td className="px-6 py-4"><div className="space-y-2"><Skeleton className="w-32 h-5" /><Skeleton className="w-24 h-3" /></div></td>
                                <td className="px-6 py-4"><Skeleton className="w-24 h-4" /></td>
                                <td className="px-6 py-4"><Skeleton className="w-24 h-5" /></td>
                                <td className="px-6 py-4"><Skeleton className="w-24 h-6 rounded-full" /></td>
                                <td className="px-6 py-4"><Skeleton className="w-20 h-8 ms-auto rounded-lg" /></td>
                            </tr>
                        ))
                    ) : (
                        orders.map((order) => (
                            <tr key={order._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/50 transition-colors">
                                <td className="px-6 py-4 text-sm font-semibold text-[var(--brand-color)]">{order.orderId}</td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-col">
                                        <span className="text-sm font-medium text-slate-800 dark:text-white">{order.customer.name}</span>
                                        <span className="text-xs text-slate-500 flex gap-1 items-center">
                                            {order.customer.governorate && <span className="bg-slate-100 dark:bg-slate-700 px-1 rounded">{order.customer.governorate}</span>}
                                            {order.customer.phone}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400 border-s dark:border-slate-700">{order.date}</td>
                                <td className="px-6 py-4 text-sm font-bold text-slate-800 dark:text-white border-s dark:border-slate-700">{formatCurrency(order.total)}</td>
                                <td className="px-6 py-4 border-s dark:border-slate-700">
                                    <StatusCell order={order} onUpdate={onUpdateStatus} />
                                </td>
                                <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400 border-s dark:border-slate-700">{order.createdBy || 'System'}</td>
                                <td className="px-6 py-4 text-end border-s dark:border-slate-700">
                                    <div className="flex items-center justify-end gap-2">
                                        <button onClick={() => onViewOrder(order)} className="p-2 text-slate-400 hover:text-[var(--brand-color)] hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg" title="View Details">
                                            <Eye className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => onEditOrder(order)} className="p-2 text-slate-400 hover:text-[var(--brand-color)] hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg" title="Edit Order">
                                            <Edit className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => onPDFInvoice(order)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg" title="PDF Invoice">
                                            <Download className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => onThermalPrint(order)} className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg" title="Thermal Print">
                                            <Printer className="w-4 h-4" />
                                        </button>
                                        {canDeleteOrder(order) && (
                                            <button onClick={() => onRequestDelete(order)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg" title="Delete Order">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
};

export default OrdersTable;
