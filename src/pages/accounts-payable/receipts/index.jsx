import { useState, useEffect, useRef, useMemo } from 'react';

import DataTableReference from '../../../components/organism/DataTable';
import AlertPage from '../../../components/molecules/AlertPage';
import GenericFilterModal from '../../../components/organism/GenericFilterModal';

import { base_url } from '../../../utils/functions';
import { fetchHelper } from '../../../utils/fetch';

import CreateApReceipt from './create';

/**
 * Pagina principal de Recepciones de Bienes (Cuentas por Pagar).
 * Muestra un listado paginado de recepciones asociadas a ordenes de compra.
 */

const STATUS_BADGE = {
    RECEIVED: 'bg-label-success',
    PARTIAL: 'bg-label-warning',
    PENDING: 'bg-label-info',
    REJECTED: 'bg-label-danger',
};

const STATUS_LABEL = {
    RECEIVED: 'Recibido',
    PARTIAL: 'Parcial',
    PENDING: 'Pendiente',
    REJECTED: 'Rechazado',
};

const IndexApReceipts = () => {
    const tableRef = useRef(null);
    const dataTableRef = useRef(null);
    const modalCreateRef = useRef(null);
    const modalCreateInstance = useRef(null);
    const filterRef = useRef(null);
    const filterInstance = useRef(null);

    const [data, setData] = useState([]);
    const [search, setSearch] = useState({ value: '', checked: true });
    const [message, setMessage] = useState({ message: '', type: '', show: false });

    const url = ['api', 'v1', 'ap', 'receipts'];

    const columns = [
        { title: 'Id', data: 'id', name: 'id' },
        {
            title: '# Recepcion',
            data: 'receiptNumber',
            name: 'receiptNumber',
            render: (val) => val || '-',
        },
        {
            title: 'Orden Compra',
            data: 'purchaseOrderId',
            name: 'purchaseOrderId',
            render: (val) => val || '-',
        },
        { title: 'Fecha', data: 'receiptDate', name: 'receiptDate' },
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
            title: 'Factura Asociada',
            data: 'invoiceId',
            name: 'invoiceId',
            render: (val) => val || '-',
        },
        {
            title: 'Acciones',
            data: 'id',
            searchable: false,
            render: (id) => `
                <div class="d-flex gap-1">
                    <button class="btn btn-sm btn-label-info action-btn"
                        data-action="view" data-id="${id}" title="Ver">
                        <i class="ri-eye-line"></i>
                    </button>
                </div>`,
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
            text: '<i class="ri-filter-line ri-16px me-sm-2"></i> <span class="d-none d-sm-inline-block">Filtrar</span>',
            className: 'btn rounded-pill btn-secondary waves-effect mx-1 my-2',
            action: () => {
                if (!filterInstance.current) filterInstance.current = new window.bootstrap.Modal(filterRef.current);
                filterInstance.current.show();
            }
        },
        {
            text: '<i class="ri-add-line ri-16px me-sm-2"></i><span class="d-none d-sm-inline-block">Registrar Recepcion</span>',
            className: 'btn rounded-pill btn-primary waves-effect mx-2 my-2',
            action: () => openModalCreate(),
        },
    ];

    const rows = useMemo(() => {
        if (Array.isArray(data)) return data;
        if (Array.isArray(data?.data)) return data.data;
        return [];
    }, [data]);

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
                    title: `Recepcion #${selected.receiptNumber || selected.id}`,
                    html: `
                        <div class="text-start">
                            <p><strong>Orden de Compra:</strong> ${selected.purchaseOrderId || '-'}</p>
                            <p><strong>Fecha:</strong> ${selected.receiptDate || '-'}</p>
                            <p><strong>Estado:</strong> ${STATUS_LABEL[selected.status] || selected.status}</p>
                            <p><strong>Factura Asociada:</strong> ${selected.invoiceId || '-'}</p>
                            <p><strong>Notas:</strong> ${selected.notes || '-'}</p>
                        </div>`,
                    width: 500,
                    confirmButtonText: 'Cerrar',
                });
            }
        };

        table.on('click', '.action-btn', handler);
        return () => table.off('click', '.action-btn', handler);
    }, [rows]);

    return (
        <>
            <div className="card">
                <h5 className="card-header text-md-start text-center">Recepciones de Bienes</h5>

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
                        title="Recepciones de Bienes"
                        setData={setData}
                        search={search}
                        setSearch={setSearch}
                        filtered={true}
                        lengthMenu={[10, 25, 50, 100]}
                    />
                </div>
            </div>

            <CreateApReceipt
                modalRef={modalCreateRef}
                modalInstance={modalCreateInstance}
                dataTableRef={dataTableRef}
                setMessage={setMessage}
            />

            <GenericFilterModal
                filterRef={filterRef}
                filterInstance={filterInstance}
                dataTableRef={dataTableRef}
                title="Filtrar Recepciones"
                columns={[
                    { column: 'receiptNumber:name', label: '# Recepcion' },
                    { column: 'purchaseOrderId:name', label: 'Orden Compra', type: 'number' },
                    { column: 'receiptDate:name', label: 'Fecha', type: 'date' },
                    { column: 'invoiceId:name', label: 'Factura Asociada', type: 'number' },
                    { column: 'status:name', label: 'Estado', type: 'select', options: [
                        { id: 'RECEIVED', label: 'Recibido' },
                        { id: 'PARTIAL', label: 'Parcial' },
                        { id: 'PENDING', label: 'Pendiente' },
                        { id: 'REJECTED', label: 'Rechazado' },
                    ]},
                ]}
            />
        </>
    );
};

export default IndexApReceipts;
