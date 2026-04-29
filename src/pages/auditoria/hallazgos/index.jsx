import { useState, useEffect } from 'react';
import { base_url } from '../../../utils/functions';
import { fetchHelper } from '../../../utils/fetch';
import AlertPage from '../../../components/molecules/AlertPage';

/**
 * HU-AU-08 E4 (2026-04-28): Pagina de hallazgos de auditoria.
 *
 * <p>Flujo: ABIERTO -> EN_REVISION -> CERRADO. Cada transicion genera un
 * evento de auditoria.
 *
 * <p>El auditor:
 * <ul>
 *   <li>Crea hallazgo nuevo vinculado a un audit log existente (estado ABIERTO)</li>
 *   <li>Pasa a EN_REVISION asignando un revisor</li>
 *   <li>Cierra con resolucion (min 10 chars)</li>
 *   <li>Elimina (solo si esta ABIERTO)</li>
 * </ul>
 */
const STATUS_BADGE = {
    ABIERTO:     { className: 'bg-label-warning', label: 'Abierto' },
    EN_REVISION: { className: 'bg-label-info',    label: 'En revision' },
    CERRADO:     { className: 'bg-label-success', label: 'Cerrado' },
};

const SEVERITY_BADGE = {
    LOW:      { className: 'bg-label-success',   label: 'Baja' },
    MEDIUM:   { className: 'bg-label-info',      label: 'Media' },
    HIGH:     { className: 'bg-label-warning',   label: 'Alta' },
    CRITICAL: { className: 'bg-label-danger',    label: 'Critica' },
};

