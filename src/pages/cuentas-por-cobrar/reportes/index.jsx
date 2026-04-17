import { useState } from 'react';

import { fetchHelper } from '../../../utils/fetch';
import { base_url } from '../../../utils/functions';
import AlertPage from '../../../components/molecules/AlertPage';

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
                                <td>{row.status}</td>
                            </tr>
                        ))}
                    </tbody>
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
                        <div className="col-md-3">
                            <label className="form-label">Id Cliente (opcional)</label>
                            <input
                                type="number"
                                className="form-control"
                                value={filters.thirdPartyId}
                                onChange={(e) =>
                                    setFilters({ ...filters, thirdPartyId: e.target.value })
                                }
                            />
                        </div>
                    )}
                    {reportType === 'by-status' && (
                        <div className="col-md-3">
                            <label className="form-label">Estado</label>
                            <select
                                className="form-select"
                                value={filters.status}
                                onChange={(e) =>
                                    setFilters({ ...filters, status: e.target.value })
                                }
                            >
                                {STATUS_OPTIONS.map((s) => (
                                    <option key={s.id} value={s.id}>{s.label}</option>
                                ))}
                            </select>
                        </div>
                    )}
                    {reportType !== 'aging' && (
                        <>
                            <div className="col-md-3">
                                <label className="form-label">Fecha Inicio</label>
                                <input
                                    type="date"
                                    className="form-control"
                                    value={filters.startDate}
                                    onChange={(e) =>
                                        setFilters({ ...filters, startDate: e.target.value })
                                    }
                                />
                            </div>
                            <div className="col-md-3">
                                <label className="form-label">Fecha Fin</label>
                                <input
                                    type="date"
                                    className="form-control"
                                    value={filters.endDate}
                                    onChange={(e) =>
                                        setFilters({ ...filters, endDate: e.target.value })
                                    }
                                />
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
