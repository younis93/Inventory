import React from 'react';
import { BrowserRouter, HashRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Orders from './pages/Orders';
import Customers from './pages/Customers';
import ProductPicture from './pages/ProductPicture';
import Settings from './pages/Settings';
import Expenses from './pages/Expenses';
import { InventoryProvider } from './context/InventoryContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';

const FullScreenLoading = () => (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="h-10 w-10 rounded-full border-4 border-slate-300 border-t-slate-500 animate-spin" />
    </div>
);

const RequireAuth = () => {
    const { user, loading } = useAuth();
    const location = useLocation();

    if (loading) return <FullScreenLoading />;
    if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
    return <Outlet />;
};

const PublicOnly = () => {
    const { user, loading } = useAuth();
    if (loading) return <FullScreenLoading />;
    if (user) return <Navigate to="/" replace />;
    return <Outlet />;
};

function App() {
    const isDesktopRuntime = typeof window !== 'undefined' && (window.desktopAPI?.isDesktop || window.location?.protocol === 'file:');
    const Router = isDesktopRuntime ? HashRouter : BrowserRouter;

    return (
        <AuthProvider>
            <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                <Routes>
                    <Route element={<PublicOnly />}>
                        <Route path="/login" element={<Login />} />
                    </Route>

                    <Route element={<RequireAuth />}>
                        <Route
                            element={(
                                <InventoryProvider>
                                    <Outlet />
                                </InventoryProvider>
                            )}
                        >
                            <Route path="/" element={<Dashboard />} />
                            <Route path="/products" element={<Products />} />
                            <Route path="/orders" element={<Orders />} />
                            <Route path="/expenses" element={<Expenses />} />
                            <Route path="/customers" element={<Customers />} />
                            <Route path="/product-picture" element={<ProductPicture />} />
                            <Route path="/settings" element={<Settings />} />
                        </Route>
                    </Route>

                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </Router>
        </AuthProvider>
    );
}

export default App;
