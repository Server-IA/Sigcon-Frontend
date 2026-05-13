import { useSelector } from 'react-redux';
import { lazy, Suspense } from 'react';
import PageLoad from '../../pages/errors/page_load';

const Page403 = lazy(() => import('../../pages/errors/page_403'));

/**
 * Bloque AM (2026-05-03): gatekeeper para paginas que solo aplican a un
 * tenant (cuenta de UNA empresa concreta), NO a un PLATFORM_ADMIN.
 *
 * <p>Ejemplos: Identidad Visual, Plantillas/Tipos de Reporte, Retenciones del
 * Sistema, Parametros propios de la empresa. Estos artefactos viven en el
 * tenant del usuario; un PLATFORM_ADMIN sin tenant no tiene una empresa
 * "actual" donde aplicar el cambio, asi que se le rechaza por UX.
 *
 * <p>QA Bloque AT (HU-PA-13 E7 + HU-PA-12, 2026-05-13): se removio la
 * exigencia de {@code user.isAdmin}. Antes solo ADMIN_EMPRESA pasaba este
 * gate; ahora cualquier usuario tenant pasa y el filtro fino de permiso
 * atomico lo aplica {@code PermissionRoute} downstream (anidado mediante
 * el helper {@code tenantOnly(requirePerm(Component, permiso))} en
 * {@code map_menu.jsx}). Asi un OPERADOR_NOMINA con
 * {@code PAR.PERMISOS_TEMPORALES.VER} puede entrar a la pagina pero un
 * contador sin permiso recibe 403 igualmente — la diferencia es que la
 * autorizacion es por permiso atomico, no por rol global.
 */
const TenantOnlyRoute = ({ children }) => {
    const user = useSelector(state => state.user.user);

    if (!user) {
        return <PageLoad />;
    }
    // Platform admin no entra: estas paginas son tenant-specific.
    if (user.isPlatformAdmin) {
        return (
            <Suspense fallback={<PageLoad />}>
                <Page403 />
            </Suspense>
        );
    }
    return children;
};

export default TenantOnlyRoute;
