import React from 'react';
import { FixedSizeList as List } from 'react-window';
import { Download, Edit, Eye, Printer, ShoppingBag, Trash2 } from 'lucide-react';
import Skeleton from '../common/Skeleton';
import StatusCell from './StatusCell';

const OrdersListCard = ({
    t,
    loading,
    orders,
    formatCurrency,
    onUpdateStatus,
    onViewOrder,
    onEditOrder,
    onPDFInvoice,
    onThermalPrint,
    canDeleteOrder,
    onRequestDelete
}) => {
    return (
        <div className="block sm:hidden p-4 space-y-3">
            {loading ? (
                <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-4">
                            <div className="flex justify-between items-start mb-4">
                                <div className="space-y-2"><Skeleton className="w-24 h-5" /><Skeleton className="w-32 h-4" /></div>
                                <Skeleton className="w-20 h-8 rounded-lg" />
                            </div>
                            <div className="flex justify-between items-end">
                                <Skeleton className="w-24 h-3" />
                                <Skeleton className="w-24 h-6" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : orders.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                    <ShoppingBag className="w-12 h-12 mx-auto mb-2 opacity-20" />
                    <p className="font-bold uppercase tracking-widest text-xs">{t('orders.noOrders') || t('orders.title')}</p>
                </div>
            ) : (
                <List
                    height={Math.min(720, Math.max(200, orders.length * 190))}
                    itemCount={orders.length}
                    itemSize={190}
                    width="100%"
                    className="custom-scrollbar"
                >
                    {({ index, style }) => {
                        const order = orders[index];
                        return (
                            <div style={style} className="pe-1">
                                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-4 flex items-start justify-between">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start mb-1">
                                            <div className="text-sm font-black text-[var(--brand-color)]">{order.orderId}</div>
                                            <div className="text-right">
                                                <div className="font-black text-slate-900 dark:text-white">{formatCurrency(order.total)}</div>
                                                <div className="text-[9px] text-slate-400 font-bold">{order.createdBy || 'System'}</div>
                                            </div>
                                        </div>
                                        <div className="text-sm font-bold text-slate-800 dark:text-white mb-0.5">{order.customer.name}</div>
                                        <div className="flex justify-between items-center gap-2">
                                            <div className="text-[10px] text-slate-400 font-medium">
                                                {new Date(order.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                            </div>
                                            <div>
                                                <StatusCell order={order} onUpdate={onUpdateStatus} />
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-end gap-1 mt-3 pt-3 border-t border-slate-50 dark:border-slate-700/50">
                                            <button type="button" aria-label="View order details" onClick={() => onViewOrder(order)} className="p-2 text-slate-400 hover:text-[var(--brand-color)] hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-lg transition-all" title="View Order">
                                                <Eye className="w-5 h-5" />
                                            </button>
                                            <button type="button" aria-label="Edit order" onClick={() => onEditOrder(order)} className="p-2 text-slate-400 hover:text-[var(--brand-color)] hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-lg transition-all" title="Edit Order">
                                                <Edit className="w-5 h-5" />
                                            </button>
                                            <button type="button" aria-label="Download PDF invoice" onClick={() => onPDFInvoice(order)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all" title="PDF Invoice">
                                                <Download className="w-5 h-5" />
                                            </button>
                                            <button type="button" aria-label="Print thermal receipt" onClick={() => onThermalPrint(order)} className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-all" title="Thermal Print">
                                                <Printer className="w-5 h-5" />
                                            </button>
                                            {canDeleteOrder(order) && (
                                                <button type="button" aria-label="Delete order" onClick={() => onRequestDelete(order)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-all" title="Delete Order">
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    }}
                </List>
            )}
        </div>
    );
};

export default OrdersListCard;
