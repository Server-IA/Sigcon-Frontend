import { useState, useEffect } from 'react';
import { base_url, formatPrice } from '@/utils/functions';
import { fetchHelper } from '@/utils/fetch';

/**
 * BNK-HU-068: pre-procesamiento de movimientos del extracto.
 * Ejecuta normalización/extracción/clasificación por reglas (E1) y permite ver
 * el resultado (normalizada, tipo, confianza, cuenta PUC sugerida) y corregir
 * manualmente la clasificación (E8/E10).
 */
const confBadge = (c) => {
    if (c == null) return 'bg-label-secondary';
    if (c >= 100) return 'bg-label-primary';
    if (c >= 90) return 'bg-label-success';
    return 'bg-label-warning';
};

const Preprocesamiento = () => {
    const [accounts, setAccounts] = useState([]);
    const [accountId, setAccountId] = useState('');
    const [movs, setMovs] = useState([]);
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

    const load = async (id) => {
        if (!id) { setMovs([]); return; }
        try {
            // time=0 (silencioso): evita pisar el Swal de resultado/confirmación.
            const res = await fetchHelper.get(base_url(['api', 'v1', 'banks', 'preprocesamiento', 'cuenta', id, 'movimientos']), {}, 0, false, true);
            setMovs(Array.isArray(res) ? res : (res?.data || []));
        } catch (_) { setMovs([]); }
    };

    const onSelect = (e) => { setAccountId(e.target.value); load(e.target.value); };

    const preprocesar = async () => {
        if (!accountId) return;
        setLoading(true);
        try {
            const res = await fetchHelper.post(base_url(['api', 'v1', 'banks', 'preprocesamiento', 'cuenta', accountId]), {}, {}, 1000, true);
            window.Swal.fire({ icon: 'success', title: 'Pre-procesamiento ejecutado', html: `Procesados: <b>${res.procesados}</b><br/>Clasificados (≥90): <b>${res.clasificados}</b><br/>Baja confianza: <b>${res.bajaConfianza}</b>` });
            await load(accountId);
        } catch (_) { /* alert mostrado */ } finally { setLoading(false); }
    };

    const corregir = async (m) => {
        const { value: form } = await window.Swal.fire({
            title: `Corregir clasificación #${m.id}`,
            html: `<input id="sw-tipo" class="swal2-input" placeholder="Tipo de movimiento" value="${m.tipoMovimiento || ''}">`
                + `<input id="sw-cuenta" class="swal2-input" placeholder="Cuenta PUC sugerida" value="${m.cuentaPucSugerida || ''}">`,
            focusConfirm: false, showCancelButton: true, confirmButtonText: 'Guardar', cancelButtonText: 'Cancelar',
            preConfirm: () => ({ tipoMovimiento: document.getElementById('sw-tipo').value, cuentaPucSugerida: document.getElementById('sw-cuenta').value })
        });
        if (!form) return;
        try {
            await fetchHelper.put(base_url(['api', 'v1', 'banks', 'preprocesamiento', 'movimiento', m.id, 'clasificacion']), form, {}, 1000, true);
            window.Swal.fire({ icon: 'success', title: 'Clasificación corregida (confianza 100)', timer: 1200, showConfirmButton: false });
            await load(accountId);
        } catch (_) { /* */ }
    };

    const accLabel = (a) => `${a.accountNumber || a.account_number || ('#' + a.id)}${a.bankDTO?.name ? ' · ' + a.bankDTO.name : ''}`;

    return (
        <div className="card">
            <h5 className="card-header">Pre-procesamiento de movimientos</h5>
            <div className="card-body">
                <div className="row g-3 align-items-end mb-4">
                    <div className="col-md-5">
                        <label className="form-label">Cuenta bancaria</label>
                        <select className="form-select" value={accountId} onChange={onSelect}>
                            <option value="">Seleccione una cuenta...</option>
                            {accounts.map(a => <option key={a.id} value={a.id}>{accLabel(a)}</option>)}
                        </select>
                    </div>
                    <div className="col-md-7">
                        <button className="btn btn-primary me-2" disabled={!accountId || loading} onClick={preprocesar}>
                            <i className="ri-magic-line me-1"></i>{loading ? 'Procesando...' : 'Pre-procesar cuenta'}
                        </button>
                        <button className="btn btn-label-secondary" disabled={!accountId} onClick={() => load(accountId)}><i className="ri-refresh-line me-1"></i>Refrescar</button>
                    </div>
                </div>

                <div className="table-responsive">
                    <table className="table table-sm">
                        <thead><tr><th>Fecha</th><th>Descripción</th><th>Normalizada</th><th className="text-end">Monto</th><th>Cheque</th><th>NIT</th><th>Tipo</th><th>Confianza</th><th>PUC</th><th>Acción</th></tr></thead>
                        <tbody>
                            {movs.map(m => (
                                <tr key={m.id}>
                                    <td className="small">{m.fecha}</td>
                                    <td className="small">{m.descripcion}</td>
                                    <td className="small text-muted">{m.descripcionNormalizada || '-'}</td>
                                    <td className="text-end small">{formatPrice(m.monto)}</td>
                                    <td className="small">{m.numeroCheque || '-'}</td>
                                    <td className="small">{m.nitDetectado || '-'}</td>
                                    <td className="small">{m.tipoMovimiento || '-'}</td>
                                    <td><span className={`badge ${confBadge(m.clasificacionConfianza)}`}>{m.clasificacionConfianza ?? '-'}</span></td>
                                    <td className="small">{m.cuentaPucSugerida || '-'}</td>
                                    <td><button className="btn btn-sm btn-icon btn-text-secondary" title="Corregir clasificación" onClick={() => corregir(m)}><i className="ri-edit-line"></i></button></td>
                                </tr>
                            ))}
                            {movs.length === 0 && <tr><td colSpan="10" className="text-center text-muted py-3">Seleccione una cuenta con movimientos</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Preprocesamiento;
