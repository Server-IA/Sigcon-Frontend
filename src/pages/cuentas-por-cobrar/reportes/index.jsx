import { useState, useEffect } from 'react';

import { fetchHelper } from '../../../utils/fetch';
import { base_url } from '../../../utils/functions';
import AlertPage from '../../../components/molecules/AlertPage';
import InputSelectModal from '../../../components/molecules/inputSelectModal';

/**
 * Pagina de Reportes de Cuentas por Cobrar.
 * Cubre HUs AR-05 (por cliente/estado/periodo) y AR-10 (aging).
 * Permite consultar datos estructurados y descargar PDF por cada tipo de reporte.
 */

const REPORT_TYPES = [
    { id: 'by-customer', label: 'Por Cliente' },
    { id: 'by-status', label: 'Por Estado' },
    { id: 'by-period', label: 'Por Periodo' },
    { id: 'aging', label: 'Aging de Cartera' },
];

const STATUS_OPTIONS = [
    { id: '', label: 'Seleccione...' },
    { id: 'DRAFT', label: 'Borrador' },
    { id: 'ISSUED', label: 'Emitida' },
    { id: 'PARTIALLY_PAID', label: 'Pago Parcial' },
    { id: 'PAID', label: 'Pagada' },
    { id: 'OVERDUE', label: 'Vencida' },
    { id: 'VOIDED', label: 'Anulada' },
    { id: 'SETTLED', label: 'Liquidada' },
];

const formatCurrency = (val) => {
    if (val === null || val === undefined) return '-';
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 2,
    }).format(Number(val));
};

// QA Bloque BN (2026-05-18): mapeo enum -> etiqueta espanol. Antes la columna
// Estado mostraba "ISSUED" / "PAID" / etc. crudos del enum del backend, lo
// que confunde al contador. Espejo del helper SalesInvoiceStatus.labelOf del
// backend (sincronizado con esa fuente unica de verdad).
const STATUS_LABEL_MAP = {
    DRAFT: 'Borrador',
    ISSUED: 'Emitida',
    PARTIALLY_PAID: 'Pago Parcial',
    PAID: 'Pagada',
    OVERDUE: 'Vencida',
    VOIDED: 'Anulada',
    SETTLED: 'Liquidada',
};
const labelStatus = (raw) => (raw && STATUS_LABEL_MAP[raw]) || raw || '';

