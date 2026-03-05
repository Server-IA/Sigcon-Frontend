import { useState, useRef, useEffect } from "react";
import DataTableReference from "../../../components/organism/DataTable";
import AlertPage from "../../../components/molecules/AlertPage"

import { base_url } from "../../../utils/functions";
import { fetchHelper } from "../../../utils/fetch";

import CreateMenuPermission from "./create";
import UpdateMenuPermission from "./updated";
import FilterMenuPermission from "./filter";

import { refreshMenu } from '../../../routes/routes';
import { useDispatch } from 'react-redux';

const MenuPermissionIndex = () => {

    const dispatch = useDispatch();

    const modalCreateRef = useRef(null);
    const modalCreateInstance = useRef(null);

    const modalUpdateRef = useRef(null);
    const modalUpdateInstance = useRef(null);

    const filterRef = useRef(null);
    const filterInstance = useRef(null);

    const [data, setData] = useState([]);
    const tableRefMenu = useRef(null);
    const dataTableRefMenu = useRef(null);

    const [menuPermission, setMenuPermission] = useState({
        id: '',
        menu_id: '',
        role_id: '',
    });

    const [search, setSearch] = useState({
        value: '',
        checked: true,
    });

    const [menus, setMenus] = useState([]);
    const [roles, setRoles] = useState([]);

    useEffect(() => {
        const fetchMenus = async () => {
            const url = base_url(['api', 'menus', 'datatable']);
            const body = {
                length: -1,
            }
            const { data } = await fetchHelper.post(url, body, {}, 0);
            setMenus(
                data.map(menu => ({
                    id: menu.id,
                    name: menu.label,
                }))
            );
        }
        fetchMenus();
        const fetchRoles = async () => {
            const url = base_url(['roles/getRoles']);
            const body = {
                length: -1,
            }
            const { data } = await fetchHelper.post(url, body, {}, 0);
            setRoles(
                data.map(rol => ({
                    id: rol.id,
                    name: rol.name,
                }))
            );
        }
        fetchRoles();
    }, []);

    const [menuPermissionCreate, setMenuPermissionCreate] = useState(false);
    const [menuPermissionUpdate, setMenuPermissionUpdate] = useState(false);
    const [clickEdit, setClickEdit] = useState(false);
    const [menuPermissionDelete, setMenuPermissionDelete] = useState(false);
    const [menuPermissionError, setMenuPermissionError] = useState(false);

    const url = ['api', 'menu-permissions'];

    const buttons = [
        {
            text: '<i class="ri-filter-3-line ri-16px me-sm-2"></i> <span class="d-none d-sm-inline-block">Filtrar</span>',
            className: 'btn rounded-pill btn-secondary waves-effect mx-2 my-2 ',
            action: async function (e, dt, button, config) {
                if (!filterInstance.current) {
                    filterInstance.current = new window.bootstrap.Modal(
                        filterRef.current
                    );
                }
                // setSearch({ value: '', checked: true });
                filterInstance.current.show();
            }
        },
        {
            text: '<i class="ri-add-line ri-16px me-sm-2"></i> <span class="d-none d-sm-inline-block">Crear Permiso</span>',
            className: 'btn rounded-pill btn-primary waves-effect mx-2 my-2 ',
            action: async function (e, dt, button, config) {
                openModalCreate();
            }
        },
    ];

    const actions = [
        { key: 'edit', icon: 'ri-edit-line', class: 'btn-label-primary', title: 'Editar' },
        { key: 'delete', icon: 'ri-delete-bin-5-line', class: 'btn-label-danger', title: 'Eliminar' },
    ];

    const columns = [
        { title: 'Menu', data: 'menu.label', name: 'menu_label' },
        { title: 'Rol', data: 'role.name', name: 'role_name' },
        {
            title: 'Acciones', width: '100px', data: 'id', render: (id, _, m) => {
                return `
                <div class="d-flex gap-1">
                    ${actions.filter(a => !((m.menu_id == 8 || m.menu_id == 1) && (a.key == 'delete' || a.key == 'edit'))).map(a => `
                        <button class="btn btn-sm ${a.class} action-btn"
                            data-action="${a.key}"
                            data-id="${id}">
                            <i class="fas ${a.icon}"></i>
                        </button>
                    `).join('')}
                </div>
            `
            }
        },
    ];

    const openModalCreate = () => {
        setMenuPermission({
            id: '',
            menu_id: '',
            role_id: '',
        });
        if (!modalCreateInstance.current) {
            modalCreateInstance.current = new window.bootstrap.Modal(
                modalCreateRef.current
            );
        }
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
                            const url = base_url(['api', 'menu-permissions', 'delete', id]);
                            try {
                                await fetchHelper.delete(url, {}, {}, 500, false);
                                dataTableRefMenu?.current?.ajax.reload();
                                dispatch(refreshMenu());
                                setMenuPermissionDelete(true);
                                setMenuPermissionError(false);
                            } catch (error) {
                                console.error(error);
                                setMenuPermissionError(true);
                                setMenuPermissionDelete(false);
                                dataTableRefMenu?.current?.ajax.reload();
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
            <h5 className="card-header text-md-start text-center">Permisos para menús</h5>


            <AlertPage type="success" message={`Permisos para el menú, creado exitosamente`} show={menuPermissionCreate} onChange={() => setMenuPermissionCreate(false)} />
            <AlertPage type="success" message={`Permisos para el menú, actualizado exitosamente`} show={menuPermissionUpdate} onChange={() => setMenuPermissionUpdate(false)} />
            <AlertPage type="success" message={`Permisos para el menú, eliminado exitosamente`} show={menuPermissionDelete} onChange={() => setMenuPermissionDelete(false)} />
            <AlertPage type="danger" message="Error al eliminar el permiso de menú. Verifique su conexión e intente nuevamente." show={menuPermissionError} onChange={() => setMenuPermissionError(false)} />

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
                    search={search}
                    setSearch={setSearch}
                    filtered={true}
                />
            </div>

            <FilterMenuPermission
                dataTableRef={dataTableRefMenu}
                filterRef={filterRef}
                filterInstance={filterInstance}
                menus={menus}
                roles={roles}
            />

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