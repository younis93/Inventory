import React from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import Toasts from './Toasts';
import IOSAddToHomePrompt from './IOSAddToHomePrompt';
import { useInventory } from '../context/InventoryContext';

const Layout = ({ children, title, hideHeader, fullWidth }) => {
    const { isSidebarCollapsed, isMobileMenuOpen, closeMobileMenu, brand } = useInventory();

    const shouldHideHeader = hideHeader || brand.hideHeader;

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

            <div className="flex-1 flex flex-col min-h-screen transition-all duration-300 overflow-hidden">
                <Header title={title || "Dashboard"} isHiddenManual={hideHeader} />
                <IOSAddToHomePrompt />
                <main className={`flex-1 ${fullWidth ? 'p-0' : 'p-4 md:p-8'} overflow-y-auto custom-scrollbar ${shouldHideHeader ? 'pt-0' : ''} overflow-x-hidden`}>
                    <div className={`${fullWidth ? '' : 'max-w-7xl mx-auto'} animate-in fade-in slide-in-from-bottom-4 duration-500`}>
                        {children}
                    </div>
                </main>
                <Toasts />
            </div>
        </div>
    );
};

export default Layout;
