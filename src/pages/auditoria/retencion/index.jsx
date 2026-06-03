import { useState, useEffect, useRef } from 'react';
import { base_url } from '../../../utils/functions';
import { fetchHelper } from '../../../utils/fetch';
import AlertPage from '../../../components/molecules/AlertPage';
import { severityLabel, moduleLabel,
         MODULE_OPTIONS, SEVERITY_OPTIONS } from '../../../utils/auditLabels';
import { usePermissions } from '../../../utils/hooks/usePermissions';

/**
 * HU-AU-10: Gestión de políticas de retención + legal hold + purga manual.
 *
 * <p>Pestañas:
 * <ul>
 *   <li>Políticas: CRUD de políticas (días de retención por módulo+severidad)</li>
 *   <li>Purga: ejecutar purga manual + ver historial de purgas con batch_hash</li>
 *   <li>Estado: KPIs del ciclo de vida</li>
 * </ul>
 */
const IndexRetention = () => {
    const [tab, setTab] = useState('policies');
    const [policies, setPolicies] = useState([]);
    const [purgeRecords, setPurgeRecords] = useState([]);
    const [status, setStatus] = useState({});
    const [loading, setLoading] = useState(false);
    const [alert, setAlert] = useState({ show: false, type: '', message: '' });
    const empty = {
        name: '', description: '', matchModule: '', matchSeverity: '',
        retentionDays: 365, legalBasis: '', enabled: true
    };
    const [form, setForm] = useState(empty);
    const [editingId, setEditingId] = useState(null);

    // QA Auditoria (2026-06-02): retencion legal MASIVA (por modulo / severidad /
    // periodo contable). HU-AU-08: "todos los registros de un periodo o de un modulo".
    const { hasAny } = usePermissions();
    const canLegalHold = hasAny(['AU.RETENCION.LEGAL_HOLD', 'LEGAL_HOLD']);
    const emptyBulk = { module: '', severity: '', dateFrom: '', dateTo: '', reason: '' };
    const [bulk, setBulk] = useState(emptyBulk);
    const [bulkBusy, setBulkBusy] = useState(false);

    // QA Bloque AU (2026-05-25): el alta/edicion de politicas se hace en un modal
    // desplegable (como el resto de modulos), no en un form inline poco intuitivo.
    const modalRef = useRef(null);
    const modalInstance = useRef(null);
    const ensureModal = () => {
        if (!modalInstance.current && modalRef.current) {
            modalInstance.current = new window.bootstrap.Modal(modalRef.current);
        }
        return modalInstance.current;
    };
    const openCreate = () => {
        setForm(empty);
        setEditingId(null);
        ensureModal()?.show();
    };
    const closeModal = () => { modalInstance.current?.hide(); };

    const loadAll = async () => {
        setLoading(true);
        try {
            const [pol, purg, st] = await Promise.all([
                fetchHelper.get(base_url(['api', 'v1', 'audit', 'retention', 'policies']), {}, 0),
                fetchHelper.get(base_url(['api', 'v1', 'audit', 'retention', 'purge', 'records']), {}, 0),
                fetchHelper.get(base_url(['api', 'v1', 'audit', 'retention', 'status']), {}, 0)
            ]);
            setPolicies(Array.isArray(pol) ? pol : []);
            setPurgeRecords(Array.isArray(purg) ? purg : []);
            setStatus(st || {});
        } catch (err) {
            setAlert({ show: true, type: 'danger', message: 'Error al cargar datos de retención' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadAll(); }, []);

    const submit = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                name: form.name,
                description: form.description,
                matchModule: form.matchModule || null,
                matchSeverity: form.matchSeverity || null,
                retentionDays: Number(form.retentionDays),
                legalBasis: form.legalBasis,
                enabled: form.enabled
            };
            const baseUrl = base_url(['api', 'v1', 'audit', 'retention', 'policies']);
            if (editingId) {
                await fetchHelper.put(`${baseUrl}/${editingId}`, payload, {}, 0);
                setAlert({ show: true, type: 'success', message: 'Política actualizada' });
            } else {
                await fetchHelper.post(baseUrl, payload, {}, 0);
                setAlert({ show: true, type: 'success', message: 'Política creada' });
            }
            setForm(empty);
            setEditingId(null);
            closeModal();
            loadAll();
        } catch (err) {
            setAlert({ show: true, type: 'danger', message: err?.msg || err?.message || 'Error al guardar' });
        }
    };

    const edit = (p) => {
        setForm({
            name: p.name, description: p.description || '',
            matchModule: p.matchModule || '', matchSeverity: p.matchSeverity || '',
            retentionDays: p.retentionDays, legalBasis: p.legalBasis || '',
            enabled: p.enabled
        });
        setEditingId(p.id);
        ensureModal()?.show();
    };

    const cancel = () => { setForm(empty); setEditingId(null); closeModal(); };

    const removePolicy = async (p) => {
        if (!window.confirm(`¿Eliminar política "${p.name}"?`)) return;
        try {
            await fetchHelper.delete(base_url(['api', 'v1', 'audit', 'retention', 'policies', p.id]), {}, {}, 0);
            setAlert({ show: true, type: 'success', message: 'Política eliminada' });
            loadAll();
        } catch (err) {
            setAlert({ show: true, type: 'danger', message: 'No se pudo eliminar' });
        }
    };

    const runPurge = async () => {
        if (!window.confirm('¿Ejecutar purga manual? Esta acción marca como archivados todos los logs con retención vencida.')) return;
        try {
            const result = await fetchHelper.post(base_url(['api', 'v1', 'audit', 'retention', 'purge', 'run']), {}, {}, 0);
            // HU-AU-08: purgados = result.purged; los excluidos por retención legal
            // activa vienen en result.legalHoldMessage (mensaje específico de la HU).
            const purged = result.purged ?? result.recordsPurged ?? 0;
            let msg = purged
                ? `Purga ejecutada: ${purged} log(s) archivado(s)` +
                  (result.batchHash ? ` (batch_hash: ${result.batchHash.substring(0, 16)}...)` : '')
                : 'Purga ejecutada: sin candidatos en este momento';
            if (result.legalHoldMessage) {
                msg += ` — ${result.legalHoldMessage}`;
            }
            setAlert({ show: true, type: result.legalHoldMessage ? 'warning' : 'success', message: msg });
            loadAll();
        } catch (err) {
            setAlert({ show: true, type: 'danger', message: err?.msg || 'Error en purga' });
        }
    };

    /**
     * HU-AU-10 E6: descarga el PDF de evidencia de un lote de purga. El endpoint
     * existe (GET /retention/purge/records/{id}/pdf) pero el historial no lo
     * invocaba. Usa fetch directo (con token) porque fetchHelper no maneja blobs.
     */
    const downloadPurgePdf = async (id) => {
        try {
            const url = base_url(['api', 'v1', 'audit', 'retention', 'purge', 'records', id, 'pdf']);
            const token = localStorage.getItem('token');
            const resp = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
            if (!resp.ok) {
                const t = await resp.text();
                let m; try { m = JSON.parse(t)?.message; } catch { m = t; }
                setAlert({ show: true, type: 'danger', message: m || 'No se pudo generar el PDF de la purga' });
                return;
            }
            const blob = await resp.blob();
            const dl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = dl;
            a.download = `evidencia-purga-${id}.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(dl);
            setAlert({ show: true, type: 'success', message: 'PDF de evidencia descargado' });
        } catch (err) {
            console.error(err);
            setAlert({ show: true, type: 'danger', message: 'No se pudo generar el PDF de la purga' });
        }
    };

    // QA Auditoria (2026-06-02): legal hold masivo por criterios.
    const buildBulkBody = () => {
        const b = {};
        if (bulk.module) b.module = bulk.module;
        if (bulk.severity) b.severity = bulk.severity;
        if (bulk.dateFrom) b.dateFrom = bulk.dateFrom + 'T00:00:00';
        if (bulk.dateTo) b.dateTo = bulk.dateTo + 'T23:59:59';
        return b;
    };
    const hasBulkCriteria = () => bulk.module || bulk.severity || bulk.dateFrom || bulk.dateTo;

    const applyBulkLegalHold = async () => {
        if (!bulk.reason || !bulk.reason.trim()) {
            setAlert({ show: true, type: 'danger', message: 'Debe indicar el motivo de la retención legal masiva.' });
            return;
        }
        if (!hasBulkCriteria()) {
            setAlert({ show: true, type: 'danger', message: 'Especifique al menos un criterio (módulo, severidad o rango de fechas).' });
            return;
        }
        setBulkBusy(true);
        try {
            const body = { ...buildBulkBody(), reason: bulk.reason.trim() };
            const r = await fetchHelper.post(base_url(['api', 'v1', 'audit', 'retention', 'legal-hold', 'bulk']), body, {}, 0);
            setAlert({ show: true, type: 'success',
                message: `Retención legal aplicada a ${r.affected ?? 0} de ${r.matched ?? 0} registros que coinciden.` });
            loadAll();
        } catch (err) {
            setAlert({ show: true, type: 'danger', message: err?.msg || err?.message || 'No se pudo aplicar la retención legal masiva.' });
        } finally { setBulkBusy(false); }
    };

    const releaseBulkLegalHold = async () => {
        if (!hasBulkCriteria()) {
            setAlert({ show: true, type: 'danger', message: 'Especifique al menos un criterio para liberar.' });
            return;
        }
        if (!window.confirm('¿Liberar la retención legal de todos los registros que coinciden con los criterios?')) return;
        setBulkBusy(true);
        try {
            const r = await fetchHelper.post(base_url(['api', 'v1', 'audit', 'retention', 'legal-hold', 'bulk', 'release']), buildBulkBody(), {}, 0);
            setAlert({ show: true, type: 'success',
                message: `Retención legal liberada en ${r.affected ?? 0} de ${r.matched ?? 0} registros.` });
            loadAll();
        } catch (err) {
            setAlert({ show: true, type: 'danger', message: err?.msg || err?.message || 'No se pudo liberar la retención legal.' });
        } finally { setBulkBusy(false); }
    };

    return (
        <div>
            <h5 className="mb-3"><i className="ri-archive-line me-2"></i>Retención y Purga de Logs</h5>

            <AlertPage message={alert.message} type={alert.type} show={alert.show}
                       onChange={() => setAlert({ show: false, type: '', message: '' })} />

            {/* KPIs estado */}
            <div className="row g-3 mb-4">
                <div className="col-md-3">
                    <div className="card bg-label-primary">
                        <div className="card-body text-center">
                            <i className="ri-database-2-line ri-24px"></i>
                            <div className="small mt-1">Total logs</div>
                            <h4 className="mb-0">{status.totalLogs || 0}</h4>
                        </div>
                    </div>
                </div>
                <div className="col-md-3">
                    <div className="card bg-label-warning">
                        <div className="card-body text-center">
                            <i className="ri-lock-line ri-24px"></i>
                            <div className="small mt-1">Con legal hold</div>
                            <h4 className="mb-0">{status.legalHoldCount || 0}</h4>
                        </div>
                    </div>
                </div>
                <div className="col-md-3">
                    <div className="card bg-label-info">
                        <div className="card-body text-center">
                            <i className="ri-flag-line ri-24px"></i>
                            <div className="small mt-1">Políticas activas</div>
                            <h4 className="mb-0">{status.activePolicies || 0}</h4>
                        </div>
                    </div>
                </div>
                <div className="col-md-3">
                    <div className="card bg-label-success">
                        <div className="card-body text-center">
                            <i className="ri-archive-line ri-24px"></i>
                            <div className="small mt-1">Purgas registradas</div>
                            <h4 className="mb-0">{status.recentPurges || 0}</h4>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <ul className="nav nav-tabs mb-3">
                <li className="nav-item">
                    <button className={`nav-link ${tab === 'policies' ? 'active' : ''}`}
                            onClick={() => setTab('policies')}>
                        <i className="ri-flag-line me-1"></i> Políticas de retención
                    </button>
                </li>
                <li className="nav-item">
                    <button className={`nav-link ${tab === 'purge' ? 'active' : ''}`}
                            onClick={() => setTab('purge')}>
                        <i className="ri-delete-bin-line me-1"></i> Purga manual + historial
                    </button>
                </li>
                {canLegalHold && (
                    <li className="nav-item">
                        <button className={`nav-link ${tab === 'legalhold' ? 'active' : ''}`}
                                onClick={() => setTab('legalhold')}>
                            <i className="ri-scales-3-line me-1"></i> Retención legal masiva
                        </button>
                    </li>
                )}
            </ul>

            {tab === 'policies' && (
                <div className="card">
                    <div className="card-body">
                        <div className="d-flex justify-content-end mb-3">
                            <button type="button" className="btn btn-primary btn-sm" onClick={openCreate}>
                                <i className="ri-add-line me-1"></i> Crear política
                            </button>
                        </div>

                        <div className="table-responsive">
                            <table className="table table-hover">
                                <thead>
                                    <tr>
                                        <th>Nombre</th>
                                        <th>Match módulo</th>
                                        <th>Match severidad</th>
                                        <th className="text-end">Días</th>
                                        <th>Base legal</th>
                                        <th>Estado</th>
                                        <th className="text-center">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {policies.length === 0 && <tr><td colSpan="7" className="text-center text-muted">Sin políticas</td></tr>}
                                    {policies.map(p => (
                                        <tr key={p.id}>
                                            <td>
                                                <div>{p.name}</div>
                                                <small className="text-muted">{p.description}</small>
                                            </td>
                                            <td>{moduleLabel(p.matchModule) || <em className="text-muted">todos</em>}</td>
                                            <td>{severityLabel(p.matchSeverity) || <em className="text-muted">todas</em>}</td>
                                            <td className="text-end fw-bold">{p.retentionDays}</td>
                                            <td><small>{p.legalBasis}</small></td>
                                            <td>
                                                {p.enabled
                                                    ? <span className="badge bg-label-success">Activa</span>
                                                    : <span className="badge bg-label-secondary">Inactiva</span>}
                                            </td>
                                            <td className="text-center">
                                                <button className="btn btn-sm btn-label-primary me-1" onClick={() => edit(p)}>
                                                    <i className="ri-edit-line"></i>
                                                </button>
                                                <button className="btn btn-sm btn-label-danger" onClick={() => removePolicy(p)}>
                                                    <i className="ri-delete-bin-5-line"></i>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {tab === 'purge' && (
                <div className="card">
                    <div className="card-body">
                        <div className="d-flex justify-content-between align-items-center mb-3">
                            <div>
                                <h6 className="mb-1">Purga manual</h6>
                                <small className="text-muted">
                                    Marca como archivados los logs con retención vencida + sin retención legal activa.
                                    Genera evidencia con hash SHA-256 del lote, descargable en PDF desde el historial.
                                </small>
                            </div>
                            <button className="btn btn-warning" onClick={runPurge}>
                                <i className="ri-delete-bin-line me-1"></i> Ejecutar purga ahora
                            </button>
                        </div>

                        <h6 className="mt-4 mb-2">Historial de purgas</h6>
                        <div className="table-responsive">
                            <table className="table table-sm table-hover">
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Fecha</th>
                                        <th className="text-end">Registros</th>
                                        <th>Rango temporal</th>
                                        <th>Batch hash</th>
                                        <th>Ejecutado por</th>
                                        <th className="text-center">PDF</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {purgeRecords.length === 0 && <tr><td colSpan="7" className="text-center text-muted">Sin purgas registradas</td></tr>}
                                    {purgeRecords.map(p => (
                                        <tr key={p.id}>
                                            <td>#{p.id}</td>
                                            <td><small>{p.purgeDate?.replace('T', ' ').substring(0, 19)}</small></td>
                                            <td className="text-end fw-bold">{p.recordsPurged}</td>
                                            <td><small>
                                                {p.oldestPurged?.substring(0, 10)} → {p.newestPurged?.substring(0, 10)}
                                            </small></td>
                                            <td><code className="small">{p.batchHash?.substring(0, 16)}...</code></td>
                                            <td><small>{p.executedBy}</small></td>
                                            <td className="text-center">
                                                <button className="btn btn-sm btn-label-danger"
                                                        onClick={() => downloadPurgePdf(p.id)}
                                                        title="Descargar PDF de evidencia">
                                                    <i className="ri-file-pdf-line"></i>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {tab === 'legalhold' && canLegalHold && (
                <div className="card">
                    <div className="card-body">
                        <h6 className="mb-1"><i className="ri-scales-3-line me-1"></i> Retención legal masiva</h6>
                        <p className="text-muted small">
                            Aplica (o libera) retención legal a <strong>todos los registros que coinciden</strong> con
                            los criterios: por módulo, severidad y/o rango de fechas (= período contable). Los registros
                            con retención legal activa quedan protegidos de la purga. Requiere motivo.
                        </p>
                        <div className="row g-3">
                            <div className="col-md-3">
                                <label className="form-label small">Módulo</label>
                                <select className="form-select form-select-sm" value={bulk.module}
                                        onChange={(e) => setBulk({ ...bulk, module: e.target.value })}>
                                    <option value="">(todos)</option>
                                    {MODULE_OPTIONS.map(o => (
                                        <option key={o.code} value={o.code}>{o.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="col-md-3">
                                <label className="form-label small">Severidad</label>
                                <select className="form-select form-select-sm" value={bulk.severity}
                                        onChange={(e) => setBulk({ ...bulk, severity: e.target.value })}>
                                    <option value="">(todas)</option>
                                    {SEVERITY_OPTIONS.map(o => (
                                        <option key={o.code} value={o.code}>{o.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="col-md-3">
                                <label className="form-label small">Desde</label>
                                <input type="date" className="form-control form-control-sm" value={bulk.dateFrom}
                                       onChange={(e) => setBulk({ ...bulk, dateFrom: e.target.value })} />
                            </div>
                            <div className="col-md-3">
                                <label className="form-label small">Hasta</label>
                                <input type="date" className="form-control form-control-sm" value={bulk.dateTo}
                                       onChange={(e) => setBulk({ ...bulk, dateTo: e.target.value })} />
                            </div>
                            <div className="col-md-12">
                                <label className="form-label small">Motivo (obligatorio para aplicar)</label>
                                <input type="text" className="form-control form-control-sm"
                                       placeholder="ej: Proceso judicial 1234 / requerimiento DIAN"
                                       value={bulk.reason}
                                       onChange={(e) => setBulk({ ...bulk, reason: e.target.value })} />
                            </div>
                        </div>
                        <div className="d-flex gap-2 mt-3">
                            <button className="btn btn-warning btn-sm" disabled={bulkBusy} onClick={applyBulkLegalHold}>
                                {bulkBusy
                                    ? <span className="spinner-border spinner-border-sm me-1"></span>
                                    : <i className="ri-lock-line me-1"></i>}
                                Aplicar retención legal
                            </button>
                            <button className="btn btn-outline-secondary btn-sm" disabled={bulkBusy} onClick={releaseBulkLegalHold}>
                                <i className="ri-lock-unlock-line me-1"></i> Liberar retención legal
                            </button>
                            <button className="btn btn-link btn-sm" disabled={bulkBusy} onClick={() => setBulk(emptyBulk)}>
                                Limpiar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* QA Bloque AU (2026-05-25): modal de alta/edicion de politica de retencion */}
            <div className="modal fade" ref={modalRef} tabIndex="-1">
                <div className="modal-dialog modal-lg modal-dialog-centered">
                    <div className="modal-content">
                        <form onSubmit={submit}>
                            <div className="modal-header">
                                <h5 className="modal-title">
                                    <i className="ri-flag-line me-2"></i>
                                    {editingId ? 'Editar política de retención' : 'Crear política de retención'}
                                </h5>
                                <button type="button" className="btn-close" data-bs-dismiss="modal"
                                        onClick={cancel}></button>
                            </div>
                            <div className="modal-body">
                                <div className="row g-3">
                                    <div className="col-md-6">
                                        <label className="form-label small">Nombre *</label>
                                        <input type="text" className="form-control form-control-sm" required
                                               value={form.name}
                                               onChange={(e) => setForm({...form, name: e.target.value})} />
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label small">Descripción</label>
                                        <input type="text" className="form-control form-control-sm"
                                               value={form.description}
                                               onChange={(e) => setForm({...form, description: e.target.value})} />
                                    </div>
                                    <div className="col-md-4">
                                        <label className="form-label small">Match módulo</label>
                                        <select className="form-select form-select-sm" value={form.matchModule}
                                                onChange={(e) => setForm({...form, matchModule: e.target.value})}>
                                            <option value="">(todos)</option>
                                            {MODULE_OPTIONS.map(o => (
                                                <option key={o.code} value={o.code}>{o.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="col-md-4">
                                        <label className="form-label small">Match severidad</label>
                                        <select className="form-select form-select-sm" value={form.matchSeverity}
                                                onChange={(e) => setForm({...form, matchSeverity: e.target.value})}>
                                            <option value="">(todas)</option>
                                            {SEVERITY_OPTIONS.map(o => (
                                                <option key={o.code} value={o.code}>{o.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="col-md-4">
                                        <label className="form-label small">Días retención *</label>
                                        <input type="number" min="1" className="form-control form-control-sm" required
                                               value={form.retentionDays}
                                               onChange={(e) => setForm({...form, retentionDays: e.target.value})} />
                                    </div>
                                    <div className="col-md-12">
                                        <label className="form-label small">Norma legal de respaldo</label>
                                        <input type="text" className="form-control form-control-sm"
                                               placeholder="ej: Decreto 2649/1993 Art. 134"
                                               value={form.legalBasis}
                                               onChange={(e) => setForm({...form, legalBasis: e.target.value})} />
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-label-secondary btn-sm" onClick={cancel}>
                                    Cancelar
                                </button>
                                <button type="submit" className="btn btn-primary btn-sm">
                                    {editingId ? 'Actualizar' : 'Crear política'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default IndexRetention;
