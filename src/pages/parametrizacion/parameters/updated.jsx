import InputModal from "../../../components/molecules/InputModal";
import InputSelectModal from "../../../components/molecules/inputSelectModal";
import InputSelectModalCategory from "../../../components/molecules/inputSelectModalCategory";

import { useEffect, useState } from "react";
import { base_url } from "../../../utils/functions";
import { fetchHelper } from "../../../utils/fetch";




const UpdatedParameter = ({ modalRef, modalInstance, parameter, setParameter, dataTableRef, setParameterEdit }) => {

    const [errors, setErrors] = useState({});
    const [errorMessage, setErrorMessage] = useState('');

    const handleSubmit = async (e) => {
        try {
            e.preventDefault();
            console.log('parameter completo:', JSON.stringify(parameter));
            const url = base_url(['api', 'parameters', 'update']);
            await fetchHelper.put(url, parameter, {}, 500, false);
            setParameter({
                id: '',
                name: '',
                category: '',
                description: '',
            });



            dataTableRef?.current?.ajax.reload();
            modalInstance?.current?.hide();
            setParameterEdit(true);
            setErrors({});
        } catch (error) {
            console.log(error.msg);
            const errores = error?.errors;
            if (errores && errores.length > 0) {
                const fieldErrors = {};
                errores.forEach(err => {
                    fieldErrors[err.field] = err.message;
                });
                setErrors(fieldErrors);
            } else if (error?.msg) {
                setErrorMessage(error.msg);
            }
        }
    }

    return <>
        <div className="modal fade" ref={modalRef} tabIndex={-1} aria-hidden="true">
            <div className="modal-dialog modal-dialog-centered" role="document">
                <div className="modal-content">
                    <div className="modal-header">
                        <h4 className="modal-title" id="modalCenterTitle">Editar Parametro</h4>
                        <button
                            type="button"
                            className="btn-close"
                            data-bs-dismiss="modal"
                            aria-label="Close"></button>
                    </div>
                    <div className="modal-body">
                        <div className={`alert alert-danger alert-dismissible ${errorMessage == '' ? 'd-none' : ''}`} role="alert">
                            <button type="button" className="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                            <span>{errorMessage}</span>
                        </div>
                        <div className="row">
                            <div className="col mb-6 mt-2">
                                <InputModal
                                    type="text"
                                    id="name_updated"
                                    label="Nombre "
                                    placeholder="Ingrese el nombre"
                                    value={parameter.name}
                                    onChange={(e) => setParameter({ ...parameter, name: e.target.value })}
                                    error={errors.name}
                                    required
                                />
                            </div>
                        </div>
                        <div className="col-md-6">
                            <InputSelectModal
                                id="status_select_updated"
                                label="Estado"
                                value={parameter.status}
                                onChange={(value) => setParameter({ ...parameter, status: value })}
                                error={errors.status}
                                placeholder="Estado del parámetro"
                                options={[{ name: 'Activo', id: 'ACTIVE' }, { name: 'Inactivo', id: 'INACTIVE' }]}
                            />
                        </div>
                    </div>
                    <div className="row">
                        <div className="col-md-6 ">
                            <InputSelectModalCategory
                                id="category_select_updated"
                                label="Categoria del parámetro"
                                value={parameter.category}
                                onChange={(value) => setParameter({ ...parameter, category: value })}
                                error={errors.category}
                                placeholder="Categoria del parámetro"
                                options={[{ name: 'COLOR', id: 'COLOR' }, { name: 'TEXTO', id: 'FONT' }]}
                            />
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-outline-secondary" data-bs-dismiss="modal">
                            Cerrar
                        </button>
                        <button type="button" className="btn btn-primary" onClick={handleSubmit}>Guardar</button>
                    </div>
                </div>
            </div>
        </div>
    </>
}


export default UpdatedParameter;