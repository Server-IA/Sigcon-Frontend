import { useState, useEffect, useRef } from 'react';
import DataTableReference from '../../../components/organism/DataTable';
import AlertPage from '../../../components/molecules/AlertPage';

import { fetchHelper } from '../../../utils/fetch';
import { base_url } from '../../../utils/functions';

import CreateCuentaContable from './create';
import UpdatedCuentaContable from './updated';
import FilterCuentaContable from './filter';

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

    const url = ['api/accounting-accounts'];

    const actions = [
        { key: 'view', icon: 'ri-eye-line', class: 'btn-label-info', title: 'Ver' },
        { key: 'edit', icon: 'ri-edit-line', class: 'btn-label-primary', title: 'Editar' },
        { key: 'delete', icon: 'ri-delete-bin-5-line', class: 'btn-label-danger', title: 'Eliminar' },
    ];

    const [cuentaContable, setCuentaContable] = useState({
        id: '',
        pucId: '',
        pucCode: '',
        customName: '',
        baseCurrency: '',
        costCenterId: '',
        depreciationRuleId: '',
        nature: '',
        status: 'ACTIVE',
        companyId: '',
    });

    const [columns, setColumns] = useState([
        { 
            title: 'Código PUC', 
            data: 'pucCode',
            name: 'pucCode'
        },
        { 
            title: 'Nombre Personalizado', 
            data: 'customName',
            name: 'customName'
        },
        { 
            title: 'Moneda Base', 
            data: 'baseCurrency',
            name: 'baseCurrency'
        },
        { 
            title: 'Centro de Costos', 
            data: 'costCenterName',
        },
        { 
            title: 'Regla de Depreciación', 
            data: 'depreciationRuleName',
        },
        { 
            title: 'Naturaleza', 
            data: 'nature',
            name: 'nature',
            render: (nature) => {
                return nature === 'DEUDORA' ? 'Deudora' : 'Acreedora';
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
        setCuentaContable({
            id: '',
            pucId: '',
            pucCode: '',
            customName: '',
            baseCurrency: '',
            costCenterId: '',
            depreciationRuleId: '',
            nature: '',
            status: 'ACTIVE',
            companyId: '',
        });
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
                pucId: cuentaRef.pucId ?? '',
                pucCode: cuentaRef.pucCode ?? '',
                customName: cuentaRef.customName ?? '',
                baseCurrency: cuentaRef.baseCurrency ?? '',
                costCenterId: cuentaRef.costCenterId ?? '',
                depreciationRuleId: cuentaRef.depreciationRuleId ?? '',
                nature: cuentaRef.nature ?? '',
                status: cuentaRef.status ?? 'ACTIVE',
                companyId: cuentaRef.companyId ?? '',
            };

            switch (action) {
                case 'view':
                    setCuentaContable(cuentaData);
                    setMessage({
                        message: '',
                        type: '',
                        show: false,
                    });
                    // Aquí podrías abrir un modal de vista si lo requieres
                    break;

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
                        text: '¿Estás seguro de querer inactivar esta cuenta contable?',
                        icon: 'warning',
                        showCancelButton: true,
                        confirmButtonText: 'Inactivar',
                        cancelButtonText: 'Cancelar',
                    }).then(async (result) => {
                        if (result.isConfirmed) {
                            window.Swal.fire({
                                title: 'Motivo de inactivación',
                                input: 'textarea',
                                inputLabel: 'Indique el motivo por el cual desea inactivar esta cuenta',
                                inputPlaceholder: 'Motivo...',
                                inputAttributes: {
                                    'aria-label': 'Motivo'
                                },
                                showCancelButton: true,
                                confirmButtonText: 'Inactivar',
                                cancelButtonText: 'Cancelar',
                            }).then(async (reasonResult) => {
                                if (reasonResult.isConfirmed) {
                                    const url = base_url(['api', 'accounting-accounts', id]);
                                    try {
                                        await fetchHelper.delete(url, { reason: reasonResult.value || 'Sin especificar' }, {}, 500, false);
                                        setMessage({
                                            message: 'Cuenta contable inactivada exitosamente',
                                            type: 'success',
                                            show: true,
                                        });
                                    } catch (error) {
                                        console.error(error);
                                        setMessage({
                                            message: error.msg || 'Error al inactivar la cuenta',
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
            <h5 className="card-header text-md-start text-center">Cuentas Contables</h5>

            <AlertPage 
                message={message.message} 
                type={message.type} 
                show={message.show}
                onChange={() => setMessage({ message: '', type: '', show: false })}
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
