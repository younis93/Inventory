import { useEffect, useMemo, useRef, useState } from 'react';
import { dataClient } from '../../data/dataClient';

const isReturnedOrder = (order) => Boolean(order?.returnProcessed || order?.status === 'Returned');
const ORDER_SCHEMA_VERSION = 2;

const toSafeId = (value) => {
    if (!value) return '';
    if (typeof value === 'string') return value.trim();
    if (typeof value === 'number') return String(value);
    return String(value?._id || value?.id || '').trim();
};

const toSafeQty = (value, fallback = 1) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
    return Math.max(1, Math.floor(parsed));
};

const toSafePrice = (value, fallback = 0) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    return parsed;
};

const buildContactKey = (name, phone) =>
    `${String(name || '').trim().toLowerCase()}::${String(phone || '').trim()}`;

const getItemProductId = (item) => toSafeId(item?.productId || item?.product?._id || item?.product?.id);

const buildCustomerLookupMaps = (customers = []) => {
    const byId = new Map();
    const byContact = new Map();

    customers.forEach((customer) => {
        const customerId = toSafeId(customer);
        if (!customerId) return;

        byId.set(customerId, customer);
        const key = buildContactKey(customer?.name, customer?.phone);
        if (key !== '::' && !byContact.has(key)) byContact.set(key, customerId);
    });

    return { byId, byContact };
};

const resolveCustomerId = (order, customerLookupByContact) => {
    const direct = toSafeId(order?.customerId || order?.customer?._id || order?.customer?.id);
    if (direct) return direct;

    const key = buildContactKey(order?.customer?.name, order?.customer?.phone);
    return customerLookupByContact.get(key) || '';
};

const normalizeItemsForStorage = (items = []) =>
    (Array.isArray(items) ? items : [])
        .map((item) => {
            const productId = getItemProductId(item);
            if (!productId) return null;

            return {
                productId,
                quantity: toSafeQty(item?.quantity ?? item?.qty, 1),
                price: toSafePrice(item?.price, 0)
            };
        })
        .filter(Boolean);

const getUniqueProductIds = (items = [], existing = []) => {
    const set = new Set((Array.isArray(existing) ? existing : []).map((entry) => toSafeId(entry)).filter(Boolean));
    items.forEach((item) => {
        const productId = toSafeId(item?.productId);
        if (productId) set.add(productId);
    });
    return Array.from(set);
};

const hydrateOrderForUI = (order, { productMap, customerMap, customerLookupByContact }) => {
    const customerId = resolveCustomerId(order, customerLookupByContact);
    const mappedCustomer = customerId ? customerMap.get(customerId) : null;

    const fallbackCustomer = {
        _id: customerId || toSafeId(order?.customer?._id || order?.customer?.id),
        id: customerId || toSafeId(order?.customer?._id || order?.customer?.id),
        name: order?.customer?.name || '',
        phone: order?.customer?.phone || '',
        governorate: order?.customer?.governorate || '',
        social: order?.customer?.social || '',
        address: order?.customer?.address || '',
        gender: order?.customer?.gender || ''
    };

    const customer = mappedCustomer
        ? { ...fallbackCustomer, ...mappedCustomer, _id: toSafeId(mappedCustomer) || customerId }
        : fallbackCustomer;

    const sourceItems = Array.isArray(order?.items) ? order.items : [];
    const items = sourceItems
        .map((item) => {
            const productId = getItemProductId(item);
            if (!productId) return null;

            const mappedProduct = productMap.get(productId);
            const legacyProduct = item?.product && typeof item.product === 'object' ? item.product : null;

            const fallbackProduct = {
                _id: productId,
                id: productId,
                name: legacyProduct?.name || item?.productName || item?.name || 'Unknown Product',
                sku: legacyProduct?.sku || item?.sku || '',
                category: legacyProduct?.category || item?.category || '',
                images: legacyProduct?.images || []
            };

            const product = mappedProduct
                ? { ...fallbackProduct, ...mappedProduct, _id: toSafeId(mappedProduct) || productId }
                : fallbackProduct;

            const quantity = toSafeQty(item?.quantity ?? item?.qty, 1);
            const price = toSafePrice(item?.price, 0);

            return {
                ...item,
                productId,
                quantity,
                qty: quantity,
                price,
                product
            };
        })
        .filter(Boolean);

    return {
        ...order,
        customerId,
        customer,
        productIds: getUniqueProductIds(items, order?.productIds),
        items
    };
};

