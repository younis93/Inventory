import React, { useEffect, useMemo, useState } from 'react';
import { endOfDay, format, isWithinInterval, parseISO, startOfDay, subDays } from 'date-fns';
import { FixedSizeList as List } from 'react-window';
import { CalendarClock, Download, Edit, Package, Plus, Search, ShoppingBag, Trash2, User, X } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import DateRangePicker from '../components/DateRangePicker';
import FilterDropdown from '../components/FilterDropdown';
import RowLimitDropdown from '../components/RowLimitDropdown';
import PurchaseFormModal from '../components/purchases/PurchaseFormModal';
import DeleteConfirmModal from '../components/common/DeleteConfirmModal';
import { useInventory, useProducts, usePurchases } from '../context/InventoryContext';
import { getLastStatusEntry, getPurchaseDisplayId, getPurchaseTotalCostIQD, normalizePurchaseStatus } from '../hooks/domains/purchaseUtils';
import { exportPurchasesToCSV } from '../utils/CSVExportUtil';
import { useTranslation } from 'react-i18next';

const todayIso = () => new Date().toISOString().slice(0, 10);

const parseDateSafe = (value) => {
    if (!value) return null;
    try {
        const parsed = parseISO(String(value));
        if (!Number.isNaN(parsed.getTime())) return parsed;
    } catch {
        // no-op
    }
    const fallback = new Date(value);
    if (Number.isNaN(fallback.getTime())) return null;
    return fallback;
};

const formatDateSafe = (value) => {
    const parsed = parseDateSafe(value);
    if (!parsed) return '-';
    return format(parsed, 'yyyy MMM dd');
};

