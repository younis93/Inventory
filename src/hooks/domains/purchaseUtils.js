export const PURCHASE_STATUSES = [
    'ordered',
    'factory',
    'chinaWarehouse',
    'shippingToIraq',
    'received'
];

const STATUS_ALIASES = {
    toBeOrdered: 'ordered'
};

const STATUS_ORDER = new Map(PURCHASE_STATUSES.map((status, index) => [status, index]));

const PRICING_FIELDS = [
    'unitPriceUSD',
    'alibabaFeeUSD',
    'exchangeRate',
    'shippingToIraqIQD',
    'additionalFeesIQD',
    'marginPercent',
    'sellingPriceIQD',
    'costPriceIQD_total',
    'costPriceIQD_perUnit',
    'recommendedSellingPriceIQD_perUnit',
    'profitPerUnitIQD',
    'unitsSold'
];

const ALIBABA_FIELDS = [
    'alibabaProductLink',
    'alibabaMessageLink',
    'alibabaOrderLink',
    'alibabaOrderNumber',
    'alibabaNote'
];

const BASIC_INFO_FIELDS = ['name', 'sku', 'category', 'description'];

const numericFields = new Set(PRICING_FIELDS);

const toFiniteNumber = (value, fallback = 0) => {
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
};

const toIsoDateOnly = (value) => {
    if (!value) return '';

    if (value instanceof Date && !Number.isNaN(value.getTime())) {
        return value.toISOString().slice(0, 10);
    }

    const raw = String(value).trim();
    if (!raw) return '';

    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
        return raw;
    }

    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) return '';
    return parsed.toISOString().slice(0, 10);
};

const todayIso = () => new Date().toISOString().slice(0, 10);

export const generatePurchaseId = () => {
    const stamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `PUR-${stamp}-${random}`;
};

const sanitizePurchaseId = (value) => String(value || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '-');

