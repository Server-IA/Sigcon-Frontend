import { useState, useEffect } from 'react';
import { base_url } from '@/utils/functions';
import { fetchHelper } from '@/utils/fetch';

/**
 * BNK-HU-066 E1 / HU-067 E5: configuración de firma de conciliación por empresa.
 * Métodos permitidos, exigencia de certificado al revisor fiscal y modo flexible.
 */
const METODOS = ['OTP', 'CERTIFICADO', 'BIOMETRICA'];

const ConfigFirma = () => {
    const [cfg, setCfg] = useState(null);
    const [sel, setSel] = useState([]);
    const [exigeCert, setExigeCert] = useState(false);
    const [flexible, setFlexible] = useState(false);
    const url = base_url(['api', 'v1', 'banks', 'sesiones-conciliacion', 'config-firma']);

    useEffect(() => {
        (async () => {
            try {
                const r = await fetchHelper.get(url, {}, 0, false, true);
                setCfg(r);
                setSel((r?.metodosPermitidos || 'OTP').split(',').map(x => x.trim()).filter(Boolean));
                setExigeCert(!!r?.exigeCertRevisor);
                setFlexible(!!r?.modoFlexible);
            } catch (_) { /* */ }
        })();
    }, []);

    const toggle = (m) => setSel(s => s.includes(m) ? s.filter(x => x !== m) : [...s, m]);

    const guardar = async () => {
        if (!sel.length) { window.Swal.fire({ icon: 'warning', title: 'Seleccione al menos un método' }); return; }
        try {
            await fetchHelper.put(url, { metodosPermitidos: sel.join(','), exigeCertRevisor: exigeCert, modoFlexible: flexible }, {}, 0, true);
            window.Swal.fire({ icon: 'success', title: 'Configuración guardada', timer: 1300, showConfirmButton: false });
        } catch (_) { /* */ }
    };

    return (
        <div className="card">
            <h5 className="card-header">Configuración de firma de conciliación</h5>
            <div className="card-body">
                <p className="text-muted small">Define los métodos de firma permitidos para cerrar conciliaciones y las reglas de control. El modo ESTRICTO (por defecto) exige que quien aprueba sea distinto de quien elabora (segregación de funciones).</p>

                <div className="mb-4">
                    <label className="form-label fw-semibold">Métodos de firma permitidos</label>
                    <div className="d-flex gap-3">
                        {METODOS.map(m => (
                            <div className="form-check" key={m}>
                                <input className="form-check-input" type="checkbox" id={'m-' + m} checked={sel.includes(m)} onChange={() => toggle(m)} />
                                <label className="form-check-label" htmlFor={'m-' + m}>{m}{m !== 'OTP' && <small className="text-muted"> (requiere infra)</small>}</label>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="form-check form-switch mb-3">
                    <input className="form-check-input" type="checkbox" id="cert" checked={exigeCert} onChange={e => setExigeCert(e.target.checked)} />
                    <label className="form-check-label" htmlFor="cert">Exigir certificado digital al REVISOR_FISCAL (cumplimiento estricto)</label>
                </div>

                <div className="form-check form-switch mb-4">
                    <input className="form-check-input" type="checkbox" id="flex" checked={flexible} onChange={e => setFlexible(e.target.checked)} />
                    <label className="form-check-label" htmlFor="flex">Modo flexible (empresas pequeñas): relaja la segregación exigiendo doble firma + motivo de excepción ≥100 caracteres</label>
                </div>

                <button className="btn btn-primary" onClick={guardar}><i className="ri-save-line me-1"></i>Guardar configuración</button>
            </div>
        </div>
    );
};

export default ConfigFirma;
