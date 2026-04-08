import Home from "../pages/home/index";
import PerfilPage from "../pages/parametrizacion/perfil/index";

// Parametrizacion
import IndexModules from "../pages/parametrizacion/modules/index";
import IndexMenus from "../pages/parametrizacion/menus/index";
import PermissionsIndex from "../pages/parametrizacion/permissions/index";
import IndexUsers from "../pages/parametrizacion/users/index";
import IndexCompanies from "../pages/parametrizacion/companies/index";

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

// Cash and Banks
import IndexCheques from "../pages/cash-and-banks/cheques/index";
import IndexBankBranches from "../pages/cash-and-banks/surcursales/index";
import IndexBankAccounts from "../pages/cash-and-banks/bank-accounts/index";

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
  { id: "CATALOGO_BANCOS", name: "Catalogo de Bancos", component: IndexCashAndBanks },
  { id: "SUCURSALES_BANCARIAS", name: "Sucursales Bancarias", component: IndexBankBranches },
  { id: "CHEQUES", name: "Cheques", component: IndexCheques },
  { id: "COMPANIES", name: "Empresas", component: IndexCompanies },
  { id: "BANK_ACCOUNTS", name: "Cuentas Bancarias", component: IndexBankAccounts },
  { id: "CASH_LIST", name: "Lista de Cajas", component: IndexCashList },
];
