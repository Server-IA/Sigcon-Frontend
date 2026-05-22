import { Link, useLocation } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { useSelector, useDispatch } from "react-redux";

import ItemMenu from "../molecules/ItemMenu.jsx";
import LogoBrand from "../molecules/LogoBrand.jsx";
import { refreshMenu } from "../../routes/routes.jsx";
import { usePermissions } from "../../utils/hooks/usePermissions.jsx";
import { isMenuItemVisible } from "../../utils/menuPermissionMap.jsx";

/**
 * F4.6 — Agrupación visual del módulo "Bancos y Cajas".
 *
 * El módulo BNK acumula muchos submódulos de conciliación (config + reportes +
 * cumplimiento DIAN) que saturan el sidebar. En vez de ocultarlos (perderían
 * acceso) los agrupamos bajo cabeceras colapsables, SOLO en el frontend: no se
 * toca la BD, ni el backend, ni las rutas (cada hijo conserva su path/route).
 * La cabecera es un nodo sintético con `childrens`; ItemMenu ya renderiza el
 * anidamiento. Path vacío => actúa solo como toggle (no navega).
 */
// F4.7: las 6 herramientas por-cuenta (GMF, Partidas Conciliatorias, Antigüedad,
// Soportes, Cruce FE, Diferencia en cambio) se movieron DENTRO del panel de
// conciliación (pestaña "Herramientas") y se ocultan del sidebar. Aquí quedan
// solo la config global de empresa y los reportes fiscales anuales DIAN.
const BNK_MENU_GROUPS = [
    { id: 'bnk-grp-config', label: 'Conciliación · Configuración', icon: 'ri-settings-4-line',
      components: ['REGLAS_CLASIFICACION', 'PARAMETROS_MATCHING', 'CONFIG_FIRMA', 'TRM_HISTORICA'] },
    { id: 'bnk-grp-dian', label: 'Cumplimiento DIAN', icon: 'ri-government-line',
      components: ['EXOGENA_DIAN', 'CONCILIACION_FISCAL'] },
];

/** Agrupa los submódulos de conciliación del BNK bajo cabeceras sintéticas colapsables. */
const groupBankMenus = (menus) => {
    const byComponent = new Map();
    menus.forEach((m) => { if (m.component) byComponent.set(m.component, m); });
    const grouped = new Set();
    const groups = BNK_MENU_GROUPS.map((g) => {
        const childrens = g.components.map((c) => byComponent.get(c)).filter(Boolean);
        childrens.forEach((c) => grouped.add(c.component));
        if (!childrens.length) return null;
        return { id: g.id, label: g.label, icon: g.icon, path: '', visible: true, component: null, childrens };
    }).filter(Boolean);
    const rest = menus.filter((m) => !m.component || !grouped.has(m.component));
    // Base CRUD primero (orden original), cabeceras de grupo al final.
    return [...rest, ...groups];
};

