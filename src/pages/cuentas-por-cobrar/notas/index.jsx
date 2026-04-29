import { useState, useRef, useMemo, useEffect } from 'react';

import DataTableReference from '../../../components/organism/DataTable';
import AlertPage from '../../../components/molecules/AlertPage';
import GenericFilterModal from '../../../components/organism/GenericFilterModal';

import CreateArNote from './create';

/**
 * Pagina principal de Notas Credito y Debito de Ventas.
 * Cubre HU AR-07. Muestra listado paginado de NC/ND sobre facturas de venta.
 */

const TYPE_BADGE = {
    CREDIT: 'bg-label-success',
    DEBIT: 'bg-label-danger',
};

const TYPE_LABEL = {
    CREDIT: 'Nota Credito',
    DEBIT: 'Nota Debito',
};

const formatCurrency = (val) => {
    if (val === null || val === undefined) return '-';
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 2,
    }).format(Number(val));
};

const IndexArNotes = () => {
    const tableRef = useRef(null);
    const dataTableRef = useRef(null);
    const modalCreateRef = useRef(null);
    const modalCreateInstance = useRef(null);
    const filterRef = useRef(null);
    const filterInstance = useRef(null);

    const [data, setData] = useState([]);
    const [search, setSearch] = useState({ value: '', checked: true });
    const [message, setMessage] = useState({ message: '', type: '', show: false });

    const url = ['api', 'v1', 'ar', 'notes', 'search'];

    const columns = [
        { title: 'Id', data: 'id', name: 'id' },
        {
            title: 'Tipo',
            data: 'noteType',
            name: 'noteType',
            render: (val) => {
                const badge = TYPE_BADGE[val] || 'bg-label-secondary';
                const label = TYPE_LABEL[val] || val || '-';
                return `<span class="badge ${badge}">${label}</span>`;
            },
        },
        { title: 'Numero', data: 'noteNumber', name: 'noteNumber' },
        {
            title: 'Factura',
            data: 'invoiceNumber',
            // QA-BLOQUE-AO (2026-04-29): path JPA real para filter modal.
            name: 'invoice.invoiceNumber',
            render: (val, _t, row) => val || (row?.invoiceId ?? '-'),
        },
        { title: 'Monto', data: 'amount', name: 'amount', render: (v) => formatCurrency(v) },
        {
            title: 'Razon',
            data: 'reason',
            name: 'reason',
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
            text: '<i class="ri-add-line ri-16px me-sm-2"></i><span class="d-none d-sm-inline-block">Crear Nota</span>',
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
                    title: `${TYPE_LABEL[selected.noteType] || 'Nota'} ${selected.noteNumber || ''}`,
                    html: `
                        <div class="text-start">
                            <p><strong>Factura:</strong> ${selected.invoiceNumber || selected.invoiceId || '-'}</p>
                            <p><strong>Monto:</strong> ${formatCurrency(selected.amount)}</p>
                            <p><strong>Razon:</strong> ${selected.reason || '-'}</p>
                            <p><strong>Asiento contable:</strong> ${selected.journalEntryId || '-'}</p>
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
                <h5 className="card-header text-md-start text-center">Notas Credito / Debito de Ventas</h5>

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
                        title="NC/ND Ventas"
                        setData={setData}
                        search={search}
                        setSearch={setSearch}
                        filtered={true}
                        lengthMenu={[10, 25, 50, 100]}
                    />
                </div>
            </div>

            <CreateArNote
                modalRef={modalCreateRef}
                modalInstance={modalCreateInstance}
                dataTableRef={dataTableRef}
                setMessage={setMessage}
            />

            <GenericFilterModal
                filterRef={filterRef}
                filterInstance={filterInstance}
                dataTableRef={dataTableRef}
                title="Filtrar NC/ND Ventas"
                columns={[
                    { column: 'noteNumber:name', label: 'Numero' },
                    { column: 'invoice.invoiceNumber:name', label: 'Factura' },
                    { column: 'amount:name', label: 'Monto', type: 'number' },
                    { column: 'reason:name', label: 'Razon' },
                    { column: 'noteType:name', label: 'Tipo', type: 'select', options: [
                        { id: 'CREDIT', label: 'Nota Credito' },
                        { id: 'DEBIT', label: 'Nota Debito' },
                    ]},
                ]}
            />
        </>
    );
};

export default IndexArNotes;
