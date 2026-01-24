import { Route } from 'react-router-dom';
import MainTemplate from '../components/templates/MainTemplate';
import AuthTemplate from '../components/templates/AuthTemplate';

import Login from "../pages/Login/LoginPage";
import Home from '../pages/home/index'

export const RenderRoutes = () => {
    return (
        <>
        {/* Auth Routes */}
        <Route element={<AuthTemplate />}>
          <Route path="/login" element={<Login />} />
        </Route>


            <Route element={<MainTemplate />}>
                <Route path="dashboard">
                    <Route index element={<Home />} />
                </Route>
            </Route>

            
        </>
    )
}