/**
 * Página de gestión de empresas para PLATFORM_ADMIN.
 *
 * Cubre:
 * - HU-PLAT-01: listado paginado (GET /api/platform/companies) + detalle por id.
 * - HU-PLAT-02: alta atómica empresa + admin (POST /api/platform/companies/with-admin),
 *   flujo lanzado por el botón "Crear empresa + admin" que abre `CreateCompanyModal`.
 * - HU-PLAT-05: activar/desactivar (DELETE /api/platform/companies/{id}
 *   y POST /api/platform/companies/{id}/activate). El botón de la fila alterna
 *   entre "Desactivar" y "Activar" según el status actual.
 *
 * Gatekeeper: en `map_menu.jsx` esta página se envuelve con `PlatformRoute`,
 * que renderiza Page403 si el usuario no tiene `isPlatformAdmin=true` en Redux.
 * El backend además protege cada endpoint con
 * `@PreAuthorize("hasAuthority('PLATFORM_ADMIN')")`.
 */
import { useEffect, useState, useRef } from 'react';
import { fetchHelper } from '../../../utils/fetch';
import { base_url } from '../../../utils/functions';
import CreateCompanyModal from './create';

const EmpresasIndex = () => {
    const [empresas, setEmpresas] = useState([]);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState(null);
    const [showCreate, setShowCreate] = useState(false);
    const [okMsg, setOkMsg] = useState(null);
    const createdAtRef = useRef(null);

    const load = async () => {
        setLoading(true);
        setErr(null);
        try {
            const resp = await fetchHelper.get(
                base_url(['api', 'platform', 'companies']) + '?page=0&size=50',
                {},
                1000,
            );
            setEmpresas(resp?.content || resp?.data?.content || []);
        } catch (e) {
            setErr(e?.msg || 'Error cargando empresas');
        } finally {
            setLoading(false);
        }
    };
    useEffect(() => { load(); }, []);

    const toggleStatus = async (empresa) => {
        const isActive = empresa.status === 'ACTIVE';
        const action = isActive ? 'desactivar' : 'activar';

        // QA Bloque PA Bug 71 (HU-PA-PLAT-05 E1, 2026-05-10): el backend exige
        // body {reason} con minimo 30 caracteres al desactivar. Antes el
        // frontend usaba window.confirm() que solo retorna boolean y NO pedia
        // motivo. Resultado: DELETE sin body, backend respondia 400 "El motivo
        // de desactivacion es obligatorio" pero la UI nunca pidio el dato.
        // Activar sigue siendo un confirm simple porque el endpoint /activate
        // no requiere motivo.
        let reason = null;
        if (isActive) {
            const result = await window.Swal.fire({
                title: `Desactivar empresa`,
                html: `<p>Vas a desactivar <b>${empresa.businessName}</b>.</p>
                       <p class="text-muted small mb-0">Los usuarios de esta empresa no podran iniciar sesion. Ingresa el motivo (minimo 30 caracteres) para auditoria:</p>`,
                input: 'textarea',
                inputAttributes: { rows: 3, maxlength: 500 },
                inputPlaceholder: 'Motivo de la desactivacion (min. 30 caracteres)...',
                showCancelButton: true,
                confirmButtonText: 'Desactivar',
                cancelButtonText: 'Cancelar',
                confirmButtonColor: '#dc3545',
                inputValidator: (value) => {
                    if (!value || value.trim().length < 30) {
                        return 'El motivo debe tener al menos 30 caracteres.';
                    }
                    return null;
                }
            });
            if (!result.isConfirmed) return;
            reason = result.value.trim();
        } else {
            // PA-RF-PLAT-03 v3.0 (Control de Cambios PA, 2026-05-29): activar
            // tambien exige motivo (30-500 caracteres) para auditoria.
            const result = await window.Swal.fire({
                title: `Activar empresa`,
                html: `<p>Vas a reactivar <b>${empresa.businessName}</b>.</p>
                       <p class="text-muted small mb-0">Ingresa el motivo (minimo 30 caracteres) para auditoria:</p>`,
                input: 'textarea',
                inputAttributes: { rows: 3, maxlength: 500 },
                inputPlaceholder: 'Motivo de la activacion (min. 30 caracteres)...',
                showCancelButton: true,
                confirmButtonText: 'Activar',
                cancelButtonText: 'Cancelar',
                confirmButtonColor: '#28a745',
                inputValidator: (value) => {
                    if (!value || value.trim().length < 30) {
                        return 'El motivo debe tener al menos 30 caracteres.';
                    }
                    return null;
                }
            });
            if (!result.isConfirmed) return;
            reason = result.value.trim();
        }

        try {
            let invalidated = null;
            if (isActive) {
                const resp = await fetchHelper.delete(
                    base_url(['api', 'platform', 'companies', empresa.id]),
                    { reason },
                    {},
                    1000,
                );
                // PA-RF-PLAT-03 punto 7: el backend devuelve invalidatedSessions.
                invalidated = resp?.invalidatedSessions ?? resp?.data?.invalidatedSessions ?? null;
            } else {
                await fetchHelper.post(
                    base_url(['api', 'platform', 'companies', empresa.id, 'activate']),
                    { reason },
                    {},
                    1000,
                );
            }
            // QA Bloque PA Bug 1 (2026-05-09): conjugar correctamente.
            // Antes generaba "desactivarda"/"activarda" por concatenar `${action}+da`.
            const conjugado = isActive ? 'desactivada' : 'activada';
            setOkMsg(`Empresa ${conjugado} correctamente.`
                + (invalidated != null ? ` (${invalidated} sesion(es) invalidada(s))` : ''));
            load();
        } catch (e) {
            setErr(e?.msg || `Error al ${action} la empresa`);
        }
    };

    return (
        <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center">
                <h5 className="mb-0">
                    <i className="ri-building-line me-2"></i>
                    Plataforma · Empresas
                </h5>
                <button className="btn btn-primary btn-sm"
                        onClick={() => { setOkMsg(null); setShowCreate(true); }}>
                    <i className="ri-add-line me-1"></i> Crear empresa + admin
                </button>
            </div>
            <div className="card-body">
                {err && <div className="alert alert-danger py-2">{err}</div>}
                {okMsg && <div className="alert alert-success py-2">{okMsg}</div>}
                {loading ? (
                    <p className="text-muted">Cargando...</p>
                ) : (
                    <div className="table-responsive">
                        <table className="table table-sm table-striped align-middle">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>NIT</th>
                                    <th>Razón Social</th>
                                    <th>Representante</th>
                                    <th>Email</th>
                                    <th>Estado</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {empresas.length === 0 && (
                                    <tr><td colSpan={7} className="text-center text-muted">
                                        Sin empresas registradas
                                    </td></tr>
                                )}
                                {empresas.map(e => (
                                    <tr key={e.id} ref={el => { if (e.id === createdAtRef.current) createdAtRef.current = el; }}>
                                        <td>{e.id}</td>
                                        <td><code>{e.nit}-{e.dv}</code></td>
                                        <td>{e.businessName}</td>
                                        <td>{e.legalRepresentative || '—'}</td>
                                        <td>{e.email || '—'}</td>
                                        <td>
                                            {e.status === 'ACTIVE' ? (
                                                <span className="badge bg-success">ACTIVE</span>
                                            ) : (
                                                <span className="badge bg-secondary">INACTIVE</span>
                                            )}
                                        </td>
                                        <td>
                                            <button
                                                className={`btn btn-sm ${e.status === 'ACTIVE' ? 'btn-outline-danger' : 'btn-outline-success'}`}
                                                onClick={() => toggleStatus(e)}>
                                                {e.status === 'ACTIVE' ? 'Desactivar' : 'Activar'}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {showCreate && (
                <CreateCompanyModal
                    onClose={() => setShowCreate(false)}
                    onCreated={() => {
                        setShowCreate(false);
                        setOkMsg('Empresa + admin creados correctamente.');
                        load();
                    }}
                />
            )}
        </div>
    );
};

export default EmpresasIndex;
