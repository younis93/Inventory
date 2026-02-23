import { useEffect, useMemo, useState } from 'react';
import { dataClient } from '../../data/dataClient';

export const useOrdersDomain = ({
    enabled,
    addToast,
    currentUser,
    products,
    updateProductStock,
    getStockStatus
}) => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!enabled) return undefined;

        setLoading(true);
        const unsubscribe = dataClient.subscribeToCollection(
            'orders',
            (data) => {
                setOrders(data);
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

    const addOrder = async (newOrder) => {
        try {
            const orderId = `#ORD-${Math.floor(1000 + Math.random() * 9000)}`;
            const payload = {
                ...newOrder,
                orderId,
                date: new Date().toISOString(),
                createdBy: currentUser?.displayName || currentUser?.username || 'System'
            };

            const addedOrder = await dataClient.add('orders', payload);

            for (const item of newOrder.items || []) {
                const product = products.find((entry) => entry._id === item.product._id);
                if (product) {
                    const nextStock = Math.max(0, Number(product.stock || 0) - Number(item.quantity || 0));
                    if (updateProductStock) await updateProductStock(product._id, nextStock);
                    else {
                        await dataClient.update('products', product._id, {
                            stock: nextStock,
                            status: getStockStatus ? getStockStatus(nextStock) : (nextStock <= 0 ? 'Out of Stock' : nextStock <= 10 ? 'Low Stock' : 'In Stock')
                        });
                    }
                }
            }

            addToast?.('Order created successfully', 'success');
            return addedOrder;
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
            if (oldOrder) {
                for (const item of oldOrder.items || []) {
                    const product = products.find((entry) => entry._id === item.product._id);
                    if (!product) continue;
                    const restored = Number(product.stock || 0) + Number(item.quantity || 0);
                    if (updateProductStock) await updateProductStock(product._id, restored);
                    else await dataClient.update('products', product._id, { stock: restored });
                }

                for (const item of updatedOrder.items || []) {
                    const product = products.find((entry) => entry._id === item.product._id);
                    if (!product) continue;
                    const oldItem = oldOrder.items?.find((entry) => entry.product._id === item.product._id);
                    const oldQty = Number(oldItem?.quantity || 0);
                    const nextStock = Math.max(0, Number(product.stock || 0) + oldQty - Number(item.quantity || 0));
                    if (updateProductStock) await updateProductStock(product._id, nextStock);
                    else await dataClient.update('products', product._id, { stock: nextStock });
                }
            }

            await dataClient.update('orders', _id, data);
            addToast?.('Order updated successfully', 'success');
        } catch (error) {
            console.error(error);
            addToast?.('Error updating order', 'error');
        }
    };

    const deleteOrder = async (id) => {
        try {
            const order = orders.find((entry) => entry._id === id);
            if (order) {
                for (const item of order.items || []) {
                    const product = products.find((entry) => entry._id === item.product._id);
                    if (!product) continue;
                    const restored = Number(product.stock || 0) + Number(item.quantity || 0);
                    if (updateProductStock) await updateProductStock(product._id, restored);
                    else {
                        await dataClient.update('products', product._id, {
                            stock: restored,
                            status: getStockStatus ? getStockStatus(restored) : (restored <= 0 ? 'Out of Stock' : restored <= 10 ? 'Low Stock' : 'In Stock')
                        });
                    }
                }
            }

            await dataClient.delete('orders', id);
            addToast?.('Order deleted and stock restored', 'info');
        } catch (error) {
            console.error(error);
            addToast?.('Error deleting order', 'error');
        }
    };

    return useMemo(() => ({
        orders,
        loading,
        addOrder,
        updateOrder,
        deleteOrder
    }), [orders, loading, currentUser, products]);
};
