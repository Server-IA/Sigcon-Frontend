import InputModal from "../../../components/molecules/InputModal";
import InputSelectModal from "../../../components/molecules/inputSelectModal";

import { useState, useEffect } from "react";
import { fetchHelper } from "../../../utils/fetch";
import { base_url } from "../../../utils/functions";
import InputDate from "../../../components/molecules/InputDate";

// ─── Constantes ────────────────────────────────────────────────────────────────
const DEPRECIATION_TYPES = [
    { id: 'LINEAR', label: 'Lineal' },
    { id: 'DECLINING_BALANCE', label: 'Decreciente' },
    { id: 'ACCELERATED', label: 'Acelerada' },
    { id: 'PRODUCTION_UNITS', label: 'Unidades de producción' },
    { id: 'MINIMUN_USEFUL_LIFE', label: 'Vida útil mínima' },
];

const RULE_STATUSES = [
    { id: 'ACTIVE', label: 'Activa' },
    { id: 'INACTIVE', label: 'Inactiva' },
];

// ─── Componente principal ───────────────────────────────────────────────────────
const UpdatedDepreciationRule = ({ modalRef, modalInstance, rule, setRule, dataTableRef, setRuleEdit }) => {

    const [errors, setErrors] = useState({});
    const [errorMessage, setErrorMessage] = useState('');

    const [ruleUpdated, setRuleUpdated] = useState({
        id: '',
        name: '',
        depretationType: '',
        depretationRate: '',
        usefulLifeYears: '',
        residualValue: '',
        effectiveDate: '',
        status: 'ACTIVE',
    });

    // Sincronizar datos cuando el modal se abre con una regla
    useEffect(() => {
        setRuleUpdated({
            id: rule.id ?? '',
            name: rule.name ?? '',
            depretationType: rule.depretationType ?? '',
            depretationRate: rule.depretationRate ?? '',
            usefulLifeYears: rule.usefulLifeYears ?? '',
            residualValue: rule.residualValue ?? '',
            effectiveDate: rule.effectiveDate ?? '',
            status: rule.status ?? 'ACTIVE',
        });
        setErrors({});
        setErrorMessage('');
    }, [rule]);

    useEffect(() => {
        console.log(ruleUpdated, 'ruleUpdated');
    }, [ruleUpdated]);

    // ── Enviar actualización ──
    const handleUpdate = async () => {
        try {
            const url = base_url(['api', 'v1', 'depreciation-rules', 'update']);
            const payload = {
                id: Number(ruleUpdated.id),
                name: ruleUpdated.name,
                depretationType: ruleUpdated.depretationType,
                depretationRate: Number(ruleUpdated.depretationRate),
                usefulLifeYears: Number(ruleUpdated.usefulLifeYears),
                residualValue: Number(ruleUpdated.residualValue),
                effectiveDate: ruleUpdated.effectiveDate,
                status: ruleUpdated.status,
            };
            await fetchHelper.put(url, payload, {}, 1000);

            setRule({
                id: '',
                name: '',
                depretationType: '',
                depretationRate: '',
                usefulLifeYears: '',
                residualValue: '',
                effectiveDate: '',
                status: 'ACTIVE',
            });

            dataTableRef?.current?.ajax.reload();
            modalInstance?.current?.hide();
            setRuleEdit(true);
            setErrors({});
            setErrorMessage('');
        } catch (error) {
            console.error('Error al actualizar regla de depreciación:', error);
            const errores = error?.errors;
            if (errores && errores.length > 0) {
                const fieldErrors = {};
                errores.forEach(err => { fieldErrors[err.field] = err.message; });
                setErrors(fieldErrors);
            } else if (error?.msg) {
                setErrorMessage(error.msg);
            }
        }
    };

    return (
        <div className="modal fade" ref={modalRef} tabIndex={-1} aria-hidden="true">
            <div className="modal-dialog modal-lg modal-dialog-centered" role="document">
                <div className="modal-content">
                    <div className="modal-header">
                        <h4 className="modal-title">Editar Regla de Depreciación</h4>
                        <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close" />
                    </div>

                    <div className="modal-body">

                        {/* Alert de error general */}
                        <div className={`alert alert-danger alert-dismissible ${errorMessage === '' ? 'd-none' : ''}`} role="alert">
                            <button type="button" className="btn-close" onClick={() => setErrorMessage('')} aria-label="Close" />
                            <span>{errorMessage}</span>
                        </div>

                        {/* ID (solo lectura) + Nombre */}
                        <div className="row">
                            {/* <div className="col-md-4 mb-4 mt-2">
                                <div style={{ cursor: 'not-allowed' }}>
                                    <InputModal
                                        type="text"
                                        id="dr_id_update"
                                        label="Identificador único"
                                        value={ruleUpdated.id}
                                        onChange={() => { }}
                                        error=""
                                        placeholder=""
                                        disabled={true}
                                        readOnly={true}
                                    />
                                </div>
                            </div> */}
                            <div className="col mb-4 mt-2">
                                <InputModal
                                    type="text"
                                    id="dr_name_update"
                                    label="Nombre de la regla"
                                    value={ruleUpdated.name}
                                    onChange={(e) => setRuleUpdated({ ...ruleUpdated, name: e.target.value })}
                                    error={errors.name}
                                    placeholder="Ej. Depreciación equipos de cómputo"
                                    required={true}
                                />
                            </div>
                        </div>

                        {/* Tipo de depreciación + Estado */}
                        <div className="row">
                            <div className="col-md-6 mb-4 mt-2">
                                <InputSelectModal
                                    id="dr_depreciationType_update"
                                    label="Tipo de depreciación"
                                    value={ruleUpdated.depretationType}
                                    onChange={(value) => setRuleUpdated({ ...ruleUpdated, depretationType: value })}
                                    error={errors.depretationType}
                                    placeholder="Seleccione el tipo"
                                    options={DEPRECIATION_TYPES}
                                    required={true}
                                />
                            </div>
                            <div className="col-md-6 mb-4 mt-2">
                                <InputSelectModal
                                    id="dr_status_update"
                                    label="Estado de la regla"
                                    value={ruleUpdated.status}
                                    onChange={(value) => setRuleUpdated({ ...ruleUpdated, status: value })}
                                    error={errors.status}
                                    placeholder="Seleccione el estado"
                                    options={RULE_STATUSES}
                                    required={true}
                                />
                            </div>
                        </div>

                        {/* Tasa + Vida útil + Valor residual */}
                        <div className="row">
                            <div className="col-lg-4 col-md-12 col-sm-12 mb-4 mt-2">
                                <InputModal
                                    type="number"
                                    id="dr_depreciationRate_update"
                                    label="Tasa de depreciación (%)"
                                    value={ruleUpdated.depretationRate}
                                    onChange={(e) => setRuleUpdated({ ...ruleUpdated, depretationRate: e.target.value })}
                                    error={errors.depretationRate}
                                    placeholder="Ej. 20.00"
                                    required={true}
                                />
                            </div>
                            <div className="col-lg-4 col-md-12 col-sm-12 mb-4 mt-2">
                                <InputModal
                                    type="number"
                                    id="dr_usefulLife_update"
                                    label="Vida útil (años)"
                                    value={ruleUpdated.usefulLifeYears}
                                    onChange={(e) => setRuleUpdated({ ...ruleUpdated, usefulLifeYears: e.target.value })}
                                    error={errors.usefulLifeYears}
                                    placeholder="Ej. 5"
                                    required={true}
                                />
                            </div>
                            <div className="col-lg-4 col-md-12 col-sm-12 mb-4 mt-2">
                                <InputModal
                                    type="number"
                                    id="dr_residualValue_update"
                                    label="Valor residual"
                                    value={ruleUpdated.residualValue}
                                    onChange={(e) => setRuleUpdated({ ...ruleUpdated, residualValue: e.target.value })}
                                    error={errors.residualValue}
                                    placeholder="Ej. 0.00"
                                    required={true}
                                />
                            </div>
                        </div>

                    </div>{/* /modal-body */}

                    <div className="modal-footer">
                        <button type="button" className="btn btn-primary" onClick={handleUpdate}>
                            Guardar cambios
                        </button>
                        <button type="button" className="btn btn-outline-secondary ms-auto" data-bs-dismiss="modal">
                            Cerrar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UpdatedDepreciationRule;
