import { useEffect, useMemo, useState } from 'react';
import { dataClient } from '../../data/dataClient';

const isValidUrl = (value) => {
    if (!value) return true;
    try {
        const url = new URL(value);
        return ['http:', 'https:'].includes(url.protocol);
    } catch {
        return false;
    }
};

const validatePurchaseInput = (purchase) => {
    if (!purchase?.date) throw new Error('Purchase date is required.');
    if (!String(purchase?.type || '').trim()) throw new Error('Purchase type is required.');

    const amount = Number(purchase?.amountIQD);
    if (!Number.isFinite(amount) || amount <= 0) {
        throw new Error('Purchase amount must be greater than 0.');
    }
    if (amount > 1000000000) {
        throw new Error('Purchase amount is too large.');
    }

    if (!isValidUrl(String(purchase?.link || '').trim())) {
        throw new Error('Purchase link must be a valid URL (http/https).');
    }
};

export const usePurchasesDomain = ({ enabled, addToast, currentUser }) => {
    const [purchases, setPurchases] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!enabled) return undefined;

        setLoading(true);
        const unsubscribe = dataClient.subscribeToCollection(
            'purchases',
            (data) => {
                setPurchases(data);
                setLoading(false);
            },
            'date',
            'desc',
            (error) => {
                console.error('Error loading purchases:', error);
                setLoading(false);
                addToast?.('Error loading purchases. Refresh page.', 'error');
            }
        );

        return () => unsubscribe?.();
    }, [enabled, addToast]);

    const addPurchase = async (purchase) => {
        validatePurchaseInput(purchase);
        const payload = {
            ...purchase,
            amountIQD: Number(purchase.amountIQD || 0),
            createdAt: purchase.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            createdBy: currentUser?.displayName || currentUser?.username || 'System'
        };
        const result = await dataClient.add('purchases', payload);
        addToast?.('Purchase added successfully', 'success');
        return result;
    };

    const updatePurchase = async (purchase) => {
        validatePurchaseInput(purchase);
        const { _id, ...data } = purchase;
        await dataClient.update('purchases', _id, {
            ...data,
            amountIQD: Number(data.amountIQD || 0),
            updatedAt: new Date().toISOString()
        });
        addToast?.('Purchase updated successfully', 'success');
    };

    const deletePurchase = async (id) => {
        await dataClient.delete('purchases', id);
        addToast?.('Purchase deleted successfully', 'success');
    };

    return useMemo(() => ({
        purchases,
        loading,
        addPurchase,
        updatePurchase,
        deletePurchase
    }), [purchases, loading, currentUser]);
};
