import React, { useState, useMemo } from 'react';
import Layout from '../components/Layout';
import { useInventory } from '../context/InventoryContext';
import { DollarSign, ShoppingCart, TrendingUp, Users, MapPin, Package, AlertCircle } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import DateRangePicker from '../components/DateRangePicker';
import FilterCard from '../components/FilterCard';
import IraqMap from '../components/IraqMap';
import TopRegionsList from '../components/TopRegionsList';
import TopSellingProductsTable from '../components/TopSellingProductsTable';
import { GOVERNORATES, SOCIAL_PLATFORMS } from '../constants/iraq';
import { isWithinInterval, parseISO, subDays, startOfMonth, endOfMonth, eachDayOfInterval, format } from 'date-fns';

const Dashboard = () => {
    const { orders, products, customers, loading, formatCurrency, brand, categories, theme } = useInventory();

    // Filters State
    const [dateRange, setDateRange] = useState({
        from: subDays(new Date(), 30),
        to: new Date()
    });

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
            const gov = order.customer.governorate;
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
            const g = o.customer.governorate;
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
            const s = o.customer.social;
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
            o.items.forEach(item => {
                const cat = item.product.category;
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
        if (!dateRange.from || !dateRange.to) return [];
        const days = eachDayOfInterval({ start: dateRange.from, end: dateRange.to });
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
        <Layout title="Dashboard">
            <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">

                {/* Left Column: Filters */}
                <div className="xl:col-span-1 space-y-6">
                    <div className="bg-white dark:bg-slate-800 p-4 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700">
                        <DateRangePicker
                            range={dateRange}
                            onRangeChange={setDateRange}
                            brandColor={brand.color}
                        />
                    </div>

                    <FilterCard
                        title="Governorate"
                        options={governorateOptions}
                        selectedValues={selectedGovernorates}
                        onChange={setSelectedGovernorates}
                        onClear={() => setSelectedGovernorates([])}
                    />

                    <FilterCard
                        title="Social Platform"
                        options={socialOptions}
                        selectedValues={selectedSocials}
                        onChange={setSelectedSocials}
                        onClear={() => setSelectedSocials([])}
                    />

                    <FilterCard
                        title="Categories"
                        options={categoryOptions}
                        selectedValues={selectedCategories}
                        onChange={setSelectedCategories}
                        onClear={() => setSelectedCategories([])}
                    />

                    <FilterCard
                        title="Order Status"
                        options={statusOptions}
                        selectedValues={selectedStatuses}
                        onChange={setSelectedStatuses}
                        onClear={() => setSelectedStatuses([])}
                    />
                </div>

                {/* Main Content */}
                <div className="xl:col-span-3 space-y-6">
                    {/* KPI Cards */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-3xl p-6 text-white shadow-lg shadow-indigo-200 dark:shadow-none">
                            <div className="flex justify-between items-start mb-4 opacity-80">
                                <span className="font-bold text-xs uppercase tracking-widest">Total Revenue</span>
                                <DollarSign className="w-5 h-5" />
                            </div>
                            <h3 className="text-3xl font-black mb-1">{formatCurrency(totalRevenue)}</h3>
                            <div className="flex items-center gap-1 text-xs font-medium opacity-80">
                                <TrendingUp className="w-3 h-3" />
                                <span>+12.5% vs last period</span>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-100 dark:border-slate-700 shadow-sm">
                            <div className="flex justify-between items-start mb-4 text-slate-400">
                                <span className="font-bold text-xs uppercase tracking-widest">Total Orders</span>
                                <ShoppingCart className="w-5 h-5" />
                            </div>
                            <h3 className="text-3xl font-black text-slate-800 dark:text-white mb-1">{totalOrders}</h3>
                            <div className="text-xs text-slate-500 font-bold">Orders placed</div>
                        </div>

                        <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-100 dark:border-slate-700 shadow-sm">
                            <div className="flex justify-between items-start mb-4 text-slate-400">
                                <span className="font-bold text-xs uppercase tracking-widest">Top Region</span>
                                <MapPin className="w-5 h-5" />
                            </div>
                            <h3 className="text-2xl font-black text-slate-800 dark:text-white mb-1 truncate">{topRegion.name}</h3>
                            <div className="text-xs text-slate-500 font-bold">{topRegion.count} orders</div>
                        </div>

                        <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-100 dark:border-slate-700 shadow-sm">
                            <div className="flex justify-between items-start mb-4 text-slate-400">
                                <span className="font-bold text-xs uppercase tracking-widest">Active Customers</span>
                                <Users className="w-5 h-5" />
                            </div>
                            <h3 className="text-3xl font-black text-slate-800 dark:text-white mb-1">{activeCustomers}</h3>
                            <div className="text-xs text-slate-500 font-bold">Unique buyers</div>
                        </div>
                    </div>

                    {/* Charts & Context Map */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[400px]">
                        <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-indigo-500" /> Revenue Trend
                            </h3>
                            <div className="flex-1 min-h-0">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={revenueData}>
                                        <defs>
                                            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor={brand.color} stopOpacity={0.3} />
                                                <stop offset="95%" stopColor={brand.color} stopOpacity={0} />
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
                                            formatter={(value) => [formatCurrency(value), 'Revenue']}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="value"
                                            stroke={brand.color}
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
                                data={regionCounts}
                                selectedRegions={selectedGovernorates}
                                onSelectRegion={(reg) => {
                                    if (selectedGovernorates.includes(reg)) {
                                        setSelectedGovernorates(selectedGovernorates.filter(r => r !== reg));
                                    } else {
                                        setSelectedGovernorates([...selectedGovernorates, reg]);
                                    }
                                }}
                            />
                            <div className="absolute top-4 left-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-xs font-bold text-slate-500 shadow-sm border border-slate-100">
                                Interactive Map
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
            </div>
        </Layout>
    );
};

export default Dashboard;
