import { useSelector } from "react-redux";
import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { Link } from "react-router-dom";
import { base_redirect_path, base_url } from "../../utils/functions";
import { fetchHelper } from "../../utils/fetch";

import avatar from '../../../public/assets/img/avatars/1.png';

// import { ComponentsFinal } from "../../utils/map_menu";

const NavHorizontal = ({modules}) => {

    // const rutaPerfil = ComponentsFinal.find(component => component.id === "PERFIL")?.path;

    // console.log(ComponentsFinal);

    const user = useSelector(state => state.user).user;
    const modulos = useSelector(state => state.modules).modules;

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

                const url = base_url(['auth/logout']);

                await fetchHelper.post(url, {}, {}, 500);
                dispatch({ type: "LOGOUT" });
                window.location.href = base_redirect_path(true);
                window.Swal.fire({
                    title: 'Cerrando sesión',
                    text: 'Cerrando sesión...',
                    icon: 'success',
                    showConfirmButton: false,
                    allowOutsideClick: false,
                });
            }
        });
    }

    useEffect(() => {
        console.log(modules);
        console.log(modulos);
    }, [user]);

    return <>
        <nav
            className="layout-navbar container-xxl navbar navbar-expand-xl navbar-detached align-items-center bg-navbar-theme"
            id="layout-navbar">
            <div className="layout-menu-toggle navbar-nav align-items-xl-center me-4 me-xl-0 d-xl-none">
                <a className="nav-item nav-link px-0 me-xl-6" href="javascript:void(0)">
                <i className="ri-menu-fill ri-22px"></i>
                </a>
            </div>

            <div className="navbar-nav-right d-flex align-items-center" id="navbar-collapse">

                <ul className="navbar-nav flex-row align-items-center ms-auto">
                    
                    <li className="nav-item dropdown-style-switcher dropdown me-1 me-xl-0">
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
                    </li>
                    
                    <li className="nav-item navbar-dropdown dropdown-user dropdown">
                        <a className="nav-link dropdown-toggle hide-arrow" href="javascript:void(0);" data-bs-toggle="dropdown">
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
                                modules?.filter((module) => module?.id == 1).map((module) => {
                                    return module?.menus?.map((menu) => {
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