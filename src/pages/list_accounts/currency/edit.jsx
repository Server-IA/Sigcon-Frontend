import { useState } from "react";
import AlertPage from "../../../components/molecules/AlertPage";
import InputModal from "../../../components/molecules/InputModal";
import InputSelectModal from "../../../components/molecules/inputSelectModal";
import { base_url } from "../../../utils/functions";
import { fetchHelper } from "../../../utils/fetch";

const CurrencyEdit = ({ dataTableRef, modalRef, modalInstance, currency, setCurrency, setMessage }) => {

    const [error, setError] = useState({ message: '', type: '', show: false });
    const [errors, setErrors] = useState({});

    const handleSave = async() => {
        console.log(currency);
        try {
            const url = base_url(['api/v1/accounting-lists/currency-types', currency.id]);
            const response = await fetchHelper.put(url, currency, {}, 500);
            setMessage({ message: response.message, type: "success", show: true });
            modalInstance.current.hide();
            dataTableRef.current.draw(false);
            setErrors([]);
            setError({ message: '', type: '', show: false });
        } catch (error) {
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
                        <h4 className="modal-title" id="modalCenterTitle">Editar Tipo de Moneda</h4>
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
                            <div className="col-lg-6 col-md-6 col-sm-12 mb-6 mt-2">
                                <InputModal
                                    type="text"
                                    id="name"
                                    label="Nombre del tipo de moneda"
                                    value={currency.name}
                                    onChange={(value) => {
                                        setCurrency({ ...currency, name: value.target.value });
                                        setErrors({ ...errors, name: '' });
                                    }}
                                    error={errors.name}
                                    placeholder="Ingrese el nombre del tipo de moneda"
                                    required={true}
                                    maxLength={100}
                                />
                            </div>
                            <div className="col-lg-6 col-md-6 col-sm-12 mb-6 mt-2">
                                <InputModal
                                    type="text"
                                    id="isoCode"
                                    label="Código ISO"
                                    value={currency.isoCode}
                                    onChange={(value) => {
                                        setCurrency({ ...currency, isoCode: value.target.value.toUpperCase().replace(/[^A-Z]/g, '') });
                                        setErrors({ ...errors, isoCode: '' });
                                    }}
                                    error={errors.isoCode}
                                    placeholder="Ingrese el código ISO del tipo de moneda"
                                    required={true}
                                    maxLength={3}
                                    inputMode="numeric"
                                    pattern="[A-Z]{3}"
                                />
                            </div>
                        </div>

                        <div className="row">
                            <div className="col mt-2 mb-6">
                                    <InputSelectModal
                                        id="status"
                                        label="Estado"
                                        value={currency.status}
                                        onChange={(value) => {
                                            setCurrency({ ...currency, status: value });
                                            setErrors({ ...errors, status: '' });
                                        }}
                                        error={errors.status}
                                        placeholder="Seleccione el estado del tipo de moneda"
                                        required={true}
                                        options={[{ label: 'Activo', id: 'ACTIVE' }, { label: 'Inactivo', id: 'INACTIVE' }]}
                                    />
                            </div>
                        </div>
                    </div>

                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                        <button type="button" className="btn btn-primary" onClick={handleSave}>Guardar</button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default CurrencyEdit;