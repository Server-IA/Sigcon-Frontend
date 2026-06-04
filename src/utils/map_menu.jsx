import Home from "../pages/home/index";
import PerfilPage from "../pages/parametrizacion/perfil/index";
// Sprint 2 — HU-PA-BRAND-01 + HU-PA-NAV-01
import IdentidadVisualPage from "../pages/parametrizacion/identidad-visual/index";
import NavegacionPage from "../pages/parametrizacion/navegacion/index";
// Sprint 4 — HU-PA-18 notificaciones por rol
import NotificacionesRolPage from "../pages/parametrizacion/notificaciones-rol/index";

// Parametrizacion
import IndexModules from "../pages/parametrizacion/modules/index";
import IndexMenus from "../pages/parametrizacion/menus/index";
import PermissionsIndex from "../pages/parametrizacion/permissions/index";
import IndexUsers from "../pages/parametrizacion/users/index";
import IndexTemporaryPermissions from "../pages/parametrizacion/permisos-temporales/index";

import IndexRoles from "../pages/parametrizacion/roles/index";
import IndexParameters from "../pages/parametrizacion/parameters/index";
import IndexCentrosCosto from "../pages/list_accounts/centros-costo/index";
import MenuPermissionIndex from "../pages/parametrizacion/menus-permissions";
import IndexCuentasContables from "../pages/list_accounts/cuentas-contables/index";

// Activos
import IndexAssets from "../pages/assets/assets_registry/index";

// List Accounts
import IndexDepreciationRules from "../pages/list_accounts/depreciation_rules/index";
import ExchangeRateIndex from "../pages/list_accounts/exchange-rate/index";
import CurrencyIndex from "../pages/list_accounts/currency/index";
import RulesTaxIndex from "../pages/list_accounts/rules_tax/index";
import IndexPUC from "../pages/list_accounts/puc/index";

// Reportes
import RepBalanceComprobacion from "../pages/list_accounts/rep-balance-comprobacion/BalanceComprobacion";
import RepLibroDiario from "../pages/list_accounts/rep-libro-diario/LibroDiario";
import RepLibroMayor from "../pages/list_accounts/rep-libro-mayor/LibroMayor";
import RepAuxiliaresCuentas from "../pages/list_accounts/rep-auxiliares-cuenta/AuxiliaresCuentas";
import RepEstadosFinancieros from "../pages/list_accounts/rep-estados-financieros/EstadosFinancieros";

//Activos (Assets)
import AssetReportGeneration from "../pages/assets/asset-report-generation";

// Third Party
import IndexThirdPartyList from "../pages/third-party/third_party_list/index";

// Bank and Cash
import IndexCashList from "../pages/cash-and-banks/cash_list/index";

// Assets
import CreateAssets from "../pages/assets/assets_registry/create";
import EditAssets from "../pages/assets/assets_registry/edit";
import AssetDepreciationCalculation from "../pages/assets/depreciation-calculation/index";
import BajasTransferencias from "../pages/assets/bajas_transferencias/index";
import KardexAssets from "../pages/assets/kardex/index";

//Cajas y bancos
import IndexCashAndBanks from "../pages/cash-and-banks/banks/index";

import PageMaintenance from "../pages/errors/page_maintenance";

// NIIF
import NiifVerificationIndex from "../pages/assets/niif_verification/index";
import NiifCorrectionIndex from "../pages/assets/niif_correction/index";
// HU-ACT-08: revisión anual de vida útil y valor residual (cambio de estimación NIC 16 §51 / NIC 8)
import RevisionAnualIndex from "../pages/assets/revision-anual/index";

import IndexSegmentation from "../pages/third-party/segmentation/index"
import IndexCommercialData from "../pages/third-party/commercial-data/index"

// Cash and Banks
import IndexCheques from "../pages/cash-and-banks/cheques/index";
import IndexCheckbooks from "../pages/cash-and-banks/chequeras/index";
import IndexBankBranches from "../pages/cash-and-banks/surcursales/index";
import IndexBankAccounts from "../pages/cash-and-banks/bank-accounts/index";
import IndexProjections from "../pages/cash-and-banks/projections/index";
import IndexCashAudits from "../pages/cash-and-banks/cash-audits/index";

