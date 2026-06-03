/**
 * PA-RF-28 (Pendientes PA, 2026-06-03): gestion del ciclo de vida de las API
 * Keys AAEF para PLATFORM_ADMIN.
 *
 * Cubre:
 * - Generar (POST /api/admin/api-keys?companyId=X): la clave en texto plano se
 *   muestra UNA sola vez en un modal; el sistema solo almacena su hash SHA-256.
 * - Listar (GET /api/admin/api-keys?companyId=X): metadata (prefix, status,
 *   fechas, last_used_at). Nunca el hash ni la clave.
 * - Revocar (POST /api/admin/api-keys/{id}/revoke): motivo minimo 20 caracteres.
 *
 * Gatekeeper: en `map_menu.jsx` se envuelve con `PlatformRoute` (Page403 si el
 * usuario no es PLATFORM_ADMIN). El backend ademas exige
 * `@PreAuthorize("hasAuthority('PLATFORM_ADMIN')")` en cada endpoint.
 */
import { useEffect, useState } from 'react';
import { fetchHelper } from '../../../utils/fetch';
import { base_url } from '../../../utils/functions';

const fmt = (iso) => {
    if (!iso) return '—';
    try { return new Date(iso).toLocaleString('es-CO'); } catch { return iso; }
};

const statusBadge = (s) => {
    const map = { ACTIVE: 'bg-success', REVOKED: 'bg-danger', EXPIRED: 'bg-secondary' };
    const label = { ACTIVE: 'Activa', REVOKED: 'Revocada', EXPIRED: 'Expirada' };
    return <span className={`badge ${map[s] || 'bg-secondary'}`}>{label[s] || s}</span>;
};

