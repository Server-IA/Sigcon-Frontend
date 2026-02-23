import { useState, useEffect, useRef } from 'react';
import DataTableReference from '../../../components/organism/DataTable';

import { fetchHelper } from '../../../utils/fetch';
import { base_url } from '../../../utils/functions';

import CreateModule from './create';
import UpdatedModule from './updated';
import FilterModule from './filter';
import AlertPage from '../../../components/molecules/AlertPage';

const IndexModules = () => {

    const tableRef = useRef(null);
    const dataTableRef = useRef(null);

    const modalCreateRef = useRef(null);
    const modalCreateInstance = useRef(null);

    const modalUpdateRef = useRef(null);
    const modalUpdateInstance = useRef(null);

    const filterRef = useRef(null);
    const filterInstance = useRef(null);

    const [search, setSearch] = useState({
        value: '',
        checked: true,
    });

    const [data, setData] = useState([]);
    const [moduleCreate, setModuleCreate] = useState(false);
    const [moduleEdit, setModuleEdit] = useState(false);
    const [moduleDelete, setModuleDelete] = useState(false);
    const [moduleError, setModuleError] = useState(false);

    const url = ['api/modules'];

    const actions = [
        { key: 'edit', icon: 'ri-edit-line', class: 'btn-label-primary', title: 'Editar' },
        { key: 'delete', icon: 'ri-delete-bin-5-line', class: 'btn-label-danger', title: 'Eliminar' },
    ];

    const [module, setModule] = useState({
        id: '',
        name: '',
        description: '',
        url: '',
        icon: '',
        position: '',
        status: 'ACTIVE',
    });

    const [columns, setColumns] = useState([
        { title: 'Orden', data: 'position' },
        { title: 'Nombre', data: 'name', name: 'name' },
        { title: 'URL', data: 'url', name: 'url' },
        { title: 'Icono', data: 'icon', render: (icon) => `<i class="${icon}"></i>` },
        { title: 'Descripción', data: 'description' },
        { title: 'Estado', data: 'status', name: 'status' },
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
            },
            searchable: false,
        },
    ]);

    const openModalCreate = () => {
        if (!modalCreateInstance.current) {
            modalCreateInstance.current = new window.bootstrap.Modal(
                modalCreateRef.current
            );
        }
        modalCreateInstance.current.show();
        setModule({
            id: '',
            name: '',
            description: '',
            url: '',
            icon: '',
            position: '',
            status: 'ACTIVE',
        });
    };

    const buttons = [
        {
            text: '<i class="ri-filter-3-line ri-16px me-sm-2"></i> <span class="d-none d-sm-inline-block">Filtrar</span>',
            className: 'btn rounded-pill btn-secondary waves-effect mx-2 my-2 ',
            action: async function (e, dt, button, config) {
                if (!filterInstance.current) {
                    filterInstance.current = new window.bootstrap.Modal(filterRef.current);
                }
                filterInstance.current.show();
            }
        },
        {
            text: '<i class="ri-add-line ri-16px me-sm-2"></i> <span class="d-none d-sm-inline-block">Crear Modulo</span>',
            className: 'btn rounded-pill btn-primary waves-effect mx-2 my-2 ',
            action: async function (e, dt, button, config) {
                openModalCreate()
            }
        }
    ];

    useEffect(() => {
        const table = dataTableRef?.current;
        if (!table) return;

        const handler = function () {
            const action = $(this).data('action');
            const id = Number($(this).data('id'));

            switch (action) {
                case 'edit':

                    const moduleRef = data.find(m => m.id === id);

                    if (!moduleRef) {
                        console.warn('Módulo no encontrado', id);
                        return;
                    }

                    setModule({
                        id: moduleRef.id,
                        name: moduleRef.name == null ? '' : moduleRef.name,
                        description: moduleRef.description == null ? '' : moduleRef.description,
                        url: moduleRef.url == null ? '' : moduleRef.url,
                        icon: moduleRef.icon == null ? '' : moduleRef.icon,
                        position: moduleRef.position == null ? '' : moduleRef.position,
                        status: moduleRef.status
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
                        text: '¿Estás seguro de querer eliminar este módulo?',
                        icon: 'warning',
                        showCancelButton: true,
                        confirmButtonText: 'Eliminar',
                        cancelButtonText: 'Cancelar',
                    }).then(async (result) => {
                        if (result.isConfirmed) {
                            const url = base_url(['api', 'modules', 'delete', id]);
                            try {
                                const response = await fetchHelper.delete(url, {}, {}, 500, false);
                                dataTableRef?.current?.ajax.reload();
                                setModuleDelete(true);
                                setModuleError(false);
                            } catch (error) {
                                console.error(error);
                                setModuleError(true);
                                setModuleDelete(false);
                                dataTableRef?.current?.ajax.reload();
                            }
                        }
                    });
                    break;
            };
        };

        table.on('click', '.action-btn', handler);

        return () => {
            table.off('click', '.action-btn', handler);
        };
    }, [data]);

    return <>
        <div className="card">
            <h5 className="card-header text-md-start text-center">Modulos</h5>
            <AlertPage type="success" message="Modulo creado correctamente" show={moduleCreate} onChange={() => setModuleCreate(false)} />
            <AlertPage type="success" message="Modulo actualizado correctamente" show={moduleEdit} onChange={() => setModuleEdit(false)} />
            <AlertPage type="success" message="Modulo eliminado correctamente" show={moduleDelete} onChange={() => setModuleDelete(false)} />
            <AlertPage type="danger" message="Error al eliminar el módulo. Verifique su conexión e intente nuevamente." show={moduleError} onChange={() => setModuleError(false)} />
            <div className="card-datatable text-nowrap">
                <DataTableReference
                    url_api={url}
                    columns={columns}
                    tableRef={tableRef}
                    dataTableRef={dataTableRef}
                    method='POST'
                    buttons={buttons}
                    title='Modulos'
                    setData={setData}
                    search={search}
                    setSearch={setSearch}
                    filtered={true}
                />
            </div>
        </div>

        <FilterModule
            filterRef={filterRef}
            filterInstance={filterInstance}
            dataTableRef={dataTableRef}
        />

        <CreateModule
            modalRef={modalCreateRef}
            modalInstance={modalCreateInstance}
            module={module}
            setModule={setModule}
            dataTableRef={dataTableRef}
            setModuleCreate={setModuleCreate}
        />

        <UpdatedModule
            modalRef={modalUpdateRef}
            modalInstance={modalUpdateInstance}
            module={module}
            setModule={setModule}
            dataTableRef={dataTableRef}
            setModuleEdit={setModuleEdit}
        />
    </>;
}

export default IndexModules