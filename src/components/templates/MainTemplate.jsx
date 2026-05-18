import { Outlet, useLocation } from "react-router-dom";

import MenuNav from "../organism/MenuNav";
import NavHorizontal from "../organism/NavHorizontal";
import { usePermissionAutoRefresh } from "../../utils/hooks/usePermissionAutoRefresh";

/**
 * Layout principal de la aplicacion.
 * En el dashboard se oculta el sidebar y se muestra solo el mosaico de modulos.
 * Al navegar a un modulo, el sidebar se muestra normalmente.
 *
 * <p>QA Bloque BF (2026-05-17): incluye {@link usePermissionAutoRefresh} para
 * mantener los effectivePermissions sincronizados con el backend sin requerir
 * logout/login. Se dispara via polling (30s) + focus + visibilitychange +
 * cambio de ruta. Asi cuando un admin asigna o revoca un permiso, los botones
 * condicionados a {@code has(...)} se re-renderizan automaticamente en la
 * siguiente interaccion (a mas tardar 30s).
 */
const MainTemplate = () => {
    const location = useLocation();
    const isDashboard = location.pathname === "/dashboard" || location.pathname === "/dashboard/";
    // QA Bloque BF: refresca effectivePermissions automaticamente.
    usePermissionAutoRefresh();

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
