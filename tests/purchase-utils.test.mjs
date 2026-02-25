import test from 'node:test';
import assert from 'node:assert/strict';

import {
    PURCHASE_STATUSES,
    applyPurchaseStatusTransition,
    createPurchaseFromProductSnapshot,
    getPurchaseTotalCostIQD,
    validateStatusHistory
} from '../src/hooks/domains/purchaseUtils.js';

const sampleProduct = {
    _id: 'prod-1',
    name: 'Demo Product',
    sku: 'SKU-1',
    category: 'Toys',
    description: 'Sample',
    unitPriceUSD: 10,
    alibabaFeeUSD: 2,
    exchangeRate: 1400,
    shippingToIraqIQD: 20000,
    additionalFeesIQD: 10000,
    marginPercent: 25,
    sellingPriceIQD: 25000,
    costPriceIQD_total: 100000,
    costPriceIQD_perUnit: 20000,
    recommendedSellingPriceIQD_perUnit: 25000,
    profitPerUnitIQD: 5000,
    unitsSold: 0,
    alibabaProductLink: 'https://alibaba.com/product',
    alibabaMessageLink: 'https://alibaba.com/messages',
    alibabaOrderLink: 'https://alibaba.com/order',
    alibabaOrderNumber: 'A-123',
    alibabaNote: 'Batch note'
};

test('creates initial purchase snapshot from product with manual status date', () => {
    const purchase = createPurchaseFromProductSnapshot(sampleProduct, {
        quantity: 5,
        status: 'received',
        statusDate: '2026-02-20',
        statusNote: 'Initial stock import'
    });

    assert.equal(purchase.productId, sampleProduct._id);
    assert.equal(purchase.quantity, 5);
    assert.equal(purchase.status, 'received');
    assert.equal(purchase.received, true);
    assert.equal(purchase.statusHistory.length, 1);
    assert.deepEqual(purchase.statusHistory[0], {
        status: 'received',
        date: '2026-02-20',
        note: 'Initial stock import'
    });
    assert.equal(purchase.basicInfo.name, sampleProduct.name);
    assert.equal(purchase.alibabaInfo.alibabaOrderNumber, sampleProduct.alibabaOrderNumber);
});

test('status transition appends history and toggles receive only once', () => {
    const purchase = createPurchaseFromProductSnapshot(sampleProduct, {
        quantity: 3,
        status: 'factory',
        statusDate: '2026-02-10'
    });

    const step1 = applyPurchaseStatusTransition(purchase, {
        status: 'received',
        date: '2026-02-15',
        note: 'Arrived'
    });
    assert.equal(step1.didBecomeReceived, true);
    assert.equal(step1.nextPurchase.received, true);
    assert.equal(step1.nextPurchase.statusHistory.length, 2);

    const step2 = applyPurchaseStatusTransition(step1.nextPurchase, {
        status: 'received',
        date: '2026-02-16',
        note: 'Verification update'
    });
    assert.equal(step2.didBecomeReceived, false);
    assert.equal(step2.nextPurchase.received, true);
    assert.equal(step2.nextPurchase.statusHistory.length, 3);
});

test('status history validation rejects out-of-order dates', () => {
    assert.throws(() => {
        validateStatusHistory([
            { status: PURCHASE_STATUSES[0], date: '2026-02-10' },
            { status: PURCHASE_STATUSES[1], date: '2026-02-09' }
        ]);
    }, /chronological/i);
});

test('purchase total cost uses per-unit cost and quantity', () => {
    const purchase = createPurchaseFromProductSnapshot(sampleProduct, {
        quantity: 4,
        status: 'factory',
        statusDate: '2026-02-10'
    });
    assert.equal(getPurchaseTotalCostIQD(purchase), 80000);
});