// Financial Movements
import IndexFinancialMovements from "../pages/cash-and-banks/financial-movements/index";

// BNK-HU-069/070/071/072 — Conciliación: motor de matching, reglas, parámetros
import IndexMatchingWorkspace from "../pages/cash-and-banks/matching-workspace/index";
import IndexReglasClasificacion from "../pages/cash-and-banks/reglas-clasificacion/index";
import IndexParametrosMatching from "../pages/cash-and-banks/parametros-matching/index";
// BNK-HU-068 pre-procesamiento + HU-062/063 soportes conservados
import IndexPreprocesamiento from "../pages/cash-and-banks/preprocesamiento/index";
import IndexSoportesConciliacion from "../pages/cash-and-banks/soportes-conciliacion/index";
import IndexPartidasConciliatorias from "../pages/cash-and-banks/partidas-conciliatorias/index";
import IndexGmf from "../pages/cash-and-banks/gmf/index";
import IndexSesionesFirma from "../pages/cash-and-banks/sesiones-conciliacion/index";
import IndexConfigFirma from "../pages/cash-and-banks/config-firma/index";
import IndexPartidasAntiguedad from "../pages/cash-and-banks/partidas-antiguedad/index";
// BNK-HU-076 TRM + diferencia en cambio (moneda extranjera)
import IndexTrmHistorica from "../pages/cash-and-banks/trm/index";
import IndexDiferenciaCambio from "../pages/cash-and-banks/diferencia-cambio/index";
// BNK FASE 7 (DIAN): HU-078 cruce factura electrónica, HU-079 exógena, HU-080 conciliación fiscal
import IndexCruceFE from "../pages/cash-and-banks/cruce-factura-electronica/index";
import IndexExogenaDian from "../pages/cash-and-banks/exogena-dian/index";
import IndexConciliacionFiscal from "../pages/cash-and-banks/conciliacion-fiscal/index";
// BNK-HU-065 verificación de integridad del log (Auditoría)
import IndexIntegridadLog from "../pages/auditoria/integridad/index";

// Invoices

import { base_url } from "./functions";
import { fetchHelper } from "./fetch";


export const getMenu = async () => {
  const modules = [];
  const url = base_url(["api", "modules", "menu"]);
  modules.push({
    id: 0,
    name: "Dashboard",
    url: "dashboard",
    icon: "ri-home-smile-line",
    position: 0,
    menus: [
      {
        id: 0,
        label: "Home",
        path: "",
        position: 0,
        componentName: "HOME",
        menus: [
          {
            id: 0,
            label: "Home",
            path: "",
            position: 0,
            icon: "ri-home-smile-line",
            childrens: [],
            // component: Home,
            componentName: "HOME"
          }
        ]
      }
    ]
  });
  try {
    const { data, error } = await fetchHelper.get(url, {}, 0);
    if (!error) {

      modules.push(...data?.map(mod => {
        // Construir el árbol de menús normalmente
        const menuTree = buildMenuTree(mod?.menus?.map(menu => ({
          ...menu,
          componentName: menu?.component,
        })));

        return {
          ...mod,
          menus: menuTree
        };
      }));
    }
  } catch (error) {
    console.log(error);
  } finally {
    return modules;
  }
};

const buildMenuTree = (menus) => {
  const menuMap = {};
  const tree = [];

  // 1. Crear el mapa y preparar childrens
  menus.forEach((menu) => {
    menuMap[menu.id] = {
      ...menu,
      childrens: [],
    };
  });

  // 2. Construir el árbol
  menus.forEach((menu) => {
    if (menu.parentId === null) {
      tree.push(menuMap[menu.id]);
    } else {
      const parent = menuMap[menu.parentId];
      if (parent) {
        parent.childrens.push(menuMap[menu.id]);
      }
    }
  });

  return tree;
};

export const buildFullPath = (parent = "", current = "") => {
  return `/${[parent, current].filter(Boolean).join("/")}`;
};

