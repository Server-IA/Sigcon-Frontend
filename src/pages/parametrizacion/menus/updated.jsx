import InputModal from "../../../components/molecules/InputModal";
import InputSelectModal from "../../../components/molecules/inputSelectModal";

import { useState, useRef, useEffect } from "react";
import { fetchHelper } from "../../../utils/fetch";
import { base_url } from "../../../utils/functions";
import { useDispatch } from 'react-redux';
import { refreshMenu } from '../../../routes/routes';
import InputRadio from "../../../components/molecules/InputRadio";

const UpdatedMenu = ({ modalRef, modalInstance, menu, setMenu, dataTableRef, setMenuUpdate, modules, parents, components }) => {

    const dispatch = useDispatch();
    const [errors, setErrors] = useState({});
    const [errorMessage, setErrorMessage] = useState('');

    const [optionMenus, setOptionMenus] = useState([]);

    useEffect(() => {
        if (modalRef.current) {
            modalRef.current.addEventListener('hidden.bs.modal', () => {
                setErrors({});
                setErrorMessage('');
            });
        }
        return () => {
            if (modalRef.current) {
                modalRef.current.removeEventListener('hidden.bs.modal', () => {
                    setErrors({});
                    setErrorMessage('');
                });
            }
        };
    }, [modalRef.current]);

    useEffect(() => {
        const optionMenus = parents.filter(parent => parent.moduleId == menu.moduleId);

        setOptionMenus(optionMenus.map(parent => ({
            id: parent.id,
            name: parent.name,
        })).filter(option => option.id != menu.id));
    }, [menu]);
    

    const handleSubmit = async (e) => {
        e.preventDefault();

        try{

            const url = base_url(['api', 'menus', 'update']);
            await fetchHelper.put(url, menu, {}, 1000);
            dispatch(refreshMenu());
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
                visible: true,
            });
            dataTableRef?.current?.ajax.reload();
            modalInstance?.current?.hide();
            setMenuUpdate(true);
            setErrors({});
            setErrorMessage('');

        }catch (error) {
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
                                onChange={(e) => {
                                    setMenu({ ...menu, label: e.target.value })
                                    setErrors((prev) => ({
                                        ...prev,
                                        label: '',
                                    }))
                                }}
                                error={errors.label}
                                placeholder="Nombre del menu"
                                required={true}
                            />
                        </div>

                        <div className="col mb-6 mt-2">
                            <InputModal
                                type="text"
                                id="path_updated"
                                label="Ruta del menu"
                                value={menu.path}
                                onChange={(e) => {
                                    setMenu({ ...menu, path: e.target.value })
                                    setErrors((prev) => ({
                                        ...prev,
                                        path: '',
                                    }))
                                }}
                                error={errors.path}
                                placeholder="Ruta del menu"
                                required={true}
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
                                onChange={(e) => {
                                    setMenu({ ...menu, icon: e.target.value })
                                    setErrors((prev) => ({
                                        ...prev,
                                        icon: '',
                                    }))
                                }}
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
                                onChange={(e) => {
                                    setMenu({ ...menu, menuOrder: e.target.value ? parseInt(e.target.value) : 1 })
                                    setErrors((prev) => ({
                                        ...prev,
                                        menuOrder: '',
                                    }))
                                }}
                                error={errors.menuOrder}
                                placeholder="Orden del menu"
                                required={true}
                            />
                        </div>
                    </div>

                    <div className="row">
                        <div className="col mb-6 mt-2">
                            <InputSelectModal
                                id="component_updated"
                                label="Componente del menu"
                                value={menu.component}
                                onChange={(value) => {
                                    setMenu({ ...menu, component: value })
                                    setErrors((prev) => ({
                                        ...prev,
                                        component: '',
                                    }))
                                }}
                                error={errors.component}
                                placeholder="Componente del menu"
                                options={components}
                                required={true}
                            />
                        </div>
                        <div className="col mb-6 mt-2">
                            <InputSelectModal
                                id="moduleId_updated"
                                label="Modulo del menu"
                                value={menu.moduleId}
                                onChange={(value) => {
                                    setMenu({ ...menu, moduleId: value })
                                    setErrors((prev) => ({
                                        ...prev,
                                        moduleId: '',
                                    }))
                                }}
                                error={errors.moduleId}
                                placeholder="Modulo del menu"
                                options={modules}
                                required={true}
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
                                options={optionMenus}
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
                    <div className="row">
                        <div className="col mb-6 mt-2">
                            <small className="text-light fw-medium d-block">Visible</small>
                            <InputRadio
                                id="menu-visible-true-update"
                                label="Si"
                                name="visible-update"
                                value="true"
                                checked={menu.visible === true}
                                onChange={() =>
                                    setMenu((m) => ({ ...m, visible: true }))
                                }
                            />
                            <InputRadio
                                id="menu-visible-false-update"
                                label="No"
                                name="visible-update"
                                value="false"
                                checked={menu.visible === false}
                                onChange={() =>
                                    setMenu((m) => ({ ...m, visible: false }))
                                }
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