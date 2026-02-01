import { Route } from 'react-router-dom';
import MainTemplate from '../components/templates/MainTemplate';
import AuthTemplate from '../components/templates/AuthTemplate';

import Login from "../pages/Login/LoginPage";
import RecoveryPassword from "../pages/RecoveryPassword/RecoveryPasswordPage";
import Home from '../pages/home/index';

import Page404 from '../pages/errors/page_404';

export const RenderRoutes = () => {
    return (
        <>
        {/* Auth Routes */}
        <Route element={<AuthTemplate />}>
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<RecoveryPassword />} />
        </Route>


        <Route element={<MainTemplate />}>
            <Route path="dashboard">
                <Route index element={<Home />} />
            </Route>
        </Route>

        <Route path="*" element={<Page404 />} />

            
        </>
    )
}