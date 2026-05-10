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
        if (!window.confirm(`¿Seguro que deseas ${action} la empresa "${empresa.businessName}"?`)) return;
        // QA Bloque PA Bug 1 (2026-05-09): la firma de fetchHelper es
        // (url, data, headers, time, ...). Antes pasaba 1000 como tercer
        // argumento pensando que era timeout, lo que dejaba `headers=1000`
        // (numero). El spread {...1000} = {} y el Authorization header no
        // se inyectaba, causando que el backend respondiera 403 y la UI
        // mostrara "No tienes permisos para acceder a este recurso" (HU-PA-01 E3).
        try {
            if (isActive) {
                await fetchHelper.delete(
                    base_url(['api', 'platform', 'companies', empresa.id]),
                    {},
                    {},
                    1000,
                );
            } else {
                await fetchHelper.post(
                    base_url(['api', 'platform', 'companies', empresa.id, 'activate']),
                    {},
                    {},
                    1000,
                );
            }
            // QA Bloque PA Bug 1 (2026-05-09): conjugar correctamente.
            // Antes generaba "desactivarda"/"activarda" por concatenar `${action}+da`.
            const conjugado = isActive ? 'desactivada' : 'activada';
            setOkMsg(`Empresa ${conjugado} correctamente.`);
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
