import { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import DataTableReference from '../../../components/organism/DataTable';
import ViewRole from '../../../components/organism/ViewRole';

import { fetchHelper } from '../../../utils/fetch';
import { base_url, chunkArray } from '../../../utils/functions';

import CreateRole from './create';
import UpdatedRole from './updated';
import FilterRole from './filter';
import AlertPage from '../../../components/molecules/AlertPage';

const IndexRoles = () => {
    // QA Bloque PA Bug 75 (HU-PA-03 E3, 2026-05-11): el listado para
    // PLATFORM_ADMIN debe mostrar la empresa duenia de cada rol para
    // distinguir CONTADOR de SIGCON DEMO vs CONTADOR de EMPRESA QA 2.
    const currentUser = useSelector((state) => state.user.user);
    const isPlatformAdmin = !!currentUser?.isPlatformAdmin
        || (Array.isArray(currentUser?.roles) && currentUser.roles.some(
                r => (typeof r === 'string' ? r : r?.name) === 'PLATFORM_ADMIN'));

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
        description: '',
        type: '',
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

    // PA-RF-03 v3.0 punto 2 (Control de Cambios PA, 2026-05-29): debounce de 400ms
    // en la busqueda. En vez de recargar el servidor en cada tecla, esperamos a que
    // el usuario deje de escribir 400ms y recien ahi aplicamos la busqueda + reload.
    const didMountSearchRef = useRef(false);
    useEffect(() => {
        if (!didMountSearchRef.current) { didMountSearchRef.current = true; return; }
        const t = setTimeout(() => {
            const dt = dataTableRef?.current;
            if (dt) dt.table().search(search.value, search.checked, true).ajax.reload();
        }, 400);
        return () => clearTimeout(t);
    }, [search.value, search.checked]);

    // PA-RF-03 v3.0 (Control de Cambios PA, 2026-05-29): el listado consume el
    // endpoint REST GET /api/roles (antes POST /roles/getRoles). El backend
    // reconstruye el DataTableRequest desde los query params y reutiliza la
    // logica legacy (filtros name/status/type + tenant + soft-delete + tipo).
    const url = ['api', 'roles'];

    const actions = [
        { key: 'view', icon: 'ri-eye-line', class: 'btn-label-info', title: 'Ver' },
        { key: 'edit', icon: 'ri-edit-line', class: 'btn-label-primary', title: 'Editar' },
        { key: 'delete', icon: 'ri-delete-bin-5-line', class: 'btn-label-danger', title: 'Eliminar' },
    ];

    // QA Bloque PA Bug 2 (HU-PA-03 E1, 2026-05-09): la HU exige columnas
    // Descripcion, Tipo (badge Predefinido/Personalizado), Numero de usuarios
    // asignados y Fecha de creacion ademas de las basicas. Acciones se
    // restringen para roles GLOBALES (PLATFORM_ADMIN, ADMIN, USER).
    const formatDate = (iso) => {
        if (!iso) return '-';
        try { return new Date(iso).toLocaleDateString('es-CO'); }
        catch { return iso.slice(0, 10); }
    };
    const renderType = (type) => {
        if (type === 'PREDEFINED') return '<span class="badge bg-label-info">Predefinido</span>';
        if (type === 'CUSTOM')     return '<span class="badge bg-label-success">Personalizado</span>';
        if (type === 'GLOBAL')     return '<span class="badge bg-label-warning">Global</span>';
        return '<span class="badge bg-label-secondary">-</span>';
    };
    const renderStatus = (status) => {
        if (status === 'ACTIVE')   return '<span class="badge bg-label-success">Activo</span>';
        if (status === 'INACTIVE') return '<span class="badge bg-label-secondary">Inactivo</span>';
        return status || '-';
    };
    const renderCompany = (v) => v
        ? `<span class="badge bg-label-info">${v}</span>`
        : '<span class="badge bg-label-secondary">Global</span>';
    const [columns, setColumns] = useState([
        { title: 'ID', data: 'id', searchable: false, width: '60px' },
        { title: 'Nombre', data: 'name', name: 'name' },
        // QA Bloque PA Bug 75 (HU-PA-03 E3, 2026-05-11): columna Empresa SOLO
        // visible para PLATFORM_ADMIN (que ve cross-empresa). ADMIN_EMPRESA
        // solo ve roles de su empresa, no necesita la columna.
        ...(isPlatformAdmin ? [{ title: 'Empresa', data: 'companyName', name: 'companyName',
            orderable: false, searchable: false, width: '160px',
            render: (v) => renderCompany(v) }] : []),
        { title: 'Descripción', data: 'description', name: 'description', orderable: false,
          render: (v) => v ? `<span class="text-muted">${v}</span>` : '<span class="text-muted">-</span>' },
        { title: 'Tipo', data: 'type', name: 'type', orderable: true, render: (v) => renderType(v) },
        { title: 'Usuarios', data: 'assignedUsersCount', name: 'assignedUsersCount', searchable: false,
          width: '90px', render: (v) => `<span class="badge bg-label-primary">${v ?? 0}</span>` },
        { title: 'Fecha creación', data: 'createdAt', name: 'createdAt', searchable: false,
          width: '120px', render: (v) => formatDate(v) },
        { title: 'Estado', data: 'status', name: 'status', render: (v) => renderStatus(v) },
        {
            title: 'Acciones', data: 'id', width: '140px', searchable: false, render: (id, _, row) => {
                const name = (row.name || '').toUpperCase();
                const type = (row.type || '').toUpperCase();
                // Bloquear acciones para roles GLOBALES del sistema (PLATFORM_ADMIN, ADMIN, USER)
                if (type === 'GLOBAL') return '<span class="text-muted small">Sin acciones</span>';
                // QA Bloque PA Bug 10/11/12 (HU-PA-06 E4): los roles predefinidos
                // SI se pueden eliminar (HU-PA-06 E4 dice: "Permitir eliminar
                // logicamente el rol si no tiene usuarios asignados"). El backend
                // valida si tiene usuarios y si es el ultimo ADMIN_EMPRESA.
                const allowedActions = actions;
                return `
                <div class="d-flex gap-1">
                    ${allowedActions.map(a => `
                        <button class="btn btn-sm ${a.class} action-btn"
                            data-action="${a.key}"
                            data-id="${id}"
                            title="${a.title}">
                            <i class="${a.icon}"></i>
                        </button>
                    `).join('')}
                </div>
            `;
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
            description: '',
            type: '',
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
                description: roleRef.description ?? '',
                type: roleRef.type ?? '',
                status: roleRef.status ?? 'ACTIVE',
                permissionIds: roleRef.permissionIds ?? [],
                // QA Bloque PA Bug 9 (HU-PA-05 E4): version optimistic lock
                version: roleRef.version,
                assignedUsersCount: roleRef.assignedUsersCount ?? 0,
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

                case 'delete': {
                    // QA Bloque PA Bug 12 (HU-PA-06 E4, 2026-05-09): motivo de
                    // eliminacion obligatorio (>=30 chars). El backend valida
                    // y devuelve mensaje con cantidad de usuarios afectados +
                    // listado si los hay (Bug 10/11).
                    window.Swal.fire({
                        title: '¿Eliminar el rol?',
                        html: `Vas a eliminar el rol <strong>${roleRef.name}</strong>.<br/><br/>
                               <span class="text-muted small">Ingresa el motivo de eliminación (mínimo 30 caracteres):</span>`,
                        icon: 'warning',
                        input: 'textarea',
                        inputAttributes: {
                            minlength: 30, maxlength: 500,
                            placeholder: 'Ej: rol creado por error, ya no se usa por la empresa...'
                        },
                        inputValidator: (v) => {
                            if (!v || v.trim().length < 30) {
                                return 'Debe ingresar un motivo de eliminación de al menos 30 caracteres';
                            }
                            return null;
                        },
                        showCancelButton: true,
                        confirmButtonText: 'Eliminar',
                        cancelButtonText: 'Cancelar'
                    }).then(async (result) => {
                        if (!result.isConfirmed) return;
                        const reason = (result.value || '').trim();
                        const url = base_url(['roles', 'deleteRole', id]) + `?reason=${encodeURIComponent(reason)}`;
                        try {
                            await fetchHelper.post(url, {}, {}, 500, false);
                            setMessageRole({
                                message: 'Rol eliminado exitosamente',
                                type: 'success',
                                show: true,
                            });
                            dataTableRef?.current?.ajax.reload();
                        } catch (error) {
                            console.error(error);
                            // HU-PA-06 E2/E3: el backend devuelve `affectedUsers` cuando
                            // el bloqueo es por usuarios asignados. Mostrarlos en un
                            // SweetAlert2 secundario con enlaces a edicion.
                            const affected = error?.affectedUsers || error?.data?.affectedUsers;
                            if (Array.isArray(affected) && affected.length > 0) {
                                // QA Bloque PA Bug 77 (HU-PA-06 E2, 2026-05-11):
                                // navegacion en la MISMA pestaña (sin target=_blank)
                                // porque tras el fix de aislamiento de sesion por
                                // pestaña (sessionStorage), abrir nueva pestaña
                                // requeriria re-login. El SweetAlert se cierra al
                                // click y la pagina navega a /users?edit={id} que
                                // automaticamente abre el modal de edicion.
                                const list = affected.map(u =>
                                    `<li><strong>${u.email || u.username}</strong> (id=${u.id}) — <a href="${u.editUrl}">Reasignar rol</a></li>`
                                ).join('');
                                window.Swal.fire({
                                    title: 'No se puede eliminar este rol',
                                    html: `<div class="text-start">
                                        <p>${error.msg}</p>
                                        <p class="mb-1"><strong>Usuarios afectados (${affected.length}):</strong></p>
                                        <ul style="font-size: 0.9em;">${list}</ul>
                                    </div>`,
                                    icon: 'error',
                                    confirmButtonText: 'Entendido',
                                    width: '600px'
                                });
                            } else {
                                setMessageRole({
                                    message: error?.msg || 'Error al eliminar el rol. Verifique su conexión e intente nuevamente.',
                                    type: 'danger',
                                    show: true,
                                });
                            }
                        }
                    });
                    break;
                }
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
                    method='GET'
                    serverGet={true}
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