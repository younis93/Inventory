import React, { useMemo } from 'react';
import { Moon, Sun, Palette, Check, Sparkles } from 'lucide-react';
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
    const gradientStart = appearance?.accentGradient?.start || '#EC4899';
    const gradientEnd = appearance?.accentGradient?.end || '#8B5CF6';
    const normalizedAccentColor = (appearance.accentColor || '').toLowerCase();
    const isPresetAccent = solidColors.some((color) => color.toLowerCase() === normalizedAccentColor);

    const accentPreview = useMemo(() => {
        if (isGradient) {
            return `linear-gradient(135deg, ${gradientStart} 0%, ${gradientEnd} 100%)`;
        }
        return appearance.accentColor;
    }, [isGradient, appearance.accentColor, gradientStart, gradientEnd]);

    const previewShadowColor = useMemo(
        () => (isGradient ? gradientStart : appearance.accentColor),
        [isGradient, appearance.accentColor, gradientStart]
    );

    return (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm p-6 sm:p-8 animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-8">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white">{t('settings.appearance')}</h2>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('settings.themeOptions')}</p>
                </div>
                <div className="w-10 h-10 rounded-2xl bg-accent/10 text-accent flex items-center justify-center shrink-0">
                    <Sparkles className="w-5 h-5" />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <button
                    type="button"
                    onClick={() => setAppearance({ theme: 'light' })}
                    className={`text-left p-4 rounded-2xl border transition-all ${appearance.theme === 'light'
                        ? 'border-accent bg-accent/5 ring-2 ring-accent/10'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                        }`}
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-white">
                            <Sun className="w-4 h-4" />
                            {t('settings.themes.light')}
                        </div>
                        {appearance.theme === 'light' && (
                            <span className="w-5 h-5 rounded-full bg-accent text-white inline-flex items-center justify-center">
                                <Check className="w-3.5 h-3.5" />
                            </span>
                        )}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{t('settings.themes.lightDesc')}</p>
                    <div className="mt-3 h-10 rounded-xl border border-slate-200 bg-white flex items-center px-3 gap-2">
                        <span className="w-4 h-4 rounded-full bg-slate-200" />
                        <span className="h-2.5 w-20 rounded bg-slate-200" />
                        <span className="ms-auto h-6 w-16 rounded-lg bg-slate-100 border border-slate-200" />
                    </div>
                </button>

                <button
                    type="button"
                    onClick={() => setAppearance({ theme: 'dark' })}
                    className={`text-left p-4 rounded-2xl border transition-all ${appearance.theme === 'dark'
                        ? 'border-accent bg-accent/5 ring-2 ring-accent/10'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                        }`}
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-white">
                            <Moon className="w-4 h-4" />
                            {t('settings.themes.dark')}
                        </div>
                        {appearance.theme === 'dark' && (
                            <span className="w-5 h-5 rounded-full bg-accent text-white inline-flex items-center justify-center">
                                <Check className="w-3.5 h-3.5" />
                            </span>
                        )}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{t('settings.themes.darkDesc')}</p>
                    <div className="mt-3 h-10 rounded-xl border border-slate-700 bg-slate-900 flex items-center px-3 gap-2">
                        <span className="w-4 h-4 rounded-full bg-slate-600" />
                        <span className="h-2.5 w-20 rounded bg-slate-700" />
                        <span className="ms-auto h-6 w-16 rounded-lg bg-slate-800 border border-slate-700" />
                    </div>
                </button>
            </div>

            <div className="flex items-center justify-between p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-900/60">
                <div>
                    <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">{t('settings.liquidBackground')}</h3>
                    <p className="text-xs text-slate-500">{t('settings.liquidBackgroundDesc')}</p>
                </div>
                <button
                    type="button"
                    onClick={() => setAppearance({ glassBackground: !appearance.glassBackground })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${appearance.glassBackground ? 'bg-accent' : 'bg-slate-300 dark:bg-slate-600'}`}
                    aria-label={t('settings.liquidBackground')}
                >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${appearance.glassBackground ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.85fr)] gap-6">
                <div className="space-y-4">
                    <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                        <Palette className="w-4 h-4 text-accent" />
                        {t('settings.accentCustomization')}
                    </h3>

                    <div className="inline-flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        <button
                            type="button"
                            onClick={() => setAppearance({ accentType: 'solid' })}
                            className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${!isGradient
                                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                                : 'text-slate-500 dark:text-slate-300'
                                }`}
                        >
                            {t('settings.solid')}
                        </button>
                        <button
                            type="button"
                            onClick={() => setAppearance({ accentType: 'gradient' })}
                            className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${isGradient
                                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                                : 'text-slate-500 dark:text-slate-300'
                                }`}
                        >
                            {t('settings.gradient')}
                        </button>
                    </div>

                    {!isGradient ? (
                        <div className="space-y-4">
                            <div className="flex flex-wrap items-center gap-3 p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60">
                                {solidColors.map((color) => (
                                    <button
                                        key={color}
                                        type="button"
                                        onClick={() => setAppearance({ accentColor: color })}
                                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${color.toLowerCase() === normalizedAccentColor
                                            ? 'scale-110 ring-2 ring-offset-2 ring-offset-white dark:ring-offset-slate-900 ring-slate-300 dark:ring-slate-600 shadow-lg'
                                            : 'hover:scale-105 shadow-sm'
                                            }`}
                                        style={{
                                            backgroundColor: color,
                                            border: '2px solid rgba(255,255,255,0.85)'
                                        }}
                                        aria-label={`Accent ${color}`}
                                    >
                                        {color.toLowerCase() === normalizedAccentColor && (
                                            <Check className="w-4 h-4 text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.35)]" />
                                        )}
                                    </button>
                                ))}

                                <div className="ms-auto flex items-center gap-3">
                                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-300">{t('settings.customColor')}</span>
                                    <label
                                        className={`relative w-10 h-10 rounded-full flex items-center justify-center overflow-hidden cursor-pointer transition-all ${!isPresetAccent
                                            ? 'scale-110 ring-2 ring-offset-2 ring-offset-white dark:ring-offset-slate-900 ring-slate-300 dark:ring-slate-600 shadow-lg'
                                            : 'shadow-sm'
                                            }`}
                                        style={{
                                            backgroundColor: appearance.accentColor,
                                            border: '2px solid rgba(255,255,255,0.85)'
                                        }}
                                        aria-label={t('settings.customColor')}
                                    >
                                        <input
                                            type="color"
                                            value={appearance.accentColor}
                                            onChange={(event) => setAppearance({ accentColor: event.target.value })}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                            aria-label={t('settings.customColor')}
                                        />
                                        {!isPresetAccent && (
                                            <Check className="w-4 h-4 text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.35)] pointer-events-none" />
                                        )}
                                    </label>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60">
                                <label className="text-xs font-semibold text-slate-500 dark:text-slate-300">{t('settings.customColor')}</label>
                                <span className="ms-auto text-xs font-mono text-slate-500 dark:text-slate-400 uppercase">{appearance.accentColor}</span>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {gradients.map((gradient) => {
                                    const selected = gradientStart === gradient.start
                                        && gradientEnd === gradient.end;
                                    return (
                                        <button
                                            key={gradient.id}
                                            type="button"
                                            onClick={() => setAppearance({ accentGradient: { start: gradient.start, end: gradient.end } })}
                                            className={`p-3 rounded-xl border transition-all text-left ${selected
                                                ? 'border-accent bg-accent/5 ring-2 ring-accent/10'
                                                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                                                }`}
                                        >
                                            <div
                                                className="h-9 rounded-lg"
                                                style={{ background: `linear-gradient(135deg, ${gradient.start} 0%, ${gradient.end} 100%)` }}
                                            />
                                            <div className="mt-2 text-xs font-bold text-slate-600 dark:text-slate-300">
                                                {t(`settings.gradients.${gradient.id}`)}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 space-y-2">
                                <div className="text-xs font-semibold text-slate-500 dark:text-slate-300">{t('settings.customDualColors')}</div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-300">
                                        {t('settings.start')}
                                        <div className="mt-1 h-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden">
                                            <input
                                                type="color"
                                                value={gradientStart}
                                                onChange={(event) => setAppearance({ accentGradient: { start: event.target.value, end: gradientEnd } })}
                                                className="custom-dual-color-input"
                                                aria-label={t('settings.start')}
                                            />
                                        </div>
                                    </label>
                                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-300">
                                        {t('settings.end')}
                                        <div className="mt-1 h-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden">
                                            <input
                                                type="color"
                                                value={gradientEnd}
                                                onChange={(event) => setAppearance({ accentGradient: { start: gradientStart, end: event.target.value } })}
                                                className="custom-dual-color-input"
                                                aria-label={t('settings.end')}
                                            />
                                        </div>
                                    </label>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 p-4">
                    <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-3">{t('settings.livePreview')}</h4>
                    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-800">
                        <div className="p-4 text-white" style={{ background: accentPreview }}>
                            <div className="text-xs uppercase font-bold tracking-widest opacity-85">{t('settings.contentLayoutExample')}</div>
                            <div className="mt-2 text-lg font-black">{t('settings.appearance')}</div>
                        </div>
                        <div className="p-4 space-y-3">
                            <button
                                type="button"
                                className="w-full py-2.5 rounded-xl text-white font-bold"
                                style={{
                                    background: accentPreview,
                                    boxShadow: `0 10px 20px -14px ${previewShadowColor}`
                                }}
                            >
                                {t('settings.primaryButton')}
                            </button>
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">{t('settings.toggleSwitch')}</span>
                                <span className="inline-flex h-6 w-11 rounded-full p-1 bg-accent">
                                    <span className="w-4 h-4 rounded-full bg-white ms-auto" />
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AppearanceSettings;
