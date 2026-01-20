import { Route } from 'react-router-dom';
import Main from '../components/templates/MainTemplate';


import Home from '../pages/home/index'

export const RenderRoutes = () => {
    return (
        <>
            <Route element={<Main />}>
                <Route path="dashboard">
                    <Route index element={<Home />} />
                </Route>
            </Route>

            
        </>
    )
}