import React, { useState, useMemo, useRef, useEffect } from 'react';
import Layout from '../components/Layout';
import { Search, Plus, Filter, Edit, Trash2, ArrowUpDown, X, Image as ImageIcon, Upload, Save, Download, Package, ShoppingBag, MessageSquare, Info } from 'lucide-react';
import { useInventory } from '../context/InventoryContext';
import CategoryManagerModal from '../components/CategoryManagerModal';
import FilterDropdown from '../components/FilterDropdown';
import SearchableSelect from '../components/SearchableSelect';
import ProductImageModal from '../components/ProductImageModal';
import { exportProductsToCSV } from '../utils/CSVExportUtil';

const getAutoStatus = (stock) => {
    const s = Number(stock);
    if (s <= 0) return 'Out of Stock';
    if (s < 10) return 'Low Stock';
    return 'In Stock';
};

const roundToNearest500 = (num) => Math.round(num / 500) * 500;

const STATUS_OPTIONS = ['In Stock', 'Low Stock', 'Out of Stock'];

const StatusBadge = ({ status }) => {
    const getStatusColor = (status) => {
        switch (status) {
            case 'In Stock': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400';
            case 'Low Stock': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
            case 'Out of Stock': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
            default: return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200';
        }
    };

    return (
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${getStatusColor(status)}`}>
            {status}
        </span>
    );
};

const Products = () => {
    const { products, addProduct, updateProduct, deleteProduct, categories, addCategory, updateCategory, deleteCategory, formatCurrency, loading, brand } = useInventory();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategories, setSelectedCategories] = useState([]);
    const [selectedStatuses, setSelectedStatuses] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [isImageModalOpen, setIsImageModalOpen] = useState(false);
    const [editingProductForImage, setEditingProductForImage] = useState(null);
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });
    const fileInputRef = useRef(null);

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
    const [newCategoryName, setNewCategoryName] = useState('');
    const [isAddingNewCategory, setIsAddingNewCategory] = useState(false);

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
            label: s,
            count: counts[s] || 0
        }));
    }, [products]);

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

    const filteredProducts = sortedProducts.filter(product => {
        const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            product.sku.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = selectedCategories.length === 0 || selectedCategories.includes(product.category);
        const matchesStatus = selectedStatuses.length === 0 || selectedStatuses.includes(product.status);
        return matchesSearch && matchesCategory && matchesStatus;
    });

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
        if (window.confirm("Are you sure you want to delete this product?")) {
            deleteProduct(id);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        if (name === 'category' && value === 'new') {
            setIsAddingNewCategory(true);
            setFormData(prev => ({ ...prev, category: '' }));
        } else if (name === 'sellingPriceIQD') {
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

    const handleSaveNewCategory = () => {
        if (newCategoryName.trim()) {
            addCategory(newCategoryName);
            setFormData(prev => ({ ...prev, category: newCategoryName }));
            setNewCategoryName('');
            setIsAddingNewCategory(false);
        }
    };

    const handleImageUpload = (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        files.forEach(file => {
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData(prev => ({
                    ...prev,
                    images: [...prev.images, reader.result]
                }));
            };
            reader.readAsDataURL(file);
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
            alert('Margin percentage must be less than 100%');
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
                className={`px-6 py-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors select-none ${border ? 'border-l dark:border-slate-700' : ''}`}
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
        <Layout title="Products">
            {/* Unified Actions Bar - Based on Orders template */}
            <div className="flex flex-col gap-4 mb-8 bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                {/* Top Row: Add Button + Export | Clear Filters Button + Count */}
                <div className="flex gap-3 w-full items-center justify-between flex-wrap">
                    <div className="flex gap-3 items-center flex-wrap">
                        <button
                            onClick={openAddModal}
                            className="flex items-center gap-2 px-6 py-2.5 text-white rounded-xl font-bold transition-all bg-accent shadow-accent hover:brightness-110 active:scale-95"
                        >
                            <Plus className="w-5 h-5" />
                            <span>Add Product</span>
                        </button>

                        <button
                            onClick={() => exportProductsToCSV(filteredProducts)}
                            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-xl font-bold transition-all shadow-lg hover:bg-green-700 active:scale-95"
                        >
                            <Download className="w-5 h-5" />
                            <span className="hidden sm:inline">Export CSV</span>
                        </button>

                        <button
                            onClick={() => setIsCategoryManagerOpen(true)}
                            className="flex items-center gap-2 px-6 py-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 rounded-xl font-bold text-sm transition-all border border-slate-200 dark:border-slate-700 active:scale-95"
                        >
                            <Filter className="w-4 h-4" />
                            <span>Manage Categories</span>
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
                                className="px-4 py-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 rounded-xl font-bold text-sm transition-all border border-slate-200 dark:border-slate-700"
                            >
                                Clear Filters
                            </button>
                        )}

                        {/* Inventory Count */}
                        <div className="flex items-center gap-3 px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800">
                            <ImageIcon className="w-4 h-4 text-slate-400" />
                            <span className="text-sm font-bold text-slate-500">
                                <span className="text-slate-900 dark:text-white">{filteredProducts.length}</span> Products
                            </span>
                        </div>
                    </div>
                </div>

                {/* Filters Row: Search + Category + Status */}
                <div className="flex gap-3 w-full flex-wrap items-center">
                    {/* Search Input */}
                    <div className="relative min-w-[200px] flex-1 md:flex-none h-[44px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search inventory..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-0 h-full w-full bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl outline-none focus:border-accent/40 focus:ring-4 focus:ring-accent/10 transition-all font-bold text-sm text-slate-700 dark:text-white"
                        />
                    </div>

                    <FilterDropdown
                        title="Categories"
                        options={categoryOptions}
                        selectedValues={selectedCategories}
                        onChange={setSelectedCategories}
                        icon={Package}
                        showProductCount={true}
                    />

                    <FilterDropdown
                        title="Status"
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

            {/* Products Table */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                <SortableHeader column="name" label="Product" />
                                <SortableHeader column="category" label="Category" />
                                <SortableHeader column="stock" label="Stock" border={true} />
                                <SortableHeader column="price" label="Sell Price" border={true} />
                                <SortableHeader column="status" label="Status" border={true} />
                                <th className="px-6 py-4 text-right border-l dark:border-slate-700">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            {loading ? (
                                <tr><td colSpan="6" className="text-center py-12">
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading Inventory...</span>
                                    </div>
                                </td></tr>
                            ) : filteredProducts.length === 0 ? (
                                <tr><td colSpan="6" className="text-center py-12 text-slate-400">
                                    <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-20" />
                                    <p className="font-bold uppercase tracking-widest text-xs">No products found</p>
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
                                                <img src={product.images && product.images[0] ? product.images[0] : 'https://via.placeholder.com/150'} alt={product.name} className="w-full h-full object-cover" />
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
                                    <td className="px-6 py-4 border-l dark:border-slate-700">
                                        <span className="text-sm font-bold text-slate-800 dark:text-white">{product.stock}</span>
                                    </td>
                                    <td className="px-6 py-4 border-l dark:border-slate-700">
                                        <span className="text-sm font-black text-slate-800 dark:text-white">{formatCurrency(product.sellingPriceIQD || product.price || 0)}</span>
                                    </td>
                                    <td className="px-6 py-4 border-l dark:border-slate-700">
                                        <StatusBadge status={getAutoStatus(product.stock)} />
                                    </td>
                                    <td className="px-6 py-4 text-right border-l dark:border-slate-700">
                                        <div className="flex items-center justify-end gap-1">
                                            <button onClick={() => openEditModal(product)} className="p-2 text-slate-400 hover:text-[var(--brand-color)] hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all" title="Edit">
                                                <Edit className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => handleDelete(product._id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all" title="Delete">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add/Edit Product Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl my-auto animate-in fade-in zoom-in duration-200 flex flex-col max-h-[95vh]">
                        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-white dark:bg-slate-800 sticky top-0 z-10 rounded-t-2xl">
                            <div>
                                <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                                    {editingProduct ? 'Edit Product' : 'Add New Product'}
                                </h3>
                                <p className="text-xs text-slate-500 font-medium">{editingProduct ? `SKU: ${formData.sku}` : 'Fill in the information below'}</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-all">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form id="productForm" onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-8 custom-scrollbar relative">

                            {/* Section 1: Basic Information */}
                            <section>
                                <h4 className="text-[11px] font-bold text-[var(--brand-color)] uppercase tracking-widest mb-4 border-b border-indigo-50 dark:border-indigo-900/30 pb-2">1. Basic Information</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2 md:col-span-1">
                                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">Product Name</label>
                                        <input required name="name" value={formData.name} onChange={handleInputChange} className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-[var(--brand-color)]/20 outline-none dark:text-white transition-all" placeholder="e.g. Wireless Headset" />
                                    </div>
                                    <div className="col-span-2 md:col-span-1">
                                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">SKU / Code</label>
                                        <input required name="sku" value={formData.sku} onChange={handleInputChange} className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-[var(--brand-color)]/20 outline-none dark:text-white transition-all" placeholder="e.g. WH-001" />
                                    </div>
                                    <div className="col-span-2 md:col-span-1">
                                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">Category</label>
                                        <SearchableSelect
                                            title="Select Category"
                                            options={categories.map(cat => ({ value: cat, label: cat }))}
                                            selectedValue={formData.category}
                                            onChange={(val) => setFormData(prev => ({ ...prev, category: val }))}
                                            icon={Package}
                                            customAction={{
                                                label: "Create New Category",
                                                icon: Plus,
                                                onClick: () => setIsCategoryManagerOpen(true)
                                            }}
                                        />
                                    </div>
                                    <div className="col-span-2 md:col-span-1">
                                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">Current Stock</label>
                                        <div className="relative">
                                            <input required type="number" name="stock" value={formData.stock} onChange={handleInputChange} className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-[var(--brand-color)]/20 outline-none dark:text-white transition-all shadow-sm" />
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                                <StatusBadge status={getAutoStatus(formData.stock)} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* Section 2: Alibaba Information */}
                            <section>
                                <h4 className="text-[11px] font-bold text-[var(--brand-color)] uppercase tracking-widest mb-4 border-b border-indigo-50 dark:border-indigo-900/30 pb-2">2. Alibaba Sourcing</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2">
                                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">Product Link (Alibaba)</label>
                                        <input name="alibabaProductLink" value={formData.alibabaProductLink} onChange={handleInputChange} className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[var(--brand-color)]/20 transition-all font-medium" placeholder="https://..." />
                                    </div>
                                    <div className="col-span-2 md:col-span-1">
                                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">Message Detail Link</label>
                                        <input name="alibabaMessageLink" value={formData.alibabaMessageLink} onChange={handleInputChange} className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[var(--brand-color)]/20 transition-all font-medium" placeholder="https://..." />
                                    </div>
                                    <div className="col-span-2 md:col-span-1">
                                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">Order Link</label>
                                        <input name="alibabaOrderLink" value={formData.alibabaOrderLink} onChange={handleInputChange} className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[var(--brand-color)]/20 transition-all font-medium" placeholder="https://..." />
                                    </div>
                                    <div className="col-span-2 md:col-span-1">
                                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">Alibaba Order #</label>
                                        <input name="alibabaOrderNumber" value={formData.alibabaOrderNumber} onChange={handleInputChange} className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[var(--brand-color)]/20 transition-all font-bold shadow-sm" placeholder="1234..." />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">Alibaba Note</label>
                                        <div className="relative">
                                            <MessageSquare className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                                            <textarea
                                                name="alibabaNote"
                                                value={formData.alibabaNote}
                                                onChange={handleInputChange}
                                                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[var(--brand-color)]/20 transition-all font-medium min-h-[80px] resize-none"
                                                placeholder="Shipping notes, supplier contact details, etc."
                                            />
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* Section 3: Cost & Pricing */}
                            <section>
                                <h4 className="text-[11px] font-bold text-[var(--brand-color)] uppercase tracking-widest mb-4 border-b border-indigo-50 dark:border-indigo-900/30 pb-2">3. Cost & Pricing</h4>
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">Unit Price ($)</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                                            <input required type="number" step="0.01" name="unitPriceUSD" value={formData.unitPriceUSD} onChange={handleInputChange} className="w-full pl-7 p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-[var(--brand-color)]/20 outline-none font-bold" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">Alibaba Fee ($ / unit)</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                                            <input type="number" step="0.01" name="alibabaFeeUSD" value={formData.alibabaFeeUSD} onChange={handleInputChange} className="w-full pl-7 p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-[var(--brand-color)]/20 outline-none font-bold" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">Exchange Rate</label>
                                        <input required type="number" name="exchangeRate" value={formData.exchangeRate} onChange={handleInputChange} className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-[var(--brand-color)]/20 outline-none font-bold" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">Margin (%)</label>
                                        <div className="relative">
                                            <input required type="number" name="marginPercent" value={formData.marginPercent} onChange={handleInputChange} className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-[var(--brand-color)]/20 outline-none font-bold" />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">%</span>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">Shipping (Total IQD)</label>
                                        <input type="number" name="shippingToIraqIQD" value={formData.shippingToIraqIQD} onChange={handleInputChange} className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-[var(--brand-color)]/20 outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">Other Fees (Total IQD)</label>
                                        <input type="number" name="additionalFeesIQD" value={formData.additionalFeesIQD} onChange={handleInputChange} className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-[var(--brand-color)]/20 outline-none" />
                                    </div>

                                    <div className="col-span-2 grid grid-cols-2 gap-3">
                                        <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800">
                                            <span className="block text-[10px] font-bold text-slate-400 uppercase">Cost (Total)</span>
                                            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">IQD {(formData.costPriceIQD_total || 0).toLocaleString()}</span>
                                        </div>
                                        <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800">
                                            <span className="block text-[10px] font-bold text-slate-400 uppercase">Cost (Per Unit)</span>
                                            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">IQD {(formData.costPriceIQD_perUnit || 0).toLocaleString()}</span>
                                        </div>
                                    </div>

                                    <div className="col-span-full grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Recommended Selling Price</span>
                                            <span className="text-xl font-bold text-slate-600 dark:text-slate-400">IQD {(formData.recommendedSellingPriceIQD_perUnit || 0).toLocaleString()}</span>
                                        </div>

                                        <div className={`p-4 rounded-2xl border-2 transition-all ${formData.isSellingPriceOverridden ? 'bg-orange-50 border-orange-200 dark:bg-orange-900/10 dark:border-orange-800/50' : 'bg-[var(--brand-color)]/5 border-[var(--brand-color)]/20'}`}>
                                            <div className="flex justify-between items-start mb-1">
                                                <span className="text-[10px] font-bold text-[var(--brand-color)] uppercase tracking-wider">Final Selling Price (Per Unit)</span>
                                                {formData.isSellingPriceOverridden && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setFormData(prev => ({ ...prev, isSellingPriceOverridden: false }))}
                                                        className="text-[10px] font-bold text-orange-600 hover:underline flex items-center gap-1"
                                                    >
                                                        <X className="w-3 h-3" /> Reset
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
                                                {formData.isSellingPriceOverridden ? 'Manual override active (Rounded to 500)' : 'Auto-calculated from margin'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* Section 4: Profit Analysis */}
                            <section>
                                <h4 className="text-[11px] font-bold text-[var(--brand-color)] uppercase tracking-widest mb-4 border-b border-indigo-50 dark:border-indigo-900/30 pb-2">4. Profit Analysis</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* IQD Analysis */}
                                    <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                                        <div className="flex items-center gap-2 mb-4">
                                            <div className="w-2 h-4 bg-green-500 rounded-full"></div>
                                            <span className="text-xs font-black uppercase tracking-widest text-slate-400">IQD Analysis</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <span className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Profit / Unit</span>
                                                <span className={`text-lg font-black ${formData.profitPerUnitIQD >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
                                                    {formData.profitPerUnitIQD >= 0 ? '+' : '-'} IQD {Math.abs(formData.profitPerUnitIQD || 0).toLocaleString()}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Total Profit</span>
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
                                            <span className="text-xs font-black uppercase tracking-widest text-slate-500">USD Analysis</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <span className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Profit / Unit</span>
                                                <span className={`text-lg font-black ${formData.profitPerUnitUSD >= 0 ? 'text-blue-500' : 'text-red-400'}`}>
                                                    {formData.profitPerUnitUSD >= 0 ? '+' : '-'} ${Math.abs(formData.profitPerUnitUSD || 0).toFixed(2)}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Total Profit</span>
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
                                                <span className="block text-[10px] font-bold text-slate-400 uppercase">Quantity for Calculation</span>
                                                <span className="text-xs font-medium text-slate-500 italic">Units expected to be sold</span>
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
                                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-100 dark:border-slate-700 pb-2">6. General Information</h4>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">Product Description</label>
                                        <div className="relative">
                                            <Info className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                                            <textarea
                                                name="description"
                                                value={formData.description}
                                                onChange={handleInputChange}
                                                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[var(--brand-color)]/20 transition-all font-medium min-h-[120px] resize-none"
                                                placeholder="General product description, features, or internal notes..."
                                            />
                                        </div>
                                    </div>
                                </div>
                            </section>

                            <section>
                                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-100 dark:border-slate-700 pb-2">7. Product Gallery</h4>
                                <div className="grid grid-cols-5 gap-2">
                                    {formData.images.map((img, index) => (
                                        <div key={index} className="relative group aspect-square rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 group">
                                            <img src={img} alt="Product" className="w-full h-full object-cover" />
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
                                        <span className="text-[9px] font-black uppercase">Add Image</span>
                                    </button>
                                </div>
                                <input type="file" ref={fileInputRef} className="hidden" onChange={handleImageUpload} multiple accept="image/*" />
                            </section>

                            {/* Added padding to prevent overlap with sticky footer */}
                            <div className="h-20"></div>
                        </form>

                        {/* Sticky Footer in Modal Bottom */}
                        <div className="p-6 border-t border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row justify-end gap-3 sticky bottom-0 bg-white dark:bg-slate-800 rounded-b-2xl shadow-[0_-10px_20px_rgba(0,0,0,0.05)] z-20">
                            <button
                                type="button"
                                onClick={() => setIsModalOpen(false)}
                                className="order-2 sm:order-1 px-6 py-2.5 text-slate-500 dark:text-slate-400 font-bold hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                form="productForm"
                                className="order-1 sm:order-2 px-8 py-2.5 text-white font-black rounded-xl transition-all bg-accent shadow-accent active:scale-95 flex items-center justify-center gap-2"
                            >
                                <Save className="w-5 h-5" />
                                {editingProduct ? 'Update Product' : 'Create Product'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Product Image Viewer Modal */}
            {isImageModalOpen && editingProductForImage && (
                <ProductImageModal
                    product={editingProductForImage}
                    onClose={() => {
                        setIsImageModalOpen(false);
                        setEditingProductForImage(null);
                    }}
                    onSave={updateProduct}
                    onUpload={async (files) => {
                        // This matches the simplified mock upload in InventoryContext/Firebase
                        // In a real app, this would return Firebase/Server URLs
                        return files.map(file => URL.createObjectURL(file));
                    }}
                />
            )}
        </Layout>
    );
};

export default Products;
