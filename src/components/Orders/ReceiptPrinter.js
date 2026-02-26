import {
    DEFAULT_PRINT_TIMEOUT_MS,
    PRINT_RESULT,
    attachPrintLifecycleListeners,
    createPrintCompletionController,
    resolvePrintStrategy,
    runPrintStrategyWithFallback
} from '../../utils/printFlow';
import { buildInvoiceHTML } from './InvoiceTemplate';
import { buildReceiptHTML } from './ReceiptTemplate';

export const generateInvoiceHTML = ({ order, brand, formatCurrency }) => (
    buildInvoiceHTML({ order, brand, formatCurrency })
);

export const triggerPDFPrint = ({ order, brand, formatCurrency }) => {
    const html = generateInvoiceHTML({ order, brand, formatCurrency });
    const blob = new Blob([html], { type: 'text/html; charset=utf-8' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 60000);
};

const createPrintLifecyclePromise = ({
    windowTarget,
    documentTarget,
    timeoutMs,
    cleanup
}) => {
    const controller = createPrintCompletionController({ timeoutMs });
    const detachListeners = attachPrintLifecycleListeners({
        windowTarget,
        documentTarget,
        onPrinted: () => controller.complete(PRINT_RESULT.PRINTED),
        onCancelled: () => controller.complete(PRINT_RESULT.CANCELLED)
    });

    controller.setCleanup(() => {
        detachListeners();
        if (typeof cleanup === 'function') cleanup();
    });
    controller.startTimeout();

    return controller;
};

const printWithIframe = ({ html, timeoutMs }) => {
    if (typeof document === 'undefined' || !document.body) {
        return Promise.resolve({ status: PRINT_RESULT.TIMEOUT });
    }

    const iframe = document.createElement('iframe');
    iframe.setAttribute('aria-hidden', 'true');
    iframe.style.position = 'fixed';
    iframe.style.bottom = '0';
    iframe.style.right = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.opacity = '0';
    iframe.style.pointerEvents = 'none';
    document.body.appendChild(iframe);

    const frameWindow = iframe.contentWindow;
    const frameDocument = frameWindow?.document;

    if (!frameWindow || !frameDocument) {
        iframe.remove();
        return Promise.resolve({ status: PRINT_RESULT.TIMEOUT });
    }

    frameDocument.open();
    frameDocument.write(html);
    frameDocument.close();

    const controller = createPrintLifecyclePromise({
        windowTarget: window,
        documentTarget: document,
        timeoutMs,
        cleanup: () => iframe.remove()
    });

    try {
        setTimeout(() => {
            frameWindow.focus();
            frameWindow.print();
        }, 20);
    } catch {
        controller.complete(PRINT_RESULT.TIMEOUT);
    }

    return controller.promise;
};

const printWithPopup = ({ html, timeoutMs }) => {
    const popupWindow = window.open('', '', 'width=600,height=800');
    if (!popupWindow) return Promise.resolve({ status: PRINT_RESULT.POPUP_BLOCKED });

    popupWindow.document.open();
    popupWindow.document.write(html);
    popupWindow.document.close();

    const controller = createPrintLifecyclePromise({
        windowTarget: popupWindow,
        documentTarget: popupWindow.document,
        timeoutMs,
        cleanup: () => {
            if (!popupWindow.closed) popupWindow.close();
        }
    });

    try {
        popupWindow.focus();
        popupWindow.print();
    } catch {
        controller.complete(PRINT_RESULT.TIMEOUT);
    }

    return controller.promise;
};

export const printReceipt = async ({ order, brand, formatCurrency, t, options = {} }) => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
        return { status: PRINT_RESULT.TIMEOUT };
    }

    try {
        const html = buildReceiptHTML({
            order,
            brand,
            formatCurrency,
            t,
            isRtl: document.dir === 'rtl'
        });
        const timeoutMs = Number.isFinite(options.timeoutMs)
            ? Number(options.timeoutMs)
            : DEFAULT_PRINT_TIMEOUT_MS;

        const strategy = resolvePrintStrategy({
            iosStandalonePwa: options.iosStandalonePwa,
            forceIframe: options.forceIframe
        });

        return runPrintStrategyWithFallback({
            strategy,
            popupStrategy: () => printWithPopup({ html, timeoutMs }),
            iframeStrategy: () => printWithIframe({ html, timeoutMs })
        });
    } catch (error) {
        console.error('Receipt print flow failed:', error);
        return { status: PRINT_RESULT.TIMEOUT };
    }
};
