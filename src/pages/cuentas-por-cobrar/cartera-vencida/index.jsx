import { useEffect, useState } from 'react';

import { fetchHelper } from '../../../utils/fetch';
import { base_url } from '../../../utils/functions';
import AlertPage from '../../../components/molecules/AlertPage';

/**
 * Pagina de Cartera Vencida (Cuentas por Cobrar).
 * Cubre HU AR-10: muestra aging, facturas vencidas y proximas a vencer.
 */

const formatCurrency = (val) => {
    if (val === null || val === undefined) return '-';
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 2,
    }).format(Number(val));
};

/**
 * HU-AR-10 E3: descarga CSV (UTF-8 con BOM) de un listado.
 * @param {Array<Object>} rows filas a exportar
 * @param {Array<{key,label}>} cols definicion de columnas
 * @param {string} filename nombre del archivo
 */
const downloadCsv = (rows, cols, filename) => {
    if (!rows || rows.length === 0) return;
    const head = cols.map(c => c.label).join(';');
    const body = rows.map(r => cols.map(c => {
        const v = r[c.key];
        if (v === null || v === undefined) return '';
        const s = String(v).replace(/"/g, '""');
        return s.includes(';') || s.includes('"') ? `"${s}"` : s;
    }).join(';')).join('\n');
    const csv = '﻿' + head + '\n' + body;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
};

/** HU-AR-10 E3: imprime una tabla a PDF via window.print de una ventana. */
const printToPdf = (title, rows, cols) => {
    if (!rows || rows.length === 0) return;
    const w = window.open('', '_blank');
    if (!w) return;
    const trs = rows.map(r => '<tr>' + cols.map(c => {
        const v = r[c.key];
        return `<td>${v === null || v === undefined ? '' : v}</td>`;
    }).join('') + '</tr>').join('');
    w.document.write(`<html><head><title>${title}</title>
        <style>body{font-family:Arial;padding:20px}h2{margin-bottom:15px}
        table{border-collapse:collapse;width:100%;font-size:12px}
        th,td{border:1px solid #999;padding:6px;text-align:left}
        th{background:#333;color:#fff}</style></head><body>
        <h2>${title}</h2><table><thead><tr>${cols.map(c => `<th>${c.label}</th>`).join('')}</tr></thead>
        <tbody>${trs}</tbody></table></body></html>`);
    w.document.close();
    setTimeout(() => { w.print(); }, 300);
};

const IndexArOverdue = () => {
    const [aging, setAging] = useState([]);
    const [overdue, setOverdue] = useState([]);
    const [upcoming, setUpcoming] = useState([]);
    const [upcomingDays, setUpcomingDays] = useState(7);
    const [overdueMinDays, setOverdueMinDays] = useState(0);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ message: '', type: '', show: false });

    /** Carga aging, vencidas y proximas a vencer. */
    const loadAll = async () => {
        setLoading(true);
        setMessage({ show: false, message: '', type: 'info' });
        try {
            const [agingRes, overdueRes, upcomingRes] = await Promise.all([
                fetchHelper.get(base_url(['api', 'v1', 'ar', 'reports', 'aging'])),
                fetchHelper.get(
                    base_url(['api', 'v1', 'ar', 'invoices', 'overdue'])
                    + (overdueMinDays ? `?days=${overdueMinDays}` : '')
                ),
                fetchHelper.get(
                    base_url(['api', 'v1', 'ar', 'invoices', 'upcoming'])
                    + `?days=${upcomingDays}`
                ),
            ]);
            setAging(agingRes?.data || []);
            setOverdue(overdueRes?.data || []);
            setUpcoming(upcomingRes?.data || []);
        } catch (error) {
            setMessage({
                show: true,
                type: 'danger',
                message: error?.msg || 'Error cargando cartera',
            });
        } finally {
            setLoading(false);
        }
    };

    /** Dispara manualmente el recalculo de estados OVERDUE. */
    const runUpdateOverdue = async () => {
        try {
            const res = await fetchHelper.post(
                base_url(['api', 'v1', 'sales-invoices', 'update-overdue']), {}
            );
            setMessage({
                show: true,
                type: 'success',
                message: res?.message || 'Estados actualizados',
            });
            loadAll();
        } catch (error) {
            setMessage({
                show: true,
                type: 'danger',
                message: error?.msg || 'Error actualizando estados',
            });
        }
    };

    useEffect(() => {
        loadAll();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div>
            <AlertPage
                type={message.type}
                message={message.message}
                show={message.show}
            />
            <div className="card mb-3">
                <h5 className="card-header">Aging de Cartera</h5>
                <div className="card-body">
                    <div className="row">
                        {aging.map((b) => (
                            <div key={b.bucket} className="col-md-3 mb-2">
                                <div className="card bg-label-warning h-100">
                                    <div className="card-body text-center">
                                        <h6 className="card-title">{b.bucket} dias</h6>
                                        <p className="mb-0 fw-bold">{formatCurrency(b.totalBalance)}</p>
                                        <small>{b.invoiceCount} facturas</small>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="mt-3">
                        <button
                            type="button"
                            className="btn btn-sm btn-outline-primary me-2"
                            onClick={loadAll}
                            disabled={loading}
                        >
                            <i className="ri-refresh-line me-1" />
                            Refrescar
                        </button>
                        <button
                            type="button"
                            className="btn btn-sm btn-outline-warning"
                            onClick={runUpdateOverdue}
                        >
                            <i className="ri-time-line me-1" />
                            Actualizar estados OVERDUE
                        </button>
                    </div>
                </div>
            </div>

            <div className="card mb-3">
                <h5 className="card-header d-flex justify-content-between align-items-center">
                    <span>Facturas Vencidas</span>
                    <div>
                        <label className="me-2">Mora minima (dias):</label>
                        <input
                            type="number"
                            min="0"
                            value={overdueMinDays}
                            onChange={(e) => setOverdueMinDays(Number(e.target.value))}
                            className="form-control form-control-sm d-inline-block"
                            style={{ width: 80 }}
                        />
                        <button
                            type="button"
                            className="btn btn-sm btn-primary ms-2"
                            onClick={loadAll}
                        >
                            Filtrar
                        </button>
                        {/* HU-AR-10 E3: export Excel/PDF */}
                        <button
                            type="button"
                            className="btn btn-sm btn-success ms-2"
                            disabled={overdue.length === 0}
                            onClick={() => downloadCsv(overdue, [
                                {key:'invoiceNumber',label:'Numero'},
                                {key:'thirdPartyName',label:'Cliente'},
                                {key:'thirdPartyNit',label:'NIT'},
                                {key:'dueDate',label:'Vence'},
                                {key:'balanceDue',label:'Saldo'},
                                {key:'daysOverdue',label:'Dias Mora'},
                            ], 'cartera-vencida.csv')}
                        >
                            <i className="ri-file-excel-2-line"></i> CSV
                        </button>
                        <button
                            type="button"
                            className="btn btn-sm btn-danger ms-2"
                            disabled={overdue.length === 0}
                            onClick={() => printToPdf('Cartera Vencida', overdue, [
                                {key:'invoiceNumber',label:'Numero'},
                                {key:'thirdPartyName',label:'Cliente'},
                                {key:'thirdPartyNit',label:'NIT'},
                                {key:'dueDate',label:'Vence'},
                                {key:'balanceDue',label:'Saldo'},
                                {key:'daysOverdue',label:'Dias Mora'},
                            ])}
                        >
                            <i className="ri-file-pdf-line"></i> PDF
                        </button>
                    </div>
                </h5>
                <div className="card-body">
                    <table className="table table-sm table-striped">
                        <thead className="table-dark">
                            <tr>
                                <th>Numero</th><th>Cliente</th><th>NIT</th>
                                <th>Vence</th><th>Saldo</th><th>Dias Mora</th>
                            </tr>
                        </thead>
                        <tbody>
                            {overdue.length === 0 && (
                                <tr><td colSpan="6" className="text-center text-muted py-3">
                                    <i className="ri-information-line me-2"></i>
                                    No se encontraron registros con los criterios seleccionados.
                                </td></tr>
                            )}
                            {overdue.map((r) => (
                                <tr key={r.invoiceId}>
                                    <td>{r.invoiceNumber}</td>
                                    <td>{r.thirdPartyName}</td>
                                    <td>{r.thirdPartyNit}</td>
                                    <td>{r.dueDate}</td>
                                    <td>{formatCurrency(r.balanceDue)}</td>
                                    <td><span className="badge bg-label-danger">{r.daysOverdue}</span></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="card mb-3">
                <h5 className="card-header d-flex justify-content-between align-items-center">
                    <span>Proximas a Vencer</span>
                    <div>
                        <label className="me-2">En proximos dias:</label>
                        <input
                            type="number"
                            min="1"
                            value={upcomingDays}
                            onChange={(e) => setUpcomingDays(Number(e.target.value))}
                            className="form-control form-control-sm d-inline-block"
                            style={{ width: 80 }}
                        />
                        <button
                            type="button"
                            className="btn btn-sm btn-primary ms-2"
                            onClick={loadAll}
                        >
                            Filtrar
                        </button>
                        {/* HU-AR-10 E3: export */}
                        <button
                            type="button"
                            className="btn btn-sm btn-success ms-2"
                            disabled={upcoming.length === 0}
                            onClick={() => downloadCsv(upcoming, [
                                {key:'invoiceNumber',label:'Numero'},
                                {key:'thirdPartyName',label:'Cliente'},
                                {key:'thirdPartyNit',label:'NIT'},
                                {key:'dueDate',label:'Vence'},
                                {key:'balanceDue',label:'Saldo'},
                            ], 'proximas-vencer.csv')}
                        >
                            <i className="ri-file-excel-2-line"></i> CSV
                        </button>
                        <button
                            type="button"
                            className="btn btn-sm btn-danger ms-2"
                            disabled={upcoming.length === 0}
                            onClick={() => printToPdf('Proximas a Vencer', upcoming, [
                                {key:'invoiceNumber',label:'Numero'},
                                {key:'thirdPartyName',label:'Cliente'},
                                {key:'thirdPartyNit',label:'NIT'},
                                {key:'dueDate',label:'Vence'},
                                {key:'balanceDue',label:'Saldo'},
                            ])}
                        >
                            <i className="ri-file-pdf-line"></i> PDF
                        </button>
                    </div>
                </h5>
                <div className="card-body">
                    <table className="table table-sm table-striped">
                        <thead className="table-dark">
                            <tr>
                                <th>Numero</th><th>Cliente</th><th>NIT</th>
                                <th>Vence</th><th>Saldo</th>
                            </tr>
                        </thead>
                        <tbody>
                            {upcoming.length === 0 && (
                                <tr><td colSpan="5" className="text-center text-muted py-3">
                                    <i className="ri-information-line me-2"></i>
                                    No se encontraron registros con los criterios seleccionados.
                                </td></tr>
                            )}
                            {upcoming.map((r) => (
                                <tr key={r.invoiceId}>
                                    <td>{r.invoiceNumber}</td>
                                    <td>{r.thirdPartyName}</td>
                                    <td>{r.thirdPartyNit}</td>
                                    <td>{r.dueDate}</td>
                                    <td>{formatCurrency(r.balanceDue)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default IndexArOverdue;
