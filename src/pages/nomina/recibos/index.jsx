import { useEffect, useRef, useState } from 'react';
import { base_url } from '../../../utils/functions';
import { fetchHelper } from '../../../utils/fetch';
import AlertPage from '../../../components/molecules/AlertPage';

/**
 * HU-NOM-03 / HU-NOM-04 / HU-NOM-06: Gestion de recibos de nomina.
 *
 * <p>Permite:
 * <ul>
 *   <li>Liquidar la nomina del periodo para todos los empleados ACTIVE o un filtro</li>
 *   <li>Listar recibos por periodo (filtrado por año/mes)</li>
 *   <li>Ver detalle con todas las lineas de concepto</li>
 *   <li>Aprobar recibos en DRAFT (HU-NOM-04 E1)</li>
 *   <li>Cerrar recibos en APPROVED (HU-NOM-04 E3 - inmutable)</li>
 *   <li>Descargar comprobante PDF de recibos APPROVED/CLOSED (HU-NOM-06 E1)</li>
 * </ul>
 */
const fmt = (n) => new Intl.NumberFormat('es-CO', {
    style: 'currency', currency: 'COP', maximumFractionDigits: 0
}).format(Number(n) || 0);

const IndexRecibos = () => {
    const now = new Date();
    const [recibos, setRecibos] = useState([]);
    const [loading, setLoading] = useState(false);
    const [alert, setAlert] = useState({ show: false, type: '', message: '' });
    const [filters, setFilters] = useState({
        year: now.getFullYear(),
        month: now.getMonth() + 1,
    });
    const [liquidating, setLiquidating] = useState(false);
    const [liqResult, setLiqResult] = useState(null);
    const [detail, setDetail] = useState(null);

    const load = async () => {
        setLoading(true);
        try {
            const data = await fetchHelper.get(
                    base_url(['api', 'nomina', 'recibos'], { year: filters.year, month: filters.month }),
                    {}, 0);
            setRecibos(Array.isArray(data) ? data : []);
        } catch (err) {
            setAlert({ show: true, type: 'danger', message: 'Error al cargar recibos' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

    const liquidate = async () => {
        const ok = await window.Swal.fire({
            title: '¿Liquidar nómina del periodo?',
            html: `Se liquidarán <b>TODOS los empleados activos</b> para ${filters.year}-${String(filters.month).padStart(2, '0')}.<br>
                Los empleados sin EPS o fondo de pensión serán excluidos (HU-NOM-03 E3).`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Sí, liquidar',
            cancelButtonText: 'Cancelar',
        });
        if (!ok.isConfirmed) return;

        setLiquidating(true);
        setLiqResult(null);
        try {
            const resp = await fetchHelper.post(
                    base_url(['api', 'nomina', 'recibos', 'liquidar']),
                    {
                        year: filters.year,
                        month: filters.month,
                        periodType: 'MONTHLY',
                        daysWorked: 30,
                    }, {}, 0);
            setLiqResult(resp);
            setAlert({ show: true, type: 'success',
                message: `Liquidación completa: ${resp.totalReceipts} recibos + JE #${resp.journalEntryId || '-'}${resp.excluded?.length ? ` (${resp.excluded.length} empleados excluidos)` : ''}` });
            load();
        } catch (err) {
            setAlert({ show: true, type: 'danger', message: err?.msg || err?.message || 'No se pudo liquidar.' });
        } finally {
            setLiquidating(false);
        }
    };

    const approve = async (r) => {
        const ok = await window.Swal.fire({
            title: '¿Aprobar recibo?', text: `Empleado: ${r.employeeName}.`,
            icon: 'question', showCancelButton: true,
            confirmButtonText: 'Aprobar', cancelButtonText: 'Cancelar',
        });
        if (!ok.isConfirmed) return;
        try {
            await fetchHelper.post(base_url(['api', 'nomina', 'recibos', r.id, 'approve']), {}, {}, 0);
            setAlert({ show: true, type: 'success', message: 'Recibo aprobado y JE contabilizado.' });
            load();
        } catch (err) {
            setAlert({ show: true, type: 'danger', message: err?.msg || 'No se pudo aprobar.' });
        }
    };

    const close = async (r) => {
        const ok = await window.Swal.fire({
            title: '¿Cerrar recibo definitivamente?',
            text: 'Una vez cerrado es INMUTABLE (HU-NOM-04 E3). Para corregir, crear nómina complementaria.',
            icon: 'warning', showCancelButton: true,
            confirmButtonText: 'Sí, cerrar', cancelButtonText: 'Cancelar',
        });
        if (!ok.isConfirmed) return;
        try {
            await fetchHelper.post(base_url(['api', 'nomina', 'recibos', r.id, 'close']), {}, {}, 0);
            setAlert({ show: true, type: 'success', message: 'Recibo cerrado definitivamente.' });
            load();
        } catch (err) {
            setAlert({ show: true, type: 'danger', message: err?.msg || 'No se pudo cerrar.' });
        }
    };

    const openDetail = async (r) => {
        try {
            const full = await fetchHelper.get(base_url(['api', 'nomina', 'recibos', r.id]), {}, 0);
            setDetail(full);
        } catch (err) {
            setAlert({ show: true, type: 'danger', message: 'No se pudo cargar el detalle.' });
        }
    };

    const downloadPdf = async (r) => {
        try {
            const token = localStorage.getItem('token');
            const url = base_url(['api', 'nomina', 'reportes', 'comprobante', r.id]);
            const resp = await fetch(url, {
                headers: token ? { 'Authorization': `Bearer ${token}` } : {},
            });
            if (!resp.ok) throw new Error('No se pudo generar el PDF');
            const blob = await resp.blob();
            const dlUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = dlUrl;
            a.download = `comprobante-nomina-${r.id}.pdf`;
            a.click();
            URL.revokeObjectURL(dlUrl);
        } catch (err) {
            setAlert({ show: true, type: 'danger', message: err.message || 'No se pudo descargar el PDF.' });
        }
    };

    const statusBadge = (s) => {
        const map = { DRAFT: 'bg-label-secondary', APPROVED: 'bg-label-info', CLOSED: 'bg-label-success' };
        const lbl = { DRAFT: 'Borrador', APPROVED: 'Aprobado', CLOSED: 'Cerrado' };
        return <span className={`badge ${map[s] || 'bg-label-secondary'}`}>{lbl[s] || s}</span>;
    };

    return (
        <>
            <div className="card">
                <h5 className="card-header d-flex justify-content-between align-items-center">
                    <span><i className="ri-file-list-3-line me-2"></i>Liquidación de nómina</span>
                    <button className="btn btn-primary btn-sm" onClick={liquidate} disabled={liquidating}>
                        {liquidating && <span className="spinner-border spinner-border-sm me-2"></span>}
                        <i className="ri-calculator-line me-1"></i> Liquidar periodo
                    </button>
                </h5>
                <div className="card-body">
                    <AlertPage message={alert.message} type={alert.type} show={alert.show}
                            onChange={() => setAlert({ show: false, type: '', message: '' })} />

                    <div className="row g-3 mb-3">
                        <div className="col-md-3">
                            <label className="form-label">Año</label>
                            <input type="number" className="form-control" value={filters.year}
                                    onChange={e => setFilters({ ...filters, year: Number(e.target.value) })} />
                        </div>
                        <div className="col-md-3">
                            <label className="form-label">Mes</label>
                            <input type="number" min="1" max="12" className="form-control" value={filters.month}
                                    onChange={e => setFilters({ ...filters, month: Number(e.target.value) })} />
                        </div>
                        <div className="col-md-3 d-flex align-items-end">
                            <button className="btn btn-outline-primary w-100" onClick={load}>
                                <i className="ri-filter-line me-1"></i> Consultar periodo
                            </button>
                        </div>
                    </div>

                    {liqResult?.excluded?.length > 0 && (
                        <div className="alert alert-warning">
                            <strong>Empleados excluidos ({liqResult.excluded.length}):</strong>
                            <ul className="mb-0 small">
                                {liqResult.excluded.map((x, i) => (
                                    <li key={i}>{x.fullName} ({x.documentNumber}): {x.error}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    <div className="table-responsive">
                        <table className="table table-hover">
                            <thead>
                                <tr>
                                    <th>Empleado</th>
                                    <th>Periodo</th>
                                    <th className="text-end">Devengados</th>
                                    <th className="text-end">Deducciones</th>
                                    <th className="text-end">Neto</th>
                                    <th>Estado</th>
                                    <th>JE</th>
                                    <th className="text-center">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading && <tr><td colSpan="8" className="text-center py-4">
                                    <div className="spinner-border text-primary"></div>
                                </td></tr>}
                                {!loading && recibos.length === 0 && (
                                    <tr><td colSpan="8" className="text-center text-muted py-4">
                                        Sin recibos para este periodo
                                    </td></tr>
                                )}
                                {!loading && recibos.map(r => (
                                    <tr key={r.id}>
                                        <td>
                                            <div>{r.employeeName}</div>
                                            <small className="text-muted">{r.employeeDocument}</small>
                                        </td>
                                        <td>{r.periodYear}-{String(r.periodMonth).padStart(2, '0')}</td>
                                        <td className="text-end">{fmt(r.totalEarnings)}</td>
                                        <td className="text-end">{fmt(r.totalDeductions)}</td>
                                        <td className="text-end fw-bold">{fmt(r.netPay)}</td>
                                        <td>{statusBadge(r.status)}</td>
                                        <td>
                                            {r.journalEntryId
                                                ? <span className="badge bg-label-success">JE #{r.journalEntryId}</span>
                                                : <span className="text-muted">-</span>}
                                        </td>
                                        <td className="text-center">
                                            <button className="btn btn-sm btn-label-info me-1"
                                                    onClick={() => openDetail(r)} title="Ver detalle">
                                                <i className="ri-eye-line"></i>
                                            </button>
                                            {r.status === 'DRAFT' && (
                                                <button className="btn btn-sm btn-label-success me-1"
                                                        onClick={() => approve(r)} title="Aprobar (HU-NOM-04 E1)">
                                                    <i className="ri-check-line"></i>
                                                </button>
                                            )}
                                            {r.status === 'APPROVED' && (
                                                <button className="btn btn-sm btn-label-warning me-1"
                                                        onClick={() => close(r)} title="Cerrar (HU-NOM-04 E3)">
                                                    <i className="ri-lock-line"></i>
                                                </button>
                                            )}
                                            {(r.status === 'APPROVED' || r.status === 'CLOSED') && (
                                                <button className="btn btn-sm btn-label-primary"
                                                        onClick={() => downloadPdf(r)} title="Comprobante PDF (HU-NOM-06 E1)">
                                                    <i className="ri-file-pdf-line"></i>
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {detail && (
                <div className="modal show fade d-block" tabIndex="-1"
                        style={{ background: 'rgba(0,0,0,.5)' }}>
                    <div className="modal-dialog modal-xl modal-dialog-scrollable">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">
                                    Recibo #{detail.id} - {detail.employeeName}
                                </h5>
                                <button type="button" className="btn-close" onClick={() => setDetail(null)}></button>
                            </div>
                            <div className="modal-body">
                                <div className="row mb-3">
                                    <div className="col-md-6">
                                        <div><strong>Documento:</strong> {detail.employeeDocument}</div>
                                        <div><strong>Período:</strong> {detail.periodYear}-{String(detail.periodMonth).padStart(2, '0')}</div>
                                        <div><strong>Días trabajados:</strong> {detail.daysWorked}</div>
                                    </div>
                                    <div className="col-md-6 text-md-end">
                                        <div>Estado: {statusBadge(detail.status)}</div>
                                        <div>JE: {detail.journalEntryId ? `#${detail.journalEntryId}` : '-'}</div>
                                    </div>
                                </div>

                                <div className="row g-3 mb-3">
                                    <div className="col-md-3"><div className="card bg-label-success"><div className="card-body text-center">
                                        <div className="small">Devengados</div><h5 className="mb-0">{fmt(detail.totalEarnings)}</h5>
                                    </div></div></div>
                                    <div className="col-md-3"><div className="card bg-label-warning"><div className="card-body text-center">
                                        <div className="small">Deducciones</div><h5 className="mb-0">{fmt(detail.totalDeductions)}</h5>
                                    </div></div></div>
                                    <div className="col-md-3"><div className="card bg-label-info"><div className="card-body text-center">
                                        <div className="small">Aportes empresa</div><h5 className="mb-0">{fmt(detail.totalEmployerContributions)}</h5>
                                    </div></div></div>
                                    <div className="col-md-3"><div className="card bg-label-primary"><div className="card-body text-center">
                                        <div className="small">Neto a pagar</div><h5 className="mb-0">{fmt(detail.netPay)}</h5>
                                    </div></div></div>
                                </div>

                                {['EARNING', 'DEDUCTION', 'EMPLOYER_CONTRIBUTION'].map(tipo => {
                                    const lns = (detail.lines || []).filter(l => l.lineType === tipo);
                                    if (lns.length === 0) return null;
                                    const lbl = {
                                        EARNING: 'Devengados',
                                        DEDUCTION: 'Deducciones',
                                        EMPLOYER_CONTRIBUTION: 'Aportes patronales',
                                    }[tipo];
                                    return (
                                        <div key={tipo} className="mb-3">
                                            <h6 className="text-uppercase text-muted small">{lbl}</h6>
                                            <table className="table table-sm">
                                                <tbody>
                                                    {lns.map(l => (
                                                        <tr key={l.id}>
                                                            <td><code>{l.conceptCode}</code></td>
                                                            <td>{l.conceptName}</td>
                                                            <td className="text-end">{fmt(l.amount)}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-label-secondary" onClick={() => setDetail(null)}>Cerrar</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default IndexRecibos;
