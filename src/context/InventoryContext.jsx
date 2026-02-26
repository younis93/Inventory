import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useLayoutEffect,
    useMemo,
    useState
} from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from './AuthContext';
import { dataClient } from '../data/dataClient';
import { useProductsDomain } from '../hooks/domains/useProductsDomain';
import { useOrdersDomain } from '../hooks/domains/useOrdersDomain';
import { useCustomersDomain } from '../hooks/domains/useCustomersDomain';
import { useExpensesDomain } from '../hooks/domains/useExpensesDomain';
import { useSettingsDomain } from '../hooks/domains/useSettingsDomain';
import { usePurchasesDomain } from '../hooks/domains/usePurchasesDomain';
import lightThemeStylesheet from '../themes/light.css?url';
import darkThemeStylesheet from '../themes/dark.css?url';

const InventoryContext = createContext();

const PROFESSIONAL_LOGO = '/brand-logo.svg';
const PROFESSIONAL_FAVICON = '/brand-favicon.svg';
const LEGACY_LOGO = 'https://i.imgur.com/9YXqZ5K.png';

const DEFAULT_APPEARANCE = {
    theme: 'light',
    glassBackground: false,
    accentType: 'gradient',
    accentColor: '#1e3a5f',
    accentGradient: { start: '#EC4899', end: '#8B5CF6' }
};

const getAppearanceStorageKey = (user) => (user?.uid ? `appearance:${user.uid}` : 'appearance');

const normalizeAppearance = (parsed) => {
    const rawTheme = parsed?.theme;
    const isLegacyGlassTheme = rawTheme === 'liquid' || rawTheme === 'default_glass';
    const normalizedTheme = isLegacyGlassTheme ? DEFAULT_APPEARANCE.theme : (rawTheme || DEFAULT_APPEARANCE.theme);

    return {
        theme: normalizedTheme,
        glassBackground: parsed?.glassBackground ?? isLegacyGlassTheme ?? DEFAULT_APPEARANCE.glassBackground,
        accentType: parsed?.accentType || DEFAULT_APPEARANCE.accentType,
        accentColor: parsed?.accentColor || DEFAULT_APPEARANCE.accentColor,
        accentGradient: {
            start: parsed?.accentGradient?.start || DEFAULT_APPEARANCE.accentGradient.start,
            end: parsed?.accentGradient?.end || DEFAULT_APPEARANCE.accentGradient.end
        }
    };
};

const readAppearanceFromStorage = (storageKey) => {
    try {
        const scoped = localStorage.getItem(storageKey);
        if (scoped) return normalizeAppearance(JSON.parse(scoped));

        if (storageKey !== 'appearance') {
            const legacy = localStorage.getItem('appearance');
            if (legacy) return normalizeAppearance(JSON.parse(legacy));
        }
    } catch (error) {
        console.error('Error loading appearance settings:', error);
    }

    return DEFAULT_APPEARANCE;
};

const DEFAULT_EXPENSE_TYPES = ['Social Media Post', 'Social Media Reels', 'Other'];

const DEFAULT_BRAND = {
    name: 'Gem Toys',
    logo: PROFESSIONAL_LOGO,
    favicon: PROFESSIONAL_FAVICON,
    color: '#1e3a5f',
    website: '',
    hideHeader: false
};

export const useInventory = () => useContext(InventoryContext);

const useDomainActivation = (domain) => {
    const { activateDomain } = useInventory();
    useLayoutEffect(() => activateDomain(domain), [activateDomain, domain]);
};

export const useProducts = () => {
    const context = useInventory();
    useDomainActivation('products');
    return {
        products: context.products,
        categories: context.categories,
        addProduct: context.addProduct,
        updateProduct: context.updateProduct,
        deleteProduct: context.deleteProduct,
        addCategory: context.addCategory,
        updateCategory: context.updateCategory,
        deleteCategory: context.deleteCategory
    };
};

export const useOrders = () => {
    const context = useInventory();
    useDomainActivation('orders');
    return {
        orders: context.orders,
        addOrder: context.addOrder,
        updateOrder: context.updateOrder,
        deleteOrder: context.deleteOrder
    };
};

