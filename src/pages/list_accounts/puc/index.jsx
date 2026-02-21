import { useState, useEffect, useRef } from 'react';

import DataTableReference from '../../../components/organism/DataTable';
import AlertPage from '../../../components/molecules/AlertPage';

import { fetchHelper } from '../../../utils/fetch';
import { base_url } from '../../../utils/functions';

import CreatePUC from './create';
import UpdatedPUC from './updated';
import FilterPUC from './filter';

const PUCindex = () => {

    const tableRef = useRef(null);
    const dataTableRef = useRef(null);

    const filterRef = useRef(null);
    const filterInstance = useRef(null);

    const modalCreateRef = useRef(null);
    const modalCreateInstance = useRef(null);

    const modalUpdateRef = useRef(null);
    const modalUpdateInstance = useRef(null);

    const [data, setData] = useState([]);
    const [clickEdit, setClickEdit] = useState(false);

    const [pucCreate, setPucCreate] = useState(false);
    const [pucEdit, setPucEdit] = useState(false);
    const [pucDelete, setPucDelete] = useState(false);

    const [search, setSearch] = useState({
        value: '',
        checked: true,
    });

    const [account, setAccount] = useState({
        id: '',
        officialCode: '',
        name: '',
        accountClass: '',
        hierarchyLevel: '',
        nature: '',
        status: 'ACTIVE',
    });

    const url = ['list_accounts', 'puc', 'getAccounts'];

    const actions = [
        { key: 'edit', icon: 'ri-edit-line', class: 'btn-label-primary', title: 'Editar' },
        { key: 'delete', icon: 'ri-delete-bin-5-line', class: 'btn-label-danger', title: 'Eliminar' },
    ];

    const columns = [
        { title: 'ID', data: 'id', searchable: false },
        { title: 'Código Oficial', data: 'officialCode', name: 'officialCode' },
        { title: 'Nombre', data: 'name', name: 'name' },
        { title: 'Clase', data: 'accountClass', name: 'accountClass' },
        { title: 'Nivel Jerárquico', data: 'hierarchyLevel', name: 'hierarchyLevel' },
        { title: 'Naturaleza', data: 'nature', name: 'nature' },
        {
            title: 'Estado', data: 'status', name: 'status',
            render: (status) => {
                return status === 'ACTIVE'
                    ? `<span class="badge bg-label-success">Activa</span>`
                    : `<span class="badge bg-label-danger">Inactiva</span>`;
            }
        },
        {
            title: 'Acciones', data: 'id', searchable: false,
            render: (id) => {
                return `
                    <div class="d-flex gap-1">
                        ${actions.map(a => `
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
    ];

    const openModalCreate = () => {
        if (!modalCreateInstance.current) {
            modalCreateInstance.current = new window.bootstrap.Modal(
                modalCreateRef.current
            );
        }
        setAccount({
            id: '',
            officialCode: '',
            name: '',
            accountClass: '',
            hierarchyLevel: '',
            nature: '',
            status: 'ACTIVE',
        });
        modalCreateInstance.current.show();
    };

    const openModalUpdate = () => {
        if (!modalUpdateInstance.current) {
            modalUpdateInstance.current = new window.bootstrap.Modal(
                modalUpdateRef.current
            );
        }
        modalUpdateInstance.current.show();
    };

    const buttons = [
        {
            text: '<i class="ri-filter-line ri-16px me-sm-2"></i> <span class="d-none d-sm-inline-block">Filtrar</span>',
            className: 'btn rounded-pill btn-secondary waves-effect mx-2 my-2',
            action: function () {
                if (!filterInstance.current) {
                    filterInstance.current = new window.bootstrap.Modal(
                        filterRef.current
                    );
                }
                filterInstance.current.show();
            }
        },
        {
            text: '<i class="ri-add-line ri-16px me-sm-2"></i> <span class="d-none d-sm-inline-block">Crear Cuenta PUC</span>',
            className: 'btn rounded-pill btn-primary waves-effect mx-2 my-2',
            action: function () {
                openModalCreate();
            }
        },
    ];

    // Abrir modal de edición cuando clickEdit cambia
    useEffect(() => {
        if (!clickEdit) return;
        openModalUpdate();
        setClickEdit(false);
    }, [clickEdit]);

    // Delegación de eventos sobre la tabla
    useEffect(() => {
        const table = dataTableRef?.current;
        if (!table) return;

        const handler = function () {
            const action = $(this).data('action');
            const id = Number($(this).data('id'));
            const accountRef = data.find(m => m.id === id);

            if (!accountRef) {
                console.warn('Cuenta PUC no encontrada', id);
                return;
            }

            switch (action) {
                case 'edit':
                    setAccount({
                        id: accountRef.id ?? '',
                        officialCode: accountRef.officialCode ?? '',
                        name: accountRef.name ?? '',
                        accountClass: accountRef.accountClass ?? '',
                        hierarchyLevel: accountRef.hierarchyLevel ?? '',
                        nature: accountRef.nature ?? '',
                        status: accountRef.status ?? 'ACTIVE',
                        hasTransactions: accountRef.hasTransactions ?? false,
                    });
                    setClickEdit(true);
                    break;

                case 'delete':
                    // Paso 1: confirmación
                    window.Swal.fire({
                        title: '¿Está seguro?',
                        text: `¿Está seguro de eliminar la cuenta "${accountRef.name}"?`,
                        icon: 'warning',
                        showCancelButton: true,
                        confirmButtonText: 'Sí, continuar',
                        cancelButtonText: 'Cancelar',
                    }).then((result) => {
                        if (!result.isConfirmed) return;

                        // Paso 2: motivo de eliminación
                        window.Swal.fire({
                            title: 'Motivo de eliminación',
                            text: 'Ingrese el motivo por el cual elimina esta cuenta PUC:',
                            input: 'textarea',
                            inputPlaceholder: 'Escriba el motivo aquí...',
                            inputAttributes: { 'aria-label': 'Motivo de eliminación' },
                            showCancelButton: true,
                            confirmButtonText: 'Eliminar',
                            cancelButtonText: 'Cancelar',
                            preConfirm: (motivo) => {
                                if (!motivo || motivo.trim() === '') {
                                    window.Swal.showValidationMessage('No ingresó el motivo de eliminación');
                                }
                                return motivo;
                            }
                        }).then(async (motivo) => {
                            if (!motivo.isConfirmed) return;

                            try {
                                const deleteUrl = base_url(['list_accounts', 'puc', 'deleteAccount', id]);
                                await fetchHelper.delete(deleteUrl, { deletionReason: motivo.value }, {}, 500, false);
                                dataTableRef?.current?.ajax.reload();
                                setPucDelete(true);
                            } catch (error) {
                                console.error(error);
                                window.Swal.fire({
                                    title: 'Error',
                                    text: error?.msg || 'Error al eliminar la cuenta PUC',
                                    icon: 'error',
                                    confirmButtonText: 'Cerrar',
                                    showCancelButton: false,
                                    allowOutsideClick: false,
                                });
                            }
                        });
                    });
                    break;

                default:
                    console.warn('Acción no válida', action);
                    break;
            }
        };

        table.on('click', '.action-btn', handler);
        return () => {
            table.off('click', '.action-btn', handler);
        };
    }, [data]);

    return (
        <>
            <div className="card">
                <h5 className="card-header text-md-start text-center">Catálogo Único de Cuentas (PUC)</h5>

                <AlertPage
                    type="success"
                    message="La cuenta ha sido creada exitosamente en el catálogo PUC."
                    show={pucCreate}
                />
                <AlertPage
                    type="success"
                    message="La cuenta fue actualizada exitosamente."
                    show={pucEdit}
                />
                <AlertPage
                    type="success"
                    message="La cuenta ha sido eliminada exitosamente."
                    show={pucDelete}
                />

                <div className="card-datatable text-nowrap">
                    <DataTableReference
                        url_api={url}
                        columns={columns}
                        tableRef={tableRef}
                        dataTableRef={dataTableRef}
                        method='POST'
                        buttons={buttons}
                        title='Catálogo PUC'
                        setData={setData}
                        search={search}
                        setSearch={setSearch}
                        filtered={true}
                    />
                </div>

                <FilterPUC
                    filterRef={filterRef}
                    filterInstance={filterInstance}
                    dataTableRef={dataTableRef}
                />
            </div>

            <CreatePUC
                modalRef={modalCreateRef}
                modalInstance={modalCreateInstance}
                account={account}
                setAccount={setAccount}
                dataTableRef={dataTableRef}
                setPucCreate={setPucCreate}
            />

            <UpdatedPUC
                modalRef={modalUpdateRef}
                modalInstance={modalUpdateInstance}
                account={account}
                setAccount={setAccount}
                dataTableRef={dataTableRef}
                setPucEdit={setPucEdit}
            />
        </>
    );
};

export default PUCindex;
