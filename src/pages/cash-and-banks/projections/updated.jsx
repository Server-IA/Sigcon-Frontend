import { useState } from 'react';
import InputModal from '../../../components/molecules/InputModal';
import InputSelectModal from '../../../components/molecules/inputSelectModal';
import { base_url } from '../../../utils/functions';
import { fetchHelper } from '../../../utils/fetch';

/**
 * Modal para editar una Proyeccion de Flujo de Caja existente.
 * PUT a /api/v1/bnk/projections/{id}
 */

const PERIODICITY_OPTIONS = [
    { id: 'DIARIA',     label: 'Diaria' },
    { id: 'SEMANAL',    label: 'Semanal' },
    { id: 'QUINCENAL',  label: 'Quincenal' },
    { id: 'MENSUAL',    label: 'Mensual' },
    { id: 'BIMESTRAL',  label: 'Bimestral' },
    { id: 'TRIMESTRAL', label: 'Trimestral' },
    { id: 'SEMESTRAL',  label: 'Semestral' },
    { id: 'ANUAL',      label: 'Anual' },
];

const TYPE_OPTIONS = [
    { id: 'INGRESOS', label: 'Ingresos' },
    { id: 'EGRESOS',  label: 'Egresos' },
    { id: 'NETA',     label: 'Neta' },
];

const UpdatedProjection = ({ modalRef, modalInstance, projection, setProjection, dataTableRef, setItemEdit }) => {
    const [errors, setErrors]             = useState({});
    const [errorMessage, setErrorMessage] = useState('');

    const set = (field, value) => setProjection(prev => ({ ...prev, [field]: value }));

    const handleSubmit = async () => {
        setErrors({});
        setErrorMessage('');

        const payload = {
            name:           projection.name,
            description:    projection.description || null,
            startDate:      projection.startDate,
            endDate:        projection.endDate,
            periodicity:    projection.periodicity,
            projectionType: projection.projectionType,
            initialBalance: projection.initialBalance !== '' ? Number(projection.initialBalance) : null,
            netFlow:        projection.netFlow !== '' ? Number(projection.netFlow) : null,
            currency:       projection.currency || 'COP',
        };

        try {
            await fetchHelper.put(base_url(['api', 'v1', 'bnk', 'projections', projection.id]), payload, {}, 1000, true);
            modalInstance?.current?.hide();
            setItemEdit(true);
            dataTableRef?.current?.ajax?.reload?.();
        } catch (err) {
            if (err?.errors) {
                const fieldErrors = {};
                err.errors.forEach(e => { fieldErrors[e.field] = e.message; });
                setErrors(fieldErrors);
            }
            setErrorMessage(err?.msg || err?.message || 'Error al actualizar la proyeccion.');
        }
    };

    return (
        <div className="modal fade" ref={modalRef} tabIndex="-1" aria-hidden="true">
            <div className="modal-dialog modal-lg modal-dialog-centered">
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title">
                            <i className="ri-edit-line me-2" />Editar Proyeccion
                        </h5>
                        <button type="button" className="btn-close" data-bs-dismiss="modal" />
                    </div>
                    <div className="modal-body">
                        {errorMessage && <div className="alert alert-danger py-2 mb-3">{errorMessage}</div>}

                        <div className="row">
                            <div className="col-md-6 mb-3">
                                <InputModal
                                    id="proj_u_name" label="Nombre" value={projection.name}
                                    onChange={e => set('name', e.target.value)}
                                    error={errors.name} required={true}
                                />
                            </div>
                            <div className="col-md-6 mb-3">
                                <InputModal
                                    id="proj_u_currency" label="Moneda" value={projection.currency}
                                    onChange={e => set('currency', e.target.value)}
                                    error={errors.currency}
                                />
                            </div>
                            <div className="col-md-12 mb-3">
                                <InputModal
                                    id="proj_u_desc" label="Descripcion" value={projection.description}
                                    onChange={e => set('description', e.target.value)}
                                    error={errors.description}
                                />
                            </div>
                            <div className="col-md-6 mb-3">
                                <InputModal
                                    id="proj_u_start" label="Fecha Inicio" type="date"
                                    value={projection.startDate}
                                    onChange={e => set('startDate', e.target.value)}
                                    error={errors.startDate} required={true}
                                />
                            </div>
                            <div className="col-md-6 mb-3">
                                <InputModal
                                    id="proj_u_end" label="Fecha Fin" type="date"
                                    value={projection.endDate}
                                    onChange={e => set('endDate', e.target.value)}
                                    error={errors.endDate} required={true}
                                />
                            </div>
                            <div className="col-md-6 mb-3">
                                <InputSelectModal
                                    id="proj_u_periodicity" label="Periodicidad"
                                    value={projection.periodicity}
                                    onChange={v => set('periodicity', v)}
                                    error={errors.periodicity}
                                    options={PERIODICITY_OPTIONS}
                                    placeholder="Seleccione periodicidad"
                                    required={true}
                                />
                            </div>
                            <div className="col-md-6 mb-3">
                                <InputSelectModal
                                    id="proj_u_type" label="Tipo de Proyeccion"
                                    value={projection.projectionType}
                                    onChange={v => set('projectionType', v)}
                                    error={errors.projectionType}
                                    options={TYPE_OPTIONS}
                                    placeholder="Seleccione tipo"
                                    required={true}
                                />
                            </div>
                            <div className="col-md-6 mb-3">
                                <InputModal
                                    id="proj_u_initial" label="Saldo Inicial" type="number"
                                    value={projection.initialBalance}
                                    onChange={e => set('initialBalance', e.target.value)}
                                    error={errors.initialBalance} required={true}
                                />
                            </div>
                            <div className="col-md-6 mb-3">
                                <InputModal
                                    id="proj_u_netflow" label="Flujo por periodo (magnitud)" type="number"
                                    value={projection.netFlow}
                                    onChange={e => set('netFlow', e.target.value)}
                                    error={errors.netFlow} required={true}
                                />
                                <small className="text-muted d-block mt-1">
                                    Ingrese magnitud positiva. Al cambiar Tipo o Periodicidad el saldo
                                    final se recalcula. NETA acepta positivo o negativo.
                                </small>
                            </div>
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-outline-secondary" data-bs-dismiss="modal">Cancelar</button>
                        <button type="button" className="btn btn-primary" onClick={handleSubmit}>
                            <i className="ri-save-line me-1" />Guardar Cambios
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UpdatedProjection;
