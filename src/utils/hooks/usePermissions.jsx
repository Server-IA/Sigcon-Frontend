/**
 * HU-PA-12: Hook unico para verificar permisos en frontend.
 *
 * Es la fuente de verdad. Reemplaza usos como
 *   user.permissions.find(p => p.code === 'XXX')
 * o
 *   user.permissions.filter(p => p.code.includes('XXX'))
 *
 * Uso:
 *   const { has, hasAny, hasAll, isAdmin, isPlatformAdmin, refresh } = usePermissions();
 *   if (has('PAR.ROLES.CREAR')) { ... }
 *   if (hasAny(['AR.FACTURAS_VENTA.CREAR','AR.COBROS_Y_PAGOS_AR.CREAR'])) { ... }
 *
 * Reglas:
 *   - PLATFORM_ADMIN devuelve true para CUALQUIER permiso (bypass).
 *   - ADMIN_EMPRESA tambien devuelve true (legacy ROLE_ADMIN para no romper UI antigua).
 *   - El resto: chequea contra el set effectivePermissions cargado en Redux.
 *
 * E4 (HU-PA-12): refresh() llama GET /auth/me/effective-permissions y
 * actualiza el store sin re-login.
 */
import { useDispatch, useSelector } from 'react-redux';
import { useCallback } from 'react';
import { fetchHelper } from '../fetch';
import { base_url } from '../functions';

export function usePermissions() {
    const dispatch = useDispatch();
    const user = useSelector(state => state.user.user);

    const isAdmin = !!user?.isAdmin;
    const isPlatformAdmin = !!user?.isPlatformAdmin;

    // Conjunto de permisos efectivos del usuario actual.
    // Lo normalizamos a Set para lookups O(1).
    const permsArray = user?.effectivePermissions || [];
    const permsSet = new Set(permsArray);

    /**
     * has(code): true si el usuario tiene el permiso atomico exacto.
     * Acepta el code con o sin prefijo PERM_ (lo strippea para flexibilidad).
     */
    const has = useCallback((code) => {
        if (!code) return false;
        if (isPlatformAdmin || isAdmin) return true;
        const clean = code.startsWith('PERM_') ? code.substring(5) : code;
        return permsSet.has(clean);
    }, [isPlatformAdmin, isAdmin, permsSet]);

    /**
     * hasAny(codes): true si tiene al menos uno de los codes.
     */
    const hasAny = useCallback((codes) => {
        if (!Array.isArray(codes) || codes.length === 0) return false;
        if (isPlatformAdmin || isAdmin) return true;
        return codes.some(c => has(c));
    }, [isPlatformAdmin, isAdmin, has]);

    /**
     * hasAll(codes): true si tiene TODOS los codes.
     */
    const hasAll = useCallback((codes) => {
        if (!Array.isArray(codes) || codes.length === 0) return false;
        if (isPlatformAdmin || isAdmin) return true;
        return codes.every(c => has(c));
    }, [isPlatformAdmin, isAdmin, has]);

    /**
     * refresh(): re-resuelve effectivePermissions desde el backend
     * (HU-PA-11 endpoint /auth/me/effective-permissions). Util tras
     * cambios de rol o permisos sin requerir re-login.
     */
    const refresh = useCallback(async () => {
        try {
            const resp = await fetchHelper.get(base_url(['auth', 'me', 'effective-permissions']));
            const list = resp?.data?.effectivePermissions || resp?.effectivePermissions || [];
            dispatch({ type: 'UPDATE_EFFECTIVE_PERMISSIONS', payload: list });
            return list;
        } catch (err) {
            console.warn('usePermissions.refresh failed', err);
            return null;
        }
    }, [dispatch]);

    return {
        has,
        hasAny,
        hasAll,
        refresh,
        isAdmin,
        isPlatformAdmin,
        all: permsArray,
    };
}

export default usePermissions;
