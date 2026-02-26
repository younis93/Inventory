import React from 'react';
import { FixedSizeList as List } from 'react-window';
import { User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import CustomerTableRow from './CustomerTableRow';

const headerColumns = [
    { key: 'name', labelKey: 'customers.name' },
    { key: 'governorate', labelKey: 'customers.location' },
    { key: 'spent', labelKey: 'customers.totalSpent' },
    { key: 'createdOn', labelKey: 'customers.createdOn' },
    { key: 'createdBy', labelKey: 'common.createdBy' },
    { key: 'actions', labelKey: 'customers.actions' }
];

const gridClass = 'grid grid-cols-[1.7fr_1.6fr_1fr_1fr_1fr_1.1fr]';

const CustomersTable = ({
    t,
    loading,
    customersData,
    formatCurrency,
    getCustomerStats,
    getValidDate,
    onOpenHistory,
    onOpenEdit,
    columnSort,
    onColumnSort
}) => {
    const { i18n } = useTranslation();
    const isRTL = i18n.dir() === 'rtl';

    if (loading) {
        return (
            <div className="p-4 hidden sm:block">
                <div className="space-y-2">
                    <div className={`${gridClass} gap-3 px-4 py-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl`}>
                        {headerColumns.map((column) => (
                            <div key={column.key} className="h-4 w-20 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                        ))}
                    </div>
                    {Array.from({ length: 5 }).map((_, idx) => (
                        <div key={idx} className={`${gridClass} gap-3 px-4 py-4 border-b border-slate-100 dark:border-slate-700`}>
                            {Array.from({ length: headerColumns.length }).map((__, cellIdx) => (
                                <div key={cellIdx} className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                            ))}
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (!customersData.length) {
        return (
            <div className="hidden sm:block py-12 text-center text-slate-400">
                <User className="w-12 h-12 mx-auto mb-2 opacity-20" />
                <p className="font-bold uppercase tracking-widest text-xs">{t('customers.noData')}</p>
            </div>
        );
    }

    const listHeight = Math.min(560, Math.max(160, customersData.length * 86));

    return (
        <div className="overflow-x-auto custom-scrollbar hidden sm:block" dir={isRTL ? 'rtl' : 'ltr'}>
            <div className="min-w-[1040px]">
                <div className={`${gridClass} gap-3 px-4 py-3 bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-500 uppercase rounded-t-2xl`}>
                    {headerColumns.map((column) => {
                        if (column.key === 'createdOn' || column.key === 'createdBy' || column.key === 'actions') {
                            return (
                                <div key={column.key} className={column.key === 'actions' ? 'text-end pe-2' : ''}>
                                    {t(column.labelKey)}
                                </div>
                            );
                        }

                        const isActive = columnSort.column === column.key;
                        return (
                            <button
                                key={column.key}
                                type="button"
                                onClick={() => onColumnSort(column.key)}
                                className="flex items-center gap-2 text-start hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                            >
                                {t(column.labelKey)}
                                {isActive && (
                                    <span className="text-[var(--brand-color)] font-bold">
                                        {columnSort.direction === 'asc' ? '↑' : '↓'}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>

                <List
                    height={listHeight}
                    itemCount={customersData.length}
                    itemSize={86}
                    width="100%"
                    direction={isRTL ? 'rtl' : 'ltr'}
                    className="custom-scrollbar"
                >
                    {({ index, style }) => {
                        const customer = customersData[index];
                        return (
                            <CustomerTableRow
                                customer={customer}
                                style={style}
                                t={t}
                                formatCurrency={formatCurrency}
                                getCustomerStats={getCustomerStats}
                                getValidDate={getValidDate}
                                onOpenHistory={onOpenHistory}
                                onOpenEdit={onOpenEdit}
                            />
                        );
                    }}
                </List>
            </div>
        </div>
    );
};

export default CustomersTable;
