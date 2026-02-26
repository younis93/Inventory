import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Calendar, Info, Link as LinkIcon, MessageSquare, Package, Save, ShoppingBag, Upload, X } from 'lucide-react';
import SearchableSelect from '../SearchableSelect';
import FilterDropdown from '../FilterDropdown';
import ImageWithFallback from '../common/ImageWithFallback';
import { useModalA11y } from '../../hooks/useModalA11y';
import { normalizePurchaseStatus } from '../../hooks/domains/purchaseUtils';
import { getProductCategories, normalizeCategoryValues } from '../../utils/productCategories';

const MAX_IMAGE_SIZE_BYTES = 6 * 1024 * 1024;
const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

const todayIso = () => new Date().toISOString().slice(0, 10);
const roundToNearest500 = (value) => Math.round(value / 500) * 500;
const toNumber = (value, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};
const toInt = (value, fallback = 1) => {
    const parsed = Number.parseInt(value, 10);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};
const isHttpUrl = (value) => {
    if (!value) return true;
    try {
        const url = new URL(String(value));
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
        return false;
    }
};
const readFileAsDataUrl = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error('Failed to read file.'));
    reader.readAsDataURL(file);
});

const createEmptyPricing = () => ({
    unitPriceUSD: '',
    alibabaFeeUSD: '',
    exchangeRate: 1380,
    shippingToIraqIQD: '',
    additionalFeesIQD: '',
    marginPercent: '',
    sellingPriceIQD: 0,
    costPriceIQD_total: 0,
    costPriceIQD_perUnit: 0,
    recommendedSellingPriceIQD_perUnit: 0,
    profitPerUnitIQD: 0,
    unitsSold: 0,
    totalProfitIQD: 0,
    isSellingPriceOverridden: false
});

const createBasicInfo = (source = {}) => {
    const categories = normalizeCategoryValues(
        source.categories ?? source.basicInfo?.categories ?? source.category ?? source.basicInfo?.category
    );
    return {
        name: String(source.name || source.basicInfo?.name || '').trim(),
        sku: String(source.sku || source.basicInfo?.sku || '').trim(),
        categories,
        category: categories[0] || '',
        description: String(source.description || source.basicInfo?.description || '').trim()
    };
};

const createAlibabaInfo = (source = {}) => ({
    alibabaProductLink: String(source.alibabaProductLink || source.alibabaInfo?.alibabaProductLink || '').trim(),
    alibabaMessageLink: String(source.alibabaMessageLink || source.alibabaInfo?.alibabaMessageLink || '').trim(),
    alibabaOrderLink: String(source.alibabaOrderLink || source.alibabaInfo?.alibabaOrderLink || '').trim(),
    alibabaOrderNumber: String(source.alibabaOrderNumber || source.alibabaOrderNo || source.alibabaInfo?.alibabaOrderNumber || '').trim(),
    alibabaNote: String(source.alibabaNote || source.alibabaInfo?.alibabaNote || '').trim()
});

const withPrimaryCategory = (basicInfo = {}) => createBasicInfo(basicInfo);

const recalculatePricing = (draft, quantityInput) => {
    const quantity = toInt(quantityInput, 1);
    const unitPriceUSD = toNumber(draft.unitPriceUSD, 0);
    const alibabaFeeUSD = toNumber(draft.alibabaFeeUSD, 0);
    const exchangeRate = toNumber(draft.exchangeRate, 1380);
    const shippingToIraqIQD = toNumber(draft.shippingToIraqIQD, 0);
    const additionalFeesIQD = toNumber(draft.additionalFeesIQD, 0);
    const marginPercent = toNumber(draft.marginPercent, 0);
    const unitsSold = Math.max(0, toNumber(draft.unitsSold, 0));

    const totalCostIQD = ((unitPriceUSD + alibabaFeeUSD) * quantity * exchangeRate) + shippingToIraqIQD + additionalFeesIQD;
    const perUnitCostIQD = quantity > 0 ? totalCostIQD / quantity : 0;
    const recommendedPrice = roundToNearest500(perUnitCostIQD * (1 + marginPercent / 100));
    const sellingPriceIQD = draft.isSellingPriceOverridden ? toNumber(draft.sellingPriceIQD, 0) : recommendedPrice;
    const profitPerUnitIQD = sellingPriceIQD - perUnitCostIQD;

    return {
        ...draft,
        unitPriceUSD,
        alibabaFeeUSD,
        exchangeRate,
        shippingToIraqIQD,
        additionalFeesIQD,
        marginPercent,
        unitsSold,
        sellingPriceIQD,
        costPriceIQD_total: totalCostIQD,
        costPriceIQD_perUnit: perUnitCostIQD,
        recommendedSellingPriceIQD_perUnit: recommendedPrice,
        profitPerUnitIQD,
        totalProfitIQD: profitPerUnitIQD * unitsSold
    };
};

