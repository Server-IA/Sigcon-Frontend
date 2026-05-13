/**
 * QA Bloque AT (HU-PA-13, 2026-05-13): mapa <componentId, permisoAtomico>
 * para que el sidebar y el dropdown del avatar filtren items por permiso
 * efectivo (rol + permisos temporales ACTIVE).
 *
 * <p>Sin este mapa, el sidebar solo respeta el flag {@code visible} del
 * backend, que se calcula de forma gruesa por rol y NO tiene en cuenta
 * los permisos temporales ni los permisos atomicos que un rol pueda
 * tener parcialmente sobre un modulo. El resultado era: a un usuario
 * con permiso temporal "PAR.PERMISOS_TEMPORALES.VER" no le aparecia el
 * item; y a un usuario con permiso "PAR.PERMISOS_TEMPORALES.VER" en su
 * rol le aparecian tambien "Tipos de Reporte", "Plantillas de Reporte",
 * etc., aunque su rol no las tuviera.
 *
 * Regla:
 * <ul>
 *   <li>Si un componente esta en este mapa, el menu se muestra solo si
 *       {@code usePermissions().has(code)} retorna true.</li>
 *   <li>Si un componente NO esta en este mapa, el filtro adicional se
 *       omite (cae al comportamiento legacy: {@code menu.visible} del
 *       backend manda). Asi NO rompemos modulos que aun no han migrado
 *       sus permisos al esquema atomico.</li>
 *   <li>PLATFORM_ADMIN y ADMIN_EMPRESA tienen bypass total en
 *       {@code usePermissions} y ven todo igualmente.</li>
 * </ul>
 *
 * Solo se mapean los componentes del modulo Parametrizacion porque ahi
 * estan los items mas sensibles (gestion de usuarios, roles, plantillas,
 * permisos temporales). El resto de modulos sigue cubierto por el
 * filtrado del backend (permisos por rol -> menu.visible).
 */
export const MENU_REQUIRED_PERMISSION = Object.freeze({
    // --- Parametrizacion modulo (id=1) ---
    // PERFIL: sin permiso (todos los usuarios autenticados ven su perfil).
    'MODULOS': 'PAR.MODULOS.VER',
    'MENUS': 'PAR.MENUS.VER',
    // PERMISSIONS y MENUSPERMISSIONS son solo PLATFORM_ADMIN (bypass implicito).
    'ROLES': 'PAR.ROLES.VER',
    'USERS': 'PAR.USUARIOS.VER',
    'PARAMETROS': 'PAR.PARAMETROS.VER',
    // PAISES / MUNICIPIOS: solo PLATFORM_ADMIN (no requieren permiso atomico).
    'REPORT_TYPES': 'PAR.REPORTES_TIPOS.VER',
    'REPORT_TEMPLATES': 'PAR.REPORTES_PLANTILLAS.VER',
    // QA Bloque AT (HU-PA-13 E7, 2026-05-13): Retenciones Sistema solo
    // accesible a ADMIN_EMPRESA. Como no hay permiso atomico definido aun
    // para esta pagina, exigimos uno generico que no esta en BD; eso fuerza
    // el bypass de ADMIN_EMPRESA (usePermissions.has retorna true para
    // isAdmin=true) y rechaza a roles sin admin. Cuando exista
    // PAR.RETENCIONES.VER en BD, reemplazar aqui.
    'SYSTEM_WITHHOLDINGS': 'PAR.RETENCIONES.VER',
    'IDENTIDAD_VISUAL': 'PAR.IDENTIDAD_VISUAL.VER',
    'NAVEGACION': 'PAR.NAVEGACION.EDITAR',
    'NOTIFICACIONES_ROL': 'PAR.NOTIFICACIONES.CONFIGURAR_ROL',
    'TEMPORARY_PERMISSIONS': 'PAR.PERMISOS_TEMPORALES.VER',
});

/**
 * Helper: dado un item de menu y un check {@code has(code)}, decide si
 * el item debe mostrarse.
 *
 * <p>Reglas:
 * <ol>
 *   <li>Backend ya filtro por visible; respetamos eso (visible=false oculta).</li>
 *   <li>Si tiene mapeo de permiso y el usuario no lo tiene -> oculta.</li>
 *   <li>Si tiene hijos y NINGUN hijo es visible tras filtrar -> oculta el padre.</li>
 * </ol>
 */
export function isMenuItemVisible(menu, hasFn) {
    if (!menu) return false;
    if (menu.visible === false) return false;

    const requiredPerm = MENU_REQUIRED_PERMISSION[menu.component];
    if (requiredPerm && typeof hasFn === 'function' && !hasFn(requiredPerm)) {
        return false;
    }

    // Si tiene submenu, ocultar si ningun hijo es visible.
    const children = menu.childrens ?? menu.menus ?? [];
    if (Array.isArray(children) && children.length > 0) {
        const anyVisible = children.some(c => isMenuItemVisible(c, hasFn));
        if (!anyVisible) {
            // Si el padre TIENE su propia ruta navegable, lo dejamos.
            // Si solo es contenedor (path vacio), lo ocultamos.
            const hasOwnRoute = menu.path && menu.path.trim().length > 0
                && menu.component && menu.component !== 'CONTAINER';
            if (!hasOwnRoute) return false;
        }
    }
    return true;
}

/**
 * Filtra recursivamente un arbol de menus aplicando isMenuItemVisible.
 * Retorna nuevos objetos (no muta los originales).
 */
export function filterMenuTree(items, hasFn) {
    if (!Array.isArray(items)) return [];
    return items
        .filter(it => isMenuItemVisible(it, hasFn))
        .map(it => {
            const children = it.childrens ?? it.menus ?? [];
            const filteredChildren = filterMenuTree(children, hasFn);
            return {
                ...it,
                childrens: filteredChildren,
                menus: filteredChildren,
            };
        });
}
