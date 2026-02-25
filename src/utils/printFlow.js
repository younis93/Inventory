export const PRINT_RESULT = Object.freeze({
    PRINTED: 'printed',
    CANCELLED: 'cancelled',
    TIMEOUT: 'timeout',
    POPUP_BLOCKED: 'popup-blocked'
});

export const DEFAULT_PRINT_TIMEOUT_MS = 6000;

export const isIOS = (userAgent = null) => {
    const ua = userAgent ?? (typeof navigator !== 'undefined' ? navigator.userAgent : '');
    const platform = typeof navigator !== 'undefined' ? navigator.platform : '';
    const maxTouchPoints = typeof navigator !== 'undefined' ? navigator.maxTouchPoints || 0 : 0;

    return /iPad|iPhone|iPod/i.test(ua) || (platform === 'MacIntel' && maxTouchPoints > 1);
};

export const isStandalonePWA = (overrides = {}) => {
    const standalone =
        overrides.standalone ??
        (typeof navigator !== 'undefined' ? Boolean(navigator.standalone) : false);

    const displayModeStandalone =
        overrides.displayModeStandalone ??
        (typeof window !== 'undefined' &&
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(display-mode: standalone)').matches);

    return Boolean(standalone || displayModeStandalone);
};

export const isIOSStandalonePWA = (overrides = {}) => {
    const ios = overrides.ios ?? isIOS(overrides.userAgent ?? null);
    const standalone = overrides.standalonePwa ?? isStandalonePWA(overrides);
    return ios && standalone;
};

export const resolvePrintStrategy = (overrides = {}) => {
    const forceIframe = overrides.forceIframe ?? false;
    const iosStandalone = overrides.iosStandalonePwa ?? isIOSStandalonePWA(overrides);

    if (forceIframe || iosStandalone) return 'iframe';
    return 'popup';
};

export const runPrintStrategyWithFallback = async ({
    strategy,
    popupStrategy,
    iframeStrategy
}) => {
    if (strategy === 'iframe') {
        return iframeStrategy();
    }

    const popupResult = await popupStrategy();
    if (popupResult?.status !== PRINT_RESULT.POPUP_BLOCKED) {
        return popupResult;
    }

    const iframeResult = await iframeStrategy();
    if (!iframeResult || !iframeResult.status) return popupResult;

    return { ...iframeResult, popupBlocked: true };
};

export const createPrintCompletionController = ({
    timeoutMs = DEFAULT_PRINT_TIMEOUT_MS,
    setTimeoutFn = setTimeout,
    clearTimeoutFn = clearTimeout
} = {}) => {
    let settled = false;
    let timeoutId = null;
    let cleanup = () => {};
    let resolvePromise;

    const promise = new Promise((resolve) => {
        resolvePromise = resolve;
    });

    const complete = (status) => {
        if (settled) return false;
        settled = true;

        if (timeoutId !== null) {
            clearTimeoutFn(timeoutId);
            timeoutId = null;
        }

        try {
            cleanup();
        } finally {
            resolvePromise({ status });
        }

        return true;
    };

    return {
        promise,
        complete,
        setCleanup: (cleanupFn) => {
            cleanup = typeof cleanupFn === 'function' ? cleanupFn : () => {};
        },
        startTimeout: () => {
            timeoutId = setTimeoutFn(() => {
                complete(PRINT_RESULT.TIMEOUT);
            }, timeoutMs);
        },
        isSettled: () => settled
    };
};

export const attachPrintLifecycleListeners = ({
    windowTarget,
    documentTarget,
    onPrinted,
    onCancelled,
    setTimeoutFn = setTimeout,
    clearTimeoutFn = clearTimeout,
    cancelDelayMs = 350
}) => {
    let cancelTimer = null;

    const clearCancelTimer = () => {
        if (cancelTimer !== null) {
            clearTimeoutFn(cancelTimer);
            cancelTimer = null;
        }
    };

    const scheduleCancel = () => {
        clearCancelTimer();
        cancelTimer = setTimeoutFn(() => {
            onCancelled();
        }, cancelDelayMs);
    };

    const handleAfterPrint = () => {
        clearCancelTimer();
        onPrinted();
    };

    const handleFocus = () => {
        scheduleCancel();
    };

    const handleVisibilityChange = () => {
        if (!documentTarget || documentTarget.visibilityState === 'visible') {
            scheduleCancel();
        }
    };

    if (windowTarget?.addEventListener) {
        windowTarget.addEventListener('afterprint', handleAfterPrint);
        windowTarget.addEventListener('focus', handleFocus);
    }

    if (documentTarget?.addEventListener) {
        documentTarget.addEventListener('visibilitychange', handleVisibilityChange);
    }

    return () => {
        clearCancelTimer();
        if (windowTarget?.removeEventListener) {
            windowTarget.removeEventListener('afterprint', handleAfterPrint);
            windowTarget.removeEventListener('focus', handleFocus);
        }
        if (documentTarget?.removeEventListener) {
            documentTarget.removeEventListener('visibilitychange', handleVisibilityChange);
        }
    };
};
