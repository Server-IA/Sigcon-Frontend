// =====================================================================
// Helper compartido para traducir valores de enum/BD a espanol en la UI.
// =====================================================================
// QA (2026-05-25): el profesor reporto que en varios listados aparecian
// valores crudos del enum/BD (ej. "ACTIVE", "POSTED", "PENDING",
// "PARTIALLY_PAID", "NO_CONCILIADO") en lugar de texto en espanol.
//
// Este helper centraliza la traduccion para usarse en los `render` de las
// columnas de DataTable (y en cualquier vista). Dos funciones:
//   - traducir(value)    -> texto plano en espanol (tipo, metodo, naturaleza).
//   - statusBadge(value) -> <span class="badge ..."> con color por semantica.
//
// Tokens desconocidos caen a un fallback "title-case" (CADA_PALABRA ->
// "Cada Palabra") para que NUNCA se vea el guion bajo ni el grito en mayusculas.
// =====================================================================

// Diccionario token (mayusculas) -> etiqueta en espanol.
export const LABELS = {
    // --- Genericos (ingles) ---
    ACTIVE: 'Activo', INACTIVE: 'Inactivo', BLOCKED: 'Bloqueado',
    PENDING: 'Pendiente', APPROVED: 'Aprobado', REJECTED: 'Rechazado',
    CLOSED: 'Cerrado', DRAFT: 'Borrador', CANCELLED: 'Cancelado',
    CANCELED: 'Cancelado', COMPLETED: 'Completado', EXPIRED: 'Vencido',
    ENABLED: 'Habilitado', DISABLED: 'Deshabilitado', OPEN: 'Abierto',
    LOCKED: 'Bloqueado',
    // --- Genericos (ya en espanol, distinto genero) ---
    ACTIVA: 'Activa', INACTIVA: 'Inactiva', ACTIVO: 'Activo',
    CERRADA: 'Cerrada', CERRADO: 'Cerrado', SUSPENDIDA: 'Suspendida',
    ANULADA: 'Anulada', ANULADO: 'Anulado', BORRADOR: 'Borrador',
    APROBADA: 'Aprobada', APROBADO: 'Aprobado', RECHAZADA: 'Rechazada',
    RECHAZADO: 'Rechazado', PENDIENTE: 'Pendiente',
    // --- Facturas (AR / AP) ---
    ISSUED: 'Emitida', PAID: 'Pagada', PARTIALLY_PAID: 'Pago parcial',
    OVERDUE: 'Vencida', VOIDED: 'Anulada', SETTLED: 'Liquidada',
    // --- Comprobantes contables (JE) ---
    POSTED: 'Contabilizado', REVERSED: 'Reversado',
    // --- Metodos de pago ---
    CASH: 'Efectivo', TRANSFER: 'Transferencia',
    BANK_TRANSFER: 'Transferencia bancaria', CHECK: 'Cheque',
    CARD: 'Tarjeta', PSE: 'PSE', CREDIT_CARD: 'Tarjeta de credito',
    DEBIT_CARD: 'Tarjeta debito',
    // --- Naturaleza contable ---
    DEBIT: 'Debito', CREDIT: 'Credito', DEBITO: 'Debito', CREDITO: 'Credito',
    // --- Conciliacion bancaria ---
    NO_CONCILIADO: 'No conciliado', CONCILIADO: 'Conciliado',
    EN_REVISION: 'En revision', PARCIAL: 'Parcial', PARTIAL: 'Parcial',
    // --- Motor de matching ---
    PROPUESTO: 'Propuesto', CONFIRMADO: 'Confirmado', AMBIGUO: 'Ambiguo',
    AUTOMATICO: 'Automatico', MANUAL: 'Manual',
    AUTOMATICO_EXACTO: 'Automatico exacto', AUTOMATICO_ALTO: 'Automatico alto',
    AUTOMATICO_MEDIO: 'Automatico medio',
    N_A_UNO: 'N:1', UNO_A_N: '1:N', N_A_N: 'N:M', UNO_A_UNO: '1:1',
    RESUELTA_AJUSTE: 'Resuelta (ajuste)',
    RESUELTA_PROXIMO_PERIODO: 'Resuelta (proximo periodo)',
    DESCARTADA: 'Descartada',
    // --- Recepciones de mercancia ---
    RECEIVED: 'Recibida',
    // --- Arqueos de caja ---
    // (BORRADOR / EN_REVISION / APROBADO / RECHAZADO / ANULADO ya arriba)
    // --- Cheques ---
    EMITIDO: 'Emitido', COBRADO: 'Cobrado', EXTRAVIADO: 'Extraviado',
    DISPONIBLE: 'Disponible', AGOTADA: 'Agotada', FISICO: 'Fisico',
    VIRTUAL: 'Virtual',
    // --- Activos fijos ---
    DECOMMISSIONED: 'Dado de baja', TRANSFERRED: 'Transferido',
    // --- Proyecciones de flujo ---
    EJECUTADA: 'Ejecutada',
    // --- Roles / tipos ---
    SYSTEM: 'Sistema', CUSTOM: 'Personalizado',
    // --- Tipos de banco ---
    COMMERCIAL: 'Comercial', COOPERATIVE: 'Cooperativo', PUBLIC: 'Publico',
    FOREIGN: 'Extranjero',
    // --- Tipos de cuenta bancaria ---
    SAVINGS: 'Ahorros', CHECKING: 'Corriente', CORRIENTE: 'Corriente',
    AHORROS: 'Ahorros',
    // --- Tipos de caja ---
    GENERAL: 'General', PETTY_CASH: 'Caja menor', FIXED_FUND: 'Fondo fijo',
    // --- Tipos de permiso ---
    CREATE: 'Crear', READ: 'Consultar', UPDATE: 'Actualizar', DELETE: 'Eliminar',
    // --- Actividad de flujo (NIC 7) ---
    OPERATIVA: 'Operativa', INVERSION: 'Inversion', FINANCIACION: 'Financiacion',
    OPERATING: 'Operativa', INVESTING: 'Inversion', FINANCING: 'Financiacion',
    // --- Tipo de contrato (Nomina) ---
    PERMANENT: 'Indefinido', FIXED_TERM: 'Termino fijo', TEMPORARY: 'Temporal',
    INDEFINIDO: 'Indefinido',
    // --- Origen / fuente ---
    AAEF: 'AAEF', SISTEMA: 'Sistema',
    // --- Tipo de cambio ---
    OFICIAL: 'Oficial', PREFERENCIAL: 'Preferencial',
    // --- Periodo de nomina ---
    MONTHLY: 'Mensual', BIWEEKLY: 'Quincenal', WEEKLY: 'Semanal',
};

