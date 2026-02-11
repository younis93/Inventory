import React from 'react';
import { Search, Bell, Sun, User, Menu } from 'lucide-react';
import { useInventory } from '../context/InventoryContext';

const Header = ({ title }) => {
    const { currentUser, toggleMobileMenu, theme, toggleTheme } = useInventory();

    return (
        <header className="h-24 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 md:px-8 sticky top-0 z-20 transition-all duration-300">
            <div className="flex items-center gap-4">
                {/* Mobile Menu Toggle */}
                <button
                    onClick={toggleMobileMenu}
                    className="p-2 lg:hidden text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                >
                    <Menu className="w-6 h-6" />
                </button>

                <div>
                    <h2 className="text-xl md:text-2xl font-black text-slate-800 dark:text-white tracking-tight truncate max-w-[150px] md:max-w-none">{title}</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium hidden md:block">Welcome back, {currentUser?.displayName?.split(' ')[0] || 'Admin'}</p>
                </div>
            </div>

            <div className="flex items-center gap-2 md:gap-6">
                {/* Theme Toggle */}
                <button
                    onClick={() => toggleTheme(theme === 'dark' ? 'light' : 'dark')}
                    className="p-2.5 text-slate-400 hover:text-[var(--brand-color)] hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-all group"
                    title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                >
                    {theme === 'dark' ? (
                        <Sun className="w-5 h-5 group-hover:rotate-45 transition-transform" />
                    ) : (
                        <svg className="w-5 h-5 group-hover:-rotate-12 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                        </svg>
                    )}
                </button>

                {/* Notifications */}
                <button className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-all relative group">
                    <Bell className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-slate-900 animate-pulse"></span>
                </button>

                <div className="w-px h-8 bg-slate-200 dark:bg-slate-700 mx-1 hidden min-[400px]:block"></div>

                <button className="flex items-center gap-2 p-1 md:p-1.5 md:pr-3 rounded-full hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-700">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm shadow-md overflow-hidden shrink-0">
                        {currentUser?.photoURL ? (
                            <img src={currentUser.photoURL} alt="User" className="w-full h-full object-cover" />
                        ) : (
                            currentUser?.displayName?.charAt(0) || 'A'
                        )}
                    </div>
                    <span className="hidden sm:block text-sm font-bold text-slate-700 dark:text-slate-300 truncate max-w-[80px]">
                        {currentUser?.displayName?.split(' ')[0] || 'Admin'}
                    </span>
                </button>
            </div>
        </header>
    );
};

export default Header;
