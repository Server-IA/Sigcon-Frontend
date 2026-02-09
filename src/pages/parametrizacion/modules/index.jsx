
import { useState, useEffect, useRef } from 'react';
import DataTableReference from '../../../components/organism/DataTable';

import { fetchHelper } from '../../../utils/fetch';
import { base_url } from '../../../utils/functions';

import CreateModule from './create';
import UpdatedModule from './updated';

const IndexModules = () => {

    const tableRef = useRef(null);
    const dataTableRef = useRef(null);

    const modalCreateRef = useRef(null);
    const modalCreateInstance = useRef(null);

    const modalUpdateRef = useRef(null);
    const modalUpdateInstance = useRef(null);

    const [data, setData] = useState([]);
    const [moduleCreate, setModuleCreate] = useState(false);
    const [moduleEdit, setModuleEdit] = useState(false);
    const [moduleDelete, setModuleDelete] = useState(false);

    const url = ['api', 'modules'];

    const actions = [
        { key: 'view', icon: 'ri-eye-line', class: 'btn-label-info', title: 'Ver' },
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
        {title: 'Orden', data: 'position'},
        {title: 'Nombre', data: 'name'},
        {title: 'URL', data: 'url'},
        {title: 'Icono', data: 'icon', render: (icon) => `<i class="${icon}"></i>`},
        {title: 'Descripción', data: 'description'},
        {title: 'Estado', data: 'status'},
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
                case 'view':
                    console.log('view');
                    break;
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
                                if (response.status === 200) {
                                    dataTableRef?.current?.ajax.reload();
                                    setModuleDelete(true);
                                }
                            } catch (error) {
                                console.error(error);
                                window.Swal.fire({
                                    title: 'Error',
                                    text: 'Error al eliminar el módulo',
                                    icon: 'error',
                                });
                            } finally {
                                dataTableRef?.current?.ajax.reload();
                                setModuleDelete(true);
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
            <div className={`alert alert-success alert-dismissible ${!moduleCreate ? 'd-none' : ''}`} role="alert">
                <button type="button" className="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                <span>Modulo creado correctamente</span>
            </div>

            <div className={`alert alert-success alert-dismissible ${!moduleEdit ? 'd-none' : ''}`} role="alert">
                <button type="button" className="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                <span>Modulo actualizado correctamente</span>
            </div>

            <div className={`alert alert-success alert-dismissible ${!moduleDelete ? 'd-none' : ''}`} role="alert">
                <button type="button" className="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                <span>Modulo eliminado correctamente</span>
            </div>
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
                />
            </div>
        </div>

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