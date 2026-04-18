import { useEffect, useState } from 'react';
import { base_url } from '../../../utils/functions';
import { fetchHelper } from '../../../utils/fetch';

/**
 * HU-NOM-01: Modal unico para crear o editar un empleado de nomina.
 *
 * <p>Si {@code empleado} viene null -> crear. Si viene con id -> editar.
 *
 * <p>Si el usuario modifica baseSalary durante edicion, el backend exige
 * salaryChangeReason (HU-NOM-01 E3). Este form muestra el campo condicionalmente.
 */
const EmpleadoForm = ({ modalRef, modalInstance, empleado, onSaved }) => {
    const [form, setForm] = useState({
        documentType: 'CC',
        documentNumber: '',
        fullName: '',
        position: '',
        contractType: 'INDEFINIDO',
        baseSalary: '',
        hireDate: '',
        eps: '',
        pensionFund: '',
        arl: '',
        compensationBox: '',
        costCenterId: '',
        salaryChangeReason: '',
    });
    const [originalSalary, setOriginalSalary] = useState(null);
    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [costCenters, setCostCenters] = useState([]);

    // Cargar catalogo de centros de costo
    useEffect(() => {
        fetchHelper.post(base_url(['api', 'v1', 'cost-centers', 'search']),
                { start: 0, length: -1, draw: 1 }, {}, 0)
            .then(resp => {
                const list = resp?.data ?? resp ?? [];
                if (Array.isArray(list)) {
                    setCostCenters(list.map(cc => ({
                        id: cc.id,
                        name: `${cc.code || cc.id} - ${cc.name || ''}`.trim(),
                    })));
                }
            })
            .catch(() => {});
    }, []);

    useEffect(() => {
        if (empleado) {
            setForm({
                documentType: empleado.documentType || 'CC',
                documentNumber: empleado.documentNumber || '',
                fullName: empleado.fullName || '',
                position: empleado.position || '',
                contractType: empleado.contractType || 'INDEFINIDO',
                baseSalary: empleado.baseSalary || '',
                hireDate: empleado.hireDate || '',
                eps: empleado.eps || '',
                pensionFund: empleado.pensionFund || '',
                arl: empleado.arl || '',
                compensationBox: empleado.compensationBox || '',
                costCenterId: empleado.costCenterId || '',
                salaryChangeReason: '',
            });
            setOriginalSalary(empleado.baseSalary);
        } else {
            setForm({
                documentType: 'CC', documentNumber: '', fullName: '', position: '',
                contractType: 'INDEFINIDO', baseSalary: '', hireDate: '',
                eps: '', pensionFund: '', arl: '', compensationBox: '',
                costCenterId: '', salaryChangeReason: '',
            });
            setOriginalSalary(null);
        }
        setErrors({});
    }, [empleado]);

    const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

    const salaryChanged = empleado && originalSalary != null
            && String(form.baseSalary) !== String(originalSalary);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const body = {
                ...form,
                baseSalary: form.baseSalary ? Number(form.baseSalary) : null,
                costCenterId: form.costCenterId ? Number(form.costCenterId) : null,
            };
            if (!salaryChanged) delete body.salaryChangeReason;
            let resp;
            if (empleado?.id) {
                resp = await fetchHelper.put(
                        base_url(['api', 'nomina', 'empleados', empleado.id]), body, {}, 0);
            } else {
                resp = await fetchHelper.post(
                        base_url(['api', 'nomina', 'empleados']), body, {}, 0);
            }
            onSaved(empleado?.id ? 'Empleado actualizado correctamente.' : 'Empleado creado correctamente.');
        } catch (err) {
            setErrors({ form: err?.msg || err?.message || 'Error al guardar el empleado.' });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="modal fade" ref={modalRef} tabIndex="-1">
            <div className="modal-dialog modal-xl modal-dialog-scrollable">
                <form onSubmit={handleSubmit}>
                    <div className="modal-content">
                        <div className="modal-header">
                            <h5 className="modal-title">
                                <i className="ri-user-3-line me-2"></i>
                                {empleado?.id ? 'Editar empleado' : 'Crear empleado'}
                            </h5>
                            <button type="button" className="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div className="modal-body">
                            {errors.form && <div className="alert alert-danger">{errors.form}</div>}

                            <div className="row g-3">
                                <div className="col-md-3">
                                    <label className="form-label">Tipo doc.</label>
                                    <select className="form-select" value={form.documentType}
                                            onChange={e => set('documentType', e.target.value)}>
                                        <option value="CC">CC</option>
                                        <option value="CE">CE</option>
                                        <option value="TI">TI</option>
                                        <option value="PAS">PAS</option>
                                        <option value="NIT">NIT</option>
                                    </select>
                                </div>
                                <div className="col-md-4">
                                    <label className="form-label">Número de documento</label>
                                    <input type="text" className="form-control" value={form.documentNumber}
                                            onChange={e => set('documentNumber', e.target.value)} required />
                                </div>
                                <div className="col-md-5">
                                    <label className="form-label">Nombre completo</label>
                                    <input type="text" className="form-control" value={form.fullName}
                                            onChange={e => set('fullName', e.target.value)} required />
                                </div>

                                <div className="col-md-6">
                                    <label className="form-label">Cargo</label>
                                    <input type="text" className="form-control" value={form.position}
                                            onChange={e => set('position', e.target.value)} />
                                </div>
                                <div className="col-md-3">
                                    <label className="form-label">Tipo de contrato</label>
                                    <select className="form-select" value={form.contractType}
                                            onChange={e => set('contractType', e.target.value)}>
                                        <option value="INDEFINIDO">Indefinido</option>
                                        <option value="FIJO">Término fijo</option>
                                        <option value="OBRA_LABOR">Obra o labor</option>
                                        <option value="PRESTACION_SERVICIOS">Prestación servicios</option>
                                    </select>
                                </div>
                                <div className="col-md-3">
                                    <label className="form-label">Fecha ingreso</label>
                                    <input type="date" className="form-control" value={form.hireDate || ''}
                                            onChange={e => set('hireDate', e.target.value)} />
                                </div>

                                <div className="col-md-4">
                                    <label className="form-label">Salario base (COP) *</label>
                                    <input type="number" step="0.01" min="0" className="form-control"
                                            value={form.baseSalary}
                                            onChange={e => set('baseSalary', e.target.value)} required />
                                    <small className="text-muted">Debe ser &ge; SMLV vigente</small>
                                </div>
                                <div className="col-md-4">
                                    <label className="form-label">EPS *</label>
                                    <input type="text" className="form-control" value={form.eps}
                                            onChange={e => set('eps', e.target.value)} required
                                            placeholder="Sura EPS, Compensar, etc." />
                                </div>
                                <div className="col-md-4">
                                    <label className="form-label">Fondo de pensión *</label>
                                    <input type="text" className="form-control" value={form.pensionFund}
                                            onChange={e => set('pensionFund', e.target.value)} required
                                            placeholder="Porvenir, Protección, etc." />
                                </div>

                                <div className="col-md-4">
                                    <label className="form-label">ARL</label>
                                    <input type="text" className="form-control" value={form.arl}
                                            onChange={e => set('arl', e.target.value)} />
                                </div>
                                <div className="col-md-4">
                                    <label className="form-label">Caja de compensación</label>
                                    <input type="text" className="form-control" value={form.compensationBox}
                                            onChange={e => set('compensationBox', e.target.value)} />
                                </div>
                                <div className="col-md-4">
                                    <label className="form-label">Centro de costo</label>
                                    <select className="form-select" value={form.costCenterId}
                                            onChange={e => set('costCenterId', e.target.value)}>
                                        <option value="">Seleccione un centro de costo</option>
                                        {costCenters.map(cc => (
                                            <option key={cc.id} value={cc.id}>{cc.name}</option>
                                        ))}
                                    </select>
                                </div>

                                {salaryChanged && (
                                    <div className="col-12">
                                        <div className="alert alert-warning mb-2">
                                            <i className="ri-information-line me-2"></i>
                                            Detectamos un cambio en el salario base ($
                                            {originalSalary} → ${form.baseSalary}). Indique el motivo
                                            (HU-NOM-01 E3). Se registrará en el historial salarial.
                                        </div>
                                        <label className="form-label">Motivo del cambio salarial *</label>
                                        <textarea className="form-control" rows="2" required
                                                value={form.salaryChangeReason}
                                                onChange={e => set('salaryChangeReason', e.target.value)}
                                                placeholder="Aumento por cumplimiento de metas, ajuste anual, etc." />
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn btn-label-secondary" data-bs-dismiss="modal">
                                Cancelar
                            </button>
                            <button type="submit" className="btn btn-primary" disabled={submitting}>
                                {submitting && <span className="spinner-border spinner-border-sm me-2"></span>}
                                {empleado?.id ? 'Actualizar' : 'Crear'}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EmpleadoForm;
