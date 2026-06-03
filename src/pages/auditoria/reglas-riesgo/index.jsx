import { useState, useEffect } from 'react';
import { base_url } from '../../../utils/functions';
import { fetchHelper } from '../../../utils/fetch';
import AlertPage from '../../../components/molecules/AlertPage';
import { actionLabel, severityLabel, moduleLabel, entityLabel,
         MODULE_LABELS, ACTION_OPTIONS, SEVERITY_OPTIONS } from '../../../utils/auditLabels';

/**
 * HU-AU-04 E1 (2026-04-28): mapa de entidades auditables por modulo. Cuando el
 * admin selecciona un modulo, el dropdown de "Match entidad" muestra solo las
 * entidades validas de ese modulo. Esto refleja el alcance real del listener
 * AuditEventListener + AuditPublisher de cada submodulo.
 */
const ENTITIES_BY_MODULE = {
    PA:  ['User', 'Role', 'Module', 'Menu', 'Parameter', 'ReportTemplate', 'ReportType', 'SystemWithholdingAssignment'],
    TER: ['ThirdParty', 'CommercialData', 'EclSegmentation', 'ThirdPartyBankAccount'],
    CFG: ['AccountingAccount', 'ChartOfAccount', 'CostCenter', 'ExchangeRate', 'RuleTax', 'DepretationRule', 'CurrencyType'],
    ACT: ['Asset', 'AssetDisposal', 'NiifVerification'],
    AP:  ['Invoice', 'ApPayment', 'ApAdvance', 'ApNote', 'PurchaseOrder', 'GoodsReceipt', 'InvoiceAttachment'],
    AR:  ['SalesInvoice', 'ArPayment', 'ArAdvance', 'ArNote', 'DianResolution', 'SalesInvoiceAttachment'],
    BNK: ['Bank', 'BankAccount', 'BankBranch', 'Checkbook', 'Check', 'Cash', 'CashAudit', 'FinancialMovement', 'BankReconciliationSession', 'CashFlowProjection'],
    CG:  ['JournalEntry', 'AccountingPeriod', 'JournalEntrySupport', 'VoucherSeriesConfig', 'ClosingEntry'],
    NOM: ['Employee', 'PayrollConcept', 'PayrollReceipt', 'PayrollLine', 'BenefitLiquidation'],
    INT: ['IntegrationBatch', 'IntegrationTransfer'],
    AU:  ['AuditLog', 'AuditRiskRule', 'AuditRetentionPolicy', 'AuditPurgeRecord'],
};

/**
 * HU-AU-04: CRUD de reglas configurables de clasificación por riesgo.
 *
 * <p>El admin define reglas (módulo + acción + tipo entidad → severidad)
 * que sobrescriben la clasificación estática automática. Las reglas se evalúan
 * en orden de prioridad descendente.
 */
