import { Route } from 'react-router-dom';
import MainTemplate from '../components/templates/MainTemplate';


import Home from '../pages/home/index'

export const RenderRoutes = () => {
    return (
        <>
            <Route element={<MainTemplate />}>
                <Route path="dashboard">
                    <Route index element={<Home />} />
                </Route>
            </Route>

            
        </>
    )
}