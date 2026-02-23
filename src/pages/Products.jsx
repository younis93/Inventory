import React, { useState, useMemo, useRef, useEffect } from 'react';
import Layout from '../components/Layout';
import { Search, Plus, Filter, Edit, Trash2, Image as ImageIcon, Download, Package, ShoppingBag } from 'lucide-react';
import { useInventory, useProducts } from '../context/InventoryContext';
import { useTranslation } from 'react-i18next';
import CategoryManagerModal from '../components/CategoryManagerModal';
import FilterDropdown from '../components/FilterDropdown';
import ProductImageModal from '../components/ProductImageModal';
import ProductFormModal from '../components/products/ProductFormModal';
import RowLimitDropdown from '../components/RowLimitDropdown';

import { exportProductsToCSV } from '../utils/CSVExportUtil';
import ImageWithFallback from '../components/common/ImageWithFallback';
import Skeleton from '../components/common/Skeleton';
import DeleteConfirmModal from '../components/common/DeleteConfirmModal';

const getAutoStatus = (stock) => {
    const s = Number(stock);
    if (s <= 0) return 'Out of Stock';
    if (s < 10) return 'Low Stock';
    return 'In Stock';
};

const roundToNearest500 = (num) => Math.round(num / 500) * 500;

const STATUS_OPTIONS = ['In Stock', 'Low Stock', 'Out of Stock'];

