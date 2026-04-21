import { useSelector } from 'react-redux';
import { lazy, Suspense } from 'react';
import PageLoad from '../../pages/errors/page_load';

const Page403 = lazy(() => import('../../pages/errors/page_403'));

/**
 * Bloque F (multi-tenant): gatekeeper para rutas {@code /platform/*}.
 * Solo los usuarios con {@code platformRole === 'PLATFORM_ADMIN'} pueden acceder.
 *
 * <p>El backend ademas protege cada endpoint con
 * {@code @PreAuthorize("hasAuthority('PLATFORM_ADMIN')")}, asi que un admin de
 * empresa que llegue a la URL directamente recibe 403 desde el servidor. Este
 * componente es para UX: redirige antes de hacer el request.
 */
const PlatformRoute = ({ children }) => {
    const user = useSelector(state => state.user.user);
    const isPlatformAdmin = user?.isPlatformAdmin || false;

    if (!user) {
        return <PageLoad />;
    }
    if (!isPlatformAdmin) {
        return (
            <Suspense fallback={<PageLoad />}>
                <Page403 />
            </Suspense>
        );
    }
    return children;
};

export default PlatformRoute;
