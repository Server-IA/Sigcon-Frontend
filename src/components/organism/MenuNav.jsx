import { Link, useLocation } from "react-router-dom";
import { Fragment } from "react";
import { useEffect, useRef, useState } from "react";

import MenuItem from "../molecules/MenuItem";
import MenuChildrenItem from "../molecules/MenuChildrenItem";

import { isParentActive } from "../../utils/menu";
import { fetchHelper } from "../../utils/fetch";
import { base_url } from "../../utils/functions";


// const modules = [
//     {
//         id:1,
//         name: "Dashboard",
//         options: [
//             {
//                 id:1,
//                 option: "Home",
//                 icon: "ri-home-smile-2-line",
//                 path: "/dashboard",
//                 childrens: []
//             },
//             {
//                 id:2,
//                 option: "Parametros",
//                 icon: "ri-settings-2-line",
//                 path: "/parametros",
//                 childrens: [
//                     {
//                         id:3,
//                         option: "Usuarios",
//                         icon: "ri-user-line",
//                         path: "/users",
//                     }
//                 ]
//             }
//         ]
//     }
// ]

const MenuNav = () =>{
    const [modules, setModules] = useState([]);

    const location = useLocation();
    const menuRef = useRef(null);
    const menuInstance = useRef(null);

    const getModules = async () => {
        try {
            const url = base_url(["api", "modules", "menu"]);
            const headers = {
                Authorization: `Bearer ${import.meta.env.VITE_TOKEN}`,
            };
    
            const response = await fetchHelper.get(url, headers, 0);
    
            if (!response?.error) {
                console.log(response);
                const menus = [
                    {
                        id: 0,
                        name: "Dashboard",
                        url: "/dashboard",
                        position: 0,
                        menus: [
                            {
                                id: 0,
                                label: "Home",
                                url: "/dashboard",
                                position: 0,
                                childrens: []
                            }
                        ]
                    },
                    ...response
                ];

                console.log(menus);

                setModules(menus);
            }
    
        } catch (error) {
            // 🔴 error viene del reject de request()
            console.error('Error obteniendo módulos:', error);
    
            // opcional: estado de error
            setModules([]);
        }
    };

    useEffect(() => {
        if (menuRef.current && window.Menu) {
            menuInstance.current = new window.Menu(menuRef.current, {
                orientation: "vertical",
                accordion: true
            });
        }
        getModules();
        return () => {
            menuInstance.current?.destroy();
        };
    }, []);
    
    return (
        <>
            {/* <!-- Menu --> */}

            <aside id="layout-menu" className="layout-menu menu-vertical menu bg-menu-theme">
                <div className="app-brand demo">
                    <Link to="/" className="app-brand-link">
                        <span className="app-brand-logo demo">
                            <span style={{color: "var(--bs-primary)"}}>
                            </span>
                        </span>
                        <span className="app-brand-text demo menu-text fw-semibold ms-2">SIGCON</span>
                    </Link>

                    <Link className="layout-menu-toggle menu-link text-large ms-auto">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path
                            d="M8.47365 11.7183C8.11707 12.0749 8.11707 12.6531 8.47365 13.0097L12.071 16.607C12.4615 16.9975 12.4615 17.6305 12.071 18.021C11.6805 18.4115 11.0475 18.4115 10.657 18.021L5.83009 13.1941C5.37164 12.7356 5.37164 11.9924 5.83009 11.5339L10.657 6.707C11.0475 6.31653 11.6805 6.31653 12.071 6.707C12.4615 7.09747 12.4615 7.73053 12.071 8.121L8.47365 11.7183Z"
                            fillOpacity="0.9" />
                            <path
                            d="M14.3584 11.8336C14.0654 12.1266 14.0654 12.6014 14.3584 12.8944L18.071 16.607C18.4615 16.9975 18.4615 17.6305 18.071 18.021C17.6805 18.4115 17.0475 18.4115 16.657 18.021L11.6819 13.0459C11.3053 12.6693 11.3053 12.0587 11.6819 11.6821L16.657 6.707C17.0475 6.31653 17.6805 6.31653 18.071 6.707C18.4615 7.09747 18.4615 7.73053 18.071 8.121L14.3584 11.8336Z"
                            fillOpacity="0.4" />
                        </svg>
                    </Link>
                </div>

                <div className="menu-inner-shadow"></div>

                <div ref={menuRef}>
                    <ul className="menu-inner py-1">

                        {
                            modules.map((module) => (
                                <Fragment key={module.id}>
                                    <li className="menu-header mt-5">
                                        <span className="menu-header-text">{module.name}</span>
                                    </li>
                                    {
                                        
                                        module.menus.map((menu) => {
                                            const activeParent = isParentActive(menu, location.pathname);
                                            const hasChildren = menu?.childrens?.length > 0;

                                            console.log(menu);
                                            
                                            return hasChildren ? (
                                                <MenuChildrenItem key={`${module.id}-${menu.id}`} option={menu} active={activeParent} />
                                            ) : ( 
                                                <MenuItem key={`${module.id}-${menu.id}`} option={menu} active={activeParent} />
                                            )
                                                
                                        })
                                    }
                                </Fragment>
                            ))
                        }

                    </ul>
                </div>

            </aside>
        </>
    )
}

export default MenuNav;