/**
 * Obtiene todas las rutas del sistema (independiente de permisos del usuario)
 * para poder distinguir 403 (sin permisos) de 404 (no existe).
 *
 * QA Bloque PA Bug 23 (HU-PA-09 E7, 2026-05-09): el destructuring
 * `{ data, error } = await fetchHelper.get(...)` estaba MAL: fetchHelper.get
 * retorna el JSON parseado directamente (un array), no un objeto envoltorio.
 * Resultado: `data=undefined`, `Array.isArray(undefined)=false`, retorno `[]`.
 * `allSystemPaths` quedaba vacio en Redux y el CatchAllRoute siempre devolvia
 * 404 (HU-PA-09 E7). Fix: tratar la respuesta como array directo.
 */
export const getAllSystemMenuPaths = async () => {
  const url = base_url(['api', 'modules', 'menu', 'all-paths']);
  try {
    const response = await fetchHelper.get(url, {}, 0);
    if (Array.isArray(response)) return response;
    if (response && Array.isArray(response.data)) return response.data;
  } catch (error) {
    console.log('Error fetching system paths:', error);
  }
  return [];
};

// Países y Municipios
import IndexPaises from "../pages/parametrizacion/paises/index";
import IndexMunicipios from "../pages/parametrizacion/municipios/index";

// Reportes
import IndexReportTypes from "../pages/parametrizacion/reportes/tipos/index";
import IndexReportTemplates from "../pages/parametrizacion/reportes/plantillas/index";

// Retenciones del Sistema
import IndexSystemWithholdings from "../pages/parametrizacion/retenciones/index";

// Cuentas por Pagar (AP)
import IndexApInvoices from "../pages/accounts-payable/invoices/index";
import IndexApPayments from "../pages/accounts-payable/payments/index";
import IndexApAdvances from "../pages/accounts-payable/advances/index";
import IndexApNotes from "../pages/accounts-payable/notes/index";
import IndexApPurchaseOrders from "../pages/accounts-payable/purchase-orders/index";
import IndexApReceipts from "../pages/accounts-payable/receipts/index";
import IndexApReports from "../pages/accounts-payable/reports/index";
import IndexApGoodsReturns from "../pages/accounts-payable/goods-returns/index";
import IndexApInvoicesBulk from "../pages/accounts-payable/invoices-bulk/index";

// Cuentas por Cobrar (AR)
import IndexSalesInvoices from "../pages/cuentas-por-cobrar/facturas-venta/index";
import IndexArPayments from "../pages/cuentas-por-cobrar/cobros/index";
import IndexArAdvances from "../pages/cuentas-por-cobrar/anticipos/index";
import IndexArNotes from "../pages/cuentas-por-cobrar/notas/index";
import IndexArReports from "../pages/cuentas-por-cobrar/reportes/index";
import IndexArOverdue from "../pages/cuentas-por-cobrar/cartera-vencida/index";
import IndexDianResolutions from "../pages/cuentas-por-cobrar/resoluciones-dian/index";

// Contabilidad General (CG)
import IndexCgComprobantes from "../pages/contabilidad/comprobantes/index";
import IndexCgPeriodos from "../pages/contabilidad/periodos/index";
import CgVoucherSeriesAdmin from "../pages/contabilidad/series/index";
import CgLibroDiario from "../pages/contabilidad/libros/libro-diario";
import CgLibroMayor from "../pages/contabilidad/libros/libro-mayor";
import CgBalanceComprobacion from "../pages/contabilidad/libros/balance-comprobacion";
import CgEstadosFinancieros from "../pages/contabilidad/estados-financieros/index";
import CgCierre from "../pages/contabilidad/cierre/index";
import CgReportesDian from "../pages/contabilidad/reportes-dian/index";
// HU-CG-12 (QA Bloque BP, 2026-05-19): Reportes tributarios consolidados.
import CgReportesTributarios from "../pages/contabilidad/reportes-tributarios/index";

// Integracion AAEF (HU-INT-RF-14 + 15)
import IndexLotes from "../pages/integracion/lotes/index";

