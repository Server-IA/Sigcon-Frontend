import { useState } from 'react';
import InputModal from "../../../components/molecules/InputModal";
import InputSelectModal from "../../../components/molecules/inputSelectModal";
import { base_url } from '../../../utils/functions';
import { fetchHelper } from '../../../utils/fetch';
import AlertPage from '../../../components/molecules/AlertPage';

const UpdatedUser = ({ modalRef, modalInstance, user, setUser, dataTableRef, setUserUpdate, roles }) => {

    const [errors, setErrors] = useState({});
    const [errorMessage, setErrorMessage] = useState('');

    const statusOptions = [
        { id: 'ACTIVE', name: 'Activo' },
        { id: 'INACTIVE', name: 'Inactivo' },
        // QA Bloque PA Bug 15 (HU-PA-07 E3): permitir BLOCKED en edicion
        { id: 'BLOCKED', name: 'Bloqueado' }
    ];

    const handleSubmit = async (e) => {
        e.preventDefault();

        // QA Bloque PA Bug 21 (HU-PA-09 E3, 2026-05-09): validar al menos un rol antes
        // de enviar al backend. El array `user.roles` contiene los nombres de roles
        // seleccionados en el multi-select.
        const selectedRoles = Array.isArray(user.roles) ? user.roles : (user.roles ? [user.roles] : []);
        if (selectedRoles.length === 0) {
            setErrors({ ...errors, roles: 'El usuario debe tener al menos un rol activo. Asigne otro rol antes de remover este' });
            setErrorMessage('El usuario debe tener al menos un rol activo. Asigne otro rol antes de remover este');
            return;
        }

        try {
            const url = base_url(['users', 'updateUser', user.id]);

            const body = {
                name: user.name,
                lastname: user.lastname,
                email: user.email,
                status: user.status,
                // QA Bloque PA Bug 20 (HU-PA-09 E1/E2): array de varios roles
                roles: selectedRoles,
                username: user.username
            };

            // Solo incluir password si se está cambiando
            if (user.password && user.password.trim() !== '') {
                body.password = user.password;
            }

            await fetchHelper.put(url, body, {}, 1000);

            setUser({
                id: '',
                name: '',
                lastname: '',
                email: '',
                password: '',
                status: 'ACTIVE',
                roles: [],
                username: ''
            });

            dataTableRef?.current?.ajax.reload();
            modalInstance?.current?.hide();
            setUserUpdate(true);
            setErrors({});
            setErrorMessage('');

        } catch (error) {
            console.log(error);
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

    return (
        <div className="modal fade" ref={modalRef} id="modalUpdateUser" tabIndex={-1} aria-hidden="true">
            <div className="modal-dialog modal-dialog-centered" role="document">
                <div className="modal-content">
                    <div className="modal-header">
                        <h4 className="modal-title">Editar Usuario #{user.id}</h4>
                        <button
                            type="button"
                            className="btn-close"
                            data-bs-dismiss="modal"
                            aria-label="Close">
                        </button>
                    </div>
                    <div className="modal-body">
                        <AlertPage message={errorMessage} type='danger' show={errorMessage !== ''} onChange={() => setErrorMessage('')} />

                        <div className="row">
                            <div className="col mb-6 mt-2">
                                <InputModal
                                    type="text"
                                    id="name_updated"
                                    label="Nombre"
                                    value={user.name}
                                    onChange={(e) => setUser({ ...user, name: e.target.value })}
                                    error={errors.name}
                                    placeholder="Nombre del usuario"
                                />
                            </div>

                            <div className="col mb-6 mt-2">
                                <InputModal
                                    type="text"
                                    id="lastname_updated"
                                    label="Apellido"
                                    value={user.lastname}
                                    onChange={(e) => setUser({ ...user, lastname: e.target.value })}
                                    error={errors.lastname}
                                    placeholder="Apellido del usuario"
                                />
                            </div>

                            <div className="col mb-6 mt-2">
                                <InputModal
                                    type="text"
                                    id="username_updated"
                                    label="Nombre de usuario"
                                    value={user.username}
                                    onChange={(e) => setUser({ ...user, username: e.target.value })}
                                    error={errors.username}
                                    placeholder="Nombre de usuario"
                                />
                            </div>
                        </div>

                        <div className="row">
                            <div className="col mb-6 mt-2">
                                <InputModal
                                    type="email"
                                    id="email_updated"
                                    label="Email"
                                    value={user.email}
                                    onChange={(e) => setUser({ ...user, email: e.target.value })}
                                    error={errors.email}
                                    placeholder="correo@ejemplo.com"
                                />
                            </div>

                            <div className="col mb-6 mt-2">
                                <InputSelectModal
                                    id="status_updated"
                                    label="Estado"
                                    value={user.status}
                                    onChange={(value) => setUser({
                                        ...user,
                                        status: value
                                    })}
                                    error={errors.status}
                                    placeholder="Seleccione estado"
                                    options={statusOptions}
                                />
                            </div>
                        </div>

                        <div className="row">
                            <div className="col mb-6 mt-2">
                                <InputModal
                                    type="password"
                                    id="password_updated"
                                    label="Nueva Contraseña (opcional)"
                                    value={user.password}
                                    onChange={(e) => setUser({ ...user, password: e.target.value })}
                                    error={errors.password}
                                    placeholder="Dejar vacío para no cambiar"
                                />
                                <small className="text-muted">Dejar en blanco si no desea cambiar la contraseña</small>
                            </div>
                            {/* QA Bloque PA Bug 20 (HU-PA-09 E1/E2): multi-select de roles en edicion */}
                            <div className="col mb-6 mt-2">
                                <InputSelectModal
                                    id="roles_updated"
                                    label="Roles del usuario"
                                    value={Array.isArray(user.roles) ? user.roles : (user.roles ? [user.roles] : [])}
                                    onChange={(value) => setUser({
                                        ...user,
                                        roles: Array.isArray(value) ? value : (value ? [value] : [])
                                    })}
                                    error={errors.roles || errors.roles_updated}
                                    placeholder="Seleccione uno o varios roles"
                                    options={roles.map(role => ({
                                        label: role.name,
                                        id: role.name
                                    }))}
                                    multiple={true}
                                />
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

export default UpdatedUser;
