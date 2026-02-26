import React from 'react';
import { Download, Globe, MapPin, Plus, Search, ShoppingBag, User } from 'lucide-react';
import DateRangePicker from '../DateRangePicker';
import FilterDropdown from '../FilterDropdown';
import RowLimitDropdown from '../RowLimitDropdown';
import SortDropdown from '../SortDropdown';

const sortOptions = (t) => ([
    { value: 'date-new', label: t('common.dateNew') },
    { value: 'date-old', label: t('common.dateOld') },
    { value: 'total-high', label: t('common.priceHigh') },
    { value: 'total-low', label: t('common.priceLow') },
    { value: 'name-asc', label: t('common.nameAZ') }
]);

const OrdersHeader = ({
    t,
    appearanceTheme,
    canExport,
    onOpenCreate,
    onExportCSV,
    onClearFilters,
    hasActiveFilters,
    visibleCount,
    totalCount,
    displayLimit,
    onDisplayLimitChange,
    sortBy,
    onSortChange,
    searchTerm,
    onSearchChange,
    dateRange,
    onDateRangeChange,
    brandColor,
    statusOptions,
    filterStatuses,
    onFilterStatusesChange,
    governorateOptions,
    filterGovernorates,
    onFilterGovernoratesChange,
    socialOptions,
    filterSocials,
    onFilterSocialsChange,
    createdByOptions,
    filterCreatedBy,
    onFilterCreatedByChange
}) => {
    return (
        <div className={`flex flex-col gap-4 mb-8 bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 transition-all ${['liquid', 'default_glass'].includes(appearanceTheme) ? 'glass-panel' : ''}`}>
            <div className="flex gap-3 w-full items-center justify-between flex-wrap">
                <div className="flex gap-3 items-center flex-wrap">
                    <button
                        onClick={onOpenCreate}
                        className="flex items-center justify-center gap-2 px-6 py-2.5 text-white rounded-xl font-bold transition-all bg-accent shadow-accent active:scale-95"
                    >
                        <Plus className="w-5 h-5" />
                        <span>{t('orders.createOrder')}</span>
                    </button>

                    {canExport && (
                        <button
                            onClick={onExportCSV}
                            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-xl font-bold transition-all shadow-lg hover:bg-green-700"
                        >
                            <Download className="w-5 h-5" />
                            <span className="sm:hidden">CSV</span>
                            <span className="hidden sm:inline">{t('common.exportCSV')}</span>
                        </button>
                    )}
                </div>

                {hasActiveFilters && (
                    <button
                        onClick={onClearFilters}
                        className="sm:hidden ms-auto shrink-0 whitespace-nowrap px-4 py-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 rounded-xl font-bold text-sm transition-all border border-slate-200 dark:border-slate-700"
                    >
                        {t('common.clearFilters')}
                    </button>
                )}

                <div className="hidden sm:flex gap-2 sm:gap-3 items-center w-full sm:w-auto flex-nowrap overflow-visible">
                    {hasActiveFilters && (
                        <button
                            onClick={onClearFilters}
                            className="shrink-0 whitespace-nowrap px-4 py-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 rounded-xl font-bold text-sm transition-all border border-slate-200 dark:border-slate-700"
                        >
                            {t('common.clearFilters')}
                        </button>
                    )}

                    <RowLimitDropdown limit={displayLimit} onChange={onDisplayLimitChange} />

                    <div className="shrink-0 whitespace-nowrap flex items-center gap-3 px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800">
                        <ShoppingBag className="w-4 h-4 text-slate-400" />
                        <span className="text-sm font-bold text-slate-500">
                            <span className="text-slate-900 dark:text-white">{visibleCount}</span> {t('common.of', { defaultValue: 'of' })} <span className="text-slate-900 dark:text-white">{totalCount}</span> {t('orders.title')}
                        </span>
                    </div>
                </div>
            </div>

            <div className="flex sm:hidden gap-2 items-center w-full flex-nowrap overflow-visible">
                <SortDropdown
                    title={t('common.sort')}
                    options={sortOptions(t)}
                    selectedValue={sortBy}
                    onChange={onSortChange}
                />

                <RowLimitDropdown limit={displayLimit} onChange={onDisplayLimitChange} />

                <div className="shrink-0 whitespace-nowrap flex items-center gap-3 px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800">
                    <ShoppingBag className="w-4 h-4 text-slate-400" />
                    <span className="text-sm font-bold text-slate-500">
                        <span className="text-slate-900 dark:text-white">{visibleCount}</span> {t('common.of', { defaultValue: 'of' })} <span className="text-slate-900 dark:text-white">{totalCount}</span> {t('orders.title')}
                    </span>
                </div>
            </div>

            <div className="flex gap-3 w-full flex-wrap lg:flex-nowrap items-center">
                <div className="relative order-last w-full sm:order-none sm:min-w-[200px] sm:flex-1 lg:flex-none lg:w-[280px] h-[44px]">
                    <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                        type="text"
                        placeholder={t('orders.searchPlaceholder')}
                        value={searchTerm}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="ps-10 pe-4 py-0 h-full w-full bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl outline-none focus:border-accent/40 focus:ring-4 focus:ring-accent/10 transition-all font-bold text-sm text-slate-700 dark:text-white"
                    />
                </div>

                <div className="h-[44px] flex-shrink-0">
                    <DateRangePicker range={dateRange} onRangeChange={onDateRangeChange} brandColor={brandColor} />
                </div>

                <FilterDropdown
                    title={t('orders.status')}
                    options={statusOptions}
                    selectedValues={filterStatuses}
                    onChange={onFilterStatusesChange}
                    icon={ShoppingBag}
                    showSearch={false}
                />

                <FilterDropdown
                    title={t('orders.governorate')}
                    options={governorateOptions}
                    selectedValues={filterGovernorates}
                    onChange={onFilterGovernoratesChange}
                    icon={MapPin}
                    showSearch={false}
                />

                <FilterDropdown
                    title={t('orders.socialMedia')}
                    options={socialOptions}
                    selectedValues={filterSocials}
                    onChange={onFilterSocialsChange}
                    icon={Globe}
                    showSearch={false}
                />

                <FilterDropdown
                    title={t('common.createdBy')}
                    options={createdByOptions}
                    selectedValues={filterCreatedBy}
                    onChange={onFilterCreatedByChange}
                    icon={User}
                    showSearch={false}
                />

                <div className="hidden sm:block">
                    <SortDropdown
                        title={t('common.sort')}
                        options={sortOptions(t)}
                        selectedValue={sortBy}
                        onChange={onSortChange}
                    />
                </div>
            </div>
        </div>
    );
};

export default OrdersHeader;
