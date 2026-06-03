/**
 * QA Bloque BF (2026-05-17): hook que mantiene los effectivePermissions del
 * usuario sincronizados con el backend SIN requerir logout/login.
 *
 * <p>Contexto del bug:
 * - El backend recomputa authorities en CADA request via EffectivePermissionsFilter
 *   (Bloque AV). Cuando un admin asigna/revoca permisos, el siguiente request
 *   del usuario afectado ya recibe los nuevos perms en el set Spring Security.
 * - PERO el frontend lee effectivePermissions del Redux store, que se carga
 *   UNA VEZ al hacer login (POST /auth/login devuelve la lista). Aunque el
 *   backend ya conoce los nuevos perms, los botones/menus condicionados a
 *   has(...) siguen evaluando contra el set viejo.
 * - Sintoma reportado: tras agregar un perm a un rol, los botones no aparecen
 *   hasta hacer logout + login.
 *
 * <p>Estrategia (multi-trigger):
 * 1. <b>Polling</b> cada {@code intervalMs} (default 30s). Cubre el caso de un
 *    admin que asigna perms a OTRO usuario mientras este sigue trabajando.
 * 2. <b>visibilitychange</b>: cuando el usuario vuelve a la pestania tras
 *    estar en otra app, refrescar. Util si el admin trabaja en otra tab.
 * 3. <b>focus</b>: cuando la ventana del navegador recupera el foco, idem.
 * 4. <b>route change</b>: cada vez que cambia la URL (navegacion entre paginas),
 *    refrescar. Asi al menos cada click de menu ya tiene perms frescos.
 *
 * <p>El refresh llama GET /auth/me/effective-permissions y dispatch
 * UPDATE_EFFECTIVE_PERMISSIONS al reducer. usePermissions.has(...) lee del
 * mismo set, asi que los botones se re-renderizan automaticamente.
 *
 * <p>Reglas de seguridad:
 * - Solo refresca si hay token y usuario en el store. Sino sale temprano.
 * - Si el fetch falla (red caida, 401), NO toca el store. Mantiene los perms
 *   previos para que el usuario pueda seguir trabajando offline-ish.
 * - El intervalo se limpia al desmontar (cleanup) o cambiar de usuario.
 *
 * <p>Uso:
 * <pre>
 *   const MainTemplate = () => {
 *     usePermissionAutoRefresh();
 *     return ...
 *   };
 * </pre>
 *
 * @param {number} intervalMs - intervalo de polling en ms (default 30000 = 30s)
 */
import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { usePermissions } from './usePermissions';

export function usePermissionAutoRefresh(intervalMs = 30000) {
    const user = useSelector(state => state.user.user);
    const { refresh } = usePermissions();
    const location = useLocation();
    const lastRefreshRef = useRef(0);

    // Helper: refresh con guard de throttle (max 1 cada 5s).
    // Evita ataques de race cuando varios triggers se disparan a la vez
    // (focus + visibility + route change pueden coincidir).
    const refreshThrottled = async (reason) => {
        const now = Date.now();
        if (now - lastRefreshRef.current < 5000) {
            // Skip: ya refresco hace <5s
            return;
        }
        lastRefreshRef.current = now;
        try {
            await refresh();
            // No logueo cada refresh para no ensuciar la consola en prod.
            // En dev cambiar a console.debug si se quiere ver el ritmo.
        } catch (err) {
            console.warn('usePermissionAutoRefresh: refresh fallo', reason, err);
        }
    };

    // Trigger 1: polling cada intervalMs (solo si hay usuario logueado)
    useEffect(() => {
        if (!user || !user.email) return undefined;
        const id = setInterval(() => {
            refreshThrottled('interval');
        }, intervalMs);
        return () => clearInterval(id);
    }, [user?.email, intervalMs]);

    // Trigger 2 + 3: focus + visibilitychange
    useEffect(() => {
        if (!user || !user.email) return undefined;
        const onFocus = () => refreshThrottled('focus');
        const onVis = () => {
            if (document.visibilityState === 'visible') {
                refreshThrottled('visibility');
            }
        };
        window.addEventListener('focus', onFocus);
        document.addEventListener('visibilitychange', onVis);
        return () => {
            window.removeEventListener('focus', onFocus);
            document.removeEventListener('visibilitychange', onVis);
        };
    }, [user?.email]);

    // Trigger 4: cambio de ruta. Sustituye al usuario que navega.
    useEffect(() => {
        if (!user || !user.email) return;
        // Pequenio delay para que el route change termine de montar.
        const t = setTimeout(() => refreshThrottled('route:' + location.pathname), 200);
        return () => clearTimeout(t);
    }, [location.pathname, user?.email]);

    // Trigger 5 (Pendientes PA 2026-05-30, BUG permisos FE): evento explicito
    // 'sigcon:refresh-permissions' que emite NotificationBell al recibir por SSE
    // una notif de cambio de rol/permiso (USER_ROLE_ADDED/REMOVED,
    // ROLE_PERMISSIONS_CHANGED, TEMP_PERMISSION_*). Refresh INMEDIATO sin throttle:
    // el admin acaba de cambiar permisos y el usuario debe ver el efecto al instante.
    useEffect(() => {
        if (!user || !user.email) return undefined;
        const onForce = async () => {
            lastRefreshRef.current = Date.now(); // marca para no duplicar con otros triggers
            try {
                await refresh();
            } catch (err) {
                console.warn('usePermissionAutoRefresh: refresh forzado (rol/permiso) fallo', err);
            }
        };
        window.addEventListener('sigcon:refresh-permissions', onForce);
        return () => window.removeEventListener('sigcon:refresh-permissions', onForce);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.email]);
}

export default usePermissionAutoRefresh;
