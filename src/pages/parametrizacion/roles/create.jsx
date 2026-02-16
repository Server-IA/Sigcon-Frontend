import '../../../styles/vendor/animate-css/animate.css'
import { base_url, chunkArray } from '../../../utils/functions';
import { fetchHelper } from '../../../utils/fetch';
import { useEffect, useState } from 'react';

import InputModal from "../../../components/molecules/InputModal";
import InputSelectModal from "../../../components/molecules/inputSelectModal";



// ============================================
// Componente principal
// ============================================
const CreateRole = ({ modalRef, modalInstance, role, setRole, dataTableRef, setRoleCreate, modules }) => {

    const [errors, setErrors] = useState({});
    const [errorMessage, setErrorMessage] = useState('');
    
    const handleCreateRole = async () => {
        console.log("Role to create", role);
        try {
            const url = base_url(['roles', 'createRole']);
            const response = await fetchHelper.post(url, role, {}, 1000);

            setRole({
                id: '',
                name: '',
                status: '',
                permissionIds: [],
            })

            dataTableRef?.current?.ajax.reload();
            modalInstance?.current?.hide();
            setRoleCreate(true);
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

    useEffect(() => {
        setErrors({});
        setErrorMessage('');
    }, [role]);

    return (
        <div className="modal fade" ref={modalRef} id="modalCenter" tabIndex={-1} aria-hidden="true">
            <div className="modal-dialog modal-lg modal-simple modal-dialog-centered modal-add-new-role">
                <div className="modal-content">
                    <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>

                    {/* Body */}
                    <div className="modal-body p-0">
                        <div className="text-center mb-6">
                            <h4 className="role-title mb-2 pb-0">Crear Rol</h4>
                            <p>Asigna permisos al rol</p>
                        </div>

                        {/* Error */}
                        <div className={`alert alert-danger alert-dismissible ${errorMessage === '' ? 'd-none' : ''}`} role="alert">
                            <button type="button" className="btn-close" onClick={() => setErrorMessage('')} aria-label="Close"></button>
                            <span>{errorMessage}</span>
                        </div>

                        <div className="row">
                            <div className="col mb-6 mt-2">
                                <InputModal
                                    id="name"
                                    label="Nombre del rol"
                                    value={role.name}
                                    onChange={(e) => setRole({ ...role, name: e.target.value })}
                                    error={errors.name}
                                    placeholder="Nombre del rol"
                                    required={true}
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
                                            <div className="accordion-item" key={`${module.module.id}-accordion`}>
                                                <h2 className="accordion-header">
                                                    <button
                                                    type="button"
                                                    className="accordion-button collapsed"
                                                    data-bs-toggle="collapse"
                                                    data-bs-target={`#${module.module.id}-accordion`}
                                                    aria-expanded="false">
                                                        {module.module.name}
                                                    </button>
                                                </h2>

                                                <div id={`${module.module.id}-accordion`} className="accordion-collapse collapse" data-bs-parent="#accordionStyle1">
                                                    <div className="accordion-body">
                                                        {permissionsModule.map((permission, index) => (
                                                            <div className="row" key={`${module.module.id}-permissions-row-${index}`}>
                                                                {permission.map((p) => (
                                                                    <div className="col-6" key={`${p.id}-permission`}>
                                                                        <div className="form-check form-switch mb-2">
                                                                            <input
                                                                                className="form-check-input"
                                                                                type="checkbox"
                                                                                value={p.id}
                                                                                checked={role.permissionIds.includes(p.id)}
                                                                                id={`${p.id}-permission`}
                                                                                onChange={(e) => setRole({
                                                                                    ...role,
                                                                                    permissionIds:
                                                                                        role.permissionIds.includes(p.id) ?
                                                                                            role.permissionIds.filter(id => id !== p.id)
                                                                                            : [...role.permissionIds, p.id] })}
                                                                            />
                                                                            <label className="form-check-label" htmlFor={`${p.id}-permission`}>
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
                            onClick={handleCreateRole}
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

export default CreateRole;