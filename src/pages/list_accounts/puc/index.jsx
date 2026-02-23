import { useState, useEffect, useRef } from 'react';

import DataTableReference from '../../../components/organism/DataTable';
import AlertPage from '../../../components/molecules/AlertPage';

import { fetchHelper } from '../../../utils/fetch';
import { base_url } from '../../../utils/functions';

import CreatePUC from './create';
import UpdatedPUC from './updated';
import FilterPUC from './filter';

const ACCOUNT_CLASSES = [
    { id: 'ASSET',              name: 'Activo' },
    { id: 'LIABILITY',          name: 'Pasivo' },
    { id: 'EQUITY',             name: 'Patrimonio' },
    { id: 'INCOME',             name: 'Ingresos' },
    { id: 'EXPENSE',            name: 'Gastos' },
    { id: 'COST_OF_SALES',      name: 'Costos de venta' },
    { id: 'COST_OF_PRODUCTION', name: 'Costos de producción o de operación' },
    { id: 'ORDER_DEBIT',        name: 'Cuentas de orden deudoras' },
    { id: 'ORDER_CREDIT',       name: 'Cuentas de orden acreedoras' },
];

const HIERARCHY_LEVELS = [
    { id: 'GROUP',    name: 'Grupo' },
    { id: 'SUBGROUP', name: 'Subgrupo' },
];

const ACCOUNT_NATURES = [
    { id: 'DEBIT',  name: 'Deudora' },
    { id: 'CREDIT', name: 'Acreedora' },
];

const ACCOUNT_STATUSES = [
    { id: 'ACTIVE',   name: 'Activa' },
    { id: 'INACTIVE', name: 'Inactiva' },
];

// TODO: reemplazar con llamada real cuando el endpoint esté disponible
const dataFalse = [
    {
        id: 1, idPuc: null, code: 'CC001',
        name: 'Centro de Costos Administrativo',
        description: 'Gastos generales de oficina y administración',
        accountClass: null, hierarchyLevel: null, nature: null,
        status: 'ACTIVE', companyId: 1, hasTransactions: false,
    },
    {
        id: 2, idPuc: null, code: 'CC002',
        name: 'Centro de Costos Comercial',
        description: 'Gastos del área de ventas y mercadeo',
        accountClass: null, hierarchyLevel: null, nature: null,
        status: 'ACTIVE', companyId: 1, hasTransactions: false,
    },
    {
        id: 3, idPuc: null, code: 'CC003',
        name: 'Centro de Costos Producción',
        description: 'Gastos directos del proceso productivo',
        accountClass: null, hierarchyLevel: null, nature: null,
        status: 'ACTIVE', companyId: 1, hasTransactions: true,
    },
    {
        id: 4, idPuc: null, code: 'CC004',
        name: 'Centro de Costos Tecnología',
        description: 'Gastos del área de sistemas e infraestructura',
        accountClass: null, hierarchyLevel: null, nature: null,
        status: 'INACTIVE', companyId: 1, hasTransactions: false,
    },
];

