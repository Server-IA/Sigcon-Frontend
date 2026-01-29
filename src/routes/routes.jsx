import { Route } from 'react-router-dom';
import { useNavigate } from "react-router-dom";
import MainTemplate from '../components/templates/MainTemplate';
import AuthTemplate from '../components/templates/AuthTemplate';

import { lazy } from 'react';
const Login = lazy(() => import("../pages/Login/LoginPage"));
const Page404 = lazy(() => import("../pages/errors/page_404"));

import { useState, useEffect, Suspense } from 'react';
import { getMenu } from '../utils/map_menu';

export const RenderRoutes = () => {

    const [modules, setModules] = useState([]);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            getMenu().then(setModules);
        }
    }, []);

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
            </Route>


            <Route element={<MainTemplate modules={modules} />}>
                {modules.map((module) => (
                    <Route key={module.id} path={module.url}>
                        {
                            module.menus.map((menu) => {
                                const Component = menu.component;
                                return (<Route key={menu.id} path={menu.path} element={<Component />} />)
                            })
                        }
                    </Route>
                ))}
            </Route>

            <Route path="*" element={
                <Suspense fallback={null}>
                    <Page404 />
                </Suspense>
            } />

            
        </>
    )
}