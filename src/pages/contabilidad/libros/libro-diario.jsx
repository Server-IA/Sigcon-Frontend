import { useState } from 'react';
import { fetchHelper } from '../../../utils/fetch';
import { base_url } from '../../../utils/functions';
import AlertPage from '../../../components/molecules/AlertPage';

/**
 * Pagina de Libro Diario (CG).
 *
 * Consume GET /api/v1/cg/books/diario?year=&month=
 *
 * Contrato de respuesta (backend):
 *   [
 *     {
 *       entryId, entryNumber, date, description, status, totalDebit, totalCredit,
 *       lines: [ { lineId, lineOrder, accountCode, accountName, debitAmount,
 *                  creditAmount, description, thirdPartyNit, costCenterName } ]
 *     }, ...
 *   ]
 *
 * Fix HU-CG-01B E1 / HU-CG-06B E1: la version anterior trataba cada entry como si
 * fuera una linea y leia campos inexistentes (e.debit en vez de line.debitAmount),
 * por eso el libro se veia vacio. Ahora itera las entries y renderiza sus lines.
 */

/** Formatea valores monetarios en formato colombiano. */
const formatCurrency = (val) => {
    if (val === null || val === undefined || val === 0) return '-';
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 2,
    }).format(Number(val));
};

/** Genera opciones de anios (ultimos 5 anios + 1 futuro). */
const getYearOptions = () => {
    const current = new Date().getFullYear();
    const years = [];
    for (let y = current + 1; y >= current - 5; y--) {
        years.push(y);
    }
    return years;
};

/** Retorna nombre del mes capitalizado en espanol. */
const getMonthLabel = (m) => {
    const name = new Date(2000, m - 1).toLocaleString('es-CO', { month: 'long' });
    return name.charAt(0).toUpperCase() + name.slice(1);
};

