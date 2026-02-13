import React, { useState, useMemo } from 'react';
import Layout from '../components/Layout';
import { Search, Plus, Mail, Phone, MapPin, User, X, Edit, ShoppingBag, Facebook, Twitter, Instagram, Linkedin, Globe, MessageCircle, ChevronDown, Printer, Download, LayoutGrid, List } from 'lucide-react';
import { useInventory } from '../context/InventoryContext';
import { GOVERNORATES, SOCIAL_PLATFORMS } from '../constants/iraq';
import DateRangePicker from '../components/DateRangePicker';
import FilterDropdown from '../components/FilterDropdown';
import SortDropdown from '../components/SortDropdown';
import { isWithinInterval, parseISO, subDays } from 'date-fns';
import { exportCustomersToCSV } from '../utils/CSVExportUtil';
import SearchableSelect from '../components/SearchableSelect';
import { Package } from 'lucide-react';

const Customers = () => {
    const { customers, orders, addCustomer, updateCustomer, formatCurrency, brand } = useInventory();
    const [searchTerm, setSearchTerm] = useState('');
    const [filterGovernorates, setFilterGovernorates] = useState([]);
    const [filterSocials, setFilterSocials] = useState([]);
    const [sortBy, setSortBy] = useState('orders-high');
    const [dateRange, setDateRange] = useState({
        from: subDays(new Date(), 90),
        to: new Date()
    });

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isOrderHistoryOpen, setIsOrderHistoryOpen] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [editingCustomer, setEditingCustomer] = useState(null);
    const [expandedOrderId, setExpandedOrderId] = useState(null);
    const [columnSort, setColumnSort] = useState({ column: 'orders', direction: 'desc' });
    const [viewMode, setViewMode] = useState('table'); // 'table' or 'card'

    const handleColumnSort = (column) => {
        if (columnSort.column === column) {
            setColumnSort(prev => ({ ...prev, direction: prev.direction === 'asc' ? 'desc' : 'asc' }));
        } else {
            setColumnSort({ column, direction: 'asc' });
        }
    };

    const SortableHeader = ({ column, label, border = false }) => {
        const isActive = columnSort.column === column;
        return (
            <th
                onClick={() => handleColumnSort(column)}
                className={`px-6 py-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors select-none ${border ? 'border-l dark:border-slate-700' : ''}`}
            >
                <div className="flex items-center gap-2">
                    {label}
                    {isActive && (
                        <span className="text-[var(--brand-color)] font-bold">
                            {columnSort.direction === 'asc' ? '↑' : '↓'}
                        </span>
                    )}
                </div>
            </th>
        );
    };

    const [formData, setFormData] = useState({ name: '', email: '', phone: '', address: '', governorate: '', social: '', notes: '' });

    // Calculate Counts
    const governorateOptions = useMemo(() => {
        const counts = {};
        customers.forEach(c => {
            const gov = c.governorate;
            if (gov) counts[gov] = (counts[gov] || 0) + 1;
        });
        return GOVERNORATES.map(g => ({
            value: g, label: g, count: counts[g] || 0
        })).sort((a, b) => b.count - a.count);
    }, [customers]);

    const socialOptions = useMemo(() => {
        const counts = {};
        customers.forEach(c => {
            const social = c.social;
            if (social) counts[social] = (counts[social] || 0) + 1;
        });
        return SOCIAL_PLATFORMS.map(p => ({
            value: p, label: p, count: counts[p] || 0
        })).sort((a, b) => b.count - a.count);
    }, [customers]);

    const getCustomerOrders = (customerId) => {
        // Match by customer._id first, then fallback to name+phone matching for legacy orders
        return orders.filter(o => {
            const customer = customers.find(c => c._id === customerId);
            if (!customer) return false;

            // Primary match: by customer._id
            if (o.customer?._id === customerId) return true;

            // Fallback: match by name and phone (for legacy orders without _id)
            if (o.customer?.name === customer.name && o.customer?.phone === customer.phone) return true;

            return false;
        });
    };

    const filteredAndSortedCustomers = useMemo(() => {
        let result = customers.filter(c => {
            const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.phone.includes(searchTerm);

            const createdDate = c.createdOn ? parseISO(c.createdOn) : null;
            const matchesDate = !dateRange?.from || !dateRange?.to || !createdDate ||
                isWithinInterval(createdDate, { start: dateRange.from, end: dateRange.to });

            const matchesGov = filterGovernorates.length === 0 || filterGovernorates.includes(c.governorate);
            const matchesSocial = filterSocials.length === 0 || filterSocials.includes(c.social);
            return matchesSearch && matchesDate && matchesGov && matchesSocial;
        });

        return result.sort((a, b) => {
            // Priority to columnSort for table-template unification
            if (columnSort.column === 'name') {
                const valA = a.name.toLowerCase();
                const valB = b.name.toLowerCase();
                return columnSort.direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
            }
            if (columnSort.column === 'orders') {
                const valA = getCustomerOrders(a._id).length;
                const valB = getCustomerOrders(b._id).length;
                return columnSort.direction === 'asc' ? valA - valB : valB - valA;
            }
            if (columnSort.column === 'spent') {
                const valA = getCustomerOrders(a._id).reduce((sum, o) => sum + o.total, 0);
                const valB = getCustomerOrders(b._id).reduce((sum, o) => sum + o.total, 0);
                return columnSort.direction === 'asc' ? valA - valB : valB - valA;
            }
            if (columnSort.column === 'governorate') {
                const valA = (a.governorate || '').toLowerCase();
                const valB = (b.governorate || '').toLowerCase();
                return columnSort.direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
            }

            return 0;
        });
    }, [customers, searchTerm, filterGovernorates, filterSocials, sortBy, columnSort, orders]);

    const handleSortChange = (val) => {
        setSortBy(val);
        if (val === 'orders-high') setColumnSort({ column: 'orders', direction: 'desc' });
        else if (val === 'orders-low') setColumnSort({ column: 'orders', direction: 'asc' });
        else if (val === 'name-asc') setColumnSort({ column: 'name', direction: 'asc' });
        else if (val === 'date-new') setColumnSort({ column: 'orders', direction: 'desc' }); // Fallback for date-new in customers if no date col
    };


    const handleOpenAdd = () => {
        setEditingCustomer(null);
        setFormData({ name: '', email: '', phone: '', address: '', governorate: '', social: '', notes: '' });
        setIsModalOpen(true);
    };

    const handleOpenEdit = (customer) => {
        setEditingCustomer(customer);
        setFormData(customer);
        setIsModalOpen(true);
    };

    const handleOpenHistory = (customer) => {
        setSelectedCustomer(customer);
        setIsOrderHistoryOpen(true);
        setExpandedOrderId(null);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (editingCustomer) {
            updateCustomer({ ...formData, _id: editingCustomer._id });
        } else {
            addCustomer(formData);
        }
        setIsModalOpen(false);
    };

    const handlePrintOrder = (order) => {
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
                <head>
                    <title>Order ${order.orderId}</title>
                    <style>
                        body { font-family: sans-serif; padding: 20px; }
                        .header { text-align: center; margin-bottom: 20px; }
                        .order-info { margin-bottom: 20px; border-bottom: 1px solid #ccc; padding-bottom: 10px; }
                        table { width: 100%; border-collapse: collapse; }
                        th, td { text-align: left; padding: 8px; border-bottom: 1px solid #eee; }
                        .total { text-align: right; font-weight: bold; font-size: 1.2em; margin-top: 20px; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h1>Order Receipt</h1>
                        <h3>${order.orderId}</h3>
                    </div>
                    <div class="order-info">
                        <p><strong>Customer:</strong> ${order.customer.name}</p>
                        <p><strong>Date:</strong> ${order.date}</p>
                        <p><strong>Status:</strong> ${order.status}</p>
                    </div>
                    <table>
                        <thead>
                            <tr>
                                <th>Item</th>
                                <th>Qty</th>
                                <th>Price</th>
                                <th>Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${order.items.map(item => `
                                <tr>
                                    <td>${item.product.name}</td>
                                    <td>${item.quantity}</td>
                                    <td>${new Intl.NumberFormat('en-IQ', { style: 'currency', currency: 'IQD', maximumFractionDigits: 0 }).format(item.price)}</td>
                                    <td>${new Intl.NumberFormat('en-IQ', { style: 'currency', currency: 'IQD', maximumFractionDigits: 0 }).format(item.price * item.quantity)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    <div class="total">
                        Total: ${new Intl.NumberFormat('en-IQ', { style: 'currency', currency: 'IQD', maximumFractionDigits: 0 }).format(order.total)}
                    </div>
                    <script>window.onload = function() { window.print(); window.close(); }</script>
                </body>
            </html>
        `);
        printWindow.document.close();
    }

    const getSocialIcon = (platform) => {
        switch (platform?.toLowerCase()) {
            case 'facebook': return <Facebook className="w-4 h-4" />;
            case 'instagram': return <Instagram className="w-4 h-4" />;
            case 'twitter': return <Twitter className="w-4 h-4" />;
            case 'tiktok': return <div className="w-4 h-4 font-bold text-xs flex items-center justify-center">TT</div>;
            case 'whatsapp': return <MessageCircle className="w-4 h-4" />;
            default: return <Globe className="w-4 h-4" />;
        }
    }

    return (
        <Layout title="Customers">
            {/* Unified Header Bar */}
            <div className="flex flex-col gap-4 mb-8 bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                {/* Top Row: Add Button + Export | Clear Button + Customer Count */}
                <div className="flex gap-3 w-full items-center justify-between flex-wrap">
                    <div className="flex gap-3 items-center flex-wrap">
                        <button
                            onClick={handleOpenAdd}
                            className="flex items-center gap-2 px-6 py-2.5 text-white rounded-xl font-bold transition-all bg-accent shadow-accent active:scale-95"
                        >
                            <Plus className="w-5 h-5" />
                            <span>Add Customer</span>
                        </button>

                        <button
                            onClick={() => exportCustomersToCSV(filteredAndSortedCustomers)}
                            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-xl font-bold transition-all shadow-lg hover:bg-green-700"
                        >
                            <Download className="w-5 h-5" />
                            <span className="hidden sm:inline">Export CSV</span>
                        </button>

                        <div className="flex bg-slate-100 dark:bg-slate-700 p-1 rounded-xl border border-slate-200 dark:border-slate-600 ml-2">
                            <button
                                onClick={() => setViewMode('table')}
                                className={`p-1.5 rounded-lg transition-all ${viewMode === 'table' ? 'bg-white dark:bg-slate-600 text-[var(--brand-color)] shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
                                title="Table View"
                            >
                                <List className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setViewMode('card')}
                                className={`p-1.5 rounded-lg transition-all ${viewMode === 'card' ? 'bg-white dark:bg-slate-600 text-[var(--brand-color)] shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
                                title="Card View"
                            >
                                <LayoutGrid className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    <div className="flex gap-3 items-center flex-wrap">
                        {/* Clear Filters Button */}
                        {(filterGovernorates.length > 0 || filterSocials.length > 0 || searchTerm) && (
                            <button
                                onClick={() => {
                                    setSearchTerm('');
                                    setFilterGovernorates([]);
                                    setFilterSocials([]);
                                }}
                                className="px-4 py-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 rounded-xl font-bold text-sm transition-all border border-slate-200 dark:border-slate-700"
                            >
                                Clear Filters
                            </button>
                        )}

                        {/* Customer Count */}
                        <div className="flex items-center gap-3 px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800">
                            <User className="w-4 h-4 text-slate-400" />
                            <span className="text-sm font-bold text-slate-500">
                                <span className="text-slate-900 dark:text-white">{filteredAndSortedCustomers.length}</span> Customers
                            </span>
                        </div>
                    </div>
                </div>

                {/* Filters Row: Search + Date + Other Filters + Sort */}
                <div className="flex gap-3 w-full flex-wrap items-center">
                    {/* Search Input */}
                    <div className="relative min-w-[200px] flex-1 md:flex-none h-[44px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search by name or phone..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-0 h-full w-full bg-slate-50 dark:bg-slate-900/50 border-2 border-slate-100 dark:border-slate-800 rounded-2xl outline-none focus:border-blue-200 dark:focus:border-blue-800 focus:ring-2 focus:ring-[var(--brand-color)]/20 transition-all font-bold text-sm dark:text-white"
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

                    {/* Governorate Filter (title on button, no search) */}
                    <FilterDropdown
                        title="Governorate"
                        options={governorateOptions}
                        selectedValues={filterGovernorates}
                        onChange={setFilterGovernorates}
                        icon={MapPin}
                        showSearch={false}
                    />

                    {/* Social Media Filter (title on button, no search) */}
                    <FilterDropdown
                        title="Social Media"
                        options={socialOptions}
                        selectedValues={filterSocials}
                        onChange={setFilterSocials}
                        icon={Globe}
                        showSearch={false}
                    />

                    <SortDropdown
                        title="Sort"
                        options={[
                            { value: 'orders-high', label: 'Top Spenders' },
                            { value: 'orders-low', label: 'Lowest Spenders' },
                            { value: 'date-new', label: 'Recently Joined' },
                            { value: 'name-asc', label: 'Alphabetical (A-Z)' }
                        ]}
                        selectedValue={sortBy}
                        onChange={handleSortChange}
                    />
                </div>
            </div>

            {viewMode === 'table' ? (
                /* Customers Table */
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                    <SortableHeader column="name" label="Customer" />
                                    <SortableHeader column="governorate" label="Location" border={true} />
                                    <SortableHeader column="orders" label="Orders" border={true} />
                                    <SortableHeader column="spent" label="Total Spent" border={true} />
                                    <th className="px-6 py-4 text-right border-l dark:border-slate-700">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                {filteredAndSortedCustomers.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="px-6 py-12 text-center text-slate-400">
                                            <User className="w-12 h-12 mx-auto mb-2 opacity-20" />
                                            <p className="font-bold uppercase tracking-widest text-xs">No customers found</p>
                                        </td>
                                    </tr>
                                ) : filteredAndSortedCustomers.map(customer => {
                                    const custOrders = getCustomerOrders(customer._id);
                                    const totalSpent = custOrders.reduce((sum, o) => sum + o.total, 0);
                                    return (
                                        <tr key={customer._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-[var(--brand-color)] font-bold text-lg border border-slate-100 dark:border-slate-800 shadow-sm">
                                                        {customer.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <h4 className="text-sm font-bold text-slate-800 dark:text-white">{customer.name}</h4>
                                                        <p className="text-xs text-slate-400">{customer.phone}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 border-l dark:border-slate-700">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{customer.governorate}</span>
                                                    <span className="text-[11px] text-slate-400 line-clamp-1">{customer.address}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 border-l dark:border-slate-700">
                                                <div
                                                    className="flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black inline-flex transition-all"
                                                    style={{
                                                        backgroundColor: `color-mix(in srgb, var(--accent-color), transparent 90%)`,
                                                        color: `var(--accent-color)`
                                                    }}
                                                >
                                                    <ShoppingBag className="w-3.5 h-3.5" />
                                                    {custOrders.length}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 border-l dark:border-slate-700">
                                                <span className="text-sm font-black text-slate-800 dark:text-white">
                                                    {formatCurrency(totalSpent)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right border-l dark:border-slate-700">
                                                <div className="flex items-center justify-end gap-1">
                                                    <button
                                                        onClick={() => handleOpenHistory(customer)}
                                                        className="p-2 text-slate-400 hover:text-[var(--brand-color)] hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all"
                                                        title="Order History"
                                                    >
                                                        <ShoppingBag className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleOpenEdit(customer)}
                                                        className="p-2 text-slate-400 hover:text-[var(--brand-color)] hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all"
                                                        title="Edit"
                                                    >
                                                        <Edit className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                /* Customers Card Grid */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
                    {filteredAndSortedCustomers.length === 0 ? (
                        <div className="col-span-full py-20 text-center bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700">
                            <User className="w-16 h-16 mx-auto mb-4 text-slate-200" />
                            <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">No customers matched your search</p>
                        </div>
                    ) : filteredAndSortedCustomers.map(customer => {
                        const custOrders = getCustomerOrders(customer._id);
                        const totalSpent = custOrders.reduce((sum, o) => sum + o.total, 0);
                        return (
                            <div key={customer._id} className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-xl transition-all duration-300 group overflow-hidden flex flex-col h-full">
                                <div className="p-6 flex-1">
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="w-14 h-14 rounded-2xl bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-[var(--brand-color)] font-black text-xl border border-slate-100 dark:border-slate-800 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900 transition-colors">
                                            {customer.name.charAt(0)}
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => handleOpenHistory(customer)} className="p-2 text-slate-400 hover:text-[var(--brand-color)] bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 transition-colors" title="Order History">
                                                <ShoppingBag className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => handleOpenEdit(customer)} className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 transition-colors" title="Edit Profile">
                                                <Edit className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="mb-6">
                                        <h3 className="font-bold text-slate-900 dark:text-white text-lg mb-2 truncate">{customer.name}</h3>
                                        <div className="flex flex-wrap gap-2">
                                            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg text-[10px] font-black uppercase tracking-wider">
                                                <ShoppingBag className="w-3 h-3" />
                                                {custOrders.length} {custOrders.length === 1 ? 'Order' : 'Orders'}
                                            </div>
                                            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg text-[10px] font-black uppercase tracking-wider">
                                                {formatCurrency(totalSpent)}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
                                            <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-900 flex items-center justify-center border border-slate-100 dark:border-slate-800 shrink-0">
                                                <Phone className="w-4 h-4 text-slate-400" />
                                            </div>
                                            <span className="font-bold">{customer.phone || 'No phone'}</span>
                                        </div>
                                        <div className="flex items-start gap-3 text-sm text-slate-600 dark:text-slate-400">
                                            <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-900 flex items-center justify-center border border-slate-100 dark:border-slate-800 shrink-0 mt-0.5">
                                                <MapPin className="w-4 h-4 text-slate-400" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="font-bold text-slate-700 dark:text-slate-300 text-xs">{customer.governorate}</span>
                                                <span className="text-[10px] text-slate-400 line-clamp-1">{customer.address}</span>
                                            </div>
                                        </div>
                                        {customer.social && (
                                            <div className="flex items-center gap-3 text-sm">
                                                <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-900 flex items-center justify-center border border-slate-100 dark:border-slate-800 shrink-0">
                                                    {getSocialIcon(customer.social)}
                                                </div>
                                                <span className="text-[10px] font-black uppercase text-blue-500 tracking-wider">
                                                    {customer.social}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Add/Edit Customer Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-[32px] shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-300">
                        <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-white dark:bg-slate-800 sticky top-0 z-10">
                            <div>
                                <h3 className="text-xl font-black text-slate-900 dark:text-white">{editingCustomer ? 'Refine Profile' : 'New Customer'}</h3>
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-0.5">Customer Database</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                                <X className="w-6 h-6 text-slate-400" />
                            </button>
                        </div>
                        <div className="p-8 overflow-y-auto custom-scrollbar">
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                                            <input required placeholder="Ahmed Ali" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full p-4 border-2 border-slate-100 dark:border-slate-800 rounded-2xl dark:bg-slate-900 dark:text-white outline-none focus:border-[var(--brand-color)] transition-all font-bold placeholder:opacity-30" />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Phone Number</label>
                                            <input required placeholder="07XX XXX XXXX" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="w-full p-4 border-2 border-slate-100 dark:border-slate-800 rounded-2xl dark:bg-slate-900 dark:text-white outline-none focus:border-[var(--brand-color)] transition-all font-bold placeholder:opacity-30" />
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Address (Optional)</label>
                                        <input placeholder="customer@example.com" type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full p-4 border-2 border-slate-100 dark:border-slate-800 rounded-2xl dark:bg-slate-900 dark:text-white outline-none focus:border-[var(--brand-color)] transition-all font-bold placeholder:opacity-30" />
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Governorate</label>
                                            <SearchableSelect
                                                title="Select Governorate"
                                                options={GOVERNORATES.map(g => ({ value: g, label: g }))}
                                                selectedValue={formData.governorate}
                                                onChange={(val) => setFormData(prev => ({ ...prev, governorate: val }))}
                                                icon={MapPin}
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Channel</label>
                                            <SearchableSelect
                                                title="Select Channel"
                                                options={SOCIAL_PLATFORMS.map(p => ({ value: p, label: p }))}
                                                selectedValue={formData.social}
                                                onChange={(val) => setFormData(prev => ({ ...prev, social: val }))}
                                                icon={Globe}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Shipping Address</label>
                                        <textarea rows="3" placeholder="Street name, landmark, house number..." value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} className="w-full p-4 border-2 border-slate-100 dark:border-slate-800 rounded-2xl dark:bg-slate-900 dark:text-white outline-none focus:border-[var(--brand-color)] transition-all font-bold resize-none placeholder:opacity-30" />
                                    </div>
                                </div>

                                <div className="flex gap-4 pt-4">
                                    <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 border-2 border-slate-100 dark:border-slate-800 rounded-2xl font-black text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all active:scale-95">Cancel</button>
                                    <button
                                        type="submit"
                                        className="flex-2 py-4 text-white rounded-2xl font-black transition-all active:scale-95 bg-accent shadow-accent hover:brightness-110 flex-[2]"
                                    >
                                        {editingCustomer ? 'Save Profile' : 'Register Customer'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Order History Modal */}
            {isOrderHistoryOpen && selectedCustomer && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/90 backdrop-blur-md p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-[32px] shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in slide-in-from-bottom-8 duration-500">
                        <div className="px-10 py-8 border-b border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800">
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="flex items-center gap-3 mb-1">
                                        <div
                                            className="w-10 h-10 rounded-xl flex items-center justify-center"
                                            style={{
                                                backgroundColor: `color-mix(in srgb, var(--accent-color), transparent 90%)`,
                                                color: `var(--accent-color)`
                                            }}
                                        >
                                            <ShoppingBag className="w-6 h-6" />
                                        </div>
                                        <h3 className="text-2xl font-black text-slate-900 dark:text-white">Transaction Logs</h3>
                                    </div>
                                    <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.2em] ml-13">Customer: <span className="text-[var(--brand-color)]">{selectedCustomer.name}</span></p>
                                </div>
                                <button onClick={() => setIsOrderHistoryOpen(false)} className="w-12 h-12 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                                    <X className="w-8 h-8 text-slate-400" />
                                </button>
                            </div>
                        </div>

                        <div className="p-10 overflow-y-auto custom-scrollbar bg-slate-50/50 dark:bg-slate-900/50">
                            {getCustomerOrders(selectedCustomer._id).length === 0 ? (
                                <div className="text-center py-24">
                                    <div className="w-24 h-24 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-3xl flex items-center justify-center mx-auto mb-6 text-slate-200">
                                        <ShoppingBag className="w-12 h-12" />
                                    </div>
                                    <h4 className="text-slate-400 font-black uppercase text-xs tracking-widest">No Active Records Found</h4>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {getCustomerOrders(selectedCustomer._id).map(order => (
                                        <div key={order._id} className="bg-white dark:bg-slate-800 rounded-[28px] border-2 border-slate-50 dark:border-slate-800 shadow-sm overflow-hidden transition-all hover:shadow-xl hover:border-accent group">
                                            <div
                                                className="p-6 flex items-center justify-between cursor-pointer"
                                                onClick={() => setExpandedOrderId(expandedOrderId === order._id ? null : order._id)}
                                            >
                                                <div className="flex items-center gap-6">
                                                    <div className="w-14 h-14 bg-slate-50 dark:bg-slate-900 rounded-2xl flex items-center justify-center text-[var(--brand-color)] group-hover:bg-[var(--brand-color)] group-hover:text-white transition-all">
                                                        <ShoppingBag className="w-7 h-7" />
                                                    </div>
                                                    <div>
                                                        <div className="font-black text-slate-900 dark:text-white text-lg">{order.orderId}</div>
                                                        <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">{order.date}</div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-8">
                                                    <div className="text-right">
                                                        <div className="font-black text-slate-900 dark:text-white text-xl">{formatCurrency(order.total)}</div>
                                                        <div className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-lg inline-block mt-1 ${order.status === 'Completed' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                                                            order.status === 'Processing' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                                                                'bg-slate-50 text-slate-600 border border-slate-100'
                                                            }`}>
                                                            {order.status}
                                                        </div>
                                                    </div>
                                                    <div
                                                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-transform ${expandedOrderId === order._id ? 'rotate-180' : 'bg-slate-50 dark:bg-slate-900 text-slate-300'}`}
                                                        style={expandedOrderId === order._id ? {
                                                            backgroundColor: `color-mix(in srgb, var(--accent-color), transparent 90%)`,
                                                            color: `var(--accent-color)`
                                                        } : {}}
                                                    >
                                                        <ChevronDown className="w-6 h-6" />
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
                                                                        {item.quantity}×
                                                                    </div>
                                                                    <div>
                                                                        <span className="font-black text-slate-800 dark:text-white block text-sm">{item.product.name}</span>
                                                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{formatCurrency(item.price)} per unit</span>
                                                                    </div>
                                                                </div>
                                                                <span className="font-black text-slate-900 dark:text-white">{formatCurrency(item.price * item.quantity)}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row justify-between items-center gap-4">
                                                        <div className="flex items-center gap-4">
                                                            <div className="text-center">
                                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Payment Method</p>
                                                                <p className="text-sm font-bold text-slate-700 dark:text-white">Cash on Delivery</p>
                                                            </div>
                                                            <div className="w-px h-8 bg-slate-200 dark:bg-slate-700"></div>
                                                            <div className="text-center">
                                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Items Count</p>
                                                                <p className="text-sm font-bold text-slate-700 dark:text-white">{order.items.length} Items</p>
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handlePrintOrder(order); }}
                                                            className="flex items-center gap-2 px-8 py-4 bg-slate-900 dark:bg-slate-700 text-white rounded-2xl font-black text-sm transition-all shadow-xl active:scale-95 hover:brightness-125 hover:shadow-2xl"
                                                        >
                                                            <Printer className="w-5 h-5" />
                                                            Print Thermal Receipt
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
            )}
        </Layout>
    );
};

export default Customers;
