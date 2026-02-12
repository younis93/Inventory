import React, { createContext, useContext, useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { firebaseService } from '../services/firebaseService';

const InventoryContext = createContext();

export const useInventory = () => useContext(InventoryContext);

export const InventoryProvider = ({ children }) => {
    // --- UI State ---
    const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
        return localStorage.getItem('isSidebarCollapsed') === 'true';
    });
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [appearance, setAppearance] = useState(() => {
        const saved = localStorage.getItem('appearance');
        return saved ? JSON.parse(saved) : {
            theme: 'default',
            accentType: 'solid',
            accentColor: '#1e3a5f',
            accentGradient: { start: '#8B5CF6', end: '#3B82F6' }
        };
    });

    // Sync appearance with CSS variables and theme classes
    useEffect(() => {
        const root = document.documentElement;

        // Handle Theme Classes
        root.classList.remove('theme-liquid', 'theme-light', 'theme-dark');
        if (appearance.theme !== 'default') {
            root.classList.add(`theme-${appearance.theme}`);
        }

        // Handle Accent Variables (Inject both for compatibility)
        let primaryColor = appearance.accentColor;
        let secondaryColor = appearance.accentColor;

        if (appearance.accentType === 'solid') {
            root.style.setProperty('--accent-color', appearance.accentColor);
            root.style.setProperty('--accent-gradient', appearance.accentColor);
        } else {
            const { start, end } = appearance.accentGradient;
            primaryColor = start;
            secondaryColor = end;
            root.style.setProperty('--accent-color', start);
            root.style.setProperty('--accent-gradient', `linear-gradient(135deg, ${start} 0%, ${end} 100%)`);
        }

        // Compatibility variables
        root.style.setProperty('--brand-color', primaryColor);
        setBrand(prev => ({ ...prev, color: primaryColor }));

        // Liquid Glass specific variables
        if (appearance.theme === 'liquid') {
            root.style.setProperty('--glass-tint', `${primaryColor}15`);
        }

        // Sync with core dark/light mode
        if (appearance.theme === 'dark') {
            setTheme('dark');
        } else if (appearance.theme === 'light') {
            setTheme('light');
        } else if (appearance.theme === 'default') {
            // Respect existing 'theme' state or system
            const savedTheme = localStorage.getItem('theme') || 'light';
            setTheme(savedTheme);
        }
    }, [appearance]);

    // --- Data State ---
    const [products, setProducts] = useState([]);
    const [orders, setOrders] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [users, setUsers] = useState([]);
    const [categories, setCategories] = useState(['Electronics', 'Clothing', 'Home', 'Beauty', 'Sports']);
    const [loading, setLoading] = useState(true);

    // Branding State
    const [brand, setBrand] = useState({
        name: 'Gem Toys',
        logo: 'https://i.imgur.com/9YXqZ5K.png',
        color: '#1e3a5f',
        hideHeader: false
    });

    const updateBrand = async (newBrand) => {
        const updated = { ...brand, ...newBrand };
        setBrand(updated);
        await firebaseService.set("settings", "branding", updated);
    };

    // --- Real-time Firestore Listeners (using Service) ---
    useEffect(() => {
        setLoading(true);

        const unsubProducts = firebaseService.subscribeToCollection("products", setProducts, "name");

        // Subscribe to Categories Collection
        // Note: If you don't have a 'categories' collection in Firestore yet, this will return empty.
        // You might want to seed it or just start adding.
        const unsubCategories = firebaseService.subscribeToCollection("categories", (data) => {
            // Data is array of objects { id, name, ... }
            // We map to array of strings for 'categories' state to keep compatibility with existing apps
            // OR we store objects. Let's store Strings for now as that's what the app expects, 
            // but we might need IDs for updates. 
            // Actually, best to store objects { id, name } internally but `categories` public state 
            // is currently used as strings array in dropdowns.
            // Let's keep `categories` as strings for now, and handle the mapping internally or 
            // update `categories` to be objects in a refactor. 
            // To be safe and compliant with "Manage" (Rename), we really need objects.
            // But to avoid breaking `Products.jsx` which expects `categories.map(cat => cat)`, 
            // we will map to names. 
            // To support Rename, we need to know the ID. 
            // Let's add `categoryObjects` state for internal management, and `categories` as names for existing UI.
            if (data.length > 0) {
                const sortedCats = data.map(d => d.name).sort();
                setCategories(sortedCats);
                setCategoryObjects(data);
            } else {
                // Fallback: if no categories collection, derive from products (read-only mode essentially until they add one)
                // But once they add one, we should probably stick to collection.
                // For now, let's just initialize.
                // We won't overwrite if products load first? 
                // It's tricky. Let's stick to collection as source of truth.
                // If empty, we start empty (or seed).
                setCategories([]);
                setCategoryObjects([]);
            }
        });

        const unsubOrders = firebaseService.subscribeToCollection("orders", setOrders, "date", "desc");
        const unsubCustomers = firebaseService.subscribeToCollection("customers", setCustomers, "name");
        const unsubUsers = firebaseService.subscribeToCollection("users", setUsers);

        const unsubBranding = firebaseService.subscribeToCollection("settings", (data) => {
            const branding = data.find(d => d._id === "branding");
            if (branding) {
                const { _id, ...brandData } = branding;
                setBrand(brandData);
            }
        });

        setLoading(false);

        return () => {
            unsubProducts();
            unsubCategories();
            unsubOrders();
            unsubCustomers();
            unsubUsers();
            unsubBranding();
        };
    }, []);

    const [categoryObjects, setCategoryObjects] = useState([]); // Internal state for IDs

    // --- Category CRUD ---
    const addCategory = async (name) => {
        // Check if exists
        if (categories.includes(name)) return;
        await firebaseService.add("categories", { name });
    };

    const updateCategory = async (oldName, newName) => {
        // Find ID
        const catObj = categoryObjects.find(c => c.name === oldName);
        if (catObj) {
            await firebaseService.update("categories", catObj._id, { name: newName });
            // Also need to update all products with this category?
            // "Update inventory product category dropdowns/lists immediately" -> This is auto via subscription.
            // "Update products?" -> Usually yes.
            const productsToUpdate = products.filter(p => p.category === oldName);
            for (const p of productsToUpdate) {
                await firebaseService.update("products", p._id, { category: newName });
            }
        }
    };

    const deleteCategory = async (name) => {
        const catObj = categoryObjects.find(c => c.name === name);
        if (catObj) {
            await firebaseService.delete("categories", catObj._id);
        }
    };

    const [currentUser, setCurrentUser] = useState(null);

    // Keep currentUser synced with the users list
    useEffect(() => {
        if (users.length > 0) {
            if (!currentUser) {
                // Initial load: pick a default user (Admin if possible)
                const admin = users.find(u => u.role === 'Admin');
                setCurrentUser(admin || users[0]);
            } else {
                // Sync current user data from the latest users list
                const latestData = users.find(u => u._id === currentUser._id || u.username === currentUser.username);
                if (latestData) {
                    setCurrentUser(latestData);
                }
            }
        }
    }, [users]);

    // Theme Logic
    const toggleTheme = (newTheme) => {
        setTheme(newTheme);
    };

    useEffect(() => {
        const root = document.documentElement;
        if (theme === 'dark') {
            root.classList.add('dark');
        } else if (theme === 'light') {
            root.classList.remove('dark');
        } else if (theme === 'system') {
            if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
                root.classList.add('dark');
            } else {
                root.classList.remove('dark');
            }
        }
        localStorage.setItem('theme', theme);
    }, [theme]);

    // Sidebar Logic
    const toggleSidebar = () => {
        setIsSidebarCollapsed(prev => {
            const newState = !prev;
            localStorage.setItem('isSidebarCollapsed', newState);
            return newState;
        });
    };

    const toggleMobileMenu = () => setIsMobileMenuOpen(prev => !prev);
    const closeMobileMenu = () => setIsMobileMenuOpen(false);

    // Format Currency Helper
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IQ', { style: 'currency', currency: 'IQD', maximumFractionDigits: 0 }).format(amount);
    };

    // --- Actions (using Service) ---
    const addProduct = async (newProduct) => {
        await firebaseService.add("products", newProduct);
    };

    const updateProduct = async (updatedProduct) => {
        const { _id, ...data } = updatedProduct;
        await firebaseService.update("products", _id, data);
    };

    const deleteProduct = async (id) => {
        await firebaseService.delete("products", id);
    };



    const addCustomer = async (newCustomer) => {
        return await firebaseService.add("customers", newCustomer);
    };

    const updateCustomer = async (updatedCustomer) => {
        const { _id, ...data } = updatedCustomer;
        await firebaseService.update("customers", _id, data);
    };

    const addOrder = async (newOrder) => {
        const orderWithDetails = {
            ...newOrder,
            orderId: `#ORD-${Math.floor(1000 + Math.random() * 9000)}`,
            date: new Date().toISOString()
        };

        // Add the order
        const addedOrder = await firebaseService.add("orders", orderWithDetails);

        // Decrement Stock for each item
        for (const item of newOrder.items) {
            const product = products.find(p => p._id === item.product._id);
            if (product) {
                const newStock = Math.max(0, product.stock - item.quantity);
                await firebaseService.update("products", product._id, {
                    stock: newStock,
                    status: newStock === 0 ? 'Out of Stock' : (newStock <= 5 ? 'Low Stock' : 'In Stock')
                });
            }
        }
        return addedOrder;
    };

    const deleteOrder = async (id) => {
        await firebaseService.delete("orders", id);
    };

    const updateOrder = async (updatedOrder) => {
        const { _id, ...data } = updatedOrder;
        await firebaseService.update("orders", _id, data);
    };

    const addUser = async (user) => {
        await firebaseService.add("users", { ...user, displayName: user.username });
    };

    const updateUser = async (updatedUser) => {
        const { _id, ...data } = updatedUser;
        await firebaseService.update("users", _id, data);
    }

    const updateUserProfile = async (updatedData) => {
        if (!currentUser) return;
        await firebaseService.update("users", currentUser._id, updatedData);
        setCurrentUser(prev => ({ ...prev, ...updatedData }));
    }

    const deleteUser = async (userId) => {
        await firebaseService.delete("users", userId);
    };

    return (
        <InventoryContext.Provider value={{
            products, addProduct, updateProduct, deleteProduct,
            orders, addOrder, updateOrder, deleteOrder,
            customers, addCustomer, updateCustomer,
            users, addUser, updateUser, deleteUser,
            categories, addCategory, updateCategory, deleteCategory,
            loading,
            theme, toggleTheme,
            brand, updateBrand,
            appearance,
            setAppearance: (newAppearance) => {
                setAppearance(prev => {
                    const updated = { ...prev, ...newAppearance };
                    localStorage.setItem('appearance', JSON.stringify(updated));
                    return updated;
                });
            },
            currentUser, updateUserProfile,
            formatCurrency,
            isSidebarCollapsed, toggleSidebar,
            isMobileMenuOpen, toggleMobileMenu, closeMobileMenu
        }}>
            {children}
        </InventoryContext.Provider>
    );
};
