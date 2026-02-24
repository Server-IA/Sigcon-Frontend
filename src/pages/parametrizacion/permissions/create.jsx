import { useState, useEffect } from 'react';
import InputModal from "../../../components/molecules/InputModal";

import InputSelectModal from "../../../components/molecules/inputSelectModal";
import TextareaModal from "../../../components/molecules/TextareaModal";

import { base_url } from '../../../utils/functions';
import { fetchHelper } from '../../../utils/fetch';

const CreatedPermission = ({ modalRef, modalInstance, permission, setPermission, types, dataTableRef, modules, setPermissionCreate }) => {

    const [errors, setErrors] = useState({});
    const [errorMessage, setErrorMessage] = useState('');
    const [roles, setRoles] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [modulesOptions, setModulesOptions] = useState([]);

    useEffect(() => {
        const getRoles = async () => {
            try {
                const url = base_url(['roles', 'getRoles']);
                const response = await fetchHelper.post(url, {length: -1}, {}, 0);
                
                const rolesData = response?.data || [];
                
                setRoles(
                    rolesData.map(role => ({
                        id: role.id,
                        name: role.name,
                    }))
                );
            } catch (error) {
                console.error('Error al cargar roles:', error);
            }
        }
        getRoles();
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
            const url = base_url(['roles', 'createPermission']);
            const body = {
                ...permission,
                roleIds: permission.roleIds && permission.roleIds.length > 0 
                    ? permission.roleIds.map(id => parseInt(id))
                    : null  // ✅ null en lugar de array vacío
            };

            const response = await fetchHelper.post(url, body, {}, 1000);

            setPermission({
                id: '',
                name: '',
                code: '',
                type: '',
                description: '',
                roleIds: [],
            });
            modalInstance?.current?.hide();
            dataTableRef?.current?.ajax.reload();
            setErrors({});
            setErrorMessage('');
            setPermissionCreate(true);
        } catch (error) {
            console.error('Error completo:', error);
            
            // Verificar si es error de permisos
            if (error?.errors && error.errors.length > 0) {
                const fieldErrors = {};
                error.errors.forEach(err => {
                    fieldErrors[err.field] = err.message;
                });
                setErrors(fieldErrors);
            } else if (error?.msg) {
                setErrorMessage(error.msg);
            } else {
                setErrorMessage('Error al crear el permiso. Verifica los logs del servidor.');
            }
            setPermissionCreate(false);
        }
    }

    return (
        <div className="modal fade" ref={modalRef} id="modalCreatePermission" tabIndex={-1} aria-hidden="true">
            <div className="modal-dialog modal-dialog-centered" role="document">
                <div className="modal-content">
                    <div className="modal-header">
                        <h4 className="modal-title">Crear Permiso</h4>
                        <button
                            type="button"
                            className="btn-close"
                            data-bs-dismiss="modal"
                            aria-label="Close">
                        </button>
                    </div>
                    <div className="modal-body">
                        <div className={`alert alert-danger alert-dismissible ${errorMessage === '' ? 'd-none' : ''}`} role="alert">
                            <button type="button" className="btn-close" onClick={() => setErrorMessage('')} aria-label="Close"></button>
                            <div className="d-flex align-items-center">
                                <i className="ri-error-warning-line me-2"></i>
                                <span>{errorMessage}</span>
                            </div>
                        </div>

                        <div className="row">
                            <div className="col mt-2">
                                <InputModal
                                    type="text"
                                    id="name"
                                    label="Nombre del permiso"
                                    value={permission.name}
                                    onChange={(e) => {
                                        setPermission({ ...permission, name: e.target.value });
                                        setErrors({...errors, name: ''});
                                    }}
                                    error={errors.name}
                                    placeholder="Creacion de usuario"
                                    required={true}
                                />
                                {/* <small className="text-muted">
                                    <i className="ri-information-line"></i> Formato recomendado: PERM_ACCION_OBJETO (ej: PERM_CREATE_USER, PERM_DELETE_ROLE)
                                </small> */}
                            </div>

                            <div className="col mt-2">
                                <InputSelectModal
                                    id="type"
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
                            <div className="col mt-2">
                                
                                <InputModal
                                    type="text"
                                    id="code"
                                    label="Código del permiso"
                                    value={permission.code}
                                    onChange={(e) => setPermission({ ...permission, code: e.target.value.toUpperCase().trim().replace(/ /g, '_') })}
                                    error={errors.code}
                                    placeholder="CREATE_USER"
                                    required={true}
                                />
                            </div>
                            <div className="col mt-2">
                                <InputSelectModal
                                    id="moduleId"
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
                            <div className="col mt-2">
                                <TextareaModal
                                    id="description"
                                    label="Descripción del permiso"
                                    value={permission.description}
                                    onChange={(e) => setPermission({ ...permission, description: e.target.value })}
                                    error={errors.description}
                                    placeholder="Descripción del permiso"
                                />
                            </div>
                        </div>

                        <div className="row">
                            <div className="col mt-2">
                                <InputSelectModal
                                    id="roleIds"
                                    label="Roles asociados (opcional)"
                                    value={permission.roleIds}
                                    onChange={(value) => setPermission({
                                        ...permission,
                                        roleIds: value
                                    })}
                                    error={errors.roleIds}
                                    placeholder="Seleccione roles"
                                    options={roles}
                                    multiple={true}
                                    required={false}
                                />
                                <small className="text-muted">
                                    Los roles seleccionados tendrán este permiso automáticamente
                                </small>
                            </div>
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button 
                            type="button" 
                            className="btn btn-outline-secondary" 
                            data-bs-dismiss="modal"
                            disabled={isSubmitting}
                        >
                            Cerrar
                        </button>
                        <button 
                            type="button" 
                            className="btn btn-primary" 
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <>
                                    <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                                    Guardando...
                                </>
                            ) : (
                                'Guardar'
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default CreatedPermission;