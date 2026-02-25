import React, { useEffect, useMemo, useState } from 'react';
import { format, isBefore, isWithinInterval, parseISO, startOfDay, subDays } from 'date-fns';
import Layout from '../components/Layout';
import DeleteConfirmModal from '../components/common/DeleteConfirmModal';
import { useCustomers, useInventory, useOrders, useProducts } from '../context/InventoryContext';
import { useTranslation } from 'react-i18next';
import { GOVERNORATES, SOCIAL_PLATFORMS } from '../constants/iraq';
import { exportOrdersToCSV } from '../utils/CSVExportUtil';
import OrderDetailsModal from '../components/orders/OrderDetailsModal';
import OrderFormModal from '../components/orders/OrderFormModal';
import OrdersHeader from '../components/orders/OrdersHeader';
import OrdersListCard from '../components/orders/OrdersListCard';
import OrdersTable from '../components/orders/OrdersTable';
import { printReceipt, triggerPDFPrint } from '../components/orders/ReceiptPrinter';

const INITIAL_ORDER_STATE = {
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
};

const STATUS_OPTIONS = ['Processing', 'Completed', 'Cancelled', 'Pending'];

const parseOrderDateSafe = (value) => {
    if (!value) return null;
    try {
        const parsed = parseISO(value);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
    } catch {
        return null;
    }
};

const dayKey = (value) => {
    if (!value) return '';
    try {
        return format(value, 'yyyy-MM-dd');
    } catch {
        return '';
    }
};

