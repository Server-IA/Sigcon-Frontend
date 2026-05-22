import { useState, useEffect } from 'react';
import { base_url, formatPrice } from '@/utils/functions';
import { fetchHelper } from '@/utils/fetch';

/**
 * BNK-HU-073: partidas conciliatorias (movimientos del extracto sin contrapartida
 * en libros). Permite detectarlas (E1 vía pre-procesamiento), revisarlas y generar
 * el comprobante de ajuste en BORRADOR — individual con override de cuentas (E2)
 * o en lote (E6). Al generar, la partida pasa a RESUELTA_AJUSTE (E8).
 */
const estadoBadge = (e) => e === 'RESUELTA_AJUSTE' ? 'bg-label-success' : (e === 'DESCARTADA' ? 'bg-label-secondary' : 'bg-label-warning');

const PartidasConciliatorias = ({ embeddedAccountId } = {}) => {
    const [accounts, setAccounts] = useState([]);
    const [accountId, setAccountId] = useState(embeddedAccountId ? String(embeddedAccountId) : '');
    const [partidas, setPartidas] = useState([]);
    const [pucOptions, setPucOptions] = useState([]);
    const [sel, setSel] = useState({});      // {financialMovementId: true}
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                const res = await fetchHelper.post(base_url(['api', 'v1', 'bank-accounts', 'search']),
                    { draw: 1, start: 0, length: 200, search: { value: '' } }, {}, 1, false, true);
                setAccounts(res?.data || []);
            } catch (_) { setAccounts([]); }
            try {
                // El endpoint pagina de a 10 (ignora length); recorremos las páginas
                // hasta recordsTotal para tener TODO el catálogo de cuentas operativas.
                let all = [], start = 0, total = Infinity;
                for (let i = 0; i < 50 && start < total; i++) {
                    const res = await fetchHelper.post(base_url(['api', 'v1', 'accounting-accounts']),
                        { dtRequest: { draw: 1, start, length: 50, search: { value: '' } }, filters: {} }, {}, 0, false, true);
                    const rows = res?.data || [];
                    total = res?.recordsTotal ?? rows.length;
                    all = all.concat(rows);
                    if (!rows.length) break;
                    start += rows.length;
                }
                setPucOptions(all.map(r => ({ code: r.pucAccount?.code, name: r.pucAccount?.name || r.customName })).filter(o => o.code));
            } catch (_) { setPucOptions([]); }
        })();
    }, []);

    const load = async (id) => {
        if (!id) { setPartidas([]); return; }
        try {
            const res = await fetchHelper.get(base_url(['api', 'v1', 'banks', 'ajustes', 'partidas', id]), {}, 0, false, true);
            setPartidas(Array.isArray(res) ? res : (res?.data || []));
        } catch (_) { setPartidas([]); }
        setSel({});
    };

    const onSelect = (e) => { setAccountId(e.target.value); load(e.target.value); };

    // Embebido: cuenta fija de la URL, carga automática.
    useEffect(() => {
        if (embeddedAccountId) load(String(embeddedAccountId));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [embeddedAccountId]);

    const detectar = async () => {
        if (!accountId) return;
        setLoading(true);
        try {
            const res = await fetchHelper.post(base_url(['api', 'v1', 'banks', 'ajustes', 'partidas', accountId, 'detectar']), {}, {}, 0, true);
            const alertas = res?.alertasGmfExento || [];
            await load(accountId);
            window.Swal.fire({
                icon: alertas.length ? 'warning' : 'success',
                title: 'Detección de partidas',
                html: `Partidas nuevas marcadas: <b>${res?.partidasCreadas ?? 0}</b>`
                    + (alertas.length ? `<br/><br/><b>Alertas GMF (cuenta exenta):</b><br/>${alertas.map(a => `<small>${a}</small>`).join('<br/>')}` : '')
            });
        } catch (_) { /* */ } finally { setLoading(false); }
    };

    const optsHtml = (selected) => {
        // Garantiza que la cuenta sugerida quede preseleccionada aunque no esté en
        // el catálogo cargado (ej. nota con cuenta sugerida manual).
        const has = pucOptions.some(o => o.code === selected);
        const extra = (selected && !has) ? `<option value="${selected}" selected>${selected} (sugerida)</option>` : '';
        return extra + pucOptions.map(o =>
            `<option value="${o.code}" ${o.code === selected ? 'selected' : ''}>${o.code} - ${o.name}</option>`).join('');
    };

    const generar = async (p) => {
        const { value: form } = await window.Swal.fire({
            title: `Generar ajuste #${p.financialMovementId}`,
            html: `<div class="text-start small mb-2">${p.tipo} · ${formatPrice(p.monto)}</div>`
                + `<label class="form-label small mt-1">Cuenta débito</label>`
                + `<select id="sw-db" class="form-select form-select-sm">${optsHtml(p.cuentaDebitoSugerida)}</select>`
                + `<label class="form-label small mt-2">Cuenta crédito</label>`
                + `<select id="sw-cr" class="form-select form-select-sm">${optsHtml(p.cuentaCreditoSugerida)}</select>`
                + `<div class="text-muted small mt-2">El comprobante se crea en BORRADOR; debe aprobarlo en Contabilidad General.</div>`,
            focusConfirm: false, showCancelButton: true, confirmButtonText: 'Generar', cancelButtonText: 'Cancelar',
            preConfirm: () => ({
                cuentaDebitoOverride: document.getElementById('sw-db').value,
                cuentaCreditoOverride: document.getElementById('sw-cr').value
            })
        });
        if (!form) return;
        try {
            const res = await fetchHelper.post(base_url(['api', 'v1', 'banks', 'ajustes', 'generar']),
                { financialMovementId: p.financialMovementId, ...form }, {}, 0, true);
            await load(accountId);
            window.Swal.fire({ icon: 'success', title: 'Comprobante de ajuste generado (BORRADOR)', html: `Comprobante: <b>${res?.voucherCode || ('#' + res?.comprobanteId)}</b><br/>Estado: <b>BORRADOR</b>` });
        } catch (_) { /* alert mostrado */ }
    };

    const generarLote = async () => {
        const ids = Object.keys(sel).filter(k => sel[k]).map(Number);
        if (!ids.length) { window.Swal.fire({ icon: 'info', title: 'Seleccione al menos una partida' }); return; }
        const { value: modo } = await window.Swal.fire({
            title: `Generar ajustes en lote (${ids.length})`,
            input: 'radio',
            inputOptions: { UNICO: 'Un solo comprobante con N líneas', INDIVIDUAL: 'Un comprobante por cada partida' },
            inputValue: 'UNICO', showCancelButton: true, confirmButtonText: 'Generar', cancelButtonText: 'Cancelar',
            inputValidator: (v) => !v && 'Elija una opción'
        });
        if (!modo) return;
        try {
            const res = await fetchHelper.post(base_url(['api', 'v1', 'banks', 'ajustes', 'generar-lote']),
                { bankAccountId: Number(accountId), financialMovementIds: ids, modo }, {}, 0, true);
            await load(accountId);
            const n = res?.comprobantesCreados ?? res?.movimientosConciliados ?? ids.length;
            window.Swal.fire({ icon: 'success', title: 'Ajustes generados', html: `Modo: <b>${res?.modo}</b><br/>Movimientos conciliados: <b>${n}</b>${res?.comprobanteId ? `<br/>Comprobante: <b>${res.voucherCode || ('#' + res.comprobanteId)}</b>` : ''}` });
        } catch (_) { /* */ }
    };

    const accLabel = (a) => `${a.accountNumber || a.account_number || ('#' + a.id)}${a.bankDTO?.name ? ' · ' + a.bankDTO.name : ''}`;
    const pendientes = partidas.filter(p => p.estado === 'PENDIENTE');

    return (
        <div className="card">
            <h5 className="card-header d-flex justify-content-between align-items-center">
                <span>Partidas conciliatorias</span>
                <button className="btn btn-sm btn-primary" disabled={!accountId || pendientes.filter(p => sel[p.financialMovementId]).length === 0} onClick={generarLote}>
                    <i className="ri-stack-line me-1"></i>Generar en lote
                </button>
            </h5>
            <div className="card-body">
                <p className="text-muted small">Movimientos del extracto que el banco cargó/abonó y no están en libros (GMF, comisiones, intereses, notas). Genere el asiento de ajuste; queda en <b>BORRADOR</b> para aprobación del contador.</p>
                <div className="row g-3 align-items-end mb-4">
                    {!embeddedAccountId && (
                    <div className="col-md-5">
                        <label className="form-label">Cuenta bancaria</label>
                        <select className="form-select" value={accountId} onChange={onSelect}>
                            <option value="">Seleccione una cuenta...</option>
                            {accounts.map(a => <option key={a.id} value={a.id}>{accLabel(a)}</option>)}
                        </select>
                    </div>
                    )}
                    <div className="col-md-7">
                        <button className="btn btn-label-secondary me-2" disabled={!accountId || loading} onClick={detectar}>
                            <i className="ri-search-eye-line me-1"></i>{loading ? 'Detectando...' : 'Detectar partidas'}
                        </button>
                        <button className="btn btn-label-secondary" disabled={!accountId} onClick={() => load(accountId)}><i className="ri-refresh-line me-1"></i>Refrescar</button>
                    </div>
                </div>

                <div className="table-responsive">
                    <table className="table table-sm">
                        <thead><tr><th></th><th>Fecha</th><th>Tipo mov.</th><th>Partida</th><th className="text-end">Monto</th><th>DB sugerida</th><th>CR sugerida</th><th>Estado</th><th>Comprobante</th><th>Acción</th></tr></thead>
                        <tbody>
                            {partidas.map(p => (
                                <tr key={p.id}>
                                    <td>{p.estado === 'PENDIENTE' && <input type="checkbox" className="form-check-input" checked={!!sel[p.financialMovementId]} onChange={e => setSel(s => ({ ...s, [p.financialMovementId]: e.target.checked }))} />}</td>
                                    <td className="small">{p.fecha}</td>
                                    <td className="small">{p.tipoMovimiento || '-'}</td>
                                    <td className="small text-muted">{p.tipo}</td>
                                    <td className="text-end small">{formatPrice(p.monto)}</td>
                                    <td className="small">{p.cuentaDebitoSugerida || '-'}</td>
                                    <td className="small">{p.cuentaCreditoSugerida || '-'}</td>
                                    <td><span className={`badge ${estadoBadge(p.estado)}`}>{p.estado}</span></td>
                                    <td className="small">{p.comprobanteAjusteId ? '#' + p.comprobanteAjusteId : '-'}</td>
                                    <td>{p.estado === 'PENDIENTE' && <button className="btn btn-sm btn-icon btn-text-primary" title="Generar asiento de ajuste" onClick={() => generar(p)}><i className="ri-magic-line"></i></button>}</td>
                                </tr>
                            ))}
                            {partidas.length === 0 && <tr><td colSpan="10" className="text-center text-muted py-3">Seleccione una cuenta y presione "Detectar partidas"</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default PartidasConciliatorias;
