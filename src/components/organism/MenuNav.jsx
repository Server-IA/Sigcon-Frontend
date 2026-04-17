import { Link, useLocation } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { useSelector, useDispatch } from "react-redux";

import ItemMenu from "../molecules/ItemMenu.jsx";
import LogoBrand from "../molecules/LogoBrand.jsx";
import { refreshMenu } from "../../routes/routes.jsx";

const MenuNav = () =>{

    const dispatch = useDispatch();
    const menuRef = useRef(null);
    const menuInstance = useRef(null);

    const modules = useSelector(state => state.modules.modules ?? []);

    const toggleMenu = () => {
        if (window.Helpers) {
            window.Helpers.toggleCollapsed();
        }
    };

    useEffect(() => {
        dispatch(refreshMenu());
    }, [dispatch]);

    useEffect(() => {
        if (menuRef.current && window.Menu) {
            menuInstance.current = new window.Menu(menuRef.current, {
                orientation: "vertical",
                showDropdownOnHover: true,
                accordion: true,
                animate: true
            });
        }

        return () => {
            menuInstance.current?.destroy();
        };
    }, []);

    return (
        <>
            {/* <!-- Menu --> */}

            <aside ref={menuRef}  id="layout-menu" className="layout-menu menu-vertical menu bg-menu-theme">
                <div className="app-brand demo">
                    <Link to="/dashboard" className="app-brand-link">
                        <span className="app-brand-logo demo">
                            <span style={{color: "var(--bs-primary)"}}>
                                <div className="auth-logo-brand">
                                    <div className="auth-logo-circle">
                                        <span className="auth-logo-letter">S</span>
                                    </div>
                                </div>
                            </span>
                        </span>
                        <span className="app-brand-text demo menu-text fw-semibold ms-2 text-primary">SIGCON</span>
                    </Link>

                    <a href="#!" onClick={toggleMenu} className="layout-menu-toggle menu-link text-large ms-auto">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path
                            d="M8.47365 11.7183C8.11707 12.0749 8.11707 12.6531 8.47365 13.0097L12.071 16.607C12.4615 16.9975 12.4615 17.6305 12.071 18.021C11.6805 18.4115 11.0475 18.4115 10.657 18.021L5.83009 13.1941C5.37164 12.7356 5.37164 11.9924 5.83009 11.5339L10.657 6.707C11.0475 6.31653 11.6805 6.31653 12.071 6.707C12.4615 7.09747 12.4615 7.73053 12.071 8.121L8.47365 11.7183Z"
                            fillOpacity={0.9} />
                            <path
                            d="M14.3584 11.8336C14.0654 12.1266 14.0654 12.6014 14.3584 12.8944L18.071 16.607C18.4615 16.9975 18.4615 17.6305 18.071 18.021C17.6805 18.4115 17.0475 18.4115 16.657 18.021L11.6819 13.0459C11.3053 12.6693 11.3053 12.0587 11.6819 11.6821L16.657 6.707C17.0475 6.31653 17.6805 6.31653 18.071 6.707C18.4615 7.09747 18.4615 7.73053 18.071 8.121L14.3584 11.8336Z"
                            fillOpacity={0.4} />
                        </svg>
                    </a>

                    
                </div>

                <div className="menu-inner-shadow"></div>

                <ul className="menu-inner py-1">

                    {
                        modules?.filter((module) => module.id != 1).map((module) => {
                            const safeModule = {
                                ...module,
                                childrens: module.menus.filter((menu) => menu.visible) ?? []
                            };
                            return <ItemMenu key={module.id} item={safeModule} parentPath="" />
                        })
                    }

                </ul>

            </aside>
        </>
    )
}

export default MenuNav;