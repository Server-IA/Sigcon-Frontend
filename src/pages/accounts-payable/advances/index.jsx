import { useState, useEffect, useRef, useMemo } from 'react';

import DataTableReference from '../../../components/organism/DataTable';
import AlertPage from '../../../components/molecules/AlertPage';

import { base_url } from '../../../utils/functions';
import { fetchHelper } from '../../../utils/fetch';

import CreateApAdvance from './create';

/**
 * Pagina principal de Anticipos a Proveedores (Cuentas por Pagar).
 * Muestra un listado paginado y permite registrar y aplicar anticipos.
 */

const STATUS_BADGE = {
    AVAILABLE: 'bg-label-success',
    APPLIED: 'bg-label-info',
    PARTIALLY_APPLIED: 'bg-label-warning',
    REVERSED: 'bg-label-danger',
};

const STATUS_LABEL = {
    AVAILABLE: 'Disponible',
    APPLIED: 'Aplicado',
    PARTIALLY_APPLIED: 'Parcialmente Aplicado',
    REVERSED: 'Reversado',
};

const formatCurrency = (val) => {
    if (val === null || val === undefined) return '-';
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 2,
    }).format(Number(val));
};

const IndexApAdvances = () => {
    const tableRef = useRef(null);
    const dataTableRef = useRef(null);
    const modalCreateRef = useRef(null);
    const modalCreateInstance = useRef(null);

    const [data, setData] = useState([]);
    const [search, setSearch] = useState({ value: '', checked: true });
    const [message, setMessage] = useState({ message: '', type: '', show: false });

    const url = ['api', 'v1', 'ap', 'advances'];

    const columns = [
        { title: 'Id', data: 'id', name: 'id' },
        {
            title: 'Proveedor',
            data: 'thirdPartyName',
            name: 'thirdPartyName',
            render: (val) => val || '-',
        },
        {
            title: 'Monto',
            data: 'amount',
            name: 'amount',
            render: (val) => formatCurrency(val),
        },
        { title: 'Fecha', data: 'advanceDate', name: 'advanceDate' },
        {
            title: 'Estado',
            data: 'status',
            name: 'status',
            render: (val) => {
                const badge = STATUS_BADGE[val] || 'bg-label-secondary';
                const label = STATUS_LABEL[val] || val || '-';
                return `<span class="badge ${badge}">${label}</span>`;
            },
        },
        {
            title: 'Factura Aplicada',
            data: 'appliedInvoiceId',
            name: 'appliedInvoiceId',
            render: (val) => val || '-',
        },
        {
            title: 'Acciones',
            data: 'id',
            searchable: false,
            render: (id, _type, row) => {
                const canApply = row?.status === 'AVAILABLE' || row?.status === 'PARTIALLY_APPLIED';
                return `
                <div class="d-flex gap-1">
                    <button class="btn btn-sm btn-label-info action-btn"
                        data-action="view" data-id="${id}" title="Ver">
                        <i class="ri-eye-line"></i>
                    </button>
                    <button class="btn btn-sm btn-label-success action-btn"
                        data-action="apply" data-id="${id}" title="Aplicar a Factura"
                        ${!canApply ? 'disabled' : ''}>
                        <i class="ri-links-line"></i>
                    </button>
                </div>`;
            },
        },
    ];

    const openModalCreate = () => {
        if (!modalCreateInstance.current) {
            modalCreateInstance.current = new window.bootstrap.Modal(modalCreateRef.current);
        }
        modalCreateInstance.current.show();
    };

    const buttons = [
        {
            text: '<i class="ri-add-line ri-16px me-sm-2"></i><span class="d-none d-sm-inline-block">Registrar Anticipo</span>',
            className: 'btn rounded-pill btn-primary waves-effect mx-2 my-2',
            action: () => openModalCreate(),
        },
    ];

    const rows = useMemo(() => {
        if (Array.isArray(data)) return data;
        if (Array.isArray(data?.data)) return data.data;
        return [];
    }, [data]);

    /** Aplica anticipo a una factura con prompt de SweetAlert. */
    const handleApply = async (selected) => {
        const result = await window.Swal.fire({
            title: 'Aplicar Anticipo',
            input: 'number',
            inputLabel: 'ID de la factura a aplicar',
            inputPlaceholder: 'Ingrese el ID de la factura',
            showCancelButton: true,
            confirmButtonText: 'Aplicar',
            cancelButtonText: 'Cancelar',
            inputValidator: (value) => {
                if (!value || Number(value) <= 0) return 'Debe ingresar un ID de factura valido';
            },
        });
        if (!result.isConfirmed) return;

        try {
            await fetchHelper.post(
                base_url(['api', 'v1', 'ap', 'advances', selected.id, 'apply']),
                { invoiceId: Number(result.value) },
                {},
                1000
            );
            setMessage({ type: 'success', show: true, message: 'Anticipo aplicado exitosamente.' });
        } catch (error) {
            setMessage({
                type: 'danger',
                show: true,
                message: error?.msg || 'Error al aplicar el anticipo.',
            });
        } finally {
            dataTableRef?.current?.ajax.reload();
        }
    };

    useEffect(() => {
        const table = dataTableRef?.current;
        if (!table) return;

        const handler = function () {
            const action = $(this).data('action');
            const id = String($(this).data('id'));
            const selected = rows.find((item) => String(item.id) === id);
            if (!selected) return;

            if (action === 'view') {
                window.Swal.fire({
                    title: `Anticipo #${selected.id}`,
                    html: `
                        <div class="text-start">
                            <p><strong>Proveedor:</strong> ${selected.thirdPartyName || '-'}</p>
                            <p><strong>Monto:</strong> ${formatCurrency(selected.amount)}</p>
                            <p><strong>Fecha:</strong> ${selected.advanceDate || '-'}</p>
                            <p><strong>Estado:</strong> ${STATUS_LABEL[selected.status] || selected.status}</p>
                            <p><strong>Notas:</strong> ${selected.notes || '-'}</p>
                        </div>`,
                    width: 500,
                    confirmButtonText: 'Cerrar',
                });
                return;
            }

            if (action === 'apply') {
                handleApply(selected);
            }
        };

        table.on('click', '.action-btn', handler);
        return () => table.off('click', '.action-btn', handler);
    }, [rows]);

    return (
        <>
            <div className="card">
                <h5 className="card-header text-md-start text-center">Anticipos a Proveedores</h5>

                <AlertPage
                    type={message.type}
                    message={message.message}
                    show={message.show}
                    onChange={() => setMessage({ message: '', type: '', show: false })}
                />

                <div className="card-datatable text-nowrap">
                    <DataTableReference
                        url_api={url}
                        columns={columns}
                        tableRef={tableRef}
                        dataTableRef={dataTableRef}
                        method="POST"
                        buttons={buttons}
                        title="Anticipos a Proveedores"
                        setData={setData}
                        search={search}
                        setSearch={setSearch}
                        filtered={true}
                        lengthMenu={[10, 25, 50, 100]}
                    />
                </div>
            </div>

            <CreateApAdvance
                modalRef={modalCreateRef}
                modalInstance={modalCreateInstance}
                dataTableRef={dataTableRef}
                setMessage={setMessage}
            />
        </>
    );
};

export default IndexApAdvances;
