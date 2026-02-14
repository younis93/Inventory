import React from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import Toasts from './Toasts';
import { useInventory } from '../context/InventoryContext';

const Layout = ({ children, title }) => {
    const { isSidebarCollapsed, isMobileMenuOpen, closeMobileMenu, brand } = useInventory();

    return (
        <div className="flex h-screen bg-transparent font-sans transition-colors duration-300">
            {/* Mobile Overlay */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-30 lg:hidden animate-in fade-in duration-300"
                    onClick={closeMobileMenu}
                />
            )}

            <Sidebar />

            <div className="flex-1 flex flex-col min-h-screen transition-all duration-300">
                <Header title={title || "Dashboard"} />
                <main className={`flex-1 p-4 md:p-8 overflow-y-auto ${brand.hideHeader ? 'lg:pt-8' : ''}`}>
                    <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {children}
                    </div>
                </main>
                <Toasts />
            </div>
        </div>
    );
};

export default Layout;