const CgLibroDiario = () => {
    const [year, setYear]         = useState(new Date().getFullYear());
    const [month, setMonth]       = useState(new Date().getMonth() + 1);
    const [entries, setEntries]   = useState([]);
    const [loading, setLoading]   = useState(false);
    const [generated, setGenerated] = useState(false);
    const [message, setMessage]   = useState({ message: '', type: '', show: false });

    /** Consulta los datos del libro diario al backend. */
    const handleGenerate = async () => {
        setLoading(true);
        setGenerated(false);
        setEntries([]);
        try {
            const { data, error } = await fetchHelper.get(
                base_url(['api', 'v1', 'cg', 'books', 'diario']) + `?year=${year}&month=${month}`,
                {}, 0
            );
            if (!error) {
                const items = Array.isArray(data) ? data : (data?.data || []);
                setEntries(items);
                setGenerated(true);
                if (items.length === 0) {
                    setMessage({ type: 'warning', show: true, message: 'No se encontraron registros para el periodo seleccionado.' });
                }
            } else {
                setMessage({ type: 'danger', show: true, message: 'Error al consultar el libro diario.' });
            }
        } catch (err) {
            setMessage({ type: 'danger', show: true, message: err?.msg || 'Error al consultar el libro diario.' });
        } finally {
            setLoading(false);
        }
    };

    /**
     * QA Bloque BP (HU-CG-14 E5): descarga del Libro Diario en PDF/XLSX/CSV.
     * El endpoint PDF /diario/pdf ya existe; los CSV/XLSX se sirven desde
     * /diario/export/{format}.
     */
    const downloadBook = async (fmt) => {
        try {
            const token = localStorage.getItem('token');
            const url = fmt === 'pdf'
                ? base_url(['api', 'v1', 'cg', 'books', 'diario', 'pdf'])
                    + `?year=${year}&month=${month}`
                : base_url(['api', 'v1', 'cg', 'books', 'diario', 'export', fmt])
                    + `?year=${year}&month=${month}`;
            const resp = await fetch(url, {
                method: 'GET',
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!resp.ok) {
                const text = await resp.text();
                throw new Error(text || 'Error descargando archivo');
            }
            const blob = await resp.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = `LibroDiario_${year}-${String(month).padStart(2, '0')}.${fmt}`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(blobUrl);
        } catch (err) {
            setMessage({ type: 'danger', show: true,
                message: err?.message || `No se pudo descargar el archivo ${fmt.toUpperCase()}.` });
        }
    };

    /**
     * Totales del periodo: suman los totalDebit/totalCredit de CADA comprobante
     * (no de las lineas, porque el backend ya trae los totales agregados).
     */
    const totalDebit  = entries.reduce((sum, e) => sum + (Number(e.totalDebit) || 0), 0);
    const totalCredit = entries.reduce((sum, e) => sum + (Number(e.totalCredit) || 0), 0);

    /** Conteo de lineas total (para el badge "Registros"). */
    const totalLines = entries.reduce((sum, e) => sum + (Array.isArray(e.lines) ? e.lines.length : 0), 0);

    return (
        <div className="card">
            <h5 className="card-header text-md-start text-center">Libro Diario</h5>

            <AlertPage
                type={message.type}
                message={message.message}
                show={message.show}
                onChange={() => setMessage({ message: '', type: '', show: false })}
            />

            <div className="card-body">
                {/* Filtros compactos */}
                <div className="row mb-4">
                    <div className="col-md-2 mb-2">
                        <label className="form-label">Año</label>
                        <select className="form-select" value={year} onChange={e => setYear(Number(e.target.value))}>
                            {getYearOptions().map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                    </div>
                    <div className="col-md-2 mb-2">
                        <label className="form-label">Mes</label>
                        <select className="form-select" value={month} onChange={e => setMonth(Number(e.target.value))}>
                            {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => (
                                <option key={m} value={m}>{getMonthLabel(m)}</option>
                            ))}
                        </select>
                    </div>
                    <div className="col-md-8 mb-2 d-flex align-items-end gap-2 flex-wrap">
                        <button className="btn btn-primary" onClick={handleGenerate} disabled={loading}>
                            {loading ? (
                                <><span className="spinner-border spinner-border-sm me-2" />Generando...</>
                            ) : (
                                <><i className="ri-search-line me-1" />Generar</>
                            )}
                        </button>
                        {/* QA Bloque BP (HU-CG-14 E5): exportaciones */}
                        <button className="btn btn-outline-danger" onClick={() => downloadBook('pdf')}
                                disabled={!generated || entries.length === 0}>
                            <i className="ri-file-pdf-line me-1" />PDF
                        </button>
                        <button className="btn btn-outline-success" onClick={() => downloadBook('xlsx')}
                                disabled={!generated || entries.length === 0}>
                            <i className="ri-file-excel-2-line me-1" />Excel
                        </button>
                        <button className="btn btn-outline-secondary" onClick={() => downloadBook('csv')}
                                disabled={!generated || entries.length === 0}>
                            <i className="ri-file-text-line me-1" />CSV
                        </button>
                    </div>
                </div>

                {/* Resumen superior */}
                {generated && entries.length > 0 && (
                    <>
                        <div className="mb-3 d-flex gap-2 flex-wrap">
                            <span className="badge bg-label-primary">Registros: {totalLines}</span>
                            <span className="badge bg-label-secondary">Comprobantes: {entries.length}</span>
                            <span className="badge bg-label-success">Debito: {formatCurrency(totalDebit)}</span>
                            <span className="badge bg-label-info">Credito: {formatCurrency(totalCredit)}</span>
                            <span className={`badge ${totalDebit === totalCredit ? 'bg-label-success' : 'bg-label-danger'}`}>
                                {totalDebit === totalCredit ? 'Cuadrado' : 'Descuadrado'}
                            </span>
                        </div>

                        {/* Un bloque por comprobante */}
                        {entries.map((entry) => {
                            const lines = Array.isArray(entry.lines) ? entry.lines : [];
                            const subDebit  = lines.reduce((s, l) => s + (Number(l.debitAmount) || 0), 0);
                            const subCredit = lines.reduce((s, l) => s + (Number(l.creditAmount) || 0), 0);
                            return (
                                <div key={entry.entryId || entry.entryNumber} className="mb-3 border rounded p-2">
                                    <div className="d-flex justify-content-between align-items-center mb-2 flex-wrap">
                                        <strong>
                                            <i className="ri-file-list-3-line me-1" />
                                            {entry.voucherCode || `#${entry.entryNumber || entry.entryId}`}
                                            <span className="text-muted ms-2 small">{entry.date || ''}</span>
                                        </strong>
                                        <span className="text-muted small">{entry.description || ''}</span>
                                    </div>
                                    <div className="table-responsive">
                                        <table className="table table-sm mb-0">
                                            <thead className="table-light">
                                                <tr>
                                                    <th style={{ width: '20%' }}>Cuenta</th>
                                                    <th>Descripcion</th>
                                                    <th style={{ width: '12%' }}>Tercero (NIT)</th>
                                                    <th style={{ width: '12%' }}>Centro Costo</th>
                                                    <th className="text-end" style={{ width: '13%' }}>Debito</th>
                                                    <th className="text-end" style={{ width: '13%' }}>Credito</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {lines.length === 0 && (
                                                    <tr>
                                                        <td colSpan="6" className="text-center text-muted small">
                                                            Este comprobante no tiene lineas registradas.
                                                        </td>
                                                    </tr>
                                                )}
                                                {lines.map((l) => (
                                                    <tr key={l.lineId}>
                                                        <td><code>{l.accountCode || '-'}</code> {l.accountName || ''}</td>
                                                        <td className="text-muted small">{l.description || entry.description || '-'}</td>
                                                        <td className="small">{l.thirdPartyNit || '-'}</td>
                                                        <td className="small">{l.costCenterName || '-'}</td>
                                                        <td className="text-end">{formatCurrency(l.debitAmount)}</td>
                                                        <td className="text-end">{formatCurrency(l.creditAmount)}</td>
                                                    </tr>
                                                ))}
                                                <tr className="table-light fw-bold">
                                                    <td colSpan="4" className="text-end">Subtotal</td>
                                                    <td className="text-end">{formatCurrency(subDebit)}</td>
                                                    <td className="text-end">{formatCurrency(subCredit)}</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            );
                        })}

                        {/* Totales globales */}
                        <div className="alert alert-light border d-flex justify-content-between align-items-center mb-0">
                            <strong>TOTALES DEL PERIODO</strong>
                            <div>
                                <span className="me-3">Debito: <strong>{formatCurrency(totalDebit)}</strong></span>
                                <span>Credito: <strong>{formatCurrency(totalCredit)}</strong></span>
                            </div>
                        </div>
                    </>
                )}

                {generated && entries.length === 0 && (
                    <div className="text-center py-4 text-muted">
                        <i className="ri-file-search-line ri-2x mb-2 d-block" />
                        No se encontraron registros para el periodo seleccionado.
                    </div>
                )}
            </div>
        </div>
    );
};

export default CgLibroDiario;
