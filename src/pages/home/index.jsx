import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { usePermissions } from "../../utils/hooks/usePermissions.jsx";
import { isMenuItemVisible } from "../../utils/menuPermissionMap.jsx";
import { fetchHelper } from "../../utils/fetch.jsx";
import { base_url } from "../../utils/functions.jsx";

/**
 * Dashboard principal con mosaico de modulos habilitados segun permisos del usuario.
 * RF-03: Visualizar dinamicamente el panel de inicio con los modulos habilitados.
 * En esta vista el sidebar esta oculto; al hacer click en un modulo se navega
 * al primer submenu y el sidebar aparece normalmente.
 */
const Home = () => {
    const user = useSelector(state => state.user)?.user;
    const allModules = useSelector(state => state.modules)?.modules || [];
    const { has } = usePermissions();
    const navigate = useNavigate();

    // QA Bloque AV (HU-PA-BRAND-01, 2026-05-14): refrescar identidad visual
    // de la empresa al entrar al dashboard. Soluciona el caso "otro usuario
    // de la empresa cambio el brand": al navegar al home, el usuario en
    // sesion lee la version fresca desde backend, actualiza localStorage,
    // aplica las CSS vars al document Y dispara el evento sigcon-brand-changed
    // para que MenuNav + chrome re-rendericen sin requerir refresh manual.
    useEffect(() => {
        if (!user?.companyId || user?.isPlatformAdmin) return;
        let cancelled = false;
        (async () => {
            try {
                const resp = await fetchHelper.get(base_url(['api', 'parametrization', 'brand-config']));
                if (cancelled || !resp?.data) return;
                const cfg = resp.data;
                const scopedKey = `sigcon_brand_theme_${user.companyId}`;
                const existing = localStorage.getItem(scopedKey);
                const next = JSON.stringify({
                    primaryColor: cfg.primaryColor || '#1E5DAB',
                    secondaryColor: cfg.secondaryColor || '#F4A623',
                    brandName: cfg.brandName ?? null,
                    logoData: cfg.logoData ?? null,
                    savedAt: new Date().toISOString(),
                });
                // Solo dispatchear evento si cambio algo (evita re-renders innecesarios).
                let prevWithoutTimestamp = null;
                let nextWithoutTimestamp = null;
                try {
                    const e = existing ? JSON.parse(existing) : {};
                    prevWithoutTimestamp = JSON.stringify({
                        primaryColor: e.primaryColor, secondaryColor: e.secondaryColor,
                        brandName: e.brandName, logoData: e.logoData
                    });
                    const n = JSON.parse(next);
                    nextWithoutTimestamp = JSON.stringify({
                        primaryColor: n.primaryColor, secondaryColor: n.secondaryColor,
                        brandName: n.brandName, logoData: n.logoData
                    });
                } catch (_) { /* fallback */ }
                if (prevWithoutTimestamp !== nextWithoutTimestamp) {
                    localStorage.setItem(scopedKey, next);
                    // Aplicar CSS vars al document (replica logica de
                    // applyThemeToDocument en IdentidadVisualPage para evitar
                    // tener que importar todo el modulo). Sobreescribe --bs-primary,
                    // --config-primary y derivadas.
                    try {
                        const root = document.documentElement;
                        const primary = cfg.primaryColor || '#1E5DAB';
                        const secondary = cfg.secondaryColor || '#F4A623';
                        const toRgb = (h) => {
                            const c = h?.startsWith('#') ? h.substring(1) : (h || '');
                            const f = c.length === 3 ? c.split('').map(x => x + x).join('') : c;
                            if (f.length !== 6) return '30, 93, 171';
                            return `${parseInt(f.substring(0,2),16)}, ${parseInt(f.substring(2,4),16)}, ${parseInt(f.substring(4,6),16)}`;
                        };
                        const lighten = (h, pct) => {
                            const c = h?.startsWith('#') ? h.substring(1) : (h || '');
                            const f = c.length === 3 ? c.split('').map(x => x + x).join('') : c;
                            if (f.length !== 6) return h;
                            let r = parseInt(f.substring(0,2),16), g = parseInt(f.substring(2,4),16), b = parseInt(f.substring(4,6),16);
                            const factor = pct / 100;
                            if (factor >= 0) { r = Math.round(r + (255-r)*factor); g = Math.round(g + (255-g)*factor); b = Math.round(b + (255-b)*factor); }
                            else { r = Math.round(r*(1+factor)); g = Math.round(g*(1+factor)); b = Math.round(b*(1+factor)); }
                            const hx = n => Math.max(0,Math.min(255,n)).toString(16).padStart(2,'0');
                            return `#${hx(r)}${hx(g)}${hx(b)}`;
                        };
                        root.style.setProperty('--brand-primary', primary);
                        root.style.setProperty('--brand-secondary', secondary);
                        root.style.setProperty('--bs-primary', primary);
                        root.style.setProperty('--bs-primary-rgb', toRgb(primary));
                        root.style.setProperty('--bs-secondary', secondary);
                        root.style.setProperty('--bs-secondary-rgb', toRgb(secondary));
                        root.style.setProperty('--config-primary', primary);
                        root.style.setProperty('--config-primary-rgb', toRgb(primary));
                        root.style.setProperty('--config-primary-label', lighten(primary, 90));
                        root.style.setProperty('--config-primary-hover', lighten(primary, -20));
                        root.style.setProperty('--config-primary-focus', lighten(primary, 70));
                        root.style.setProperty('--config-dark-primary', lighten(primary, -30));
                    } catch (_) { /* ignore */ }
                    try { window.dispatchEvent(new Event('sigcon-brand-changed')); } catch (_) {}
                }
            } catch (_) { /* defensive */ }
        })();
        return () => { cancelled = true; };
    }, [user?.companyId, user?.isPlatformAdmin]);

    // QA Bloque AT (HU-PA-13, 2026-05-13): filtrar tambien por permisos
    // efectivos (rol + permisos temporales). Antes solo mostraba modulos
    // tal cual venian del backend; ahora oculta los modulos cuyos menus
    // estan TODOS sin permiso para el usuario actual. Asi un usuario con
    // permiso temporal puntual ve solo el modulo que le corresponde, y
    // no se muestran modulos vacios.
    const modules = allModules
        .filter(mod => mod.id !== 0)
        .map(mod => ({
            ...mod,
            menus: (mod.menus ?? [])
                .filter(m => m.visible)
                .filter(m => isMenuItemVisible(m, has)),
        }))
        .filter(mod => (mod.menus ?? []).length > 0);

    /**
     * Navega al primer submenu visible del modulo.
     * Busca el primer menu padre que tenga hijos visibles, y usa el path del primer hijo.
     * Si no encuentra hijos, usa el path del menu padre directamente.
     */
    const handleModuleClick = (mod) => {
        const menus = mod.menus || [];
        for (const menu of menus) {
            // Buscar primer hijo visible
            const visibleChildren = (menu.childrens || []).filter(c => c.visible !== false);
            if (visibleChildren.length > 0) {
                navigate(`/${mod.url}/${visibleChildren[0].path}`);
                return;
            }
            // Si el menu padre tiene path y es visible
            if (menu.path && menu.visible !== false) {
                navigate(`/${mod.url}/${menu.path}`);
                return;
            }
        }
        if (mod.url) {
            navigate(`/${mod.url}`);
        }
    };

    // Titulo principal del dashboard:
    //  - PLATFORM_ADMIN: muestra "SIGCON" con inicial "S" (marca del sistema)
    //  - Usuario tenant: muestra el nombre comercial guardado en Identidad
    //    Visual (sigcon_brand_theme_{companyId}.brandName) con fallback al
    //    companyName de la empresa si el admin no configuro brand custom.
    // QA Bloque AT (HU-PA-BRAND-01, 2026-05-13): leer del theme scoped permite
    // que al guardar nuevo brandName en /parametrizacion/identidad-visual el
    // dashboard refleje el cambio inmediatamente (igual que el sidebar).
    const isPlatformAdmin = user?.isPlatformAdmin === true;
    const companyName = user?.companyName || '';

    // QA Bloque AV (HU-PA-BRAND-01, 2026-05-14): leer brandName desde state
    // que se re-pueble en eventos sigcon-brand-changed. Asi el dashboard
    // refleja cambios sin requerir refresh manual cuando el usuario actual
    // u otro de la misma empresa modifica la identidad visual.
    const readBrandFromStorage = () => {
        if (isPlatformAdmin || !user?.companyId) return null;
        try {
            const scopedKey = `sigcon_brand_theme_${user.companyId}`;
            const theme = JSON.parse(
                localStorage.getItem(scopedKey)
                || localStorage.getItem('sigcon_brand_theme')
                || '{}'
            );
            return theme.brandName && theme.brandName.trim().length > 0
                ? theme.brandName.trim()
                : null;
        } catch (_) { return null; }
    };
    const [themeBrandName, setThemeBrandName] = useState(readBrandFromStorage);
    useEffect(() => {
        const handler = () => setThemeBrandName(readBrandFromStorage());
        window.addEventListener('sigcon-brand-changed', handler);
        // Tambien escuchar storage events (cambios desde otra pestaña).
        window.addEventListener('storage', handler);
        return () => {
            window.removeEventListener('sigcon-brand-changed', handler);
            window.removeEventListener('storage', handler);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.companyId]);
    const brandTitle = isPlatformAdmin
        ? 'SIGCON'
        : (themeBrandName || companyName || 'SIGCON');
    const brandInitial = (brandTitle.trim()[0] || 'S').toUpperCase();
    const brandSubtitle = isPlatformAdmin
        ? 'Administración de la plataforma'
        : (companyName ? 'SIGCON · Sistema de Gestión Contable' : '');

    return (
        <div className="d-flex flex-column align-items-center w-100" style={{ paddingTop: '1.5rem' }}>
            <div className="text-center mb-5 w-100" style={{ maxWidth: '600px' }}>
                <div className="mb-3 d-flex justify-content-center">
                    <div
                        className="rounded-circle flex-shrink-0"
                        style={{
                            width: '90px',
                            height: '90px',
                            minWidth: '90px',
                            minHeight: '90px',
                            backgroundColor: 'var(--bs-primary)',
                            color: '#fff',
                            fontSize: '2.6rem',
                            fontWeight: 'bold',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            overflow: 'visible',
                        }}
                    >
                        <span style={{ lineHeight: 1, display: 'inline-block' }}>{brandInitial}</span>
                    </div>
                </div>
                <h2
                    className="fw-bold mb-1"
                    style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}
                    title={brandTitle}
                >
                    {brandTitle}
                </h2>
                {brandSubtitle && (
                    <p className="text-muted small mb-2">{brandSubtitle}</p>
                )}
                <h5 className="fw-normal text-muted">
                    Bienvenido, {user?.name ?? ''} {user?.last_name ?? ''}
                </h5>
                <p className="text-muted">Seleccione un modulo para comenzar</p>
            </div>

            {(!modules || modules.length === 0) ? (
                <div className="text-center py-5">
                    <i className="ri-folder-open-line" style={{ fontSize: '3rem', color: '#6c757d' }}></i>
                    <p className="mt-3 text-muted">No tiene modulos asignados</p>
                </div>
            ) : (
                // Grid responsivo con ancho minimo fijo por tarjeta para evitar
                // que un solo modulo (p.ej. PLATFORM_ADMIN) quede con texto partido.
                // Cada tarjeta reserva 220px y el contenedor se adapta con flex-wrap.
                <div className="d-flex flex-wrap justify-content-center gap-4" style={{ maxWidth: '1000px' }}>
                    {modules.map((mod) => (
                        <div
                            key={mod.id}
                            className="card shadow-sm border-0"
                            style={{
                                cursor: 'pointer',
                                transition: 'transform 0.2s, box-shadow 0.2s',
                                width: '220px',
                                minHeight: '200px',
                            }}
                            onClick={() => handleModuleClick(mod)}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-5px)';
                                e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.15)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = '';
                            }}
                        >
                            <div className="card-body text-center py-4 px-3 d-flex flex-column align-items-center">
                                <div
                                    className="rounded-circle d-inline-flex align-items-center justify-content-center mb-3"
                                    style={{
                                        width: '56px',
                                        height: '56px',
                                        backgroundColor: '#e8f0fe',
                                        color: '#1a73e8',
                                    }}
                                >
                                    <i className={mod.icon || 'ri-grid-line'} style={{ fontSize: '1.4rem' }}></i>
                                </div>
                                <h6
                                    className="card-title fw-semibold mb-2"
                                    style={{ fontSize: '0.95rem', wordBreak: 'normal', overflowWrap: 'break-word' }}
                                >
                                    {mod.name}
                                </h6>
                                {mod.description && (
                                    <p
                                        className="card-text text-muted mb-0 text-center"
                                        style={{ fontSize: '0.78rem', lineHeight: 1.3 }}
                                    >
                                        {mod.description}
                                    </p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Home;
