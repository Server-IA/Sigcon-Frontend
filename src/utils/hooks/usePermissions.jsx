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
            // Contabilidad General - LIBROS y REPORTES
            'CG.LIBROS.VER': ['VIEW_ACCOUNTING'],
            'CG.LIBRO_DIARIO.VER': ['VIEW_ACCOUNTING'],
            'CG.LIBRO_MAYOR.VER': ['VIEW_ACCOUNTING'],
            'CG.REPORTES.VER': ['VIEW_TAX_REPORT'],
            // CG - COMPROBANTES (Bloque AY)
            'CG.COMPROBANTES.VER': ['VIEW_JOURNAL_ENTRY', 'SEARCH_JOURNAL_ENTRY', 'READ_JOURNAL_ENTRY'],
            'CG.COMPROBANTES.CREAR': ['CREATE_JOURNAL_ENTRY'],
            'CG.COMPROBANTES.EDITAR': ['UPDATE_JOURNAL_ENTRY'],
            'CG.COMPROBANTES.ANULAR': ['DELETE_JOURNAL_ENTRY', 'VOID_JOURNAL_ENTRY'],
            'CG.COMPROBANTES.APROBAR': ['POST_JOURNAL_ENTRY', 'APPROVE_JOURNAL_ENTRY'],
            'CG.COMPROBANTES.CONTABILIZAR': ['POST_JOURNAL_ENTRY'],
            'CG.COMPROBANTES.REVERSAR': ['REVERSE_JOURNAL_ENTRY'],
            // CG - Periodos, estados, cierres
            'CG.PERIODOS.VER': ['VIEW_ACCOUNTING_PERIOD'],
            'CG.PERIODOS.ABRIR': ['OPEN_ACCOUNTING_PERIOD'],
            'CG.PERIODOS.CERRAR': ['CLOSE_ACCOUNTING_PERIOD'],
            'CG.ESTADOS_FINANCIEROS.VER': ['VIEW_FINANCIAL_STATEMENT'],
            'CG.CIERRES.VER': ['VIEW_CLOSING'],
            'CG.CIERRES.EJECUTAR_MENSUAL': ['EXECUTE_MONTHLY_CLOSING'],
            'CG.CIERRES.EJECUTAR_ANUAL': ['EXECUTE_ANNUAL_CLOSING'],
            // Activos
            'ACT.ACTIVOS.VER': ['VIEW_ASSET', 'VIEW_ASSETS', 'SEARCH_ASSETS'],
            'ACT.ACTIVOS.CREAR': ['CREATE_ASSET'],
            'ACT.ACTIVOS.EDITAR': ['UPDATE_ASSET'],
            'ACT.ACTIVOS.DAR_DE_BAJA': ['DELETE_ASSET'],
            'ACT.ACTIVOS.EJECUTAR_DEPRECIACION': ['EXECUTE_DEPRECIATION'],
            'ACT.ACTIVOS.REVALUAR': ['REVALUE_ASSET'],
            'ACT.ACTIVOS.EXPORTAR_REPORTE': ['EXPORT_ASSET_REPORT'],
            // CFG cuentas/depreciacion/reglas/monedas/tasas
            'CFG.CUENTAS.VER': ['VIEW_ACCOUNTING_ACCOUNT', 'VIEW_ACCOUNTING_ACCOUNTS', 'VIEW_CHART_OF_ACCOUNT', 'VIEW_CHART_OF_ACCOUNTS'],
            'CFG.CUENTAS.CREAR': ['CREATE_ACCOUNTING_ACCOUNT', 'CREATE_CHART_OF_ACCOUNT'],
            'CFG.CUENTAS.EDITAR': ['UPDATE_ACCOUNTING_ACCOUNT', 'UPDATE_CHART_OF_ACCOUNT'],
            'CFG.CUENTAS.ELIMINAR': ['DELETE_ACCOUNTING_ACCOUNT', 'DELETE_CHART_OF_ACCOUNT'],
            'CFG.DEPRECIACION.VER': ['VIEW_DEPRECIATION_RULE', 'VIEW_DEPRECIATION_RULES'],
            'CFG.DEPRECIACION.CREAR': ['CREATE_DEPRECIATION_RULE'],
            'CFG.DEPRECIACION.EDITAR': ['UPDATE_DEPRECIATION_RULE'],
            'CFG.DEPRECIACION.ELIMINAR': ['DELETE_DEPRECIATION_RULE'],
            'CFG.REGLAS_TRIBUTARIAS.VER': ['VIEW_RULER_TAX', 'SEARCH_RULER_TAX'],
            'CFG.REGLAS_TRIBUTARIAS.CREAR': ['CREATE_RULER_TAX'],
            'CFG.REGLAS_TRIBUTARIAS.EDITAR': ['UPDATE_RULER_TAX'],
            'CFG.REGLAS_TRIBUTARIAS.ELIMINAR': ['DELETE_RULER_TAX'],
            'CFG.REGLAS_TRIBUTARIAS.ASIGNAR_CUENTA': ['ASSIGN_ACCOUNTING_ACCOUNT_TO_RULER_TAX'],
            'CFG.MONEDAS.VER': ['VIEW_CURRENCY_TYPE'],
            'CFG.MONEDAS.CREAR': ['CREATE_CURRENCY_TYPE'],
            'CFG.MONEDAS.EDITAR': ['UPDATE_CURRENCY_TYPE'],
            'CFG.MONEDAS.ELIMINAR': ['DELETE_CURRENCY_TYPE'],
            'CFG.TASA_CAMBIO.VER': ['VIEW_EXCHANGE_RATE', 'VIEW_EXCHANGE_RATES'],
            'CFG.TASA_CAMBIO.REGISTRAR': ['CREATE_EXCHANGE_RATE', 'CREATE_EXCHANGE_RATES'],
            'CFG.TASA_CAMBIO.EDITAR': ['UPDATE_EXCHANGE_RATES'],
            'CFG.TASA_CAMBIO.ELIMINAR': ['DELETE_EXCHANGE_RATES'],
            'CFG.FORMAS_PAGO.VER': ['VIEW_PAYMENT_FORM'],
            'CFG.PLAZOS_PAGO.VER': ['VIEW_PAYMENT_TERM'],
            // Bancos
            'BNK.CUENTAS.VER': ['VIEW_BANK_ACCOUNT', 'VIEW_BANK_ACCOUNTS'],
            'BNK.CUENTAS.CREAR': ['CREATE_BANK_ACCOUNT'],
            'BNK.CUENTAS.EDITAR': ['UPDATE_BANK_ACCOUNT'],
            'BNK.CUENTAS.ELIMINAR': ['DELETE_BANK_ACCOUNT'],
            'BNK.SUCURSALES.VER': ['VIEW_BANK_BRANCH'],
            'BNK.SUCURSALES.CREAR': ['CREATE_BANK_BRANCH'],
            'BNK.SUCURSALES.EDITAR': ['UPDATE_BANK_BRANCH'],
            'BNK.CHEQUERAS.VER': ['VIEW_CHECKBOOK'],
            'BNK.CHEQUERAS.CREAR': ['CREATE_CHECKBOOK'],
            'BNK.CHEQUERAS.EDITAR': ['UPDATE_CHECKBOOK'],
            'BNK.CHEQUES.VER': ['VIEW_CHECK'],
            'BNK.CHEQUES.EMITIR': ['CREATE_CHECK', 'EMIT_CHECK'],
            'BNK.CHEQUES.EDITAR': ['UPDATE_CHECK'],
            'BNK.CHEQUES.COBRAR': ['CASH_CHECK'],
            'BNK.CAJAS.VER': ['VIEW_CASH'],
            'BNK.CAJAS.CREAR': ['CREATE_CASH'],
            'BNK.CAJAS.EDITAR': ['UPDATE_CASH'],
            'BNK.CAJAS.ELIMINAR': ['DELETE_CASH'],
            'BNK.MOVIMIENTOS.VER': ['VIEW_FINANCIAL_MOVEMENT'],
            'BNK.MOVIMIENTOS.CREAR': ['CREATE_FINANCIAL_MOVEMENT'],
            'BNK.MOVIMIENTOS.EDITAR': ['UPDATE_FINANCIAL_MOVEMENT'],
            'BNK.MOVIMIENTOS.ANULAR': ['VOID_FINANCIAL_MOVEMENT'],
            'BNK.CONCILIACION.VER': ['VIEW_BANK_RECONCILIATION'],
            'BNK.CONCILIACION.CREAR': ['CREATE_BANK_RECONCILIATION'],
            'BNK.CONCILIACION.EDITAR': ['UPDATE_BANK_RECONCILIATION'],
            'BNK.CONCILIACION.APROBAR': ['APPROVE_BANK_RECONCILIATION'],
            'BNK.ARQUEOS.VER': ['VIEW_CASH_AUDIT'],
            'BNK.ARQUEOS.CREAR': ['CREATE_CASH_AUDIT'],
            'BNK.ARQUEOS.APROBAR': ['APPROVE_CASH_AUDIT'],
            'BNK.ARQUEOS.RECHAZAR': ['REJECT_CASH_AUDIT'],
            'BNK.PROYECCIONES.VER': ['VIEW_CASH_FLOW_PROJECTION'],
            'BNK.PROYECCIONES.CREAR': ['CREATE_CASH_FLOW_PROJECTION'],
            'BNK.PROYECCIONES.EDITAR': ['UPDATE_CASH_FLOW_PROJECTION'],
            'BNK.PROYECCIONES.ELIMINAR': ['DELETE_CASH_FLOW_PROJECTION'],
            // AP
            'AP.FACTURAS_COMPRA.VER': ['VIEW_INVOICE', 'READ_INVOICE', 'READ_AP_INVOICE', 'VIEW_AP_INVOICE', 'SEARCH_AP_INVOICE'],
            'AP.FACTURAS_COMPRA.CREAR': ['CREATE_INVOICE_FC'],
            'AP.FACTURAS_COMPRA.EDITAR': ['UPDATE_INVOICE', 'UPDATE_AP_INVOICE', 'CREATE_INVOICE_ATTACHMENT', 'DELETE_INVOICE_ATTACHMENT'],
            'AP.FACTURAS_COMPRA.ANULAR': ['DELETE_INVOICE', 'DELETE_AP_INVOICE'],
            'AP.FACTURAS_COMPRA.LIQUIDAR': ['SETTLE_INVOICE'],
            'AP.FACTURAS_COMPRA.CARGA_MASIVA': ['BULK_IMPORT_INVOICE'],
            'AP.PAGOS.VER': ['READ_AP_PAYMENT'],
            'AP.PAGOS.CREAR': ['CREATE_AP_PAYMENT'],
            'AP.PAGOS.CONCILIAR': ['RECONCILE_AP_PAYMENT'],
            'AP.ANTICIPOS.VER': ['READ_AP_ADVANCE'],
            'AP.ANTICIPOS.CREAR': ['CREATE_AP_ADVANCE'],
            'AP.NOTAS.VER': ['READ_AP_NOTE'],
            'AP.NOTAS.CREAR': ['CREATE_AP_NOTE'],
            'AP.OC.VER': ['READ_PURCHASE_ORDER'],
            'AP.OC.CREAR': ['CREATE_PURCHASE_ORDER'],
            'AP.OC.EDITAR': ['UPDATE_PURCHASE_ORDER'],
            'AP.OC.APROBAR': ['APPROVE_PURCHASE_ORDER'],
            'AP.OC.RECHAZAR': ['REJECT_PURCHASE_ORDER'],
            'AP.RECEPCIONES.VER': ['READ_GOODS_RECEIPT'],
            'AP.RECEPCIONES.CREAR': ['CREATE_GOODS_RECEIPT', 'UPDATE_GOODS_RECEIPT'],
            'AP.DEVOLUCIONES.VER': ['READ_GOODS_RETURN'],
            'AP.DEVOLUCIONES.CREAR': ['CREATE_GOODS_RETURN'],
            'AP.REPORTES.VER': ['READ_AP_REPORT'],
            'AP.REPORTES.EXPORTAR': ['EXPORT_AP_REPORT'],
            // Terceros extras
            'TER.CUENTAS_BANCARIAS.VER': ['VIEW_THIRD_PARTY_BANK_ACCOUNT'],
            'TER.CUENTAS_BANCARIAS.CREAR': ['CREATE_THIRD_PARTY_BANK_ACCOUNT'],
            'TER.CUENTAS_BANCARIAS.EDITAR': ['UPDATE_THIRD_PARTY_BANK_ACCOUNT'],
            'TER.DATOS_COMERCIALES.VER': ['VIEW_COMMERCIAL_DATA'],
            'TER.DATOS_COMERCIALES.CREAR': ['CREATE_COMMERCIAL_DATA'],
            'TER.DATOS_COMERCIALES.EDITAR': ['UPDATE_COMMERCIAL_DATA'],
            'TER.DATOS_COMERCIALES.ELIMINAR': ['DELETE_COMMERCIAL_DATA'],
            'TER.SEGMENTACION.AJUSTAR': ['ADJUST_ECL_SEGMENT', 'CALCULATE_ECL_SEGMENT'],
            'TER.SEGMENTACION.VER': ['VIEW_ECL_SEGMENT'],
            'TER.RIESGO.VER': ['VIEW_ECL_SEGMENT'],
            'TER.RIESGO.AJUSTAR_MANUAL': ['ADJUST_ECL_SEGMENT'],
            'TER.TERCEROS.EXPORTAR': ['EXPORT_THIRD_PARTY'],
            'TER.TERCEROS.IMPORTAR_MASIVO': ['BULK_STORE_THIRD_PARTY'],
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
            // QA Nomina (2026-05-25) ERR-NOM-007: este refresh lo dispara
            // usePermissionAutoRefresh en CADA cambio de ruta, focus, visibility
            // y cada 30s. Con el `time` por defecto (1) abria el SweetAlert de
            // carga BLOQUEANTE de fetchHelper en cada navegacion -> spinner "( )"
            // recurrente sobre toda la app (lo que QA vio en todo el modulo de
            // Nomina). Es una sincronizacion de fondo: debe ser SILENCIOSA (time=0).
            const resp = await fetchHelper.get(base_url(['auth', 'me', 'effective-permissions']), {}, 0);
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
