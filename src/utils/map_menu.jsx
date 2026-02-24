import Home from "../pages/home/index";
import PerfilPage from "../pages/parametrizacion/perfil/index";

// Parametrizacion
import IndexModules from "../pages/parametrizacion/modules/index";
import IndexMenus from "../pages/parametrizacion/menus/index";
import PermissionsIndex from "../pages/parametrizacion/permissions/index"
import IndexUsers from "../pages/parametrizacion/users/index";

import IndexRoles from "../pages/parametrizacion/roles/index";
import IndexParameters from "../pages/parametrizacion/parameters/index";
import MenuPermissionIndex from "../pages/parametrizacion/menus-permissions";
import IndexCuentasContables from "../pages/parametrizacion/cuentas-contables/index";

import PageMaintenance from "../pages/errors/page_maintenance";

import { base_url } from "./functions";
import { fetchHelper } from "./fetch";

//aca tengo que agregar los nuevos modulos que cargue de parametrizacion
// export const COMPONENT_MAP = {
//     HOME: Home,
//     PERFIL: PerfilPage,
//     MODULOS: IndexModules,
//     MENUS: IndexMenus,
//     PERMISSIONS: PermissionsIndex,
//     USERS: IndexUsers,
//     ROLES: IndexRoles,
//     PARAMETROS: IndexParameters,
//     MENUSPERMISSIONS: MenuPermissionIndex
// };

export const COMPONENT_MAP = [
    // { id: "HOME", name: "Dashboard", component: Home },
    { id: "PERFIL", name: "Perfil", component: PerfilPage },
    { id: "MODULOS", name: "Módulos", component: IndexModules },
    { id: "MENUS", name: "Menus", component: IndexMenus },
    { id: "PERMISSIONS", name: "Permisos", component: PermissionsIndex },
    { id: "USERS", name: "Usuarios", component: IndexUsers },
    { id: "ROLES", name: "Roles", component: IndexRoles },
    { id: "PARAMETROS", name: "Parámetros", component: IndexParameters },
    { id: "MENUSPERMISSIONS", name: "Permisos de Menú", component: MenuPermissionIndex },
    { id: "CUENTAS_CONTABLES", name: "Cuentas Contables", component: IndexCuentasContables },
]

export const getMenu = async () => {
    const modules = [];
    const componentsFinal = [];
    const url = base_url(['api', 'modules', 'menu']);
    const {data, error} = await fetchHelper.get(url, {}, 0);

    modules.push({
        id: 0,
        name: "Dashboard",
        url: "dashboard",
        icon: "ri-home-smile-line",
        position: 0,
        menus: [
            {
                id: 0,
                label: "Home",
                path: "",
                position: 0,
                icon: "ri-home-smile-line",
                childrens: [],
                component: Home,
                componentName: "Home"
            }
        ]
    })

    if (!error) {
        modules.push(...data?.map(modules => ({
            ...modules,
            menus: buildMenuTree(modules?.menus?.map(menu => ({
                ...menu,
                componentName: menu?.component,
                component: COMPONENT_MAP.find(component => component.id === menu?.component)?.component || PageMaintenance,
            })))
        })));
    }

    // 🔹 Clonar sin la propiedad "component"
    const removeComponentRecursively = (menus) =>
        menus?.map(({ component, childrens, ...rest }) => ({
            ...rest,
            childrens: removeComponentRecursively(childrens)
        }));

    const modulesWithoutComponents = modules.map(module => ({
        ...module,
        menus: removeComponentRecursively(module.menus)
    }));

    componentsFinal.push(...modulesWithoutComponents);

    return {modules, componentsFinal};
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