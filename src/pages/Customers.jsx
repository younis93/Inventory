import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { printReceipt } from '../components/orders/ReceiptPrinter';

const INITIAL_FORM_STATE = {
    name: '',
    email: '',
    phone: '',
    address: '',
    governorate: '',
    social: '',
    notes: ''
};

const buildCustomerContactKey = (name, phone) => `${String(name || '').trim().toLowerCase()}::${String(phone || '').trim()}`;

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
        currentUser,
        settingsUserResolved
    } = useInventory();

    const [searchTerm, setSearchTerm] = useState('');
    const [filterGovernorates, setFilterGovernorates] = useState([]);
    const [filterSocials, setFilterSocials] = useState([]);
    const [filterCreatedBy, setFilterCreatedBy] = useState([]);
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
    const canExportCustomers = settingsUserResolved && (currentUser?.role === 'Admin' || currentUser?.role === 'Manager');

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

    const createdByOptions = useMemo(() => {
        const counts = {};
        customers.forEach((customer) => {
            const createdBy = customer.createdBy || 'System';
            counts[createdBy] = (counts[createdBy] || 0) + 1;
        });
        return Object.entries(counts)
            .map(([value, count]) => ({ value, label: value, count }))
            .sort((a, b) => b.count - a.count);
    }, [customers]);

    const customerIdSet = useMemo(() => new Set(customers.map((customer) => customer._id)), [customers]);

    const customerIdByContactKey = useMemo(() => {
        const map = new Map();
        customers.forEach((customer) => {
            const key = buildCustomerContactKey(customer.name, customer.phone);
            if (key !== '::' && !map.has(key)) map.set(key, customer._id);
        });
        return map;
    }, [customers]);

    const customerOrdersMap = useMemo(() => {
        const map = new Map();
        customers.forEach((customer) => map.set(customer._id, []));

        orders.forEach((order) => {
            const directId = order.customer?._id;
            if (directId && customerIdSet.has(directId)) {
                map.get(directId)?.push(order);
                return;
            }

            const fallbackKey = buildCustomerContactKey(order.customer?.name, order.customer?.phone);
            const fallbackCustomerId = customerIdByContactKey.get(fallbackKey);
            if (fallbackCustomerId) {
                map.get(fallbackCustomerId)?.push(order);
            }
        });

        return map;
    }, [customers, orders, customerIdByContactKey, customerIdSet]);

    const customerOrderStatsMap = useMemo(() => {
        const stats = new Map();
        customerOrdersMap.forEach((ordersList, customerId) => {
            let totalSpent = 0;
            ordersList.forEach((order) => {
                totalSpent += Number(order.total || 0);
            });
            stats.set(customerId, {
                orders: ordersList,
                orderCount: ordersList.length,
                totalSpent
            });
        });
        return stats;
    }, [customerOrdersMap]);

    const getCustomerOrders = useCallback((customerId) => {
        return customerOrderStatsMap.get(customerId)?.orders || [];
    }, [customerOrderStatsMap]);

    const getCustomerStats = useCallback((customerId) => {
        return customerOrderStatsMap.get(customerId) || { orders: [], orderCount: 0, totalSpent: 0 };
    }, [customerOrderStatsMap]);

    const customerDateMap = useMemo(() => {
        const map = new Map();
        customers.forEach((customer) => {
            const dateString = customer.createdOn || customer.createdAt;
            if (!dateString) {
                map.set(customer._id, null);
                return;
            }
            try {
                const parsed = typeof dateString === 'string'
                    ? parseISO(dateString)
                    : dateString.toDate
                        ? dateString.toDate()
                        : new Date(dateString);
                map.set(customer._id, Number.isNaN(parsed?.getTime?.()) ? null : parsed);
            } catch {
                map.set(customer._id, null);
            }
        });
        return map;
    }, [customers]);

    const getValidDate = useCallback((customer) => customerDateMap.get(customer._id) || null, [customerDateMap]);

    const filteredAndSortedCustomers = useMemo(() => {
        const filtered = customers.filter((customer) => {
            const matchesSearch =
                customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                customer.phone.includes(searchTerm);

            const createdDate = customerDateMap.get(customer._id);
            let matchesDate = true;
            if (dateRange?.from && dateRange?.to && createdDate) {
                const start = startOfDay(dateRange.from);
                const end = endOfDay(dateRange.to);
                matchesDate = createdDate >= start && createdDate <= end;
            }

            const matchesGovernorate = filterGovernorates.length === 0 || filterGovernorates.includes(customer.governorate);
            const matchesSocial = filterSocials.length === 0 || filterSocials.includes(customer.social);
            const createdBy = customer.createdBy || 'System';
            const matchesCreatedBy = filterCreatedBy.length === 0 || filterCreatedBy.includes(createdBy);

            return matchesSearch && matchesDate && matchesGovernorate && matchesSocial && matchesCreatedBy;
        });

        const sorted = filtered.sort((a, b) => {
            if (columnSort.column === 'name') {
                const valA = a.name.toLowerCase();
                const valB = b.name.toLowerCase();
                return columnSort.direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
            }
            if (columnSort.column === 'orders') {
                const valA = customerOrderStatsMap.get(a._id)?.orderCount || 0;
                const valB = customerOrderStatsMap.get(b._id)?.orderCount || 0;
                return columnSort.direction === 'asc' ? valA - valB : valB - valA;
            }
            if (columnSort.column === 'spent') {
                const valA = customerOrderStatsMap.get(a._id)?.totalSpent || 0;
                const valB = customerOrderStatsMap.get(b._id)?.totalSpent || 0;
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
        filterCreatedBy,
        columnSort,
        dateRange,
        displayLimit,
        customerDateMap,
        customerOrderStatsMap
    ]);

    const hasActiveFilters = useMemo(() => (
        filterGovernorates.length > 0 ||
        filterSocials.length > 0 ||
        filterCreatedBy.length > 0 ||
        Boolean(searchTerm) ||
        !isSameDay(dateRange.from, defaultRange.from) ||
        !isSameDay(dateRange.to, defaultRange.to)
    ), [filterGovernorates, filterSocials, filterCreatedBy, searchTerm, dateRange, defaultRange]);

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
        setFilterCreatedBy([]);
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
        void (async () => {
            const result = await printReceipt({
                order,
                brand,
                formatCurrency,
                t,
                options: { source: 'customers' }
            });
            if (result?.status === 'timeout') {
                addToast(t('common.printFlow.timeout'), 'warning');
            } else if (result?.status === 'popup-blocked') {
                addToast(`${t('common.printFlow.popupBlocked')} ${t('common.printFlow.retrySafari')}`, 'warning');
            } else if (result?.popupBlocked) {
                addToast(t('common.printFlow.popupBlocked'), 'info');
            }
        })();
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
                canExport={canExportCustomers}
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
                createdByOptions={createdByOptions}
                filterCreatedBy={filterCreatedBy}
                onFilterCreatedByChange={setFilterCreatedBy}
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
                    getCustomerStats={getCustomerStats}
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
                    getCustomerStats={getCustomerStats}
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
