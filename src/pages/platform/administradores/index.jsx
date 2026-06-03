/**
 * PA-RF-PLAT-07 v3.0 (Control de Cambios PA, 2026-05-29): gestion del ciclo de
 * vida de los administradores de plataforma (PLATFORM_ADMIN).
 *
 * Cubre crear, consultar, editar, restablecer contrasena, activar y desactivar
 * (con motivo). Endpoints:
 *   - GET    /api/platform/users?platform=true        (listado)
 *   - POST   /api/platform/users/platform-admin       (crear)
 *   - PUT    /api/platform/users/platform-admin/{id}  (editar)
 *   - POST   /api/platform/users/platform-admin/{id}/activate  (reactivar)
 *   - DELETE /api/platform/users/platform-admin/{id}  (desactivar, motivo >=10)
 *   - POST   /api/platform/users/{id}/reset-password  (resetear)
 *
 * Gatekeeper: en map_menu.jsx se envuelve con PlatformRoute (solo PLATFORM_ADMIN);
 * el backend ademas protege cada endpoint con @PreAuthorize('PLATFORM_ADMIN').
 */
import { useEffect, useState } from 'react';
import { fetchHelper } from '../../../utils/fetch';
import { base_url } from '../../../utils/functions';

// PA-RF-01 punto 3: politica de contrasenas (hint para el operador).
const POLICY_HINT = 'Minimo 8 caracteres, con al menos una mayuscula, un numero y un simbolo.';