const StatusBadge = ({ status }) => {
    const { t } = useTranslation();
    const getStatusColor = (status) => {
        switch (status) {
            case 'In Stock': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400';
            case 'Low Stock': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
            case 'Out of Stock': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
            default: return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200';
        }
    };

    const getTranslatedStatus = (status) => {
        switch (status) {
            case 'In Stock': return t('products.stockStatus.instock');
            case 'Low Stock': return t('products.stockStatus.lowstock');
            case 'Out of Stock': return t('products.stockStatus.outofstock');
            default: return status;
        }
    };

    return (
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${getStatusColor(status)}`}>
            {getTranslatedStatus(status)}
        </span>
    );
};

const Products = () => {
    const { t } = useTranslation();
    const { products, categories, addProduct, updateProduct, deleteProduct, addCategory, updateCategory, deleteCategory } = useProducts();
    const { formatCurrency, loading, brand, addToast, appearance, setIsModalOpen: setGlobalModalOpen } = useInventory();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategories, setSelectedCategories] = useState([]);
    const [selectedStatuses, setSelectedStatuses] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);
    const [isImageModalOpen, setIsImageModalOpen] = useState(false);

    const [displayLimit, setDisplayLimit] = useState(100);
    const [editingProduct, setEditingProduct] = useState(null);
    const [editingProductForImage, setEditingProductForImage] = useState(null);
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });
    const fileInputRef = useRef(null);

    // New delete confirmation state
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [productToDelete, setProductToDelete] = useState(null);

    // Sync to global modal state
    useEffect(() => {
        setGlobalModalOpen(isModalOpen || isCategoryManagerOpen || isImageModalOpen || isDeleteModalOpen);
        return () => setGlobalModalOpen(false);
    }, [isModalOpen, isCategoryManagerOpen, isImageModalOpen, isDeleteModalOpen, setGlobalModalOpen]);

    // Form State
    const initialFormState = {
        name: '',
        sku: '',
        category: '',
        unitPrice: '', // Keep for compatibility if needed, but we'll use unitPriceUSD
        price: '',     // Keep for compatibility, but we'll use sellingPriceIQD
        stock: '',
        status: 'In Stock',
        images: [],
        // New Alibaba Fields
        alibabaProductLink: '',
        alibabaMessageLink: '',
        alibabaOrderLink: '',
        alibabaOrderNumber: '',
        // New Pricing Fields
        unitPriceUSD: '',
        exchangeRate: '1380', // Default
        unitPriceIQD: 0,
        additionalFeesIQD: '',
        shippingToIraqIQD: '',
        marginPercent: '',
        sellingPriceIQD: 0,
        profitPerUnitIQD: 0,
        unitsSold: 0,
        totalProfitIQD: 0,
        alibabaFeeUSD: '',
        isSellingPriceOverridden: false,
        costPriceIQD_total: 0,
        costPriceIQD_perUnit: 0,
        recommendedSellingPriceIQD_perUnit: 0,
        alibabaNote: '',
        description: '',
        profitPerUnitUSD: 0,
        totalProfitUSD: 0
    };
    const [formData, setFormData] = useState(initialFormState);

    // Filter Options
    const categoryOptions = useMemo(() => {
        const counts = {};
        products.forEach(p => {
            if (p.category) counts[p.category] = (counts[p.category] || 0) + 1;
        });
        return categories.map(c => ({
            value: c,
            label: c,
            count: counts[c] || 0
        })).sort((a, b) => b.count - a.count);
    }, [categories, products]);

    const statusOptions = useMemo(() => {
        const counts = {};
        products.forEach(p => {
            if (p.status) counts[p.status] = (counts[p.status] || 0) + 1;
        });
        return STATUS_OPTIONS.map(s => ({
            value: s,
            label: t(`products.stockStatus.${s.replace(/\s/g, '').toLowerCase()}`), // Translate status options
            count: counts[s] || 0
        }));
    }, [products, t]);

    // Sorting Logic
    const sortedProducts = useMemo(() => {
        let sortableProducts = [...products];
        if (sortConfig.key) {
            sortableProducts.sort((a, b) => {
                let valA = a[sortConfig.key];
                let valB = b[sortConfig.key];

                // Handle Currency/Numbers properly
                if (typeof valA === 'string') valA = valA.toLowerCase();
                if (typeof valB === 'string') valB = valB.toLowerCase();

                if (valA < valB) return sortConfig.direction === 'ascending' ? -1 : 1;
                if (valA > valB) return sortConfig.direction === 'ascending' ? 1 : -1;
                return 0;
            });
        }
        return sortableProducts;
    }, [products, sortConfig]);

    const allFilteredProducts = sortedProducts.filter(product => {
        const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            product.sku.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = selectedCategories.length === 0 || selectedCategories.includes(product.category);
        const matchesStatus = selectedStatuses.length === 0 || selectedStatuses.includes(product.status);
        return matchesSearch && matchesCategory && matchesStatus;
    });

    const filteredProducts = allFilteredProducts.slice(0, displayLimit);

    const requestSort = (key) => {
        let direction = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    // Auto-calculate Pricing Fields
    useEffect(() => {
        const unitPriceUSD = parseFloat(formData.unitPriceUSD) || 0;
        const alibabaFeeUSD = parseFloat(formData.alibabaFeeUSD) || 0;
        const quantity = parseInt(formData.stock) || 0;
        const exchangeRate = parseFloat(formData.exchangeRate) || 1320;
        const shippingIQD = parseFloat(formData.shippingToIraqIQD) || 0;
        const otherFeesIQD = parseFloat(formData.additionalFeesIQD) || 0;
        const marginPercent = parseFloat(formData.marginPercent) || 0;
        const unitsSold = parseInt(formData.unitsSold) || 0;

        // 1. Per Unit USD Cost
        const costUSD_perUnit = unitPriceUSD + alibabaFeeUSD;
        const totalCostUSD = costUSD_perUnit * quantity;

        // 2. Total Cost Price (IQD)
        const costPriceIQD_total = (totalCostUSD * exchangeRate) + shippingIQD + otherFeesIQD;

        // 3. Cost per Unit (IQD)
        const costPriceIQD_perUnit = quantity > 0 ? costPriceIQD_total / quantity : 0;

        // 4. Recommended Selling Price per Unit (IQD)
        const recommendedSellingPriceIQD_perUnit_raw = costPriceIQD_perUnit * (1 + marginPercent / 100);
        const recommendedSellingPriceIQD_perUnit = roundToNearest500(recommendedSellingPriceIQD_perUnit_raw);

        setFormData(prev => {
            let nextSellingPrice = prev.sellingPriceIQD;

            // If not overridden, selling price follows recommended
            if (!prev.isSellingPriceOverridden) {
                nextSellingPrice = recommendedSellingPriceIQD_perUnit;
            }

            // Calculate profit IQD
            const profitPerUnitIQD = (parseFloat(nextSellingPrice) || 0) - costPriceIQD_perUnit;
            const totalProfitIQD = profitPerUnitIQD * unitsSold;

            // Calculate profit USD
            const profitPerUnitUSD = exchangeRate > 0 ? profitPerUnitIQD / exchangeRate : 0;
            const totalProfitUSD = profitPerUnitUSD * unitsSold;

            // Check if values actually changed to avoid infinite loop
            if (
                prev.costPriceIQD_total === costPriceIQD_total &&
                prev.costPriceIQD_perUnit === costPriceIQD_perUnit &&
                prev.recommendedSellingPriceIQD_perUnit === recommendedSellingPriceIQD_perUnit &&
                prev.sellingPriceIQD === nextSellingPrice &&
                prev.profitPerUnitIQD === profitPerUnitIQD &&
                prev.totalProfitIQD === totalProfitIQD &&
                prev.profitPerUnitUSD === profitPerUnitUSD &&
                prev.totalProfitUSD === totalProfitUSD
            ) return prev;

            return {
                ...prev,
                costPriceIQD_total,
                costPriceIQD_perUnit,
                recommendedSellingPriceIQD_perUnit,
                sellingPriceIQD: nextSellingPrice,
                profitPerUnitIQD,
                totalProfitIQD,
                profitPerUnitUSD,
                totalProfitUSD,
                // Legacy support
                unitPrice: unitPriceUSD,
                price: nextSellingPrice
            };
        });
    }, [
        formData.unitPriceUSD,
        formData.alibabaFeeUSD,
        formData.stock,
        formData.exchangeRate,
        formData.shippingToIraqIQD,
        formData.additionalFeesIQD,
        formData.marginPercent,
        formData.unitsSold,
        formData.isSellingPriceOverridden
    ]);

    // Modal & Form Handlers
    const openAddModal = () => {
        setEditingProduct(null);
        setFormData(initialFormState);
        setIsModalOpen(true);
    };

    const openEditModal = (product) => {
        setEditingProduct(product);
        setFormData({
            ...initialFormState, // Fill with defaults first
            ...product,
            images: product.images || []
        });
        setIsModalOpen(true);
    };

    const handleDelete = (id) => {
        setProductToDelete(id);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = () => {
        if (productToDelete) {
            deleteProduct(productToDelete);
            setIsDeleteModalOpen(false);
            setProductToDelete(null);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        if (name === 'sellingPriceIQD') {
            // Keep raw value for typing, but set override flag
            const val = value === '' ? '' : parseFloat(value);
            setFormData(prev => ({
                ...prev,
                sellingPriceIQD: val,
                isSellingPriceOverridden: true
            }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handlePriceBlur = () => {
        setFormData(prev => {
            if (!prev.isSellingPriceOverridden) return prev;
            const roundedVal = roundToNearest500(parseFloat(prev.sellingPriceIQD) || 0);
            const cost = prev.costPriceIQD_perUnit;
            const newMargin = cost > 0 ? ((roundedVal / cost) - 1) * 100 : 0;
            return {
                ...prev,
                sellingPriceIQD: roundedVal,
                marginPercent: newMargin.toFixed(2)
            };
        });
    };

    const removeImage = (index) => {
        const newImages = formData.images.filter((_, i) => i !== index);
        setFormData(prev => ({ ...prev, images: newImages }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        // Final validation for margin
        if (parseFloat(formData.marginPercent) >= 100) {
            addToast(t('products.marginTooHigh'), "error");
            return;
        }

        const productData = {
            ...formData,
            // Ensure numeric fields are correctly typed
            unitPriceUSD: parseFloat(formData.unitPriceUSD) || 0,
            alibabaFeeUSD: parseFloat(formData.alibabaFeeUSD) || 0,
            exchangeRate: parseFloat(formData.exchangeRate) || 1380,
            additionalFeesIQD: parseFloat(formData.additionalFeesIQD) || 0,
            shippingToIraqIQD: parseFloat(formData.shippingToIraqIQD) || 0,
            marginPercent: parseFloat(formData.marginPercent) || 0,
            unitsSold: parseInt(formData.unitsSold) || 0,
            stock: parseInt(formData.stock) || 0,
            status: getAutoStatus(formData.stock),
            // Legacy/compatibility fields
            unitPrice: parseFloat(formData.unitPriceUSD) || 0,
            price: formData.sellingPriceIQD || 0,
            images: formData.images || []
        };

        if (editingProduct) {
            updateProduct({ ...productData, _id: editingProduct._id });
        } else {
            addProduct(productData);
        }
        setIsModalOpen(false);
    };

    const SortableHeader = ({ column, label, border = false }) => {
        const isActive = sortConfig.key === column;
        return (
            <th
                onClick={() => requestSort(column)}
                className={`px-6 py-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors select-none ${border ? 'border-s dark:border-slate-700' : ''}`}
            >
                <div className="flex items-center gap-2">
                    {label}
                    {isActive && (
                        <span className="text-[var(--brand-color)] font-bold">
                            {sortConfig.direction === 'ascending' ? '↑' : '↓'}
                        </span>
                    )}
                </div>
            </th>
        );
    };

    return (
        <Layout title={t('products.title')}>
            {/* Unified Actions Bar - Based on Orders template */}
            <div className="flex flex-col gap-4 mb-8 bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                {/* Top Row: Add Button + Export | Clear Filters Button + Count */}
                <div className="flex gap-3 w-full items-center justify-between flex-wrap">
                    <div className="flex gap-2 sm:gap-3 items-center w-full sm:w-auto flex-nowrap">
                        <button
                            onClick={openAddModal}
                            className="flex-1 sm:flex-none min-w-0 flex items-center justify-center gap-1 sm:gap-2 px-2.5 sm:px-6 py-2.5 text-white rounded-xl font-bold text-[13px] sm:text-base transition-all bg-accent shadow-accent hover:brightness-110 active:scale-95"
                        >
                            <Plus className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                            <span className="truncate">{t('products.addProduct')}</span>
                        </button>

                        <button
                            onClick={() => {
                                if (filteredProducts.length === 0) return addToast(t('common.noDataToExport'), "info");
                                exportProductsToCSV(filteredProducts);
                            }}
                            className="flex-1 sm:flex-none min-w-0 flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 bg-green-600 text-white rounded-xl font-bold text-[13px] sm:text-base transition-all shadow-lg hover:bg-green-700 active:scale-95"
                        >
                            <Download className="w-5 h-5" />
                            <span className="truncate sm:hidden">CSV</span>
                            <span className="truncate hidden sm:inline">{t('common.exportCSV')}</span>
                        </button>

                        <button
                            onClick={() => setIsCategoryManagerOpen(true)}
                            className="hidden sm:flex flex-1 sm:flex-none min-w-0 items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-6 py-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 rounded-xl font-bold text-sm transition-all border border-slate-200 dark:border-slate-700 active:scale-95"
                        >
                            <Filter className="w-4 h-4" />
                            <span className="truncate">{t('products.manageCategories')}</span>
                        </button>

                        <button
                            onClick={() => {
                                if (!(selectedCategories.length > 0 || selectedStatuses.length > 0 || searchTerm)) return;
                                setSearchTerm('');
                                setSelectedCategories([]);
                                setSelectedStatuses([]);
                            }}
                            className={`sm:hidden flex-1 min-w-0 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl font-bold text-sm transition-all border active:scale-95 ${
                                (selectedCategories.length > 0 || selectedStatuses.length > 0 || searchTerm)
                                    ? 'bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                                    : 'opacity-0 pointer-events-none border-transparent'
                            }`}
                        >
                            <span className="truncate">{t('common.clearFilters')}</span>
                        </button>
                    </div>

                    <div className="flex gap-3 items-center flex-wrap">
                        {/* Clear Filters Button */}
                        {(selectedCategories.length > 0 || selectedStatuses.length > 0 || searchTerm) && (
                            <button
                                onClick={() => {
                                    setSearchTerm('');
                                    setSelectedCategories([]);
                                    setSelectedStatuses([]);
                                }}
                                className="hidden sm:inline-flex px-4 py-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 rounded-xl font-bold text-sm transition-all border border-slate-200 dark:border-slate-700"
                            >
                                {t('common.clearFilters')}
                            </button>
                        )}

                        <button
                            onClick={() => setIsCategoryManagerOpen(true)}
                            className="sm:hidden shrink-0 whitespace-nowrap px-4 py-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 rounded-xl font-bold text-sm transition-all border border-slate-200 dark:border-slate-700 active:scale-95"
                        >
                            {t('products.manageCategories')}
                        </button>

                        <RowLimitDropdown limit={displayLimit} onChange={setDisplayLimit} />

                        {/* Inventory Count */}
                        <div className="flex items-center gap-3 px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800">
                            <ImageIcon className="w-4 h-4 text-slate-400" />
                            <span className="text-sm font-bold text-slate-500">
                                <span className="text-slate-900 dark:text-white">{filteredProducts.length}</span> {t('products.title')}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Filters Row: Search + Category + Status + Row Limit */}
                <div className="flex gap-3 w-full flex-wrap lg:flex-nowrap items-center">
                    {/* Search Input */}
                    <div className="relative order-last w-full sm:order-none sm:min-w-[200px] sm:flex-1 lg:flex-none lg:w-[320px] h-[44px]">
                        <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                            type="text"
                            placeholder={t('products.searchPlaceholder')}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="ps-10 pe-4 py-0 h-full w-full bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl outline-none focus:border-accent/40 focus:ring-4 focus:ring-accent/10 transition-all font-bold text-sm text-slate-700 dark:text-white"
                        />
                    </div>

                    <FilterDropdown
                        title={t('products.categories')}
                        options={categoryOptions}
                        selectedValues={selectedCategories}
                        onChange={setSelectedCategories}
                        icon={Package}
                        showProductCount={true}
                    />

                    <FilterDropdown
                        title={t('products.status')}
                        options={statusOptions}
                        selectedValues={selectedStatuses}
                        onChange={setSelectedStatuses}
                        icon={ShoppingBag}
                        showSearch={false}
                    />
                </div>
            </div>

            {isCategoryManagerOpen && (
                <CategoryManagerModal
                    categories={categories}
                    products={products}
                    onClose={() => setIsCategoryManagerOpen(false)}
                    onAdd={addCategory}
                    onUpdate={updateCategory}
                    onDelete={deleteCategory}
                />
            )}

            {/* Products Table (desktop) and Card list (mobile) */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
                <div className="hidden sm:block overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                <SortableHeader column="name" label={t('products.table.product')} />
                                <SortableHeader column="category" label={t('products.table.category')} />
                                <SortableHeader column="stock" label={t('products.table.stock')} border={true} />
                                <SortableHeader column="sellingPriceIQD" label={t('products.table.price')} border={true} />
                                <SortableHeader column="status" label={t('products.table.status')} border={true} />
                                <th className="px-6 py-4 text-end border-s dark:border-slate-700">{t('common.actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i}>
                                        <td className="px-6 py-4"><div className="flex items-center gap-4"><Skeleton className="w-12 h-12 rounded-xl" /><div className="space-y-2"><Skeleton className="w-24 h-4" /><Skeleton className="w-16 h-3" /></div></div></td>
                                        <td className="px-6 py-4"><Skeleton className="w-20 h-6 rounded-lg" /></td>
                                        <td className="px-6 py-4"><Skeleton className="w-12 h-5" /></td>
                                        <td className="px-6 py-4"><Skeleton className="w-24 h-5" /></td>
                                        <td className="px-6 py-4"><Skeleton className="w-20 h-6 rounded-full" /></td>
                                        <td className="px-6 py-4"><Skeleton className="w-16 h-8 ms-auto rounded-lg" /></td>
                                    </tr>
                                ))
                            ) : filteredProducts.length === 0 ? (
                                <tr><td colSpan="6" className="text-center py-12 text-slate-400">
                                    <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-20" />
                                    <p className="font-bold uppercase tracking-widest text-xs">{t('products.noProducts')}</p>
                                </td></tr>
                            ) : filteredProducts.map((product) => (
                                <tr key={product._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-4">
                                            <div
                                                className="w-12 h-12 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex-shrink-0 cursor-zoom-in hover:brightness-90 transition-all shadow-sm"
                                                onClick={() => {
                                                    setEditingProductForImage(product);
                                                    setIsImageModalOpen(true);
                                                }}
                                            >
                                                <ImageWithFallback
                                                    src={
                                                        product.images && product.images[0]
                                                            ? (typeof product.images[0] === 'string' ? product.images[0] : product.images[0].url)
                                                            : (product.image || 'https://via.placeholder.com/400x400?text=No+Image')
                                                    }
                                                    alt={product.name}
                                                    className="w-full h-full"
                                                />
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-bold text-slate-800 dark:text-white">{product.name}</h4>
                                                <p className="text-xs font-mono text-slate-400 uppercase tracking-tighter">{product.sku}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-bold">{product.category}</span>
                                    </td>
                                    <td className="px-6 py-4 border-s dark:border-slate-700">
                                        <span className="text-sm font-bold text-slate-800 dark:text-white">{product.stock}</span>
                                    </td>
                                    <td className="px-6 py-4 border-s dark:border-slate-700">
                                        <span className="text-sm font-black text-slate-800 dark:text-white">{formatCurrency(product.sellingPriceIQD || product.price || 0)}</span>
                                    </td>
                                    <td className="px-6 py-4 border-s dark:border-slate-700">
                                        <StatusBadge status={getAutoStatus(product.stock)} />
                                    </td>
                                    <td className="px-6 py-4 text-end border-s dark:border-slate-700">
                                        <div className="flex items-center justify-end gap-1">
                                            <button onClick={() => openEditModal(product)} className="p-2 text-slate-400 hover:text-[var(--brand-color)] hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all" title={t('common.edit')}>
                                                <Edit className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => handleDelete(product._id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all" title={t('common.delete')}>
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Mobile: stacked card list for small viewports */}
                <div className="block sm:hidden p-4 space-y-3">
                    {loading ? (
                        Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-4 flex gap-4">
                                <Skeleton className="w-16 h-16 rounded-xl flex-shrink-0" />
                                <div className="flex-1 space-y-3">
                                    <div className="flex justify-between">
                                        <div className="space-y-2"><Skeleton className="w-32 h-4" /><Skeleton className="w-20 h-3" /></div>
                                        <div className="space-y-2"><Skeleton className="w-16 h-4" /><Skeleton className="w-12 h-3" /></div>
                                    </div>
                                    <div className="flex justify-between">
                                        <Skeleton className="w-20 h-3" />
                                        <Skeleton className="w-16 h-8 rounded-lg" />
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : filteredProducts.length === 0 ? (
                        <div className="text-center py-12 text-slate-400">
                            <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-20" />
                            <p className="font-bold uppercase tracking-widest text-xs">{t('products.noProducts')}</p>
                        </div>
                    ) : (
                        filteredProducts.map(product => (
                            <div key={product._id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-4 flex items-start gap-4">
                                <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex-shrink-0">
                                    <ImageWithFallback src={product.images && product.images[0] ? (typeof product.images[0] === 'string' ? product.images[0] : product.images[0].url) : (product.image || 'https://via.placeholder.com/400x400?text=No+Image')} alt={product.name} className="w-full h-full" />
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h4 className="text-sm font-bold text-slate-800 dark:text-white">{product.name}</h4>
                                            <p className="text-xs text-slate-400">{product.sku} • <span className="px-2 py-0.5 rounded text-xs bg-slate-100 dark:bg-slate-700">{product.category}</span></p>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-sm font-black text-slate-800 dark:text-white">{formatCurrency(product.sellingPriceIQD || product.price || 0)}</div>
                                            <div className="text-[10px] text-slate-400">{getAutoStatus(product.stock)}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between mt-3">
                                        <div className="text-[11px] text-slate-600">{t('products.table.stock')}: <span className="font-bold">{product.stock}</span></div>
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => openEditModal(product)} className="p-2 text-slate-400 hover:text-[var(--brand-color)] hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-all" title={t('common.edit')}>
                                                <Edit className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => handleDelete(product._id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all" title={t('common.delete')}>
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            <ProductFormModal
                isOpen={isModalOpen}
                t={t}
                editingProduct={editingProduct}
                formData={formData}
                handleSubmit={handleSubmit}
                handleInputChange={handleInputChange}
                handlePriceBlur={handlePriceBlur}
                setFormData={setFormData}
                categories={categories}
                fileInputRef={fileInputRef}
                removeImage={removeImage}
                onOpenCategoryManager={() => setIsCategoryManagerOpen(true)}
                onClose={() => setIsModalOpen(false)}
            />
            {/* Product Image Viewer Modal */}
            {isImageModalOpen && editingProductForImage && (
                <ProductImageModal
                    product={editingProductForImage}
                    onClose={() => {
                        setIsImageModalOpen(false);
                        setEditingProductForImage(null);
                    }}
                    onSave={async (updatedProduct, stayOpen = false) => {
                        await updateProduct(updatedProduct);
                        setEditingProductForImage(updatedProduct);
                        if (!stayOpen) {
                            setIsImageModalOpen(false);
                            setEditingProductForImage(null);
                        }
                    }}
                />
            )}

            <DeleteConfirmModal
                isOpen={isDeleteModalOpen}
                onClose={() => {
                    setIsDeleteModalOpen(false);
                    setProductToDelete(null);
                }}
                onConfirm={confirmDelete}
                title={t('common.delete')}
                message={t('products.confirmDelete')}
            />
        </Layout>
    );
};

export default Products;
