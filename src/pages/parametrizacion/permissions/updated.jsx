import { useState, useEffect } from 'react';
import MultiSelectModal from "../../../components/molecules/MultiSelectModal";
import { base_url } from '../../../utils/functions';
import { fetchHelper } from '../../../utils/fetch';

const UpdatedPermission = ({ modalRef, modalInstance, permission, setPermission, onSuccess }) => {

    const [errors, setErrors] = useState({});
    const [errorMessage, setErrorMessage] = useState('');
    const [roles, setRoles] = useState([]);
    const [originalRoleIds, setOriginalRoleIds] = useState([]);

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

    useEffect(() => {
        if (permission.id) {
            setOriginalRoleIds(permission.roleIds || []);
        }
    }, [permission.id]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            const currentRoleIds = permission.roleIds.map(id => parseInt(id));
            const originalIds = originalRoleIds.map(id => parseInt(id));

            // Roles a los que hay que AGREGAR este permiso
            const rolesToAddPermission = currentRoleIds.filter(id => !originalIds.includes(id));
            
            // Roles de los que hay que QUITAR este permiso
            const rolesToRemovePermission = originalIds.filter(id => !currentRoleIds.includes(id));

            let hasChanges = false;

            // ✅ ASIGNAR permiso a roles nuevos
            for (const roleId of rolesToAddPermission) {
                const urlAssign = base_url(['roles', 'assign-permissions']);
                await fetchHelper.post(urlAssign, {
                    id: roleId,  // ✅ ID del ROL
                    permissionIds: [parseInt(permission.id)]  // ✅ ID del PERMISO
                }, {}, 0, true);
                hasChanges = true;
            }

            // ✅ REMOVER permiso de roles
            for (const roleId of rolesToRemovePermission) {
                const urlRemove = base_url(['roles', 'remove-permissions']);
                await fetchHelper.post(urlRemove, {
                    id: roleId,  // ✅ ID del ROL
                    permissionIds: [parseInt(permission.id)]  // ✅ ID del PERMISO
                }, {}, 0, true);
                hasChanges = true;
            }

            if (!hasChanges) {
                window.Swal.fire({
                    icon: 'info',
                    title: 'Sin cambios',
                    text: 'No se realizaron cambios',
                    timer: 1500,
                    showConfirmButton: false
                });
                modalInstance?.current?.hide();
                return;
            }

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
                text: 'Permiso actualizado correctamente',
                timer: 2000,
                showConfirmButton: false
            });

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
                                <div className="form-floating form-floating-outline">
                                    <input
                                        type="text"
                                        id="name"
                                        className="form-control"
                                        value={permission.name}
                                        disabled
                                    />
                                    <label htmlFor="name">Nombre del permiso</label>
                                </div>
                                <small className="text-muted">El nombre del permiso no puede ser editado</small>
                            </div>
                        </div>

                        <div className="row">
                            <div className="col mb-6 mt-2">
                                <MultiSelectModal
                                    id="roleIds"
                                    label="Roles que tienen este permiso"
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
                                    Selecciona los roles que deben tener este permiso
                                </small>
                            </div>
                        </div>
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