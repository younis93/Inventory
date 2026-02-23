import React from 'react';
import { Download, Globe, LayoutGrid, List, MapPin, Plus, Search, User } from 'lucide-react';
import DateRangePicker from '../DateRangePicker';
import FilterDropdown from '../FilterDropdown';
import RowLimitDropdown from '../RowLimitDropdown';
import SortDropdown from '../SortDropdown';

const mobileSortOptions = (t) => ([
    { value: 'orders-high', label: `${t('customers.totalSpent')} (High)` },
    { value: 'orders-low', label: `${t('customers.totalSpent')} (Low)` },
    { value: 'date-new', label: t('common.dateNew') },
    { value: 'name-asc', label: t('common.nameAZ') }
]);

const desktopSortOptions = (t) => ([
    { value: 'orders-high', label: `${t('customers.totalSpent')} (High)` },
    { value: 'orders-low', label: `${t('customers.totalSpent')} (Low)` },
    { value: 'date-new', label: t('common.dateNew') },
    { value: 'name-asc', label: t('common.nameAZ') }
]);

const CustomersHeader = ({
    t,
    appearanceTheme,
    canExport,
    onOpenAdd,
    onExportCSV,
    hasActiveFilters,
    onClearFilters,
    displayLimit,
    onDisplayLimitChange,
    filteredCount,
    sortBy,
    onSortChange,
    searchTerm,
    onSearchChange,
    dateRange,
    onDateRangeChange,
    brandColor,
    governorateOptions,
    filterGovernorates,
    onFilterGovernoratesChange,
    socialOptions,
    filterSocials,
    onFilterSocialsChange,
    viewMode,
    onViewModeChange
}) => {
    return (
        <div className={`flex flex-col gap-4 mb-8 bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 transition-all ${['liquid', 'default_glass'].includes(appearanceTheme) ? 'glass-panel' : ''}`}>
            <div className="flex gap-3 w-full items-center justify-between flex-wrap">
                <div className="flex gap-3 items-center flex-wrap">
                    <button
                        onClick={onOpenAdd}
                        className="flex items-center gap-2 px-6 py-2.5 text-white rounded-xl font-bold transition-all bg-accent shadow-accent active:scale-95"
                    >
                        <Plus className="w-5 h-5" />
                        <span>{t('customers.addCustomer')}</span>
                    </button>

                    {canExport && (
                        <button
                            onClick={onExportCSV}
                            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-xl font-bold transition-all shadow-lg hover:bg-green-700"
                        >
                            <Download className="w-5 h-5" />
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

                <div className="hidden sm:flex gap-3 items-center flex-wrap">
                    {hasActiveFilters && (
                        <button
                            onClick={onClearFilters}
                            className="px-4 py-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 rounded-xl font-bold text-sm transition-all border border-slate-200 dark:border-slate-700"
                        >
                            {t('common.clearFilters')}
                        </button>
                    )}

                    <RowLimitDropdown limit={displayLimit} onChange={onDisplayLimitChange} />

                    <div className="flex items-center gap-3 px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800">
                        <User className="w-4 h-4 text-slate-400" />
                        <span className="text-sm font-bold text-slate-500">
                            <span className="text-slate-900 dark:text-white">{filteredCount}</span> {t('customers.title')}
                        </span>
                    </div>
                </div>
            </div>

            <div className="flex sm:hidden gap-2 items-center w-full flex-nowrap overflow-visible">
                <SortDropdown
                    title={t('common.sort')}
                    options={mobileSortOptions(t)}
                    selectedValue={sortBy}
                    onChange={onSortChange}
                />
                <RowLimitDropdown limit={displayLimit} onChange={onDisplayLimitChange} />
                <div className="shrink-0 whitespace-nowrap flex items-center gap-3 px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800">
                    <User className="w-4 h-4 text-slate-400" />
                    <span className="text-sm font-bold text-slate-500">
                        <span className="text-slate-900 dark:text-white">{filteredCount}</span> {t('customers.title')}
                    </span>
                </div>
            </div>

            <div className="flex gap-3 w-full flex-wrap lg:flex-nowrap items-center">
                <div className="relative order-last w-full sm:order-none sm:min-w-[200px] sm:flex-1 lg:flex-none lg:w-[320px] h-[44px]">
                    <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                        type="text"
                        placeholder={t('customers.searchPlaceholder')}
                        value={searchTerm}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="ps-10 pe-4 py-0 h-full w-full bg-slate-50 dark:bg-slate-900/50 border-2 border-slate-100 dark:border-slate-800 rounded-2xl outline-none focus:border-blue-200 dark:focus:border-blue-800 focus:ring-2 focus:ring-[var(--brand-color)]/20 transition-all font-bold text-sm dark:text-white"
                    />
                </div>

                <div className="h-[44px] flex-shrink-0 order-2 sm:order-none">
                    <DateRangePicker range={dateRange} onRangeChange={onDateRangeChange} brandColor={brandColor} />
                </div>

                <FilterDropdown
                    title={t('customers.form.governorate')}
                    options={governorateOptions}
                    selectedValues={filterGovernorates}
                    onChange={onFilterGovernoratesChange}
                    icon={MapPin}
                    showSearch={false}
                />

                <div className="order-1 sm:order-none">
                    <FilterDropdown
                        title={t('customers.social')}
                        options={socialOptions}
                        selectedValues={filterSocials}
                        onChange={onFilterSocialsChange}
                        icon={Globe}
                        showSearch={false}
                    />
                </div>

                <div className="hidden sm:block">
                    <SortDropdown
                        title={t('common.sort')}
                        options={desktopSortOptions(t)}
                        selectedValue={sortBy}
                        onChange={onSortChange}
                    />
                </div>

                <div className="hidden lg:flex bg-slate-100 dark:bg-slate-700 p-1 rounded-xl border border-slate-200 dark:border-slate-600 ms-auto">
                    <button
                        onClick={() => onViewModeChange('table')}
                        className={`p-1.5 rounded-lg transition-all ${viewMode === 'table' ? 'bg-white dark:bg-slate-600 text-[var(--brand-color)] shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
                        title="Table View"
                    >
                        <List className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => onViewModeChange('card')}
                        className={`p-1.5 rounded-lg transition-all ${viewMode === 'card' ? 'bg-white dark:bg-slate-600 text-[var(--brand-color)] shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
                        title={t('customers.viewCard')}
                    >
                        <LayoutGrid className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CustomersHeader;