const MenuNav = () =>{

    const dispatch = useDispatch();
    const menuRef = useRef(null);
    const menuInstance = useRef(null);

    const modules = useSelector(state => state.modules.modules ?? []);
    const user = useSelector(state => state.user?.user);
    const { has } = usePermissions();
    // QA Bloque AT (HU-PA-BRAND-01, 2026-05-13): re-render del sidebar cuando
    // IdentidadVisualPage guarda nuevo theme. Sin esto, el sidebar lee
    // localStorage solo al primer mount y se queda con el brandName antiguo
    // hasta que el usuario navega/refresca. Se escucha tanto el evento nativo
    // 'storage' (cambios en OTRO tab) como un custom event 'sigcon-brand-changed'
    // que dispara IdentidadVisualPage tras Guardar (mismo tab).
    const [brandTick, setBrandTick] = useState(0);
    useEffect(() => {
        const onStorage = (e) => {
            if (!e || !e.key || e.key.startsWith('sigcon_brand_theme')) {
                setBrandTick(t => t + 1);
            }
        };
        const onCustom = () => setBrandTick(t => t + 1);
        window.addEventListener('storage', onStorage);
        window.addEventListener('sigcon-brand-changed', onCustom);
        return () => {
            window.removeEventListener('storage', onStorage);
            window.removeEventListener('sigcon-brand-changed', onCustom);
        };
    }, []);

    /*
     * Bloque AM (2026-05-03): el sidebar mostraba "S SIGCON" hardcoded ignorando
     * la identidad visual de la empresa configurada en /parametrizacion/identidad-visual.
     * Ahora: PLATFORM_ADMIN ve el branding default SIGCON. ADMIN_EMPRESA lee
     * sigcon_brand_theme (logo + nombre comercial) que se persiste al Guardar.
     */
    // brandTick fuerza re-evaluacion de localStorage cuando cambia
    void brandTick;
    let brandName = 'SIGCON';
    let brandLetter = 'S';
    let brandLogo = null;
    if (user && !user.isPlatformAdmin) {
        try {
            // QA Bloque AT (HU-PA-BRAND-01, 2026-05-13): la clave del theme
            // esta scoped por companyId (sigcon_brand_theme_{N}) desde la
            // migracion cross-tenant del bloque QA 2026-05-05. Si leemos la
            // clave global hardcoded, NUNCA encontramos el theme guardado por
            // el admin de la empresa actual y el sidebar se queda con el
            // brandName="SIGCON" default aunque la empresa haya configurado
            // su nombre comercial. Resolvemos primero por companyId, luego
            // fallback a la clave global por compat.
            const scopedKey = user.companyId ? `sigcon_brand_theme_${user.companyId}` : null;
            const theme = JSON.parse(
                (scopedKey && localStorage.getItem(scopedKey))
                || localStorage.getItem('sigcon_brand_theme')
                || '{}'
            );
            if (theme.brandName && theme.brandName.trim().length > 0) {
                brandName = theme.brandName.trim();
                brandLetter = brandName.charAt(0).toUpperCase();
            } else if (user.companyName) {
                brandName = user.companyName;
                brandLetter = brandName.charAt(0).toUpperCase();
            }
            if (theme.logoData && typeof theme.logoData === 'string' && theme.logoData.startsWith('data:')) {
                brandLogo = theme.logoData;
            }
        } catch (_) { /* ignore */ }
    }

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
                                {brandLogo ? (
                                    <img
                                        src={brandLogo}
                                        alt={brandName}
                                        style={{ maxHeight: 36, maxWidth: 120, objectFit: 'contain' }}
                                    />
                                ) : (
                                    <div className="auth-logo-brand">
                                        <div className="auth-logo-circle">
                                            <span className="auth-logo-letter">{brandLetter}</span>
                                        </div>
                                    </div>
                                )}
                            </span>
                        </span>
                        <span
                            className="app-brand-text demo menu-text fw-semibold ms-2 text-primary"
                            style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                            title={brandName}>
                            {brandName}
                        </span>
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
                            // QA Bloque AT (HU-PA-13, 2026-05-13): ademas del flag
                            // visible del backend, filtramos por permisos efectivos
                            // (rol + permisos temporales ACTIVE). Si el componente
                            // no esta mapeado en menuPermissionMap, el filtro adicional
                            // se omite (legacy: menu.visible manda).
                            const filteredMenus = (module.menus ?? [])
                                .filter((menu) => menu.visible)
                                .filter((menu) => isMenuItemVisible(menu, has));
                            // F4.6: agrupar los submódulos de conciliación SOLO en BNK.
                            const finalMenus = (module.url === 'cash-and-banks')
                                ? groupBankMenus(filteredMenus)
                                : filteredMenus;
                            const safeModule = {
                                ...module,
                                childrens: finalMenus
                            };
                            // Si no quedan menus visibles tras filtrar, ocultar
                            // el modulo entero (evita "carpetas vacias" en sidebar).
                            if (filteredMenus.length === 0) return null;
                            return <ItemMenu key={module.id} item={safeModule} parentPath="" />
                        })
                    }

                </ul>

            </aside>
        </>
    )
}

export default MenuNav;