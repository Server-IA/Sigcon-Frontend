import Home from "../pages/home/index";
import PerfilPage from "../pages/parametrizacion/perfil/index";

// Parametrizacion
import IndexModules from "../pages/parametrizacion/modules/index";
import IndexMenus from "../pages/parametrizacion/menus/index";
import PermissionsIndex from "../pages/parametrizacion/permissions/index";
import IndexUsers from "../pages/parametrizacion/users/index";

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
 */
export const getAllSystemMenuPaths = async () => {
  const url = base_url(['api', 'modules', 'menu', 'all-paths']);
  try {
    const { data, error } = await fetchHelper.get(url, {}, 0);
    if (!error && Array.isArray(data)) return data;
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
import CgLibroDiario from "../pages/contabilidad/libros/libro-diario";
import CgLibroMayor from "../pages/contabilidad/libros/libro-mayor";
import CgBalanceComprobacion from "../pages/contabilidad/libros/balance-comprobacion";
import CgEstadosFinancieros from "../pages/contabilidad/estados-financieros/index";
import CgCierre from "../pages/contabilidad/cierre/index";
import CgReportesDian from "../pages/contabilidad/reportes-dian/index";

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

// HU-INT-RF-14 E5: gatekeeper JSX para rutas que requieren ROLE_ADMIN.
// Si el usuario no es admin, AdminRoute renderiza Page403 en lugar del componente.
import AdminRoute from "../components/organism/AdminRoute";

// Bloque F (multi-tenant): gatekeeper para rutas /platform/* (solo PLATFORM_ADMIN).
import PlatformRoute from "../components/organism/PlatformRoute";

// Plataforma (HU-PLAT-01/02/05/06)
import IndexEmpresas from "../pages/platform/empresas/index";
import PlatformDashboard from "../pages/platform/dashboard/index";

/** Helper: envuelve un componente con AdminRoute para crear una pagina solo-admin. */
const adminOnly = (Component) => () => (
    <AdminRoute><Component /></AdminRoute>
);

/** Helper: envuelve un componente con PlatformRoute (solo PLATFORM_ADMIN cross-empresa). */
const platformOnly = (Component) => () => (
    <PlatformRoute><Component /></PlatformRoute>
);

export const COMPONENT_MAP = [
  { id: "HOME", name: "Home", component: Home },
  { id: "PERFIL", name: "Perfil", component: PerfilPage },
  { id: "MODULOS", name: "Módulos", component: IndexModules },
  { id: "MENUS", name: "Menus", component: IndexMenus },
  { id: "PERMISSIONS", name: "Permisos", component: PermissionsIndex },
  { id: "USERS", name: "Usuarios", component: IndexUsers },
  { id: "ROLES", name: "Roles", component: IndexRoles },
  { id: "PARAMETROS", name: "Parámetros", component: IndexParameters },
  { id: "CENTROS_COSTO", name: "Centros de Costo", component: IndexCentrosCosto },
  { id: "MENUSPERMISSIONS", name: "Permisos de Menú", component: MenuPermissionIndex },
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
  { id: "PAISES", name: "Países", component: IndexPaises },
  { id: "MUNICIPIOS", name: "Municipios", component: IndexMunicipios },
  { id: "REPORT_TYPES", name: "Tipos de Reporte", component: IndexReportTypes },
  { id: "REPORT_TEMPLATES", name: "Plantillas de Reporte", component: IndexReportTemplates },
  { id: "SYSTEM_WITHHOLDINGS", name: "Retenciones del Sistema", component: IndexSystemWithholdings },
  { id: "COMMERCIAL_DATA", name: "Datos Comerciales", component: IndexCommercialData },
  { id: "CASH_FLOW_PROJECTIONS", name: "Proyecciones de Flujo de Caja", component: IndexProjections },
  { id: "CASH_AUDITS", name: "Arqueos de Caja", component: IndexCashAudits },
  { id: "FINANCIAL_MOVEMENTS", name: "Movimientos Financieros", component: IndexFinancialMovements },
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
  { id: "CG_COMPROBANTES", name: "Comprobantes Contables", component: IndexCgComprobantes },
  { id: "CG_PERIODOS", name: "Periodos Contables", component: IndexCgPeriodos },
  { id: "CG_LIBRO_DIARIO", name: "Libro Diario", component: CgLibroDiario },
  { id: "CG_LIBRO_MAYOR", name: "Libro Mayor", component: CgLibroMayor },
  { id: "CG_BALANCE_COMPROBACION", name: "Balance de Comprobacion", component: CgBalanceComprobacion },
  { id: "CG_ESTADOS_FINANCIEROS", name: "Estados Financieros", component: CgEstadosFinancieros },
  { id: "CG_CIERRE", name: "Cierre Contable", component: CgCierre },
  { id: "CG_REPORTES_DIAN", name: "Reportes DIAN", component: CgReportesDian },

  // Integracion AAEF (HU-INT-RF-14 + 15) - Solo ADMIN (HU-INT-RF-14 E5)
  { id: "INTEGRACION_LOTES", name: "Lotes AAEF recibidos", component: adminOnly(IndexLotes) },

  // Nomina (HU-NOM-01 a 06) - standalone, sin integracion AAEF
  { id: "NOMINA_EMPLEADOS", name: "Empleados", component: IndexEmpleados },
  { id: "NOMINA_CONCEPTOS", name: "Conceptos de nómina", component: IndexConceptos },
  { id: "NOMINA_RECIBOS", name: "Liquidación de nómina", component: IndexRecibos },
  { id: "NOMINA_PRESTACIONES", name: "Prestaciones sociales", component: IndexPrestaciones },
  { id: "NOMINA_PILA", name: "Reporte PILA", component: IndexPila },
  { id: "NOMINA_RESUMEN", name: "Resumen contable", component: IndexResumenContable },

  // Auditoria (HU-AU-01 a 10) - TODO el modulo es solo ADMIN (HU-AU-08)
  { id: "AU_LOGS", name: "Logs de Auditoría", component: adminOnly(IndexAuditLogs) },
  { id: "AU_DASHBOARD", name: "Dashboard Auditoría", component: adminOnly(IndexAuditDashboard) },
  { id: "AU_EXPORT", name: "Exportación Auditoría", component: adminOnly(IndexAuditExport) },
  { id: "AU_RISK_RULES", name: "Reglas de Riesgo", component: adminOnly(IndexRiskRules) },
  { id: "AU_RETENTION", name: "Retención y Purga", component: adminOnly(IndexRetention) },

  // Bloque F - Plataforma (solo PLATFORM_ADMIN cross-empresa)
  { id: "PLATFORM_EMPRESAS", name: "Empresas (plataforma)", component: platformOnly(IndexEmpresas) },
  { id: "PLATFORM_DASHBOARD", name: "Dashboard (plataforma)", component: platformOnly(PlatformDashboard) },
];
