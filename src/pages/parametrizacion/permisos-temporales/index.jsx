/**
 * HU-PA-13 + HU-PA-14: pagina de gestion de permisos temporales.
 *
 * <p>Vista para ADMIN_EMPRESA y AUDITOR (solo lectura). Permite:
 * <ul>
 *   <li>Listar permisos temporales con filtros (usuario, estado, rango fechas).</li>
 *   <li>Asignar nuevos permisos temporales a un usuario (HU-PA-13).</li>
 *   <li>Revocar permisos ACTIVE antes de su vencimiento (HU-PA-14).</li>
 *   <li>Ver detalle con justificacion + historial.</li>
 * </ul>
 */
import { useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { fetchHelper } from '../../../utils/fetch';
import { base_url } from '../../../utils/functions';
import AlertPage from '../../../components/molecules/AlertPage';
import InputModal from '../../../components/molecules/InputModal';
import InputSelectModal from '../../../components/molecules/inputSelectModal';

const STATUS_BADGE = {
    ACTIVE: 'bg-label-success',
    REVOKED: 'bg-label-danger',
    EXPIRED: 'bg-label-secondary',
};
const STATUS_LABEL = {
    ACTIVE: 'Activo',
    REVOKED: 'Revocado',
    EXPIRED: 'Vencido',
};

const IndexTemporaryPermissions = () => {
    const userPermissions = useSelector(state => state.user.user)?.permissions?.filter(p => p.code?.includes('PERMISOS_TEMPORALES')) || [];
    const isAdmin = useSelector(state => state.user.user)?.isAdmin || false;
    const userRoles = useSelector(state => state.user.user)?.roles || [];
    const isAdminEmpresa = userRoles.some(r => r === 'ADMIN_EMPRESA' || r === 'ADMIN');
    const canAssign = isAdmin || isAdminEmpresa || userPermissions.some(p => p.code === 'PAR.PERMISOS_TEMPORALES.ASIGNAR');
    const canRevoke = isAdmin || isAdminEmpresa || userPermissions.some(p => p.code === 'PAR.PERMISOS_TEMPORALES.REVOCAR');

    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [filterUserId, setFilterUserId] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [users, setUsers] = useState([]);
    const [permissions, setPermissions] = useState([]);
    const [okMsg, setOkMsg] = useState('');
    const [errMsg, setErrMsg] = useState('');

    // Modal asignar
    const modalAssignRef = useRef(null);
    const modalAssignInstance = useRef(null);
    const [assignForm, setAssignForm] = useState({
        userId: '',
        permissionIds: [],
        justification: '',
        startDate: '',
        endDate: '',
    });

    // Modal revocar
    const modalRevokeRef = useRef(null);
    const modalRevokeInstance = useRef(null);
    const [revokeTarget, setRevokeTarget] = useState(null);
    const [revokeReason, setRevokeReason] = useState('');

    const loadList = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (filterUserId) params.append('userId', filterUserId);
            if (filterStatus) params.append('status', filterStatus);
            params.append('size', '100');
            const url = `${base_url(['api', 'parametrization', 'temporary-permissions'])}?${params}`;
            const resp = await fetchHelper.get(url);
            setData(resp?.data || []);
        } catch (err) {
            setErrMsg(err?.message || 'No se pudieron cargar los permisos temporales');
            setData([]);
        } finally {
            setLoading(false);
        }
    };

    const loadUsers = async () => {
        try {
            const resp = await fetchHelper.post(base_url(['users', 'getUsers']),
                { draw: 1, start: 0, length: 200, search: { value: '' }, order: [], columns: [] });
            const list = (resp?.data || []).map(u => ({
                id: u.id,
                name: `${u.name} ${u.lastname} (${u.email})`,
            }));
            setUsers(list);
        } catch { /* ignore */ }
    };

    const loadPermissions = async () => {
        try {
            // QA Bloque PA validacion (2026-05-09): endpoint correcto es /roles/permissions
            // (no /roles/getPermissions). Antes generaba 500 "No static resource roles/getPermissions".
            const resp = await fetchHelper.post(base_url(['roles', 'permissions']),
                { draw: 1, start: 0, length: 1000, search: { value: '' }, order: [], columns: [] });
            const list = (resp?.data || []).map(p => ({
                id: p.id,
                name: `${p.code || p.name} - ${p.description || ''}`,
            }));
            setPermissions(list);
        } catch { /* ignore */ }
    };

    useEffect(() => {
        loadList();
        loadUsers();
        loadPermissions();
    }, []);

    const openAssign = () => {
        setAssignForm({ userId: '', permissionIds: [], justification: '', startDate: '', endDate: '' });
        if (!modalAssignInstance.current) {
            modalAssignInstance.current = new window.bootstrap.Modal(modalAssignRef.current);
        }
        modalAssignInstance.current.show();
    };

    const submitAssign = async () => {
        // Validaciones cliente (HU-PA-13 E2/E4)
        if (!assignForm.userId) {
            setErrMsg('Debe seleccionar un usuario destino');
            return;
        }
        if (!assignForm.permissionIds || assignForm.permissionIds.length === 0) {
            setErrMsg('Debe seleccionar al menos un permiso atomico');
            return;
        }
        if (!assignForm.justification || assignForm.justification.trim().length < 30) {
            setErrMsg('La justificacion es obligatoria y debe tener al menos 30 caracteres');
            return;
        }
        if (!assignForm.startDate || !assignForm.endDate) {
            setErrMsg('Debe ingresar fecha de inicio y fecha de fin');
            return;
        }
        const start = new Date(assignForm.startDate);
        const end = new Date(assignForm.endDate);
        const diffDays = Math.ceil((end - start) / 86400000);
        if (diffDays > 90) {
            setErrMsg('La duracion maxima de un permiso temporal es de 90 dias. Ajuste la fecha de fin');
            return;
        }
        if (end < start) {
            setErrMsg('La fecha de fin debe ser posterior o igual a la fecha de inicio');
            return;
        }

        try {
            const url = base_url(['api', 'parametrization', 'temporary-permissions']);
            const body = {
                userId: Number(assignForm.userId),
                permissionIds: assignForm.permissionIds.map(Number),
                justification: assignForm.justification,
                startDate: assignForm.startDate.includes('T') ? assignForm.startDate : `${assignForm.startDate}T00:00:00`,
                endDate: assignForm.endDate.includes('T') ? assignForm.endDate : `${assignForm.endDate}T23:59:59`,
            };
            await fetchHelper.post(url, body);
            modalAssignInstance.current?.hide();
            setOkMsg('Permisos temporales asignados correctamente');
            setErrMsg('');
            await loadList();
        } catch (err) {
            setErrMsg(err?.message || 'Error al asignar permisos temporales');
        }
    };

    const openRevoke = (item) => {
        setRevokeTarget(item);
        setRevokeReason('');
        if (!modalRevokeInstance.current) {
            modalRevokeInstance.current = new window.bootstrap.Modal(modalRevokeRef.current);
        }
        modalRevokeInstance.current.show();
    };

    const submitRevoke = async () => {
        if (!revokeReason || revokeReason.trim().length < 30) {
            setErrMsg('La justificacion de revocacion es obligatoria (minimo 30 caracteres)');
            return;
        }
        try {
            const url = base_url(['api', 'parametrization', 'temporary-permissions', revokeTarget.id, 'revoke']);
            await fetchHelper.post(url, { reason: revokeReason });
            modalRevokeInstance.current?.hide();
            setOkMsg('Permiso temporal revocado correctamente');
            setErrMsg('');
            await loadList();
        } catch (err) {
            setErrMsg(err?.message || 'Error al revocar el permiso temporal');
        }
    };

    return (
        <div className="card">
            <h5 className="card-header text-md-start text-center">
                <i className="ri-time-line me-2"></i>
                Permisos Temporales
            </h5>

            <AlertPage type="success" message={okMsg} show={okMsg !== ''} onChange={() => setOkMsg('')} />
            <AlertPage type="danger" message={errMsg} show={errMsg !== ''} onChange={() => setErrMsg('')} />

            <div className="card-body">
                <div className="row mb-3">
                    <div className="col-md-4">
                        <label className="form-label">Usuario</label>
                        <select className="form-select" value={filterUserId} onChange={(e) => setFilterUserId(e.target.value)}>
                            <option value="">Todos</option>
                            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                        </select>
                    </div>
                    <div className="col-md-3">
                        <label className="form-label">Estado</label>
                        <select className="form-select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                            <option value="">Todos</option>
                            <option value="ACTIVE">Activo</option>
                            <option value="REVOKED">Revocado</option>
                            <option value="EXPIRED">Vencido</option>
                        </select>
                    </div>
                    <div className="col-md-5 d-flex align-items-end gap-2">
                        <button className="btn btn-outline-primary" onClick={loadList} disabled={loading}>
                            <i className="ri-refresh-line me-1"></i> Refrescar
                        </button>
                        {canAssign && (
                            <button className="btn btn-primary" onClick={openAssign}>
                                <i className="ri-add-line me-1"></i> Asignar permiso temporal
                            </button>
                        )}
                    </div>
                </div>

                <div className="table-responsive">
                    <table className="table table-hover">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Usuario</th>
                                <th>Permiso</th>
                                <th>Inicio</th>
                                <th>Fin</th>
                                <th>Estado</th>
                                <th>Otorgado por</th>
                                <th>Justificacion</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.length === 0 && !loading && (
                                <tr><td colSpan={9} className="text-center text-muted py-4">No se encontraron permisos temporales</td></tr>
                            )}
                            {data.map(t => (
                                <tr key={t.id}>
                                    <td>{t.id}</td>
                                    <td>{users.find(u => u.id === t.userId)?.name || `#${t.userId}`}</td>
                                    <td><code>{t.permissionCode}</code></td>
                                    <td>{t.startDate?.slice(0, 16)?.replace('T', ' ')}</td>
                                    <td>{t.endDate?.slice(0, 16)?.replace('T', ' ')}</td>
                                    <td>
                                        <span className={`badge ${STATUS_BADGE[t.status] || 'bg-label-secondary'}`}>
                                            {STATUS_LABEL[t.status] || t.status}
                                        </span>
                                        {t.scheduled && <span className="badge bg-label-info ms-1">Programado</span>}
                                        {t.daysRemaining != null && t.status === 'ACTIVE' && (
                                            <small className="d-block text-muted">{t.daysRemaining} dias restantes</small>
                                        )}
                                    </td>
                                    <td>{t.grantedByEmail || '-'}</td>
                                    <td title={t.justification}>
                                        {t.justification?.length > 40
                                            ? t.justification.slice(0, 40) + '...'
                                            : t.justification}
                                    </td>
                                    <td>
                                        {t.status === 'ACTIVE' && canRevoke && (
                                            <button
                                                className="btn btn-sm btn-label-danger"
                                                onClick={() => openRevoke(t)}
                                                title="Revocar permiso">
                                                <i className="ri-close-circle-line"></i>
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal Asignar */}
            <div className="modal fade" ref={modalAssignRef} tabIndex={-1} aria-hidden="true">
                <div className="modal-dialog modal-dialog-centered modal-lg">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h5 className="modal-title">Asignar permiso temporal</h5>
                            <button type="button" className="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div className="modal-body">
                            <div className="row">
                                <div className="col-md-12 mb-3">
                                    <InputSelectModal
                                        id="ta_userId"
                                        label="Usuario destino"
                                        value={assignForm.userId}
                                        onChange={(value) => setAssignForm({ ...assignForm, userId: value })}
                                        options={users}
                                        placeholder="Seleccione un usuario"
                                    />
                                </div>
                            </div>
                            <div className="row">
                                <div className="col-md-12 mb-3">
                                    <InputSelectModal
                                        id="ta_permissions"
                                        label="Permisos atomicos"
                                        value={assignForm.permissionIds}
                                        onChange={(value) => setAssignForm({
                                            ...assignForm,
                                            permissionIds: Array.isArray(value) ? value : [value],
                                        })}
                                        options={permissions}
                                        placeholder="Seleccione uno o varios permisos"
                                        multiple={true}
                                    />
                                </div>
                            </div>
                            <div className="row">
                                <div className="col-md-6 mb-3">
                                    <InputModal
                                        type="date"
                                        id="ta_startDate"
                                        label="Fecha de inicio"
                                        value={assignForm.startDate}
                                        onChange={(e) => setAssignForm({ ...assignForm, startDate: e.target.value })}
                                    />
                                </div>
                                <div className="col-md-6 mb-3">
                                    <InputModal
                                        type="date"
                                        id="ta_endDate"
                                        label="Fecha de fin"
                                        value={assignForm.endDate}
                                        onChange={(e) => setAssignForm({ ...assignForm, endDate: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="mb-3">
                                <label className="form-label">Justificacion <span className="text-danger">*</span></label>
                                <textarea
                                    className="form-control"
                                    rows="3"
                                    value={assignForm.justification}
                                    onChange={(e) => setAssignForm({ ...assignForm, justification: e.target.value })}
                                    placeholder="Minimo 30 caracteres explicando el motivo de la asignacion"
                                />
                                <small className={`${assignForm.justification.length >= 30 ? 'text-success' : 'text-muted'}`}>
                                    {assignForm.justification.length}/30 caracteres minimos
                                </small>
                            </div>
                            <div className="alert alert-info mb-0">
                                <i className="ri-information-line me-2"></i>
                                Reglas: maximo 90 dias de vigencia, maximo 3 asignaciones activas por usuario.
                                Los permisos son aditivos (no sustituyen el rol base).
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn btn-outline-secondary" data-bs-dismiss="modal">
                                Cancelar
                            </button>
                            <button type="button" className="btn btn-primary" onClick={submitAssign}
                                    disabled={assignForm.justification.length < 30}>
                                Asignar
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal Revocar */}
            <div className="modal fade" ref={modalRevokeRef} tabIndex={-1} aria-hidden="true">
                <div className="modal-dialog modal-dialog-centered">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h5 className="modal-title">Revocar permiso temporal</h5>
                            <button type="button" className="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div className="modal-body">
                            {revokeTarget && (
                                <>
                                    <p>
                                        <strong>Permiso:</strong> <code>{revokeTarget.permissionCode}</code><br/>
                                        <strong>Usuario:</strong> #{revokeTarget.userId}<br/>
                                        <strong>Vence:</strong> {revokeTarget.endDate?.slice(0, 16)?.replace('T', ' ')}
                                    </p>
                                    <div className="mb-3">
                                        <label className="form-label">Motivo de revocacion <span className="text-danger">*</span></label>
                                        <textarea
                                            className="form-control"
                                            rows="3"
                                            value={revokeReason}
                                            onChange={(e) => setRevokeReason(e.target.value)}
                                            placeholder="Minimo 30 caracteres explicando por que se revoca"
                                        />
                                        <small className={`${revokeReason.length >= 30 ? 'text-success' : 'text-muted'}`}>
                                            {revokeReason.length}/30 caracteres minimos
                                        </small>
                                    </div>
                                </>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn btn-outline-secondary" data-bs-dismiss="modal">
                                Cancelar
                            </button>
                            <button type="button" className="btn btn-danger" onClick={submitRevoke}
                                    disabled={revokeReason.length < 30}>
                                Revocar
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default IndexTemporaryPermissions;