const IndexFindings = () => {
    const [findings, setFindings] = useState({ content: [], totalElements: 0, totalPages: 0, page: 0 });
    const [loading, setLoading] = useState(false);
    const [alert, setAlert] = useState({ show: false, type: '', message: '' });
    const [statusFilter, setStatusFilter] = useState('');
    const [page, setPage] = useState(0);

    // Form crear
    const [showCreate, setShowCreate] = useState(false);
    const [form, setForm] = useState({
        auditLogId: '', title: '', description: '', severity: 'MEDIUM', assignedTo: ''
    });
    const [formErrors, setFormErrors] = useState({});

    // Modal accion (review/close)
    const [actionFinding, setActionFinding] = useState(null);
    const [actionType, setActionType] = useState(''); // 'review' | 'close'
    const [actionInput, setActionInput] = useState('');

    const load = async () => {
        setLoading(true);
        try {
            const params = { page, size: 20 };
            if (statusFilter) params.status = statusFilter;
            const url = base_url(['api', 'v1', 'audit', 'findings'], params);
            const data = await fetchHelper.get(url, {}, 0);
            setFindings(data || { content: [], totalElements: 0, totalPages: 0, page: 0 });
        } catch (err) {
            console.error(err);
            setAlert({ show: true, type: 'danger',
                message: err?.message || 'Error al cargar hallazgos' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); /* eslint-disable-next-line */ }, [page, statusFilter]);

    const handleCreate = async () => {
        setFormErrors({});
        const errors = {};
        if (!form.auditLogId) errors.auditLogId = 'ID del log de auditoria es obligatorio';
        if (!form.title || form.title.trim().length === 0) errors.title = 'Titulo es obligatorio';
        if (form.title && form.title.length > 200) errors.title = 'Titulo demasiado largo (max 200)';
        if (form.description && form.description.length > 2000) errors.description = 'Descripcion demasiado larga (max 2000)';
        if (Object.keys(errors).length) {
            setFormErrors(errors);
            return;
        }
        try {
            await fetchHelper.post(base_url(['api', 'v1', 'audit', 'findings']),
                { ...form, auditLogId: Number(form.auditLogId) }, {}, 0);
            setAlert({ show: true, type: 'success', message: 'Hallazgo creado en estado ABIERTO' });
            setShowCreate(false);
            setForm({ auditLogId: '', title: '', description: '', severity: 'MEDIUM', assignedTo: '' });
            load();
        } catch (err) {
            const msg = err?.message || err?.msg || 'No se pudo crear el hallazgo';
            setAlert({ show: true, type: 'danger', message: msg });
        }
    };

    const openAction = (f, type) => {
        setActionFinding(f);
        setActionType(type);
        setActionInput('');
    };

    const handleAction = async () => {
        if (!actionFinding) return;
        try {
            if (actionType === 'review') {
                await fetchHelper.post(
                    base_url(['api', 'v1', 'audit', 'findings', actionFinding.id, 'start-review']),
                    { reviewer: actionInput || null }, {}, 0);
                setAlert({ show: true, type: 'success', message: 'Hallazgo pasado a EN_REVISION' });
            } else if (actionType === 'close') {
                if (!actionInput || actionInput.trim().length < 10) {
                    setAlert({ show: true, type: 'warning',
                        message: 'La resolucion debe tener al menos 10 caracteres' });
                    return;
                }
                await fetchHelper.post(
                    base_url(['api', 'v1', 'audit', 'findings', actionFinding.id, 'close']),
                    { resolution: actionInput }, {}, 0);
                setAlert({ show: true, type: 'success', message: 'Hallazgo CERRADO' });
            }
            setActionFinding(null);
            setActionType('');
            setActionInput('');
            load();
        } catch (err) {
            const msg = err?.message || err?.msg || 'Error en la operacion';
            setAlert({ show: true, type: 'danger', message: msg });
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Eliminar este hallazgo? Solo se puede en estado ABIERTO.')) return;
        try {
            // QA-BLOQUE-AO (2026-04-29): firma (url, data, headers, time). Antes 500
            // se pasaba como headers -> spread sobre primitivo da {} -> sin Authorization -> 401.
            await fetchHelper.delete(base_url(['api', 'v1', 'audit', 'findings', id]), null, {}, 500);
            setAlert({ show: true, type: 'success', message: 'Hallazgo eliminado' });
            load();
        } catch (err) {
            const msg = err?.message || err?.msg || 'No se pudo eliminar';
            setAlert({ show: true, type: 'danger', message: msg });
        }
    };

    const renderBadge = (map, value) => {
        const cfg = map[value] || { className: 'bg-label-secondary', label: value };
        return <span className={`badge ${cfg.className}`}>{cfg.label}</span>;
    };

    return (
        <div className="card">
            <h5 className="card-header d-flex justify-content-between align-items-center">
                <span><i className="ri-flag-2-line me-2"></i> Hallazgos de Auditoria</span>
                <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(!showCreate)}>
                    <i className="ri-add-line me-1"></i>
                    {showCreate ? 'Cancelar' : 'Nuevo hallazgo'}
                </button>
            </h5>
            <div className="card-body">
                <AlertPage message={alert.message} type={alert.type} show={alert.show}
                           onChange={() => setAlert({ show: false, type: '', message: '' })} />

                {showCreate && (
                    <div className="border rounded p-3 mb-3 bg-light">
                        <h6 className="mb-3">Registrar nuevo hallazgo</h6>
                        <div className="row g-2">
                            <div className="col-md-3">
                                <label className="form-label small">ID Audit Log *</label>
                                <input type="number" className={`form-control form-control-sm ${formErrors.auditLogId ? 'is-invalid' : ''}`}
                                       value={form.auditLogId}
                                       onChange={(e) => setForm({ ...form, auditLogId: e.target.value })} />
                                {formErrors.auditLogId && <small className="text-danger">{formErrors.auditLogId}</small>}
                            </div>
                            <div className="col-md-2">
                                <label className="form-label small">Severidad</label>
                                <select className="form-select form-select-sm" value={form.severity}
                                        onChange={(e) => setForm({ ...form, severity: e.target.value })}>
                                    <option value="LOW">Baja</option>
                                    <option value="MEDIUM">Media</option>
                                    <option value="HIGH">Alta</option>
                                    <option value="CRITICAL">Critica</option>
                                </select>
                            </div>
                            <div className="col-md-7">
                                <label className="form-label small">Titulo *</label>
                                <input type="text" className={`form-control form-control-sm ${formErrors.title ? 'is-invalid' : ''}`}
                                       maxLength={200}
                                       placeholder="Ej: Eliminacion sospechosa de tercero con facturas activas"
                                       value={form.title}
                                       onChange={(e) => setForm({ ...form, title: e.target.value })} />
                                {formErrors.title && <small className="text-danger">{formErrors.title}</small>}
                            </div>
                            <div className="col-12">
                                <label className="form-label small">Descripcion</label>
                                <textarea className={`form-control form-control-sm ${formErrors.description ? 'is-invalid' : ''}`}
                                          rows={3} maxLength={2000}
                                          value={form.description}
                                          onChange={(e) => setForm({ ...form, description: e.target.value })} />
                                {formErrors.description && <small className="text-danger">{formErrors.description}</small>}
                            </div>
                            <div className="col-md-6">
                                <label className="form-label small">Asignar a (email del revisor, opcional)</label>
                                <input type="email" className="form-control form-control-sm"
                                       placeholder="auditor@empresa.test"
                                       value={form.assignedTo}
                                       onChange={(e) => setForm({ ...form, assignedTo: e.target.value })} />
                            </div>
                            <div className="col-md-6 d-flex align-items-end">
                                <button className="btn btn-success btn-sm" onClick={handleCreate}>
                                    <i className="ri-save-line me-1"></i> Crear hallazgo
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <div className="row mb-3">
                    <div className="col-md-3">
                        <label className="form-label small">Filtrar por estado</label>
                        <select className="form-select form-select-sm" value={statusFilter}
                                onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}>
                            <option value="">Todos</option>
                            <option value="ABIERTO">Abierto</option>
                            <option value="EN_REVISION">En revision</option>
                            <option value="CERRADO">Cerrado</option>
                        </select>
                    </div>
                </div>

                <div className="table-responsive">
                    <table className="table table-hover">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Audit Log</th>
                                <th>Titulo</th>
                                <th>Severidad</th>
                                <th>Estado</th>
                                <th>Abierto por</th>
                                <th>Asignado a</th>
                                <th>Fecha</th>
                                <th className="text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading && <tr><td colSpan="9" className="text-center py-4">
                                <div className="spinner-border text-primary"></div>
                            </td></tr>}
                            {!loading && findings.content.length === 0 && (
                                <tr><td colSpan="9" className="text-center text-muted py-4">
                                    No hay hallazgos registrados con los filtros aplicados
                                </td></tr>
                            )}
                            {!loading && findings.content.map(f => (
                                <tr key={f.id}>
                                    <td>#{f.id}</td>
                                    <td><a href={`/auditoria/logs/${f.auditLogId}`}>#{f.auditLogId}</a></td>
                                    <td><small>{f.title}</small></td>
                                    <td>{renderBadge(SEVERITY_BADGE, f.severity)}</td>
                                    <td>{renderBadge(STATUS_BADGE, f.status)}</td>
                                    <td><small>{f.openedBy}</small></td>
                                    <td><small>{f.assignedTo || '-'}</small></td>
                                    <td><small>{f.openedAt?.replace('T',' ').substring(0,16)}</small></td>
                                    <td className="text-center">
                                        {f.status === 'ABIERTO' && (
                                            <>
                                                <button className="btn btn-sm btn-label-info me-1"
                                                        title="Pasar a en revision"
                                                        onClick={() => openAction(f, 'review')}>
                                                    <i className="ri-search-eye-line"></i>
                                                </button>
                                                <button className="btn btn-sm btn-label-danger"
                                                        title="Eliminar"
                                                        onClick={() => handleDelete(f.id)}>
                                                    <i className="ri-delete-bin-line"></i>
                                                </button>
                                            </>
                                        )}
                                        {f.status === 'EN_REVISION' && (
                                            <button className="btn btn-sm btn-label-success"
                                                    title="Cerrar con resolucion"
                                                    onClick={() => openAction(f, 'close')}>
                                                <i className="ri-checkbox-circle-line"></i>
                                            </button>
                                        )}
                                        {f.status === 'CERRADO' && <small className="text-muted">-</small>}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="d-flex justify-content-between align-items-center mt-3">
                    <small className="text-muted">
                        Mostrando {findings.content.length} de {findings.totalElements} hallazgos
                    </small>
                    <div>
                        <button className="btn btn-sm btn-outline-secondary me-2"
                                disabled={page === 0}
                                onClick={() => setPage(p => p - 1)}>
                            <i className="ri-arrow-left-s-line"></i>
                        </button>
                        <span className="mx-2">Pagina {page + 1} de {findings.totalPages || 1}</span>
                        <button className="btn btn-sm btn-outline-secondary ms-2"
                                disabled={page >= (findings.totalPages - 1)}
                                onClick={() => setPage(p => p + 1)}>
                            <i className="ri-arrow-right-s-line"></i>
                        </button>
                    </div>
                </div>
            </div>

            {/* Modal accion */}
            {actionFinding && (
                <div className="modal fade show" style={{display:'block', backgroundColor:'rgba(0,0,0,0.5)'}}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">
                                    {actionType === 'review' ? 'Asignar revisor' : 'Cerrar hallazgo'}
                                </h5>
                                <button type="button" className="btn-close"
                                        onClick={() => setActionFinding(null)}></button>
                            </div>
                            <div className="modal-body">
                                <p><strong>Hallazgo:</strong> #{actionFinding.id} - {actionFinding.title}</p>
                                {actionType === 'review' && (
                                    <>
                                        <label className="form-label">Email del revisor (opcional)</label>
                                        <input type="email" className="form-control"
                                               placeholder="revisor@empresa.test"
                                               value={actionInput}
                                               onChange={(e) => setActionInput(e.target.value)} />
                                    </>
                                )}
                                {actionType === 'close' && (
                                    <>
                                        <label className="form-label">
                                            Resolucion / Conclusion <small className="text-danger">(min 10 caracteres)</small>
                                        </label>
                                        <textarea className="form-control" rows={4}
                                                  placeholder="Describa la conclusion del hallazgo..."
                                                  value={actionInput}
                                                  onChange={(e) => setActionInput(e.target.value)} />
                                        <small className="text-muted">
                                            {actionInput.length}/10 caracteres minimos
                                        </small>
                                    </>
                                )}
                            </div>
                            <div className="modal-footer">
                                <button className="btn btn-outline-secondary"
                                        onClick={() => setActionFinding(null)}>Cancelar</button>
                                <button className="btn btn-primary" onClick={handleAction}>
                                    {actionType === 'review' ? 'Pasar a EN_REVISION' : 'Cerrar hallazgo'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default IndexFindings;
