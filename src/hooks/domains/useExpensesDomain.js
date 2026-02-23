import { useEffect, useMemo, useState } from 'react';
import { dataClient } from '../../data/dataClient';

export const useExpensesDomain = ({ enabled, addToast, currentUser }) => {
    const [expenses, setExpenses] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!enabled) return undefined;

        setLoading(true);
        const unsubscribe = dataClient.subscribeToCollection(
            'expenses',
            (data) => {
                setExpenses(data);
                setLoading(false);
            },
            'date',
            'desc',
            (error) => {
                console.error('Error loading expenses:', error);
                setLoading(false);
                addToast?.('Error loading expenses. Refresh page.', 'error');
            }
        );

        return () => unsubscribe?.();
    }, [enabled, addToast]);

    const addExpense = async (newExpense) => {
        try {
            const payload = {
                ...newExpense,
                amountIQD: Number(newExpense.amountIQD || 0),
                createdAt: newExpense.createdAt || new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                createdBy: currentUser?.displayName || currentUser?.username || 'System'
            };
            const result = await dataClient.add('expenses', payload);
            addToast?.('Expense added successfully', 'success');
            return result;
        } catch (error) {
            console.error(error);
            addToast?.('Error adding expense', 'error');
            return null;
        }
    };

    const updateExpense = async (updatedExpense) => {
        const { _id, ...data } = updatedExpense;
        try {
            await dataClient.update('expenses', _id, {
                ...data,
                amountIQD: Number(data.amountIQD || 0),
                updatedAt: new Date().toISOString()
            });
            addToast?.('Expense updated successfully', 'success');
        } catch (error) {
            console.error(error);
            addToast?.('Error updating expense', 'error');
        }
    };

    const deleteExpense = async (id) => {
        try {
            await dataClient.delete('expenses', id);
            addToast?.('Expense deleted successfully', 'success');
        } catch (error) {
            console.error(error);
            addToast?.('Error deleting expense', 'error');
        }
    };

    return useMemo(() => ({
        expenses,
        loading,
        addExpense,
        updateExpense,
        deleteExpense
    }), [expenses, loading, currentUser]);
};
