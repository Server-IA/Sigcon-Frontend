import { useState, useEffect } from 'react';
import InputModal from "../../../components/molecules/InputModal";
import MultiSelectModal from "../../../components/molecules/MultiSelectModal";
import { base_url } from '../../../utils/functions';
import { fetchHelper } from '../../../utils/fetch';

const CreatePermission = ({ modalRef, modalInstance, permission, setPermission, onSuccess }) => {

    const [errors, setErrors] = useState({});
    const [errorMessage, setErrorMessage] = useState('');
    const [roles, setRoles] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const getRoles = async () => {
            try {
                const url = base_url(['roles']);
                const response = await fetchHelper.get(url, {}, 0);
                
                const rolesData = response?.content || [];
                
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

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validación frontend
        if (!permission.name || permission.name.trim() === '') {
            setErrorMessage('El nombre del permiso es obligatorio');
            return;
        }

        if (isSubmitting) return;
        setIsSubmitting(true);

        try {
            const url = base_url(['roles', 'createPermission']);
            
            const body = {
                name: permission.name.toUpperCase().trim(),
                roleIds: permission.roleIds && permission.roleIds.length > 0 
                    ? permission.roleIds.map(id => parseInt(id))
                    : null  // ✅ null en lugar de array vacío
            };

            console.log('Enviando:', body);

            const response = await fetchHelper.post(url, body, {}, 1000);
            
            console.log('Respuesta:', response);

            if (response.success) {
                setPermission({
                    id: '',
                    name: '',
                    roleIds: [],
                });
                
                onSuccess?.();
                modalInstance?.current?.hide();
                setErrors({});
                setErrorMessage('');

                window.Swal.fire({
                    icon: 'success',
                    title: 'Éxito',
                    text: response.message || 'Permiso creado correctamente',
                    timer: 2000,
                    showConfirmButton: false
                });
            } else {
                setErrorMessage(response.message || 'Error al crear el permiso');
            }

        } catch (error) {
            console.error('Error completo:', error);
            
            // Verificar si es error de permisos
            if (error.status === 403) {
                setErrorMessage('No tienes permisos para crear permisos. Contacta al administrador.');
            } else if (error?.errors && error.errors.length > 0) {
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
        } finally {
            setIsSubmitting(false);
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
                            <div className="col mb-6 mt-2">
                                <InputModal
                                    type="text"
                                    id="name"
                                    label="Nombre del permiso *"
                                    value={permission.name}
                                    onChange={(e) => {
                                        setPermission({ ...permission, name: e.target.value });
                                        setErrors({...errors, name: ''});
                                    }}
                                    error={errors.name}
                                    placeholder="PERM_CREATE_USER"
                                />
                                <small className="text-muted">
                                    <i className="ri-information-line"></i> Formato recomendado: PERM_ACCION_OBJETO (ej: PERM_CREATE_USER, PERM_DELETE_ROLE)
                                </small>
                            </div>
                        </div>

                        <div className="row">
                            <div className="col mb-6 mt-2">
                                <MultiSelectModal
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

export default CreatePermission;