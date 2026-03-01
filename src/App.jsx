import React, { Suspense, lazy } from 'react';
import { BrowserRouter, HashRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { InventoryProvider, useInventory } from './context/InventoryContext';
import { AuthProvider, useAuth } from './context/AuthContext';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Products = lazy(() => import('./pages/Products'));
const Orders = lazy(() => import('./pages/Orders'));
const Customers = lazy(() => import('./pages/Customers'));
const ProductPicture = lazy(() => import('./pages/ProductPicture'));
const Settings = lazy(() => import('./pages/Settings'));
const Expenses = lazy(() => import('./pages/Expenses'));
const Purchases = lazy(() => import('./pages/Purchases'));
const Login = lazy(() => import('./pages/Login'));

const FullScreenLoading = () => (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="h-10 w-10 rounded-full border-4 border-slate-300 border-t-slate-500 animate-spin" />
    </div>
);

const getPersistedRole = () => {
    try {
        return localStorage.getItem('inventory.userRole') || '';
    } catch (_) {
        return '';
    }
};

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

const RoleRoute = ({ roles, children }) => {
    const { currentUser, settingsLoading, settingsUserResolved } = useInventory();
    const { user: authUser } = useAuth();
    const persistedRole = getPersistedRole();
    const isResolvingUser = Boolean(authUser) && !settingsUserResolved;
    const effectiveRole = currentUser?.role || persistedRole || '';
    const isLocalDev = typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname);

    if ((settingsLoading || isResolvingUser) && !persistedRole) return <FullScreenLoading />;

    // Localhost fallback: if auth exists but user-role document has not resolved,
    // do not hard-block route access during local development.
    if (!effectiveRole && isLocalDev && authUser) {
        return children;
    }

    if (!roles.includes(effectiveRole)) {
        return <Navigate to="/orders" replace />;
    }

    return children;
};

function App() {
    const isDesktopRuntime = typeof window !== 'undefined' && (window.desktopAPI?.isDesktop || window.location?.protocol === 'file:');
    const Router = isDesktopRuntime ? HashRouter : BrowserRouter;

    return (
        <AuthProvider>
            <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                <Suspense fallback={<FullScreenLoading />}>
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
                                <Route path="/" element={<RoleRoute roles={['Admin', 'Manager']}><Dashboard /></RoleRoute>} />
                                <Route path="/products" element={<RoleRoute roles={['Admin', 'Manager']}><Products /></RoleRoute>} />
                                <Route path="/orders" element={<Orders />} />
                                <Route path="/expenses" element={<RoleRoute roles={['Admin', 'Manager']}><Expenses /></RoleRoute>} />
                                <Route path="/purchases" element={<RoleRoute roles={['Admin', 'Manager']}><Purchases /></RoleRoute>} />
                                <Route path="/customers" element={<Customers />} />
                                <Route path="/product-picture" element={<RoleRoute roles={['Admin', 'Manager']}><ProductPicture /></RoleRoute>} />
                                <Route path="/settings" element={<Settings />} />
                            </Route>
                        </Route>

                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </Suspense>
            </Router>
        </AuthProvider>
    );
}

export default App;
