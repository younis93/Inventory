import React, { useRef } from 'react';
import { Download, Edit, Globe, MapPin, Package, Printer, User, X } from 'lucide-react';
import { useModalA11y } from '../../hooks/useModalA11y';

const OrderDetailsModal = ({
    isOpen,
    order,
    formatCurrency,
    onClose,
    onEdit,
    onPDFInvoice,
    onThermalPrint
}) => {
    const dialogRef = useRef(null);

    useModalA11y({
        isOpen: isOpen && Boolean(order),
        onClose,
        containerRef: dialogRef
    });

    if (!isOpen || !order) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4 animate-in fade-in duration-300">
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="order-details-title"
                tabIndex={-1}
                className="bg-white dark:bg-slate-800 rounded-[32px] shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col relative"
            >
                <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center sticky top-0 bg-white dark:bg-slate-800 z-10">
                    <div>
                        <h3 id="order-details-title" className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Order Details</h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{order.orderId} • {order.date}</p>
                    </div>
                    <button type="button" onClick={onClose} aria-label="Close order details" className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                        <X className="w-6 h-6 text-slate-400" />
                    </button>
                </div>

                <div className="p-8 overflow-y-auto custom-scrollbar flex-1 bg-slate-50 dark:bg-slate-900/50">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm">
                                <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <User className="w-3.5 h-3.5" />
                                    Customer Information
                                </h4>
                                <div className="space-y-4">
                                    <div>
                                        <div className="text-sm font-black text-slate-900 dark:text-white">{order.customer.name}</div>
                                        <div className="text-xs text-slate-500 font-bold">{order.customer.phone}</div>
                                    </div>
                                    <div className="flex items-start gap-2">
                                        <MapPin className="w-4 h-4 text-slate-300 mt-0.5 shrink-0" />
                                        <div className="text-xs text-slate-600 dark:text-slate-400">
                                            <span className="font-bold text-slate-800 dark:text-white">{order.customer.governorate}</span><br />
                                            {order.customer.address}
                                        </div>
                                    </div>
                                    {order.customer.social && (
                                        <div className="flex items-center gap-2">
                                            <Globe className="w-4 h-4 text-slate-300 shrink-0" />
                                            <span className="text-[10px] font-black text-accent uppercase tracking-wider bg-accent/5 px-2 py-0.5 rounded-lg">{order.customer.social}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {order.notes && (
                                <div className="bg-amber-50/50 dark:bg-amber-900/10 p-6 rounded-3xl border border-amber-100 dark:border-amber-900/30">
                                    <h4 className="text-[11px] font-black text-amber-600 dark:text-amber-500 uppercase tracking-widest mb-2">Order Notes</h4>
                                    <p className="text-sm text-slate-600 dark:text-slate-400 italic">"{order.notes}"</p>
                                </div>
                            )}
                        </div>

                        <div className="space-y-6">
                            <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm">
                                <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <Package className="w-3.5 h-3.5" />
                                    Items Summary
                                </h4>
                                <div className="space-y-4 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                                    {order.items.map((item, idx) => (
                                        <div key={idx} className="flex justify-between items-center p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 group">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center font-black text-xs text-accent border border-slate-100 dark:border-slate-700 shadow-sm">
                                                    {item.quantity}x
                                                </div>
                                                <div>
                                                    <div className="text-sm font-bold text-slate-800 dark:text-white line-clamp-1">{item.product.name}</div>
                                                    <div className="text-[10px] font-bold text-slate-400 uppercase">{formatCurrency(item.price)} each</div>
                                                </div>
                                            </div>
                                            <span className="text-sm font-black text-slate-900 dark:text-white whitespace-nowrap">{formatCurrency(item.price * item.quantity)}</span>
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-700 space-y-3">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Subtotal</span>
                                        <span className="font-black text-slate-700 dark:text-slate-300">{formatCurrency(order.subtotal || order.total)}</span>
                                    </div>
                                    {order.discount > 0 && (
                                        <div className="flex justify-between text-sm text-red-500">
                                            <span className="font-bold uppercase tracking-widest text-[10px]">Discount ({order.discount}%)</span>
                                            <span className="font-black">-{formatCurrency((order.subtotal || order.total) - order.total)}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between items-end pt-2">
                                        <span className="text-slate-900 dark:text-white font-black uppercase tracking-tighter text-sm">Final Total</span>
                                        <span className="text-2xl font-black text-accent">{formatCurrency(order.total)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="px-8 py-6 border-t border-slate-100 dark:border-slate-700 flex justify-end items-center gap-3 bg-white dark:bg-slate-800">
                    <button
                        onClick={() => onEdit(order)}
                        className="px-6 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-200 dark:hover:bg-slate-600 transition-all active:scale-95"
                    >
                        <Edit className="w-4 h-4" />
                        Edit Order
                    </button>
                    <button
                        onClick={() => onPDFInvoice(order)}
                        className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700 shadow-lg shadow-indigo-600/20 transition-all active:scale-95"
                    >
                        <Download className="w-4 h-4" />
                        PDF Invoice
                    </button>
                    <button
                        onClick={() => onThermalPrint(order)}
                        className="px-6 py-2.5 bg-green-600 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-green-700 shadow-lg shadow-green-600/20 transition-all active:scale-95"
                    >
                        <Printer className="w-4 h-4" />
                        Thermal
                    </button>
                </div>
            </div>
        </div>
    );
};

export default OrderDetailsModal;

