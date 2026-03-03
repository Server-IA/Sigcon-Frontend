import { useState, useEffect, useRef } from 'react';

import DataTableReference from '../../../components/organism/DataTable';
import AlertPage from '../../../components/molecules/AlertPage';

import { fetchHelper } from '../../../utils/fetch';
import { base_url } from '../../../utils/functions';

import CreatePUC from './create';
import UpdatedPUC from './updated';
import FilterPUC from './filter';
import DropzoneModal from '../../../components/molecules/DropzoneModal';

const ACCOUNT_CLASSES = [
    { id: 'ASSET', name: 'Activo' },
    { id: 'LIABILITY', name: 'Pasivo' },
    { id: 'EQUITY', name: 'Patrimonio' },
    { id: 'REVENUE', name: 'Ingresos' },
    { id: 'EXPENSE', name: 'Gastos' },
    { id: 'COST_OF_SALES', name: 'Costos de venta' },
    { id: 'PRODUCTION_COST', name: 'Costos de producción o de operación' },
    { id: 'MEMORANDUM_DEBIT', name: 'Cuentas de orden deudoras' },
    { id: 'MEMORANDUM_CREDIT', name: 'Cuentas de orden acreedoras' },
];

const LEVELS = [
    { id: 'CLASS', name: 'Clase' },
    { id: 'GROUP', name: 'Grupo' },
    { id: 'ACCOUNT', name: 'Cuenta' },
    { id: 'SUBACCOUNT', name: 'Subcuenta' },
];

const ACCOUNT_NATURES = [
    { id: 'DEBIT', name: 'Deudora' },
    { id: 'CREDIT', name: 'Acreedora' },
];