const IndexRiskRules = () => {
    const [rules, setRules] = useState([]);
    const [loading, setLoading] = useState(false);
    const [alert, setAlert] = useState({ show: false, type: '', message: '' });
    const empty = {
        name: '', description: '',
        matchModule: '', matchAction: '', matchEntityType: '',
        severity: 'MEDIUM', priority: 100, enabled: true
    };
    const [form, setForm] = useState(empty);
    const [editingId, setEditingId] = useState(null);
    // HU-AU-04 E1 (QA Bloque AJ-AU): paginacion cliente del listado de reglas.
    const [page, setPage] = useState(1);
    const pageSize = 10;

    const load = async () => {
        setLoading(true);
        try {
            const url = base_url(['api', 'v1', 'audit', 'risk-rules']);
            const data = await fetchHelper.get(url, {}, 0);
            setRules(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error(err);
            setAlert({ show: true, type: 'danger', message: 'Error al cargar reglas' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const submit = async (e) => {
        e.preventDefault();
        // AU-RF-03: la prioridad es un entero entre 1 y 1000.
        const prio = Number(form.priority);
        if (!Number.isInteger(prio) || prio < 1 || prio > 1000) {
            setAlert({ show: true, type: 'danger',
                message: 'La prioridad debe ser un entero entre 1 y 1000.' });
            return;
        }
        try {
            const payload = {
                name: form.name,
                description: form.description,
                matchModule: form.matchModule || null,
                matchAction: form.matchAction || null,
                matchEntityType: form.matchEntityType || null,
                severity: form.severity,
                priority: Number(form.priority),
                enabled: form.enabled
            };
            const baseUrl = base_url(['api', 'v1', 'audit', 'risk-rules']);
            if (editingId) {
                await fetchHelper.put(`${baseUrl}/${editingId}`, payload, {}, 0);
                setAlert({ show: true, type: 'success', message: 'Regla actualizada' });
            } else {
                await fetchHelper.post(baseUrl, payload, {}, 0);
                setAlert({ show: true, type: 'success', message: 'Regla creada' });
            }
            setForm(empty);
            setEditingId(null);
            load();
        } catch (err) {
            setAlert({ show: true, type: 'danger', message: err?.msg || 'Error al guardar' });
        }
    };

    const edit = (rule) => {
        setForm({
            name: rule.name, description: rule.description || '',
            matchModule: rule.matchModule || '', matchAction: rule.matchAction || '',
            matchEntityType: rule.matchEntityType || '',
            severity: rule.severity, priority: rule.priority, enabled: rule.enabled
        });
        setEditingId(rule.id);
    };

    const cancel = () => { setForm(empty); setEditingId(null); };

    const toggle = async (id) => {
        try {
            await fetchHelper.post(base_url(['api', 'v1', 'audit', 'risk-rules', id, 'toggle']), {}, {}, 0);
            load();
        } catch (err) {
            setAlert({ show: true, type: 'danger', message: 'No se pudo toggle' });
        }
    };

    const remove = async (rule) => {
        if (!window.confirm(`¿Eliminar regla "${rule.name}"?`)) return;
        try {
            await fetchHelper.delete(base_url(['api', 'v1', 'audit', 'risk-rules', rule.id]), {}, {}, 0);
            setAlert({ show: true, type: 'success', message: 'Regla eliminada' });
            load();
        } catch (err) {
            setAlert({ show: true, type: 'danger', message: 'No se pudo eliminar' });
        }
    };

    const sevBadge = (s) => {
        const map = { LOW: 'bg-label-success', MEDIUM: 'bg-label-info', HIGH: 'bg-label-warning', CRITICAL: 'bg-label-danger' };
        return <span className={`badge ${map[s] || 'bg-label-secondary'}`}>{severityLabel(s)}</span>;
    };

    return (
        <div className="card">
            <h5 className="card-header">
                <i className="ri-flag-line me-2"></i> Reglas de Riesgo Configurables
            </h5>
            <div className="card-body">
                <AlertPage message={alert.message} type={alert.type} show={alert.show}
                           onChange={() => setAlert({ show: false, type: '', message: '' })} />

                <p className="text-muted small mb-1">
                    Las reglas activas se evalúan en orden de <strong>prioridad descendente</strong> y la primera
                    que matchea sobrescribe la severidad por defecto. A igual prioridad gana la regla más reciente.
                    Dejar un campo Match en blanco = comodín (cualquier valor).
                </p>
                <p className="text-muted small">
                    <strong>Prioridad (1–1000):</strong> 1–99 reglas de fondo · 100–199 generales (por defecto) ·
                    200–499 específicas · 500–999 críticas/regulatorias. Use múltiplos de 10 para dejar espacio
                    a reglas intermedias futuras.
                </p>

                <form onSubmit={submit} className="bg-light p-3 mb-4 rounded">
                    <div className="row g-2">
                        <div className="col-md-4">
                            <label className="form-label small">Nombre *</label>
                            <input type="text" className="form-control form-control-sm" required
                                   value={form.name}
                                   onChange={(e) => setForm({...form, name: e.target.value})} />
                        </div>
                        <div className="col-md-4">
                            <label className="form-label small">Descripción</label>
                            <input type="text" className="form-control form-control-sm"
                                   value={form.description}
                                   onChange={(e) => setForm({...form, description: e.target.value})} />
                        </div>
                        <div className="col-md-2">
                            <label className="form-label small">Severidad *</label>
                            <select className="form-select form-select-sm" value={form.severity}
                                    onChange={(e) => setForm({...form, severity: e.target.value})}>
                                {SEVERITY_OPTIONS.map(o => (
                                    <option key={o.code} value={o.code}>{o.label}</option>
                                ))}
                            </select>
                        </div>
                        <div className="col-md-2">
                            <label className="form-label small">Prioridad (1–1000)</label>
                            <input type="number" min="1" max="1000" step="10"
                                   className="form-control form-control-sm"
                                   value={form.priority}
                                   onChange={(e) => setForm({...form, priority: e.target.value})} />
                        </div>
                        <div className="col-md-3">
                            <label className="form-label small">Match módulo</label>
                            <select className="form-select form-select-sm" value={form.matchModule}
                                    onChange={(e) => setForm({...form, matchModule: e.target.value})}>
                                <option value="">(cualquiera)</option>
                                {Object.keys(MODULE_LABELS).map(code => (
                                    <option key={code} value={code}>{MODULE_LABELS[code]}</option>
                                ))}
                            </select>
                        </div>
                        <div className="col-md-3">
                            <label className="form-label small">Match acción</label>
                            <select className="form-select form-select-sm" value={form.matchAction}
                                    onChange={(e) => setForm({...form, matchAction: e.target.value})}>
                                <option value="">(cualquiera)</option>
                                {ACTION_OPTIONS.map(o => (
                                    <option key={o.code} value={o.code}>{o.label}</option>
                                ))}
                            </select>
                        </div>
                        <div className="col-md-3">
                            <label className="form-label small">Match entidad (opcional)</label>
                            {/* HU-AU-04 E1 (2026-04-28): dropdown contextual segun el modulo
                                seleccionado. Si no hay modulo, queda como input libre.  */}
                            <select className="form-select form-select-sm"
                                    value={form.matchEntityType}
                                    onChange={(e) => setForm({...form, matchEntityType: e.target.value})}
                                    disabled={!form.matchModule}>
                                <option value="">(cualquiera)</option>
                                {ENTITIES_BY_MODULE[form.matchModule]?.map(e => (
                                    <option key={e} value={e}>{entityLabel(e)}</option>
                                ))}
                            </select>
                            {!form.matchModule && (
                                <small className="text-muted">Seleccione primero un módulo</small>
                            )}
                        </div>
                        <div className="col-md-3 d-flex align-items-end gap-2">
                            <button type="submit" className="btn btn-primary btn-sm">
                                {editingId ? 'Actualizar' : 'Crear'}
                            </button>
                            {editingId && (
                                <button type="button" className="btn btn-label-secondary btn-sm" onClick={cancel}>
                                    Cancelar
                                </button>
                            )}
                        </div>
                    </div>
                </form>

                <div className="table-responsive">
                    <table className="table table-hover">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Prioridad</th>
                                <th>Nombre</th>
                                <th>Match módulo</th>
                                <th>Match acción</th>
                                <th>Match entidad</th>
                                <th>Severidad</th>
                                <th>Estado</th>
                                <th className="text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading && <tr><td colSpan="9" className="text-center"><div className="spinner-border text-primary"></div></td></tr>}
                            {!loading && rules.length === 0 && <tr><td colSpan="9" className="text-center text-muted">Sin reglas configuradas</td></tr>}
                            {!loading && rules.slice((page - 1) * pageSize, page * pageSize).map(r => (
                                <tr key={r.id}>
                                    <td>#{r.id}</td>
                                    <td>{r.priority}</td>
                                    <td>
                                        <div>{r.name}</div>
                                        <small className="text-muted">{r.description}</small>
                                    </td>
                                    <td>{moduleLabel(r.matchModule) || <em className="text-muted">cualquiera</em>}</td>
                                    <td>{actionLabel(r.matchAction) || <em className="text-muted">cualquiera</em>}</td>
                                    <td>{entityLabel(r.matchEntityType) || <em className="text-muted">cualquiera</em>}</td>
                                    <td>{sevBadge(r.severity)}</td>
                                    <td>
                                        {r.enabled
                                            ? <span className="badge bg-label-success">Activa</span>
                                            : <span className="badge bg-label-secondary">Inactiva</span>}
                                    </td>
                                    <td className="text-center">
                                        <button className="btn btn-sm btn-label-primary me-1"
                                                onClick={() => edit(r)} title="Editar">
                                            <i className="ri-edit-line"></i>
                                        </button>
                                        <button className="btn btn-sm btn-label-warning me-1"
                                                onClick={() => toggle(r.id)} title="Activar/desactivar">
                                            <i className={r.enabled ? "ri-pause-line" : "ri-play-line"}></i>
                                        </button>
                                        <button className="btn btn-sm btn-label-danger"
                                                onClick={() => remove(r)} title="Eliminar">
                                            <i className="ri-delete-bin-5-line"></i>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* HU-AU-04 E1: paginacion del listado de reglas */}
                {!loading && rules.length > pageSize && (() => {
                    const totalPages = Math.ceil(rules.length / pageSize);
                    const cur = Math.min(page, totalPages);
                    return (
                        <div className="d-flex justify-content-between align-items-center mt-2">
                            <small className="text-muted">
                                Mostrando {(cur - 1) * pageSize + 1}–{Math.min(cur * pageSize, rules.length)} de {rules.length} reglas
                            </small>
                            <nav>
                                <ul className="pagination pagination-sm mb-0">
                                    <li className={`page-item ${cur === 1 ? 'disabled' : ''}`}>
                                        <button className="page-link" onClick={() => setPage(cur - 1)}>«</button>
                                    </li>
                                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                                        <li key={p} className={`page-item ${p === cur ? 'active' : ''}`}>
                                            <button className="page-link" onClick={() => setPage(p)}>{p}</button>
                                        </li>
                                    ))}
                                    <li className={`page-item ${cur === totalPages ? 'disabled' : ''}`}>
                                        <button className="page-link" onClick={() => setPage(cur + 1)}>»</button>
                                    </li>
                                </ul>
                            </nav>
                        </div>
                    );
                })()}
            </div>
        </div>
    );
};

export default IndexRiskRules;
