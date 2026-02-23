import { useEffect, useMemo, useState } from 'react';
import { dataClient } from '../../data/dataClient';

const getStockStatus = (stock) => {
    const value = Number(stock || 0);
    if (value <= 0) return 'Out of Stock';
    if (value <= 10) return 'Low Stock';
    return 'In Stock';
};

export const useProductsDomain = ({ enabled, addToast, currentUser }) => {
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState(['Electronics', 'Clothing', 'Home', 'Beauty', 'Sports']);
    const [categoryObjects, setCategoryObjects] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!enabled) return undefined;

        setLoading(true);
        let loadedProducts = false;
        let loadedCategories = false;

        const maybeDone = () => {
            if (loadedProducts && loadedCategories) setLoading(false);
        };

        const unsubProducts = dataClient.subscribeToCollection(
            'products',
            (data) => {
                setProducts(data);
                loadedProducts = true;
                maybeDone();
            },
            'name',
            'asc',
            (error) => {
                console.error('Error loading products:', error);
                loadedProducts = true;
                maybeDone();
                addToast?.('Error loading products. Refresh page.', 'error');
            }
        );

        const unsubCategories = dataClient.subscribeToCollection(
            'categories',
            (data) => {
                setCategoryObjects(data);
                setCategories(data.length > 0 ? data.map((item) => item.name).sort() : []);
                loadedCategories = true;
                maybeDone();
            },
            'name',
            'asc',
            (error) => {
                console.error('Error loading categories:', error);
                loadedCategories = true;
                maybeDone();
                addToast?.('Error loading categories. Refresh page.', 'error');
            }
        );

        return () => {
            unsubProducts?.();
            unsubCategories?.();
        };
    }, [enabled, addToast]);

    const updateProductStock = async (productId, stock) => {
        const value = Math.max(0, Number(stock || 0));
        await dataClient.update('products', productId, {
            stock: value,
            status: getStockStatus(value)
        });
    };

    const addProduct = async (newProduct) => {
        try {
            const payload = {
                ...newProduct,
                createdBy: currentUser?.displayName || currentUser?.username || 'System'
            };
            const result = await dataClient.add('products', payload);
            addToast?.('Product added successfully', 'success');
            return result;
        } catch (error) {
            console.error(error);
            addToast?.('Error adding product', 'error');
            return null;
        }
    };

    const updateProduct = async (updatedProduct) => {
        const { _id, ...data } = updatedProduct;
        try {
            await dataClient.update('products', _id, data);
            addToast?.('Product updated successfully', 'success');
        } catch (error) {
            console.error(error);
            addToast?.('Error updating product', 'error');
        }
    };

    const deleteProduct = async (id) => {
        try {
            await dataClient.delete('products', id);
            addToast?.('Product deleted successfully', 'success');
        } catch (error) {
            console.error(error);
            addToast?.('Error deleting product', 'error');
        }
    };

    const addCategory = async (name) => {
        const value = String(name || '').trim();
        if (!value || categories.includes(value)) return;
        await dataClient.add('categories', { name: value });
        addToast?.(`Category "${value}" added!`, 'success');
    };

    const updateCategory = async (oldName, newName) => {
        const next = String(newName || '').trim();
        const category = categoryObjects.find((item) => item.name === oldName);
        if (!category || !next) return;

        await dataClient.update('categories', category._id, { name: next });
        const productsToUpdate = products.filter((product) => product.category === oldName);
        await Promise.all(productsToUpdate.map((product) => dataClient.update('products', product._id, { category: next })));
        addToast?.(`Category updated to "${next}"`, 'success');
    };

    const deleteCategory = async (name) => {
        const category = categoryObjects.find((item) => item.name === name);
        if (!category) return;
        await dataClient.delete('categories', category._id);
        addToast?.(`Category "${name}" deleted!`, 'success');
    };

    const api = useMemo(() => ({
        products,
        categories,
        loading,
        addProduct,
        updateProduct,
        deleteProduct,
        addCategory,
        updateCategory,
        deleteCategory,
        updateProductStock,
        getStockStatus
    }), [products, categories, loading, currentUser]);

    return api;
};
