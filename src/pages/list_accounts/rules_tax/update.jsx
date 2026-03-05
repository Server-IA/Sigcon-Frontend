import TextareaModal from "../../../components/molecules/TextareaModal";
import InputDateRange from "../../../components/molecules/InputDateRange";
import InputSelectModal from "../../../components/molecules/InputSelectModal";
import InputModal from "../../../components/molecules/InputModal";
import AlertPage from "../../../components/molecules/AlertPage";
import { useState } from "react";
import { base_url } from "../../../utils/functions";
import { fetchHelper } from "../../../utils/fetch";


const UpdateRulesTax = ({ rulesTax, setRulesTax, typeRulerTaxOptions, statusRulerTaxOptions, modalRef, modalInstance, dataTableRef, setRulesTaxMessage }) => {

    const [error, setError] = useState({
        message: '',
        type: '',
        show: false,
    })


    const [errors, setErrors] = useState([]);

    const handleSave = async () => {
        try{

            const url = base_url(['api', 'v1', 'ruler-tax', rulesTax.id]);
            const response = await fetchHelper.put(url, rulesTax, {}, 0);

            dataTableRef?.current?.ajax.reload();
            modalInstance?.current?.hide();
            setErrors({});
            setError({ message: '', type: '', show: false });
            setRulesTaxMessage({ message: response.msg || response.message || 'Regla de impuesto creada correctamente', type: 'success', show: true });
        } catch (error) {
            console.error('Error al crear regla de impuesto:', error);
            const errores = error?.errors;
            if (errores && errores.length > 0) {
                const fieldErrors = {};
                errores.forEach(err => { fieldErrors[err.field] = err.message; });
                setErrors(fieldErrors);
            } else if (error?.msg) {
                setError({ message: error.msg, type: 'danger', show: true });
            }
        }
    }

    return (
        <div className="modal fade" ref={modalRef} id="modalCenter" tabIndex={-1} aria-hidden="true">
            <div className="modal-dialog modal-dialog-centered" role="document">
                <div className="modal-content">
                    <div className="modal-header">
                        <h4 className="modal-title" id="modalCenterTitle">Editar Regla de Impuesto</h4>
                        <button
                            type="button"
                            className="btn-close"
                            data-bs-dismiss="modal"
                            aria-label="Close"></button>
                    </div>
                    <div className="modal-body">
                        
                        <AlertPage
                            message={error.message}
                            type={error.type}
                            show={error.show}
                            onChange={() => setError({ message: '', type: '', show: false })}
                        />

                        <div className="row">
                            <div className="col-lg-6 col-md-12 col-sm-12 mb-6 mt-2">
                                <InputSelectModal
                                    id="typeRulerTaxUpdate"
                                    label="Tipo de Regla de Impuesto"
                                    value={rulesTax.typeRulerTax}
                                    onChange={(value) => {
                                        setRulesTax({ ...rulesTax, typeRulerTax: value })
                                        setErrors((prev) => ({
                                            ...prev,
                                            typeRulerTax: '',
                                        }))
                                    }}
                                    error={errors.typeRulerTax}
                                    placeholder="Tipo de Regla de Impuesto"
                                    required={true}
                                    options={typeRulerTaxOptions.map(typeRulerTax => ({
                                        id: typeRulerTax.value,
                                        label: typeRulerTax.label
                                    }))}
                                />
                            </div>
                            <div className="col-lg-6 col-md-6 col-sm-12 mb-6 mt-2">
                                <InputModal
                                    id="nameUpdate"
                                    label="Nombre"
                                    value={rulesTax.name}
                                    onChange={(e) => {
                                        setRulesTax({ ...rulesTax, name: e.target.value })
                                        setErrors((prev) => ({
                                            ...prev,
                                            name: '',
                                        }))
                                    }}
                                    error={errors.name}
                                    placeholder="Nombre"
                                    required={true}
                                    type="text"
                                />
                            </div>
                        </div>

                        <div className="row">
                            <div className="col-lg-6 col-md-6 col-sm-12 mb-6 mt-2">
                                <InputModal
                                    id="percentageUpdate"
                                    label="Tarifa"
                                    value={rulesTax.percentage}
                                    onChange={(e) => {
                                        setRulesTax({ ...rulesTax, percentage: e.target.value.replace(/,/g, '.').replace(/[^0-9.]/g, '') })
                                        setErrors((prev) => ({
                                            ...prev,
                                            percentage: '',
                                        }))
                                    }}
                                    error={errors.percentage}
                                    placeholder="Tarifa"
                                    required={true}
                                    type="number"
                                    min={0}
                                    max={100}
                                />
                            </div>

                            <div className="col-lg-6 col-md-6 col-sm-12 mb-6 mt-2">
                                <InputSelectModal
                                    id="statusRulerTaxUpdate"
                                    label="Estado"
                                    value={rulesTax.statusRulerTax}
                                    onChange={(value) => {
                                        setRulesTax({ ...rulesTax, statusRulerTax: value })
                                    }}
                                    error={errors.statusRulerTax}
                                    options={statusRulerTaxOptions.map(statusRulerTax => ({
                                        id: statusRulerTax.value,
                                        label: statusRulerTax.label
                                    }))}
                                    required={true}
                                    placeholder="Estado"
                                />
                            </div>
                        </div>

                        <div className="row">
                            <div className="col-lg-6 col-md-6 col-sm-12 mb-6 mt-2">
                                <TextareaModal
                                    id="descriptionUpdate"
                                    label="Descripción"
                                    value={rulesTax.description}
                                    onChange={(e) => {
                                        setRulesTax({ ...rulesTax, description: e.target.value })
                                    }}
                                    error={errors.description}
                                    placeholder="Descripción"
                                    required={true}
                                />
                            </div>
                            <div className="col-lg-6 col-md-6 col-sm-12 mb-6 mt-2">
                                <TextareaModal
                                    id="scopeUpdate"
                                    label="Alcance"
                                    value={rulesTax.scope}
                                    onChange={(e) => {
                                        setRulesTax({ ...rulesTax, scope: e.target.value })
                                    }}
                                    error={errors.scope}
                                    placeholder="Alcance"
                                    required={true}
                                />
                            </div>
                        </div>

                        <div className="row">
                            <div className="col mb-6 mt-2">
                                <InputDateRange
                                    id="dateRangeUpdate"
                                    label="Fecha de vigencia"
                                    placeholder="Fecha de inicio y fin"
                                    dateInit={rulesTax.dateStart}
                                    dateEnd={rulesTax.dateEnd}
                                    onChange={(dateInit, dateEnd) => {
                                        if (dateInit && dateEnd) {
                                            let startDate = new Date(dateInit);
                                            let endDate = new Date(dateEnd);

                                            startDate = startDate.toISOString().split('T')[0];
                                            endDate = endDate.toISOString().split('T')[0];

                                            setRulesTax({ ...rulesTax, dateStart: startDate, dateEnd: endDate })
                                            setErrors((prev) => ({
                                                ...prev,
                                                dateStart: null,
                                                dateEnd: null,
                                            }))
                                        }
                                    }}
                                    error={errors.dateStart || errors.dateEnd}
                                    required={true}
                                />
                            </div>
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-outline-secondary" data-bs-dismiss="modal">
                            Cerrar
                        </button>
                        <button type="button" className="btn btn-primary" onClick={handleSave}>Guardar</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UpdateRulesTax;