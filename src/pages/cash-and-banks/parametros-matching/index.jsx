import { useState, useEffect } from 'react';
import { base_url } from '@/utils/functions';
import { fetchHelper } from '@/utils/fetch';

/**
 * BNK-HU-072: parámetros (tolerancias y umbrales) del motor de matching.
 * Sección global por defecto + override opcional por cuenta bancaria.
 */
const FIELDS = [
    ['toleranciaMontoAbs', 'Tolerancia monto absoluta ($)', 'number'],
    ['toleranciaMontoPct', 'Tolerancia monto (%)', 'number'],
    ['toleranciaFechaDias', 'Tolerancia fecha (días)', 'number'],
    ['umbralScoreAutoAprobar', 'Umbral auto-aprobar (0-100)', 'number'],
    ['umbralScoreSugerir', 'Umbral sugerir (0-100)', 'number'],
    ['pesoMonto', 'Peso monto', 'number'],
    ['pesoFecha', 'Peso fecha', 'number'],
    ['pesoTexto', 'Peso texto', 'number'],
    ['pesoReferencia', 'Peso referencia', 'number'],
];

const ParamForm = ({ value, onChange }) => {
    const sumaPesos = Number(value.pesoMonto || 0) + Number(value.pesoFecha || 0) + Number(value.pesoTexto || 0) + Number(value.pesoReferencia || 0);
    return (
        <>
            <div className="row g-3">
                {FIELDS.map(([k, label]) => (
                    <div className="col-md-4" key={k}>
                        <label className="form-label">{label}</label>
                        <input type="number" className="form-control" value={value[k] ?? ''} onChange={e => onChange(k, e.target.value)} />
                    </div>
                ))}
                <div className="col-md-4">
                    <label className="form-label d-block">Permitir matching N:M</label>
                    <div className="form-check form-switch mt-2">
                        <input className="form-check-input" type="checkbox" checked={!!value.permitirNaM} onChange={e => onChange('permitirNaM', e.target.checked)} />
                        <label className="form-check-label">{value.permitirNaM ? 'Sí' : 'No'}</label>
                    </div>
                </div>
            </div>
            <div className={`mt-2 small ${sumaPesos === 100 ? 'text-success' : 'text-danger'}`}>
                Suma de pesos: <strong>{sumaPesos}</strong> {sumaPesos === 100 ? '✓' : '(debe sumar 100)'}
            </div>
        </>
    );
};

const ParametrosMatching = () => {
    const [global, setGlobal] = useState({});
    const [accounts, setAccounts] = useState([]);
    const [accountId, setAccountId] = useState('');
    const [override, setOverride] = useState({});
    const [usaOverride, setUsaOverride] = useState(false);

    const loadGlobal = async () => {
        try {
            const res = await fetchHelper.get(base_url(['api', 'v1', 'banks', 'parametros-matching', 'global']), {}, 1, false, true);
            setGlobal(res || {});
        } catch (_) { /* */ }
    };

    useEffect(() => {
        loadGlobal();
        (async () => {
            try {
                const res = await fetchHelper.post(base_url(['api', 'v1', 'bank-accounts', 'search']),
                    { draw: 1, start: 0, length: 200, search: { value: '' } }, {}, 1, false, true);
                setAccounts(res?.data || []);
            } catch (_) { setAccounts([]); }
        })();
    }, []);

    const saveGlobal = async () => {
        try {
            const body = { ...global, cuentaBancariaId: null };
            await fetchHelper.post(base_url(['api', 'v1', 'banks', 'parametros-matching']), body, {}, 1000, true);
            window.Swal.fire({ icon: 'success', title: 'Parámetros globales guardados', timer: 1200, showConfirmButton: false });
            loadGlobal();
        } catch (_) { /* alert mostrado */ }
    };

    const onSelectAccount = async (e) => {
        const id = e.target.value;
        setAccountId(id);
        if (!id) { setOverride({}); setUsaOverride(false); return; }
        try {
            const res = await fetchHelper.get(base_url(['api', 'v1', 'banks', 'parametros-matching', 'comparative'], { bankAccountId: id }), {}, 1, false, true);
            setUsaOverride(!!res?.usaOverride);
            setOverride(res?.efectivo || res?.global || {});
        } catch (_) { setOverride({}); }
    };

    const saveOverride = async () => {
        if (!accountId) return;
        try {
            const body = { ...override, cuentaBancariaId: Number(accountId) };
            await fetchHelper.post(base_url(['api', 'v1', 'banks', 'parametros-matching']), body, {}, 1000, true);
            window.Swal.fire({ icon: 'success', title: 'Override de cuenta guardado', timer: 1200, showConfirmButton: false });
            onSelectAccount({ target: { value: accountId } });
        } catch (_) { /* alert mostrado */ }
    };

    const accLabel = (a) => `${a.accountNumber || a.account_number || ('#' + a.id)}${a.bankDTO?.name ? ' · ' + a.bankDTO.name : ''}`;

    return (
        <div className="card">
            <h5 className="card-header">Parámetros del motor de matching</h5>
            <div className="card-body">
                <h6 className="mb-3">Parámetros globales de la empresa</h6>
                <ParamForm value={global} onChange={(k, v) => setGlobal(g => ({ ...g, [k]: k === 'permitirNaM' ? v : v }))} />
                <button className="btn btn-primary mt-3" onClick={saveGlobal}><i className="ri-save-line me-1"></i>Guardar globales</button>

                <hr className="my-4" />

                <h6 className="mb-3">Override por cuenta bancaria</h6>
                <div className="row g-3 mb-3">
                    <div className="col-md-6">
                        <label className="form-label">Cuenta</label>
                        <select className="form-select" value={accountId} onChange={onSelectAccount}>
                            <option value="">Seleccione una cuenta...</option>
                            {accounts.map(a => <option key={a.id} value={a.id}>{accLabel(a)}</option>)}
                        </select>
                    </div>
                    <div className="col-md-6 d-flex align-items-end">
                        <span className={`badge ${usaOverride ? 'bg-label-info' : 'bg-label-secondary'}`}>
                            {accountId ? (usaOverride ? 'Esta cuenta usa override propio' : 'Esta cuenta hereda los globales') : 'Sin cuenta seleccionada'}
                        </span>
                    </div>
                </div>
                {accountId && (
                    <>
                        <ParamForm value={override} onChange={(k, v) => setOverride(o => ({ ...o, [k]: v }))} />
                        <button className="btn btn-primary mt-3" onClick={saveOverride}><i className="ri-save-line me-1"></i>Guardar override de cuenta</button>
                    </>
                )}
            </div>
        </div>
    );
};

export default ParametrosMatching;
