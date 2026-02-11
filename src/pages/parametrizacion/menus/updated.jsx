import InputModal from "../../../components/molecules/InputModal";
import InputSelectModal from "../../../components/molecules/inputSelectModal";

import { useState, useRef, useEffect } from "react";
import { fetchHelper } from "../../../utils/fetch";
import { base_url } from "../../../utils/functions";

const UpdatedMenu = ({ modalRef, modalInstance, menu, setMenu, dataTableRef, setMenuUpdate }) => {

    const [errors, setErrors] = useState({});
    const [errorMessage, setErrorMessage] = useState('');

    const [modules, setModules] = useState([]);
    const [menusPrincipales, setMenusPrincipales] = useState([]);

    useEffect(() => {
        const getModules = async () => {
            const url = base_url(['api', 'modules']);
            const body = {
                length: -1,
            }
            const {data} = await fetchHelper.post(url, body, {}, 0);
            setModules(
                data.map(module => ({
                    id: module.id,
                    name: module.name,
                }))
            );
        }

        const getMenusPrincipales = async () => {
            const url = base_url(['api', 'menus', 'datatable']);
            const body = {
                length: -1,
                parentId: -1,
            }
            const {data} = await fetchHelper.post(url, body, {}, 0);
            setMenusPrincipales(
                data.map(menu => ({
                    id: menu.id,
                    name: menu.label,
                }))
            );
        }
        
        getModules();
        getMenusPrincipales();
    }, []);

    useEffect(() => {
        console.log(["Menu updated: ", menu]);
    }, [menu]);
    

    const handleSubmit = async (e) => {
        e.preventDefault();

        try{

            const url = base_url(['api', 'menus', 'update']);
            await fetchHelper.put(url, menu, {}, 1000);
            setMenu({
                id: '',
                label: '',
                icon: '',
                path: '',
                menuOrder: '',
                parentId: null,
                moduleId: null,
                status: 'ACTIVE',
                component: '',
            });
            dataTableRef?.current?.ajax.reload();
            modalInstance?.current?.hide();
            setMenuUpdate(true);
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
                    <h4 className="modal-title" id="modalCenterTitle">Actualizar Menu #{menu.id}</h4>
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
                            <InputModal
                                type="text"
                                id="label_updated"
                                label="Nombre del menu"
                                value={menu.label}
                                onChange={(e) => setMenu({ ...menu, label: e.target.value })}
                                error={errors.label}
                                placeholder="Nombre del menu"
                            />
                        </div>

                        <div className="col mb-6 mt-2">
                            <InputModal
                                type="text"
                                id="path_updated"
                                label="Ruta del menu"
                                value={menu.path}
                                onChange={(e) => setMenu({ ...menu, path: e.target.value })}
                                error={errors.path}
                                placeholder="Ruta del menu"
                            />
                        </div>
                    </div>

                    <div className="row">
                        <div className="col mb-6 mt-2">
                            <InputModal
                                type="text"
                                id="icon_updated"
                                label="Icono del menu"
                                value={menu.icon}
                                onChange={(e) => setMenu({ ...menu, icon: e.target.value })}
                                error={errors.icon}
                                placeholder="Icono del menu"
                            />
                        </div>
                        <div className="col mb-6 mt-2">
                            <InputModal 
                                type="number"
                                id="menuOrder_updated"
                                label="Orden del menu"
                                value={menu.menuOrder}
                                onChange={(e) => setMenu({ ...menu, menuOrder: e.target.value ? parseInt(e.target.value) : 1 })}
                                error={errors.menuOrder}
                                placeholder="Orden del menu"
                            />
                        </div>
                    </div>

                    <div className="row">
                        <div className="col mb-6 mt-2">
                            <InputModal
                                type="select"
                                id="component_updated"
                                label="Componente del menu"
                                value={menu.component}
                                onChange={(e) => setMenu({ ...menu, component: e.target.value })}
                                error={errors.component}
                                placeholder="Componente del menu"
                            >
                            </InputModal>
                        </div>
                        <div className="col mb-6 mt-2">
                            <InputSelectModal
                                id="moduleId_updated"
                                label="Modulo del menu"
                                value={menu.moduleId}
                                onChange={(value) => setMenu({ ...menu, moduleId: value })}
                                error={errors.moduleId}
                                placeholder="Modulo del menu"
                                options={modules}
                            />
                        </div>
                    </div>

                    <div className="row">
                        <div className="col mb-6 mt-2">
                            <InputSelectModal
                                id="parentId_updated"
                                label="Menu principal"
                                value={menu.parentId}
                                onChange={(value) => setMenu({ ...menu, parentId: value })}
                                error={errors.parentId}
                                placeholder="Menu principal"
                                options={menusPrincipales}
                                clearable={true}
                            />
                        </div>

                        <div className="col mb-6 mt-2">
                            <InputSelectModal
                                id="status_updated"
                                label="Estado del menu"
                                value={menu.status}
                                onChange={(value) => setMenu({ ...menu, status: value })}
                                error={errors.status}
                                placeholder="Estado del menu"
                                options={[{ label: 'Activo', id: 'ACTIVE' }, { label: 'Inactivo', id: 'INACTIVE' }]}
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
    );
}

export default UpdatedMenu;