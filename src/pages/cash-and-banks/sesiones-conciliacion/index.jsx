import { useState, useEffect } from 'react';
import { base_url, formatPrice } from '@/utils/functions';
import { fetchHelper } from '@/utils/fetch';

/**
 * BNK-HU-066/067/075/077: cierre y firma de conciliaciones. Flujo de estados
 * BORRADOR -> EN_REVISION -> APROBADA -> CERRADA, con firma electrónica (OTP 2 pasos,
 * stand-in del correo), segregación de funciones, reapertura/versionado e informe PDF.
 */
const estadoBadge = (e) => ({
    BORRADOR: 'bg-label-secondary', EN_REVISION: 'bg-label-warning',
    APROBADA: 'bg-label-info', CERRADA: 'bg-label-success', REABIERTA: 'bg-label-primary'
}[e] || 'bg-label-secondary');

const SesionesConciliacion = () => {
    const [accounts, setAccounts] = useState([]);
    const [accountId, setAccountId] = useState('');
    const [sesiones, setSesiones] = useState([]);

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
        if (!id) { setSesiones([]); return; }
        try {
            const res = await fetchHelper.get(base_url(['api', 'v1', 'banks', 'sesiones-conciliacion', 'cuenta', id]), {}, 0, false, true);
            setSesiones(Array.isArray(res) ? res : (res?.data || []));
        } catch (_) { setSesiones([]); }
    };
    const onSelect = (e) => { setAccountId(e.target.value); load(e.target.value); };

    const sUrl = (...p) => base_url(['api', 'v1', 'banks', 'sesiones-conciliacion', ...p]);

    const nueva = async () => {
        const { value: f } = await window.Swal.fire({
            title: 'Nueva sesión de conciliación',
            html: `<input id="sw-ps" type="date" class="swal2-input" placeholder="Período inicio">`
                + `<input id="sw-pe" type="date" class="swal2-input" placeholder="Período fin">`
                + `<input id="sw-se" type="number" class="swal2-input" placeholder="Saldo extracto">`,
            focusConfirm: false, showCancelButton: true, confirmButtonText: 'Crear', cancelButtonText: 'Cancelar',
            preConfirm: () => ({ periodStart: document.getElementById('sw-ps').value, periodEnd: document.getElementById('sw-pe').value, saldoExtracto: Number(document.getElementById('sw-se').value || 0) })
        });
        if (!f) return;
        try {
            await fetchHelper.post(sUrl(), { bankAccountId: Number(accountId), ...f }, {}, 0, true);
            await load(accountId);
            window.Swal.fire({ icon: 'success', title: 'Sesión creada (BORRADOR)', timer: 1200, showConfirmButton: false });
        } catch (_) { /* */ }
    };

    // HU-066 E2/E3: firma en 2 pasos (OTP stand-in)
    const firmar = async (s, rol) => {
        const { value: datos } = await window.Swal.fire({
            title: `Firmar como ${rol === 'REVISOR' ? 'revisor' : 'elaborador'} #${s.id}`,
            html: `<input id="sw-doc" class="swal2-input" placeholder="Documento de identidad">`
                + `<input id="sw-tp" class="swal2-input" placeholder="Tarjeta profesional (T.P.)">`,
            focusConfirm: false, showCancelButton: true, confirmButtonText: 'Solicitar código',
            preConfirm: () => ({ documento: document.getElementById('sw-doc').value, tarjetaProfesional: document.getElementById('sw-tp').value })
        });
        if (!datos) return;
        let res;
        try {
            res = await fetchHelper.post(sUrl(s.id, 'firmar') + `?rol=${rol}`, { ...datos, metodo: 'OTP' }, {}, 0, true);
        } catch (_) { return; }
        if (res?.otpRequired) {
            const { value: otp } = await window.Swal.fire({
                title: 'Código de firma (OTP)',
                html: `<div class="alert alert-info small">Entorno sin correo: el código se muestra aquí. En producción llega al correo del firmante.</div>`
                    + `<div class="mb-2">Código: <b>${res.devOtp}</b></div>`
                    + `<input id="sw-otp" class="swal2-input" placeholder="Ingrese el código">`,
                focusConfirm: false, showCancelButton: true, confirmButtonText: 'Firmar',
                preConfirm: () => document.getElementById('sw-otp').value
            });
            if (!otp) return;
            try {
                await fetchHelper.post(sUrl(s.id, 'firmar') + `?rol=${rol}`, { ...datos, metodo: 'OTP', otp }, {}, 0, true);
                await load(accountId);
                window.Swal.fire({ icon: 'success', title: 'Firma registrada', timer: 1200, showConfirmButton: false });
            } catch (_) { /* */ }
        }
    };

    const accion = async (s, path, okMsg) => {
        try {
            await fetchHelper.post(sUrl(s.id, path), {}, {}, 0, true);
            await load(accountId);
            window.Swal.fire({ icon: 'success', title: okMsg, timer: 1300, showConfirmButton: false });
        } catch (_) { /* */ }
    };

    const verificar = async (s) => {
        try {
            const r = await fetchHelper.get(sUrl(s.id, 'verificar-firma'), {}, 0, false, true);
            const rows = (r?.firmas || []).map(f => `<tr><td>${f.rolFirma}</td><td>${f.firmante || ''}</td><td>${f.tarjetaProfesional || ''}</td><td>${f.valida ? '✅' : '❌'}</td></tr>`).join('');
            window.Swal.fire({
                icon: r?.todasValidas ? 'success' : 'error',
                title: r?.todasValidas ? 'Firmas íntegras' : 'Firma comprometida',
                html: `<table class="table table-sm"><thead><tr><th>Rol</th><th>Firmante</th><th>T.P.</th><th>Válida</th></tr></thead><tbody>${rows}</tbody></table>`
            });
        } catch (_) { /* */ }
    };

    const historial = async (s) => {
        try {
            const r = await fetchHelper.get(sUrl(s.id, 'historial'), {}, 0, false, true);
            const list = Array.isArray(r) ? r : [];
            const rows = list.map(v => `<tr><td>v${v.version}</td><td>${v.estado}</td><td>#${v.id}</td></tr>`).join('');
            window.Swal.fire({ title: 'Histórico de versiones', html: `<table class="table table-sm"><thead><tr><th>Versión</th><th>Estado</th><th>ID</th></tr></thead><tbody>${rows}</tbody></table>` });
        } catch (_) { /* */ }
    };

    const descargar = async (s) => {
        try {
            const token = localStorage.getItem('token');
            const resp = await fetch(sUrl(s.id, 'informe.pdf'), { headers: { Authorization: `Bearer ${token}` } });
            const blob = await resp.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = `informe_conciliacion_${s.id}.pdf`;
            document.body.appendChild(a); a.click(); a.remove(); window.URL.revokeObjectURL(url);
        } catch (_) { window.Swal.fire({ icon: 'error', title: 'No se pudo descargar' }); }
    };

    const solicitarReapertura = async (s) => {
        const { value: f } = await window.Swal.fire({
            title: `Solicitar reapertura #${s.id}`,
            html: `<textarea id="sw-mot" class="swal2-textarea" placeholder="Motivo detallado (mínimo 100 caracteres)"></textarea>`
                + `<input id="sw-tc" class="swal2-input" placeholder="Tipo de cambio esperado">`
                + `<input id="sw-ev" class="swal2-input" placeholder="Nombre del archivo de evidencia">`,
            focusConfirm: false, showCancelButton: true, confirmButtonText: 'Solicitar',
            preConfirm: () => {
                const motivo = document.getElementById('sw-mot').value;
                const evidenciaFileName = document.getElementById('sw-ev').value;
                if (!motivo || motivo.trim().length < 100) { window.Swal.showValidationMessage('El motivo debe tener al menos 100 caracteres'); return false; }
                if (!evidenciaFileName) { window.Swal.showValidationMessage('Adjunte el nombre del archivo de evidencia'); return false; }
                return { motivo, tipoCambioEsperado: document.getElementById('sw-tc').value, evidenciaFileName };
            }
        });
        if (!f) return;
        try {
            await fetchHelper.post(sUrl(s.id, 'reapertura', 'solicitar'), f, {}, 0, true);
            window.Swal.fire({ icon: 'success', title: 'Solicitud de reapertura enviada', timer: 1500, showConfirmButton: false });
            await reaperturas(s);
        } catch (_) { /* */ }
    };

    const reaperturas = async (s) => {
        try {
            const r = await fetchHelper.get(sUrl(s.id, 'solicitudes'), {}, 0, false, true);
            const list = Array.isArray(r) ? r : [];
            if (!list.length) { window.Swal.fire({ icon: 'info', title: 'Sin solicitudes de reapertura' }); return; }
            const rows = list.map(x => `<tr><td>#${x.id}</td><td>${x.estado}</td><td>${(x.motivo || '').slice(0, 40)}…</td></tr>`).join('');
            const pend = list.find(x => x.estado === 'PENDIENTE');
            const { isConfirmed, isDenied } = await window.Swal.fire({
                title: 'Solicitudes de reapertura',
                html: `<table class="table table-sm"><thead><tr><th>ID</th><th>Estado</th><th>Motivo</th></tr></thead><tbody>${rows}</tbody></table>`
                    + (pend ? `<div class="small text-muted">Aprobar/Rechazar la solicitud PENDIENTE #${pend.id}</div>` : ''),
                showCancelButton: true, showDenyButton: !!pend, confirmButtonText: pend ? 'Aprobar reapertura' : 'Cerrar', denyButtonText: 'Rechazar', cancelButtonText: 'Volver'
            });
            if (!pend) return;
            if (isConfirmed) await aprobarReapertura(pend);
            else if (isDenied) await rechazarReapertura(pend);
        } catch (_) { /* */ }
    };

    const aprobarReapertura = async (sol) => {
        const { value: f } = await window.Swal.fire({
            title: `Aprobar reapertura #${sol.id}`,
            html: `<div class="alert alert-warning small">Escriba <b>REABRIR</b> para confirmar. Se exige su segunda firma electrónica.</div>`
                + `<input id="sw-cf" class="swal2-input" placeholder="Escriba REABRIR">`
                + `<input id="sw-doc" class="swal2-input" placeholder="Documento">`
                + `<input id="sw-tp" class="swal2-input" placeholder="Tarjeta profesional">`,
            focusConfirm: false, showCancelButton: true, confirmButtonText: 'Aprobar',
            preConfirm: () => ({ confirmText: document.getElementById('sw-cf').value, documento: document.getElementById('sw-doc').value, tarjetaProfesional: document.getElementById('sw-tp').value })
        });
        if (!f) return;
        try {
            const r = await fetchHelper.post(sUrl('reaperturas', sol.id, 'aprobar'), f, {}, 0, true);
            await load(accountId);
            window.Swal.fire({ icon: 'success', title: 'Reapertura aprobada', html: `Nueva versión: <b>v${r?.version}</b> (sesión #${r?.nuevaSesionId})` });
        } catch (_) { /* */ }
    };

    const rechazarReapertura = async (sol) => {
        const { value: motivo } = await window.Swal.fire({ title: 'Rechazar reapertura', input: 'textarea', inputPlaceholder: 'Motivo del rechazo', showCancelButton: true, confirmButtonText: 'Rechazar' });
        if (!motivo) return;
        try {
            await fetchHelper.post(sUrl('reaperturas', sol.id, 'rechazar'), { motivoRechazo: motivo }, {}, 0, true);
            window.Swal.fire({ icon: 'success', title: 'Solicitud rechazada', timer: 1200, showConfirmButton: false });
        } catch (_) { /* */ }
    };

    const accLabel = (a) => `${a.accountNumber || a.account_number || ('#' + a.id)}${a.bankDTO?.name ? ' · ' + a.bankDTO.name : ''}`;

    const actions = (s) => {
        const e = s.estado;
        const btns = [];
        if (e === 'BORRADOR' || e === 'REABIERTA') {
            btns.push(<button key="fe" className="btn btn-sm btn-icon btn-text-primary" title="Firmar (elaborador)" onClick={() => firmar(s, 'ELABORADOR')}><i className="ri-quill-pen-line"></i></button>);
            btns.push(<button key="er" className="btn btn-sm btn-icon btn-text-secondary" title="Enviar a revisión" onClick={() => accion(s, 'enviar-revision', 'Enviada a revisión')}><i className="ri-send-plane-line"></i></button>);
        }
        if (e === 'EN_REVISION') {
            btns.push(<button key="fr" className="btn btn-sm btn-icon btn-text-primary" title="Firmar (revisor)" onClick={() => firmar(s, 'REVISOR')}><i className="ri-quill-pen-line"></i></button>);
            btns.push(<button key="ap" className="btn btn-sm btn-icon btn-text-success" title="Aprobar" onClick={() => accion(s, 'aprobar', 'Sesión aprobada')}><i className="ri-check-double-line"></i></button>);
        }
        if (e === 'APROBADA') btns.push(<button key="cl" className="btn btn-sm btn-icon btn-text-success" title="Cerrar + generar informe" onClick={() => accion(s, 'cerrar', 'Sesión cerrada')}><i className="ri-lock-2-line"></i></button>);
        if (e === 'CERRADA') {
            btns.push(<button key="dl" className="btn btn-sm btn-icon btn-text-secondary" title="Descargar informe PDF" onClick={() => descargar(s)}><i className="ri-download-line"></i></button>);
            btns.push(<button key="vf" className="btn btn-sm btn-icon btn-text-secondary" title="Verificar firma" onClick={() => verificar(s)}><i className="ri-shield-check-line"></i></button>);
            btns.push(<button key="ra" className="btn btn-sm btn-icon btn-text-warning" title="Solicitar reapertura" onClick={() => solicitarReapertura(s)}><i className="ri-folder-open-line"></i></button>);
            btns.push(<button key="rl" className="btn btn-sm btn-icon btn-text-secondary" title="Solicitudes de reapertura" onClick={() => reaperturas(s)}><i className="ri-list-check-2"></i></button>);
        }
        btns.push(<button key="hi" className="btn btn-sm btn-icon btn-text-secondary" title="Historial de versiones" onClick={() => historial(s)}><i className="ri-history-line"></i></button>);
        return btns;
    };

    return (
        <div className="card">
            <h5 className="card-header d-flex justify-content-between align-items-center">
                <span>Cierre y firma de conciliación</span>
                <button className="btn btn-sm btn-primary" disabled={!accountId} onClick={nueva}><i className="ri-add-line me-1"></i>Nueva sesión</button>
            </h5>
            <div className="card-body">
                <p className="text-muted small">Flujo con firma electrónica y segregación de funciones: el elaborador firma y envía; un revisor distinto firma, aprueba y cierra (genera el informe PDF). Las sesiones cerradas pueden reabrirse como nueva versión.</p>
                <div className="row g-3 mb-4">
                    <div className="col-md-6">
                        <label className="form-label">Cuenta bancaria</label>
                        <select className="form-select" value={accountId} onChange={onSelect}>
                            <option value="">Seleccione una cuenta...</option>
                            {accounts.map(a => <option key={a.id} value={a.id}>{accLabel(a)}</option>)}
                        </select>
                    </div>
                </div>
                <div className="table-responsive">
                    <table className="table table-sm">
                        <thead><tr><th>ID</th><th>Período</th><th>Versión</th><th className="text-end">Saldo extracto</th><th className="text-end">Diferencia</th><th>Estado</th><th>Acciones</th></tr></thead>
                        <tbody>
                            {sesiones.map(s => (
                                <tr key={s.id}>
                                    <td className="small">{s.id}</td>
                                    <td className="small">{s.periodStart} → {s.periodEnd}</td>
                                    <td className="small">v{s.version}</td>
                                    <td className="text-end small">{formatPrice(s.saldoExtracto)}</td>
                                    <td className="text-end small">{formatPrice(s.diferencia)}</td>
                                    <td><span className={`badge ${estadoBadge(s.estado)}`}>{s.estado}</span></td>
                                    <td>{actions(s)}</td>
                                </tr>
                            ))}
                            {sesiones.length === 0 && <tr><td colSpan="7" className="text-center text-muted py-3">Seleccione una cuenta y cree una sesión de conciliación</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default SesionesConciliacion;
