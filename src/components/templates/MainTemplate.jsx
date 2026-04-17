import { Outlet, useLocation } from "react-router-dom";

import MenuNav from "../organism/MenuNav";
import NavHorizontal from "../organism/NavHorizontal";

/**
 * Layout principal de la aplicacion.
 * En el dashboard se oculta el sidebar y se muestra solo el mosaico de modulos.
 * Al navegar a un modulo, el sidebar se muestra normalmente.
 */
const MainTemplate = () => {
    const location = useLocation();
    const isDashboard = location.pathname === "/dashboard" || location.pathname === "/dashboard/";

    return (
        <>
            <div className={`layout-wrapper layout-content-navbar ${isDashboard ? 'layout-without-menu' : ''}`}>
                <div className="layout-container">
                    {!isDashboard && <MenuNav />}
                    <div className="layout-page">
                        <NavHorizontal />
                        <div className="content-wrapper">
                            <div className="container-xxl flex-grow-1 container-p-y">
                                <div className="row g-6">
                                    <Outlet />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="layout-overlay layout-menu-toggle"></div>
            </div>
        </>
    );
};

export default MainTemplate;