export const useCustomers = () => {
    const context = useInventory();
    useDomainActivation('customers');
    return {
        customers: context.customers,
        addCustomer: context.addCustomer,
        updateCustomer: context.updateCustomer
    };
};

export const useExpenses = () => {
    const context = useInventory();
    useDomainActivation('expenses');
    return {
        expenses: context.expenses,
        addExpense: context.addExpense,
        updateExpense: context.updateExpense,
        deleteExpense: context.deleteExpense,
        expenseTypes: context.expenseTypes,
        saveExpenseTypes: context.saveExpenseTypes
    };
};

export const useSettings = () => {
    const context = useInventory();
    useDomainActivation('settings');
    return {
        users: context.users,
        currentUser: context.currentUser,
        currentUserResolved: context.settingsUserResolved,
        brand: context.brand,
        updateBrand: context.updateBrand,
        addUser: context.addUser,
        updateUser: context.updateUser,
        deleteUser: context.deleteUser,
        updateUserProfile: context.updateUserProfile
    };
};

export const usePurchases = () => {
    const context = useInventory();
    useDomainActivation('purchases');
    return {
        loading: context.purchasesLoading,
        purchases: context.purchases,
        purchaseStatuses: context.purchaseStatuses,
        canManagePurchases: context.canManagePurchases,
        addPurchase: context.addPurchase,
        updatePurchase: context.updatePurchase,
        updatePurchaseStatus: context.updatePurchaseStatus,
        deletePurchase: context.deletePurchase,
        getPurchasesByProduct: context.getPurchasesByProduct
    };
};

