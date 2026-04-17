import { useState, useEffect, useRef } from 'react';
import DataTableReference from '../../../components/organism/DataTable';
import ViewRole from '../../../components/organism/ViewRole';

import { fetchHelper } from '../../../utils/fetch';
import { base_url, chunkArray } from '../../../utils/functions';

import CreateRole from './create';
import UpdatedRole from './updated';
import FilterRole from './filter';
import AlertPage from '../../../components/molecules/AlertPage';

const IndexRoles = () => {

    const tableRef = useRef(null);
    const dataTableRef = useRef(null);

    const filterRef = useRef(null);
    const filterInstance = useRef(null);

    const modalCreateRef = useRef(null);
    const modalCreateInstance = useRef(null);

    const modalUpdateRef = useRef(null);
    const modalUpdateInstance = useRef(null);

    const modalViewRef = useRef(null);
    const modalViewInstance = useRef(null);

    const [data, setData] = useState([]);
    const [messageRole, setMessageRole] = useState({
        message: '',
        type: '',
        show: false,
    });

    const [search, setSearch] = useState({
        value: '',
        checked: true,
    });

    const [role, setRole] = useState({
        id: '',
        name: '',
        status: '',
        permissionIds: [],
    });

    const [modules, setModules] = useState([]);

    useEffect(() => {
        const urlPermissions = base_url(['roles/permissions']);
        fetchHelper.post(urlPermissions, { length: -1 }, {}, 0).then(response => {
            const grouped = response.data.reduce((acc, permission) => {
                const moduleId = permission.module.id;

                if (!acc[moduleId]) {
                    acc[moduleId] = {
                        module: permission.module,
                        permissions: []
                    };
                }

                acc[moduleId].permissions.push(permission);

                return acc;
            }, {});

            let result = Object.values(grouped);
            setModules(result);
        });
    }, []);

    useEffect(() => {
        console.log("Modulos", modules);
    }, [modules]);

    const url = ['roles/getRoles'];

    const actions = [
        { key: 'view', icon: 'ri-eye-line', class: 'btn-label-info', title: 'Ver' },
        { key: 'edit', icon: 'ri-edit-line', class: 'btn-label-primary', title: 'Editar' },
        { key: 'delete', icon: 'ri-delete-bin-5-line', class: 'btn-label-danger', title: 'Eliminar' },
    ];

    const [columns, setColumns] = useState([
        { title: 'ID', data: 'id', searchable: false },
        { title: 'Nombre', data: 'name', name: 'name' },
        { title: 'Estado', data: 'status', name: 'status' },
        {
            title: 'Acciones', data: 'id', width: '100px', searchable: false, render: (id) => {
                if (id == 1) return null;
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
            }
        },
    ]);

    const openModalCreate = () => {
        if (!modalCreateInstance.current) {
            modalCreateInstance.current = new window.bootstrap.Modal(
                modalCreateRef.current
            );
        }
        modalCreateInstance.current.show();
        setRole({
            id: '',
            name: '',
            status: '',
            permissionIds: [],
        });
        setMessageRole({
            message: '',
            type: '',
            show: false,
        });
    };

    const buttons = [
        {
            text: '<i class="ri-filter-line ri-16px me-sm-2"></i> <span class="d-none d-sm-inline-block">Filtrar</span>',
            className: 'btn rounded-pill btn-secondary waves-effect mx-2 my-2 ',
            action: async function (e, dt, button, config) {
                if (!filterInstance.current) {
                    filterInstance.current = new window.bootstrap.Modal(
                        filterRef.current
                    );
                }
                filterInstance.current.show();
            }
        },
        {
            text: '<i class="ri-add-line ri-16px me-sm-2"></i> <span class="d-none d-sm-inline-block">Crear Rol</span>',
            className: 'btn rounded-pill btn-primary waves-effect mx-2 my-2',
            action: async function (e, dt, button, config) {
                openModalCreate();
            }
        }
    ];

    useEffect(() => {
        const table = dataTableRef?.current;
        if (!table) return;

        const handler = function () {
            const action = $(this).data('action');
            const id = Number($(this).data('id'));

            const roleRef = data.find(m => m.id === id);

            if (!roleRef) {
                console.warn('Rol no encontrado', id);
                return;
            }

            const roleData = {
                id: roleRef.id,
                name: roleRef.name ?? '',
                status: roleRef.status ?? 'ACTIVE',
                permissionIds: roleRef.permissionIds ?? [],
            };

            switch (action) {
                case 'view':
                    setRole(roleData);
                    setMessageRole({
                        message: '',
                        type: '',
                        show: false,
                    });

                    if (!modalViewInstance.current) {
                        modalViewInstance.current = new window.bootstrap.Modal(
                            modalViewRef.current
                        );
                    }
                    modalViewInstance.current.show();
                    break;

                case 'edit':
                    setRole(roleData);
                    setMessageRole({
                        message: '',
                        type: '',
                        show: false,
                    });

                    if (!modalUpdateInstance.current) {
                        modalUpdateInstance.current = new window.bootstrap.Modal(
                            modalUpdateRef.current
                        );
                    }
                    modalUpdateInstance.current.show();
                    break;

                case 'delete':
                    window.Swal.fire({
                        title: '¿Estás seguro?',
                        text: '¿Estás seguro de querer eliminar este rol?',
                        icon: 'warning',
                        showCancelButton: true,
                        confirmButtonText: 'Eliminar',
                        cancelButtonText: 'Cancelar',
                    }).then(async (result) => {
                        if (result.isConfirmed) {
                            const url = base_url(['roles', 'deleteRole', id]);
                            try {
                                await fetchHelper.post(url, {}, {}, 500, false);
                                setMessageRole({
                                    message: 'Rol eliminado exitosamente',
                                    type: 'success',
                                    show: true,
                                });
                            } catch (error) {
                                console.error(error);
                                setMessageRole({
                                    message: error.msg || 'Error al eliminar el rol. Verifique su conexión e intente nuevamente.',
                                    type: 'danger',
                                    show: true,
                                });
                            } finally {
                                dataTableRef?.current?.ajax.reload();
                            }
                        }
                    });
                    break;
            }
        };

        table.on('click', '.action-btn', handler);
        return () => {
            table.off('click', '.action-btn', handler);
        };
    }, [data]);

    return <>
        <div className="card">
            <h5 className="card-header text-md-start text-center">Roles</h5>

            <AlertPage message={messageRole.message} type={messageRole.type} show={messageRole.show} onChange={() => setMessageRole({
                message: '',
                type: '',
                show: false,
            })} />

            <div className="card-datatable text-nowrap">
                <DataTableReference
                    url_api={url}
                    columns={columns}
                    tableRef={tableRef}
                    dataTableRef={dataTableRef}
                    method='POST'
                    buttons={buttons}
                    title='Roles'
                    setData={setData}
                    search={search}
                    setSearch={setSearch}
                    filtered={true}
                />
            </div>

            <FilterRole
                filterRef={filterRef}
                filterInstance={filterInstance}
                dataTableRef={dataTableRef}
            />
        </div>

        <CreateRole
            modalRef={modalCreateRef}
            modalInstance={modalCreateInstance}
            role={role}
            setRole={setRole}
            dataTableRef={dataTableRef}
            setMessageRole={setMessageRole}
            modules={modules}
        />

        <UpdatedRole
            modalRef={modalUpdateRef}
            modalInstance={modalUpdateInstance}
            role={role}
            setRole={setRole}
            dataTableRef={dataTableRef}
            setMessageRole={setMessageRole}
            modules={modules}
        />

        {/* <ViewRole
            modalRef={modalViewRef}
            role={role}
        /> */}
    </>;
};

export default IndexRoles;