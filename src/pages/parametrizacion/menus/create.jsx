import { useState, useEffect, useRef } from 'react';
import InputModal from "../../../components/molecules/InputModal";
import InputSelectModal from "../../../components/molecules/inputSelectModal";

import { base_url } from '../../../utils/functions';
import { fetchHelper } from '../../../utils/fetch';
import AlertPage from '../../../components/molecules/AlertPage';

const CreateMenu = ({ modalRef, modalInstance, menu, setMenu, dataTableRef, setMenuCreate, modules, parents, components }) => {

    const [errors, setErrors] = useState({});
    const [error, setError] = useState({
        message: '',
        type: '',
        show: false,
    });

    const [optionMenus, setOptionMenus] = useState([]);

    useEffect(() => {
        if (modalRef.current) {
            modalRef.current.addEventListener('hidden.bs.modal', () => {
                setError({ message: '', type: '', show: false });
                setErrors({});
            });
        }
        return () => {
            if (modalRef.current) {
                modalRef.current.removeEventListener('hidden.bs.modal', () => {
                    setError({ message: '', type: '', show: false });
                    setErrors({});
                });
            }
        };
    }, [modalRef.current]);

    useEffect(() => {
        const optionMenus = parents.filter(parent => parent.moduleId == menu.moduleId);

        setOptionMenus(optionMenus.map(parent => ({
            id: parent.id,
            name: parent.name,
        })));
    }, [menu]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        try{

            const url = base_url(['api', 'menus', 'store']);
            await fetchHelper.post(url, menu, {}, 1000);
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
            setMenuCreate(true);
            setErrors({});
            setErrorMessage('');

        }catch (error) {
            console.error(error.msg);
            const errores = error?.errors;
            if (errores && errores.length > 0) {
                const fieldErrors = {};
                errores.forEach(err => {
                    fieldErrors[err.field] = err.message;
                });
                setErrors(fieldErrors);
            }else if (error?.msg) {
                setError({
                    message: error.msg,
                    type: 'danger',
                    show: true,
                });
            }
        }
    }

    return (
        <div className="modal fade" ref={modalRef} id="modalCenter" tabIndex={-1} aria-hidden="true">
            <div className="modal-dialog modal-dialog-centered" role="document">
            <div className="modal-content">
                <div className="modal-header">
                    <h4 className="modal-title" id="modalCenterTitle">Agregar Menu</h4>
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

                    <AlertPage message={error.message} type={error.type} show={error.show} onChange={() => setError({ message: '', type: '', show: false })} />

                    <div className="row">
                        <div className="col mb-6 mt-2">
                            <InputModal
                                type="text"
                                id="label"
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
                                id="path"
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
                                id="icon"
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
                                id="menuOrder"
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
                                id="component"
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
                                id="moduleId"
                                label="Modulo del menu"
                                value={menu.moduleId}
                                onChange={(value) => {
                                    setMenu({
                                        ...menu,
                                        moduleId: value
                                    })
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
                                id="parentId"
                                label="Menú principal"
                                value={menu.parentId}
                                onChange={(value) => setMenu({
                                    ...menu,
                                    parentId: value
                                })}
                                error={errors.parentId}
                                placeholder="Menú principal"
                                options={optionMenus}
                                clearable={true}
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

export default CreateMenu;