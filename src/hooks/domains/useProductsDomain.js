import { useEffect, useMemo, useState } from 'react';
import { dataClient } from '../../data/dataClient';

const getStockStatus = (stock) => {
    const value = Number(stock || 0);
    if (value <= 0) return 'Out of Stock';
    if (value <= 10) return 'Low Stock';
    return 'In Stock';
};

const toFiniteNumber = (value, fallback = 0) => {
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
};

const toNonNegativeInt = (value, fallback = 0) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.max(0, Math.floor(parsed));
};

const toOptionalText = (value) => {
    if (value == null) return '';
    return String(value).trim();
};

const normalizeProductPayload = (payload = {}, { isUpdate = false } = {}) => {
    const stock = toNonNegativeInt(payload.stock, 0);
    const now = new Date().toISOString();

    const normalized = {
        ...payload,
        name: toOptionalText(payload.name),
        sku: toOptionalText(payload.sku),
        category: toOptionalText(payload.category),
        description: toOptionalText(payload.description),
        images: Array.isArray(payload.images) ? payload.images : [],
        stock,
        status: getStockStatus(stock),
        // Pricing fields
        unitPriceUSD: toFiniteNumber(payload.unitPriceUSD, 0),
        alibabaFeeUSD: toFiniteNumber(payload.alibabaFeeUSD, 0),
        exchangeRate: toFiniteNumber(payload.exchangeRate, 0),
        shippingToIraqIQD: toFiniteNumber(payload.shippingToIraqIQD, 0),
        additionalFeesIQD: toFiniteNumber(payload.additionalFeesIQD, 0),
        marginPercent: toFiniteNumber(payload.marginPercent, 0),
        sellingPriceIQD: toFiniteNumber(payload.sellingPriceIQD ?? payload.price, 0),
        costPriceIQD_total: toFiniteNumber(payload.costPriceIQD_total, 0),
        costPriceIQD_perUnit: toFiniteNumber(payload.costPriceIQD_perUnit, 0),
        recommendedSellingPriceIQD_perUnit: toFiniteNumber(payload.recommendedSellingPriceIQD_perUnit, 0),
        profitPerUnitIQD: toFiniteNumber(payload.profitPerUnitIQD, 0),
        unitsSold: toNonNegativeInt(payload.unitsSold, 0),
        // Keep legacy fields in sync
        unitPrice: toFiniteNumber(payload.unitPrice ?? payload.unitPriceUSD, 0),
        price: toFiniteNumber(payload.price ?? payload.sellingPriceIQD, 0),
        // Alibaba fields
        alibabaProductLink: toOptionalText(payload.alibabaProductLink),
        alibabaMessageLink: toOptionalText(payload.alibabaMessageLink),
        alibabaOrderLink: toOptionalText(payload.alibabaOrderLink),
        alibabaOrderNumber: toOptionalText(payload.alibabaOrderNumber),
        alibabaNote: toOptionalText(payload.alibabaNote),
        createdAt: isUpdate ? (payload.createdAt || now) : now,
        updatedAt: now
    };

    return normalized;
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
            status: getStockStatus(value),
            updatedAt: new Date().toISOString()
        });
    };

    const addProduct = async (newProduct, options = {}) => {
        try {
            const normalizedProduct = normalizeProductPayload(newProduct, { isUpdate: false });
            const payload = {
                ...normalizedProduct,
                createdBy: currentUser?.displayName || currentUser?.username || 'System'
            };
            const result = await dataClient.add('products', payload);
            if (!options.silent) {
                addToast?.('Product added successfully', 'success');
            }
            return result;
        } catch (error) {
            console.error(error);
            if (!options.silent) {
                addToast?.('Error adding product', 'error');
            }
            return null;
        }
    };

    const updateProduct = async (updatedProduct, options = {}) => {
        const { _id, ...data } = updatedProduct;
        try {
            const normalizedProduct = normalizeProductPayload(data, { isUpdate: true });
            await dataClient.update('products', _id, normalizedProduct);
            if (!options.silent) {
                addToast?.('Product updated successfully', 'success');
            }
        } catch (error) {
            console.error(error);
            if (!options.silent) {
                addToast?.('Error updating product', 'error');
            }
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
