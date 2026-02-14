import React, { useState, useMemo } from 'react';
import Layout from '../components/Layout';
import { Search, Plus, Printer, Trash2, X, Tag, Filter, Eye, Edit, ShoppingBag, Download, MapPin, Globe } from 'lucide-react';
import { useInventory } from '../context/InventoryContext';
import { useTranslation } from 'react-i18next';
import { GOVERNORATES, SOCIAL_PLATFORMS } from '../constants/iraq';
import DateRangePicker from '../components/DateRangePicker';
import FilterDropdown from '../components/FilterDropdown';
import SortDropdown from '../components/SortDropdown';
import { isWithinInterval, parseISO, startOfMonth, endOfMonth, subDays } from 'date-fns';
import { exportOrdersToCSV } from '../utils/CSVExportUtil';
import SearchableSelect from '../components/SearchableSelect';
import { User, MapPin as MapPinIcon, Globe as GlobeIcon, Package } from 'lucide-react';

// StatusCell component for inline status editing
const StatusCell = ({ order, onUpdate }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = React.useRef(null);

    const STATUS_OPTIONS = ['Processing', 'Completed', 'Cancelled', 'Pending'];

    // Close dropdown when clicking outside
    React.useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const { t } = useTranslation();

    const getStatusColor = (status) => {
        switch (status) {
            case 'Processing': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
            case 'Completed': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
            case 'Cancelled': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
            case 'Pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
            default: return 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300';
        }
    };

    const handleSelect = (newStatus) => {
        if (newStatus !== order.status) {
            onUpdate({ ...order, status: newStatus });
        }
        setIsOpen(false);
    };

    const getStatusLabel = (status) => {
        return t(`common.status.${status.toLowerCase()}`, status);
    };

    return (
        <div className="relative" ref={containerRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-all hover:brightness-95 active:scale-95 ${getStatusColor(order.status)}`}
            >
                {getStatusLabel(order.status)}
                <div className={`w-0 h-0 border-l-[3px] border-l-transparent border-t-[4px] border-t-current border-r-[3px] border-r-transparent opacity-50 ${document.dir === 'rtl' ? 'mr-1' : 'ml-1'}`} />
            </button>
            {isOpen && (
                <div className={`absolute top-full mt-1 w-32 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-100 dark:border-slate-700 py-1 z-50 animate-in fade-in zoom-in-95 duration-100 ${document.dir === 'rtl' ? 'right-0' : 'left-0'}`}>
                    {['Processing', 'Completed', 'Cancelled', 'Pending'].map((status) => (
                        <button
                            key={status}
                            onClick={() => handleSelect(status)}
                            className={`w-full text-left px-3 py-2 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${order.status === status
                                ? 'text-accent bg-slate-50 dark:bg-slate-700/30'
                                : 'text-slate-600 dark:text-slate-300'
                                }`}
                        >
                            {getStatusLabel(status)}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

const Orders = () => {
    const { t } = useTranslation();
    const { orders, products, customers, addOrder, updateOrder, deleteOrder, addCustomer, formatCurrency, brand, loading } = useInventory();
    const [searchTerm, setSearchTerm] = useState('');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [viewingOrder, setViewingOrder] = useState(null);
    const [editingOrderId, setEditingOrderId] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const minDate = useMemo(() => {
        if (orders.length === 0) return subDays(new Date(), 30);
        return orders.reduce((min, o) => {
            try {
                const d = parseISO(o.date);
                return d < min ? d : min;
            } catch (e) {
                return min;
            }
        }, new Date());
    }, [orders]);

    const defaultRange = useMemo(() => ({
        from: minDate,
        to: new Date()
    }), [minDate]);

    const [dateRange, setDateRange] = useState(defaultRange);

    // Update dateRange once orders are loaded if it was still the fallback
    const [hasInitializedDate, setHasInitializedDate] = useState(false);
    React.useEffect(() => {
        if (!loading && orders.length > 0 && !hasInitializedDate) {
            setDateRange(defaultRange);
            setHasInitializedDate(true);
        }
    }, [loading, orders.length, defaultRange, hasInitializedDate]);

    // Filters
    const [filterGovernorates, setFilterGovernorates] = useState([]);
    const [filterSocials, setFilterSocials] = useState([]);
    const [filterStatuses, setFilterStatuses] = useState([]);
    const [sortBy, setSortBy] = useState('date-new');

    // Column sorting state
    const [columnSort, setColumnSort] = useState({ column: 'date', direction: 'desc' });

    // Calculate Counts for Filters
    const governorateOptions = useMemo(() => {
        const counts = {};
        orders.forEach(o => {
            const gov = o.customer?.governorate;
            if (gov) counts[gov] = (counts[gov] || 0) + 1;
        });
        return GOVERNORATES.map(g => ({
            value: g, label: g, count: counts[g] || 0
        })).sort((a, b) => b.count - a.count);
    }, [orders]);

    const socialOptions = useMemo(() => {
        const counts = {};
        orders.forEach(o => {
            const social = o.customer?.social;
            if (social) counts[social] = (counts[social] || 0) + 1;
        });
        return SOCIAL_PLATFORMS.map(p => ({
            value: p, label: p, count: counts[p] || 0
        })).sort((a, b) => b.count - a.count);
    }, [orders]);

    const STATUS_OPTIONS = ['Processing', 'Completed', 'Cancelled', 'Pending'];
    const statusOptions = useMemo(() => {
        const counts = {};
        orders.forEach(o => {
            const status = o.status;
            if (status) counts[status] = (counts[status] || 0) + 1;
        });
        return ['Processing', 'Completed', 'Cancelled', 'Pending'].map(s => ({
            value: s, label: t(`common.status.${s.toLowerCase()}`, s), count: counts[s] || 0
        }));
    }, [orders, t]);

    const [newOrder, setNewOrder] = useState({
        customerId: 'new',
        customerName: '',
        customerPhone: '',
        customerGender: '',
        customerAddress: '',
        customerGovernorate: '',
        customerSocial: '',
        customerNotes: '',
        items: [],
        discount: 0
    });

    // Item adding state
    const [selectedProductId, setSelectedProductId] = useState('');
    const [qty, setQty] = useState(1);

    // Filtered lists
    const filteredAndSortedOrders = useMemo(() => {
        let result = orders.filter(o => {
            const search = searchTerm.toLowerCase();
            const matchesSearch =
                o.orderId.toLowerCase().includes(search) ||
                o.customer.name.toLowerCase().includes(search);

            const orderDate = parseISO(o.date);
            const matchesDate = !dateRange?.from || !dateRange?.to ||
                isWithinInterval(orderDate, { start: dateRange.from, end: dateRange.to });

            const matchesGov = filterGovernorates.length === 0 || filterGovernorates.includes(o.customer.governorate);
            const matchesSocial = filterSocials.length === 0 || filterSocials.includes(o.customer.social);
            const matchesStatus = filterStatuses.length === 0 || filterStatuses.includes(o.status);

            return matchesSearch && matchesDate && matchesGov && matchesSocial && matchesStatus;
        });

        // Apply sorting - use columnSort primarily
        return result.sort((a, b) => {
            let compareResult = 0;

            if (columnSort.column === 'orderId') {
                compareResult = a.orderId.localeCompare(b.orderId);
            } else if (columnSort.column === 'customer') {
                compareResult = a.customer.name.localeCompare(b.customer.name);
            } else if (columnSort.column === 'date') {
                compareResult = new Date(a.date) - new Date(b.date);
            } else if (columnSort.column === 'total') {
                compareResult = a.total - b.total;
            } else if (columnSort.column === 'status') {
                compareResult = a.status.localeCompare(b.status);
            }

            return columnSort.direction === 'asc' ? compareResult : -compareResult;
        });
    }, [orders, searchTerm, filterGovernorates, filterSocials, filterStatuses, sortBy, dateRange, columnSort]);

    const handleSortChange = (val) => {
        setSortBy(val);
        if (val === 'date-new') setColumnSort({ column: 'date', direction: 'desc' });
        else if (val === 'date-old') setColumnSort({ column: 'date', direction: 'asc' });
        else if (val === 'total-high') setColumnSort({ column: 'total', direction: 'desc' });
        else if (val === 'total-low') setColumnSort({ column: 'total', direction: 'asc' });
        else if (val === 'name-asc') setColumnSort({ column: 'customer', direction: 'asc' });
    };

    // Handlers
    const handleAddToOrder = () => {
        if (!selectedProductId) return;
        const latestProduct = products.find(p => p._id === selectedProductId);
        if (!latestProduct) return;

        const requestedQty = parseInt(qty);

        // When editing, we account for stock already in this specific order
        const currentOrder = orders.find(o => o._id === editingOrderId);
        const oldOrderItem = currentOrder?.items.find(item => item.product._id === latestProduct._id);
        const stockInHand = oldOrderItem ? oldOrderItem.quantity : 0;
        const totalAvailable = latestProduct.stock + stockInHand;

        if (requestedQty > totalAvailable) {
            return addToast(t('orders.stockError', { available: totalAvailable }), "error");
        }

        const existingItemIndex = newOrder.items.findIndex(item => item.product._id === latestProduct._id);
        const sellPrice = latestProduct.sellingPriceIQD || latestProduct.price || 0;

        if (existingItemIndex > -1) {
            const updatedItems = [...newOrder.items];
            const newQty = updatedItems[existingItemIndex].quantity + requestedQty;

            if (newQty > totalAvailable) {
                return addToast(t('orders.limitReached', { available: totalAvailable }), "error");
            }

            updatedItems[existingItemIndex].quantity = newQty;
            setNewOrder(prev => ({ ...prev, items: updatedItems }));
        } else {
            setNewOrder(prev => ({
                ...prev,
                items: [...prev.items, { product: latestProduct, quantity: requestedQty, price: sellPrice }]
            }));
        }
        setQty(1);
        setSelectedProductId('');
    };

    const handleRemoveFromOrder = (index) => {
        const updatedItems = newOrder.items.filter((_, i) => i !== index);
        setNewOrder(prev => ({ ...prev, items: updatedItems }));
    };

    const handlePriceChange = (index, newPrice) => {
        const updatedItems = [...newOrder.items];
        updatedItems[index].price = parseFloat(newPrice || 0); // Handle empty input safely
        setNewOrder(prev => ({ ...prev, items: updatedItems }));
    };

    const handleQtyChange = (index, newQty) => {
        const product = newOrder.items[index].product;
        const val = parseInt(newQty || 0);

        const updatedItems = [...newOrder.items];
        updatedItems[index].quantity = val;
        setNewOrder(prev => ({ ...prev, items: updatedItems }));
    };

    const calculateSubtotal = (items) => {
        return items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    };

    const calculateTotal = () => {
        const subtotal = calculateSubtotal(newOrder.items);
        const discountAmount = subtotal * (newOrder.discount / 100);
        let total = subtotal - discountAmount;

        // Round to nearest 500
        total = Math.ceil(total / 500) * 500;

        return total;
    };

    const handleCustomerSelectValue = (id) => {
        setNewOrder(prev => ({ ...prev, customerId: id }));

        if (id === 'new') {
            setNewOrder(prev => ({
                ...prev,
                customerName: '', customerPhone: '', customerGender: '', customerAddress: '', customerGovernorate: '', customerSocial: ''
            }));
        } else if (id) {
            const customer = customers.find(c => c._id === id);
            if (customer) {
                setNewOrder(prev => ({
                    ...prev,
                    customerName: customer.name,
                    customerPhone: customer.phone,
                    customerGender: customer.gender || '',
                    customerAddress: customer.address,
                    customerGovernorate: customer.governorate,
                    customerSocial: customer.social
                }));
            }
        }
    };

    const handleEditOrder = (order) => {
        setIsViewModalOpen(false); // Close view modal if it's open
        setEditingOrderId(order._id);
        const existingCustomer = customers.find(c => c.name === order.customer.name && c.phone === order.customer.phone);

        setNewOrder({
            customerId: existingCustomer ? existingCustomer._id : 'new',
            customerName: order.customer.name,
            customerPhone: order.customer.phone,
            customerGender: order.customer.gender || '',
            customerAddress: order.customer.address || '',
            customerGovernorate: order.customer.governorate || '',
            customerSocial: order.customer.social || '',
            customerNotes: order.notes || '',
            items: order.items,
            discount: order.discount || 0
        });
        setIsCreateModalOpen(true);
    };

    const handleViewOrder = (order) => {
        setViewingOrder(order);
        setIsViewModalOpen(true);
    };

    const handleSubmitOrder = async () => {
        if (newOrder.items.length === 0) return addToast(t('orders.addItemsError'), "error");
        if (!newOrder.customerName || !newOrder.customerPhone) return addToast(t('orders.customerError'), "error");

        // Advanced Stock Check
        const currentOrder = orders.find(o => o._id === editingOrderId);
        for (const item of newOrder.items) {
            const product = products.find(p => p._id === item.product._id);
            const oldItem = currentOrder?.items.find(oi => oi.product._id === item.product._id);
            const oldQty = oldItem ? oldItem.quantity : 0;
            const available = (product?.stock || 0) + oldQty;

            if (item.quantity > available) {
                return addToast(t('orders.stockErrorWithName', { name: item.product.name, available: available }), "error");
            }
        }

        setIsSubmitting(true);
        try {
            let finalCustomer = {
                _id: newOrder.customerId !== 'new' ? newOrder.customerId : undefined,
                name: newOrder.customerName,
                phone: newOrder.customerPhone,
                gender: newOrder.customerGender,
                address: newOrder.customerAddress,
                governorate: newOrder.customerGovernorate,
                social: newOrder.customerSocial
            };

            if (newOrder.customerId === 'new') {
                const addedCustomer = await addCustomer({ ...finalCustomer, email: '' });
                finalCustomer._id = addedCustomer._id;
            }

            const subtotalValue = calculateSubtotal(newOrder.items);
            const totalValue = calculateTotal();

            const orderPayload = {
                customer: finalCustomer,
                date: editingOrderId && currentOrder ? currentOrder.date : new Date().toISOString(),
                total: totalValue,
                subtotal: subtotalValue,
                discount: newOrder.discount,
                status: editingOrderId && currentOrder ? currentOrder.status : 'Processing',
                items: newOrder.items,
                notes: newOrder.customerNotes
            };

            if (editingOrderId && currentOrder) {
                await updateOrder({ ...orderPayload, _id: editingOrderId, orderId: currentOrder.orderId });
            } else {
                const result = await addOrder(orderPayload);
                if (result) {
                    setTimeout(() => {
                        try { printReceipt(result); } catch (e) { console.error("Print error:", e); }
                    }, 800);
                }
            }

            // SUCCESS: Close modal and reset
            setIsCreateModalOpen(false);
            setEditingOrderId(null);
            setNewOrder({ customerId: 'new', customerName: '', customerPhone: '', customerGender: '', customerAddress: '', customerGovernorate: '', customerSocial: '', customerNotes: '', items: [], discount: 0 });
        } catch (error) {
            console.error("Order submission error:", error);
            addToast(t('orders.errors.submitError', { message: error.message || t('orders.errors.unknown') }), "error");
        } finally {
            setIsSubmitting(false);
        }
    };



    const printReceipt = (order) => {
        const printWindow = window.open('', '', 'width=600,height=800');
        const isRtl = document.dir === 'rtl';
        printWindow.document.write(`
            <html dir="${isRtl ? 'rtl' : 'ltr'}">
                <head>
                    <title>${t('orders.receipt.title')}</title>
                    <style>
                        body { font-family: 'Cairo', 'Courier New', monospace; padding: 20px; font-size: 14px; direction: ${isRtl ? 'rtl' : 'ltr'}; }
                        .header { text-align: center; margin-bottom: 20px; }
                        .item { display: flex; justify-content: space-between; margin-bottom: 5px; }
                        .divider { border-top: 1px dashed black; margin: 10px 0; }
                        .totals { text-align: ${isRtl ? 'left' : 'right'}; margin-top: 10px; }
                        .total-row { display: flex; justify-content: space-between; font-weight: bold; margin-top: 5px; }
                        .discount { color: red; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h2>${t('orders.receipt.companyName')}</h2>
                        <p>${t('orders.receipt.address')}</p>
                        <p>${t('orders.receipt.order')}: ${order.orderId || '###'}</p>
                        <p>${order.date}</p>
                    </div>
                    <div class="divider"></div>
                    <div>
                        <p><strong>${t('orders.receipt.customer')}:</strong> ${order.customer.name}</p>
                        <p><strong>${t('orders.receipt.phone')}:</strong> ${order.customer.phone || t('orders.receipt.na')}</p>
                        <p><strong>${t('orders.receipt.gov')}:</strong> ${order.customer.governorate || t('orders.receipt.na')}</p>
                    </div>
                    <div class="divider"></div>
                    <div>
                        ${order.items.map(item => `
                            <div class="item">
                                <span>${item.product.name} <br> <small>x${item.quantity} @ ${formatCurrency(item.price)}</small></span>
                                <span>${formatCurrency(item.price * item.quantity)}</span>
                            </div>
                        `).join('')}
                    </div>
                    <div class="divider"></div>
                    <div class="totals">
                        <div class="total-row" style="font-weight: normal;">
                            <span>${t('orders.receipt.subtotal')}:</span>
                            <span>${formatCurrency(order.subtotal || order.total)}</span>
                        </div>
                        ${order.discount ? `
                        <div class="total-row discount" style="font-weight: normal;">
                            <span>${t('orders.receipt.discount')} (${order.discount}%):</span>
                            <span>-${formatCurrency((order.subtotal || order.total) - order.total)}</span>
                        </div>
                        ` : ''}
                        <div class="total-row" style="font-size: 18px; margin-top: 10px;">
                            <span>${t('orders.receipt.total')}:</span>
                            <span>${formatCurrency(order.total)}</span>
                        </div>
                    </div>
                    <div class="divider"></div>
                    <div style="text-align: center; margin-top: 20px;">
                        <p>${t('orders.receipt.thankYou')}</p>
                        <p>${t('orders.receipt.noReturn')}</p>
                    </div>
                </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.print();
    };

    // Column sort handler
    const handleColumnSort = (column) => {
        if (columnSort.column === column) {
            // Toggle direction if same column
            setColumnSort(prev => ({
                ...prev,
                direction: prev.direction === 'asc' ? 'desc' : 'asc'
            }));
        } else {
            // New column, default to ascending
            setColumnSort({ column, direction: 'asc' });
        }
    };

    // Helper to render column header with sort indicator
    const SortableHeader = ({ column, label }) => {
        const isActive = columnSort.column === column;
        return (
            <th
                onClick={() => handleColumnSort(column)}
                className="px-6 py-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors select-none"
            >
                <div className="flex items-center gap-2">
                    {label}
                    {isActive && (
                        <span className="text-accent font-bold">
                            {columnSort.direction === 'asc' ? '↑' : '↓'}
                        </span>
                    )}
                </div>
            </th>
        );
    };

    return (
        <Layout title={t('orders.title')}>
            {/* Actions Bar */}
            <div className="flex flex-col gap-4 mb-8 bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                {/* Top Row: Add Button + Export | Clear Filters Button + Order Count */}
                <div className="flex gap-3 w-full items-center justify-between flex-wrap">
                    <div className="flex gap-3 items-center flex-wrap">
                        <button
                            onClick={() => { setIsCreateModalOpen(true); setEditingOrderId(null); setNewOrder({ customerId: 'new', customerName: '', customerPhone: '', customerAddress: '', customerGovernorate: '', customerSocial: '', customerNotes: '', items: [], discount: 0 }); }}
                            className="flex items-center justify-center gap-2 px-6 py-2.5 text-white rounded-xl font-bold transition-all bg-accent shadow-accent active:scale-95"
                        >
                            <Plus className="w-5 h-5" />
                            <span>{t('orders.createOrder')}</span>
                        </button>

                        <button
                            onClick={() => {
                                if (filteredAndSortedOrders.length === 0) return addToast(t('common.noDataToExport'), "info");
                                exportOrdersToCSV(filteredAndSortedOrders);
                            }}
                            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-xl font-bold transition-all shadow-lg hover:bg-green-700"
                        >
                            <Download className="w-5 h-5" />
                            <span className="hidden sm:inline">{t('common.exportCSV')}</span>
                        </button>
                    </div>

                    <div className="flex gap-3 items-center flex-wrap">
                        {/* Clear Filters Button */}
                        {(filterGovernorates.length > 0 || filterStatuses.length > 0 || filterSocials.length > 0 || searchTerm ||
                            dateRange.from?.getTime() !== defaultRange.from?.getTime() ||
                            dateRange.to?.getTime() !== defaultRange.to?.getTime()) && (
                                <button
                                    onClick={() => {
                                        setSearchTerm('');
                                        setFilterStatuses([]);
                                        setFilterGovernorates([]);
                                        setFilterSocials([]);
                                        setDateRange(defaultRange);
                                    }}
                                    className="px-4 py-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 rounded-xl font-bold text-sm transition-all border border-slate-200 dark:border-slate-700"
                                >
                                    {t('common.clearFilters')}
                                </button>
                            )}

                        {/* Orders Count */}
                        <div className="flex items-center gap-3 px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800">
                            <ShoppingBag className="w-4 h-4 text-slate-400" />
                            <span className="text-sm font-bold text-slate-500">
                                <span className="text-slate-900 dark:text-white">{filteredAndSortedOrders.length}</span> {t('orders.title')}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Filters Row: Search + Date + All Filters + Sort */}
                <div className="flex gap-3 w-full flex-wrap items-center">
                    {/* Search Input with fixed height */}
                    <div className="relative min-w-[200px] flex-1 md:flex-none h-[44px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                            type="text"
                            placeholder={t('orders.searchPlaceholder')}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-0 h-full w-full bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl outline-none focus:border-accent/40 focus:ring-4 focus:ring-accent/10 transition-all font-bold text-sm text-slate-700 dark:text-white"
                        />
                    </div>

                    {/* Date Picker with fixed height */}
                    <div className="h-[44px] flex-shrink-0">
                        <DateRangePicker
                            range={dateRange}
                            onRangeChange={setDateRange}
                            brandColor={brand.color}
                        />
                    </div>

                    {/* Status Filter */}
                    <FilterDropdown
                        title={t('orders.status')}
                        options={statusOptions}
                        selectedValues={filterStatuses}
                        onChange={setFilterStatuses}
                        icon={ShoppingBag}
                        showSearch={false}
                    />

                    {/* Governorate Filter */}
                    <FilterDropdown
                        title={t('orders.governorate')}
                        options={governorateOptions}
                        selectedValues={filterGovernorates}
                        onChange={setFilterGovernorates}
                        icon={MapPin}
                        showSearch={false}
                    />

                    {/* Social Media Filter */}
                    <FilterDropdown
                        title={t('orders.socialMedia')}
                        options={socialOptions}
                        selectedValues={filterSocials}
                        onChange={setFilterSocials}
                        icon={Globe}
                        showSearch={false}
                    />

                    {/* Sort */}
                    <SortDropdown
                        title={t('common.sort')}
                        options={[
                            { value: 'date-new', label: t('common.dateNew') },
                            { value: 'date-old', label: t('common.dateOld') },
                            { value: 'total-high', label: t('common.priceHigh') },
                            { value: 'total-low', label: t('common.priceLow') },
                            { value: 'name-asc', label: t('common.nameAZ') }
                        ]}
                        selectedValue={sortBy}
                        onChange={handleSortChange}
                    />
                </div>
            </div>


            {/* Orders List */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-500 uppercase">
                                <SortableHeader column="orderId" label={t('orders.table.orderId')} />
                                <SortableHeader column="customer" label={t('orders.table.customer')} />
                                <SortableHeader column="date" label={t('orders.table.date')} />
                                <SortableHeader column="total" label={t('orders.table.total')} />
                                <SortableHeader column="status" label={t('orders.table.status')} />
                                <th className="px-6 py-4 text-right">{t('common.actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            {filteredAndSortedOrders.map((order) => (
                                <tr key={order._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/50 transition-colors">
                                    <td className="px-6 py-4 text-sm font-semibold text-[var(--brand-color)]">{order.orderId}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium text-slate-800 dark:text-white">{order.customer.name}</span>
                                            <span className="text-xs text-slate-500 flex gap-1 items-center">
                                                {order.customer.governorate && <span className="bg-slate-100 dark:bg-slate-700 px-1 rounded">{order.customer.governorate}</span>}
                                                {order.customer.phone}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{order.date}</td>
                                    <td className="px-6 py-4 text-sm font-bold text-slate-800 dark:text-white">{formatCurrency(order.total)}</td>
                                    <td className="px-6 py-4">
                                        <StatusCell order={order} onUpdate={updateOrder} />
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button onClick={() => handleViewOrder(order)} className="p-2 text-slate-400 hover:text-[var(--brand-color)] hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg" title="View Details">
                                                <Eye className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => handleEditOrder(order)} className="p-2 text-slate-400 hover:text-[var(--brand-color)] hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg" title="Edit Order">
                                                <Edit className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => printReceipt(order)} className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg" title="Print Receipt">
                                                <Printer className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => { if (window.confirm(t('orders.deleteConfirm'))) deleteOrder(order._id) }} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg" title="Delete Order">
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

            {/* Create Order Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-2 md:p-4 overflow-y-auto">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-5xl my-auto min-h-0 flex flex-col md:flex-row overflow-hidden animate-in fade-in zoom-in duration-200 max-h-[95vh] md:max-h-[90vh]">

                        {/* Left: Product Selection & Cart */}
                        <div className="flex-1 p-4 md:p-6 border-b md:border-b-0 md:border-r border-slate-100 dark:border-slate-700 flex flex-col min-h-0 overflow-y-auto lg:overflow-visible relative z-20">
                            <div className="sticky top-0 bg-white dark:bg-slate-800 pb-4 z-10 lg:static">
                                <h3 className="text-lg font-bold mb-4 text-slate-800 dark:text-white">Add Items</h3>
                                <div className="space-y-4">
                                    <div className="flex flex-col sm:flex-row gap-4 items-end">
                                        <div className="flex-1 w-full min-w-0">
                                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">{t('orders.searchProduct')}</label>
                                            <SearchableSelect
                                                title={t('orders.chooseProduct')}
                                                options={products.filter(p => p.stock > 0).map(p => ({
                                                    value: p._id,
                                                    label: `${p.name} (${p.stock}) - ${formatCurrency(p.price)}`
                                                }))}
                                                selectedValue={selectedProductId}
                                                onChange={setSelectedProductId}
                                                icon={Package}
                                                placeholder={t('orders.searchPlaceholder')}
                                            />
                                        </div>
                                        <div className="w-24">
                                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">{t('orders.qty')}</label>
                                            <input
                                                type="number"
                                                min="1"
                                                value={qty}
                                                onChange={e => setQty(e.target.value)}
                                                className={`w-full p-3 border-2 rounded-xl dark:bg-slate-900 dark:text-white outline-none text-center font-bold ${selectedProductId && parseInt(qty) > (products.find(p => p._id === selectedProductId)?.stock || 0)
                                                    ? 'border-red-500 text-red-500 ring-4 ring-red-500/10'
                                                    : 'border-slate-100 dark:border-slate-700 focus:border-[var(--brand-color)]'
                                                    }`}
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={handleAddToOrder}
                                            disabled={!selectedProductId || !qty}
                                            className="h-[52px] px-6 text-white font-black rounded-xl transition-all bg-accent shadow-accent active:scale-95 disabled:opacity-50"
                                        >
                                            <Plus className="w-6 h-6" />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto mt-6 space-y-3 custom-scrollbar min-h-[300px]">
                                {newOrder.items.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-100 dark:border-slate-700/50 rounded-3xl py-12">
                                        <ShoppingBag className="w-12 h-12 mb-2 opacity-20" />
                                        <p className="font-bold">{t('orders.cartEmpty')}</p>
                                        <p className="text-xs">{t('orders.cartEmptySub')}</p>
                                    </div>
                                ) : (
                                    newOrder.items.map((item, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/30 rounded-2xl border border-slate-100 dark:border-slate-700/50 group hover:border-indigo-500/50 transition-all">
                                            <div className="flex items-center gap-4 flex-1">
                                                <div className="w-12 h-12 rounded-lg overflow-hidden bg-white dark:bg-slate-800 border dark:border-slate-700 shrink-0">
                                                    <img src={item.product.images && item.product.images[0] ? item.product.images[0] : 'https://via.placeholder.com/150'} alt={item.product.name || 'Product image'} className="w-full h-full object-cover" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="text-sm font-black text-slate-800 dark:text-white truncate">{item.product.name}</h4>
                                                    <div className="flex items-center gap-4 mt-1">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[10px] font-bold text-slate-400">{t('orders.price')}</span>
                                                            <input
                                                                type="number"
                                                                value={item.price}
                                                                onChange={(e) => handlePriceChange(idx, e.target.value)}
                                                                className="w-24 p-1.5 text-xs font-black border-2 border-slate-100 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 dark:text-white transition-colors focus:border-[var(--brand-color)]"
                                                            />
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[10px] font-bold text-slate-400">{t('orders.qty')}</span>
                                                            <div className="relative">
                                                                <input
                                                                    type="number"
                                                                    min="1"
                                                                    value={item.quantity}
                                                                    onChange={(e) => handleQtyChange(idx, e.target.value)}
                                                                    className={`w-16 p-1.5 text-xs font-black border-2 rounded-lg bg-white dark:bg-slate-800 dark:text-white transition-all text-center ${item.quantity > item.product.stock ? 'border-red-500 text-red-500 ring-4 ring-red-500/10' : 'border-slate-100 dark:border-slate-700 focus:border-indigo-500'}`}
                                                                />
                                                                {item.quantity > item.product.stock && (
                                                                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-red-500 text-white text-[8px] px-1.5 py-0.5 rounded font-black whitespace-nowrap animate-bounce">
                                                                        {t('orders.onlyLeft', { count: item.product.stock })}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4 ml-4">
                                                <div className="text-right">
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase">{t('orders.subtotal')}</p>
                                                    <span className="text-sm font-black dark:text-white">{formatCurrency(item.price * item.quantity)}</span>
                                                </div>
                                                <button onClick={() => handleRemoveFromOrder(idx)} className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            {/* Totals Summary */}
                            <div className="mt-8 pt-6 pb-8 border-t border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 sticky bottom-0">
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
                                                options={[0, 5, 10, 15, 20, 30, 40, 50].map(v => ({
                                                    value: v,
                                                    label: v === 0 ? t('orders.noDiscount') : t('orders.offDiscount', { percent: v })
                                                }))}
                                                selectedValue={newOrder.discount}
                                                onChange={(val) => setNewOrder(prev => ({ ...prev, discount: val }))}
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

                        {/* Right: Customer Details & Save */}
                        <div className="w-full md:w-1/3 p-4 bg-slate-50 dark:bg-slate-900/50 flex flex-col min-h-0 border-t md:border-t-0 md:border-l border-slate-100 dark:border-slate-700 relative z-10">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tighter">{t('orders.customerInfo')}</h3>
                                <button onClick={() => setIsCreateModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg hover:bg-white dark:hover:bg-slate-800 transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="space-y-2 flex-1 overflow-y-auto pr-1 custom-scrollbar">
                                <div className="space-y-2">
                                    <SearchableSelect
                                        title={t('orders.chooseCustomer')}
                                        options={customers.map(c => ({ value: c._id, label: c.name }))}
                                        selectedValue={newOrder.customerId}
                                        onChange={handleCustomerSelectValue}
                                        icon={User}
                                        placeholder={t('orders.searchCustomers')}
                                        customAction={{
                                            label: t('orders.createNewCustomer'),
                                            icon: Plus,
                                            onClick: () => handleCustomerSelectValue('new')
                                        }}
                                    />
                                </div>

                                <div className={`space-y-2 transition-all duration-300 ${newOrder.customerId ? 'opacity-100 pointer-events-auto' : 'opacity-30 pointer-events-none grayscale'}`}>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t('orders.fullName')}</label>
                                        <input
                                            placeholder="e.g. Ahmed Ali"
                                            value={newOrder.customerName}
                                            onChange={e => setNewOrder({ ...newOrder, customerName: e.target.value })}
                                            className="w-full p-2 border-2 border-white dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl dark:text-white outline-none focus:border-[var(--brand-color)] transition-all font-bold shadow-sm text-sm"
                                            disabled={newOrder.customerId !== 'new'}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t('orders.phone')}</label>
                                            <input
                                                placeholder="07XX XXX XXXX"
                                                value={newOrder.customerPhone}
                                                onChange={e => setNewOrder({ ...newOrder, customerPhone: e.target.value })}
                                                className="w-full p-2 border-2 border-white dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl dark:text-white outline-none focus:border-[var(--brand-color)] transition-all font-bold shadow-sm text-sm"
                                                disabled={newOrder.customerId !== 'new'}
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t('orders.gender')}</label>
                                            <SearchableSelect
                                                title={t('common.select')}
                                                options={[{ value: 'Male', label: t('common.male') }, { value: 'Female', label: t('common.female') }]}
                                                selectedValue={newOrder.customerGender}
                                                onChange={val => setNewOrder({ ...newOrder, customerGender: val })}
                                                showSearch={false}
                                                disabled={newOrder.customerId !== 'new'}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t('orders.governorate')}</label>
                                            <SearchableSelect
                                                title={t('common.select')}
                                                options={GOVERNORATES.map(g => ({ value: g, label: g }))}
                                                selectedValue={newOrder.customerGovernorate}
                                                onChange={val => setNewOrder({ ...newOrder, customerGovernorate: val })}
                                                icon={MapPinIcon}
                                                showSearch={false}
                                                disabled={newOrder.customerId !== 'new'}
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t('orders.social')}</label>
                                            <SearchableSelect
                                                title={t('common.select')}
                                                options={SOCIAL_PLATFORMS.map(p => ({ value: p, label: p }))}
                                                selectedValue={newOrder.customerSocial}
                                                onChange={val => setNewOrder({ ...newOrder, customerSocial: val })}
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
                                            onChange={e => setNewOrder({ ...newOrder, customerAddress: e.target.value })}
                                            className="w-full p-2 text-xs border-2 border-white dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl dark:text-white outline-none focus:border-[var(--brand-color)] transition-all font-bold shadow-sm resize-none"
                                            disabled={newOrder.customerId !== 'new'}
                                            rows="1"
                                        ></textarea>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t('orders.internalNotes')}</label>
                                        <textarea
                                            placeholder="Special instructions..."
                                            value={newOrder.customerNotes}
                                            onChange={e => setNewOrder({ ...newOrder, customerNotes: e.target.value })}
                                            className="w-full p-2 text-xs border-2 border-white dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl dark:text-white outline-none focus:border-[var(--brand-color)] transition-all font-bold shadow-sm resize-none"
                                            rows="2"
                                        ></textarea>
                                    </div>
                                </div>
                            </div>
                            <div className="mt-auto pt-2 border-t border-slate-100 dark:border-slate-700">
                                <button
                                    onClick={handleSubmitOrder}
                                    disabled={isSubmitting || newOrder.items.length === 0 || newOrder.items.some(item => {
                                        const product = products.find(p => p._id === item.product._id);
                                        const oldOrder = orders.find(o => o._id === editingOrderId);
                                        const oldItem = oldOrder?.items.find(oi => oi.product._id === item.product._id);
                                        const oldQty = oldItem ? oldItem.quantity : 0;
                                        return item.quantity > ((product?.stock || 0) + oldQty);
                                    })}
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
                                            {editingOrderId ? t('orders.updateOrder') : t('orders.saveOrder')}
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* View Order Modal */}
            {
                isViewModalOpen && viewingOrder && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in zoom-in duration-200">
                        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                            <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center sticky top-0 bg-white dark:bg-slate-800 z-10">
                                <div>
                                    <h3 className="text-xl font-bold text-slate-800 dark:text-white">{t('orders.orderDetails')}</h3>
                                    <p className="text-sm text-slate-500">{viewingOrder.orderId} • {viewingOrder.date}</p>
                                </div>
                                <button onClick={() => setIsViewModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>
                            <div className="p-6 space-y-6">
                                <div className="flex justify-between items-start bg-slate-50 dark:bg-slate-700/30 p-4 rounded-xl">
                                    <div>
                                        <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">{t('orders.customerInfo')}</h4>
                                        <p className="font-bold text-slate-800 dark:text-white">{viewingOrder.customer.name}</p>
                                        <p className="text-sm text-slate-600 dark:text-slate-300">{viewingOrder.customer.phone}</p>
                                        <p className="text-sm text-slate-600 dark:text-slate-300">{viewingOrder.customer.address}, {viewingOrder.customer.governorate}</p>
                                    </div>
                                    <div className="text-right">
                                        <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">{t('orders.orderStatus')}</h4>
                                        <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold ${viewingOrder.status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                                            {viewingOrder.status}
                                        </span>
                                    </div>
                                </div>

                                <div>
                                    <h4 className="text-xs font-bold text-slate-500 uppercase mb-3">{t('orders.orderItems')}</h4>
                                    <div className="space-y-3">
                                        {viewingOrder.items.map((item, idx) => (
                                            <div key={idx} className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-3 last:border-0 last:pb-0">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-12 h-12 bg-slate-100 dark:bg-slate-700 rounded-lg overflow-hidden flex-shrink-0">
                                                        {item.product.images && item.product.images[0] ? (
                                                            <img src={item.product.images[0]} alt={item.product.name || 'Product image'} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="flex items-center justify-center w-full h-full text-slate-400 text-xs">No Img</div>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-slate-800 dark:text-white">{item.product.name}</p>
                                                        <p className="text-xs text-slate-500">{item.quantity} x {formatCurrency(item.price)}</p>
                                                    </div>
                                                </div>
                                                <p className="font-bold text-slate-800 dark:text-white">{formatCurrency(item.price * item.quantity)}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                                    <div className="flex justify-end space-y-2 flex-col items-end">
                                        <div className="flex gap-8 text-sm">
                                            <span className="text-slate-500">{t('orders.subtotal')}:</span>
                                            <span className="font-medium text-slate-800 dark:text-white">{formatCurrency(viewingOrder.subtotal || viewingOrder.total)}</span>
                                        </div>
                                        {viewingOrder.discount > 0 && (
                                            <div className="flex gap-8 text-sm text-red-500">
                                                <span>{t('orders.discount')} ({viewingOrder.discount}%):</span>
                                                <span>-{formatCurrency((viewingOrder.subtotal || viewingOrder.total) - viewingOrder.total)}</span>
                                            </div>
                                        )}
                                        <div className="flex gap-8 text-lg font-bold pt-2">
                                            <span className="text-slate-800 dark:text-white">{t('orders.table.total')}:</span>
                                            <span className="text-accent">{formatCurrency(viewingOrder.total)}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 dark:border-slate-700">
                                    <button onClick={() => printReceipt(viewingOrder)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-white rounded-lg font-medium transition-colors flex items-center gap-2">
                                        <Printer className="w-4 h-4" /> {t('orders.printReceipt')}
                                    </button>
                                    <button onClick={() => handleEditOrder(viewingOrder)} className="px-4 py-2 bg-accent text-white rounded-lg font-medium transition-all shadow-accent hover:brightness-110 active:scale-95 flex items-center gap-2">
                                        <Edit className="w-4 h-4" /> {t('orders.editOrder')}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }        </Layout >
    );
};

export default Orders;