export const InventoryProvider = ({ children }) => {
    const { user: authUser } = useAuth();
    const { i18n } = useTranslation();

    const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => localStorage.getItem('isSidebarCollapsed') === 'true');
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [toasts, setToasts] = useState([]);
    const [language, setLanguage] = useState(localStorage.getItem('language') || i18n.language || 'en');
    const [domainSubscribers, setDomainSubscribers] = useState({
        products: 0,
        orders: 0,
        customers: 0,
        expenses: 0,
        purchases: 0,
        settings: 1
    });
    const isDesktop = dataClient.isDesktop();
    const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
    const [pendingSyncCount, setPendingSyncCount] = useState(0);
    const [desktopOfflineModeEnabled, setDesktopOfflineModeEnabledState] = useState(true);
    const [conflicts, setConflicts] = useState([]);

    const addToast = useCallback((message, type = 'info') => {
        const id = Math.random().toString(36).slice(2, 11);
        setToasts((prev) => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts((prev) => prev.filter((item) => item.id !== id));
        }, 3000);
    }, []);

    const [appearance, setAppearanceState] = useState(() =>
        readAppearanceFromStorage(getAppearanceStorageKey(authUser))
    );

    useEffect(() => {
        const storageKey = getAppearanceStorageKey(authUser);

        // One-time migration from legacy shared key to user-scoped key.
        if (storageKey !== 'appearance') {
            try {
                const scoped = localStorage.getItem(storageKey);
                const legacy = localStorage.getItem('appearance');
                if (!scoped && legacy) {
                    localStorage.setItem(storageKey, legacy);
                }
            } catch (_) { }
        }

        const userAppearance = readAppearanceFromStorage(storageKey);
        setAppearanceState(userAppearance);
    }, [authUser?.uid]);

    const activateDomain = useCallback((domain) => {
        setDomainSubscribers((prev) => ({ ...prev, [domain]: (prev[domain] || 0) + 1 }));
        return () => {
            setDomainSubscribers((prev) => ({ ...prev, [domain]: Math.max(0, (prev[domain] || 0) - 1) }));
        };
    }, []);

    const enabledDomains = useMemo(() => ({
        products: domainSubscribers.products > 0,
        orders: domainSubscribers.orders > 0,
        customers: domainSubscribers.customers > 0,
        expenses: domainSubscribers.expenses > 0,
        purchases: domainSubscribers.purchases > 0,
        settings: domainSubscribers.settings > 0
    }), [domainSubscribers]);

    const settingsDomain = useSettingsDomain({
        enabled: enabledDomains.settings,
        authUser,
        addToast,
        defaultBrand: DEFAULT_BRAND,
        legacyLogo: LEGACY_LOGO,
        professionalLogo: PROFESSIONAL_LOGO,
        professionalFavicon: PROFESSIONAL_FAVICON,
        defaultExpenseTypes: DEFAULT_EXPENSE_TYPES
    });

    const productsDomain = useProductsDomain({
        enabled: enabledDomains.products,
        addToast,
        currentUser: settingsDomain.currentUser
    });

    const ordersDomain = useOrdersDomain({
        enabled: enabledDomains.orders,
        addToast,
        currentUser: settingsDomain.currentUser,
        products: productsDomain.products,
        updateProductStock: productsDomain.updateProductStock,
        getStockStatus: productsDomain.getStockStatus
    });

    const customersDomain = useCustomersDomain({
        enabled: enabledDomains.customers,
        addToast,
        currentUser: settingsDomain.currentUser
    });

    const expensesDomain = useExpensesDomain({
        enabled: enabledDomains.expenses,
        addToast,
        currentUser: settingsDomain.currentUser
    });

    const purchasesDomain = usePurchasesDomain({
        enabled: enabledDomains.purchases,
        addToast,
        currentUser: settingsDomain.currentUser,
        products: productsDomain.products,
        addProduct: productsDomain.addProduct,
        updateProductStock: productsDomain.updateProductStock,
        getStockStatus: productsDomain.getStockStatus
    });

    const addProductWithInitialPurchase = useCallback(async (newProduct, options = {}) => {
        const createdProduct = await productsDomain.addProduct(newProduct, {
            silent: options.silentProductToast
        });
        if (!createdProduct) return null;

        const shouldCreateInitialPurchase = options.createInitialPurchase !== false;
        if (!shouldCreateInitialPurchase) return createdProduct;

        try {
            const fallbackDate = new Date().toISOString().slice(0, 10);
            await purchasesDomain.createInitialPurchaseForProduct(createdProduct, {
                quantity: options.initialPurchaseQuantity ?? newProduct?.stock,
                status: options.initialPurchaseStatus || 'received',
                statusDate: options.initialPurchaseDate || fallbackDate,
                statusNote: options.initialPurchaseNote || '',
                notes: options.initialPurchaseNotes || '',
                skipStockAdjustment: true,
                silent: true
            });
        } catch (error) {
            console.error('Initial purchase creation failed:', error);
            addToast('Product saved, but failed to create initial purchase record.', 'warning');
        }

        return createdProduct;
    }, [productsDomain, purchasesDomain, addToast]);

    const activeTheme = useMemo(() => {
        if (appearance.theme === 'dark') return 'dark';
        if (appearance.theme === 'light') return 'light';
        if (theme === 'dark') return 'dark';
        if (theme === 'system') {
            if (typeof window === 'undefined') return 'light';
            return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
        return 'light';
    }, [appearance.theme, theme]);

    useEffect(() => {
        const root = document.documentElement;
        root.classList.remove('theme-light', 'theme-dark', 'bg-liquid-glass');

        if (appearance.theme !== 'default') {
            root.classList.add(`theme-${appearance.theme}`);
        }
        if (appearance.glassBackground) {
            root.classList.add('bg-liquid-glass');
        }

        let primaryColor = appearance.accentColor;
        if (appearance.accentType === 'solid') {
            root.style.setProperty('--accent-color', appearance.accentColor);
            root.style.setProperty('--accent-gradient', appearance.accentColor);
        } else {
            const { start, end } = appearance.accentGradient;
            primaryColor = start;
            root.style.setProperty('--accent-color', start);
            root.style.setProperty('--accent-gradient', `linear-gradient(135deg, ${start} 0%, ${end} 100%)`);
        }

        root.style.setProperty('--brand-color', primaryColor);
        if (appearance.glassBackground) {
            root.style.setProperty('--glass-tint', `${primaryColor}15`);
        }

        if (appearance.theme === 'dark') setTheme('dark');
        else if (appearance.theme === 'light') setTheme('light');
        else if (appearance.theme === 'default') setTheme(localStorage.getItem('theme') || 'light');
    }, [appearance]);

    useEffect(() => {
        const linkId = 'app-theme-stylesheet';
        let link = document.getElementById(linkId);

        if (!link) {
            link = document.createElement('link');
            link.id = linkId;
            link.rel = 'stylesheet';
            document.head.appendChild(link);
        }

        const href = activeTheme === 'dark' ? darkThemeStylesheet : lightThemeStylesheet;
        if (link.getAttribute('href') !== href) {
            link.setAttribute('href', href);
        }
    }, [activeTheme]);

    useEffect(() => {
        const root = document.documentElement;
        if (theme === 'dark') root.classList.add('dark');
        else if (theme === 'light') root.classList.remove('dark');
        else if (theme === 'system') {
            if (window.matchMedia('(prefers-color-scheme: dark)').matches) root.classList.add('dark');
            else root.classList.remove('dark');
        }
        localStorage.setItem('theme', theme);
    }, [theme]);

    useEffect(() => {
        const savedLang = localStorage.getItem('language') || 'en';
        const dir = savedLang === 'ar' ? 'rtl' : 'ltr';
        document.documentElement.setAttribute('dir', dir);
        document.documentElement.setAttribute('lang', savedLang);
        if (savedLang !== i18n.language) i18n.changeLanguage(savedLang);
    }, [i18n]);

    useEffect(() => {
        if (!isDesktop) return undefined;

        const handleOnline = () => {
            setIsOnline(true);
            dataClient.setOnlineStatus(true);
        };
        const handleOffline = () => {
            setIsOnline(false);
            dataClient.setOnlineStatus(false);
        };

        const init = async () => {
            setIsOnline(navigator.onLine);
            await dataClient.setOnlineStatus(navigator.onLine);
            const status = await dataClient.getSyncStatus();
            setPendingSyncCount(status.pendingCount || 0);
            setDesktopOfflineModeEnabledState(Boolean(status.offlineModeEnabled));
            setConflicts(await dataClient.getConflicts());
        };

        init().catch((error) => console.error('Desktop sync init failed:', error));
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        const unsubSync = dataClient.onSyncState((state) => {
            setPendingSyncCount(state.pendingCount || 0);
            setDesktopOfflineModeEnabledState(Boolean(state.offlineModeEnabled));
        });

        const unsubConflict = dataClient.onConflict((conflict) => {
            addToast(`Conflict detected on ${conflict.entity} #${conflict.docId} - resolved automatically`, 'warning');
            dataClient.getConflicts().then(setConflicts).catch(() => { });
        });

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            unsubSync?.();
            unsubConflict?.();
        };
    }, [isDesktop, addToast]);

    const syncNow = async () => {
        if (!isDesktop) return;
        try {
            const result = await dataClient.syncOnce();
            const pending = await dataClient.getPendingSyncCount();
            setPendingSyncCount(pending);
            setConflicts(await dataClient.getConflicts());

            if (result?.rateLimited) {
                const retrySec = Math.max(1, Math.ceil((result?.retryAfterMs || 0) / 1000));
                addToast(`Sync paused due to quota limit. Retry in ~${retrySec}s.`, 'warning');
                return;
            }
            if (result?.failed > 0) addToast(`Sync completed with ${result.failed} failed change(s).`, 'warning');
            else if (!result?.skipped) addToast('Sync completed successfully.', 'success');
        } catch (error) {
            addToast(`Sync failed: ${error?.message || 'Unknown error'}`, 'error');
            setPendingSyncCount(await dataClient.getPendingSyncCount());
            setConflicts(await dataClient.getConflicts());
        }
    };

    const setDesktopOfflineModeEnabled = async (enabled) => {
        if (!isDesktop) return;
        await dataClient.setOfflineModeEnabled(enabled);
        setDesktopOfflineModeEnabledState(enabled);
    };

    const toggleSidebar = () => {
        setIsSidebarCollapsed((prev) => {
            const next = !prev;
            localStorage.setItem('isSidebarCollapsed', String(next));
            return next;
        });
    };

    const toggleMobileMenu = () => setIsMobileMenuOpen((prev) => !prev);
    const closeMobileMenu = () => setIsMobileMenuOpen(false);
    const toggleTheme = (nextTheme) => setTheme(nextTheme);

    const changeLanguage = (lng) => {
        setLanguage(lng);
        i18n.changeLanguage(lng);
        localStorage.setItem('language', lng);
        const dir = lng === 'ar' ? 'rtl' : 'ltr';
        document.documentElement.setAttribute('dir', dir);
        document.documentElement.setAttribute('lang', lng);
    };

    const setAppearance = (newAppearance) => {
        setAppearanceState((prev) => {
            const updated = normalizeAppearance({
                ...prev,
                ...newAppearance,
                accentGradient: newAppearance?.accentGradient
                    ? { ...prev.accentGradient, ...newAppearance.accentGradient }
                    : prev.accentGradient
            });
            localStorage.setItem(getAppearanceStorageKey(authUser), JSON.stringify(updated));
            return updated;
        });
    };

    const formatCurrency = (amount) => new Intl.NumberFormat('en-IQ', {
        style: 'currency',
        currency: 'IQD',
        maximumFractionDigits: 0
    }).format(amount);

    const brand = useMemo(
        () => ({
            ...settingsDomain.brand,
            color: settingsDomain.brand?.color || DEFAULT_BRAND.color
        }),
        [settingsDomain.brand]
    );

    const settingsLoading = settingsDomain.loading;
    const loading =
        (enabledDomains.products && productsDomain.loading) ||
        (enabledDomains.orders && ordersDomain.loading) ||
        (enabledDomains.customers && customersDomain.loading) ||
        (enabledDomains.expenses && expensesDomain.loading) ||
        (enabledDomains.purchases && purchasesDomain.loading);

    return (
        <InventoryContext.Provider
            value={{
                activateDomain,
                settingsLoading,
                loading,
                theme,
                toggleTheme,
                appearance,
                setAppearance,
                isSidebarCollapsed,
                toggleSidebar,
                isMobileMenuOpen,
                toggleMobileMenu,
                closeMobileMenu,
                isModalOpen,
                setIsModalOpen,
                language,
                changeLanguage,
                formatCurrency,
                toasts,
                addToast,
                isDesktop,
                isOnline,
                pendingSyncCount,
                syncNow,
                desktopOfflineModeEnabled,
                setDesktopOfflineModeEnabled,
                conflicts,
                products: productsDomain.products,
                categories: productsDomain.categories,
                addProduct: addProductWithInitialPurchase,
                updateProduct: productsDomain.updateProduct,
                deleteProduct: productsDomain.deleteProduct,
                addCategory: productsDomain.addCategory,
                updateCategory: productsDomain.updateCategory,
                deleteCategory: productsDomain.deleteCategory,
                orders: ordersDomain.orders,
                addOrder: ordersDomain.addOrder,
                updateOrder: ordersDomain.updateOrder,
                deleteOrder: ordersDomain.deleteOrder,
                customers: customersDomain.customers,
                addCustomer: customersDomain.addCustomer,
                updateCustomer: customersDomain.updateCustomer,
                expenses: expensesDomain.expenses,
                addExpense: expensesDomain.addExpense,
                updateExpense: expensesDomain.updateExpense,
                deleteExpense: expensesDomain.deleteExpense,
                users: settingsDomain.users,
                addUser: settingsDomain.addUser,
                updateUser: settingsDomain.updateUser,
                deleteUser: settingsDomain.deleteUser,
                currentUser: settingsDomain.currentUser,
                settingsUserResolved: settingsDomain.currentUserResolved,
                updateUserProfile: settingsDomain.updateUserProfile,
                brand,
                updateBrand: settingsDomain.updateBrand,
                expenseTypes: settingsDomain.expenseTypes,
                saveExpenseTypes: settingsDomain.saveExpenseTypes,
                purchases: purchasesDomain.purchases,
                purchasesLoading: purchasesDomain.loading,
                purchaseStatuses: purchasesDomain.purchaseStatuses,
                canManagePurchases: purchasesDomain.canManagePurchases,
                addPurchase: purchasesDomain.addPurchase,
                updatePurchase: purchasesDomain.updatePurchase,
                updatePurchaseStatus: purchasesDomain.updatePurchaseStatus,
                deletePurchase: purchasesDomain.deletePurchase,
                getPurchasesByProduct: purchasesDomain.getPurchasesByProduct
            }}
        >
            {children}
        </InventoryContext.Provider>
    );
};
