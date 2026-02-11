import { useState, useRef, useEffect } from "react";
import DataTableReference from "../../../components/organism/DataTable";
import CreateUser from "./create";
import UpdatedUser from "./updated";
import { base_url } from '../../../utils/functions';
import { fetchHelper } from '../../../utils/fetch';

const IndexUsers = () => {

    const [data, setData] = useState([]);
    const tableRefUser = useRef(null);
    const dataTableRefUser = useRef(null);

    const [user, setUser] = useState({
        id: '',
        name: '',
        lastname: '',
        email: '',
        password: '',
        status: 'ACTIVE',
        roles: []
    });

    const [clickEdit, setClickEdit] = useState(false);

    const [userCreate, setUserCreate] = useState(false);
    const [userUpdate, setUserUpdate] = useState(false);

    const modalCreateRef = useRef(null);
    const modalCreateInstance = useRef(null);

    const modalUpdateRef = useRef(null);
    const modalUpdateInstance = useRef(null);

    const url = ['users', 'getUsers'];

    const buttons = [
        {
            text: '<i class="ri-add-line ri-16px me-sm-2"></i> <span class="d-none d-sm-inline-block">Crear Usuario</span>',
            className: 'btn rounded-pill btn-primary waves-effect mx-2 my-2',
            action: async function (e, dt, button, config) {
                openModalCreate()
            }
        }
    ];

    const actions = [
        { key: 'edit', icon: 'ri-edit-line', class: 'btn-label-primary', title: 'Editar' },
        { key: 'delete', icon: 'ri-delete-bin-5-line', class: 'btn-label-danger', title: 'Eliminar' },
    ];

    const columns = [
        { title: 'Nombre', data: 'name' },
        { title: 'Apellido', data: 'lastname' },
        { title: 'Email', data: 'email' },
        { 
            title: 'Roles', 
            data: 'roles',
            render: (roles) => {
                if (!roles || roles.length === 0) {
                    return '<span class="badge bg-label-secondary">Sin roles</span>';
                }
                return Array.from(roles).map(role => 
                    `<span class="badge bg-label-primary me-1">${role}</span>`
                ).join('');
            }
        },
        { 
            title: 'Estado', 
            data: 'status',
            render: (status) => {
                const badges = {
                    'ACTIVE': '<span class="badge bg-label-success">Activo</span>',
                    'INACTIVE': '<span class="badge bg-label-danger">Inactivo</span>'
                };
                return badges[status] || status;
            }
        },
        {
            title: 'Acciones', 
            data: 'id', 
            render: (id) => {
                return `
                    <div class="d-flex gap-1">
                        ${actions.map(a => `
                            <button class="btn btn-sm ${a.class} action-btn"
                                data-action="${a.key}"
                                data-id="${id}">
                                <i class="${a.icon}"></i>
                            </button>
                        `).join('')}
                    </div>
                `
            }
        },
    ];

    const openModalCreate = () => {
        if (!modalCreateInstance.current) {
            modalCreateInstance.current = new window.bootstrap.Modal(
                modalCreateRef.current
            );
        }
        setUser({
            id: '',
            name: '',
            lastname: '',
            email: '',
            password: '',
            status: 'ACTIVE',
            roles: []
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

    const handleDelete = async (id, userName) => {
        const result = await window.Swal.fire({
            title: '¿Estás seguro?',
            text: `Se eliminará el usuario "${userName}"`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar',
            customClass: {
                confirmButton: 'btn btn-danger',
                cancelButton: 'btn btn-secondary'
            }
        });

        if (result.isConfirmed) {
            try {
                const url = base_url(['users', 'deleteUser', id]);
                await fetchHelper.post(url, {}, {}, 1000);
                
                dataTableRefUser?.current?.ajax.reload();
                
                window.Swal.fire({
                    icon: 'success',
                    title: 'Eliminado',
                    text: 'Usuario eliminado correctamente',
                    timer: 2000,
                    showConfirmButton: false
                });
            } catch (error) {
                console.error('Error al eliminar usuario:', error);
                window.Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: error.msg || 'No se pudo eliminar el usuario'
                });
            }
        }
    };

    useEffect(() => {
        const table = dataTableRefUser?.current;
        if (!table) return;

        const handler = function () {
            const action = $(this).data('action');
            const id = Number($(this).data('id'));

            switch (action) {
                case 'edit':
                    const userRef = data.find(u => u.id === id);

                    if (!userRef) {
                        console.warn('Usuario no encontrado', id);
                        return;
                    }

                    setUser({
                        id: userRef.id,
                        name: userRef.name,
                        lastname: userRef.lastname,
                        email: userRef.email,
                        password: '', // No se carga la contraseña por seguridad
                        status: userRef.status,
                        roles: userRef.roles || []
                    });

                    setClickEdit(true);
                    break;

                case 'delete':
                    const userToDelete = data.find(u => u.id === id);
                    if (userToDelete) {
                        handleDelete(id, `${userToDelete.name} ${userToDelete.lastname}`);
                    }
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
            <h5 className="card-header text-md-start text-center">
                <i className="ri-user-line me-2"></i>
                Gestión de Usuarios
            </h5>

            <div className="card-datatable text-nowrap">
                <DataTableReference
                    url_api={url}
                    columns={columns}
                    tableRef={tableRefUser}
                    dataTableRef={dataTableRefUser}
                    method='POST'
                    buttons={buttons}
                    title='Usuarios'
                    setData={setData}
                />
            </div>

            <CreateUser
                modalRef={modalCreateRef}
                modalInstance={modalCreateInstance}
                user={user}
                setUser={setUser}
                dataTableRef={dataTableRefUser}
                setUserCreate={setUserCreate}
            />

            <UpdatedUser
                modalRef={modalUpdateRef}
                modalInstance={modalUpdateInstance}
                user={user}
                setUser={setUser}
                dataTableRef={dataTableRefUser}
                setUserUpdate={setUserUpdate}
            />
        </div>
    </>
}

export default IndexUsers;