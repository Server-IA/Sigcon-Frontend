import { useState, useEffect, useRef, useCallback } from 'react';
import DataTableReference from '../../../components/organism/DataTable';
import AlertPage from '../../../components/molecules/AlertPage';

import { fetchHelper } from '../../../utils/fetch';
import { base_url } from '../../../utils/functions';

import CreateCuentaContable from './create';
import UpdatedCuentaContable from './updated';
import FilterCuentaContable from './filter';

// Swagger: nature enum DEBIT / CREDIT  (AccountFilterRequest, CreateAccountingAccountRequest)
const NATURE_LABELS = { DEBIT: 'Deudora', CREDIT: 'Acreedora' };

const IndexCuentasContables = () => {

    const tableRef = useRef(null);
    const dataTableRef = useRef(null);

    const modalCreateRef = useRef(null);
    const modalCreateInstance = useRef(null);

    const modalUpdateRef = useRef(null);
    const modalUpdateInstance = useRef(null);

    const filterRef = useRef(null);
    const filterInstance = useRef(null);

    const [search, setSearch] = useState({ value: '', checked: true });

    const [data, setData] = useState([]);
    const [message, setMessage] = useState({ message: '', type: '', show: false });

    // Swagger: POST /api/v1/accounting-accounts → { dtRequest: DataTableRequest, filters: AccountFilterRequest }
    const url = ['api', 'v1', 'accounting-accounts'];

    const actions = [
        { key: 'edit', icon: 'ri-edit-line', class: 'btn-label-primary', title: 'Editar' },
        { key: 'delete', icon: 'ri-delete-bin-5-line', class: 'btn-label-danger', title: 'Inactivar' },
    ];

    // Snake_case field names matching swagger UpdateAccountingAccountRequest / CreateAccountingAccountRequest
    const initialCuentaContable = {
        id: null,
        puc_id: null,
        custom_name: null,
        currency_type_id: null,
        cost_center_id: null,
        tax_rule_id: null,
        nature: null,
        status: 'ACTIVE',
    };

    const [cuentaContable, setCuentaContable] = useState(initialCuentaContable);

    // Column `data` keys must match backend response field names
    const [columns] = useState([
        { title: 'Nombre Personalizado', data: 'customName',          name: 'customName' },
        { title: 'Código PUC',          data: 'pucAccount.code',       name: 'pucAccountCode' },
        { title: 'Moneda Base',          data: 'currencyType.name',        name: 'baseCurrency' },
        { title: 'Centro de Costos',     data: 'costCenter.name',       name: 'costCenterName', defaultContent: '—' },
        { title: 'Regla tributaria', data: 'taxRuleId', name: 'taxRuleId', defaultContent: '—' },
        {
            title: 'Naturaleza', data: 'nature', name: 'nature',
            render: (nature) => NATURE_LABELS[nature] ?? nature,
        },
        {
            title: 'Estado', data: 'status', name: 'status',
            render: (status) => status === 'ACTIVE' ? 'Activa' : 'Inactiva',
        },
        {
            title: 'Acciones', data: 'id', searchable: false,
            render: (id) => `
                <div class="d-flex gap-1">
                    ${actions.map(a => `
                        <button class="btn btn-sm ${a.class} action-btn"
                            data-action="${a.key}" data-id="${id}" title="${a.title}">
                            <i class="${a.icon}"></i>
                        </button>
                    `).join('')}
                </div>`,
        },
    ]);

    const openModalCreate = () => {
        if (!modalCreateInstance.current) {
            modalCreateInstance.current = new window.bootstrap.Modal(modalCreateRef.current);
        }
        modalCreateInstance.current.show();
        setCuentaContable(initialCuentaContable);
        setMessage({ message: '', type: '', show: false });
    };

    const openModalUpdate = () => {
        if (!modalUpdateInstance.current) {
            modalUpdateInstance.current = new window.bootstrap.Modal(modalUpdateRef.current);
        }
        modalUpdateInstance.current.show();
        setMessage({ message: '', type: '', show: false });
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
            },
        },
        {
            text: '<i class="ri-add-line ri-16px me-sm-2"></i> <span class="d-none d-sm-inline-block">Crear Cuenta</span>',
            className: 'btn rounded-pill btn-primary waves-effect mx-2 my-2',
            action: function () { openModalCreate(); },
        },
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

            // Snake_case fields matching swagger response
            const cuentaData = {
                id: cuentaRef.id,
                puc_id: cuentaRef.puc_id ?? null,
                custom_name: cuentaRef.customName ?? null,
                currency_type_id: cuentaRef.currencyType?.id ?? null,
                cost_center_id: cuentaRef.costCenter?.id ?? null,
                tax_rule_id: cuentaRef.taxRuleId ?? null,
                nature: cuentaRef.nature ?? null,
                status: cuentaRef.status ?? 'ACTIVE',
            };

            switch (action) {
                case 'edit':
                    setCuentaContable(cuentaData);
                    openModalUpdate();
                    break;

                case 'delete':
                    window.Swal.fire({
                        title: '¿Estás seguro?',
                        text: '¿Deseas inactivar esta cuenta contable? (CFG-RF-08)',
                        icon: 'warning',
                        showCancelButton: true,
                        confirmButtonText: 'Inactivar',
                        cancelButtonText: 'Cancelar',
                    }).then(async (result) => {
                        if (!result.isConfirmed) return;
                        // Swagger: DELETE /api/v1/accounting-accounts/delete/{id}?reason={reason}
                        window.Swal.fire({
                            title: 'Motivo de inactivación',
                            input: 'text',
                            inputLabel: 'Indique el motivo por el cual desea inactivar esta cuenta',
                            inputPlaceholder: 'Ej: Cuenta obsoleta',
                            inputAttributes: { 'aria-label': 'Motivo', maxlength: 255 },
                            inputValidator: (value) => {
                                if (!value || value.trim() === '') return 'El motivo es obligatorio';
                            },
                            showCancelButton: true,
                            confirmButtonText: 'Inactivar',
                            cancelButtonText: 'Cancelar',
                        }).then(async (reasonResult) => {
                            if (!reasonResult.isConfirmed) return;
                            // reason como query param según swagger
                            const deleteUrl = base_url(
                                ['api', 'v1', 'accounting-accounts', 'delete', id],
                                { reason: reasonResult.value.trim() }
                            );
                            try {
                                await fetchHelper.delete(deleteUrl, null, {}, 500, false);
                                setMessage({
                                    message: 'Cuenta contable inactivada exitosamente',
                                    type: 'success',
                                    show: true,
                                });
                            } catch (error) {
                                console.error('Error DELETE /api/v1/accounting-accounts/delete/' + id, error);
                                setMessage({
                                    message: error.msg || error.message || 'Error al inactivar la cuenta contable',
                                    type: 'danger',
                                    show: true,
                                });
                            } finally {
                                dataTableRef?.current?.ajax.reload();
                            }
                        });
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
                    // requestWrapper={requestWrapper}
                />
            </div>

            <FilterCuentaContable
                filterRef={filterRef}
                filterInstance={filterInstance}
                dataTableRef={dataTableRef}
                // activeFilters={activeFilters}
                // setActiveFilters={setActiveFilters}
                // initialFilters={initialFilters}
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