export const getPurchaseDisplayId = (purchase) => {
    const existing = sanitizePurchaseId(purchase?.purchaseId || purchase?.id);
    if (existing) return existing;

    const raw = String(purchase?._id || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    if (!raw) return 'PUR-NA';
    return `PUR-${raw.slice(-8)}`;
};

export const normalizePurchaseStatus = (status) => {
    const key = String(status || '').trim();
    if (!key) return '';
    return STATUS_ALIASES[key] || key;
};

const assertStatus = (status) => {
    const normalized = normalizePurchaseStatus(status);
    if (!STATUS_ORDER.has(normalized)) {
        throw new Error(`Invalid purchase status: ${status}`);
    }
    return normalized;
};

const sanitizeSnapshot = (source, fields) => fields.reduce((acc, field) => {
    const raw = source?.[field];
    if (numericFields.has(field)) {
        acc[field] = toFiniteNumber(raw, 0);
        return acc;
    }
    acc[field] = raw == null ? '' : String(raw);
    return acc;
}, {});

export const normalizeManualDate = (value, label = 'Date') => {
    const isoDate = toIsoDateOnly(value);
    if (!isoDate) {
        throw new Error(`${label} is required.`);
    }
    if (isoDate > todayIso()) {
        throw new Error(`${label} cannot be in the future.`);
    }
    return isoDate;
};

export const normalizePurchaseQuantity = (quantity) => {
    const parsed = Number(quantity);
    if (!Number.isInteger(parsed) || parsed <= 0) {
        throw new Error('Quantity must be a positive whole number.');
    }
    return parsed;
};

export const buildBasicInfoSnapshot = (product = {}) => sanitizeSnapshot(product, BASIC_INFO_FIELDS);
export const buildAlibabaInfoSnapshot = (product = {}) => sanitizeSnapshot(product, ALIBABA_FIELDS);
export const buildPricingSnapshot = (product = {}) => sanitizeSnapshot(product, PRICING_FIELDS);

export const createStatusEntry = ({ status, date, note = '' }) => {
    const normalizedStatus = assertStatus(status);
    const normalizedDate = normalizeManualDate(date, 'Status date');
    return {
        status: normalizedStatus,
        date: normalizedDate,
        note: String(note || '').trim()
    };
};

export const validateStatusHistory = (history = []) => {
    if (!Array.isArray(history) || history.length === 0) {
        throw new Error('Status history is required.');
    }

    let previousDate = null;
    let previousStatusOrder = -1;

    const normalizedHistory = history.map((entry, index) => {
        const status = assertStatus(entry?.status);
        const normalizedDate = normalizeManualDate(entry?.date, 'Status date');
        const statusOrder = STATUS_ORDER.get(status);

        if (previousDate && normalizedDate < previousDate) {
            throw new Error('Status dates must be chronological.');
        }
        if (statusOrder < previousStatusOrder) {
            throw new Error('Status order cannot move backwards.');
        }

        previousDate = normalizedDate;
        previousStatusOrder = statusOrder;

        return {
            status,
            date: normalizedDate,
            note: String(entry?.note || '').trim()
        };
    });

    return normalizedHistory;
};

export const validatePurchasePayload = (payload, { requireProductId = true } = {}) => {
    if (!payload || typeof payload !== 'object') {
        throw new Error('Purchase payload is required.');
    }

    const productId = String(payload.productId || '').trim();
    if (requireProductId && !productId) {
        throw new Error('Product is required.');
    }

    const quantity = normalizePurchaseQuantity(payload.quantity);
    const status = assertStatus(payload.status || PURCHASE_STATUSES[0]);
    const purchaseId = sanitizePurchaseId(payload.purchaseId || payload.id || generatePurchaseId());

    const statusHistory = validateStatusHistory(payload.statusHistory || [
        {
            status,
            date: payload.initialStatusDate || payload.date || todayIso(),
            note: payload.notes || ''
        }
    ]);

    const latestEntry = statusHistory[statusHistory.length - 1];
    if (latestEntry.status !== status) {
        throw new Error('Current status must match the latest status history entry.');
    }

    return {
        ...payload,
        purchaseId,
        productId,
        quantity,
        status,
        statusHistory,
        received: Boolean(payload.received || status === 'received'),
        notes: String(payload.notes || '').trim()
    };
};

export const createPurchaseFromProductSnapshot = (product, {
    quantity,
    status = 'ordered',
    statusDate = todayIso(),
    statusNote = '',
    notes = '',
    received
} = {}) => {
    const safeStatus = assertStatus(status || PURCHASE_STATUSES[0]);

    const now = new Date().toISOString();
    const normalizedQuantity = normalizePurchaseQuantity(
        quantity == null ? product?.stock : quantity
    );

    const normalizedDate = normalizeManualDate(statusDate, 'Status date');
    const statusEntry = createStatusEntry({
        status: safeStatus,
        date: normalizedDate,
        note: statusNote
    });

    return {
        purchaseId: generatePurchaseId(),
        productId: String(product?._id || product?.id || '').trim(),
        quantity: normalizedQuantity,
        basicInfo: buildBasicInfoSnapshot(product),
        alibabaInfo: buildAlibabaInfoSnapshot(product),
        pricing: buildPricingSnapshot(product),
        status: safeStatus,
        statusHistory: [statusEntry],
        received: typeof received === 'boolean' ? received : safeStatus === 'received',
        notes: String(notes || '').trim(),
        createdAt: now,
        updatedAt: now
    };
};

export const applyPurchaseStatusTransition = (purchase, {
    status,
    date,
    note = ''
}) => {
    const targetStatus = assertStatus(status || purchase?.status);
    const nextEntry = createStatusEntry({ status: targetStatus, date, note });
    const normalizedHistory = validateStatusHistory([
        ...(purchase?.statusHistory || []),
        nextEntry
    ]);

    const wasReceived = Boolean(purchase?.received);
    const nowReceived = targetStatus === 'received';
    const didBecomeReceived = !wasReceived && nowReceived;

    return {
        nextPurchase: {
            ...purchase,
            status: targetStatus,
            statusHistory: normalizedHistory,
            received: wasReceived || nowReceived,
            updatedAt: new Date().toISOString()
        },
        didBecomeReceived
    };
};

export const getLastStatusEntry = (purchase) => {
    const entries = purchase?.statusHistory;
    if (!Array.isArray(entries) || entries.length === 0) return null;
    return entries[entries.length - 1];
};

export const getPurchaseTotalCostIQD = (purchase) => {
    const quantity = Number(purchase?.quantity || 0);
    const perUnit = Number(purchase?.pricing?.costPriceIQD_perUnit || 0);
    if (quantity > 0 && perUnit > 0) return perUnit * quantity;
    return Number(purchase?.pricing?.costPriceIQD_total || 0);
};

export const formatPurchaseProductLabel = (purchase) => {
    const name = String(purchase?.basicInfo?.name || '').trim();
    const sku = String(purchase?.basicInfo?.sku || '').trim();
    if (name && sku) return `${name} (${sku})`;
    return name || sku || 'Unknown Product';
};
