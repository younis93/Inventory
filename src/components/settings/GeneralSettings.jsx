import React from 'react';
import { Globe, RefreshCcw, Wifi, WifiOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useInventory } from '../../context/InventoryContext';

const GeneralSettings = () => {
    const { t } = useTranslation();
    const {
        language,
        changeLanguage,
        isDesktop,
        isOnline,
        pendingSyncCount,
        syncNow,
        desktopOfflineModeEnabled,
        setDesktopOfflineModeEnabled,
        conflicts
    } = useInventory();

    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-8 animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-6">
            <h2 className="text-xl font-bold text-slate-800 dark:text-white">{t('settings.general')}</h2>

            <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-4 flex items-center gap-2">
                    <Globe className="w-4 h-4 text-accent" />
                    {t('settings.language')}
                </h3>
                <div className="flex gap-3">
                    <button
                        type="button"
                        onClick={() => changeLanguage('en')}
                        className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-all border-2 ${
                            language === 'en'
                                ? 'border-accent bg-white dark:bg-slate-800 text-accent shadow-sm'
                                : 'border-transparent bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                    >
                        English
                    </button>
                    <button
                        type="button"
                        onClick={() => changeLanguage('ar')}
                        className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-all border-2 ${
                            language === 'ar'
                                ? 'border-accent bg-white dark:bg-slate-800 text-accent shadow-sm'
                                : 'border-transparent bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                    >
                        Arabic
                    </button>
                </div>
            </div>

            {isDesktop && (
                <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 space-y-4">
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">Desktop Sync</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5">
                                {isOnline ? <Wifi className="w-3.5 h-3.5 text-emerald-500" /> : <WifiOff className="w-3.5 h-3.5 text-red-500" />}
                                {isOnline ? 'Online' : 'Offline'} - {pendingSyncCount} queued
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={syncNow}
                            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-bold text-white rounded-xl bg-accent shadow-accent transition-all"
                        >
                            <RefreshCcw className="w-4 h-4" />
                            Sync Now
                        </button>
                    </div>

                    <label className="flex items-center justify-between gap-3 p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Offline mode</span>
                        <button
                            type="button"
                            onClick={() => setDesktopOfflineModeEnabled(!desktopOfflineModeEnabled)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${desktopOfflineModeEnabled ? 'bg-accent' : 'bg-slate-300 dark:bg-slate-600'}`}
                        >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${desktopOfflineModeEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                    </label>

                    {conflicts?.length > 0 && (
                        <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                            <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">
                                {conflicts.length} sync conflict(s) detected. Latest values were auto-resolved.
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default GeneralSettings;
