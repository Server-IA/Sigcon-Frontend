import { useEffect, useState } from "react";
import { base_url } from "../../../utils/functions";
import { fetchHelper } from "../../../utils/fetch";
import InputSelectModal from "../../../components/molecules/inputSelectModal";

const UpdatedModule = ({ modalRef, modalInstance, module, setModule, dataTableRef, setModuleEdit }) => {

    const [errors, setErrors] = useState({});
    const [errorMessage, setErrorMessage] = useState('');

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
        setErrors({});  
        setErrorMessage('');
    }, [module]);

    return <>
        <div className="modal fade" ref={modalRef} tabIndex={-1} aria-hidden="true">
            <div className="modal-dialog modal-dialog-centered" role="document">
                <div className="modal-content">
                    <div className="modal-header">
                        <h4 className="modal-title" id="modalCenterTitle">Agregar Modulo</h4>
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
                                <div className="form-floating form-floating-outline">
                                    <input
                                        type="text"
                                        id="name"
                                        className={`form-control ${errors.name ? 'is-invalid' : ''}`}
                                        placeholder="Nombre unico del modulo"
                                        value={module.name}
                                        onChange={(e) => setModule({ ...module, name: e.target.value })}
                                    />
                                    <label htmlFor="name">Nombre del modulo</label>
                                    {errors.name && <div className="invalid-feedback">{errors.name}</div>}
                                </div>
                            </div>

                            <div className="col mb-6 mt-2">
                                <div className="form-floating form-floating-outline">
                                    <input
                                        type="number"
                                        id="position"
                                        className={`form-control ${errors.position ? 'is-invalid' : ''}`}
                                        placeholder="Posicion del modulo"
                                        value={module.position}
                                        onChange={(e) => setModule({ ...module, position: e.target.value ? parseInt(e.target.value) : 1 })}
                                    />
                                    <label htmlFor="position">Posicion del modulo</label>
                                    {errors.position && <div className="invalid-feedback">{errors.position}</div>}
                                </div>
                            </div>
                        </div>
                        <div className="row g-4">
                            <div className="col mb-6 mt-2">
                                <div className="form-floating form-floating-outline">
                                    <input
                                        type="text"
                                        id="url"
                                        className={`form-control ${errors.url ? 'is-invalid' : ''}`}
                                        placeholder="Url del modulo"
                                        value={module.url}
                                        onChange={(e) => setModule({ ...module, url: e.target.value })}
                                    />
                                    <label htmlFor="url">Url del modulo</label>
                                    {errors.url && <div className="invalid-feedback">{errors.url}</div>}
                                </div>
                            </div>
                            <div className="col mb-6 mt-2">
                                <div className="form-floating form-floating-outline">
                                    <input
                                        type="text"
                                        id="icon"
                                        className={`form-control ${errors.icon ? 'is-invalid' : ''}`}
                                        placeholder="Icono del modulo"
                                        value={module.icon}
                                        onChange={(e) => setModule({ ...module, icon: e.target.value })}
                                    />
                                    <label htmlFor="icon">Icono del modulo</label>
                                    {errors.icon && <div className="invalid-feedback">{errors.icon}</div>}
                                </div>
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
                                <div className="form-floating form-floating-outline mb-6">
                                    <textarea
                                        className={`form-control h-px-100 ${errors.description ? 'is-invalid' : ''}`}
                                        id="description"
                                        placeholder="Descripcion del modulo"
                                        value={module.description}
                                        onChange={(e) => setModule({ ...module, description: e.target.value })}
                                    ></textarea>
                                    <label htmlFor="description">Descripcion del modulo</label>
                                    {errors.description && <div className="invalid-feedback">{errors.description}</div>}
                                </div>
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