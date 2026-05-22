import { useState } from 'react';
import { fetchHelper } from '../../../utils/fetch';
import { base_url } from '../../../utils/functions';
import AlertPage from '../../../components/molecules/AlertPage';

/**
 * Pagina de Balance de Comprobacion (CG).
 * Muestra saldos anteriores, movimientos y saldos finales por cuenta PUC.
 * Llama a GET /api/v1/cg/books/balance-comprobacion?year=&month=
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

const CgBalanceComprobacion = () => {
    const [year, setYear]         = useState(new Date().getFullYear());
    const [month, setMonth]       = useState(new Date().getMonth() + 1);
    const [rows, setRows]         = useState([]);
    const [loading, setLoading]   = useState(false);
    const [generated, setGenerated] = useState(false);
    const [message, setMessage]   = useState({ message: '', type: '', show: false });

    /** Consulta los datos del balance de comprobacion al backend. */
    /**
     * QA Bloque BP (HU-CG-16 E3): descarga del Balance de Comprobacion en
     * PDF/XLSX/CSV. PDF se sirve desde /balance-comprobacion/pdf y los
     * CSV/XLSX desde /balance-comprobacion/export/{format}.
     */
    const downloadBalance = async (fmt) => {
        try {
            const token = localStorage.getItem('token');
            const url = fmt === 'pdf'
                ? base_url(['api', 'v1', 'cg', 'books', 'balance-comprobacion', 'pdf'])
                    + `?year=${year}&month=${month}`
                : base_url(['api', 'v1', 'cg', 'books', 'balance-comprobacion', 'export', fmt])
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
            a.download = `BalanceComprobacion_${year}-${String(month).padStart(2, '0')}.${fmt}`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(blobUrl);
        } catch (err) {
            setMessage({ type: 'danger', show: true,
                message: err?.message || `No se pudo descargar el archivo ${fmt.toUpperCase()}.` });
        }
    };

    const handleGenerate = async () => {
        setLoading(true);
        setGenerated(false);
        setRows([]);
        try {
            const { data, error } = await fetchHelper.get(
                base_url(['api', 'v1', 'cg', 'books', 'balance-comprobacion']) + `?year=${year}&month=${month}`,
                {}, 0
            );
            if (!error) {
                const items = Array.isArray(data) ? data : (data?.data || []);
                setRows(items);
                setGenerated(true);
                if (items.length === 0) {
                    setMessage({ type: 'warning', show: true, message: 'No se encontraron registros para el periodo seleccionado.' });
                }
            } else {
                setMessage({ type: 'danger', show: true, message: 'Error al consultar el balance de comprobacion.' });
            }
        } catch (err) {
            setMessage({ type: 'danger', show: true, message: err?.msg || 'Error al consultar el balance de comprobacion.' });
        } finally {
            setLoading(false);
        }
    };

    /**
     * Calcula totales por columna.
     * QA HU-CG-16: el backend devuelve los campos con nombres en espanol
     * (saldoAnteriorDebit, movimientoDebit, saldoFinalDebit...). Antes el front leia
     * previousDebit/movementDebit/finalDebit y todos los montos salian en blanco.
     * Se leen los nombres reales con fallback a los antiguos por compatibilidad.
     */
    const num = (...vals) => {
        for (const v of vals) { if (v !== null && v !== undefined) return Number(v) || 0; }
        return 0;
    };
    const totals = rows.reduce((acc, r) => ({
        prevDebit:  acc.prevDebit  + num(r.saldoAnteriorDebit, r.previousDebit),
        prevCredit: acc.prevCredit + num(r.saldoAnteriorCredit, r.previousCredit),
        movDebit:   acc.movDebit   + num(r.movimientoDebit, r.movementDebit),
        movCredit:  acc.movCredit  + num(r.movimientoCredit, r.movementCredit),
        finDebit:   acc.finDebit   + num(r.saldoFinalDebit, r.finalDebit),
        finCredit:  acc.finCredit  + num(r.saldoFinalCredit, r.finalCredit),
    }), { prevDebit: 0, prevCredit: 0, movDebit: 0, movCredit: 0, finDebit: 0, finCredit: 0 });

    return (
        <div className="card">
            <h5 className="card-header text-md-start text-center">Balance de Comprobacion</h5>

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
                        {/* QA Bloque BP (HU-CG-16 E3): exportaciones */}
                        <button className="btn btn-outline-danger" onClick={() => downloadBalance('pdf')}
                                disabled={!generated || rows.length === 0}>
                            <i className="ri-file-pdf-line me-1" />PDF
                        </button>
                        <button className="btn btn-outline-success" onClick={() => downloadBalance('xlsx')}
                                disabled={!generated || rows.length === 0}>
                            <i className="ri-file-excel-2-line me-1" />Excel
                        </button>
                        <button className="btn btn-outline-secondary" onClick={() => downloadBalance('csv')}
                                disabled={!generated || rows.length === 0}>
                            <i className="ri-file-text-line me-1" />CSV
                        </button>
                    </div>
                </div>

                {/* Resultados */}
                {generated && rows.length > 0 && (
                    <>
                        {/* Badges de resumen */}
                        <div className="mb-3 d-flex gap-2 flex-wrap">
                            <span className="badge bg-label-primary">Cuentas: {rows.length}</span>
                            <span className="badge bg-label-secondary">Movim. Debito: {formatCurrency(totals.movDebit)}</span>
                            <span className="badge bg-label-secondary">Movim. Credito: {formatCurrency(totals.movCredit)}</span>
                            <span className="badge bg-label-success">Saldo Final D: {formatCurrency(totals.finDebit)}</span>
                            <span className="badge bg-label-info">Saldo Final C: {formatCurrency(totals.finCredit)}</span>
                            <span className={`badge ${totals.finDebit === totals.finCredit ? 'bg-label-success' : 'bg-label-danger'}`}>
                                {totals.finDebit === totals.finCredit ? 'Cuadrado' : 'Descuadrado'}
                            </span>
                        </div>

                        <div className="table-responsive">
                            <table className="table table-bordered table-striped table-hover table-sm">
                                <thead className="table-light">
                                    <tr>
                                        <th rowSpan="2" className="align-middle">Cuenta</th>
                                        <th rowSpan="2" className="align-middle">Nombre</th>
                                        <th colSpan="2" className="text-center">Saldo Anterior</th>
                                        <th colSpan="2" className="text-center">Movimiento</th>
                                        <th colSpan="2" className="text-center">Saldo Final</th>
                                    </tr>
                                    <tr>
                                        <th className="text-end">Debito</th>
                                        <th className="text-end">Credito</th>
                                        <th className="text-end">Debito</th>
                                        <th className="text-end">Credito</th>
                                        <th className="text-end">Debito</th>
                                        <th className="text-end">Credito</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map((r, idx) => (
                                        <tr key={idx}>
                                            <td>{r.pucCode || r.accountCode || '-'}</td>
                                            <td>{r.accountName || r.pucName || '-'}</td>
                                            <td className="text-end">{formatCurrency(r.saldoAnteriorDebit ?? r.previousDebit)}</td>
                                            <td className="text-end">{formatCurrency(r.saldoAnteriorCredit ?? r.previousCredit)}</td>
                                            <td className="text-end">{formatCurrency(r.movimientoDebit ?? r.movementDebit)}</td>
                                            <td className="text-end">{formatCurrency(r.movimientoCredit ?? r.movementCredit)}</td>
                                            <td className="text-end">{formatCurrency(r.saldoFinalDebit ?? r.finalDebit)}</td>
                                            <td className="text-end">{formatCurrency(r.saldoFinalCredit ?? r.finalCredit)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="table-light fw-bold">
                                    <tr>
                                        <td colSpan="2" className="text-end">TOTALES:</td>
                                        <td className="text-end">{formatCurrency(totals.prevDebit)}</td>
                                        <td className="text-end">{formatCurrency(totals.prevCredit)}</td>
                                        <td className="text-end">{formatCurrency(totals.movDebit)}</td>
                                        <td className="text-end">{formatCurrency(totals.movCredit)}</td>
                                        <td className="text-end">{formatCurrency(totals.finDebit)}</td>
                                        <td className="text-end">{formatCurrency(totals.finCredit)}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </>
                )}

                {generated && rows.length === 0 && (
                    <div className="text-center py-4 text-muted">
                        <i className="ri-file-search-line ri-2x mb-2 d-block" />
                        No se encontraron registros para el periodo seleccionado.
                    </div>
                )}
            </div>
        </div>
    );
};

export default CgBalanceComprobacion;
