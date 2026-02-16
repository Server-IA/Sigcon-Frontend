import { useState, useRef, useEffect } from "react";
import UpdatedPermission from "./updated";
import CreatedPermission from "./create";

import DataTableReference from "../../../components/organism/DataTable";
import { fetchHelper } from "../../../utils/fetch";
import { base_url } from "../../../utils/functions";

const IndexPermissions = () => {

    const [data, setData] = useState([]);
    const tableRef = useRef(null);
    const dataTableRef = useRef(null);
    const [clickEdit, setClickEdit] = useState(false);

    const [types, setTypes] = useState([
        { id: "READ", name: "Lectura" },
        { id: "CREATE", name: "Creación" },
        { id: "UPDATE", name: "Actualización" },
        { id: "DELETE", name: "Eliminación" }
    ]);

    const [permission, setPermission] = useState({
        id: '',
        name: '',
        code: '',
        type: '',
        description: '',
        roleIds: [],
        moduleId: '',
    });

    const [modules, setModules] = useState([]);

    const modalCreateRef = useRef(null);
    const modalCreateInstance = useRef(null);

    const modalUpdateRef = useRef(null);
    const modalUpdateInstance = useRef(null);

    const [errors, setErrors] = useState({});
    const [errorMessage, setErrorMessage] = useState('');

    const columns = [
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
            title: 'Módulo',
            data: 'module.name'
        },
        {
            title: 'Código del Permiso',
            data: 'code',
        },
        {
            title: 'Descripción del Permiso',
            data: 'description'
        },
        {
            title: 'Tipo de Permiso',
            data: 'type',
            render: (type) => types.find(t => t.id === type)?.name
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
    ];

    const buttons = [
        {
            text: '<i class="ri-add-line ri-16px me-sm-2"></i> <span class="d-none d-sm-inline-block">Crear Menu</span>',
            className: 'btn rounded-pill btn-primary waves-effect mx-2 my-2 ',
            action: async function (e, dt, button, config) {
                openModalCreate()
            }
        }
    ];

    const openModalCreate = () => {
        if (!modalCreateInstance.current) {
            modalCreateInstance.current = new window.bootstrap.Modal(modalCreateRef.current);
        }
        setPermission({ id: '', name: '', code: '', type: '', description: '', roleIds: [] });
        modalCreateInstance.current.show();
        setErrorMessage('');
        setErrors({});
    };

    const openModalUpdate = () => {
        if (!modalUpdateInstance.current) {
            modalUpdateInstance.current = new window.bootstrap.Modal(modalUpdateRef.current);
        }
        modalUpdateInstance.current.show();
        setErrorMessage('');
        setErrors({});
    };

    useEffect(() => {
        if (!clickEdit) return;
        openModalUpdate();
        setClickEdit(false);
    }, [clickEdit]);

    useEffect(() => {
        const table = dataTableRef?.current;
        if (!table) return;

        const handler = function () {
            const action = $(this).data('action');
            const id = Number($(this).data('id'));

            switch (action) {
                case 'edit':
                    const permissionRef = data.find(p => p.id === id);

                    if (!permissionRef) {
                        console.warn('Permiso no encontrado', id);
                        return;
                    }

                    setPermission({
                        id: permissionRef.id || '',
                        name: permissionRef.name || '',
                        description: permissionRef.description || '',
                        roleIds: permissionRef.roleIds || [],
                        type: permissionRef.type || '',
                        code: permissionRef.code || '',
                        moduleId: permissionRef?.module?.id || '',
                    });

                    setClickEdit(true);
                    break;
                case 'delete':
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
        const fetchModules = async () => {
            const url = base_url(['api', 'modules']);
            const response = await fetchHelper.post(url, {length: -1}, {}, 0);
            setModules(response.data);
        }
        fetchModules();
    }, []);

    return (
        <div className="card">
            <h5 className="card-header text-md-start text-center">
                <i className="ri-shield-keyhole-line me-2"></i>
                Gestión de Permisos
            </h5>
            <div className="card-datatable text-nowrap">

                <DataTableReference
                    url_api={['roles', 'permissions']}
                    columns={columns}
                    tableRef={tableRef}
                    dataTableRef={dataTableRef}
                    method='POST'
                    buttons={buttons}
                    title='Permisos'
                    setData={setData}
                />

                {/* <table ref={tableRef} className="datatables-ajax table table-bordered"></table> */}
            </div>

            <CreatedPermission
                modalRef={modalCreateRef}
                modalInstance={modalCreateInstance}
                permission={permission}
                setPermission={setPermission}
                types={types}
                modules={modules}
                dataTableRef={dataTableRef}
                // onSuccess={loadPermissions}
            />

            <UpdatedPermission
                modalRef={modalUpdateRef}
                modalInstance={modalUpdateInstance}
                permission={permission}
                setPermission={setPermission}
                types={types}
                modules={modules}
                dataTableRef={dataTableRef}
                // onSuccess={loadPermissions}
            />
        </div>
    );
};

export default IndexPermissions;