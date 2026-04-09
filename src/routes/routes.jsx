import { Route } from 'react-router-dom';
import { useNavigate } from "react-router-dom";
import MainTemplate from '../components/templates/MainTemplate';
import AuthTemplate from '../components/templates/AuthTemplate';
import PageMaintenance from '../pages/errors/page_maintenance';

import { lazy } from 'react';
const Login = lazy(() => import("../pages/auth/LoginPage"));
const RecoveryPassword = lazy(() => import("../pages/auth/RecoveryPasswordPage"));
const Page404 = lazy(() => import("../pages/errors/page_404"));
const ResetPassword = lazy(() => import("../pages/auth/ResetPassword"));
const BankReconciliation = lazy(() => import("../pages/cash-and-banks/bank-reconciliation/index.jsx"));

import PageLoad from '../pages/errors/page_load';

import { useState, useEffect, Suspense } from 'react';
import { getMenu, COMPONENT_MAP } from '../utils/map_menu';

import { useDispatch, useSelector } from 'react-redux';

export const refreshMenu = () => async (dispatch) => {
    const menuModules = await getMenu();
    dispatch({ type: "SET_MODULES", payload: menuModules });
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

            <Route path="*" element={
                <Suspense fallback={<PageLoad />}>
                    <Page404 />
                </Suspense>
            } />

            
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

    console.log("menu", menu);
    console.log("fullPath", fullPath);

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