const ACCOUNT_STATUSES = [
    { id: 'ACTIVE', name: 'Activa' },
    { id: 'INACTIVE', name: 'Inactiva' },
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

    const modalBulkRef = useRef(null);
    const modalBulkInstance = useRef(null);

    const [data, setData] = useState([]);
    const [clickEdit, setClickEdit] = useState(false);
    const [message, setMessage] = useState({ message: '', type: '', show: false });

    const [search, setSearch] = useState({
        value: '',
        checked: true,
    });

    const [account, setAccount] = useState({
        id: '',
        code: '',
        name: '',
        accountClass: '',
        level: '',
        nature: '',
        status: 'ACTIVE',
        hasTransactions: false,
    });

    const url = ['api', 'v1', 'chart-of-accounts', 'search'];

    const actions = [
        { key: 'edit', icon: 'ri-edit-line', class: 'btn-label-primary', title: 'Editar' },
        { key: 'delete', icon: 'ri-delete-bin-5-line', class: 'btn-label-danger', title: 'Eliminar' },
    ];

    const columns = [
        { title: 'Código', data: 'code', name: 'code' },
        { title: 'Nombre', data: 'name', name: 'name' },
        { title: 'Clase', data: 'accountClass', name: 'accountClass', render: (val) => ACCOUNT_CLASSES.find(c => c.id === val)?.name ?? val ?? '-' },
        { title: 'Nivel', data: 'level', name: 'level', render: (val) => LEVELS.find(l => l.id === val)?.name ?? val ?? '-' },
        { title: 'Naturaleza', data: 'nature', name: 'nature', render: (val) => ACCOUNT_NATURES.find(n => n.id === val)?.name ?? val ?? '-' },
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
            code: '',
            name: '',
            accountClass: '',
            level: '',
            nature: '',
            status: 'ACTIVE',
            hasTransactions: false,
        });
        modalCreateInstance.current.show();
    };

    const openModalUpdate = () => {
        if (!modalUpdateInstance.current) {
            modalUpdateInstance.current = new window.bootstrap.Modal(modalUpdateRef.current);
        }
        modalUpdateInstance.current.show();
    };

    const openModalBulk = () => {
        if (!modalBulkInstance.current) {
            modalBulkInstance.current = new window.bootstrap.Modal(modalBulkRef.current);
        }
        modalBulkInstance.current.show();
    };

    const buttons = [
        {
            text: '<i class="ri-filter-line ri-16px me-sm-2"></i> <span class="d-none d-sm-inline-block">Filtrar</span>',
            className: 'btn rounded-pill btn-secondary waves-effect mx-1 my-2',
            action: function () {
                if (!filterInstance.current) {
                    filterInstance.current = new window.bootstrap.Modal(filterRef.current);
                }
                filterInstance.current.show();
            }
        },
        {
            text: '<i class="ri-upload-2-line ri-16px me-sm-2"></i> <span class="d-none d-sm-inline-block">Cargue Masivo</span>',
            className: 'btn rounded-pill btn-label-success waves-effect mx-1 my-2',
            action: function () { openModalBulk(); }
        },
        {
            text: '<i class="ri-add-line ri-16px me-sm-2"></i> <span class="d-none d-sm-inline-block">Crear Cuenta PUC</span>',
            className: 'btn rounded-pill btn-primary waves-effect mx-1 my-2',
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
            const accountRef = data.find(m => m.id === id);

            if (!accountRef) {
                console.warn('Cuenta PUC no encontrada', id);
                return;
            }

            switch (action) {
                case 'edit':
                    setAccount({
                        id: accountRef.id ?? '',
                        code: accountRef.code ?? '',
                        name: accountRef.name ?? '',
                        accountClass: accountRef.accountClass ?? '',
                        level: accountRef.level ?? '',
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
                        showDenyButton: false,
                        cancelButtonText: 'Cancelar',
                        confirmButtonText: 'Siguiente',
                    }).then((result) => {
                        if (!result.isConfirmed) return;

                        window.Swal.fire({
                            title: 'Motivo de eliminación',
                            text: 'Ingrese el motivo por el cual elimina esta cuenta PUC:',
                            input: 'textarea',
                            inputPlaceholder: 'Escriba el motivo aquí...',
                            inputAttributes: {
                                'aria-label': 'Motivo de eliminación',
                                maxlength: '255',
                            },
                            showCancelButton: true,
                            cancelButtonText: 'Cancelar',
                            confirmButtonText: 'Eliminar',
                            preConfirm: (reason) => {
                                if (!reason || reason.trim() === '') {
                                    window.Swal.showValidationMessage('Debe ingresar el motivo de eliminación');
                                    return false;
                                }
                                if (reason.length > 255) {
                                    window.Swal.showValidationMessage('El motivo no puede superar los 255 caracteres');
                                    return false;
                                }
                                if (!/^[A-Za-z0-9_\-\s]{1,255}$/.test(reason)) {
                                    window.Swal.showValidationMessage('El motivo solo puede contener letras, números, guiones y espacios');
                                    return false;
                                }
                                return reason;
                            }
                        }).then(async (result) => {
                            if (!result.isConfirmed) return;

                            try {
                                const deleteUrl = base_url(['api', 'v1', 'chart-of-accounts', id]);
                                await fetchHelper.delete(deleteUrl, { reason: result.value }, {}, 500, false);
                                dataTableRef?.current?.ajax.reload();
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
    }, [data]);

    return (
        <>
            <div className="card">
                <h5 className="card-header text-md-start text-center">Catálogo Único de Cuentas (PUC)</h5>

                <AlertPage type={message.type} message={message.message} show={message.show} onChange={() => setMessage({ message: '', type: '', show: false })} />

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
                    accountClasses={ACCOUNT_CLASSES}
                    levels={LEVELS}
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
                levels={LEVELS}
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
                levels={LEVELS}
                accountNatures={ACCOUNT_NATURES}
                accountStatuses={ACCOUNT_STATUSES}
            />

            <DropzoneModal
                modalRef={modalBulkRef}
                title="Cargue Masivo PUC"
                uploadUrl={base_url(['api', 'v1', 'chart-of-accounts', 'bulk'])}
                acceptedFiles=".xlsx,.xls,.csv"
                maxFiles={1}
                maxFilesize={5}
                onSuccess={() => {
                    dataTableRef?.current?.ajax.reload();
                    setMessage({ message: 'Cargue masivo completado exitosamente', type: 'success', show: true });
                    modalBulkInstance?.current?.hide();
                }}
            />
        </>
    );
};

export default IndexPUC;
