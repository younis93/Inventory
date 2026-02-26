import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Info, MessageSquare, Package, Plus, Save, ShoppingBag, Upload, X } from 'lucide-react';
import ImageWithFallback from '../common/ImageWithFallback';
import SearchableSelect from '../SearchableSelect';
import { useModalA11y } from '../../hooks/useModalA11y';

const MAX_IMAGE_SIZE_BYTES = 6 * 1024 * 1024;
const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

const formatBytes = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const isHttpUrl = (value) => {
    if (!value) return true;
    try {
        const url = new URL(value);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
        return false;
    }
};

const readFileAsDataUrl = (file, onProgress) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error('Failed to read file'));
    reader.onprogress = (event) => {
        if (!event.lengthComputable) return;
        onProgress?.(Math.min(80, Math.round((event.loaded / event.total) * 80)));
    };
    reader.readAsDataURL(file);
});

const loadImage = (src) => new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Failed to load image'));
    image.src = src;
});

const canvasToBlob = (canvas, type, quality) => new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Failed to compress image'));
    }, type, quality);
});

const blobToDataUrl = (blob) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error('Failed to encode image'));
    reader.readAsDataURL(blob);
});

const compressImageFile = async (file, maxBytes, onProgress) => {
    if (file.type === 'image/gif' && file.size <= maxBytes) {
        onProgress?.(100);
        return readFileAsDataUrl(file);
    }

    const sourceDataUrl = await readFileAsDataUrl(file, onProgress);
    const image = await loadImage(sourceDataUrl);
    const maxDimension = 1600;
    const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    context.drawImage(image, 0, 0, width, height);

    let quality = 0.88;
    let outputType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
    let blob = await canvasToBlob(canvas, outputType, quality);
    onProgress?.(90);

    while (blob.size > maxBytes && quality > 0.4) {
        quality -= 0.08;
        outputType = 'image/jpeg';
        blob = await canvasToBlob(canvas, outputType, quality);
    }

    if (blob.size > maxBytes) {
        throw new Error(`Image is larger than 6MB after compression (${formatBytes(blob.size)}).`);
    }

    const finalDataUrl = await blobToDataUrl(blob);
    onProgress?.(100);
    return finalDataUrl;
};

const getAutoStatus = (stock) => {
    const value = Number(stock || 0);
    if (value <= 0) return 'Out of Stock';
    if (value < 10) return 'Low Stock';
    return 'In Stock';
};

const todayIso = () => new Date().toISOString().slice(0, 10);

const StatusBadge = ({ status }) => {
    const styles = {
        'In Stock': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
        'Low Stock': 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
        'Out of Stock': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
    };

    return (
        <span className={`inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold ${styles[status] || 'bg-slate-100 text-slate-700'}`}>
            {status}
        </span>
    );
};

