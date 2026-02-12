import { useState, useEffect, useRef } from 'react';
import DataTableReference from '../../../components/organism/DataTable';
import ViewRole from '../../../components/organism/ViewRole';

import { fetchHelper } from '../../../utils/fetch';
import { base_url } from '../../../utils/functions';

import CreateRole from './create';
import UpdatedRole from './updated';

const IndexRoles = () => {

    const tableRef = useRef(null);
    const dataTableRef = useRef(null);

    const modalCreateRef = useRef(null);
    const modalCreateInstance = useRef(null);

    const modalUpdateRef = useRef(null);
    const modalUpdateInstance = useRef(null);

    const modalViewRef = useRef(null);
    const modalViewInstance = useRef(null);

    const [data, setData] = useState([]);
    const [roleCreate, setRoleCreate] = useState(false);
    const [roleEdit, setRoleEdit] = useState(false);
    const [roleDelete, setRoleDelete] = useState(false);

    const url = ['roles/getRoles'];

    const actions = [
        { key: 'view', icon: 'ri-eye-line', class: 'btn-label-info', title: 'Ver' },
        { key: 'edit', icon: 'ri-edit-line', class: 'btn-label-primary', title: 'Editar' },
        { key: 'delete', icon: 'ri-delete-bin-5-line', class: 'btn-label-danger', title: 'Eliminar' },
    ];

    const [role, setRole] = useState({
        id: '',
        name: '',
        status: '',
        permissionIds: [],
    });

    const [columns, setColumns] = useState([
        { title: 'ID', data: 'id' },
        { title: 'Nombre', data: 'name' },
        { title: 'Estado', data: 'status' },
        {
            title: 'Acciones', data: 'id', render: (id) => {
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
    };

    const buttons = [
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

                    if (!modalViewInstance.current) {
                        modalViewInstance.current = new window.bootstrap.Modal(
                            modalViewRef.current
                        );
                    }
                    modalViewInstance.current.show();
                    break;

                case 'edit':
                    setRole(roleData);

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
                            } catch (error) {
                                console.error(error);
                                window.Swal.fire({
                                    title: 'Error',
                                    text: 'Error al eliminar el rol',
                                    icon: 'error',
                                });
                            } finally {
                                dataTableRef?.current?.ajax.reload();
                                setRoleDelete(true);
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

            <div className={`alert alert-success alert-dismissible ${!roleCreate ? 'd-none' : ''}`} role="alert">
                <button type="button" className="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                <span>Rol creado correctamente</span>
            </div>

            <div className={`alert alert-success alert-dismissible ${!roleEdit ? 'd-none' : ''}`} role="alert">
                <button type="button" className="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                <span>Rol actualizado correctamente</span>
            </div>

            <div className={`alert alert-success alert-dismissible ${!roleDelete ? 'd-none' : ''}`} role="alert">
                <button type="button" className="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                <span>Rol eliminado correctamente</span>
            </div>

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
                />
            </div>
        </div>

        <CreateRole
            modalRef={modalCreateRef}
            modalInstance={modalCreateInstance}
            role={role}
            setRole={setRole}
            dataTableRef={dataTableRef}
            setRoleCreate={setRoleCreate}
        />

        <UpdatedRole
            modalRef={modalUpdateRef}
            modalInstance={modalUpdateInstance}
            role={role}
            setRole={setRole}
            dataTableRef={dataTableRef}
            setRoleEdit={setRoleEdit}
        />

        <ViewRole
            modalRef={modalViewRef}
            role={role}
        />
    </>;
};

export default IndexRoles;