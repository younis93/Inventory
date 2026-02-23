import React from 'react';
import { Info, MessageSquare, Package, Plus, Save, ShoppingBag, Upload, X } from 'lucide-react';
import ImageWithFallback from '../common/ImageWithFallback';
import SearchableSelect from '../SearchableSelect';

const getAutoStatus = (stock) => {
    const value = Number(stock || 0);
    if (value <= 0) return 'Out of Stock';
    if (value < 10) return 'Low Stock';
    return 'In Stock';
};

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
    isAddingNewCategory,
    setIsAddingNewCategory,
    newCategoryName,
    setNewCategoryName,
    handleSaveNewCategory,
    fileInputRef,
    handleImageUpload,
    removeImage,
    onOpenCategoryManager,
    onClose
}) => {
    if (!isOpen) return null;

    return (
                <div className="fixed inset-0 z-[100] flex items-start justify-center bg-black/50 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto">
                    <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-2xl my-4 sm:my-8 animate-in fade-in zoom-in duration-200 flex flex-col relative max-h-[90vh]">
                        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-white dark:bg-slate-800 sticky top-0 z-20 rounded-t-3xl">
                            <div>
                                <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                                    {editingProduct ? t('products.editProduct') : t('products.addProduct')}
                                </h3>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{editingProduct ? `${t('products.sku')}: ${formData.sku}` : t('products.fillInfo')}</p>
                            </div>
                            <button onClick={() => onClose()} className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-all">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <form id="productForm" onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-8 custom-scrollbar relative">

                            {/* Section 1: Basic Information */}
                            <section>
                                <h4 className="text-[11px] font-bold text-[var(--brand-color)] uppercase tracking-widest mb-4 border-b border-indigo-50 dark:border-indigo-900/30 pb-2">{t('products.form.basicInfo')}</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2 md:col-span-1">
                                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">{t('products.form.productName')}</label>
                                        <input required name="name" value={formData.name} onChange={handleInputChange} className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-[var(--brand-color)]/20 outline-none dark:text-white transition-all" placeholder={t('products.form.productNamePlaceholder')} />
                                    </div>
                                    <div className="col-span-2 md:col-span-1">
                                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">{t('products.form.sku')}</label>
                                        <input required name="sku" value={formData.sku} onChange={handleInputChange} className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-[var(--brand-color)]/20 outline-none dark:text-white transition-all" placeholder={t('products.form.skuPlaceholder')} />
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
                                    </div>
                                    <div className="col-span-2 md:col-span-1">
                                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">{t('products.form.stock')}</label>
                                        <div className="relative">
                                            <input required type="number" name="stock" value={formData.stock} onChange={handleInputChange} className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-[var(--brand-color)]/20 outline-none dark:text-white transition-all shadow-sm" />
                                            <div className="absolute end-3 top-1/2 -translate-y-1/2">
                                                <StatusBadge status={getAutoStatus(formData.stock)} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* Section 2: Alibaba Information */}
                            <section>
                                <h4 className="text-[11px] font-bold text-[var(--brand-color)] uppercase tracking-widest mb-4 border-b border-indigo-50 dark:border-indigo-900/30 pb-2">{t('products.form.alibabaSourcing')}</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2">
                                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">{t('products.form.productLink')}</label>
                                        <input name="alibabaProductLink" value={formData.alibabaProductLink} onChange={handleInputChange} className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[var(--brand-color)]/20 transition-all font-medium" placeholder="https://..." />
                                    </div>
                                    <div className="col-span-2 md:col-span-1">
                                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">{t('products.form.messageLink')}</label>
                                        <input name="alibabaMessageLink" value={formData.alibabaMessageLink} onChange={handleInputChange} className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[var(--brand-color)]/20 transition-all font-medium" placeholder="https://..." />
                                    </div>
                                    <div className="col-span-2 md:col-span-1">
                                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">{t('products.form.orderLink')}</label>
                                        <input name="alibabaOrderLink" value={formData.alibabaOrderLink} onChange={handleInputChange} className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[var(--brand-color)]/20 transition-all font-medium" placeholder="https://..." />
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
                                            <input required type="number" step="0.01" name="unitPriceUSD" value={formData.unitPriceUSD} onChange={handleInputChange} className="w-full ps-7 p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-[var(--brand-color)]/20 outline-none font-bold" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">{t('products.form.alibabaFee')}</label>
                                        <div className="relative">
                                            <span className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                                            <input type="number" step="0.01" name="alibabaFeeUSD" value={formData.alibabaFeeUSD} onChange={handleInputChange} className="w-full ps-7 p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-[var(--brand-color)]/20 outline-none font-bold" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">{t('products.form.exchangeRate')}</label>
                                        <input required type="number" name="exchangeRate" value={formData.exchangeRate} onChange={handleInputChange} className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-[var(--brand-color)]/20 outline-none font-bold" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">{t('products.form.margin')}</label>
                                        <div className="relative">
                                            <input required type="number" name="marginPercent" value={formData.marginPercent} onChange={handleInputChange} className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-[var(--brand-color)]/20 outline-none font-bold" />
                                            <span className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400">%</span>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">{t('products.form.shippingIQD')}</label>
                                        <input type="number" name="shippingToIraqIQD" value={formData.shippingToIraqIQD} onChange={handleInputChange} className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-[var(--brand-color)]/20 outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">{t('products.form.otherFeesIQD')}</label>
                                        <input type="number" name="additionalFeesIQD" value={formData.additionalFeesIQD} onChange={handleInputChange} className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-[var(--brand-color)]/20 outline-none" />
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
                                                    value={formData.sellingPriceIQD}
                                                    onChange={handleInputChange}
                                                    onBlur={handlePriceBlur}
                                                    className="w-full bg-transparent border-b-2 border-[var(--brand-color)] animate-pulse-slow outline-none text-2xl font-black text-[var(--brand-color)]"
                                                />
                                            </div>
                                            <p className="text-[10px] text-slate-400 mt-1 font-medium italic">
                                                {formData.isSellingPriceOverridden ? t('products.form.manualOverride') : t('products.form.autoCalculated')}
                                            </p>
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
                                            value={formData.unitsSold}
                                            onChange={handleInputChange}
                                            className="w-24 text-right p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none text-base font-black text-accent focus:ring-2 focus:ring-accent/20"
                                        />
                                    </div>
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
                                <div className="grid grid-cols-5 gap-2">
                                    {formData.images.map((img, index) => (
                                        <div key={index} className="relative group aspect-square rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 group">
                                            <ImageWithFallback src={img} alt="Product" className="w-full h-full" imageClassName="w-full h-full object-cover" />
                                            <button type="button" onClick={() => removeImage(index)} className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity transform hover:scale-110">
                                                <X className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ))}
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="aspect-square rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center text-slate-400 hover:border-[var(--brand-color)] hover:text-[var(--brand-color)] transition-all hover:bg-slate-50 dark:hover:bg-slate-900 group"
                                    >
                                        <Upload className="w-5 h-5 mb-1 group-hover:scale-110 transition-transform" />
                                        <span className="text-[9px] font-black uppercase">{t('products.form.addImage')}</span>
                                    </button>
                                </div>
                                <input type="file" ref={fileInputRef} className="hidden" onChange={handleImageUpload} multiple accept="image/*" />
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
