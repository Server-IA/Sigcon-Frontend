import { useSelector } from 'react-redux';
import { lazy, Suspense } from 'react';
import PageLoad from '../../pages/errors/page_load';
import { usePermissions } from '../../utils/hooks/usePermissions';

const Page403 = lazy(() => import('../../pages/errors/page_403'));

/**
 * HU-PA-09 E7 + HU-PA-12 E3 (Bloque AS, 2026-05-13): wrapper que protege rutas
 * por permiso GRANULAR.
 *
 * <p>A diferencia de AdminRoute / TenantOnlyRoute / PlatformRoute (que solo
 * miran el flag isAdmin / isPlatformAdmin), este componente valida el conjunto
 * effectivePermissions del usuario contra un permiso atomico (ej.
 * {@code 'PAR.USUARIOS.VER'}). Si no lo tiene, redirige a Page403 antes de
 * montar el componente hijo.
 *
 * <p>Coordina con el backend: cada endpoint protegido tiene su
 * {@code @PreAuthorize} que evalua el permiso. Aun si un usuario sin permiso
 * llega a la URL directamente, no vera el formulario porque el frontend lo
 * intercepta antes y el backend devuelve 403 si llega la request.
 *
 * <p>Reglas:
 * <ul>
 *   <li>PLATFORM_ADMIN bypass (true para cualquier permiso, ya esta en usePermissions).</li>
 *   <li>ADMIN_EMPRESA bypass (true para cualquier permiso, ya esta en usePermissions).</li>
 *   <li>Resto: usa {@code usePermissions().has(code)} contra el set effectivePermissions.</li>
 * </ul>
 *
 * <p>Uso:
 * <pre>
 *   const ProtectedPage = () => (
 *     &lt;PermissionRoute permission="PAR.USUARIOS.VER"&gt;
 *       &lt;UsersListPage /&gt;
 *     &lt;/PermissionRoute&gt;
 *   );
 * </pre>
 *
 * @param children - Componente o JSX a renderizar si tiene permiso
 * @param permission - Codigo del permiso atomico requerido (ej. 'PAR.USUARIOS.VER')
 */
const PermissionRoute = ({ children, permission }) => {
    const user = useSelector(state => state.user.user);
    const { has } = usePermissions();

    if (!user) {
        return <PageLoad />;
    }

    if (!permission) {
        // sin permiso requerido — renderizar libre
        return children;
    }

    if (!has(permission)) {
        return (
            <Suspense fallback={<PageLoad />}>
                <Page403 />
            </Suspense>
        );
    }

    return children;
};

export default PermissionRoute;
