import { useState, useEffect } from 'react';
import { base_url, formatPrice } from '@/utils/functions';
import { fetchHelper } from '@/utils/fetch';

/**
 * BNK-HU-061: Gravamen a los Movimientos Financieros (GMF / 4x1000).
 * E3: validación cruzada del período (esperado 0.004 × Σ retiros gravados vs
 * cargado por el banco). E4: reporte por cuenta y período, exportable a Excel/CSV/PDF.
 */
const GmfPage = ({ embeddedAccountId } = {}) => {
    const [accounts, setAccounts] = useState([]);
    const [accountId, setAccountId] = useState(embeddedAccountId ? String(embeddedAccountId) : '');
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [rep, setRep] = useState(null);

    useEffect(() => {
        (async () => {
            try {
                const res = await fetchHelper.post(base_url(['api', 'v1', 'bank-accounts', 'search']),
                    { draw: 1, start: 0, length: 200, search: { value: '' } }, {}, 1, false, true);
                setAccounts(res?.data || []);
            } catch (_) { setAccounts([]); }
        })();
    }, []);

    const qs = () => {
        const p = [`bankAccountId=${accountId}`];
        if (from) p.push(`from=${from}`);
        if (to) p.push(`to=${to}`);
        return p.join('&');
    };

    const cargar = async () => {
        if (!accountId) return;
        try {
            const res = await fetchHelper.get(base_url(['api', 'v1', 'banks', 'gmf', 'reporte']) + '?' + qs(), {}, 1, false, true);
            setRep(res || null);
        } catch (_) { setRep(null); }
    };

    const onSelect = (e) => { setAccountId(e.target.value); setRep(null); };

    // Embebido en el panel de conciliación: cuenta fija de la URL, carga automática.
    useEffect(() => {
        if (embeddedAccountId) cargar();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [embeddedAccountId]);

    const descargar = async (format) => {
        try {
            const token = localStorage.getItem('token');
            const resp = await fetch(base_url(['api', 'v1', 'banks', 'gmf', 'reporte', 'export']) + '?' + qs() + `&format=${format}`,
                { headers: { Authorization: `Bearer ${token}` } });
            const blob = await resp.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = `gmf_cuenta_${accountId}.${format}`;
            document.body.appendChild(a); a.click(); a.remove();
            window.URL.revokeObjectURL(url);
        } catch (_) { window.Swal.fire({ icon: 'error', title: 'No se pudo descargar' }); }
    };

    const accLabel = (a) => `${a.accountNumber || a.account_number || ('#' + a.id)}${a.bankDTO?.name ? ' · ' + a.bankDTO.name : ''}`;

    return (
        <div className="card">
            <h5 className="card-header">GMF (4x1000) — validación y reporte</h5>
            <div className="card-body">
                <p className="text-muted small">Compara el GMF cargado por el banco contra el esperado (0.4% de los retiros gravados, excluyendo GMF, comisiones y transferencias internas). No bloquea el cierre.</p>
                <div className="row g-3 align-items-end mb-4">
                    {!embeddedAccountId && (
                    <div className="col-md-4">
                        <label className="form-label">Cuenta bancaria</label>
                        <select className="form-select" value={accountId} onChange={onSelect}>
                            <option value="">Seleccione una cuenta...</option>
                            {accounts.map(a => <option key={a.id} value={a.id}>{accLabel(a)}</option>)}
                        </select>
                    </div>
                    )}
                    <div className="col-md-3"><label className="form-label">Desde</label><input type="date" className="form-control" value={from} onChange={e => setFrom(e.target.value)} /></div>
                    <div className="col-md-3"><label className="form-label">Hasta</label><input type="date" className="form-control" value={to} onChange={e => setTo(e.target.value)} /></div>
                    <div className="col-md-2">
                        <button className="btn btn-primary w-100" disabled={!accountId} onClick={cargar}><i className="ri-calculator-line me-1"></i>Calcular</button>
                    </div>
                </div>

                {rep && (
                    <div id="gmf-reporte">
                        <div className="row g-3 mb-3">
                            <div className="col-md-3"><div className="card bg-label-secondary"><div className="card-body py-3"><small>Retiros gravados</small><h6 className="mb-0">{formatPrice(rep.retirosGravados)}</h6></div></div></div>
                            <div className="col-md-3"><div className="card bg-label-primary"><div className="card-body py-3"><small>GMF esperado (0.4%)</small><h6 className="mb-0">{formatPrice(rep.gmfEsperado)}</h6></div></div></div>
                            <div className="col-md-3"><div className="card bg-label-info"><div className="card-body py-3"><small>GMF cargado banco</small><h6 className="mb-0">{formatPrice(rep.gmfCargado)}</h6></div></div></div>
                            <div className="col-md-3"><div className={`card ${rep.inconsistente ? 'bg-label-danger' : 'bg-label-success'}`}><div className="card-body py-3"><small>Diferencia</small><h6 className="mb-0">{formatPrice(rep.diferenciaAbsoluta)} ({rep.diferenciaPorcentual}%)</h6></div></div></div>
                        </div>
                        <div className={`alert ${rep.inconsistente ? 'alert-danger' : 'alert-success'}`}>{rep.mensaje}</div>

                        <div className="d-flex justify-content-between align-items-center mb-2">
                            <h6 className="mb-0">Movimientos GMF detectados ({rep.totalMovimientosGmf})</h6>
                            <div>
                                <button className="btn btn-sm btn-label-success me-1" onClick={() => descargar('xlsx')}><i className="ri-file-excel-2-line me-1"></i>Excel</button>
                                <button className="btn btn-sm btn-label-secondary me-1" onClick={() => descargar('csv')}><i className="ri-file-text-line me-1"></i>CSV</button>
                                <button className="btn btn-sm btn-label-danger" onClick={() => window.print()}><i className="ri-printer-line me-1"></i>PDF</button>
                            </div>
                        </div>
                        <div className="table-responsive">
                            <table className="table table-sm">
                                <thead><tr><th>Fecha</th><th>Descripción</th><th className="text-end">Monto GMF</th></tr></thead>
                                <tbody>
                                    {(rep.movimientosGmf || []).map((m, i) => (
                                        <tr key={i}><td className="small">{m.fecha}</td><td className="small">{m.descripcion}</td><td className="text-end small">{formatPrice(m.monto)}</td></tr>
                                    ))}
                                    {(rep.movimientosGmf || []).length === 0 && <tr><td colSpan="3" className="text-center text-muted py-3">Sin movimientos GMF en el período</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default GmfPage;
