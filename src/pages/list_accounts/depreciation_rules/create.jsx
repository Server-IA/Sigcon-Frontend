import { useState, useEffect } from 'react';

import InputModal from "../../../components/molecules/InputModal";
import InputSelectModal from "../../../components/molecules/inputSelectModal";
import TextareaModal from "../../../components/molecules/TextareaModal";

import { base_url } from '../../../utils/functions';
import { fetchHelper } from '../../../utils/fetch';
import InputDate from '../../../components/molecules/InputDate';

// ─── Constantes ────────────────────────────────────────────────────────────────
const DEPRECIATION_TYPES = [
    { id: 'LINEAR', label: 'Lineal' },
    { id: 'DECLINING_BALANCE', label: 'Decreciente' },
    { id: 'ACCELERATED', label: 'Acelerada' },
    { id: 'PRODUCTION_UNITS', label: 'Unidades de producción' },
    { id: 'MINIMUN_USEFUL_LIFE', label: 'Vida útil mínima' },
];

// ─── Componente principal ───────────────────────────────────────────────────────
const CreateDepreciationRule = ({ modalRef, modalInstance, rule, setRule, dataTableRef, setRuleCreate }) => {

    const [errors, setErrors] = useState({});
    const [errorMessage, setErrorMessage] = useState('');
    const [accounts, setAccounts] = useState([]);

    // Limpiar errores cuando cambia la regla (modal se reabre)
    useEffect(() => {
        setErrors({});
        setErrorMessage('');
    }, [rule]);

    // Cargar cuentas contables activas
    useEffect(() => {
        const loadAccounts = async () => {
            try {
                const url = base_url(['api', 'v1', 'accounting-accounts']);
                const response = await fetchHelper.post(url, {length: -1, columns: [
                    {data: 'status', search: {value: 'ACTIVE', regex: false}},
                    {
                        data:"pucAccount.code",
                        searchable: true,
                        search:{
                          value:"14%,12%,15%,16%",
                          regex:true
                        }
                    }
                ]}, {  }, 0);
                const list = response?.content ?? response?.data ?? [];
                setAccounts(list.map(a => ({ id: a.id, label: a.customName })));
            } catch (err) {
                console.error('Error al cargar cuentas contables:', err);
            }
        };
        loadAccounts();
    }, []);

    // ── Enviar formulario ──
    const handleCreate = async () => {
        try {
            const url = base_url(['api', 'v1', 'depreciation-rules', 'store']);
            const payload = {
                name: rule.name,
                depretationType: rule.depreciationType,
                accountingAccountId: Number(rule.accountId),
                depretationRate: Number(rule.depreciationRate),
                usefulLifeYears: Number(rule.usefulLife),
                residualValue: Number(rule.residualValue),
                effectiveDate: rule.effectiveDate,
                descriptionStructured: {
                    calculationBase: rule.calculationBase,
                    parameters: rule.parameters,
                    exception: rule.exception,
                    applicableNorm: rule.applicableNorm,
                },
            };
            await fetchHelper.post(url, payload, {}, 1000);

            setRule({
                id: '',
                name: '',
                depreciationType: '',
                accountId: '',
                accountName: '',
                depreciationRate: '',
                usefulLife: '',
                residualValue: '',
                effectiveDate: '',
                calculationBase: '',
                parameters: '',
                exception: '',
                applicableNorm: '',
                status: 'ACTIVE',
            });

            dataTableRef?.current?.ajax.reload();
            modalInstance?.current?.hide();
            setRuleCreate(true);
            setErrors({});
            setErrorMessage('');
        } catch (error) {
            console.error('Error al crear regla de depreciación:', error);
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
                        <h4 className="modal-title">Crear Regla de Depreciación</h4>
                        <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close" />
                    </div>

                    <div className="modal-body">

                        {/* Alert error general */}
                        <div className={`alert alert-danger alert-dismissible ${errorMessage === '' ? 'd-none' : ''}`} role="alert">
                            <button type="button" className="btn-close" onClick={() => setErrorMessage('')} aria-label="Close" />
                            <span>{errorMessage}</span>
                        </div>

                        {/* Nombre */}
                        <div className="row">
                            <div className="col-md-12 mb-4 mt-2">
                                <InputModal
                                    type="text"
                                    id="dr_name_create"
                                    label="Nombre de la regla"
                                    value={rule.name}
                                    onChange={(e) => setRule({ ...rule, name: e.target.value })}
                                    error={errors.name}
                                    placeholder="Ej. Depreciación equipos de cómputo"
                                    required={true}
                                />
                            </div>
                        </div>

                        {/* Tipo de depreciación + Cuenta contable */}
                        <div className="row">
                            <div className="col-md-6 mb-4 mt-2">
                                <InputSelectModal
                                    id="dr_depreciationType_create"
                                    label="Tipo de depreciación"
                                    value={rule.depreciationType}
                                    onChange={(value) => setRule({ ...rule, depreciationType: value })}
                                    error={errors.depreciationType}
                                    placeholder="Seleccione el tipo"
                                    options={DEPRECIATION_TYPES}
                                    required={true}
                                />
                            </div>
                            <div className="col-md-6 mb-4 mt-2">
                                <InputSelectModal
                                    id="dr_accountId_create"
                                    label="Cuenta contable asociada"
                                    value={rule.accountId}
                                    onChange={(value) => setRule({ ...rule, accountId: value })}
                                    error={errors.accountId}
                                    placeholder="Seleccione la cuenta"
                                    options={accounts}
                                    required={true}
                                />
                            </div>
                        </div>

                        {/* Tasa + Vida útil */}
                        <div className="row">
                            <div className="col-lg-6 col-md-12 col-sm-12 mb-4 mt-2">
                                <InputModal
                                    type="number"
                                    id="dr_depreciationRate_create"
                                    label="Tasa de depreciación (%)"
                                    value={rule.depreciationRate}
                                    onChange={(e) => setRule({ ...rule, depreciationRate: e.target.value })}
                                    error={errors.depreciationRate}
                                    placeholder="Ej. 20.00"
                                    required={true}
                                />
                            </div>
                            <div className="col-lg-6 col-md-12 col-sm-12 mb-4 mt-2">
                                <InputModal
                                    type="number"
                                    id="dr_usefulLife_create"
                                    label="Vida útil (años)"
                                    value={rule.usefulLife}
                                    onChange={(e) => {
                                        if (e.target.value > 0) {
                                            setRule({ ...rule, usefulLife: e.target.value })
                                        }else{
                                            setRule({ ...rule, usefulLife: 0 })}
                                        }
                                    }
                                    error={errors.usefulLife}
                                    placeholder="Ej. 5"
                                    required={true}
                                    min={0}
                                />
                            </div>
                        </div>

                        {/* Fecha de vigencia */}
                        <div className="row">
                            
                            <div className="col-lg-6 col-md-12 col-sm-12 mb-4 mt-2">
                                <InputModal
                                    type="number"
                                    id="dr_residualValue_create"
                                    label="Valor residual"
                                    value={rule.residualValue}
                                    onChange={(e) => setRule({ ...rule, residualValue: e.target.value })}
                                    error={errors.residualValue}
                                    placeholder="Ej. 0.00"
                                    required={true}
                                />
                            </div>
                            <div className="col-lg-6 col-md-12 col-sm-12 mb-4 mt-2">
                                <InputDate
                                    id="dr_effectiveDate_create"
                                    label="Fecha de vigencia"
                                    date={rule.effectiveDate}
                                    onChange={(date) => setRule({ ...rule, effectiveDate: date })}
                                    error={errors.effectiveDate}
                                    placeholder="dd-mm-yyyy"
                                    required={true}
                                />
                            </div>
                        </div>

                        {/* Descripción estructurada */}
                        <div className="row">
                            <div className="col-md-12 mb-2 mt-2">
                                <div className="d-flex align-items-center gap-2 mb-3">
                                    <i className="ri-file-list-3-line text-primary fs-5"></i>
                                    <span className="fw-semibold">Descripción estructurada</span>
                                    <span className="text-danger">*</span>
                                </div>
                            </div>
                        </div>

                        <div className="row">
                            <div className="col-md-6 mb-3">
                                <TextareaModal
                                    id="dr_calculationBase_create"
                                    label="Base de cálculo"
                                    value={rule.calculationBase}
                                    onChange={(e) => setRule({ ...rule, calculationBase: e.target.value })}
                                    error={errors['descriptionStructured.calculationBase']}
                                    placeholder="Ej. Costo histórico del activo menos valor residual"
                                    required={true}
                                />
                            </div>
                            <div className="col-md-6 mb-3">
                                <TextareaModal
                                    id="dr_parameters_create"
                                    label="Parámetros"
                                    value={rule.parameters}
                                    onChange={(e) => setRule({ ...rule, parameters: e.target.value })}
                                    error={errors['descriptionStructured.parameters']}
                                    placeholder="Ej. Tasa fija anual del 20% sobre el valor en libros"
                                    required={true}
                                />
                            </div>
                        </div>

                        <div className="row">
                            <div className="col-md-6 mb-3">
                                <TextareaModal
                                    id="dr_exception_create"
                                    label="Excepciones"
                                    value={rule.exception}
                                    onChange={(e) => setRule({ ...rule, exception: e.target.value })}
                                    error={errors['descriptionStructured.exception']}
                                    placeholder="Ej. No aplica para activos adquiridos en el último trimestre"
                                    required={true}
                                />
                            </div>
                            <div className="col-md-6 mb-3">
                                <TextareaModal
                                    id="dr_applicableNorm_create"
                                    label="Norma aplicable"
                                    value={rule.applicableNorm}
                                    onChange={(e) => setRule({ ...rule, applicableNorm: e.target.value })}
                                    error={errors['descriptionStructured.applicableNorm']}
                                    placeholder="Ej. NIC 16 - Propiedades, Planta y Equipo"
                                    required={true}
                                />
                            </div>
                        </div>

                    </div>{/* /modal-body */}

                    <div className="modal-footer">
                        <button type="button" className="btn btn-primary" onClick={handleCreate}>
                            Guardar
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

export default CreateDepreciationRule;
