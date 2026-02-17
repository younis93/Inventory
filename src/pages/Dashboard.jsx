import React, { useState, useMemo } from 'react';
import Layout from '../components/Layout';
import { useInventory } from '../context/InventoryContext';
import { DollarSign, ShoppingCart, TrendingUp, Users, MapPin, Package, AlertCircle, Globe, ShoppingBag } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import DateRangePicker from '../components/DateRangePicker';
import FilterDropdown from '../components/FilterDropdown';
import IraqMap from '../components/IraqMap';
import TopRegionsList from '../components/TopRegionsList';
import TopSellingProductsTable from '../components/TopSellingProductsTable';
import { GOVERNORATES, SOCIAL_PLATFORMS } from '../constants/iraq';
import { isWithinInterval, isAfter, parseISO, subDays, startOfMonth, endOfMonth, eachDayOfInterval, format } from 'date-fns';
import { useTranslation } from 'react-i18next';

const Dashboard = () => {
    const { t } = useTranslation();
    const { orders, products, customers, loading, formatCurrency, brand, categories, theme, appearance } = useInventory();

    // Filters State
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

    // --- Derived Data ---
    const filteredOrders = useMemo(() => {
        return orders.filter(order => {
            const orderDate = parseISO(order.date);
            const matchesDate = !dateRange?.from || !dateRange?.to ||
                isWithinInterval(orderDate, { start: dateRange.from, end: dateRange.to });

            const matchesStatus = selectedStatuses.length === 0 || selectedStatuses.includes(order.status);
            const matchesGov = selectedGovernorates.length === 0 || selectedGovernorates.includes(order.customer.governorate);
            const matchesSocial = selectedSocials.length === 0 || selectedSocials.includes(order.customer.social);

            // Category filter: check if ANY item in order belongs to selected categories (or if no cat selected)
            // Note: Order items have product.category.
            const matchesCategory = selectedCategories.length === 0 || order.items.some(item => selectedCategories.includes(item.product.category));

            return matchesDate && matchesStatus && matchesGov && matchesSocial && matchesCategory;
        });
    }, [orders, dateRange, selectedStatuses, selectedGovernorates, selectedSocials, selectedCategories]);

    // KPI Calculations
    const totalRevenue = useMemo(() => filteredOrders.reduce((sum, order) => sum + order.total, 0), [filteredOrders]);
    const totalOrders = filteredOrders.length;
    const activeCustomers = useMemo(() => new Set(filteredOrders.map(o => o.customer.phone)).size, [filteredOrders]);

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
        return orders.filter(order => {
            const orderDate = parseISO(order.date);
            return !dateRange?.from || !dateRange?.to || isWithinInterval(orderDate, { start: dateRange.from, end: dateRange.to });
        });
    }, [orders, dateRange]);

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
                const cat = item.product?.category;
                if (cat && !visitedCats.has(cat)) {
                    counts[cat] = (counts[cat] || 0) + 1;
                    visitedCats.add(cat);
                }
            });
        });
        return categories.map(c => ({
            value: c,
            label: c,
            count: counts[c] || 0
        })).sort((a, b) => b.count - a.count);
    }, [ordersInDateRange, categories]);


    // Chart Data
    const revenueData = useMemo(() => {
        if (!dateRange?.from || !dateRange?.to || isAfter(dateRange.from, dateRange.to)) return [];

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
            const dayStr = format(parseISO(order.date), 'yyyy-MM-dd');
            if (dataMap[dayStr] !== undefined) {
                dataMap[dayStr] += order.total;
            }
        });

        return Object.entries(dataMap).map(([date, value]) => ({
            date: format(parseISO(date), 'MMM d'),
            value
        }));
    }, [filteredOrders, dateRange]);

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

    return (
        <Layout title={t('dashboard.title')}>
            {/* Unified Actions Bar - Based on Orders template */}
            <div className="flex flex-col gap-4 mb-8 bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                {/* Top Row: General Actions | Clear Filters + Dashboard Count/Summary */}
                <div className="flex gap-3 w-full items-center justify-between flex-wrap">
                    <div className="flex gap-3 items-center flex-wrap">
                        <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl font-bold text-sm border border-indigo-100 dark:border-indigo-900/50">
                            <TrendingUp className="w-4 h-4" />
                            <span>{t('dashboard.liveDashboard')}</span>
                        </div>
                    </div>

                    <div className="flex gap-3 items-center flex-wrap">
                        {/* Clear Filters Button */}
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
                                    {t('dashboard.clearFilters')}
                                </button>
                            )}

                        {/* Order Count for Context */}
                        <div className="flex items-center gap-3 px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800">
                            <Package className="w-4 h-4 text-slate-400" />
                            <span className="text-sm font-bold text-slate-500">
                                <span className="text-slate-900 dark:text-white">{filteredOrders.length}</span> {t('dashboard.filteredOrders')}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Filters Row: Date + Governorate + Social + Categories + Status */}
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
                </div>
            </div>

            <div className="space-y-6">
                {/* KPI Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-accent rounded-3xl p-6 text-white shadow-accent">
                        <div className="flex justify-between items-start mb-4 opacity-80">
                            <span className="font-bold text-xs uppercase tracking-widest">{t('dashboard.totalRevenue')}</span>
                            <DollarSign className="w-5 h-5" />
                        </div>
                        <h3 className="text-3xl font-black mb-1">{formatCurrency(totalRevenue)}</h3>
                        <div className="flex items-center gap-1 text-xs font-medium opacity-80">
                            <TrendingUp className="w-3 h-3" />
                            <span>{t('dashboard.revenueComparison')}</span>
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
                            <span className="font-bold text-xs uppercase tracking-widest">{t('dashboard.activeCustomers')}</span>
                            <Users className="w-5 h-5" />
                        </div>
                        <h3 className="text-3xl font-black text-slate-800 dark:text-white mb-1">{activeCustomers}</h3>
                        <p className="text-xs text-slate-500 font-medium mt-1">{t('dashboard.uniqueBuyers')}</p>
                    </div>
                </div>

                {/* Charts & Context Map */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[400px]">
                    <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
                            <TrendingUp className="w-5 h-5" style={{ color: appearance.accentType === 'solid' ? appearance.accentColor : appearance.accentGradient.start }} /> {t('dashboard.revenueTrend')}
                        </h3>
                        <div className="flex-1 min-h-0">
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
                        </div>
                    </div>

                    <div className="lg:col-span-1 border border-slate-100 dark:border-slate-700 rounded-3xl overflow-hidden shadow-sm h-full relative">
                        <IraqMap
                            data={regionDataObj}
                            selectedGovernorates={selectedGovernorates}
                            onSelect={(reg) => {
                                if (selectedGovernorates.includes(reg)) {
                                    setSelectedGovernorates(selectedGovernorates.filter(r => r !== reg));
                                } else {
                                    setSelectedGovernorates([...selectedGovernorates, reg]);
                                }
                            }}
                        />
                        <div className="absolute top-4 start-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-xs font-bold text-slate-500 shadow-sm border border-slate-100">
                            {t('dashboard.interactiveMap')}
                        </div>
                    </div>
                </div>

                {/* Bottom Widgets */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[400px]">
                    <TopRegionsList
                        regions={regionCounts}
                        selectedRegion={selectedGovernorates}
                        onSelect={(reg) => {
                            if (selectedGovernorates.includes(reg)) {
                                setSelectedGovernorates(selectedGovernorates.filter(r => r !== reg));
                            } else {
                                setSelectedGovernorates([...selectedGovernorates, reg]);
                            }
                        }}
                    />

                    <div className="h-full">
                        <TopSellingProductsTable
                            products={products}
                            orders={ordersInDateRange} // Pass filtered orders
                            formatCurrency={formatCurrency}
                        />
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default Dashboard;
