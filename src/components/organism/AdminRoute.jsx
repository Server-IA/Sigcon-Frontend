import { useSelector } from 'react-redux';
import { lazy, Suspense } from 'react';
import PageLoad from '../../pages/errors/page_load';

const Page403 = lazy(() => import('../../pages/errors/page_403'));

/**
 * HU-INT-RF-14 E5 (gatekeeper JSX): wrapper que protege rutas que requieren
 * rol ADMIN/SUPERADMIN.
 *
 * <p>Verifica el flag {@code isAdmin} en el Redux store (calculado en
 * {@code userReducer.jsx} a partir de {@code user.roles}). Si el usuario NO es
 * admin, renderiza Page403 en lugar del componente protegido. Si es admin,
 * renderiza los hijos.
 *
 * <p>Uso:
 * <pre>
 *   import AdminRoute from '../../../components/organism/AdminRoute';
 *
 *   const MyAdminPage = () => (
 *     &lt;AdminRoute&gt;
 *       &lt;ContenidoSensible /&gt;
 *     &lt;/AdminRoute&gt;
 *   );
 * </pre>
 *
 * <p>Coordina con el backend: cada endpoint admin tiene
 * {@code @PreAuthorize("hasAuthority('ROLE_ADMIN')")}, asi que un usuario
 * regular que llegue a la URL directamente recibe 403 desde el backend incluso
 * si el frontend no le bloquea. Este componente es solo para UX (redirige
 * antes de hacer el request).
 *
 * @param children - Componente o JSX a renderizar si el usuario es admin
 */
const AdminRoute = ({ children }) => {
    const user = useSelector(state => state.user.user);
    // Bloque AM (2026-05-03): tambien permitir PLATFORM_ADMIN. La cuenta de
    // plataforma debe poder acceder a las paginas de admin (Identidad Visual,
    // Tipos/Plantillas de Reporte, Retenciones Sistema). Antes solo isAdmin
    // (ADMIN_EMPRESA) pasaba; el platform admin recibia 403 al intentar
    // configurar paginas de la propia plataforma.
    const isAdmin = user?.isAdmin || user?.isPlatformAdmin || false;

    if (!user) {
        // No hay usuario logueado todavia - mostrar loading mientras se hidrata
        return <PageLoad />;
    }

    if (!isAdmin) {
        // Usuario regular que llego a una ruta solo-admin - 403
        return (
            <Suspense fallback={<PageLoad />}>
                <Page403 />
            </Suspense>
        );
    }

    return children;
};

export default AdminRoute;
