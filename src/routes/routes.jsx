import { Route } from 'react-router-dom';
import MainTemplate from '../components/templates/MainTemplate';
import AuthTemplate from '../components/templates/AuthTemplate';

import Login from "../pages/Login/LoginPage";

import Page404 from '../pages/errors/page_404';
import { useState, useEffect } from 'react';
import { getMenu } from '../utils/map_menu';

export const RenderRoutes = () => {

    const [modules, setModules] = useState([]);

    useEffect(() => {
        getMenu().then(modules => setModules(modules));
    }, []);

    useEffect(() => {
        console.log(["modules routes", modules]);
    }, [modules]);

    return (
        <>
            {/* Auth Routes */}
            <Route element={<AuthTemplate />}>
                <Route path="/login" element={<Login />} />
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

            <Route path="*" element={<Page404 />} />

            
        </>
    )
}