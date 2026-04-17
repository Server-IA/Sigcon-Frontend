import { Route } from 'react-router-dom';
import { useNavigate, useLocation } from "react-router-dom";
import MainTemplate from '../components/templates/MainTemplate';
import AuthTemplate from '../components/templates/AuthTemplate';
import PageMaintenance from '../pages/errors/page_maintenance';

import { lazy } from 'react';
const Login = lazy(() => import("../pages/auth/LoginPage"));
const RecoveryPassword = lazy(() => import("../pages/auth/RecoveryPasswordPage"));
const Page404 = lazy(() => import("../pages/errors/page_404"));
const Page403 = lazy(() => import("../pages/errors/page_403"));
const ResetPassword = lazy(() => import("../pages/auth/ResetPassword"));
const BankReconciliation = lazy(() => import("../pages/cash-and-banks/bank-reconciliation/index.jsx"));

import PageLoad from '../pages/errors/page_load';

import { useState, useEffect, Suspense } from 'react';
import { getMenu, getAllSystemMenuPaths, COMPONENT_MAP } from '../utils/map_menu';

import { useDispatch, useSelector } from 'react-redux';

export const refreshMenu = () => async (dispatch) => {
    const menuModules = await getMenu();
    dispatch({ type: "SET_MODULES", payload: menuModules });
};

/**
 * Componente que distingue entre 403 (sin permisos) y 404 (no existe).
 * Si la ruta existe en el sistema pero el usuario no tiene acceso, muestra 403.
 */
const CatchAllRoute = () => {
    const location = useLocation();
    const user = useSelector(state => state.user).user;
    const allSystemPaths = useSelector(state => state.modules.allSystemPaths ?? []);

    if (user && allSystemPaths.length > 0) {
        const currentPath = location.pathname.replace(/\/+$/, '').toLowerCase();
        const isSystemRoute = allSystemPaths.some(path =>
            currentPath === path.toLowerCase() || currentPath.startsWith(path.toLowerCase() + '/')
        );
        if (isSystemRoute) {
            return <Suspense fallback={<PageLoad />}><Page403 /></Suspense>;
        }
    }
    return <Suspense fallback={<PageLoad />}><Page404 /></Suspense>;
};

export const RenderRoutes = () => {

    const dispatch = useDispatch();
    const modules = useSelector(state => state.modules.modules ?? []);
    const [routesReady, setRoutesReady] = useState(false);

    useEffect(() => {
        const init = async () => {
            const user = localStorage.getItem('user');
            const token = localStorage.getItem('token');

            if (user) {
                const userData = JSON.parse(user);

                dispatch({ type: "SET_USER", payload: userData });
                dispatch({ type: "SET_TOKEN", payload: token });

                const menuModules = await getMenu();
                dispatch({ type: "SET_MODULES", payload: menuModules });

                const systemPaths = await getAllSystemMenuPaths();
                dispatch({ type: "SET_ALL_SYSTEM_PATHS", payload: systemPaths });
            }

            setRoutesReady(true);
        };

        init();
    }, [dispatch]);

    if (!routesReady) {
        return null;
    }

    return (
        <>
            {/* Auth Routes */}
            <Route element={<AuthTemplate />}>
                <Route
                    path="/login"
                    element={
                        <Suspense fallback={<PageLoad />}>
                            <Login />
                        </Suspense>
                    }
                />

                <Route
                    path="/forgot-password"
                    element={
                        <Suspense fallback={<PageLoad />}>
                            <RecoveryPassword />
                        </Suspense>
                    }
                />
                <Route
                    path="/reset-password/:token"
                    element={
                        <Suspense fallback={<PageLoad />}>
                            <ResetPassword />
                        </Suspense>
                    }
                />
            </Route>

            {
                modules.length > 0 && (
                    <Route element={<MainTemplate />}>
                        {modules.flatMap(module =>
                            module.menus.flatMap(menu => renderMenuRoutesFlat(menu, module.url))
                        )}
                        <Route
                            path="cash-and-banks/bank-reconciliation/:bankAccountId"
                            element={
                                <Suspense fallback={<PageLoad />}>
                                    <BankReconciliation />
                                </Suspense>
                            }
                        />
                    </Route>
                )
            }

            <Route path="*" element={<CatchAllRoute />} />

            
        </>
    )
}

const renderMenuRoutesFlat = (menu, parentPath = "") => {
    const rawPath = menu?.path ?? menu?.url ?? "";

    const fullPath = rawPath
        ? `/${[parentPath, rawPath].filter(Boolean).join("/")}`
        : `/${parentPath}`;

    const component = COMPONENT_MAP.find(c => c.id === menu.componentName);
    
    const ComponentResolved =
        component?.component
        || PageMaintenance;

    const routes = [
        <Route
            key={fullPath}
            path={fullPath}
            element={<ComponentResolved />}
        />
    ];

    if (menu.childrens?.length) {
        menu.childrens.forEach(child => {
            routes.push(
                ...renderMenuRoutesFlat(child, fullPath.replace(/^\//, ""))
            );
        });
    }

    return routes;
};