// Nomina (HU-NOM-01 a 06) - reincorporado standalone 2026-04-16
import IndexEmpleados from "../pages/nomina/empleados/index";
import IndexConceptos from "../pages/nomina/conceptos/index";
import IndexRecibos from "../pages/nomina/recibos/index";
import IndexPrestaciones from "../pages/nomina/prestaciones/index";
import IndexPila from "../pages/nomina/pila/index";
import IndexResumenContable from "../pages/nomina/resumen-contable/index";

// Auditoria (HU-AU-01 a 10)
import IndexAuditLogs from "../pages/auditoria/logs/index";
import IndexAuditDashboard from "../pages/auditoria/dashboard/index";
import IndexAuditExport from "../pages/auditoria/exportar/index";
import IndexRiskRules from "../pages/auditoria/reglas-riesgo/index";
import IndexRetention from "../pages/auditoria/retencion/index";
import IndexFindings from "../pages/auditoria/hallazgos/index";

// HU-INT-RF-14 E5: gatekeeper JSX para rutas que requieren ROLE_ADMIN.
// Si el usuario no es admin, AdminRoute renderiza Page403 en lugar del componente.
import AdminRoute from "../components/organism/AdminRoute";

// Bloque F (multi-tenant): gatekeeper para rutas /platform/* (solo PLATFORM_ADMIN).
import PlatformRoute from "../components/organism/PlatformRoute";
import TenantOnlyRoute from "../components/organism/TenantOnlyRoute";
// QA Bloque PA Bug 97 (HU-PA-09 E7 + HU-PA-12 E3, 2026-05-13): gatekeeper por
// permiso granular. Cierra DEF-30 y DEF-25.
import PermissionRoute from "../components/organism/PermissionRoute";

// Plataforma (HU-PLAT-01/02/05/06)
import IndexEmpresas from "../pages/platform/empresas/index";
import PlatformDashboard from "../pages/platform/dashboard/index";
import IndexPlatformAdmins from "../pages/platform/administradores/index";
// PA-RF-28 (Pendientes PA): gestion de API Keys AAEF (PLATFORM_ADMIN).
import IndexApiKeys from "../pages/platform/api-keys/index";

/** Helper: envuelve un componente con AdminRoute para crear una pagina solo-admin. */
const adminOnly = (Component) => () => (
    <AdminRoute><Component /></AdminRoute>
);

/** Helper: envuelve un componente con PlatformRoute (solo PLATFORM_ADMIN cross-empresa). */
const platformOnly = (Component) => () => (
    <PlatformRoute><Component /></PlatformRoute>
);

/** Bloque AM (2026-05-03): paginas tenant-specific (no aplican a PLATFORM_ADMIN). */
const tenantOnly = (Component) => () => (
    <TenantOnlyRoute><Component /></TenantOnlyRoute>
);

/**
 * QA Bloque PA Bug 97 (HU-PA-09 E7 + HU-PA-12 E3, 2026-05-13): envuelve un
 * componente con PermissionRoute exigiendo un permiso atomico. Si el usuario
 * no tiene el permiso, redirige a Page403. ADMIN_EMPRESA y PLATFORM_ADMIN
 * pasan por bypass (ver usePermissions).
 */
const requirePerm = (Component, permission) => () => (
    <PermissionRoute permission={permission}><Component /></PermissionRoute>
);

