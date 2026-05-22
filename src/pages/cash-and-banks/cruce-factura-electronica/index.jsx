import { useState, useEffect } from 'react';
import { base_url, formatPrice } from '@/utils/functions';
import { fetchHelper } from '@/utils/fetch';

/**
 * BNK-HU-078: cruce de movimientos del extracto con facturas electrónicas (CxC/CxP).
 * Sugiere facturas coincidentes (E1/E2), aplica el cobro/pago — total/parcial/consolidado —
 * (E3/E5/E6) marcando la factura, y muestra el reporte de cumplimiento DIAN (E7).
 */
const CruceFacturaElectronica = ({ embeddedAccountId } = {}) => {
    const [accounts, setAccounts] = useState([]);
    const [accountId, setAccountId] = useState(embeddedAccountId ? String(embeddedAccountId) : '');
    const [movs, setMovs] = useState([]);
    const [movId, setMovId] = useState('');
    const [sug, setSug] = useState(null);
    const [sel, setSel] = useState([]);
    const [rep, setRep] = useState(null);
    const [year, setYear] = useState(new Date().getFullYear());

    const cUrl = (...p) => base_url(['api', 'v1', 'banks', 'cruce-fe', ...p]);

    useEffect(() => {
        (async () => {
            try {
                const res = await fetchHelper.post(base_url(['api', 'v1', 'bank-accounts', 'search']),
                    { draw: 1, start: 0, length: 200, search: { value: '' } }, {}, 1, false, true);
                setAccounts(res?.data || []);
            } catch (_) { setAccounts([]); }
        })();
    }, []);

    const cargarMovs = async (acc) => {
        setMovs([]); setMovId(''); setSug(null); setSel([]);
        if (!acc) return;
        try {
            const w = await fetchHelper.get(base_url(['api', 'v1', 'banks', 'emparejamientos', 'workspace', acc]), {}, 0, false, true);
            setMovs((w?.extracto || []).filter(m => m.estadoConciliacion !== 'CONCILIADO'));
        } catch (_) { setMovs([]); }
    };

    // Embebido: cuenta fija de la URL, carga automática de sus movimientos.
    useEffect(() => {
        if (embeddedAccountId) cargarMovs(String(embeddedAccountId));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [embeddedAccountId]);

    const sugerir = async () => {
        setSug(null); setSel([]);
        if (!movId) { window.Swal.fire({ icon: 'warning', title: 'Seleccione un movimiento del extracto' }); return; }
        try {
            const s = await fetchHelper.get(cUrl('sugerir', movId), {}, 0, true);
            setSug(s || null);
        } catch (_) { /* */ }
    };

    const toggleSel = (id) => setSel(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

    const aplicar = async (invoiceId) => {
        try {
            const r = await fetchHelper.post(cUrl('aplicar'), { movementId: Number(movId), invoiceId }, {}, 0, true);
            window.Swal.fire({ icon: 'success', title: 'Cruce aplicado', html: `Factura <b>${r?.numeroFactura}</b><br/>Aplicado: <b>${formatPrice(r?.montoAplicado)}</b>` });
            await cargarMovs(accountId); setSug(null); setSel([]);
        } catch (_) { /* */ }
    };

    const aplicarMultiple = async () => {
        if (sel.length < 2) { window.Swal.fire({ icon: 'warning', title: 'Seleccione 2 o más facturas' }); return; }
        try {
            const r = await fetchHelper.post(cUrl('aplicar-multiple'), { movementId: Number(movId), invoiceIds: sel }, {}, 0, true);
            window.Swal.fire({ icon: 'success', title: 'Cruce consolidado aplicado', html: `Facturas: <b>${r?.facturasAplicadas}</b><br/>Remanente: <b>${formatPrice(r?.remanente)}</b>` });
            await cargarMovs(accountId); setSug(null); setSel([]);
        } catch (_) { /* */ }
    };

    const cargarReporte = async () => {
        try {
            const r = await fetchHelper.get(cUrl('reporte-cumplimiento') + `?year=${year}`, {}, 0, false, true);
            setRep(r || null);
        } catch (_) { setRep(null); }
    };

    const accLabel = (a) => `${a.code || a.accountNumber || ('#' + a.id)}${a.bankDTO?.name ? ' · ' + a.bankDTO.name : ''}`;

    return (
        <div className="row g-3">
            <div className="col-12">
                <div className="card">
                    <h5 className="card-header">Cruce con factura electrónica (DIAN)</h5>
                    <div className="card-body">
                        <div className="row g-3 align-items-end mb-3">
                            {!embeddedAccountId && (
                            <div className="col-md-5">
                                <label className="form-label">Cuenta bancaria</label>
                                <select className="form-select" value={accountId} onChange={e => { setAccountId(e.target.value); cargarMovs(e.target.value); }}>
                                    <option value="">Seleccione…</option>
                                    {accounts.map(a => <option key={a.id} value={a.id}>{accLabel(a)}</option>)}
                                </select>
                            </div>
                            )}
                            <div className="col-md-5">
                                <label className="form-label">Movimiento del extracto (no conciliado)</label>
                                <select className="form-select" value={movId} onChange={e => { setMovId(e.target.value); setSug(null); }}>
                                    <option value="">Seleccione…</option>
                                    {movs.map(m => <option key={m.id} value={m.id}>#{m.id} · {m.fecha} · {formatPrice(m.monto)} · {m.descripcion || ''}</option>)}
                                </select>
                            </div>
                            <div className="col-md-2">
                                <button className="btn btn-primary w-100" onClick={sugerir}><i className="ri-search-line me-1"></i>Sugerir</button>
                            </div>
                        </div>

                        {sug && (
                            <div className="mt-2">
                                <div className="alert alert-info py-2 small d-flex justify-content-between align-items-center">
                                    <span><b>{sug.tipo === 'COBRO_CXC' ? 'Cobro (CxC)' : 'Pago (CxP)'}</b> · Monto {formatPrice(sug.monto)}{sug.nitDetectado ? ` · NIT detectado ${sug.nitDetectado}` : ''}</span>
                                    {sel.length >= 2 && <button className="btn btn-sm btn-success" onClick={aplicarMultiple}><i className="ri-links-line me-1"></i>Aplicar a {sel.length} facturas</button>}
                                </div>
                                <div className="table-responsive">
                                    <table className="table table-sm">
                                        <thead><tr><th></th><th>Factura</th><th>Fecha</th><th>Tercero</th><th>NIT</th><th className="text-end">Saldo</th><th className="text-end">Score</th><th>Acción</th></tr></thead>
                                        <tbody>
                                            {(sug.sugerencias || []).map(s => (
                                                <tr key={s.invoiceId}>
                                                    <td><input type="checkbox" className="form-check-input" checked={sel.includes(s.invoiceId)} onChange={() => toggleSel(s.invoiceId)} /></td>
                                                    <td className="small">{s.numero}</td>
                                                    <td className="small">{s.fecha}</td>
                                                    <td className="small">{s.tercero}</td>
                                                    <td className="small">{s.nit}{s.nitMatch && <i className="ri-check-line text-success ms-1"></i>}</td>
                                                    <td className="text-end small">{formatPrice(s.saldo)}</td>
                                                    <td className="text-end"><span className={`badge ${s.score >= 90 ? 'bg-label-success' : s.score >= 70 ? 'bg-label-warning' : 'bg-label-secondary'}`}>{s.score}</span></td>
                                                    <td><button className="btn btn-sm btn-icon btn-text-primary" title="Aplicar cruce" onClick={() => aplicar(s.invoiceId)}><i className="ri-check-double-line"></i></button></td>
                                                </tr>
                                            ))}
                                            {(!sug.sugerencias || sug.sugerencias.length === 0) && <tr><td colSpan="8" className="text-center text-muted py-3">No hay facturas pendientes coincidentes en la ventana ±15 días</td></tr>}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="col-12">
                <div className="card">
                    <h5 className="card-header d-flex justify-content-between align-items-center">
                        <span>Reporte de cumplimiento DIAN</span>
                        <span>
                            <input type="number" className="form-control form-control-sm d-inline-block me-2" style={{ width: 110 }} value={year} onChange={e => setYear(e.target.value)} />
                            <button className="btn btn-sm btn-label-secondary" onClick={cargarReporte}><i className="ri-bar-chart-2-line me-1"></i>Consultar</button>
                        </span>
                    </h5>
                    {rep && (
                        <div className="card-body">
                            <div className="row g-3">
                                <div className="col-md-6">
                                    <div className="card border"><div className="card-body py-3">
                                        <h6>Cuentas por Cobrar (ventas)</h6>
                                        <div className="d-flex gap-2 flex-wrap">
                                            <span className="badge bg-label-primary">Emitidas: {rep.cxc.emitidas}</span>
                                            <span className="badge bg-label-success">Cobradas: {rep.cxc.cobradas}</span>
                                            <span className="badge bg-label-warning">Pendientes: {rep.cxc.pendientes}</span>
                                            <span className="badge bg-label-danger">Anuladas: {rep.cxc.anuladas}</span>
                                        </div>
                                        <div className="small text-muted mt-2">Emitido {formatPrice(rep.cxc.totalEmitido)} · Cobrado {formatPrice(rep.cxc.totalCobrado)} · Pendiente {formatPrice(rep.cxc.totalPendiente)}</div>
                                    </div></div>
                                </div>
                                <div className="col-md-6">
                                    <div className="card border"><div className="card-body py-3">
                                        <h6>Cuentas por Pagar (compras)</h6>
                                        <div className="d-flex gap-2 flex-wrap">
                                            <span className="badge bg-label-primary">Emitidas: {rep.cxp.emitidas}</span>
                                            <span className="badge bg-label-success">Pagadas: {rep.cxp.pagadas}</span>
                                            <span className="badge bg-label-warning">Pendientes: {rep.cxp.pendientes}</span>
                                            <span className="badge bg-label-danger">Anuladas: {rep.cxp.anuladas}</span>
                                        </div>
                                    </div></div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CruceFacturaElectronica;
