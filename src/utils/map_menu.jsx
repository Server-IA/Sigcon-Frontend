import Home from "../pages/home/index";
import IndexModules from "../pages/parametrizacion/modules/index";
import PageMaintenance from "../pages/errors/page_maintenance";

import { base_url } from "./functions";
import { fetchHelper } from "./fetch"; 

export const COMPONENT_MAP = {
    HOME: Home,
    MODULOS: IndexModules
};
export const getMenu = async () => {
    
    const modules = [];
    const url = base_url(['api', 'modules', 'menu']);
    const response = await fetchHelper.get(url, {}, 0);

    if (!response?.error) {
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
                        path: "",
                        position: 0,
                        childrens: [],
                        component: COMPONENT_MAP.HOME
                    }
                ]
            },
            ...response.map(modules => ({
                ...modules,
                menus: modules.menus.map(menu => ({
                    ...menu,
                    component: COMPONENT_MAP[menu.component] || PageMaintenance
                }))
            }))
        ];
        
        modules.push(...menus);
    }

    console.log(["modules", modules]);

    return modules;
}