const shouldMigrateOrder = (order) => {
    if (!order) return false;
    if (order.schemaVersion !== ORDER_SCHEMA_VERSION) return true;

    const sourceItems = Array.isArray(order?.items) ? order.items : [];
    const hasEmbeddedCustomer = Boolean(order?.customer && typeof order.customer === 'object' && Object.keys(order.customer).length > 0);
    const hasEmbeddedProducts = sourceItems.some((item) => Boolean(item?.product && typeof item.product === 'object'));
    const hasMissingCustomerId = !toSafeId(order?.customerId);
    const hasMissingProductIds = !Array.isArray(order?.productIds);
    const hasMissingItemProductRef = sourceItems.some((item) => !toSafeId(item?.productId));

    return hasEmbeddedCustomer || hasEmbeddedProducts || hasMissingCustomerId || hasMissingProductIds || hasMissingItemProductRef;
};

export const useOrdersDomain = ({
    enabled,
    addToast,
    currentUser,
    products,
    customers,
    updateProductStock,
    getStockStatus
}) => {
    const [rawOrders, setRawOrders] = useState([]);
    const [loading, setLoading] = useState(false);
    const migrationInFlightRef = useRef(new Set());
    const migrationWarningShownRef = useRef(false);

    const productMap = useMemo(() => {
        const map = new Map();
        (products || []).forEach((product) => {
            const productId = toSafeId(product);
            if (productId) map.set(productId, product);
        });
        return map;
    }, [products]);

    const { byId: customerMap, byContact: customerLookupByContact } = useMemo(
        () => buildCustomerLookupMaps(customers || []),
        [customers]
    );

    const orders = useMemo(
        () =>
            rawOrders.map((order) =>
                hydrateOrderForUI(order, {
                    productMap,
                    customerMap,
                    customerLookupByContact
                })
            ),
        [rawOrders, productMap, customerMap, customerLookupByContact]
    );

    useEffect(() => {
        if (!enabled) return undefined;

        setLoading(true);
        const unsubscribe = dataClient.subscribeToCollection(
            'orders',
            (data) => {
                setRawOrders(data);
                setLoading(false);
            },
            'date',
            'desc',
            (error) => {
                console.error('Error loading orders:', error);
                setLoading(false);
                addToast?.('Error loading orders. Refresh page.', 'error');
            }
        );

        return () => unsubscribe?.();
    }, [enabled, addToast]);

    useEffect(() => {
        if (!enabled || rawOrders.length === 0) return;

        const migrateLegacyOrders = async () => {
            for (const order of rawOrders) {
                const orderDocId = toSafeId(order?._id || order?.id);
                if (!orderDocId || migrationInFlightRef.current.has(orderDocId) || !shouldMigrateOrder(order)) continue;

                const customerId = resolveCustomerId(order, customerLookupByContact);
                const hasLegacyCustomerObject = Boolean(order?.customer && typeof order.customer === 'object');
                if (!customerId && hasLegacyCustomerObject && (customers || []).length === 0) continue;

                const normalizedItems = normalizeItemsForStorage(order?.items);
                const normalizedProductIds = getUniqueProductIds(normalizedItems, order?.productIds);

                migrationInFlightRef.current.add(orderDocId);
                try {
                    await dataClient.update('orders', orderDocId, {
                        customerId,
                        customer: null,
                        items: normalizedItems,
                        productIds: normalizedProductIds,
                        schemaVersion: ORDER_SCHEMA_VERSION,
                        updatedAt: new Date().toISOString()
                    });
                } catch (error) {
                    console.error(`Failed to migrate order ${orderDocId}:`, error);
                    migrationInFlightRef.current.delete(orderDocId);
                    if (!migrationWarningShownRef.current) {
                        migrationWarningShownRef.current = true;
                        addToast?.('Some orders could not be normalized automatically.', 'warning');
                    }
                }
            }
        };

        void migrateLegacyOrders();
    }, [enabled, rawOrders, customers, customerLookupByContact, addToast]);

    const normalizeOrderPayload = (orderPayload) => {
        const customerId = resolveCustomerId(orderPayload, customerLookupByContact);
        const normalizedItems = normalizeItemsForStorage(orderPayload?.items);
        const normalizedProductIds = getUniqueProductIds(normalizedItems, orderPayload?.productIds);

        return {
            ...orderPayload,
            customerId,
            customer: null,
            items: normalizedItems,
            productIds: normalizedProductIds,
            schemaVersion: ORDER_SCHEMA_VERSION
        };
    };

    const addOrder = async (newOrder) => {
        try {
            const orderId = `#ORD-${Math.floor(1000 + Math.random() * 9000)}`;
            const payload = normalizeOrderPayload({
                ...newOrder,
                orderId,
                date: new Date().toISOString(),
                createdBy: currentUser?.displayName || currentUser?.username || 'System'
            });

            const addedOrder = await dataClient.add('orders', payload);

            for (const item of payload.items || []) {
                const productId = toSafeId(item?.productId);
                const product = products.find((entry) => toSafeId(entry) === productId);
                if (!productId || !product) continue;

                const nextStock = Math.max(0, Number(product.stock || 0) - Number(item.quantity || 0));
                if (updateProductStock) await updateProductStock(productId, nextStock);
                else {
                    await dataClient.update('products', productId, {
                        stock: nextStock,
                        status: getStockStatus
                            ? getStockStatus(nextStock)
                            : (nextStock <= 0 ? 'Out of Stock' : nextStock <= 10 ? 'Low Stock' : 'In Stock')
                    });
                }
            }

            addToast?.('Order created successfully', 'success');
            return hydrateOrderForUI(
                { ...payload, ...addedOrder },
                { productMap, customerMap, customerLookupByContact }
            );
        } catch (error) {
            console.error(error);
            addToast?.('Error creating order', 'error');
            return null;
        }
    };

    const updateOrder = async (updatedOrder) => {
        const { _id, ...data } = updatedOrder;
        const oldOrder = orders.find((order) => order._id === _id);

        try {
            if (oldOrder && updatedOrder.status === 'Returned' && !isReturnedOrder(oldOrder)) {
                await dataClient.returnOrderWithStock(_id, {
                    reason: updatedOrder.returnReason || '',
                    date: updatedOrder.returnDate || new Date().toISOString().slice(0, 10),
                    returnedBy: currentUser?.displayName || currentUser?.username || 'System'
                });
                addToast?.('Order returned and stock restored', 'success');
                return;
            }

            const normalizedData = normalizeOrderPayload(data);

            if (oldOrder && isReturnedOrder(oldOrder)) {
                await dataClient.update('orders', _id, normalizedData);
                addToast?.('Order updated successfully', 'success');
                return;
            }

            if (oldOrder) {
                for (const item of oldOrder.items || []) {
                    const productId = toSafeId(item?.productId);
                    const product = products.find((entry) => toSafeId(entry) === productId);
                    if (!productId || !product) continue;
                    const restored = Number(product.stock || 0) + Number(item.quantity || 0);
                    if (updateProductStock) await updateProductStock(productId, restored);
                    else await dataClient.update('products', productId, { stock: restored });
                }

                for (const item of normalizedData.items || []) {
                    const productId = toSafeId(item?.productId);
                    const product = products.find((entry) => toSafeId(entry) === productId);
                    if (!productId || !product) continue;
                    const oldItem = oldOrder.items?.find((entry) => toSafeId(entry?.productId) === productId);
                    const oldQty = Number(oldItem?.quantity || 0);
                    const nextStock = Math.max(0, Number(product.stock || 0) + oldQty - Number(item.quantity || 0));
                    if (updateProductStock) await updateProductStock(productId, nextStock);
                    else await dataClient.update('products', productId, { stock: nextStock });
                }
            }

            await dataClient.update('orders', _id, normalizedData);
            addToast?.('Order updated successfully', 'success');
        } catch (error) {
            console.error(error);
            addToast?.('Error updating order', 'error');
        }
    };

    const returnOrder = async (orderId, { reason = '', date = '' } = {}) => {
        try {
            const order = orders.find((entry) => entry._id === orderId);
            if (!order) throw new Error('Order not found');

            if (isReturnedOrder(order)) {
                addToast?.('Order is already returned.', 'info');
                return { alreadyReturned: true };
            }

            const result = await dataClient.returnOrderWithStock(orderId, {
                reason,
                date: date || new Date().toISOString().slice(0, 10),
                returnedBy: currentUser?.displayName || currentUser?.username || 'System'
            });

            if (result?.alreadyReturned) {
                addToast?.('Order is already returned.', 'info');
                return { alreadyReturned: true };
            }

            addToast?.('Order returned and stock restored', 'success');
            return { alreadyReturned: false };
        } catch (error) {
            console.error(error);
            addToast?.('Error returning order', 'error');
            throw error;
        }
    };

    const deleteOrder = async (id) => {
        try {
            const order = orders.find((entry) => entry._id === id);
            const shouldRestoreStock = order && !isReturnedOrder(order);
            if (shouldRestoreStock) {
                for (const item of order.items || []) {
                    const productId = toSafeId(item?.productId);
                    const product = products.find((entry) => toSafeId(entry) === productId);
                    if (!productId || !product) continue;
                    const restored = Number(product.stock || 0) + Number(item.quantity || 0);
                    if (updateProductStock) await updateProductStock(productId, restored);
                    else {
                        await dataClient.update('products', productId, {
                            stock: restored,
                            status: getStockStatus
                                ? getStockStatus(restored)
                                : (restored <= 0 ? 'Out of Stock' : restored <= 10 ? 'Low Stock' : 'In Stock')
                        });
                    }
                }
            }

            await dataClient.delete('orders', id);
            addToast?.(shouldRestoreStock ? 'Order deleted and stock restored' : 'Order deleted successfully', 'info');
        } catch (error) {
            console.error(error);
            addToast?.('Error deleting order', 'error');
        }
    };

    return useMemo(
        () => ({
            orders,
            loading,
            addOrder,
            updateOrder,
            deleteOrder,
            returnOrder
        }),
        [orders, loading, currentUser, products, customers]
    );
};
