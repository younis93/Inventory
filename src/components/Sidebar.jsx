import React, { useEffect, useRef, useState } from 'react';
import { LayoutDashboard, Package, ShoppingCart, Settings, Users, Box, X, ChevronLeft, ChevronRight, Image as ImageIcon, LogOut, UserCog, ChevronUp, Receipt } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useInventory } from '../context/InventoryContext';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';

const Sidebar = () => {
    const { t, i18n } = useTranslation();
    const location = useLocation();
    const navigate = useNavigate();
    const { user: authUser, signOutUser } = useAuth();
    const {
        theme,
        currentUser,
        brand,
        isSidebarCollapsed,
        toggleSidebar,
        isMobileMenuOpen,
        closeMobileMenu,
        language
    } = useInventory();
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
    const profileMenuRef = useRef(null);
    const profileUser = currentUser || authUser;

    const isRTL = language === 'ar';

    const menuItems = [
        { icon: LayoutDashboard, label: t('menu.dashboard'), path: '/', roles: ['Admin', 'Manager'] },
        { icon: Box, label: t('menu.inventory'), path: '/products', roles: ['Admin', 'Manager'] },
        { icon: ImageIcon, label: t('menu.productPicture'), path: '/product-picture', roles: ['Admin', 'Manager'] },
        { icon: ShoppingCart, label: t('menu.orders'), path: '/orders', roles: ['Admin', 'Manager', 'Sales'] },
        { icon: Receipt, label: t('menu.expenses'), path: '/expenses', roles: ['Admin', 'Manager'] },
        { icon: Users, label: t('menu.customers'), path: '/customers', roles: ['Admin', 'Manager', 'Sales'] },
        { icon: Settings, label: t('menu.settings'), path: '/settings', roles: ['Admin', 'Manager', 'Sales'] },
    ].filter(item => !item.roles || item.roles.includes(currentUser?.role || 'Sales'));

    // Use explicit left/right classes and transforms to avoid centering issues
    const positionClass = isRTL ? 'right-0 left-auto' : 'left-0 right-auto';
    const widthClass = isSidebarCollapsed ? 'w-20' : 'w-56';
    const mobileHiddenTransform = isRTL ? 'translate-x-full' : '-translate-x-full';
    const sidebarClasses = `fixed lg:static top-0 bottom-0 ${positionClass} border-e z-40 ${widthClass} bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 flex flex-col h-screen transition-all duration-300 ease-in-out ${isMobileMenuOpen ? 'translate-x-0 shadow-2xl' : mobileHiddenTransform + ' lg:translate-x-0'} glass-panel !bg-white dark:!bg-slate-900`;

    useEffect(() => {
        const onClickOutside = (event) => {
            if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
                setIsProfileMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', onClickOutside);
        return () => document.removeEventListener('mousedown', onClickOutside);
    }, []);

    const handleAccountSettings = () => {
        setIsProfileMenuOpen(false);
        closeMobileMenu();
        navigate('/settings?tab=account');
    };

    const handleLogout = async () => {
        setIsProfileMenuOpen(false);
        try {
            await signOutUser();
            closeMobileMenu();
            navigate('/login', { replace: true });
        } catch (error) {
            console.error('Logout failed:', error);
        }
    };

    return (
        <aside className={sidebarClasses}>
            {/* Logo Area */}
            <div className={`h-24 flex items-center ${isSidebarCollapsed ? 'justify-center' : 'px-8'} relative`}>
                <div className="flex items-center gap-3">
                    <div
                        className="w-10 h-10 rounded-full flex items-center justify-center shadow-lg text-white overflow-hidden shrink-0"
                        style={{
                            backgroundColor: brand.logo ? 'transparent' : 'var(--accent-color)',
                            boxShadow: brand.logo ? 'none' : '0 10px 15px -3px color-mix(in srgb, var(--accent-color), transparent 80%)'
                        }}
                    >
                        {brand.logo ? (
                            <img src={brand.logo} alt="Logo" className="w-full h-full object-cover" />
                        ) : (
                            <Box className="w-6 h-6" />
                        )}
                    </div>
                    {!isSidebarCollapsed && (
                        <div className="animate-in fade-in duration-300">
                            <h1
                                className="font-bold text-lg leading-tight tracking-tight"
                                style={{ color: brand.color }}
                            >
                                {brand.name.split(' ')[0]}<br />
                                <span className="font-extrabold opacity-95">
                                    {brand.name.split(' ').slice(1).join(' ') || 'APP'}
                                </span>
                            </h1>
                        </div>
                    )}
                </div>

                {/* Mobile Close Button */}
                <button
                    onClick={closeMobileMenu}
                    aria-label={t('common.close') || 'Close menu'}
                    className={`lg:hidden absolute top-6 ${isRTL ? 'left-4' : 'right-4'} p-2 text-slate-400 hover:text-red-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors`}
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-2 custom-scrollbar">
                {!isSidebarCollapsed && (
                    <div className="mb-4 px-4">
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{t('menu.mainMenu')}</p>
                    </div>
                )}

                {menuItems.map((item) => {
                    const isActive = location.pathname === item.path;
                    return (
                        <Link
                            key={item.path}
                            to={item.path}
                            aria-label={item.label}
                            title={isSidebarCollapsed ? item.label : ''}
                            onClick={closeMobileMenu}
                            className={`flex items-center gap-3 rounded-xl transition-all duration-200 group relative overflow-hidden ${isSidebarCollapsed ? 'justify-center p-3' : 'px-4 py-3.5'
                                } ${isActive
                                    ? 'text-white shadow-lg bg-accent shadow-accent'
                                    : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-400 dark:hover:text-white'
                                }`}
                        >
                            <item.icon className={`w-5 h-5 relative z-10 transition-transform duration-200 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
                            {!isSidebarCollapsed && (
                                <span className="font-medium relative z-10 animate-in fade-in slide-in-from-start-2 duration-300">
                                    {item.label}
                                </span>
                            )}
                            {isSidebarCollapsed && (
                                <span className={`pointer-events-none absolute top-1/2 -translate-y-1/2 ${isRTL ? 'right-[calc(100%+12px)]' : 'left-[calc(100%+12px)]'} whitespace-nowrap rounded-lg bg-slate-900 text-white text-[11px] font-bold px-2.5 py-1.5 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity shadow-lg z-30`}>
                                    {item.label}
                                </span>
                            )}
                        </Link>
                    )
                })}
            </nav>

            {/* Bottom User Section */}
            <div className="p-4 mt-auto border-t border-slate-100 dark:border-slate-800/50">
                <div className="relative" ref={profileMenuRef}>
                    <button
                        type="button"
                        onClick={() => setIsProfileMenuOpen(prev => !prev)}
                        aria-label={t('settings.accountSettings') || 'Account settings'}
                        aria-haspopup="menu"
                        aria-expanded={isProfileMenuOpen}
                        className={`w-full bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 flex items-center shadow-sm glass-panel transition-all hover:border-slate-300 dark:hover:border-slate-600 !bg-white dark:!bg-slate-800 ${isSidebarCollapsed ? 'p-2 justify-center' : 'p-4 gap-3'}`}
                    >
                        <div className="relative shrink-0 w-10 h-10">
                            <div
                                className="w-full h-full text-white rounded-full flex items-center justify-center font-bold text-lg overflow-hidden"
                                style={{ backgroundColor: 'var(--accent-color)' }}
                            >
                                {profileUser?.photoURL ? (
                                    <img src={profileUser.photoURL} alt="User" className="w-full h-full object-cover" />
                                ) : (
                                    profileUser?.displayName?.charAt(0) || 'U'
                                )}
                            </div>
                            <div className="absolute bottom-0 end-0 w-3 h-3 bg-emerald-500 border-2 border-white dark:border-slate-800 rounded-full"></div>
                        </div>
                        {!isSidebarCollapsed && (
                            <div className="flex-1 overflow-hidden text-left animate-in fade-in duration-300">
                                <p className="text-sm font-bold text-slate-800 dark:text-white truncate">{profileUser?.displayName?.split(' ')[0] || t('user.defaultName')}</p>
                                <p className="text-xs text-slate-500 truncate">{currentUser?.role || profileUser?.email || t('user.defaultRole')}</p>
                            </div>
                        )}
                        {!isSidebarCollapsed && <ChevronUp className={`w-4 h-4 text-slate-400 transition-transform ${isProfileMenuOpen ? 'rotate-180' : ''}`} />}
                    </button>

                    {isProfileMenuOpen && !isSidebarCollapsed && (
                        <div className="absolute bottom-full mb-2 left-0 right-0 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-2xl overflow-hidden z-50">
                            <button
                                type="button"
                                onClick={handleAccountSettings}
                                aria-label={t('settings.accountSettings') || 'Account settings'}
                                className="w-full flex items-center gap-2 px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors"
                            >
                                <UserCog className="w-4 h-4" />
                                <span>{t('settings.accountSettings') || 'Account Settings'}</span>
                            </button>
                            <button
                                type="button"
                                onClick={handleLogout}
                                aria-label={t('menu.logout') || 'Log out'}
                                className="w-full flex items-center gap-2 px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors border-t border-slate-100 dark:border-slate-700"
                            >
                                <LogOut className="w-4 h-4" />
                                <span>{t('menu.logout') || 'Log out'}</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Desktop Collapse Toggle Button (Fixed at bottom right of sidebar) */}
            <button
                type="button"
                onClick={toggleSidebar}
                aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                className={`hidden lg:flex absolute bottom-24 ${isRTL ? '-left-3' : '-right-3'} w-6 h-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full items-center justify-center text-slate-400 shadow-sm z-50 transition-all hover:scale-110`}
                style={{ color: 'var(--accent-color)' }}
            >
                {isSidebarCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
            </button>
        </aside>
    );
};

export default Sidebar;
