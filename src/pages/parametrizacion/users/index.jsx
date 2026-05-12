import { useState, useRef, useEffect } from "react";
import DataTableReference from "../../../components/organism/DataTable";
import CreateUser from "./create";
import UpdatedUser from "./updated";
import FilterUser from "./filter";
import { base_url } from '../../../utils/functions';
import { fetchHelper } from '../../../utils/fetch';
import AlertPage from '../../../components/molecules/AlertPage';
import { useSelector } from "react-redux";

const IndexUsers = () => {

    const userPermissions = useSelector(state => state.user.user)?.permissions?.filter(p => {return p.code.includes('USER')})|| []; // Permisos del usuario
    const isAdmin = useSelector(state => state.user.user)?.isAdmin || false; // Verificar si el usuario es admin
    // QA Bloque PA Bug 89 (HU-PA-PLAT-04, 2026-05-11): un PLATFORM_ADMIN
    // (sin company_id) NO puede crear users tenant desde /parametrizacion/users
    // porque el backend exige TenantContext.getCompanyId() != null. Los users
    // de plataforma se crean desde /platform/users (modulo Plataforma -> Usuarios).
    // Aqui ocultamos el boton "Crear Usuario" cuando el actor es PLATFORM_ADMIN
    // y mostramos un alert informativo.
    const isPlatformAdmin = useSelector(state => state.user.user)?.isPlatformAdmin || false;

    const [data, setData] = useState([]);
    const tableRefUser = useRef(null);
    const dataTableRefUser = useRef(null);

    const [user, setUser] = useState({
        id: '',
        name: '',
        lastname: '',
        email: '',
        username: '',
        password: '',
        status: 'ACTIVE',
        roles: ''
    });

    const [search, setSearch] = useState({value: '', checked: true});

    const [roles, setRoles] = useState([]);
    const [clickEdit, setClickEdit] = useState(false);
    const [userCreate, setUserCreate] = useState(false);
    const [userUpdate, setUserUpdate] = useState(false);
    const [userDelete, setUserDelete] = useState(false);

    const [errorDelete, setErrorDelete] = useState({
        show: false,
        message: '',
        type: '',
    });

    const modalCreateRef = useRef(null);
    const modalCreateInstance = useRef(null);

    const modalUpdateRef = useRef(null);
    const modalUpdateInstance = useRef(null);

    const filterRef = useRef(null);
    const filterInstance = useRef(null);

    const url = ['users', 'getUsers'];

    const buttons = [
        {
            text: '<i class="ri-filter-line ri-16px me-sm-2"></i> <span class="d-none d-sm-inline-block">Filtrar</span>',
            className: 'btn rounded-pill btn-outline-primary waves-effect mx-2 my-2',
            action: function () {
                if (!filterInstance.current) {
                    filterInstance.current = new window.bootstrap.Modal(filterRef.current);
                }
                filterInstance.current.show();
            }
        },
        // QA Bloque PA Bug 89 (HU-PA-PLAT-04): bloquear Crear Usuario para PLATFORM_ADMIN
        // en este modulo. Ellos deben usar /platform/users (modulo Plataforma).
        ...((userPermissions.some(p => p.code === 'CREATE_USER' && p.type === 'CREATE') || isAdmin) && !isPlatformAdmin ? [{
            text: '<i class="ri-add-line ri-16px me-sm-2"></i> <span class="d-none d-sm-inline-block">Crear Usuario</span>',
            className: 'btn rounded-pill btn-primary waves-effect mx-2 my-2',
            action: function () {
                openModalCreate();
            }
        }] : []),
    ];

    const actions = [
        ...(userPermissions.some(p => p.code === 'UPDATE_USER' && p.type === 'UPDATE') || isAdmin ? [{ key: 'edit', icon: 'ri-edit-line', class: 'btn-label-primary', title: 'Editar' }] : []),
        ...(userPermissions.some(p => p.code === 'DELETE_USER' && p.type === 'DELETE') || isAdmin ? [{ key: 'delete', icon: 'ri-delete-bin-5-line', class: 'btn-label-danger', title: 'Eliminar' }] : []),
    ];

    const columns = [
        { title: 'Nombre', data: 'name' },
        { title: 'Apellido', data: 'lastname' },
        { title: 'Email', data: 'email' },
        { 
            title: 'Roles', 
            data: 'roles',
            name: 'roles',
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
            name: 'status',
            render: (status) => {
                // QA Bloque PA Bug 15 (HU-PA-07 E3): incluir badge para BLOCKED
                const badges = {
                    'ACTIVE': '<span class="badge bg-label-success">Activo</span>',
                    'INACTIVE': '<span class="badge bg-label-danger">Inactivo</span>',
                    'BLOCKED': '<span class="badge bg-label-warning">Bloqueado</span>'
                };
                return badges[status] || status;
            }
        },
        {
            title: 'Acciones', 
            data: 'id', 
            render: (id) => `
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
        },
    ];

    const openModalCreate = () => {
        if (!modalCreateInstance.current) {
            modalCreateInstance.current = new window.bootstrap.Modal(modalCreateRef.current);
        }
        // QA Bloque PA Bug 16 (HU-PA-08 E2): reset roles como array vacio para multi-select
        setUser({ id: '', name: '', lastname: '', email: '', username: '', password: '', status: 'ACTIVE', roles: [] });
        modalCreateInstance.current.show();
    };

    const openModalUpdate = () => {
        if (!modalUpdateInstance.current) {
            modalUpdateInstance.current = new window.bootstrap.Modal(modalUpdateRef.current);
        }
        modalUpdateInstance.current.show();
    };

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
                const deleteUrl = base_url(['users', 'deleteUser', id]);
                await fetchHelper.post(deleteUrl, {}, {}, 1000);
                // window.Swal.fire({
                //     icon: 'success',
                //     title: 'Eliminado',
                //     text: 'Usuario eliminado correctamente',
                //     timer: 2000,
                //     showConfirmButton: false,
                //     allowOutsideClick: false,
                //     customClass: {
                //         confirmButton: 'btn btn-primary waves-effect'
                //     }
                // });
                setUserDelete(true);
            } catch (error) {
                console.error('Error al eliminar usuario:', error);
                setErrorDelete({
                    show: true,
                    message: error.msg || 'No se pudo eliminar el usuario',
                    type: 'warning',
                });

                // setTimeout(() => {
                //     window.Swal.fire({
                //         icon: 'error',
                //         title: 'Error',
                //         text: error.msg || 'No se pudo eliminar el usuario',
                //         customClass: {
                //             confirmButton: 'btn btn-primary waves-effect'
                //         }
                //     });
                // }, 500);
            } finally {
                dataTableRefUser?.current?.ajax.reload();
            }
        }
    };

    useEffect(() => {
        const getRoles = async () => {
            try {
                const url = base_url(['roles', 'getRoles']);
                const {data} = await fetchHelper.post(url, {length: -1}, {}, 0);
                setRoles(data);
            } catch (error) {
                console.error('Error al cargar roles:', error);
            }
        };
        getRoles();
    }, []);

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
                        username: userRef.username,
                        password: '',
                        status: userRef.status,
                        // QA Bloque PA Bug 20 (HU-PA-09 E1/E2, 2026-05-09): pasar array
                        // de nombres de roles para el multi-select. Antes se pasaba un
                        // string concatenado con join(', ') que solo permitia un rol.
                        roles: Array.isArray(userRef.roles)
                            ? Array.from(userRef.roles)
                            : (userRef.roles ? [userRef.roles] : [])
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
        };

        table.on('click', '.action-btn', handler);
        return () => table.off('click', '.action-btn', handler);
    }, [data]);

    useEffect(() => {
        if (!clickEdit) return;
        openModalUpdate();
        setClickEdit(false);
    }, [clickEdit]);

    // QA Bloque PA Bug 77 (HU-PA-06 E2, 2026-05-11): cuando se llega a la
    // pagina via ?edit={id} (link "Reasignar rol" desde el SweetAlert de
    // eliminar rol con usuarios asignados), abrir automaticamente el modal
    // de edicion de ese usuario. Si esta en el DataTable lo usa; si no,
    // hace POST /users/getUsers (sin paginar) y busca por id.
    const [editParamProcessed, setEditParamProcessed] = useState(false);
    useEffect(() => {
        if (editParamProcessed) return;
        const params = new URLSearchParams(window.location.search);
        const editId = params.get('edit');
        if (!editId) return;
        const editIdNum = Number(editId);
        if (!editIdNum) return;

        const loadAndOpen = async () => {
            try {
                let userRef = (data || []).find(u => u.id === editIdNum);
                if (!userRef) {
                    // No esta en el DataTable actual (otra pagina o filtro):
                    // traer todos los users y buscarlo. length=-1 = sin limite.
                    const resp = await fetchHelper.post(
                        base_url(['users', 'getUsers']),
                        { length: -1, start: 0 },
                        {}, 0
                    );
                    const list = resp?.data || [];
                    userRef = list.find(u => u.id === editIdNum);
                }
                if (!userRef || !userRef.id) {
                    console.warn('No se encontro el usuario id=' + editIdNum);
                    return;
                }
                setUser({
                    id: userRef.id,
                    name: userRef.name,
                    lastname: userRef.lastname,
                    email: userRef.email,
                    username: userRef.username,
                    password: '',
                    status: userRef.status,
                    roles: Array.isArray(userRef.roles)
                        ? Array.from(userRef.roles)
                        : (userRef.roles ? [userRef.roles] : [])
                });
                setClickEdit(true);
            } catch (e) {
                console.warn('Error abriendo modal edit via query param:', e);
            } finally {
                setEditParamProcessed(true);
                // Limpiar query param para no re-abrir en re-renders.
                const cleanUrl = window.location.pathname;
                window.history.replaceState({}, document.title, cleanUrl);
            }
        };
        loadAndOpen();
    }, [data, editParamProcessed]);

    return (
        <div className="card">
            <h5 className="card-header text-md-start text-center">
                <i className="ri-user-line me-2"></i>
                Gestión de Usuarios
            </h5>

            <AlertPage message={errorDelete.message} type={errorDelete.type} show={errorDelete.show} onChange={() => setErrorDelete({show: false, message: '', type: ''})} />
            <AlertPage message='Usuario creado exitosamente' type='success' show={userCreate} onChange={() => setUserCreate(false)} />
            <AlertPage message='Usuario editado exitosamente' type='success' show={userUpdate} onChange={() => setUserUpdate(false)} />
            <AlertPage message='Usuario eliminado exitosamente' type='success' show={userDelete} onChange={() => setUserDelete(false)} />

            {/* QA Bloque PA Bug 89 (HU-PA-PLAT-04, 2026-05-11): aviso para PLATFORM_ADMIN */}
            {isPlatformAdmin && (
                <div className="alert alert-info mx-3 mt-3 mb-0" role="alert">
                    <i className="ri-information-line me-2"></i>
                    <strong>Modo plataforma:</strong> aquí solo se gestionan usuarios de empresas existentes.
                    Para crear nuevos administradores de plataforma vaya a {' '}
                    <a href="/platform/users" className="alert-link">Plataforma · Usuarios</a>.
                </div>
            )}

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
                    search={search}
                    setSearch={setSearch}
                    filtered={true}
                />
            </div>

            <FilterUser
                dataTableRef={dataTableRefUser}
                filterRef={filterRef}
                filterInstance={filterInstance}
                roles={roles}
            />

            {userPermissions.some(p => p.code === 'CREATE_USER' && p.type === 'CREATE') || isAdmin ? <CreateUser
                modalRef={modalCreateRef}
                modalInstance={modalCreateInstance}
                user={user}
                setUser={setUser}
                dataTableRef={dataTableRefUser}
                setUserCreate={setUserCreate}
                roles={roles}
            /> : null}

            {userPermissions.some(p => p.code === 'UPDATE_USER' && p.type === 'UPDATE') || isAdmin ? <UpdatedUser
                modalRef={modalUpdateRef}
                modalInstance={modalUpdateInstance}
                user={user}
                setUser={setUser}
                dataTableRef={dataTableRefUser}
                setUserUpdate={setUserUpdate}
                roles={roles}
            /> : null}
        </div>
    );
};

export default IndexUsers;