import React from 'react';
import { Moon, Sun, Palette } from 'lucide-react';
import { useInventory } from '../../context/InventoryContext';
import { useTranslation } from 'react-i18next';

const solidColors = ['#1e3a5f', '#EC4899', '#14b8a6', '#f97316', '#8b5cf6', '#ef4444'];
const gradients = [
    { id: 'royal', start: '#1e3a5f', end: '#334155' },
    { id: 'sunset', start: '#f43f5e', end: '#8b5cf6' },
    { id: 'aurora', start: '#14b8a6', end: '#3b82f6' },
    { id: 'vibrant', start: '#EC4899', end: '#8B5CF6' }
];

const AppearanceSettings = () => {
    const { t } = useTranslation();
    const { appearance, setAppearance } = useInventory();

    const isGradient = appearance.accentType === 'gradient';

    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-8 animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-6">
            <h2 className="text-xl font-bold text-slate-800 dark:text-white">{t('settings.appearance')}</h2>

            <div className="space-y-3">
                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">{t('settings.themeOptions')}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                        type="button"
                        onClick={() => setAppearance({ theme: 'light' })}
                        className={`p-4 rounded-2xl border-2 text-left transition-all ${appearance.theme === 'light' ? 'border-accent bg-accent/5' : 'border-slate-100 dark:border-slate-700'}`}
                    >
                        <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-white">
                            <Sun className="w-4 h-4" /> {t('settings.themes.light')}
                        </div>
                        <p className="text-xs text-slate-500 mt-1">{t('settings.themes.lightDesc')}</p>
                    </button>
                    <button
                        type="button"
                        onClick={() => setAppearance({ theme: 'dark' })}
                        className={`p-4 rounded-2xl border-2 text-left transition-all ${appearance.theme === 'dark' ? 'border-accent bg-accent/5' : 'border-slate-100 dark:border-slate-700'}`}
                    >
                        <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-white">
                            <Moon className="w-4 h-4" /> {t('settings.themes.dark')}
                        </div>
                        <p className="text-xs text-slate-500 mt-1">{t('settings.themes.darkDesc')}</p>
                    </button>
                </div>
            </div>

            <div className="space-y-3">
                <div className="flex items-center justify-between p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                    <div>
                        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">{t('settings.liquidBackground')}</h3>
                        <p className="text-xs text-slate-500">{t('settings.liquidBackgroundDesc')}</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => setAppearance({ glassBackground: !appearance.glassBackground })}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${appearance.glassBackground ? 'bg-accent' : 'bg-slate-300 dark:bg-slate-600'}`}
                    >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${appearance.glassBackground ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                </div>
            </div>

            <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                    <Palette className="w-4 h-4 text-accent" />
                    {t('settings.accentCustomization')}
                </h3>

                <div className="inline-flex items-center gap-2 p-1 rounded-xl bg-slate-100 dark:bg-slate-700">
                    <button
                        type="button"
                        onClick={() => setAppearance({ accentType: 'solid' })}
                        className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${!isGradient ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow' : 'text-slate-500'}`}
                    >
                        {t('settings.solid')}
                    </button>
                    <button
                        type="button"
                        onClick={() => setAppearance({ accentType: 'gradient' })}
                        className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${isGradient ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow' : 'text-slate-500'}`}
                    >
                        {t('settings.gradient')}
                    </button>
                </div>

                {!isGradient ? (
                    <div className="flex flex-wrap gap-3">
                        {solidColors.map((color) => (
                            <button
                                key={color}
                                type="button"
                                onClick={() => setAppearance({ accentColor: color })}
                                className={`w-9 h-9 rounded-full border-4 transition-transform ${appearance.accentColor === color ? 'border-white dark:border-slate-800 shadow-lg scale-110' : 'border-transparent'}`}
                                style={{ backgroundColor: color }}
                                aria-label={`Accent ${color}`}
                            />
                        ))}
                        <input
                            type="color"
                            value={appearance.accentColor}
                            onChange={(event) => setAppearance({ accentColor: event.target.value })}
                            className="w-10 h-10 rounded-full border border-slate-200 dark:border-slate-700 bg-transparent p-0 cursor-pointer"
                            aria-label={t('settings.customColor')}
                        />
                    </div>
                ) : (
                    <div className="space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {gradients.map((gradient) => {
                                const selected = appearance.accentGradient.start === gradient.start
                                    && appearance.accentGradient.end === gradient.end;
                                return (
                                    <button
                                        key={gradient.id}
                                        type="button"
                                        onClick={() => setAppearance({ accentGradient: gradient })}
                                        className={`p-3 rounded-xl border-2 transition-all ${selected ? 'border-accent bg-accent/5' : 'border-slate-100 dark:border-slate-700'}`}
                                    >
                                        <div
                                            className="h-8 rounded-lg"
                                            style={{ background: `linear-gradient(135deg, ${gradient.start} 0%, ${gradient.end} 100%)` }}
                                        />
                                    </button>
                                );
                            })}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <label className="text-xs font-semibold text-slate-500">
                                {t('settings.start')}
                                <input
                                    type="color"
                                    value={appearance.accentGradient.start}
                                    onChange={(event) => setAppearance({ accentGradient: { ...appearance.accentGradient, start: event.target.value } })}
                                    className="mt-1 w-full h-10 rounded-xl border border-slate-200 dark:border-slate-700 p-1 bg-transparent"
                                />
                            </label>
                            <label className="text-xs font-semibold text-slate-500">
                                {t('settings.end')}
                                <input
                                    type="color"
                                    value={appearance.accentGradient.end}
                                    onChange={(event) => setAppearance({ accentGradient: { ...appearance.accentGradient, end: event.target.value } })}
                                    className="mt-1 w-full h-10 rounded-xl border border-slate-200 dark:border-slate-700 p-1 bg-transparent"
                                />
                            </label>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AppearanceSettings;