const IndexArReports = () => {
    const [reportType, setReportType] = useState('by-customer');
    const [filters, setFilters] = useState({
        thirdPartyId: '',
        status: '',
        startDate: '',
        endDate: '',
    });
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ message: '', type: '', show: false });
    const [fieldErrors, setFieldErrors] = useState({});
    // HU-AR-05 E1: lista de clientes para dropdown buscable.
    const [clients, setClients] = useState([]);

    useEffect(() => {
        // Cargar terceros con rol cliente para el filtro "Por Cliente".
        const loadClients = async () => {
            try {
                const resp = await fetchHelper.post(
                    base_url(['api', 'v1', 'third-parties', 'search']),
                    { length: -1, columns: [] }, {}, 0
                );
                const list = Array.isArray(resp?.data) ? resp.data : (Array.isArray(resp) ? resp : []);
                setClients(list.map((t) => ({
                    id: t.id,
                    // Mostramos NIT + razon social + nombre comercial para que el
                    // contador pueda buscar por cualquiera de esos campos.
                    name: `${t.nit || t.documentNumber || ''}${t.dv ? '-' + t.dv : ''} - ${t.businessName || t.firstName || ''}`.trim(),
                })));
            } catch (_) { /* noop */ }
        };
        loadClients();
    }, []);

    /** Construye el body del request a partir del tipo seleccionado y filtros. */
    const buildBody = () => {
        const body = {
            startDate: filters.startDate || null,
            endDate: filters.endDate || null,
        };
        if (reportType === 'by-customer' && filters.thirdPartyId) {
            body.thirdPartyId = Number(filters.thirdPartyId);
        }
        if (reportType === 'by-status') {
            body.status = filters.status;
        }
        return body;
    };

    /** Ejecuta la consulta del reporte. */
    const runReport = async () => {
        setMessage({ show: false });
        // QA-2026-05-05: validar campos obligatorios y mostrar errores en rojo
        // antes de disparar el reporte.
        const errs = {};
        if (reportType !== 'aging') {
            if (!filters.startDate) errs.startDate = 'La fecha inicial es requerida.';
            if (!filters.endDate) errs.endDate = 'La fecha final es requerida.';
        }
        if (reportType === 'by-customer' && !filters.thirdPartyId) {
            errs.thirdPartyId = 'Seleccione un cliente.';
        }
        if (reportType === 'by-status' && !filters.status) {
            errs.status = 'Seleccione un estado.';
        }
        setFieldErrors(errs);
        if (Object.keys(errs).length > 0) {
            setMessage({ show: true, type: 'danger',
                message: 'Hay campos obligatorios sin completar. Revise los marcados en rojo.' });
            return;
        }
        setData(null);
        setLoading(true);
        try {
            let res;
            if (reportType === 'aging') {
                res = await fetchHelper.get(base_url(['api', 'v1', 'ar', 'reports', 'aging']));
            } else {
                const body = buildBody();
                res = await fetchHelper.post(
                    base_url(['api', 'v1', 'ar', 'reports', reportType]), body
                );
            }
            setData(res?.data ?? res);
        } catch (error) {
            const msg = error?.msg || error?.message || 'Error generando reporte';
            setMessage({ show: true, type: 'danger', message: msg });
        } finally {
            setLoading(false);
        }
    };

    /** Descarga el PDF del reporte. */
    const downloadPdf = async () => {
        try {
            const body = reportType === 'aging' ? {} : buildBody();
            const token = localStorage.getItem('token');
            const response = await fetch(
                base_url(['api', 'v1', 'ar', 'reports', reportType, 'pdf']),
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(token ? { Authorization: `Bearer ${token}` } : {}),
                    },
                    body: JSON.stringify(body),
                }
            );
            if (!response.ok) throw new Error('Error al generar PDF');
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `reporte_cxc_${reportType}.pdf`;
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            setMessage({ show: true, type: 'danger', message: error?.message || 'Error PDF' });
        }
    };

    /** Renderiza la tabla de resultados segun el tipo de reporte. */
    const renderResults = () => {
        if (!data) return null;

        // HU-AR-10 E2 (2026-04-27): mensaje claro cuando los criterios no
        // devuelven resultados. Antes el frontend pintaba tabla vacia y el QA
        // no sabia si fallaba o si simplemente no habia datos.
        const isEmpty = (Array.isArray(data) && data.length === 0)
            || (data && typeof data === 'object' && !Array.isArray(data)
                && data.invoiceCount === 0 && reportType === 'by-period');
        if (isEmpty) {
            return (
                <div className="alert alert-info text-center py-3 mb-0">
                    <i className="ri-information-line me-2"></i>
                    No se encontraron registros con los criterios seleccionados.
                </div>
            );
        }

        if (reportType === 'by-period') {
            return (
                <div className="row">
                    <div className="col-md-3"><strong>Facturas:</strong> {data.invoiceCount}</div>
                    <div className="col-md-3"><strong>Facturado:</strong> {formatCurrency(data.totalInvoiced)}</div>
                    <div className="col-md-3"><strong>Cobrado:</strong> {formatCurrency(data.totalCollected)}</div>
                    <div className="col-md-3"><strong>Pendiente:</strong> {formatCurrency(data.totalPending)}</div>
                </div>
            );
        }

        if (reportType === 'aging' && Array.isArray(data)) {
            return (
                <table className="table table-sm table-striped">
                    <thead className="table-dark">
                        <tr><th>Bucket (dias)</th><th>Cantidad</th><th>Saldo Total</th></tr>
                    </thead>
                    <tbody>
                        {data.map((b) => (
                            <tr key={b.bucket}>
                                <td>{b.bucket}</td>
                                <td>{b.invoiceCount}</td>
                                <td>{formatCurrency(b.totalBalance)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            );
        }

        if (reportType === 'by-customer' && Array.isArray(data)) {
            return (
                <table className="table table-sm table-striped">
                    <thead className="table-dark">
                        <tr>
                            <th>NIT</th><th>Cliente</th><th>Facturas</th>
                            <th>Facturado</th><th>Pendiente</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((c) => (
                            <tr key={c.thirdPartyId}>
                                <td>{c.thirdPartyNit}</td>
                                <td>{c.thirdPartyName}</td>
                                <td>{c.invoiceCount}</td>
                                <td>{formatCurrency(c.totalInvoiced)}</td>
                                <td>{formatCurrency(c.totalPending)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            );
        }

        if (Array.isArray(data)) {
            return (
                <table className="table table-sm table-striped">
                    <thead className="table-dark">
                        <tr>
                            <th>Numero</th><th>Cliente</th><th>NIT</th>
                            <th>Fecha</th><th>Vence</th><th>Total</th>
                            <th>Saldo</th><th>Estado</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((row) => (
                            <tr key={row.invoiceId}>
                                <td>{row.invoiceNumber}</td>
                                <td>{row.thirdPartyName}</td>
                                <td>{row.thirdPartyNit}</td>
                                <td>{row.invoiceDate}</td>
                                <td>{row.dueDate}</td>
                                <td>{formatCurrency(row.totalAmount)}</td>
                                <td>{formatCurrency(row.balanceDue)}</td>
                                <td>{labelStatus(row.status)}</td>
                            </tr>
                        ))}
                    </tbody>
                    {/* QA Bloque BN (2026-05-18): fila TOTAL con sumatorias.
                        HU exige que los reportes muestren totales agregados
                        para que el contador vea de un vistazo el monto total
                        y saldo total de la cartera filtrada. */}
                    {data.length > 0 && (
                        <tfoot className="table-light fw-bold">
                            <tr>
                                <td colSpan={5} className="text-end">TOTAL ({data.length} facturas):</td>
                                <td>{formatCurrency(data.reduce((s, r) => s + Number(r.totalAmount || 0), 0))}</td>
                                <td>{formatCurrency(data.reduce((s, r) => s + Number(r.balanceDue || 0), 0))}</td>
                                <td></td>
                            </tr>
                        </tfoot>
                    )}
                </table>
            );
        }

        return <pre>{JSON.stringify(data, null, 2)}</pre>;
    };

    return (
        <div className="card">
            <h5 className="card-header">Reportes de Cuentas por Cobrar</h5>
            <div className="card-body">
                <AlertPage
                    type={message.type}
                    message={message.message}
                    show={message.show}
                />
                <div className="row g-3 mb-3">
                    <div className="col-md-3">
                        <label className="form-label">Tipo de Reporte</label>
                        <select
                            className="form-select"
                            value={reportType}
                            onChange={(e) => setReportType(e.target.value)}
                        >
                            {REPORT_TYPES.map((t) => (
                                <option key={t.id} value={t.id}>{t.label}</option>
                            ))}
                        </select>
                    </div>
                    {reportType === 'by-customer' && (
                        <div className="col-md-4">
                            {/* QA-2026-05-05: usar select Bootstrap clasico (label arriba) para
                                alinear vertical con Tipo de Reporte y Fechas, que usan el mismo
                                patron. Antes se usaba InputSelectModal con form-floating y la
                                etiqueta flotante quedaba desalineada visualmente. */}
                            <label className="form-label">Cliente <span className="text-danger">*</span></label>
                            <select
                                className={`form-select${fieldErrors.thirdPartyId ? ' is-invalid' : ''}`}
                                value={filters.thirdPartyId}
                                onChange={(e) =>
                                    setFilters({ ...filters, thirdPartyId: e.target.value })
                                }
                            >
                                <option value="">{clients.length === 0 ? 'No hay clientes registrados...' : 'Seleccione un cliente...'}</option>
                                {clients.map((c) => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                            {fieldErrors.thirdPartyId && <div className="invalid-feedback d-block">{fieldErrors.thirdPartyId}</div>}
                        </div>
                    )}
                    {reportType === 'by-status' && (
                        <div className="col-md-3">
                            <label className="form-label">Estado <span className="text-danger">*</span></label>
                            <select
                                className={`form-select${fieldErrors.status ? ' is-invalid' : ''}`}
                                value={filters.status}
                                onChange={(e) =>
                                    setFilters({ ...filters, status: e.target.value })
                                }
                            >
                                {STATUS_OPTIONS.map((s) => (
                                    <option key={s.id} value={s.id}>{s.label}</option>
                                ))}
                            </select>
                            {fieldErrors.status && <div className="invalid-feedback d-block">{fieldErrors.status}</div>}
                        </div>
                    )}
                    {reportType !== 'aging' && (
                        <>
                            <div className="col-md-3">
                                <label className="form-label">Fecha Inicio <span className="text-danger">*</span></label>
                                <input
                                    type="date"
                                    className={`form-control${fieldErrors.startDate ? ' is-invalid' : ''}`}
                                    value={filters.startDate}
                                    onChange={(e) =>
                                        setFilters({ ...filters, startDate: e.target.value })
                                    }
                                />
                                {fieldErrors.startDate && <div className="invalid-feedback d-block">{fieldErrors.startDate}</div>}
                            </div>
                            <div className="col-md-3">
                                <label className="form-label">Fecha Fin <span className="text-danger">*</span></label>
                                <input
                                    type="date"
                                    className={`form-control${fieldErrors.endDate ? ' is-invalid' : ''}`}
                                    value={filters.endDate}
                                    onChange={(e) =>
                                        setFilters({ ...filters, endDate: e.target.value })
                                    }
                                />
                                {fieldErrors.endDate && <div className="invalid-feedback d-block">{fieldErrors.endDate}</div>}
                            </div>
                        </>
                    )}
                </div>
                <div className="mb-3">
                    <button
                        type="button"
                        className="btn btn-primary me-2"
                        onClick={runReport}
                        disabled={loading}
                    >
                        {loading ? 'Cargando...' : 'Consultar'}
                    </button>
                    <button
                        type="button"
                        className="btn btn-outline-danger"
                        onClick={downloadPdf}
                        disabled={loading}
                    >
                        <i className="ri-file-pdf-line me-1" />
                        Descargar PDF
                    </button>
                </div>
                <div>{renderResults()}</div>
            </div>
        </div>
    );
};

export default IndexArReports;
