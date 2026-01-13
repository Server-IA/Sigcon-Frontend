import { Route } from 'react-router-dom';
import Main from '../layouts/main';


import Home from '../pages/home/index'

export const RenderRoutes = () => {
    return (
        <>
            <Route element={<Main />}>
                <Route path="/" element={<Home />} />
            </Route>
        </>
    )
}