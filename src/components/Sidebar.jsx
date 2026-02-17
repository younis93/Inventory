import React from 'react';
import { LayoutDashboard, Package, ShoppingCart, Settings, Users, Box, X, ChevronLeft, ChevronRight, Image as ImageIcon } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useInventory } from '../context/InventoryContext';
import { useTranslation } from 'react-i18next';

const Sidebar = () => {
    const { t, i18n } = useTranslation();
    const location = useLocation();
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

    const isRTL = language === 'ar';

    const menuItems = [
        { icon: LayoutDashboard, label: t('menu.dashboard'), path: '/' },
        { icon: Box, label: t('menu.inventory'), path: '/products' },
        { icon: ImageIcon, label: t('menu.productPicture'), path: '/product-picture' },
        { icon: ShoppingCart, label: t('menu.orders'), path: '/orders' },
        { icon: Users, label: t('menu.customers'), path: '/customers' },
        { icon: Settings, label: t('menu.settings'), path: '/settings' },
    ];

    // Use explicit left/right classes and transforms to avoid centering issues
    const positionClass = isRTL ? 'right-0 left-auto' : 'left-0 right-auto';
    const widthClass = isSidebarCollapsed ? 'w-20' : 'w-56';
    const mobileHiddenTransform = isRTL ? 'translate-x-full' : '-translate-x-full';
    const sidebarClasses = `fixed lg:static top-0 bottom-0 ${positionClass} border-e z-40 ${widthClass} bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 flex flex-col h-screen transition-all duration-300 ease-in-out ${isMobileMenuOpen ? 'translate-x-0 shadow-2xl' : mobileHiddenTransform + ' lg:translate-x-0'} glass-panel`;

    return (
        <aside className={sidebarClasses}>
            {/* Logo Area */}
            <div className={`h-24 flex items-center ${isSidebarCollapsed ? 'justify-center' : 'px-8'} relative`}>
                <div className="flex items-center gap-3">
                    <div
                        className="w-10 h-10 rounded-full flex items-center justify-center shadow-lg text-white overflow-hidden shrink-0"
                        style={{ backgroundColor: brand.color, boxShadow: `0 10px 15px -3px ${brand.color}33` }}
                    >
                        {brand.logo ? (
                            <img src={brand.logo} alt="Logo" className="w-full h-full object-cover" />
                        ) : (
                            <Box className="w-6 h-6" />
                        )}
                    </div>
                    {!isSidebarCollapsed && (
                        <div className="animate-in fade-in duration-300">
                            <h1 className="font-bold text-slate-800 dark:text-white text-lg leading-tight tracking-tight">
                                {brand.name.split(' ')[0]}<br />
                                <span style={{ color: brand.color }} className="font-extrabold">
                                    {brand.name.split(' ').slice(1).join(' ') || 'APP'}
                                </span>
                            </h1>
                        </div>
                    )}
                </div>

                {/* Mobile Close Button */}
                <button
                    onClick={closeMobileMenu}
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
                        </Link>
                    )
                })}
            </nav>

            {/* Bottom User Section */}
            <div className="p-4 mt-auto border-t border-slate-100 dark:border-slate-800/50">
                <div className={`bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 flex items-center shadow-sm glass-panel ${isSidebarCollapsed ? 'p-2 justify-center' : 'p-4 gap-3'}`}>
                    <div className="relative shrink-0 w-10 h-10">
                        <div
                            className="w-full h-full text-white rounded-full flex items-center justify-center font-bold text-lg overflow-hidden"
                            style={{ backgroundColor: brand.color }}
                        >
                            {currentUser?.photoURL ? (
                                <img src={currentUser.photoURL} alt="User" className="w-full h-full object-cover" />
                            ) : (
                                currentUser?.displayName?.charAt(0) || 'U'
                            )}
                        </div>
                        <div className="absolute bottom-0 end-0 w-3 h-3 bg-emerald-500 border-2 border-white dark:border-slate-800 rounded-full"></div>
                    </div>
                    {!isSidebarCollapsed && (
                        <div className="overflow-hidden animate-in fade-in duration-300">
                            <p className="text-sm font-bold text-slate-800 dark:text-white truncate">{currentUser?.displayName?.split(' ')[0] || t('user.defaultName')}</p>
                            <p className="text-xs text-slate-500 truncate">{currentUser?.role || t('user.defaultRole')}</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Desktop Collapse Toggle Button (Fixed at bottom right of sidebar) */}
            <button
                onClick={toggleSidebar}
                className={`hidden lg:flex absolute bottom-24 ${isRTL ? '-left-3' : '-right-3'} w-6 h-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full items-center justify-center text-slate-400 shadow-sm z-50 transition-all hover:scale-110`}
                style={{ color: brand.color }}
            >
                {isSidebarCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
            </button>
        </aside>
    );
};

export default Sidebar;