// Mapa token -> clase de badge (semaforo). Verde = ok/terminal positivo,
// amarillo = en proceso/parcial, rojo = negativo/cierre/anulado, gris = neutro.
const BADGE = {
    // verde
    ACTIVE: 'bg-label-success', ACTIVA: 'bg-label-success', ACTIVO: 'bg-label-success',
    APPROVED: 'bg-label-success', APROBADO: 'bg-label-success', APROBADA: 'bg-label-success',
    PAID: 'bg-label-success', POSTED: 'bg-label-success', COMPLETED: 'bg-label-success',
    CONFIRMADO: 'bg-label-success', CONCILIADO: 'bg-label-success', RECEIVED: 'bg-label-success',
    COBRADO: 'bg-label-success', ISSUED: 'bg-label-success', EMITIDA: 'bg-label-success',
    EMITIDO: 'bg-label-success', EJECUTADA: 'bg-label-success', ENABLED: 'bg-label-success',
    OPEN: 'bg-label-success', DISPONIBLE: 'bg-label-success', AUTOMATICO_EXACTO: 'bg-label-success',
    AUTOMATICO_ALTO: 'bg-label-success',
    // amarillo
    PENDING: 'bg-label-warning', PENDIENTE: 'bg-label-warning', DRAFT: 'bg-label-warning',
    BORRADOR: 'bg-label-warning', PARTIALLY_PAID: 'bg-label-warning', PARCIAL: 'bg-label-warning',
    PARTIAL: 'bg-label-warning', EN_REVISION: 'bg-label-warning', PROPUESTO: 'bg-label-warning',
    AMBIGUO: 'bg-label-warning', AGOTADA: 'bg-label-warning', AUTOMATICO_MEDIO: 'bg-label-warning',
    OVERDUE: 'bg-label-warning',
    // rojo
    INACTIVE: 'bg-label-danger', INACTIVA: 'bg-label-danger', BLOCKED: 'bg-label-danger',
    REJECTED: 'bg-label-danger', RECHAZADO: 'bg-label-danger', RECHAZADA: 'bg-label-danger',
    VOIDED: 'bg-label-danger', ANULADA: 'bg-label-danger', ANULADO: 'bg-label-danger',
    CANCELLED: 'bg-label-danger', CANCELED: 'bg-label-danger', EXPIRED: 'bg-label-danger',
    CERRADA: 'bg-label-danger', CLOSED: 'bg-label-danger', CERRADO: 'bg-label-danger',
    DECOMMISSIONED: 'bg-label-danger', EXTRAVIADO: 'bg-label-danger', SUSPENDIDA: 'bg-label-danger',
    LOCKED: 'bg-label-danger', DISABLED: 'bg-label-danger', REVERSED: 'bg-label-danger',
    // gris / neutro
    SETTLED: 'bg-label-secondary', TRANSFERRED: 'bg-label-secondary', MANUAL: 'bg-label-secondary',
    SYSTEM: 'bg-label-secondary', CUSTOM: 'bg-label-secondary',
};

/** Convierte un token desconocido en title-case legible: NO_CONCILIADO -> "No Conciliado". */
const titleCase = (raw) => {
    if (raw === null || raw === undefined) return '-';
    const s = String(raw).trim();
    if (s === '') return '-';
    return s
        .toLowerCase()
        .split(/[_\s]+/)
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
};

/**
 * Traduce un valor de enum/BD a espanol (texto plano). Si no esta en el
 * diccionario, devuelve una version title-case legible.
 */
export const traducir = (value) => {
    if (value === null || value === undefined || value === '') return '-';
    const key = String(value).trim().toUpperCase();
    return LABELS[key] || titleCase(value);
};

/**
 * Devuelve un badge HTML coloreado con la etiqueta en espanol. Para columnas
 * de "Estado" en DataTable: render: (val) => statusBadge(val).
 */
export const statusBadge = (value) => {
    if (value === null || value === undefined || value === '') {
        return '<span class="badge bg-label-secondary">-</span>';
    }
    const key = String(value).trim().toUpperCase();
    const cls = BADGE[key] || 'bg-label-secondary';
    const label = LABELS[key] || titleCase(value);
    return `<span class="badge ${cls}">${label}</span>`;
};

export default { LABELS, traducir, statusBadge };
