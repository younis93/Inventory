import React, { useCallback, useState, useMemo } from 'react';
import Layout from '../components/Layout';
import { useExpenses, useInventory, useOrders, useProducts } from '../context/InventoryContext';
import { DollarSign, ShoppingCart, TrendingUp, Users, MapPin, Package, AlertCircle, Globe, ShoppingBag, Maximize2 } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, BarChart, Bar, Legend } from 'recharts';
import DateRangePicker from '../components/DateRangePicker';
import FilterDropdown from '../components/FilterDropdown';
import IraqMap from '../components/IraqMap';
import MapPopupModal from '../components/MapPopupModal';
import TopRegionsList from '../components/TopRegionsList';
import TopSellingProductsTable from '../components/TopSellingProductsTable';
import { GOVERNORATES, SOCIAL_PLATFORMS } from '../constants/iraq';
import { isWithinInterval, isAfter, parseISO, subDays, startOfMonth, endOfMonth, eachDayOfInterval, eachMonthOfInterval, format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import Skeleton from '../components/common/Skeleton';
import { getProductCategories, productMatchesAnyCategory } from '../utils/productCategories';

const parseOrderDateSafe = (value) => {
    if (!value) return null;
    try {
        const parsed = parseISO(value);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
    } catch {
        return null;
    }
};

const parseExpenseDateSafe = (value) => {
    if (!value) return null;
    try {
        const parsed = parseISO(value);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
    } catch {
        return null;
    }
};

const LOW_STOCK_THRESHOLD = 10;

const Dashboard = () => {
    const { t } = useTranslation();
    const { orders } = useOrders();
    const { expenses } = useExpenses();
    const { products, categories } = useProducts();
    const { loading, formatCurrency, brand, theme, appearance } = useInventory();

    const normalizedOrders = useMemo(() => {
        return orders
            .map((order) => {
                const parsedDate = parseOrderDateSafe(order.date);
                if (!parsedDate) return null;

                const categorySet = new Set();
                (order.items || []).forEach((item) => {
                    const itemCategories = getProductCategories(item?.product || {});
                    itemCategories.forEach((category) => categorySet.add(category));
                });

                return {
                    ...order,
                    _parsedDate: parsedDate,
                    _categorySet: categorySet
                };
            })
            .filter(Boolean);
    }, [orders]);

    // Filters State
    const minDate = useMemo(() => {
        if (normalizedOrders.length === 0) return subDays(new Date(), 30);
        return normalizedOrders.reduce((min, order) => {
            const orderDate = order._parsedDate;
            return orderDate < min ? orderDate : min;
        }, new Date());
    }, [normalizedOrders]);

    const defaultRange = useMemo(() => ({
        from: minDate,
        to: new Date()
    }), [minDate]);

    const [dateRange, setDateRange] = useState(defaultRange);
    const hasCompleteDateRange = useMemo(() => {
        return Boolean(dateRange?.from && dateRange?.to && !isAfter(dateRange.from, dateRange.to));
    }, [dateRange]);

    // Update dateRange once orders are loaded
    const [hasInitializedDate, setHasInitializedDate] = useState(false);
    React.useEffect(() => {
        if (!loading && orders.length > 0 && !hasInitializedDate) {
            setDateRange(defaultRange);
            setHasInitializedDate(true);
        }
    }, [loading, orders.length, defaultRange, hasInitializedDate]);

    // Multi-select filters
    const [selectedStatuses, setSelectedStatuses] = useState([]);
    const [selectedGovernorates, setSelectedGovernorates] = useState([]);
    const [selectedSocials, setSelectedSocials] = useState([]);
    const [selectedCategories, setSelectedCategories] = useState([]);
    const [isMapModalOpen, setIsMapModalOpen] = useState(false);

    const toggleGovernorateSelection = useCallback((region) => {
        setSelectedGovernorates((prev) => (
            prev.includes(region)
                ? prev.filter((item) => item !== region)
                : [...prev, region]
        ));
    }, []);

    // --- Derived Data ---
    const filteredOrders = useMemo(() => {
        if (!hasCompleteDateRange) return [];
        return normalizedOrders.filter((order) => {
            const orderDate = order._parsedDate;

            const matchesDate = isWithinInterval(orderDate, { start: dateRange.from, end: dateRange.to });

            const matchesStatus = selectedStatuses.length === 0 || selectedStatuses.includes(order.status);
            const matchesGov = selectedGovernorates.length === 0 || (order.customer?.governorate && selectedGovernorates.includes(order.customer.governorate));
            const matchesSocial = selectedSocials.length === 0 || (order.customer?.social && selectedSocials.includes(order.customer.social));

            // Category filter
            const matchesCategory = selectedCategories.length === 0 ||
                selectedCategories.some((category) => order._categorySet?.has(category));

            return matchesDate && matchesStatus && matchesGov && matchesSocial && matchesCategory;
        });
    }, [normalizedOrders, hasCompleteDateRange, dateRange, selectedStatuses, selectedGovernorates, selectedSocials, selectedCategories]);

    const previousPeriodRevenue = useMemo(() => {
        if (!hasCompleteDateRange) return 0;
        const start = dateRange.from;
        const end = dateRange.to;
        const periodMs = end.getTime() - start.getTime();
        if (periodMs < 0) return 0;

        const previousEnd = new Date(start.getTime() - 1);
        const previousStart = new Date(previousEnd.getTime() - periodMs);

        return normalizedOrders.reduce((sum, order) => {
            const orderDate = order._parsedDate;
            const matchesDate = isWithinInterval(orderDate, { start: previousStart, end: previousEnd });
            const matchesStatus = selectedStatuses.length === 0 || selectedStatuses.includes(order.status);
            const matchesGov = selectedGovernorates.length === 0 || (order.customer?.governorate && selectedGovernorates.includes(order.customer.governorate));
            const matchesSocial = selectedSocials.length === 0 || (order.customer?.social && selectedSocials.includes(order.customer.social));
            const matchesCategory = selectedCategories.length === 0 ||
                selectedCategories.some((category) => order._categorySet?.has(category));

            if (!matchesDate || !matchesStatus || !matchesGov || !matchesSocial || !matchesCategory) return sum;
            return sum + (Number(order.total) || 0);
        }, 0);
    }, [normalizedOrders, hasCompleteDateRange, dateRange, selectedStatuses, selectedGovernorates, selectedSocials, selectedCategories]);

    // KPI Calculations
    const totalRevenue = useMemo(() => filteredOrders.reduce((sum, order) => sum + order.total, 0), [filteredOrders]);
    const filteredExpensesByDate = useMemo(() => {
        if (!hasCompleteDateRange) return [];
        return expenses.filter((expense) => {
            const expenseDate = parseExpenseDateSafe(expense.date);
            if (!expenseDate) return false;
            return isWithinInterval(expenseDate, { start: dateRange.from, end: dateRange.to });
        });
    }, [expenses, hasCompleteDateRange, dateRange]);
    const totalExpenses = useMemo(
        () => filteredExpensesByDate.reduce((sum, expense) => sum + Number(expense.amountIQD || 0), 0),
        [filteredExpensesByDate]
    );
    const totalRevenueDisplay = useMemo(() => formatCurrency(totalRevenue).replace(/\u00A0/g, ' '), [formatCurrency, totalRevenue]);
    const revenueChangePercent = useMemo(() => {
        if (previousPeriodRevenue <= 0) return totalRevenue > 0 ? 100 : 0;
        return ((totalRevenue - previousPeriodRevenue) / previousPeriodRevenue) * 100;
    }, [totalRevenue, previousPeriodRevenue]);
    const revenueTrendPrefix = revenueChangePercent >= 0 ? '+' : '-';
    const revenueTrendText = useMemo(
        () => `${revenueTrendPrefix}${Math.abs(revenueChangePercent).toFixed(1)}% vs last period`,
        [revenueTrendPrefix, revenueChangePercent, dateRange, selectedStatuses, selectedGovernorates, selectedSocials, selectedCategories]
    );
    const totalOrders = filteredOrders.length;
    const activeCustomers = useMemo(() => new Set(filteredOrders.map(o => o.customer?.phone || o.customer?.id || o.customer).filter(Boolean)).size, [filteredOrders]);
    const lowStockProducts = useMemo(() => {
        const sourceProducts = selectedCategories.length > 0
            ? products.filter((product) => productMatchesAnyCategory(product, selectedCategories))
            : products;

        return sourceProducts.filter((product) => {
            const stock = Number(product?.stock || 0);
            return Number.isFinite(stock) && stock > 0 && stock < LOW_STOCK_THRESHOLD;
        });
    }, [products, selectedCategories]);
    // Top Region Calculation
    const regionCounts = useMemo(() => {
        const counts = {};
        filteredOrders.forEach(order => {
            const gov = order.customer?.governorate;
            if (gov) counts[gov] = (counts[gov] || 0) + 1;
        });
        return Object.entries(counts).map(([name, count]) => ({ name, count }));
    }, [filteredOrders]);

    const topRegion = useMemo(() => {
        if (regionCounts.length === 0) return { name: 'N/A', count: 0 };
        return regionCounts.reduce((a, b) => (a.count > b.count ? a : b));
    }, [regionCounts]);


    // Filter Options with Counts

    const ordersInDateRange = useMemo(() => {
        if (!hasCompleteDateRange) return [];
        return normalizedOrders.filter((order) => {
            const orderDate = order._parsedDate;
            return isWithinInterval(orderDate, { start: dateRange.from, end: dateRange.to });
        });
    }, [normalizedOrders, hasCompleteDateRange, dateRange]);

    const statusOptions = useMemo(() => {
        const counts = {};
        ordersInDateRange.forEach(o => counts[o.status] = (counts[o.status] || 0) + 1);
        return ['Processing', 'Completed', 'Cancelled'].map(status => ({
            value: status,
            label: status,
            count: counts[status] || 0
        }));
    }, [ordersInDateRange]);

    const governorateOptions = useMemo(() => {
        const counts = {};
        ordersInDateRange.forEach(o => {
            const g = o.customer?.governorate;
            if (g) counts[g] = (counts[g] || 0) + 1;
        });
        return GOVERNORATES.map(g => ({
            value: g,
            label: g,
            count: counts[g] || 0
        })).sort((a, b) => b.count - a.count);
    }, [ordersInDateRange]);

    const socialOptions = useMemo(() => {
        const counts = {};
        ordersInDateRange.forEach(o => {
            const s = o.customer?.social;
            if (s) counts[s] = (counts[s] || 0) + 1;
        });
        return SOCIAL_PLATFORMS.map(s => ({
            value: s,
            label: s,
            count: counts[s] || 0
        })).sort((a, b) => b.count - a.count);
    }, [ordersInDateRange]);

    const categoryOptions = useMemo(() => {
        const counts = {};
        // Count how many orders have items in this category
        ordersInDateRange.forEach(o => {
            const visitedCats = new Set();
            o.items?.forEach(item => {
                getProductCategories(item?.product || {}).forEach((category) => {
                    if (visitedCats.has(category)) return;
                    counts[category] = (counts[category] || 0) + 1;
                    visitedCats.add(category);
                });
            });
        });

        const allCategories = new Set([...categories]);
        Object.keys(counts).forEach((category) => allCategories.add(category));

        return Array.from(allCategories).map((category) => ({
            value: category,
            label: category,
            count: counts[category] || 0
        })).sort((a, b) => b.count - a.count);
    }, [ordersInDateRange, categories]);


    // Chart Data
    const revenueData = useMemo(() => {
        if (!hasCompleteDateRange) return [];

        let days = [];
        try {
            days = eachDayOfInterval({ start: dateRange.from, end: dateRange.to });
        } catch (e) {
            console.error("Invalid date range for chart:", e);
            return [];
        }

        const dataMap = {};
        days.forEach(day => dataMap[format(day, 'yyyy-MM-dd')] = 0);

        filteredOrders.forEach(order => {
            const dayStr = format(order._parsedDate, 'yyyy-MM-dd');
            if (dataMap[dayStr] !== undefined) {
                dataMap[dayStr] += order.total;
            }
        });

        return Object.entries(dataMap).map(([date, value]) => ({
            date: format(parseISO(date), 'MMM d'),
            value
        }));
    }, [filteredOrders, hasCompleteDateRange, dateRange]);
    const monthlyRevenueVsExpensesData = useMemo(() => {
        if (!hasCompleteDateRange) return [];

        const monthlyBuckets = eachMonthOfInterval({
            start: startOfMonth(dateRange.from),
            end: startOfMonth(dateRange.to)
        });

        return monthlyBuckets.map((monthStart) => {
            const monthEnd = endOfMonth(monthStart);
            const revenue = filteredOrders.reduce((sum, order) => {
                if (isWithinInterval(order._parsedDate, { start: monthStart, end: monthEnd })) {
                    return sum + Number(order.total || 0);
                }
                return sum;
            }, 0);

            const expensesAmount = filteredExpensesByDate.reduce((sum, expense) => {
                const expenseDate = parseExpenseDateSafe(expense.date);
                if (expenseDate && isWithinInterval(expenseDate, { start: monthStart, end: monthEnd })) {
                    return sum + Number(expense.amountIQD || 0);
                }
                return sum;
            }, 0);

            return {
                month: format(monthStart, 'MMM yyyy'),
                revenue,
                expenses: expensesAmount
            };
        });
    }, [hasCompleteDateRange, dateRange, filteredOrders, filteredExpensesByDate]);

    // Map data: convert regionCounts (array) to an object keyed by governorate name for the map component
    const regionDataObj = useMemo(() => {
        return regionCounts.reduce((acc, r) => {
            acc[r.name] = r.count;
            return acc;
        }, {});
    }, [regionCounts]);


    const chartColors = theme === 'dark' ? {
        text: '#94A3B8',
        grid: '#334155',
        tooltipBg: '#1E293B',
    } : {
        text: '#64748B',
        grid: '#E2E8F0',
        tooltipBg: '#FFFFFF',
    };
    const mapTitle = t('dashboard.map', { defaultValue: 'Map' });
    const expandMapLabel = t('dashboard.expandMap', { defaultValue: 'Expand map' });
    const closeMapLabel = t('dashboard.closeMap', { defaultValue: 'Close map' });

    return (
        <Layout title={t('dashboard.title')}>
            {/* Unified Actions Bar - Based on Orders template */}
            <div className="flex flex-col gap-4 mb-8 bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                {/* Filters Row: Date + Governorate + Social + Categories + Status + Actions */}
                <div className="flex gap-3 w-full flex-wrap items-center">
                    {/* Date Picker */}
                    <div className="h-[44px] flex-shrink-0">
                        <DateRangePicker
                            range={dateRange}
                            onRangeChange={setDateRange}
                            brandColor={brand.color}
                        />
                    </div>

                    <FilterDropdown
                        title={t('dashboard.governorate')}
                        options={governorateOptions}
                        selectedValues={selectedGovernorates}
                        onChange={setSelectedGovernorates}
                        icon={MapPin}
                        showSearch={false}
                    />

                    <FilterDropdown
                        title={t('dashboard.socialMedia')}
                        options={socialOptions}
                        selectedValues={selectedSocials}
                        onChange={setSelectedSocials}
                        icon={Globe}
                        showSearch={false}
                    />

                    <FilterDropdown
                        title={t('dashboard.categories')}
                        options={categoryOptions}
                        selectedValues={selectedCategories}
                        onChange={setSelectedCategories}
                        icon={Package}
                        showSearch={false}
                    />

                    <FilterDropdown
                        title={t('dashboard.status')}
                        options={statusOptions}
                        selectedValues={selectedStatuses}
                        onChange={setSelectedStatuses}
                        icon={ShoppingBag}
                        showSearch={false}
                    />

                    <div className="ms-auto flex items-center gap-3 flex-wrap">
                        {(selectedStatuses.length > 0 || selectedGovernorates.length > 0 || selectedSocials.length > 0 || selectedCategories.length > 0 ||
                            dateRange.from?.getTime() !== defaultRange.from?.getTime() ||
                            dateRange.to?.getTime() !== defaultRange.to?.getTime()) && (
                                <button
                                    onClick={() => {
                                        setSelectedStatuses([]);
                                        setSelectedGovernorates([]);
                                        setSelectedSocials([]);
                                        setSelectedCategories([]);
                                        setDateRange(defaultRange);
                                    }}
                                    className="px-4 py-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 rounded-xl font-bold text-sm transition-all border border-slate-200 dark:border-slate-700"
                                >
                                    {t('common.clearFilters')}
                                </button>
                            )}

                        <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800">
                            <Package className="w-4 h-4 text-slate-400" />
                            <span className="text-sm font-bold text-slate-500">
                                <span className="text-slate-900 dark:text-white">{filteredOrders.length}</span> {t('dashboard.filteredOrders')}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="space-y-6">
                {/* KPI Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6 gap-4">
                    {loading ? (
                        Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-100 dark:border-slate-700 shadow-sm">
                                <div className="flex justify-between items-start mb-4">
                                    <Skeleton className="h-4 w-24" />
                                    <Skeleton className="h-5 w-5 rounded-full" />
                                </div>
                                <Skeleton className="h-8 w-32 mb-2" />
                                <Skeleton className="h-3 w-40" />
                            </div>
                        ))
                    ) : (
                        <>
                            <div className="bg-accent rounded-3xl p-6 text-white shadow-accent">
                                <div className="flex justify-between items-start mb-4 opacity-80">
                                    <span className="font-bold text-xs uppercase tracking-widest">{t('dashboard.totalRevenue')}</span>
                                    <DollarSign className="w-5 h-5" />
                                </div>
                                <h3 className="max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-[clamp(0.75rem,1.55vw,1.35rem)] font-black mb-1 leading-tight tracking-tight">{totalRevenueDisplay}</h3>
                                <div className="flex items-center gap-1 text-xs font-medium opacity-80">
                                    <TrendingUp className="w-3 h-3" />
                                    <span>{revenueTrendText}</span>
                                </div>
                            </div>

                            <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-100 dark:border-slate-700 shadow-sm">
                                <div className="flex justify-between items-start mb-4 text-slate-400">
                                    <span className="font-bold text-xs uppercase tracking-widest">{t('dashboard.totalOrders')}</span>
                                    <ShoppingCart className="w-5 h-5" />
                                </div>
                                <h3 className="text-3xl font-black text-slate-800 dark:text-white mb-1">{totalOrders}</h3>
                                <p className="text-xs text-slate-500 font-medium mt-1">{t('dashboard.ordersPlaced')}</p>
                            </div>

                            <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-100 dark:border-slate-700 shadow-sm">
                                <div className="flex justify-between items-start mb-4 text-slate-400">
                                    <span className="font-bold text-xs uppercase tracking-widest">{t('dashboard.topRegion')}</span>
                                    <MapPin className="w-5 h-5" />
                                </div>
                                <h3 className="text-2xl font-black text-slate-800 dark:text-white mb-1 truncate">{topRegion.name}</h3>
                                <p className="text-xs text-slate-500 font-medium mt-1">{t('dashboard.ordersCount', { count: topRegion.count })}</p>
                            </div>

                            <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-100 dark:border-slate-700 shadow-sm">
                                <div className="flex justify-between items-start mb-4 text-slate-400">
                                    <span className="font-bold text-xs uppercase tracking-widest">{t('dashboard.totalExpenses')}</span>
                                    <AlertCircle className="w-5 h-5" />
                                </div>
                                <h3 className="text-2xl font-black text-slate-800 dark:text-white mb-1 whitespace-nowrap overflow-hidden text-ellipsis">
                                    {formatCurrency(totalExpenses).replace(/\u00A0/g, ' ')}
                                </h3>
                                <p className="text-xs text-slate-500 font-medium mt-1">{filteredExpensesByDate.length} records</p>
                            </div>

                            <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-100 dark:border-slate-700 shadow-sm">
                                <div className="flex justify-between items-start mb-4 text-slate-400">
                                    <span className="font-bold text-xs uppercase tracking-widest">{t('dashboard.activeCustomers')}</span>
                                    <Users className="w-5 h-5" />
                                </div>
                                <h3 className="text-3xl font-black text-slate-800 dark:text-white mb-1">{activeCustomers}</h3>
                                <p className="text-xs text-slate-500 font-medium mt-1">{t('dashboard.uniqueBuyers')}</p>
                            </div>

                            <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-100 dark:border-slate-700 shadow-sm">
                                <div className="flex justify-between items-start mb-4 text-slate-400">
                                    <span className="font-bold text-xs uppercase tracking-widest">{t('dashboard.lowStock')}</span>
                                    <AlertCircle className="w-5 h-5" />
                                </div>
                                <h3 className="text-3xl font-black text-slate-800 dark:text-white mb-1">{lowStockProducts.length}</h3>
                                <p className="text-xs text-slate-500 font-medium mt-1">Below {LOW_STOCK_THRESHOLD} units</p>
                            </div>

                        </>
                    )}
                </div>

                {/* Charts & Context Map */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[400px]">
                    <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
                            <TrendingUp className="w-5 h-5" style={{ color: appearance.accentType === 'solid' ? appearance.accentColor : appearance.accentGradient.start }} /> {t('dashboard.revenueTrend')}
                        </h3>
                        <div className="flex-1 min-h-0">
                            {loading ? (
                                <Skeleton className="w-full h-full rounded-xl" />
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={revenueData}>
                                        <defs>
                                            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor={appearance.accentType === 'solid' ? appearance.accentColor : appearance.accentGradient.start} stopOpacity={0.3} />
                                                <stop offset="95%" stopColor={appearance.accentType === 'solid' ? appearance.accentColor : appearance.accentGradient.start} stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartColors.grid} />
                                        <XAxis
                                            dataKey="date"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fontSize: 12, fill: chartColors.text }}
                                            dy={10}
                                        />
                                        <YAxis
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fontSize: 12, fill: chartColors.text }}
                                            tickFormatter={(val) => `${val / 1000}k`}
                                        />
                                        <Tooltip
                                            contentStyle={{
                                                borderRadius: '12px',
                                                border: 'none',
                                                boxShadow: '0 8px 16px rgba(0,0,0,0.1)',
                                                backgroundColor: chartColors.tooltipBg,
                                                color: theme === 'dark' ? '#F8FAFC' : '#1E293B'
                                            }}
                                            itemStyle={{ color: theme === 'dark' ? '#F8FAFC' : '#1E293B' }}
                                            formatter={(value) => [formatCurrency(value), t('dashboard.revenue')]}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="value"
                                            stroke={appearance.accentType === 'solid' ? appearance.accentColor : appearance.accentGradient.start}
                                            strokeWidth={3}
                                            fillOpacity={1}
                                            fill="url(#colorValue)"
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </div>

                    <div className="lg:col-span-1 border border-slate-100 dark:border-slate-700 rounded-3xl overflow-hidden shadow-sm h-full relative">
                        <IraqMap
                            data={regionDataObj}
                            selectedGovernorates={selectedGovernorates}
                            onSelect={toggleGovernorateSelection}
                        />
                        <div className="absolute top-4 start-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-xs font-bold text-slate-500 shadow-sm border border-slate-100">
                            <span className="inline-flex items-center gap-1.5">
                                <MapPin
                                    className="w-3.5 h-3.5"
                                    style={{ color: appearance.accentType === 'solid' ? appearance.accentColor : appearance.accentGradient.start }}
                                />
                                <span>{mapTitle}</span>
                            </span>
                        </div>
                        <button
                            type="button"
                            onClick={() => setIsMapModalOpen(true)}
                            className="absolute top-4 end-4 inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-100 bg-white/90 text-slate-600 shadow-sm transition hover:bg-white dark:border-slate-700 dark:bg-slate-900/85 dark:text-slate-100"
                            aria-label={expandMapLabel}
                            title={expandMapLabel}
                        >
                            <Maximize2 className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 h-[340px]">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
                        <AlertCircle className="w-5 h-5" style={{ color: appearance.accentType === 'solid' ? appearance.accentColor : appearance.accentGradient.start }} />
                        Monthly Expenses vs Revenue
                    </h3>
                    <div className="h-[260px]">
                        {loading ? (
                            <Skeleton className="w-full h-full rounded-xl" />
                        ) : monthlyRevenueVsExpensesData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={monthlyRevenueVsExpensesData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartColors.grid} />
                                    <XAxis
                                        dataKey="month"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 12, fill: chartColors.text }}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 12, fill: chartColors.text }}
                                        tickFormatter={(val) => `${Math.round(val / 1000)}k`}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            borderRadius: '12px',
                                            border: 'none',
                                            boxShadow: '0 8px 16px rgba(0,0,0,0.1)',
                                            backgroundColor: chartColors.tooltipBg,
                                            color: theme === 'dark' ? '#F8FAFC' : '#1E293B'
                                        }}
                                        itemStyle={{ color: theme === 'dark' ? '#F8FAFC' : '#1E293B' }}
                                        formatter={(value) => [formatCurrency(value), '']}
                                    />
                                    <Legend />
                                    <Bar name={t('dashboard.revenue')} dataKey="revenue" fill={appearance.accentType === 'solid' ? appearance.accentColor : appearance.accentGradient.start} radius={[6, 6, 0, 0]} />
                                    <Bar name={t('dashboard.totalExpenses')} dataKey="expenses" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-sm font-semibold text-slate-400">
                                {t('common.noData')}
                            </div>
                        )}
                    </div>
                </div>

                {/* Bottom Widgets */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[400px]">
                    {loading ? (
                        <>
                            <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-100 dark:border-slate-700 shadow-sm">
                                <Skeleton className="h-6 w-48 mb-6" />
                                <div className="space-y-4">
                                    <Skeleton className="h-10 w-full" />
                                    <Skeleton className="h-10 w-full" />
                                    <Skeleton className="h-10 w-full" />
                                </div>
                            </div>
                            <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-100 dark:border-slate-700 shadow-sm">
                                <Skeleton className="h-6 w-48 mb-6" />
                                <div className="space-y-4">
                                    <Skeleton className="h-12 w-full" />
                                    <Skeleton className="h-12 w-full" />
                                    <Skeleton className="h-12 w-full" />
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            <TopRegionsList
                                regions={regionCounts}
                                selectedRegion={selectedGovernorates}
                                onSelect={toggleGovernorateSelection}
                            />

                            <div className="h-full">
                                <TopSellingProductsTable
                                    products={products}
                                    orders={filteredOrders}
                                    formatCurrency={formatCurrency}
                                />
                            </div>
                        </>
                    )}
                </div>
            </div>
            <MapPopupModal
                isOpen={isMapModalOpen}
                onClose={() => setIsMapModalOpen(false)}
                data={regionDataObj}
                selectedGovernorates={selectedGovernorates}
                onSelect={toggleGovernorateSelection}
                title={mapTitle}
                closeLabel={closeMapLabel}
            />
        </Layout>
    );
};

export default Dashboard;
