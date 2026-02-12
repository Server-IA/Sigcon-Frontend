import { useState, useEffect, useRef } from 'react';
import DataTableReference from '../../../components/organism/DataTable';

import { fetchHelper } from '../../../utils/fetch';
import { base_url } from '../../../utils/functions';

import CreateParameter from './create';
import UpdatedParameter from './updated';

const IndexParameters = () => {

    const tableRef = useRef(null);
    const dataTableRef = useRef(null);

    const modalCreateRef = useRef(null);
    const modalCreateInstance = useRef(null);

    const modalUpdateRef = useRef(null);
    const modalUpdateInstance = useRef(null);

    const [data, setData] = useState([]);
    const [parameterCreate, setParameterCreate] = useState(false);
    const [parameterEdit, setParameterEdit] = useState(false);
    const [parameterDelete, setParameterDelete] = useState(false);

    const url = ['api', 'parameters'];

    const actions = [
        { key: 'view', icon: 'ri-eye-line', class: 'btn-label-info', title: 'Ver' },
        { key: 'edit', icon: 'ri-edit-line', class: 'btn-label-primary', title: 'Editar' },
        { key: 'delete', icon: 'ri-delete-bin-5-line', class: 'btn-label-danger', title: 'Eliminar' },
    ];

    const [parameter, setParameter] = useState({
        id: '',
        name: '',
        status: '',
        category: '',
        description: '',

    });

    const [columns, setColumns] = useState([
        { title: 'Id', data: 'id' },
        { title: 'Nombre', data: 'name' },
        { title: 'Estado', data: 'status' },
        { title: 'Categoría', data: 'category' },
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
        setParameter({
            id: '',
            name: '',
            status: '',
            category: '',
            description: '',
        });
    };

    const buttons = [
        {
            text: '<i class="ri-add-line ri-16px me-sm-2"></i> <span class="d-none d-sm-inline-block">Crear Parametro</span>',
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

                    const parameterRef = data.find(m => m.id === id);

                    if (!parameterRef) {
                        console.warn('Parametro no encontrado', id);
                        return;
                    }

                    setParameter({
                        id: parameterRef.id,
                        name: parameterRef.name == null ? '' : parameterRef.name,
                        description: parameterRef.description == null ? '' : parameterRef.description,
                        status: parameterRef.status,
                        category: parameterRef.category == null ? '' : parameterRef.category,
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
                        text: '¿Estás seguro de querer eliminar este parametro?',
                        icon: 'warning',
                        showCancelButton: true,
                        confirmButtonText: 'Eliminar',
                        cancelButtonText: 'Cancelar',
                    }).then(async (result) => {
                        if (result.isConfirmed) {
                            const url = base_url(['api', 'parameters', 'delete', id]);
                            try {
                                const response = await fetchHelper.delete(url, {}, {}, 500, false);
                                if (response.status === 200) {
                                    dataTableRef?.current?.ajax.reload();
                                    setParameterDelete(true);
                                }
                            } catch (error) {
                                console.error(error);
                                window.Swal.fire({
                                    title: 'Error',
                                    text: 'Error al eliminar el parametro',
                                    icon: 'error',
                                });
                            } finally {
                                dataTableRef?.current?.ajax.reload();
                                setParameterDelete(true);
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
            <h5 className="card-header text-md-start text-center">Parametros</h5>
            <div className={`alert alert-success alert-dismissible ${!parameterCreate ? 'd-none' : ''}`} role="alert">
                <button type="button" className="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                <span>Parametro creado correctamente</span>
            </div>

            <div className={`alert alert-success alert-dismissible ${!parameterEdit ? 'd-none' : ''}`} role="alert">
                <button type="button" className="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                <span>Parametro actualizado correctamente</span>
            </div>

            <div className={`alert alert-success alert-dismissible ${!parameterDelete ? 'd-none' : ''}`} role="alert">
                <button type="button" className="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                <span>Parametro eliminado correctamente</span>
            </div>
            <div className="card-datatable text-nowrap">
                <DataTableReference
                    url_api={url}
                    columns={columns}
                    tableRef={tableRef}
                    dataTableRef={dataTableRef}
                    method='POST'
                    buttons={buttons}
                    title='Parametros'
                    setData={setData}
                />
            </div>
        </div>

        <CreateParameter
            modalRef={modalCreateRef}
            modalInstance={modalCreateInstance}
            parameter={parameter}
            setParameter={setParameter}
            dataTableRef={dataTableRef}
            setParameterCreate={setParameterCreate}
        />

        <UpdatedParameter
            modalRef={modalUpdateRef}
            modalInstance={modalUpdateInstance}
            parameter={parameter}
            setParameter={setParameter}
            dataTableRef={dataTableRef}
            setParameterEdit={setParameterEdit}
        />
    </>;
}

export default IndexParameters;