import Home from "../pages/home/index";
import PerfilPage from "../pages/perfil/index";

// Parametrizacion
import IndexModules from "../pages/parametrizacion/modules/index";
import IndexMenus from "../pages/parametrizacion/menus/index";


import PageMaintenance from "../pages/errors/page_maintenance";

import { base_url } from "./functions";
import { fetchHelper } from "./fetch"; 

export const COMPONENT_MAP = {
    HOME: Home,
    PERFIL: PerfilPage,
    MODULOS: IndexModules,
    MENUS: IndexMenus
};
export const getMenu = async () => {
    
    const modules = [];
    const url = base_url(['api', 'modules', 'menu']);
    const response = await fetchHelper.get(url, {}, 0);

    modules.push({
        id: 0,
        name: "Dashboard",
        url: "dashboard",
        position: 0,
        menus: [
            {
                id: 0,
                label: "Home",
                path: "",
                position: 0,
                childrens: [],
                component: COMPONENT_MAP.HOME
            },
            {
                id: 1,
                label: "Perfil",
                path: "perfil",
                position: 1,
                childrens: [],
                component: COMPONENT_MAP.PERFIL
            }
        ]
    })

    if (!response?.error) {
        modules.push(...response.map(modules => ({
            ...modules,
            menus: buildMenuTree(modules.menus.map(menu => ({
                ...menu,
                component: COMPONENT_MAP[menu.component] || PageMaintenance
            })))
        })));
    }

    return modules;
}

const buildMenuTree = (menus) => {
    const menuMap = {};
    const tree = [];

    // 1. Crear el mapa y preparar childrens
    menus.forEach(menu => {
        menuMap[menu.id] = {
            ...menu,
            childrens: []
        };
    });

    // 2. Construir el árbol
    menus.forEach(menu => {
        if (menu.parentId === null) {
            tree.push(menuMap[menu.id]);
        } else {
            const parent = menuMap[menu.parentId];
            if (parent) {
                parent.childrens.push(menuMap[menu.id]);
            }
        }
    });

    return tree;
};

export const buildFullPath = (parent = "", current = "") => {
    return `/${[parent, current].filter(Boolean).join("/")}`;
};