import '../../../styles/vendor/animate-css/animate.css'
import { base_url } from '../../../utils/functions';
import { fetchHelper } from '../../../utils/fetch';
import { useEffect, useState } from 'react';
import PageAlert from '../../../components/molecules/AlertPage';
import InputModal from '../../../components/molecules/InputModal';
import TextareaModal from '../../../components/molecules/TextareaModal';

const CreateModule = ({ modalRef, modalInstance, module, setModule, dataTableRef, setModuleCreate }) => {

    const [errors, setErrors] = useState({});
    const [error, setError] = useState({
        message: '',
        type: '',
        show: false,
    });

    useEffect(() => {
        if (modalRef.current) {
            modalRef.current.addEventListener('hidden.bs.modal', () => {
                setErrors({});
                setError({ message: '', type: '', show: false });
            });
        }
        return () => {
            if (modalRef.current) {
                modalRef.current.removeEventListener('hidden.bs.modal', () => {
                    setErrors({});
                    setError({ message: '', type: '', show: false });
                });
            }
        };
    }, [modalRef.current]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        const url = base_url(['api', 'modules', 'store']);
        try {
            await fetchHelper.post(url, module, {}, 1000);
            setModule({
                id: '',
                name: '',
                description: '',
                url: '',
                icon: '',
                position: '',
                status: 'ACTIVE',
                createdAt: '',
                updatedAt: '',
                deletedAt: '',
            });
            dataTableRef?.current?.ajax.reload();
            modalInstance?.current?.hide();
            setModuleCreate(true);
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
                setError({ message: error.msg, type: 'danger', show: true });
            }
        }
    }

    useEffect(() => {
        setError({ message: '', type: '', show: false });
        console.log(module);
    }, [module]);

    return <>
        <div className="modal fade" ref={modalRef} id="modalCenter" tabIndex={-1} aria-hidden="true">
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

                        <PageAlert message={error.message} type={error.type} show={error.show} onChange={() => setError({ message: '', type: '', show: false })} />

                        <div className="row">
                            <div className="col mb-6 mt-2">

                                <InputModal
                                    type="text"
                                    id="name"
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
                                    id="position"
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
                                    id="url"
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
                                    id="icon"
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
                        <div className="row g-4">
                            <div className="col mb-6 mt-2">
                                <TextareaModal
                                    id="description"
                                    label="Descripcion del modulo"
                                    value={module.description}
                                    onChange={(e) => {
                                        setModule({ ...module, description: e.target.value })
                                        setErrors((prev) => ({
                                            ...prev,
                                            description: '',
                                        }))
                                    }}
                                    error={errors.description}
                                    placeholder="Descripcion del modulo"
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
        </div>
    </>;
}

export default CreateModule;
