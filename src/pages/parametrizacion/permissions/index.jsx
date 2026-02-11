import { useState, useRef, useEffect } from "react";
import CreatePermission from "./create";
import UpdatedPermission from "./updated";
import { base_url } from '../../../utils/functions';
import { fetchHelper } from '../../../utils/fetch';
import esES from '../../../jsons/languaje/es-ES-DataTable.json';

const IndexPermissions = () => {

    const [data, setData] = useState([]);
    const tableRef = useRef(null);
    const dataTableRef = useRef(null);

    const [permission, setPermission] = useState({
        id: '',
        name: '',
        roleIds: [],
    });

    const modalCreateRef = useRef(null);
    const modalCreateInstance = useRef(null);

    const modalUpdateRef = useRef(null);
    const modalUpdateInstance = useRef(null);

    useEffect(() => {
        loadPermissions();
    }, []);

    const loadPermissions = async () => {
        try {
            const url = base_url(['roles', 'permissions']);
            const response = await fetchHelper.get(url, {}, 0);
            
            const permissions = response?.content || [];
            setData(permissions);
        } catch (error) {
            console.error('Error al cargar permisos:', error);
            window.Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'No se pudieron cargar los permisos'
            });
        }
    };

    useEffect(() => {
        if (!tableRef.current) return;

        if (dataTableRef.current) {
            dataTableRef.current.destroy();
        }

        if (data.length === 0) return;

        dataTableRef.current = $(tableRef.current).DataTable({
            data: data,
            columns: [
                { 
                    title: 'ID', 
                    data: 'id',
                    width: '80px'
                },
                { 
                    title: 'Nombre del Permiso', 
                    data: 'name',
                    render: (name) => {
                        return `<span class="fw-semibold">${name}</span>`;
                    }
                },
                {
                    title: 'Acciones', 
                    data: 'id',
                    orderable: false,
                    searchable: false,
                    width: '100px',
                    render: (id) => {
                        return `
                            <div class="d-flex gap-1 justify-content-center">
                                <button class="btn btn-sm btn-label-primary action-btn"
                                    data-action="edit"
                                    data-id="${id}"
                                    title="Editar">
                                    <i class="ri-edit-line"></i>
                                </button>
                            </div>
                        `;
                    }
                },
            ],
            dom: 'r<"row"<"col-sm-12 col-md-6"l><"col-sm-12 col-md-6 text-end"<"dt-action-buttons"B>>>t<"row"<"col-sm-12 col-md-6"i><"col-sm-12 col-md-6"p>>',
            buttons: [
                {
                    text: '<i class="ri-add-line ri-16px me-sm-2"></i> <span class="d-none d-sm-inline-block">Crear Permiso</span>',
                    className: 'btn rounded-pill btn-primary waves-effect mx-2 my-2',
                    action: () => openModalCreate()
                }
            ],
            language: esES,
            responsive: true,
            scrollX: true,
            destroy: true,
        });

        $(tableRef.current).on('click', '.action-btn', function() {
            const action = $(this).data('action');
            const id = Number($(this).data('id'));

            if (action === 'edit') {
                const permissionRef = data.find(p => p.id === id);
                if (permissionRef) {
                    // Cargar los roles del permiso desde el backend
                    loadPermissionRoles(permissionRef.id, permissionRef.name);
                }
            }
        });

        return () => {
            if (dataTableRef.current) {
                dataTableRef.current.destroy();
            }
        };
    }, [data]);

    const loadPermissionRoles = async (permissionId, permissionName) => {
        try {
            // Cargar todos los roles y verificar cuáles tienen este permiso
            const url = base_url(['roles']);
            const response = await fetchHelper.get(url, {}, 0);
            const allRoles = response?.content || [];

            // Filtrar roles que tienen este permiso
            const rolesWithPermission = allRoles
                .filter(role => 
                    role.permissions?.some(p => p.id === permissionId)
                )
                .map(r => String(r.id));

            setPermission({
                id: permissionId,
                name: permissionName,
                roleIds: rolesWithPermission,
            });

            openModalUpdate();
        } catch (error) {
            console.error('Error al cargar roles del permiso:', error);
            window.Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'No se pudieron cargar los roles del permiso'
            });
        }
    };

    const openModalCreate = () => {
        if (!modalCreateInstance.current) {
            modalCreateInstance.current = new window.bootstrap.Modal(modalCreateRef.current);
        }
        setPermission({ id: '', name: '', roleIds: [] });
        modalCreateInstance.current.show();
    };

    const openModalUpdate = () => {
        if (!modalUpdateInstance.current) {
            modalUpdateInstance.current = new window.bootstrap.Modal(modalUpdateRef.current);
        }
        modalUpdateInstance.current.show();
    };

    return (
        <div className="card">
            <h5 className="card-header text-md-start text-center">
                <i className="ri-shield-keyhole-line me-2"></i>
                Gestión de Permisos
            </h5>
            <div className="card-datatable text-nowrap">
                <table ref={tableRef} className="datatables-ajax table table-bordered"></table>
            </div>

            <CreatePermission
                modalRef={modalCreateRef}
                modalInstance={modalCreateInstance}
                permission={permission}
                setPermission={setPermission}
                onSuccess={loadPermissions}
            />

            <UpdatedPermission
                modalRef={modalUpdateRef}
                modalInstance={modalUpdateInstance}
                permission={permission}
                setPermission={setPermission}
                onSuccess={loadPermissions}
            />
        </div>
    );
};

export default IndexPermissions;