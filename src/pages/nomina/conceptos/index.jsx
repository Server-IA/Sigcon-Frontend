import { useEffect, useState } from 'react';
import { base_url } from '../../../utils/functions';
import { fetchHelper } from '../../../utils/fetch';
import AlertPage from '../../../components/molecules/AlertPage';

/**
 * HU-NOM-02: Listado y gestion de conceptos de nomina.
 *
 * <p>Muestra los 17 conceptos legales colombianos precargados + los que
 * el admin agregue. Permite activar/inactivar y editar porcentajes/cuentas PUC.
 */
const IndexConceptos = () => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [alert, setAlert] = useState({ show: false, type: '', message: '' });
    const [filters, setFilters] = useState({ type: '', status: '' });
    const [editing, setEditing] = useState(null);
    // HU-NOM-02 DEF#1 (2026-04-28): crear concepto custom desde UI
    const [creating, setCreating] = useState(null);
    const [accounts, setAccounts] = useState([]);

    const emptyConcept = () => ({
        code: '', name: '', conceptType: 'EARNING',
        baseCalculation: 'SALARY', percentage: '', fixedAmount: '',
        formulaExpression: '', accountingAccountDebitId: null,
        accountingAccountCreditId: null, legalReference: '', status: 'ACTIVE',
    });

    const load = async () => {
        setLoading(true);
        try {
            const qs = {};
            if (filters.type) qs.type = filters.type;
            if (filters.status) qs.status = filters.status;
            const data = await fetchHelper.get(base_url(['api', 'nomina', 'conceptos'], qs), {}, 0);
            setItems(Array.isArray(data) ? data : []);
        } catch (err) {
            setAlert({ show: true, type: 'danger', message: 'Error al cargar conceptos' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

    // HU-NOM-02 DEF#1: cargar cuentas contables ACTIVAS para el dropdown
    useEffect(() => {
        fetchHelper.post(base_url(['api', 'v1', 'accounting-accounts']),
                { start: 0, length: -1, draw: 1 }, {}, 0)
            .then(resp => {
                const list = resp?.data ?? resp ?? [];
                const arr = Array.isArray(list) ? list : (list?.data || []);
                if (Array.isArray(arr)) {
                    setAccounts(arr.filter(a => a.status === 'ACTIVE').map(a => ({
                        id: a.id,
                        label: `${a.pucAccount?.code || a.puc_id || a.id} - ${a.customName || a.pucAccount?.name || ''}`.trim(),
                    })));
                }
            }).catch(() => {});
    }, []);

    const typeBadge = (t) => {
        const map = {
            EARNING: ['bg-label-success', 'Devengado'],
            DEDUCTION: ['bg-label-warning', 'Deducción'],
            EMPLOYER_CONTRIBUTION: ['bg-label-info', 'Aporte patronal'],
        };
        const [cls, lbl] = map[t] || ['bg-label-secondary', t || '-'];
        return <span className={`badge ${cls}`}>{lbl}</span>;
    };

    const toggleStatus = async (item) => {
        try {
            const newStatus = item.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
            await fetchHelper.put(base_url(['api', 'nomina', 'conceptos', item.id]), {
                ...item, status: newStatus,
            }, {}, 0);
            setAlert({ show: true, type: 'success', message: `Concepto ${newStatus === 'ACTIVE' ? 'activado' : 'inactivado'}.` });
            load();
        } catch (err) {
            setAlert({ show: true, type: 'danger', message: err?.msg || 'No se pudo cambiar el estado.' });
        }
    };

    const startEdit = (item) => {
        setEditing({ ...item });
    };

    const saveEdit = async () => {
        try {
            await fetchHelper.put(base_url(['api', 'nomina', 'conceptos', editing.id]), editing, {}, 0);
            setAlert({ show: true, type: 'success', message: 'Concepto actualizado.' });
            setEditing(null);
            load();
        } catch (err) {
            setAlert({ show: true, type: 'danger', message: err?.msg || 'No se pudo actualizar el concepto.' });
        }
    };

    // HU-NOM-02 DEF#1: crear concepto custom
    const saveCreate = async () => {
        try {
            const body = {
                ...creating,
                code: (creating.code || '').toUpperCase().trim(),
                percentage: creating.percentage === '' ? null : Number(creating.percentage),
                fixedAmount: creating.fixedAmount === '' ? null : Number(creating.fixedAmount),
            };
            await fetchHelper.post(base_url(['api', 'nomina', 'conceptos']), body, {}, 0);
            setAlert({ show: true, type: 'success',
                message: `Concepto "${body.code}" creado correctamente.` });
            setCreating(null);
            load();
        } catch (err) {
            setAlert({ show: true, type: 'danger',
                message: err?.msg || err?.message || 'No se pudo crear el concepto.' });
        }
    };

    const canSubmitCreate = creating
        && (creating.code || '').match(/^[A-Z][A-Z0-9_]{1,49}$/)
        && (creating.name || '').trim()
        && (creating.conceptType || '').trim();

    return (
        <div className="card">
            <h5 className="card-header">
                <i className="ri-list-settings-line me-2"></i>Conceptos de nómina
                <small className="d-block text-muted mt-1">
                    Catálogo de devengados, deducciones y aportes patronales (HU-NOM-02)
                </small>
            </h5>
            <div className="card-body">
                <AlertPage type={alert.type} message={alert.message} show={alert.show}
                        onChange={() => setAlert({ show: false, type: '', message: '' })} />

                <div className="row g-3 mb-3">
                    <div className="col-md-3">
                        <label className="form-label">Tipo</label>
                        <select className="form-select" value={filters.type}
                                onChange={e => setFilters({ ...filters, type: e.target.value })}>
                            <option value="">Todos</option>
                            <option value="EARNING">Devengado</option>
                            <option value="DEDUCTION">Deducción</option>
                            <option value="EMPLOYER_CONTRIBUTION">Aporte patronal</option>
                        </select>
                    </div>
                    <div className="col-md-3">
                        <label className="form-label">Estado</label>
                        <select className="form-select" value={filters.status}
                                onChange={e => setFilters({ ...filters, status: e.target.value })}>
                            <option value="">Todos</option>
                            <option value="ACTIVE">Activos</option>
                            <option value="INACTIVE">Inactivos</option>
                        </select>
                    </div>
                    <div className="col-md-3 d-flex align-items-end">
                        <button className="btn btn-outline-primary w-100" onClick={load}>
                            <i className="ri-filter-line me-1"></i> Filtrar
                        </button>
                    </div>
                    <div className="col-md-3 d-flex align-items-end">
                        <button className="btn btn-primary w-100" onClick={() => setCreating(emptyConcept())}>
                            <i className="ri-add-line me-1"></i> Crear concepto
                        </button>
                    </div>
                </div>

                <div className="table-responsive">
                    <table className="table table-hover">
                        <thead>
                            <tr>
                                <th>Código</th>
                                <th>Nombre</th>
                                <th>Tipo</th>
                                <th className="text-end">%</th>
                                <th>Ref. legal</th>
                                <th>Estado</th>
                                <th className="text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading && <tr><td colSpan="7" className="text-center py-4">
                                <div className="spinner-border text-primary"></div>
                            </td></tr>}
                            {!loading && items.length === 0 && (
                                <tr><td colSpan="7" className="text-center text-muted py-4">
                                    Sin conceptos registrados
                                </td></tr>
                            )}
                            {!loading && items.map(c => (
                                <tr key={c.id}>
                                    <td><code>{c.code}</code></td>
                                    <td>{c.name}</td>
                                    <td>{typeBadge(c.conceptType)}</td>
                                    <td className="text-end">
                                        {c.percentage != null ? `${c.percentage}%` : '-'}
                                    </td>
                                    <td><small>{c.legalReference || '-'}</small></td>
                                    <td>
                                        <span className={`badge ${c.status === 'ACTIVE' ? 'bg-label-success' : 'bg-label-secondary'}`}>
                                            {c.status}
                                        </span>
                                    </td>
                                    <td className="text-center">
                                        <button className="btn btn-sm btn-label-primary me-1"
                                                onClick={() => startEdit(c)} title="Editar">
                                            <i className="ri-edit-line"></i>
                                        </button>
                                        <button className={`btn btn-sm ${c.status === 'ACTIVE' ? 'btn-label-warning' : 'btn-label-success'}`}
                                                onClick={() => toggleStatus(c)}
                                                title={c.status === 'ACTIVE' ? 'Inactivar' : 'Activar'}>
                                            <i className={c.status === 'ACTIVE' ? 'ri-forbid-line' : 'ri-check-line'}></i>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* HU-NOM-02 DEF#1: crear concepto custom */}
                {creating && (
                    <div className="modal show fade d-block" tabIndex="-1"
                            style={{ background: 'rgba(0,0,0,.5)' }}>
                        <div className="modal-dialog modal-lg">
                            <div className="modal-content">
                                <div className="modal-header">
                                    <h5 className="modal-title">
                                        <i className="ri-add-line me-2"></i>Nuevo concepto de nómina
                                    </h5>
                                    <button type="button" className="btn-close"
                                            onClick={() => setCreating(null)}></button>
                                </div>
                                <div className="modal-body">
                                    <div className="alert alert-info py-2 small">
                                        Defina conceptos personalizados (bonificaciones, comisiones, descuentos
                                        especiales). Los conceptos legales colombianos ya estan precargados.
                                    </div>
                                    <div className="row g-3">
                                        <div className="col-md-4">
                                            <label className="form-label">Código *</label>
                                            <input type="text" className="form-control"
                                                    value={creating.code}
                                                    onChange={e => setCreating({ ...creating, code: e.target.value.toUpperCase() })}
                                                    placeholder="BONIF_DESEMPENO" />
                                            <small className="text-muted">MAYÚSCULAS, _, sin espacios</small>
                                        </div>
                                        <div className="col-md-8">
                                            <label className="form-label">Nombre *</label>
                                            <input type="text" className="form-control"
                                                    value={creating.name}
                                                    onChange={e => setCreating({ ...creating, name: e.target.value })}
                                                    placeholder="Bonificación por desempeño" />
                                        </div>
                                        <div className="col-md-4">
                                            <label className="form-label">Tipo *</label>
                                            <select className="form-select" value={creating.conceptType}
                                                    onChange={e => setCreating({ ...creating, conceptType: e.target.value })}>
                                                <option value="EARNING">Devengado</option>
                                                <option value="DEDUCTION">Deducción</option>
                                                <option value="EMPLOYER_CONTRIBUTION">Aporte patronal</option>
                                            </select>
                                        </div>
                                        <div className="col-md-4">
                                            <label className="form-label">Base de cálculo</label>
                                            <select className="form-select" value={creating.baseCalculation || ''}
                                                    onChange={e => setCreating({ ...creating, baseCalculation: e.target.value })}>
                                                <option value="SALARY">Salario base</option>
                                                <option value="IBC">IBC (Ingreso Base Cotización)</option>
                                                <option value="FIXED">Monto fijo</option>
                                                <option value="CUSTOM">Fórmula custom</option>
                                            </select>
                                        </div>
                                        <div className="col-md-4">
                                            <label className="form-label">Porcentaje (%)</label>
                                            <input type="number" step="0.01" className="form-control"
                                                    value={creating.percentage}
                                                    onChange={e => setCreating({ ...creating, percentage: e.target.value })}
                                                    placeholder="4.00" />
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label">Cuenta PUC débito</label>
                                            <select className="form-select" value={creating.accountingAccountDebitId || ''}
                                                    onChange={e => setCreating({ ...creating, accountingAccountDebitId: e.target.value ? Number(e.target.value) : null })}>
                                                <option value="">— Sin asignar —</option>
                                                {accounts.map(a => (
                                                    <option key={a.id} value={a.id}>{a.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label">Cuenta PUC crédito</label>
                                            <select className="form-select" value={creating.accountingAccountCreditId || ''}
                                                    onChange={e => setCreating({ ...creating, accountingAccountCreditId: e.target.value ? Number(e.target.value) : null })}>
                                                <option value="">— Sin asignar —</option>
                                                {accounts.map(a => (
                                                    <option key={a.id} value={a.id}>{a.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="col-md-12">
                                            <label className="form-label">Referencia legal</label>
                                            <input type="text" className="form-control"
                                                    value={creating.legalReference}
                                                    onChange={e => setCreating({ ...creating, legalReference: e.target.value })}
                                                    placeholder="CST Art. 127, Ley 100/1993..." />
                                        </div>
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-label-secondary"
                                            onClick={() => setCreating(null)}>Cancelar</button>
                                    <button type="button" className="btn btn-primary"
                                            disabled={!canSubmitCreate}
                                            onClick={saveCreate}>
                                        <i className="ri-save-line me-1"></i> Crear concepto
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {editing && (
                    <div className="modal show fade d-block" tabIndex="-1"
                            style={{ background: 'rgba(0,0,0,.5)' }}>
                        <div className="modal-dialog">
                            <div className="modal-content">
                                <div className="modal-header">
                                    <h5 className="modal-title">Editar concepto: {editing.code}</h5>
                                    <button type="button" className="btn-close" onClick={() => setEditing(null)}></button>
                                </div>
                                <div className="modal-body">
                                    <div className="mb-2">
                                        <label className="form-label">Nombre</label>
                                        <input type="text" className="form-control" value={editing.name}
                                                onChange={e => setEditing({ ...editing, name: e.target.value })} />
                                    </div>
                                    <div className="mb-2">
                                        <label className="form-label">Porcentaje (%)</label>
                                        <input type="number" step="0.01" className="form-control"
                                                value={editing.percentage || ''}
                                                onChange={e => setEditing({ ...editing, percentage: e.target.value ? Number(e.target.value) : null })} />
                                    </div>
                                    <div className="mb-2">
                                        <label className="form-label">Cuenta PUC débito (ID)</label>
                                        <input type="number" className="form-control"
                                                value={editing.accountingAccountDebitId || ''}
                                                onChange={e => setEditing({ ...editing, accountingAccountDebitId: e.target.value ? Number(e.target.value) : null })} />
                                    </div>
                                    <div className="mb-2">
                                        <label className="form-label">Cuenta PUC crédito (ID)</label>
                                        <input type="number" className="form-control"
                                                value={editing.accountingAccountCreditId || ''}
                                                onChange={e => setEditing({ ...editing, accountingAccountCreditId: e.target.value ? Number(e.target.value) : null })} />
                                    </div>
                                    <div className="mb-2">
                                        <label className="form-label">Referencia legal</label>
                                        <input type="text" className="form-control"
                                                value={editing.legalReference || ''}
                                                onChange={e => setEditing({ ...editing, legalReference: e.target.value })} />
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-label-secondary" onClick={() => setEditing(null)}>Cancelar</button>
                                    <button type="button" className="btn btn-primary" onClick={saveEdit}>Guardar</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default IndexConceptos;
