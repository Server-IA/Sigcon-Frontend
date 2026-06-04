import { useEffect, useState } from "react";
import { base_url } from "../../../utils/functions";
import { fetchHelper } from "../../../utils/fetch";
import InputSelectModal from "../../../components/molecules/inputSelectModal";
import InputModal from "../../../components/molecules/InputModal";
import TextareaModal from "../../../components/molecules/TextareaModal";

const UpdatedModule = ({ modalRef, modalInstance, module, setModule, dataTableRef, setModuleEdit }) => {

    const [errors, setErrors] = useState({});
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        if (modalRef.current) {
            modalRef.current.addEventListener('hidden.bs.modal', () => {
                setErrors({});
                setErrorMessage('');
            });
        }
        return () => {
            if (modalRef.current) {
                modalRef.current.removeEventListener('hidden.bs.modal', () => {
                    setErrors({});
                    setErrorMessage('');
                });
            }
        };
    }, [modalRef.current]);

    const handleSubmit = async (e) => {
        try {
            e.preventDefault();
            const url = base_url(['api', 'modules', 'update']);
            await fetchHelper.put(url, module, {}, 500, false);
    
            setModule({
                id: '',
                name: '',
                description: '',
                url: '',
                icon: '',
                position: '',
                status: 'ACTIVE',
            });
            dataTableRef?.current?.ajax.reload();
            modalInstance?.current?.hide();
            setModuleEdit(true);
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
            }else if (error?.msg) {
                setErrorMessage(error.msg);
            }
        }
    }

    useEffect(() => {
        setErrorMessage('');
    }, [module]);

    return <>
        <div className="modal fade" ref={modalRef} tabIndex={-1} aria-hidden="true">
            <div className="modal-dialog modal-dialog-centered" role="document">
                <div className="modal-content">
                    <div className="modal-header">
                        <h4 className="modal-title" id="modalCenterTitle">Editar Modulo</h4>
                        <button
                            type="button"
                            className="btn-close"
                            data-bs-dismiss="modal"
                            aria-label="Close"></button>
                    </div>
                    <div className="modal-body">
                        <p className="text-muted m-0">
                            <a href="https://remixicon.com/" target="_blank" rel="noopener noreferrer">
                                <i className="ri-information-line"></i> Iconos de Remix Icon <small>(Abrir en nueva pestaña)</small>
                            </a>
                        </p>
                        <div className={`alert alert-danger alert-dismissible ${errorMessage == '' ? 'd-none' : ''}`} role="alert">
                            <button type="button" className="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                            <span>{errorMessage}</span>
                        </div>
                        <div className="row">
                            <div className="col mb-6 mt-2">
                                <InputModal
                                    type="text"
                                    id="name_updated"
                                    label="Nombre del modulo"
                                    value={module.name}
                                    onChange={(e) => {
                                        setModule({ ...module, name: e.target.value })
                                        setErrors((prev) => ({
                                            ...prev,
                                            name: '',
                                        }))
                                    }}
                                    error={errors.name}
                                    placeholder="Nombre del modulo"
                                    required={true}
                                />
                            </div>

                            <div className="col mb-6 mt-2">
                                <InputModal
                                    type="number"
                                    id="position_updated"
                                    label="Posicion del modulo"
                                    value={module.position}
                                    onChange={(e) => {
                                        setModule({ ...module, position: e.target.value ? parseInt(e.target.value) : 1 })
                                        setErrors((prev) => ({
                                            ...prev,
                                            position: '',
                                        }))
                                    }}
                                    error={errors.position}
                                    placeholder="Posicion del modulo"
                                    required={true}
                                />
                            </div>
                        </div>
                        <div className="row g-4">
                            <div className="col mb-6 mt-2">
                                <InputModal
                                    type="text"
                                    id="url_updated"
                                    label="Url del modulo"
                                    value={module.url}
                                    onChange={(e) => {
                                        setModule({ ...module, url: e.target.value })
                                        setErrors((prev) => ({
                                            ...prev,
                                            url: '',
                                        }))
                                    }}
                                    error={errors.url}
                                    placeholder="Url del modulo"
                                    required={true}
                                />
                            </div>
                            <div className="col mb-6 mt-2">
                                <InputModal
                                    type="text"
                                    id="icon_updated"
                                    label="Icono del modulo"
                                    value={module.icon}
                                    onChange={(e) => {
                                        setModule({ ...module, icon: e.target.value })
                                        setErrors((prev) => ({
                                            ...prev,
                                            icon: '',
                                        }))
                                    }}
                                    error={errors.icon}
                                    placeholder="Icono del modulo"
                                />
                            </div>
                        </div>

                        <div className="row">
                            <div className="col mb-6 mt-2">
                                <InputSelectModal
                                    id="status_updated"
                                    label="Estado del modulo"
                                    value={module.status}
                                    onChange={(value) => setModule({ ...module, status: value })}
                                    error={errors.status_updated}
                                    placeholder="Seleccione el estado del modulo"
                                    options={[{ label: 'Activo', id: 'ACTIVE' }, { label: 'Inactivo', id: 'INACTIVE' }]}
                                />
                            </div>
                        </div>

                        <div className="row g-4">
                            <div className="col mb-6 mt-2">
                                <TextareaModal
                                    id="description_updated"
                                    label="Descripcion del modulo"
                                    value={module.description}
                                    onChange={(e) => setModule({ ...module, description: e.target.value })}
                                    error={errors.description}
                                    placeholder="Descripcion del modulo"
                                />
                            </div>
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

export default UpdatedModule;