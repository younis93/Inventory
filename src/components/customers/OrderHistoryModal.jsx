import React from 'react';
import { ChevronDown, Printer, ShoppingBag, X } from 'lucide-react';

const OrderHistoryModal = ({
    isOpen,
    selectedCustomer,
    appearanceTheme,
    t,
    getCustomerOrders,
    expandedOrderId,
    setExpandedOrderId,
    formatCurrency,
    onClose,
    onPrintOrder
}) => {
    if (!isOpen || !selectedCustomer) return null;

    const customerOrders = getCustomerOrders(selectedCustomer._id);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/90 backdrop-blur-md p-4">
            <div className={`rounded-[32px] shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in slide-in-from-bottom-8 duration-500 ${['liquid', 'default_glass'].includes(appearanceTheme) ? 'glass-panel' : 'bg-white dark:bg-slate-800'}`}>
                <div className={`px-10 py-8 border-b border-slate-100 dark:border-slate-700 ${['liquid', 'default_glass'].includes(appearanceTheme) ? 'bg-white/20 dark:bg-slate-900/20 backdrop-blur-md' : 'bg-white dark:bg-slate-800'}`}>
                    <div className="flex justify-between items-start">
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <div
                                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                                    style={{
                                        backgroundColor: 'color-mix(in srgb, var(--accent-color), transparent 90%)',
                                        color: 'var(--accent-color)'
                                    }}
                                >
                                    <ShoppingBag className="w-6 h-6" />
                                </div>
                                <h3 className="text-2xl font-black text-slate-900 dark:text-white">{t('customers.history.title')}</h3>
                            </div>
                            <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.2em] ms-13">
                                {t('customers.receipt.customer')}: <span className="text-[var(--brand-color)]">{selectedCustomer.name}</span>
                            </p>
                        </div>
                        <button onClick={onClose} className="w-12 h-12 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                            <X className="w-8 h-8 text-slate-400" />
                        </button>
                    </div>
                </div>

                <div className="p-10 overflow-y-auto custom-scrollbar bg-slate-50 dark:bg-slate-900/50">
                    {customerOrders.length === 0 ? (
                        <div className="text-center py-24">
                            <div className="w-24 h-24 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-3xl flex items-center justify-center mx-auto mb-6 text-slate-200">
                                <ShoppingBag className="w-12 h-12" />
                            </div>
                            <h4 className="text-slate-400 font-black uppercase text-xs tracking-widest">{t('customers.history.noRecords')}</h4>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {customerOrders.map((order) => (
                                <div key={order._id} className="bg-white dark:bg-slate-800 rounded-2xl sm:rounded-[28px] border-2 border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden transition-all hover:shadow-xl hover:border-accent group">
                                    <div
                                        className="p-4 sm:p-6 flex items-center justify-between cursor-pointer"
                                        onClick={() => setExpandedOrderId(expandedOrderId === order._id ? null : order._id)}
                                    >
                                        <div className="flex items-center gap-4 sm:gap-6">
                                            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-slate-50 dark:bg-slate-900 rounded-xl sm:rounded-2xl flex items-center justify-center text-[var(--brand-color)] group-hover:bg-[var(--brand-color)] group-hover:text-white transition-all">
                                                <ShoppingBag className="w-6 h-6 sm:w-7 sm:h-7" />
                                            </div>
                                            <div>
                                                <div className="font-black text-slate-900 dark:text-white text-base sm:text-lg">{order.orderId}</div>
                                                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">{order.date}</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4 sm:gap-8">
                                            <div className="text-end">
                                                <div className="font-black text-slate-900 dark:text-white text-lg sm:text-xl">{formatCurrency(order.total)}</div>
                                                <div className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-lg inline-block mt-1 ${
                                                    order.status === 'Completed'
                                                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                                                        : order.status === 'Processing'
                                                            ? 'bg-amber-50 text-amber-600 border border-amber-100'
                                                            : 'bg-slate-50 text-slate-600 border border-slate-100'
                                                }`}>
                                                    {order.status}
                                                </div>
                                            </div>
                                            <div
                                                className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-transform ${expandedOrderId === order._id ? 'rotate-180' : 'bg-slate-50 dark:bg-slate-900 text-slate-300'}`}
                                                style={expandedOrderId === order._id ? {
                                                    backgroundColor: 'color-mix(in srgb, var(--accent-color), transparent 90%)',
                                                    color: 'var(--accent-color)'
                                                } : {}}
                                            >
                                                <ChevronDown className="w-5 h-5 sm:w-6 sm:h-6" />
                                            </div>
                                        </div>
                                    </div>

                                    {expandedOrderId === order._id && (
                                        <div className="px-8 pb-8 pt-0 border-t border-slate-50 dark:border-slate-800 animate-in slide-in-from-top-4 duration-300">
                                            <div className="grid grid-cols-1 gap-3 mt-6">
                                                {order.items.map((item, idx) => (
                                                    <div key={idx} className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-900/80 rounded-2xl border border-slate-100 dark:border-slate-800">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center font-black text-sm text-[var(--brand-color)] border border-slate-100 dark:border-slate-700 shadow-sm">
                                                                {item.quantity}x
                                                            </div>
                                                            <div>
                                                                <span className="font-black text-slate-800 dark:text-white block text-sm">{item.product.name}</span>
                                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                                    {formatCurrency(item.price)} {t('common.perUnit')}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <span className="font-black text-slate-900 dark:text-white">{formatCurrency(item.price * item.quantity)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row justify-between items-center gap-4">
                                                <div className="flex items-center gap-4">
                                                    <div className="text-center">
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{t('customers.history.paymentMethod')}</p>
                                                        <p className="text-sm font-bold text-slate-700 dark:text-white">{t('common.cashOnDelivery')}</p>
                                                    </div>
                                                    <div className="w-px h-8 bg-slate-200 dark:bg-slate-700"></div>
                                                    <div className="text-center">
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{t('customers.history.itemsCount')}</p>
                                                        <p className="text-sm font-bold text-slate-700 dark:text-white">{order.items.length} {t('customers.receipt.item')}</p>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); onPrintOrder(order); }}
                                                    className="flex items-center gap-2 px-8 py-4 bg-slate-900 dark:bg-slate-700 text-white rounded-2xl font-black text-sm transition-all shadow-xl active:scale-95 hover:brightness-125 hover:shadow-2xl"
                                                >
                                                    <Printer className="w-5 h-5" />
                                                    {t('customers.history.printThermal')}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default OrderHistoryModal;
