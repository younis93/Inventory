import React from 'react';
import { Bell, Sun, Menu, Moon } from 'lucide-react';
import { useInventory } from '../context/InventoryContext';
import { useTranslation } from 'react-i18next';

const Header = ({ title }) => {
    const { t } = useTranslation();
    const { currentUser, toggleMobileMenu, theme, toggleTheme, brand, isModalOpen, language, appearance, isOnline, pendingSyncCount, isDesktop } = useInventory();
    const isHidden = brand.hideHeader;
    const isRTL = language === 'ar';
    const isGlassTheme = ['liquid', 'default_glass'].includes(appearance?.theme);

    // Determine if header should be hidden
    const visibilityClass = isModalOpen ? 'hidden' : (isHidden ? 'flex lg:hidden' : 'flex');

    // Handle theme toggle - cycles through light/dark based on current theme
    const handleThemeToggle = () => {
        if (theme === 'dark') {
            toggleTheme('light');
        } else {
            toggleTheme('dark');
        }
    };

    return (
        <header className={`${visibilityClass} h-14 sm:h-16 md:h-20 lg:h-24 ${isGlassTheme
                ? 'bg-white/60 dark:bg-slate-900/60 backdrop-blur-2xl border-b border-white/20 dark:border-slate-700/30'
                : 'bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800'
            } items-center justify-between px-3 sm:px-4 md:px-6 lg:px-8 sticky top-0 z-20 transition-all duration-300 shadow-sm`}>

            {/* Left Section: Menu + Title */}
            <div className="flex items-center gap-2 sm:gap-3 md:gap-4 flex-1 min-w-0 overflow-hidden">
                {/* Mobile Menu Toggle */}
                <button
                    onClick={toggleMobileMenu}
                    className={`lg:hidden p-1.5 sm:p-2 rounded-xl transition-all shrink-0 ${isGlassTheme
                            ? 'text-slate-600 dark:text-slate-300 hover:bg-white/40 dark:hover:bg-slate-800/40 backdrop-blur-sm'
                            : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                    aria-label="Toggle menu"
                >
                    <Menu className="w-5 h-5 sm:w-5.5 sm:h-5.5 md:w-6 md:h-6" />
                </button>

                {/* Title Section */}
                <div className="flex flex-col min-w-0 flex-1 overflow-hidden">
                    <h2 className="text-sm sm:text-base md:text-xl lg:text-2xl font-black text-slate-800 dark:text-white tracking-tight truncate">
                        {title}
                    </h2>
                    <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium hidden md:block truncate">
                        {t('header.welcome')} {currentUser?.displayName?.split(' ')[0] || t('header.admin')}
                    </p>
                </div>
            </div>

            {/* Right Section: Actions + Brand */}
            <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 lg:gap-4 shrink-0">
                {/* Theme Toggle */}
                <button
                    onClick={handleThemeToggle}
                    className={`p-1.5 sm:p-2 rounded-xl transition-all group ${isGlassTheme
                            ? 'text-slate-600 dark:text-slate-300 hover:bg-white/40 dark:hover:bg-slate-800/40 backdrop-blur-sm'
                            : 'text-slate-400 hover:text-[var(--brand-color)] hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                    aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                >
                    {theme === 'dark' ? (
                        <Sun className="w-4 h-4 sm:w-4.5 sm:h-4.5 md:w-5 md:h-5 group-hover:rotate-45 transition-transform duration-300" />
                    ) : (
                        <Moon className="w-4 h-4 sm:w-4.5 sm:h-4.5 md:w-5 md:h-5 group-hover:-rotate-12 transition-transform duration-300" />
                    )}
                </button>

                {/* Notifications - Hidden on mobile, shown on tablet+ */}
                <button
                    className={`hidden md:flex p-1.5 sm:p-2 rounded-xl transition-all relative ${isGlassTheme
                            ? 'text-slate-600 dark:text-slate-300 hover:bg-white/40 dark:hover:bg-slate-800/40 backdrop-blur-sm'
                            : 'text-slate-400 hover:text-accent hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                    aria-label="Notifications"
                >
                    <Bell className="w-4 h-4 sm:w-4.5 sm:h-4.5 md:w-5 md:h-5" />
                    <span className="absolute top-1 sm:top-1.5 right-1 sm:right-1.5 w-1.5 h-1.5 sm:w-2 sm:h-2 bg-red-500 rounded-full border border-white dark:border-slate-900 animate-pulse"></span>
                </button>

                {/* Divider - Hidden on mobile */}
                <div className="w-px h-5 sm:h-6 md:h-7 lg:h-8 bg-slate-200 dark:bg-slate-700/50 mx-0.5 sm:mx-1 hidden md:block"></div>

                {isDesktop && (
                    <div className={`hidden md:flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-bold border ${isOnline
                            ? 'text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-300 dark:bg-emerald-900/20 dark:border-emerald-800/50'
                            : 'text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-300 dark:bg-amber-900/20 dark:border-amber-800/50'
                        }`}>
                        <span>{isOnline ? 'Online' : 'Offline'}</span>
                        <span className="text-slate-400">|</span>
                        <span>{pendingSyncCount} pending</span>
                    </div>
                )}

                {/* Brand Icon */}
                <div
                    className={`relative w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 lg:w-11 lg:h-11 rounded-xl md:rounded-2xl flex items-center justify-center text-white font-bold overflow-hidden shrink-0 transition-all duration-300 hover:scale-105 cursor-pointer ${isGlassTheme
                            ? 'shadow-lg border-2 border-white/30 dark:border-slate-700/30'
                            : 'shadow-md border-2 border-white/50 dark:border-slate-800/50'
                        }`}
                    style={{
                        backgroundColor: brand.color,
                        boxShadow: isGlassTheme
                            ? `0 8px 24px -8px ${brand.color}66, 0 0 0 1px ${brand.color}22`
                            : `0 8px 16px -4px ${brand.color}44`
                    }}
                >
                    {brand.logo ? (
                        <img src={brand.logo} alt="Brand" className="w-full h-full object-cover" />
                    ) : (
                        <div className="text-[10px] sm:text-xs md:text-sm uppercase font-black tracking-wider">
                            {brand.name?.charAt(0) || 'A'}
                        </div>
                    )}

                    <div className={`absolute -bottom-0.5 -right-0.5 sm:bottom-0 sm:right-0 w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full border-2 border-white dark:border-slate-900 shadow-sm hidden sm:block ${isOnline ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
                </div>

                {/* Desktop User Info */}
                <div className="hidden lg:flex flex-col min-w-0 max-w-[120px]">
                    <span className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-tight leading-none truncate">
                        {currentUser?.displayName?.split(' ')[0] || 'Admin'}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 truncate">
                        {currentUser?.role || 'Manager'}
                    </span>
                </div>
            </div>
        </header>
    );
};

export default Header;
