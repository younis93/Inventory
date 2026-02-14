import React from 'react';
import { Search, Bell, Sun, User, Menu } from 'lucide-react';
import { useInventory } from '../context/InventoryContext';

const Header = ({ title }) => {
    const { currentUser, toggleMobileMenu, theme, toggleTheme, brand } = useInventory();
    const isHidden = brand.hideHeader;

    return (
        <header className={`${isHidden ? 'lg:hidden' : 'flex'} h-24 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 md:px-8 sticky top-0 z-20 transition-all duration-300`}>
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

                {/* Notifications Dropdown */}
                <div className="relative group">
                    <button className="p-2.5 text-slate-400 hover:text-accent hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-all relative group">
                        <Bell className="w-5 h-5 group-hover:scale-110 transition-transform" />
                        <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-slate-900 animate-pulse"></span>
                    </button>

                    {/* Professional Dropdown */}
                    <div className="absolute top-full right-0 mt-2 w-80 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[100] overflow-hidden translate-y-2 group-hover:translate-y-0">
                        <div className="px-5 py-4 border-b border-slate-50 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                            <h3 className="font-bold text-sm text-slate-800 dark:text-white uppercase tracking-wider">Activity Logs</h3>
                            <span className="text-[10px] font-black bg-accent text-white px-2 py-0.5 rounded-full">New</span>
                        </div>
                        <div className="max-h-80 overflow-y-auto custom-scrollbar">
                            {[
                                { title: 'New Customer', desc: 'Sami Ahmed joined the database', time: '2m ago', icon: '👤', color: 'bg-blue-50 text-blue-600' },
                                { title: 'Order Completed', desc: 'Order #ORD-8829 was delivered', time: '15m ago', icon: '✅', color: 'bg-emerald-50 text-emerald-600' },
                                { title: 'Low Stock Alert', desc: 'iPhone 15 Pro is below 5 units', time: '1h ago', icon: '⚠️', color: 'bg-amber-50 text-amber-600' }
                            ].map((note, i) => (
                                <div key={i} className="px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer border-b last:border-0 border-slate-50 dark:border-slate-700/50">
                                    <div className="flex gap-4">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${note.color}`}>
                                            {note.icon}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex justify-between items-start mb-0.5">
                                                <p className="font-bold text-xs text-slate-800 dark:text-white uppercase tracking-tighter">{note.title}</p>
                                                <span className="text-[10px] text-slate-400 font-bold">{note.time}</span>
                                            </div>
                                            <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">{note.desc}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="px-5 py-3 border-t border-slate-50 dark:border-slate-700 text-center">
                            <button className="text-[10px] font-black text-accent uppercase tracking-widest hover:brightness-110 transition-all">View All Activity</button>
                        </div>
                    </div>
                </div>

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