export const COMPONENT_MAP = [
  { id: "HOME", name: "Home", component: Home },
  { id: "PERFIL", name: "Perfil", component: PerfilPage },
  // Sprint 2 — Branding (HU-PA-BRAND-01) y Navegacion (HU-PA-NAV-01)
  // QA Bloque AT (HU-PA-13, 2026-05-13): ademas de tenantOnly, exige
  // permiso atomico granular. Asi un OPERADOR_NOMINA sin el permiso
  // recibe 403 si entra por URL directa (consistente con el filtro de
  // menu del sidebar).
  { id: "IDENTIDAD_VISUAL", name: "Identidad Visual", component: tenantOnly(requirePerm(IdentidadVisualPage, "PAR.IDENTIDAD_VISUAL.VER")) },
  // Bloque AM ajuste fino (2026-05-03): Navegacion y Notificaciones por rol
  // son personalizacion del admin de empresa (cada empresa decide qué eventos
  // disparan notificacion in-app y qué orden tiene su navegacion). Pasan a
  // tenantOnly para que el platform admin no las vea (no opera una empresa).
  { id: "NAVEGACION", name: "Navegacion", component: tenantOnly(requirePerm(NavegacionPage, "PAR.NAVEGACION.EDITAR")) },
  { id: "NOTIFICACIONES_ROL", name: "Notificaciones por rol", component: tenantOnly(requirePerm(NotificacionesRolPage, "PAR.NOTIFICACIONES.CONFIGURAR_ROL")) },
  { id: "MODULOS", name: "Módulos", component: platformOnly(IndexModules) },
  { id: "MENUS", name: "Menus", component: platformOnly(IndexMenus) },
  { id: "PERMISSIONS", name: "Permisos", component: platformOnly(PermissionsIndex) },
  // QA Bloque PA Bug 97 (HU-PA-12 E3): proteger ruta de usuarios por permiso
  // granular. Un usuario sin PAR.USUARIOS.VER que navegue manualmente a
  // /parametrizacion/users debe ver Page403, no el listado.
  { id: "USERS", name: "Usuarios", component: requirePerm(IndexUsers, "PAR.USUARIOS.VER") },
  // QA Bloque PA Bug 31-43 (HU-PA-13/14, 2026-05-09): permisos temporales.
  // QA Bloque AT (HU-PA-13 E7, 2026-05-13): proteger con PermissionRoute
  // para que un usuario sin PAR.PERMISOS_TEMPORALES.VER no acceda via URL.
  { id: "TEMPORARY_PERMISSIONS", name: "Permisos Temporales", component: requirePerm(IndexTemporaryPermissions, "PAR.PERMISOS_TEMPORALES.VER") },
  { id: "ROLES", name: "Roles", component: requirePerm(IndexRoles, "PAR.ROLES.VER") },
  // BUG-PA (doc QA v2, 2026-06-03 / Imagen 1): el criterio exige que un usuario
  // DENTRO de una empresa pueda crear parametros desde la UI. Antes el menu era
  // platformOnly -> solo el PLATFORM_ADMIN lo veia (y al no tener empresa recibia
  // el mensaje funcional), y el ADMIN_EMPRESA no lo veia.
  // OJO: NO usar adminOnly (AdminRoute) -> AdminRoute mira isAdmin, que solo es
  // true para rol ADMIN/SUPERADMIN; el ADMIN_EMPRESA daria 403. Se usa requirePerm
  // con PAR.PARAMETROS.VER (mismo patron que ROLES/USUARIOS): PermissionRoute hace
  // bypass para PLATFORM_ADMIN y ADMIN_EMPRESA y exige el permiso al resto.
  { id: "PARAMETROS", name: "Parámetros", component: requirePerm(IndexParameters, "PAR.PARAMETROS.VER") },
  { id: "CENTROS_COSTO", name: "Centros de Costo", component: IndexCentrosCosto },
  { id: "MENUSPERMISSIONS", name: "Permisos de Menú", component: platformOnly(MenuPermissionIndex) },
  { id: "CUENTAS_CONTABLES", name: "Cuentas Contables", component: IndexCuentasContables },
  { id: "DEPRECIATION_RULES", name: "Reglas de Depreciación", component: IndexDepreciationRules },
  { id: "PUC", name: "Catálogo PUC", component: IndexPUC },
  { id: "REP_BALANCE_COMPROBACION", name: "Reporte Balance de Comprobación", component: RepBalanceComprobacion },
  { id: "REP_LIBRO_DIARIO", name: "Reporte Libro Diario", component: RepLibroDiario },
  { id: "REP_LIBRO_MAYOR", name: "Reporte Libro Mayor", component: RepLibroMayor },
  { id: "REP_AUXILIARES_CUENTAS", name: "Reporte Auxiliares de cuentas", component: RepAuxiliaresCuentas },
  { id: "REP_ESTADOS_FINANCIEROS", name: "Reporte Estados Financieros", component: RepEstadosFinancieros },
  { id: "ACT_GENERACION_INFORMES", name: "Activos Generación de Informes", component: AssetReportGeneration },
  { id: "EXCHANGE_RATE", name: "Tasas de Cambio", component: ExchangeRateIndex },
  { id: "CURRENCY_TYPES", name: "Tipos de Monedas", component: CurrencyIndex },
  { id: "RULES_TAX", name: "Reglas Tributarias", component: RulesTaxIndex },
  { id: "SEGMENTATION", name: "Segmentacion Terceros", component: IndexSegmentation },
  { id: "CREATE_ASSETS", name: "Crear Activo", component: CreateAssets },
  { id: "NIIF_VERIFICATION", name: "Verificación NIIF", component: NiifVerificationIndex },
  { id: "NIIF_CORRECTION", name: "Corrección NIIF", component: NiifCorrectionIndex },
  { id: "ACT_REVISION_ANUAL", name: "Revisión Anual de Activos", component: RevisionAnualIndex },
  { id: "ACT_CALCULO_DEPRECIACION", name: "Cálculo de Depreciación", component: AssetDepreciationCalculation },
  { id: "ACT_BAJAS_TRANSFERENCIAS", name: "Control de Bajas y Transferencias", component: BajasTransferencias },
  { id: "ACT_KARDEX", name: "Kardex", component: KardexAssets },
  { id: "THIRD_PARTY_LIST", name: "Lista de Terceros", component: IndexThirdPartyList },
  { id: "ASSETS_REGISTRY", name: "Registro de Activos", component: IndexAssets },
  { id: "UPDATE_ASSETS", name: "Actualizar Activo", component: EditAssets },
  { id: "CATALOGO_BANCOS", name: "Catalogo de Bancos", component: IndexCashAndBanks },
  { id: "SUCURSALES_BANCARIAS", name: "Sucursales Bancarias", component: IndexBankBranches },
  { id: "CHEQUES", name: "Cheques", component: IndexCheques },
  { id: "CHEQUERAS", name: "Chequeras", component: IndexCheckbooks },
  { id: "BANK_ACCOUNTS", name: "Cuentas Bancarias", component: IndexBankAccounts },
  { id: "CASH_LIST", name: "Lista de Cajas", component: IndexCashList },
  // Bloque AM (2026-05-03): Paises y Municipios son catalogos globales del sistema.
  { id: "PAISES", name: "Países", component: platformOnly(IndexPaises) },
  { id: "MUNICIPIOS", name: "Municipios", component: platformOnly(IndexMunicipios) },
  // QA Bloque AT (HU-PA-13, 2026-05-13): tenantOnly + permiso atomico
  { id: "REPORT_TYPES", name: "Tipos de Reporte", component: tenantOnly(requirePerm(IndexReportTypes, "PAR.REPORTES_TIPOS.VER")) },
  { id: "REPORT_TEMPLATES", name: "Plantillas de Reporte", component: tenantOnly(requirePerm(IndexReportTemplates, "PAR.REPORTES_PLANTILLAS.VER")) },
  { id: "SYSTEM_WITHHOLDINGS", name: "Retenciones del Sistema", component: tenantOnly(IndexSystemWithholdings) },
  { id: "COMMERCIAL_DATA", name: "Datos Comerciales", component: IndexCommercialData },
  { id: "CASH_FLOW_PROJECTIONS", name: "Proyecciones de Flujo de Caja", component: IndexProjections },
  { id: "CASH_AUDITS", name: "Arqueos de Caja", component: IndexCashAudits },
  { id: "FINANCIAL_MOVEMENTS", name: "Movimientos Financieros", component: IndexFinancialMovements },
  { id: "MATCHING_WORKSPACE", name: "Conciliación (Matching)", component: IndexMatchingWorkspace },
  { id: "REGLAS_CLASIFICACION", name: "Reglas de Clasificación", component: IndexReglasClasificacion },
  { id: "PARAMETROS_MATCHING", name: "Parámetros de Matching", component: IndexParametrosMatching },
  { id: "PREPROCESAMIENTO", name: "Pre-procesamiento", component: IndexPreprocesamiento },
  { id: "SOPORTES_CONCILIACION", name: "Soportes de Conciliación", component: IndexSoportesConciliacion },
  { id: "PARTIDAS_CONCILIATORIAS", name: "Partidas Conciliatorias", component: IndexPartidasConciliatorias },
  { id: "GMF", name: "GMF (4x1000)", component: IndexGmf },
  { id: "SESIONES_FIRMA", name: "Cierre y Firma", component: IndexSesionesFirma },
  { id: "CONFIG_FIRMA", name: "Config. de Firma", component: IndexConfigFirma },
  { id: "PARTIDAS_ANTIGUEDAD", name: "Antigüedad de Partidas", component: IndexPartidasAntiguedad },
  { id: "TRM_HISTORICA", name: "TRM (Moneda extranjera)", component: IndexTrmHistorica },
  { id: "DIFERENCIA_CAMBIO", name: "Diferencia en cambio", component: IndexDiferenciaCambio },
  { id: "CRUCE_FE", name: "Cruce Factura Electrónica", component: IndexCruceFE },
  { id: "EXOGENA_DIAN", name: "Exógena DIAN", component: IndexExogenaDian },
  { id: "CONCILIACION_FISCAL", name: "Conciliación Fiscal", component: IndexConciliacionFiscal },
  { id: "AU_INTEGRIDAD", name: "Integridad del Log", component: IndexIntegridadLog },
  { id: "AP_INVOICES", name: "Facturas de Compra", component: IndexApInvoices },
  { id: "SALES_INVOICES", name: "Facturas de Venta", component: IndexSalesInvoices },
  { id: "AR_PAYMENTS", name: "Cobros", component: IndexArPayments },
  { id: "AR_ADVANCES", name: "Anticipos Clientes", component: IndexArAdvances },
  { id: "AR_NOTES", name: "NC/ND Ventas", component: IndexArNotes },
  { id: "AR_REPORTS", name: "Reportes CxC", component: IndexArReports },
  { id: "AR_OVERDUE", name: "Cartera Vencida", component: IndexArOverdue },
  { id: "DIAN_RESOLUTIONS", name: "Resoluciones DIAN", component: IndexDianResolutions },
  { id: "AP_PAYMENTS", name: "Pagos y Abonos", component: IndexApPayments },
  { id: "AP_ADVANCES", name: "Anticipos a Proveedores", component: IndexApAdvances },
  { id: "AP_NOTES", name: "Notas Credito/Debito", component: IndexApNotes },
  { id: "AP_PURCHASE_ORDERS", name: "Ordenes de Compra", component: IndexApPurchaseOrders },
  { id: "AP_RECEIPTS", name: "Recepciones de Bienes", component: IndexApReceipts },
  { id: "AP_REPORTS", name: "Reportes CxP", component: IndexApReports },
  // HU-AP-22 (2026-04-28): Devoluciones de mercancia
  { id: "AP_GOODS_RETURNS", name: "Devoluciones de Mercancia", component: IndexApGoodsReturns },
  // HU-AP-23 (2026-04-28): Carga masiva de facturas de compra
  { id: "AP_INVOICES_BULK", name: "Carga Masiva Facturas", component: IndexApInvoicesBulk },
  { id: "CG_COMPROBANTES", name: "Comprobantes Contables", component: IndexCgComprobantes },
  { id: "CG_PERIODOS", name: "Periodos Contables", component: IndexCgPeriodos },
  // HU-CG-03A E3/E5: configuracion de series de consecutivos por tipo de comprobante.
  { id: "CG_SERIES", name: "Series de Consecutivos", component: CgVoucherSeriesAdmin },
  { id: "CG_LIBRO_DIARIO", name: "Libro Diario", component: CgLibroDiario },
  { id: "CG_LIBRO_MAYOR", name: "Libro Mayor", component: CgLibroMayor },
  { id: "CG_BALANCE_COMPROBACION", name: "Balance de Comprobacion", component: CgBalanceComprobacion },
  { id: "CG_ESTADOS_FINANCIEROS", name: "Estados Financieros", component: CgEstadosFinancieros },
  { id: "CG_CIERRE", name: "Cierre Contable", component: CgCierre },
  { id: "CG_REPORTES_DIAN", name: "Reportes DIAN", component: CgReportesDian },
  { id: "CG_REPORTES_TRIBUTARIOS", name: "Reportes Tributarios", component: CgReportesTributarios },

  // Integracion AAEF (HU-INT-RF-14 + 15)
  // QA Bloque BE (2026-05-17): de adminOnly -> requirePerm 'INT.LOTES.VER'.
  // Asi AUDITOR (que tiene INT.LOTES.VER) tambien accede a /integracion/lotes,
  // no solo admin. ADMIN/PLATFORM_ADMIN siguen pasando por bypass de usePermissions.
  { id: "INTEGRACION_LOTES", name: "Lotes AAEF recibidos", component: requirePerm(IndexLotes, 'INT.LOTES.VER') },

  // Nomina (HU-NOM-01 a 06) - standalone, sin integracion AAEF
  { id: "NOMINA_EMPLEADOS", name: "Empleados", component: IndexEmpleados },
  { id: "NOMINA_CONCEPTOS", name: "Conceptos de nómina", component: IndexConceptos },
  { id: "NOMINA_RECIBOS", name: "Liquidación de nómina", component: IndexRecibos },
  { id: "NOMINA_PRESTACIONES", name: "Prestaciones sociales", component: IndexPrestaciones },
  { id: "NOMINA_PILA", name: "Reporte PILA", component: IndexPila },
  { id: "NOMINA_RESUMEN", name: "Resumen contable", component: IndexResumenContable },

  // Auditoria (HU-AU-01 a 10)
  // QA Bloque BE (2026-05-17): de adminOnly -> requirePerm. HU-AU-08 dice
  // "consulta y exportacion de evidencias por rol AUDITOR". AUDITOR debe poder
  // entrar; antes solo ADMIN/PLATFORM_ADMIN podian. Cada pagina exige el perm
  // atomico corresponciente; backend tambien lo valida via @PreAuthorize.
  { id: "AU_LOGS", name: "Logs de Auditoría", component: requirePerm(IndexAuditLogs, 'AU.LOG.VER') },
  { id: "AU_DASHBOARD", name: "Dashboard Auditoría", component: requirePerm(IndexAuditDashboard, 'AU.LOG.VER') },
  { id: "AU_EXPORT", name: "Exportación Auditoría", component: requirePerm(IndexAuditExport, 'AU.LOG.EXPORTAR') },
  { id: "AU_RISK_RULES", name: "Reglas de Riesgo", component: requirePerm(IndexRiskRules, 'AU.REGLAS.VER') },
  { id: "AU_RETENTION", name: "Retención y Purga", component: requirePerm(IndexRetention, 'AU.RETENCION.VER') },
  { id: "AU_FINDINGS", name: "Hallazgos", component: requirePerm(IndexFindings, 'AU.HALLAZGOS.VER') },

  // Bloque F - Plataforma (solo PLATFORM_ADMIN cross-empresa)
  { id: "PLATFORM_EMPRESAS", name: "Empresas (plataforma)", component: platformOnly(IndexEmpresas) },
  { id: "PLATFORM_DASHBOARD", name: "Dashboard (plataforma)", component: platformOnly(PlatformDashboard) },
  // PA-RF-PLAT-07 v3.0 (Control de Cambios PA, 2026-05-29): ciclo de vida PLATFORM_ADMIN.
  { id: "PLATFORM_ADMINS", name: "Administradores (plataforma)", component: platformOnly(IndexPlatformAdmins) },
  // PA-RF-28 (Pendientes PA): ciclo de vida de API Keys AAEF.
  { id: "PLATFORM_API_KEYS", name: "API Keys (plataforma)", component: platformOnly(IndexApiKeys) },
];
