import { Route } from 'react-router-dom';
import { useNavigate } from "react-router-dom";
import MainTemplate from '../components/templates/MainTemplate';
import AuthTemplate from '../components/templates/AuthTemplate';

import { lazy } from 'react';
const Login = lazy(() => import("../pages/auth/LoginPage"));
const RecoveryPassword = lazy(() => import("../pages/auth/RecoveryPasswordPage"));
const Page404 = lazy(() => import("../pages/errors/page_404"));
const ResetPassword = lazy(() => import("../pages/auth/ResetPassword"));

import { useState, useEffect, Suspense } from 'react';
import { getMenu } from '../utils/map_menu';

import { useDispatch, useSelector } from 'react-redux';

export const RenderRoutes = () => {
    
    const dispatch = useDispatch();
    const [modules, setModules] = useState([]);
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
                setModules(menuModules);
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
                        <Suspense fallback={null}>
                            <Login />
                        </Suspense>
                    }
                />

                <Route
                    path="/forgot-password"
                    element={
                        <Suspense fallback={null}>
                            <RecoveryPassword />
                        </Suspense>
                    }
                />
                <Route
                    path="/reset-password/:token"
                    element={
                        <Suspense fallback={null}>
                            <ResetPassword />
                        </Suspense>
                    }
                />
            </Route>

            {
                modules.length > 0 && (
                    <Route element={<MainTemplate modules={modules} />}>
                        {modules.flatMap(module =>
                            module.menus.flatMap(menu => renderMenuRoutesFlat(menu, module.url))
                        )}
                    </Route>
                )
            }

            <Route path="*" element={
                <Suspense fallback={null}>
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

    const routes = [
        <Route
            key={fullPath}
            path={fullPath}
            element={<menu.component />}
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