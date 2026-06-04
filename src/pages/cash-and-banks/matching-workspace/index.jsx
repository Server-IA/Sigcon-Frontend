import { useState, useEffect, useMemo } from 'react';
import { base_url, formatPrice } from '@/utils/functions';
import { fetchHelper } from '@/utils/fetch';

/**
 * BNK-HU-069 + BNK-HU-070: workspace de conciliación bancaria.
 * - Ejecuta el motor de matching en 5 fases (HU-069) y muestra el resumen.
 * - Lista los emparejamientos por estado (Confirmados / Sugerencias / Ambiguos) con
 *   acciones confirmar / deshacer.
 * - Permite emparejamiento manual N:1 / 1:N / N:M (HU-070) con selección múltiple,
 *   sumas y diferencia en tiempo real, y motivo obligatorio cuando aplica.
 */
const abs = (n) => Math.abs(Number(n || 0));

const estadoBadge = (estado) => {
    if (estado === 'CONFIRMADO') return 'bg-label-success';
    if (estado === 'PROPUESTO') return 'bg-label-warning';
    if (estado === 'AMBIGUO') return 'bg-label-danger';
    return 'bg-label-secondary';
};

const MatchingWorkspace = () => {
    const [accounts, setAccounts] = useState([]);
    const [accountId, setAccountId] = useState('');
    const [ws, setWs] = useState({ extracto: [], libros: [], emparejamientos: [] });
    const [summary, setSummary] = useState(null);
    const [selExt, setSelExt] = useState([]);
    const [selLib, setSelLib] = useState([]);
    const [motivo, setMotivo] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                const res = await fetchHelper.post(base_url(['api', 'v1', 'bank-accounts', 'search']),
                    { draw: 1, start: 0, length: 200, search: { value: '' } }, {}, 1, false, true);
                setAccounts(res?.data || []);
            } catch (_) { setAccounts([]); }
        })();
    }, []);

    const loadWorkspace = async (id) => {
        if (!id) return;
        try {
            const res = await fetchHelper.get(base_url(['api', 'v1', 'banks', 'emparejamientos', 'workspace', id]), {}, 1, false, true);
            setWs({ extracto: res?.extracto || [], libros: res?.libros || [], emparejamientos: res?.emparejamientos || [] });
            setSelExt([]); setSelLib([]); setMotivo('');
        } catch (_) { setWs({ extracto: [], libros: [], emparejamientos: [] }); }
    };

    const onSelectAccount = (e) => {
        const id = e.target.value;
        setAccountId(id);
        setSummary(null);
        loadWorkspace(id);
    };

    const runEngine = async () => {
        if (!accountId) return;
        setLoading(true);
        try {
            const res = await fetchHelper.post(base_url(['api', 'v1', 'banks', 'matching', 'ejecutar', accountId]), {}, {}, 1000, true);
            setSummary(res);
            await loadWorkspace(accountId);
        } catch (_) { /* alert ya mostrado */ } finally { setLoading(false); }
    };

    const confirmar = async (empId) => {
        try {
            await fetchHelper.post(base_url(['api', 'v1', 'banks', 'emparejamientos', empId, 'confirmar']), {}, {}, 1000, true);
            await loadWorkspace(accountId);
        } catch (_) { /* */ }
    };

    const deshacer = async (empId) => {
        const r = await window.Swal.fire({
            title: '¿Deshacer emparejamiento?',
            text: 'Se liberarán los movimientos involucrados.',
            icon: 'warning', showCancelButton: true,
            confirmButtonText: 'Sí, deshacer', cancelButtonText: 'Cancelar',
            customClass: { confirmButton: 'btn btn-danger me-2', cancelButton: 'btn btn-label-secondary' }, buttonsStyling: false
        });
        if (!r.isConfirmed) return;
        try {
            await fetchHelper.delete(base_url(['api', 'v1', 'banks', 'emparejamientos', empId]), {}, {}, 1000, true);
            await loadWorkspace(accountId);
        } catch (_) { /* */ }
    };

    const toggle = (list, setList, id) =>
        setList(list.includes(id) ? list.filter(x => x !== id) : [...list, id]);

    // HU-070 E1: sumas y diferencia en tiempo real.
    const sums = useMemo(() => {
        const sExt = ws.extracto.filter(m => selExt.includes(m.id)).reduce((a, m) => a + abs(m.monto), 0);
        const sLib = ws.libros.filter(m => selLib.includes(m.id)).reduce((a, m) => a + abs(m.monto), 0);
        return { sExt, sLib, dif: Math.abs(sExt - sLib) };
    }, [ws, selExt, selLib]);

    const requiereMotivo = (selExt.length > 1 && selLib.length > 1) || sums.dif > 0;

    const emparejar = async () => {
        if (!selExt.length || !selLib.length) {
            window.Swal.fire({ icon: 'info', title: 'Selección incompleta', text: 'Seleccione al menos un movimiento de cada lado.' });
            return;
        }
        // QA BNK (2026-06-03) BNK-RF-35/45: cuando se requiere motivo (N:M o
        // diferencia tolerada > 0) debe tener min 30 / max 500 + clase de caracteres.
        if (requiereMotivo) {
            const m = (motivo || '').trim();
            if (m.length < 30) { window.Swal.fire({ icon: 'warning', title: 'Motivo requerido', text: 'El motivo debe tener al menos 30 caracteres.' }); return; }
            if (m.length > 500) { window.Swal.fire({ icon: 'warning', title: 'Motivo muy largo', text: 'El motivo no puede superar los 500 caracteres.' }); return; }
            if (!/^[\p{L}0-9 .,;_-]+$/u.test(m)) { window.Swal.fire({ icon: 'warning', title: 'Motivo inválido', text: 'El motivo contiene caracteres no válidos.' }); return; }
        }
        try {
            await fetchHelper.post(base_url(['api', 'v1', 'banks', 'emparejamientos']),
                { bankAccountId: Number(accountId), extractoIds: selExt, librosIds: selLib, motivo }, {}, 1000, true);
            await loadWorkspace(accountId);
        } catch (_) { /* alert mostrado */ }
    };

    const accLabel = (a) => `${a.accountNumber || a.account_number || ('#' + a.id)}${a.bankDTO?.name ? ' · ' + a.bankDTO.name : ''}`;

    return (
        <div className="card">
            <h5 className="card-header">Conciliación bancaria — Workspace de matching</h5>
            <div className="card-body">
                {/* Selector + ejecutar */}
                <div className="row g-3 align-items-end mb-4">
                    <div className="col-md-5">
                        <label className="form-label">Cuenta bancaria</label>
                        <select className="form-select" value={accountId} onChange={onSelectAccount}>
                            <option value="">Seleccione una cuenta...</option>
                            {accounts.map(a => <option key={a.id} value={a.id}>{accLabel(a)}</option>)}
                        </select>
                    </div>
                    <div className="col-md-7">
                        <button className="btn btn-primary me-2" disabled={!accountId || loading} onClick={runEngine}>
                            <i className="ri-flashlight-line me-1"></i>{loading ? 'Ejecutando...' : 'Ejecutar matching'}
                        </button>
                        <button className="btn btn-label-secondary" disabled={!accountId} onClick={() => loadWorkspace(accountId)}>
                            <i className="ri-refresh-line me-1"></i>Refrescar
                        </button>
                    </div>
                </div>

                {/* Resumen de la corrida (HU-069 E10) */}
                {summary && (
                    <div className="alert alert-info mb-4">
                        <h6 className="alert-heading mb-2">Resultado del motor ({summary.tiempoSegundos}s)</h6>
                        <div className="d-flex flex-wrap gap-2">
                            <span className="badge bg-label-secondary">Extracto: {summary.totalExtracto}</span>
                            <span className="badge bg-label-secondary">Libros: {summary.totalLibros}</span>
                            <span className="badge bg-label-success">Conciliados auto: {summary.conciliadosAutomaticamente}</span>
                            <span className="badge bg-label-warning">Sugeridos: {summary.sugeridos}</span>
                            <span className="badge bg-label-danger">Ambiguos: {summary.ambiguos}</span>
                            <span className="badge bg-label-dark">Sin match (extracto): {summary.sinMatchExtracto}</span>
                            <span className="badge bg-label-dark">Libros sin pareja: {summary.librosSinPareja}</span>
                        </div>
                    </div>
                )}

                {/* Emparejamientos */}
                <h6 className="mb-2">Emparejamientos</h6>
                {ws.emparejamientos.length === 0 && <p className="text-muted">Sin emparejamientos. Ejecute el motor o empareje manualmente.</p>}
                <div className="row g-3 mb-4">
                    {ws.emparejamientos.map(e => (
                        <div className="col-md-6" key={e.id}>
                            <div className="card border h-100">
                                <div className="card-body py-3">
                                    <div className="d-flex justify-content-between align-items-center mb-2">
                                        <div>
                                            <span className={`badge ${estadoBadge(e.estado)} me-1`}>{e.estado}</span>
                                            <span className="badge bg-label-info me-1">{e.tipo}</span>
                                            <span className="badge bg-label-primary">{e.metodo} · score {e.score}</span>
                                        </div>
                                        <div>
                                            {e.estado !== 'CONFIRMADO' &&
                                                <button className="btn btn-sm btn-success me-1" title="Confirmar" onClick={() => confirmar(e.id)}><i className="ri-check-line"></i></button>}
                                            <button className="btn btn-sm btn-outline-danger" title="Deshacer" onClick={() => deshacer(e.id)}><i className="ri-close-line"></i></button>
                                        </div>
                                    </div>
                                    <div className="small">
                                        <div><strong>Extracto</strong> ({formatPrice(e.sumaExtracto)}): {(e.extracto || []).map(x => `#${x.financialMovementId} ${formatPrice(x.monto)}`).join(', ')}</div>
                                        <div><strong>Libros</strong> ({formatPrice(e.sumaLibros)}): {(e.libros || []).map(x => `#${x.financialMovementId} ${formatPrice(x.monto)}`).join(', ')}</div>
                                        <div>Diferencia: {formatPrice(e.diferencia)}{e.motivo ? ` · Motivo: ${e.motivo}` : ''}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Emparejamiento manual (HU-070) */}
                <h6 className="mb-2">Emparejamiento manual (selección múltiple)</h6>
                <div className="row g-3">
                    <div className="col-md-6">
                        <div className="card border">
                            <div className="card-header py-2"><strong>Extracto libre</strong> ({ws.extracto.length})</div>
                            <div className="card-body p-0" style={{ maxHeight: 280, overflowY: 'auto' }}>
                                <table className="table table-sm mb-0">
                                    <tbody>
                                        {ws.extracto.map(m => (
                                            <tr key={m.id} className={selExt.includes(m.id) ? 'table-active' : ''}>
                                                <td style={{ width: 32 }}><input type="checkbox" className="form-check-input" checked={selExt.includes(m.id)} onChange={() => toggle(selExt, setSelExt, m.id)} /></td>
                                                <td className="small">{m.fecha}<br /><span className="text-muted">{m.descripcion}</span></td>
                                                <td className="text-end small">{formatPrice(m.monto)}</td>
                                            </tr>
                                        ))}
                                        {ws.extracto.length === 0 && <tr><td colSpan="3" className="text-center text-muted py-3">Sin movimientos libres</td></tr>}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                    <div className="col-md-6">
                        <div className="card border">
                            <div className="card-header py-2"><strong>Libros libre</strong> ({ws.libros.length})</div>
                            <div className="card-body p-0" style={{ maxHeight: 280, overflowY: 'auto' }}>
                                <table className="table table-sm mb-0">
                                    <tbody>
                                        {ws.libros.map(m => (
                                            <tr key={m.id} className={selLib.includes(m.id) ? 'table-active' : ''}>
                                                <td style={{ width: 32 }}><input type="checkbox" className="form-check-input" checked={selLib.includes(m.id)} onChange={() => toggle(selLib, setSelLib, m.id)} /></td>
                                                <td className="small">{m.fecha}<br /><span className="text-muted">{m.descripcion}</span></td>
                                                <td className="text-end small">{formatPrice(m.monto)}</td>
                                            </tr>
                                        ))}
                                        {ws.libros.length === 0 && <tr><td colSpan="3" className="text-center text-muted py-3">Sin movimientos libres</td></tr>}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Cabecera en tiempo real (HU-070 E1) */}
                <div className="alert alert-secondary mt-3 mb-2">
                    Seleccionados: <strong>{selLib.length}</strong> en libros, <strong>{selExt.length}</strong> en extracto.
                    &nbsp;Suma libros: <strong>{formatPrice(sums.sLib)}</strong> · Suma extracto: <strong>{formatPrice(sums.sExt)}</strong> ·
                    Diferencia: <strong className={sums.dif > 0 ? 'text-danger' : 'text-success'}>{formatPrice(sums.dif)}</strong>
                </div>
                {requiereMotivo && (
                    <div className="mb-2">
                        <label className="form-label">Motivo de la agrupación {sums.dif > 0 ? '(diferencia tolerada)' : '(N:M)'} — mínimo 30 caracteres</label>
                        <textarea className="form-control" rows="3" maxLength={500} value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Explique la agrupación / la diferencia (entre 30 y 500 caracteres)..."></textarea>
                    </div>
                )}
                <button className="btn btn-primary" disabled={!accountId || !selExt.length || !selLib.length} onClick={emparejar}>
                    <i className="ri-links-line me-1"></i>Emparejar seleccionados
                </button>
            </div>
        </div>
    );
};

export default MatchingWorkspace;
