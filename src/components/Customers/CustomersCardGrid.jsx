import React, { useEffect, useMemo, useState } from 'react';
import { FixedSizeList as List } from 'react-window';
import { User } from 'lucide-react';
import CustomerCardView from './CustomerCardView';

const CustomersCardGrid = ({
    t,
    loading,
    customersData,
    appearanceTheme,
    getCustomerStats,
    formatCurrency,
    onOpenHistory,
    onOpenEdit,
    getSocialIcon
}) => {
    const [viewportWidth, setViewportWidth] = useState(() => (
        typeof window !== 'undefined' ? window.innerWidth : 1280
    ));

    useEffect(() => {
        const onResize = () => setViewportWidth(window.innerWidth);
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);

    const columns = useMemo(() => {
        if (viewportWidth >= 1024) return 3;
        if (viewportWidth >= 768) return 2;
        return 1;
    }, [viewportWidth]);

    const gridClass = useMemo(() => {
        if (columns === 3) return 'grid-cols-3';
        if (columns === 2) return 'grid-cols-2';
        return 'grid-cols-1';
    }, [columns]);

    const rowHeight = columns === 1 ? 340 : 365;
    const rowGap = 24;
    const rowCount = Math.ceil(customersData.length / columns);
    const listHeight = Math.min(760, Math.max(240, rowCount * (rowHeight + rowGap)));

    if (loading) {
        const skeletonCount = Math.max(columns * 2, 3);
        return (
            <div className={`grid ${gridClass} gap-6 animate-in fade-in duration-500`}>
                {Array.from({ length: skeletonCount }).map((_, index) => (
                    <div key={index} className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 p-6">
                        <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-1/4 animate-pulse mb-4" />
                        <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2 animate-pulse mb-2" />
                        <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-2/3 animate-pulse" />
                    </div>
                ))}
            </div>
        );
    }

    if (!customersData.length) {
        return (
            <div className="py-20 text-center bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700">
                <User className="w-16 h-16 mx-auto mb-4 text-slate-200" />
                <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">{t('customers.noMatch')}</p>
            </div>
        );
    }

    return (
        <div className="animate-in fade-in duration-500">
            <List
                height={listHeight}
                itemCount={rowCount}
                itemSize={rowHeight + rowGap}
                width="100%"
                className="custom-scrollbar"
            >
                {({ index, style }) => {
                    const start = index * columns;
                    const rowCustomers = customersData.slice(start, start + columns);
                    const fillers = Math.max(0, columns - rowCustomers.length);

                    return (
                        <div style={style} className="box-border pe-1 pb-6">
                            <div className={`grid ${gridClass} gap-6 h-full`}>
                                {rowCustomers.map((customer) => (
                                    <div key={customer._id} className="h-full">
                                        <CustomerCardView
                                            customer={customer}
                                            appearanceTheme={appearanceTheme}
                                            getCustomerStats={getCustomerStats}
                                            formatCurrency={formatCurrency}
                                            onOpenHistory={onOpenHistory}
                                            onOpenEdit={onOpenEdit}
                                            getSocialIcon={getSocialIcon}
                                        />
                                    </div>
                                ))}
                                {Array.from({ length: fillers }).map((_, fillerIdx) => (
                                    <div key={`filler-${index}-${fillerIdx}`} className="opacity-0 pointer-events-none" />
                                ))}
                            </div>
                        </div>
                    );
                }}
            </List>
        </div>
    );
};

export default CustomersCardGrid;
