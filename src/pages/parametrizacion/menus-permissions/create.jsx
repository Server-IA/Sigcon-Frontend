import { useState, useEffect, useRef } from 'react';
import InputModal from "../../../components/molecules/InputModal";
import InputSelectModal from "../../../components/molecules/inputSelectModal";

import { base_url } from '../../../utils/functions';
import { fetchHelper } from '../../../utils/fetch';
import { refreshMenu } from '../../../routes/routes';
import { useDispatch } from 'react-redux';

const CreateMenuPermission = ({ modalRef, modalInstance, menuPermission, setMenuPermission, dataTableRef, setMenuCreate }) => {

    const dispatch = useDispatch();

    const [errors, setErrors] = useState({});
    const [errorMessage, setErrorMessage] = useState('');

    const [menus, setMenus] = useState([]);
    const [roles, setRoles] = useState([]);

    useEffect(() => {
        const getMenus = async () => {
            const url = base_url(['api', 'menus', 'datatable']);
            const body = {
                length: -1,
            }
            const {data} = await fetchHelper.post(url, body, {}, 0);
            setMenus(
                data.map(module => ({
                    id: module.id,
                    name: module.label,
                }))
            );
        }

        const getRoles = async () => {
            const url = base_url(['roles/getRoles']);
            const body = {
                length: -1,
                parentId: -1,
            }
            const {data} = await fetchHelper.post(url, body, {}, 0);
            setRoles(
                data.map(rol => ({
                    id: rol.id,
                    name: rol.name,
                }))
            );
        }
        getMenus();
        getRoles();
    }, []);

    useEffect(() => {
        console.log(menuPermission, 'menuPermission');
    }, [menuPermission]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        try{

            const url = base_url(['api', 'menu-permissions', 'store']);
            await fetchHelper.post(url, menuPermission, {}, 1000);
            dispatch(refreshMenu());
            setMenuPermission({
                id: '',
                menu_id: '',
                role_id: '',
            });
            dataTableRef?.current?.ajax.reload();
            modalInstance?.current?.hide();
            setMenuCreate(true);
            setErrors({});
            setErrorMessage('');

        }catch (error) {
            console.log(error.msg);
            const errores = error?.errors;
            if (errores && errores.length > 0) {
                const fieldErrors = {};
                errores.forEach(err => {
                    fieldErrors[err.field] = err.message;
                });
                setErrors(fieldErrors);
            }else if (error?.msg) {
                setErrorMessage(error.msg);
            }
        }
    }

    return (
        <div className="modal fade" ref={modalRef} id="modalCenter" tabIndex={-1} aria-hidden="true">
            <div className="modal-dialog modal-dialog-centered" role="document">
            <div className="modal-content">
                <div className="modal-header">
                    <h4 className="modal-title" id="modalCenterTitle">Editar Menu</h4>
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
                    <div className={`alert alert-danger alert-dismissible ${errorMessage == '' ? 'd-none' : ''}`} role="alert">
                        <button type="button" className="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                        <span>{errorMessage}</span>
                    </div>

                    <div className="row">
                        <div className="col mb-6 mt-2">
                            <InputSelectModal
                                id="menu_id"
                                label="Menu principal"
                                value={menuPermission.menu_id}
                                onChange={(value) => setMenuPermission({
                                    ...menuPermission,
                                    menu_id: value
                                })}
                                error={errors.menu_id}
                                placeholder="Menu principal"
                                options={menus}

                            />
                        </div>

                        <div className="col mb-6 mt-2">
                            <InputSelectModal
                                id="role_id"
                                label="Rol"
                                value={menuPermission.role_id}
                                onChange={(value) => setMenuPermission({
                                    ...menuPermission,
                                    role_id: value
                                })}
                                error={errors.role_id}
                                placeholder="Roles"
                                options={roles}
                            />
                        </div>
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
    )
}

export default CreateMenuPermission;