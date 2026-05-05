import { useSelector } from "react-redux";
import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { Link } from "react-router-dom";
import { base_redirect_path, base_url } from "../../utils/functions";
import { fetchHelper } from "../../utils/fetch";

import avatar from '../../../public/assets/img/avatars/1.png';
import { refreshMenu } from "../../routes/routes";
import NotificationBell from "./NotificationBell";

// import { ComponentsFinal } from "../../utils/map_menu";

const NavHorizontal = () => {

    const user = useSelector(state => state.user).user;
    const modulos = useSelector(state => state.modules).modules || [];

    const urlPerfil = `${
        modulos.find(modulo => modulo.id === 1)?.url
    }/${modulos.find(modulo => modulo.id === 1)?.menus.find(menu => menu.componentName === "PERFIL")?.path}`;

    const dispatch = useDispatch();
    const handleLogout = async () => {

        window.Swal.fire({
            title: 'Cerrar sesión',
            text: '¿Estás seguro de querer cerrar sesión?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: user?.parameters?.color_primary || '#3085d6',
            cancelButtonColor: user?.parameters?.color_danger || '#d33',
            confirmButtonText: 'Cerrar sesión',
            cancelButtonText: 'Cancelar',
            customClass: {
                confirmButton: 'btn btn-primary waves-effect',
                cancelButton: 'btn btn-secondary waves-effect',
            }
        }).then(async (result) => {
            if (result.isConfirmed) {
                // QA 2026-05-05: el flow original no tenia try/catch.
                // Si el endpoint /auth/logout fallaba (token expirado, red caida,
                // 401, etc.), la excepcion propagaba y dispatch + redirect NO se
                // ejecutaban. Resultado: el usuario veia "Logout no hace nada".
                // Ahora: el logout local SIEMPRE se ejecuta, aunque el server
                // falle (best-effort).
                const url = base_url(['auth/logout']);
                try {
                    await fetchHelper.post(url, {}, {}, 500);
                } catch (err) {
                    // Backend pudo invalidar el token igual; el front debe seguir.
                    console.warn('[logout] backend devolvio error, se cierra sesion localmente:', err);
                }
                dispatch({ type: "LOGOUT" });
                window.location.href = base_redirect_path(true);
            }
        });
    }

    useEffect(() => {
        dispatch(refreshMenu());
    }, [dispatch]);

    const toggleMenu = () => {
        if (window.Helpers) {
            window.Helpers.toggleCollapsed();
        }
    }

    return <>
        <nav
            className="layout-navbar container-xxl navbar navbar-expand-xl navbar-detached align-items-center bg-navbar-theme"
            id="layout-navbar">
            <div className="layout-menu-toggle navbar-nav align-items-xl-center me-4 me-xl-0 d-xl-none">
                <Link className="nav-item nav-link px-0 me-xl-6" onClick={toggleMenu}>
                    <i className="ri-menu-fill ri-22px"></i>
                </Link>
            </div>

            <div className="navbar-nav-right d-flex align-items-center" id="navbar-collapse">

                {/* Bloque F: empresa activa visible en el header */}
                {user?.isPlatformAdmin ? (
                    <span className="badge bg-dark text-white px-3 py-2 me-3" title="Cuenta cross-empresa">
                        <i className="ri-building-4-line me-2"></i>Plataforma
                    </span>
                ) : user?.companyName ? (
                    <span className="badge bg-primary text-white px-3 py-2 me-3"
                          title={`Empresa activa · ID ${user.companyId}`}>
                        <i className="ri-building-line me-2"></i>{user.companyName}
                    </span>
                ) : null}

                <ul className="navbar-nav flex-row align-items-center ms-auto">

                    {/* HU-PA-21/22/23: campanita de notificaciones in-app */}
                    <NotificationBell />

                    {/* <li className="nav-item dropdown-style-switcher dropdown me-1 me-xl-0">
                        <a
                        className="nav-link btn btn-text-secondary rounded-pill btn-icon dropdown-toggle hide-arrow"
                        href="javascript:void(0);"
                        data-bs-toggle="dropdown">
                            <i className="ri-22px"></i>
                        </a>
                        <ul className="dropdown-menu dropdown-menu-end dropdown-styles">
                            <li>
                                <a className="dropdown-item" href="javascript:void(0);" data-theme="light">
                                    <span className="align-middle"><i className="ri-sun-line ri-22px me-3"></i>Light</span>
                                </a>
                            </li>
                            <li>
                                <a className="dropdown-item" href="javascript:void(0);" data-theme="dark">
                                    <span className="align-middle"><i className="ri-moon-clear-line ri-22px me-3"></i>Dark</span>
                                </a>
                            </li>
                            <li>
                                <a className="dropdown-item" href="javascript:void(0);" data-theme="system">
                                    <span className="align-middle"><i className="ri-computer-line ri-22px me-3"></i>System</span>
                                </a>
                            </li>
                        </ul>
                    </li>
                    
                    <li className="nav-item dropdown-notifications navbar-dropdown dropdown me-4 me-xl-1">
                        <a
                        className="nav-link btn btn-text-secondary rounded-pill btn-icon dropdown-toggle hide-arrow"
                        href="javascript:void(0);"
                        data-bs-toggle="dropdown"
                        data-bs-auto-close="outside"
                        aria-expanded="false">
                            <i className="ri-notification-2-line ri-22px"></i>
                            <span
                                className="position-absolute top-0 start-50 translate-middle-y badge badge-dot bg-danger mt-2 border"></span>
                        </a>
                        <ul className="dropdown-menu dropdown-menu-end py-0">
                            <li className="dropdown-menu-header border-bottom py-50">
                                <div className="dropdown-header d-flex align-items-center py-2">
                                <h6 className="mb-0 me-auto">Notification</h6>
                                <div className="d-flex align-items-center">
                                    <span className="badge rounded-pill bg-label-primary fs-xsmall me-2">8 New</span>
                                    <a
                                    href="javascript:void(0)"
                                    className="btn btn-text-secondary rounded-pill btn-icon dropdown-notifications-all"
                                    data-bs-toggle="tooltip"
                                    data-bs-placement="top"
                                    title="Mark all as read"
                                    >
                                        <i className="ri-mail-open-line text-heading ri-20px"></i>
                                    </a>
                                </div>
                                </div>
                            </li>
                            <li className="dropdown-notifications-list scrollable-container">
                                <ul className="list-group list-group-flush">
                                    <li className="list-group-item list-group-item-action dropdown-notifications-item">
                                        <div className="d-flex">
                                        <div className="flex-shrink-0 me-3">
                                            <div className="avatar">
                                            <img src="../../assets/img/avatars/1.png" alt="avatar" className="rounded-circle" />
                                            </div>
                                        </div>
                                        <div className="flex-grow-1">
                                            <h6 className="small mb-1">Congratulation Lettie 🎉</h6>
                                            <small className="mb-1 d-block text-body">Won the monthly best seller gold badge</small>
                                            <small className="text-muted">1h ago</small>
                                        </div>
                                        <div className="flex-shrink-0 dropdown-notifications-actions">
                                            <a href="javascript:void(0)" className="dropdown-notifications-read">
                                                <span className="badge badge-dot"></span>
                                            </a>
                                            <a href="javascript:void(0)" className="dropdown-notifications-archive">
                                                <span className="ri-close-line ri-20px"></span>
                                            </a>
                                        </div>
                                        </div>
                                    </li>
                                </ul>
                            </li>
                            <li className="border-top">
                                <div className="d-grid p-4">
                                <a className="btn btn-primary btn-sm d-flex" href="javascript:void(0);">
                                    <small className="align-middle">View all notifications</small>
                                </a>
                                </div>
                            </li>
                        </ul>
                    </li> */}
                    
                    <li className="nav-item navbar-dropdown dropdown-user dropdown">
                        <a className="nav-link dropdown-toggle hide-arrow" onClick={() => {}} data-bs-toggle="dropdown">
                            <div className="avatar avatar-online">
                                <img
                                    onError={(e) => {
                                        e.target.src = avatar;                                        
                                    }}
                                    src={base_url(['users/avatars', user?.avatar ?? ''])} alt="avatar" className="rounded-circle" />
                            </div>
                        </a>
                        <ul className="dropdown-menu dropdown-menu-end">
                            <li>
                                <Link to={urlPerfil} className="dropdown-item">
                                    <div className="d-flex">
                                        <div className="flex-shrink-0 me-2">
                                            <div className="avatar avatar-online">
                                                <img
                                                    onError={(e) => {
                                                        e.target.src = avatar;
                                                        console.warn('Error al capturar el avatar');
                                                    }}
                                                    src={base_url(['users/avatars', user?.avatar ?? ''])} alt="avatar" className="rounded-circle" />
                                            </div>
                                        </div>
                                        <div className="flex-grow-1">
                                            <span className="fw-medium d-block small">{user?.name ?? ''} {user?.last_name ?? ''}</span>
                                            <small className="text-muted">{user?.email ?? ''}</small>
                                        </div>
                                    </div>
                                </Link>
                            </li>
                            <li>
                                <div className="dropdown-divider"></div>
                            </li>

                            {
                                /* Bloque AM (2026-05-03): el dropdown del avatar listaba TODOS
                                   los menus del modulo Parametrizacion sin distincion de rol.
                                   PLATFORM_ADMIN y ADMIN_EMPRESA tienen funciones DIFERENTES:
                                     - PLATFORM_ONLY: configuracion del sistema (catalogos
                                       globales, modulos/menus/permisos, navegacion). Solo
                                       PLATFORM_ADMIN.
                                     - TENANT_ONLY: configuracion DE la empresa (identidad
                                       visual, plantillas/tipos de reporte, retenciones,
                                       parametros propios). Solo ADMIN_EMPRESA. El
                                       PLATFORM_ADMIN no las usa porque no opera una
                                       empresa concreta.
                                     - Compartidos (Perfil, Roles, Usuarios): visibles para
                                       ambos pero con scope distinto (backend filtra). */
                            }
                            {
                                modulos?.filter((module) => module?.id == 1).map((module) => {
                                    /* Bloque AM ajuste fino (2026-05-03): el admin de
                                       empresa NO necesita Parametros (es config sistema).
                                       SI necesita Navegacion y Notificaciones por rol para
                                       personalizar su empresa. */
                                    const PLATFORM_ONLY = new Set([
                                        'MODULOS','MENUS','PERMISSIONS','MENUSPERMISSIONS',
                                        'PAISES','MUNICIPIOS','PARAMETROS'
                                    ]);
                                    const TENANT_ONLY = new Set([
                                        'IDENTIDAD_VISUAL','REPORT_TYPES','REPORT_TEMPLATES',
                                        'SYSTEM_WITHHOLDINGS','NAVEGACION','NOTIFICACIONES_ROL'
                                    ]);
                                    return module?.menus
                                        ?.filter((menu) => menu.visible)
                                        ?.filter((menu) => {
                                            const comp = menu.component || menu.componentName;
                                            if (user?.isPlatformAdmin) {
                                                return !TENANT_ONLY.has(comp);
                                            }
                                            return !PLATFORM_ONLY.has(comp);
                                        })
                                        ?.map((menu) => {
                                        return (
                                            <li key={menu.id}>
                                                <Link to={`${module.url}/${menu.path}`} className="dropdown-item">
                                                    <i className={`${menu.icon && menu.icon != '' ? menu.icon : 'ri-settings-5-fill'} ri-22px me-3`}></i><span className="align-middle">{menu.label}</span>
                                                </Link>
                                            </li>
                                        )
                                    })
                                })
                            }
                            <li>
                                <div className="dropdown-divider"></div>
                            </li>
                            <li>
                                <div className="d-grid px-4 pt-2 pb-1">
                                    <button className="btn btn-sm btn-danger d-flex" onClick={handleLogout}>
                                        <small className="align-middle">Logout</small>
                                        <i className="ri-logout-box-r-line ms-2 ri-16px"></i>
                                    </button>
                                </div>
                            </li>
                        </ul>
                    </li>
                </ul>
            </div>
        </nav>
    </>;
}

export default NavHorizontal;