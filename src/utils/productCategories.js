const toCleanText = (value) => String(value ?? '').trim();

const toArray = (value) => {
    if (Array.isArray(value)) return value;
    if (value == null) return [];
    return [value];
};

export const normalizeCategoryValues = (value) => {
    const deduped = new Set();

    toArray(value).forEach((entry) => {
        const clean = toCleanText(entry);
        if (clean) deduped.add(clean);
    });

    return Array.from(deduped);
};

export const getProductCategories = (product = {}) => {
    const fromArray = normalizeCategoryValues(product.categories);
    if (fromArray.length > 0) return fromArray;
    return normalizeCategoryValues(product.category);
};

export const getPrimaryCategory = (product = {}, fallback = '') => {
    const categories = getProductCategories(product);
    return categories[0] || fallback;
};

export const productMatchesAnyCategory = (product = {}, selectedCategories = []) => {
    if (!Array.isArray(selectedCategories) || selectedCategories.length === 0) return true;
    const categories = getProductCategories(product);
    return categories.some((category) => selectedCategories.includes(category));
};

export const formatProductCategories = (product = {}, separator = ', ', fallback = 'General') => {
    const categories = getProductCategories(product);
    return categories.length > 0 ? categories.join(separator) : fallback;
};

