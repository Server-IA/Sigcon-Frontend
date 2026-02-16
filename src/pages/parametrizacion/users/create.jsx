import { useState, useEffect } from 'react';
import InputModal from "../../../components/molecules/InputModal";
import InputSelectModal from "../../../components/molecules/inputSelectModal";
import { base_url } from '../../../utils/functions';
import { fetchHelper } from '../../../utils/fetch';

const CreateUser = ({ modalRef, modalInstance, user, setUser, dataTableRef, setUserCreate }) => {

    const [errors, setErrors] = useState({});
    const [errorMessage, setErrorMessage] = useState('');
    const [roles, setRoles] = useState([]);

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

        try {
            const url = base_url(['auth', 'register']);
            
            const body = {
                name: user.name,
                lastname: user.lastname,
                email: user.email,
                password: user.password,
                roleId: user.roleId ? parseInt(user.roleId) : null
            };

            await fetchHelper.post(url, body, {}, 1000);
            
            setUser({
                id: '',
                name: '',
                lastname: '',
                email: '',
                password: '',
                status: 'ACTIVE',
                roleId: null
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

                            <div className="col mb-6 mt-2">
                                <InputSelectModal
                                    id="roleId"
                                    label="Rol del usuario"
                                    value={user.roleId}
                                    onChange={(value) => setUser({
                                        ...user,
                                        roleId: value
                                    })}
                                    error={errors.roleId}
                                    placeholder="Seleccione un rol"
                                    options={roles}
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