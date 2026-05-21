import { useState, useEffect } from 'react';
import { base_url, formatPrice } from '@/utils/functions';
import { fetchHelper } from '@/utils/fetch';

/**
 * BNK-HU-076: gestión de la TRM (Tasa Representativa del Mercado).
 * - E1: carga manual de TRM por moneda/fecha + carry-forward (stand-in del fetch oficial).
 * - E8: política de TRM por empresa (TRM del día del movimiento o de cierre).
 * El fetch automático al servicio de la Superintendencia Financiera es infraestructura
 * externa (diferido); el contador carga la TRM manualmente y el sistema arrastra la
 * última publicada si falta el dato del día.
 */
const TrmHistorica = () => {
    const [monedas, setMonedas] = useState([]);
    const [iso, setIso] = useState('');
    const [historica, setHistorica] = useState([]);
    const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
    const [valor, setValor] = useState('');
    const [politica, setPolitica] = useState('FECHA_MOVIMIENTO');

    const tUrl = (...p) => base_url(['api', 'v1', 'banks', 'trm', ...p]);

    useEffect(() => {
        (async () => {
            try {
                const m = await fetchHelper.get(tUrl('monedas-soportadas'), {}, 0, false, true);
                setMonedas(m || []);
                if ((m || []).length) setIso(m[0].isoCode);
            } catch (_) { setMonedas([]); }
            try {
                const c = await fetchHelper.get(tUrl('config'), {}, 0, false, true);
                setPolitica(c?.politicaTrm || 'FECHA_MOVIMIENTO');
            } catch (_) { /* */ }
        })();
    }, []);

    useEffect(() => { if (iso) cargarHistorica(iso); }, [iso]);

    const cargarHistorica = async (m = iso) => {
        if (!m) return;
        try {
            const h = await fetchHelper.get(tUrl('historica') + `?currencyIso=${m}`, {}, 0, false, true);
            setHistorica(h || []);
        } catch (_) { setHistorica([]); }
    };

    const registrar = async () => {
        if (!iso) { window.Swal.fire({ icon: 'warning', title: 'Seleccione una moneda' }); return; }
        if (!valor || Number(valor) <= 0) { window.Swal.fire({ icon: 'warning', title: 'Indique el valor de la TRM (mayor a cero)' }); return; }
        try {
            await fetchHelper.post(tUrl('registrar'), { currencyIso: iso, fecha, valorCop: Number(valor), fuente: 'MANUAL' }, {}, 0, true);
            setValor('');
            await cargarHistorica();
            window.Swal.fire({ icon: 'success', title: 'TRM registrada', timer: 1200, showConfirmButton: false });
        } catch (_) { /* fetchHelper ya muestra el error */ }
    };

    const guardarPolitica = async () => {
        try {
            await fetchHelper.put(tUrl('config'), { politicaTrm: politica }, {}, 0, true);
            window.Swal.fire({ icon: 'success', title: 'Política actualizada', timer: 1200, showConfirmButton: false });
        } catch (_) { /* */ }
    };

    const carryForward = async () => {
        try {
            const r = await fetchHelper.post(tUrl('carry-forward'), {}, {}, 0, true);
            const arr = r?.arrastradas || [];
            window.Swal.fire({
                icon: 'info', title: 'Carry-forward ejecutado',
                html: arr.length
                    ? `Se arrastró la última TRM publicada para:<br/><b>${arr.join('<br/>')}</b>`
                    : 'Todas las monedas ya tienen TRM del día (nada que arrastrar).'
            });
            await cargarHistorica();
        } catch (_) { /* */ }
    };

    return (
        <div className="row g-3">
            <div className="col-lg-5">
                <div className="card">
                    <h5 className="card-header">Cargar TRM (manual)</h5>
                    <div className="card-body">
                        <div className="alert alert-info py-2 small">
                            <i className="ri-information-line me-1"></i>
                            La TRM oficial la publica la Superintendencia Financiera. El fetch automático es infraestructura externa (pendiente);
                            por ahora se carga manualmente y el sistema arrastra la última publicada si falta el dato del día.
                        </div>
                        <div className="mb-3">
                            <label className="form-label">Moneda</label>
                            <select className="form-select" value={iso} onChange={e => setIso(e.target.value)}>
                                {monedas.length === 0 && <option value="">No hay monedas extranjeras registradas</option>}
                                {monedas.map(m => <option key={m.isoCode} value={m.isoCode}>{m.isoCode} · {m.name}</option>)}
                            </select>
                        </div>
                        <div className="mb-3"><label className="form-label">Fecha</label>
                            <input type="date" className="form-control" value={fecha} max={new Date().toISOString().slice(0,10)} onChange={e => setFecha(e.target.value)} /></div>
                        <div className="mb-3"><label className="form-label">Valor (COP por 1 {iso || 'unidad'})</label>
                            <input type="number" step="0.000001" className="form-control" value={valor} onChange={e => setValor(e.target.value)} placeholder="ej. 4150.50" /></div>
                        <button className="btn btn-primary w-100" onClick={registrar}><i className="ri-save-line me-1"></i>Registrar TRM</button>
                    </div>
                </div>

                <div className="card mt-3">
                    <h5 className="card-header">Política de TRM (NIC 21)</h5>
                    <div className="card-body">
                        <select className="form-select mb-2" value={politica} onChange={e => setPolitica(e.target.value)}>
                            <option value="FECHA_MOVIMIENTO">TRM del día del movimiento</option>
                            <option value="FECHA_CIERRE">TRM de cierre</option>
                        </select>
                        <button className="btn btn-label-primary w-100" onClick={guardarPolitica}><i className="ri-settings-3-line me-1"></i>Guardar política</button>
                    </div>
                </div>
            </div>

            <div className="col-lg-7">
                <div className="card">
                    <h5 className="card-header d-flex justify-content-between align-items-center">
                        <span>Histórico TRM {iso ? `· ${iso}` : ''}</span>
                        <button className="btn btn-sm btn-label-secondary" onClick={carryForward}><i className="ri-refresh-line me-1"></i>Carry-forward</button>
                    </h5>
                    <div className="card-body">
                        <div className="table-responsive">
                            <table className="table table-sm">
                                <thead><tr><th>Fecha</th><th className="text-end">Valor (COP)</th><th>Fuente</th></tr></thead>
                                <tbody>
                                    {historica.map(t => (
                                        <tr key={t.id}>
                                            <td>{t.fecha}</td>
                                            <td className="text-end">{formatPrice(t.valorCop)}</td>
                                            <td><span className={`badge ${t.fuente === 'MANUAL' ? 'bg-label-primary' : t.fuente === 'ULTIMA_PUBLICADA' ? 'bg-label-warning' : 'bg-label-success'}`}>{t.fuente}</span></td>
                                        </tr>
                                    ))}
                                    {historica.length === 0 && <tr><td colSpan="3" className="text-center text-muted py-3">Sin TRM cargada para esta moneda</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TrmHistorica;