const ProductFormModal = ({
    isOpen,
    t,
    editingProduct,
    formData,
    handleSubmit,
    handleInputChange,
    handlePriceBlur,
    setFormData,
    categories,
    fileInputRef,
    removeImage,
    onOpenCategoryManager,
    onClose
}) => {
    const dialogRef = useRef(null);
    const [dragActive, setDragActive] = useState(false);
    const [uploadQueue, setUploadQueue] = useState([]);
    const [uploadError, setUploadError] = useState('');
    const [hasSubmitAttempted, setHasSubmitAttempted] = useState(false);

    useModalA11y({
        isOpen,
        onClose,
        containerRef: dialogRef
    });

    const validationErrors = useMemo(() => {
        const errors = {};

        if (!String(formData.name || '').trim()) errors.name = 'Product name is required.';
        if (!String(formData.sku || '').trim()) errors.sku = 'SKU is required.';
        if (!String(formData.category || '').trim()) errors.category = 'Category is required.';

        const stock = Number(formData.stock);
        if (!Number.isFinite(stock) || stock < 0 || !Number.isInteger(stock)) {
            errors.stock = 'Stock must be a non-negative whole number.';
        }

        const unitPrice = Number(formData.unitPriceUSD);
        if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
            errors.unitPriceUSD = 'Unit price must be greater than 0.';
        }

        const exchangeRate = Number(formData.exchangeRate);
        if (!Number.isFinite(exchangeRate) || exchangeRate < 500 || exchangeRate > 5000) {
            errors.exchangeRate = 'Exchange rate must be between 500 and 5000.';
        }

        const marginPercent = Number(formData.marginPercent);
        if (!Number.isFinite(marginPercent) || marginPercent < 0 || marginPercent >= 100) {
            errors.marginPercent = 'Margin must be between 0 and 99.99.';
        }

        const sellingPrice = Number(formData.sellingPriceIQD);
        if (!Number.isFinite(sellingPrice) || sellingPrice <= 0) {
            errors.sellingPriceIQD = 'Selling price must be greater than 0.';
        }

        const feeFields = ['alibabaFeeUSD', 'shippingToIraqIQD', 'additionalFeesIQD', 'unitsSold'];
        feeFields.forEach((field) => {
            const value = Number(formData[field] || 0);
            if (!Number.isFinite(value) || value < 0) {
                errors[field] = 'Value cannot be negative.';
            }
        });

        if (!isHttpUrl(formData.alibabaProductLink)) errors.alibabaProductLink = 'Use a valid URL (http/https).';
        if (!isHttpUrl(formData.alibabaMessageLink)) errors.alibabaMessageLink = 'Use a valid URL (http/https).';
        if (!isHttpUrl(formData.alibabaOrderLink)) errors.alibabaOrderLink = 'Use a valid URL (http/https).';

        if (!editingProduct) {
            if (!formData.initialPurchaseDate) {
                errors.initialPurchaseDate = 'Received date is required.';
            } else if (formData.initialPurchaseDate > todayIso()) {
                errors.initialPurchaseDate = 'Received date cannot be in the future.';
            }
        }

        return errors;
    }, [formData, editingProduct]);

    const hasValidationErrors = Object.keys(validationErrors).length > 0;

    useEffect(() => {
        if (!isOpen) return;
        setHasSubmitAttempted(false);
        setUploadError('');
        setUploadQueue([]);
        setDragActive(false);
    }, [isOpen]);

    const setQueueItem = (id, next) => {
        setUploadQueue((prev) => prev.map((item) => (item.id === id ? { ...item, ...next } : item)));
    };

    const processFiles = async (files) => {
        if (!files.length) return;

        setUploadError('');
        const queueItems = files.map((file) => ({
            id: `${file.name}-${file.size}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            name: file.name,
            size: file.size,
            progress: 0,
            status: 'queued',
            message: ''
        }));
        setUploadQueue((prev) => [...prev, ...queueItems]);

        for (const [index, file] of files.entries()) {
            const queueId = queueItems[index].id;
            if (!SUPPORTED_IMAGE_TYPES.includes(file.type)) {
                setQueueItem(queueId, { status: 'error', message: 'Unsupported file type.' });
                setUploadError('Only JPG, PNG, WEBP, or GIF files are allowed.');
                continue;
            }

            try {
                setQueueItem(queueId, { status: 'processing', progress: 5, message: '' });
                const processed = await compressImageFile(file, MAX_IMAGE_SIZE_BYTES, (progress) => {
                    setQueueItem(queueId, { progress });
                });
                setFormData((prev) => ({ ...prev, images: [...prev.images, processed] }));
                setQueueItem(queueId, { status: 'done', progress: 100 });
            } catch (error) {
                setQueueItem(queueId, { status: 'error', message: error.message || 'Upload failed.' });
                setUploadError(error.message || 'Upload failed.');
            }
        }
    };

    const handleImageInputChange = async (event) => {
        const files = Array.from(event.target.files || []);
        await processFiles(files);
        event.target.value = '';
    };

    const handleDrop = async (event) => {
        event.preventDefault();
        setDragActive(false);
        const files = Array.from(event.dataTransfer.files || []);
        await processFiles(files);
    };

    const handleFormSubmit = (event) => {
        if (hasValidationErrors) {
            event.preventDefault();
            setHasSubmitAttempted(true);
            setUploadError('Please fix the highlighted fields before saving.');
            return;
        }
        handleSubmit(event);
    };

    const hasFieldInput = (field) => {
        const value = formData[field];
        if (value === undefined || value === null) return false;
        if (typeof value === 'string') return value.trim() !== '';
        return true;
    };

    const renderFieldError = (field) => (
        validationErrors[field] && (hasSubmitAttempted || hasFieldInput(field)) ? (
            <p className="mt-1 text-[11px] font-semibold text-red-500">{validationErrors[field]}</p>
        ) : null
    );

    if (!isOpen) return null;

    return (
                <div className="fixed inset-0 z-[100] flex items-start justify-center bg-black/50 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto custom-scrollbar">
                    <div
                        ref={dialogRef}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="product-modal-title"
                        tabIndex={-1}
                        className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-2xl my-4 sm:my-8 animate-in fade-in zoom-in duration-200 flex flex-col relative max-h-[90vh]"
                    >
                        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-white dark:bg-slate-800 sticky top-0 z-20 rounded-t-3xl">
                            <div>
                                <h3 id="product-modal-title" className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                                    {editingProduct ? t('products.editProduct') : t('products.addProduct')}
                                </h3>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{editingProduct ? `${t('products.sku')}: ${formData.sku}` : t('products.fillInfo')}</p>
                            </div>
                            <button type="button" onClick={() => onClose()} aria-label={t('common.close') || 'Close'} className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-all">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <form id="productForm" onSubmit={handleFormSubmit} className="overflow-y-auto p-6 space-y-8 custom-scrollbar relative">
                            {(uploadError || (hasSubmitAttempted && hasValidationErrors)) && (
                                <div className="p-3 rounded-xl border border-red-200 bg-red-50 text-red-700 text-xs font-semibold">
                                    {uploadError || 'Please resolve form validation errors to continue.'}
                                </div>
                            )}

                            {/* Section 1: Basic Information */}
                            <section>
                                <h4 className="text-[11px] font-bold text-[var(--brand-color)] uppercase tracking-widest mb-4 border-b border-indigo-50 dark:border-indigo-900/30 pb-2">{t('products.form.basicInfo')}</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2 md:col-span-1">
                                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">{t('products.form.productName')}</label>
                                        <input required name="name" aria-invalid={Boolean(validationErrors.name)} value={formData.name} onChange={handleInputChange} className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-[var(--brand-color)]/20 outline-none dark:text-white transition-all" placeholder={t('products.form.productNamePlaceholder')} />
                                        {renderFieldError('name')}
                                    </div>
                                    <div className="col-span-2 md:col-span-1">
                                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">{t('products.form.sku')}</label>
                                        <input required name="sku" aria-invalid={Boolean(validationErrors.sku)} value={formData.sku} onChange={handleInputChange} className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-[var(--brand-color)]/20 outline-none dark:text-white transition-all" placeholder={t('products.form.skuPlaceholder')} />
                                        {renderFieldError('sku')}
                                    </div>
                                    <div className="col-span-2 md:col-span-1">
                                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">{t('products.form.category')}</label>
                                        <SearchableSelect
                                            title={t('products.form.selectCategory')}
                                            options={categories.map(cat => ({ value: cat, label: cat }))}
                                            selectedValue={formData.category}
                                            onChange={(val) => setFormData(prev => ({ ...prev, category: val }))}
                                            icon={Package}
                                            showSearch={false}
                                            customAction={{
                                                label: t('products.form.createCategory'),
                                                icon: Plus,
                                                onClick: () => onOpenCategoryManager?.()
                                            }}
                                        />
                                        {renderFieldError('category')}
                                    </div>
                                    <div className="col-span-2 md:col-span-1">
                                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">{t('products.form.stock')}</label>
                                        <div className="relative">
                                            <input required type="number" name="stock" aria-invalid={Boolean(validationErrors.stock)} value={formData.stock} onChange={handleInputChange} className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-[var(--brand-color)]/20 outline-none dark:text-white transition-all shadow-sm" />
                                            <div className="absolute end-3 top-1/2 -translate-y-1/2">
                                                <StatusBadge status={getAutoStatus(formData.stock)} />
                                            </div>
                                        </div>
                                        {renderFieldError('stock')}
                                    </div>
                                    {!editingProduct && (
                                        <div className="col-span-2 md:col-span-1">
                                            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">
                                                {t('products.form.initialReceivedDate')}
                                            </label>
                                            <input
                                                type="date"
                                                name="initialPurchaseDate"
                                                max={todayIso()}
                                                value={formData.initialPurchaseDate || ''}
                                                onChange={handleInputChange}
                                                className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-[var(--brand-color)]/20 outline-none dark:text-white transition-all shadow-sm"
                                            />
                                            {renderFieldError('initialPurchaseDate')}
                                        </div>
                                    )}
                                </div>
                            </section>

                            {/* Section 2: Alibaba Information */}
                            <section>
                                <h4 className="text-[11px] font-bold text-[var(--brand-color)] uppercase tracking-widest mb-4 border-b border-indigo-50 dark:border-indigo-900/30 pb-2">{t('products.form.alibabaSourcing')}</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2">
                                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">{t('products.form.productLink')}</label>
                                        <input name="alibabaProductLink" aria-invalid={Boolean(validationErrors.alibabaProductLink)} value={formData.alibabaProductLink} onChange={handleInputChange} className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[var(--brand-color)]/20 transition-all font-medium" placeholder="https://..." />
                                        {renderFieldError('alibabaProductLink')}
                                    </div>
                                    <div className="col-span-2 md:col-span-1">
                                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">{t('products.form.messageLink')}</label>
                                        <input name="alibabaMessageLink" aria-invalid={Boolean(validationErrors.alibabaMessageLink)} value={formData.alibabaMessageLink} onChange={handleInputChange} className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[var(--brand-color)]/20 transition-all font-medium" placeholder="https://..." />
                                        {renderFieldError('alibabaMessageLink')}
                                    </div>
                                    <div className="col-span-2 md:col-span-1">
                                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">{t('products.form.orderLink')}</label>
                                        <input name="alibabaOrderLink" aria-invalid={Boolean(validationErrors.alibabaOrderLink)} value={formData.alibabaOrderLink} onChange={handleInputChange} className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[var(--brand-color)]/20 transition-all font-medium" placeholder="https://..." />
                                        {renderFieldError('alibabaOrderLink')}
                                    </div>
                                    <div className="col-span-2 md:col-span-1">
                                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">{t('products.form.alibabaOrderNo')}</label>
                                        <input name="alibabaOrderNumber" value={formData.alibabaOrderNumber} onChange={handleInputChange} className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[var(--brand-color)]/20 transition-all font-bold shadow-sm" placeholder="1234..." />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">{t('products.form.alibabaNote')}</label>
                                        <div className="relative">
                                            <MessageSquare className="absolute start-3 top-3 w-4 h-4 text-slate-400" />
                                            <textarea
                                                name="alibabaNote"
                                                value={formData.alibabaNote}
                                                onChange={handleInputChange}
                                                className="w-full ps-10 pe-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[var(--brand-color)]/20 transition-all font-medium min-h-[80px] resize-none"
                                                placeholder={t('products.form.notePlaceholder')}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* Section 3: Cost & Pricing */}
                            <section>
                                <h4 className="text-[11px] font-bold text-[var(--brand-color)] uppercase tracking-widest mb-4 border-b border-indigo-50 dark:border-indigo-900/30 pb-2">{t('products.form.costAndPricing')}</h4>
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">{t('products.form.unitPrice')}</label>
                                        <div className="relative">
                                            <span className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                                            <input required type="number" step="0.01" name="unitPriceUSD" aria-invalid={Boolean(validationErrors.unitPriceUSD)} value={formData.unitPriceUSD} onChange={handleInputChange} className="w-full ps-7 p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-[var(--brand-color)]/20 outline-none font-bold" />
                                        </div>
                                        {renderFieldError('unitPriceUSD')}
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">{t('products.form.alibabaFee')}</label>
                                        <div className="relative">
                                            <span className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                                            <input type="number" step="0.01" name="alibabaFeeUSD" aria-invalid={Boolean(validationErrors.alibabaFeeUSD)} value={formData.alibabaFeeUSD} onChange={handleInputChange} className="w-full ps-7 p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-[var(--brand-color)]/20 outline-none font-bold" />
                                        </div>
                                        {renderFieldError('alibabaFeeUSD')}
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">{t('products.form.exchangeRate')}</label>
                                        <input required type="number" name="exchangeRate" aria-invalid={Boolean(validationErrors.exchangeRate)} value={formData.exchangeRate} onChange={handleInputChange} className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-[var(--brand-color)]/20 outline-none font-bold" />
                                        {renderFieldError('exchangeRate')}
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">{t('products.form.margin')}</label>
                                        <div className="relative">
                                            <input required type="number" name="marginPercent" aria-invalid={Boolean(validationErrors.marginPercent)} value={formData.marginPercent} onChange={handleInputChange} className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-[var(--brand-color)]/20 outline-none font-bold" />
                                            <span className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400">%</span>
                                        </div>
                                        {renderFieldError('marginPercent')}
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">{t('products.form.shippingIQD')}</label>
                                        <input type="number" name="shippingToIraqIQD" aria-invalid={Boolean(validationErrors.shippingToIraqIQD)} value={formData.shippingToIraqIQD} onChange={handleInputChange} className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-[var(--brand-color)]/20 outline-none" />
                                        {renderFieldError('shippingToIraqIQD')}
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">{t('products.form.otherFeesIQD')}</label>
                                        <input type="number" name="additionalFeesIQD" aria-invalid={Boolean(validationErrors.additionalFeesIQD)} value={formData.additionalFeesIQD} onChange={handleInputChange} className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-[var(--brand-color)]/20 outline-none" />
                                        {renderFieldError('additionalFeesIQD')}
                                    </div>

                                    <div className="col-span-2 grid grid-cols-2 gap-3">
                                        <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800">
                                            <span className="block text-[10px] font-bold text-slate-400 uppercase">{t('products.form.costTotal')}</span>
                                            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">IQD {(formData.costPriceIQD_total || 0).toLocaleString()}</span>
                                        </div>
                                        <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800">
                                            <span className="block text-[10px] font-bold text-slate-400 uppercase">{t('products.form.costPerUnit')}</span>
                                            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">IQD {(formData.costPriceIQD_perUnit || 0).toLocaleString()}</span>
                                        </div>
                                    </div>

                                    <div className="col-span-full grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">{t('products.form.recommendedPrice')}</span>
                                            <span className="text-xl font-bold text-slate-600 dark:text-slate-400">IQD {(formData.recommendedSellingPriceIQD_perUnit || 0).toLocaleString()}</span>
                                        </div>

                                        <div className={`p-4 rounded-2xl border-2 transition-all ${formData.isSellingPriceOverridden ? 'bg-orange-50 border-orange-200 dark:bg-orange-900/10 dark:border-orange-800/50' : 'bg-[var(--brand-color)]/5 border-[var(--brand-color)]/20'}`}>
                                            <div className="flex justify-between items-start mb-1">
                                                <span className="text-[10px] font-bold text-[var(--brand-color)] uppercase tracking-wider">{t('products.form.finalPrice')}</span>
                                                {formData.isSellingPriceOverridden && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setFormData(prev => ({ ...prev, isSellingPriceOverridden: false }))}
                                                        className="text-[10px] font-bold text-orange-600 hover:underline flex items-center gap-1"
                                                    >
                                                        <X className="w-3 h-3" /> {t('common.reset')}
                                                    </button>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-lg font-black text-[var(--brand-color)]">IQD</span>
                                                <input
                                                    type="number"
                                                    name="sellingPriceIQD"
                                                    aria-invalid={Boolean(validationErrors.sellingPriceIQD)}
                                                    value={formData.sellingPriceIQD}
                                                    onChange={handleInputChange}
                                                    onBlur={handlePriceBlur}
                                                    className="w-full bg-transparent border-b-2 border-[var(--brand-color)] animate-pulse-slow outline-none text-2xl font-black text-[var(--brand-color)]"
                                                />
                                            </div>
                                            <p className="text-[10px] text-slate-400 mt-1 font-medium italic">
                                                {formData.isSellingPriceOverridden ? t('products.form.manualOverride') : t('products.form.autoCalculated')}
                                            </p>
                                            {renderFieldError('sellingPriceIQD')}
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* Section 4: Profit Analysis */}
                            <section>
                                <h4 className="text-[11px] font-bold text-[var(--brand-color)] uppercase tracking-widest mb-4 border-b border-indigo-50 dark:border-indigo-900/30 pb-2">{t('products.form.profitAnalysis')}</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* IQD Analysis */}
                                    <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                                        <div className="flex items-center gap-2 mb-4">
                                            <div className="w-2 h-4 bg-green-500 rounded-full"></div>
                                            <span className="text-xs font-black uppercase tracking-widest text-slate-400">{t('products.form.iqdAnalysis')}</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <span className="block text-[10px] font-bold text-slate-400 uppercase mb-1">{t('products.form.profitPerUnit')}</span>
                                                <span className={`text-lg font-black ${formData.profitPerUnitIQD >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
                                                    {formData.profitPerUnitIQD >= 0 ? '+' : '-'} IQD {Math.abs(formData.profitPerUnitIQD || 0).toLocaleString()}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="block text-[10px] font-bold text-slate-400 uppercase mb-1">{t('products.form.totalProfit')}</span>
                                                <span className={`text-lg font-black ${formData.totalProfitIQD >= 0 ? 'text-green-500' : 'text-red-400'}`}>
                                                    IQD {(formData.totalProfitIQD || 0).toLocaleString()}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* USD Analysis */}
                                    <div className="p-4 bg-slate-900 dark:bg-slate-950 rounded-2xl border border-slate-800">
                                        <div className="flex items-center gap-2 mb-4">
                                            <div className="w-2 h-4 bg-blue-500 rounded-full"></div>
                                            <span className="text-xs font-black uppercase tracking-widest text-slate-500">{t('products.form.usdAnalysis')}</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <span className="block text-[10px] font-bold text-slate-500 uppercase mb-1">{t('products.form.profitPerUnit')}</span>
                                                <span className={`text-lg font-black ${formData.profitPerUnitUSD >= 0 ? 'text-blue-500' : 'text-red-400'}`}>
                                                    {formData.profitPerUnitUSD >= 0 ? '+' : '-'} ${Math.abs(formData.profitPerUnitUSD || 0).toFixed(2)}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="block text-[10px] font-bold text-slate-500 uppercase mb-1">{t('products.form.totalProfit')}</span>
                                                <span className={`text-lg font-black ${formData.totalProfitUSD >= 0 ? 'text-blue-400' : 'text-red-400'}`}>
                                                    ${(formData.totalProfitUSD || 0).toFixed(2)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Quantity Splitter */}
                                    <div className="col-span-full p-4 bg-white dark:bg-slate-800 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg">
                                                <ShoppingBag className="w-4 h-4 text-slate-500" />
                                            </div>
                                            <div>
                                                <span className="block text-[10px] font-bold text-slate-400 uppercase">{t('products.form.qtyCalculation')}</span>
                                                <span className="text-xs font-medium text-slate-500 italic">{t('products.form.unitsExpected')}</span>
                                            </div>
                                        </div>
                                        <input
                                            type="number"
                                            name="unitsSold"
                                            aria-invalid={Boolean(validationErrors.unitsSold)}
                                            value={formData.unitsSold}
                                            onChange={handleInputChange}
                                            className="w-24 text-right p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none text-base font-black text-accent focus:ring-2 focus:ring-accent/20"
                                        />
                                    </div>
                                    {renderFieldError('unitsSold')}
                                </div>
                            </section>

                            {/* Section 5: Image Gallery Preview */}
                            <section>
                                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-100 dark:border-slate-700 pb-2">{t('products.form.generalInfo')}</h4>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">{t('products.form.description')}</label>
                                        <div className="relative">
                                            <Info className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                                            <textarea
                                                name="description"
                                                value={formData.description}
                                                onChange={handleInputChange}
                                                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[var(--brand-color)]/20 transition-all font-medium min-h-[120px] resize-none"
                                                placeholder={t('products.form.descriptionPlaceholder')}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </section>

                            <section>
                                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-100 dark:border-slate-700 pb-2">{t('products.form.gallery')}</h4>
                                <div
                                    onDragEnter={(event) => {
                                        event.preventDefault();
                                        setDragActive(true);
                                    }}
                                    onDragOver={(event) => {
                                        event.preventDefault();
                                        setDragActive(true);
                                    }}
                                    onDragLeave={(event) => {
                                        event.preventDefault();
                                        if (event.currentTarget.contains(event.relatedTarget)) return;
                                        setDragActive(false);
                                    }}
                                    onDrop={handleDrop}
                                    className={`rounded-2xl border-2 border-dashed p-3 transition-colors ${
                                        dragActive
                                            ? 'border-[var(--brand-color)] bg-[var(--brand-color)]/5'
                                            : 'border-slate-200 dark:border-slate-700'
                                    }`}
                                >
                                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                                        {formData.images.map((img, index) => (
                                            <div key={index} className="relative group aspect-square rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
                                                <ImageWithFallback src={img} alt="Product" className="w-full h-full" imageClassName="w-full h-full object-cover" />
                                                <button type="button" onClick={() => removeImage(index)} className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity transform hover:scale-110">
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ))}

                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            aria-label={t('products.form.addImage')}
                                            className="aspect-square rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center text-slate-400 hover:border-[var(--brand-color)] hover:text-[var(--brand-color)] transition-all hover:bg-slate-50 dark:hover:bg-slate-900 group"
                                        >
                                            <Upload className="w-5 h-5 mb-1 group-hover:scale-110 transition-transform" />
                                            <span className="text-[9px] font-black uppercase text-center px-1 leading-tight">{t('products.form.addImage')}</span>
                                        </button>
                                    </div>

                                    <p className="mt-3 text-[11px] text-slate-500 dark:text-slate-400 font-semibold">
                                        Drag and drop JPG, PNG, WEBP, or GIF images (max 6MB each). Large images are compressed automatically.
                                    </p>

                                    {uploadQueue.some((item) => item.status !== 'done') && (
                                        <div className="mt-3 space-y-2 max-h-32 overflow-y-auto pe-1 custom-scrollbar">
                                            {uploadQueue.filter((item) => item.status !== 'done').map((item) => (
                                                <div key={item.id} className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">{item.name}</p>
                                                        <span className="text-[10px] text-slate-400 shrink-0">{formatBytes(item.size)}</span>
                                                    </div>
                                                    <div className="mt-1 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                                                        <div
                                                            className={`h-full transition-all ${
                                                                item.status === 'error' ? 'bg-red-500' : 'bg-[var(--brand-color)]'
                                                            }`}
                                                            style={{ width: `${item.progress || 0}%` }}
                                                        />
                                                    </div>
                                                    {item.message && (
                                                        <p className="mt-1 text-[10px] font-semibold text-red-500">{item.message}</p>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <input type="file" ref={fileInputRef} className="hidden" onChange={handleImageInputChange} multiple accept={SUPPORTED_IMAGE_TYPES.join(',')} />
                            </section>

                            {/* Added padding to prevent overlap with mobile fixed footer */}
                            <div className="h-28 sm:h-20"></div>
                        </form>

                        {/* Footer actions: fixed on mobile, sticky on larger screens */}
                        <div className="fixed sm:sticky bottom-0 left-2 right-2 sm:left-auto sm:right-auto w-auto sm:w-auto max-w-2xl p-4 sm:p-6 border-t border-slate-100 dark:border-slate-700 flex flex-row justify-end gap-3 bg-white dark:bg-slate-800 rounded-b-3xl sm:rounded-b-2xl shadow-[0_-10px_20px_rgba(0,0,0,0.05)] z-30">
                            <button
                                type="button"
                                onClick={() => onClose()}
                                className="px-4 sm:px-6 py-2.5 text-slate-500 dark:text-slate-400 font-bold hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl transition-all"
                            >
                                {t('common.cancel')}
                            </button>
                            <button
                                type="submit"
                                form="productForm"
                                className="px-5 sm:px-8 py-2.5 text-white font-black rounded-xl transition-all bg-accent shadow-accent active:scale-95 flex items-center justify-center gap-2"
                            >
                                <Save className="w-5 h-5" />
                                {editingProduct ? t('products.update') : t('products.create')}
                            </button>
                        </div>
                    </div>
                </div>
    );
};

export default ProductFormModal;
