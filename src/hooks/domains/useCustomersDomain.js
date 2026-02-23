import { useEffect, useMemo, useState } from 'react';
import { dataClient } from '../../data/dataClient';

export const useCustomersDomain = ({ enabled, addToast, currentUser }) => {
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!enabled) return undefined;

        setLoading(true);
        const unsubscribe = dataClient.subscribeToCollection(
            'customers',
            (data) => {
                setCustomers(data);
                setLoading(false);
            },
            'name',
            'asc',
            (error) => {
                console.error('Error loading customers:', error);
                setLoading(false);
                addToast?.('Error loading customers. Refresh page.', 'error');
            }
        );

        return () => unsubscribe?.();
    }, [enabled, addToast]);

    const addCustomer = async (newCustomer) => {
        const payload = {
            ...newCustomer,
            createdOn: new Date().toISOString(),
            createdBy: currentUser?.displayName || currentUser?.username || 'System'
        };
        const result = await dataClient.add('customers', payload);
        addToast?.('Customer added successfully', 'success');
        return result;
    };

    const updateCustomer = async (updatedCustomer) => {
        const { _id, ...data } = updatedCustomer;
        await dataClient.update('customers', _id, data);
    };

    return useMemo(() => ({
        customers,
        loading,
        addCustomer,
        updateCustomer
    }), [customers, loading, currentUser]);
};
