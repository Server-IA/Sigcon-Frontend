import '../../../styles/vendor/animate-css/animate.css'
import { base_url } from '../../../utils/functions';
import { fetchHelper } from '../../../utils/fetch';
import { useEffect, useState } from 'react';

import InputModal from "../../../components/molecules/InputModal";
import InputSelectModal from "../../../components/molecules/inputSelectModal";
import InputSelectModalCategory from "../../../components/molecules/inputSelectModalCategory";

const CreateParameter = ({ modalRef, modalInstance, parameter, setParameter, dataTableRef, setParameterCreate }) => {

    const [errors, setErrors] = useState({});
    const [errorMessage, setErrorMessage] = useState('');

    const initialState = {
        id: '',
        name: '',
        status: '',
        description: '',
        category: '',
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const url = base_url(['api', 'parameters', 'store']);
        console.log('Enviando:', JSON.stringify(parameter));
        try {
            await fetchHelper.post(url, parameter, {}, 1000);
            setParameter(initialState);
            dataTableRef?.current?.ajax.reload();
            modalInstance?.current?.hide();
            setParameterCreate(true);
            setErrors({});
            setErrorMessage('');
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

    const handleClear = () => {
        setParameter(initialState);
        setErrors({});
        setErrorMessage('');
    }

    useEffect(() => {
        setErrors({});
        setErrorMessage('');
    }, [parameter]);

    return <>
        <div className="modal fade" ref={modalRef} id="modalCenter" tabIndex={-1} aria-hidden="true">
            <div className="modal-dialog modal-dialog-centered" role="document">
                <div className="modal-content">
                    <div className="modal-header">
                        <h4 className="modal-title fw-bold">Crear Parámetro</h4>
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
                                    id="name"
                                    label="Ingrese nombre"
                                    value={parameter.name}
                                    onChange={(e) => setParameter({ ...parameter, name: e.target.value })}
                                    error={errors.name}
                                    placeholder="Nombre del parámetro"
                                    required
                                />
                            </div>

                        </div>
                        <div className="row">

                            <div className="col mb-6 mt-2">
                                <InputSelectModal
                                    id="status_select"
                                    label="Estado"
                                    value={parameter.status}
                                    onChange={(value) => setParameter({ ...parameter, status: value })}
                                    error={errors.status}
                                    placeholder="Estado del parámetro"
                                    options={[{ name: 'Activo', id: 'ACTIVE' }, { name: 'Inactivo', id: 'INACTIVE' }]}
                                />
                            </div>
                            <div className="col mb-6 mt-2">
                                <InputSelectModalCategory
                                    id="category_select"
                                    label="Categoria del parámetro"
                                    value={parameter.category}
                                    onChange={(value) => setParameter({ ...parameter, category: value })}
                                    error={errors.category}
                                    placeholder="Categoria del parámetro"
                                    options={[{ id: 'COLOR', name: 'COLOR' }, { id: 'FONT', name: 'FUENTE' }]}
                                />
                            </div>
                        </div>
                    </div>
                    <div className="modal-footer justify-content-start">
                        <button type="button" className="btn btn-primary" onClick={handleSubmit}>Guardar</button>
                        <button type="button" className="btn btn-outline-secondary" onClick={handleClear}>Limpiar</button>
                        <button type="button" className="btn btn-danger ms-auto" data-bs-dismiss="modal">Volver</button>
                    </div>
                </div>
            </div>
        </div>
    </>;
}

export default CreateParameter;