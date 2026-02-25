import test from 'node:test';
import assert from 'node:assert/strict';

import {
    PRINT_RESULT,
    attachPrintLifecycleListeners,
    createPrintCompletionController,
    resolvePrintStrategy,
    runPrintStrategyWithFallback
} from '../src/utils/printFlow.js';

class MockEventTarget {
    constructor() {
        this.listeners = new Map();
        this.visibilityState = 'visible';
    }

    addEventListener(eventName, handler) {
        if (!this.listeners.has(eventName)) {
            this.listeners.set(eventName, new Set());
        }
        this.listeners.get(eventName).add(handler);
    }

    removeEventListener(eventName, handler) {
        const handlers = this.listeners.get(eventName);
        if (handlers) handlers.delete(handler);
    }

    emit(eventName) {
        const handlers = this.listeners.get(eventName);
        if (!handlers) return;
        [...handlers].forEach((handler) => handler());
    }
}

test('iOS standalone chooses iframe print strategy', () => {
    const strategy = resolvePrintStrategy({ iosStandalonePwa: true });
    assert.equal(strategy, 'iframe');
});

test('non-iOS standalone chooses popup strategy', () => {
    const strategy = resolvePrintStrategy({ iosStandalonePwa: false });
    assert.equal(strategy, 'popup');
});

test('popup blocked falls back to iframe strategy', async () => {
    let popupCalls = 0;
    let iframeCalls = 0;

    const result = await runPrintStrategyWithFallback({
        strategy: 'popup',
        popupStrategy: async () => {
            popupCalls += 1;
            return { status: PRINT_RESULT.POPUP_BLOCKED };
        },
        iframeStrategy: async () => {
            iframeCalls += 1;
            return { status: PRINT_RESULT.PRINTED };
        }
    });

    assert.equal(popupCalls, 1);
    assert.equal(iframeCalls, 1);
    assert.equal(result.status, PRINT_RESULT.PRINTED);
    assert.equal(result.popupBlocked, true);
});

test('print lifecycle resolves once on afterprint and cleans up listeners', async () => {
    const windowTarget = new MockEventTarget();
    const documentTarget = new MockEventTarget();
    let cleanupCalls = 0;

    const controller = createPrintCompletionController({ timeoutMs: 200 });
    const detach = attachPrintLifecycleListeners({
        windowTarget,
        documentTarget,
        onPrinted: () => controller.complete(PRINT_RESULT.PRINTED),
        onCancelled: () => controller.complete(PRINT_RESULT.CANCELLED)
    });

    controller.setCleanup(() => {
        cleanupCalls += 1;
        detach();
    });
    controller.startTimeout();

    windowTarget.emit('afterprint');
    windowTarget.emit('afterprint');
    windowTarget.emit('focus');

    const result = await controller.promise;
    assert.equal(result.status, PRINT_RESULT.PRINTED);
    assert.equal(cleanupCalls, 1);
});

test('print lifecycle resolves on timeout when no events fire', async () => {
    let cleanupCalls = 0;

    const controller = createPrintCompletionController({ timeoutMs: 20 });
    controller.setCleanup(() => {
        cleanupCalls += 1;
    });
    controller.startTimeout();

    const result = await controller.promise;
    assert.equal(result.status, PRINT_RESULT.TIMEOUT);
    assert.equal(cleanupCalls, 1);
});
