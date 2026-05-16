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
     *
     * QA Bloque AV (cobertura plural/singular + legacy, 2026-05-14): tolera
     * variantes plural/singular (VIEW_USER vs VIEW_USERS) y el mapping
     * legacy <-> nuevo (PAR.USUARIOS.VER <-> VIEW_USER). En BD coexisten
     * dos juegos de codes (legacy ingles y nuevo MOD.ENTIDAD.ACCION) y los
     * @PreAuthorize del backend tambien aceptan ambos via el filter; aqui
     * replicamos la misma flexibilidad para que el frontend no muestre 403
     * cuando el backend SI dejaria pasar.
     */
    const has = useCallback((code) => {
        if (!code) return false;
        if (isPlatformAdmin || isAdmin) return true;
        const clean = code.startsWith('PERM_') ? code.substring(5) : code;
        if (permsSet.has(clean)) return true;
        // Variante plural/singular: USER <-> USERS
        if (!clean.endsWith('S') && permsSet.has(clean + 'S')) return true;
        if (clean.endsWith('S') && !clean.endsWith('SS') && clean.length > 1
                && permsSet.has(clean.slice(0, -1))) return true;
        // QA Bloque AW (Opcion B paridad legacy<->nuevo, 2026-05-15):
        // Mapeo bidireccional completo legacy ingles <-> nuevo MOD.ENTIDAD.ACCION.
        // Espejo del Map del backend EffectivePermissionsFilter.LEGACY_TO_NEW.
        // Cualquier nuevo par debe actualizarse en AMBOS archivos.
        const legacyMap = {
            // Parametrizacion
            'PAR.USUARIOS.VER': ['VIEW_USER', 'VIEW_USERS'],
            'PAR.USUARIOS.CREAR': ['CREATE_USER', 'CREATE_USERS'],
            'PAR.USUARIOS.EDITAR': ['UPDATE_USER', 'UPDATE_USERS'],
            'PAR.USUARIOS.DESACTIVAR': ['DELETE_USER', 'DELETE_USERS'],
            'PAR.ROLES.VER': ['VIEW_ROLE', 'VIEW_ROLES'],
            'PAR.ROLES.CREAR': ['CREATE_ROLE'],
            'PAR.ROLES.EDITAR': ['UPDATE_ROLE', 'PARAMETRIZACION.ROLES.EDITAR'],
            'PAR.ROLES.ELIMINAR': ['DELETE_ROLE'],
            'PAR.PERMISOS.VER': ['VIEW_PERMISSION', 'VIEW_PERMISSIONS'],
            'PAR.PERMISOS.CREAR': ['CREATE_PERMISSION'],
            'PAR.PERMISOS.EDITAR': ['UPDATE_PERMISSION'],
            'PAR.PERMISOS.ELIMINAR': ['DELETE_PERMISSION'],
            'PAR.MODULOS.VER': ['VIEW_MODULE', 'VIEW_MODULES'],
            'PAR.MODULOS.CREAR': ['CREATE_MODULE'],
            'PAR.MODULOS.EDITAR': ['UPDATE_MODULE'],
            'PAR.MODULOS.ELIMINAR': ['DELETE_MODULE'],
            'PAR.MENUS.VER': ['VIEW_MENU', 'VIEW_MENUS'],
            'PAR.MENUS.CREAR': ['CREATE_MENU'],
            'PAR.MENUS.EDITAR': ['UPDATE_MENU'],
            'PAR.MENUS.ELIMINAR': ['DELETE_MENU'],
            'PAR.REPORTES_TIPOS.VER': ['VIEW_REPORT_TYPE', 'VIEW_REPORT_TYPES'],
            'PAR.REPORTES_TIPOS.CREAR': ['CREATE_REPORT_TYPE', 'CREATE_REPORT_TYPES'],
            'PAR.REPORTES_TIPOS.EDITAR': ['UPDATE_REPORT_TYPE', 'UPDATE_REPORT_TYPES'],
            'PAR.REPORTES_TIPOS.ELIMINAR': ['DELETE_REPORT_TYPE', 'DELETE_REPORT_TYPES'],
            'PAR.REPORTES_PLANTILLAS.VER': ['VIEW_REPORT_TEMPLATE', 'VIEW_REPORT_TEMPLATES'],
            'PAR.REPORTES_PLANTILLAS.GESTIONAR': ['CREATE_REPORT_TEMPLATE', 'CREATE_REPORT_TEMPLATES', 'DELETE_REPORT_TEMPLATE', 'DELETE_REPORT_TEMPLATES'],
            // Listas Contables
            'CFG.CENTROS_COSTO.VER': ['VIEW_COST_CENTER', 'VIEW_COST_CENTERS'],
            'CFG.CENTROS_COSTO.CREAR': ['CREATE_COST_CENTER'],
            'CFG.CENTROS_COSTO.EDITAR': ['UPDATE_COST_CENTER'],
            'CFG.CENTROS_COSTO.ELIMINAR': ['DELETE_COST_CENTER'],
            // Terceros
            'TER.TERCEROS.VER': ['VIEW_THIRD_PARTY', 'VIEW_THIRD_PARTIES'],
            'TER.TERCEROS.CREAR': ['CREATE_THIRD_PARTY', 'CREATE_THIRD_PARTIES'],
            'TER.TERCEROS.EDITAR': ['UPDATE_THIRD_PARTY', 'MANAGE_THIRD_PARTY_ROLES_STATUS'],
            'TER.TERCEROS.DAR_DE_BAJA': ['DELETE_THIRD_PARTY', 'DELETE_THIRD_PARTIES'],
            'TER.SEGMENTACION.VER': ['VIEW_ECL_SEGMENT'],
            // Bancos y Cajas
            'BNK.BANCOS.VER': ['VIEW_BANK'],
            'BNK.BANCOS.CREAR': ['CREATE_BANK'],
            'BNK.BANCOS.EDITAR': ['UPDATE_BANK'],
            'BNK.BANCOS.ELIMINAR': ['DELETE_BANK'],
            'BNK.CHEQUES.ELIMINAR': ['DELETE_BANK_CHECK'],
            'BNK.CHEQUES.ANULAR': ['VOID_BANK_CHECK'],
            'BNK.CHEQUES.CONCILIAR': ['RECONCILE_BANK_CHECK'],
            'BNK.CHEQUES.REPORTAR_PERDIDO': ['REPORT_LOST_BANK_CHECK'],
            // Cuentas por Cobrar
            'AR.FACTURAS_VENTA.VER': ['VIEW_SALES_INVOICE', 'READ_SALES_INVOICE'],
            'AR.FACTURAS_VENTA.CREAR': ['CREATE_SALES_INVOICE'],
            'AR.FACTURAS_VENTA.EDITAR': ['UPDATE_SALES_INVOICE'],
            'AR.FACTURAS_VENTA.ANULAR': ['DELETE_SALES_INVOICE'],
            'AR.COBROS.VER': ['READ_AR_PAYMENT'],
            'AR.COBROS.CREAR': ['CREATE_AR_PAYMENT'],
            'AR.ANTICIPOS.VER': ['READ_AR_ADVANCE'],
            'AR.ANTICIPOS.CREAR': ['CREATE_AR_ADVANCE'],
            'AR.NOTAS.VER': ['READ_AR_NOTE'],
            'AR.NOTAS.CREAR': ['CREATE_AR_NOTE'],
            'AR.RESOLUCIONES_DIAN.VER': ['VIEW_DIAN_RESOLUTION', 'READ_DIAN_RESOLUTION'],
            'AR.RESOLUCIONES_DIAN.CREAR': ['CREATE_DIAN_RESOLUTION'],
            'AR.RESOLUCIONES_DIAN.EDITAR': ['UPDATE_DIAN_RESOLUTION'],
            'AR.RESOLUCIONES_DIAN.ELIMINAR': ['DELETE_DIAN_RESOLUTION'],
            'AR.DIAN.GENERAR': ['READ_DIAN', 'READ_DIAN_REPORT', 'CREATE_DIAN_XML', 'SUBMIT_DIAN'],
            // Contabilidad General
            'CG.LIBROS.VER': ['VIEW_ACCOUNTING'],
            'CG.REPORTES.VER': ['VIEW_TAX_REPORT'],
        };
        const legacies = legacyMap[clean];
        if (Array.isArray(legacies) && legacies.some(l => permsSet.has(l))) return true;
        // Reverse: si requirePerm pide el legacy y el user tiene el nuevo
        for (const [nuevo, legs] of Object.entries(legacyMap)) {
            if (legs.includes(clean) && permsSet.has(nuevo)) return true;
        }
        return false;
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
