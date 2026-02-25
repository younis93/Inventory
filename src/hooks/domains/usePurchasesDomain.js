import { useEffect, useMemo, useState } from 'react';
import { dataClient } from '../../data/dataClient';
import {
    PURCHASE_STATUSES,
    applyPurchaseStatusTransition,
    buildAlibabaInfoSnapshot,
    buildBasicInfoSnapshot,
    buildPricingSnapshot,
    createPurchaseFromProductSnapshot,
    getLastStatusEntry,
    normalizeManualDate,
    normalizePurchaseQuantity,
    validatePurchasePayload
} from './purchaseUtils';

const MANAGE_ROLES = new Set(['Admin', 'Manager']);

const sanitizeText = (value) => String(value || '').trim();

export const usePurchasesDomain = ({
    enabled,
    addToast,
    currentUser,
    products = [],
    addProduct,
    updateProductStock,
    getStockStatus
}) => {
    const [purchases, setPurchases] = useState([]);
    const [loading, setLoading] = useState(false);

    const canManagePurchases = MANAGE_ROLES.has(currentUser?.role || '');

    useEffect(() => {
        if (!enabled) return undefined;

        setLoading(true);
        const unsubscribe = dataClient.subscribeToCollection(
            'purchases',
            (data) => {
                setPurchases(data);
                setLoading(false);
            },
            'updatedAt',
            'desc',
            (error) => {
                console.error('Error loading purchases:', error);
                setLoading(false);
                addToast?.('Error loading purchases. Refresh page.', 'error');
            }
        );

        return () => unsubscribe?.();
    }, [enabled, addToast]);

    const assertCanManage = () => {
        if (!canManagePurchases) {
            throw new Error('Only Admin and Manager can manage purchases.');
        }
    };

    const findProductById = (productId) =>
        products.find((product) => product._id === productId || product.id === productId) || null;

    const applyStockIncrement = async (productId, quantity) => {
        const product = findProductById(productId);
        if (!product) {
            throw new Error('Linked product not found for stock update.');
        }

        const currentStock = Number(product.stock || 0);
        const delta = normalizePurchaseQuantity(quantity);
        const nextStock = currentStock + delta;

        if (updateProductStock) {
            await updateProductStock(productId, nextStock);
            return;
        }

        await dataClient.update('products', productId, {
            stock: nextStock,
            status: getStockStatus ? getStockStatus(nextStock) : (nextStock <= 0 ? 'Out of Stock' : nextStock <= 10 ? 'Low Stock' : 'In Stock'),
            updatedAt: new Date().toISOString()
        });
    };

    const buildMergedSnapshots = (product, payload) => {
        const mergedProductForBasic = { ...product, ...(payload?.basicInfo || {}) };
        const mergedProductForAlibaba = { ...product, ...(payload?.alibabaInfo || {}) };
        const mergedProductForPricing = { ...product, ...(payload?.pricing || {}) };

        return {
            basicInfo: buildBasicInfoSnapshot(mergedProductForBasic),
            alibabaInfo: buildAlibabaInfoSnapshot(mergedProductForAlibaba),
            pricing: buildPricingSnapshot(mergedProductForPricing)
        };
    };

    const createInitialPurchaseForProduct = async (
        product,
        {
            quantity,
            status = 'received',
            statusDate = new Date().toISOString().slice(0, 10),
            statusNote = '',
            notes = '',
            skipStockAdjustment = true,
            silent = true
        } = {}
    ) => {
        const linkedProduct = product && (product._id || product.id)
            ? product
            : findProductById(product?._id || product?.id || product);

        if (!linkedProduct) {
            throw new Error('Cannot create initial purchase: product not found.');
        }

        const normalizedDate = normalizeManualDate(statusDate, 'Initial purchase date');
        const payload = createPurchaseFromProductSnapshot(linkedProduct, {
            quantity: quantity == null ? linkedProduct.stock : quantity,
            status,
            statusDate: normalizedDate,
            statusNote,
            notes,
            received: status === 'received'
        });

        payload.createdBy = currentUser?.displayName || currentUser?.username || 'System';
        const validated = validatePurchasePayload(payload, { requireProductId: true });
        const createdPurchase = await dataClient.add('purchases', validated);

        if (validated.received && !skipStockAdjustment) {
            await applyStockIncrement(validated.productId, validated.quantity);
        }

        if (!silent) {
            addToast?.('Initial purchase record created.', 'success');
        }

        return createdPurchase;
    };

    const createProductFromPurchasePayload = async (payload) => {
        if (typeof addProduct !== 'function') {
            throw new Error('Product creation is not available.');
        }

        const productDraft = payload?.newProduct || {};
        const createdProduct = await addProduct({
            ...productDraft,
            stock: 0,
            status: 'Out of Stock'
        }, { silent: true });

        if (!createdProduct?._id) {
            throw new Error('Failed to create product for purchase.');
        }

        return createdProduct;
    };

    const addPurchase = async (purchaseInput, options = {}) => {
        assertCanManage();

        const mode = purchaseInput?.productMode === 'new' ? 'new' : 'existing';
        const linkedProduct = mode === 'new'
            ? await createProductFromPurchasePayload(purchaseInput)
            : findProductById(purchaseInput?.productId);

        if (!linkedProduct) {
            throw new Error('Please select a valid product.');
        }

        const quantity = normalizePurchaseQuantity(purchaseInput?.quantity);
        const status = purchaseInput?.status || PURCHASE_STATUSES[0];
        const statusDate = normalizeManualDate(
            purchaseInput?.initialStatusDate || purchaseInput?.statusDate || purchaseInput?.date || new Date(),
            'Status date'
        );

        const basePurchase = createPurchaseFromProductSnapshot(linkedProduct, {
            quantity,
            status,
            statusDate,
            statusNote: purchaseInput?.statusNote || '',
            notes: purchaseInput?.notes || '',
            received: status === 'received'
        });

        const snapshots = buildMergedSnapshots(linkedProduct, purchaseInput);
        const payload = {
            ...basePurchase,
            ...snapshots,
            createdBy: currentUser?.displayName || currentUser?.username || 'System',
            notes: sanitizeText(purchaseInput?.notes)
        };

        const validated = validatePurchasePayload(payload, { requireProductId: true });
        const createdPurchase = await dataClient.add('purchases', validated);

        if (validated.received && !options.skipStockAdjustment) {
            await applyStockIncrement(validated.productId, validated.quantity);
        }

        if (!options.silent) {
            addToast?.('Purchase created successfully.', 'success');
        }

        return createdPurchase;
    };

    const updatePurchase = async (purchaseInput, options = {}) => {
        assertCanManage();

        const purchaseId = purchaseInput?._id;
        if (!purchaseId) throw new Error('Purchase ID is required.');

        const existing = purchases.find((entry) => entry._id === purchaseId);
        if (!existing) throw new Error('Purchase not found.');

        const linkedProduct = findProductById(purchaseInput.productId || existing.productId);
        if (!linkedProduct) throw new Error('Linked product not found.');

        const quantity = normalizePurchaseQuantity(
            purchaseInput.quantity == null ? existing.quantity : purchaseInput.quantity
        );

        const snapshots = buildMergedSnapshots(linkedProduct, {
            basicInfo: purchaseInput.basicInfo || existing.basicInfo,
            alibabaInfo: purchaseInput.alibabaInfo || existing.alibabaInfo,
            pricing: purchaseInput.pricing || existing.pricing
        });

        const merged = {
            ...existing,
            ...purchaseInput,
            ...snapshots,
            productId: linkedProduct._id,
            quantity,
            notes: sanitizeText(purchaseInput?.notes ?? existing?.notes),
            received: Boolean(existing.received || purchaseInput.received || purchaseInput.status === 'received'),
            updatedAt: new Date().toISOString()
        };

        const {
            productMode: _productMode,
            newProduct: _newProduct,
            initialStatusDate: _initialStatusDate,
            statusDate: _statusDate,
            statusNote: _statusNote,
            supplier: _supplier,
            ...sanitizedMerged
        } = merged;

        const validated = validatePurchasePayload(sanitizedMerged, { requireProductId: true });
        await dataClient.update('purchases', purchaseId, validated);

        if (!existing.received && validated.received && !options.skipStockAdjustment) {
            await applyStockIncrement(validated.productId, validated.quantity);
        }

        if (!options.silent) {
            addToast?.('Purchase updated successfully.', 'success');
        }
    };

    const updatePurchaseStatus = async (purchaseId, statusUpdate, options = {}) => {
        assertCanManage();

        const purchase = purchases.find((entry) => entry._id === purchaseId);
        if (!purchase) throw new Error('Purchase not found.');

        const transitionDate = normalizeManualDate(statusUpdate?.date, 'Status date');
        const { nextPurchase, didBecomeReceived } = applyPurchaseStatusTransition(purchase, {
            status: statusUpdate?.status,
            date: transitionDate,
            note: statusUpdate?.note
        });

        const validated = validatePurchasePayload(nextPurchase, { requireProductId: true });
        await dataClient.update('purchases', purchaseId, validated);

        if (didBecomeReceived && !options.skipStockAdjustment) {
            await applyStockIncrement(validated.productId, validated.quantity);
        }

        if (!options.silent) {
            addToast?.('Purchase status updated.', 'success');
        }

        return validated;
    };

    const deletePurchase = async (id, options = {}) => {
        assertCanManage();
        await dataClient.delete('purchases', id);
        if (!options.silent) {
            addToast?.('Purchase deleted successfully.', 'success');
        }
    };

    const getPurchasesByProduct = (productId) =>
        purchases.filter((purchase) => purchase.productId === productId);

    return useMemo(() => ({
        purchases,
        loading,
        purchaseStatuses: PURCHASE_STATUSES,
        canManagePurchases,
        addPurchase,
        updatePurchase,
        updatePurchaseStatus,
        deletePurchase,
        createInitialPurchaseForProduct,
        getPurchasesByProduct,
        getLastStatusEntry
    }), [purchases, loading, canManagePurchases, products, currentUser]);
};
