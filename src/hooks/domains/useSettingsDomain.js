import { useEffect, useMemo, useState } from 'react';
import { dataClient } from '../../data/dataClient';

export const useSettingsDomain = ({
    enabled,
    authUser,
    addToast,
    defaultBrand,
    legacyLogo,
    professionalLogo,
    professionalFavicon,
    defaultExpenseTypes
}) => {
    const [users, setUsers] = useState([]);
    const [brand, setBrand] = useState(defaultBrand);
    const [expenseTypes, setExpenseTypes] = useState(defaultExpenseTypes);
    const [loading, setLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState(null);

    useEffect(() => {
        if (!enabled) {
            setLoading(false);
            return undefined;
        }

        setLoading(true);
        let loadedUsers = false;
        let loadedSettings = false;

        const maybeDone = () => {
            if (loadedUsers && loadedSettings) setLoading(false);
        };

        const unsubUsers = dataClient.subscribeToCollection(
            'users',
            (data) => {
                setUsers(data);
                loadedUsers = true;
                maybeDone();
            },
            'username',
            'asc',
            (error) => {
                console.error('Error loading users:', error);
                loadedUsers = true;
                maybeDone();
                addToast?.('Error loading users. Refresh page.', 'error');
            }
        );

        const unsubSettings = dataClient.subscribeToCollection(
            'settings',
            (data) => {
                const branding = data.find((entry) => entry._id === 'branding');
                const expensesConfig = data.find((entry) => entry._id === 'expenses_config');

                if (branding) {
                    const { _id, ...brandData } = branding;
                    const sanitizedLogo = brandData.logo === legacyLogo ? professionalLogo : brandData.logo;
                    const sanitizedFavicon = brandData.favicon === legacyLogo
                        ? (sanitizedLogo || professionalFavicon)
                        : brandData.favicon;
                    setBrand((prev) => ({
                        ...prev,
                        ...brandData,
                        logo: sanitizedLogo,
                        favicon: sanitizedFavicon
                    }));
                }

                if (expensesConfig?.types && Array.isArray(expensesConfig.types)) {
                    const merged = [...new Set([...defaultExpenseTypes, ...expensesConfig.types.filter(Boolean)])];
                    setExpenseTypes(merged);
                } else {
                    setExpenseTypes(defaultExpenseTypes);
                }

                loadedSettings = true;
                maybeDone();
            },
            'name',
            'asc',
            (error) => {
                console.error('Error loading settings:', error);
                loadedSettings = true;
                maybeDone();
                addToast?.('Error loading settings. Refresh page.', 'error');
            }
        );

        return () => {
            unsubUsers?.();
            unsubSettings?.();
        };
    }, [
        enabled,
        addToast,
        legacyLogo,
        professionalLogo,
        professionalFavicon,
        defaultExpenseTypes
    ]);

    useEffect(() => {
        if (users.length > 0 && authUser?.email) {
            const email = authUser.email.toLowerCase();
            const matchedUser = users.find((user) => user.email?.toLowerCase() === email);
            if (matchedUser) {
                const needsSync = !matchedUser.uid || matchedUser.uid !== authUser.uid || !matchedUser.lastLogin;
                if (needsSync) {
                    const syncData = {
                        uid: authUser.uid,
                        lastLogin: new Date().toISOString(),
                        photoURL: matchedUser.photoURL || authUser.photoURL || null
                    };
                    dataClient.update('users', matchedUser._id, syncData).catch((error) => {
                        console.error('Metadata sync failed:', error);
                    });
                }
                try {
                    localStorage.setItem('inventory.userRole', matchedUser.role || 'Sales');
                } catch (_) { }
                setCurrentUser(matchedUser);
            }
        } else if (!authUser) {
            try {
                localStorage.removeItem('inventory.userRole');
            } catch (_) { }
            setCurrentUser(null);
        }
    }, [users, authUser]);

    useEffect(() => {
        try {
            if (brand?.name) document.title = brand.name;

            const setFavicon = (url) => {
                if (!url) return;
                let link = document.querySelector("link[rel~='icon']");
                if (!link) {
                    link = document.createElement('link');
                    link.rel = 'icon';
                    document.getElementsByTagName('head')[0].appendChild(link);
                }
                if (String(url).startsWith('data:')) {
                    link.href = url;
                } else {
                    const sep = String(url).includes('?') ? '&' : '?';
                    link.href = `${url}${sep}v=${Date.now()}`;
                }
            };

            if (brand?.favicon) setFavicon(brand.favicon);
            else if (brand?.logo) setFavicon(brand.logo);
            else setFavicon(professionalFavicon);
        } catch (error) {
            console.error(error);
        }
    }, [brand, professionalFavicon]);

    const updateBrand = async (newBrand) => {
        const { _id, ...brandData } = newBrand;
        const targetId = _id || 'branding';
        await dataClient.set('settings', targetId, brandData);
        setBrand((prev) => ({ ...prev, ...brandData }));
    };

    const addUser = async (user) => {
        const normalizedEmail = user.email.toLowerCase().trim();
        await dataClient.set('users', normalizedEmail, {
            ...user,
            email: normalizedEmail,
            displayName: user.displayName || user.username
        });
    };

    const updateUser = async (updatedUser) => {
        const { _id, ...data } = updatedUser;
        const normalizedEmail = data.email.toLowerCase().trim();

        if (_id !== normalizedEmail) {
            await dataClient.set('users', normalizedEmail, {
                ...data,
                email: normalizedEmail,
                displayName: data.displayName || data.username
            });
            await dataClient.delete('users', _id);
            addToast?.('User migrated to optimized ID system.', 'info');
            return;
        }

        await dataClient.update('users', _id, { ...data, email: normalizedEmail });
    };

    const updateUserProfile = async (updatedData) => {
        if (!currentUser) return;
        await dataClient.update('users', currentUser._id, updatedData);
        setCurrentUser((prev) => ({ ...prev, ...updatedData }));
    };

    const deleteUser = async (userId) => {
        await dataClient.delete('users', userId);
    };

    const saveExpenseTypes = async (types) => {
        const normalized = [...new Set((types || []).map((item) => String(item || '').trim()).filter(Boolean))];
        const merged = [...new Set([...defaultExpenseTypes, ...normalized])];
        await dataClient.set('settings', 'expenses_config', {
            name: 'expenses_config',
            types: merged,
            updatedAt: new Date().toISOString()
        });
        setExpenseTypes(merged);
        addToast?.('Expense types saved', 'success');
    };

    return useMemo(() => ({
        users,
        brand,
        expenseTypes,
        currentUser,
        loading,
        updateBrand,
        addUser,
        updateUser,
        deleteUser,
        updateUserProfile,
        saveExpenseTypes
    }), [users, brand, expenseTypes, currentUser, loading]);
};
