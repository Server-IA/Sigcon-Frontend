
import { useState, useEffect, useRef } from 'react';
import DataTableReference from '../../../components/organism/DataTable';
import CreateModule from './create';

const IndexModules = () => {

    const tableRef = useRef(null);
    const dataTableRef = useRef(null);
    const modalCreateRef = useRef(null);
    const modalInstance = useRef(null);

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

    const openModal = () => {
        if (!modalInstance.current) {
            modalInstance.current = new window.bootstrap.Modal(
                modalCreateRef.current
            );
        }
        modalInstance.current.show();
    };

    const buttons = [
        {
            text: '<i class="ri-add-line ri-16px me-sm-2"></i> <span class="d-none d-sm-inline-block">Crear Modulo</span>',
            className: 'btn rounded-pill btn-primary waves-effect mx-2 my-2 ',
            action: async function (e, dt, button, config) {
                openModal()
            }
        }
    ];

    return <>
        <div className="card">
            <h5 className="card-header text-md-start text-center">Modulos</h5>
            <div className="card-datatable text-nowrap">
                <DataTableReference
                    url_api={url}
                    columns={columns}
                    tableRef={tableRef}
                    dataTableRef={dataTableRef}
                    method='POST'
                    buttons={buttons}
                    title='Modulos'
                />
            </div>
        </div>

        <CreateModule modalRef={modalCreateRef} module={module} setModule={setModule} />
    </>;
}

export default IndexModules