const createSnapshotFromProduct = (product = {}, quantity = 1) => ({
    basicInfo: createBasicInfo(product),
    alibabaInfo: createAlibabaInfo(product),
    pricing: recalculatePricing({ ...createEmptyPricing(), ...(product.pricing || {}), ...product }, quantity),
    images: Array.isArray(product.images) ? product.images : []
});

const toPricingPayload = (pricing = {}) => ({
    unitPriceUSD: toNumber(pricing.unitPriceUSD, 0),
    alibabaFeeUSD: toNumber(pricing.alibabaFeeUSD, 0),
    exchangeRate: toNumber(pricing.exchangeRate, 1380),
    shippingToIraqIQD: toNumber(pricing.shippingToIraqIQD, 0),
    additionalFeesIQD: toNumber(pricing.additionalFeesIQD, 0),
    marginPercent: toNumber(pricing.marginPercent, 0),
    sellingPriceIQD: toNumber(pricing.sellingPriceIQD, 0),
    costPriceIQD_total: toNumber(pricing.costPriceIQD_total, 0),
    costPriceIQD_perUnit: toNumber(pricing.costPriceIQD_perUnit, 0),
    recommendedSellingPriceIQD_perUnit: toNumber(pricing.recommendedSellingPriceIQD_perUnit, 0),
    profitPerUnitIQD: toNumber(pricing.profitPerUnitIQD, 0),
    unitsSold: Math.max(0, toInt(pricing.unitsSold, 0))
});

