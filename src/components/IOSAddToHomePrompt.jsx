import React, { useEffect, useMemo, useState } from 'react';
import { Share2, PlusSquare, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const DISMISS_KEY = 'inventory.iosA2hsDismissed';

const isIosDevice = () => {
    if (typeof window === 'undefined') return false;
    const ua = window.navigator.userAgent || '';
    const platform = window.navigator.platform || '';
    return /iPad|iPhone|iPod/.test(ua) || (platform === 'MacIntel' && window.navigator.maxTouchPoints > 1);
};

const isSafariBrowser = () => {
    if (typeof window === 'undefined') return false;
    const ua = window.navigator.userAgent || '';
    return /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS|DuckDuckGo/.test(ua);
};

const isStandaloneMode = () => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia?.('(display-mode: standalone)')?.matches || window.navigator.standalone === true;
};

const IOSAddToHomePrompt = () => {
    const { t } = useTranslation();
    const [visible, setVisible] = useState(false);

    const shouldOfferInstall = useMemo(() => (
        typeof window !== 'undefined' &&
        window.location.protocol !== 'file:' &&
        isIosDevice() &&
        isSafariBrowser() &&
        !isStandaloneMode()
    ), []);

    useEffect(() => {
        if (!shouldOfferInstall) return;
        try {
            if (localStorage.getItem(DISMISS_KEY) === '1') return;
        } catch {
            // Ignore localStorage errors and show prompt.
        }
        setVisible(true);
    }, [shouldOfferInstall]);

    if (!visible) return null;

    return (
        <div className="mx-auto mb-3 w-full max-w-7xl px-4 md:px-8">
            <div className="flex flex-col gap-3 rounded-2xl border border-sky-200 bg-sky-50/95 p-3 text-sky-900 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                    <p className="text-sm font-black">{t('install.ios.title')}</p>
                    <p className="text-xs font-semibold text-sky-800">
                        {t('install.ios.stepsBefore')}
                        <Share2 className="mx-1 inline-block h-3.5 w-3.5 -translate-y-px" />
                        {t('install.ios.stepsMiddle')}
                        <PlusSquare className="mx-1 inline-block h-3.5 w-3.5 -translate-y-px" />
                        {t('install.ios.stepsAfter')}
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => {
                        setVisible(false);
                        try {
                            localStorage.setItem(DISMISS_KEY, '1');
                        } catch {
                            // Ignore localStorage errors.
                        }
                    }}
                    className="inline-flex items-center justify-center self-end rounded-xl border border-sky-200 bg-white px-3 py-1.5 text-xs font-bold text-sky-700 transition hover:bg-sky-100 sm:self-auto"
                >
                    <X className="me-1 h-3.5 w-3.5" />
                    {t('install.ios.dismiss')}
                </button>
            </div>
        </div>
    );
};

export default IOSAddToHomePrompt;