const IndexPUC = () => {

    const tableRef = useRef(null);
    const dataTableRef = useRef(null);

    const filterRef = useRef(null);
    const filterInstance = useRef(null);

    const modalCreateRef = useRef(null);
    const modalCreateInstance = useRef(null);

    const modalUpdateRef = useRef(null);
    const modalUpdateInstance = useRef(null);

    const [clickEdit, setClickEdit] = useState(false);
    const [message, setMessage] = useState({ message: '', type: '', show: false });

    const [search, setSearch] = useState({
        value: '',
        checked: true,
    });

    const [account, setAccount] = useState({
        id: '',
        idPuc: null,
        code: '',
        name: '',
        accountClass: '',
        hierarchyLevel: '',
        nature: '',
        status: 'ACTIVE',
    });

    const url = ['chartOfAccounts', 'datatable'];

    const actions = [
        { key: 'edit', icon: 'ri-edit-line', class: 'btn-label-primary', title: 'Editar' },
        { key: 'delete', icon: 'ri-delete-bin-5-line', class: 'btn-label-danger', title: 'Eliminar' },
    ];

    const columns = [
        { title: 'ID', data: 'id', searchable: false },
        { title: 'Código', data: 'code', name: 'code' },
        { title: 'Nombre', data: 'name', name: 'name' },
        { title: 'Clase', data: 'accountClass', name: 'accountClass', render: (val) => val ?? '-' },
        { title: 'Naturaleza', data: 'nature', name: 'nature', render: (val) => val ?? '-' },
        {
            title: 'Estado', data: 'status', name: 'status',
            render: (status) => status === 'ACTIVE'
                ? `<span class="badge bg-label-success">Activa</span>`
                : `<span class="badge bg-label-danger">Inactiva</span>`
        },
        {
            title: 'Acciones', data: 'id', searchable: false,
            render: (id) => `
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
            `
        },
    ];

    const openModalCreate = () => {
        if (!modalCreateInstance.current) {
            modalCreateInstance.current = new window.bootstrap.Modal(modalCreateRef.current);
        }
        setAccount({
            id: '',
            idPuc: null,
            code: '',
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
            modalUpdateInstance.current = new window.bootstrap.Modal(modalUpdateRef.current);
        }
        modalUpdateInstance.current.show();
    };

    const buttons = [
        {
            text: '<i class="ri-filter-line ri-16px me-sm-2"></i> <span class="d-none d-sm-inline-block">Filtrar</span>',
            className: 'btn rounded-pill btn-secondary waves-effect mx-2 my-2',
            action: function () {
                if (!filterInstance.current) {
                    filterInstance.current = new window.bootstrap.Modal(filterRef.current);
                }
                filterInstance.current.show();
            }
        },
        {
            text: '<i class="ri-add-line ri-16px me-sm-2"></i> <span class="d-none d-sm-inline-block">Crear Cuenta PUC</span>',
            className: 'btn rounded-pill btn-primary waves-effect mx-2 my-2',
            action: function () { openModalCreate(); }
        },
    ];

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
            const accountRef = dataFalse.find(m => m.id === id);

            if (!accountRef) {
                console.warn('Cuenta PUC no encontrada', id);
                return;
            }

            switch (action) {
                case 'edit':
                    setAccount({
                        id: accountRef.id ?? '',
                        idPuc: accountRef.idPuc ?? null,
                        code: accountRef.code ?? '',
                        name: accountRef.name ?? '',
                        description: accountRef.description ?? '',
                        accountClass: accountRef.accountClass ?? '',
                        hierarchyLevel: accountRef.hierarchyLevel ?? '',
                        nature: accountRef.nature ?? '',
                        status: accountRef.status ?? 'ACTIVE',
                        hasTransactions: accountRef.hasTransactions ?? false,
                    });
                    setClickEdit(true);
                    break;

                case 'delete':
                    window.Swal.fire({
                        title: '¿Está seguro?',
                        text: `¿Está seguro de eliminar la cuenta "${accountRef.name}"?`,
                        icon: 'warning',
                        showCancelButton: true,
                        confirmButtonText: 'Sí, continuar',
                        cancelButtonText: 'Cancelar',
                    }).then((result) => {
                        if (!result.isConfirmed) return;

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
                                // TODO: descomentar cuando el endpoint esté disponible
                                // const deleteUrl = base_url(['chartOfAccounts', id]);
                                // await fetchHelper.delete(deleteUrl, { deletionReason: motivo.value }, {}, 500, false);
                                // dataTableRef?.current?.ajax.reload();

                                setMessage({
                                    message: 'Cuenta PUC eliminada exitosamente',
                                    type: 'success',
                                    show: true,
                                });
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
        return () => { table.off('click', '.action-btn', handler); };
    }, []);

    return (
        <>
            <div className="card">
                <h5 className="card-header text-md-start text-center">Catálogo Único de Cuentas (PUC)</h5>

                <AlertPage type={message.type} message={message.message} show={message.show} />

                <div className="card-datatable text-nowrap">
                    <DataTableReference
                        url_api={url}
                        columns={columns}
                        tableRef={tableRef}
                        dataTableRef={dataTableRef}
                        method='POST'
                        buttons={buttons}
                        title='Catálogo PUC'
                        search={search}
                        setSearch={setSearch}
                        filtered={true}
                        data={dataFalse}
                    />
                </div>

                <FilterPUC
                    filterRef={filterRef}
                    filterInstance={filterInstance}
                    dataTableRef={dataTableRef}
                    accountClasses={ACCOUNT_CLASSES}
                    hierarchyLevels={HIERARCHY_LEVELS}
                    accountNatures={ACCOUNT_NATURES}
                    accountStatuses={ACCOUNT_STATUSES}
                />
            </div>

            <CreatePUC
                modalRef={modalCreateRef}
                modalInstance={modalCreateInstance}
                account={account}
                setAccount={setAccount}
                dataTableRef={dataTableRef}
                setMessage={setMessage}
                accountClasses={ACCOUNT_CLASSES}
                hierarchyLevels={HIERARCHY_LEVELS}
                accountNatures={ACCOUNT_NATURES}
            />

            <UpdatedPUC
                modalRef={modalUpdateRef}
                modalInstance={modalUpdateInstance}
                account={account}
                setAccount={setAccount}
                dataTableRef={dataTableRef}
                setMessage={setMessage}
                accountClasses={ACCOUNT_CLASSES}
                hierarchyLevels={HIERARCHY_LEVELS}
                accountNatures={ACCOUNT_NATURES}
                accountStatuses={ACCOUNT_STATUSES}
            />
        </>
    );
};

export default IndexPUC;