const PurchaseFormModal = ({
    isOpen,
    onClose,
    onSubmit,
    products = [],
    categories = [],
    editingPurchase = null,
    purchaseStatuses = [],
    canManage = false,
    t,
    language = 'en'
}) => {
    const dialogRef = useRef(null);
    const fileInputRef = useRef(null);
    const [form, setForm] = useState(null);
    const [submitAttempted, setSubmitAttempted] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [dragActive, setDragActive] = useState(false);

    useModalA11y({ isOpen, onClose, containerRef: dialogRef });

    const defaultStatus = useMemo(
        () => normalizePurchaseStatus(purchaseStatuses[0] || 'ordered') || 'ordered',
        [purchaseStatuses]
    );

    const productOptions = useMemo(
        () => products.map((product) => ({ value: product._id, label: `${product.name || '-'} (${product.sku || '-'})` })),
        [products]
    );

    const statusOptions = useMemo(
        () => purchaseStatuses.map((status) => ({ value: status, label: t(`purchases.statuses.${status}`) })),
        [purchaseStatuses, t]
    );

    const categoryOptions = useMemo(() => {
        const values = new Set();
        categories.forEach((category) => {
            const clean = String(category || '').trim();
            if (clean) values.add(clean);
        });
        products.forEach((product) => {
            getProductCategories(product).forEach((category) => values.add(category));
        });
        return Array.from(values).sort().map((value) => ({ value, label: value }));
    }, [categories, products]);

    useEffect(() => {
        if (!isOpen) return;
        const quantity = editingPurchase?.quantity ?? 1;
        const product = products.find((entry) => entry._id === editingPurchase?.productId) || products[0] || {};
        const snapshot = createSnapshotFromProduct(product, quantity);
        const latestStatusDate = editingPurchase?.statusHistory?.[editingPurchase.statusHistory.length - 1]?.date || todayIso();

        setForm({
            productMode: 'existing',
            productId: editingPurchase?.productId || product?._id || '',
            quantity,
            status: normalizePurchaseStatus(editingPurchase?.status || defaultStatus) || defaultStatus,
            statusDate: latestStatusDate,
            statusNote: '',
            notes: String(editingPurchase?.notes || ''),
            basicInfo: createBasicInfo({ ...snapshot.basicInfo, ...(editingPurchase?.basicInfo || {}) }),
            alibabaInfo: createAlibabaInfo({ ...snapshot.alibabaInfo, ...(editingPurchase?.alibabaInfo || {}) }),
            pricing: recalculatePricing({ ...snapshot.pricing, ...(editingPurchase?.pricing || {}) }, quantity),
            images: snapshot.images
        });
        setSubmitAttempted(false);
        setErrorMessage('');
        setDragActive(false);
    }, [isOpen, editingPurchase, products, defaultStatus]);

    const validationErrors = useMemo(() => {
        if (!form) return {};
        const errors = {};
        if (!toInt(form.quantity, 0)) errors.quantity = 'Quantity is required.';
        if (form.productMode === 'existing' && !String(form.productId || '').trim()) errors.productId = 'Product is required.';
        if (!form.statusDate) errors.statusDate = 'Status date is required.';
        if (form.statusDate > todayIso()) errors.statusDate = 'Status date cannot be in the future.';
        if (form.productMode === 'new') {
            if (!form.basicInfo.name) errors.name = 'Product name is required.';
            if (!form.basicInfo.sku) errors.sku = 'SKU is required.';
            if (!normalizeCategoryValues(form.basicInfo.categories ?? form.basicInfo.category).length) {
                errors.categories = 'At least one category is required.';
            }
        }
        if (!isHttpUrl(form.alibabaInfo.alibabaProductLink)) errors.alibabaProductLink = 'Use a valid URL (http/https).';
        if (!isHttpUrl(form.alibabaInfo.alibabaMessageLink)) errors.alibabaMessageLink = 'Use a valid URL (http/https).';
        if (!isHttpUrl(form.alibabaInfo.alibabaOrderLink)) errors.alibabaOrderLink = 'Use a valid URL (http/https).';
        if (toNumber(form.pricing.unitPriceUSD, 0) <= 0) errors.unitPriceUSD = 'Unit price must be greater than 0.';
        if (toNumber(form.pricing.exchangeRate, 0) < 500 || toNumber(form.pricing.exchangeRate, 0) > 5000) {
            errors.exchangeRate = 'Exchange rate must be between 500 and 5000.';
        }
        return errors;
    }, [form]);

    const updateForm = (updater) => setForm((prev) => (typeof updater === 'function' ? updater(prev) : { ...prev, ...updater }));

    const switchMode = (nextMode) => {
        updateForm((prev) => {
            if (!prev || prev.productMode === nextMode) return prev;

            const quantity = prev.quantity || 1;

            if (nextMode === 'new') {
                return {
                    ...prev,
                    productMode: 'new',
                    productId: '',
                    basicInfo: createBasicInfo(),
                    alibabaInfo: createAlibabaInfo(),
                    pricing: recalculatePricing(createEmptyPricing(), quantity),
                    images: []
                };
            }

            const selectedProduct = products.find((entry) => entry._id === prev.productId) || products[0] || {};
            const snapshot = createSnapshotFromProduct(selectedProduct, quantity);

            return {
                ...prev,
                productMode: 'existing',
                productId: selectedProduct?._id || '',
                basicInfo: snapshot.basicInfo,
                alibabaInfo: snapshot.alibabaInfo,
                pricing: snapshot.pricing,
                images: snapshot.images
            };
        });

        setErrorMessage('');
        setSubmitAttempted(false);
    };

    const setPricingField = (name, value) => updateForm((prev) => {
        const nextPricing = { ...prev.pricing, [name]: value };
        if (name === 'sellingPriceIQD') nextPricing.isSellingPriceOverridden = true;
        return { ...prev, pricing: recalculatePricing(nextPricing, prev.quantity) };
    });

    const setProductSelection = (productId) => {
        const product = products.find((entry) => entry._id === productId) || {};
        const snapshot = createSnapshotFromProduct(product, form.quantity);
        updateForm({
            productId,
            basicInfo: snapshot.basicInfo,
            alibabaInfo: snapshot.alibabaInfo,
            pricing: snapshot.pricing,
            images: snapshot.images
        });
    };

    const handleImageFiles = async (files) => {
        if (!files.length) return;
        const nextImages = [];
        for (const file of files) {
            if (!SUPPORTED_IMAGE_TYPES.includes(file.type)) {
                setErrorMessage('Only JPG, PNG, WEBP, and GIF files are supported.');
                continue;
            }
            if (file.size > MAX_IMAGE_SIZE_BYTES) {
                setErrorMessage('Image size must be 6MB or less.');
                continue;
            }
            nextImages.push(await readFileAsDataUrl(file));
        }
        if (nextImages.length > 0) updateForm((prev) => ({ ...prev, images: [...prev.images, ...nextImages] }));
    };

    useEffect(() => {
        if (!form || form.productMode !== 'existing' || !form.productId) return;

        const product = products.find((entry) => entry._id === form.productId);
        if (!product) return;

        const snapshot = createSnapshotFromProduct(product, form.quantity);

        setForm((prev) => {
            if (!prev || prev.productMode !== 'existing' || prev.productId !== form.productId) return prev;

            const sameBasicInfo = (
                prev.basicInfo?.name === snapshot.basicInfo.name &&
                prev.basicInfo?.sku === snapshot.basicInfo.sku &&
                JSON.stringify(normalizeCategoryValues(prev.basicInfo?.categories ?? prev.basicInfo?.category)) ===
                JSON.stringify(normalizeCategoryValues(snapshot.basicInfo?.categories ?? snapshot.basicInfo?.category)) &&
                prev.basicInfo?.description === snapshot.basicInfo.description
            );
            const sameAlibabaInfo = (
                prev.alibabaInfo?.alibabaProductLink === snapshot.alibabaInfo.alibabaProductLink &&
                prev.alibabaInfo?.alibabaMessageLink === snapshot.alibabaInfo.alibabaMessageLink &&
                prev.alibabaInfo?.alibabaOrderLink === snapshot.alibabaInfo.alibabaOrderLink &&
                prev.alibabaInfo?.alibabaOrderNumber === snapshot.alibabaInfo.alibabaOrderNumber &&
                prev.alibabaInfo?.alibabaNote === snapshot.alibabaInfo.alibabaNote
            );

            if (sameBasicInfo && sameAlibabaInfo) return prev;

            return {
                ...prev,
                basicInfo: snapshot.basicInfo,
                alibabaInfo: snapshot.alibabaInfo,
                pricing: snapshot.pricing,
                images: snapshot.images
            };
        });
    }, [products, form?.productId, form?.productMode, form?.quantity]);

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (!form || isSubmitting || !canManage) return;
        setSubmitAttempted(true);
        if (Object.keys(validationErrors).length > 0) {
            setErrorMessage('Please fix the highlighted fields before saving.');
            return;
        }

        setErrorMessage('');
        setIsSubmitting(true);
        try {
            let basicInfo = createBasicInfo(form.basicInfo);
            let alibabaInfo = createAlibabaInfo(form.alibabaInfo);
            let pricing = toPricingPayload(form.pricing);

            if (form.productMode === 'existing') {
                const selectedProduct = products.find((entry) => entry._id === form.productId);
                if (selectedProduct) {
                    const snapshot = createSnapshotFromProduct(selectedProduct, form.quantity);
                    basicInfo = snapshot.basicInfo;
                    alibabaInfo = snapshot.alibabaInfo;
                    pricing = toPricingPayload(snapshot.pricing);
                }
            }

            const payload = {
                productMode: form.productMode,
                productId: form.productId,
                quantity: toInt(form.quantity, 1),
                status: normalizePurchaseStatus(form.status || defaultStatus) || defaultStatus,
                initialStatusDate: form.statusDate,
                statusDate: form.statusDate,
                statusNote: form.statusNote || '',
                notes: form.notes || '',
                basicInfo,
                alibabaInfo,
                pricing
            };
            if (form.productMode === 'new') {
                payload.newProduct = {
                    ...createBasicInfo(form.basicInfo),
                    ...createAlibabaInfo(form.alibabaInfo),
                    ...toPricingPayload(form.pricing),
                    images: form.images || [],
                    unitPrice: toNumber(form.pricing.unitPriceUSD, 0),
                    price: toNumber(form.pricing.sellingPriceIQD, 0)
                };
            }
            await onSubmit?.(payload, editingPurchase);
            onClose?.();
        } catch (error) {
            setErrorMessage(error?.message || 'Failed to save purchase.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen || !form) return null;

    return (
        <div className={`fixed inset-0 z-[110] flex items-start justify-center overflow-x-hidden overflow-y-auto custom-scrollbar bg-black/45 p-2 sm:p-4 ${language === 'ar' ? 'lg:pr-[280px]' : 'lg:pl-[280px]'}`}>
            <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="purchase-modal-title" tabIndex={-1} className="my-4 flex max-h-[92vh] w-full max-w-[calc(100vw-1rem)] sm:max-w-6xl flex-col overflow-x-hidden overflow-y-hidden rounded-3xl bg-white shadow-2xl dark:bg-slate-800">
                <div className="sticky top-0 z-20 flex items-start justify-between border-b border-slate-100 bg-white px-6 py-5 dark:border-slate-700 dark:bg-slate-800">
                    <div>
                        <h3 id="purchase-modal-title" className="text-2xl font-black text-slate-900 dark:text-white">{editingPurchase ? t('purchases.editPurchase') : t('purchases.newPurchase')}</h3>
                        <p className="mt-1 text-sm font-semibold text-slate-500">{editingPurchase ? t('purchases.form.editHint') : t('purchases.form.createHint')}</p>
                    </div>
                    <button type="button" onClick={onClose} aria-label={t('common.close') || 'Close'} className="flex h-10 w-10 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-100">
                        <X className="h-6 w-6" />
                    </button>
                </div>
                <form id="purchase-form" onSubmit={handleSubmit} className="flex-1 overflow-x-hidden overflow-y-auto p-6 custom-scrollbar">
                    {errorMessage && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-600">{errorMessage}</div>}

                    {!editingPurchase && (
                        <section className="mb-6 flex flex-wrap gap-3">
                            <button type="button" onClick={() => switchMode('existing')} className={`rounded-2xl border-2 px-4 py-3 text-sm font-black transition ${form.productMode === 'existing' ? 'border-[var(--brand-color)] bg-[var(--brand-color)]/5 text-[var(--brand-color)]' : 'border-slate-200 bg-white text-slate-700'}`}>
                                {t('purchases.form.existingProduct')}
                            </button>
                            <button type="button" onClick={() => switchMode('new')} className={`rounded-2xl border-2 px-4 py-3 text-sm font-black transition ${form.productMode === 'new' ? 'border-[var(--brand-color)] bg-[var(--brand-color)]/5 text-[var(--brand-color)]' : 'border-slate-200 bg-white text-slate-700'}`}>
                                {t('purchases.form.newProduct')}
                            </button>
                        </section>
                    )}

                    <section className="mb-6 grid gap-4 md:grid-cols-4">
                        {form.productMode === 'existing' && (
                            <div className="md:col-span-2">
                                <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">{t('purchases.form.product')}</label>
                                <SearchableSelect title={t('purchases.form.product')} options={productOptions} selectedValue={form.productId} onChange={setProductSelection} icon={Package} showSearch={true} disabled={Boolean(editingPurchase)} />
                                {submitAttempted && validationErrors.productId && <p className="mt-1 text-[11px] font-semibold text-red-500">{validationErrors.productId}</p>}
                            </div>
                        )}
                        <div>
                            <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">{t('orders.qty')}</label>
                            <input type="number" min="1" value={form.quantity} onChange={(event) => updateForm((prev) => ({ ...prev, quantity: event.target.value, pricing: recalculatePricing(prev.pricing, event.target.value) }))} className="h-[44px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold outline-none transition focus:border-[var(--brand-color)]/40 focus:ring-2 focus:ring-[var(--brand-color)]/20" />
                            {submitAttempted && validationErrors.quantity && <p className="mt-1 text-[11px] font-semibold text-red-500">{validationErrors.quantity}</p>}
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">{t('purchases.filters.status')}</label>
                            <SearchableSelect title={t('purchases.filters.status')} options={statusOptions} selectedValue={form.status} onChange={(value) => updateForm({ status: value })} icon={ShoppingBag} showSearch={false} disabled={Boolean(editingPurchase)} />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">{t('purchases.form.statusDate')}</label>
                            <div className="relative">
                                <Calendar className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                <input type="date" max={todayIso()} value={form.statusDate} onChange={(event) => updateForm({ statusDate: event.target.value })} disabled={Boolean(editingPurchase)} className="h-[44px] w-full rounded-xl border border-slate-200 bg-slate-50 ps-10 pe-3 text-sm font-bold outline-none transition focus:border-[var(--brand-color)]/40 focus:ring-2 focus:ring-[var(--brand-color)]/20" />
                            </div>
                            {submitAttempted && validationErrors.statusDate && <p className="mt-1 text-[11px] font-semibold text-red-500">{validationErrors.statusDate}</p>}
                        </div>
                    </section>

                    <section className="mb-6 rounded-3xl border border-slate-200 p-5">
                        <h4 className="mb-4 border-b border-indigo-50 pb-2 text-[11px] font-bold uppercase tracking-widest text-[var(--brand-color)]">{t('products.form.basicInfo')}</h4>
                        <div className="grid gap-4 md:grid-cols-2">
                            <div>
                                <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">{t('products.form.productName')}</label>
                                <input value={form.basicInfo.name} onChange={(event) => updateForm((prev) => ({ ...prev, basicInfo: { ...prev.basicInfo, name: event.target.value } }))} placeholder={t('products.form.productNamePlaceholder')} className="h-[44px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold outline-none transition focus:border-[var(--brand-color)]/40 focus:ring-2 focus:ring-[var(--brand-color)]/20" />
                                {submitAttempted && validationErrors.name && <p className="mt-1 text-[11px] font-semibold text-red-500">{validationErrors.name}</p>}
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">{t('products.form.sku')}</label>
                                <input value={form.basicInfo.sku} onChange={(event) => updateForm((prev) => ({ ...prev, basicInfo: { ...prev.basicInfo, sku: event.target.value } }))} placeholder={t('products.form.skuPlaceholder')} className="h-[44px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold outline-none transition focus:border-[var(--brand-color)]/40 focus:ring-2 focus:ring-[var(--brand-color)]/20" />
                                {submitAttempted && validationErrors.sku && <p className="mt-1 text-[11px] font-semibold text-red-500">{validationErrors.sku}</p>}
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">{t('products.form.category')}</label>
                                <FilterDropdown
                                    title={t('products.form.selectCategory')}
                                    options={categoryOptions}
                                    selectedValues={normalizeCategoryValues(form.basicInfo.categories ?? form.basicInfo.category)}
                                    showSearch={false}
                                    onChange={(values) => updateForm((prev) => ({
                                        ...prev,
                                        basicInfo: withPrimaryCategory({
                                            ...prev.basicInfo,
                                            categories: values
                                        })
                                    }))}
                                    icon={Package}
                                />
                                {submitAttempted && validationErrors.categories && <p className="mt-1 text-[11px] font-semibold text-red-500">{validationErrors.categories}</p>}
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">{t('products.form.alibabaOrderNo')}</label>
                                <input value={form.alibabaInfo.alibabaOrderNumber} onChange={(event) => updateForm((prev) => ({ ...prev, alibabaInfo: { ...prev.alibabaInfo, alibabaOrderNumber: event.target.value } }))} placeholder={t('products.form.alibabaOrderNo')} className="h-[44px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold outline-none transition focus:border-[var(--brand-color)]/40 focus:ring-2 focus:ring-[var(--brand-color)]/20" />
                            </div>
                        </div>
                    </section>

                    <section className="mb-6 rounded-3xl border border-slate-200 p-5">
                        <h4 className="mb-4 border-b border-indigo-50 pb-2 text-[11px] font-bold uppercase tracking-widest text-[var(--brand-color)]">{t('products.form.alibabaSourcing')}</h4>
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="md:col-span-2">
                                <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">{t('products.form.productLink')}</label>
                                <div className="relative">
                                    <LinkIcon className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                    <input value={form.alibabaInfo.alibabaProductLink} onChange={(event) => updateForm((prev) => ({ ...prev, alibabaInfo: { ...prev.alibabaInfo, alibabaProductLink: event.target.value } }))} placeholder="https://..." className="h-[44px] w-full rounded-xl border border-slate-200 bg-slate-50 ps-10 pe-3 text-sm font-semibold outline-none transition focus:border-[var(--brand-color)]/40 focus:ring-2 focus:ring-[var(--brand-color)]/20" />
                                </div>
                                {submitAttempted && validationErrors.alibabaProductLink && <p className="mt-1 text-[11px] font-semibold text-red-500">{validationErrors.alibabaProductLink}</p>}
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">{t('products.form.messageLink')}</label>
                                <div className="relative">
                                    <MessageSquare className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                    <input value={form.alibabaInfo.alibabaMessageLink} onChange={(event) => updateForm((prev) => ({ ...prev, alibabaInfo: { ...prev.alibabaInfo, alibabaMessageLink: event.target.value } }))} placeholder="https://..." className="h-[44px] w-full rounded-xl border border-slate-200 bg-slate-50 ps-10 pe-3 text-sm font-semibold outline-none transition focus:border-[var(--brand-color)]/40 focus:ring-2 focus:ring-[var(--brand-color)]/20" />
                                </div>
                                {submitAttempted && validationErrors.alibabaMessageLink && <p className="mt-1 text-[11px] font-semibold text-red-500">{validationErrors.alibabaMessageLink}</p>}
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">{t('products.form.orderLink')}</label>
                                <div className="relative">
                                    <ShoppingBag className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                    <input value={form.alibabaInfo.alibabaOrderLink} onChange={(event) => updateForm((prev) => ({ ...prev, alibabaInfo: { ...prev.alibabaInfo, alibabaOrderLink: event.target.value } }))} placeholder="https://..." className="h-[44px] w-full rounded-xl border border-slate-200 bg-slate-50 ps-10 pe-3 text-sm font-semibold outline-none transition focus:border-[var(--brand-color)]/40 focus:ring-2 focus:ring-[var(--brand-color)]/20" />
                                </div>
                                {submitAttempted && validationErrors.alibabaOrderLink && <p className="mt-1 text-[11px] font-semibold text-red-500">{validationErrors.alibabaOrderLink}</p>}
                            </div>
                        </div>
                    </section>

                    <section className="mb-6 rounded-3xl border border-slate-200 p-5">
                        <h4 className="mb-4 border-b border-indigo-50 pb-2 text-[11px] font-bold uppercase tracking-widest text-[var(--brand-color)]">{t('products.form.costAndPricing')}</h4>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            <div>
                                <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">{t('products.form.unitPrice')}</label>
                                <div className="relative">
                                    <span className="absolute start-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">$</span>
                                    <input type="number" step="0.01" name="unitPriceUSD" value={form.pricing.unitPriceUSD} onChange={(event) => setPricingField(event.target.name, event.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 ps-7 text-sm font-bold outline-none transition focus:border-[var(--brand-color)]/40 focus:ring-2 focus:ring-[var(--brand-color)]/20" />
                                </div>
                                {submitAttempted && validationErrors.unitPriceUSD && <p className="mt-1 text-[11px] font-semibold text-red-500">{validationErrors.unitPriceUSD}</p>}
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">{t('products.form.alibabaFee')}</label>
                                <div className="relative">
                                    <span className="absolute start-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">$</span>
                                    <input type="number" step="0.01" name="alibabaFeeUSD" value={form.pricing.alibabaFeeUSD} onChange={(event) => setPricingField(event.target.name, event.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 ps-7 text-sm font-bold outline-none transition focus:border-[var(--brand-color)]/40 focus:ring-2 focus:ring-[var(--brand-color)]/20" />
                                </div>
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">{t('products.form.exchangeRate')}</label>
                                <input type="number" name="exchangeRate" value={form.pricing.exchangeRate} onChange={(event) => setPricingField(event.target.name, event.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-sm font-bold outline-none transition focus:border-[var(--brand-color)]/40 focus:ring-2 focus:ring-[var(--brand-color)]/20" />
                                {submitAttempted && validationErrors.exchangeRate && <p className="mt-1 text-[11px] font-semibold text-red-500">{validationErrors.exchangeRate}</p>}
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">{t('products.form.margin')}</label>
                                <div className="relative">
                                    <input type="number" name="marginPercent" value={form.pricing.marginPercent} onChange={(event) => setPricingField(event.target.name, event.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 pe-8 text-sm font-bold outline-none transition focus:border-[var(--brand-color)]/40 focus:ring-2 focus:ring-[var(--brand-color)]/20" />
                                    <span className="absolute end-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">%</span>
                                </div>
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">{t('products.form.shippingIQD')}</label>
                                <input type="number" name="shippingToIraqIQD" value={form.pricing.shippingToIraqIQD} onChange={(event) => setPricingField(event.target.name, event.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-sm font-bold outline-none transition focus:border-[var(--brand-color)]/40 focus:ring-2 focus:ring-[var(--brand-color)]/20" />
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">{t('products.form.otherFeesIQD')}</label>
                                <input type="number" name="additionalFeesIQD" value={form.pricing.additionalFeesIQD} onChange={(event) => setPricingField(event.target.name, event.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-sm font-bold outline-none transition focus:border-[var(--brand-color)]/40 focus:ring-2 focus:ring-[var(--brand-color)]/20" />
                            </div>
                            <div className="grid grid-cols-2 gap-3 sm:col-span-2">
                                <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                                    <span className="block text-[10px] font-bold uppercase text-slate-400">{t('products.form.costTotal')}</span>
                                    <span className="text-sm font-bold text-slate-700">IQD {(form.pricing.costPriceIQD_total || 0).toLocaleString()}</span>
                                </div>
                                <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                                    <span className="block text-[10px] font-bold uppercase text-slate-400">{t('products.form.costPerUnit')}</span>
                                    <span className="text-sm font-bold text-slate-700">IQD {(form.pricing.costPriceIQD_perUnit || 0).toLocaleString()}</span>
                                </div>
                            </div>
                            <div className="col-span-full grid gap-4 md:grid-cols-2">
                                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                                    <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">{t('products.form.recommendedPrice')}</span>
                                    <span className="text-xl font-bold text-slate-600">IQD {(form.pricing.recommendedSellingPriceIQD_perUnit || 0).toLocaleString()}</span>
                                </div>
                                <div className={`rounded-2xl border-2 p-4 transition-all ${form.pricing.isSellingPriceOverridden ? 'border-orange-200 bg-orange-50' : 'border-[var(--brand-color)]/20 bg-[var(--brand-color)]/5'}`}>
                                    <div className="mb-1 flex items-start justify-between">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--brand-color)]">{t('products.form.finalPrice')}</span>
                                        {form.pricing.isSellingPriceOverridden && (
                                            <button type="button" onClick={() => updateForm((prev) => ({ ...prev, pricing: recalculatePricing({ ...prev.pricing, isSellingPriceOverridden: false }, prev.quantity) }))} className="text-[10px] font-bold text-orange-600 hover:underline">
                                                {t('common.reset')}
                                            </button>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-lg font-black text-[var(--brand-color)]">IQD</span>
                                        <input type="number" name="sellingPriceIQD" value={form.pricing.sellingPriceIQD} onChange={(event) => setPricingField(event.target.name, event.target.value)} className="w-full border-b-2 border-[var(--brand-color)] bg-transparent text-2xl font-black text-[var(--brand-color)] outline-none" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>
                    <section className="mb-6 rounded-3xl border border-slate-200 p-5">
                        <h4 className="mb-4 border-b border-indigo-50 pb-2 text-[11px] font-bold uppercase tracking-widest text-[var(--brand-color)]">{t('products.form.generalInfo')}</h4>
                        <div className="relative">
                            <Info className="pointer-events-none absolute start-3 top-3 h-4 w-4 text-slate-400" />
                            <textarea value={form.basicInfo.description} onChange={(event) => updateForm((prev) => ({ ...prev, basicInfo: { ...prev.basicInfo, description: event.target.value } }))} placeholder={t('products.form.descriptionPlaceholder')} className="min-h-[120px] w-full resize-none rounded-xl border border-slate-200 bg-slate-50 py-2.5 ps-10 pe-3 text-sm font-medium outline-none transition focus:border-[var(--brand-color)]/40 focus:ring-2 focus:ring-[var(--brand-color)]/20" />
                        </div>
                    </section>

                    {form.productMode === 'new' && (
                        <section className="mb-6 rounded-3xl border border-slate-200 p-5">
                            <h4 className="mb-4 border-b border-indigo-50 pb-2 text-[11px] font-bold uppercase tracking-widest text-[var(--brand-color)]">{t('products.form.gallery')}</h4>
                            <div onDragEnter={(event) => { event.preventDefault(); setDragActive(true); }} onDragOver={(event) => { event.preventDefault(); setDragActive(true); }} onDragLeave={(event) => { event.preventDefault(); if (!event.currentTarget.contains(event.relatedTarget)) setDragActive(false); }} onDrop={async (event) => { event.preventDefault(); setDragActive(false); await handleImageFiles(Array.from(event.dataTransfer.files || [])); }} className={`rounded-2xl border-2 border-dashed p-3 transition-colors ${dragActive ? 'border-[var(--brand-color)] bg-[var(--brand-color)]/5' : 'border-slate-200'}`}>
                                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
                                    {(form.images || []).map((image, index) => (
                                        <div key={`${index}-${String(image).slice(0, 12)}`} className="group relative aspect-square overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                                            <ImageWithFallback src={typeof image === 'string' ? image : image?.url} alt={`Product ${index + 1}`} className="h-full w-full" imageClassName="h-full w-full object-cover" />
                                            <button type="button" onClick={() => updateForm((prev) => ({ ...prev, images: prev.images.filter((_, i) => i !== index) }))} className="absolute end-1 top-1 rounded-full bg-red-500 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100">
                                                <X className="h-3 w-3" />
                                            </button>
                                        </div>
                                    ))}
                                    <button type="button" onClick={() => fileInputRef.current?.click()} className="group flex aspect-square flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 text-slate-400 transition-all hover:border-[var(--brand-color)] hover:bg-slate-50 hover:text-[var(--brand-color)]">
                                        <Upload className="mb-1 h-5 w-5 transition-transform group-hover:scale-110" />
                                        <span className="px-1 text-center text-[9px] font-black uppercase leading-tight">{t('products.form.addImage')}</span>
                                    </button>
                                </div>
                                <p className="mt-3 text-[11px] font-semibold text-slate-500">Drag and drop JPG, PNG, WEBP, or GIF images (max 6MB each).</p>
                            </div>
                            <input ref={fileInputRef} type="file" multiple accept={SUPPORTED_IMAGE_TYPES.join(',')} className="hidden" onChange={async (event) => { await handleImageFiles(Array.from(event.target.files || [])); event.target.value = ''; }} />
                        </section>
                    )}

                    <section className="mb-2 rounded-3xl border border-slate-200 p-5">
                        <h4 className="mb-4 border-b border-indigo-50 pb-2 text-[11px] font-bold uppercase tracking-widest text-[var(--brand-color)]">{t('purchases.form.notesPlaceholder')}</h4>
                        <textarea value={form.notes} onChange={(event) => updateForm({ notes: event.target.value })} placeholder={t('purchases.form.notesPlaceholder')} className="min-h-[120px] w-full resize-none rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-medium outline-none transition focus:border-[var(--brand-color)]/40 focus:ring-2 focus:ring-[var(--brand-color)]/20" />
                    </section>

                    <div className="h-20" />
                </form>

                <div className="sticky bottom-0 z-20 flex flex-wrap items-center justify-end gap-3 border-t border-slate-100 bg-white px-6 py-5 dark:border-slate-700 dark:bg-slate-800 sm:flex-nowrap">
                    <button type="button" onClick={onClose} className="order-2 w-full rounded-xl px-5 py-2.5 text-base font-bold text-slate-500 transition hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700 sm:order-1 sm:w-auto">{t('common.cancel')}</button>
                    <button type="submit" form="purchase-form" disabled={isSubmitting || !canManage} className="order-1 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-7 py-2.5 text-base font-black text-white shadow-accent transition active:scale-95 disabled:opacity-60 sm:order-2 sm:w-auto">
                        <Save className="h-5 w-5" />
                        {isSubmitting ? (t('common.loading') || 'Loading...') : (editingPurchase ? t('purchases.updatePurchase') : t('purchases.createPurchase'))}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PurchaseFormModal;
