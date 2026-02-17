import React, { useState, useEffect } from 'react'; // Added useEffect
import Layout from '../components/Layout';
import { Moon, Sun, Monitor, User, Trash2, Plus, CheckCircle, Settings as SettingsIcon, Users, Lock, Edit, Upload, Image as ImageIcon, Sparkles, Droplets, Palette, Layout as LayoutIcon, AlertTriangle, ShieldAlert, Globe } from 'lucide-react';
import { useInventory } from '../context/InventoryContext';
import { useTranslation } from 'react-i18next';
import ImageCropperModal from '../components/ImageCropperModal';
import ImageWithFallback from '../components/common/ImageWithFallback';

const Settings = () => {
    const { t } = useTranslation();
    const { theme, toggleTheme, appearance, setAppearance, users, addUser, updateUser, deleteUser, currentUser, updateUserProfile, brand, updateBrand, addToast, seedData, language, changeLanguage } = useInventory();
    const [activeTab, setActiveTab] = useState('general');
    const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
    const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);

    // Image Cropping State
    const [croppingImage, setCroppingImage] = useState(null);
    const [cropType, setCropType] = useState(null); // 'avatar' or 'logo'

    // Account Settings State
    const [displayName, setDisplayName] = useState(currentUser?.displayName || '');
    const [isEditingProfile, setIsEditingProfile] = useState(false);

    // Update local state when currentUser changes
    useEffect(() => {
        if (currentUser) {
            setDisplayName(currentUser.displayName);
        }
    }, [currentUser]);

    const handleSaveProfile = async () => {
        try {
            await updateUserProfile({ displayName });
            setIsEditingProfile(false);
            addToast("Profile updated successfully!", "success");
        } catch (error) {
            console.error("Profile update error:", error);
            addToast("Failed to update profile.", "error");
        }
    };

    const handleAvatarUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 3 * 1024 * 1024) return addToast("Avatar too large. Max 3MB.", "error");
            const reader = new FileReader();
            reader.onloadend = () => {
                setCroppingImage(reader.result);
                setCropType('avatar');
            };
            reader.readAsDataURL(file);
        }
    };

    const [brandForm, setBrandForm] = useState({
        name: brand.name,
        color: brand.color,
        logo: brand.logo,
        favicon: brand.favicon || null,
        hideHeader: brand.hideHeader || false
    });

    useEffect(() => {
        setBrandForm({
            name: brand.name,
            color: brand.color,
            logo: brand.logo,
            favicon: brand.favicon || null,
            hideHeader: brand.hideHeader || false
        });
    }, [brand]);

    const handleSaveBranding = async () => {
        try {
            await updateBrand(brandForm);
            addToast("Branding settings saved successfully!", "success");
        } catch (error) {
            addToast("Failed to save branding settings.", "error");
        }
    };

    const handleLogoUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 3 * 1024 * 1024) return addToast("File too large. Max 3MB.", "error");
            const reader = new FileReader();
            reader.onloadend = () => {
                setCroppingImage(reader.result);
                setCropType('logo');
            };
            reader.readAsDataURL(file);
        }
    };

    const handleFaviconUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 512 * 1024) return addToast("Favicon too large. Max 512KB.", "error");
            const reader = new FileReader();
            reader.onloadend = () => {
                // Favicons are small square icons; no cropping modal used
                setBrandForm(prev => ({ ...prev, favicon: reader.result }));
                addToast("Favicon updated (preview). Save to persist.", "success");
            };
            reader.readAsDataURL(file);
        }
    };

    const handleCropComplete = async (croppedImage) => {
        if (cropType === 'avatar') {
            await updateUserProfile({ photoURL: croppedImage });
            addToast("Avatar updated successfully!", "success");
        } else if (cropType === 'logo') {
            setBrandForm(prev => ({ ...prev, logo: croppedImage }));
            addToast("Logo updated successfully!", "success");
        }
        setCroppingImage(null);
        setCropType(null);
    };

    // User Management State
    const [userForm, setUserForm] = useState({ username: '', email: '', role: 'Staff', password: '', displayName: '' });

    const handleOpenAddUser = () => {
        setEditingUser(null);
        setUserForm({ username: '', email: '', role: 'Staff', password: '', displayName: '' });
        setIsAddUserModalOpen(true);
    };

    const handleOpenEditUser = (user) => {
        setEditingUser(user);
        setUserForm({ ...user, password: '' }); // Don't pre-fill password for security
        setIsAddUserModalOpen(true);
    };

    const handleUserSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingUser) {
                await updateUser({ ...userForm, _id: editingUser._id });
                addToast("User updated successfully!", "success");
            } else {
                await addUser({ ...userForm });
                addToast("User created successfully!", "success");
            }
            setIsAddUserModalOpen(false);
        } catch (error) {
            console.error("User management error:", error);
            addToast("Failed to save user.", "error");
        }
    };

    const handleDeleteUser = async (id) => {
        if (window.confirm("Are you sure you want to delete this user?")) {
            try {
                await deleteUser(id);
                addToast("User deleted successfully.", "success");
            } catch (error) {
                addToast("Failed to delete user.", "error");
            }
        }
    };

    return (
        <Layout title="Settings">
            <div className="flex flex-col lg:flex-row gap-6">
                {/* Sidebar Navigation */}
                <aside className="w-full lg:w-64 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-6">
                    <nav className="space-y-2">
                        <button
                            onClick={() => setActiveTab('general')}
                            className={`w-full text-left px-4 py-3 rounded-xl font-medium transition-all flex items-center gap-3 ${activeTab === 'general'
                                ? 'bg-gradient-to-r from-[var(--brand-color)] to-[var(--brand-color)]/80 text-white shadow-md shadow-[var(--brand-color)]/20'
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                                }`}
                        >
                            <SettingsIcon className="w-5 h-5" />
                            {t('settings.general')}
                        </button>
                        <button
                            onClick={() => setActiveTab('appearance')}
                            className={`w-full text-left px-4 py-3 rounded-xl font-medium transition-all flex items-center gap-3 ${activeTab === 'appearance'
                                ? 'bg-gradient-to-r from-[var(--brand-color)] to-[var(--brand-color)]/80 text-white shadow-md shadow-[var(--brand-color)]/20'
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                                }`}
                        >
                            <Palette className="w-5 h-5" />
                            {t('settings.appearance')}
                        </button>
                        <button
                            onClick={() => setActiveTab('branding')}
                            className={`w-full text-left px-4 py-3 rounded-xl font-medium transition-all flex items-center gap-3 ${activeTab === 'branding'
                                ? 'bg-gradient-to-r from-[var(--brand-color)] to-[var(--brand-color)]/80 text-white shadow-md shadow-[var(--brand-color)]/20'
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                                }`}
                        >
                            <Sparkles className="w-5 h-5" />
                            {t('settings.branding')}
                        </button>
                        <button
                            onClick={() => setActiveTab('users')}
                            className={`w-full text-left px-4 py-3 rounded-xl font-medium transition-all flex items-center gap-3 ${activeTab === 'users'
                                ? 'bg-gradient-to-r from-[var(--brand-color)] to-[var(--brand-color)]/80 text-white shadow-md shadow-[var(--brand-color)]/20'
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                                }`}
                        >
                            <Users className="w-5 h-5" />
                            {t('settings.users')}
                        </button>
                    </nav>
                </aside>

                {/* Main Content Area */}
                <div className="flex-1">
                    {activeTab === 'general' && (
                        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                            <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-6">{t('settings.general')}</h2>

                            <div className="space-y-6">
                                {/* Language Switcher */}
                                <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                                    <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-4 flex items-center gap-2">
                                        <Globe className="w-4 h-4 text-accent" />
                                        {t('settings.language')}
                                    </h3>
                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => changeLanguage('en')}
                                            className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-all border-2 ${language === 'en' ? 'border-accent bg-white dark:bg-slate-800 text-accent shadow-sm' : 'border-transparent bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                                        >
                                            🇬🇧 English
                                        </button>
                                        <button
                                            onClick={() => changeLanguage('ar')}
                                            className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-all border-2 ${language === 'ar' ? 'border-accent bg-white dark:bg-slate-800 text-accent shadow-sm' : 'border-transparent bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                                        >
                                            🇮🇶 العربية
                                        </button>
                                    </div>
                                </div>

                            </div>
                        </div>
                    )}

                    {activeTab === 'branding' && (
                        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-xl font-bold text-slate-800 dark:text-white">{t('settings.branding')}</h2>
                                <button
                                    onClick={handleSaveBranding}
                                    className="px-4 py-2 text-white text-sm font-bold rounded-xl shadow-lg transition-all active:scale-95 bg-accent"
                                    style={{ boxShadow: `0 10px 15px -3px var(--accent-color)33` }}
                                >
                                    {t('settings.saveBranding')}
                                </button>
                            </div>

                            <div className="space-y-8">
                                {/* App Name */}
                                <div className="max-w-md">
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t('settings.appName')}</label>
                                    <input
                                        type="text"
                                        value={brandForm.name}
                                        onChange={(e) => setBrandForm({ ...brandForm, name: e.target.value })}
                                        className="w-full p-3 border border-slate-200 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/20"
                                    />
                                </div>

                                {/* Logo + Favicon Upload */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-4">{t('settings.logoAndFavicon') || 'Logo & Favicon'}</label>
                                    <div className="flex flex-wrap items-center gap-8">
                                        <div className="flex flex-col items-center gap-2">
                                            <div
                                                className="w-24 h-24 rounded-2xl flex items-center justify-center border border-slate-200 dark:border-slate-600 overflow-hidden bg-slate-100 dark:bg-slate-800 shadow-sm"
                                                style={{ backgroundColor: appearance.accentType === 'solid' ? appearance.accentColor : appearance.accentGradient?.start }}
                                            >
                                                {brandForm.logo ? (
                                                    <ImageWithFallback src={brandForm.logo} alt="Logo" className="w-full h-full" imageClassName="w-full h-full object-cover" />
                                                ) : (
                                                    <span className="text-white font-bold text-3xl">{(brandForm.name || '').charAt(0)}</span>
                                                )}
                                            </div>
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('settings.logo')}</span>
                                        </div>

                                        <div className="flex flex-col items-center gap-2">
                                            <div className="w-16 h-16 rounded-xl flex items-center justify-center border border-slate-200 dark:border-slate-600 overflow-hidden bg-slate-100 dark:bg-slate-800 shadow-sm">
                                                {brandForm.favicon ? (
                                                    <ImageWithFallback src={brandForm.favicon} alt="Favicon" className="w-full h-full" imageClassName="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-8 h-8 rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
                                                )}
                                            </div>
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Favicon</span>
                                        </div>

                                        <div className="flex flex-col gap-3">
                                            <div className="flex gap-3">
                                                <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 bg-accent text-white rounded-xl transition-all shadow-lg shadow-accent/20 hover:brightness-110 font-bold text-sm">
                                                    <Upload className="w-4 h-4" />
                                                    <span>{t('settings.uploadLogo')}</span>
                                                    <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                                                </label>
                                                <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl transition-colors font-bold text-sm border border-slate-200 dark:border-slate-600">
                                                    <ImageIcon className="w-4 h-4" />
                                                    <span>{t('settings.uploadFavicon') || 'Upload Favicon'}</span>
                                                    <input type="file" className="hidden" accept="image/*" onChange={handleFaviconUpload} />
                                                </label>
                                            </div>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">{t('settings.logoSize')}</p>
                                            <div className="flex gap-4">
                                                {brandForm.logo && (
                                                    <button onClick={() => setBrandForm({ ...brandForm, logo: null })} className="text-[11px] text-red-500 hover:text-red-600 font-bold uppercase tracking-wider">
                                                        {t('settings.removeLogo') || 'Remove Logo'}
                                                    </button>
                                                )}
                                                {brandForm.favicon && (
                                                    <button onClick={() => setBrandForm(prev => ({ ...prev, favicon: null }))} className="text-[11px] text-red-500 hover:text-red-600 font-bold uppercase tracking-wider">
                                                        {t('settings.removeFavicon') || 'Remove Favicon'}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* App Header Toggle */}
                                <div className="pt-8 border-t border-slate-100 dark:border-slate-700">
                                    <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                                        <div>
                                            <h3 className="text-sm font-bold text-slate-800 dark:text-white">{t('settings.appHeader')}</h3>
                                            <p className="text-xs text-slate-500">{t('settings.appHeaderDesc')}</p>
                                        </div>
                                        <button
                                            onClick={async () => {
                                                const newVal = !brandForm.hideHeader;
                                                setBrandForm(prev => ({ ...prev, hideHeader: newVal }));
                                                await updateBrand({ ...brand, hideHeader: newVal });
                                            }}
                                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none`}
                                            style={{ backgroundColor: !brandForm.hideHeader ? brand.color : '#e2e8f0' }}
                                        >
                                            <span
                                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${!brandForm.hideHeader ? 'translate-x-6' : 'translate-x-1'}`}
                                            />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'appearance' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                            {/* Theme Selection */}
                            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-8">
                                <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
                                    <Palette className="w-5 h-5 text-[var(--brand-color)]" />
                                    {t('settings.themeOptions')}
                                </h3>

                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                    {[
                                        { id: 'liquid', name: 'Liquid Glass', icon: Droplets, desc: 'Apple macOS style' },
                                        { id: 'light', name: 'Pro Light', icon: Sun, desc: 'Clean & minimal' },
                                        { id: 'dark', name: 'Pro Dark', icon: Moon, desc: 'Deep & elegant' }
                                    ].map((t) => (
                                        <button
                                            key={t.id}
                                            onClick={() => setAppearance({ theme: t.id })}
                                            className={`group relative flex flex-col p-4 rounded-2xl border-2 transition-all text-left ${appearance.theme === t.id ? 'border-accent' : 'border-slate-100 dark:border-slate-700 hover:border-slate-200 dark:hover:border-slate-600'}`}
                                            style={appearance.theme === t.id ? { backgroundColor: 'color-mix(in srgb, var(--accent-color), transparent 90%)' } : {}}
                                        >
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 transition-colors ${appearance.theme === t.id ? 'bg-accent text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'}`}>
                                                <t.icon className="w-6 h-6" />
                                            </div>
                                            <span className="font-bold text-slate-800 dark:text-white">{t.name}</span>
                                            <span className="text-xs text-slate-500 mt-1">{t.desc}</span>
                                            {appearance.theme === t.id && (
                                                <div className="absolute top-3 right-3 w-6 h-6 bg-accent rounded-full flex items-center justify-center shadow-lg border-2 border-white dark:border-slate-800 animate-in zoom-in duration-200">
                                                    <CheckCircle className="w-3.5 h-3.5 text-white" />
                                                </div>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Accent Customization */}
                            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-8">
                                <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-6 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full bg-accent" />
                                        {t('settings.accentCustomization')}
                                    </div>
                                    <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl">
                                        <button
                                            onClick={() => setAppearance({ accentType: 'solid' })}
                                            className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${appearance.accentType === 'solid' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500'}`}
                                        >
                                            {t('settings.solid')}
                                        </button>
                                        <button
                                            onClick={() => setAppearance({ accentType: 'gradient' })}
                                            className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${appearance.accentType === 'gradient' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500'}`}
                                        >
                                            {t('settings.gradient')}
                                        </button>
                                    </div>
                                </h2>

                                <div className="space-y-8">
                                    {appearance.accentType === 'solid' ? (
                                        <div className="flex flex-wrap gap-4 items-center">
                                            {[
                                                '#1e3a5f', '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b', '#10b981', '#06b6d4'
                                            ].map(color => (
                                                <button
                                                    key={color}
                                                    onClick={() => setAppearance({ accentColor: color })}
                                                    className={`w-10 h-10 rounded-full border-4 transition-transform hover:scale-110 ${appearance.accentColor === color ? 'border-white dark:border-slate-800 shadow-xl' : 'border-transparent'}`}
                                                    style={{ backgroundColor: color }}
                                                />
                                            ))}
                                            <div className="h-8 w-[1px] bg-slate-200 dark:bg-slate-700 mx-2" />
                                            <div className="flex items-center gap-3">
                                                <div className="relative group">
                                                    <input
                                                        type="color"
                                                        value={appearance.accentColor}
                                                        onChange={(e) => setAppearance({ accentColor: e.target.value })}
                                                        className="w-10 h-10 rounded-full cursor-pointer border-0 p-0 overflow-hidden bg-transparent"
                                                    />
                                                    <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap">{t('settings.customColor')}</div>
                                                </div>
                                                <span className="font-mono text-sm text-slate-500 uppercase">{appearance.accentColor}</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-6">
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                                {[
                                                    { start: '#8B5CF6', end: '#3B82F6', name: 'Royal' },
                                                    { start: '#F472B6', end: '#FB923C', name: 'Sunset' },
                                                    { start: '#34D399', end: '#3B82F6', name: 'Aurora' },
                                                    { start: '#EC4899', end: '#8B5CF6', name: 'Vibrant' }
                                                ].map((g, idx) => (
                                                    <button
                                                        key={idx}
                                                        onClick={() => setAppearance({ accentGradient: g })}
                                                        className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${appearance.accentGradient.start === g.start && appearance.accentGradient.end === g.end ? 'border-accent' : 'border-slate-100 dark:border-slate-700 hover:border-slate-200'}`}
                                                        style={appearance.accentGradient.start === g.start && appearance.accentGradient.end === g.end ? { backgroundColor: 'color-mix(in srgb, var(--accent-color), transparent 90%)' } : {}}
                                                    >
                                                        <div className="w-10 h-10 rounded-lg" style={{ background: `linear-gradient(135deg, ${g.start}, ${g.end})` }} />
                                                        <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{g.name}</span>
                                                    </button>
                                                ))}
                                            </div>

                                            <div className="pt-6 border-t border-slate-100 dark:border-slate-700">
                                                <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-4">{t('settings.customDualColors')}</p>
                                                <div className="flex items-center gap-8">
                                                    <div className="flex items-center gap-3">
                                                        <input
                                                            type="color"
                                                            value={appearance.accentGradient.start}
                                                            onChange={(e) => setAppearance({ accentGradient: { ...appearance.accentGradient, start: e.target.value } })}
                                                            className="w-10 h-10 rounded-full cursor-pointer border-4 border-white dark:border-slate-800 shadow-lg p-0 overflow-hidden bg-transparent"
                                                        />
                                                        <div className="flex flex-col">
                                                            <span className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">{t('settings.start')}</span>
                                                            <span className="font-mono text-xs text-slate-600 dark:text-slate-400">{appearance.accentGradient.start.toUpperCase()}</span>
                                                        </div>
                                                    </div>
                                                    <div className="w-8 h-0.5 bg-slate-200 dark:bg-slate-700 rounded-full" />
                                                    <div className="flex items-center gap-3">
                                                        <input
                                                            type="color"
                                                            value={appearance.accentGradient.end}
                                                            onChange={(e) => setAppearance({ accentGradient: { ...appearance.accentGradient, end: e.target.value } })}
                                                            className="w-10 h-10 rounded-full cursor-pointer border-4 border-white dark:border-slate-800 shadow-lg p-0 overflow-hidden bg-transparent"
                                                        />
                                                        <div className="flex flex-col">
                                                            <span className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">{t('settings.end')}</span>
                                                            <span className="font-mono text-xs text-slate-600 dark:text-slate-400">{appearance.accentGradient.end.toUpperCase()}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Live Preview Card */}
                            <div className="bg-slate-100 dark:bg-slate-900 rounded-2xl p-8 flex flex-col items-center justify-center min-h-[300px] border border-slate-200 dark:border-slate-800">
                                <p className="text-sm font-bold text-slate-500 mb-8 tracking-widest uppercase">{t('settings.livePreview')}</p>
                                <div className={`w-full max-w-sm p-8 rounded-2xl transition-all glass-panel ${appearance.theme === 'liquid' ? '' : 'bg-white dark:bg-slate-800 shadow-xl'}`}>
                                    <div className="flex justify-between items-center mb-4">
                                        <h4 className="font-bold text-slate-800 dark:text-white">{t('settings.contentLayoutExample')}</h4>
                                        <div className="flex gap-2">
                                            <div className="w-3 h-3 rounded-full bg-red-400"></div>
                                            <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                                            <div className="w-3 h-3 rounded-full bg-green-400"></div>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                                            <div className="h-2 w-3/4 bg-slate-200 dark:bg-slate-700 rounded mb-2"></div>
                                            <div className="h-2 w-1/2 bg-slate-200 dark:bg-slate-700 rounded"></div>
                                        </div>
                                        <div className="flex gap-3">
                                            <button className="px-4 py-2 bg-[var(--brand-color)] text-white rounded-lg text-sm font-medium shadow-lg shadow-[var(--brand-color)]/20">
                                                {t('settings.primaryButton')}
                                            </button>
                                            <button className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg text-sm font-medium">
                                                {t('common.cancel')}
                                            </button>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">{t('settings.toggleSwitch')}</span>
                                            <div className="w-10 h-5 bg-accent rounded-full relative">
                                                <div className="absolute right-1 top-1 w-3 h-3 bg-white rounded-full" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'account' && (
                        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                            <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-6">{t('settings.accountSettings')}</h2>

                            <div className="max-w-xl space-y-6">
                                <div className="flex items-center gap-6 mb-8">
                                    <div className="w-24 h-24 bg-accent/20 rounded-full flex items-center justify-center text-3xl font-bold text-accent overflow-hidden border-4 border-white dark:border-slate-800 shadow-lg">
                                        {currentUser?.photoURL ? (
                                            <ImageWithFallback src={currentUser.photoURL} alt="Avatar" className="w-full h-full" imageClassName="w-full h-full object-cover" />
                                        ) : (
                                            currentUser?.displayName?.charAt(0) || 'U'
                                        )}
                                    </div>
                                    <div>
                                        <label
                                            className="cursor-pointer px-4 py-2 text-white text-sm font-bold rounded-xl shadow-lg transition-all inline-block hover:scale-[1.02] bg-accent"
                                            style={{ boxShadow: `0 10px 15px -3px var(--accent-color)33` }}
                                        >
                                            {t('settings.changeAvatar')}
                                            <input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} />
                                        </label>
                                        <p className="text-xs text-slate-500 mt-2">{t('settings.avatarRecommendedSize')}</p>
                                    </div>
                                </div>

                                <div>
                                    <label htmlFor="displayName" className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">{t('settings.displayName')}</label>
                                    <input
                                        type="text"
                                        id="displayName"
                                        value={displayName}
                                        onChange={(e) => setDisplayName(e.target.value)}
                                        disabled={!isEditingProfile}
                                        className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all disabled:bg-slate-100 dark:disabled:bg-slate-700 disabled:text-slate-500 dark:disabled:text-slate-400"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">{t('settings.username')}</label>
                                    <input
                                        type="text"
                                        value={currentUser?.username || ''}
                                        readOnly
                                        className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-100 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 cursor-not-allowed"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">{t('settings.emailAddress')}</label>
                                    <input
                                        type="email"
                                        value={currentUser?.email || ''}
                                        readOnly
                                        className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-100 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 cursor-not-allowed"
                                    />
                                </div>

                                <div className="flex justify-end pt-4">
                                    {!isEditingProfile ? (
                                        <button
                                            onClick={() => setIsEditingProfile(true)}
                                            className="px-6 py-3 text-white font-bold rounded-xl transition-all shadow-lg bg-accent"
                                            style={{ boxShadow: `0 10px 15px -3px var(--accent-color)33` }}
                                        >
                                            {t('settings.editProfile')}
                                        </button>
                                    ) : (
                                        <div className="flex gap-3">
                                            <button
                                                onClick={() => {
                                                    setDisplayName(currentUser?.displayName || '');
                                                    setIsEditingProfile(false);
                                                }}
                                                className="px-6 py-3 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl transition-colors"
                                            >
                                                {t('common.cancel')}
                                            </button>
                                            <button
                                                onClick={handleSaveProfile}
                                                className="px-6 py-3 text-white font-bold rounded-xl transition-all shadow-lg bg-accent"
                                                style={{ boxShadow: `0 10px 15px -3px var(--accent-color)33` }}
                                            >
                                                {t('settings.saveChanges')}
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <div className="mt-12 pt-8 border-t border-slate-100 dark:border-slate-700">
                                    <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
                                        <Lock className="w-5 h-5 text-accent" />
                                        {t('settings.securitySettings')}
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                                            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-1">{t('settings.password')}</h4>
                                            <p className="text-xs text-slate-500 mb-4 leading-relaxed">{t('settings.passwordDescription')}</p>
                                            <button
                                                onClick={() => setIsChangePasswordOpen(true)}
                                                className="w-full py-2.5 bg-accent text-white text-sm font-bold rounded-xl shadow-lg hover:brightness-110 transition-all"
                                                style={{ boxShadow: `0 4px 10px -2px var(--accent-color)44` }}
                                            >
                                                {t('settings.changePassword')}
                                            </button>
                                        </div>
                                        <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                                            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-1">Two-Factor Authentication</h4>
                                            <p className="text-xs text-slate-500 mb-4 leading-relaxed">Add an extra layer of protection to your profile.</p>
                                            <button
                                                className="w-full py-2.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-bold rounded-xl hover:bg-slate-300 dark:hover:bg-slate-600 transition-all"
                                            >
                                                {t('settings.enable2fa')}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'users' && (
                        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-xl font-bold text-slate-800 dark:text-white">{t('settings.users')}</h2>
                                <button
                                    onClick={handleOpenAddUser}
                                    className="flex items-center gap-2 px-4 py-2 text-white font-medium rounded-xl transition-colors shadow-lg bg-accent"
                                    style={{ boxShadow: `0 10px 15px -3px var(--accent-color)33` }}
                                >
                                    <Plus className="w-5 h-5" /> {t('settings.addUser')}
                                </button>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                                    <thead>
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{t('settings.table.user')}</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{t('settings.table.email')}</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{t('settings.table.role')}</th>
                                            <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">{t('common.actions')}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                        {users.map((user) => (
                                            <tr key={user._id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                                <td className="px-4 py-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex-shrink-0 border-2 border-white dark:border-slate-700 shadow-sm">
                                                            {user.photoURL ? (
                                                                <ImageWithFallback src={user.photoURL} alt={user.displayName} className="w-full h-full" imageClassName="w-full h-full object-cover" />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center bg-accent text-white font-bold">
                                                                    {user.displayName?.charAt(0) || user.username?.charAt(0) || 'U'}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div>
                                                            <div className="text-sm font-bold text-slate-900 dark:text-white">{user.displayName}</div>
                                                            <div className="text-xs text-slate-500">@{user.username}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300">{user.email}</td>
                                                <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300">
                                                    <span className={`px-2 py-1 rounded-lg text-xs font-bold ${user.role === 'Admin' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'}`}>
                                                        {user.role}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            onClick={() => handleOpenEditUser(user)}
                                                            className="p-2 text-accent hover:bg-accent/10 rounded-lg transition-all"
                                                        >
                                                            <Edit className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteUser(user._id)}
                                                            className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}


                </div>
            </div>

            {/* Add/Edit User Modal */}
            {
                isAddUserModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in zoom-in duration-200">
                        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-6">
                            <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-4">
                                {editingUser ? t('settings.editUser') : t('settings.addNewUser')}
                            </h3>
                            <form onSubmit={handleUserSubmit} className="space-y-4">
                                <input required placeholder={t('settings.placeholders.displayName')} value={userForm.displayName} onChange={e => setUserForm({ ...userForm, displayName: e.target.value })} className="w-full p-3 border rounded-xl dark:bg-slate-900 dark:border-slate-700 dark:text-white outline-none" />
                                <input required placeholder={t('settings.placeholders.username')} value={userForm.username} onChange={e => setUserForm({ ...userForm, username: e.target.value })} className="w-full p-3 border rounded-xl dark:bg-slate-900 dark:border-slate-700 dark:text-white outline-none" />
                                <input required placeholder={t('settings.placeholders.email')} type="email" value={userForm.email} onChange={e => setUserForm({ ...userForm, email: e.target.value })} className="w-full p-3 border rounded-xl dark:bg-slate-900 dark:border-slate-700 dark:text-white outline-none" />
                                <select value={userForm.role} onChange={e => setUserForm({ ...userForm, role: e.target.value })} className="w-full p-3 border rounded-xl dark:bg-slate-900 dark:border-slate-700 dark:text-white outline-none">
                                    <option value="Manager">Manager</option>
                                    <option value="Staff">Staff</option>
                                    <option value="Admin">Admin</option>
                                </select>
                                <input placeholder={editingUser ? t('settings.placeholders.passwordKeep') : t('settings.placeholders.password')} type="password" value={userForm.password} onChange={e => setUserForm({ ...userForm, password: e.target.value })} className="w-full p-3 border rounded-xl dark:bg-slate-900 dark:border-slate-700 dark:text-white outline-none" required={!editingUser} />

                                <div className="flex gap-3 mt-6">
                                    <button type="button" onClick={() => setIsAddUserModalOpen(false)} className="flex-1 py-3 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-colors">{t('common.cancel')}</button>
                                    <button type="submit"
                                        className="flex-1 py-3 text-white font-bold rounded-xl transition-colors shadow-lg bg-accent"
                                        style={{ boxShadow: `0 10px 15px -3px var(--accent-color)33` }}
                                    >
                                        {editingUser ? t('settings.updateUser') : t('settings.createUser')}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

            {/* Change Password Modal */}
            {
                isChangePasswordOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in zoom-in duration-200">
                        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-6">
                            <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-4">{t('settings.changePassword')}</h3>
                            <form onSubmit={(e) => { e.preventDefault(); addToast(t('settings.toasts.passwordChanged'), "success"); setIsChangePasswordOpen(false); }} className="space-y-4">
                                <input required placeholder={t('settings.placeholders.currentPassword')} type="password" className="w-full p-3 border rounded-xl dark:bg-slate-900 dark:border-slate-700 dark:text-white outline-none" />
                                <input required placeholder={t('settings.placeholders.newPassword')} type="password" className="w-full p-3 border rounded-xl dark:bg-slate-900 dark:border-slate-700 dark:text-white outline-none" />
                                <input required placeholder={t('settings.placeholders.confirmPassword')} type="password" className="w-full p-3 border rounded-xl dark:bg-slate-900 dark:border-slate-700 dark:text-white outline-none" />

                                <div className="flex gap-3 mt-6">
                                    <button type="button" onClick={() => setIsChangePasswordOpen(false)} className="flex-1 py-3 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-colors">{t('common.cancel')}</button>
                                    <button type="submit"
                                        className="flex-1 py-3 text-white font-bold rounded-xl transition-colors shadow-lg bg-accent"
                                        style={{ boxShadow: `0 10px 15px -3px var(--accent-color)33` }}
                                    >{t('settings.changePassword')}</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }
            {croppingImage && (
                <ImageCropperModal
                    image={croppingImage}
                    onCrop={handleCropComplete}
                    onClose={() => { setCroppingImage(null); setCropType(null); }}
                    aspect={1}
                />
            )}
        </Layout >
    );
};

export default Settings;