const Orders = () => {
    const { t } = useTranslation();
    const { orders, addOrder, updateOrder, deleteOrder } = useOrders();
    const { products } = useProducts();
    const { customers, addCustomer } = useCustomers();
    const {
        formatCurrency,
        brand,
        loading,
        appearance,
        addToast,
        setIsModalOpen,
        currentUser
    } = useInventory();

    const [searchTerm, setSearchTerm] = useState('');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [viewingOrder, setViewingOrder] = useState(null);
    const [editingOrderId, setEditingOrderId] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [orderToDelete, setOrderToDelete] = useState(null);

    const [displayLimit, setDisplayLimit] = useState(100);
    const [hasInitializedDate, setHasInitializedDate] = useState(false);
    const [filterGovernorates, setFilterGovernorates] = useState([]);
    const [filterSocials, setFilterSocials] = useState([]);
    const [filterCreatedBy, setFilterCreatedBy] = useState([]);
    const [filterStatuses, setFilterStatuses] = useState([]);
    const [sortBy, setSortBy] = useState('date-new');
    const [columnSort, setColumnSort] = useState({ column: 'date', direction: 'desc' });

    const [newOrder, setNewOrder] = useState(INITIAL_ORDER_STATE);
    const [selectedProductId, setSelectedProductId] = useState('');
    const [qty, setQty] = useState(1);
    const [isMobileView, setIsMobileView] = useState(() => (typeof window !== 'undefined' ? window.innerWidth < 640 : false));
    const normalizedSearchTerm = searchTerm.trim().toLowerCase();

    const orderDateMap = useMemo(() => {
        const map = new Map();
        orders.forEach((order) => {
            map.set(order._id, parseOrderDateSafe(order.date));
        });
        return map;
    }, [orders]);

    useEffect(() => {
        setIsModalOpen(isCreateModalOpen || isViewModalOpen || isDeleteModalOpen);
        return () => setIsModalOpen(false);
    }, [isCreateModalOpen, isViewModalOpen, isDeleteModalOpen, setIsModalOpen]);

    useEffect(() => {
        const onResize = () => setIsMobileView(window.innerWidth < 640);
        onResize();
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);

    const minDate = useMemo(() => {
        if (orders.length === 0) return subDays(new Date(), 30);
        return orders.reduce((min, order) => {
            const orderDate = orderDateMap.get(order._id);
            if (!orderDate) return min;
            return orderDate < min ? orderDate : min;
        }, new Date());
    }, [orders, orderDateMap]);

    const defaultRange = useMemo(() => ({ from: minDate, to: new Date() }), [minDate]);
    const [dateRange, setDateRange] = useState(defaultRange);

    useEffect(() => {
        if (!loading && orders.length > 0 && !hasInitializedDate) {
            setDateRange(defaultRange);
            setHasInitializedDate(true);
        }
    }, [loading, orders.length, defaultRange, hasInitializedDate]);

    const governorateOptions = useMemo(() => {
        const counts = {};
        orders.forEach((order) => {
            const gov = order.customer?.governorate;
            if (gov) counts[gov] = (counts[gov] || 0) + 1;
        });

        return GOVERNORATES.map((gov) => ({
            value: gov,
            label: gov,
            count: counts[gov] || 0
        })).sort((a, b) => b.count - a.count);
    }, [orders]);

    const socialOptions = useMemo(() => {
        const counts = {};
        orders.forEach((order) => {
            const social = order.customer?.social;
            if (social) counts[social] = (counts[social] || 0) + 1;
        });

        return SOCIAL_PLATFORMS.map((platform) => ({
            value: platform,
            label: platform,
            count: counts[platform] || 0
        })).sort((a, b) => b.count - a.count);
    }, [orders]);

    const createdByOptions = useMemo(() => {
        const counts = {};
        orders.forEach((order) => {
            const createdBy = order.createdBy || 'System';
            counts[createdBy] = (counts[createdBy] || 0) + 1;
        });

        return Object.entries(counts)
            .map(([value, count]) => ({ value, label: value, count }))
            .sort((a, b) => b.count - a.count);
    }, [orders]);

    const statusOptions = useMemo(() => {
        const counts = {};
        orders.forEach((order) => {
            if (order.status) counts[order.status] = (counts[order.status] || 0) + 1;
        });
        return STATUS_OPTIONS.map((status) => ({
            value: status,
            label: t(`common.status.${status.toLowerCase()}`, status),
            count: counts[status] || 0
        }));
    }, [orders, t]);

    const filteredAndSortedOrders = useMemo(() => {
        const filtered = orders.filter((order) => {
            const orderId = String(order.orderId || '').toLowerCase();
            const customerName = String(order.customer?.name || '').toLowerCase();
            const matchesSearch =
                !normalizedSearchTerm ||
                orderId.includes(normalizedSearchTerm) ||
                customerName.includes(normalizedSearchTerm);

            const orderDate = orderDateMap.get(order._id);
            if (!orderDate) return false;
            const matchesDate = !dateRange?.from || !dateRange?.to
                ? true
                : isWithinInterval(orderDate, { start: dateRange.from, end: dateRange.to });

            const matchesGov = filterGovernorates.length === 0 || filterGovernorates.includes(order.customer.governorate);
            const matchesSocial = filterSocials.length === 0 || filterSocials.includes(order.customer.social);
            const matchesStatus = filterStatuses.length === 0 || filterStatuses.includes(order.status);
            const createdBy = order.createdBy || 'System';
            const matchesCreatedBy = filterCreatedBy.length === 0 || filterCreatedBy.includes(createdBy);

            return matchesSearch && matchesDate && matchesGov && matchesSocial && matchesStatus && matchesCreatedBy;
        });

        const sorted = filtered.sort((a, b) => {
            let compare = 0;
            if (columnSort.column === 'orderId') compare = a.orderId.localeCompare(b.orderId);
            else if (columnSort.column === 'customer') compare = a.customer.name.localeCompare(b.customer.name);
            else if (columnSort.column === 'date') compare = (orderDateMap.get(a._id)?.getTime() || 0) - (orderDateMap.get(b._id)?.getTime() || 0);
            else if (columnSort.column === 'total') compare = a.total - b.total;
            else if (columnSort.column === 'status') compare = a.status.localeCompare(b.status);
            else if (columnSort.column === 'createdBy') compare = (a.createdBy || '').localeCompare(b.createdBy || '');

            return columnSort.direction === 'asc' ? compare : -compare;
        });

        return sorted.slice(0, displayLimit);
    }, [
        orders,
        normalizedSearchTerm,
        dateRange,
        filterGovernorates,
        filterSocials,
        filterStatuses,
        filterCreatedBy,
        columnSort,
        displayLimit,
        orderDateMap
    ]);

    const hasActiveFilters = useMemo(() => (
        filterGovernorates.length > 0 ||
        filterStatuses.length > 0 ||
        filterSocials.length > 0 ||
        filterCreatedBy.length > 0 ||
        searchTerm.trim().length > 0 ||
        dayKey(dateRange.from) !== dayKey(defaultRange.from) ||
        dayKey(dateRange.to) !== dayKey(defaultRange.to)
    ), [filterGovernorates, filterStatuses, filterSocials, filterCreatedBy, searchTerm, dateRange, defaultRange]);

    const handleSortChange = (value) => {
        setSortBy(value);
        if (value === 'date-new') setColumnSort({ column: 'date', direction: 'desc' });
        else if (value === 'date-old') setColumnSort({ column: 'date', direction: 'asc' });
        else if (value === 'total-high') setColumnSort({ column: 'total', direction: 'desc' });
        else if (value === 'total-low') setColumnSort({ column: 'total', direction: 'asc' });
        else if (value === 'name-asc') setColumnSort({ column: 'customer', direction: 'asc' });
    };

    const handleColumnSort = (column) => {
        if (columnSort.column === column) {
            setColumnSort((prev) => ({ ...prev, direction: prev.direction === 'asc' ? 'desc' : 'asc' }));
        } else {
            setColumnSort({ column, direction: 'asc' });
        }
    };

    const calculateSubtotal = (items) => items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    const calculateTotal = () => {
        const subtotal = calculateSubtotal(newOrder.items);
        const discountAmount = subtotal * (newOrder.discount / 100);
        const discounted = subtotal - discountAmount;
        return Math.ceil(discounted / 500) * 500;
    };

    const getAvailableStock = (productId) => {
        if (!productId) return 0;
        const product = products.find((p) => p._id === productId);
        const oldOrder = orders.find((order) => order._id === editingOrderId);
        const oldItem = oldOrder?.items.find((item) => item.product._id === productId);
        const oldQty = oldItem ? oldItem.quantity : 0;
        return (product?.stock || 0) + oldQty;
    };

    const handleAddToOrder = () => {
        if (!selectedProductId) return;
        const latestProduct = products.find((product) => product._id === selectedProductId);
        if (!latestProduct) return;

        const requestedQty = parseInt(qty);
        const totalAvailable = getAvailableStock(latestProduct._id);

        if (requestedQty > totalAvailable) {
            addToast(t('orders.stockError', { available: totalAvailable }), 'error');
            return;
        }

        const existingIndex = newOrder.items.findIndex((item) => item.product._id === latestProduct._id);
        const sellPrice = latestProduct.sellingPriceIQD || latestProduct.price || 0;

        if (existingIndex > -1) {
            const updatedItems = [...newOrder.items];
            const newQtyValue = updatedItems[existingIndex].quantity + requestedQty;
            if (newQtyValue > totalAvailable) {
                addToast(t('orders.limitReached', { available: totalAvailable }), 'error');
                return;
            }
            updatedItems[existingIndex].quantity = newQtyValue;
            setNewOrder((prev) => ({ ...prev, items: updatedItems }));
        } else {
            setNewOrder((prev) => ({
                ...prev,
                items: [...prev.items, { product: latestProduct, quantity: requestedQty, price: sellPrice }]
            }));
        }

        setQty(1);
        setSelectedProductId('');
    };

    const handleRemoveFromOrder = (index) => {
        const updated = newOrder.items.filter((_, itemIndex) => itemIndex !== index);
        setNewOrder((prev) => ({ ...prev, items: updated }));
    };

    const handlePriceChange = (index, newPrice) => {
        const updatedItems = [...newOrder.items];
        updatedItems[index].price = parseFloat(newPrice || 0);
        setNewOrder((prev) => ({ ...prev, items: updatedItems }));
    };

    const handleQtyChange = (index, newQty) => {
        const updatedItems = [...newOrder.items];
        updatedItems[index].quantity = parseInt(newQty || 0);
        setNewOrder((prev) => ({ ...prev, items: updatedItems }));
    };

    const handleCustomerSelectValue = (customerId) => {
        setNewOrder((prev) => ({ ...prev, customerId }));

        if (customerId === 'new') {
            setNewOrder((prev) => ({
                ...prev,
                customerName: '',
                customerPhone: '',
                customerGender: '',
                customerAddress: '',
                customerGovernorate: '',
                customerSocial: ''
            }));
            return;
        }

        if (!customerId) return;
        const customer = customers.find((c) => c._id === customerId);
        if (!customer) return;

        setNewOrder((prev) => ({
            ...prev,
            customerName: customer.name,
            customerPhone: customer.phone,
            customerGender: customer.gender || '',
            customerAddress: customer.address,
            customerGovernorate: customer.governorate,
            customerSocial: customer.social
        }));
    };

    const handleOpenCreate = () => {
        setEditingOrderId(null);
        setNewOrder(INITIAL_ORDER_STATE);
        setIsCreateModalOpen(true);
    };

    const handleEditOrder = (order) => {
        setIsViewModalOpen(false);
        setEditingOrderId(order._id);

        const existingCustomer = customers.find(
            (customer) => customer.name === order.customer.name && customer.phone === order.customer.phone
        );

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
        if (newOrder.items.length === 0) {
            addToast(t('orders.addItemsError'), 'error');
            return;
        }
        if (!newOrder.customerName || !newOrder.customerPhone) {
            addToast(t('orders.customerError'), 'error');
            return;
        }

        const currentOrder = orders.find((order) => order._id === editingOrderId);
        for (const item of newOrder.items) {
            const available = getAvailableStock(item.product._id);

            if (item.quantity > available) {
                addToast(t('orders.stockErrorWithName', { name: item.product.name, available }), 'error');
                return;
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

            const payload = {
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
                await updateOrder({ ...payload, _id: editingOrderId, orderId: currentOrder.orderId });
            } else {
                const created = await addOrder(payload);
                if (created) {
                    setTimeout(async () => {
                        const result = await printReceipt({
                            order: created,
                            brand,
                            formatCurrency,
                            t,
                            options: { source: 'orders' }
                        });
                        notifyPrintResult(result);
                    }, 800);
                }
            }

            setIsCreateModalOpen(false);
            setEditingOrderId(null);
            setNewOrder(INITIAL_ORDER_STATE);
        } catch (error) {
            console.error('Order submission error:', error);
            addToast(t('orders.errors.submitError', { message: error.message || t('orders.errors.unknown') }), 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const isSaveOrderDisabled = isSubmitting || newOrder.items.length === 0 || newOrder.items.some((item) => {
        return item.quantity > getAvailableStock(item.product._id);
    });

    const saveOrderLabel = editingOrderId ? t('orders.updateOrder') : t('orders.saveOrder');

    const canDeleteOrder = (order) => (
        currentUser?.role !== 'Sales' || !isBefore(parseISO(order.date), startOfDay(new Date()))
    );

    const notifyPrintResult = (result) => {
        if (!result) return;
        if (result.status === 'timeout') {
            addToast(t('common.printFlow.timeout'), 'warning');
            return;
        }
        if (result.status === 'popup-blocked') {
            addToast(`${t('common.printFlow.popupBlocked')} ${t('common.printFlow.retrySafari')}`, 'warning');
            return;
        }
        if (result.popupBlocked) {
            addToast(t('common.printFlow.popupBlocked'), 'info');
        }
    };

    const handleExportCSV = () => {
        if (filteredAndSortedOrders.length === 0) {
            addToast(t('common.noDataToExport'), 'info');
            return;
        }
        exportOrdersToCSV(filteredAndSortedOrders);
    };

    const handleClearFilters = () => {
        setSearchTerm('');
        setFilterStatuses([]);
        setFilterGovernorates([]);
        setFilterSocials([]);
        setFilterCreatedBy([]);
        setDateRange(defaultRange);
    };

    const handleRequestDelete = (order) => {
        setOrderToDelete(order);
        setIsDeleteModalOpen(true);
    };

    const handlePDFInvoice = (order) => {
        triggerPDFPrint({ order, brand, formatCurrency });
    };

    const handleThermalPrint = (order) => {
        void (async () => {
            const result = await printReceipt({
                order,
                brand,
                formatCurrency,
                t,
                options: { source: 'orders' }
            });
            notifyPrintResult(result);
        })();
    };

    return (
        <Layout title={t('orders.title')}>
            <OrdersHeader
                t={t}
                appearanceTheme={appearance.theme}
                canExport={currentUser?.role !== 'Sales'}
                onOpenCreate={handleOpenCreate}
                onExportCSV={handleExportCSV}
                onClearFilters={handleClearFilters}
                hasActiveFilters={hasActiveFilters}
                filteredCount={filteredAndSortedOrders.length}
                displayLimit={displayLimit}
                onDisplayLimitChange={setDisplayLimit}
                sortBy={sortBy}
                onSortChange={handleSortChange}
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                dateRange={dateRange}
                onDateRangeChange={setDateRange}
                brandColor={brand.color}
                statusOptions={statusOptions}
                filterStatuses={filterStatuses}
                onFilterStatusesChange={setFilterStatuses}
                governorateOptions={governorateOptions}
                filterGovernorates={filterGovernorates}
                onFilterGovernoratesChange={setFilterGovernorates}
                socialOptions={socialOptions}
                filterSocials={filterSocials}
                onFilterSocialsChange={setFilterSocials}
                createdByOptions={createdByOptions}
                filterCreatedBy={filterCreatedBy}
                onFilterCreatedByChange={setFilterCreatedBy}
            />

            <div className={`bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden transition-all ${['liquid', 'default_glass'].includes(appearance.theme) ? 'glass-panel' : ''}`}>
                {isMobileView ? (
                    <OrdersListCard
                        t={t}
                        loading={loading}
                        orders={filteredAndSortedOrders}
                        formatCurrency={formatCurrency}
                        onUpdateStatus={updateOrder}
                        onViewOrder={handleViewOrder}
                        onEditOrder={handleEditOrder}
                        onPDFInvoice={handlePDFInvoice}
                        onThermalPrint={handleThermalPrint}
                        canDeleteOrder={canDeleteOrder}
                        onRequestDelete={handleRequestDelete}
                    />
                ) : (
                    <OrdersTable
                        t={t}
                        loading={loading}
                        orders={filteredAndSortedOrders}
                        formatCurrency={formatCurrency}
                        columnSort={columnSort}
                        onColumnSort={handleColumnSort}
                        onUpdateStatus={updateOrder}
                        onViewOrder={handleViewOrder}
                        onEditOrder={handleEditOrder}
                        onPDFInvoice={handlePDFInvoice}
                        onThermalPrint={handleThermalPrint}
                        canDeleteOrder={canDeleteOrder}
                        onRequestDelete={handleRequestDelete}
                    />
                )}
            </div>

            <OrderFormModal
                isOpen={isCreateModalOpen}
                t={t}
                products={products}
                customers={customers}
                formatCurrency={formatCurrency}
                newOrder={newOrder}
                setNewOrder={setNewOrder}
                selectedProductId={selectedProductId}
                setSelectedProductId={setSelectedProductId}
                qty={qty}
                setQty={setQty}
                isSubmitting={isSubmitting}
                isSaveOrderDisabled={isSaveOrderDisabled}
                saveOrderLabel={saveOrderLabel}
                onClose={() => setIsCreateModalOpen(false)}
                onAddToOrder={handleAddToOrder}
                onPriceChange={handlePriceChange}
                onQtyChange={handleQtyChange}
                onRemoveFromOrder={handleRemoveFromOrder}
                onSubmit={handleSubmitOrder}
                onCustomerSelect={handleCustomerSelectValue}
                calculateSubtotal={calculateSubtotal}
                calculateTotal={calculateTotal}
                getAvailableStock={getAvailableStock}
            />

            <OrderDetailsModal
                isOpen={isViewModalOpen}
                order={viewingOrder}
                formatCurrency={formatCurrency}
                onClose={() => setIsViewModalOpen(false)}
                onEdit={handleEditOrder}
                onPDFInvoice={handlePDFInvoice}
                onThermalPrint={handleThermalPrint}
            />

            <DeleteConfirmModal
                isOpen={isDeleteModalOpen}
                onClose={() => {
                    setIsDeleteModalOpen(false);
                    setOrderToDelete(null);
                }}
                onConfirm={() => {
                    if (orderToDelete) {
                        deleteOrder(orderToDelete._id);
                        setIsDeleteModalOpen(false);
                        setOrderToDelete(null);
                    }
                }}
                title={t('common.delete')}
                message={t('orders.deleteConfirm')}
            />
        </Layout>
    );
};

export default Orders;
