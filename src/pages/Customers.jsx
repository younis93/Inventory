import React, { useState, useMemo } from 'react';
import Layout from '../components/Layout';
import { Search, Plus, Mail, Phone, MapPin, User, X, Edit, ShoppingBag, Facebook, Twitter, Instagram, Linkedin, Globe, MessageCircle, ChevronDown, Printer, Download } from 'lucide-react';
import { useInventory } from '../context/InventoryContext';
import { GOVERNORATES, SOCIAL_PLATFORMS } from '../constants/iraq';
import DateRangePicker from '../components/DateRangePicker';
import FilterDropdown from '../components/FilterDropdown';
import { isWithinInterval, parseISO, subDays } from 'date-fns';
import { exportCustomersToCSV } from '../utils/CSVExportUtil';

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
        return orders.filter(o => o.customer._id === customerId);
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
            if (sortBy === 'name-asc') return a.name.localeCompare(b.name);
            if (sortBy === 'name-desc') return b.name.localeCompare(a.name);

            const ordersA = getCustomerOrders(a._id).length;
            const ordersB = getCustomerOrders(b._id).length;
            if (sortBy === 'orders-high') return ordersB - ordersA;
            if (sortBy === 'orders-low') return ordersA - ordersB;

            if (sortBy === 'date-new') return b._id.localeCompare(a._id);

            return 0;
        });
    }, [customers, searchTerm, filterGovernorates, filterSocials, sortBy, orders]);


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
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-8 gap-4 bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                {/* Left Side: Add Button + Export + Stats */}
                <div className="flex gap-3 w-full xl:w-auto items-center">
                    <button
                        onClick={handleOpenAdd}
                        className="flex items-center gap-2 px-6 py-2.5 text-white rounded-xl font-bold transition-all shadow-lg"
                        style={{ backgroundColor: brand.color, boxShadow: `0 10px 15px -3px ${brand.color}33` }}
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

                    <div className="hidden lg:flex items-center gap-3 px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-700">
                        <User className="w-5 h-5 text-slate-400" />
                        <span className="text-sm font-bold text-slate-500">
                            <span className="text-slate-900 dark:text-white">{filteredAndSortedCustomers.length}</span> Customers
                        </span>
                    </div>
                </div>

                {/* Right Side: Filters */}
                <div className="flex flex-col md:flex-row gap-3 w-full xl:w-auto flex-wrap">
                    <div className="relative w-full md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search by name or phone..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-2.5 w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-[var(--brand-color)]/20"
                        />
                    </div>

                    <FilterDropdown
                        title="Governorate"
                        options={governorateOptions}
                        selectedValues={filterGovernorates}
                        onChange={setFilterGovernorates}
                        icon={MapPin}
                    />

                    <FilterDropdown
                        title="Social Media"
                        options={socialOptions}
                        selectedValues={filterSocials}
                        onChange={setFilterSocials}
                        icon={Globe}
                    />

                    <DateRangePicker
                        range={dateRange}
                        onRangeChange={setDateRange}
                        brandColor={brand.color}
                    />

                    <div className="relative">
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="appearance-none w-full md:w-48 pl-4 pr-10 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900/50 dark:text-white outline-none text-sm font-medium focus:ring-2 focus:ring-[var(--brand-color)]/20"
                        >
                            <option value="orders-high">Top Spenders</option>
                            <option value="orders-low">Lowest Spenders</option>
                            <option value="date-new">Recently Joined</option>
                            <option value="name-asc">Alphabetical (A-Z)</option>
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 border-l border-slate-300 pl-2 pointer-events-none">
                            <ChevronDown className="w-4 h-4 text-slate-400" />
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredAndSortedCustomers.map(customer => {
                    const custOrders = getCustomerOrders(customer._id);
                    const totalSpent = custOrders.reduce((sum, o) => sum + o.total, 0);
                    return (
                        <div key={customer._id} className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-xl transition-all duration-300 group overflow-hidden flex flex-col">
                            <div className="p-6 pb-4 flex-1">
                                <div className="flex justify-between items-start mb-6">
                                    <div className="w-16 h-16 rounded-2xl bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-[var(--brand-color)] font-black text-2xl border border-slate-100 dark:border-slate-800 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900 transition-colors">
                                        {customer.name.charAt(0)}
                                    </div>
                                    <button onClick={() => handleOpenEdit(customer)} className="p-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 transition-colors">
                                        <Edit className="w-4 h-4" />
                                    </button>
                                </div>

                                <div className="mb-6">
                                    <h3 className="font-black text-slate-900 dark:text-white text-xl mb-2 truncate">{customer.name}</h3>
                                    <div className="flex items-center gap-2">
                                        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg text-xs font-black">
                                            <ShoppingBag className="w-3 h-3" />
                                            {custOrders.length} {custOrders.length === 1 ? 'Order' : 'Orders'}
                                        </div>
                                        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg text-xs font-black">
                                            {formatCurrency(totalSpent)}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-3.5">
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
                                            <span className="font-bold text-slate-700 dark:text-slate-300">{customer.governorate}</span>
                                            <span className="text-[11px] opacity-70 line-clamp-1">{customer.address}</span>
                                        </div>
                                    </div>
                                    {customer.social && (
                                        <div className="flex items-center gap-3 text-sm">
                                            <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-900 flex items-center justify-center border border-slate-100 dark:border-slate-800 shrink-0">
                                                {getSocialIcon(customer.social)}
                                            </div>
                                            <span className="text-[11px] font-black uppercase text-blue-500 tracking-wider">
                                                Connected via {customer.social}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="px-6 py-5 bg-slate-50 dark:bg-slate-900/30 border-t border-slate-100 dark:border-slate-800">
                                <button
                                    onClick={() => handleOpenHistory(customer)}
                                    className="w-full py-3.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-white text-sm font-black rounded-2xl border-2 border-slate-200 dark:border-slate-700 hover:border-[var(--brand-color)] hover:text-[var(--brand-color)] transition-all flex items-center justify-center gap-2 shadow-sm active:scale-95"
                                >
                                    <ShoppingBag className="w-4 h-4" />
                                    Full Order History
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

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

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Governorate</label>
                                            <div className="relative">
                                                <select
                                                    required
                                                    value={formData.governorate}
                                                    onChange={e => setFormData({ ...formData, governorate: e.target.value })}
                                                    className="w-full p-4 border-2 border-slate-100 dark:border-slate-800 rounded-2xl dark:bg-slate-900 dark:text-white outline-none focus:border-[var(--brand-color)] transition-all font-bold appearance-none cursor-pointer"
                                                >
                                                    <option value="">Select...</option>
                                                    {GOVERNORATES.map(g => <option key={g} value={g}>{g}</option>)}
                                                </select>
                                                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Channel</label>
                                            <div className="relative">
                                                <select
                                                    value={formData.social}
                                                    onChange={e => setFormData({ ...formData, social: e.target.value })}
                                                    className="w-full p-4 border-2 border-slate-100 dark:border-slate-800 rounded-2xl dark:bg-slate-900 dark:text-white outline-none focus:border-[var(--brand-color)] transition-all font-bold appearance-none cursor-pointer"
                                                >
                                                    <option value="">Select...</option>
                                                    {SOCIAL_PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
                                                </select>
                                                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                            </div>
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
                                        className="flex-2 py-4 text-white rounded-2xl font-black shadow-2xl transition-all active:scale-95 hover:brightness-110 flex-[2]"
                                        style={{ backgroundColor: brand.color, boxShadow: `0 15px 30px -10px ${brand.color}60` }}
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
                                        <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
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
                                        <div key={order._id} className="bg-white dark:bg-slate-800 rounded-[28px] border-2 border-slate-50 dark:border-slate-800 shadow-sm overflow-hidden transition-all hover:shadow-xl hover:border-indigo-100 dark:hover:border-indigo-900/30 group">
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
                                                    <div className={`w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-900 flex items-center justify-center transition-transform ${expandedOrderId === order._id ? 'rotate-180 bg-indigo-50 text-indigo-500' : 'text-slate-300'}`}>
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