const ApiKeysIndex = () => {
    const [companies, setCompanies] = useState([]);
    const [companyId, setCompanyId] = useState('');
    const [keys, setKeys] = useState([]);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState(null);
    const [okMsg, setOkMsg] = useState(null);

    // Cargar empresas para el selector.
    const loadCompanies = async () => {
        try {
            const resp = await fetchHelper.get(
                base_url(['api', 'platform', 'companies']) + '?page=0&size=100', {}, 0);
            const list = resp?.content || resp?.data?.content || [];
            setCompanies(list);
        } catch (e) {
            setErr(e?.msg || 'Error cargando empresas');
        }
    };
    useEffect(() => { loadCompanies(); }, []);

    // Cargar las API Keys de la empresa seleccionada.
    const loadKeys = async (cid) => {
        if (!cid) { setKeys([]); return; }
        setLoading(true);
        setErr(null);
        try {
            const resp = await fetchHelper.get(
                base_url(['api', 'admin', 'api-keys']) + '?companyId=' + cid, {}, 0);
            setKeys(Array.isArray(resp) ? resp : (resp?.data || []));
        } catch (e) {
            setErr(e?.msg || 'Error cargando API Keys');
            setKeys([]);
        } finally {
            setLoading(false);
        }
    };

    const onSelectCompany = (e) => {
        const cid = e.target.value;
        setCompanyId(cid);
        setOkMsg(null);
        setErr(null);
        loadKeys(cid);
    };

    const generate = async () => {
        if (!companyId) { setErr('Seleccione una empresa primero.'); return; }
        setOkMsg(null); setErr(null);
        try {
            const resp = await fetchHelper.post(
                base_url(['api', 'admin', 'api-keys']) + '?companyId=' + companyId, {}, {}, 1000);
            const plain = resp?.plainKey || resp?.data?.plainKey;
            // PA-RF-28 punto 3: la clave se muestra UNA SOLA VEZ.
            await window.Swal.fire({
                title: 'API Key generada',
                html: `<p class="text-muted small mb-2">Esta es la <b>unica</b> vez que se muestra la clave completa. `
                    + `Guardela de forma segura; el sistema solo almacena su hash. Si la pierde, revoquela y genere una nueva.</p>`
                    + `<div class="input-group">`
                    + `<input id="apikey-plain" class="form-control" readonly value="${plain || ''}" />`
                    + `<button class="btn btn-outline-primary" type="button" onclick="navigator.clipboard && navigator.clipboard.writeText(document.getElementById('apikey-plain').value)">Copiar</button>`
                    + `</div>`,
                icon: 'success',
                confirmButtonText: 'Listo, ya la guarde',
                width: 600,
            });
            setOkMsg('API Key generada correctamente.');
            loadKeys(companyId);
        } catch (e) {
            setErr(e?.msg || 'Error al generar la API Key');
        }
    };

    const revoke = async (key) => {
        const result = await window.Swal.fire({
            title: 'Revocar API Key',
            html: `<p>Vas a revocar <code>${key.prefix}</code>.</p>`
                + `<p class="text-muted small mb-0">Tras revocarla deja de ser valida para AAEF de inmediato. `
                + `Ingresa el motivo (minimo 20 caracteres) para auditoria:</p>`,
            input: 'textarea',
            inputAttributes: { rows: 3, maxlength: 200 },
            inputPlaceholder: 'Motivo de la revocacion (min. 20 caracteres)...',
            showCancelButton: true,
            confirmButtonText: 'Revocar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#dc3545',
            inputValidator: (value) => {
                if (!value || value.trim().length < 20) {
                    return 'El motivo debe tener al menos 20 caracteres.';
                }
                return null;
            },
        });
        if (!result.isConfirmed) return;
        try {
            await fetchHelper.post(
                base_url(['api', 'admin', 'api-keys', key.id, 'revoke']),
                { reason: result.value.trim() }, {}, 1000);
            setOkMsg('API Key revocada correctamente.');
            loadKeys(companyId);
        } catch (e) {
            setErr(e?.msg || 'Error al revocar la API Key');
        }
    };

    const activeCount = keys.filter(k => k.status === 'ACTIVE').length;

    return (
        <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center">
                <h5 className="mb-0">
                    <i className="ri-key-2-line me-2"></i>
                    API Keys de integracion (AAEF)
                </h5>
                <button className="btn btn-primary btn-sm"
                        onClick={generate}
                        disabled={!companyId || activeCount >= 2}
                        title={activeCount >= 2 ? 'Maximo 2 claves activas por empresa' : ''}>
                    <i className="ri-add-line me-1"></i> Generar API Key
                </button>
            </div>
            <div className="card-body">
                {err && <div className="alert alert-danger py-2">{err}</div>}
                {okMsg && <div className="alert alert-success py-2">{okMsg}</div>}

                <div className="mb-3" style={{ maxWidth: 460 }}>
                    <label className="form-label">Empresa</label>
                    <select className="form-select" value={companyId} onChange={onSelectCompany}>
                        <option value="">Seleccione una empresa…</option>
                        {companies.map(c => (
                            <option key={c.id} value={c.id}>
                                {c.businessName} (NIT {c.nit}{c.dv ? '-' + c.dv : ''})
                            </option>
                        ))}
                    </select>
                    {companyId && (
                        <small className="text-muted">
                            {activeCount} de 2 claves activas en esta empresa.
                        </small>
                    )}
                </div>

                {!companyId ? (
                    <p className="text-muted">Seleccione una empresa para ver sus API Keys.</p>
                ) : loading ? (
                    <p className="text-muted">Cargando…</p>
                ) : (
                    <div className="table-responsive">
                        <table className="table table-sm table-striped align-middle">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Prefijo (publico)</th>
                                    <th>Estado</th>
                                    <th>Creada</th>
                                    <th>Expira</th>
                                    <th>Ultimo uso</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {keys.length === 0 && (
                                    <tr><td colSpan={7} className="text-center text-muted">
                                        Esta empresa no tiene API Keys
                                    </td></tr>
                                )}
                                {keys.map(k => (
                                    <tr key={k.id}>
                                        <td>{k.id}</td>
                                        <td><code>{k.prefix}</code></td>
                                        <td>{statusBadge(k.status)}</td>
                                        <td>{fmt(k.createdAt)}</td>
                                        <td>{fmt(k.expiresAt)}</td>
                                        <td>{fmt(k.lastUsedAt)}</td>
                                        <td>
                                            {k.status === 'ACTIVE' ? (
                                                <button className="btn btn-sm btn-outline-danger"
                                                        onClick={() => revoke(k)}>
                                                    <i className="ri-forbid-line me-1"></i> Revocar
                                                </button>
                                            ) : (
                                                <span className="text-muted small">
                                                    {k.status === 'REVOKED' && k.revocationReason
                                                        ? 'Motivo: ' + k.revocationReason : '—'}
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ApiKeysIndex;