const PlatformAdminsIndex = () => {
    const [admins, setAdmins] = useState([]);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState(null);
    const [okMsg, setOkMsg] = useState(null);

    const load = async () => {
        setLoading(true); setErr(null);
        try {
            const resp = await fetchHelper.get(
                base_url(['api', 'platform', 'users']) + '?platform=true&size=100', {}, 1000);
            setAdmins(resp?.content || resp?.data?.content || []);
        } catch (e) {
            setErr(e?.msg || 'Error cargando administradores de plataforma');
        } finally {
            setLoading(false);
        }
    };
    useEffect(() => { load(); }, []);

    const baseFormHtml = (a = {}) => `
        <input id="pa-name" class="swal2-input" placeholder="Nombre" value="${a.name || ''}">
        <input id="pa-lastname" class="swal2-input" placeholder="Apellido" value="${a.lastname || ''}">
        <input id="pa-email" class="swal2-input" placeholder="Email" value="${a.email || ''}">`;

    const create = async () => {
        const res = await window.Swal.fire({
            title: 'Crear administrador de plataforma',
            html: baseFormHtml()
                + `<input id="pa-username" class="swal2-input" placeholder="Username">
                   <input id="pa-pass" type="password" class="swal2-input" placeholder="Contrasena">
                   <small class="text-muted d-block mt-2">${POLICY_HINT}</small>`,
            focusConfirm: false, showCancelButton: true, confirmButtonText: 'Crear',
            preConfirm: () => ({
                name: document.getElementById('pa-name').value.trim(),
                lastname: document.getElementById('pa-lastname').value.trim(),
                email: document.getElementById('pa-email').value.trim(),
                username: document.getElementById('pa-username').value.trim(),
                password: document.getElementById('pa-pass').value,
            }),
        });
        if (!res.isConfirmed) return;
        try {
            await fetchHelper.post(base_url(['api', 'platform', 'users', 'platform-admin']), res.value, {}, 1000);
            setOkMsg('Administrador de plataforma creado.'); load();
        } catch (e) {
            window.Swal.fire({ icon: 'error', title: 'No se pudo crear', text: e?.msg || e?.message || 'Error' });
        }
    };

    const edit = async (a) => {
        const res = await window.Swal.fire({
            title: 'Editar administrador', html: baseFormHtml(a),
            focusConfirm: false, showCancelButton: true, confirmButtonText: 'Guardar',
            preConfirm: () => ({
                name: document.getElementById('pa-name').value.trim(),
                lastname: document.getElementById('pa-lastname').value.trim(),
                email: document.getElementById('pa-email').value.trim(),
            }),
        });
        if (!res.isConfirmed) return;
        try {
            await fetchHelper.put(base_url(['api', 'platform', 'users', 'platform-admin', a.id]), res.value, {}, 1000);
            setOkMsg('Administrador actualizado.'); load();
        } catch (e) {
            window.Swal.fire({ icon: 'error', title: 'No se pudo editar', text: e?.msg || 'Error' });
        }
    };

    const resetPass = async (a) => {
        const res = await window.Swal.fire({
            title: `Resetear contrasena de ${a.email}`,
            input: 'password', inputPlaceholder: 'Nueva contrasena',
            html: `<small class="text-muted d-block mb-2">${POLICY_HINT}</small>`,
            showCancelButton: true, confirmButtonText: 'Resetear',
            inputValidator: (v) => (!v || v.length < 8) ? 'Minimo 8 caracteres.' : null,
        });
        if (!res.isConfirmed) return;
        try {
            await fetchHelper.post(base_url(['api', 'platform', 'users', a.id, 'reset-password']),
                { newPassword: res.value }, {}, 1000);
            setOkMsg('Contrasena reseteada. Las sesiones del usuario fueron invalidadas.');
        } catch (e) {
            window.Swal.fire({ icon: 'error', title: 'No se pudo resetear', text: e?.msg || 'Error' });
        }
    };

    const toggle = async (a) => {
        const isActive = a.status === 'ACTIVE';
        if (isActive) {
            const res = await window.Swal.fire({
                title: 'Desactivar administrador',
                html: `<p>Vas a desactivar <b>${a.email}</b>.</p>
                       <p class="text-muted small mb-0">Ingresa el motivo (minimo 10 caracteres):</p>`,
                input: 'textarea', inputAttributes: { rows: 3, maxlength: 500 },
                inputPlaceholder: 'Motivo de la desactivacion (min. 10 caracteres)...',
                showCancelButton: true, confirmButtonText: 'Desactivar', confirmButtonColor: '#dc3545',
                inputValidator: (v) => (!v || v.trim().length < 10) ? 'El motivo debe tener al menos 10 caracteres.' : null,
            });
            if (!res.isConfirmed) return;
            try {
                await fetchHelper.delete(base_url(['api', 'platform', 'users', 'platform-admin', a.id]),
                    { reason: res.value.trim() }, {}, 1000);
                setOkMsg('Administrador desactivado (sus sesiones fueron invalidadas).'); load();
            } catch (e) {
                window.Swal.fire({ icon: 'error', title: 'No se pudo desactivar', text: e?.msg || 'Error' });
            }
        } else {
            const res = await window.Swal.fire({
                title: 'Reactivar administrador',
                text: `Reactivar a ${a.email}?`,
                input: 'textarea', inputAttributes: { rows: 2, maxlength: 500 },
                inputPlaceholder: 'Motivo (opcional)...',
                showCancelButton: true, confirmButtonText: 'Activar', confirmButtonColor: '#28a745',
            });
            if (!res.isConfirmed) return;
            try {
                await fetchHelper.post(base_url(['api', 'platform', 'users', 'platform-admin', a.id, 'activate']),
                    { reason: res.value ? res.value.trim() : '' }, {}, 1000);
                setOkMsg('Administrador reactivado.'); load();
            } catch (e) {
                window.Swal.fire({ icon: 'error', title: 'No se pudo activar', text: e?.msg || 'Error' });
            }
        }
    };

    return (
        <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center">
                <h5 className="mb-0">
                    <i className="ri-shield-user-line me-2"></i>
                    Plataforma · Administradores
                </h5>
                <button className="btn btn-primary btn-sm" onClick={() => { setOkMsg(null); create(); }}>
                    <i className="ri-add-line me-1"></i> Crear administrador
                </button>
            </div>
            <div className="card-body">
                {okMsg && <div className="alert alert-success py-2">{okMsg}</div>}
                {err && <div className="alert alert-danger py-2">{err}</div>}
                <div className="table-responsive">
                    <table className="table table-sm table-striped mb-0">
                        <thead>
                            <tr>
                                <th>ID</th><th>Nombre</th><th>Email</th><th>Username</th>
                                <th>Estado</th><th className="text-nowrap">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {admins.map((a) => (
                                <tr key={a.id}>
                                    <td>{a.id}</td>
                                    <td>{[a.name, a.lastname].filter(Boolean).join(' ')}</td>
                                    <td style={{ wordBreak: 'break-word' }}>{a.email}</td>
                                    <td>{a.username}</td>
                                    <td>
                                        <span className={`badge ${a.status === 'ACTIVE' ? 'bg-label-success' : 'bg-label-secondary'}`}>
                                            {a.status === 'ACTIVE' ? 'Activo' : 'Inactivo'}
                                        </span>
                                    </td>
                                    <td className="text-nowrap">
                                        <button className="btn btn-sm btn-icon btn-text-secondary" title="Editar" onClick={() => edit(a)}>
                                            <i className="ri-edit-line"></i>
                                        </button>
                                        <button className="btn btn-sm btn-icon btn-text-secondary" title="Resetear contrasena" onClick={() => resetPass(a)}>
                                            <i className="ri-lock-password-line"></i>
                                        </button>
                                        <button className="btn btn-sm btn-icon btn-text-secondary"
                                                title={a.status === 'ACTIVE' ? 'Desactivar' : 'Activar'} onClick={() => toggle(a)}>
                                            <i className={a.status === 'ACTIVE' ? 'ri-forbid-line text-danger' : 'ri-check-line text-success'}></i>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {!loading && admins.length === 0 && (
                                <tr><td colSpan="6" className="text-center text-muted py-3">Sin administradores de plataforma.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default PlatformAdminsIndex;