const PurchaseStatusBadge = ({ status, t }) => {
    const styleMap = {
        ordered: 'bg-slate-100 text-slate-700',
        factory: 'bg-blue-100 text-blue-700',
        chinaWarehouse: 'bg-purple-100 text-purple-700',
        shippingToIraq: 'bg-orange-100 text-orange-700',
        received: 'bg-emerald-100 text-emerald-700'
    };

    const normalizedStatus = normalizePurchaseStatus(status);

    return (
        <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${styleMap[normalizedStatus] || 'bg-slate-100 text-slate-700'}`}>
            {t(`purchases.statuses.${normalizedStatus}`)}
        </span>
    );
};

const gridClass = 'grid grid-cols-[1.1fr_1.9fr_0.8fr_1fr_1fr_1fr_1fr_1.4fr]';

const Purchases = () => {
    const { t } = useTranslation();
    const location = useLocation();
    const navigate = useNavigate();
    const { products } = useProducts();
    const {
        loading,
        purchases,
        purchaseStatuses,
        canManagePurchases,
        addPurchase,
        updatePurchase,
        updatePurchaseStatus,
        deletePurchase
    } = usePurchases();
    const { formatCurrency, addToast, setIsModalOpen: setGlobalModalOpen, language } = useInventory();

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedStatuses, setSelectedStatuses] = useState([]);
    const [selectedProducts, setSelectedProducts] = useState([]);
    const [selectedCreatedBy, setSelectedCreatedBy] = useState([]);
    const [displayLimit, setDisplayLimit] = useState(100);
    const [dateRange, setDateRange] = useState({
        from: subDays(new Date(), 30),
        to: new Date()
    });

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingPurchase, setEditingPurchase] = useState(null);
    const [purchaseToDelete, setPurchaseToDelete] = useState(null);
    const [statusEditorPurchase, setStatusEditorPurchase] = useState(null);
    const [statusForm, setStatusForm] = useState({ status: '', date: todayIso(), note: '' });
    const [statusSubmitting, setStatusSubmitting] = useState(false);
    const [statusError, setStatusError] = useState('');
    const [isMobileView, setIsMobileView] = useState(() => (typeof window !== 'undefined' ? window.innerWidth < 640 : false));
    useEffect(() => {
        setGlobalModalOpen(isFormOpen || Boolean(purchaseToDelete) || Boolean(statusEditorPurchase));
        return () => setGlobalModalOpen(false);
    }, [isFormOpen, purchaseToDelete, statusEditorPurchase, setGlobalModalOpen]);

    useEffect(() => {
        const productId = new URLSearchParams(location.search).get('productId');
        if (!productId) return;
        setSelectedProducts([productId]);
        setIsFormOpen(false);
    }, [location.search]);

    useEffect(() => {
        const onResize = () => setIsMobileView(window.innerWidth < 640);
        onResize();
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);

    const productOptions = useMemo(() => {
        const counts = {};
        purchases.forEach((purchase) => {
            const key = purchase.productId;
            if (!key) return;
            counts[key] = (counts[key] || 0) + 1;
        });
        return products.map((product) => ({
            value: product._id,
            label: `${product.name || 'Unnamed'} (${product.sku || '-'})`,
            count: counts[product._id] || 0
        }));
    }, [products, purchases]);

    const statusOptions = useMemo(() => {
        const counts = {};
        purchases.forEach((purchase) => {
            const key = normalizePurchaseStatus(purchase.status || purchaseStatuses[0]);
            counts[key] = (counts[key] || 0) + 1;
        });
        return purchaseStatuses.map((status) => ({
            value: status,
            label: t(`purchases.statuses.${status}`),
            count: counts[status] || 0
        }));
    }, [purchaseStatuses, purchases, t]);

    const createdByOptions = useMemo(() => {
        const counts = {};
        purchases.forEach((purchase) => {
            const createdBy = purchase.createdBy || 'System';
            counts[createdBy] = (counts[createdBy] || 0) + 1;
        });
        return Object.entries(counts)
            .map(([value, count]) => ({ value, label: value, count }))
            .sort((a, b) => b.count - a.count);
    }, [purchases]);

    const filteredPurchases = useMemo(() => {
        const query = searchTerm.trim().toLowerCase();
        const hasRange = Boolean(dateRange?.from && dateRange?.to);
        const from = hasRange ? startOfDay(dateRange.from) : null;
        const to = hasRange ? endOfDay(dateRange.to) : null;

        return purchases.filter((purchase) => {
            const status = normalizePurchaseStatus(purchase.status || purchaseStatuses[0]);
            if (selectedStatuses.length > 0 && !selectedStatuses.includes(status)) return false;
            if (selectedProducts.length > 0 && !selectedProducts.includes(purchase.productId)) return false;
            const createdBy = purchase.createdBy || 'System';
            if (selectedCreatedBy.length > 0 && !selectedCreatedBy.includes(createdBy)) return false;

            if (hasRange) {
                const entries = Array.isArray(purchase.statusHistory) ? purchase.statusHistory : [];
                const hasStatusInRange = entries.some((entry) => {
                    const date = parseDateSafe(entry.date);
                    return date && isWithinInterval(date, { start: from, end: to });
                });
                if (!hasStatusInRange) return false;
            }

            if (!query) return true;
            const haystack = [
                getPurchaseDisplayId(purchase),
                purchase.basicInfo?.name,
                purchase.basicInfo?.sku
            ].join(' ').toLowerCase();
            return haystack.includes(query);
        });
    }, [purchases, purchaseStatuses, selectedStatuses, selectedProducts, selectedCreatedBy, dateRange, searchTerm]);

    const sortedPurchases = useMemo(() => {
        return [...filteredPurchases].sort((a, b) => {
            const aDate = parseDateSafe(getLastStatusEntry(a)?.date || a.updatedAt || a.createdAt);
            const bDate = parseDateSafe(getLastStatusEntry(b)?.date || b.updatedAt || b.createdAt);
            return (bDate?.getTime() || 0) - (aDate?.getTime() || 0);
        });
    }, [filteredPurchases]);

    const visiblePurchases = useMemo(
        () => sortedPurchases.slice(0, displayLimit),
        [sortedPurchases, displayLimit]
    );

    const totalSpend = useMemo(
        () => filteredPurchases.reduce((sum, purchase) => sum + getPurchaseTotalCostIQD(purchase), 0),
        [filteredPurchases]
    );

    const hasActiveFilters = useMemo(() => {
        const today = new Date();
        const defaultFrom = format(subDays(today, 30), 'yyyy-MM-dd');
        const defaultTo = format(today, 'yyyy-MM-dd');
        const currentFrom = dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : '';
        const currentTo = dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : '';
        const isDefaultDateRange = currentFrom === defaultFrom && currentTo === defaultTo;

        return (
            searchTerm.trim().length > 0 ||
            selectedStatuses.length > 0 ||
            selectedProducts.length > 0 ||
            selectedCreatedBy.length > 0 ||
            !isDefaultDateRange
        );
    }, [dateRange, searchTerm, selectedStatuses, selectedProducts, selectedCreatedBy]);

    const resetFilters = () => {
        setSearchTerm('');
        setSelectedStatuses([]);
        setSelectedProducts([]);
        setSelectedCreatedBy([]);
        setDateRange({ from: subDays(new Date(), 30), to: new Date() });
        navigate('/purchases', { replace: true });
    };

    const handleSavePurchase = async (payload, editing) => {
        if (editing?._id) {
            await updatePurchase({ ...editing, ...payload, _id: editing._id });
            return;
        }
        await addPurchase(payload);
    };

    const handleStatusChange = async (purchaseId, statusUpdate) => {
        await updatePurchaseStatus(purchaseId, statusUpdate);
    };

    const openStatusEditor = (purchase) => {
        const normalizedStatus = normalizePurchaseStatus(purchase?.status || purchaseStatuses[0]);
        const latestDate = getLastStatusEntry(purchase)?.date || todayIso();
        setStatusEditorPurchase(purchase);
        setStatusForm({
            status: normalizedStatus,
            date: latestDate > todayIso() ? todayIso() : latestDate,
            note: ''
        });
        setStatusError('');
    };

    const closeStatusEditor = () => {
        if (statusSubmitting) return;
        setStatusEditorPurchase(null);
        setStatusError('');
        setStatusForm({ status: '', date: todayIso(), note: '' });
    };

    const submitStatusUpdate = async () => {
        if (!statusEditorPurchase?._id || statusSubmitting) return;

        const latestDate = getLastStatusEntry(statusEditorPurchase)?.date || '';
        if (!statusForm.date) {
            setStatusError(t('purchases.statusValidation.dateRequired'));
            return;
        }
        if (statusForm.date > todayIso()) {
            setStatusError(t('purchases.statusValidation.noFuture'));
            return;
        }
        if (latestDate && statusForm.date < latestDate) {
            setStatusError(t('purchases.statusValidation.chronological'));
            return;
        }

        setStatusSubmitting(true);
        setStatusError('');
        try {
            await handleStatusChange(statusEditorPurchase._id, {
                status: statusForm.status,
                date: statusForm.date,
                note: statusForm.note
            });
            closeStatusEditor();
        } catch (error) {
            setStatusError(error?.message || t('common.error'));
        } finally {
            setStatusSubmitting(false);
        }
    };

    const listHeight = Math.min(560, Math.max(180, visiblePurchases.length * 76));

    return (
        <Layout title={t('purchases.title')}>
            <div className="mb-6 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => {
                                setEditingPurchase(null);
                                setIsFormOpen(true);
                            }}
                            disabled={!canManagePurchases}
                            className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-bold text-white shadow-accent disabled:opacity-60"
                        >
                            <Plus className="h-4 w-4" />
                            {t('purchases.newPurchase')}
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                if (!visiblePurchases.length) {
                                    addToast(t('common.noDataToExport'), 'info');
                                    return;
                                }
                                exportPurchasesToCSV(visiblePurchases);
                            }}
                            className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-green-700"
                        >
                            <Download className="h-4 w-4" />
                            CSV
                        </button>
                    </div>

                    <div className="flex items-center gap-2">
                        {hasActiveFilters && (
                            <button
                                type="button"
                                onClick={resetFilters}
                                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-600"
                            >
                                {t('common.clearFilters')}
                            </button>
                        )}
                        <RowLimitDropdown limit={displayLimit} onChange={setDisplayLimit} />
                    </div>
                </div>

                <div className="mt-4 flex w-full flex-wrap items-center gap-3 lg:flex-nowrap">
                    <div className="relative order-last h-[44px] w-full sm:order-none sm:min-w-[220px] sm:flex-1 lg:flex-none lg:w-[320px]">
                        <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                            value={searchTerm}
                            onChange={(event) => setSearchTerm(event.target.value)}
                            placeholder={t('purchases.searchPlaceholder')}
                            className="h-[44px] w-full rounded-2xl border-2 border-slate-100 bg-white ps-10 pe-4 text-sm font-semibold text-slate-700 outline-none focus:border-accent/40 focus:ring-4 focus:ring-accent/10 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                        />
                    </div>

                    <div className="h-[44px] flex-shrink-0">
                        <DateRangePicker onChange={setDateRange} initialRange={dateRange} range={dateRange} />
                    </div>

                    <div className="flex-shrink-0">
                        <FilterDropdown
                            title={t('purchases.filters.status')}
                            options={statusOptions}
                            selectedValues={selectedStatuses}
                            onChange={setSelectedStatuses}
                            icon={ShoppingBag}
                        />
                    </div>

                    <div className="flex-shrink-0">
                        <FilterDropdown
                            title={t('purchases.filters.product')}
                            options={productOptions}
                            selectedValues={selectedProducts}
                            onChange={setSelectedProducts}
                            icon={Package}
                        />
                    </div>

                    <div className="flex-shrink-0">
                        <FilterDropdown
                            title={t('common.createdBy')}
                            options={createdByOptions}
                            selectedValues={selectedCreatedBy}
                            onChange={setSelectedCreatedBy}
                            icon={User}
                            showSearch={false}
                        />
                    </div>
                </div>
            </div>

            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-100 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-500">{t('purchases.summary.totalSpend')}</p>
                    <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{formatCurrency(totalSpend)}</p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-500">{t('purchases.summary.totalPurchases')}</p>
                    <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{filteredPurchases.length}</p>
                </div>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
                {loading ? (
                    <div className="p-8 text-center text-slate-400">{t('common.loading')}</div>
                ) : visiblePurchases.length === 0 ? (
                    <div className="p-10 text-center text-slate-400">{t('purchases.noPurchases')}</div>
                ) : (
                    <>
                        {!isMobileView && (
                            <div className="overflow-x-auto custom-scrollbar">
                            <div className="min-w-[1180px]">
                                <div className={`${gridClass} gap-3 border-b border-slate-100 bg-slate-50 px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:bg-slate-700/30`}>
                                    <div>{t('purchases.table.id')}</div>
                                    <div>{t('purchases.table.product')}</div>
                                    <div>{t('orders.qty')}</div>
                                    <div>{t('purchases.filters.status')}</div>
                                    <div>{t('purchases.table.lastStatusDate')}</div>
                                    <div>{t('purchases.table.totalCost')}</div>
                                    <div>{t('common.createdBy')}</div>
                                    <div className="text-end">{t('common.actions')}</div>
                                </div>
                                <List
                                    height={listHeight}
                                    itemCount={visiblePurchases.length}
                                    itemSize={76}
                                    width="100%"
                                    className="custom-scrollbar"
                                >
                                    {({ index, style }) => {
                                        const purchase = visiblePurchases[index];
                                        const latest = getLastStatusEntry(purchase);
                                        return (
                                            <div style={style} className={`${gridClass} gap-3 border-b border-slate-100 px-4 py-3 hover:bg-slate-50/70 dark:border-slate-700 dark:hover:bg-slate-700/20`}>
                                                <div className="text-xs font-bold text-slate-600 dark:text-slate-300">
                                                    {getPurchaseDisplayId(purchase)}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="truncate text-sm font-bold text-slate-800 dark:text-white">
                                                        {purchase.basicInfo?.name || '-'}
                                                    </p>
                                                    <p className="truncate text-xs text-slate-500">{purchase.basicInfo?.sku || '-'}</p>
                                                </div>
                                                <div className="text-sm font-bold text-slate-800 dark:text-white">{purchase.quantity}</div>
                                                <div>
                                                    <PurchaseStatusBadge status={purchase.status} t={t} />
                                                </div>
                                                <div className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                                                    {formatDateSafe(latest?.date || purchase.updatedAt)}
                                                </div>
                                                <div className="text-sm font-black text-slate-900 dark:text-white">
                                                    {formatCurrency(getPurchaseTotalCostIQD(purchase))}
                                                </div>
                                                <div className="truncate text-sm font-semibold text-slate-600 dark:text-slate-300">
                                                    {purchase.createdBy || 'System'}
                                                </div>
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => openStatusEditor(purchase)}
                                                        className="rounded-lg p-2 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600"
                                                        title={t('purchases.changeStatus')}
                                                        disabled={!canManagePurchases}
                                                    >
                                                        <CalendarClock className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setEditingPurchase(purchase);
                                                            setIsFormOpen(true);
                                                        }}
                                                        className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-accent"
                                                        title={t('common.edit')}
                                                        disabled={!canManagePurchases}
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setPurchaseToDelete(purchase)}
                                                        className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-500"
                                                        title={t('common.delete')}
                                                        disabled={!canManagePurchases}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    }}
                                </List>
                            </div>
                            </div>
                        )}

                        {isMobileView && (
                            <div className="space-y-3 p-4">
                            {visiblePurchases.map((purchase) => {
                                const latest = getLastStatusEntry(purchase);
                                return (
                                    <div key={purchase._id} className="rounded-2xl border border-slate-100 p-4 dark:border-slate-700">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0">
                                                <p className="truncate text-[11px] font-bold uppercase text-slate-500">{getPurchaseDisplayId(purchase)}</p>
                                                <p className="truncate text-sm font-bold text-slate-800 dark:text-white">{purchase.basicInfo?.name || '-'}</p>
                                                <p className="truncate text-xs text-slate-500">{purchase.basicInfo?.sku || '-'}</p>
                                            </div>
                                            <PurchaseStatusBadge status={purchase.status} t={t} />
                                        </div>
                                        <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-500">
                                            <span>{t('orders.qty')}: <strong className="text-slate-800 dark:text-white">{purchase.quantity}</strong></span>
                                            <span>{t('purchases.table.totalCost')}: <strong className="text-slate-800 dark:text-white">{formatCurrency(getPurchaseTotalCostIQD(purchase))}</strong></span>
                                            <span className="col-span-2">{t('purchases.table.lastStatusDate')}: <strong className="text-slate-800 dark:text-white">{formatDateSafe(latest?.date || purchase.updatedAt)}</strong></span>
                                            <span className="col-span-2">{t('common.createdBy')}: <strong className="text-slate-800 dark:text-white">{purchase.createdBy || 'System'}</strong></span>
                                        </div>
                                        <div className="mt-3 flex justify-end gap-2">
                                            <button
                                                type="button"
                                                onClick={() => openStatusEditor(purchase)}
                                                className="rounded-lg border border-indigo-200 px-3 py-1.5 text-xs font-semibold text-indigo-600"
                                                disabled={!canManagePurchases}
                                            >
                                                {t('purchases.changeStatus')}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setEditingPurchase(purchase);
                                                    setIsFormOpen(true);
                                                }}
                                                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600"
                                                disabled={!canManagePurchases}
                                            >
                                                {t('common.edit')}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setPurchaseToDelete(purchase)}
                                                className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-500"
                                                disabled={!canManagePurchases}
                                            >
                                                {t('common.delete')}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                            </div>
                        )}
                    </>
                )}
            </div>

            {statusEditorPurchase && (
                <div className="fixed inset-0 z-[115] flex items-center justify-center bg-black/45 p-4">
                    <div className="w-full max-w-2xl rounded-3xl bg-white shadow-2xl dark:bg-slate-800">
                        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-700">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-widest text-slate-500">{getPurchaseDisplayId(statusEditorPurchase)}</p>
                                <h3 className="mt-1 text-xl font-black text-slate-900 dark:text-white">{t('purchases.changeStatus')}</h3>
                            </div>
                            <button
                                type="button"
                                onClick={closeStatusEditor}
                                aria-label={t('common.close')}
                                className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="space-y-4 p-6">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div>
                                    <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">{t('purchases.filters.status')}</label>
                                    <select
                                        value={statusForm.status}
                                        onChange={(event) => setStatusForm((prev) => ({ ...prev, status: event.target.value }))}
                                        className="h-[44px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold outline-none focus:border-accent/40 focus:ring-2 focus:ring-accent/20"
                                    >
                                        {purchaseStatuses.map((status) => (
                                            <option key={status} value={status}>{t(`purchases.statuses.${status}`)}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">{t('purchases.form.statusDate')}</label>
                                    <input
                                        type="date"
                                        value={statusForm.date}
                                        min={getLastStatusEntry(statusEditorPurchase)?.date || undefined}
                                        max={todayIso()}
                                        onChange={(event) => setStatusForm((prev) => ({ ...prev, date: event.target.value }))}
                                        className="h-[44px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold outline-none focus:border-accent/40 focus:ring-2 focus:ring-accent/20"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">{t('purchases.form.statusNote')}</label>
                                <textarea
                                    rows={3}
                                    value={statusForm.note}
                                    onChange={(event) => setStatusForm((prev) => ({ ...prev, note: event.target.value }))}
                                    placeholder={t('purchases.form.statusNotePlaceholder')}
                                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium outline-none focus:border-accent/40 focus:ring-2 focus:ring-accent/20"
                                />
                            </div>
                            {statusError && <p className="text-sm font-semibold text-red-500">{statusError}</p>}

                            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                                <p className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-500">{t('purchases.statusTimeline')}</p>
                                <div className="max-h-52 space-y-2 overflow-y-auto pe-1 custom-scrollbar">
                                    {(statusEditorPurchase.statusHistory || []).map((entry, index) => (
                                        <div key={`${entry.status}-${entry.date}-${index}`} className="rounded-xl bg-white px-3 py-2">
                                            <div className="flex items-center justify-between">
                                                <PurchaseStatusBadge status={entry.status} t={t} />
                                                <span className="text-xs font-semibold text-slate-500">{formatDateSafe(entry.date)}</span>
                                            </div>
                                            {entry.note ? <p className="mt-1 text-xs text-slate-600">{entry.note}</p> : null}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-4 dark:border-slate-700">
                            <button
                                type="button"
                                onClick={closeStatusEditor}
                                className="rounded-xl px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-50"
                            >
                                {t('common.cancel')}
                            </button>
                            <button
                                type="button"
                                onClick={submitStatusUpdate}
                                disabled={statusSubmitting || !canManagePurchases}
                                className="rounded-xl bg-accent px-5 py-2 text-sm font-bold text-white shadow-accent disabled:opacity-60"
                            >
                                {statusSubmitting ? t('common.loading') : t('purchases.applyStatus')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <PurchaseFormModal
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                onSubmit={handleSavePurchase}
                products={products}
                editingPurchase={editingPurchase}
                purchaseStatuses={purchaseStatuses}
                canManage={canManagePurchases}
                t={t}
                language={language}
            />

            <DeleteConfirmModal
                isOpen={Boolean(purchaseToDelete)}
                onClose={() => setPurchaseToDelete(null)}
                onConfirm={async () => {
                    if (!purchaseToDelete?._id) return;
                    try {
                        await deletePurchase(purchaseToDelete._id);
                    } finally {
                        setPurchaseToDelete(null);
                    }
                }}
                title={t('common.delete')}
                message={t('purchases.confirmDelete')}
            />
        </Layout>
    );
};

export default Purchases;
