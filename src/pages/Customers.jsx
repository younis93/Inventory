import React, { useEffect, useMemo, useState } from 'react';
import { endOfDay, parseISO, startOfDay, subDays, isSameDay } from 'date-fns';
import { Facebook, Globe, Instagram, MessageCircle, Twitter } from 'lucide-react';
import Layout from '../components/Layout';
import { useCustomers, useInventory, useOrders } from '../context/InventoryContext';
import { GOVERNORATES, SOCIAL_PLATFORMS } from '../constants/iraq';
import { useTranslation } from 'react-i18next';
import { exportCustomersToCSV } from '../utils/CSVExportUtil';
import CustomerFormModal from '../components/customers/CustomerFormModal';
import CustomersCardGrid from '../components/customers/CustomersCardGrid';
import CustomersHeader from '../components/customers/CustomersHeader';
import CustomersTable from '../components/customers/CustomersTable';
import OrderHistoryModal from '../components/customers/OrderHistoryModal';

const INITIAL_FORM_STATE = {
    name: '',
    email: '',
    phone: '',
    address: '',
    governorate: '',
    social: '',
    notes: ''
};

const Customers = () => {
    const { t } = useTranslation();
    const { customers, addCustomer, updateCustomer } = useCustomers();
    const { orders } = useOrders();
    const {
        formatCurrency,
        brand,
        addToast,
        loading,
        appearance,
        setIsModalOpen: setGlobalModalOpen,
        currentUser
    } = useInventory();

    const [searchTerm, setSearchTerm] = useState('');
    const [filterGovernorates, setFilterGovernorates] = useState([]);
    const [filterSocials, setFilterSocials] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isOrderHistoryOpen, setIsOrderHistoryOpen] = useState(false);
    const [sortBy, setSortBy] = useState('orders-high');
    const [hasInitializedDate, setHasInitializedDate] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [editingCustomer, setEditingCustomer] = useState(null);
    const [expandedOrderId, setExpandedOrderId] = useState(null);
    const [columnSort, setColumnSort] = useState({ column: 'orders', direction: 'desc' });
    const [viewMode, setViewMode] = useState('table');
    const [displayLimit, setDisplayLimit] = useState(100);
    const [formData, setFormData] = useState(INITIAL_FORM_STATE);

    useEffect(() => {
        setGlobalModalOpen(isModalOpen || isOrderHistoryOpen);
        return () => setGlobalModalOpen(false);
    }, [isModalOpen, isOrderHistoryOpen, setGlobalModalOpen]);

    const minDate = useMemo(() => {
        if (customers.length === 0) return subDays(new Date(), 90);
        return customers.reduce((min, customer) => {
            try {
                const customerDate = customer.createdOn ? parseISO(customer.createdOn) : new Date();
                return customerDate < min ? customerDate : min;
            } catch {
                return min;
            }
        }, new Date());
    }, [customers]);

    const defaultRange = useMemo(() => ({ from: minDate, to: new Date() }), [minDate]);
    const [dateRange, setDateRange] = useState(defaultRange);

    useEffect(() => {
        if (customers.length > 0 && !hasInitializedDate) {
            setDateRange({ from: minDate, to: new Date() });
            setHasInitializedDate(true);
        }
    }, [customers.length, hasInitializedDate, minDate]);

    useEffect(() => {
        const applyResponsive = () => {
            if (window.innerWidth < 640) setViewMode('card');
        };
        applyResponsive();
        window.addEventListener('resize', applyResponsive);
        return () => window.removeEventListener('resize', applyResponsive);
    }, []);

    const governorateOptions = useMemo(() => {
        const counts = {};
        customers.forEach((customer) => {
            if (customer.governorate) counts[customer.governorate] = (counts[customer.governorate] || 0) + 1;
        });
        return GOVERNORATES.map((gov) => ({ value: gov, label: gov, count: counts[gov] || 0 })).sort((a, b) => b.count - a.count);
    }, [customers]);

    const socialOptions = useMemo(() => {
        const counts = {};
        customers.forEach((customer) => {
            if (customer.social) counts[customer.social] = (counts[customer.social] || 0) + 1;
        });
        return SOCIAL_PLATFORMS.map((social) => ({ value: social, label: social, count: counts[social] || 0 })).sort((a, b) => b.count - a.count);
    }, [customers]);

    const getCustomerOrders = (customerId) => {
        return orders.filter((order) => {
            const customer = customers.find((c) => c._id === customerId);
            if (!customer) return false;
            if (order.customer?._id === customerId) return true;
            return order.customer?.name === customer.name && order.customer?.phone === customer.phone;
        });
    };

    const getValidDate = (customer) => {
        const dateString = customer.createdOn || customer.createdAt;
        if (!dateString) return null;
        try {
            return typeof dateString === 'string'
                ? parseISO(dateString)
                : dateString.toDate
                    ? dateString.toDate()
                    : new Date(dateString);
        } catch {
            return null;
        }
    };

    const filteredAndSortedCustomers = useMemo(() => {
        const filtered = customers.filter((customer) => {
            const matchesSearch =
                customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                customer.phone.includes(searchTerm);

            const createdDate = getValidDate(customer);
            let matchesDate = true;
            if (dateRange?.from && dateRange?.to && createdDate) {
                const start = startOfDay(dateRange.from);
                const end = endOfDay(dateRange.to);
                matchesDate = createdDate >= start && createdDate <= end;
            }

            const matchesGovernorate = filterGovernorates.length === 0 || filterGovernorates.includes(customer.governorate);
            const matchesSocial = filterSocials.length === 0 || filterSocials.includes(customer.social);

            return matchesSearch && matchesDate && matchesGovernorate && matchesSocial;
        });

        const sorted = filtered.sort((a, b) => {
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
                const valA = getCustomerOrders(a._id).reduce((sum, order) => sum + order.total, 0);
                const valB = getCustomerOrders(b._id).reduce((sum, order) => sum + order.total, 0);
                return columnSort.direction === 'asc' ? valA - valB : valB - valA;
            }
            if (columnSort.column === 'governorate') {
                const valA = (a.governorate || '').toLowerCase();
                const valB = (b.governorate || '').toLowerCase();
                return columnSort.direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
            }
            return 0;
        });

        return sorted.slice(0, displayLimit);
    }, [
        customers,
        searchTerm,
        filterGovernorates,
        filterSocials,
        columnSort,
        orders,
        dateRange,
        displayLimit
    ]);

    const hasActiveFilters = useMemo(() => (
        filterGovernorates.length > 0 ||
        filterSocials.length > 0 ||
        Boolean(searchTerm) ||
        !isSameDay(dateRange.from, defaultRange.from) ||
        !isSameDay(dateRange.to, defaultRange.to)
    ), [filterGovernorates, filterSocials, searchTerm, dateRange, defaultRange]);

    const handleSortChange = (value) => {
        setSortBy(value);
        if (value === 'orders-high') setColumnSort({ column: 'orders', direction: 'desc' });
        else if (value === 'orders-low') setColumnSort({ column: 'orders', direction: 'asc' });
        else if (value === 'name-asc') setColumnSort({ column: 'name', direction: 'asc' });
        else if (value === 'date-new') setColumnSort({ column: 'orders', direction: 'desc' });
    };

    const handleColumnSort = (column) => {
        if (columnSort.column === column) {
            setColumnSort((prev) => ({ ...prev, direction: prev.direction === 'asc' ? 'desc' : 'asc' }));
        } else {
            setColumnSort({ column, direction: 'asc' });
        }
    };

    const handleOpenAdd = () => {
        setEditingCustomer(null);
        setFormData(INITIAL_FORM_STATE);
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

    const handleSubmit = (event) => {
        event.preventDefault();
        if (editingCustomer) {
            updateCustomer({ ...formData, _id: editingCustomer._id });
        } else {
            addCustomer(formData);
        }
        setIsModalOpen(false);
    };

    const handleClearFilters = () => {
        setSearchTerm('');
        setFilterGovernorates([]);
        setFilterSocials([]);
        setDateRange(defaultRange);
    };

    const handleExportCSV = () => {
        if (filteredAndSortedCustomers.length === 0) {
            addToast(t('customers.noMatch'), 'info');
            return;
        }
        exportCustomersToCSV(filteredAndSortedCustomers);
    };

    const handlePrintOrder = (order) => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        printWindow.document.write(`
            <html>
                <head>
                    <title>${t('customers.receipt.title')} ${order.orderId}</title>
                    <style>
                        body { font-family: sans-serif; padding: 20px; direction: ${document.dir}; }
                        .header { text-align: center; margin-bottom: 20px; }
                        .order-info { margin-bottom: 20px; border-bottom: 1px solid #ccc; padding-bottom: 10px; }
                        table { width: 100%; border-collapse: collapse; }
                        th, td { text-align: ${document.dir === 'rtl' ? 'right' : 'left'}; padding: 8px; border-bottom: 1px solid #eee; }
                        .total { text-align: ${document.dir === 'rtl' ? 'left' : 'right'}; font-weight: bold; font-size: 1.2em; margin-top: 20px; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h1>${t('customers.receipt.title')}</h1>
                        <h3>${order.orderId}</h3>
                    </div>
                    <div class="order-info">
                        <p><strong>${t('customers.receipt.customer')}:</strong> ${order.customer.name}</p>
                        <p><strong>${t('customers.receipt.date')}:</strong> ${order.date}</p>
                        <p><strong>${t('customers.receipt.status')}:</strong> ${order.status}</p>
                    </div>
                    <table>
                        <thead>
                            <tr>
                                <th>${t('customers.receipt.item')}</th>
                                <th>${t('customers.receipt.qty')}</th>
                                <th>${t('customers.receipt.price')}</th>
                                <th>${t('customers.receipt.total')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${(order.items || []).map((item) => `
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
                        ${t('customers.receipt.total')}: ${new Intl.NumberFormat('en-IQ', { style: 'currency', currency: 'IQD', maximumFractionDigits: 0 }).format(order.total)}
                    </div>
                    <script>window.onload = function() { window.print(); window.close(); }</script>
                </body>
            </html>
        `);
        printWindow.document.close();
    };

    const getSocialIcon = (platform) => {
        switch (platform?.toLowerCase()) {
            case 'facebook':
                return <Facebook className="w-4 h-4" />;
            case 'instagram':
                return <Instagram className="w-4 h-4" />;
            case 'twitter':
                return <Twitter className="w-4 h-4" />;
            case 'tiktok':
                return <div className="w-4 h-4 font-bold text-xs flex items-center justify-center">TT</div>;
            case 'whatsapp':
                return <MessageCircle className="w-4 h-4" />;
            default:
                return <Globe className="w-4 h-4" />;
        }
    };

    return (
        <Layout title={t('customers.title')}>
            <CustomersHeader
                t={t}
                appearanceTheme={appearance.theme}
                canExport={currentUser?.role !== 'Sales'}
                onOpenAdd={handleOpenAdd}
                onExportCSV={handleExportCSV}
                hasActiveFilters={hasActiveFilters}
                onClearFilters={handleClearFilters}
                displayLimit={displayLimit}
                onDisplayLimitChange={setDisplayLimit}
                filteredCount={filteredAndSortedCustomers.length}
                sortBy={sortBy}
                onSortChange={handleSortChange}
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                dateRange={dateRange}
                onDateRangeChange={setDateRange}
                brandColor={brand.color}
                governorateOptions={governorateOptions}
                filterGovernorates={filterGovernorates}
                onFilterGovernoratesChange={setFilterGovernorates}
                socialOptions={socialOptions}
                filterSocials={filterSocials}
                onFilterSocialsChange={setFilterSocials}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
            />

            {viewMode === 'table' ? (
                <div className={`rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden transition-all ${['liquid', 'default_glass'].includes(appearance.theme) ? 'glass-panel' : 'bg-white dark:bg-slate-800'}`}>
                    <CustomersTable
                        t={t}
                        loading={loading}
                        customersData={filteredAndSortedCustomers}
                        formatCurrency={formatCurrency}
                        getCustomerOrders={getCustomerOrders}
                        getValidDate={getValidDate}
                        onOpenHistory={handleOpenHistory}
                        onOpenEdit={handleOpenEdit}
                        columnSort={columnSort}
                        onColumnSort={handleColumnSort}
                    />
                </div>
            ) : (
                <CustomersCardGrid
                    t={t}
                    loading={loading}
                    customersData={filteredAndSortedCustomers}
                    appearanceTheme={appearance.theme}
                    getCustomerOrders={getCustomerOrders}
                    formatCurrency={formatCurrency}
                    onOpenHistory={handleOpenHistory}
                    onOpenEdit={handleOpenEdit}
                    getSocialIcon={getSocialIcon}
                />
            )}

            <CustomerFormModal
                isOpen={isModalOpen}
                appearanceTheme={appearance.theme}
                t={t}
                editingCustomer={editingCustomer}
                formData={formData}
                setFormData={setFormData}
                onSubmit={handleSubmit}
                onClose={() => setIsModalOpen(false)}
            />

            <OrderHistoryModal
                isOpen={isOrderHistoryOpen}
                selectedCustomer={selectedCustomer}
                appearanceTheme={appearance.theme}
                t={t}
                getCustomerOrders={getCustomerOrders}
                expandedOrderId={expandedOrderId}
                setExpandedOrderId={setExpandedOrderId}
                formatCurrency={formatCurrency}
                onClose={() => setIsOrderHistoryOpen(false)}
                onPrintOrder={handlePrintOrder}
            />
        </Layout>
    );
};

export default Customers;
