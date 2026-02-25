import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    Globe as GlobeIcon,
    Package,
    Plus,
    ShoppingBag,
    Tag,
    Trash2,
    User,
    X,
    MapPin as MapPinIcon
} from 'lucide-react';
import { GOVERNORATES, SOCIAL_PLATFORMS } from '../../constants/iraq';
import ImageWithFallback from '../common/ImageWithFallback';
import SearchableSelect from '../SearchableSelect';
import { useModalA11y } from '../../hooks/useModalA11y';

const normalizePhone = (value) => String(value || '').replace(/[^\d]/g, '');
const isValidIraqPhone = (value) => /^07\d{9}$/.test(normalizePhone(value));

const OrderFormModal = ({
    isOpen,
    t,
    products,
    customers,
    formatCurrency,
    newOrder,
    setNewOrder,
    selectedProductId,
    setSelectedProductId,
    qty,
    setQty,
    isSubmitting,
    isSaveOrderDisabled,
    saveOrderLabel,
    onClose,
    onAddToOrder,
    onPriceChange,
    onQtyChange,
    onRemoveFromOrder,
    onSubmit,
    onCustomerSelect,
    calculateSubtotal,
    calculateTotal,
    getAvailableStock
}) => {
    const dialogRef = useRef(null);
    const scrollContainerRef = useRef(null);
    const [showValidationErrors, setShowValidationErrors] = useState(false);

    useModalA11y({
        isOpen,
        onClose,
        containerRef: dialogRef
    });

    const selectedProduct = useMemo(
        () => products.find((product) => product._id === selectedProductId),
        [products, selectedProductId]
    );
    const selectedQty = Number(qty);
    const selectedAvailableStock = Math.max(0, getAvailableStock(selectedProductId));
    const selectedQtyInvalid = !Number.isFinite(selectedQty) || selectedQty < 1;
    const selectedQtyExceedsStock = Boolean(selectedProductId) && selectedQty > selectedAvailableStock;

    const itemIssues = useMemo(
        () => newOrder.items.map((item) => {
            const quantity = Number(item.quantity);
            const price = Number(item.price);
            const available = Number(getAvailableStock(item.product?._id));
            return {
                quantityInvalid: !Number.isFinite(quantity) || quantity < 1,
                priceInvalid: !Number.isFinite(price) || price <= 0,
                exceedsStock: quantity > available,
                stockAvailable: available
            };
        }),
        [getAvailableStock, newOrder.items]
    );
    const hasItemValidationErrors = itemIssues.some((issue) => issue.quantityInvalid || issue.priceInvalid || issue.exceedsStock);

    const customerValidationErrors = useMemo(() => {
        if (newOrder.customerId !== 'new') return {};
        const errors = {};
        if (!String(newOrder.customerName || '').trim()) {
            errors.customerName = 'Customer name is required.';
        }
        if (!String(newOrder.customerPhone || '').trim()) {
            errors.customerPhone = 'Phone number is required.';
        } else if (!isValidIraqPhone(newOrder.customerPhone)) {
            errors.customerPhone = 'Use a valid Iraqi phone number (07XXXXXXXXX).';
        }
        return errors;
    }, [newOrder.customerId, newOrder.customerName, newOrder.customerPhone]);
    const hasCustomerValidationErrors = Object.keys(customerValidationErrors).length > 0;
    const isLocalSubmitDisabled = hasItemValidationErrors || hasCustomerValidationErrors;
    const shouldShowValidation = showValidationErrors;

    useEffect(() => {
        if (isOpen) setShowValidationErrors(false);
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return undefined;

        const resetScrollTop = () => {
            if (window.innerWidth >= 768) return;
            scrollContainerRef.current?.scrollTo({ top: 0, left: 0, behavior: 'auto' });
            dialogRef.current?.scrollTo?.({ top: 0, left: 0, behavior: 'auto' });
        };

        resetScrollTop();
        const frameId = window.requestAnimationFrame(resetScrollTop);
        return () => window.cancelAnimationFrame(frameId);
    }, [isOpen]);

    const handleSubmitAttempt = () => {
        setShowValidationErrors(true);
        if (isLocalSubmitDisabled) return;
        onSubmit();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-start justify-center bg-black/50 md:bg-slate-900/60 backdrop-blur-sm md:backdrop-blur-md p-2 sm:p-4 overflow-hidden">
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="order-form-title"
                tabIndex={-1}
                className="bg-white dark:bg-slate-800 rounded-[32px] shadow-2xl w-full max-w-5xl my-4 sm:my-8 min-h-0 flex flex-col overflow-hidden animate-in fade-in zoom-in duration-300 relative max-h-[90vh]"
            >
                <div ref={scrollContainerRef} className="flex-1 min-h-0 flex flex-col md:flex-row overflow-y-auto overflow-x-hidden md:overflow-hidden custom-scrollbar">
                    <div className="order-2 md:order-1 w-full shrink-0 md:shrink md:flex-1 p-4 md:p-6 border-t md:border-t-0 md:border-e border-slate-100 dark:border-slate-700 flex flex-col md:min-h-0 overflow-x-hidden overflow-visible md:overflow-visible relative z-20">
                        <div className="bg-white dark:bg-slate-800 pb-4 z-10 md:sticky md:top-0 lg:static">
                            <h3 id="order-form-title" className="text-lg font-bold mb-4 text-slate-800 dark:text-white">Add Items</h3>
                            <div className="space-y-4">
                                <div className="grid grid-cols-[minmax(0,1fr)_68px_40px] sm:grid-cols-[minmax(0,1fr)_96px_52px] gap-2 items-end">
                                    <div className="min-w-0">
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ms-1">{t('orders.searchProduct')}</label>
                                        <SearchableSelect
                                            title={t('orders.chooseProduct')}
                                            options={products.filter((p) => p.stock > 0).map((p) => ({
                                                value: p._id,
                                                label: `${p.name} (${p.stock}) - ${formatCurrency(p.price)}`
                                            }))}
                                            selectedValue={selectedProductId}
                                            onChange={setSelectedProductId}
                                            icon={Package}
                                            placeholder={t('orders.searchPlaceholder')}
                                        />
                                    </div>
                                    <div className="w-full">
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ms-1">{t('orders.qty')}</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                min="1"
                                                max={selectedProduct ? selectedAvailableStock : undefined}
                                                value={qty}
                                                onChange={(e) => setQty(e.target.value)}
                                                aria-invalid={selectedQtyInvalid || selectedQtyExceedsStock}
                                                className={`w-full p-3 border-2 rounded-xl dark:bg-slate-900 dark:text-white outline-none text-center font-bold ${
                                                    selectedQtyInvalid || selectedQtyExceedsStock
                                                        ? 'border-red-500 text-red-500 ring-4 ring-red-500/10'
                                                        : 'border-slate-100 dark:border-slate-700 focus:border-[var(--brand-color)]'
                                                }`}
                                            />
                                            {selectedQtyExceedsStock && (
                                                <span className="absolute -top-6 end-0 text-[10px] px-2 py-0.5 rounded-full bg-red-500 text-white font-bold whitespace-nowrap">
                                                    {t('orders.onlyLeft', { count: selectedAvailableStock })}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={onAddToOrder}
                                        disabled={!selectedProductId || !qty || selectedQtyInvalid || selectedQtyExceedsStock}
                                        aria-label={t('orders.addItem') || 'Add item'}
                                        className="h-11 sm:h-[52px] w-11 sm:w-[52px] text-white font-black rounded-xl transition-all bg-accent shadow-accent active:scale-95 disabled:opacity-50 flex items-center justify-center"
                                    >
                                        <Plus className="w-5 h-5 sm:w-6 sm:h-6" />
                                    </button>
                                </div>
                                {(selectedQtyInvalid || selectedQtyExceedsStock) && (
                                    <p className="text-xs font-semibold text-red-500 ms-1">
                                        {selectedQtyExceedsStock
                                            ? t('orders.stockError', { available: selectedAvailableStock })
                                            : 'Quantity must be at least 1.'}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="overflow-visible mt-6 space-y-3 custom-scrollbar md:min-h-[300px] md:pr-1 md:flex-1 md:overflow-y-auto">
                            {newOrder.items.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-100 dark:border-slate-700/50 rounded-3xl py-12">
                                    <ShoppingBag className="w-12 h-12 mb-2 opacity-20" />
                                    <p className="font-bold">{t('orders.cartEmpty')}</p>
                                    <p className="text-xs">{t('orders.cartEmptySub')}</p>
                                </div>
                            ) : (
                                newOrder.items.map((item, idx) => {
                                    const issue = itemIssues[idx] || {};
                                    return (
                                    <div key={idx} className={`flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 bg-slate-50 dark:bg-slate-900/30 rounded-2xl border group transition-all overflow-hidden ${issue.exceedsStock ? 'border-red-300 dark:border-red-800/50' : 'border-slate-100 dark:border-slate-700/50 hover:border-indigo-500/50'}`}>
                                        <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                                            <div className="w-12 h-12 rounded-lg overflow-hidden bg-white dark:bg-slate-800 border dark:border-slate-700 shrink-0">
                                                <ImageWithFallback
                                                    src={item.product.images && item.product.images[0] ? (typeof item.product.images[0] === 'string' ? item.product.images[0] : item.product.images[0].url) : ''}
                                                    alt={item.product.name || 'Product image'}
                                                    className="w-full h-full"
                                                    imageClassName="w-full h-full object-cover"
                                                />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="text-sm font-black text-slate-800 dark:text-white truncate">{item.product.name}</h4>
                                                <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] font-bold text-slate-400">{t('orders.price')}</span>
                                                        <input
                                                            type="number"
                                                            value={item.price}
                                                            onChange={(e) => onPriceChange(idx, e.target.value)}
                                                            aria-invalid={issue.priceInvalid}
                                                            className={`w-20 sm:w-24 p-1.5 text-xs font-black border-2 rounded-lg bg-white dark:bg-slate-800 dark:text-white transition-colors ${
                                                                issue.priceInvalid
                                                                    ? 'border-red-500 text-red-500 ring-4 ring-red-500/10'
                                                                    : 'border-slate-100 dark:border-slate-700 focus:border-[var(--brand-color)]'
                                                            }`}
                                                        />
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] font-bold text-slate-400">{t('orders.qty')}</span>
                                                        <div className="relative">
                                                            <input
                                                                type="number"
                                                                min="1"
                                                                max={item.product.stock}
                                                                value={item.quantity}
                                                                onChange={(e) => onQtyChange(idx, e.target.value)}
                                                                aria-invalid={issue.quantityInvalid || issue.exceedsStock}
                                                                className={`w-14 sm:w-16 p-1.5 text-xs font-black border-2 rounded-lg bg-white dark:bg-slate-800 dark:text-white transition-all text-center ${
                                                                    issue.quantityInvalid || issue.exceedsStock ? 'border-red-500 text-red-500 ring-4 ring-red-500/10' : 'border-slate-100 dark:border-slate-700 focus:border-indigo-500'
                                                                }`}
                                                            />
                                                            {issue.exceedsStock && (
                                                                <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-red-500 text-white text-[8px] px-1.5 py-0.5 rounded font-black whitespace-nowrap">
                                                                    {t('orders.stockError', { available: issue.stockAvailable })}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto justify-between sm:justify-end mt-3 sm:mt-0 sm:ml-4">
                                            <div className="text-right">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase">{t('orders.subtotal')}</p>
                                                <span className="text-sm font-black dark:text-white break-words">{formatCurrency(item.price * item.quantity)}</span>
                                            </div>
                                            <button type="button" onClick={() => onRemoveFromOrder(idx)} aria-label={`${t('common.delete') || 'Delete'} ${item.product.name}`} className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                );
                                })
                            )}
                        </div>
                        {shouldShowValidation && hasItemValidationErrors && (
                            <div className="mt-2 p-2.5 rounded-xl border border-red-200 bg-red-50 text-red-600 text-xs font-semibold">
                                Quantity cannot exceed current stock, and prices/quantities must be valid numbers.
                            </div>
                        )}

                        <div className="mt-8 pt-6 pb-8 md:pb-8 border-t border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 md:sticky md:bottom-0">
                            <div className="flex flex-col gap-3">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="font-bold text-slate-400 uppercase tracking-widest text-[10px]">{t('orders.orderSubtotal')}</span>
                                    <span className="font-black dark:text-white text-lg">{formatCurrency(calculateSubtotal(newOrder.items))}</span>
                                </div>
                                <div className="flex justify-between items-center p-3.5 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-700">
                                    <span className="text-xs font-bold text-slate-500 flex items-center gap-2">
                                        <Tag className="w-4 h-4 text-accent" /> {t('orders.applyDiscount')}
                                    </span>
                                    <div className="w-48">
                                        <SearchableSelect
                                            title={t('orders.noDiscount')}
                                            options={[0, 5, 10, 15, 20, 30, 40, 50, 75, 100].map((v) => ({
                                                value: v,
                                                label: v === 0 ? t('orders.noDiscount') : t('orders.offDiscount', { percent: v })
                                            }))}
                                            selectedValue={newOrder.discount}
                                            onChange={(val) => setNewOrder((prev) => ({ ...prev, discount: val }))}
                                            showSearch={false}
                                            direction="up"
                                        />
                                    </div>
                                </div>
                                <div className="flex justify-between items-center pt-2">
                                    <span className="font-black text-slate-800 dark:text-white uppercase tracking-tighter text-sm">{t('orders.grandTotal')}</span>
                                    <span className="font-black text-3xl text-accent">{formatCurrency(calculateTotal())}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="order-1 md:order-2 w-full shrink-0 md:w-1/3 p-4 bg-slate-50 dark:bg-slate-900/50 md:flex md:flex-col md:min-h-0 border-b md:border-b-0 md:border-l border-slate-100 dark:border-slate-700 relative z-10">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tighter">{t('orders.customerInfo')}</h3>
                            <button type="button" onClick={onClose} aria-label={t('common.close') || 'Close'} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg hover:bg-white dark:hover:bg-slate-800 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-2 pb-2 md:pb-0 md:pr-1 custom-scrollbar">
                            <div className="space-y-2">
                                <SearchableSelect
                                    title={t('orders.chooseCustomer')}
                                    options={customers.map((c) => ({ value: c._id, label: c.name }))}
                                    selectedValue={newOrder.customerId}
                                    onChange={onCustomerSelect}
                                    icon={User}
                                    placeholder={t('orders.searchCustomers')}
                                    customAction={{
                                        label: t('orders.createNewCustomer'),
                                        icon: Plus,
                                        onClick: () => onCustomerSelect('new')
                                    }}
                                />
                            </div>

                            <div className={`space-y-2 transition-all duration-300 ${newOrder.customerId ? 'opacity-100 pointer-events-auto' : 'opacity-30 pointer-events-none grayscale'}`}>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t('orders.fullName')}</label>
                                    <input
                                        placeholder="e.g. Ahmed Ali"
                                        value={newOrder.customerName}
                                        onChange={(e) => setNewOrder({ ...newOrder, customerName: e.target.value })}
                                        aria-invalid={shouldShowValidation && Boolean(customerValidationErrors.customerName)}
                                        className={`w-full p-2 border-2 bg-white dark:bg-slate-900 rounded-xl dark:text-white outline-none focus:border-[var(--brand-color)] transition-all font-bold shadow-sm text-sm ${
                                            shouldShowValidation && customerValidationErrors.customerName
                                                ? 'border-red-500 text-red-500 ring-4 ring-red-500/10'
                                                : 'border-white dark:border-slate-800'
                                        }`}
                                        disabled={newOrder.customerId !== 'new'}
                                    />
                                    {shouldShowValidation && customerValidationErrors.customerName && (
                                        <p className="text-[10px] font-semibold text-red-500 ms-1">{customerValidationErrors.customerName}</p>
                                    )}
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t('orders.phone')}</label>
                                        <input
                                            placeholder="07XX XXX XXXX"
                                            value={newOrder.customerPhone}
                                            onChange={(e) => setNewOrder({ ...newOrder, customerPhone: e.target.value })}
                                            aria-invalid={shouldShowValidation && Boolean(customerValidationErrors.customerPhone)}
                                            className={`w-full p-2 border-2 bg-white dark:bg-slate-900 rounded-xl dark:text-white outline-none focus:border-[var(--brand-color)] transition-all font-bold shadow-sm text-sm ${
                                                shouldShowValidation && customerValidationErrors.customerPhone
                                                    ? 'border-red-500 text-red-500 ring-4 ring-red-500/10'
                                                    : 'border-white dark:border-slate-800'
                                            }`}
                                            disabled={newOrder.customerId !== 'new'}
                                        />
                                        {shouldShowValidation && customerValidationErrors.customerPhone && (
                                            <p className="text-[10px] font-semibold text-red-500 ms-1">{customerValidationErrors.customerPhone}</p>
                                        )}
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t('orders.gender')}</label>
                                        <SearchableSelect
                                            title={t('common.select')}
                                            options={[{ value: 'Male', label: t('common.male') }, { value: 'Female', label: t('common.female') }]}
                                            selectedValue={newOrder.customerGender}
                                            onChange={(val) => setNewOrder({ ...newOrder, customerGender: val })}
                                            showSearch={false}
                                            disabled={newOrder.customerId !== 'new'}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t('orders.governorate')}</label>
                                        <SearchableSelect
                                            title={t('common.select')}
                                            options={GOVERNORATES.map((g) => ({ value: g, label: g }))}
                                            selectedValue={newOrder.customerGovernorate}
                                            onChange={(val) => setNewOrder({ ...newOrder, customerGovernorate: val })}
                                            icon={MapPinIcon}
                                            showSearch={false}
                                            disabled={newOrder.customerId !== 'new'}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t('orders.social')}</label>
                                        <SearchableSelect
                                            title={t('common.select')}
                                            options={SOCIAL_PLATFORMS.map((p) => ({ value: p, label: p }))}
                                            selectedValue={newOrder.customerSocial}
                                            onChange={(val) => setNewOrder({ ...newOrder, customerSocial: val })}
                                            icon={GlobeIcon}
                                            showSearch={false}
                                            disabled={newOrder.customerId !== 'new'}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t('orders.shippingAddress')}</label>
                                    <textarea
                                        placeholder="House/District/Street..."
                                        value={newOrder.customerAddress}
                                        onChange={(e) => setNewOrder({ ...newOrder, customerAddress: e.target.value })}
                                        className="w-full p-2 text-xs border-2 border-white dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl dark:text-white outline-none focus:border-[var(--brand-color)] transition-all font-bold shadow-sm resize-none"
                                        disabled={newOrder.customerId !== 'new'}
                                        rows="1"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t('orders.internalNotes')}</label>
                                    <textarea
                                        placeholder="Special instructions..."
                                        value={newOrder.customerNotes}
                                        onChange={(e) => setNewOrder({ ...newOrder, customerNotes: e.target.value })}
                                        className="w-full p-2 text-xs border-2 border-white dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl dark:text-white outline-none focus:border-[var(--brand-color)] transition-all font-bold shadow-sm resize-none"
                                        rows="2"
                                    />
                                </div>
                            </div>
                            {shouldShowValidation && hasCustomerValidationErrors && newOrder.customerId === 'new' && (
                                <div className="p-2.5 rounded-xl border border-red-200 bg-red-50 text-red-600 text-xs font-semibold">
                                    Please complete required customer information before saving.
                                </div>
                            )}
                        </div>
                        <div className="mt-auto pt-2 border-t border-slate-100 dark:border-slate-700 hidden md:block">
                            <button
                                onClick={handleSubmitAttempt}
                                disabled={isSubmitting}
                                className="w-full py-3 bg-accent text-white rounded-2xl font-black shadow-accent active:scale-[0.98] transition-all disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-3"
                            >
                                {isSubmitting ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        {t('common.saving')}
                                    </>
                                ) : (
                                    <>
                                        <ShoppingBag className="w-5 h-5" />
                                        {saveOrderLabel}
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    <div className="order-3 md:hidden mt-2 bg-white dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700 p-4">
                        <button
                            onClick={handleSubmitAttempt}
                            disabled={isSubmitting}
                            className="w-full py-3 bg-accent text-white rounded-2xl font-black shadow-accent active:scale-[0.98] transition-all disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-3"
                        >
                            {isSubmitting ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    {t('common.saving')}
                                </>
                            ) : (
                                <>
                                    <ShoppingBag className="w-5 h-5" />
                                    {saveOrderLabel}
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OrderFormModal;
