import React, { useState, useMemo, useRef, useEffect } from 'react';
import Layout from '../components/Layout';
import { Search, Plus, Filter, Edit, Trash2, ArrowUpDown, X, Image as ImageIcon, Upload, Save } from 'lucide-react';
import { useInventory } from '../context/InventoryContext';
import CategoryManagerModal from '../components/CategoryManagerModal';
import FilterDropdown from '../components/FilterDropdown';
import ProductImageModal from '../components/ProductImageModal';

const getAutoStatus = (stock) => {
    const s = Number(stock);
    if (s <= 0) return 'Out of Stock';
    if (s < 10) return 'Low Stock';
    return 'In Stock';
};

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
        exchangeRate: '1500', // Default
        unitPriceIQD: 0,
        additionalFeesIQD: '',
        shippingToIraqIQD: '',
        marginPercent: '',
        sellingPriceIQD: 0,
        profitPerUnitIQD: 0,
        unitsSold: 0,
        totalProfitIQD: 0
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
        const usdPrice = parseFloat(formData.unitPriceUSD) || 0;
        const rate = parseFloat(formData.exchangeRate) || 1500;
        const fees = parseFloat(formData.additionalFeesIQD) || 0;
        const shipping = parseFloat(formData.shippingToIraqIQD) || 0;
        const margin = parseFloat(formData.marginPercent) || 0;
        const sold = parseInt(formData.unitsSold) || 0;

        // 1. Unit Price IQD
        const unitPriceIQD = usdPrice * rate;

        // 2. Selling Price IQD
        let sellingPriceIQD = 0;
        let profitPerUnitIQD = 0;
        let totalProfitIQD = 0;

        if (margin < 100) {
            const m = margin / 100;
            const costBase = unitPriceIQD + fees + shipping;
            sellingPriceIQD = costBase / (1 - m);
            profitPerUnitIQD = sellingPriceIQD - costBase;
            totalProfitIQD = profitPerUnitIQD * sold;
        }

        setFormData(prev => {
            // Check if values actually changed to avoid infinite loop
            if (
                prev.unitPriceIQD === unitPriceIQD &&
                prev.sellingPriceIQD === sellingPriceIQD &&
                prev.profitPerUnitIQD === profitPerUnitIQD &&
                prev.totalProfitIQD === totalProfitIQD
            ) return prev;

            return {
                ...prev,
                unitPriceIQD,
                sellingPriceIQD,
                profitPerUnitIQD,
                totalProfitIQD,
                // Also update legacy fields for compatibility
                unitPrice: usdPrice,
                price: sellingPriceIQD
            };
        });
    }, [
        formData.unitPriceUSD,
        formData.exchangeRate,
        formData.additionalFeesIQD,
        formData.shippingToIraqIQD,
        formData.marginPercent,
        formData.unitsSold
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
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
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
            exchangeRate: parseFloat(formData.exchangeRate) || 1500,
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

    const SortIcon = ({ column }) => {
        if (sortConfig.key !== column) return <ArrowUpDown className="w-4 h-4 text-slate-300 inline ml-1" />;
        return <ArrowUpDown className={`w-4 h-4 inline ml-1 ${sortConfig.direction === 'ascending' ? 'text-[var(--brand-color)]' : 'text-[var(--brand-color)] rotate-180'}`} />;
    };

    return (
        <Layout title="Products">
            {/* Unified Header Bar */}
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-8 gap-4 bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                {/* Left Side: Add Button */}
                <div className="flex gap-3 w-full xl:w-auto">
                    <button
                        onClick={openAddModal}
                        className="flex items-center gap-2 px-6 py-2.5 text-white rounded-xl font-bold transition-all shadow-lg"
                        style={{ backgroundColor: brand.color, boxShadow: `0 10px 15px -3px ${brand.color}33` }}
                    >
                        <Plus className="w-5 h-5" />
                        <span>Add Product</span>
                    </button>
                </div>

                {/* Right Side: Filters */}
                <div className="flex flex-col md:flex-row gap-3 w-full xl:w-auto flex-wrap">
                    <div className="relative w-full md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search products..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-2.5 w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-[var(--brand-color)]/20"
                        />
                    </div>

                    {/* Category Filter */}
                    <FilterDropdown
                        title="Categories"
                        options={categoryOptions}
                        selectedValues={selectedCategories}
                        onChange={setSelectedCategories}
                        icon={Filter}
                        showProductCount={true}
                        productCount={filteredProducts.length}
                    />

                    {/* Status Filter */}
                    <FilterDropdown
                        title="Status"
                        options={statusOptions}
                        selectedValues={selectedStatuses}
                        onChange={setSelectedStatuses}
                        icon={Filter}
                        showProductCount={true}
                        productCount={filteredProducts.length}
                    />

                    {/* Category Edit Button */}
                    <button
                        onClick={() => setIsCategoryManagerOpen(true)}
                        className="p-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-500 hover:text-[var(--brand-color)] hover:border-[var(--brand-color)] transition-colors"
                        title="Manage Categories"
                    >
                        <Edit className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Category Manager Modal */}
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
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                <th onClick={() => requestSort('name')} className="px-6 py-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">Product <SortIcon column="name" /></th>
                                <th onClick={() => requestSort('category')} className="px-6 py-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">Category <SortIcon column="category" /></th>
                                <th onClick={() => requestSort('stock')} className="px-6 py-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors border-l dark:border-slate-700">Stock <SortIcon column="stock" /></th>
                                <th onClick={() => requestSort('price')} className="px-6 py-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors border-l dark:border-slate-700">Sell Price <SortIcon column="price" /></th>
                                <th onClick={() => requestSort('status')} className="px-6 py-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors border-l dark:border-slate-700">Status <SortIcon column="status" /></th>
                                <th className="px-6 py-4 text-right border-l dark:border-slate-700">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            {loading ? (
                                <tr><td colSpan="7" className="text-center py-8">Loading...</td></tr>
                            ) : filteredProducts.map((product) => (
                                <tr key={product._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/50 transition-colors border-b dark:border-slate-700 last:border-0 font-medium">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-4">
                                            <div
                                                className="w-12 h-12 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex-shrink-0 cursor-zoom-in hover:brightness-90 transition-all"
                                                onClick={() => {
                                                    setEditingProductForImage(product);
                                                    setIsImageModalOpen(true);
                                                }}
                                            >
                                                <img src={product.images && product.images[0] ? product.images[0] : 'https://via.placeholder.com/150'} alt={product.name} className="w-full h-full object-cover" />
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">{product.name}</h4>
                                                <p className="text-xs text-slate-500">{product.sku}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                                        <span className="px-3 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full text-xs font-medium">{product.category}</span>
                                    </td>
                                    <td className="px-6 py-4 border-l dark:border-slate-700">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{product.stock}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm font-bold text-slate-800 dark:text-slate-200 border-l dark:border-slate-700">
                                        IQD {(product.sellingPriceIQD || product.price || 0).toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 border-l dark:border-slate-700">
                                        <StatusBadge status={getAutoStatus(product.stock)} />
                                    </td>
                                    <td className="px-6 py-4 text-right border-l dark:border-slate-700">
                                        <div className="flex items-center justify-end gap-2">
                                            <button onClick={() => openEditModal(product)} className="p-2 text-slate-400 hover:text-[var(--brand-color)] hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors">
                                                <Edit className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => handleDelete(product._id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors">
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

                        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-8 custom-scrollbar">

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
                                        {isAddingNewCategory ? (
                                            <div className="flex gap-2">
                                                <input
                                                    autoFocus
                                                    className="flex-1 p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-[var(--brand-color)]/20"
                                                    value={newCategoryName}
                                                    onChange={(e) => setNewCategoryName(e.target.value)}
                                                    placeholder="New Category Name"
                                                />
                                                <button type="button" onClick={handleSaveNewCategory} className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors"><Plus className="w-5 h-5" /></button>
                                                <button type="button" onClick={() => setIsAddingNewCategory(false)} className="p-2 text-slate-500 hover:text-red-500 transition-colors"><X className="w-5 h-5" /></button>
                                            </div>
                                        ) : (
                                            <select name="category" value={formData.category} onChange={handleInputChange} className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-[var(--brand-color)]/20 outline-none dark:text-white transition-all appearance-none cursor-pointer">
                                                <option value="">Select Category</option>
                                                {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                                <option value="new" className="font-bold text-[var(--brand-color)]">+ Create New Category</option>
                                            </select>
                                        )}
                                    </div>
                                    <div className="col-span-2 md:col-span-1">
                                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">Current Stock</label>
                                        <div className="relative">
                                            <input required type="number" name="stock" value={formData.stock} onChange={handleInputChange} className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-[var(--brand-color)]/20 outline-none dark:text-white transition-all" />
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
                                        <input name="alibabaOrderNumber" value={formData.alibabaOrderNumber} onChange={handleInputChange} className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[var(--brand-color)]/20 transition-all font-bold" placeholder="1234..." />
                                    </div>
                                </div>
                            </section>

                            {/* Section 3: Cost & Pricing */}
                            <section>
                                <h4 className="text-[11px] font-bold text-[var(--brand-color)] uppercase tracking-widest mb-4 border-b border-indigo-50 dark:border-indigo-900/30 pb-2">3. Cost & Pricing (USD → IQD)</h4>
                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">Unit Price ($)</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                                            <input required type="number" step="0.01" name="unitPriceUSD" value={formData.unitPriceUSD} onChange={handleInputChange} className="w-full pl-7 p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-[var(--brand-color)]/20 outline-none font-bold" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">Exchange Rate</label>
                                        <div className="relative">
                                            <input required type="number" name="exchangeRate" value={formData.exchangeRate} onChange={handleInputChange} className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-[var(--brand-color)]/20 outline-none font-bold" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-[var(--brand-color)] uppercase mb-1">Price in IQD</label>
                                        <div className="p-2.5 bg-indigo-50/50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-xl font-bold text-indigo-700 dark:text-indigo-400">
                                            {(formData.unitPriceIQD || 0).toLocaleString()}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">Fees (IQD)</label>
                                        <input type="number" name="additionalFeesIQD" value={formData.additionalFeesIQD} onChange={handleInputChange} className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-[var(--brand-color)]/20 outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">Shipping (IQD)</label>
                                        <input type="number" name="shippingToIraqIQD" value={formData.shippingToIraqIQD} onChange={handleInputChange} className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-[var(--brand-color)]/20 outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">Margin (%)</label>
                                        <div className="relative">
                                            <input required type="number" name="marginPercent" value={formData.marginPercent} onChange={handleInputChange} className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-[var(--brand-color)]/20 outline-none font-bold" />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">%</span>
                                        </div>
                                    </div>
                                    <div className="col-span-3 p-4 bg-[var(--brand-color)]/10 rounded-2xl border-2 border-[var(--brand-color)]/30">
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <span className="text-[10px] font-bold text-[var(--brand-color)] uppercase tracking-wider block">Recommended Selling Price</span>
                                                <span className="text-2xl font-black text-[var(--brand-color)]">IQD {(formData.sellingPriceIQD || 0).toLocaleString()}</span>
                                            </div>
                                            <div className="text-right">
                                                <div className="flex items-center gap-1.5 justify-end">
                                                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                                                    <span className="text-[10px] font-bold text-slate-500 uppercase">Calculation Active</span>
                                                </div>
                                                <span className="text-xs text-slate-400 font-medium whitespace-pre-wrap">Based on {formData.marginPercent}% margin</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* Section 4: Profit Analysis */}
                            <section>
                                <h4 className="text-[11px] font-bold text-[var(--brand-color)] uppercase tracking-widest mb-4 border-b border-indigo-50 dark:border-indigo-900/30 pb-2">4. Profit Analysis</h4>
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800">
                                        <span className="block text-[10px] font-bold text-slate-400 uppercase">Profit / Unit</span>
                                        <span className="text-sm font-bold text-green-600 dark:text-green-400">+ IQD {(formData.profitPerUnitIQD || 0).toLocaleString()}</span>
                                    </div>
                                    <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800">
                                        <span className="block text-[10px] font-bold text-slate-400 uppercase">Units Sold</span>
                                        <input type="number" name="unitsSold" value={formData.unitsSold} onChange={handleInputChange} className="w-full mt-1 p-1 bg-transparent border-b border-slate-200 dark:border-slate-700 outline-none text-sm font-bold" />
                                    </div>
                                    <div className="p-3 bg-slate-900 dark:bg-slate-950 rounded-xl border border-slate-800">
                                        <span className="block text-[10px] font-bold text-slate-500 uppercase">Total Profit</span>
                                        <span className="text-sm font-bold text-green-500">IQD {(formData.totalProfitIQD || 0).toLocaleString()}</span>
                                    </div>
                                </div>
                            </section>

                            {/* Section 5: Image Gallery Preview */}
                            <section>
                                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-100 dark:border-slate-700 pb-2">5. Product Gallery</h4>
                                <div className="grid grid-cols-5 gap-2">
                                    {formData.images.map((img, index) => (
                                        <div key={index} className="relative group aspect-square rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
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

                            {/* Sticky Footer in Form */}
                            <div className="pt-6 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-3 sticky bottom-0 bg-white dark:bg-slate-800 pb-2">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 text-slate-500 dark:text-slate-400 font-bold hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl transition-all">Cancel</button>
                                <button type="submit"
                                    className="px-8 py-2.5 text-white font-black rounded-xl transition-all shadow-xl active:scale-95 flex items-center gap-2"
                                    style={{ backgroundColor: brand.color, boxShadow: `0 10px 15px -3px ${brand.color}33` }}
                                >
                                    <Save className="w-5 h-5" />
                                    {editingProduct ? 'Update Product' : 'Create Product'}
                                </button>
                            </div>
                        </form>
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
