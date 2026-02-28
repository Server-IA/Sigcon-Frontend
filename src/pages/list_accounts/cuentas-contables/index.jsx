import { useState, useEffect, useRef } from 'react';
import DataTableReference from '../../../components/organism/DataTable';
import AlertPage from '../../../components/molecules/AlertPage';

import { fetchHelper } from '../../../utils/fetch';
import { base_url } from '../../../utils/functions';

import CreateCuentaContable from './create';
import UpdatedCuentaContable from './updated';
import FilterCuentaContable from './filter';

const ACCOUNT_CLASS_LABELS = {
    ASSET: 'Activo',
    LIABILITY: 'Pasivo',
    EQUITY: 'Patrimonio',
    REVENUE: 'Ingresos',
    EXPENSE: 'Gastos',
    COST_OF_SALES: 'Costos de venta',
    PRODUCTION_COST: 'Costos de producción',
    MEMORANDUM_DEBIT: 'Cuentas de orden deudoras',
    MEMORANDUM_CREDIT: 'Cuentas de orden acreedoras',
};

const ACCOUNT_LEVEL_LABELS = {
    CLASS: 'Clase',
    GROUP: 'Grupo',
    ACCOUNT: 'Cuenta',
    SUBACCOUNT: 'Subcuenta',
};

