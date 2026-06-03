/**
 * QA Bloque AU (2026-05-25): etiquetas en espanol para los enums del modulo de
 * Auditoria. Antes las pantallas (logs, dashboard, reglas de riesgo, retencion)
 * mostraban los valores crudos en ingles (VIEW, LOW, CREATE, AuditLog...). Este
 * helper centraliza la traduccion para que TODAS las vistas muestren el idioma
 * correspondiente de forma consistente.
 *
 * El VALOR que se envia al backend sigue siendo el enum en ingles; solo cambia
 * lo que ve el usuario.
 */

/** AuditAction -> espanol. */
export const ACTION_LABELS = {
    CREATE: 'Creacion',
    UPDATE: 'Actualizacion',
    DELETE: 'Eliminacion',
    LOGIN: 'Inicio de sesion',
    LOGOUT: 'Cierre de sesion',
    EXPORT: 'Exportacion',
    VIEW: 'Vista',
};

/** AuditSeverity -> espanol. */
export const SEVERITY_LABELS = {
    LOW: 'Baja',
    MEDIUM: 'Media',
    HIGH: 'Alta',
    CRITICAL: 'Critica',
};

/** AuditModule (codigo) -> nombre en espanol. */
export const MODULE_LABELS = {
    PA: 'Parametrizacion', TER: 'Terceros', CFG: 'Listas Contables', ACT: 'Activos Fijos',
    AP: 'Cuentas por Pagar', AR: 'Cuentas por Cobrar', BNK: 'Bancos y Cajas',
    CG: 'Contabilidad General', NOM: 'Nomina', INT: 'Integracion AAEF', AU: 'Auditoria',
};

/** Nombre de entidad JPA -> etiqueta en espanol. */
export const ENTITY_LABELS = {
    User: 'Usuario', Role: 'Rol', Module: 'Modulo', Menu: 'Menu', Parameter: 'Parametro',
    ReportTemplate: 'Plantilla de reporte', ReportType: 'Tipo de reporte',
    SystemWithholdingAssignment: 'Retencion del sistema',
    ThirdParty: 'Tercero', CommercialData: 'Datos comerciales', EclSegmentation: 'Segmentacion ECL',
    ThirdPartyBankAccount: 'Cuenta bancaria de tercero',
    AccountingAccount: 'Cuenta contable', ChartOfAccount: 'Cuenta PUC', CostCenter: 'Centro de costo',
    ExchangeRate: 'Tasa de cambio', RuleTax: 'Regla tributaria', DepretationRule: 'Regla de depreciacion',
    CurrencyType: 'Tipo de moneda',
    Asset: 'Activo fijo', AssetDisposal: 'Baja de activo', NiifVerification: 'Verificacion NIIF',
    Invoice: 'Factura de compra', ApPayment: 'Pago a proveedor', ApAdvance: 'Anticipo a proveedor',
    ApNote: 'Nota credito/debito (compra)', PurchaseOrder: 'Orden de compra', GoodsReceipt: 'Recepcion',
    InvoiceAttachment: 'Soporte de factura',
    SalesInvoice: 'Factura de venta', ArPayment: 'Cobro', ArAdvance: 'Anticipo de cliente',
    ArNote: 'Nota credito/debito (venta)', DianResolution: 'Resolucion DIAN',
    SalesInvoiceAttachment: 'Soporte de factura de venta',
    Bank: 'Banco', BankAccount: 'Cuenta bancaria', BankBranch: 'Sucursal bancaria',
    Checkbook: 'Chequera', Check: 'Cheque', Cash: 'Caja', CashAudit: 'Arqueo de caja',
    FinancialMovement: 'Movimiento financiero', BankReconciliationSession: 'Conciliacion bancaria',
    CashFlowProjection: 'Proyeccion de flujo',
    JournalEntry: 'Comprobante contable', AccountingPeriod: 'Periodo contable',
    JournalEntrySupport: 'Soporte de comprobante', VoucherSeriesConfig: 'Serie de consecutivos',
    ClosingEntry: 'Asiento de cierre',
    Employee: 'Empleado', PayrollConcept: 'Concepto de nomina', PayrollReceipt: 'Recibo de nomina',
    PayrollLine: 'Linea de nomina', BenefitLiquidation: 'Liquidacion de prestaciones',
    IntegrationBatch: 'Lote de integracion', IntegrationTransfer: 'Transferencia de integracion',
    AuditLog: 'Log de auditoria', AuditRiskRule: 'Regla de riesgo',
    AuditRetentionPolicy: 'Politica de retencion', AuditPurgeRecord: 'Registro de purga',
    AuditFinding: 'Hallazgo de auditoria',
    AccessDenied: 'Acceso denegado',
    FinancialStatement: 'Estado financiero',
};

/** Lista de acciones para selectores (value=enum, label=espanol). */
export const ACTION_OPTIONS = Object.entries(ACTION_LABELS).map(([code, label]) => ({ code, label }));

/** Lista de severidades para selectores. */
export const SEVERITY_OPTIONS = Object.entries(SEVERITY_LABELS).map(([code, label]) => ({ code, label }));

/** Lista de modulos para selectores. */
export const MODULE_OPTIONS = Object.entries(MODULE_LABELS).map(([code, label]) => ({ code, label }));

export const actionLabel = (code) => (code ? (ACTION_LABELS[code] || code) : null);
export const severityLabel = (code) => (code ? (SEVERITY_LABELS[code] || code) : null);
export const moduleLabel = (code) => (code ? (MODULE_LABELS[code] || code) : null);
export const entityLabel = (name) => (name ? (ENTITY_LABELS[name] || name) : null);
