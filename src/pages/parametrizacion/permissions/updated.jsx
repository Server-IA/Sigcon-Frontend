import { useState, useEffect } from 'react';

import InputSelectModal from "../../../components/molecules/inputSelectModal";
import InputModal from "../../../components/molecules/InputModal";

import { base_url, validarArrays } from '../../../utils/functions';
import { fetchHelper } from '../../../utils/fetch';
import TextareaModal from '../../../components/molecules/TextareaModal';

const UpdatedPermission = ({ modalRef, modalInstance, permission, setPermission, dataTableRef, types, modules }) => {

    const [errors, setErrors] = useState({});
    const [errorMessage, setErrorMessage] = useState('');
    const [modulesOptions, setModulesOptions] = useState([]);

    useEffect(() => {
    }, []);

    useEffect(() => {
        setModulesOptions(
            modules.map(m => ({
                id: m.id,
                name: m.name,
            }))
        )
    }, [modules]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {

            let hasChanges = false;

            const dataPermissionUpdate = {
                name: permission.name,
                code: permission.code,
                type: permission.type,
                description: permission.description,
                moduleId: permission.moduleId,
            }

            const permissionUpdateUrl = base_url(['roles', 'updatePermission', permission.id]);

            const response = await fetchHelper.put(permissionUpdateUrl, dataPermissionUpdate, {}, 0);

            dataTableRef?.current?.ajax.reload();
            modalInstance?.current?.hide();
            window.Swal.fire({
                icon: 'success',
                title: 'Éxito',
                text: response.message,
                timer: 2000,
                showConfirmButton: true,
                customClass: {
                    confirmButton: 'btn btn-primary'
                }
            });

            setPermission({
                id: '',
                name: '',
                code: '',
                description: '',
                type: '',
                moduleId: '',
            });

            setErrors({});
            setErrorMessage('');

        } catch (error) {
            console.log('Error:', error);
            
            const errores = error?.errors;
            if (errores && errores.length > 0) {
                const fieldErrors = {};
                errores.forEach(err => {
                    fieldErrors[err.field] = err.message;
                });
                setErrors(fieldErrors);
            } else if (error?.msg) {
                setErrorMessage(error.msg);
            } else {
                setErrorMessage('Error al actualizar el permiso');
            }
        }
    }

    return (
        <div className="modal fade" ref={modalRef} id="modalUpdatePermission" tabIndex={-1} aria-hidden="true">
            <div className="modal-dialog modal-dialog-centered" role="document">
                <div className="modal-content">
                    <div className="modal-header">
                        <h4 className="modal-title">Editar Permiso</h4>
                        <button
                            type="button"
                            className="btn-close"
                            data-bs-dismiss="modal"
                            aria-label="Close">
                        </button>
                    </div>
                    <div className="modal-body">
                        <div className={`alert alert-danger alert-dismissible ${errorMessage === '' ? 'd-none' : ''}`} role="alert">
                            <button type="button" className="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                            <span>{errorMessage}</span>
                        </div>

                        <div className="row">
                            <div className="col mb-6 mt-2">
                                <InputModal
                                    type="text"
                                    id="name_updated"
                                    label="Nombre del permiso"
                                    value={permission.name}
                                    onChange={(e) => setPermission({ ...permission, name: e.target.value })}
                                    error={errors.name}
                                    placeholder="Nombre del permiso"
                                    required={true}
                                />
                            </div>
                            <div className="col mt-2">
                                <InputSelectModal
                                    id="type_updated"
                                    label="Tipo de permiso"
                                    value={permission.type}
                                    onChange={(value) => setPermission({ ...permission, type: value })}
                                    options={types}
                                    error={errors.type}
                                    placeholder="Seleccione tipo"
                                    required={true}
                                />
                            </div>
                        </div>

                        <div className="row">
                            
                            <div className="col mb-6 mt-2">
                                <InputModal
                                    type="text"
                                    id="code_updated"
                                    label="Código del permiso"
                                    value={permission.code}
                                    readOnly={false}
                                    onChange={(e) => setPermission({ ...permission, code: e.target.value.toUpperCase().trim().replace(/ /g, '_') })}
                                    error={errors.code}
                                    placeholder="Código del permiso"
                                    required={true}
                                />
                            </div>
                            <div className="col mt-2">
                                <InputSelectModal
                                    id="moduleId_updated"
                                    label="Módulo"
                                    value={permission.moduleId}
                                    onChange={(value) => setPermission({ ...permission, moduleId: value })}
                                    options={modulesOptions}
                                    error={errors.moduleId}
                                    placeholder="Seleccione módulo"
                                    required={true}
                                />
                            </div>
                        </div>

                        <div className="row">
                            <div className="col mb-6 mt-2">
                                <TextareaModal
                                    id="description_updated"
                                    label="Descripción del permiso"
                                    value={permission.description}
                                    onChange={(e) => setPermission({ ...permission, description: e.target.value })}
                                    error={errors.description}
                                    placeholder="Descripción del permiso"
                                />
                            </div>
                        </div>

                        {/* <div className="row">
                            <div className="col mb-6 mt-2">
                                <InputSelectModal
                                    id="roleIds_updated"
                                    label="Roles que tienen este permiso"
                                    value={permission.roleIds}
                                    onChange={(value) => {
                                        setRolesUpdated(value.map(id => parseInt(id)));
                                        setRolesRemoved(permission.roleIds?.filter(id => !value.map(id => parseInt(id)).includes(id)));
                                    }}
                                    error={errors.roleIds}
                                    placeholder="Seleccione roles"
                                    options={roles}
                                    multiple={true}
                                />
                                <small className="text-muted">
                                    Selecciona los roles que deben tener este permiso
                                </small>
                            </div>
                        </div> */}
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-outline-secondary" data-bs-dismiss="modal">
                            Cerrar
                        </button>
                        <button type="button" className="btn btn-primary" onClick={handleSubmit}>
                            Actualizar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default UpdatedPermission;