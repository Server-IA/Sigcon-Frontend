import '../../../styles/vendor/animate-css/animate.css'
import { base_url, chunkArray } from '../../../utils/functions';
import { fetchHelper } from '../../../utils/fetch';
import { useEffect, useState } from 'react';

import InputModal from "../../../components/molecules/InputModal";
import InputSelectModal from "../../../components/molecules/inputSelectModal";
import AlertPage from '../../../components/molecules/AlertPage';



// ============================================
// Componente principal
// ============================================
const UpdatedRole = ({ modalRef, modalInstance, role, setRole, dataTableRef, setMessageRole, modules }) => {

    const [errors, setErrors] = useState({});
    const [errorMessage, setErrorMessage] = useState('');
    const [roleUpdated, setRoleUpdated] = useState({
        name: role.name,
        status: role.status,
        permissionIds: []
    });

    useEffect(() => {
        setRoleUpdated({
            id: role.id,
            status: role.status,
            name: role.name,
            permissionIds: role.permissionIds,
        });        
        setErrors({});
        setErrorMessage('');
        console.log("Role updated", roleUpdated);

    }, [role]);

    const handleUpdatedRole = async () => {
        try {
            const url = base_url(['roles', 'updateRole', role.id]);
            await fetchHelper.put(url, roleUpdated, {}, 1000);

            setRole({
                id: '',
                name: '',
                status: '',
                permissionIds: [],
            });

            setRoleUpdated({
                id: '',
                name: '',
                status: '',
                permissionIds: [],
            });

            dataTableRef?.current?.ajax.reload();
            modalInstance?.current?.hide();
            setMessageRole({
                message: 'Rol actualizado exitosamente',
                type: 'success',
                show: true,
            });
            setErrors({});
            setErrorMessage('');
        } catch (error) {
            console.error('Error al crear rol:', error);
            const errores = error?.errors;
            if (errores && errores.length > 0) {
                const fieldErrors = {};
                errores.forEach(err => { fieldErrors[err.field] = err.message; });
                setErrors(fieldErrors);
            } else if (error?.msg) {
                setErrorMessage(error.msg);
            }
        }
    };

    useEffect(() => {
        console.log("Modulos", modules);
    }, [modules]);

    return (
        <div className="modal fade" ref={modalRef} id="modalCenter" tabIndex={-1} aria-hidden="true">
            <div className="modal-dialog modal-lg modal-simple modal-dialog-centered modal-add-new-role">
                <div className="modal-content">
                    <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>

                    {/* Body */}
                    <div className="modal-body">
                        <div className="text-center mb-6">
                            <h4 className="role-title mb-2 pb-0">Crear Rol</h4>
                            <p>Asigna permisos al rol</p>
                        </div>

                        {/* Error */}
                        <AlertPage message={errorMessage} type="danger" show={errorMessage !== ''} />

                        <div className="row">
                            <div className="col mb-6 mt-2">
                                <InputModal
                                    id="name_update"
                                    label="Nombre del rol"
                                    value={roleUpdated.name}
                                    onChange={(e) => setRoleUpdated({ ...roleUpdated, name: e.target.value })}
                                    error={errors.name}
                                    placeholder="Nombre del rol"
                                    required={true}
                                />
                            </div>
                            <div className="col mb-6 mt-2">
                                <InputSelectModal
                                    id="status_update"
                                    label="Estado del rol"
                                    value={roleUpdated.status}
                                    onChange={(value) => setRoleUpdated({ ...roleUpdated, status: value })}
                                    error={errors.status}
                                    placeholder="Estado del rol"
                                    allowClear={false}
                                    options={[{ label: 'Activo', id: 'ACTIVE' }, { label: 'Inactivo', id: 'INACTIVE' }]}
                                />
                            </div>
                        </div>

                        <div className="col-12">
                            <h5 className="mb-2">Role Permissions</h5>
                            <div className="col-md mb-5">
                                <div className="accordion mt-4 accordion-header-primary" id="accordionStyle1">
                                    {modules.map((module) => {

                                        const permissionsModule = chunkArray(module.permissions, 2);

                                        return (
                                            <div className="accordion-item" key={`${module.module.id}-accordion-update`}>
                                                <h2 className="accordion-header">
                                                    <button
                                                    type="button"
                                                    className="accordion-button collapsed"
                                                    data-bs-toggle="collapse"
                                                    data-bs-target={`#${module.module.id}-accordion-update`}
                                                    aria-expanded="false">
                                                        {module.module.name}
                                                    </button>
                                                </h2>

                                                <div id={`${module.module.id}-accordion-update`} className="accordion-collapse collapse" data-bs-parent="#accordionStyle1">
                                                    <div className="accordion-body">
                                                        {permissionsModule.map((permission, index) => (
                                                            <div className="row" key={`${module.module.id}-permissions-row-update-${index}`}>
                                                                {permission.map((p) => (
                                                                    <div className="col-6" key={`${p.id}-permission-update`}>
                                                                        <div className="form-check form-switch mb-2">
                                                                            <input
                                                                                className="form-check-input"
                                                                                type="checkbox"
                                                                                value={p.id}
                                                                                checked={roleUpdated.permissionIds.includes(p.id)}
                                                                                id={`${p.id}-permission-update`}
                                                                                onChange={(e) => setRoleUpdated({
                                                                                    ...roleUpdated,
                                                                                    permissionIds:
                                                                                        roleUpdated.permissionIds.includes(p.id) ?
                                                                                            roleUpdated.permissionIds.filter(id => id !== p.id)
                                                                                            : [...roleUpdated.permissionIds, p.id] })}
                                                                            />
                                                                            <label className="form-check-label" htmlFor={`${p.id}-permission-update`}>
                                                                                {p.name}
                                                                            </label>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>

                    </div>

                    {/* Footer */}
                    <div className="modal-footer justify-content-start">
                        <button
                            type="button"
                            className="btn btn-primary"
                            onClick={handleUpdatedRole}
                        >
                            Guardar
                        </button>
                        <button type="button" className="btn btn-danger ms-auto" data-bs-dismiss="modal">
                            Cerrar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UpdatedRole;