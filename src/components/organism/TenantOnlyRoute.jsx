import { useSelector } from 'react-redux';
import { lazy, Suspense } from 'react';
import PageLoad from '../../pages/errors/page_load';

const Page403 = lazy(() => import('../../pages/errors/page_403'));

/**
 * Bloque AM (2026-05-03): gatekeeper para paginas que solo aplican a un
 * ADMIN_EMPRESA (cuenta de UNA empresa concreta), NO a un PLATFORM_ADMIN.
 *
 * <p>Ejemplos: Identidad Visual, Plantillas/Tipos de Reporte, Retenciones del
 * Sistema, Parametros propios de la empresa. Estos artefactos viven en el
 * tenant del usuario; un PLATFORM_ADMIN sin tenant no tiene una empresa
 * "actual" donde aplicar el cambio, asi que se le rechaza por UX.
 *
 * <p>Tambien rechaza usuarios sin rol admin (igual que AdminRoute).
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
    // Solo admin de empresa pasa.
    if (!user.isAdmin) {
        return (
            <Suspense fallback={<PageLoad />}>
                <Page403 />
            </Suspense>
        );
    }
    return children;
};

export default TenantOnlyRoute;
