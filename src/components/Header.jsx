import React from 'react';
import { Menu } from 'lucide-react';
import { useInventory } from '../context/InventoryContext';
import { useTranslation } from 'react-i18next';

const Header = ({ title }) => {
    const { t } = useTranslation();
    const { currentUser, toggleMobileMenu, isModalOpen, appearance, brand } = useInventory();
    const isHidden = brand.hideHeader;
    const isGlassTheme = ['liquid', 'default_glass'].includes(appearance?.theme);

    // Determine if header should be hidden
    // hide entirely when a modal is open to maximize screen space
    const visibilityClass = isModalOpen ? 'hidden' : (isHidden ? 'flex lg:hidden' : 'flex');

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
                </div>
            </div>

            <div />
        </header>
    );
};

export default Header;