const IndexCuentasContables = () => {

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
    const [message, setMessage] = useState({
        message: '',
        type: '',
        show: false,
    });

    const url = ['api', 'v1', 'chart-of-accounts', 'search'];

    const actions = [
        { key: 'edit', icon: 'ri-edit-line', class: 'btn-label-primary', title: 'Editar' },
        { key: 'delete', icon: 'ri-delete-bin-5-line', class: 'btn-label-danger', title: 'Eliminar' },
    ];

    const initialCuentaContable = {
        id: '',
        code: '',
        name: '',
        accountClass: '',
        level: '',
        nature: '',
        status: 'ACTIVE',
    };

    const [cuentaContable, setCuentaContable] = useState(initialCuentaContable);

    const [columns, setColumns] = useState([
        { 
            title: 'Código', 
            data: 'code',
            name: 'code'
        },
        { 
            title: 'Nombre', 
            data: 'name',
            name: 'name'
        },
        { 
            title: 'Clase', 
            data: 'accountClass',
            name: 'accountClass',
            render: (accountClass) => {
                return ACCOUNT_CLASS_LABELS[accountClass] || accountClass;
            }
        },
        { 
            title: 'Nivel', 
            data: 'level',
            name: 'level',
            render: (level) => {
                return ACCOUNT_LEVEL_LABELS[level] || level;
            }
        },
        { 
            title: 'Naturaleza', 
            data: 'nature',
            name: 'nature',
            render: (nature) => {
                return nature === 'DEBIT' ? 'Deudora' : nature === 'CREDIT' ? 'Acreedora' : nature;
            }
        },
        { 
            title: 'Estado', 
            data: 'status',
            name: 'status',
            render: (status) => {
                return status === 'ACTIVE' ? 'Activa' : 'Inactiva';
            }
        },
        {
            title: 'Acciones', 
            data: 'id', 
            searchable: false,
            render: (id) => {
                return `
                <div class="d-flex gap-1">
                    ${actions.map(a => `
                        <button class="btn btn-sm ${a.class} action-btn"
                            data-action="${a.key}"
                            data-id="${id}"
                            title="${a.title}">
                            <i class="ri-${a.icon}"></i>
                        </button>
                    `).join('')}
                </div>
            `
            },
        },
    ]);

    const openModalCreate = () => {
        if (!modalCreateInstance.current) {
            modalCreateInstance.current = new window.bootstrap.Modal(
                modalCreateRef.current
            );
        }
        modalCreateInstance.current.show();
        setCuentaContable(initialCuentaContable);
        setMessage({
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
            text: '<i class="ri-add-line ri-16px me-sm-2"></i> <span class="d-none d-sm-inline-block">Crear Cuenta</span>',
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

            const cuentaRef = data.find(m => m.id === id);

            if (!cuentaRef) {
                console.warn('Cuenta contable no encontrada', id);
                return;
            }

            const cuentaData = {
                id: cuentaRef.id,
                code: cuentaRef.code ?? '',
                name: cuentaRef.name ?? '',
                accountClass: cuentaRef.accountClass ?? '',
                level: cuentaRef.level ?? '',
                nature: cuentaRef.nature ?? '',
                status: cuentaRef.status ?? 'ACTIVE',
            };

            switch (action) {
                case 'edit':
                    setCuentaContable(cuentaData);
                    setMessage({
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

                case 'delete':
                    window.Swal.fire({
                        title: '¿Estás seguro?',
                        text: '¿Estás seguro de querer eliminar esta cuenta contable?',
                        icon: 'warning',
                        showCancelButton: true,
                        confirmButtonText: 'Eliminar',
                        cancelButtonText: 'Cancelar',
                    }).then(async (result) => {
                        if (result.isConfirmed) {
                            // Solicitar motivo — swagger: DeleteChartOfAccountDTO
                            // reason: required, pattern ^[A-Za-z0-9_\-\s]{1,255}$, maxLength 255
                            window.Swal.fire({
                                title: 'Motivo de eliminación',
                                input: 'text',
                                inputLabel: 'Indique el motivo por el cual desea eliminar esta cuenta',
                                inputPlaceholder: 'Ej: Cuenta duplicada en catálogo',
                                inputAttributes: {
                                    'aria-label': 'Motivo',
                                    maxlength: 255,
                                },
                                inputValidator: (value) => {
                                    if (!value || value.trim() === '') {
                                        return 'El motivo de eliminación es obligatorio';
                                    }
                                    const reasonRegex = /^[A-Za-z0-9_\-\s]{1,255}$/;
                                    if (!reasonRegex.test(value.trim())) {
                                        return 'Solo se permiten caracteres alfanuméricos, espacios, guiones y guiones bajos (máximo 255)';
                                    }
                                },
                                showCancelButton: true,
                                confirmButtonText: 'Eliminar',
                                cancelButtonText: 'Cancelar',
                            }).then(async (reasonResult) => {
                                if (reasonResult.isConfirmed) {
                                    // DELETE /api/v1/chart-of-accounts/{id} con body DeleteChartOfAccountDTO
                                    const deleteUrl = base_url(['api', 'v1', 'chart-of-accounts', id]);
                                    try {
                                        await fetchHelper.delete(deleteUrl, { reason: reasonResult.value.trim() }, {}, 500, false);
                                        setMessage({
                                            message: 'Cuenta contable eliminada exitosamente',
                                            type: 'success',
                                            show: true,
                                        });
                                    } catch (error) {
                                        console.error('Error DELETE /api/v1/chart-of-accounts/' + id + ':', error);
                                        setMessage({
                                            message: error.msg || error.message || 'Error al eliminar la cuenta contable',
                                            type: 'danger',
                                            show: true,
                                        });
                                    } finally {
                                        dataTableRef?.current?.ajax.reload();
                                    }
                                }
                            });
                        }
                    });
                    break;
            }
        };

        table.on('click', '.action-btn', handler);
        return () => {
            table.off('click', '.action-btn', handler);
        };
    }, [data]);

    return <>
        <div className="card">
            <h5 className="card-header text-md-start text-center">Catálogo de Cuentas Contables (PUC)</h5>

            <AlertPage 
                message={message.message} 
                type={message.type} 
                show={message.show} 
            />

            <div className="card-datatable text-nowrap">
                <DataTableReference
                    url_api={url}
                    columns={columns}
                    tableRef={tableRef}
                    dataTableRef={dataTableRef}
                    method='POST'
                    buttons={buttons}
                    title='Cuentas Contables'
                    setData={setData}
                    search={search}
                    setSearch={setSearch}
                    filtered={true}
                />
            </div>

            <FilterCuentaContable
                filterRef={filterRef}
                filterInstance={filterInstance}
                dataTableRef={dataTableRef}
            />
        </div>

        <CreateCuentaContable
            modalRef={modalCreateRef}
            modalInstance={modalCreateInstance}
            cuentaContable={cuentaContable}
            setCuentaContable={setCuentaContable}
            dataTableRef={dataTableRef}
            setMessage={setMessage}
        />

        <UpdatedCuentaContable
            modalRef={modalUpdateRef}
            modalInstance={modalUpdateInstance}
            cuentaContable={cuentaContable}
            setCuentaContable={setCuentaContable}
            dataTableRef={dataTableRef}
            setMessage={setMessage}
        />
    </>;
};

export default IndexCuentasContables;
