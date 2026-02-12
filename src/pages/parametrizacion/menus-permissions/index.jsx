import { useState, useRef, useEffect } from "react";
import DataTableReference from "../../../components/organism/DataTable";
import AlertPage from "../../../components/molecules/AlertPage"

import CreateMenuPermission from "./create";
import UpdateMenuPermission from "./updated";

const MenuPermissionIndex = () => {

    const modalCreateRef = useRef(null);
    const modalCreateInstance = useRef(null);

    const modalUpdateRef = useRef(null);
    const modalUpdateInstance = useRef(null);

    const [data, setData] = useState([]);
    const tableRefMenu = useRef(null);
    const dataTableRefMenu = useRef(null);

    const [menuPermission, setMenuPermission] = useState({
        id: '',
        menu_id: '',
        role_id: '',
    });

    const [menuPermissionCreate, setMenuPermissionCreate] = useState(false);
    const [menuPermissionUpdate, setMenuPermissionUpdate] = useState(false);
    const [clickEdit, setClickEdit] = useState(false);
    const [menuPermissionDelete, setMenuPermissionDelete] = useState(false);

    const url = ['api', 'menu-permissions'];

    const buttons = [
        {
            text: '<i class="ri-add-line ri-16px me-sm-2"></i> <span class="d-none d-sm-inline-block">Crear Permiso</span>',
            className: 'btn rounded-pill btn-primary waves-effect mx-2 my-2 ',
            action: async function (e, dt, button, config) {
                openModalCreate()
            }
        }
    ];

    const actions = [
        { key: 'view', icon: 'ri-eye-line', class: 'btn-label-info', title: 'Ver' },
        { key: 'edit', icon: 'ri-edit-line', class: 'btn-label-primary', title: 'Editar' },
        { key: 'delete', icon: 'ri-delete-bin-5-line', class: 'btn-label-danger', title: 'Eliminar' },
    ];

    const columns = [
        { title: 'Menu',  data: 'menu' },
        { title: 'Rol', data: 'role' },
        {title: 'Acciones', data: 'id', render: (id) => {
            return `
                <div class="d-flex gap-1">
                    ${actions.map(a => `
                        <button class="btn btn-sm ${a.class} action-btn"
                            data-action="${a.key}"
                            data-id="${id}">
                            <i class="fas ${a.icon}"></i>
                        </button>
                    `).join('')}
                </div>
            `
        }},
    ];

    const openModalCreate = () => {
        if (!modalCreateInstance.current) {
            modalCreateInstance.current = new window.bootstrap.Modal(
                modalCreateRef.current
            );
        }
        setMenuPermission({
            id: '',
            menu_id: '',
            role_id: '',
        });
        modalCreateInstance.current.show();
    }

    useEffect(() => {
        if (!clickEdit) return;
        openModalUpdate();
        setClickEdit(false);
    }, [clickEdit]);

    const openModalUpdate = () => {
        if (!modalUpdateInstance.current) {
            modalUpdateInstance.current = new window.bootstrap.Modal(
                modalUpdateRef.current
            );
        }
        modalUpdateInstance.current.show();
    }

    useEffect(() => {
        const table = dataTableRefMenu?.current;
        if (!table) return;

        const handler = function () {
            const action = $(this).data('action');
            const id = Number($(this).data('id'));

            switch (action) {
                case 'edit':
                    const menuRef = data.find(m => m.id === id);

                    if (!menuRef) {
                        console.warn('Menú no encontrado', id);
                        return;
                    }

                    setMenuPermission({
                        ...menuRef,
                        menu_id: menuRef.menu_id ? String(menuRef.menu_id) : null,
                        role_id: menuRef.role_id ? String(menuRef.role_id) : null,
                    });

                    setClickEdit(true);
                    break;
                case 'delete':
                    window.Swal.fire({
                        title: '¿Estás seguro?',
                        text: '¿Estás seguro de querer eliminar este permiso de menú?',
                        icon: 'warning',
                        showCancelButton: true,
                        confirmButtonText: 'Eliminar',
                        cancelButtonText: 'Cancelar',
                    }).then(async (result) => { 
                        if (result.isConfirmed) {
                            const url = base_url(['api', 'menu-permissions', id]);
                            try {
                                await fetchHelper.delete(url, {}, {}, 500, false);
                                dataTableRefMenu?.current?.ajax.reload();
                                setMenuDelete(true);
                            } catch (error) {
                                console.error(error);
                                window.Swal.fire({
                                    title: 'Error',
                                    text: error.message || error.msg || 'Error al eliminar el menú',
                                    icon: 'error',
                                    confirmButtonText: 'Cerrar',
                                    showCancelButton: false,
                                    showCloseButton: false,
                                    allowOutsideClick: false,
                                });
                            }
                        }
                    });
                    break;
                default:
                    console.warn('Acción no válida', action);
                    break;
            }
        }
        table.on('click', '.action-btn', handler);

        return () => {
            table.off('click', '.action-btn', handler);
        };
    }, [data]);

    return <>

<div className="card">
            <h5 className="card-header text-md-start text-center">Menus</h5>


            <AlertPage type="success" message={`Permisos para el menu, creado exitosamente`} show={menuPermissionCreate} />
            <AlertPage type="success" message={`Permisos para el menu, actualizado exitosamente`} show={menuPermissionUpdate} />
            <AlertPage type="success" message={`Permisos para el menu, eliminado exitosamente`} show={menuPermissionDelete} />

            <div className="card-datatable text-nowrap">
                <DataTableReference
                    url_api={url}
                    columns={columns}
                    tableRef={tableRefMenu}
                    dataTableRef={dataTableRefMenu}
                    method='POST'
                    buttons={buttons}
                    title='Permisos Menu'
                    setData={setData}
                />
            </div>

            <CreateMenuPermission
                modalRef={modalCreateRef}
                modalInstance={modalCreateInstance}
                menuPermission={menuPermission} setMenuPermission={setMenuPermission}
                dataTableRef={dataTableRefMenu}
                setMenuCreate={setMenuPermissionCreate}
            />

            <UpdateMenuPermission
                modalRef={modalUpdateRef}
                modalInstance={modalUpdateInstance}
                menuPermission={menuPermission} setMenuPermission={setMenuPermission}
                dataTableRef={dataTableRefMenu}
                setMenuUpdate={setMenuPermissionUpdate}
            />
        </div>

    </>
}

export default MenuPermissionIndex