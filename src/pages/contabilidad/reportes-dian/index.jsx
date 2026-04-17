import { useState } from 'react';
import AlertPage from '../../../components/molecules/AlertPage';
import { fetchHelper } from '../../../utils/fetch';
import { base_url } from '../../../utils/functions';

/**
 * Pagina de Reportes DIAN - Informacion Exogena (CG Bloque 5).
 * Permite generar y descargar los formatos F1001, F1007 y F1008
 * para el año gravable seleccionado.
 */

/** Formatos DIAN soportados. */
const FORMATOS_DIAN = [
    { id: 'F1001', label: 'Formato 1001 - Pagos a terceros' },
    { id: 'F1007', label: 'Formato 1007 - Ingresos recibidos' },
    { id: 'F1008', label: 'Formato 1008 - Cuentas por cobrar' },
];

/** Genera opciones de años (ultimos 5 años). */
const getYearOptions = () => {
    const current = new Date().getFullYear();
    const years = [];
    for (let y = current; y >= current - 5; y--) {
        years.push(y);
    }
    return years;
};

/** Formatea un numero a moneda COP. */
const fmt = (n) => {
    const v = Number(n || 0);
    return v.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
};

/** Definicion de columnas por formato. */
const columnsByFormat = {
    F1001: [
        { key: 'concepto', label: 'Concepto' },
        { key: 'tipoDocumento', label: 'Tipo Doc' },
        { key: 'numeroDocumento', label: 'NIT' },
        { key: 'dv', label: 'DV' },
        { key: 'nombresORazonSocial', label: 'Razon Social' },
        { key: 'pagoOAbono', label: 'Pago/Abono', numeric: true },
        { key: 'retencionEnLaFuente', label: 'Retencion', numeric: true },
        { key: 'ivaDescontable', label: 'IVA Descontable', numeric: true },
    ],
    F1007: [
        { key: 'concepto', label: 'Concepto' },
        { key: 'tipoDocumento', label: 'Tipo Doc' },
        { key: 'numeroDocumento', label: 'NIT' },
        { key: 'dv', label: 'DV' },
        { key: 'nombresORazonSocial', label: 'Razon Social' },
        { key: 'ingresoBrutoOperacional', label: 'Ingreso Bruto', numeric: true },
        { key: 'devolucionesRebajasDescuentos', label: 'Devoluciones', numeric: true },
        { key: 'ingresoNoConstitutivo', label: 'Ing. No Const.', numeric: true },
    ],
    F1008: [
        { key: 'concepto', label: 'Concepto' },
        { key: 'tipoDocumento', label: 'Tipo Doc' },
        { key: 'numeroDocumento', label: 'NIT' },
        { key: 'dv', label: 'DV' },
        { key: 'nombresORazonSocial', label: 'Razon Social' },
        { key: 'saldoCuentasPorCobrar', label: 'Saldo CxC', numeric: true },
    ],
};

