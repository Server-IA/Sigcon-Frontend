import { useState, useRef, useEffect } from "react";

import DataTableReference from "../../../components/organism/DataTable";
import CreateMenu from "./create";
import UpdatedMenu from "./updated";

const IndexMenus = () => {

    const [data, setData] = useState([]);
    const tableRefMenu = useRef(null);
    const dataTableRefMenu = useRef(null);

    const [menu, setMenu] = useState({
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

    const [clickEdit, setClickEdit] = useState(false);

    const [menuCreate, setMenuCreate] = useState(false);
    const [menuUpdate, setMenuUpdate] = useState(false);

    const modalCreateRef = useRef(null);
    const modalCreateInstance = useRef(null);

    const modalUpdateRef = useRef(null);
    const modalUpdateInstance = useRef(null);

    const url = ['api', 'menus', 'datatable'];

    const buttons = [
        {
            text: '<i class="ri-add-line ri-16px me-sm-2"></i> <span class="d-none d-sm-inline-block">Crear Menu</span>',
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
        { title: 'Label',  data: 'label' },
        { title: 'URL', data: 'path' },
        { title: 'Icono', data: 'icon', render: (icon) => {
                return `<i class="${icon}"></i>`;
            },
        },
        { title: 'Posición', data: 'menuOrder' },
        { title: 'Estado', data: 'status' },
        { title: 'Módulo', data: 'module', render: (module) => {
                return module ? module.name : '-';
            },
        },
        { title: 'Padre', data: 'parent', render: (parent) => {
            return parent ? parent.label : '-';
        }},
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
        modalCreateInstance.current.show();
    }

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

                    setMenu({
                        ...menuRef,
                        parentId: menuRef.parent ? String(menuRef.parent.id) : null,
                        moduleId: menuRef.module ? String(menuRef.module.id) : null,
                    });

                    setClickEdit(true);

                    // console.log("Click boton de editar");

                    // openModalUpdate(menuRef);
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

    useEffect(() => {
        if (!clickEdit) return;
        openModalUpdate();
        setClickEdit(false);
    }, [clickEdit]);

    return <>
        <div className="card">
            <h5 className="card-header text-md-start text-center">Menus</h5>

            <div className="card-datatable text-nowrap">
                <DataTableReference
                    url_api={url}
                    columns={columns}
                    tableRef={tableRefMenu}
                    dataTableRef={dataTableRefMenu}
                    method='POST'
                    buttons={buttons}
                    title='Menus'
                    setData={setData}
                />
            </div>

            <CreateMenu
                modalRef={modalCreateRef}
                modalInstance={modalCreateInstance}
                menu={menu} setMenu={setMenu}
                dataTableRef={dataTableRefMenu}
                setMenuCreate={setMenuCreate}
            />

            <UpdatedMenu
                modalRef={modalUpdateRef}
                modalInstance={modalUpdateInstance}
                menu={menu} setMenu={setMenu}
                dataTableRef={dataTableRefMenu}
                setMenuUpdate={setMenuUpdate}
            />
        </div>
    </>
}

export default IndexMenus;