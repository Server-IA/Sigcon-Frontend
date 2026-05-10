import { useState, useEffect } from 'react';
import InputModal from "../../../components/molecules/InputModal";
import InputSelectModal from "../../../components/molecules/inputSelectModal";
import { base_url } from '../../../utils/functions';
import { fetchHelper } from '../../../utils/fetch';

const CreateUser = ({ modalRef, modalInstance, user, setUser, dataTableRef, setUserCreate, roles }) => {

    const [errors, setErrors] = useState({});
    const [errorMessage, setErrorMessage] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();

        // QA Bloque PA Bug 17 (HU-PA-08 E4, 2026-05-09): validar al menos un rol
        // asignado antes de enviar al backend. El array `user.roles` contiene
        // los nombres de roles seleccionados en multi-select.
        const selectedRoles = Array.isArray(user.roles) ? user.roles : (user.roles ? [user.roles] : []);
        if (selectedRoles.length === 0) {
            setErrors({...errors, roles: 'Debe asignar al menos un rol al usuario'});
            setErrorMessage('Debe asignar al menos un rol al usuario');
            return;
        }

        try {
            const url = base_url(['users', 'store']);
            const body = {
                name: user.name,
                lastname: user.lastname,
                email: user.email,
                username: user.username,
                password: user.password,
                // QA Bloque PA Bug 16 (HU-PA-08 E2): array de varios roles
                roles: selectedRoles
            };

            await fetchHelper.post(url, body, {}, 1000);

            setUser({
                id: '',
                name: '',
                lastname: '',
                email: '',
                username: '',
                password: '',
                status: 'ACTIVE',
                roles: []
            });

            dataTableRef?.current?.ajax.reload();
            modalInstance?.current?.hide();
            setUserCreate(true);
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

    useEffect(() => {
        console.log(user);
    }, [user]);

    return (
        <div className="modal fade" ref={modalRef} id="modalCreateUser" tabIndex={-1} aria-hidden="true">
            <div className="modal-dialog modal-dialog-centered" role="document">
                <div className="modal-content">
                    <div className="modal-header">
                        <h4 className="modal-title">Crear Usuario</h4>
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
                                    id="name"
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
                                    id="lastname"
                                    label="Apellido"
                                    value={user.lastname}
                                    onChange={(e) => setUser({ ...user, lastname: e.target.value })}
                                    error={errors.lastname}
                                    placeholder="Apellido del usuario"
                                />
                            </div>
                        </div>

                        <div className="row">
                            <div className="col mb-6 mt-2">
                                <InputModal
                                    type="email"
                                    id="email"
                                    label="Email"
                                    value={user.email}
                                    onChange={(e) => setUser({ ...user, email: e.target.value })}
                                    error={errors.email}
                                    placeholder="correo@ejemplo.com"
                                />
                            </div>

                            <div className="col mb-6 mt-2">
                                <InputModal
                                    type="text"
                                    id="username"
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
                                    type="password"
                                    id="password"
                                    label="Contraseña"
                                    value={user.password}
                                    onChange={(e) => setUser({ ...user, password: e.target.value })}
                                    error={errors.password}
                                    placeholder="Contraseña"
                                />
                            </div>

                            {/* QA Bloque PA Bug 16 (HU-PA-08 E2): multi-select de roles */}
                            <div className="col mb-6 mt-2">
                                <InputSelectModal
                                    id="roleId"
                                    label="Roles del usuario"
                                    value={Array.isArray(user.roles) ? user.roles : (user.roles ? [user.roles] : [])}
                                    onChange={(value) => setUser({
                                        ...user,
                                        roles: Array.isArray(value) ? value : (value ? [value] : [])
                                    })}
                                    error={errors.roles || errors.roleId}
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
                            Guardar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default CreateUser;