const CgReportesDian = () => {
    const [formato, setFormato] = useState('F1001');
    const [year, setYear]       = useState(new Date().getFullYear() - 1);
    const [report, setReport]   = useState(null);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ message: '', type: '', show: false });

    /** Genera el reporte via POST al backend. */
    const handleGenerate = async () => {
        setLoading(true);
        setReport(null);
        try {
            const response = await fetchHelper.post(
                base_url(['api', 'v1', 'cg', 'dian-reports', 'generate']),
                { format: formato, year: Number(year) },
                {},
                1000
            );
            const data = response?.data || response?.data?.data || response;
            const payload = data?.data || data;
            setReport(payload);
            if (!payload?.rows || payload.rows.length === 0) {
                setMessage({
                    type: 'info',
                    show: true,
                    message: 'No hay datos para el año seleccionado.',
                });
            } else {
                setMessage({
                    type: 'success',
                    show: true,
                    message: `Reporte ${formato} generado: ${payload.totalRows} registros.`,
                });
            }
        } catch (err) {
            setMessage({
                type: 'danger',
                show: true,
                message: err?.msg || err?.message || 'Error generando el reporte DIAN.',
            });
        } finally {
            setLoading(false);
        }
    };

    /** Descarga CSV usando fetch con header Authorization. */
    const handleDownloadCsv = async () => {
        try {
            const token = localStorage.getItem('token');
            const url = base_url(['api', 'v1', 'cg', 'dian-reports', formato, year, 'csv']);
            const resp = await fetch(url, {
                method: 'GET',
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!resp.ok) {
                const text = await resp.text();
                throw new Error(text || 'Error descargando CSV');
            }
            const blob = await resp.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = `DIAN_${formato}_${year}.csv`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(blobUrl);
        } catch (err) {
            setMessage({
                type: 'danger',
                show: true,
                message: err?.message || 'Error descargando el archivo CSV.',
            });
        }
    };

    const columns = columnsByFormat[formato] || [];
    const rows    = report?.rows || [];

    return (
        <div className="card">
            <h5 className="card-header text-md-start text-center">Reportes DIAN - Informacion Exogena</h5>

            <AlertPage
                type={message.type}
                message={message.message}
                show={message.show}
                onChange={() => setMessage({ message: '', type: '', show: false })}
            />

            <div className="card-body">
                {/* Filtros */}
                <div className="row mb-4">
                    <div className="col-md-4 mb-2">
                        <label className="form-label">Formato DIAN</label>
                        <select
                            className="form-select"
                            value={formato}
                            onChange={e => { setFormato(e.target.value); setReport(null); }}
                        >
                            {FORMATOS_DIAN.map(f => (
                                <option key={f.id} value={f.id}>{f.label}</option>
                            ))}
                        </select>
                    </div>
                    <div className="col-md-3 mb-2">
                        <label className="form-label">Año Gravable</label>
                        <select
                            className="form-select"
                            value={year}
                            onChange={e => { setYear(Number(e.target.value)); setReport(null); }}
                        >
                            {getYearOptions().map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                    </div>
                    <div className="col-md-5 mb-2 d-flex align-items-end gap-2">
                        <button
                            className="btn btn-primary"
                            onClick={handleGenerate}
                            disabled={loading}
                        >
                            <i className="ri-file-chart-line me-1" />
                            {loading ? 'Generando...' : 'Generar'}
                        </button>
                        <button
                            className="btn btn-outline-success"
                            onClick={handleDownloadCsv}
                            disabled={!report || rows.length === 0}
                        >
                            <i className="ri-download-2-line me-1" />Descargar CSV
                        </button>
                    </div>
                </div>

                {/* Resultado */}
                {report && rows.length > 0 && (
                    <>
                        <div className="mb-3 d-flex gap-3 flex-wrap">
                            <span className="badge bg-label-primary">
                                Formato: {report.format}
                            </span>
                            <span className="badge bg-label-info">
                                Año: {report.year}
                            </span>
                            <span className="badge bg-label-secondary">
                                Registros: {report.totalRows}
                            </span>
                            <span className="badge bg-label-success">
                                Total: ${fmt(report.totalAmount)}
                            </span>
                        </div>

                        <div className="table-responsive">
                            <table className="table table-striped table-hover table-sm">
                                <thead className="table-light">
                                    <tr>
                                        {columns.map(c => (
                                            <th key={c.key} className={c.numeric ? 'text-end' : ''}>
                                                {c.label}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map((r, idx) => (
                                        <tr key={idx}>
                                            {columns.map(c => (
                                                <td key={c.key} className={c.numeric ? 'text-end' : ''}>
                                                    {c.numeric ? fmt(r[c.key]) : (r[c.key] ?? '')}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}

                {report && rows.length === 0 && (
                    <div className="alert alert-warning text-center">
                        <i className="ri-information-line me-1" />
                        No hay datos para el año seleccionado.
                    </div>
                )}

                {!report && (
                    <div className="border rounded p-4 text-center">
                        <i className="ri-government-line ri-3x text-primary mb-3 d-block" />
                        <h6 className="fw-bold">Formatos soportados:</h6>
                        <ul className="list-unstyled mb-0">
                            <li className="mb-1">
                                <span className="badge bg-label-primary me-2">F1001</span>
                                Pagos o abonos en cuenta y retenciones practicadas
                            </li>
                            <li className="mb-1">
                                <span className="badge bg-label-primary me-2">F1007</span>
                                Ingresos recibidos en el año
                            </li>
                            <li className="mb-1">
                                <span className="badge bg-label-primary me-2">F1008</span>
                                Saldos de cuentas por cobrar al 31 de diciembre
                            </li>
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CgReportesDian;
